/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as rect from "../../rect.js";
import * as state from "../state-utils.js";
import { EdgePrimsState, EdgeMovingPrimsState, EdgeSlidingPrimsState } from "./state.js";

/** @import { Inverse, CommonState, Cell } from "../common-state.d.ts" */
/** @import { EdgeLocation } from "./state.js" */

/**
 * Select an edge of the leaf under the given global point. Edge is one
 * of the four relative edges of the leaf.
 *
 * @param {EdgePrimsState} st
 * @param {point.P2} pt
 * @param {EdgeLocation} edge
 */
function _selectEdgeUnderPoint(st, pt, edge) {
    /** @type {grid.Leaf<Cell>} */
    let leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return;
    }

    switch(edge) {
    case "Left":  leaf = grid.leafToLeftOf(st.grid, leaf); edge = "Right"; break;
    case "Right": break;
    case "Above": leaf = grid.leafAbove(st.grid, leaf); edge = "Below"; break;
    case "Below": break;
    }

    if(!leaf) {
        return;
    }

    st.selection = { edge, leaf };
}

/**
 * Select an edge of the leaf under the given global point.
 *
 * @type {(st: EdgePrimsState, pt: point.P2, edge: EdgeLocation) => Inverse<EdgePrimsState>}
 */
export const selectEdgeUnderPoint = state.withDefaultInverse(_selectEdgeUnderPoint);

/**
 * Test whether an edge can be selected under the given global point.
 *
 * @param {EdgePrimsState} st
 * @param {point.P2} pt
 * @param {EdgeLocation} edge
 * @returns {boolean} `true` if an edge exists at the given point, `false` otherwise.
 */
export function canSelectEdgeUnderPoint(st, pt, edge) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return false;
    }

    if(edge === "Left" && !grid.leafToLeftOf(st.grid, leaf)) {
        return false;
    }

    if(edge === "Above" && !grid.leafAbove(st.grid, leaf)) {
        return false;
    }

    return true;
}

/**
 * Count the number of trailing blank lines in a leaf.
 *
 * @param {grid.Leaf<Cell>} leaf
 * @returns {number}
 */
function _countTrailingBlankLines(leaf) {
    let count = 0;
    for(let i = leaf.data.lines.length - 1; i >= 0; --i) {
        if(leaf.data.lines[i].trim() !== "") {
            break;
        }
        ++count;
    }
    return count;
}

/**
 * Move the selected vertical edge by the given number of columns. If
 * the selected edge is not vertical, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgeMovingPrimsState} st
 * @param {number} n
 */
function _moveVerticalEdge(st, n) {
    if(st.selection.edge === "Below") {
        return;
    }

    const leaf = st.selection.leaf;
    const globalCol = grid.posOfLeaf(st.grid, leaf).x + leaf.dims.width - 1;
    const leaves = [...grid.leavesUnderCol(st.grid, globalCol)];

    if(n < 0) {
        const spaceToLeft = leaves.reduce((min, l) => {
            const maxLineLen = l.data.lines.reduce((max, line) => Math.max(max, line.length), 0);
            return Math.min(min, l.dims.width - Math.max(maxLineLen, 1));
        }, Infinity);
        n = Math.max(-spaceToLeft, n);
    }

    if(n === 0) {
        return;
    }

    st.grid = grid.modifyWidthOfLeaves(st.grid, n, leaves);
}

/**
 * Move the selected vertical edge by the given number of columns.
 *
 * @type {(st: EdgeMovingPrimsState, n: number) => Inverse<EdgeMovingPrimsState>}
 */
export const moveVerticalEdge = state.withDefaultInverse(_moveVerticalEdge);

/**
 * Move the selected horizontal edge by the given number of rows. If
 * the selected edge is not horizontal, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgeMovingPrimsState} st
 * @param {number} n
 */
function _moveHorizontalEdge(st, n) {
    if(st.selection.edge === "Right") {
        return;
    }

    // Find the row just above the horizontal edge.
    const leftLeaf = st.selection.leaf;
    const globalRow = grid.posOfLeaf(st.grid, leftLeaf).y + leftLeaf.dims.height - 1;
    const leaves = [...grid.leavesUnderRow(st.grid, globalRow)];

    // Find the minimum height of all of the leaves.
    const spaceAbove = leaves.reduce((lowest, leaf) => {
        const trailingBlanks = Math.min(_countTrailingBlankLines(leaf), leaf.data.lines.length - 1);
        return Math.min(lowest, trailingBlanks);
    }, Infinity);
    n = Math.max(-spaceAbove, n);
    if(n === 0) {
        return;
    }

    st.grid = grid.modifyHeightOfLeaves(st.grid, n, leaves);

    // Add or remove lines of text from each leaf so that the leaf's
    // grid height agrees with the number of lines.
    for(const leaf of leaves) {
        const h = leaf.dims.height;

        if(leaf.data.lines.length < h) {
            // Need to add additional lines.
            for(let i = leaf.data.lines.length; i < h; ++i) leaf.data.lines.push("");
        } else {
            // Need to remove lines.
            leaf.data.lines = leaf.data.lines.slice(0, h);
        }
    }
}

/**
 * Move the selected horizontal edge by the given number of rows.
 *
 * @type {(st: EdgeMovingPrimsState, n: number) => Inverse<EdgeMovingPrimsState>}
 */
export const moveHorizontalEdge = state.withDefaultInverse(_moveHorizontalEdge);

/**
 * Slide the selected horizontal edge by the given number of rows. If
 * the selected edge is not horizontal, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgeSlidingPrimsState} st
 * @param {number} n
 */
function _slideHorizontalEdge(st, n) {
    if(st.selection.edge === "Right") {
        return;
    }

    throw new Error("TODO");
}

/**
 * Slide the selected horizontal edge by the given number of rows.
 *
 * @type {(st: EdgeSlidingPrimsState, n: number) => Inverse<EdgeSlidingPrimsState>}
 */
export const slideHorizontalEdge = state.withDefaultInverse(_slideHorizontalEdge);

/**
 * Slide the selected vertical edge by the given number of columns. If
 * the selected edge is not vertical, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgeSlidingPrimsState} st
 * @param {number} n
 */
function _slideVerticalEdge(st, n) {
    if(st.selection.edge === "Below") {
        return;
    }

    throw new Error("TODO");
}

/**
 * Slide the selected vertical edge by the given number of columns.
 *
 * @type {(st: EdgeSlidingPrimsState, n: number) => Inverse<EdgeSlidingPrimsState>}
 */
export const slideVerticalEdge = state.withDefaultInverse(_slideVerticalEdge);

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[EdgeMovingPrimsState, Inverse<S>]}
 */
export function moveEdge(st) {
    const snapshot = st.clone();
    const firstLeaf = grid.allLeaves(st.grid).next().value;

    return [ new EdgeMovingPrimsState(st.grid, { edge: "Right", leaf: firstLeaf }), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start moving edge"
    } ];
}

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[EdgeSlidingPrimsState, Inverse<S>]}
 */
export function slideEdge(st) {
    const snapshot = st.clone();
    const firstLeaf = grid.allLeaves(st.grid).next().value;

    return [ new EdgeSlidingPrimsState(st.grid, { edge: "Right", leaf: firstLeaf }), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start sliding edge"
    } ];
}
