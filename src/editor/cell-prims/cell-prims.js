/**
 * Primitive actions on cells.
 *
 * @module cell-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";

/** @import { CellPrimsState, CommonState } from "./state.d.ts" */

/**
 * Add the leaf under the given `pt` to the selection.
 *
 * @param {CellPrimsState} st
 * @param {point.P2} pt
 * @param {boolean} clear If `true`, then clear the existing selection
 *     before adding the leaf under the point.
 * @returns {boolean} `true` if the selection was changed, `false` otherwise.
 */
export function selectLeafUnderPoint(st, pt, clear) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return false;
    }

    if(clear) {
        st.selection = { leaves: new Set([leaf]) };
    } else {
        st.selection.leaves.add(leaf);
    };
    return true;
}

/**
 * @param { CommonState } st
 * @returns { CellPrimsState }
 */
export function editCells(st) {
    return {
        type: "CellPrimsState",
        grid: st.grid,
        selection: { leaves: new Set() }
    };
}
