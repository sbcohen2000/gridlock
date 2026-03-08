/**
 * The editor state for cell slicing primitive operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

export class SlicePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {"Vertical" | "Horizontal"} direction
     */
    constructor(g, direction) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {"Vertical" | "Horizontal"} */
        this.direction = direction;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new SlicePrimsState(g, this.direction);
    }
}
