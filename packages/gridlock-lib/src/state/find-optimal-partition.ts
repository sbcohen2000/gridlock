/**
 * When widening/shrinking cells, we need to find a set of cells whose
 * width must be modified so that the length of every row is the
 * same. The purpose of this module is to find the set of cells which
 * is most "optimal".
 */

import * as grid from "../grid.js";
import { minimum } from "../util.js";
import { Cell } from "./state-iface.js";

type Partition = { cell: grid.CellPath, amount: number }[];

/**
 * Find an optimal partition of the cells in `g` which should all be
 * widened/shrunk in response to the widening and shrinking of `cell`.
 *
 * The partition is subject to the following constraints:
 *
 * 1. Each cell on the same row in the partition's `amount` must sum
 *    to `n`.
 * 2. `cell` must be included in the partition, and there can be no
 *    other cell on `cell`'s row.
 * 3. The cells in the partition must cover all of the rows.
 */
export function findOptimalPartition(
    g: grid.Grid<Cell>,
    cell: grid.CellPath,
    n: number
): Partition {
    // The rows of the grid are independent, so we can find an optimal
    // partition by considering each row separately, and combining the
    // results.

    const partition: Partition = [];
    const theCell = grid.lookupCell(g, cell);
    n = Math.max(-(theCell.width - 1), n);

    for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        if(rowNo === cell.rowNo) {
            // Then, this is the row with `cell`. The partition must
            // always be just `cell`.
            partition.push({
                cell,
                amount: n
            });
        } else {
            partition.push(...findOptimalPartitionOfRow(g, { rowNo }, n));
        }
    }

    return partition;
}

/**
 * Find the number of columns of trailing whitespace in a cell.
 */
function colsOfTrailingWhitespace(
    cell: grid.Cell<Cell>
): number {
    return minimum(cell.data.lines.map(line => cell.width - line.trimEnd().length).values());
}

function findOptimalPartitionOfRow(
    g: grid.Grid<Cell>,
    row: grid.RowPath,
    n: number
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
    // to shrink. We iterate through phases in order, preferring to
    // remove trailing whitespace before removing content.
    const phases: ((cell: grid.Cell<Cell>) => number)[] = [
        (cell) => colsOfTrailingWhitespace(cell),
        (cell) => cell.width - 1,
    ];

    for(const available of phases) {
        for(const cell of cells) {
            const theCell = grid.lookupCell(g, cell);
            const alreadyTaken = -(amounts.get(cell) ?? 0);
            const remaining = available(theCell) - alreadyTaken;
            const dn = Math.max(-remaining, n);
            if(dn === 0) continue;
            amounts.set(cell, (amounts.get(cell) ?? 0) + dn);
            n -= dn;
            if(n === 0) break;
        }
        if(n === 0) break;
    }

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
