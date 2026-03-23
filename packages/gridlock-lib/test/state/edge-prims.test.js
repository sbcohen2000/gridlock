import * as grid from "../../src/grid.js";
import {
    serialize,
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims,
    TextPrims,
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
                  "++------+\n" +
                  "||      |\n" +
                  "++------+";

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

        it("Can shift text between two cells where the cells are (vertically) incomplete", () => {
            const src =
                  "ABQAFAAyAAIAMgA8AAEAPABGAAEARgBQABEAAAAAAFAAWgAQABEAAABaAGQAEgAhAAAAZABmADMAAAAFAGYAaAAzAAAABgAIABEAAQABAAEABQAQAA8AAAAIAAAAEAANAAAAAAAAADI=\n"+
                  "# Title:         MXCSR                             \n"  +
                  "# Example from: \"Taking ASCII Drawings Seriously:  \n" +
                  "#                How Programmers Diagram Code\"     \n" +
                  "#                                                  \n"  +
                  "#                Figure 6                          \n"  +
                  "                                                   \n"  +
                  " Exception Masks---+           +---Exception Flags ";

            const st = SlideCellBoundaryPrims.slideCellBoundary({ grid: serialize.parseCompactGrid(src) }, 0, 1);
            st.slideVerticalEdge(-12);

            const exp =
                  "ABQAFAAyAAIAMgA8AAEAPABGAAEARgBQABEAAAAAAFAAWgAEABEAAABaAGQAHgAVAAAAZABmADMAAAAFAGYAaAAzAAAABgAIABEAAQABAAEABAAEAAMAAAAEAAEAHAAZAAAABAAAADI=\n"+
                  "# Title:         MXCSR                             \n"  +
                  "# Example from: \"Taking ASCII Drawings Seriously:  \n" +
                  "#                How Programmers Diagram Code\"     \n" +
                  "#                                                  \n"  +
                  "#                Figure 6                          \n"  +
                  "                                                   \n"  +
                  " Exception Masks---+           +---Exception Flags ";

            expect(serialize.printCompactGrid(st)).to.equal(exp);
        });
    });

    describe("slideHorizontalEdge", () => {
        it("Can slide a horizontal edge with a different number of cells above and below (1)", () => {
            const src =
                  "aaabbb\n"   +
                  "aaabbb\n"   +
                  "ccccccc\n"  +
                  "ccccccc\n"  +
                  "+--+---+\n" +
                  "|  |   |\n" +
                  "+--+---+\n" +
                  "|      |\n" +
                  "+------+";
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = SlideRowBoundaryPrims.slideRowBoundary(st, 0);
            edgeState.slideHorizontalEdge(-1);

            const exp =
                  "aaabbb\n"   +
                  "aaabbb\n"   +
                  "ccccccc\n"  +
                  "ccccccc\n"  +
                  "+--+---+\n" +
                  "+--+---+\n" +
                  "|      |\n" +
                  "|      |\n" +
                  "+------+";

            expect(serialize.printCommonState(edgeState)).to.equal(exp);
        });

        it("Can slide a horizontal edge with a different number of cells above and below (2)", () => {
            const src =
                  "aaabbb\n"   +
                  "aaabbb\n"   +
                  "ccccccc\n"  +
                  "ccccccc\n"  +
                  "+------+\n" +
                  "|      |\n" +
                  "+--+---+\n" +
                  "|  |   |\n" +
                  "+--+---+";
            const st = serialize.textEditingStateFromCommonStateStr(src);

            const edgeState = SlideRowBoundaryPrims.slideRowBoundary(st, 0);
            edgeState.slideHorizontalEdge(-1);

            const exp =
                  "aaabbb\n"   +
                  "aaabbb\n"   +
                  "ccccccc\n"  +
                  "ccccccc\n"  +
                  "+------+\n" +
                  "+--+---+\n" +
                  "|  |   |\n" +
                  "|  |   |\n" +
                  "+--+---+";

            expect(serialize.printCommonState(edgeState)).to.equal(exp);
        });

        it("Can slide a horizontal edge where the below cell is incomplete", () => {
            const src =
                  "AA4ADgAYAAEAGAAiAAMAIgAkAA8AAAAAACQAMAAPAAAAAQABAAEAAQABAAEAAQAB\n"+
                  "a              \n" +
                  "b              \n" +
                  "c              \n" +
                  "d              \n" +
                  "e              \n" +
                  "f              \n" +
                  "g              ";

            const st = SlideRowBoundaryPrims.slideRowBoundary({ grid: serialize.parseCompactGrid(src) }, 0);
            st.slideHorizontalEdge(1);

            const exp =
                  "AA4ADgAYAAIAGAAiAAIAIgAmAA8AAAAAACYAMAAPAAAAAgABAAEAAQABAAEAAQAB\n" +
                  "a              \n" +
                  "b              \n" +
                  "c              \n" +
                  "d              \n" +
                  "e              \n" +
                  "f              \n" +
                  "g              ";

            expect(serialize.printCompactGrid(st)).to.equal(exp);
        });
    });
});
