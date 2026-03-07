import * as fc from "fast-check";
import * as serialize from "../../src/editor/serialize-common-state.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";

describe("serialize", () => {
    it("printCellGrid and parseCellGrid are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const src0 = serialize.printCommonState({ grid: g });
                    const g1 = serialize.parseCellGrid(src0);
                    const src1 = serialize.printCommonState({ grid: g1 });
                    expect(src0).to.equal(src1);
                }
            )
        );
    });
});
