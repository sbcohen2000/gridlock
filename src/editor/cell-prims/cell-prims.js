/**
 * Primitive actions on cells.
 *
 * @module cell-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state.js";

/**
 * Add the leaf under the given `pt` to the selection.
 *
 * @param {state.EditingCells} st
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

    if(st.selection.type === "Leaves" && !clear) {
        st.selection.leaves.add(leaf);
    } else {
        st.selection = {
            type: "Leaves",
            leaves: new Set([leaf])
        };
    };
    return true;
}
