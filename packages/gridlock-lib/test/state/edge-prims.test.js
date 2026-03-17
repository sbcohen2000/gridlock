import * as grid from "../../src/grid.js";
import {
    serialize,
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
} from "../../src/state/index.js";
import { expect } from "chai";

describe("edge-prims", () => {
    describe("moveHorizontalEdge", () => {
        it("Moves a horizontal edge down by 1", () => {
            const src =
                "top\n" +
                "bot\n" +
                "+---+---+\n" +
                "+---+---+\n" +
                "+---+---+";
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = MoveRowBoundaryPrims.moveRowBoundary(st, 0);
            edgeState.moveHorizontalEdge(1);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = MoveRowBoundaryPrims.moveRowBoundary(st, 0);
            edgeState.moveHorizontalEdge(-1);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = MoveRowBoundaryPrims.moveRowBoundary(st, 0);
            edgeState.moveHorizontalEdge(-2);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = MoveCellBoundaryPrims.moveCellBoundary(st, 0, 0);
            edgeState.moveVerticalEdge(-10);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = SlideCellBoundaryPrims.slideCellBoundary(st, 0, 0);
            edgeState.slideVerticalEdge(-2);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = SlideCellBoundaryPrims.slideCellBoundary(st, 0, 0);
            edgeState.slideVerticalEdge(-100);

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
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = SlideCellBoundaryPrims.slideCellBoundary(st, 0, 0);
            edgeState.slideVerticalEdge(-1);

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
