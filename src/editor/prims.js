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
 * Update the last global column to the currently selected column.
 *
 * @param {state.EditingLeaf} st The current editor state.
 */
export function _updateLastGlobalCol(st) {
    const globalCol = _findGlobalPoint(st).x;
    st.singleSelection.lastGlobalCol = globalCol;
}

/**
 * Mutate the editor state so that it has a single selection
 * into the given `leaf` at position `pt`.
 *
 * @param {state.EditingLeaf}     st             The current editor state.
 * @param {grid.Leaf<state.Cell>} leaf           The leaf to select.
 * @param {point.P2}              pt             The point within the `leaf` to select.
 * @param {number} [newGlobalCol] The new global column position. If
 *    omitted, it is unchanged.
 */
export function _putPointOnLocalPosition(st, leaf, pt, newGlobalCol) {
    // Ensure that the row and column are within bounds of the line.
    pt.y = util.clamp(0, pt.y, leaf.data.lines.length - 1);
    pt.x = util.clamp(0, pt.x, leaf.data.lines[pt.y].length);

    st.singleSelection = {
        ...st.singleSelection,
        leaf,
        pt
    };

    if(newGlobalCol !== undefined) {
        st.singleSelection.lastGlobalCol = newGlobalCol;
    }
}


/**
 * Try to put the point near to the `lastGlobalCol`, but do not leave
 * the current leaf while trying to do so.
 *
 * @param {state.EditingLeaf} st The current editor state.
 */
export function _putPointOnLastGlobalColumnInLeaf(st) {
    // Find the location of the global column, relative to the
    // currently selected leaf.
    const leaf = st.singleSelection.leaf;
    const leafPos = grid.posOfLeaf(st.grid, leaf);
    const lastLocalCol = st.singleSelection.lastGlobalCol - leafPos.x;
    _putPointOnLocalPosition(st, leaf, point.mkP2(lastLocalCol, st.singleSelection.pt.y));
}

/**
 * Mutate the editor state, setting the selection to the given global
 * point. If there isn't a leaf under the global point, this function
 * does nothing.
 *
 * @param {state.EditingLeaf} st The current editor state.
 * @param {point.P2}          pt The global point to select.
 * @param {boolean} [updateGlobalCol] If `true`, it updates the
 *     `lastGlobalCol` property of the selection to the new point. If
 *     it is omitted, it defaults to `true`.
 */
export function putPointOnGlobalPosition(st, pt, updateGlobalCol) {
    if(updateGlobalCol === undefined) {
        updateGlobalCol = true;
    }

    const leaf       = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) return;

    const leafPos    = grid.posOfLeaf(st.grid, leaf);
    const relLeafPos = point.mkP2(pt.x - leafPos.x, pt.y - leafPos.y);
    _putPointOnLocalPosition(st, leaf, relLeafPos, updateGlobalCol ? pt.x : undefined);
}

/**
 * Find the maximum length of any line in a leaf.
 *
 * @param {grid.Leaf<state.Cell>} leaf
 * @returns {number}
 */
function _maximumLineLength(leaf) {
    return leaf.data.lines.reduce((a, l) => Math.max(a, l.length), 0);
}

/**
 * Expand the `leaf` horizontally to fit its textual content, but only
 * if necessary.
 *
 * @param {grid.Grid<state.Cell>} g    The root of the grid.
 * @param {grid.Leaf<state.Cell>} leaf The leaf to expand.
 * @param {any}                   glpk The glpk instance.
 */
async function _expandLeafWidthIfNecessary(g, leaf, glpk) {
    const dW = _maximumLineLength(leaf) - leaf.dims.width;
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
function* _eachLeafOnGlobalRow(row, st) {
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
function _findGlobalPoint(st) {
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
    const globalRow = _findGlobalPoint(st).y;
    putPointOnGlobalPosition(st, point.mkP2(0, globalRow));
}

/**
 * Put the point at the first character of the line in the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @returns {boolean} `true` if the point moved, and `false` otherwise.
 */
export function putPointAtStartOfLine(st) {
    if(st.singleSelection.pt.x === 0) {
        st.singleSelection.lastGlobalCol = 0;
        return false;
    }

    st.singleSelection.pt.x = 0;
    _updateLastGlobalCol(st);
    return true;
}

/**
 * Put the point after the last character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointAtEndOfGlobalLine(st) {
    const globalRow = _findGlobalPoint(st).y;
    const last = util.iterLast(_eachLeafOnGlobalRow(globalRow, st));
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
 * Put the point at the end of the currently selected line of the leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @returns {boolean} `true` if the point was moved, and `false` otherwise.
 */
export function putPointAtEndOfLine(st) {
    const row    = st.singleSelection.pt.y;
    const line   = st.singleSelection.leaf.data.lines[row];
    const endCol = line.length;
    if(st.singleSelection.pt.x === endCol) {
        return false;
    }
    st.singleSelection.pt.x = endCol;

    _updateLastGlobalCol(st);
    return true;
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnNextGlobalLine(st) {
    if(pointOnLastGlobalLine(st)) {
        return;
    }

    const globalPt = _findGlobalPoint(st);
    putPointOnGlobalPosition(
        st,
        point.mkP2(
            st.singleSelection.lastGlobalCol,
            globalPt.y + 1
        ),
        false
    );
}

/**
 * Put the point on the next line of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @returns {boolean} `true` if the point was moved, and `false` otherwise.
 */
export function putPointOnNextLine(st) {
    const localRow = st.singleSelection.pt.y;
    if(localRow >= st.singleSelection.leaf.data.lines.length - 1) {
        return false;
    }

    st.singleSelection.pt.y += 1;

    _putPointOnLastGlobalColumnInLeaf(st);
    return true;
}

/**
 * Put the point directly above the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 */
export function putPointOnPrevGlobalLine(st) {
    if(pointOnFirstGlobalLine(st)) {
        return;
    }

    const globalPt = _findGlobalPoint(st);
    putPointOnGlobalPosition(
        st,
        point.mkP2(
            st.singleSelection.lastGlobalCol,
            globalPt.y - 1
        ),
        false
    );
}

/**
 * Put the point on the previous line of the current leaf.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @returns {boolean} `true` if the point was moved, and `false` otherwise.
 */
export function putPointOnPrevLine(st) {
    if(st.singleSelection.pt.y === 0) {
        return false;
    }

    st.singleSelection.pt.y -= 1;

    _putPointOnLastGlobalColumnInLeaf(st);
    return true;
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

    const globalPt = _findGlobalPoint(st);
    putPointOnGlobalPosition(st, point.offset(globalPt, point.mkV2(1, 0)));
}

/**
 * Put the point directly to the right of the current point, but not
 * leaving the current leaf.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean} `true` if the point moved, and `false` otherwise.
 */
export function putPointOnNextCol(st) {
    const localRow = st.singleSelection.pt.y;
    const localCol = st.singleSelection.pt.x;
    const line     = st.singleSelection.leaf.data.lines[localRow];

    if(localCol === line.length) {
        return false;
    }

    st.singleSelection.pt.x += 1;

    _updateLastGlobalCol(st);
    return true;
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

    const globalPt = _findGlobalPoint(st);
    putPointOnGlobalPosition(st, point.offset(globalPt, point.mkV2(-1, 0)));
}

/**
 * Put the point directly to the left of the current point, but not
 * leaving the current leaf.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean} `true` if the point moved, and `false` otherwise.
 */
export function putPointOnPrevCol(st) {
    if(st.singleSelection.pt.x === 0) {
        return false;
    }

    st.singleSelection.pt.x -= 1;

    _updateLastGlobalCol(st);
    return true;
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
    const globalPt = _findGlobalPoint(st);
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
    return _findGlobalPoint(st).x === 0;
}

/**
 * Test if the point of the current single selection is on the first
 * global row.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointOnFirstGlobalLine(st) {
    return _findGlobalPoint(st).y === 0;
}

/**
 * Test if the point of the current single selection is on the last
 * global line.
 *
 * @param {state.EditingLeaf} st
 * @returns {boolean}
 */
export function pointOnLastGlobalLine(st) {
    // Check that we're on the last row of our local cell.
    if(st.singleSelection.pt.y < st.singleSelection.leaf.dims.height - 1) {
        return false;
    }

    // Check that there's no cell below us.
    const globalPt = _findGlobalPoint(st);
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
    const globalPt = _findGlobalPoint(st);
    return _eachLeafOnGlobalRow(globalPt.y, st).every(leaf => {
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
 * @returns {string} The contents of the line.
 */
export function removeGlobalLine(st) {
    let contents = "";
    const globalPt = _findGlobalPoint(st);
    const leaves = [..._eachLeafOnGlobalRow(globalPt.y, st)];
    for(const leaf of leaves) {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow  = globalPt.y - leafPos.y;

        contents += leaf.data.lines[relRow];
        leaf.data.lines.splice(relRow, 1);
    }

    // Modify the leaf heights, now that we've removed a line from
    // each.
    grid.modifyHeightOfLeaves(st.grid, -1, leaves);

    const [newGrid, _removedLeaves] = grid.removeEmptyLeaves(st.grid);
    st.grid = newGrid;

    // We need to set the selection here again since the selected leaf
    // might now be gone.
    putPointOnGlobalPosition(st, point.mkP2(0, globalPt.y - 1));

    return contents;
}

/**
 * Remove the `n` characters of text before the point. This function
 * will not leave the context of its leaf, even if `n` exceeds the
 * length of the current line.
 *
 * @param {state.EditingLeaf} st The editor state.
 * @param {number} n The number of characters to remove.
 */
export function removeString(st, n) {
    const sel = st.singleSelection;

    const row    = sel.pt.y;
    const col    = sel.pt.x;
    const line   = sel.leaf.data.lines[row];

    if(line === "" || sel.pt.x === 0) {
        return;
    }

    const before = line.slice(0, col - n);
    const after  = line.slice(col);
    sel.leaf.data.lines[row] = before + after;

    // Move the cursor left by the number of characters removed.
    sel.pt.x -= n;
    _updateLastGlobalCol(st);
}

/*****************************************************************************/
/** Primitive Text Insertion Functions                                      **/

/**
 * Put the point on the next line, creating it, even if that line is
 * not in the currently selected leaf. If we're at the end of the
 * document, then this function also creates a new line in the current
 * leaf and sets the point to it.
 *
 * @param {state.EditingLeaf} st   The editor state.
 */
export function insertGlobalNewline(st) {
    // Find the location of the cursor in the global coordinate space.
    const globalPt  = _findGlobalPoint(st);
    const globalRow = globalPt.y;
    const globalCol = globalPt.x;

    // Add a line to each leaf _at_ `row`.
    const leaves = [..._eachLeafOnGlobalRow(globalRow, st)]
    for(const leaf of leaves) {
        const leafUpperLeft = grid.posOfLeaf(st.grid, leaf);
        const localRow = globalRow - leafUpperLeft.y;
        const localCol = globalCol - leafUpperLeft.x;

        // Find two strings, the string which we should preserve on
        // the original line, and the string which should be pulled
        // onto the new line (flush).
        const line = leaf.data.lines[localRow];
        const preserve = line.slice(0, util.clamp(0, localCol, line.length));
        const flush    = line.slice(util.clamp(0, localCol, line.length));

        leaf.data.lines[localRow] = preserve;
        leaf.data.lines.splice(localRow + 1, 0, flush);
    }
    grid.modifyHeightOfLeaves(st.grid, 1, leaves);

    putPointOnGlobalPosition(st, point.mkP2(0, globalRow + 1), false);
}

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @param {state.EditingLeaf} st   The editor state.
 * @param {string}            s    The string to insert.
 * @param {any}               glpk The GLPK instance.
 * @param {boolean} [advancePoint] Should the point advance as a
 *     result of inserting the string? If omitted, the default is
 *     `true`.
 */
export async function insertString(st, s, glpk, advancePoint) {
    if(advancePoint === undefined) {
        advancePoint = true;
    }

    const row    = st.singleSelection.pt.y;
    const col    = st.singleSelection.pt.x;
    const line   = st.singleSelection.leaf.data.lines[row];
    const before = line.slice(0, col);
    const after  = line.slice(col);
    st.singleSelection.leaf.data.lines[row] = before + s + after;

    if(advancePoint) {
        // Advance the cursor by the length of the string.
        st.singleSelection.pt.x += s.length;
        _updateLastGlobalCol(st);
    }

    await _expandLeafWidthIfNecessary(st.grid, st.singleSelection.leaf, glpk);
}

/*****************************************************************************/
/** Cell-Slicing Primitives                                                 **/

/**
 * Slice the cell vertically above the row of the current point.
 * If the cell has only one row, then this function does nothing.
 *
 * @param {state.EditingLeaf} st
 */
export function splitCellVerticallyAtPoint(st) {
    const globalPoint = _findGlobalPoint(st);
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
    // Recalculate selection.
    putPointOnGlobalPosition(st, globalPoint, false);
}


/**
 * Slice the cell horizontally at the current point, so that the
 * character under the point and those characters to the right of the
 * point in the same cell occupy their own cell.
 *
 * @param {state.EditingLeaf} st
 */
export function splitCellHorizontallyAtPoint(st) {
    const globalPoint = _findGlobalPoint(st);
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
    // Recalculate selection.
    putPointOnGlobalPosition(st, globalPoint, false);
}
