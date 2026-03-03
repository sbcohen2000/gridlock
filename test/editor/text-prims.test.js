import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as textPrims from "../../src/editor/text-prims/text-prims.js";
import GLPK from "glpk.js/node";
import { expect } from "chai";

const glpk = await GLPK();

describe("text-prims", () => {
    describe("insertString", () => {
        it("Can insert a string into a state with a single leaf", async () => {
            const src =
                  "world\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            await textPrims.insertString(st, "hello ", glpk);

            const exp =
                  "hello world\n"  +
                  "+----------+\n" +
                  "+----------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert individual spaces before a leaf", async () => {
            const src =
                  "world\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            await textPrims.insertString(st, " ", glpk);
            await textPrims.insertString(st, " ", glpk);
            await textPrims.insertString(st, " ", glpk);
            await textPrims.insertString(st, " ", glpk);

            const exp =
                  "    world\n" +
                  "+--------+\n" +
                  "+--------+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a string at the end of a single-line leaf", async () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point past the last letter in
            // `hello`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(5, 0));
            await textPrims.insertString(st, " world", glpk);

            const exp =
                  "hello world\n"  +
                  "+----------+\n" +
                  "+----------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a string at the beginning of a new line in a two-line leaf", async () => {
            const src =
                  "hello\n"   +
                  "\n"        +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point underneath the `h`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(0, 1));
            await textPrims.insertString(st, "world", glpk);

            {
                const exp =
                      "hello\n"   +
                      "world\n"   +
                      "+-----+\n" +
                      "|     |\n" +
                      "+-----+";

                expect(serialize.printCommonState(st)).to.equal(exp);
            }

            // Insert an additional letter to ensure that the cursor is where
            // we expect (at the end of the new line).

            {
                textPrims.insertString(st, "x", glpk);

                const exp =
                      "hello\n"   +
                      "worldx\n"  +
                      "+-----+\n" +
                      "|     |\n" +
                      "+-----+";

                expect(serialize.printCommonState(st)).to.equal(exp);
            }
        });

        it("Can insert a string in a multi-leaf document", async () => {
            const src =
                  "hello other\n"   +
                  "      lines\n"   +
                  "+-----+-----+\n" +
                  "|     |     |\n" +
                  "+-----+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point underneath the `h`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(0, 1));
            await textPrims.insertString(st, "A long second line", glpk);

            const exp =
                  "hello             other\n"   +
                  "A long second linelines\n"   +
                  "+-----------------+-----+\n" +
                  "|                 |     |\n" +
                  "+-----------------+-----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("putPointAtEndOfGlobalLine", () => {
        it("Moves to end of line in a single-leaf document", () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Point starts at (0, 0).
            textPrims.putPointAtEndOfGlobalLine(st);

            expect(st.selection.pt.x).to.equal(5);
            expect(st.selection.pt.y).to.equal(0);
        });

        it("Moves to end of rightmost leaf on the same row", () => {
            const src =
                  "hellothere\n" +
                  "+----+----+\n" +
                  "+----+----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Point starts at (0, 0) in the left leaf.
            textPrims.putPointAtEndOfGlobalLine(st);

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

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Move to second row in the left leaf.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(0, 1));

            textPrims.putPointAtEndOfGlobalLine(st);

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

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point past the last letter in
            // `hello`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(5, 0));
            textPrims.insertGlobalNewline(st);

            const exp =
                  "hello\n"      +
                  "\n"           +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a newline between leaves", async () => {
            const src =
                  "hellothere\n"  +
                  "+----+----+\n" +
                  "+----+----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point past the last letter in
            // `hello`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(5, 0));
            textPrims.insertGlobalNewline(st);

            const exp =
                  "hello\n"  +
                  "     there\n"  +
                  "+----+----+\n" +
                  "|    |    |\n" +
                  "+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a newline within leaves", async () => {
            const src =
                  "hellothere\n"  +
                  "+----+----+\n" +
                  "+----+----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            textPrims.putPointOnGlobalPosition(st, point.mkP2(3, 0));
            textPrims.insertGlobalNewline(st);

            const exp =
                  "hel\n"         +
                  "lo   there\n"  +
                  "+----+----+\n" +
                  "|    |    |\n" +
                  "+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can split a row of leaves.", async () => {
            const src =
                  "one  two  three\n"  +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Update the selection to point past the last letter in the
            // top `one`.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(3, 0));
            textPrims.insertGlobalNewline(st);

            const exp0 =
                  "one\n"  +
                  "     two  three\n"  +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp0);

            // Ensure that the point is in the correct place by inserting
            // some text.
            await textPrims.insertString(st, "some text", glpk);

            const exp1 =
                  "one\n"  +
                  "some texttwo  three\n"  +
                  "one      two  three\n"  +
                  "+--------+----+----+\n" +
                  "|        |    |    |\n" +
                  "|        |    |    |\n" +
                  "+--------+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp1);
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

            const st = textPrims.editText(serialize.commonStateFromString(src));
            // Put the cursor at the bottom left.
            textPrims.putPointOnGlobalPosition(st, point.mkP2(0, 1));
            // Remove the line.
            textPrims.removeGlobalLine(st);

            const exp =
                  "ab\n"  +
                  "+++\n" +
                  "+++"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("putPointOnNextGlobalLine", () => {
        it("Does the `right` thing on a large document", async () => {
            const src =
                  "function x() {             // Note 3\n"              +
                  "  return 2;                // Note 1\n"              +
                  "}\n"                                                 +
                  "                           // Note 2\n"              +
                  "\n"                                                  +
                  "// blah blah hello.\n"                               +
                  "\n"                                                  +
                  "\n"                                                  +
                  "function y(modify     y, z) {\n"                     +
                  "           // p1\n"                                  +
                  "              //      p2\n"                          +
                  "                      // p3   // Note 2\n"           +
                  "}\n"                                                 +
                  "+--------------------------+---------------------+\n"+
                  "|                          |                     |\n"+
                  "|                          |                     |\n"+
                  "|                          |                     |\n"+
                  "+--------------------------+--+------------------+\n"+
                  "|                             |                  |\n"+
                  "|                             |                  |\n"+
                  "+---------------------+-------+--------+-+-------+\n"+
                  "|                     |       |        | |       |\n"+
                  "|                     |       |        | |       |\n"+
                  "|                     |       |        | |       |\n"+
                  "|                     |       |        +-+       |\n"+
                  "|                     |       |        +-+       |\n"+
                  "+---------------------+-------+--------+-+-------+";

            const st = textPrims.editText(serialize.commonStateFromString(src));

            // Put point on the end of the first line.
            textPrims.putPointOnGlobalPosition(st, point.mkOrigin(), true);
            textPrims.putPointAtEndOfGlobalLine(st);

            // Put an `X` and go down a line.
            let fuel = 1000;
            do {
                await textPrims.insertString(st, "X", glpk, false);
                ++fuel;
            } while(textPrims.putPointOnNextGlobalLine(st) && fuel > 0);

            expect(fuel).to.be.greaterThan(0);

            const exp =
                  "function x() {             // Note 3X\n"              +
                  "  return 2;                // Note 1X\n"              +
                  "}X\n"                                                 +
                  "                           // Note 2X\n"              +
                  "X\n"                                                  +
                  "// blah blah hello.X\n"                               +
                  "X\n"                                                  +
                  "X\n"                                                  +
                  "function y(modify     y, z) {X\n"                     +
                  "           // p1X\n"                                  +
                  "              //      p2X\n"                          +
                  "                      // p3   // NotXe 2\n"           +
                  "}X\n"                                                 +
                  "+--------------------------+----------------------+\n"+
                  "|                          |                      |\n"+
                  "|                          |                      |\n"+
                  "|                          |                      |\n"+
                  "+--------------------------+--+-------------------+\n"+
                  "|                             |                   |\n"+
                  "|                             |                   |\n"+
                  "+---------------------+-------+---------+-+-------+\n"+
                  "|                     |       |         | |       |\n"+
                  "|                     |       |         | |       |\n"+
                  "|                     |       |         | |       |\n"+
                  "|                     |       |         +-+       |\n"+
                  "|                     |       |         +-+       |\n"+
                  "+---------------------+-------+---------+-+-------+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });
});
