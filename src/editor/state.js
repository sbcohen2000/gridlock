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
 * @typedef {{
 *  type: "EditingLeaf"
 *  singleSelection: SingleSelection,
 *  grid: grid.Grid<Cell>
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
            pt: point.mkOrigin()
        }
    }
}
