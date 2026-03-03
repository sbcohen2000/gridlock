/**
 * Text-editing primitive actions
 *
 * @module text-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as util from "../../util.js";

/** @import { TextPrimsState, CommonState, Cell } from "./state.d.ts"; */

/**
 * Update the last global column to the currently selected column.
 *
 * @param {TextPrimsState} st The current editor state.
 */
function _updateLastGlobalCol(st) {
    const globalCol = _findGlobalPoint(st).x;
    st.selection.lastGlobalCol = globalCol;
}

/**
 * Mutate the editor state so that it has a single selection
 * into the given `leaf` at position `pt`.
 *
 * @param {TextPrimsState}  st             The current editor state.
 * @param {grid.Leaf<Cell>} leaf           The leaf to select.
 * @param {point.P2}        pt             The point within the `leaf` to select.
 * @param {number} [newGlobalCol] The new global column position. If
 *    omitted, it is unchanged.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
function _putPointOnLocalPosition(st, leaf, pt, newGlobalCol) {
    // Ensure that the row and column are within bounds of the line.
    pt.y = util.clamp(0, pt.y, leaf.data.lines.length - 1);
    pt.x = util.clamp(0, pt.x, leaf.data.lines[pt.y].length);

    // Check if we're already at this position
    if(st.selection.leaf === leaf &&
       st.selection.pt.x === pt.x &&
       st.selection.pt.y === pt.y &&
       (newGlobalCol === undefined || st.selection.lastGlobalCol === newGlobalCol)) {
        return false;
    }

    st.selection = {
        ...st.selection,
        leaf,
        pt
    };

    if(newGlobalCol !== undefined) {
        st.selection.lastGlobalCol = newGlobalCol;
    }

    return true;
}

/**
 * Mutate the editor state, setting the selection to the given global
 * point. If there isn't a leaf under the global point, this function
 * does nothing.
 *
 * Note that the last leaf on a global line effectively has an extra
 * column, since it is possible to select the character after the last
 * letter on a column.
 *
 * @param {TextPrimsState} st The current editor state.
 * @param {point.P2}       pt The global point to select.
 * @param {boolean} [updateGlobalCol] If `true`, it updates the
 *     `lastGlobalCol` property of the selection to the new point. If
 *     it is omitted, it defaults to `true`.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointOnGlobalPosition(st, pt, updateGlobalCol) {
    if(updateGlobalCol === undefined) {
        updateGlobalCol = true;
    }

    const leaves = [...grid.leavesUnderRow(st.grid, pt.y)];

    // Find the leaf underneath the x-position of the point, or the
    // last leaf, if the point is entirely to the right of the grid.

    // Note that it is guaranteed that the leaves are returned in
    // ascending order of `x` position.
    let x = 0;
    /** @type{grid.Leaf<Cell> | undefined} */
    let theLeaf;
    for(let i = 0; i < leaves.length; ++i) {
        const leaf = leaves[i];
        const isLast = i == leaves.length - 1;

        if(isLast || (x <= pt.x && pt.x < x + leaf.dims.width)) {
            theLeaf = leaf;
            break;
        }

        x += leaf.dims.width;
    }

    if(!theLeaf) return false;

    const leafPos    = grid.posOfLeaf(st.grid, theLeaf);
    const relLeafPos = point.mkP2(pt.x - leafPos.x, pt.y - leafPos.y);
    return _putPointOnLocalPosition(st, theLeaf, relLeafPos, updateGlobalCol ? pt.x : undefined);
}

/**
 * Find the maximum length of any line in a leaf.
 *
 * @param {grid.Leaf<Cell>} leaf
 * @returns {number}
 */
function _maximumLineLength(leaf) {
    return leaf.data.lines.reduce((a, l) => Math.max(a, l.length), 0);
}

/**
 * Expand the `leaf` horizontally to fit its textual content, but only
 * if necessary.
 *
 * @param {grid.Grid<Cell>} g    The root of the grid.
 * @param {grid.Leaf<Cell>} leaf The leaf to expand.
 * @param {any}                   glpk The glpk instance.
 */
async function _expandLeafWidthIfNecessary(g, leaf, glpk) {
    const dW = _maximumLineLength(leaf) - leaf.dims.width;
    if(0 < dW) {
        await grid.modifyWidth(g, dW, leaf, glpk);
    }
}

/**
 * Find the row and column of the current selection in global
 * coordinate space.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {point.P2} The location of the single selection, in global
 *                     coordinates.
 */
function _findGlobalPoint(st) {
    return point.offset(
        grid.posOfLeaf(st.grid, st.selection.leaf),
        point.mkV2(st.selection.pt.x, st.selection.pt.y)
    );
}

/*****************************************************************************/
/** Primitive Point-Positioning Functions                                   **/

/**
 * Put the point at the first character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointAtStartOfGlobalLine(st) {
    const globalRow = _findGlobalPoint(st).y;
    return putPointOnGlobalPosition(st, point.mkP2(0, globalRow));
}

/**
 * Put the point after the last character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointAtEndOfGlobalLine(st) {
    const globalRow = _findGlobalPoint(st).y;
    const last = util.iterLast(grid.leavesUnderRow(st.grid, globalRow));
    if(last === undefined) {
        // Somehow, there's no last child on this row, so do nothing.
        console.warn(`No last child on row ${globalRow}`);
        return false;
    }

    const lastPos = grid.posOfLeaf(st.grid, last);
    const relRow  = globalRow - lastPos.y;
    const col     = last.data.lines[relRow].length;

    // Check if we're already at this position
    if(st.selection.leaf === last &&
       st.selection.pt.y === relRow &&
       st.selection.pt.x === col) {
        return false;
    }

    st.selection.leaf = last;
    st.selection.pt.y = relRow;
    st.selection.pt.x = col;
    _updateLastGlobalCol(st);
    return true;
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointOnNextGlobalLine(st) {
    if(pointOnLastGlobalLine(st)) {
        return false;
    }
    const globalPt = _findGlobalPoint(st);

    // Find the last column with textual content.
    const textOnNextGlobalLine = textOnGlobalLine(st, globalPt.y + 1);
    const lastColumn           = textOnNextGlobalLine.length;

    return putPointOnGlobalPosition(
        st,
        point.mkP2(
            Math.min(st.selection.lastGlobalCol, lastColumn),
            globalPt.y + 1
        ),
        false
    );
}

/**
 * Put the point directly above the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointOnPrevGlobalLine(st) {
    if(pointOnFirstGlobalLine(st)) {
        return false;
    }
    const globalPt = _findGlobalPoint(st);

    // Find the last column with textual content.
    const textOnNextGlobalLine = textOnGlobalLine(st, globalPt.y - 1);
    const lastColumn           = textOnNextGlobalLine.length;

    return putPointOnGlobalPosition(
        st,
        point.mkP2(
            Math.min(st.selection.lastGlobalCol, lastColumn),
            globalPt.y - 1
        ),
        false
    );
}

/**
 * Put the point directly to the right of the current point, if
 * possible, even if the next column is not part of the current leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointOnNextGlobalCol(st) {
    if(pointAtEndOfGlobalLine(st)) {
        return false;
    }

    const localLine = st.selection.leaf.data.lines[st.selection.pt.y];
    const atEndOfLocalLine = st.selection.pt.x === localLine.length;

    if(atEndOfLocalLine) {
        // Skip ahead to the beginning of the next leaf.

        const upperLeft = grid.posOfLeaf(st.grid, st.selection.leaf);
        // Offset the leaf's upper left by the full width of the leaf
        // and the local row number.
        const globalPt  = point.offset(upperLeft, point.mkV2(
            st.selection.leaf.dims.width,
            st.selection.pt.y
        ));
        return putPointOnGlobalPosition(st, globalPt);
    } else {
        // Advance the point locally.
        return _putPointOnNextCol(st);
    }

}

/**
 * Put the point directly to the right of the current point, but not
 * leaving the current leaf.
 *
 * @param {TextPrimsState} st
 * @returns {boolean} `true` if the point moved, and `false` otherwise.
 */
function _putPointOnNextCol(st) {
    const localRow = st.selection.pt.y;
    const localCol = st.selection.pt.x;
    const line     = st.selection.leaf.data.lines[localRow];

    if(localCol === line.length) {
        return false;
    }

    st.selection.pt.x += 1;

    _updateLastGlobalCol(st);
    return true;
}

/**
 * Put the point directly to the left of the current point, if
 * possible, even if the previous column is not part of the current
 * leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function putPointOnPrevGlobalCol(st) {
    if(pointAtBeginningOfGlobalLine(st)) {
        return false;
    }

    const globalPt = _findGlobalPoint(st);
    return putPointOnGlobalPosition(st, point.offset(globalPt, point.mkV2(-1, 0)));
}

/*****************************************************************************/
/** Point-Querying Functions                                                **/

/**
 * Test if the point of the current single selection is at the end of
 * the global line.
 *
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointAtEndOfGlobalLine(st) {
    // Check that we're at the end of our own local line.
    const localRow  = st.selection.pt.y;
    const localCol  = st.selection.pt.x;
    const localLine = st.selection.leaf.data.lines[localRow];
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
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointAtBeginningOfGlobalLine(st) {
    return _findGlobalPoint(st).x === 0;
}

/**
 * Test if the point of the current single selection is on the first
 * global row.
 *
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointOnFirstGlobalLine(st) {
    return _findGlobalPoint(st).y === 0;
}

/**
 * Test if the point of the current single selection is on the last
 * global line.
 *
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointOnLastGlobalLine(st) {
    // Check that we're on the last row of our local cell.
    if(st.selection.pt.y < st.selection.leaf.dims.height - 1) {
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
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function globalLineIsEmpty(st) {
    const globalPt = _findGlobalPoint(st);
    return grid.leavesUnderRow(st.grid, globalPt.y).every(leaf => {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow = globalPt.y - leafPos.y;

        return leaf.data.lines[relRow].length === 0;
    });
}

/**
 * Get the full text content of the given row by concatenating the
 * local lines from each leaf on the row, and inserting spaces to make
 * up the space between leaves.
 *
 * @param {TextPrimsState} st
 * @param {number} row
 * @returns {string}
 */
export function textOnGlobalLine(st, row) {
    let text = '';
    let x = 0;
    for(const leaf of grid.leavesUnderRow(st.grid, row)) {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow = row - leafPos.y;

        for(let xx = x; xx < leafPos.x; ++xx) {
            text += " ";
            ++x;
        }

        const line = leaf.data.lines[relRow];
        x += line.length;

        text += line;
    }
    return text.trimEnd();
}

/*****************************************************************************/
/** Primitive Text Removal Functions                                        **/

/**
 * Remove the line referred to by the current point, across all
 * leaves, removing newly empty leaves.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {string} The contents of the line.
 */
export function removeGlobalLine(st) {
    // Don't remove the last line - editor must have at least one line
    if(st.grid.dims.height === 1) {
        return "";
    }

    let contents = "";
    const globalPt = _findGlobalPoint(st);
    const leaves = [...grid.leavesUnderRow(st.grid, globalPt.y)];
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
    // might now be gone. Ensure we don't go to a negative row.
    const newRow = Math.max(0, globalPt.y - 1);
    putPointOnGlobalPosition(st, point.mkP2(0, newRow));

    return contents;
}

/**
 * Remove the `n` characters of text before the point. This function
 * will not leave the context of its leaf, even if `n` exceeds the
 * length of the current line.
 *
 * @param {TextPrimsState} st The editor state.
 * @param {number} n The number of characters to remove.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function removeString(st, n) {
    const sel = st.selection;

    const row    = sel.pt.y;
    const col    = sel.pt.x;
    const line   = sel.leaf.data.lines[row];

    if(line === "" || sel.pt.x === 0) {
        return false;
    }

    const before = line.slice(0, col - n);
    const after  = line.slice(col);
    sel.leaf.data.lines[row] = before + after;

    // Move the cursor left by the number of characters removed.
    sel.pt.x -= n;
    _updateLastGlobalCol(st);
    return true;
}

/*****************************************************************************/
/** Primitive Text Insertion Functions                                      **/

/**
 * Put the point on the next line, creating it, even if that line is
 * not in the currently selected leaf. If we're at the end of the
 * document, then this function also creates a new line in the current
 * leaf and sets the point to it.
 *
 * @param {TextPrimsState} st   The editor state.
 * @returns {boolean} `true` if the state was modified, `false` otherwise.
 */
export function insertGlobalNewline(st) {
    // Find the location of the cursor in the global coordinate space.
    const globalPt  = _findGlobalPoint(st);
    const globalRow = globalPt.y;
    const globalCol = globalPt.x;

    // Add a line to each leaf _at_ `row`.
    const leaves = [...grid.leavesUnderRow(st.grid, globalRow)];
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
    return true;
}

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @param {TextPrimsState} st   The editor state.
 * @param {string}         s    The string to insert.
 * @param {any}            glpk The GLPK instance.
 * @param {boolean} [advancePoint] Should the point advance as a
 *     result of inserting the string? If omitted, the default is
 *     `true`.
 * @returns {Promise<boolean>} `true` if the state was modified, `false` otherwise.
 */
export async function insertString(st, s, glpk, advancePoint) {
    if(advancePoint === undefined) {
        advancePoint = true;
    }

    if(s.length === 0) {
        return false;
    }

    const row    = st.selection.pt.y;
    const col    = st.selection.pt.x;
    const line   = st.selection.leaf.data.lines[row];
    const before = line.slice(0, col);
    const after  = line.slice(col);
    st.selection.leaf.data.lines[row] = before + s + after;

    if(advancePoint) {
        // Advance the cursor by the length of the string.
        st.selection.pt.x += s.length;
        _updateLastGlobalCol(st);
    }

    await _expandLeafWidthIfNecessary(st.grid, st.selection.leaf, glpk);
    return true;
}

/**
 * @param { CommonState } st
 * @returns { TextPrimsState }
 */
export function editText(st) {
    const firstLeaf = grid.allLeaves(st.grid).next().value;
    return {
        type: "TextPrimsState",
        grid: st.grid,
        selection: {
            pt: point.mkP2(0, 0),
            leaf: firstLeaf,
            lastGlobalCol: 0
        }
    };
}
