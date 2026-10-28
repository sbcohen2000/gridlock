import * as grid from "../grid.js";
import * as point from "../point.js";
import * as util from "../util.js";
import { Cell, AnyState, cellContentExceedsCellWidth, horizontallyCatCellLines, splitCellData } from "./state-iface.js";
import { TextPrims } from "./text-prims.js";

/**
 * Do the real work if disabling the cell guides, returning a boolean
 * which signals if the input state is still valid.
 *
 * @see disableCellGuides
 */
function _disableCellGuides(st: AnyState, rows: grid.RowPath[]): boolean {
    return st.mutateGrid(g => {

        for(const row of rows) {
            const theRow = grid.lookupRow(g, row);

            const cells: grid.Cell<Cell>[] = [];
            const currentGroup: { cell: grid.Cell<Cell>, leftEdge: number }[] = [];

            /**
             * The complexity of this function comes from the fact
             * that we cannot blindly disable all of the vertical
             * guides in a row, since we need to handle the case where
             * a cell's text is occluded.
             *
             * Therefore, each row of cells still becomes a row of one
             * *or more* cells. We call each span of cells in which
             * guides can actually be disabled a *group*.
             */
            const commitGroup = () => {
                util.assert(currentGroup.length > 0);

                const groupWidth     = currentGroup.reduce((sum, { cell }) => cell.width + sum, 0);
                const firstCell      = currentGroup[0].cell;
                const firstLeftEdge  = currentGroup[0].leftEdge;

                // Keep the guides that were already disabled in each
                // cell, along with the boundaries between the cells.
                const guidePositions = new Set<number>();
                for(const { cell, leftEdge } of currentGroup) {
                    const offset = leftEdge - firstLeftEdge;
                    if(offset > 0) guidePositions.add(offset);
                    for(const guide of cell.data.disabledGuides) {
                        guidePositions.add(guide + offset);
                    }
                }

                // Place the text of each cell into `firstCell`.
                // Compute lines before mutating the width, since
                // horizontallyCatCellLines pads by cell.width.
                firstCell.data.lines = horizontallyCatCellLines(currentGroup.values().map(elt => elt.cell));
                firstCell.data.disabledGuides = guidePositions;
                firstCell.width = groupWidth;

                cells.push(firstCell);
                currentGroup.length = 0;
            }

            let leftEdge = 0;
            for(const cell of theRow.cells) {
                const incomplete = cellContentExceedsCellWidth(cell);
                if(incomplete) {
                    // If the cell is incomplete, then we can't
                    // disable its guides.
                    if(currentGroup.length > 0) {
                        commitGroup();
                    }
                    cells.push(cell);
                } else {
                    currentGroup.push({ cell, leftEdge });
                }

                leftEdge += cell.width;
            }

            if(currentGroup.length > 0) {
                commitGroup();
            }

            theRow.cells = cells;
        }

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
 * Re-enable the disabled cell guides in `g`, modifying it in place.
 *
 * @see enableCellGuides
 */
export function enableCellGuidesInGrid(g: grid.Grid<Cell>) {
    // Collect the global position of every guide before splitting,
    // since each split shifts the column numbers of the cells to its
    // right.
    const splitPts: point.P2[] = [];
    for(const [cell, rect] of grid.allPositionedCells(g)) {
        const theCell = grid.lookupCell(g, cell);
        for(const x of theCell.data.disabledGuides) {
            splitPts.push(point.mkP2(x + rect.left, rect.top));
        }
        theCell.data.disabledGuides = new Set();
    }

    splitPts.forEach(pt => grid.splitCellUnderPoint(g, pt, splitCellData));
}

/**
 * Re-enable cell guides after they have been disabled.
 */
export function enableCellGuides(st: AnyState): AnyState {
    const stateIsValid = st.mutateGrid(g => {
        enableCellGuidesInGrid(g);
        return g;
    });

    if(!stateIsValid) {
        // If the surrounding editor state was invalidated by the grid
        // modification, construct a new generic state.
        return TextPrims.editText(st);
    }
    return st;
}
