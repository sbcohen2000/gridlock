/**
 * When widening/shrinking cells, we need to find a set of cells whose
 * width must be modified so that the length of every row is the
 * same. This module finds those cells by adjusting only the rightmost
 * cell on each row.
 */

import * as grid from "../grid.js";
import { Cell } from "./state-iface.js";

type Partition = { cell: grid.CellPath, amount: number }[];

/**
 * Find the rightmost cell on a row.
 */
function rightmostCell(g: grid.Grid<Cell>, rowNo: number): grid.CellPath {
    const row = grid.lookupRow(g, { rowNo });
    return { rowNo, colNo: row.cells.length - 1 };
}

/**
 * Find a partition of cells in `g` which should all be widened/shrunk
 * in response to the widening/shrinking of `cells`.  Each cell in
 * `cells` must be on a different row. If that's not the case, an
 * exception is thrown.
 *
 * Only the rightmost cell on each row of the grid is adjusted.
 */
export function findOptimalPartition(
    g: grid.Grid<Cell>,
    cells: grid.CellPath[],
    n: number
): Partition {
    // Validate that all cells are on different rows.
    const rowSet = new Set(cells.map(c => c.rowNo));
    if(rowSet.size !== cells.length) {
        throw new Error("All cells must be on different rows");
    }

    // For each cell, find the rightmost cell on its row, and record
    // if the cell _is_ the rightmost on its row.
    const cellInfo = cells.map(cell => {
        const theCell = grid.lookupCell(g, cell);
        const right = rightmostCell(g, cell.rowNo);
        const theRight = grid.lookupCell(g, right);
        const isRightmost = right.colNo === cell.colNo;
        return { cell, theCell, right, theRight, isRightmost };
    });

    const anyRightmost = cellInfo.some(c => c.isRightmost);

    // Clamp n so that no input cell's width goes below 1.
    for(const { theCell } of cellInfo) {
        n = Math.max(n, -(theCell.width - 1));
    }

    if(anyRightmost) {
        // If any cell is rightmost, all rows which don't contain any
        // of `cells` width must change by `n`.

        for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
            if(rowSet.has(rowNo)) continue;
            const right = rightmostCell(g, rowNo);
            const theRight = grid.lookupCell(g, right);

            // Give up if the rightmost cell can't absorb the change.
            if(n < 0 && theRight.width - 1 < -n) return [];
        }
    } else {
        // No cell in `cells` is rightmost, so adjust the rightmost cell
        // of each of the rows of the cells in `cells`.

        for(const { theRight } of cellInfo) {
            n = Math.min(n, theRight.width - 1);
        }
    }

    // Finally, build the partition.
    const partition: Partition = [];

    if(anyRightmost) {
        // Each of the cells in `cells` grows by `n`.
        for(const { cell } of cellInfo) {
            partition.push({ cell, amount: n });
        }

        // The rightmost cell on each row not in `cells` grows by an
        // equal amount.
        for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
            if(rowSet.has(rowNo)) continue;
            const right = rightmostCell(g, rowNo);
            partition.push({ cell: right, amount: n });
        }
    } else {
        // Each input cell grows by n, compensated by shrinking the
        // rightmost cell on that row.
        for(const { cell, right } of cellInfo) {
            partition.push({ cell, amount: n });
            partition.push({ cell: right, amount: -n });
        }
    }

    return partition;
}

/**
 * Mutate the grid by applying a partition.
 */
export function applyPartition(g: grid.Grid<Cell>, partition: Partition) {
    for(const { cell, amount } of partition) {
        grid.lookupCell(g, cell).width += amount;
    }
}
