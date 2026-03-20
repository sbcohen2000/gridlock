import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { Cell, cloneCellData, State, horizontallyCatCellLines, rowLines } from "./state-iface.js";
import { SnapshotInverse, Inverse } from "./inverse.js";

export class CellPrims implements State<CellPrims> {
    grid: grid.Grid<Cell>;
    selection: grid.CellPath[];e

    constructor(g: grid.Grid<Cell>, selection: grid.CellPath[]) {
        this.grid = g;
        this.selection = selection;
    }

    clone(): CellPrims {
        const g = grid.clone(this.grid, cloneCellData);
        const selection = this.selection.map(cell => ({ ...cell }));
        return new CellPrims(g, selection);
    }

    /*************************************************************************/
    /** Static Factory                                                      **/

    static editCells(st: { grid: grid.Grid<Cell> }): CellPrims {
        return new CellPrims(st.grid, []);
    }

    /*************************************************************************/
    /** EditCells Primitive Methods                                         **/

    /**
     * Check if the selection includes the given cell path.
     */
    hasCell(cell: grid.CellPath): boolean {
        return this.selection.some(s => s.colNo === cell.colNo && s.rowNo === cell.rowNo);
    }

    /**
     * Remove the given cell path from the selection.
     */
    removeCell(cell: grid.CellPath) {
        this.selection = this.selection.filter(s => s.colNo !== cell.colNo || s.rowNo !== cell.rowNo);
    }

    /**
     * Add a cell to the selection.
     */
    addCell(cell: grid.CellPath) {
        if(!this.hasCell(cell)) {
            this.selection.push({ ...cell });
        }
    }

    selectCellUnderPoint(pt: point.P2, clear: boolean): Inverse<CellPrims> {
        const snapshot = this.clone();

        const cell = grid.cellUnderPoint(this.grid, pt);
        if(!cell) {
            return new SnapshotInverse(snapshot);
        }

        if(clear) {
            this.selection = [{ ...cell }];
        } else if(this.hasCell(cell)) {
            this.removeCell(cell);
        } else {
            this.addCell(cell);
        }

        return new SnapshotInverse(snapshot);
    }

    canMergeSelectedCells(): boolean {
        return grid.canMergeCells(this.grid, [...this.selection.values()]);
    }

    mergeSelectedCells(): Inverse<CellPrims> {
        const snapshot = this.clone();

        const g = this.grid;

        // Group cells by row to determine single-row vs multi-row merge.
        const byRow = new Map<number, grid.CellPath[]>();
        for(const cell of this.selection) {
            const inRow = byRow.get(cell.rowNo);
            if(inRow) inRow.push(cell);
            else byRow.set(cell.rowNo, [cell]);
        }

        // Compute the text for the merged cell.
        let lines: string[];
        if(byRow.size === 1) {
            // We've got a single row, so horizontally concatentate
            // the selected cells.
            const sortedCells = this.selection
                .toSorted((a, b) => a.colNo - b.colNo)
                .map(c => grid.lookupCell(g, c));
            lines = horizontallyCatCellLines(sortedCells);
        } else {
            // We've got multiple rows, so vertically concatentate
            // each row's text.
            const rowNos = [...byRow.keys()].toSorted((a, b) => a - b);
            lines = rowNos.flatMap(rowNo => rowLines(grid.lookupRow(g, { rowNo })));
        }

        // Merge disabled guides, adjusting offsets relative to the
        // merged cell's left edge.
        const mergedRect = rect.unions(...this.selection.map(cell => grid.rectOfCell(g, cell)));
        const disabledGuides = new Set<number>();
        for(const cell of this.selection) {
            const theCell = grid.lookupCell(g, cell);
            const cellRect = grid.rectOfCell(g, cell);
            const offset = cellRect.left - mergedRect.left;
            for(const guide of theCell.data.disabledGuides) {
                disabledGuides.add(guide + offset);
            }
        }

        const newSelectedCell = grid.mergeCells(g, this.selection, { lines, disabledGuides });
        this.selection = [newSelectedCell];

        return new SnapshotInverse(snapshot, "merge cells");
    }

    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): true {
        // Find the location of all of the selected cells.
        const cellLocs = [...this.selection.values().map(cell => {
            const r = grid.rectOfCell(this.grid, cell);
            return rect.upperLeft(r);
        })];

        f(this.grid);

        this.selection = [];
        for(const loc of cellLocs) {
            this.selectCellUnderPoint(loc, false);
        }

        return true;
    }
}
