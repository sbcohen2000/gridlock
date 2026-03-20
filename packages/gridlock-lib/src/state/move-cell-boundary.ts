import * as grid from "../grid.js";
import { Cell, cloneCellData, State } from "./state-iface.js";
import { Inverse, SnapshotInverse } from "./inverse.js";
import { findOptimalPartition, applyPartition } from "./find-optimal-partition.js";

export class MoveCellBoundaryPrims implements State<MoveCellBoundaryPrims> {
    grid: grid.Grid<Cell>;
    rowNo: number;
    colNo: number;

    constructor(g: grid.Grid<Cell>, rowNo: number, colNo: number) {
        this.grid = g;
        this.rowNo = rowNo;
        this.colNo = colNo;
    }

    clone(): MoveCellBoundaryPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new MoveCellBoundaryPrims(g, this.rowNo, this.colNo);
    }

    static moveCellBoundary(st: { grid: grid.Grid<Cell> }, rowNo: number, colNo: number): MoveCellBoundaryPrims {
        return new MoveCellBoundaryPrims(st.grid, rowNo, colNo);
    }

    moveVerticalEdge(n: number): Inverse<MoveCellBoundaryPrims> {
        const snapshot = this.clone();

        const part = findOptimalPartition(this.grid, { rowNo: this.rowNo, colNo: this.colNo }, n);
        applyPartition(this.grid, part);

        return new SnapshotInverse(snapshot, `Move cell boundary by ${n}`);
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
