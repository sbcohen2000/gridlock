/**
 * Primitive actions on cells.
 *
 * @module cell-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";

/** @import { Inverse } from "../common-state.d.ts" */
/** @import { CellPrimsState, CommonState } from "./state.d.ts" */

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

    return [ {
        type: "CellPrimsState",
        grid: st.grid,
        selection: { leaves: new Set() },
        clone() {
            const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
            /** @type {CellPrimsState} */
            const result = {
                type: "CellPrimsState",
                grid: g,
                clone: this.clone,
                selection: { leaves: new Set() }
            };
            for(const leaf of this.selection.leaves.values()) {
                const leafUl = grid.posOfLeaf(this.grid, leaf);
                _selectLeafUnderPoint(result, leafUl, false);
            }
            return result;
        }
    }, {
        apply: async (s) => {
            Object.assign(s, snapshot);
        },
        fwdDescription: "start editing cells"
    } ];
}
