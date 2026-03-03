/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state.js";

/**
 * Select an edge of the leaf under the given global point. Edge is one
 * of the four relative edges of the leaf.
 *
 * @param {state.EditingCells} st
 * @param {point.P2} pt
 * @param {state.EdgeLocation} edge
 * @returns {boolean} `true` if the selection was changed, `false` otherwise.
 */
export function selectEdgeUnderPoint(st, pt, edge) {
    /** @type {grid.Leaf<state.Cell>} */
    let leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return false;
    }

    switch(edge) {
    case "Left":  leaf = grid.leafToLeftOf(st.grid, leaf); edge = "Right"; break;
    case "Right": break;
    case "Above": leaf = grid.leafAbove(st.grid, leaf); edge = "Below"; break;
    case "Below": break;
    }

    // Check that this isn't already the current selection.
    if(st.selection.type === "Edge"
       && st.selection.edge === edge
       && st.selection.leaf === leaf) {
        return false;
    }

    st.selection = {
        type: "Edge",
        edge,
        leaf
    };

    return true;
}

/**
 * Count the number of trailing blank lines in a leaf.
 *
 * @param {grid.Leaf<state.Cell>} leaf
 * @returns {number}
 */
function countTrailingBlankLines(leaf) {
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
 * Shift the selected vertical edge by the given number of rows. If
 * the selected edge is not vertical, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} n
 * @param {any} glpk
 * @param {grid.SolveSettings<state.Cell>} [settings]
 * @returns {Promise<boolean>} `true` if the edge position was
 *     changed, and false otherwise.
 */
export async function modifyVerticalEdge(st, n, glpk, settings) {
    if(st.selection.type === "Leaves" || st.selection.edge === "Below") {
        return false;
    }

    settings.measure = (leaf) => leaf.data.lines.reduce((maxLen, line) =>
        Math.max(maxLen, line.length), 0);

    const g = await grid.modifyWidth(st.grid, n, st.selection.leaf, glpk, settings);
    if(g !== null) {
        st.grid = g;
        return true;
    } else {
        return false;
    }
}

/**
 * Shift the selected horizontal edge by the given number of rows. If
 * the selected edge is not horizontal, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} n
 * @returns {boolean} `true` if the edge position was changed, and
 *     false otherwise.
 */
export function modifyHorizontalEdge(st, n) {
    if(st.selection.type === "Leaves" || st.selection.edge === "Right") {
        return false;
    }

    // TODO: how to shift text between cells?

    // Find the row just above the horizontal edge.
    const leftLeaf = st.selection.leaf;
    const globalRow = grid.posOfLeaf(st.grid, leftLeaf).y + leftLeaf.dims.height - 1;
    const leaves = [...grid.leavesUnderRow(st.grid, globalRow)];

    // Find the minimum height of all of the leaves.
    const spaceAbove = leaves.reduce((lowest, leaf) => {
        const trailingBlanks = Math.min(countTrailingBlankLines(leaf), leaf.data.lines.length - 1);
        return Math.min(lowest, trailingBlanks);
    }, Infinity);
    n = Math.max(-spaceAbove, n);
    if(n === 0) {
        return false;
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

    return true;
}
