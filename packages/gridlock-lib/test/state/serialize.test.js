import * as fc from "fast-check";
import { serialize } from "../../src/state/index.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";

describe("serialize", () => {
    it("printCellGrid and parseCellGrid are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const src0 = serialize.printCommonState(serialize.commonStateFromGrid(g));
                    const g1 = serialize.parseCellGrid(src0);
                    const src1 = serialize.printCommonState(serialize.commonStateFromGrid(g1));
                    expect(src0).to.equal(src1);
                }
            )
        );
    });
});
