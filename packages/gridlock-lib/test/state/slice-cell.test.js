import * as point from "../../src/point.js";
import { serialize } from "../../src/state/index.js";
import { SliceCellPrims } from "../../src/state/slice-cell.js";
import { expect } from "chai";

describe("slice-cell", () => {
    describe("splitCell", () => {
        it("Splits a cell inside of it", () => {
            const src =
                  "foobar\n"   +
                  "+------+\n" +
                  "+------+"

            const st = SliceCellPrims.sliceCell({ grid: serialize.parseCommonState(src) });
            st.splitCell(point.mkP2(3, 0));

            const exp =
                  "foobar\n"   +
                  "+--+---+\n" +
                  "+--+---+"

            expect(serialize.printCommonState(st)).to.equal(exp);
        });

        it("Does nothing on the left edge of a cell", () => {
            const src =
                  "foobar\n"   +
                  "+---+--+\n" +
                  "+---+--+"

            const st = SliceCellPrims.sliceCell({ grid: serialize.parseCommonState(src) });
            st.splitCell(point.mkP2(4, 0));

            expect(st.grid.rows[0].cells.map(cell => cell.width)).to.deep.equal([4, 3]);
            expect(serialize.printCommonState(st)).to.equal(src);
        });
    });
});
