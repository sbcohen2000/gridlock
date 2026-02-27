/**
 * Primitive actions on the cell grid.
 *
 * @module cell-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import { assert } from "../../util.js";
import * as state from "../state.js";

/**
 * Select the edge straddling points `ptA` and `ptB`, where `ptA` and
 * `ptB` are in different leaves. If the leaves under `ptA` and `ptB`
 * are not adjacent (by the definition of adjacent in `grid`, then
 * this function does not change the selection.
 *
 * @param {state.EditingCells} st
 * @param {point.P2} ptA
 * @param {point.P2} ptB
 * @returns {boolean} `true` if the selection was changed, `false` otherwise.
 */
export function selectEdgeStraddlingPoints(st, ptA, ptB) {
    const leafA = grid.leafUnderPoint(st.grid, ptA);
    const leafB = grid.leafUnderPoint(st.grid, ptB);

    if(!leafA || !leafB) return false;

    // Check that the leaves are adjacent.
    const adjacency = grid.checkLeavesAdjacent(st.grid, leafA, leafB);
    if(!adjacency) return false;

    // If the leaves are adjacent, we must ensure that they are
    // siblings, otherwise we won't be able to uniquely select the
    // edge between them.
    const [newLeaf, newGrid] = grid.mergeLeaves(st.grid, leafA, leafB);

    // Now, reproduce the structure of the original node, by splitting
    // the `newLeaf`.
    /** @type{grid.Grid<state.Cell>} */
    let splitGrid;
    /** @type{grid.Grid<state.Cell>} */
    let edgeNode;
    switch(adjacency) {
    case "AAboveB":
        [edgeNode, splitGrid] = grid.splitLeafVertically(newGrid, newLeaf, leafA.dims.height, () => [leafA.data, leafB.data]);
        break;
    case "ABelowB":
        [edgeNode, splitGrid] = grid.splitLeafVertically(newGrid, newLeaf, leafB.dims.height, () => [leafB.data, leafA.data]);
        break;
    case "ALeftOfB":
        [edgeNode, splitGrid] = grid.splitLeafHorizontally(newGrid, newLeaf, leafA.dims.width, () => [leafA.data, leafB.data]);
        break;
    case "ARightOfB":
        [edgeNode, splitGrid] = grid.splitLeafHorizontally(newGrid, newLeaf, leafB.dims.width, () => [leafB.data, leafA.data]);
    }

    st.grid = splitGrid;
    st.selection = {
        type: "Edge",
        node: edgeNode
    };

    return true;
}

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
 * Shift the selected vertical edge by the given number of columns.
 * If the selected edge is not vertical, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {state.EditingCells} st
 * @param {number} n
 * @param {any} glpk The GLPK instance.
 * @returns {Promise<boolean>} `true` if the edge position was changed, and
 *     false otherwise.
 */
export async function modifyVerticalEdge(st, n, glpk) {
    if(st.selection.type === "Leaves") {
        return false;
    }

    const parent = st.selection.node;
    assert(parent.type !== "Leaf");

    // Guard against the wrong kind of edge.
    if(parent.type === "Vert") return false;

    // TODO: how to shift text between cells?
    st.grid = await grid.modifyWidth(st.grid, n, parent.left, glpk);
    return true;
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
    if(st.selection.type === "Leaves") {
        return false;
    }

    const parent = st.selection.node;
    assert(parent.type !== "Leaf");

    // Guard against the wrong kind of edge.
    if(parent.type === "Horz") return false;

    // TODO: how to shift text between cells?

    // Find the row just above the horizontal edge.
    const globalRow = grid.posOfLeaf(st.grid, parent.right).y - 1;
    const leaves = grid.leavesUnderRow(st.grid, globalRow);

    // Find the minimum height of all of the leaves.
    const remainingHeight = leaves.reduce((h, leaf) => Math.min(h, leaf.dims.height), 0);
    n = Math.max(-remainingHeight + 1, n);
    if(n === 0) {
        return false;
    }

    grid.modifyHeightOfLeaves(st.grid, n, [...leaves]);
    return true;
}
