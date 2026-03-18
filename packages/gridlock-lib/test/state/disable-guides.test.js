import * as fc from "fast-check";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { serialize } from "../../src/state/index.js";
import { disableCellGuides, enableCellGuides } from "../../src/state/disable-guides.js";

describe("disable-guides", () => {
    it("disableCellGuides and enableCellGuides are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const st = { grid: g };
                    const before = serialize.printCommonState(st);

                    disableCellGuides(st);
                    enableCellGuides(st);

                    const after = serialize.printCommonState(st);
                    expect(after).to.equal(before);
                }
            ),
            { numRuns: 1000 }
        );
    });
});
