import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import type { Cell } from "./state-iface.js";
import { AnyState } from "./state-iface.js";
import { SliceCellPrims } from "./slice-cell.js";
import { projectTextOntoLeaves } from "./state-utils.js";

/**
 * Disable the cell guides in the document, storing their
 * locations in the first cell on the line (which, after this
 * method is called), will be the only cell on the line.
 */
export function disableCellGuides(st: AnyState) {
    projectTextOntoLeaves((g: grid.Grid<Cell>) => {
        for(const row of grid.allRows(g)) {
            const guidePositions = [...grid.allPositionedCellsOnRow(g, row)
                .drop(1)
                .map(([_, rect]) => rect.left)];

            const theRow = grid.lookupRow(g, row);
            const rowWidth = rect.width(grid.rectOfRow(g, row));
            const firstCell = theRow.cells[0];
            firstCell.data.disabledGuides = new Set(guidePositions);
            firstCell.width = rowWidth;
            theRow.cells = [firstCell];
        }

        return g;
    }, st.grid);
}

/**
 * Re-enable cell guides after they have been disabled.
 */
export function enableCellGuides(st: AnyState) {
    const cells = [...grid.allPositionedCells(st.grid)];
    const sliceSt = SliceCellPrims.sliceCell(st);

    for(const [cell, rect] of cells) {
        const theCell = grid.lookupCell(st.grid, cell);
        const guideXs = [...theCell.data.disabledGuides.values().map(x => x + rect.left)];
        theCell.data.disabledGuides = new Set();

        guideXs.forEach(x => {
            sliceSt.splitCell(point.mkP2(x, rect.top));
        });
    }
}
