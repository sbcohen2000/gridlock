import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import { serialize } from "../../src/state/index.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { checkGridInvariants, cloneCellData } from "../../src/state/state-iface.js";
import { TextPrims } from "../../src/state/text-prims.js";
import { disableCellGuides, enableCellGuides } from "../../src/state/disable-guides.js";

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

    it("printCompactGrid preserves structure hidden by disabled guides", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const st = TextPrims.editText({ grid: grid.clone(g, cloneCellData) });
                    const before = serialize.printCommonState(enableCellGuides(st.clone()));

                    const disabled = disableCellGuides(st);
                    const loaded = serialize.parseCompactGrid(serialize.printCompactGrid(disabled));

                    expect(checkGridInvariants({ grid: loaded })).to.be.true;
                    expect(serialize.printCommonState({ grid: loaded })).to.equal(before);
                }
            )
        );
    });

    it("printCompactGrid does not modify its input", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const snapshot = grid.clone(g, cloneCellData);
                    serialize.printCompactGrid({ grid: g });
                    expect(g).to.deep.equal(snapshot);
                }
            )
        );
    });

    it("tryParseCompactGrid rejects plain text", () => {
        expect(serialize.tryParseCompactGrid("hello")).to.be.undefined;
        expect(serialize.tryParseCompactGrid("hello\nworld")).to.be.undefined;
        expect(serialize.tryParseCompactGrid("AAAA\nAAAA")).to.be.undefined;
    });

    it("tryParseCompactGrid accepts the output of printCompactGrid", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const src = serialize.printCompactGrid({ grid: g });
                    expect(serialize.tryParseCompactGrid(src)).to.not.be.undefined;
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
            cells: [{ type: "Cell", width: 4, data: { lines: [], disabledGuides: [] } }],
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
        g.rows[0].cells.push({ type: "Cell", width: 0, data: { lines: [""], disabledGuides: [] } });

        const compact = serialize.printCompactGrid({ grid: g });
        expect(() => serialize.parseCompactGrid(compact)).to.throw();
    });
});
