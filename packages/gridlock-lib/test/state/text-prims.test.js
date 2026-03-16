import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/state/serialize-common-state.js";
import { expect } from "chai";

describe("text-prims", () => {
    describe("putPointOnGlobalPosition", () => {
        it("Puts the point on the last letter of the line in a cell", () => {
            const src =
                  "world\n"      +
                  "+--------+\n" +
                  "+--------+";

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkP2(7, 0), true);

            const p = st.findGlobalPoint();
            expect(p).to.deep.equal(point.mkP2(5, 0));
        });

        it("Puts the point on the last letter of the line in a full cell", () => {
            const src =
                  "full line\n"  +
                  "+--------+\n" +
                  "+--------+";

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkP2(9, 0), true);

            const p = st.findGlobalPoint();
            expect(p).to.deep.equal(point.mkP2(9, 0));
        });

        it("Puts the point on the last letter of the line in a cell in a multi-row grid", () => {
            const src =
                  "line1\n"      +
                  "line2\n"      +
                  "+--------+\n" +
                  "+--------+\n" +
                  "+--------+";

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkP2(7, 1), true);

            const p = st.findGlobalPoint();
            expect(p).to.deep.equal(point.mkP2(5, 1));
        });
    });

    describe("insertString", () => {
        it("Can insert a string into a state with a single leaf", () => {
            const src =
                  "world\n"   +
                  "+-----+\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            st.insertString("hello ");

            const exp =
                  "hello world\n"  +
                  "+----------+\n" +
                  "+----------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert individual spaces before a leaf", () => {
            const src =
                  "world\n"   +
                  "+-----+\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            st.insertString(" ");
            st.insertString(" ");
            st.insertString(" ");
            st.insertString(" ");

            const exp =
                  "    world\n"  +
                  "+--------+\n" +
                  "+--------+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a string at the end of a single-line leaf", () => {
            const src =
                  "hello\n"   +
                  "+-----+\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point past the last letter in
            // `hello`.
            st.putPointOnGlobalPosition(point.mkP2(5, 0));
            st.insertString(" world");

            const exp =
                  "hello world\n"  +
                  "+----------+\n" +
                  "+----------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a string at the beginning of a new line in a two-line leaf", () => {
            const src =
                  "hello\n"   +
                  "\n"        +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point underneath the `h`.
            st.putPointOnGlobalPosition(point.mkP2(0, 1));
            st.insertString("world");

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
                st.insertString("x");

                const exp =
                      "hello\n"   +
                      "worldx\n"  +
                      "+-----+\n" +
                      "|     |\n" +
                      "+-----+";

                expect(serialize.printCommonState(st)).to.equal(exp);
            }
        });

        it("Can insert a string in a multi-leaf document", () => {
            const src =
                  "hello other\n"   +
                  "      lines\n"   +
                  "+-----+-----+\n" +
                  "|     |     |\n" +
                  "+-----+-----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point underneath the `h`.
            st.putPointOnGlobalPosition(point.mkP2(0, 1));
            st.insertString("A long second line");

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
                  "hello\n"   +
                  "+-----+\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            // Point starts at (0, 0).
            st.putPointAtEndOfGlobalLine();

            expect(st.selection.pt.x).to.equal(5);
            expect(st.selection.pt.y).to.equal(0);
        });

        it("Moves to end of rightmost leaf on the same row", () => {
            const src =
                  "hellothere\n"  +
                  "+----+----+\n" +
                  "+----+----+";

            const st = serialize.textEditingStateFromString(src);
            // Point starts at (0, 0) in the left leaf.
            st.putPointAtEndOfGlobalLine();

            // Should land at end of "there" (col 5) in the right leaf.
            const rightCell = grid.cellUnderPoint(st.grid, point.mkP2(5, 0));
            expect(st.selection.cell).to.deep.equal(rightCell);
            expect(st.selection.pt.x).to.equal(5);
            expect(st.selection.pt.y).to.equal(0);
        });

        it("Stays on the correct row in a multi-row document", () => {
            const src =
                  "top   top\n"   +
                  "bot   bot\n"   +
                  "+-----+---+\n" +
                  "|     |   |\n" +
                  "+-----+---+";

            const st = serialize.textEditingStateFromString(src);
            // Move to second row in the left leaf.
            st.putPointOnGlobalPosition(point.mkP2(0, 1));

            st.putPointAtEndOfGlobalLine();

            const rightCell = grid.cellUnderPoint(st.grid, point.mkP2(6, 0));
            expect(st.selection.cell).to.deep.equal(rightCell);
            expect(st.selection.pt.x).to.equal(3);
            expect(st.selection.pt.y).to.equal(1);
        });

    });

    describe("insertGlobalNewline", () => {
        it("Can insert a newline at the end of a single-line leaf", () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point past the last letter in
            // `hello`.
            st.putPointOnGlobalPosition(point.mkP2(5, 0));
            st.insertGlobalNewline();

            const exp =
                  "hello\n"   +
                  "\n"        +
                  "+-----+\n" +
                  "|     |\n" +
                  "+-----+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a newline between leaves", () => {
            const src =
                  "hellothere\n"  +
                  "+----+----+\n" +
                  "+----+----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point past the last letter in
            // `hello`.
            st.putPointOnGlobalPosition(point.mkP2(5, 0));
            st.insertGlobalNewline();

            const exp =
                  "hello\n"       +
                  "there\n"       +
                  "+----+----+\n" +
                  "|    |    |\n" +
                  "+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can insert a newline within leaves", () => {
            const src =
                  "hellothere\n"  +
                  "+----+----+\n" +
                  "+----+----+";

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkP2(3, 0));
            st.insertGlobalNewline();

            const exp =
                  "hel\n"         +
                  "lo   there\n"  +
                  "+----+----+\n" +
                  "|    |    |\n" +
                  "+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can split a row of leaves. (1)", () => {
            const src =
                  "one  two  three\n"  +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point to the first letter in
            // the top `two`.
            st.putPointOnGlobalPosition(point.mkP2(5, 0));
            st.insertGlobalNewline();

            const exp =
                  "one\n"              +
                  "two  three\n"       +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can split a row of leaves. (2)", () => {
            const src =
                  "one  two  three\n"  +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            const st = serialize.textEditingStateFromString(src);
            // Update the selection to point past the last letter in the
            // top `one`.
            st.putPointOnGlobalPosition(point.mkP2(3, 0));
            st.insertGlobalNewline();

            const exp =
                  "one\n"              +
                  "     two  three\n"  +
                  "one  two  three\n"  +
                  "+----+----+----+\n" +
                  "|    |    |    |\n" +
                  "|    |    |    |\n" +
                  "+----+----+----+";

            expect(serialize.printCommonState(st)).to.equal(exp);
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

            const st = serialize.textEditingStateFromString(src);
            // Put the cursor at the bottom left.
            st.putPointOnGlobalPosition(point.mkP2(0, 1));
            // Remove the line.
            st.removeGlobalLine();

            const exp =
                  "ab\n"  +
                  "+++\n" +
                  "+++"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("putPointOnNextGlobalCol", () => {
        it("Can put the point after the last character in a cell", () => {
            const src =
                  "xyzw\n"            +
                  "\n"                +
                  "+---+---------+\n" +
                  "+---+---------+\n" +
                  "+---+---------+";

            const st = serialize.textEditingStateFromString(src);

            st.putPointOnGlobalPosition(point.mkOrigin(), false);
            for(let i = 0; i < 4; ++i) {
                st.putPointOnNextGlobalCol();
            }
            st.insertString("X");

            const exp =
                  "xyzwX\n"            +
                  "\n"                 +
                  "+----+---------+\n" +
                  "+----+---------+\n" +
                  "+----+---------+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can advance the point into a new cell", () => {
            const src =
                  "xyzw\n"            +
                  "\n"                +
                  "+---+---------+\n" +
                  "+---+---------+\n" +
                  "+---+---------+";

            const st = serialize.textEditingStateFromString(src);

            st.putPointOnGlobalPosition(point.mkOrigin(), false);
            for(let i = 0; i < 5; ++i) { // <- This line is the only difference from the previous test!
                st.putPointOnNextGlobalCol();
            }
            st.insertString("X");

            const exp =
                  "xyzwX\n"           +
                  "\n"                +
                  "+---+---------+\n" +
                  "+---+---------+\n" +
                  "+---+---------+";

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("_spreadTextOnGlobalRow", () => {
        /**
         * Convert an iterator over strings to an iterator over positioned
         * strings. It assigns columns assuming that the strings have no gaps
         * between them.
         *
         * @param {IteratorObject<string>} strIter
         */
        function textOnGlobalLineIterFromStringsIter(strIter) {
            let col = 0;
            return strIter.map(str => {
                const item = {
                    globalCol: col,
                    localRow: null,
                    text: str,
                    leaf: null,
                };
                col += str.length;
                return item;
            });
        }

        it("Can spread empty text into a single cell", () => {
            const src =
                  "hello\n"    +
                  "+----+\n" +
                  "+----+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter([].values()));

            expect(serialize.printCommonState(st)).to.equal(src);
        });

        it("Can spread text into a single empty cell", () => {
            const src =
                  "\n"    +
                  "+-+\n" +
                  "+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter(["hello"].values()));

            const exp =
                  "hello\n"  +
                  "+----+\n" +
                  "+----+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can spread multiple texts into a single empty cell", () => {
            const src =
                  "\n"    +
                  "+-+\n" +
                  "+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter(["a", "b", "c"].values()));

            const exp =
                  "abc\n"  +
                  "+--+\n" +
                  "+--+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can spread multiple texts into multiple empty cells (1)", () => {
            const src =
                  "\n"  +
                  "+-+-+-+\n" +
                  "+-+-+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter(["a", "b", "c"].values()));

            const exp =
                  "a b c\n"   +
                  "+-+-+-+\n" +
                  "+-+-+-+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can spread multiple texts into multiple empty cells (2)", () => {
            const src =
                  "\n"  +
                  "+-+-+\n" +
                  "+-+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter(["a", "b", "c"].values()));

            const exp =
                  "a bc\n"  +
                  "+-+-+\n" +
                  "+-+-+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can spread multiple texts into multiple non-empty cells", () => {
            const src =
                  "aabb\n"    +
                  "+-+-+-+\n" +
                  "+-+-+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 0, textOnGlobalLineIterFromStringsIter(["c", "d"].values()));

            const exp =
                  "aacbbd\n"   +
                  "+--+--+-+\n" +
                  "+--+--+-+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Can spread multiple texts into multiple non-empty cells with a non-zero column", () => {
            const src =
                  "aabb\n"    +
                  "+-+-+-+\n" +
                  "+-+-+-+"

            const st = serialize.textEditingStateFromString(src);
            st._spreadTextOnGlobalRow(
                0, 2, textOnGlobalLineIterFromStringsIter(["c", "d"].values()));

            const exp =
                  "aabbcd\n"   +
                  "+-+--+-+\n" +
                  "+-+--+-+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });

    describe("removeGlobalNewline", () => {
        it("Does nothing on the first line of the document", () => {
            const src =
                  "foo bar\n"   +
                  "+---+---+\n" +
                  "+---+---+"

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkOrigin(), false);
            st.removeGlobalNewline();

            expect(st.pointAtBeginningOfGlobalLine()).to.be.true;
            expect(serialize.printCommonState(st)).to.equal(src);
        });

        it("Can remove the line on a 2-line document", () => {
            const src =
                  "foo bar\n"   +
                  "baz\n"       +
                  "+---+---+\n" +
                  "|   |   |\n" +
                  "+---+---+"

            const st = serialize.textEditingStateFromString(src);
            st.putPointOnGlobalPosition(point.mkP2(0, 1), false);
            st.removeGlobalNewline();

            // Insert a character to test that the point is in the right spot.
            st.insertString("X",  false);

            const exp =
                  "foo barXbaz\n"  +
                  "+---+------+\n" +
                  "+---+------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });
    });
});
