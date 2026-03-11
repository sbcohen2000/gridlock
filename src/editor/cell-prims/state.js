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
        const [g, newLeaves] = grid.cloneMappingNodes(
            this.grid,
            [...this.selection.leaves],
            data => ({ lines: [...data.lines] })
        );
        return new CellPrimsState(g, { leaves: new Set(/** @type {grid.Leaf<Cell>[]} */ (newLeaves)) });
    }
}
