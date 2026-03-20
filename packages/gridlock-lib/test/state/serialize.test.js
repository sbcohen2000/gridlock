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
                    const src0 = serialize.printCommonState({ grid: g });
                    const g1 = serialize.parseCommonState(src0);
                    const src1 = serialize.printCommonState({ grid: g1 });
                    expect(src0).to.equal(src1);
                }
            )
        );
    });

    it("_printCompactGridSpec and _parseCompactGridSpec are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const { grid: expanded } = serialize._expandGrid({ grid: g });
                    // Strip the `lines` field so we have a Grid<CompactGridData>.
                    expanded.rows.forEach(row =>
                        row.cells.forEach(cell => delete cell.data.lines));
                    const encoded = serialize._printCompactGridSpec(expanded);
                    const decoded = serialize._parseCompactGridSpec(encoded);
                    expect(decoded).to.deep.equal(expanded);
                }
            )
        );
    });

    it("printCompactGrid and parseCompactGrid are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const src0 = serialize.printCompactGrid({ grid: g });
                    const g1 = serialize.parseCompactGrid(src0);
                    const src1 = serialize.printCompactGrid({ grid: g1 });
                    expect(src0).to.equal(src1);
                }
            )
        );
    });
});
