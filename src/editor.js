import * as grid from "./grid.js";
import * as point from "./point.js";
import * as util from "./util.js";

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
 * @param {grid.Grid<Cell>} [g] The cell grid.
 * @returns {EditorState}
 */
export function mk(g) {
    if(!g) {
        let src = "empty"
        g = grid.mk(src.length, 1, {
            lines: [src]
        });
    }

    const firstLeaf = grid.leafUnderPoint(g, point.mkOrigin());

    return {
        grid: g,
        selection: {
            type: "Single",
            leaf: firstLeaf,
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
export function setSelectionPoint(leaf, pt, st) {
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
 * Mutate the editor state, setting the selection to the given global
 * point. If there isn't a leaf under the global point, this function
 * does nothing.
 *
 * @param {point.P2}    pt The global point to select.
 * @param {EditorState} st The current editor state.
 */
export function putPointOnGlobalPosition(pt, st) {
    const leaf       = grid.leafUnderPoint(st.grid, pt);
    if(!leaf) return;

    const leafPos    = grid.posOfLeaf(st.grid, leaf);
    const relLeafPos = point.mkP2(pt.x - leafPos.x, pt.y - leafPos.y);
    setSelectionPoint(leaf, relLeafPos, st);
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
 * Find the maximum length of any line in a leaf.
 *
 * @param {grid.Leaf<Cell>} leaf
 * @returns {number}
 */
function maximumLineLength(leaf) {
    return leaf.data.lines.reduce((a, l) => Math.max(a, l.length), 0);
}

/**
 * Expand the `leaf` to fit its textual content, but only if necessary.
 *
 * @param {grid.Grid<Cell>} g    The root of the grid.
 * @param {grid.Leaf<Cell>} leaf The leaf to expand.
 * @param {any}             glpk The glpk instance.
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
 * @param {EditorState} st The editor state.
 * @returns {IteratorObject<grid.Leaf<Cell>>}
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
 * @param {grid.Grid<Cell>} g The grid.
 * @param {SingleSelection} sel The current (single) selection.
 * @returns {point.P2} The location of the single selection, in global
 *                     coordinates.
 */
function findGlobalPoint(g, sel) {
    return point.offset(
        grid.posOfLeaf(g, sel.leaf),
        point.mkV2(sel.pt.x, sel.pt.y)
    );
}

/*****************************************************************************/
/** Primitive Point-Positioning Functions                                   **/

/**
 * Put the point at the first character of the current line, even if
 * that line belongs to a different cell.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointAtStartOfGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const globalRow = findGlobalPoint(st.grid, st.selection).y;
    putPointOnGlobalPosition(point.mkP2(0, globalRow), st);
}

/**
 * Put the point after the last character of the current line, even if
 * that line belongs to a different cell.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointAtEndOfGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const globalRow = findGlobalPoint(st.grid, st.selection).y;
    const last = util.iterLast(eachLeafOnGlobalRow(globalRow, st));
    if(last === undefined) {
        // Somehow, there's no last child on this row, so do nothing.
        console.warn(`No last child on row ${globalRow}`);
        return;
    }

    const lastPos = grid.posOfLeaf(st.grid, last);
    const relRow  = globalRow - lastPos.y;
    const col     = last.data.lines[relRow].length;

    st.selection.leaf = last;
    st.selection.pt.y = relRow;
    st.selection.pt.x = col;
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointOnNextGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    if(pointOnLastGlobalRow(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.selection.pt, point.mkV2(0, 1)),
        st
    );
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointOnPrevGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    if(pointOnFirstGlobalRow(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.selection.pt, point.mkV2(0, -1)),
        st
    );
}

/**
 * Put the point directly to the right of the current point, if
 * possible, even if the next column is not part of the current leaf.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointOnNextGlobalCol(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    if(pointAtEndOfGlobalLine(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.selection.pt, point.mkV2(1, 0)),
        st
    );
}

/**
 * Put the point directly to the left of the current point, if
 * possible, even if the previous column is not part of the current
 * leaf.
 *
 * If there is a multi-selection, this function does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function putPointOnPrevGlobalCol(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    if(pointAtBeginningOfGlobalLine(st)) {
        return;
    }

    putPointOnGlobalPosition(
        point.offset(st.selection.pt, point.mkV2(-1, 0)),
        st
    );
}

/*****************************************************************************/
/** Point-Querying Functions                                                **/

/**
 * Test if the point of the current single selection is at the end of
 * the global line.
 *
 * @param {EditorState} st
 * @returns {boolean}
 */
export function pointAtEndOfGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return false;
    }

    // Check that we're at the end of our own local line.
    const localRow  = st.selection.pt.y;
    const localCol  = st.selection.pt.x;
    const localLine = st.selection.leaf.data.lines[localRow];
    if(localLine.length !== localCol) {
        return false;
    }

    // Check that there's no cell to the right of us.
    const globalPt = findGlobalPoint(st.grid, st.selection);
    return undefined === grid.leafUnderPoint(
        st.grid,
        point.offset(globalPt, point.mkV2(1, 0))
    );
}

/**
 * Test if the point of the current single selection is at the
 * beginning of the global line.
 *
 * @param {EditorState} st
 * @returns {boolean}
 */
export function pointAtBeginningOfGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return false;
    }

    return findGlobalPoint(st.grid, st.selection).x === 0;
}

/**
 * Test if the point of the current single selection is on the first
 * global row.
 *
 * @param {EditorState} st
 * @returns {boolean}
 */
export function pointOnFirstGlobalRow(st) {
    if(st.selection.type === "Multi") {
        return false;
    }

    return findGlobalPoint(st.grid, st.selection).y === 0;
}

/**
 * Test if the point of the current single selection is on the last
 * global row.
 *
 * @param {EditorState} st
 * @returns {boolean}
 */
export function pointOnLastGlobalRow(st) {
    if(st.selection.type === "Multi") {
        return false;
    }

    // Check that we're on the last row of our local cell.
    if(st.selection.pt.y < st.selection.leaf.dims.height - 1) {
        return false;
    }

    // Check that there's no cell below us.
    const globalPt = findGlobalPoint(st.grid, st.selection);
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
 * @param {EditorState} st
 * @returns {boolean}
 */
export function globalLineIsEmpty(st) {
    if(st.selection.type === "Multi") {
        return false;
    }

    const globalPt = findGlobalPoint(st.grid, st.selection);
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
 * If the current selection is a multi-selection, then this function
 * does nothing.
 *
 * @param {EditorState} st The editor state.
 */
export function removeGlobalLine(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const globalPt = findGlobalPoint(st.grid, st.selection);
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
 * @param {grid.Leaf<Cell>} leaf The leaf at which to insert the new line.
 * @param {number}          row  The row number at which to insert the new line.
 * @param {string}          s    The contents of the new row.
 * @param {EditorState}     st   The editor state.
 * @param {any}             glpk The glpk instance.
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
 * If there is a multi-selection, this function does nothing.
 *
 * @param {string}      s    The initial contents of the new line.
 * @param {EditorState} st   The editor state.
 * @param {any}         glpk The glpk instance.
 */
export async function insertGlobalNewline(s, st, glpk) {
    if(st.selection.type === "Multi") {
        return;
    }

    // Find the location of the cursor in the global coordinate space.
    const globalPt = findGlobalPoint(st.grid, st.selection);
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

    st.selection = {
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

    await expandLeafIfNecessary(st.grid, sel.leaf, glpk);
}

/*****************************************************************************/
/** Cell-Slicing Primitives                                                 **/

/**
 * Slice the cell vertically at the current point, so that the
 * character under the point and those characters to the right of the
 * point in the same cell occupy their own cell.
 *
 * If the selection is a multi-selection, then this function does
 * nothing.
 *
 * @param {EditorState} st
 */
export function splitCellVerticallyAtPoint(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const localRow = st.selection.pt.y;
    st.grid = grid.splitLeafVertically(
        st.grid,
        st.selection.leaf,
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
 * If the selection is a multi-selection, then this function does
 * nothing.
 *
 * @param {EditorState} st
 */
export function splitCellHorizontallyAtPoint(st) {
    if(st.selection.type === "Multi") {
        return;
    }

    const localCol = st.selection.pt.x;
    st.grid = grid.splitLeafHorizontally(
        st.grid,
        st.selection.leaf,
        localCol,
        (data) => [
            { lines: data.lines.map(line => line.slice(0, localCol)) },
            { lines: data.lines.map(line => line.slice(localCol)) },
        ]
    );
}
