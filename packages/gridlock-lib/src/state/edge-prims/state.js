/**
 * The editor state for edge modification operations.
 */

import * as grid from "../../grid.js";

/** @import { Cell } from "../common-state.d.ts" */

/**
 * Abstract base class for edge moving states.
 */
export class EdgeMovingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        if(new.target === EdgeMovingPrimsState) {
            throw new Error("Cannot instantiate EdgeMovingPrimsState directly");
        }
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    /**
     * @abstract
     * @returns {EdgeMovingPrimsState}
     */
    clone() {
        throw new Error("Method not implemented");
    }

    /** @returns {grid.Grid<Cell>} */
    _cloneGrid() {
        return grid.clone(this.grid, data => ({ lines: [...data.lines] }));
    }
}

/**
 * Abstract base class for edge sliding states.
 */
export class EdgeSlidingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     */
    constructor(g) {
        if(new.target === EdgeSlidingPrimsState) {
            throw new Error("Cannot instantiate EdgeSlidingPrimsState directly");
        }
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
    }

    /**
     * @abstract
     * @returns {EdgeSlidingPrimsState}
     */
    clone() {
        throw new Error("Method not implemented");
    }

    /** @returns {grid.Grid<Cell>} */
    _cloneGrid() {
        return grid.clone(this.grid, data => ({ lines: [...data.lines] }));
    }
}

/**
 * State for moving a vertical edge (column boundary).
 *
 * The edge is to the right of the cell at `(rowNo, colNo)`.
 */
export class VertMovingPrimsState extends EdgeMovingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {number} rowNo
     * @param {number} colNo
     */
    constructor(g, rowNo, colNo) {
        super(g);
        /** @type {number} */
        this.rowNo = rowNo;
        /** @type {number} */
        this.colNo = colNo;
    }

    clone() {
        return new VertMovingPrimsState(this._cloneGrid(), this.rowNo, this.colNo);
    }
}

/**
 * State for moving a horizontal edge (row boundary).
 *
 * The `rowNo` is the index of the row below the edge.
 */
export class HorzMovingPrimsState extends EdgeMovingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {number} rowNo
     */
    constructor(g, rowNo) {
        super(g);
        /** @type {number} */
        this.rowNo = rowNo;
    }

    clone() {
        return new HorzMovingPrimsState(this._cloneGrid(), this.rowNo);
    }
}

/**
 * State for sliding a vertical edge (column boundary).
 *
 * The edge is to the right of the cell at `(rowNo, colNo)`.
 */
export class VertSlidingPrimsState extends EdgeSlidingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {number} rowNo
     * @param {number} colNo
     */
    constructor(g, rowNo, colNo) {
        super(g);
        /** @type {number} */
        this.rowNo = rowNo;
        /** @type {number} */
        this.colNo = colNo;
    }

    clone() {
        return new VertSlidingPrimsState(this._cloneGrid(), this.rowNo, this.colNo);
    }
}

/**
 * State for sliding a horizontal edge (row boundary).
 *
 * The `rowNo` is the index of the row below the edge.
 */
export class HorzSlidingPrimsState extends EdgeSlidingPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {number} rowNo
     */
    constructor(g, rowNo) {
        super(g);
        /** @type {number} */
        this.rowNo = rowNo;
    }

    clone() {
        return new HorzSlidingPrimsState(this._cloneGrid(), this.rowNo);
    }
}
