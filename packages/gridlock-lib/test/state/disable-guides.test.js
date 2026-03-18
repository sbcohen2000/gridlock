import * as fc from "fast-check";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { serialize } from "../../src/state/index.js";
import { TextPrims } from "../../src/state/text-prims.js";
import { disableCellGuides, enableCellGuides } from "../../src/state/disable-guides.js";

describe("disable-guides", () => {
    it("disableCellGuides and enableCellGuides are inverses", () => {
        fc.assert(
            fc.property(
                arbCellGrid,
                (g) => {
                    const st = TextPrims.editText({ grid: g });
                    const before = serialize.printCommonState(st);

                    const disabled = disableCellGuides(st);
                    const reenabled = enableCellGuides(disabled);

                    const after = serialize.printCommonState(reenabled);
                    expect(after).to.equal(before);
                }
            ),
            { numRuns: 1000 }
        );
    });
});
