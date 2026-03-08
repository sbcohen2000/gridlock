/**
 * The editor state for edge modification operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

/**
 * @typedef {"Right" | "Below"} CanonicalEdgeLocation
 */

/**
 * @typedef {CanonicalEdgeLocation | "Left" | "Above"} EdgeLocation
 */

export class EdgePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {{ edge: CanonicalEdgeLocation, leaf: grid.Leaf<Cell> }} selection
     */
    constructor(g, selection) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {{ edge: CanonicalEdgeLocation, leaf: grid.Leaf<Cell> }} */
        this.selection = selection;
    }

    clone() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        const leafPos = grid.posOfLeaf(this.grid, this.selection.leaf);
        const newLeaf = grid.leafUnderPoint(g, leafPos);
        return new EdgePrimsState(g, { edge: this.selection.edge, leaf: newLeaf });
    }
}
