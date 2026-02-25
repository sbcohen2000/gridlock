/**
 * Editor primitive actions
 *
 * @module prims
 */

import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "./state.js";
import * as util from "../util.js";

/**
 * Mutate the editor state so that it has a single selection
 * into the given `leaf` at position `pt`.
 *
 * @param {grid.Leaf<state.Cell>} leaf The leaf to select.
 * @param {point.P2}              pt   The point within the `leaf` to select.
 * @param {state.EditingLeaf}     st   The current editor state.
 */
export function setSelectionPoint(leaf, pt, st) {
    // Ensure that the row and column are within bounds of the line.
    pt.y = Math.max(0, Math.min(pt.y, leaf.data.lines.length - 1));
    pt.x = Math.max(0, Math.min(pt.x, leaf.data.lines[pt.y].length));

    st.singleSelection = {
        type: "Single",
        leaf,
        pt
    };
}

/**
 * Mutate the editor state, setting the selection to the given global
 * point. If there isn't a leaf under the global point, this function
 * does nothing.
 *
 * @param {point.P2}    pt The global point to select.
 * @param {state.EditingLeaf} st The current editor state.
 */
export function putPointOnGlobalPosition(pt, st) {
    const leaf       = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) return;

    const leafPos    = grid.posOfLeaf(st.grid, leaf);
    const relLeafPos = point.mkP2(pt.x - leafPos.x, pt.y - leafPos.y);
    setSelectionPoint(leaf, relLeafPos, st);
}

/**
 * Find the maximum length of any line in a leaf.
 *
 * @param {grid.Leaf<state.Cell>} leaf
 * @returns {number}
 */
function maximumLineLength(leaf) {
    return leaf.data.lines.reduce((a, l) => Math.max(a, l.length), 0);
}

/**
 * Expand the `leaf` to fit its textual content, but only if necessary.
 *
 * @param {grid.Grid<state.Cell>} g    The root of the grid.
 * @param {grid.Leaf<state.Cell>} leaf The leaf to expand.
 * @param {any}                   glpk The glpk instance.
 */
async function expandLeafIfNecessary(g, leaf, glpk) {
    // Adjust the height of the leaf, if necessary.
    const dH = leaf.data.lines.length - leaf.dims.height;
    if(0 < dH) {
        grid.modifyHeight(g, dH, leaf);
    }

    // Adjust the width of the leaf, if necessary.
    const dW = maximumLineLength(leaf) - leaf.dims.width;
    if(0 < dW) {
        await grid.modifyWidth(g, dW, leaf, glpk);
    }
}

/**
 * Return an iterator over the leaves on a global `row`.
 *
 * @param {number} row
 * @param {state.EditingLeaf} st The editor state.
 * @returns {IteratorObject<grid.Leaf<state.Cell>>}
 */
function* eachLeafOnGlobalRow(row, st) {
    let curCol = 0;
    while(curCol < st.grid.dims.width) {
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(curCol, row));
        yield leaf;
        curCol += leaf.dims.width;
    }
}

/**
 * Find the row and column of the current selection in global
 * coordinate space.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @returns {point.P2} The location of the single selection, in global
 *                     coordinates.
 */
function findGlobalPoint(st) {
    return point.offset(
        grid.posOfLeaf(st.grid, st.singleSelection.leaf),
        point.mkV2(st.singleSelection.pt.x, st.singleSelection.pt.y)
    );
}

/*****************************************************************************/
/** Primitive Point-Positioning Functions                                   **/

/**
 * Put the point at the first character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointAtStartOfGlobalLine(st) {
    const globalRow = findGlobalPoint(st).y;
    putPointOnGlobalPosition(point.mkP2(0, globalRow), st);
}

/**
 * Put the point after the last character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointAtEndOfGlobalLine(st) {
    const globalRow = findGlobalPoint(st).y;
    const last = util.iterLast(eachLeafOnGlobalRow(globalRow, st));
    if(last === undefined) {
        // Somehow, there's no last child on this row, so do nothing.
        console.warn(`No last child on row ${globalRow}`);
        return;
    }

    const lastPos = grid.posOfLeaf(st.grid, last);
    const relRow  = globalRow - lastPos.y;
    const col     = last.data.lines[relRow].length;

    st.singleSelection.leaf = last;
    st.singleSelection.pt.y = relRow;
    st.singleSelection.pt.x = col;
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnNextGlobalLine(st) {
    if(pointOnLastGlobalRow(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.singleSelection.pt, point.mkV2(0, 1)),
        st
    );
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnPrevGlobalLine(st) {
    if(pointOnFirstGlobalRow(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.singleSelection.pt, point.mkV2(0, -1)),
        st
    );
}

/**
 * Put the point directly to the right of the current point, if
 * possible, even if the next column is not part of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnNextGlobalCol(st) {
    if(pointAtEndOfGlobalLine(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.singleSelection.pt, point.mkV2(1, 0)),
        st
    );
}

/**
 * Put the point directly to the left of the current point, if
 * possible, even if the previous column is not part of the current
 * leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnPrevGlobalCol(st) {
    if(pointAtBeginningOfGlobalLine(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.singleSelection.pt, point.mkV2(-1, 0)),
        st
    );
}

/*****************************************************************************/
/** Point-Querying Functions                                                **/

/**
 * Test if the point of the current single selection is at the end of
 * the global line.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointAtEndOfGlobalLine(st) {
    // Check that we're at the end of our own local line.
    const localRow  = st.singleSelection.pt.y;
    const localCol  = st.singleSelection.pt.x;
    const localLine = st.singleSelection.leaf.data.lines[localRow];
    if(localLine.length !== localCol) {
        return false;
    }

    // Check that there's no cell to the right of us.
    const globalPt = findGlobalPoint(st);
    return undefined === grid.leafUnderPoint(
        st.grid,
        point.offset(globalPt, point.mkV2(1, 0))
    );
}

/**
 * Test if the point of the current single selection is at the
 * beginning of the global line.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointAtBeginningOfGlobalLine(st) {
    return findGlobalPoint(st).x === 0;
}

/**
 * Test if the point of the current single selection is on the first
 * global row.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointOnFirstGlobalRow(st) {
    return findGlobalPoint(st).y === 0;
}

/**
 * Test if the point of the current single selection is on the last
 * global row.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointOnLastGlobalRow(st) {
    // Check that we're on the last row of our local cell.
    if(st.singleSelection.pt.y < st.singleSelection.leaf.dims.height - 1) {
        return false;
    }

    // Check that there's no cell below us.
    const globalPt = findGlobalPoint(st);
    return undefined === grid.leafUnderPoint(
        st.grid,
        point.offset(globalPt, point.mkV2(0, 1))
    );
}

/*****************************************************************************/
/** Line-Querying Functions                                                 **/

/**
 * Test if the current global line is empty.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function globalLineIsEmpty(st) {
    const globalPt = findGlobalPoint(st);
    return eachLeafOnGlobalRow(globalPt.y, st).every(leaf => {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow = globalPt.y - leafPos.y;

        return leaf.data.lines[relRow].length === 0;
    });
}

/*****************************************************************************/
/** Primitive Text Removal Functions                                        **/

/**
 * Remove the line referred to by the current point, across all
 * leaves, removing newly empty leaves.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function removeGlobalLine(st) {
    const globalPt = findGlobalPoint(st);
    for(const leaf of eachLeafOnGlobalRow(globalPt.y, st)) {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow = globalPt.y - leafPos.y;

        leaf.data.lines.splice(relRow, 1);
        grid.modifyHeight(st.grid, -1, leaf);
    }

    const [newGrid, _removedLeaves] = grid.removeEmptyLeaves(st.grid);
    st.grid = newGrid;

    // We need to set the selection here again since the selected leaf
    // might now be gone.
    putPointOnGlobalPosition(point.mkP2(0, globalPt.y), st);
}

/**
 * Remove the character before the point.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function removeCharBeforePoint(st) {
    const sel = st.singleSelection;

    const row    = sel.pt.y;
    const col    = sel.pt.x;
    const line   = sel.leaf.data.lines[row];

    if(line === "" || sel.pt.x === 0) {
        return;
    }

    const before = line.slice(0, col - 1);
    const after  = line.slice(col);
    sel.leaf.data.lines[row] = before + after;

    // Move the cursor left by one place.
    sel.pt.x -= 1;
}

/*****************************************************************************/
/** Primitive Text Insertion Functions                                      **/

/**
 * Insert a line at `row` in `leaf`, with contents `s`.
 *
 * @param {grid.Leaf<state.Cell>} leaf The leaf at which to insert the new line.
 * @param {number}                row  The row number at which to insert the new line.
 * @param {string}                s    The contents of the new row.
 * @param {state.EditingLeaf}     st   The editor state.
 * @param {any}                   glpk The glpk instance.
 */
async function insertLineAtLeaf(leaf, row, s, st, glpk) {
    // Insert the new line.
    const lines = leaf.data.lines;
    lines.splice(row, 0, s);

    await expandLeafIfNecessary(st.grid, leaf, glpk);
}

/**
 * Put the point on the next line, creating it, even if that line is
 * not in the currently selected leaf. If we're at the end of the
 * document, then this function also creates a new line in the current
 * leaf and sets the point to it.
 *
 * @param {string}      s    The initial contents of the new line.
 * @param {state.EditingLeaf} st   The editor state.
 * @param {any}         glpk The glpk instance.
 */
export async function insertGlobalNewline(s, st, glpk) {
    // Find the location of the cursor in the global coordinate space.
    const globalPt = findGlobalPoint(st);
    let row = globalPt.y + 1;

    // If there's no leaf underneath the point, we want to add a row
    // to the last line of each existing leaf. So, decrement `row`.
    const fstLeaf = grid.leafUnderPoint(st.grid, point.mkP2(0, row));
    if(fstLeaf === undefined) --row;

    // Add a line to each leaf _at_ `row`.
    let isFst = true;
    for(const leaf of eachLeafOnGlobalRow(row, st)) {
        await insertLineAtLeaf(leaf, row, isFst ? s : "", st, glpk);
        isFst = false;
    }

    st.singleSelection = {
        type: "Single",
        pt: point.mkP2(0, globalPt.y + 1),
        leaf: fstLeaf
    };
}

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @param {string}            s    The string to insert.
 * @param {state.EditingLeaf} st   The editor state.
 * @param {any}               glpk The GLPK instance.
 */
export async function insertString(s, st, glpk) {
    const row    = st.singleSelection.pt.y;
    const col    = st.singleSelection.pt.x;
    const line   = st.singleSelection.leaf.data.lines[row];
    const before = line.slice(0, col);
    const after  = line.slice(col);
    st.singleSelection.leaf.data.lines[row] = before + s + after;

    // Advance the cursor by the length of the string.
    st.singleSelection.pt.x += s.length;

    await expandLeafIfNecessary(st.grid, st.singleSelection.leaf, glpk);
}

/*****************************************************************************/
/** Cell-Slicing Primitives                                                 **/

/**
 * Slice the cell vertically at the current point, so that the
 * character under the point and those characters to the right of the
 * point in the same cell occupy their own cell.
 *
 * @param {state.EditingLeaf} st
 */
export function splitCellVerticallyAtPoint(st) {
    const localRow = st.singleSelection.pt.y;
    st.grid = grid.splitLeafVertically(
        st.grid,
        st.singleSelection.leaf,
        localRow,
        (data) => [
            { lines: data.lines.slice(0, localRow) },
            { lines: data.lines.slice(localRow) },
        ]
    );
}

/**
 * Slice the cell horizontally above the row of the current point.
 * If the cell has only one row, then this function does nothing.
 *
 * @param {state.EditingLeaf} st
 */
export function splitCellHorizontallyAtPoint(st) {
    const localCol = st.singleSelection.pt.x;
    st.grid = grid.splitLeafHorizontally(
        st.grid,
        st.singleSelection.leaf,
        localCol,
        (data) => [
            { lines: data.lines.map(line => line.slice(0, localCol)) },
            { lines: data.lines.map(line => line.slice(localCol)) },
        ]
    );
}
