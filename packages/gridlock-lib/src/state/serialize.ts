import * as grid from "../grid.js";
import * as rect from "../rect.js";
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
        cell.data = { lines: [] };
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
