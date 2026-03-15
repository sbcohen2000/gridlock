/**
 * Primitive actions on cells.
 *
 * @module cell-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { CellPrimsState } from "./state.js";

/** @import { Inverse, CommonState } from "../common-state.d.ts" */

/**
 * Add the cell under the given `pt` to the selection.
 *
 * @param {CellPrimsState} st
 * @param {point.P2} pt
 * @param {boolean} clear If `true`, then clear the existing selection
 *     before adding the cell under the point.
 */
function _selectLeafUnderPoint(st, pt, clear) {
    const cell = grid.cellUnderPoint(st.grid, pt);
    if(!cell) {
        return;
    }

    if(clear) {
        st.selection = new Set([cell]);
    } else if(!st.selection.has(cell)) {
        st.selection.add(cell);
    }
}

/**
 * Add the leaf under the given `pt` to the selection.
 *
 * @type {(st: CellPrimsState, pt: point.P2, clear: boolean) => Inverse<CellPrimsState>}
 */
export const selectLeafUnderPoint = state.withDefaultInverse(_selectLeafUnderPoint);

/**
 * Check if the given selection of cells is valid for merging.
 *
 * @param {CellPrimsState} st
 * @returns {boolean} `true` if the selection can be merged, and false
 *     otherwise.
 */
export function canMergeSelectedCells(st) {
    return grid.canMergeCells(st.grid, [...st.selection.values()]);
}

/**
 * Merge the selected cells.
 *
 * @param {CellPrimsState} st
 */
function _mergeSelectedCells(st) {
    /** @type {grid.CellPath} */
    let newSelectedCell;
    const newGrid = state.projectTextOntoLeaves((g) => {
        newSelectedCell = grid.mergeCells(g, [...st.selection.values()], { lines: [] });
        return newGrid;
    }, st.grid);

    st.grid = newGrid;
    st.selection = new Set([newSelectedCell]);
}

/**
 * Merge the selected cells.
 */
export const mergeSelectedCells = state.withDefaultInverse(_mergeSelectedCells);

/**
 * @template {CommonState} S
 * @param { S } st
 * @returns { [ CellPrimsState, Inverse<S> ] }
 */
export function editCells(st) {
    const snapshot = st.clone();

    return [ new CellPrimsState(st.grid, new Set()), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start editing cells"
    } ];
}
