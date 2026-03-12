/**
 * The editor state for cell slicing primitive operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

/**
 * The editor state for vertical cell slicing.
 */
export class VerticalSlicePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new VerticalSlicePrimsState(g);
    }
}

/**
 * The editor state for horizontal cell slicing.
 */
export class HorizontalSlicePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new HorizontalSlicePrimsState(g);
    }
}
