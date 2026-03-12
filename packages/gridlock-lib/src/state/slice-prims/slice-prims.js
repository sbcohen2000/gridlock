import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { VerticalSlicePrimsState, HorizontalSlicePrimsState } from "./state.js";

/** @import { Inverse, CommonState } from "../common-state.d.ts" */

/**
 * @param {VerticalSlicePrimsState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     cell to split, and the location of the split.
 */
function _splitCellVerticallyAtGlobalRow(st, globalPt) {
    const leaf = grid.leafUnderPoint(st.grid, globalPt);
    if(!leaf) return;

    const leafPos = grid.posOfLeaf(st.grid, leaf);
    const localRow = globalPt.y - leafPos.y;
    const [, newGrid] = grid.splitLeafVertically(st.grid, leaf, localRow, (cellData) => [
        { lines: cellData.lines.slice(0, localRow) },
        { lines: cellData.lines.slice(localRow) },
    ]);
    st.grid = newGrid;
}

/**
 * @type {(st: VerticalSlicePrimsState, globalPt: point.P2) => Inverse<VerticalSlicePrimsState>}
 */
export const splitCellVerticallyAtGlobalRow =
    state.withDefaultInverse(_splitCellVerticallyAtGlobalRow, "split cell vertically");

/**
 * @param {HorizontalSlicePrimsState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     cell to split, and the location of the split.
 */
function _splitCellHorizontallyAtGlobalCol(st, globalPt) {
    const leaf = grid.leafUnderPoint(st.grid, globalPt);
    if(!leaf) return;

    const leafPos = grid.posOfLeaf(st.grid, leaf);
    const localCol = globalPt.x - leafPos.x;
    const [, newGrid] = grid.splitLeafHorizontally(st.grid, leaf, localCol, (cellData) => [
        { lines: cellData.lines.map(line => line.slice(0, localCol)) },
        { lines: cellData.lines.map(line => line.slice(localCol)) },
    ]);

    st.grid = newGrid;
}

/**
 * @type {(st: HorizontalSlicePrimsState, globalPt: point.P2) => Inverse<HorizontalSlicePrimsState>}
 */
export const splitCellHorizontallyAtGlobalCol =
    state.withDefaultInverse(_splitCellHorizontallyAtGlobalCol, "split cell horizontally");

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[VerticalSlicePrimsState, Inverse<S>]}
 */
export function editVerticalSlice(st) {
    const snapshot = st.clone();

    return [ new VerticalSlicePrimsState(st.grid), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start slicing cells vertically"
    } ];
}

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[HorizontalSlicePrimsState, Inverse<S>]}
 */
export function editHorizontalSlice(st) {
    const snapshot = st.clone();

    return [ new HorizontalSlicePrimsState(st.grid), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start slicing cells horizontally"
    } ];
}
