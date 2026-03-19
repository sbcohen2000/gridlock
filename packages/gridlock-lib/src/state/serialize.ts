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

type CompactGridData = { upperLeft: point.P2, lineLengths: number[] };
type ExpandedGridData = { lines: string[] } & CompactGridData;

/**
 * Generate the full source-text of the given state, along with a grid
 * which records the rectangle of text in this source-text
 * corresponding to each cell.
 */
function expandGrid(st: { grid: grid.Grid<Cell> }): {
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
            const maxWidth = util.maximum(lineLengths.values());

            outRow.cells.push({
                type: "Cell",
                width: cell.width,
                data: {
                    upperLeft: point.mkP2(textX, textY),
                    lineLengths,
                    lines: cell.data.lines
                }
            });

            textX += maxWidth;
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
    const { src, grid } = expandGrid(st);

    // Forget the `lines` field of `grid`. It's okay to do this
    // mutably because `expandGrid` returns only a copy of its input.
    grid.rows.forEach(row =>
        row.cells.forEach(cell => delete cell.data.lines));

    return JSON.stringify(grid) + "\n" + src;
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
                    disabledGuides: new Set()
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
    return compactGrid(srcText, JSON.parse(gridSpec));
}
