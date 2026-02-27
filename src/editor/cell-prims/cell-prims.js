/**
 * Primitive actions on the cell grid.
 *
 * @module cell-prims
 */

import * as point from "../../point.js";
import * as state from "../state.js";

/**
 * Add the cell under the given `pt` to the selection.
 *
 * @param {state.EditingCells} st
 * @param {point.P2} pt
 * @returns {boolean} `true` if the selection was changed, `false` otherwise.
 */
export function selectCellUnderPoint(st, pt) {
    throw new Error("TODO");
}

/**
 * Slice the selected cell vertically at the given row number. If the
 * row number is out of range, this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} row
 * @returns {boolean} `true` if the cell was split, `false` otherwise.
 */
export function splitCellVerticallyAtRow(st, row) {
    throw new Error("TODO");
}

/**
 * Slice the selected cell horizontally at the given column number. If
 * the column number is out of range, this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} col
 * @returns {boolean} `true` if the cell was split, `false` otherwise.
 */
export function splitCellHorizontallyAtColumn(st, col) {
    
    throw new Error("TODO");
}
