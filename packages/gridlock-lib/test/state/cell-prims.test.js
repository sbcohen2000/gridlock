import * as point from "../../src/point.js";
import { serialize, cellPrims } from "../../src/state/index.js";
import { expect } from "chai";

/**
 * Create a CellPrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/state/cell-prims/state.js").CellPrimsState}
 */
function mkCellState(src) {
    return cellPrims.editCells(serialize.textEditingStateFromString(src))[0];
}

describe("cell-prims", () => {
    describe("selectLeafUnderPoint", () => {
        it("Selects a leaf in a single-leaf grid", () => {
            const st = mkCellState(
                "hello\n" +
                    "+-----+\n" +
                    "+-----+"
            );

            cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);

            expect(st.selection.leaves.size).to.equal(1);
        });

        it("Accumulates leaves when clear is false", () => {
            const st = mkCellState(
                "hello there\n" +
                    "+-----+-----+\n" +
                    "+-----+-----+"
            );

            cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
            cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), false);

            expect(st.selection.leaves.size).to.equal(2);
        });

        it("Replaces selection when clear is true", () => {
            const st = mkCellState(
                "hello there\n" +
                    "+-----+-----+\n" +
                    "+-----+-----+"
            );

            cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
            cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), true);

            expect(st.selection.leaves.size).to.equal(1);
        });
    });
});
