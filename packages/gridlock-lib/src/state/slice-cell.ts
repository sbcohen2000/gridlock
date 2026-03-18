import * as grid from "../grid.js";
import * as point from "../point.js";
import { Inverse, IdInverse, SnapshotInverse } from "./inverse.js";
import { Cell, cloneCellData, State } from "./state-iface.js";

export class SliceCellPrims implements State<SliceCellPrims> {
    grid: grid.Grid<Cell>;

    constructor(g: grid.Grid<Cell>) {
        this.grid = g;
    }

    clone(): SliceCellPrims {
        const g = grid.clone(this.grid, cloneCellData);
        return new SliceCellPrims(g);
    }

    static sliceCell(st: { grid: grid.Grid<Cell> }): SliceCellPrims {
        return new SliceCellPrims(st.grid);
    }

    splitCell(globalPt: point.P2): Inverse<SliceCellPrims> {
        const cell = grid.cellUnderPoint(this.grid, globalPt);
        if(!cell) return new IdInverse();

        const snapshot = this.clone();

        const cellRect = grid.rectOfCell(this.grid, cell);
        const localCol = globalPt.x - cellRect.left;
        grid.splitCell(this.grid, cell, localCol, (cellData: Cell) => [
            {
                lines: cellData.lines.map(line => line.slice(0, localCol).trimEnd()),
                disabledGuides: new Set(cellData.disabledGuides.values().filter(x => x < localCol))
            },
            {
                lines: cellData.lines.map(line => line.slice(localCol).trimEnd()),
                disabledGuides: new Set(cellData.disabledGuides.values().filter(x => x > localCol))
            },
        ]);

        return new SnapshotInverse(snapshot, "split cell horizontally");
    }
}
