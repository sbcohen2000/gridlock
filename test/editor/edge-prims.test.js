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
    return edgePrims.moveEdge(serialize.textEditingStateFromString(src))[0];
}

/**
 * Create an EdgeSlidingPrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/editor/edge-prims/state.js").EdgeSlidingPrimsState}
 */
function mkSlidingEdgeState(src) {
    return edgePrims.slideEdge(serialize.textEditingStateFromString(src))[0];
}

describe("edge-prims", () => {
    describe("moveHorizontalEdge", () => {
        it("Moves a horizontal edge down by 1", () => {
            const st = mkMovingEdgeState(
                "top\n" +
                    "bot\n" +
                    "+---+---+\n" +
                    "+---+---+\n" +
                    "+---+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            edgePrims.moveHorizontalEdge(st, 1);

            expect(grid.printASCII(st.grid)).to.equal(
                "+---+---+\n" +
                    "|   |   |\n" +
                    "+---+---+\n" +
                    "+---+---+"
            );
        });

        it("Moves a horizontal edge up by 1", () => {
            const st = mkMovingEdgeState(
                "top\n" +
                    "\n" +
                    "bot\n" +
                    "+---+---+\n" +
                    "|   |   |\n" +
                    "+---+   |\n" +
                    "+---+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            edgePrims.moveHorizontalEdge(st, -1);

            expect(grid.printASCII(st.grid)).to.equal(
                "+---+---+\n" +
                    "+---+   |\n" +
                    "+---+---+"
            );
        });

        it("Does not shrink a leaf below height 1", () => {
            const st = mkMovingEdgeState(
                "top\n" +
                    "bot\n" +
                    "+---+\n" +
                    "+---+\n" +
                    "+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            const gridBefore = grid.printASCII(st.grid);
            edgePrims.moveHorizontalEdge(st, -1);

            // Top leaf is already height 1, can't shrink further
            expect(grid.printASCII(st.grid)).to.equal(gridBefore);
        });

    });

    describe("slideVerticalEdge", () => {
        it("Can shift two empty cells", () => {
            const st = mkSlidingEdgeState(
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(st, -2);

            expect(grid.printASCII(st.grid)).to.equal(
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+"
            );
        });

        it("Won't cause a cell to have a width of zero", () => {
            const st = mkSlidingEdgeState(
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(st, -100);

            expect(grid.printASCII(st.grid)).to.equal(
                "++----+\n" +
                "||    |\n" +
                "++----+"
            );
        });


        it("Can shift text between two cells", () => {
            const st = mkSlidingEdgeState(
                "foofoo\n"  +
                "barbar\n"  +
                "+--+--+\n" +
                "|  |  |\n" +
                "+--+--+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(st, -1);

            expect(serialize.printCommonState(st)).to.equal(
                "foofoo\n" +
                "barbar\n" +
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+"
            );
        });

        it("Can shift text between multiple cells", () => {
            const st = mkSlidingEdgeState(
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
                "+--+--+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(3, 3), "Left");
            edgePrims.slideVerticalEdge(st, 2);

            expect(serialize.printCommonState(st)).to.equal(
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
                "+----++"
            );
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
            edgePrims.slideVerticalEdge(st, -2);

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
            edgePrims.slideVerticalEdge(st, 1);

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
            edgePrims.slideVerticalEdge(st, 2);

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
            edgePrims.slideHorizontalEdge(st, 1);

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
