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
 * Add the leaf under the given `pt` to the selection.
 *
 * @param {CellPrimsState} st
 * @param {point.P2} pt
 * @param {boolean} clear If `true`, then clear the existing selection
 *     before adding the leaf under the point.
 */
function _selectLeafUnderPoint(st, pt, clear) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return;
    }

    if(clear) {
        st.selection = { leaves: new Set([leaf]) };
    } else if(!st.selection.leaves.has(leaf)) {
        st.selection.leaves.add(leaf);
    }
}

/**
 * Add the leaf under the given `pt` to the selection.
 *
 * @type {(st: CellPrimsState, pt: point.P2, clear: boolean) => Promise<Inverse<CellPrimsState>>}
 */
export const selectLeafUnderPoint = state.withDefaultInverse(_selectLeafUnderPoint);

/**
 * @template {CommonState} S
 * @param { S } st
 * @returns { [ CellPrimsState, Inverse<S> ] }
 */
export function editCells(st) {
    const snapshot = st.clone();

    return [ new CellPrimsState(st.grid, { leaves: new Set() }), {
        apply: async (_s) => {
            return snapshot;
        },
        fwdDescription: "start editing cells"
    } ];
}
