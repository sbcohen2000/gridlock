import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as cellPrims from "../../src/editor/cell-prims/cell-prims.js";
import { expect } from "chai";

/**
 * Create a CellPrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/editor/cell-prims/state.js").CellPrimsState}
 */
function mkCellState(src) {
    return cellPrims.editCells(serialize.textEditingStateFromString(src))[0];
}

describe("cell-prims", () => {
    describe("selectLeafUnderPoint", () => {
        it("Selects a leaf in a single-leaf grid", async () => {
            const st = mkCellState(
                "hello\n" +
                    "+-----+\n" +
                    "+-----+"
            );

            await cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);

            expect(st.selection.leaves.size).to.equal(1);
        });

        it("Accumulates leaves when clear is false", async () => {
            const st = mkCellState(
                "hello there\n" +
                    "+-----+-----+\n" +
                    "+-----+-----+"
            );

            await cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
            await cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), false);

            expect(st.selection.leaves.size).to.equal(2);
        });

        it("Replaces selection when clear is true", async () => {
            const st = mkCellState(
                "hello there\n" +
                    "+-----+-----+\n" +
                    "+-----+-----+"
            );

            await cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
            await cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), true);

            expect(st.selection.leaves.size).to.equal(1);
        });
    });
});
