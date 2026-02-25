/**
 * Representation of the editor state.
 *
 * @module state
 */

import * as grid from "../grid.js";
import * as point from "../point.js";

/**
 * @typedef {Object} Cell
 * @property {string[]} lines The lines of text inside the cell.
 */

/**
 * @typedef {Object} SingleSelection
 * @property {"Single"} type A tag indicating the kind of selection.
 * @property {grid.Leaf<Cell>} leaf The leaf in the grid which is
 *     currently selected.
 * @property {point.P2} pt The current position of the cursor within
 *     the cell.
 * @property {number} lastGlobalCol The last global column position of the
 *     selection.
 */

/**
 * @typedef {Object} MultiSelection
 * @property {"Multi"}         type   A tag indicating the kind of
 *                                    selection.
 * @property {grid.Leaf<Cell>} leaves The selected leaves.
 */

/**
 * @typedef {{
 *   commandText: string
 *   commandLeaf: grid.Leaf<Cell>
 * }} CommandState
 */

/**
 * @typedef {Object} Flags
 * @property {boolean} pushedLeftEdge
 * @property {boolean} pushedRightEdge
 * @property {boolean} pushedTopEdge
 * @property {boolean} pushedBottomEdge
 */

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

/**
 * @typedef {{
 *  type: "EditingLeaf"
 *  singleSelection: SingleSelection,
 *  grid: grid.Grid<Cell>,
 *  commandState: CommandState | null,
 *  flags: Flags
 * }} EditingLeaf
 */

/**
 * @typedef {EditingLeaf} EditorState
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
        type: "EditingLeaf",
        grid: g,
        singleSelection: {
            type: "Single",
            leaf: firstLeaf,
            pt: point.mkOrigin(),
            globalCol: 0
        },
        commandState: null,
        flags: {
            pushedLeftEdge: false,
            pushedTopEdge: false,
            pushedBottomEdge: false,
            pushedRightEdge: false
        }
    }
}
