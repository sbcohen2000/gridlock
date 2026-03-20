import * as grid from "../grid.js";
import * as util from "../util.js";
import { Cell, cloneCellData, rowContentExceedsRowHeight, State } from "./state-iface.js";
import { Inverse, SnapshotInverse } from "./inverse.js";

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

        n = util.clamp(-(topRow.height - 1), n, bottomRow.height - 1);

        // For each column, stack the top and bottom cell lines,
        // then re-split at the new row boundary.
        for (let colNo = 0; colNo < topRow.cells.length; ++colNo) {
            const topCell = topRow.cells[colNo].data;
            const bottomCell = bottomRow.cells[colNo].data;
            const combined = [
                ...topCell.lines,
                ...Array.from({ length: topRow.height - topCell.lines.length }, () => ""),
                ...bottomCell.lines,
            ];
            topCell.lines = combined.slice(0, topRow.height + n);
            bottomCell.lines = combined.slice(topRow.height + n);
        }

        topRow.height += n;
        bottomRow.height -= n;

        return new SnapshotInverse(snapshot);
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
