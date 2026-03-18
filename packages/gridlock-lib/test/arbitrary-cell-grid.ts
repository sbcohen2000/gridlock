import * as grid from "../src/grid.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";
import { Cell } from "../src/state/state-iface.js";

const printableChar = fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')
);

/**
 * Generate a random Cell that fits the given dimensions.
 */
function arbCell(width: number, height: number): fc.Arbitrary<Cell> {
    const lineArb = fc.array(printableChar, { minLength: 0, maxLength: width })
        .map(cs => cs.join(''));
    return fc.array(lineArb, { minLength: height, maxLength: height })
        .map(lines => ({ lines, disabledGuides: new Set<number>() }));
}

/**
 * Take a Grid<void> and produce an arbitrary Grid<Cell>, where each
 * cell is populated with a randomly generated Cell whose lines fit
 * the cell's dimensions.
 */
function populateCells(voidGrid: grid.Grid<void>): fc.Arbitrary<grid.Grid<Cell>> {
    const rowArbs = voidGrid.rows.map(row => {
        const cellArbs = row.cells.map(cell =>
            arbCell(cell.width, row.height).map(data =>
                ({ ...cell, data }) as grid.Cell<Cell>
            )
        );
        return fc.tuple(...cellArbs).map(cells =>
            ({ ...row, cells }) as grid.Row<Cell>
        );
    });
    return fc.tuple(...rowArbs).map(rows => ({ type: "Grid" as const, rows }));
}

/**
 * Generate an arbitrary grid, populated with `Cell`s.
 *
 * @type {fc.Arbitrary<grid.Grid<Cell>>}
 */
export const arbCellGrid: fc.Arbitrary<grid.Grid<Cell>> =
    arbg.arbGrid.chain(g => populateCells(g));
