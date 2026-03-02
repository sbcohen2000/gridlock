/**
 * Primitive actions on the cell grid.
 *
 * @module cell-prims
 */

import * as util from "../../util.js";
import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state.js";

/**
 * Add the leaf under the given `pt` to the selection.
 *
 * @param {state.EditingCells} st
 * @param {point.P2} pt
 * @param {boolean} clear If `true`, then clear the existing selection
 *     before adding the leaf under the point.
 * @returns {boolean} `true` if the selection was changed, `false` otherwise.
 */
export function selectLeafUnderPoint(st, pt, clear) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) {
        return false;
    }

    if(st.selection.type === "Leaves" && !clear) {
        st.selection.leaves.add(leaf);
    } else {
        st.selection = {
            type: "Leaves",
            leaves: new Set([leaf])
        };
    };
    return true;
}

/**
 * Find the leaf to the left, or above, the selected edge. If the
 * selection isn't on edges, this function returns `undefined`.
 *
 * We care about the leaf to the left (or above) the selected edge
 * since it's the leaf that will be expanded/contracted when the edge
 * is moved.
 *
 * @param {state.EditingCells} st
 * @returns {grid.Leaf<state.Cell> | undefined}
 */
export function leafAssociatedWithEdgeSelection(st) {
    if(st.selection.type === "Leaves") return undefined;

    switch(st.selection.edge) {
    case "Left":  return grid.leafToLeftOf(st.grid, st.selection.leaf);
    case "Right": return st.selection.leaf;
    case "Above": return grid.leafAbove(st.grid, st.selection.leaf);
    case "Below": return st.selection.leaf;
    }
}

/**
 * Slice the selected cell vertically at the given row number. If the
 * row number is out of range, this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} row
 * @returns {boolean} `true` if the cell was split, `false` otherwise.
 */
export function splitCellVerticallyAtRow(st, row) {
    if(st.selection.type === "Edge") {
        return false;
    }

    if(st.selection.leaves.size !== 1) {
        return false;
    }

    /** @type {grid.Leaf<state.Cell>} */
    const selectedLeaf = st.selection.leaves.values().next().value;

    const [newParent, newGrid] = grid.splitLeafVertically(st.grid, selectedLeaf, row, (cellData) =>
        [
            { lines: cellData.lines.slice(0, row) },
            { lines: cellData.lines.slice(row) }
        ]
    );

    if(!newParent) {
        return false;
    }

    st.grid = newGrid;
    st.selection.leaves = new Set();
    return true;
}

/**
 * Slice the selected cell horizontally at the given column number. If
 * the column number is out of range, this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} col
 * @returns {boolean} `true` if the cell was split, `false` otherwise.
 */
export function splitCellHorizontallyAtColumn(st, col) {
    if(st.selection.type === "Edge") {
        return false;
    }

    if(st.selection.leaves.size !== 1) {
        return false;
    }

    /** @type {grid.Leaf<state.Cell>} */
    const selectedLeaf = st.selection.leaves.values().next().value;

    const [newParent, newGrid] = grid.splitLeafHorizontally(st.grid, selectedLeaf, col, (cellData) =>
        [
            { lines: cellData.lines.map(line => line.slice(0, col)) },
            { lines: cellData.lines.map(line => line.slice(col)) }
        ]
    );

    if(!newParent) {
        return false;
    }

    st.grid = newGrid;
    st.selection.leaves = new Set();
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
    if(st.selection.type === "Leaves"
       || st.selection.edge === "Above"
       || st.selection.edge === "Below") {
        return false;
    }

    const leftLeaf = leafAssociatedWithEdgeSelection(st);
    const g = await grid.modifyWidth(st.grid, n, leftLeaf, glpk, settings);
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
    if(st.selection.type === "Leaves"
       || st.selection.edge === "Left"
       || st.selection.edge === "Right") {
        return false;
    }

    const leftLeaf = leafAssociatedWithEdgeSelection(st);

    // TODO: how to shift text between cells?

    // Find the row just above the horizontal edge.
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
