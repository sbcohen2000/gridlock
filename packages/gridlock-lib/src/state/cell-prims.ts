import * as grid from "../grid.js";
import * as point from "../point.js";
import { SnapshotInverse, projectTextOntoLeaves } from "./state-utils.js";
import { Cell, Inverse, State } from "./state-iface.js";

export class CellPrims implements State<CellPrims> {
    grid: grid.Grid<Cell>;
    selection: Set<grid.CellPath>;

    constructor(g: grid.Grid<Cell>, selection: Set<grid.CellPath>) {
        this.grid = g;
        this.selection = selection;
    }

    clone(): CellPrims {
        const g = grid.clone(this.grid, data => ({ lines: [...data.lines] }));
        const selection = new Set(this.selection.values().map(cell => ({ ...cell })));
        return new CellPrims(g, selection);
    }

    /*************************************************************************/
    /** Static Factory                                                      **/

    static editCells(g: grid.Grid<Cell>): CellPrims {
        return new CellPrims(g, new Set());
    }

    /*************************************************************************/
    /** EditCells Primitive Methods                                         **/

    selectLeafUnderPoint(pt: point.P2, clear: boolean): Inverse<CellPrims> {
        const snapshot = this.clone();

        const cell = grid.cellUnderPoint(this.grid, pt);
        if(!cell) {
            return new SnapshotInverse(snapshot);
        }

        if(clear) {
            this.selection = new Set([cell]);
        } else if(!this.selection.has(cell)) {
            this.selection.add(cell);
        }

        return new SnapshotInverse(snapshot);
    }

    canMergeSelectedCells(): boolean {
        return grid.canMergeCells(this.grid, [...this.selection.values()]);
    }

    mergeSelectedCells(): Inverse<CellPrims> {
        const snapshot = this.clone();

        let newSelectedCell!: grid.CellPath;
        const newGrid = projectTextOntoLeaves((g) => {
            newSelectedCell = grid.mergeCells(g, [...this.selection.values()], { lines: [] });
            return g;
        }, this.grid);

        this.grid = newGrid;
        this.selection = new Set([newSelectedCell]);

        return new SnapshotInverse(snapshot, "merge cells");
    }
}
