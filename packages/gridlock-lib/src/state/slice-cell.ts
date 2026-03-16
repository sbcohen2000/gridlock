import * as grid from "../grid.js";
import * as point from "../point.js";
import { Inverse, SnapshotInverse } from "./inverse.js";
import { Cell, State } from "./state-iface.js";

export class SliceCellPrims implements State<SliceCellPrims> {
    grid: grid.Grid<Cell>;

    constructor(g: grid.Grid<Cell>) {
        this.grid = g;
    }

    clone(): SliceCellPrims {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new SliceCellPrims(g);
    }

    static sliceCell(st: { grid: grid.Grid<Cell> }): SliceCellPrims {
        return new SliceCellPrims(st.grid);
    }

    splitCellHorizontallyAtGlobalCol(globalPt: point.P2): Inverse<SliceCellPrims> {
        const snapshot = this.clone();

        const cell = grid.cellUnderPoint(this.grid, globalPt);
        if(!cell) return new SnapshotInverse(snapshot, "split cell horizontally");

        const cellRect = grid.rectOfCell(this.grid, cell);
        const localCol = globalPt.x - cellRect.left;
        grid.splitCell(this.grid, cell, localCol, (cellData: Cell) => [
            { lines: cellData.lines.map(line => line.slice(0, localCol)) },
            { lines: cellData.lines.map(line => line.slice(localCol)) },
        ]);

        return new SnapshotInverse(snapshot, "split cell horizontally");
    }
}
