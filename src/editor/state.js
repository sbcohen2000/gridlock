/**
 * Representation of the editor state.
 *
 * @module state
 */

import * as grid from "../grid.js";
import * as point from "../point.js";

/*****************************************************************************/
/** Text Edits                                                              **/

/**
 * @typedef {Object} Cell
 * @property {string[]} lines The lines of text inside the cell.
 */

/**
 * @typedef {Object} TextSelection
 * @property {"Single"} type A tag indicating the kind of selection.
 * @property {grid.Leaf<Cell>} leaf The leaf in the grid which is
 *     currently selected.
 * @property {point.P2} pt The current position of the cursor within
 *     the cell.
 * @property {number} lastGlobalCol The last global column position of the
 *     selection.
 */

/**
 * Construct a new single selection which selects the first position
 * in the first leaf in the grid.
 *
 * @param {grid.Grid<Cell>} g The current grid.
 * @returns {TextSelection}
 */
export function mkSingleSelection(g) {
    const firstLeaf = grid.leafUnderPoint(g, point.mkOrigin());

    return {
        type: "Single",
        leaf: firstLeaf,
        pt: point.mkOrigin(),
        lastGlobalCol: 0
    };
}

/**
 * @typedef {{
 *  type: "EditingText"
 *  selection: TextSelection,
 *  grid: grid.Grid<Cell>,
 *  flags: Flags
 * }} EditingText
 */

/************************/
/** Text Edits : Flags **/

/**
 * @typedef {Object} Flags
 * @property {boolean} pushedLeftEdge
 * @property {boolean} pushedRightEdge
 * @property {boolean} pushedTopEdge
 * @property {boolean} pushedBottomEdge
 */

/**
 * Construct a new `Flags` object.
 *
 * @returns {Flags}
 */
export function mkFlags() {
    return {
        pushedLeftEdge: false,
        pushedRightEdge: false,
        pushedTopEdge: false,
        pushedBottomEdge: false
    }
}

/**
 * Set some flags.
 *
 * @param {Flags} flags The flags.
 * @param {(keyof Flags)[]} set The flags to set.
 */
export function setFlag(flags, ...set) {
    for(const flag of set) {
        flags[flag] = true;
    }
}

/**
 * Clear some flags.
 *
 * @param {Flags} flags The flags.
 * @param {(keyof Flags)[]} clear The flags to clear.
 */
export function clearFlag(flags, ...clear) {
    for(const flag of clear) {
        flags[flag] = false;
    }
}

/**
 * Test if a flag is set or cleared.
 *
 * @param {Flags} flags The flags.
 * @param {keyof Flags} flag The flag to test.
 * @returns {boolean} The value of `flag` in `flags`.
 */
export function testFlag(flags, flag) {
    return flags[flag];
}

/*****************************************************************************/
/** Top-Level Cell Edits                                                    **/

/**
 * @typedef {{
 *  type: "EditingCells",
 *  selection: LeafSelection | EdgeSelection,
 *  grid: grid.Grid<Cell>,
 * }} EditingCells
 */

/**
 * Describe the selection of one or more leaves in the document.
 *
 * @typedef {Object} LeafSelection
 * @property {"Leaves"} type A tag indicating the kind of selection.
 * @property {Set<grid.Leaf<Cell>>} leaves The selected leaves.
 */

/**
 * @typedef {"Right" | "Below"} CanonicalEdgeLocation
 */

/**
 * @typedef {CanonicalEdgeLocation | "Left" | "Above"} EdgeLocation
 */

/**
 * Describe the selection of a single edge in the document. We
 * represent this kind of selection by storing the leaf to the left or
 * above the selected edge.
 *
 * @typedef {Object} EdgeSelection
 * @property {"Edge"} type A tag indicating the kind of selection.
 * @property {CanonicalEdgeLocation} edge The edge which this selection
 *     refers to, relative to `leaf`. Note that we do not represent
 *     edges to the left and above `leaf`. These edges are resolved
 *     when the selection is created.
 * @property {grid.Leaf<Cell>} leaf
 */

/*****************************************************************************/
/** Editor State                                                            **/

/**
 * @typedef {"Vertical" | "Horizontal"} SliceDirection
 */

/**
 * @typedef {{
 *   type: "SlicingCells",
 *   direction: SliceDirection,
 *   grid: grid.Grid<Cell>,
 * }} SlicingCells
 */

/**
 * @typedef {EditingText | EditingCells | SlicingCells} EditorState
 */

/**
 * Construct a new `EditorState`.
 *
 * @param {grid.Grid<Cell>} [g] The cell grid.
 * @returns {EditingText}
 */
export function mk(g) {
    if(!g) {
        let src = "empty"
        g = grid.mk(src.length, 1, {
            lines: [src]
        });
    }

    return {
        type: "EditingText",
        grid: g,
        selection: mkSingleSelection(g),
        flags: mkFlags()
    }
}

/**
 * Transform an editor state into one which is ready to edit cells.
 *
 * @param {EditorState} st
 * @returns {EditingCells}
 */
export function editCells(st) {
    const g = st.grid;
    return {
        type: "EditingCells",
        grid: g,
        selection: {
            type: "Leaves",
            leaves: new Set()
        }
    }
}

/**
 * Transform an editor state into one which is slicing cells vertically.
 *
 * @param {EditorState} st
 * @returns {SlicingCells}
 */
export function sliceCellsVertically(st) {
    return { type: "SlicingCells", direction: "Vertical", grid: st.grid };
}

/**
 * Transform an editor state into one which is slicing cells horizontally.
 *
 * @param {EditorState} st
 * @returns {SlicingCells}
 */
export function sliceCellsHorizontally(st) {
    return { type: "SlicingCells", direction: "Horizontal", grid: st.grid };
}

/**
 * Transform an editor state into one which is ready to edit the text
 * within a cell.
 *
 * @param {EditorState} st
 * @returns {EditingText}
 */
export function editText(st) {
    const g = st.grid;
    return {
        type: "EditingText",
        grid: g,
        flags: mkFlags(),
        selection: mkSingleSelection(g)
    }
}
