import * as point from "../../src/point.js";
import { serialize } from "../../src/state/index.js";
import { SliceRowPrims } from "../../src/state/slice-row.js";
import { expect } from "chai";

describe("slice-row", () => {
    describe("splitRow", () => {
        it("Splits a row inside of it", () => {
            const src =
                  "foo\n"   +
                  "bar\n"   +
                  "+---+\n" +
                  "|   |\n" +
                  "+---+"

            const st = SliceRowPrims.sliceRow({ grid: serialize.parseCommonState(src) });
            st.splitRow(point.mkP2(1, 1));

            const exp =
                  "foo\n"   +
                  "bar\n"   +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Does nothing on the top edge of a row", () => {
            const src =
                  "foo\n"   +
                  "bar\n"   +
                  "+---+\n" +
                  "+---+\n" +
                  "+---+"

            const st = SliceRowPrims.sliceRow({ grid: serialize.parseCommonState(src) });
            st.splitRow(point.mkP2(1, 1));

            expect(st.grid.rows.map(row => row.height)).to.deep.equal([1, 1]);
            expect(serialize.printCommonState(st)).to.equal(src);
        });
    });
});
