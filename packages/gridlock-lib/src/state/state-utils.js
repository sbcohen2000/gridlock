import * as grid from "../grid.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { cellContentExceedsCellWidth } from "./state-iface.js";

/** @import { Cell } from "./state-iface.js"; */

/**
 * Given a function `f` which knows how to mutate the structure of the
 * grid, remember the text in the cells underneath `f`, call `f`,
 * then restore the text to the cells.
 *
 * @param {(grid: grid.Grid<Cell>) => grid.Grid<Cell>} f
 * @param {grid.Grid<Cell>} g
 * @returns {grid.Grid<Cell>}
 */
export function projectTextOntoLeaves(f, g) {
    // Construct a rectangle of characters to hold the text
    const outerRect = grid.rectOfGrid(g);

    const text = Array.from({ length: rect.height(outerRect) }, () =>
        Array.from({ length: rect.width(outerRect) }, () => null));

    /**
     * @param {[grid.CellPath, rect.Rect]} positionedCell
     */
    const projOntoText = (positionedCell) => {
        const [cell, cellRect] = positionedCell;
        const theCell = grid.lookupCell(g, cell);

        util.assert(
            !cellContentExceedsCellWidth(theCell),
            "Found a cell whose content exceeds its width in " +
                "projectTextOntoLeaves. The cell's content will " +
                "be destroyed if we continue."
        );

        for(let i = 0; i < theCell.data.lines.length; ++i) {
            const line = theCell.data.lines[i];
            const row = i + cellRect.top;
            text[row].splice(cellRect.left, line.length, ...Array.from(line));
        }
    }

    // Project the leaf text onto `text`.
    grid.allPositionedCells(g).forEach(projOntoText);
    const newG = f(g);

    /**
     * @param {[grid.CellPath, rect.Rect]} positionedCell
     */
    const projOntoLeaves = (positionedCell) => {
        const [cell, cellRect] = positionedCell;
        const theCell = grid.lookupCell(newG, cell);
        theCell.data.lines = [];
        for(let i = 0; i < rect.height(cellRect); ++i) {
            const row = i + cellRect.top;
            const line = text[row]
                  .slice(cellRect.left, cellRect.left + rect.width(cellRect))
                  .map(c => c ?? " ")
                  .join("")
                  .trimEnd();
            theCell.data.lines.push(line);
       }
   }

    // Project the text back onto the leaves.
    grid.allPositionedCells(newG).forEach(projOntoLeaves);

    return newG;
}

