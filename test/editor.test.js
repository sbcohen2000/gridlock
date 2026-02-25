import * as grid from "../src/grid.js";
import * as point from "../src/point.js";
import * as serialize from "../src/editor/serialize.js";
import * as state from "../src/editor.js";
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
        await state.insertString("hello ", st, glpk);

        const exp =
              "hello world\n"  +
              "+----------+\n" +
              "+----------+"

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
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(5, 0), st);
        await state.insertString(" world", st, glpk);

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
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(0, 1), st);
        await state.insertString("world", st, glpk);

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
            state.insertString("x", st, glpk);

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
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(0, 1), st);
        await state.insertString("A long second line", st, glpk);

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

        expect(st.selection.type).to.equal("Single");
        expect(st.selection.pt.x).to.equal(5);
        expect(st.selection.pt.y).to.equal(0);
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
        expect(st.selection.leaf).to.equal(rightLeaf);
        expect(st.selection.pt.x).to.equal(5);
        expect(st.selection.pt.y).to.equal(0);
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
        const leftLeaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leftLeaf, point.mkP2(0, 1), st);

        state.putPointAtEndOfGlobalLine(st);

        const rightLeaf = grid.leafUnderPoint(st.grid, point.mkP2(6, 0));
        expect(st.selection.leaf).to.equal(rightLeaf);
        expect(st.selection.pt.x).to.equal(3);
        expect(st.selection.pt.y).to.equal(1);
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
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(5, 0), st);
        await state.insertGlobalNewline("next line", st, glpk);

        const exp =
              "hello\n"        +
              "next line\n"    +
              "+--------+\n" +
              "|        |\n" +
              "+--------+"

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
    });

    it("Can insert a newline at the end of a multi-leaf document", async () => {
        const src =
              "hellothere\n"  +
              "+----+----+\n" +
              "+----+----+";

        const st = serialize.editorStateFromString(src);
        // Update the selection to point past the last letter in
        // `hello`.
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(5, 0), st);
        await state.insertGlobalNewline("world", st, glpk);

        const exp =
              "hellothere\n"  +
              "world\n"       +
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
        const leaf = grid.leafUnderPoint(st.grid, point.mkOrigin());
        state.setSelectionPoint(leaf, point.mkP2(3, 0), st);
        await state.insertGlobalNewline("", st, glpk);

        const exp0 =
              "one  two  three\n"  +
              "\n"                 +
              "one  two  three\n"  +
              "+----+----+----+\n" +
              "|    |    |    |\n" +
              "|    |    |    |\n" +
              "+----+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp0);

        // Ensure that the point is in the correct place by inserting
        // some text.
        await state.insertString("some text", st, glpk);

        const exp1 =
              "one      two  three\n"  +
              "some text\n"            +
              "one      two  three\n"  +
              "+--------+----+----+\n" +
              "|        |    |    |\n" +
              "|        |    |    |\n" +
              "+--------+----+----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp1);
    });
});
