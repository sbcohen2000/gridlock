/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { EdgePrimsState } from "./state.js";

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

    st.selection = { edge, leaf };
}

/**
 * Select an edge of the leaf under the given global point.
 *
 * @type {(st: EdgePrimsState, pt: point.P2, edge: EdgeLocation) => Promise<Inverse<EdgePrimsState>>}
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
    return grid.leafUnderPoint(st.grid, pt) !== undefined;
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
 * Shift the selected vertical edge by the given number of rows. If
 * the selected edge is not vertical, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgePrimsState} st
 * @param {number} n
 * @param {any} glpk
 * @param {grid.SolveSettings<Cell>} [settings]
 */
async function _modifyVerticalEdge(st, n, glpk, settings) {
    if(st.selection.edge === "Below") {
        return;
    }

    settings.measure = (leaf) => leaf.data.lines.reduce((maxLen, line) =>
        Math.max(maxLen, line.length), 0);

    const g = await grid.modifyWidth(st.grid, n, st.selection.leaf, glpk, settings);
    if(g !== null) {
        st.grid = g;
    }
}

/**
 * Shift the selected vertical edge by the given number of columns.
 *
 * @type {(st: EdgePrimsState, n: number, glpk: any, settings?: grid.SolveSettings<Cell>) => Promise<Inverse<EdgePrimsState>>}
 */
export const modifyVerticalEdge = state.withDefaultInverse(_modifyVerticalEdge);

/**
 * Shift the selected horizontal edge by the given number of rows. If
 * the selected edge is not horizontal, or there is no selected edge,
 * then this function does nothing.
 *
 * @param {EdgePrimsState} st
 * @param {number} n
 */
function _modifyHorizontalEdge(st, n) {
    if(st.selection.edge === "Right") {
        return;
    }

    // TODO: how to shift text between cells?

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
 * Shift the selected horizontal edge by the given number of rows.
 *
 * @type {(st: EdgePrimsState, n: number) => Promise<Inverse<EdgePrimsState>>}
 */
export const modifyHorizontalEdge = state.withDefaultInverse(_modifyHorizontalEdge);

/**
 * @template {CommonState} S
 * @param { S } st
 * @returns { [ EdgePrimsState, Inverse<S> ] }
 */
export function editEdge(st) {
    const snapshot = st.clone();
    const firstLeaf = grid.allLeaves(st.grid).next().value;

    return [ new EdgePrimsState(st.grid, { edge: "Right", leaf: firstLeaf }), {
        apply: async (_s) => {
            return snapshot;
        },
        fwdDescription: "start editing edge"
    } ];
}
