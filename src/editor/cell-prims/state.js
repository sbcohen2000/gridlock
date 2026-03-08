/**
 * The editor state for cell-level primitive operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

export class CellPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {{ leaves: Set<grid.Leaf<Cell>> }} selection
     */
    constructor(g, selection) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {{ leaves: Set<grid.Leaf<Cell>> }} */
        this.selection = selection;
    }

    /** @returns {CellPrimsState} */
    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        const newLeaves = new Set(
            [...this.selection.leaves].map(leaf => {
                const leafPos = grid.posOfLeaf(this.grid, leaf);
                return grid.leafUnderPoint(g, leafPos);
            })
        );
        return new CellPrimsState(g, { leaves: newLeaves });
    }
}
