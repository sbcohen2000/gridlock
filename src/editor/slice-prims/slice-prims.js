import * as grid from "../../grid.js";
import * as point from "../../point.js";

/** @import { SlicePrimsState, CommonState } from "./state.d.ts" */

/**
 * @param {SlicePrimsState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     cell to split, and the location of the split.
 * @returns {boolean} `true` if the cell was split, and `false` otherwise.
 */
export function splitCellVerticallyAtGlobalRow(st, globalPt) {
    const leaf = grid.leafUnderPoint(st.grid, globalPt);
    if(!leaf) return false;

    const leafPos = grid.posOfLeaf(st.grid, leaf);
    const localRow = globalPt.y - leafPos.y;
    const [, newGrid] = grid.splitLeafVertically(st.grid, leaf, localRow, (cellData) => [
        { lines: cellData.lines.slice(0, localRow) },
        { lines: cellData.lines.slice(localRow) },
    ]);
    st.grid = newGrid;
    return true;
}

/**
 * @param {SlicePrimsState} st
 * @param {point.P2} globalPt The global point which identifies the
 *     cell to split, and the location of the split.
 * @returns {boolean} `true` if the cell was split, and `false` otherwise.
 */
export function splitCellHorizontallyAtGlobalCol(st, globalPt) {
    const leaf = grid.leafUnderPoint(st.grid, globalPt);
    if(!leaf) return false;

    const leafPos = grid.posOfLeaf(st.grid, leaf);
    const localCol = globalPt.x - leafPos.x;
    const [, newGrid] = grid.splitLeafHorizontally(st.grid, leaf, localCol, (cellData) => [
        { lines: cellData.lines.map(line => line.slice(0, localCol)) },
        { lines: cellData.lines.map(line => line.slice(localCol)) },
    ]);

    st.grid = newGrid;
    return true;
}

/**
 * @param { CommonState } st
 * @param { "Vertical" | "Horizontal" } direction
 * @returns { SlicePrimsState }
 */
export function editSlice(st, direction) {
    return {
        type: "SlicePrimsState",
        grid: st.grid,
        direction
    };
}
