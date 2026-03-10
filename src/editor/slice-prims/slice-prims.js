import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { SlicePrimsState } from "./state.js";

/** @import { Inverse, CommonState } from "../common-state.d.ts" */

/**
 * @param {SlicePrimsState} st
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
 * @type {(st: SlicePrimsState, globalPt: point.P2) => Inverse<SlicePrimsState>}
 */
export const splitCellVerticallyAtGlobalRow =
    state.withDefaultInverse(_splitCellVerticallyAtGlobalRow, "split cell vertically");

/**
 * @param {SlicePrimsState} st
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
 * @type {(st: SlicePrimsState, globalPt: point.P2) => Inverse<SlicePrimsState>}
 */
export const splitCellHorizontallyAtGlobalCol =
    state.withDefaultInverse(_splitCellHorizontallyAtGlobalCol, "split cell horizontally");

/**
 * @template {CommonState} S
 * @param { S } st
 * @param { "Vertical" | "Horizontal" } direction
 * @returns { [ SlicePrimsState, Inverse<S> ] }
 */
export function editSlice(st, direction) {
    const snapshot = st.clone();

    return [ new SlicePrimsState(st.grid, direction), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start slicing cells"
    } ];
}
