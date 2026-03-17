import * as fc from "fast-check";
import { serialize, TextPrims } from "../../src/state/index.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";

describe("serialize", () => {
    it("printCellGrid and parseCellGrid are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const src0 = serialize.printCommonState(TextPrims.editText({ grid: g }));
                    const g1 = serialize.parseCommonState(src0);
                    const src1 = serialize.printCommonState(TextPrims.editText({ grid: g1 }));
                    expect(src0).to.equal(src1);
                }
            )
        );
    });
});
