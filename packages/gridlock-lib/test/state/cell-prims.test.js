import * as point from "../../src/point.js";
import { serialize, CellPrims } from "../../src/state/index.js";
import { expect } from "chai";

/**
 * Create a CellPrims from a cell-grid string.
 *
 * @param {string} src
 * @returns {CellPrims}
 */
function mkCellState(src) {
    const textState = serialize.textEditingStateFromCommonStateStr(src);
    return CellPrims.editCells(textState);
}

describe("cell-prims", () => {
    describe("selectCellUnderPoint", () => {
        it("Selects a leaf in a single-leaf grid", () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            expect(st.selection.size).to.equal(1);
        });

        it("Accumulates leaves when clear is false", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            st.selectCellUnderPoint(point.mkP2(6, 0), false);
            expect(st.selection.size).to.equal(2);
        });

        it("Replaces selection when clear is true", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            st.selectCellUnderPoint(point.mkP2(6, 0), true);
            expect(st.selection.size).to.equal(1);
        });
    });
});
