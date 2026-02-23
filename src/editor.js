import * as grid from "./grid.js";
import * as point from "./point.js";
import GLPK from "glpk.js";

/**
 * @typedef {Object} Cell
 * @property {string[]} lines The lines of text inside the cell.
 */

/**
 * @typedef {Object} SingleSelection
 * @property {"Single"}        type A tag indicating the kind of
 *                                  selection.
 * @property {grid.Leaf<Cell>} leaf The leaf in the grid which is
 *                                  currently selected.
 * @property {point.P2}       pt    The current position of the cursor
 *                                  within the cell.
 */

/**
 * @typedef {Object} MultiSelection
 * @property {"Multi"}         type   A tag indicating the kind of
 *                                    selection.
 * @property {grid.Leaf<Cell>} leaves The selected leaves.
 */

/**
 * @typedef {SingleSelection | MultiSelection} Selection
 */

/**
 * @typedef {Object} EditorState
 * @property {grid.Grid<Cell>} grid      The underlying grid.
 * @property {Selection}       selection The current selection.
 */

/**
 * Construct a new `EditorState`.
 *
 * @returns {EditorState}
 */
export function mk() {
    const l = grid.mk(8, 1, {
        lines: ["text"]
    });
    return {
        grid: l,
        selection: {
            type: "Single",
            leaf: l,
            pt: point.mkOrigin()
        }
    }
}

/**
 * Mutate the editor state so that it has a single selection
 * into the given `leaf` at position `pt`.
 *
 * @param {grid.Leaf<Cell>} leaf The leaf to select.
 * @param {point.P2}        pt   The point within the `leaf` to select.
 * @param {EditorState}     st   The current editor state.
 */
export function updateSingleSelection(leaf, pt, st) {
    // Ensure that the row and column are within bounds of the line.
    pt.y = Math.max(0, Math.min(pt.y, leaf.data.lines.length - 1));
    pt.x = Math.max(0, Math.min(pt.x, leaf.data.lines[pt.y].length));

    st.selection = {
        type: "Single",
        leaf,
        pt
    };
}

/**
 * Ensure that the given state represents a `SingleSelection`. If it
 * doesn't, set the selection to the first position in the first
 * selected leaf.
 *
 * @param {EditorState} st The editor state.
 * @returns {SingleSelection} The single selection.
 */
export function ensureSingleSelection(st) {
    if(st.selection.type === "Multi") {
        /** @type {grid.Leaf<Cell>} */
        const leaf = st.selection.leaves[0] ?? grid.allLeaves(st.grid).next().value;

        st.selection = {
            type: "Single",
            leaf,
            pt: point.mkOrigin()
        };
        return st.selection;
    }

    return st.selection;
}

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @param {string}      s    The string to insert.
 * @param {EditorState} st   The editor state.
 * @param {any}         glpk The GLPK instance.
 */
export async function insertString(s, st, glpk) {
    const sel = ensureSingleSelection(st);

    // Insert text into the row.
    const row    = sel.pt.y;
    const col    = sel.pt.x;
    const line   = sel.leaf.data.lines[row];
    const before = line.slice(0, col);
    const after  = line.slice(col);
    sel.leaf.data.lines[row] = before + s + after;

    // Advance the cursor by the length of the string.
    sel.pt.x += s.length;

    // Check if we need to expand the width of the leaf.
    const dW = line.length - sel.leaf.dims.width;
    if(0 < dW) {
        await grid.modifyWidth(st.grid, dW, sel.leaf, glpk);
    }
}

/**
 * Remove the line referenced by the current point, putting the point
 * on the last character of the previous line, even if that line belongs
 * to a different cell.
 *
 * If there is a multi-selection, this function does nothing. If there
 * are no lines above the line referred to by the point, this function
 * also does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function removeLineAndPutPointOnPrevLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    // TODO
    return;
}

/**
 * Remove the character before the point if there is a single
 * selection, and do nothing if there is a multi selection.
 *
 * @param {EditorState} st The editor state.
 */
export function removeCharBeforePoint(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const sel = st.selection;

    const row    = sel.pt.y;
    const col    = sel.pt.x;
    const line   = sel.leaf.data.lines[row];

    if(line === "") {
        // Remove the line, if we can.
        return removeLineAndPutPointOnPrevLine(st);
    } else if(sel.pt.x === 0) {
        return;
    }

    const before = line.slice(0, col - 1);
    const after  = line.slice(col);
    sel.leaf.data.lines[row] = before + after;

    // Move the cursor left by one place.
    sel.pt.x -= 1;
}
