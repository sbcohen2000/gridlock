import * as grid from "../../src/grid.js";
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

/**
 * Select an edge relative to the leaf at the given point.
 *
 * @param {state.EditingCells} st
 * @param {point.P2} pt
 * @param {state.RelEdgeLocation} edge
 */
function selectEdge(st, pt, edge) {
    const leaf = grid.leafUnderPoint(st.grid, pt);
    st.selection = { type: "Edge", edge, leaf };
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

describe("modifyHorizontalEdge", () => {
    it("Moves a horizontal edge down by 1", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+---+\n" +
            "+---+---+\n" +
            "+---+---+"
        );

        selectEdge(st, point.mkP2(0, 0), "Below");
        const result = cellPrims.modifyHorizontalEdge(st, 1);

        expect(result).to.be.true;
        expect(grid.printASCII(st.grid)).to.equal(
            "+---+---+\n" +
            "|   |   |\n" +
            "+---+---+\n" +
            "+---+---+"
        );
    });

    it("Moves a horizontal edge up by 1", () => {
        const st = mkCellState(
            "top\n" +
            "\n" +
            "bot\n" +
            "+---+---+\n" +
            "|   |   |\n" +
            "+---+   |\n" +
            "+---+---+"
        );

        selectEdge(st, point.mkP2(0, 0), "Below");
        const result = cellPrims.modifyHorizontalEdge(st, -1);

        expect(result).to.be.true;
        expect(grid.printASCII(st.grid)).to.equal(
            "+---+---+\n" +
            "+---+   |\n" +
            "+---+---+"
        );
    });

    it("Does not shrink a leaf below height 1", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );

        selectEdge(st, point.mkP2(0, 0), "Below");
        const result = cellPrims.modifyHorizontalEdge(st, -1);

        // Top leaf is already height 1, can't shrink further
        expect(result).to.be.false;
    });
});
