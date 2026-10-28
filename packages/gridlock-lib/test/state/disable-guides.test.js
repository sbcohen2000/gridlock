import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { serialize } from "../../src/state/index.js";
import { TextPrims } from "../../src/state/text-prims.js";
import { disableCellGuides, enableCellGuides, enableCellGuidesInGrid } from "../../src/state/disable-guides.js";
import { checkGridInvariants, cloneCellData } from "../../src/state/state-iface.js";

/**
 * Generate grids whose lines have no trailing whitespace, since
 * disabling and enabling guides trims trailing whitespace.
 */
const arbCellGridWithoutTrailingSpaces = arbCellGrid.map(g => {
    const trimmed = grid.clone(g, cloneCellData);
    for(const cell of grid.allCells(trimmed)) {
        const theCell = grid.lookupCell(trimmed, cell);
        theCell.data.lines = theCell.data.lines.map(line => line.trimEnd());
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
        st.grid.rows[0].cells[0].data.disabledGuides = new Set([2]);

        const disabled = disableCellGuides(st);
        expect([...disabled.grid.rows[0].cells[0].data.disabledGuides].toSorted()).to.deep.equal([2, 5]);

        const reenabled = enableCellGuides(disabled);
        expect(reenabled.grid.rows[0].cells.map(cell => cell.width)).to.deep.equal([2, 3, 2]);
    });

    it("Enables guides in several cells on the same row", () => {
        const src =
              "\n" +
              "++--+------+\n" +
              "++--+------+"

        const g = serialize.parseCommonState(src);
        g.rows[0].cells[1].data.disabledGuides = new Set([1]);
        g.rows[0].cells[2].data.disabledGuides = new Set([1]);

        enableCellGuidesInGrid(g);

        const cells = g.rows[0].cells;
        expect(cells.map(cell => cell.width)).to.deep.equal([1, 1, 2, 1, 6]);
        expect(cells.every(cell => cell.data.disabledGuides.size === 0)).to.be.true;
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
