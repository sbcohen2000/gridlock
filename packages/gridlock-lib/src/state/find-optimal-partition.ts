/**
 * When widening/shrinking cells, we need to find a set of cells whose
 * width must be modified so that the length of every row is the
 * same. This module finds those cells by adjusting only the rightmost
 * cell on each row.
 */

import * as grid from "../grid.js";
import * as util from "../util.js";
import { Cell, maximumLineLength } from "./state-iface.js";

type Partition = { cell: grid.CellPath, amount: number }[];

/**
 * Find the rightmost cell on a row.
 */
function rightmostCell(g: grid.Grid<Cell>, rowNo: number): grid.CellPath {
    const row = grid.lookupRow(g, { rowNo });
    return { rowNo, colNo: row.cells.length - 1 };
}

/**
 * Find a partition of cells in `g` which should all be
 * widened/shrunk in response to the widening/shrinking of `cell`.
 * Only the rightmost cell on each row is adjusted.
 */
export function findOptimalPartition(
    g: grid.Grid<Cell>,
    cell: grid.CellPath,
    n: number
): Partition {
    const theCell = grid.lookupCell(g, cell);
    const right = rightmostCell(g, cell.rowNo);
    const theRight = grid.lookupCell(g, right);

    n = util.clamp(-(theCell.width - 1), n, theRight.width - 1);

    // If the cell is not the rightmost on its row, move the boundary:
    // shrink the cell and grow the rightmost cell.
    if(right.colNo !== cell.colNo) {
        return [
            { cell, amount: n },
            { cell: right, amount: -n },
        ];
    }

    // Otherwise, we have to adjust the width of all of the last cells
    // on their respective rows.
    const partition: Partition = [{ cell, amount: n }];
    for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        if(rowNo === cell.rowNo) continue;
        const right = rightmostCell(g, rowNo);
        const theRight = grid.lookupCell(g, right);
        // Give up if the rightmost cell can't absorb the change.
        if(n < 0 && theRight.width - 1 < -n) return [];
        partition.push({ cell: right, amount: n });
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
