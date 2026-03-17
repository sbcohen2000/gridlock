import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { Cell, State, AnyState } from "./state-iface.js";
import { KeysWithType, Inverse, SnapshotInverse, id } from "./inverse.js";

interface TextOnGlobalLineIterItem {
    globalCol: number;
    localRow: number;
    text: string;
    cell: grid.CellPath;
}

export type TextOnGlobalLineIter = IteratorObject<TextOnGlobalLineIterItem>;

/**
 * Given an iterator over text annotated with column numbers, consume
 * the iterator producing a single string which represents gaps
 * between the cells (as indicated by the column number) with spaces.
 */
function _concatenatePositionedText(textIter: TextOnGlobalLineIter): string {
    let out = "";
    let x: number | undefined;

    for(const { globalCol, text } of textIter) {
        if(x === undefined) x = globalCol;

        for(let xx = x; xx < globalCol; ++xx) {
            out += " ";
            ++x;
        }

        out += text;
        x += text.length;
    }

    return out.trimEnd();
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
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
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
    static mkEmpty(): TextPrims {
        const g = grid.mk(1, 1, { lines: [""] });
        return TextPrims.editText({ grid: g });
    }

    /*************************************************************************/
    /** Private Helpers                                                     **/

    private _updateLastGlobalCol(): void {
        const globalCol = this.findGlobalPoint().x;
        this.selection.lastGlobalCol = globalCol;
    }

    private _maximumLineLength(cell: grid.Cell<Cell>): number {
        return cell.data.lines.reduce((a: number, l: string) => Math.max(a, l.length), 0);
    }

    private _expandLeafWidthIfNecessary(cell: grid.CellPath): void {
        const theCell = grid.lookupCell(this.grid, cell);
        const n = this._maximumLineLength(theCell) - theCell.width;
        if(0 < n) {
            const globalCol = grid.rectOfCell(this.grid, cell).left;
            const cells = [...grid.cellsUnderGlobalX(this.grid, globalCol)];
            grid.modifyWidthOfCells(this.grid, cells, n);
        }
    }

    private _extractGlobalLine(globalRow: number): TextOnGlobalLineIter {
        return grid.cellsUnderGlobalY(this.grid, globalRow).map((cell: grid.CellPath) => {
            const cellRect = grid.rectOfCell(this.grid, cell);
            const theCell = grid.lookupCell(this.grid, cell);
            const localRow = globalRow - cellRect.top;
            return {
                globalCol: cellRect.left,
                localRow,
                text: theCell.data.lines[localRow],
                cell,
            };
        }) as TextOnGlobalLineIter;
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

    private _killLine(): TextOnGlobalLineIterItem[] {
        const globalPt = this.findGlobalPoint();
        const globalRow = globalPt.y;
        const globalCol = globalPt.x;

        const textSegments = [...this._extractGlobalLine(globalRow)];
        let afterPointer!: TextOnGlobalLineIterItem[];

        for(let i = textSegments.length - 1; i >= 0; --i) {
            const seg = textSegments[i];
            const segCell = grid.lookupCell(this.grid, seg.cell);

            if(seg.globalCol <= globalCol) {
                let localCol = globalCol - seg.globalCol;
                segCell.data.lines[seg.localRow] =
                    segCell.data.lines[seg.localRow].slice(0, localCol);

                afterPointer = textSegments.slice(i);
                afterPointer[0].text = seg.text.slice(localCol);
                afterPointer[0].globalCol += localCol;

                for(let j = 1; j < afterPointer.length; ++j) {
                    const rightSeg = afterPointer[j];
                    const rightSegCell = grid.lookupCell(this.grid, rightSeg.cell);
                    rightSegCell.data.lines[rightSeg.localRow] = "";
                }
                break;
            }
        }

        return afterPointer;
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
        grid.removeEmptyRows(this.grid);

        const newRow = Math.max(0, globalPt.y - 1);
        this.putPointOnGlobalPosition(point.mkP2(0, newRow));

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
                this._expandLeafWidthIfNecessary(cell);
            } else {
                const nextText = textIter.next();
                if(nextText.done) {
                    return;
                }

                theCell.data.lines[localRow] += (nextText.value as TextOnGlobalLineIterItem).text;
                this._expandLeafWidthIfNecessary(cell);
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

    putPointOnGlobalPosition(pt: point.P2, updateGlobalCol?: boolean): Inverse<TextPrims> {
        if(updateGlobalCol === undefined) {
            updateGlobalCol = true;
        }

        const oldGlobalCol = this.selection.lastGlobalCol;
        const oldGlobalPt = this.findGlobalPoint();

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
        return new SnapshotInverse(snapshot, "remove line");
    }

    removeGlobalNewline(): Inverse<TextPrims> {
        const snapshot = this.clone();

        const globalPt = this.findGlobalPoint();
        if(globalPt.y === 0) return new SnapshotInverse(snapshot, "remove newline");
        if(globalPt.x > 0) return new SnapshotInverse(snapshot, "remove newline");

        const globalRow = globalPt.y;
        const textOnLine = [...this._extractGlobalLine(globalRow)];

        if(!this._removeGlobalLine()) return new SnapshotInverse(snapshot, "remove newline");

        this.putPointAtEndOfGlobalLine();
        const globalCol = this._lastColumnOnGlobalLine(globalRow - 1);
        this._spreadTextOnGlobalRow(globalRow - 1, globalCol, textOnLine.values() as TextOnGlobalLineIter);

        return new SnapshotInverse(snapshot, "remove newline");
    }

    removeString(n: number): Inverse<TextPrims> {
        const snapshot = this.clone();

        const sel = this.selection;
        const theCell = grid.lookupCell(this.grid, sel.cell);

        const row = sel.pt.y;
        const col = sel.pt.x;
        const line = theCell.data.lines[row];

        if(line === "" || sel.pt.x === 0) return new SnapshotInverse(snapshot, "remove string");

        n = Math.min(n, col);

        const before = line.slice(0, col - n);
        const after = line.slice(col);
        theCell.data.lines[row] = before + after;

        sel.pt.x -= n;
        this._updateLastGlobalCol();

        return new SnapshotInverse(snapshot, "remove string");
    }

    insertGlobalNewline(): Inverse<TextPrims> {
        const snapshot = this.clone();

        const globalPt = this.findGlobalPoint();
        const globalRow = globalPt.y;

        const afterPointer = this._killLine();

        const cells = [...grid.cellsUnderGlobalY(this.grid, globalRow)];
        for(const cell of cells) {
            const cellRect = grid.rectOfCell(this.grid, cell);
            const localRow = globalRow - cellRect.top;
            grid.lookupCell(this.grid, cell).data.lines.splice(localRow + 1, 0, "");
        }

        grid.modifyHeightOfRow(this.grid, cells[0], 1);

        const newRow = globalRow + 1;
        this._spreadTextOnGlobalRow(newRow, 0, afterPointer.values() as TextOnGlobalLineIter);

        this.putPointOnGlobalPosition(point.mkP2(0, newRow), false);

        return new SnapshotInverse(snapshot, "insert newline");
    }

    insertString(s: string, advancePoint?: boolean): Inverse<TextPrims> {
        const snapshot = this.clone();

        if(advancePoint === undefined) {
            advancePoint = true;
        }

        if(s.length === 0) return new SnapshotInverse(snapshot, "insert string");

        const theCell = grid.lookupCell(this.grid, this.selection.cell);
        const row = this.selection.pt.y;
        const col = this.selection.pt.x;
        const line = theCell.data.lines[row];
        const before = line.slice(0, col);
        const after = line.slice(col);
        theCell.data.lines[row] = before + s + after;

        if(advancePoint) {
            this.selection.pt.x += s.length;
            this._updateLastGlobalCol();
        }

        this._expandLeafWidthIfNecessary(this.selection.cell);

        return new SnapshotInverse(snapshot, "insert string");
    }

}
