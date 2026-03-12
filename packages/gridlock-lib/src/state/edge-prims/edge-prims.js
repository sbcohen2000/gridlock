/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import * as util from "../../util.js";
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
 * Mutate the given list of lines so that it has at least `n` lines,
 * but if the length of `lines` exceeds `n`, only those empty lines
 * have been trimmed off.
 *
 * @param {number} n
 * @param {string[]} lines
 */
function trimEmptyLines(n, lines) {
    if(lines.length <= n) {
        return;
    }

    const maxTrim = lines.length - n;
    for(let i = 0; i < maxTrim; ++i) {
        if(lines.at(-1) === "") {
            lines.pop();
        } else {
            break;
        }
    }
}

/**
 * Move the selected edge by the given number of rows/columns.
 *
 * @param {EdgeMovingPrimsState} st
 * @param {number} n
 */
function _moveEdge(st, n) {
    if(st.selection.type === "Horz") {
        const leftWidth = st.selection.left.dims.width;
        const upperLeft = grid.posOfLeaf(st.grid, st.selection);
        const globalCol = upperLeft.x + leftWidth;

        // Add space to the column just left of `globalCol`.
        const leftLeaves = [...grid.leavesUnderCol(st.grid, globalCol - 1)];

        const leftMin = util.minimum(leftLeaves.values().map(leaf => leaf.dims.width));
        n = Math.max(-(leftMin - 1), n);

        grid.modifyWidthOfLeaves(st.grid, n, leftLeaves);
    } else {
        const topHeight = st.selection.left.dims.height;
        const upperLeft = grid.posOfLeaf(st.grid, st.selection);
        const globalRow = upperLeft.y + topHeight;

        // Add space to the column just above of `globalRow`.
        const topLeaves = [...grid.leavesUnderRow(st.grid, globalRow - 1)];

        const topMin = util.minimum(topLeaves.values().map(leaf => leaf.dims.height));
        n = Math.max(-(topMin - 1), n);

        grid.modifyHeightOfLeaves(st.grid, n, topLeaves);

        // Add or remove lines as appropriate.
        topLeaves.forEach(leaf => {
            if(leaf.data.lines.length < leaf.dims.height) {
                // There are too few lines.
                leaf.data.lines.push(...Array.from(
                    { length: leaf.dims.height - leaf.data.lines.length },
                    () => ""
                ));
            } else if(leaf.dims.height < leaf.data.lines.length) {
                // There are too many lines.
                trimEmptyLines(leaf.dims.height, leaf.data.lines);
            }
        });
    }
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
    if(st.selection.type === "Horz") {
        const leftWidth = st.selection.left.dims.width;

        // Find the width of the narrowest leaf on the left side of
        // the edge.
        const leftLeaves = [...grid.leavesUnderCol(st.selection, leftWidth - 1)];
        const leftMin = util.minimum(leftLeaves.values().map(leaf => leaf.dims.width));

        // Find the width of the narrowest leaf on the right side of
        // the edge.
        const rightLeaves = [...grid.leavesUnderCol(st.selection, leftWidth)];
        const rightMin = util.minimum(rightLeaves.values().map(leaf => leaf.dims.width));

        // Clamp the amount we're sliding so that we can't reduce the
        // size of one of the leaves to zero.
        n = util.clamp(-(leftMin - 1), n, rightMin - 1);

        // Note that the operations we do in the argument don't
        // add/remove leaves, so there's no need to handle the return
        // value of this function.
        state.projectTextOntoLeaves((g) => {
            util.assert(g.type === "Horz");
            grid.modifyWidthOfLeaves(g.left,   n, leftLeaves);
            grid.modifyWidthOfLeaves(g.right, -n, rightLeaves);
            return g;
        }, st.selection);
    } else {
        const topHeight = st.selection.left.dims.height;

        // Find the height of the shortest leaf above the edge.
        const topLeaves = [...grid.leavesUnderRow(st.selection, topHeight - 1)];
        const topMin = util.minimum(topLeaves.values().map(leaf => leaf.dims.height));

        // Find the height of the shortest leaf below the edge.
        const bottomLeaves = [...grid.leavesUnderRow(st.selection, topHeight)];
        const bottomMin = util.minimum(bottomLeaves.values().map(leaf => leaf.dims.height));

        // Clamp the amount we're sliding so that we can't reduce the
        // size of the leaves to zero.
        n = util.clamp(-(topMin - 1), n, bottomMin - 1);

        state.projectTextOntoLeaves((g) => {
            util.assert(g.type === "Vert");
            grid.modifyHeightOfLeaves(g.left,   n, topLeaves);
            grid.modifyHeightOfLeaves(g.right, -n, bottomLeaves);
            return g;
        }, st.selection);
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
