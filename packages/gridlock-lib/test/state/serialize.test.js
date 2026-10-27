import * as fc from "fast-check";
import { serialize } from "../../src/state/index.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { checkGridInvariants } from "../../src/state/state-iface.js";

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
                    expect(checkGridInvariants({ grid: g1 })).to.be.true;
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
                    expect(checkGridInvariants({ grid: g1 })).to.be.true;
                }
            )
        );
    });

    it("parseCompactGrid throws on a zero-height row", () => {
        const src =
              "foo\n"   +
              "bar\n"   +
              "+---+\n" +
              "+---+\n" +
              "+---+"

        const g = serialize.parseCommonState(src);
        g.rows.splice(1, 0, {
            type: "Row",
            height: 0,
            cells: [{ type: "Cell", width: 4, data: { lines: [], disabledGuides: new Set() } }],
        });

        const compact = serialize.printCompactGrid({ grid: g });
        expect(() => serialize.parseCompactGrid(compact)).to.throw();
    });

    it("parseCompactGrid throws on a zero-width cell", () => {
        const src =
              "foo\n"   +
              "bar\n"   +
              "+---+\n" +
              "+---+\n" +
              "+---+"

        const g = serialize.parseCommonState(src);
        g.rows[0].cells.push({ type: "Cell", width: 0, data: { lines: [""], disabledGuides: new Set() } });

        const compact = serialize.printCompactGrid({ grid: g });
        expect(() => serialize.parseCompactGrid(compact)).to.throw();
    });
});
