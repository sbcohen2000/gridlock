import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as edgePrims from "../../src/editor/edge-prims/edge-prims.js";
import { expect } from "chai";

/**
 * Create an EdgePrimsState from a cell-grid string.
 *
 * @param {string} src
 * @returns {import("../../src/editor/edge-prims/state.d.ts").EdgePrimsState}
 */
function mkEdgeState(src) {
    return edgePrims.editEdge(serialize.commonStateFromString(src));
}

describe("edge-prims", () => {
    describe("modifyHorizontalEdge", () => {
        it("Moves a horizontal edge down by 1", () => {
            const st = mkEdgeState(
                "top\n" +
                    "bot\n" +
                    "+---+---+\n" +
                    "+---+---+\n" +
                    "+---+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            const result = edgePrims.modifyHorizontalEdge(st, 1);

            expect(result).to.be.true;
            expect(grid.printASCII(st.grid)).to.equal(
                "+---+---+\n" +
                    "|   |   |\n" +
                    "+---+---+\n" +
                    "+---+---+"
            );
        });

        it("Moves a horizontal edge up by 1", () => {
            const st = mkEdgeState(
                "top\n" +
                    "\n" +
                    "bot\n" +
                    "+---+---+\n" +
                    "|   |   |\n" +
                    "+---+   |\n" +
                    "+---+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            const result = edgePrims.modifyHorizontalEdge(st, -1);

            expect(result).to.be.true;
            expect(grid.printASCII(st.grid)).to.equal(
                "+---+---+\n" +
                    "+---+   |\n" +
                    "+---+---+"
            );
        });

        it("Does not shrink a leaf below height 1", () => {
            const st = mkEdgeState(
                "top\n" +
                    "bot\n" +
                    "+---+\n" +
                    "+---+\n" +
                    "+---+"
            );

            edgePrims.selectEdgeUnderPoint(st, point.mkP2(0, 0), "Below");
            const result = edgePrims.modifyHorizontalEdge(st, -1);

            // Top leaf is already height 1, can't shrink further
            expect(result).to.be.false;
        });
    });
});
