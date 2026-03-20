/**
 * When widening/shrinking cells, we need to find a set of cells whose
 * width must be modified so that the length of every row is the
 * same. The purpose of this module is to find the set of cells which
 * is most "optimal".
 */

import * as grid from "../grid.js";
import { minimum } from "../util.js";
import { Cell, maximumLineLength } from "./state-iface.js";

type Partition = { cell: grid.CellPath, amount: number }[];

/**
 * Find an optimal partition of the cells in `g` which should all be
 * widened/shrunk in response to the widening and shrinking of `cell`.
 */
export function findOptimalPartition(
    g: grid.Grid<Cell>,
    cell: grid.CellPath,
    n: number
): Partition {
    const theCell = grid.lookupCell(g, cell);
    n = Math.max(-(theCell.width - 1), n);

    // The rows of the grid are independent, so we can find an optimal
    // partition by considering each row separately, and combining the
    // results.

    // First, try to find a partition of `cell`'s row which would
    // allow us to expand/contract `cell` by just adding/removing
    // whitespace on the same row.

    const sameRowPart = findOptimalPartitionOfRow(g, cell, -n,
        [
            (candidatePath, candidate) => {
                // Don't allow the partition to contain any cell to
                // the left of `cell`.
                if(candidatePath.colNo <= cell.colNo) return undefined;
                // Only allow whitespace.
                return Math.min(
                    colsOfTrailingWhitespace(candidate),
                    candidate.width - 1
                );
            }
        ]
    );

    if(sameRowPart.length > 0) {
        // We found a partition.
        sameRowPart.push({
            cell,
            amount: n
        });
        return sameRowPart;
    }

    // Otherwise, we'll try to find a partition of the rows _other
    // than_ `cell`'s.
    const multiRowPart: Partition = [];

    for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        if(rowNo === cell.rowNo) {
            // Then, this is the row with `cell`. The partition must
            // always be just `cell`.
            multiRowPart.push({
                cell,
                amount: n
            });
        } else {
            multiRowPart.push(...findOptimalPartitionOfRow(g, { rowNo }, n,
                [
                    // Try to find a solution using only whitespace.
                    (_, cell) => colsOfTrailingWhitespace(cell),
                    // Then fall back to a solution using non-whitespace.
                    (_, cell) => cell.width - 1,
                ]
            ));
        }
    }

    return multiRowPart;
}

/**
 * Find the number of columns of trailing whitespace in a cell.
 */
function colsOfTrailingWhitespace(
    cell: grid.Cell<Cell>
): number {
    return minimum(cell.data.lines.map(line => Math.max(0, cell.width - line.trimEnd().length)).values());
}

function findOptimalPartitionOfRow(
    g: grid.Grid<Cell>,
    row: grid.RowPath,
    n: number,
    phases: ((cellPath: grid.CellPath, cell: grid.Cell<Cell>) => number | undefined)[]
): Partition {
    // We prefer taking space from cells to the right in the document.
    //
    // Our strategy is to rank the cells from right-to-left, then
    // iterate throught them in two phases. In the first phase, we
    // take whitespace from every cell. Only if we didn't adjust the
    // row to the desired width, we iterate again, taking space from
    // cells with text.

    const cmp = (a: grid.CellPath, b: grid.CellPath): number => {
        // Prefer cells to the right.
        return b.colNo - a.colNo;
    };

    const cells = [...grid.allCellsOnRow(g, row)].toSorted(cmp);
    const amounts = new Map<grid.CellPath, number>();

    // Each phase defines how much of each cell's width is available
    // to shrink. We iterate through phases in order.
    for(const phase of phases) {
        for(const cell of cells) {
            const theCell = grid.lookupCell(g, cell);
            const alreadyTaken = -(amounts.get(cell) ?? 0);
            const avail = phase(cell, theCell);
            if(avail === undefined) continue;
            const remain = avail - alreadyTaken;
            const dn = Math.max(-remain, n);
            if(dn === 0) continue;
            amounts.set(cell, (amounts.get(cell) ?? 0) + dn);
            n -= dn;
            if(n === 0) break;
        }
        if(n === 0) break;
    }

    // If we couldn't reduce the space, return an empty partition to
    // signal that there was no solution.
    if(n !== 0) return [];

    return [...amounts.entries()]
        .filter(([_, amount]) => amount !== 0)
        .map(([cell, amount]) => ({ cell, amount }));
}


/**
 * Mutate the grid by applying a partition.
 */
export function applyPartition(g: grid.Grid<Cell>, partition: Partition) {
    for(const { cell, amount } of partition) {
        grid.lookupCell(g, cell).width += amount;
    }
}

/**
 * Expand the width of the given cell in `g`, but only if the width of
 * its maximum line exceeds the width of the cell.
 */
export function ensureCellWidth(g: grid.Grid<Cell>, cell: grid.CellPath): void {
    const theCell = grid.lookupCell(g, cell);
    const n = maximumLineLength(theCell.data) - theCell.width;
    if(0 < n) {
        const part = findOptimalPartition(g, cell, n);
        applyPartition(g, part);
    }
}
