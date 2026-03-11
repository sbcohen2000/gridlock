import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as edgePrims from "../../src/editor/edge-prims/edge-prims.js";
import { expect } from "chai";

/**
 * Create an EdgeMovingPrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/editor/edge-prims/state.js").EdgeMovingPrimsState}
 */
function mkMovingEdgeState(src) {
    return edgePrims.startMovingEdge(serialize.textEditingStateFromString(src))[0];
}

/**
 * Create an EdgeSlidingPrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/editor/edge-prims/state.js").EdgeSlidingPrimsState}
 */
function mkSlidingEdgeState(src) {
    return edgePrims.startSlidingEdge(serialize.textEditingStateFromString(src))[0];
}

describe("edge-prims", () => {
    describe("selectEdgeUnderPoint", () => {
        it("Can select the edge under the point of a two-cell grid (1)", () => {
            const src =
                  "top\n" +
                  "bot\n" +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+";
            const st = mkMovingEdgeState(src);

            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Above")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Left")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below")).to.be.true;
            expect(st.selection).to.equal(st.grid);
        });

        it("Can select the edge under the point of a two-cell grid (2)", () => {
            const src =
                  "top\n" +
                  "bot\n" +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+";
            const st = mkMovingEdgeState(src);

            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 1), "Left")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 1), "Right")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 1), "Below")).to.be.false;
            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 1), "Above")).to.be.true;
            expect(st.selection).to.equal(st.grid);
        });

        it("Selects correct edges in nested grid", () => {
            const src =
                  "aa\n" +
                  "bb\n" +
                  "cc\n" +
                  "dd\n" +
                  "ee\n" +
                  "ff\n" +
                  "+--+--+\n" + // -+
                  "|  |  |\n" + //  | expectation 1
                  "+--+--+\n" + // -|+
                  "|  |  |\n" + //  ||
                  "+--+--+\n" + // -+|
                  "|  |  |\n" + //   | expectation 2
                  "+--+--+";    // --+
            //     |     |
            //     +-----+ expectation 3
            const st = mkMovingEdgeState(src);

            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 2), "Above")).to.be.true;
            const aboveFromMid = st.selection;
            expect(aboveFromMid.type).to.equal("Vert");

            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 2), "Below")).to.be.true;
            const belowFromMid = st.selection;
            expect(belowFromMid.type).to.equal("Vert");

            expect(aboveFromMid).to.not.equal(belowFromMid);

            expect(edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 2), "Right")).to.be.true;
            expect(st.selection).to.equal(st.grid);
        });
    })

    describe("moveHorizontalEdge", () => {
        it("Moves a horizontal edge down by 1", () => {
            const src =
                "top\n" +
                "bot\n" +
                "+---+---+\n" +
                "+---+---+\n" +
                "+---+---+";
            const st = mkMovingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            edgePrims.moveEdge(st, 1);

            const exp =
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+---+\n" +
                "+---+---+";

            expect(grid.printASCII(st.grid)).to.equal(exp);
        });

        it("Moves a horizontal edge up by 1", () => {
            const src =
                "top\n" +
                "\n" +
                "bot\n" +
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+   |\n" +
                "+---+---+";
            const st = mkMovingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            edgePrims.moveEdge(st, -1);

            const exp =
                "+---+---+\n" +
                "+---+   |\n" +
                "+---+---+";

            expect(grid.printASCII(st.grid)).to.equal(exp);
        });

        it("Does not shrink a leaf below height 1", () => {
            const src =
                "top\n" +
                "bot\n" +
                "+---+\n" +
                "+---+\n" +
                "+---+";
            const st = mkMovingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            const exp = grid.printASCII(st.grid);
            edgePrims.moveEdge(st, -1);

            // Top leaf is already height 1, can't shrink further
            expect(grid.printASCII(st.grid)).to.equal(exp);
        });

    });

    describe("slideVerticalEdge", () => {
        it("Can shift two empty cells", () => {
            const src =
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+";
            const st = mkSlidingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideEdge(st, -2);

            const exp =
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+";

            expect(grid.printASCII(st.grid)).to.equal(exp);
        });

        it("Won't cause a cell to have a width of zero", () => {
            const src =
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+";
            const st = mkSlidingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideEdge(st, -100);

            const exp =
                "++----+\n" +
                "||    |\n" +
                "++----+";

            expect(grid.printASCII(st.grid)).to.equal(exp);
        });


        it("Can shift text between two cells", () => {
            const src =
                "foofoo\n"  +
                "barbar\n"  +
                "+--+--+\n" +
                "|  |  |\n" +
                "+--+--+";
            const st = mkSlidingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideEdge(st, -1);

            const exp =
                "foofoo\n" +
                "barbar\n" +
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can shift text between multiple cells", () => {
            const src =
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "+--+--+\n" +
                "|  |  |\n" +
                "+--+  |\n" +
                "|  +--+\n" +
                "|  |  |\n" +
                "+--+--+";
            const st = mkSlidingEdgeState(src);

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(3, 3), "Left");
            edgePrims.slideEdge(st, 2);

            const exp =
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "abcdef\n"  +
                "+----++\n" +
                "|    ||\n" +
                "+----+|\n" +
                "|    ++\n" +
                "|    ||\n" +
                "+----++";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can shift an edge in a more complex grid (1)", () => {
            const src =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+-----+---+\n"+
                  "| +--+--+   |\n"+
                  "| |  |  |   |\n"+
                  "+-+--+--+---+";

            const st = mkSlidingEdgeState(src);
            edgePrims.selectEdgeUnderPoint(st, point.mkP2(9, 0), "Left");
            edgePrims.slideEdge(st, -2);

            const exp =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+---+-----+\n"+
                  "| +--++     |\n"+
                  "| |  ||     |\n"+
                  "+-+--++-----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can shift an edge in a more complex grid (2)", () => {
            const src =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+-----+---+\n"+
                  "| +--+--+   |\n"+
                  "| |  |  |   |\n"+
                  "+-+--+--+---+";

            const st = mkSlidingEdgeState(src);
            edgePrims.selectEdgeUnderPoint(st, point.mkP2(2, 1), "Right");
            edgePrims.slideEdge(st, 1);

            const exp =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+-----+---+\n"+
                  "| +---+-+   |\n"+
                  "| |   | |   |\n"+
                  "+-+---+-+---+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("can shift an edge in a more complex grid (3)", () => {
            const src =
                  "hellothere\n"       +
                  "  abc  abc\n"       +
                  "  abc\n"            +
                  "\n"                 +
                  "\n"                 +
                  "  abc  abc\n"       +
                  "\n"                 +
                  "+-+---------+---+\n"+
                  "| +----+----+   |\n"+
                  "| |    |    |   |\n"+
                  "| |    |    |   |\n"+
                  "| +----+----+---+\n"+ // <--- this row
                  "| |    |    |   |\n"+
                  "| |    |    |   |\n"+
                  "+-+----+----+---+";
            //            ^---- and this column

            const st = mkSlidingEdgeState(src);
            edgePrims.selectEdgeUnderPoint(st, point.mkP2(7, 4), "Right");
            edgePrims.slideEdge(st, 2);

            const exp =
                  "hellothere\n"       +
                  "  abc  abc\n"       +
                  "  abc\n"            +
                  "\n"                 +
                  "\n"                 +
                  "  abc  abc\n"       +
                  "\n"                 +
                  "+-+-----------+-+\n"+
                  "| +----+------+ |\n"+
                  "| |    |      | |\n"+
                  "| |    |      | |\n"+
                  "| +----+------+-+\n"+
                  "| |    |      | |\n"+
                  "| |    |      | |\n"+
                  "+-+----+------+-+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("slideHorizontalEdge", () => {
        it("Can shift an edge in a more complex grid (1)", () => {
            const src =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+-----+---+\n"+
                  "| +--+--+   |\n"+
                  "| |  |  |   |\n"+
                  "+-+--+--+---+";

            const st = mkSlidingEdgeState(src);
            edgePrims.selectEdgeUnderPoint(st, point.mkP2(5, 1), "Above");
            edgePrims.slideEdge(st, 1);

            const exp =
                  "hellothere\n"   +
                  "     abc\n"     +
                  "     abc\n"     +
                  "+-+-----+---+\n"+
                  "| |     |   |\n"+
                  "| +--+--+   |\n"+
                  "+-+--+--+---+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });
});
