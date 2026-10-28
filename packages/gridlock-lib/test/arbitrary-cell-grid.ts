import * as grid from "../src/grid.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";
import { Cell, DisabledGuide } from "../src/state/state-iface.js";

const printableChar = fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')
);

const arbFillChar = fc.constantFrom(".", "-", "=", "*", "#");

/**
 * Generate a random list of disabled guides, in increasing order,
 * that lie strictly within a cell of the given width.
 */
function arbDisabledGuides(width: number): fc.Arbitrary<DisabledGuide[]> {
    if(width < 2) return fc.constant([]);
    return fc.uniqueArray(fc.integer({ min: 1, max: width - 1 }), { maxLength: width - 1 })
        .chain(offsets => fc.tuple(...offsets
            .toSorted((a, b) => a - b)
            .map(localOffset => fc.record({
                localOffset: fc.constant(localOffset),
                fillChar: arbFillChar,
            }, { requiredKeys: ["localOffset"] }))
        ));
}

/**
 * Generate a random Cell that fits the given dimensions, followed by
 * up to `maxHiddenLines` non-empty lines which are hidden below the
 * bottom of the cell.
 */
function arbCell(width: number, height: number, maxHiddenLines: number): fc.Arbitrary<Cell> {
    const lineArb = fc.array(printableChar, { minLength: 0, maxLength: width })
        .map(cs => cs.join(''));
    const hiddenLineArb = fc.array(printableChar, { minLength: 1, maxLength: width })
        .map(cs => cs.join(''));
    return fc.record({
        lines: fc.tuple(
            fc.array(lineArb, { minLength: height, maxLength: height }),
            fc.array(hiddenLineArb, { maxLength: maxHiddenLines }),
        ).map(([visible, hidden]) => [...visible, ...hidden]),
        disabledGuides: arbDisabledGuides(width),
        fillChar: arbFillChar,
    }, { requiredKeys: ["lines", "disabledGuides"] });
}

/**
 * Take a Grid<void> and produce an arbitrary Grid<Cell>, where each
 * cell is populated with a randomly generated Cell whose lines fit
 * the cell's dimensions.
 */
function populateCells(voidGrid: grid.Grid<void>, maxHiddenLines: number): fc.Arbitrary<grid.Grid<Cell>> {
    const rowArbs = voidGrid.rows.map(row => {
        const cellArbs = row.cells.map(cell =>
            arbCell(cell.width, row.height, maxHiddenLines).map(data =>
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
    arbg.arbGrid.chain(g => populateCells(g, 0));

/**
 * Generate an arbitrary grid, populated with `Cell`s, some of which
 * have lines hidden below the bottom of their row.
 *
 * @type {fc.Arbitrary<grid.Grid<Cell>>}
 */
export const arbCellGridWithHiddenLines: fc.Arbitrary<grid.Grid<Cell>> =
    arbg.arbGrid.chain(g => populateCells(g, 2));
