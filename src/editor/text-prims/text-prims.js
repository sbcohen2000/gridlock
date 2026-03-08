/**
 * Text-editing primitive actions
 *
 * @module text-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import { id } from "../state-utils.js";
import * as util from "../../util.js";

/** @import { Inverse } from "../common-state.d.ts" */
/** @import { TextPrimsState, CommonState, Cell } from "./state.d.ts"; */

/**
 * Update the last global column to the currently selected column.
 *
 * @param {TextPrimsState} st The current editor state.
 */
function _updateLastGlobalCol(st) {
    const globalCol = findGlobalPoint(st).x;
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
 * An object representing the inverse of an operation which only moves
 * the location of the global point.
 *
 * @implements {Inverse<TextPrimsState>}
 */
class PutPointOnGlobalPositionInverse  {
    /** @type {point.P2} */
    #newPos

    /** @type {point.P2} */
    #oldPos

    /** @type {number} */
    #oldGlobalCol

    /**
     * @param {point.P2} newPos The new global position.
     * @param {point.P2} oldPos The old global position.
     * @param {number} oldGlobalCol The old global column.
     */
    constructor(newPos, oldPos, oldGlobalCol) {
        this.#newPos = point.cloneP2(newPos);
        this.#oldPos = point.cloneP2(oldPos);
        this.#oldGlobalCol = oldGlobalCol;
    }

    /**
     * @param {TextPrimsState} st
     */
    async apply(st) {
        putPointOnGlobalPosition(st, this.#oldPos, false);
        st.selection.lastGlobalCol = this.#oldGlobalCol;
    }

    /**
     * @param {Inverse<any>} i
     * @returns {Inverse<TextPrimsState> | null};
     */
    compose(i) {
        if(i instanceof PutPointOnGlobalPositionInverse) {
            return this;
        } else {
            return null;
        }
    }

    get fwdDescription() {
        return `moved point from (${this.#newPos.y}, ${this.#newPos.x}) to (${this.#oldPos.y}, ${this.#oldPos.x})`;
    }
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
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointOnGlobalPosition(st, pt, updateGlobalCol) {
    const oldGlobalCol = st.selection.lastGlobalCol;
    const oldGlobalPt  = findGlobalPoint(st);

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

    if(!theLeaf) return id;

    const leafPos    = grid.posOfLeaf(st.grid, theLeaf);
    const relLeafPos = point.mkP2(pt.x - leafPos.x, pt.y - leafPos.y);
    const didMove    = _putPointOnLocalPosition(st, theLeaf, relLeafPos, updateGlobalCol ? pt.x : undefined);

    if(didMove) {
        return new PutPointOnGlobalPositionInverse(pt, oldGlobalPt, oldGlobalCol);
    } else {
        return id;
    }
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
export function findGlobalPoint(st) {
    const leafPos = grid.posOfLeaf(st.grid, st.selection.leaf);
    if(leafPos === undefined) {
        return point.mkP2(st.selection.pt.x, st.selection.pt.y);
    }
    return point.offset(
        leafPos,
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
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointAtStartOfGlobalLine(st) {
    const globalRow = findGlobalPoint(st).y;
    return putPointOnGlobalPosition(st, point.mkP2(0, globalRow));
}

/**
 * Put the point after the last character of the current line, even if
 * that line belongs to a different cell.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointAtEndOfGlobalLine(st) {
    const globalRow = findGlobalPoint(st).y;
    const globalCol = _lastColumnOnGlobalLine(st, globalRow);
    return putPointOnGlobalPosition(st, point.mkP2(globalCol, globalRow), true);
}

/**
 * Find the column number of the last column on a global line
 * (counting explicit whitespace).
 *
 * @param {TextPrimsState} st
 * @param {number} row
 * @returns {number}
 */
function _lastColumnOnGlobalLine(st, row) {
    const textSegments = [..._extractGlobalLine(st, row)];

    // Find the last non-empty text segment.
    for(let i = textSegments.length - 1; i >= 0; --i) {
        const { globalCol, text } = textSegments[i];
        if(text !== "") {
            return globalCol + text.length;
        }
    }

    return 0;
}

/**
 * Put the point directly below the current point, if possible, even
 * if the next row is not part of the current leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @param {boolean} [stayInCell] Try to stay in the current cell, even
 *     if the cell is empty. It defaults to `false`. When `false`, this
 *     function imitates the behavior of an editor with no cells.
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointOnNextGlobalLine(st, stayInCell) {
    if(pointOnLastGlobalLine(st)) {
        return id;
    }
    const globalPt = findGlobalPoint(st);

    let lastColumn = Infinity;
    if(!stayInCell) {
        lastColumn = _lastColumnOnGlobalLine(st, globalPt.y + 1);
    }

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
 * @param {boolean} [stayInCell] Try to stay in the current cell, even
 *     if the cell is empty. It defaults to `false`. When `false`, this
 *     function imitates the behavior of an editor with no cells.
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointOnPrevGlobalLine(st, stayInCell) {
    if(pointOnFirstGlobalLine(st)) {
        return id;
    }
    const globalPt = findGlobalPoint(st);

    let lastColumn = Infinity;
    if(!stayInCell) {
        lastColumn = _lastColumnOnGlobalLine(st, globalPt.y - 1);
    }

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
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointOnNextGlobalCol(st) {
    if(pointAtEndOfGlobalLine(st)) {
        return id;
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
        const globalPt = findGlobalPoint(st);
        return putPointOnGlobalPosition(st, point.offset(globalPt, point.mkV2(1, 0)));
    }
}

/**
 * Put the point directly to the left of the current point, if
 * possible, even if the previous column is not part of the current
 * leaf.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {Inverse<TextPrimsState>}
 */
export function putPointOnPrevGlobalCol(st) {
    if(pointAtBeginningOfGlobalLine(st)) {
        return id;
    }

    const globalPt = findGlobalPoint(st);
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
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointAtBeginningOfGlobalLine(st) {
    return findGlobalPoint(st).x === 0;
}

/**
 * Test if the point of the current single selection is on the first
 * global row.
 *
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function pointOnFirstGlobalLine(st) {
    return findGlobalPoint(st).y === 0;
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
 * @param {TextPrimsState} st
 * @returns {boolean}
 */
export function globalLineIsEmpty(st) {
    const globalRow = findGlobalPoint(st).y;
    return _extractGlobalLine(st, globalRow).every(({ text }) => text === "");
}

/**
 * @typedef {Object} TextOnGlobalLineIterItem
 * @property {number} globalCol The global column of the
 *     first letter of the line of text in `leaf`.
 * @property {number} localRow  The local row number of
 *     the line in the `leaf`.
 * @property {string} text      The text on the local line of `leaf`.
 * @property {grid.Leaf<Cell>} leaf The leaf.
 */

/**
 * @typedef {IteratorObject<TextOnGlobalLineIterItem>} TextOnGlobalLineIter
 */

/**
 * Get the text on each leaf along with its starting column, on the
 * given global row as an iterator object.
 *
 * @param {TextPrimsState} st
 * @param {number} row
 * @returns {TextOnGlobalLineIter}
 */
function _extractGlobalLine(st, row) {
    return grid.leavesUnderRow(st.grid, row).map(leaf => {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const localRow = row - leafPos.y;
        return {
            globalCol: leafPos.x,
            localRow,
            text: leaf.data.lines[localRow],
            leaf
        };
    });
}

/**
 * Given an iterator over text annotated with column numbers, consume
 * the iterator producing a single string which represents gaps
 * between the cells (as indicated by the column number) with spaces.
 *
 * This function assumes that the column numbers are yielded in
 * increasing order.
 *
 * @param {TextOnGlobalLineIter} textIter
 * @returns {string}
 */
function _concatenatePositionedText(textIter) {
    let out = "";

    /** @type{number | undefined} */
    let x;

    for(const { globalCol, text } of textIter) {
        if(x === undefined) x = globalCol;

        for(let xx = x; xx < globalCol; ++xx) {
            out += " ";
            ++x;
        }

        out += text;
        x += text.length;
    }

    return out.trimEnd();

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
    return _concatenatePositionedText(_extractGlobalLine(st, row));
}

/*****************************************************************************/
/** Primitive Text Removal Functions                                        **/

/**
 * Kill the line at the current point, returning an iterator over the
 * text segments which were to the right of the cursor.
 *
 * @param {TextPrimsState} st
 * @returns {TextOnGlobalLineIterItem[]}
 */
function _killLine(st) {
    // Find the location of the cursor in the global coordinate space.
    const globalPt  = findGlobalPoint(st);
    const globalRow = globalPt.y;
    const globalCol = globalPt.x;

    const textSegments = [..._extractGlobalLine(st, globalRow)];

    /** @type {TextOnGlobalLineIterItem[]} */
    let afterPointer;

    // Find the index of the segment where the pointer lives, splitting
    // the rest of the `textSegments` to the right of the point into
    // `afterPointer`.
    for(let i = textSegments.length - 1; i >= 0; --i) {
        const seg = textSegments[i];

        if(seg.globalCol <= globalCol) {
            // Split off the text before the cursor, since that should
            // remain on the current line.
            let localCol = globalCol - seg.globalCol;
            seg.leaf.data.lines[seg.localRow] =
                seg.leaf.data.lines[seg.localRow].slice(0, localCol);

            afterPointer = textSegments.slice(i);
            afterPointer[0].text = seg.text.slice(localCol);
            afterPointer[0].globalCol += localCol;

            // Clear text on the original row for segments to the
            // right of the cursor, since their content is moving to
            // the new line.
            for(let j = 1; j < afterPointer.length; ++j) {
                const rightSeg = afterPointer[j];
                rightSeg.leaf.data.lines[rightSeg.localRow] = "";
            }
            break;
        }
    }

    return afterPointer;
}

/**
 * Remove the line referred to by the current point, across all
 * leaves, removing newly empty leaves.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {boolean} `true` if the line was removed, and `false` otherwise.
 */
function _removeGlobalLine(st) {
    // Don't remove the last line - editor must have at least one line
    if(st.grid.dims.height === 1) {
        return false;
    }

    const globalPt = findGlobalPoint(st);
    const leaves = [...grid.leavesUnderRow(st.grid, globalPt.y)];
    for(const leaf of leaves) {
        const leafPos = grid.posOfLeaf(st.grid, leaf);
        const relRow  = globalPt.y - leafPos.y;
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

    return true;
}

/**
 * Remove the line referred to by the current point, across all
 * leaves, removing newly empty leaves.
 *
 * @type {(st: TextPrimsState) => Promise<Inverse<TextPrimsState>>}
 */
export const removeGlobalLine = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st) => { _removeGlobalLine(st); },
    "remove line"
);

/**
 * Like `removeGlobalLine`, except it puts the contents of the line on
 * the previous line, spreading the contents among cells if possible.
 * If the point is not at the beginning of the line, this function is
 * a no-op.
 *
 * @type {(st: TextPrimsState, glpk: any) => Promise<Inverse<TextPrimsState>>}
 */
export const removeGlobalNewline = state.withDefaultInverse(
    async (/** @type {TextPrimsState} */ st, /** @type {any} */ glpk) => {
        const globalPt = findGlobalPoint(st);
        if(globalPt.y === 0) return;
        if(globalPt.x >   0) return;

        // Find the text on the global line.
        const globalRow = globalPt.y;

        // Note that we need to force the entire iterator now because
        // we're about to delete the line of the document that this
        // iterator fetches.
        const textOnLine = [..._extractGlobalLine(st, globalRow)];

        // Remove the global line.
        if(!_removeGlobalLine(st)) return;

        // Put the point at the end of the line.
        putPointAtEndOfGlobalLine(st);
        const globalCol = _lastColumnOnGlobalLine(st, globalRow - 1);
        await _spreadTextOnGlobalRow(st, globalRow - 1, globalCol, textOnLine.values(), glpk);
    },
    "remove newline"
);

/**
 * Remove the `n` characters of text before the point. This function
 * will not leave the context of its leaf, even if `n` exceeds the
 * length of the current line.
 *
 * @type {(st: TextPrimsState, n: number) => Promise<Inverse<TextPrimsState>>}
 */
export const removeString = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st, /** @type {number} */ n) => {
        const sel = st.selection;

        const row    = sel.pt.y;
        const col    = sel.pt.x;
        const line   = sel.leaf.data.lines[row];

        if(line === "" || sel.pt.x === 0) return;

        // Clamp n to the number of characters before the cursor.
        n = Math.min(n, col);

        const before = line.slice(0, col - n);
        const after  = line.slice(col);
        sel.leaf.data.lines[row] = before + after;

        // Move the cursor left by the number of characters removed.
        sel.pt.x -= n;
        _updateLastGlobalCol(st);
    },
    "remove string"
);

/*****************************************************************************/
/** Primitive Text Insertion Functions                                      **/

/**
 * Put the point on the next line, creating it, even if that line is
 * not in the currently selected leaf. If we're at the end of the
 * document, then this function also creates a new line in the current
 * leaf and sets the point to it.
 *
 * @type {(st: TextPrimsState, glpk: any) => Promise<Inverse<TextPrimsState>>}
 */
export const insertGlobalNewline = state.withDefaultInverse(
    async (/** @type {TextPrimsState} */ st, /** @type {any} */ glpk) => {
        // Find the location of the cursor in the global coordinate space.
        const globalPt  = findGlobalPoint(st);
        const globalRow = globalPt.y;

        const afterPointer = _killLine(st);

        const leaves = [...grid.leavesUnderRow(st.grid, globalRow)];
        // Make room under under `globalRow` for the new lines.
        for(const leaf of leaves) {
            const leafPos = grid.posOfLeaf(st.grid, leaf);
            const localRow = globalRow - leafPos.y;
            leaf.data.lines.splice(localRow + 1, 0, "");
        }

        grid.modifyHeightOfLeaves(st.grid, 1, leaves);

        const newRow = globalRow + 1;
        await _spreadTextOnGlobalRow(st, newRow, 0, afterPointer.values(), glpk);

        putPointOnGlobalPosition(st, point.mkP2(0, newRow), false);
    },
    "insert newline"
);

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @type {(st: TextPrimsState, s: string, glpk: any, advancePoint?: boolean) => Promise<Inverse<TextPrimsState>>}
 */
export const insertString = state.withDefaultInverse(
    async (/** @type {TextPrimsState} */ st, /** @type {string} */ s, /** @type {any} */ glpk, /** @type {boolean | undefined} */ advancePoint) => {
        if(advancePoint === undefined) {
            advancePoint = true;
        }

        if(s.length === 0) return;

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
    },
    "insert string"
);

/**
 * Given an iterator which yields text, and a global row and column,
 * put the text at the column, but spread it between the cells after
 * (and including) the cell with the current column, replacing the
 * text therein.
 *
 * @param {TextPrimsState} st   The current state.
 * @param {number}         row  The global row at which to insert the text.
 * @param {number}         col  The global column at which to insert the text.
 * @param {TextOnGlobalLineIter} textIter The text iterator from which we
 *    will determine the text to insert.
 * @param {any}            glpk The GLPK instance.
 */
export async function _spreadTextOnGlobalRow(st, row, col, textIter, glpk) {
    const leaves = [...grid.leavesUnderRow(st.grid, row)];
    util.assert(leaves.length > 0);

    // Find the index of the leaf in `leaves` under the current column.
    let i = leaves.length - 1;
    for(; i > 0; --i) {
        const leafCol  = grid.posOfLeaf(st.grid, leaves[i]).x;
        if(leafCol <= col) {
            break;
        }
    }

    // Spread the text in `textIter` into the leaves to the right
    // (inclusive) of `i`.
    for(let j = i; j < leaves.length; ++j) {
        const leaf     = leaves[j];
        const leafPos  = grid.posOfLeaf(st.grid, leaves[j]);
        const localRow = row - leafPos.y;

        const isLast = j === leaves.length - 1;
        if(isLast) {
            // Then, put the rest of the text of `textIter` into this
            // leaf, even if `textIter` consists of multiple entries.
            const remainingText = _concatenatePositionedText(textIter);
            leaf.data.lines[localRow] += remainingText;
            await _expandLeafWidthIfNecessary(st.grid, leaf, glpk);
        } else {
            const nextText = textIter.next();
            if(nextText.done) {
                return;
            }

            leaf.data.lines[localRow] += nextText.value.text;
            await _expandLeafWidthIfNecessary(st.grid, leaf, glpk);
        }
    }
}

/**
 * @template {CommonState} S
 * @param { S } st
 * @returns { [ TextPrimsState, Inverse<S> ] }
 */
export function editText(st) {
    const snapshot = st.clone();
    const firstLeaf = grid.allLeaves(st.grid).next().value;

    return [ {
        type: "TextPrimsState",
        grid: st.grid,
        selection: {
            pt: point.mkP2(0, 0),
            leaf: firstLeaf,
            lastGlobalCol: 0
        },
        clone() {
            const globalPt = findGlobalPoint(this);
            const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
            /** @type {TextPrimsState} */
            const result = {
                type: "TextPrimsState",
                grid: g,
                clone: this.clone,
                selection: {
                    pt: point.mkP2(0, 0),
                    leaf: grid.allLeaves(g).next().value,
                    lastGlobalCol: 0
                }
            };
            putPointOnGlobalPosition(result, globalPt, true);
            result.selection.lastGlobalCol = this.selection.lastGlobalCol;
            return result;
        }
    }, {
        apply: async (s) => {
            Object.assign(s, snapshot);
        },
        fwdDescription: "start editing text"
    } ];
}
