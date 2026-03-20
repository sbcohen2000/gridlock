import * as grid from "../grid.js";
import * as util from "../util.js";
import { Cell, cellContentExceedsCellWidth, cloneCellData, State } from "./state-iface.js";
import { Inverse, SnapshotInverse } from "./inverse.js";

export class SlideCellBoundaryPrims implements State<SlideCellBoundaryPrims> {
    grid: grid.Grid<Cell>;
    rowNo: number;
    colNo: number;

    constructor(g: grid.Grid<Cell>, rowNo: number, colNo: number) {
        this.grid = g;
        this.rowNo = rowNo;
        this.colNo = colNo;
    }

    clone(): SlideCellBoundaryPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new SlideCellBoundaryPrims(g, this.rowNo, this.colNo);
    }

    static slideCellBoundary(st: { grid: grid.Grid<Cell> }, rowNo: number, colNo: number): SlideCellBoundaryPrims {
        return new SlideCellBoundaryPrims(st.grid, rowNo, colNo);
    }

    slideVerticalEdge(n: number): Inverse<SlideCellBoundaryPrims> {
        const snapshot = this.clone();

        const leftCell  = grid.lookupCell(this.grid, { rowNo: this.rowNo, colNo: this.colNo });
        const rightCell = grid.lookupCell(this.grid, { rowNo: this.rowNo, colNo: this.colNo + 1 });
        util.assert(!cellContentExceedsCellWidth(leftCell));

        n = util.clamp(-(leftCell.width - 1), n, rightCell.width - 1);

        const rowHeight = grid.lookupRow(this.grid, { rowNo: this.rowNo }).height;

        // For each line, join the left and right cell text, then
        // re-split at the new boundary.
        for (let i = 0; i < rowHeight; ++i) {
            const leftLine  = leftCell.data.lines[i]  ?? "";
            const rightLine = rightCell.data.lines[i] ?? "";
            const combined  = leftLine.padEnd(leftCell.width) + rightLine;
            const newLeftWidth = leftCell.width + n;
            leftCell.data.lines[i]  = combined.slice(0, newLeftWidth).trimEnd();
            rightCell.data.lines[i] = combined.slice(newLeftWidth).trimEnd();
        }

        leftCell.width += n;
        rightCell.width -= n;

        return new SnapshotInverse(snapshot, `Slide cell boundary by ${n}`);
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
