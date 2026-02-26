import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize.js";
import * as state from "../../src/editor.js";
import GLPK from "glpk.js/node";
import { expect } from "chai";

const glpk = await GLPK();

describe("insertString", () => {
    it("Can insert a string into a state with a single leaf", async () => {
        const src =
              "world\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        await state.insertString(st, "hello ", glpk);

        const exp =
              "hello world\n"  +
              "+----------+\n" +
              "+----------+"

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert individual spaces before a leaf", async () => {
        const src =
              "world\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        await state.insertString(st, " ", glpk);
        await state.insertString(st, " ", glpk);
        await state.insertString(st, " ", glpk);
        await state.insertString(st, " ", glpk);

        const exp =
              "    world\n" +
              "+--------+\n" +
              "+--------+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert a string at the end of a single-line leaf", async () => {
        const src =
              "hello\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point past the last letter in
        // `hello`.
        state.putPointOnGlobalPosition(st, point.mkP2(5, 0));
        await state.insertString(st, " world", glpk);

        const exp =
              "hello world\n"  +
              "+----------+\n" +
              "+----------+"

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert a string at the beginning of a new line in a two-line leaf", async () => {
        const src =
              "hello\n"   +
              "\n"        +
              "+-----+\n" +
              "|     |\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point underneath the `h`.
        state.putPointOnGlobalPosition(st, point.mkP2(0, 1));
        await state.insertString(st, "world", glpk);

        {
            const exp =
                  "hello\n"   +
                  "world\n"   +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+";

            expect(serialize.printCellGrid(st.grid)).to.equal(exp);
        }

        // Insert an additional letter to ensure that the cursor is where
        // we expect (at the end of the new line).

        {
            state.insertString(st, "x", glpk);

            const exp =
                  "hello\n"   +
                  "worldx\n"  +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+";

            expect(serialize.printCellGrid(st.grid)).to.equal(exp);
        }
    });

    it("Can insert a string in a multi-leaf document", async () => {
        const src =
              "hello other\n"   +
              "      lines\n"   +
              "+-----+-----+\n" +
              "|     |     |\n" +
              "+-----+-----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point underneath the `h`.
        state.putPointOnGlobalPosition(st, point.mkP2(0, 1));
        await state.insertString(st, "A long second line", glpk);

        const exp =
              "hello             other\n"   +
              "A long second linelines\n"   +
              "+-----------------+-----+\n" +
              "|                 |     |\n" +
              "+-----------------+-----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });
});

describe("putPointAtEndOfGlobalLine", () => {
    it("Moves to end of line in a single-leaf document", () => {
        const src =
              "hello\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        // Point starts at (0, 0).
        state.putPointAtEndOfGlobalLine(st);

        expect(st.singleSelection.type).to.equal("Single");
        expect(st.singleSelection.pt.x).to.equal(5);
        expect(st.singleSelection.pt.y).to.equal(0);
    });

    it("Moves to end of rightmost leaf on the same row", () => {
        const src =
              "hellothere\n" +
              "+----+----+\n" +
              "+----+----+";

        const st = serialize.editorStateFromString(src);
        // Point starts at (0, 0) in the left leaf.
        state.putPointAtEndOfGlobalLine(st);

        // Should land at end of "there" (col 5) in the right leaf.
        const rightLeaf = grid.leafUnderPoint(st.grid, point.mkP2(5, 0));
        expect(st.singleSelection.leaf).to.equal(rightLeaf);
        expect(st.singleSelection.pt.x).to.equal(5);
        expect(st.singleSelection.pt.y).to.equal(0);
    });

    it("Stays on the correct row in a multi-row document", () => {
        const src =
              "top   top\n"    +
              "bot   bot\n"    +
              "+-----+---+\n"  +
              "|     |   |\n"  +
              "+-----+---+";

        const st = serialize.editorStateFromString(src);
        // Move to second row in the left leaf.
        state.putPointOnGlobalPosition(st, point.mkP2(0, 1));

        state.putPointAtEndOfGlobalLine(st);

        const rightLeaf = grid.leafUnderPoint(st.grid, point.mkP2(6, 0));
        expect(st.singleSelection.leaf).to.equal(rightLeaf);
        expect(st.singleSelection.pt.x).to.equal(3);
        expect(st.singleSelection.pt.y).to.equal(1);
    });

});

describe("insertGlobalNewline", () => {
    it("Can insert a newline at the end of a single-line leaf", async () => {
        const src =
              "hello\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point past the last letter in
        // `hello`.
        state.putPointOnGlobalPosition(st, point.mkP2(5, 0));
        state.insertGlobalNewline(st);

        const exp =
              "hello\n"      +
              "\n"           +
              "+-----+\n" +
              "|     |\n" +
              "+-----+"

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert a newline between leaves", async () => {
        const src =
              "hellothere\n"  +
              "+----+----+\n" +
              "+----+----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point past the last letter in
        // `hello`.
        state.putPointOnGlobalPosition(st, point.mkP2(5, 0));
        state.insertGlobalNewline(st);

        const exp =
              "hello\n"  +
              "     there\n"  +
              "+----+----+\n" +
              "|    |    |\n" +
              "+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert a newline within leaves", async () => {
        const src =
              "hellothere\n"  +
              "+----+----+\n" +
              "+----+----+";

        const st = serialize.editorStateFromString(src);
        state.putPointOnGlobalPosition(st, point.mkP2(3, 0));
        state.insertGlobalNewline(st);

        const exp =
              "hel\n"         +
              "lo   there\n"  +
              "+----+----+\n" +
              "|    |    |\n" +
              "+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can split a row of leaves.", async () => {
        const src =
              "one  two  three\n"  +
              "one  two  three\n"  +
              "+----+----+----+\n" +
              "|    |    |    |\n" +
              "+----+----+----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point past the last letter in the
        // top `one`.
        state.putPointOnGlobalPosition(st, point.mkP2(3, 0));
        state.insertGlobalNewline(st);

        const exp0 =
              "one\n"  +
              "     two  three\n"  +
              "one  two  three\n"  +
              "+----+----+----+\n" +
              "|    |    |    |\n" +
              "|    |    |    |\n" +
              "+----+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp0);

        // Ensure that the point is in the correct place by inserting
        // some text.
        await state.insertString(st, "some text", glpk);

        const exp1 =
              "one\n"  +
              "some texttwo  three\n"  +
              "one      two  three\n"  +
              "+--------+----+----+\n" +
              "|        |    |    |\n" +
              "|        |    |    |\n" +
              "+--------+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp1);
    });
});

describe("splitCellVerticallyAtPoint", () => {
    it("Splits a single cell at the cursor row", () => {
        const src =
              "hello\n" +
              "world\n" +
              "+-----+\n" +
              "|     |\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);
        state.putPointOnGlobalPosition(st, point.mkP2(0, 1));

        state.splitCellVerticallyAtPoint(st);

        const exp =
              "hello\n" +
              "world\n" +
              "+-----+\n" +
              "+-----+\n" +
              "+-----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Does nothing when cursor is on the first row", () => {
        const src =
              "hello\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);

        state.splitCellVerticallyAtPoint(st);

        expect(serialize.printCellGrid(st.grid)).to.equal(src);
    });
});

describe("splitCellHorizontallyAtPoint", () => {
    it("Splits a single cell at the cursor column", () => {
        const src =
              "hello world\n" +
              "+----------+\n" +
              "+----------+";

        const st = serialize.editorStateFromString(src);
        state.putPointOnGlobalPosition(st, point.mkP2(6, 0));

        state.splitCellHorizontallyAtPoint(st);

        const exp =
              "hello world\n" +
              "+-----+----+\n" +
              "+-----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Does nothing when cursor is at column zero", () => {
        const src =
              "hello\n" +
              "+-----+\n" +
              "+-----+";

        const st = serialize.editorStateFromString(src);

        state.splitCellHorizontallyAtPoint(st);

        expect(serialize.printCellGrid(st.grid)).to.equal(src);
    });
});

describe("removeGlobalLine", () => {
    it("Can remove the last line from a tiny two-line document", () => {
        const src =
              "ab\n"  +
              "\n"    +
              "+++\n" +
              "|||\n" +
              "+++"

        const st = serialize.editorStateFromString(src);
        // Put the cursor at the bottom left.
        state.putPointOnGlobalPosition(st, point.mkP2(0, 1));
        // Remove the line.
        state.removeGlobalLine(st);

        const exp =
              "ab\n"  +
              "+++\n" +
              "+++"

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });
});
