import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize.js";
import * as state from "../../src/editor/state.js";
import * as cellPrims from "../../src/editor/cell-prims/cell-prims.js";
import { expect } from "chai";

/**
 * Create an EditingCells state from a cell-grid string.
 *
 * @param {string} src
 * @returns {state.EditingCells}
 */
function mkCellState(src) {
    const g = serialize.parseCellGrid(src);
    return state.editCells(state.mk(g));
}

describe("selectLeafUnderPoint", () => {
    it("Selects a leaf in a single-leaf grid", () => {
        const st = mkCellState(
            "hello\n" +
            "+-----+\n" +
            "+-----+"
        );

        const result = cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Leaves");
        expect(/** @type{state.LeafSelection} */(st.selection).leaves.size).to.equal(1);
    });

    it("Accumulates leaves when clear is false", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
        cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), false);

        expect(st.selection.type).to.equal("Leaves");
        expect(/** @type{state.LeafSelection} */(st.selection).leaves.size).to.equal(2);
    });

    it("Replaces selection when clear is true", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
        cellPrims.selectLeafUnderPoint(st, point.mkP2(6, 0), true);

        expect(st.selection.type).to.equal("Leaves");
        expect(/** @type{state.LeafSelection} */(st.selection).leaves.size).to.equal(1);
    });
});

describe("splitCellVerticallyAtRow", () => {
    it("Splits a selected cell at the given row", () => {
        const st = mkCellState(
            "hello\n" +
            "world\n" +
            "+-----+\n" +
            "|     |\n" +
            "+-----+"
        );

        cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
        const result = cellPrims.splitCellVerticallyAtRow(st, 1);

        expect(result).to.be.true;
        expect(serialize.printCellGrid(st.grid)).to.equal(
            "hello\n" +
            "world\n" +
            "+-----+\n" +
            "+-----+\n" +
            "+-----+"
        );
    });
});

describe("splitCellHorizontallyAtColumn", () => {
    it("Splits a selected cell at the given column", () => {
        const st = mkCellState(
            "hello world\n" +
            "+-----------+\n" +
            "+-----------+"
        );

        cellPrims.selectLeafUnderPoint(st, point.mkP2(0, 0), true);
        const result = cellPrims.splitCellHorizontallyAtColumn(st, 6);

        expect(result).to.be.true;
        expect(serialize.printCellGrid(st.grid)).to.equal(
            "hello world\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );
    });
});

describe("selectEdgeStraddlingPoints", () => {
    it("Selects a vertical edge between horizontally adjacent leaves", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        const result = cellPrims.selectEdgeStraddlingPoints(
            st, point.mkP2(2, 0), point.mkP2(7, 0)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });

    it("Selects a horizontal edge between vertically adjacent leaves", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );

        const result = cellPrims.selectEdgeStraddlingPoints(
            st, point.mkP2(0, 0), point.mkP2(0, 1)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });

    it("Returns false for non-adjacent leaves", () => {
        const st = mkCellState(
            "hello there world\n" +
            "+-----+-----+-----+\n" +
            "+-----+-----+-----+"
        );

        const result = cellPrims.selectEdgeStraddlingPoints(
            st, point.mkP2(2, 0), point.mkP2(14, 0)
        );

        expect(result).to.be.false;
    });

    it("Returns false when both points are in the same leaf", () => {
        const st = mkCellState(
            "hello\n" +
            "+-----+\n" +
            "+-----+"
        );

        const result = cellPrims.selectEdgeStraddlingPoints(
            st, point.mkP2(0, 0), point.mkP2(2, 0)
        );

        expect(result).to.be.false;
    });
});
