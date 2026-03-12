import * as grid from "../src/grid.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";

/** @import {Cell} from "../src/editor/common-state.js" */

const printableChar = fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')
);

/**
 * Generate a random Cell that fits the given dimensions.
 *
 * @param {number} width
 * @param {number} height
 * @returns {fc.Arbitrary<Cell>}
 */
function arbCell(width, height) {
    const lineArb = fc.array(printableChar, { minLength: 0, maxLength: width })
        .map(cs => cs.join(''));
    return fc.array(lineArb, { minLength: height, maxLength: height })
        .map(lines => ({ lines }));
}

/**
 * Take a Grid<void> and produce an arbitrary Grid<Cell>, where each
 * leaf is populated with a randomly generated Cell whose lines fit
 * the leaf's dimensions.
 *
 * @param {grid.Grid<Cell>} voidGrid
 * @returns {fc.Arbitrary<grid.Grid<Cell>>}
 */
function populateCells(voidGrid) {
    const leaves = [...grid.allLeaves(voidGrid)];
    const cellArbs = leaves.map(leaf => arbCell(leaf.dims.width, leaf.dims.height));

    return fc.tuple(...cellArbs).map(cells => {
        const g = grid.clone(voidGrid);
        const clonedLeaves = [...grid.allLeaves(g)];
        clonedLeaves.forEach((leaf, i) => {
            leaf.data = cells[i];
        });
        return g;
    });
}

/**
 * Generate an arbitrary grid, populated with `Cell`s.
 *
 * @type {fc.Arbitrary<grid.Grid<Cell>>}
 */
export const arbCellGrid =
    arbg.grid.tree.chain(g => populateCells(g));
