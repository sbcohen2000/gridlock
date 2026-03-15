import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { SliceCellState, SliceRowState } from "./state.js";

/** @import { Inverse, CommonState } from "../common-state.d.ts" */

/**
 * @param {SliceRowState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     row to split, and the location of the split.
 */
function _splitRow(st, globalPt) {
    const cell = grid.cellUnderPoint(st.grid, globalPt);
    if(!cell) return;

    const rowRect = grid.rectOfRow(st.grid, cell);
    const localRow = globalPt.y - rowRect.top;
    grid.splitRow(st.grid, cell, localRow, (cellData) => [
        { lines: cellData.lines.slice(0, localRow) },
        { lines: cellData.lines.slice(localRow) },
    ]);
}

/**
 * @type {(st: SliceRowState, globalPt: point.P2) => Inverse<SliceRowState>}
 */
export const splitRow = state.withDefaultInverse(_splitRow, "split row vertically");

/**
 * @param {SliceCellState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     cell to split, and the location of the split.
 */
function _splitCell(st, globalPt) {
    const cell = grid.cellUnderPoint(st.grid, globalPt);
    if(!cell) return;

    const cellRect = grid.rectOfCell(st.grid, cell);
    const localCol = globalPt.x - cellRect.left;
    grid.splitCell(st.grid, cell, localCol, (cellData) => [
        { lines: cellData.lines.map(line => line.slice(0, localCol)) },
        { lines: cellData.lines.map(line => line.slice(localCol)) },
    ]);
}

/**
 * @type {(st: SliceCellState, globalPt: point.P2) => Inverse<SliceCellState>}
 */
export const splitCellHorizontallyAtGlobalCol = state.withDefaultInverse(_splitCell, "split cell horizontally");

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[SliceRowState, Inverse<S>]}
 */
export function sliceRow(st) {
    const snapshot = st.clone();

    return [ new SliceRowState(st.grid), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start slicing rows vertically"
    } ];
}

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[SliceCellState, Inverse<S>]}
 */
export function sliceCell(st) {
    const snapshot = st.clone();

    return [ new SliceCellState(st.grid), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start slicing cells horizontally"
    } ];
}
