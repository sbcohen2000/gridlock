import * as grid from "../grid.js";
import * as util from "../util.js";
import { Cell, cloneCellData, rowContentExceedsRowHeight, State } from "./state-iface.js";
import { Inverse, TimedSnapshotInverse } from "./inverse.js";

export class SlideRowBoundaryPrims implements State<SlideRowBoundaryPrims> {
    grid: grid.Grid<Cell>;
    rowNo: number;

    constructor(g: grid.Grid<Cell>, rowNo: number) {
        this.grid = g;
        this.rowNo = rowNo;
    }

    clone(): SlideRowBoundaryPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new SlideRowBoundaryPrims(g, this.rowNo);
    }

    static slideRowBoundary(st: { grid: grid.Grid<Cell> }, rowNo: number): SlideRowBoundaryPrims {
        return new SlideRowBoundaryPrims(st.grid, rowNo);
    }

    slideHorizontalEdge(n: number): Inverse<SlideRowBoundaryPrims> {
        const snapshot = this.clone();

        const topRow = grid.lookupRow(this.grid, { rowNo: this.rowNo });
        const bottomRow = grid.lookupRow(this.grid, { rowNo: this.rowNo + 1 });
        util.assert(!rowContentExceedsRowHeight(topRow));

        // Clamp `n` to lie between the top line of `topRow`, and the
        // bottom (visible) line of `bottomRow`.
        n = util.clamp(-(topRow.height - 1), n, bottomRow.height - 1);

        // Build full-width text lines for each row, then redistribute
        // across the new boundary. The bottom row may have cells with
        // more lines than the row height, so we use the maximum line
        // count rather than the row height.
        const bottomMaxLines = bottomRow.cells.reduce(
            (max, cell) => Math.max(max, cell.data.lines.length), bottomRow.height);
        const totalHeight = topRow.height + bottomMaxLines;
        const fullLines: string[] = [];

        // Render each line as a full-width string from its source row.
        for (let i = 0; i < totalHeight; ++i) {
            let line = "";
            if (i < topRow.height) {
                for (const cell of topRow.cells) {
                    line += (cell.data.lines[i] ?? "").padEnd(cell.width);
                }
            } else {
                const j = i - topRow.height;
                for (const cell of bottomRow.cells) {
                    line += (cell.data.lines[j] ?? "").padEnd(cell.width);
                }
            }
            fullLines.push(line);
        }

        const newTopHeight = topRow.height + n;

        // Re-split lines into cells according to the original
        // structure of the top and bottom row's cells.
        for (const cell of topRow.cells) cell.data.lines = [];
        for (const cell of bottomRow.cells) cell.data.lines = [];

        for (let i = 0; i < newTopHeight; ++i) {
            let offset = 0;
            for (const cell of topRow.cells) {
                cell.data.lines.push(fullLines[i].slice(offset, offset + cell.width).trimEnd());
                offset += cell.width;
            }
        }

        for (let i = newTopHeight; i < totalHeight; ++i) {
            let offset = 0;
            for (const cell of bottomRow.cells) {
                cell.data.lines.push(fullLines[i].slice(offset, offset + cell.width).trimEnd());
                offset += cell.width;
            }
        }

        topRow.height += n;
        bottomRow.height -= n;

        return new TimedSnapshotInverse(snapshot, 2000, "Slide row boundary");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
