import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import { edgePrims, serialize } from "../../src/state/index.js";
import {
    VertMovingPrimsState, HorzMovingPrimsState,
    VertSlidingPrimsState, HorzSlidingPrimsState
} from "../../src/state/edge-prims/state.js";
import { expect } from "chai";

describe("edge-prims", () => {
    describe("startMovingEdge", () => {
        it("Can select the edge below a cell in a two-row grid", () => {
            const src =
                  "top\n" +
                  "bot\n" +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+";
            const st = serialize.textEditingStateFromString(src);

            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Above")).to.be.undefined;
            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Left")).to.be.undefined;
            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Right")).to.be.undefined;

            const result = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Below");
            expect(result).to.not.be.undefined;
            const [edgeState] = result;
            expect(edgeState).to.be.instanceOf(HorzMovingPrimsState);
        });

        it("Can select the edge above a cell in a two-row grid", () => {
            const src =
                  "top\n" +
                  "bot\n" +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+";
            const st = serialize.textEditingStateFromString(src);

            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 1), "Left")).to.be.undefined;
            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 1), "Right")).to.be.undefined;
            expect(edgePrims.startMovingEdge(st, point.mkP2(0, 1), "Below")).to.be.undefined;

            const result = edgePrims.startMovingEdge(st, point.mkP2(0, 1), "Above");
            expect(result).to.not.be.undefined;
            const [edgeState] = result;
            expect(edgeState).to.be.instanceOf(HorzMovingPrimsState);
        });

        it("Selects correct edges in a 3x2 grid", () => {
            const src =
                  "aa\n" +
                  "bb\n" +
                  "cc\n" +
                  "+--+--+\n" +
                  "+--+--+\n" +
                  "+--+--+\n" +
                  "+--+--+";
            const st = serialize.textEditingStateFromString(src);

            // Cell (0,0), direction "Below" → horizontal edge below row 0
            const above = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Below");
            expect(above).to.not.be.undefined;
            expect(above[0]).to.be.instanceOf(HorzMovingPrimsState);
            expect(above[0].rowNo).to.equal(0);

            // Cell (0,2), direction "Above" → horizontal edge above row 2
            const below = edgePrims.startMovingEdge(st, point.mkP2(0, 2), "Above");
            expect(below).to.not.be.undefined;
            expect(below[0]).to.be.instanceOf(HorzMovingPrimsState);
            expect(below[0].rowNo).to.equal(1);

            // Different edges
            expect(above[0].rowNo).to.not.equal(below[0].rowNo);

            // Cell (0,0), direction "Right" → vertical edge to the right of col 0
            const right = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Right");
            expect(right).to.not.be.undefined;
            expect(right[0]).to.be.instanceOf(VertMovingPrimsState);
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
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Below");
            edgePrims.moveHorizontalEdge(edgeState, 1);

            const exp =
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+---+\n" +
                "+---+---+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });

        it("Moves a horizontal edge up by 1", () => {
            const src =
                "top\n" +
                "bot\n" +
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+---+\n" +
                "+---+---+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Below");
            edgePrims.moveHorizontalEdge(edgeState, -1);

            const exp =
                "+---+---+\n" +
                "+---+---+\n" +
                "+---+---+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });

        it("Doesn't permit cells to be reduced to zero height", () => {
            const src =
                "top\n" +
                "bot\n" +
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+---+\n" +
                "+---+---+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Below");
            edgePrims.moveHorizontalEdge(edgeState, -2);

            const exp =
                "+---+---+\n" +
                "+---+---+\n" +
                "+---+---+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });
    });

    describe("moveVerticalEdge", () => {
        it("Doesn't permit cells to be reduced to zero width", () => {
            const src =
                "\n" +
                "\n" +
                "+---+---+\n" +
                "|   |   |\n" +
                "+---+---+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startMovingEdge(st, point.mkP2(0, 0), "Right");
            edgePrims.moveVerticalEdge(edgeState, -10);

            const exp =
                  "++---+\n" +
                  "||   |\n" +
                  "++---+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });
    })

    describe("slideVerticalEdge", () => {
        it("Can shift two empty cells", () => {
            const src =
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startSlidingEdge(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(edgeState, -2);

            const exp =
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });

        it("Won't cause a cell to have a width of zero", () => {
            const src =
                "\n" +
                "\n" +
                "+---+-+\n" +
                "|   | |\n" +
                "+---+-+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startSlidingEdge(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(edgeState, -100);

            const exp =
                "++----+\n" +
                "||    |\n" +
                "++----+";

            expect(grid.printASCII(edgeState.grid)).to.equal(exp);
        });


        it("Can shift text between two cells", () => {
            const src =
                "foofoo\n"  +
                "barbar\n"  +
                "+--+--+\n" +
                "|  |  |\n" +
                "+--+--+";
            const st = serialize.textEditingStateFromString(src);

            const [edgeState] = edgePrims.startSlidingEdge(st, point.mkP2(0, 0), "Right");
            edgePrims.slideVerticalEdge(edgeState, -1);

            const exp =
                "foofoo\n" +
                "barbar\n" +
                "+-+---+\n" +
                "| |   |\n" +
                "+-+---+";

            expect(serialize.printCommonState(edgeState)).to.equal(exp);
        });

    });
});
