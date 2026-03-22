import * as grid from "../grid.js";
import { Cell, cloneCellData, State } from "./state-iface.js";
import { Inverse, TimedSnapshotInverse } from "./inverse.js";

function trimEmptyLines(n: number, lines: string[]): void {
    if(lines.length <= n) return;
    const maxTrim = lines.length - n;
    for(let i = 0; i < maxTrim; ++i) {
        if(lines.at(-1) === "") {
            lines.pop();
        } else {
            break;
        }
    }
}

function syncCellLinesToSize(g: grid.Grid<Cell>, cellPath: grid.CellPath): void {
    const cell = grid.lookupCell(g, cellPath);
    const row = grid.lookupRow(g, cellPath);
    if(cell.data.lines.length < row.height) {
        cell.data.lines.push(...Array.from(
            { length: row.height - cell.data.lines.length },
            () => "",
        ));
    } else if(row.height < cell.data.lines.length) {
        trimEmptyLines(row.height, cell.data.lines);
    }
}

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
            syncCellLinesToSize(this.grid, { rowNo: this.rowNo, colNo });
        }

        return new TimedSnapshotInverse(snapshot, 2000, "Move row boundary");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): false {
        f(this.grid);
        return false;
    }
}
