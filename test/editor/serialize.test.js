import { expect } from "chai";
import * as serialize from "../../src/editor/serialize.js";
import * as grid from "../../src/grid.js";
import * as arbg from "../arbitrary-grid.js";
import * as fc from "fast-check";

const printableChar = fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')
);

/**
 * Generate a random Cell that fits the given dimensions.
 *
 * @param {number} width
 * @param {number} height
 * @returns {fc.Arbitrary<import('../../src/editor.js').Cell>}
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
 * @param {grid.Grid<void>} voidGrid
 * @returns {fc.Arbitrary<grid.Grid<import('../../src/editor.js').Cell>>}
 */
function arbCellGrid(voidGrid) {
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

describe("serialize", () => {
    it("printCellGrid and parseCellGrid are inverses", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => arbCellGrid(g)),
                (g) => {
                    const src0 = serialize.printCellGrid(g);
                    const g1 = serialize.parseCellGrid(src0);
                    const src1 = serialize.printCellGrid(g1);
                    expect(src0).to.equal(src1);
                }
            )
        );
    });
});
