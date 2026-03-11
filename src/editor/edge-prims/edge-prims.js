/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { EdgePrimsState, EdgeMovingPrimsState, EdgeSlidingPrimsState } from "./state.js";
import { assert, clamp } from "../../util.js";

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
    if(path === undefined) {
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
 * Given a function `f` which knows how to mutate the structure of the
 * grid, remember the text in the leaves underneath `f`, call `f`,
 * then restore the text to the leaves.
 *
 * @param {(grid: grid.Grid<Cell>) => grid.Grid<Cell>} f
 * @param {grid.Grid<Cell>} g
 * @returns {grid.Grid<Cell>}
 */
function projectTextOntoLeaves(f, g) {
    // Construct a rectangle of characters to hold the text
    const text = Array.from({ length: g.dims.height }, () =>
        Array.from({ length: g.dims.width }, () => null));

    /**
     * @param {[grid.Leaf<Cell>, point.P2]} positionedLeaf
     */
    const projOntoText = (positionedLeaf) => {
        const [leaf, pos] = positionedLeaf;
        for(let i = 0; i < leaf.data.lines.length; ++i) {
            const line = leaf.data.lines[i];
            const row = i + pos.y;
            text[row].splice(pos.x, line.length, ...Array.from(line));
        }
    }

    // Project the leaf text onto `text`.
    grid.allLeavesWithPosition(g).forEach(projOntoText);
    const newG = f(g);

    /**
     * @param {[grid.Leaf<Cell>, point.P2]} positionedLeaf
     */
    const projOntoLeaves = (positionedLeaf) => {
        const [leaf, pos] = positionedLeaf;
        leaf.data.lines = [];
        for(let i = 0; i < leaf.dims.height; ++i) {
            const row = i + pos.y;
            const line = text[row].slice(pos.x, pos.x + leaf.dims.width)
                  .map(c => c ?? " ")
                  .join("")
                  .trimEnd();
            leaf.data.lines.push(line);
       }
   }

    // Project the text back onto the leaves.
    grid.allLeavesWithPosition(newG).forEach(projOntoLeaves);

    return newG;
}

/**
 * Slide the selected edge by the given number of rows/columns. If the
 * selected edge is not horizontal, or there is no selected edge, then
 * this function does nothing.
 *
 * @param {EdgeSlidingPrimsState} st
 * @param {number} n
 */
function _slideEdge(st, n) {
    if(st.selection.type === "Horz") {
        const leftWidth  = st.selection.left.dims.width;

        // Find the width of the narrowest leaf on the left side of
        // the edge.
        const leftLeaves = [...grid.leavesUnderCol(st.selection, leftWidth - 1)];
        const leftMin = leftLeaves.reduce((w, leaf) => Math.min(w, leaf.dims.width), Infinity);

        // Find the width of the narrowest leaf on the right side of
        // the edge.
        const rightLeaves = [...grid.leavesUnderCol(st.selection, leftWidth)];
        const rightMin = rightLeaves.reduce((w, leaf) => Math.min(w, leaf.dims.width), Infinity);

        // Clamp the amount we're sliding so that we can't reduce the
        // size of one of the leaves to zero.
        n = clamp(-(leftMin - 1), n, rightMin - 1);

        // Note that the operations we do in the argument don't
        // add/remove leaves, so there's no need to handle the return
        // value of this function.
        projectTextOntoLeaves((g) => {
            assert(g.type === "Horz");
            grid.modifyWidthOfLeaves(g.left,   n, leftLeaves);
            grid.modifyWidthOfLeaves(g.right, -n, rightLeaves);
            return g;
        }, st.selection);
    } else {
        throw new Error("TODO");
    }
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
