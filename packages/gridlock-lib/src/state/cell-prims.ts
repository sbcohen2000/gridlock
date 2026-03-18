import * as grid from "../grid.js";
import * as rect from "../rect.js";
import * as point from "../point.js";
import { projectTextOntoLeaves } from "./state-utils.js";
import { SnapshotInverse, Inverse } from "./inverse.js";
import { Cell, cloneCellData, State } from "./state-iface.js";

export class CellPrims implements State<CellPrims> {
    grid: grid.Grid<Cell>;
    selection: Set<grid.CellPath>;

    constructor(g: grid.Grid<Cell>, selection: Set<grid.CellPath>) {
        this.grid = g;
        this.selection = selection;
    }

    clone(): CellPrims {
        const g = grid.clone(this.grid, cloneCellData);
        const selection = new Set(this.selection.values().map(cell => ({ ...cell })));
        return new CellPrims(g, selection);
    }

    /*************************************************************************/
    /** Static Factory                                                      **/

    static editCells(st: { grid: grid.Grid<Cell> }): CellPrims {
        return new CellPrims(st.grid, new Set());
    }

    /*************************************************************************/
    /** EditCells Primitive Methods                                         **/

    selectCellUnderPoint(pt: point.P2, clear: boolean): Inverse<CellPrims> {
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

            // Merge all of the disabled guides from the merged cells
            // into a single set.
            const disabledGuides = new Set<number>();
            this.selection.values().forEach(cell => {
                const theCell = grid.lookupCell(g, cell);
                theCell.data.disabledGuides.forEach(guide => {
                    disabledGuides.add(guide);
                });
            });

            newSelectedCell = grid.mergeCells(g, [...this.selection.values()], { lines: [], disabledGuides });
            return g;
        }, this.grid);

        this.grid = newGrid;
        this.selection = new Set([newSelectedCell]);

        return new SnapshotInverse(snapshot, "merge cells");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): true {
        // Find the location of all of the selected cells.
        const cellLocs = [...this.selection.values().map(cell => {
            const r = grid.rectOfCell(this.grid, cell);
            return rect.upperLeft(r);
        })];

        f(this.grid);

        this.selection.clear();
        for(const loc of cellLocs) {
            this.selectCellUnderPoint(loc, false);
        }

        return true;
    }
}
