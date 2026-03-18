import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { AnyState } from "./state-iface.js";
import { SliceCellPrims } from "./slice-cell.js";
import { projectTextOntoLeaves } from "./state-utils.js";
import { TextPrims } from "./text-prims.js";

/**
 * Disable the cell guides in the document, storing their
 * locations in the first cell on the line (which, after this
 * method is called), will be the only cell on the line.
 */
export function disableCellGuides(st: AnyState): AnyState {
    const stateIsValid = st.mutateGrid(g => {
        projectTextOntoLeaves(g => {
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
        }, g);
        return g;
    });

    if(!stateIsValid) {
        // If the surrounding editor state was invalidated by the grid
        // modification, construct a new generic state.
        return TextPrims.editText(st);
    }
    return st;
}

/**
 * Re-enable cell guides after they have been disabled.
 */
export function enableCellGuides(st: AnyState): AnyState {
    const stateIsValid = st.mutateGrid(g => {

        const cells = [...grid.allPositionedCells(g)];
        const sliceSt = SliceCellPrims.sliceCell({ grid: g });

        for(const [cell, rect] of cells) {
            const theCell = grid.lookupCell(g, cell);
            const guideXs = [...theCell.data.disabledGuides.values().map(x => x + rect.left)];
            theCell.data.disabledGuides = new Set();

            guideXs.forEach(x => {
                sliceSt.splitCell(point.mkP2(x, rect.top));
            });
        }

        return g;
    });

    if(!stateIsValid) {
        // If the surrounding editor state was invalidated by the grid
        // modification, construct a new generic state.
        return TextPrims.editText(st);
    }
    return st;
}
