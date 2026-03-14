import * as fc from "fast-check";
import * as grid from "../src/grid.js";

/**
 * Generate an array of cell widths that sum to `totalWidth`.
 * Each width is >= 1.
 */
function arbCellWidths(totalWidth: number): fc.Arbitrary<number[]> {
    const maxCells = Math.min(totalWidth, 10);
    return fc.integer({ min: 1, max: maxCells }).chain(n => {
        if (n === 1) {
            return fc.constant([totalWidth]);
        }
        return fc.uniqueArray(
            fc.integer({ min: 1, max: totalWidth - 1 }),
            { minLength: n - 1, maxLength: n - 1 }
        ).map(cuts => {
            cuts.sort((a, b) => a - b);
            const widths = [];
            let prev = 0;
            for (const c of cuts) {
                widths.push(c - prev);
                prev = c;
            }
            widths.push(totalWidth - prev);
            return widths;
        });
    });
}

/**
 * Generate a single Row with cells whose widths sum to `totalWidth`.
 */
function arbRow(totalWidth: number): fc.Arbitrary<grid.Row<void>> {
    return fc.integer({ min: 1, max: 10 }).chain(height =>
        arbCellWidths(totalWidth).map(widths => ({
            type: "Row",
            height,
            cells: widths.map(w => ({ type: "Cell", width: w }))
        }))
    );
}

/** @type {fc.Arbitrary<grid.Grid<void>>} */
export const arbGrid: fc.Arbitrary<grid.Grid<void>> =
    fc.integer({ min: 1, max: 80 }).chain(totalWidth =>
        fc.array(arbRow(totalWidth), { minLength: 1 }).map(rows => ({ type: "Grid", rows }))
    );

