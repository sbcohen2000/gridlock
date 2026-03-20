import * as grid from "../grid.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import type { Cell } from "./state-iface.js";
import { cellContentExceedsCellWidth } from "./state-iface.js";

/** Project a positioned cell's text onto a 2D character array. */
function projOntoText(
    g: grid.Grid<Cell>,
    text: (string | null)[][],
    positionedCell: [grid.CellPath, rect.Rect],
    origin: { top: number, left: number } = { top: 0, left: 0 }
): void {
    const [cell, cellRect] = positionedCell;
    const theCell = grid.lookupCell(g, cell);

    util.assert(
        !cellContentExceedsCellWidth(theCell),
        "Found a cell whose content exceeds its width in " +
            "projectTextOntoCells. The cell's content will " +
            "be destroyed if we continue."
    );

    for(let i = 0; i < theCell.data.lines.length; ++i) {
        const line = theCell.data.lines[i];
        const row = i + cellRect.top - origin.top;
        text[row].splice(cellRect.left - origin.left, line.length, ...Array.from(line));
    }
}

/** Project text from a 2D character array back onto a positioned cell. */
function projOntoCells(
    g: grid.Grid<Cell>,
    text: (string | null)[][],
    positionedCell: [grid.CellPath, rect.Rect],
    origin: { top: number, left: number } = { top: 0, left: 0 }
): void {
    const [cell, cellRect] = positionedCell;
    const theCell = grid.lookupCell(g, cell);
    theCell.data.lines = [];
    for(let i = 0; i < rect.height(cellRect); ++i) {
        const row = i + cellRect.top - origin.top;
        const line = text[row]
              .slice(cellRect.left - origin.left, cellRect.left - origin.left + rect.width(cellRect))
              .map(c => c ?? " ")
              .join("")
              .trimEnd();
        theCell.data.lines.push(line);
   }
}

/**
 * Given a function `f` which knows how to mutate the structure of the
 * grid, remember the text in the cells underneath `f`, call `f`, then
 * restore the text to the cells.
 */
export function projectTextOntoCells(
    f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>,
    g: grid.Grid<Cell>
): grid.Grid<Cell> {
    // Construct a rectangle of characters to hold the text
    const outerRect = grid.rectOfGrid(g);

    const text: (string | null)[][] = Array.from(
        { length: rect.height(outerRect) }, () =>
        Array.from({ length: rect.width(outerRect) }, () => null));

    // Project the leaf text onto `text`.
    grid.allPositionedCells(g).forEach(pc => projOntoText(g, text, pc));
    const newG = f(g);

    // Project the text back onto the cells.
    grid.allPositionedCells(newG).forEach(pc => projOntoCells(newG, text, pc));

    return newG;
}

/**
 * Like `projectTextOntoCells`, but only operates on the cells within
 * a list of adjacent rows.
 */
export function projectTextOntoCellsInAdjacentRows(
    f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>,
    g: grid.Grid<Cell>,
    rows: grid.RowPath[]
): grid.Grid<Cell> {
    // Compute the bounding rect of the adjacent rows.
    const outerRect = rect.unions(...rows.map(row => grid.rectOfRow(g, row)));
    const origin = { top: outerRect.top, left: outerRect.left };

    const text: (string | null)[][] = Array.from(
        { length: rect.height(outerRect) }, () =>
        Array.from({ length: rect.width(outerRect) }, () => null));

    // Project the leaf text onto `text`.
    for (const row of rows) {
        for (const pc of grid.allPositionedCellsOnRow(g, row)) {
            projOntoText(g, text, pc, origin);
        }
    }

    const newG = f(g);

    // Project the text back onto the cells.
    for (const row of rows) {
        for (const pc of grid.allPositionedCellsOnRow(newG, row)) {
            projOntoCells(newG, text, pc, origin);
        }
    }

    return newG;
}
