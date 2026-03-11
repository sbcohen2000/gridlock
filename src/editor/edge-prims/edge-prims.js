/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as point from "../../point.js";
import * as grid from "../../grid.js";
import * as state from "../state-utils.js";
import { EdgePrimsState, EdgeMovingPrimsState, EdgeSlidingPrimsState } from "./state.js";

/** @import { Inverse, CommonState, Cell } from "../common-state.d.ts" */

/**
 * Select the edge adjacent to the leaf under the global point in the
 * given direction.
 *
 * @param {EdgePrimsState} st
 * @param {point.P2} pt
 * @param {"Left" | "Right" | "Above" | "Below"} direction
 * @returns {boolean} `true` if the selection was changed (i.e. the
 *     parameters describe a valid edge), or `false` if the selection
 *     was invalid, and hence was not changed.
 */
export function selectEdgeUnderPoint(st, pt, direction) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return false;
    }

    const chain = grid.parentChain(st.grid, leaf);

    /** @type {grid.Grid<Cell>} */
    let last = leaf;
    for(const node of chain) {
        const atRightChild = direction === "Left"  && node.type === "Horz" && node.right === last;
        const atLeftChild  = direction === "Right" && node.type === "Horz" && node.left  === last;
        const atBelowChild = direction === "Above" && node.type === "Vert" && node.right === last;
        const atAboveChild = direction === "Below" && node.type === "Vert" && node.left  === last;

        if(atRightChild || atLeftChild || atBelowChild || atAboveChild) {
            st.selection = node;
            return true;
        }

        last = node;
    }

    return false;
}

/**
 * Select the edge of the given `node`.
 *
 * @param {EdgePrimsState} st
 * @param {grid.Split<Cell>} node
 */
function _selectEdgeOfNode(st, node) {
    // Check that the node is in the grid by trying to find a path to
    // it.
    let path = grid.pathToNode(st.grid, node);
    if(path !== undefined) {
        return;
    }

    st.selection = node;
}

/**
 * Select the edge of the given `node`.
 *
 * @type {(st: EdgePrimsState, node: grid.Split<Cell>) => Inverse<EdgePrimsState>}
 */
export const selectEdgeOfNode = state.withDefaultInverse(_selectEdgeOfNode);

/**
 * Move the selected edge by the given number of rows/columns.
 *
 * @param {EdgeMovingPrimsState} st
 * @param {number} n
 */
function _moveEdge(st, n) {
    void st;
    void n;
    throw new Error("TODO");
}

/**
 * Move the selected edge by the given number of rows/columns.
 *
 * @type {(st: EdgeMovingPrimsState, n: number) => Inverse<EdgeMovingPrimsState>}
 */
export const moveEdge = state.withDefaultInverse(_moveEdge);

/**
 * Slide the selected edge by the given number of rows/columns. If the
 * selected edge is not horizontal, or there is no selected edge, then
 * this function does nothing.
 *
 * @param {EdgeSlidingPrimsState} st
 * @param {number} n
 */
function _slideEdge(st, n) {
    void st;
    void n;
    throw new Error("TODO");
}

/**
 * Slide the selected edge by the given number of rows/columns.
 *
 * @type {(st: EdgeSlidingPrimsState, n: number) => Inverse<EdgeSlidingPrimsState>}
 */
export const slideEdge = state.withDefaultInverse(_slideEdge);

/**
 * @template {CommonState} S
 * @param {S} st
 * @returns {[EdgeMovingPrimsState, Inverse<S>]}
 */
export function startMovingEdge(st) {
    const snapshot = st.clone();
    const firstNode = grid.allNodes(st.grid).next().value;

    return [ new EdgeMovingPrimsState(st.grid, firstNode), {
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
export function startSlidingEdge(st) {
    const snapshot = st.clone();
    const firstNode = grid.allNodes(st.grid).next().value;

    return [ new EdgeSlidingPrimsState(st.grid, firstNode), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start sliding edge"
    } ];
}
