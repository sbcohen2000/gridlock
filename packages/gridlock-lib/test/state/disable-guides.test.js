import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import { arbCellGridWithHiddenLines } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { serialize } from "../../src/state/index.js";
import { TextPrims } from "../../src/state/text-prims.js";
import { disableCellGuides, enableCellGuides, enableCellGuidesInGrid } from "../../src/state/disable-guides.js";
import { checkGridInvariants, cloneCellData, ensureCellLinesMatchRowHeight } from "../../src/state/state-iface.js";

/**
 * Generate grids whose lines have no trailing whitespace, and which
 * have no empty lines hidden below the bottom of their row, since
 * disabling and enabling guides trims both.
 */
const arbCellGridWithoutTrailingSpaces = arbCellGridWithHiddenLines.map(g => {
    const trimmed = grid.clone(g, cloneCellData);
    for(const cell of grid.allCells(trimmed)) {
        const theCell = grid.lookupCell(trimmed, cell);
        theCell.data.lines = theCell.data.lines.map(line => line.trimEnd());
        ensureCellLinesMatchRowHeight(trimmed, cell);
    }
    return trimmed;
});

describe("disable-guides", () => {
    it("Keeps guides which were already disabled", () => {
        const src =
              "foobar\n"   +
              "+----+-+\n" +
              "+----+-+"

        const st = TextPrims.editText({ grid: serialize.parseCommonState(src) });
        st.grid.rows[0].cells[0].data.disabledGuides = [{ localOffset: 2 }];

        const disabled = disableCellGuides(st);
        expect(disabled.grid.rows[0].cells[0].data.disabledGuides.map(guide => guide.localOffset)).to.deep.equal([2, 5]);

        const reenabled = enableCellGuides(disabled);
        expect(reenabled.grid.rows[0].cells.map(cell => cell.width)).to.deep.equal([2, 3, 2]);
    });

    it("Restores the fill character of each cell", () => {
        const src =
              "ab\n"    +
              "+-+-+\n" +
              "+-+-+"

        const st = TextPrims.editText({ grid: serialize.parseCommonState(src) });
        st.grid.rows[0].cells[1].data.fillChar = ".";

        const disabled = disableCellGuides(st);
        const merged = disabled.grid.rows[0].cells[0];
        expect(merged.data.fillChar).to.be.undefined;
        expect(merged.data.disabledGuides).to.deep.equal([{ localOffset: 2, fillChar: "." }]);

        const reenabled = enableCellGuides(disabled);
        const [left, right] = reenabled.grid.rows[0].cells;
        expect(left.data.fillChar).to.be.undefined;
        expect(right.data.fillChar).to.equal(".");
    });

    it("Keeps hidden lines in the cell they belong to", () => {
        const src =
              "   x\n"    +
              "+--+--+\n" +
              "+--+--+"

        const st = TextPrims.editText({ grid: serialize.parseCommonState(src) });
        st.grid.rows[0].cells[1].data.lines = ["x", "yz"];

        const reenabled = enableCellGuides(disableCellGuides(st));
        const [left, right] = reenabled.grid.rows[0].cells;
        expect(left.data.lines.every(line => line === "")).to.be.true;
        expect(right.data.lines).to.deep.equal(["x", "yz"]);
    });

    it("Enables guides in several cells on the same row", () => {
        const src =
              "\n" +
              "++--+------+\n" +
              "++--+------+"

        const g = serialize.parseCommonState(src);
        g.rows[0].cells[1].data.disabledGuides = [{ localOffset: 1 }];
        g.rows[0].cells[2].data.disabledGuides = [{ localOffset: 1 }];

        enableCellGuidesInGrid(g);

        const cells = g.rows[0].cells;
        expect(cells.map(cell => cell.width)).to.deep.equal([1, 1, 2, 1, 6]);
        expect(cells.every(cell => cell.data.disabledGuides.length === 0)).to.be.true;
    });

    it("disableCellGuides and enableCellGuides are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGridWithoutTrailingSpaces,
                (g) => {
                    const st = TextPrims.editText({ grid: grid.clone(g, cloneCellData) });
                    const before = serialize.printCompactGrid(st);

                    const disabled = disableCellGuides(st);
                    const reenabled = enableCellGuides(disabled);

                    expect(checkGridInvariants(reenabled)).to.be.true;
                    const after = serialize.printCompactGrid(reenabled);
                    expect(after).to.equal(before);
                }
            ),
            { numRuns: 1000 }
        );
    });
});
