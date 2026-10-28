import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { Cell, State, AnyState, cloneCellData } from "./state-iface.js";
import { KeysWithType, Inverse, id, IdInverse, TimedSnapshotInverse } from "./inverse.js";

interface TextOnGlobalLineIterItem {
    /** The global column of the first character. */
    globalCol: number;
    /** The local row of the text, relative to the text's containing
        cell. */
    localRow: number;
    /** The local column of the first chracter of the text, relative
        to the text's containing cell. */
    localCol: number;
    text: string;
    cell: grid.CellPath;
}

export type TextOnGlobalLineIter = IteratorObject<TextOnGlobalLineIterItem>;

/**
 * Given an iterator over text annotated with column numbers, consume
 * the iterator producing a single string which represents gaps
 * between the (non-empty) cells (as indicated by the column number)
 * with spaces.
 */
function _concatenatePositionedText(textIter: TextOnGlobalLineIter): string {
    let out = "";
    let x: number | undefined;

    for(const { globalCol, text } of textIter) {
        if(text === "") continue;
        if(x === undefined) x = globalCol;

        for(let xx = x; xx < globalCol; ++xx) {
            out += " ";
            ++x;
        }

        out += text;
        x += text.length;
    }

    return out;
}

/**
 * An object representing the inverse of an operation which only moves
 * the location of the global point.
 */
class PutPointOnGlobalPositionInverse implements Inverse<TextPrims> {
    #newPos: point.P2;
    #oldPos: point.P2;
    #oldGlobalCol: number;

    constructor(newPos: point.P2, oldPos: point.P2, oldGlobalCol: number) {
        this.#newPos = point.cloneP2(newPos);
        this.#oldPos = point.cloneP2(oldPos);
        this.#oldGlobalCol = oldGlobalCol;
    }

    apply<A extends object, K extends KeysWithType<A, AnyState>>(key: K, stHolder: A): void {
        const st = stHolder[key];
        util.assert(st instanceof TextPrims);
        st.putPointOnGlobalPosition(this.#oldPos, false);
        st.selection.lastGlobalCol = this.#oldGlobalCol;
    }

    compose(i: Inverse<TextPrims>): Inverse<TextPrims> | null {
        if(i instanceof PutPointOnGlobalPositionInverse) {
            return this;
        } else {
            return null;
        }
    }

    get fwdDescription(): string {
        return `moved point from (${this.#newPos.y}, ${this.#newPos.x}) to (${this.#oldPos.y}, ${this.#oldPos.x})`;
    }
}

export class TextPrims implements State<TextPrims> {
    grid: grid.Grid<Cell>;
    selection: {
        pt: point.P2;
        cell: grid.CellPath;
        lastGlobalCol: number;
    };

    constructor(g: grid.Grid<Cell>, selection: { pt: point.P2; cell: grid.CellPath; lastGlobalCol: number }) {
        this.grid = g;
        this.selection = selection;
    }

    clone(): TextPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new TextPrims(g, {
            pt: point.cloneP2(this.selection.pt),
            cell: this.selection.cell,
            lastGlobalCol: this.selection.lastGlobalCol,
        });
    }

    /*************************************************************************/
    /** Static Factory                                                      **/

    static editText(st: { grid: grid.Grid<Cell> }): TextPrims {
        const [firstCell] = grid.allCells(st.grid).take(1);
        return new TextPrims(st.grid, {
            pt: point.mkP2(0, 0),
            cell: firstCell,
            lastGlobalCol: 0,
        });
    }

    /**
     * Construct a new `TextPrims` state with an empty grid.
     */
    static mkEmpty(size: { width: number, height: number } = { width: 1, height: 1 }): TextPrims {
        const data: Cell = { lines: Array.from({ length: size.height }, (_) => ""), disabledGuides: [] };
        const g = grid.mk(size.width, size.height, data);
        return TextPrims.editText({ grid: g });
    }

    /*************************************************************************/
    /** Private Helpers                                                     **/

    private _updateLastGlobalCol(): void {
        const globalCol = this.findGlobalPoint().x;
        this.selection.lastGlobalCol = globalCol;
    }

    private _extractGlobalLine(globalRow: number): TextOnGlobalLineIter {
        return grid.cellsUnderGlobalY(this.grid, globalRow).map((cell: grid.CellPath) => {
            const cellRect = grid.rectOfCell(this.grid, cell);
            const theCell = grid.lookupCell(this.grid, cell);
            const localRow = globalRow - cellRect.top;
            return {
                globalCol: cellRect.left,
                localRow,
                localCol: 0,
                text: theCell.data.lines[localRow],
                cell,
            };
        });
    }

    private _lastColumnOnGlobalLine(row: number): number {
        const textSegments = [...this._extractGlobalLine(row)];

        for(let i = textSegments.length - 1; i >= 0; --i) {
            const { globalCol, text } = textSegments[i];
            if(text !== "") {
                return globalCol + text.length;
            }
        }

        return 0;
    }

    private _textAfterPoint(): TextOnGlobalLineIterItem[] {
        const globalPt = this.findGlobalPoint();
        const globalRow = globalPt.y;
        const globalCol = globalPt.x;

        const textSegments = [...this._extractGlobalLine(globalRow)];
        let afterPoint: TextOnGlobalLineIterItem[] = [];

        for(let i = textSegments.length - 1; i >= 0; --i) {
            const seg = textSegments[i];
            if(seg.globalCol <= globalCol) {
                let localCol = globalCol - seg.globalCol;

                afterPoint = textSegments.slice(i);
                afterPoint[0].text = seg.text.slice(localCol);
                afterPoint[0].globalCol += localCol;
                afterPoint[0].localCol   = localCol;
                break;
            }
        }

        return afterPoint;
    }

    private _killLine(): TextOnGlobalLineIterItem[] {
        const afterPoint = this._textAfterPoint();

        if(afterPoint.length === 0) return [];

        const leftSeg = afterPoint[0];
        const leftCell = grid.lookupCell(this.grid, leftSeg.cell);
        leftCell.data.lines[leftSeg.localRow] = leftCell.data.lines[leftSeg.localRow]
            .slice(0, leftSeg.localCol);

        for(let i = 1; i < afterPoint.length; ++i) {
            const rightSeg = afterPoint[i];

            const rightSegCell = grid.lookupCell(this.grid, rightSeg.cell);
            rightSegCell.data.lines[rightSeg.localRow] = "";
        }

        return afterPoint;
    }

    private _removeGlobalLine(): boolean {
        if(rect.height(grid.rectOfGrid(this.grid)) === 1) {
            return false;
        }

        const globalPt = this.findGlobalPoint();
        const cells = [...grid.cellsUnderGlobalY(this.grid, globalPt.y)];
        for(const cell of cells) {
            const cellRect = grid.rectOfCell(this.grid, cell);
            const relRow = globalPt.y - cellRect.top;
            grid.lookupCell(this.grid, cell).data.lines.splice(relRow, 1);
        }

        grid.modifyHeightOfRow(this.grid, cells[0], -1);

        const newRow = Math.max(0, globalPt.y - 1);
        this._putPointOnGlobalPosition(point.mkP2(0, newRow));

        return true;
    }

    _spreadTextOnGlobalRow(row: number, col: number, textIter: TextOnGlobalLineIter): void {
        const cells = [...grid.cellsUnderGlobalY(this.grid, row)];
        util.assert(cells.length > 0);

        let i = cells.length - 1;
        for(; i > 0; --i) {
            const cellCol = grid.rectOfCell(this.grid, cells[i]).left;
            if(cellCol <= col) {
                break;
            }
        }

        for(let j = i; j < cells.length; ++j) {
            const cell = cells[j];
            const cellRect = grid.rectOfCell(this.grid, cell);
            const theCell = grid.lookupCell(this.grid, cell);
            const localRow = row - cellRect.top;

            const isLast = j === cells.length - 1;
            if(isLast) {
                const remainingText = _concatenatePositionedText(textIter);
                theCell.data.lines[localRow] += remainingText;
            } else {
                const nextText = textIter.next();
                if(nextText.done) {
                    return;
                }

                theCell.data.lines[localRow] += (nextText.value as TextOnGlobalLineIterItem).text;
            }
        }
    }

    /*************************************************************************/
    /** EditText Primitive Methods                                          **/

    findGlobalPoint(): point.P2 {
        const cellRect = grid.rectOfCell(this.grid, this.selection.cell);
        return point.offset(
            rect.upperLeft(cellRect),
            point.mkV2(this.selection.pt.x, this.selection.pt.y),
        );
    }

    /**
     * The same as `putPointOnGlobalPosition`, except it doesn't
     * return an inverse.  this is useful if we know that the inverse
     * will be unused, or if computing the inverse is invalid.
     */
    private _putPointOnGlobalPosition(pt: point.P2, updateGlobalCol?: boolean) {
        if(updateGlobalCol === undefined) {
            updateGlobalCol = true;
        }

        const outerRect = grid.rectOfGrid(this.grid);

        const clamped = point.mkP2(
            util.clamp(0, pt.x, rect.width(outerRect) - 1),
            util.clamp(0, pt.y, rect.height(outerRect) - 1),
        );

        const cell = grid.cellUnderPoint(this.grid, clamped);
        const cellRect = grid.rectOfCell(this.grid, cell);
        const relPos = point.offset(clamped, point.mkV2(-cellRect.left, -cellRect.top));

        const theCell = grid.lookupCell(this.grid, cell);
        const lineLen = theCell.data.lines[relPos.y]?.length ?? 0;

        if(clamped.x < pt.x) {
            relPos.x += 1;
        }
        relPos.x = Math.min(relPos.x, lineLen);

        this.selection.cell = cell;
        this.selection.pt = relPos;
        if(updateGlobalCol) {
            this.selection.lastGlobalCol = cellRect.left + relPos.x;
        }
    }

    putPointOnGlobalPosition(pt: point.P2, updateGlobalCol?: boolean): Inverse<TextPrims> {
        const oldGlobalCol = this.selection.lastGlobalCol;
        const oldGlobalPt = this.findGlobalPoint();
        this._putPointOnGlobalPosition(pt, updateGlobalCol);
        return new PutPointOnGlobalPositionInverse(pt, oldGlobalPt, oldGlobalCol);
    }

    putPointAtStartOfGlobalLine(): Inverse<TextPrims> {
        const globalRow = this.findGlobalPoint().y;
        return this.putPointOnGlobalPosition(point.mkP2(0, globalRow));
    }

    putPointAtEndOfGlobalLine(): Inverse<TextPrims> {
        const globalRow = this.findGlobalPoint().y;
        const globalCol = this._lastColumnOnGlobalLine(globalRow);
        return this.putPointOnGlobalPosition(point.mkP2(globalCol, globalRow), true);
    }

    putPointOnNextGlobalLine(stayInCell?: boolean): Inverse<TextPrims> {
        if(this.pointOnLastGlobalLine()) {
            return id;
        }
        const globalPt = this.findGlobalPoint();

        let lastColumn = Infinity;
        if(!stayInCell) {
            lastColumn = this._lastColumnOnGlobalLine(globalPt.y + 1);
        }

        return this.putPointOnGlobalPosition(
            point.mkP2(
                Math.min(this.selection.lastGlobalCol, lastColumn),
                globalPt.y + 1,
            ),
            false,
        );
    }

    putPointOnPrevGlobalLine(stayInCell?: boolean): Inverse<TextPrims> {
        if(this.pointOnFirstGlobalLine()) {
            return id;
        }
        const globalPt = this.findGlobalPoint();

        let lastColumn = Infinity;
        if(!stayInCell) {
            lastColumn = this._lastColumnOnGlobalLine(globalPt.y - 1);
        }

        return this.putPointOnGlobalPosition(
            point.mkP2(
                Math.min(this.selection.lastGlobalCol, lastColumn),
                globalPt.y - 1,
            ),
            false,
        );
    }

    putPointOnNextGlobalCol(): Inverse<TextPrims> {
        const oldGlobalCol = this.selection.lastGlobalCol;

        if(this.pointAtEndOfGlobalLine()) {
            return id;
        }

        const theCell = grid.lookupCell(this.grid, this.selection.cell);
        const localLine = theCell.data.lines[this.selection.pt.y];
        const atEndOfLocalLine = this.selection.pt.x === localLine.length;

        if(atEndOfLocalLine) {
            const upperLeft = rect.upperLeft(grid.rectOfCell(this.grid, this.selection.cell));
            const globalPt = point.offset(upperLeft, point.mkV2(
                theCell.width,
                this.selection.pt.y,
            ));
            return this.putPointOnGlobalPosition(globalPt);
        } else {
            this.selection.pt.x += 1;
            this._updateLastGlobalCol();
            return {
                fwdDescription: "put point on next column",
                apply<A extends object, K extends KeysWithType<A, AnyState>>(key: K, stHolder: A): void {
                    const st = stHolder[key];
                    util.assert(st instanceof TextPrims);
                    st.selection.pt.x -= 1;
                    st.selection.lastGlobalCol = oldGlobalCol;
                }
            };
        }
    }

    putPointOnPrevGlobalCol(): Inverse<TextPrims> {
        if(this.pointAtBeginningOfGlobalLine()) {
            return id;
        }

        const globalPt = this.findGlobalPoint();
        return this.putPointOnGlobalPosition(point.offset(globalPt, point.mkV2(-1, 0)));
    }

    pointAtEndOfGlobalLine(): boolean {
        const localRow = this.selection.pt.y;
        const localCol = this.selection.pt.x;
        const theCell = grid.lookupCell(this.grid, this.selection.cell);
        const localLine = theCell.data.lines[localRow];
        if(localLine.length !== localCol) {
            return false;
        }

        const globalPt = this.findGlobalPoint();
        return undefined === grid.cellUnderPoint(
            this.grid,
            point.offset(globalPt, point.mkV2(1, 0)),
        );
    }

    pointAtBeginningOfGlobalLine(): boolean {
        return this.findGlobalPoint().x === 0;
    }

    pointOnFirstGlobalLine(): boolean {
        return this.findGlobalPoint().y === 0;
    }

    pointOnLastGlobalLine(): boolean {
        const rowHeight = grid.lookupRow(this.grid, this.selection.cell).height;

        if(this.selection.pt.y < rowHeight - 1) {
            return false;
        }

        return this.selection.cell.rowNo === this.grid.rows.length - 1;
    }

    globalLineIsEmpty(): boolean {
        const globalRow = this.findGlobalPoint().y;
        return this._extractGlobalLine(globalRow).every(({ text }: TextOnGlobalLineIterItem) => text === "");
    }

    textOnGlobalLine(row: number): string {
        return _concatenatePositionedText(this._extractGlobalLine(row));
    }

    removeGlobalLine(): Inverse<TextPrims> {
        const snapshot = this.clone();
        this._removeGlobalLine();
        return new TimedSnapshotInverse(snapshot, 2000, "remove line");
    }

    removeGlobalNewline(): Inverse<TextPrims> {
        const globalPt = this.findGlobalPoint();
        if(globalPt.y === 0) return new IdInverse();
        if(globalPt.x > 0) return new IdInverse();

        const snapshot = this.clone();

        const globalRow = globalPt.y;
        const textOnLine = [...this._extractGlobalLine(globalRow)];

        if(!this._removeGlobalLine()) return new TimedSnapshotInverse(snapshot, 2000, "remove newline");

        this.putPointAtEndOfGlobalLine();
        const globalCol = this._lastColumnOnGlobalLine(globalRow - 1);
        this._spreadTextOnGlobalRow(globalRow - 1, globalCol, textOnLine.values() as TextOnGlobalLineIter);

        return new TimedSnapshotInverse(snapshot, 2000, "remove newline");
    }

    removeString(n: number): Inverse<TextPrims> {
        const sel = this.selection;
        const theCell = grid.lookupCell(this.grid, sel.cell);

        const row = sel.pt.y;
        const col = sel.pt.x;
        const line = theCell.data.lines[row];

        if(line === "" || sel.pt.x === 0) return new IdInverse();
        const snapshot = this.clone();

        n = Math.min(n, col);

        const before = line.slice(0, col - n);
        const after = line.slice(col);
        theCell.data.lines[row] = before + after;

        sel.pt.x -= n;
        this._updateLastGlobalCol();

        return new TimedSnapshotInverse(snapshot, 2000, "remove string");
    }

    /**
     * Remove all text on the global line after the point.
     */
    killLine(): Inverse<TextPrims> {
        const snapshot = this.clone();
        this._killLine();
        return new TimedSnapshotInverse(snapshot, 2000, "kill line");
    }

    insertGlobalNewline(): Inverse<TextPrims> {
        const snapshot = this.clone();

        const globalPt = this.findGlobalPoint();
        const localRow = this.selection.pt.y;
        const rowNo = this.selection.cell.rowNo;
        const row = grid.lookupRow(this.grid, this.selection.cell);

        const afterPoint = this._killLine();

        // Insert an empty line in every cell on this row.
        for(const cell of row.cells) {
            cell.data.lines.splice(localRow + 1, 0, "");
        }

        grid.modifyHeightOfRow(this.grid, { rowNo }, 1);

        const newRow = globalPt.y + 1;
        this._spreadTextOnGlobalRow(newRow, 0, afterPoint.values() as TextOnGlobalLineIter);

        this._putPointOnGlobalPosition(point.mkP2(0, newRow), false);

        return new TimedSnapshotInverse(snapshot, 2000, "insert global newline");
    }

    /**
     * Similar to `insertGlobalNewline`, except it resets the pointer
     * to the next line of the cell, and does not shift content from the global line
     * onto the next line.
     *
     * This is the default when copy-pasting multi-line content, or
     * editing in a cell whose content exceeds its boundary.
     */
    insertLocalNewline(): Inverse<TextPrims> {
        const snapshot = this.clone();

        const theCell  = grid.lookupCell(this.grid, this.selection.cell);
        const localRow = this.selection.pt.y;
        const line     = theCell.data.lines[localRow];
        const beforePt = line.slice(0, this.selection.pt.x);
        const afterPt  = line.slice(this.selection.pt.x);

        // Split the current line in the active cell, and insert
        // empty lines in all sibling cells on the same row.
        theCell.data.lines[localRow] = beforePt;
        const row = grid.lookupRow(this.grid, this.selection.cell);
        for(const cell of row.cells) {
            if(cell === grid.lookupCell(this.grid, this.selection.cell)) {
                cell.data.lines.splice(localRow + 1, 0, afterPt);
            } else {
                cell.data.lines.splice(localRow + 1, 0, "");
            }
        }
        grid.modifyHeightOfRow(this.grid, this.selection.cell, 1);

        // Update the selection.
        this.selection.pt.x  = 0;
        this.selection.pt.y += 1;

        return new TimedSnapshotInverse(snapshot, 2000, "insert local newline");
    }

    /**
     * Insert a string into the document at the point.
     *
     * @param s The string to insert.
     * @param [advancePoint] Should the point be advanced by the
     *     length of the string?
     */
    insertString(s: string, advancePoint?: boolean): Inverse<TextPrims> {
        advancePoint = advancePoint ?? true;
        if(s.length === 0) return new IdInverse();

        const snapshot = this.clone();

        const theCell = grid.lookupCell(this.grid, this.selection.cell);
        const row  = this.selection.pt.y;
        const col  = this.selection.pt.x;
        const line = theCell.data.lines[row];
        theCell.data.lines[row] = line.slice(0, col) + s + line.slice(col);

        if(advancePoint) {
            this.selection.pt.x += s.length;
            this._updateLastGlobalCol();
        }

        return new TimedSnapshotInverse(snapshot, 2000, "insert string");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): true {
        const globalPt = this.findGlobalPoint();

        f(this.grid);

        this._putPointOnGlobalPosition(globalPt, true);
        return true;
    }
}
