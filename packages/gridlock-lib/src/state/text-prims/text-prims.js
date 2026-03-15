/**
 * Text-editing primitive actions
 *
 * @module text-prims
 */

export { IdInverse };
import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as rect from "../../rect.js";
import * as state from "../state-utils.js";
import * as util from "../../util.js";
import { TextPrimsState } from "./state.js";
import { id, IdInverse } from "../state-utils.js";

/** @import { Inverse, CommonState, Cell } from "../common-state.d.ts" */

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
    apply(st) {
        putPointOnGlobalPosition(st, this.#oldPos, false);
        st.selection.lastGlobalCol = this.#oldGlobalCol;
        return st;
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
 * point.
 *
 * Note that the last cell on a global line effectively has an extra
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
    if(updateGlobalCol === undefined) {
        updateGlobalCol = true;
    }

    const oldGlobalCol = st.selection.lastGlobalCol;
    const oldGlobalPt  = findGlobalPoint(st);

    const outerRect = grid.rectOfGrid(st.grid);

    const clamped = point.mkP2(
        util.clamp(0, pt.x, rect.width(outerRect) - 1),
        util.clamp(0, pt.y, rect.height(outerRect) - 1)
    );

    const cell = grid.cellUnderPoint(st.grid, clamped);
    const cellRect = grid.rectOfCell(st.grid, cell);
    const relPos = point.offset(clamped, point.mkV2(-cellRect.left, -cellRect.top));

    st.selection.cell = cell;
    st.selection.pt = relPos;
    if(updateGlobalCol) {
        st.selection.lastGlobalCol = pt.x;
    }

    if(clamped.x < pt.x) {
        // Put the point past the last row on the line.
        st.selection.pt.x += 1;
    }

    return new PutPointOnGlobalPositionInverse(pt, oldGlobalPt, oldGlobalCol);
}

/**
 * Find the maximum length of any line in a cell.
 *
 * @param {grid.Cell<Cell>} cell
 * @returns {number}
 */
function _maximumLineLength(cell) {
    return cell.data.lines.reduce((a, l) => Math.max(a, l.length), 0);
}

/**
 * Expand the `leaf` horizontally to fit its textual content, but only
 * if necessary.
 *
 * @param {grid.Grid<Cell>} g    The grid.
 * @param {grid.CellPath}   cell The leaf to expand.
 */
function _expandLeafWidthIfNecessary(g, cell) {
    const theCell = grid.lookupCell(g, cell);
    const n = _maximumLineLength(theCell) - theCell.width;
    if(0 < n) {
        // TODO: We should find the set of leaves using smarter method
        // which prefers leaves with no content.
        const globalCol = grid.rectOfCell(g, cell).left;
        const cells = [...grid.cellsUnderGlobalX(g, globalCol)];
        grid.modifyWidthOfCells(g, cells, n);
    }
}

/**
 * Find the row and column of the current selection in global
 * coordinate space.
 *
 * @param {TextPrimsState} st The editor state.
 * @returns {point.P2} The location of the single selection, in global
 *   coordinates.
 */
export function findGlobalPoint(st) {
    const cellRect = grid.rectOfCell(st.grid, st.selection.cell);
    return point.offset(
        rect.upperLeft(cellRect),
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
    const oldGlobalCol = st.selection.lastGlobalCol;

    if(pointAtEndOfGlobalLine(st)) {
        return id;
    }

    const theCell = grid.lookupCell(st.grid, st.selection.cell);
    const localLine = theCell.data.lines[st.selection.pt.y];
    const atEndOfLocalLine = st.selection.pt.x === localLine.length;

    if(atEndOfLocalLine) {
        // Skip ahead to the beginning of the next leaf.
        const upperLeft = rect.upperLeft(grid.rectOfCell(st.grid, st.selection.cell));
        // Offset the leaf's upper left by the full width of the leaf
        // and the local row number.
        const globalPt  = point.offset(upperLeft, point.mkV2(
            theCell.width,
            st.selection.pt.y
        ));
        return putPointOnGlobalPosition(st, globalPt);
    } else {
        // Advance the point locally.
        st.selection.pt.x += 1;
        _updateLastGlobalCol(st);
        return {
            fwdDescription: "put point on next column",
            apply(st) {
                st.selection.pt.x -= 1;
                st.selection.lastGlobalCol = oldGlobalCol;
                return st;
            }
        };
    }
}

/**
 * Put the point directly to the left of the current point, if
 * possible, even if the previous column is not part of the current
 * cell.
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
    const theCell = grid.lookupCell(st.grid, st.selection.cell);
    const localLine = theCell.data.lines[localRow];
    if(localLine.length !== localCol) {
        return false;
    }

    // Check that there's no cell to the right of us.
    const globalPt = findGlobalPoint(st);
    return undefined === grid.cellUnderPoint(
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
    const rowHeight = grid.lookupRow(st.grid, st.selection.cell).height;

    // Check that we're on the last row of our local cell.
    if(st.selection.pt.y < rowHeight - 1) {
        return false;
    }

    return st.selection.cell.rowNo === st.grid.rows.length - 1;
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
 * @property {number}        globalCol The global column of the first letter of the line of text in `leaf`.
 * @property {number}        localRow  The local row number of the line in the `leaf`.
 * @property {string}        text      The text on the local line of `leaf`.
 * @property {grid.CellPath} cell      The cell.
 */

/**
 * @typedef {IteratorObject<TextOnGlobalLineIterItem>} TextOnGlobalLineIter
 */

/**
 * Get the text on each leaf along with its starting column, on the
 * given global row as an iterator object.
 *
 * @param {TextPrimsState} st
 * @param {number} globalRow
 * @returns {TextOnGlobalLineIter}
 */
function _extractGlobalLine(st, globalRow) {
    return grid.cellsUnderGlobalY(st.grid, globalRow).map(cell => {
        const cellRect = grid.rectOfCell(st.grid, cell);
        const theCell = grid.lookupCell(st.grid, cell);
        const localRow = globalRow - cellRect.top;
        return {
            globalCol: cellRect.left,
            localRow,
            text: theCell.data.lines[localRow],
            cell
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
        const segCell = grid.lookupCell(st.grid, seg.cell);

        if(seg.globalCol <= globalCol) {
            // Split off the text before the cursor, since that should
            // remain on the current line.
            let localCol = globalCol - seg.globalCol;
            segCell.data.lines[seg.localRow] =
                segCell.data.lines[seg.localRow].slice(0, localCol);

            afterPointer = textSegments.slice(i);
            afterPointer[0].text = seg.text.slice(localCol);
            afterPointer[0].globalCol += localCol;

            // Clear text on the original row for segments to the
            // right of the cursor, since their content is moving to
            // the new line.
            for(let j = 1; j < afterPointer.length; ++j) {
                const rightSeg = afterPointer[j];
                const rightSegCell = grid.lookupCell(st.grid, rightSeg.cell);
                rightSegCell.data.lines[rightSeg.localRow] = "";
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
    if(rect.height(grid.rectOfGrid(st.grid)) === 1) {
        return false;
    }

    const globalPt = findGlobalPoint(st);
    const cells = [...grid.cellsUnderGlobalY(st.grid, globalPt.y)];
    for(const cell of cells) {
        const cellRect = grid.rectOfCell(st.grid, cell);
        const relRow   = globalPt.y - cellRect.top;
        grid.lookupCell(st.grid, cell).data.lines.splice(relRow, 1);
    }

    // Modify the row height, now that we've removed a line.
    // All cells on the row share the same row, so use the first cell's rowNo.
    grid.modifyHeightOfRow(st.grid, cells[0], -1);
    grid.removeEmptyRows(st.grid);

    // We need to set the selection here again since the selected cell
    // might now be gone. Ensure we don't go to a negative row.
    const newRow = Math.max(0, globalPt.y - 1);
    putPointOnGlobalPosition(st, point.mkP2(0, newRow));

    return true;
}

/**
 * Remove the line referred to by the current point, across all
 * leaves, removing newly empty leaves.
 *
 * @type {(st: TextPrimsState) => Inverse<TextPrimsState>}
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
 * @type {(st: TextPrimsState) => Inverse<TextPrimsState>}
 */
export const removeGlobalNewline = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st) => {
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
        _spreadTextOnGlobalRow(st, globalRow - 1, globalCol, textOnLine.values());
    },
    "remove newline"
);

/**
 * Remove the `n` characters of text before the point. This function
 * will not leave the context of its leaf, even if `n` exceeds the
 * length of the current line.
 *
 * @type {(st: TextPrimsState, n: number) => Inverse<TextPrimsState>}
 */
export const removeString = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st, /** @type {number} */ n) => {
        const sel = st.selection;
        const theCell = grid.lookupCell(st.grid, sel.cell);

        const row    = sel.pt.y;
        const col    = sel.pt.x;
        const line   = theCell.data.lines[row];

        if(line === "" || sel.pt.x === 0) return;

        // Clamp n to the number of characters before the cursor.
        n = Math.min(n, col);

        const before = line.slice(0, col - n);
        const after  = line.slice(col);
        theCell.data.lines[row] = before + after;

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
 * @type {(st: TextPrimsState) => Inverse<TextPrimsState>}
 */
export const insertGlobalNewline = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st) => {
        // Find the location of the cursor in the global coordinate space.
        const globalPt  = findGlobalPoint(st);
        const globalRow = globalPt.y;

        const afterPointer = _killLine(st);

        const cells = [...grid.cellsUnderGlobalY(st.grid, globalRow)];
        // Make room under under `globalRow` for the new lines.
        for(const cell of cells) {
            const cellRect = grid.rectOfCell(st.grid, cell);
            const localRow = globalRow - cellRect.top;
            grid.lookupCell(st.grid, cell).data.lines.splice(localRow + 1, 0, "");
        }

        grid.modifyHeightOfRow(st.grid, cells[0], 1);

        const newRow = globalRow + 1;
        _spreadTextOnGlobalRow(st, newRow, 0, afterPointer.values());

        putPointOnGlobalPosition(st, point.mkP2(0, newRow), false);
    },
    "insert newline"
);

/**
 * Insert a string at the current cursor, updating the cursor. If the
 * selection is a multi-selection, then it is converted to a single
 * selection prior to insertion.
 *
 * @type {(st: TextPrimsState, s: string, advancePoint?: boolean) => Inverse<TextPrimsState>}
 */
export const insertString = state.withDefaultInverse(
    (/** @type {TextPrimsState} */ st, /** @type {string} */ s, /** @type {boolean | undefined} */ advancePoint) => {
        if(advancePoint === undefined) {
            advancePoint = true;
        }

        if(s.length === 0) return;

        const theCell = grid.lookupCell(st.grid, st.selection.cell);
        const row     = st.selection.pt.y;
        const col     = st.selection.pt.x;
        const line    = theCell.data.lines[row];
        const before  = line.slice(0, col);
        const after   = line.slice(col);
        theCell.data.lines[row] = before + s + after;

        if(advancePoint) {
            // Advance the cursor by the length of the string.
            st.selection.pt.x += s.length;
            _updateLastGlobalCol(st);
        }

        _expandLeafWidthIfNecessary(st.grid, st.selection.cell);
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
 */
export function _spreadTextOnGlobalRow(st, row, col, textIter) {
    const cells = [...grid.cellsUnderGlobalY(st.grid, row)];
    util.assert(cells.length > 0);

    // Find the index of the cell in `cells` under the current column.
    let i = cells.length - 1;
    for(; i > 0; --i) {
        const cellCol = grid.rectOfCell(st.grid, cells[i]).left;
        if(cellCol <= col) {
            break;
        }
    }

    // Spread the text in `textIter` into the cells to the right
    // (inclusive) of `i`.
    for(let j = i; j < cells.length; ++j) {
        const cell     = cells[j];
        const cellRect = grid.rectOfCell(st.grid, cell);
        const theCell  = grid.lookupCell(st.grid, cell);
        const localRow = row - cellRect.top;

        const isLast = j === cells.length - 1;
        if(isLast) {
            // Then, put the rest of the text of `textIter` into this
            // cell, even if `textIter` consists of multiple entries.
            const remainingText = _concatenatePositionedText(textIter);
            theCell.data.lines[localRow] += remainingText;
            _expandLeafWidthIfNecessary(st.grid, cell);
        } else {
            const nextText = textIter.next();
            if(nextText.done) {
                return;
            }

            theCell.data.lines[localRow] += nextText.value.text;
            _expandLeafWidthIfNecessary(st.grid, cell);
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
    const [firstCell] = grid.allCells(st.grid).take(1);

    return [ new TextPrimsState(st.grid, {
        pt: point.mkP2(0, 0),
        cell: firstCell,
        lastGlobalCol: 0
    }), {
        apply: (_s) => {
            return snapshot;
        },
        fwdDescription: "start editing text"
    } ];
}
