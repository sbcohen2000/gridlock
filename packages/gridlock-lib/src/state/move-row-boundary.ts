import * as grid from "../grid.js";
import { Cell, cloneCellData, State, ensureCellLinesMatchRowHeight } from "./state-iface.js";
import { Inverse, TimedSnapshotInverse } from "./inverse.js";

export class MoveRowBoundaryPrims implements State<MoveRowBoundaryPrims> {
    grid: grid.Grid<Cell>;
    rowNo: number;

    constructor(g: grid.Grid<Cell>, rowNo: number) {
        this.grid = g;
        this.rowNo = rowNo;
    }

    clone(): MoveRowBoundaryPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new MoveRowBoundaryPrims(g, this.rowNo);
    }

    static moveRowBoundary(st: { grid: grid.Grid<Cell> }, rowNo: number): MoveRowBoundaryPrims {
        return new MoveRowBoundaryPrims(st.grid, rowNo);
    }

    moveHorizontalEdge(n: number): Inverse<MoveRowBoundaryPrims> {
        const snapshot = this.clone();

        const rowPath = { rowNo: this.rowNo };
        grid.modifyHeightOfRow(this.grid, rowPath, n);

        const row = grid.lookupRow(this.grid, rowPath);
        for(let colNo = 0; colNo < row.cells.length; ++colNo) {
            ensureCellLinesMatchRowHeight(this.grid, { rowNo: this.rowNo, colNo });
        }

        return new TimedSnapshotInverse(snapshot, 2000, "Move row boundary");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
