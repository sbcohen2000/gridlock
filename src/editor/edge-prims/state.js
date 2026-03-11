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

/**
 * Abstract base class for edge editing states. Subclasses distinguish
 * between move and slide modes.
 */
export class EdgePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {grid.Split<Cell>} selection
     */
    constructor(g, selection) {
        if(new.target === EdgePrimsState) {
            throw new Error("Cannot instantiate EdgePrimsState directly");
        }
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {grid.Split<Cell>} */
        this.selection = selection;
    }

    /**
     * @abstract
     * @returns {EdgePrimsState}
     */
    clone() {
        throw new Error("Method not implemented");
    }

    /**
     * Clone the grid and find the corresponding selection node in the
     * new grid. Subclasses use this to implement `clone()`.
     *
     * @returns {[grid.Grid<Cell>, grid.Split<Cell>]}
     * @protected
     */
    _cloneGridAndSelection() {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));

        // Need to introduce a method in `grid` which can identify a
        // node by its path. That way, we can identify a node in the
        // cloned grid.
        throw new Error("TODO");
    }
}

/**
 * The editor state for edge moving operations.
 */
export class EdgeMovingPrimsState extends EdgePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {grid.Split<Cell>} selection
     */
    constructor(g, selection) {
        super(g, selection);
    }

    clone() {
        const [g, selection] = this._cloneGridAndSelection();
        return new EdgeMovingPrimsState(g, selection);
    }
}

/**
 * The editor state for edge sliding operations.
 */
export class EdgeSlidingPrimsState extends EdgePrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {grid.Split<Cell>} selection
     */
    constructor(g, selection) {
        super(g, selection);
    }

    clone() {
        const [g, selection] = this._cloneGridAndSelection();
        return new EdgeSlidingPrimsState(g, selection);
    }
}
