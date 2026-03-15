/**
 * The editor state for cell-level primitive operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

export class CellPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {Set<grid.CellPath>} selection
     */
    constructor(g, selection) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {Set<grid.CellPath>} */
        this.selection = selection;
    }

    /** @returns {CellPrimsState} */
    clone() {
        const g = grid.clone(
            this.grid,
            data => ({ lines: [...data.lines] })
        );
        const selection = new Set(this.selection.values().map(cell => ({ ...cell })));
        return new CellPrimsState(g, selection);
    }
}
