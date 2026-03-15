import * as grid from "../grid.js";
import * as point from "../point.js";
import { SnapshotInverse } from "./state-utils.js";
import { Cell, Inverse, State } from "./state-iface.js";

export class SliceRowPrims implements State<SliceRowPrims> {
    grid: grid.Grid<Cell>;

    constructor(g: grid.Grid<Cell>) {
        this.grid = g;
    }

    clone(): SliceRowPrims {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        return new SliceRowPrims(g);
    }

    static sliceRow(g: grid.Grid<Cell>): SliceRowPrims {
        return new SliceRowPrims(g);
    }

    splitRow(globalPt: point.P2): Inverse<SliceRowPrims> {
        const snapshot = this.clone();

        const cell = grid.cellUnderPoint(this.grid, globalPt);
        if(!cell) return new SnapshotInverse(snapshot, "split row vertically");

        const rowRect = grid.rectOfRow(this.grid, cell);
        const localRow = globalPt.y - rowRect.top;
        grid.splitRow(this.grid, cell, localRow, (cellData: Cell) => [
            { lines: cellData.lines.slice(0, localRow) },
            { lines: cellData.lines.slice(localRow) },
        ]);

        return new SnapshotInverse(snapshot, "split row vertically");
    }
}
