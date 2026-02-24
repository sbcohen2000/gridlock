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
        state.updateSingleSelection(leaf, point.mkP2(5, 0), st);
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
        state.updateSingleSelection(leaf, point.mkP2(0, 1), st);
        await state.insertString("world", st, glpk);

        const exp =
              "hello\n"   +
              "world\n"   +
              "+-----+\n" +
              "|     |\n" +
              "+-----+";

        expect(serialize.printCellGrid(st.grid)).to.equal(exp);
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
        state.updateSingleSelection(leaf, point.mkP2(0, 1), st);
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

describe("removeLineAndPutPointOnPrevLine", () => {

});

describe("removeCharBeforePoint", () => {

});

describe("makeGlobalNewline", () => {

});

describe("newRowBelowPoint", () => {

});
