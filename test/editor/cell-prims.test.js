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

describe("selectEdgeLeftOfLeafAtPoint", () => {
    it("Selects the edge to the left of a leaf", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        const result = cellPrims.selectEdgeLeftOfLeafAtPoint(
            st, point.mkP2(7, 0)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });

    it("Returns false when leaf is on the left edge", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        const result = cellPrims.selectEdgeLeftOfLeafAtPoint(
            st, point.mkP2(2, 0)
        );

        expect(result).to.be.false;
    });
});

describe("selectEdgeRightOfLeafAtPoint", () => {
    it("Selects the edge to the right of a leaf", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );

        const result = cellPrims.selectEdgeRightOfLeafAtPoint(
            st, point.mkP2(2, 0)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });
});

describe("selectEdgeAboveLeafAtPoint", () => {
    it("Selects the edge above a leaf", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );

        const result = cellPrims.selectEdgeAboveLeafAtPoint(
            st, point.mkP2(0, 1)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });
});

describe("selectEdgeBelowLeafAtPoint", () => {
    it("Selects the edge below a leaf", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );

        const result = cellPrims.selectEdgeBelowLeafAtPoint(
            st, point.mkP2(0, 0)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");
    });
});

describe("canSelectEdgeLeftOf", () => {
    it("Returns true when there is a leaf to the left", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(7, 0));
        expect(cellPrims.canSelectEdgeLeftOf(st, leaf)).to.be.true;
    });

    it("Returns false when there is no leaf to the left", () => {
        const st = mkCellState(
            "hello\n" +
            "+-----+\n" +
            "+-----+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeLeftOf(st, leaf)).to.be.false;
    });

    it("Returns false when the leaf is not adjacent to the leaf on the left", () => {
        const st = mkCellState(
            "\n"        +
            "\n"        +
            "\n"        +
            "\n"        +
            "+--+--+\n" +
            "|  |  |\n" +
            "|  +--+\n" +
            "|  |  |\n" +
            "+--+--+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(3, 2));
        expect(cellPrims.canSelectEdgeLeftOf(st, leaf)).to.be.false;
    });
});

describe("canSelectEdgeRightOf", () => {
    it("Returns true when there is a leaf to the right", () => {
        const st = mkCellState(
            "hello there\n" +
            "+-----+-----+\n" +
            "+-----+-----+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeRightOf(st, leaf)).to.be.true;
    });

    it("Returns false when there is no leaf to the right", () => {
        const st = mkCellState(
            "hello\n" +
            "+-----+\n" +
            "+-----+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeRightOf(st, leaf)).to.be.false;
    });
});

describe("canSelectEdgeAbove", () => {
    it("Returns true when there is a leaf above", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 1));
        expect(cellPrims.canSelectEdgeAbove(st, leaf)).to.be.true;
    });

    it("Returns false when there is no leaf above", () => {
        const st = mkCellState(
            "top\n" +
            "+---+\n" +
            "+---+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeAbove(st, leaf)).to.be.false;
    });
});

describe("canSelectEdgeBelow", () => {
    it("Returns true when there is a leaf below", () => {
        const st = mkCellState(
            "top\n" +
            "bot\n" +
            "+---+\n" +
            "+---+\n" +
            "+---+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeBelow(st, leaf)).to.be.true;
    });

    it("Returns false when there is no leaf below", () => {
        const st = mkCellState(
            "bot\n" +
            "+---+\n" +
            "+---+"
        );
        const leaf = grid.leafUnderPoint(st.grid, point.mkP2(0, 0));
        expect(cellPrims.canSelectEdgeBelow(st, leaf)).to.be.false;
    });
});

describe("selectEdge restructures non-sibling leaves", () => {
    it("Merges and re-splits when selecting an edge between cousin leaves", () => {
        // In a 2x2 grid, parseASCII produces Horz(Vert(TL,BL), Vert(TR,BR)).
        // TL and TR are cousins, not siblings. Selecting the edge to the
        // right of TL should restructure the tree so they become siblings.
        const st = mkCellState(
            "TL  TR\n" +
            "BL  BR\n" +
            "+---+---+\n" +
            "+---+---+\n" +
            "+---+---+"
        );

        const result = cellPrims.selectEdgeRightOfLeafAtPoint(
            st, point.mkP2(0, 0)
        );

        expect(result).to.be.true;
        expect(st.selection.type).to.equal("Edge");

        // The selected edge node should be a Horz split whose children
        // are the two top leaves.
        const edge = /** @type {state.EdgeSelection} */ (st.selection).node;
        expect(edge.type).to.equal("Horz");
        expect(edge.left.type).to.equal("Leaf");
        expect(edge.right.type).to.equal("Leaf");
    });
});
