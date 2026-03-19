import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { SliceCellPrims } from "./slice-cell.js";
import { AnyState } from "./state-iface.js";
import { TextPrims } from "./text-prims.js";
import { projectTextOntoCells } from "./project-text-onto-cells.js";
import { ensureAllCellWidthsOnRow } from "./find-optimal-partition.js";

/**
 * Do the real work if disabling the cell guides, returning a boolean
 * which signals if the input state is still valid.
 *
 * @see disableCellGuides
 */
function _disableCellGuides(st: AnyState, rows: grid.RowPath[]): boolean {
    return st.mutateGrid(g => {
        projectTextOntoCells(g => {
            for(const row of rows) {
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
}

/**
 * Disable the cell guides in the document, storing their
 * locations in the first cell on the line (which, after this
 * method is called), will be the only cell on the line.
 *
 * If `rows` is passed, then cell guides will be disabled only for the
 * given rows. Otherwise, the guides on all rows will be disabled.
 */
export function disableCellGuides(st: AnyState, rows?: grid.RowPath[]): AnyState {
    // Ensure that each of the rows is expanded, since we can't hide
    // cell content with disabled guides.
    rows = rows ?? [...grid.allRows(st.grid)];
    rows.forEach(row => ensureAllCellWidthsOnRow(st.grid, row));

    if(st instanceof TextPrims) {
        // This special case exists so that when we disable cell
        // guides when in text-editing mode, we can avoid moving the
        // global point if the cell underneath it goes away. We do
        // this by inserting spaces.
        //
        // Note that this operation does change the document content
        // in a meaningful way because we will only insert trailing
        // spaces, and these trailing spaces will ultimately be
        // trimmed when the user enables the cell guides again.

        const oldGlobalPt = st.findGlobalPoint();

        const stateIsValid = _disableCellGuides(st, rows);
        // This is safe because `mutateGrid` on `TextPrims` is always
        // able to recover a valid state.
        util.assert(stateIsValid);

        const newGlobalPt = st.findGlobalPoint();
        if(oldGlobalPt.y === newGlobalPt.y) {
            // If the new and old global points are on the same row,
            // then insert enough spaces to get our pointer to the
            // same location it was at before.

            st.insertString(util.whitespace(oldGlobalPt.x - newGlobalPt.x));
        }
        return st;
    } else {
        const stateIsValid = _disableCellGuides(st, rows);
        if(!stateIsValid) {
            // If the surrounding editor state was invalidated by the grid
            // modification, construct a new generic state.
            return TextPrims.editText(st);
        }
        return st;
    }
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
