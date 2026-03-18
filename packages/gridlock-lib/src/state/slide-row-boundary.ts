import * as grid from "../grid.js";
import * as util from "../util.js";
import { Cell, cloneCellData, State } from "./state-iface.js";
import { Inverse, SnapshotInverse } from "./inverse.js";
import { projectTextOntoLeaves } from "./state-utils.js";

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

        n = util.clamp(-(topRow.height - 1), n, bottomRow.height - 1);

        projectTextOntoLeaves((g) => {
            topRow.height += n;
            bottomRow.height -= n;
            return g;
        }, this.grid);

        return new SnapshotInverse(snapshot);
    }
}
