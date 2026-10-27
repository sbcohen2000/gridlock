import * as grid from "../grid.js";
import * as point from "../point.js";
import { Cell, cloneCellData, splitRowData, State } from "./state-iface.js";
import { SnapshotInverse, Inverse, IdInverse } from "./inverse.js";

export class SliceRowPrims implements State<SliceRowPrims> {
    grid: grid.Grid<Cell>;

    constructor(g: grid.Grid<Cell>) {
        this.grid = g;
    }

    clone(): SliceRowPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new SliceRowPrims(g);
    }

    static sliceRow(st: { grid: grid.Grid<Cell> }): SliceRowPrims {
        return new SliceRowPrims(st.grid);
    }

    splitRow(globalPt: point.P2): Inverse<SliceRowPrims> {
        const snapshot = this.clone();

        const cell = grid.cellUnderPoint(this.grid, globalPt);
        if(!cell) return new IdInverse();

        const rowRect = grid.rectOfRow(this.grid, cell);
        const localRow = globalPt.y - rowRect.top;
        if(localRow <= 0) return new IdInverse();

        grid.splitRow(this.grid, cell, localRow, splitRowData(localRow));

        return new SnapshotInverse(snapshot, "split row vertically");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): true {
        f(this.grid);
        return true;
    }
}
