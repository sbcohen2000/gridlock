import * as grid from "../grid.js";
import * as rect from "../rect.js";
import * as point from "../point.js";
import * as util from "../util.js";
import type { Cell } from "./state-iface.js";
import { TextPrims } from "./text-prims.js";

/**
 * Return the textual contents of the grid by extracting the text from
 * each leaf.
 */
function printGridContents(g: grid.Grid<Cell>): string {
    const outerRect = grid.rectOfGrid(g);
    const h = rect.height(outerRect);
    const w = rect.width(outerRect);

    // Build a 2d array of characters with the same size as the grid.
    const chars = [];
    for(let i = 0; i < h; ++i) {
        const row = [];
        for(let j = 0; j < w; ++j) {
            row.push(' ');
        }
        chars.push(row);
    }

    for(const [cellPath, cellRect] of grid.allPositionedCells(g)) {
        const cell = grid.lookupCell(g, cellPath);
        let row = 0;
        for(const line of cell.data.lines) {
            chars[cellRect.top + row].splice(cellRect.left, line.length, ...line);
            ++row;
        }
    }

    return chars.map(row => row.join("").trimEnd()).join("\n");
}

/**
 * Print the textual contents of the grid, followed immediately by an
 * ASCII representation of the grid.
 */
export function printCommonState(st: { grid: grid.Grid<Cell> }): string {
    const textPart = printGridContents(st.grid);
    const gridPart = grid.printASCII(st.grid);
    return textPart + "\n" + gridPart;
}

/**
 * Parse a grid of cells, using the same format as `printCommonState`.
 */
export function parseCommonState(src: string): grid.Grid<Cell> {
    const srcLines = src.trimEnd().split("\n");
    // The first half of the lines will contain the text portion,
    // while the second half will contain the grid portion. The grid
    // portion always has one additional line.
    const gridPart = srcLines.slice((srcLines.length - 1) / 2);

    const g: grid.Grid<Cell> = (grid.parseASCII(gridPart.join("\n")) as unknown as grid.Grid<Cell>);

    for(const [cellPath, cellRect] of grid.allPositionedCells(g)) {
        const cell = grid.lookupCell(g, cellPath);
        const h = rect.height(cellRect);
        cell.data = { lines: [], disabledGuides: new Set() };
        for(let row = cellRect.top; row < cellRect.top + h; ++row) {
            cell.data.lines.push(srcLines[row].slice(cellRect.left, cellRect.right).trimEnd());
        }
    }

    return g;
}

/**
 * Parse a cell grid from `src`, in the common state format and turn
 * it into a full-fledged editor state.
 *
 * @param src The source to parse as a cell grid.
 */
export function textEditingStateFromCommonStateStr(src: string): TextPrims {
    const g = parseCommonState(src);
    return TextPrims.editText({ grid: g });
}

type CompactGridData = { upperLeft: point.P2, lineLengths: number[], fillChar: string };
type ExpandedGridData = { lines: string[] } & CompactGridData;

/**
 * Generate the full source-text of the given state, along with a grid
 * which records the rectangle of text in this source-text
 * corresponding to each cell.
 */
export function _expandGrid(st: { grid: grid.Grid<Cell> }): {
    src: string,
    grid: grid.Grid<ExpandedGridData>
} {
    const out: grid.Grid<ExpandedGridData> = {
        type: "Grid",
        rows: []
    };

    let textY: number = 0;
    let maxX: number = 0;
    for(const row of st.grid.rows) {
        // Find the true height of the row by checking how many lines
        // exist in each cell.
        const maxHeight = util.maximum(row.cells.map(cell => cell.data.lines.length).values());

        const outRow: grid.Row<ExpandedGridData> = {
            type: "Row",
            height: row.height,
            cells: []
        };

        let textX: number = 0;
        for(const cell of row.cells) {
            // Find the true width of the cell by checking the maximum
            // width of any of the lines.
            const lineLengths = cell.data.lines.map(line => line.length);
            const maxTextWidth = util.maximum(lineLengths.values());

            outRow.cells.push({
                type: "Cell",
                width: cell.width,
                data: {
                    upperLeft: point.mkP2(textX, textY),
                    lineLengths,
                    lines: cell.data.lines,
                    fillChar: cell.data.fillChar ?? " "
                }
            });

            textX += Math.max(cell.width, maxTextWidth);
        }

        textY += maxHeight;
        maxX = Math.max(maxX, textX);
        out.rows.push(outRow);
    }

    // Build a 2d array of characters with the same size as the
    // maximum extent of the source text.
    const chars = [];
    for(let i = 0; i < textY; ++i) {
        const row = [];
        for(let j = 0; j < maxX; ++j) {
            row.push(' ');
        }
        chars.push(row);
    }

    // Place the text from each grid cell into `chars`.
    for(const cellPath of grid.allCells(out)) {
        const cell = grid.lookupCell(out, cellPath);
        const { lines, upperLeft, lineLengths } = cell.data;
        let row = 0;
        for(let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            const lineLength = lineLengths[i];
            chars[upperLeft.y + row].splice(upperLeft.x, lineLength, ...line);
            ++row;
        }
    }

    return {
        src: chars.map(row => row.join("")).join("\n"),
        grid: out
    }
}

/**
 * Produce a compact (but not human-readable) grid representation,
 * which can encode grid cells whose dimensions are different than
 * their contents.
 */
export function printCompactGrid(st: { grid: grid.Grid<Cell> }): string {
    const { src, grid } = _expandGrid(st);

    // Forget the `lines` field of `grid`. It's okay to do this
    // mutably because `expandGrid` returns only a copy of its input.
    grid.rows.forEach(row =>
        row.cells.forEach(cell => delete cell.data.lines));

    return _printCompactGridSpec(grid) + "\n" + src;
}

/**
 * Given a source document and a grid annotated with text ranges,
 * produce a grid annotated with lines.
 */
function compactGrid(src: string, g: grid.Grid<CompactGridData>): grid.Grid<Cell> {
    const srcLines = src.split("\n");
    return {
        ...g,
        rows: g.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell => ({
                ...cell,
                data: {
                    lines: cell.data.lineLengths.map((len, i) =>
                        srcLines[cell.data.upperLeft.y + i]
                            .slice(cell.data.upperLeft.x, cell.data.upperLeft.x + len)
                    ),
                    disabledGuides: new Set(),
                    fillChar: cell.data.fillChar === " " ? undefined : cell.data.fillChar
                }
            }))
        }))
    };
}

/**
 * Parse a compact grid using the same format as produced by
 * `printCompactGrid`.
 */
export function parseCompactGrid(src: string): grid.Grid<Cell> {
    const firstNL  = src.indexOf("\n");
    if(firstNL === -1) {
        throw new Error("Parse error. Couldn't find end of grid specification.");
    }
    const gridSpec = src.slice(0, firstNL);
    const srcText  = src.slice(firstNL + 1);
    return compactGrid(srcText, _parseCompactGridSpec(gridSpec));
}

/** Encode a Uint8Array as a base64 string. */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for(let i = 0; i < bytes.length; ++i) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Decode a base64 string into a Uint8Array. */
function base64ToBytes(str: string): Uint8Array {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; ++i) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * We use a custom format to encode grid data which is more efficient
 * than JSON (so that we don't need verbose JSON blobs everywhere).
 *
 * The format is as follows:
 *             |<-------------- per-row data ------------->|<--- per-cell data --- ...
 *
 *  | rows_end | begin end height | ... | begin end height | begin end width x y fill | ...
 *       |         |                    ^                  ^   |    |
 *       \______________________________/                  |   |    |
 *                 \______________________________________/    |    |
 *                                                             /    |
 *           _________________================================______/
 *          /                /
 *         V                V
 *     ... | line_len | ... | line_len | CHECKSUM |
 *
 *     ------ per-line data ---------->|
 */

const BYTES_PER_CHAR = 1;
const BYTES_PER_NUM  = 2;
const BYTES_PER_ROW_ENTRY  = 3 * BYTES_PER_NUM;  // begin, end, height
const BYTES_PER_CELL_ENTRY = 5 * BYTES_PER_NUM   // begin, end, width, x, y
                           + 1 * BYTES_PER_CHAR; // fill
const BYTES_PER_LINE_ENTRY = 1 * BYTES_PER_NUM;  // length

/**
 * Produce a string which encodes the metrics of each cell in the
 * grid. See the above format diagram.
 */
export function _printCompactGridSpec(g: grid.Grid<CompactGridData>): string {
    const nRows       = g.rows.length;
    const nCells      = [...grid.allCells(g)].length;
    const nLines      = grid.allCells(g).reduce((sum, cell) => {
        const theCell = grid.lookupCell(g, cell);
        return sum + theCell.data.lineLengths.length;
    }, 0);
    const rowDataOffset  = BYTES_PER_NUM;
    const cellDataOffset = rowDataOffset  + BYTES_PER_ROW_ENTRY  * nRows;
    const lineDataOffset = cellDataOffset + BYTES_PER_CELL_ENTRY * nCells;
    const data = new ArrayBuffer(
        lineDataOffset + BYTES_PER_LINE_ENTRY * nLines
    );
    const dv = new DataView(data);

    // Write the end-offset of the row data section so the parser
    // can determine the number of rows.
    dv.setUint16(0, cellDataOffset);

    let rowDataPtr  = rowDataOffset;
    let cellDataPtr = cellDataOffset;
    let lineDataPtr = lineDataOffset;
    for(const row of g.rows) {
        dv.setUint16(rowDataPtr, cellDataPtr); // begin
        rowDataPtr += BYTES_PER_NUM;
        dv.setUint16(rowDataPtr, cellDataPtr + BYTES_PER_CELL_ENTRY * row.cells.length); // end
        rowDataPtr += BYTES_PER_NUM;
        dv.setUint16(rowDataPtr, row.height); // height
        rowDataPtr += BYTES_PER_NUM;

        for(const cell of row.cells) {
            dv.setUint16(cellDataPtr, lineDataPtr); // begin
            cellDataPtr += BYTES_PER_NUM;
            dv.setUint16(cellDataPtr, lineDataPtr + BYTES_PER_LINE_ENTRY * cell.data.lineLengths.length); // end
            cellDataPtr += BYTES_PER_NUM;
            dv.setUint16(cellDataPtr, cell.width); // width
            cellDataPtr += BYTES_PER_NUM;
            dv.setUint16(cellDataPtr, cell.data.upperLeft.x); // x
            cellDataPtr += BYTES_PER_NUM;
            dv.setUint16(cellDataPtr, cell.data.upperLeft.y); // y
            cellDataPtr += BYTES_PER_NUM;
            dv.setUint8(cellDataPtr, cell.data.fillChar.charCodeAt(0)); // fill
            cellDataPtr += BYTES_PER_CHAR;

            for(const line of cell.data.lineLengths) {
                dv.setUint16(lineDataPtr, line); // length
                lineDataPtr += BYTES_PER_NUM;
            }
        }
    }

    return bytesToBase64(new Uint8Array(data));
}

/**
 * Parse a compact grid spec from a base64 string, reversing
 * the encoding produced by `_printCompactGridSpec`.
 */
export function _parseCompactGridSpec(src: string): grid.Grid<CompactGridData> {
    const bytes = base64ToBytes(src);
    const dv    = new DataView(bytes.buffer);

    const rowDataOffset  = BYTES_PER_NUM;
    const cellDataOffset = dv.getUint16(0);
    const nRows = (cellDataOffset - rowDataOffset) / BYTES_PER_ROW_ENTRY;

    // The first cell's `begin` field points to the start of the
    // line data section.
    let lineDataPtr = dv.getUint16(cellDataOffset);

    const rows: grid.Row<CompactGridData>[] = [];
    let rowDataPtr = rowDataOffset;
    for(let r = 0; r < nRows; ++r) {
        const cellsBegin = dv.getUint16(rowDataPtr);
        rowDataPtr += BYTES_PER_NUM;
        const cellsEnd = dv.getUint16(rowDataPtr);
        rowDataPtr += BYTES_PER_NUM;
        const height = dv.getUint16(rowDataPtr);
        rowDataPtr += BYTES_PER_NUM;
        if(height === 0) {
            throw new Error(`Parse error. Row ${r} has height 0.`);
        }

        const nCells = (cellsEnd - cellsBegin) / BYTES_PER_CELL_ENTRY;
        const cells: grid.Cell<CompactGridData>[] = [];

        let cellDataPtr = cellsBegin;
        for(let c = 0; c < nCells; ++c) {
            const lineBegin = dv.getUint16(cellDataPtr);
            cellDataPtr += BYTES_PER_NUM;
            const lineEnd = dv.getUint16(cellDataPtr);
            cellDataPtr += BYTES_PER_NUM;
            const width = dv.getUint16(cellDataPtr);
            cellDataPtr += BYTES_PER_NUM;
            const x = dv.getUint16(cellDataPtr);
            cellDataPtr += BYTES_PER_NUM;
            const y = dv.getUint16(cellDataPtr);
            cellDataPtr += BYTES_PER_NUM;
            const fillChar = String.fromCharCode(dv.getUint8(cellDataPtr)); // fill
            cellDataPtr += BYTES_PER_CHAR;

            const nLines = (lineEnd - lineBegin) / BYTES_PER_LINE_ENTRY;

            const lineLengths: number[] = [];
            for(let l = 0; l < nLines; ++l) {
                lineLengths.push(dv.getUint16(lineDataPtr));
                lineDataPtr += BYTES_PER_LINE_ENTRY;
            }

            cells.push({
                type: "Cell",
                width,
                data: {
                    upperLeft: point.mkP2(x, y),
                    lineLengths,
                    fillChar
                }
            });
        }

        rows.push({ type: "Row", height, cells });
    }

    return { type: "Grid", rows };
}
