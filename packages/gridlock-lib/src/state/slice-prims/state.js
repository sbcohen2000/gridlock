/**
 * The editor state for cell slicing primitive operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

/**
 * The editor state for vertical row slicing.
 */
export class SliceRowState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new SliceRowState(g);
    }
}

/**
 * The editor state for horizontal cell slicing.
 */
export class SliceCellState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new SliceCellState(g);
    }
}
