import * as grid from "../grid.js";
import * as util from "../util.js";
import {  projectTextOntoLeaves } from "./state-utils.js";
import { Cell, cloneCellData, State } from "./state-iface.js";
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

        const leftCell = grid.lookupCell(this.grid, { rowNo: this.rowNo, colNo: this.colNo });
        const rightCell = grid.lookupCell(this.grid, { rowNo: this.rowNo, colNo: this.colNo + 1 });

        n = util.clamp(-(leftCell.width - 1), n, rightCell.width - 1);

        projectTextOntoLeaves((g) => {
            leftCell.width += n;
            rightCell.width -= n;
            return g;
        }, this.grid);

        return new SnapshotInverse(snapshot);
    }
}
