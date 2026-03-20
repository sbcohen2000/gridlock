import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { Cell, cloneCellData, State, horizontallyCatCellLines, rowLines } from "./state-iface.js";
import { SnapshotInverse, Inverse } from "./inverse.js";

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

        const cells = [...this.selection.values()];
        const g = this.grid;

        // Group cells by row to determine single-row vs multi-row merge.
        const byRow = new Map<number, grid.CellPath[]>();
        for(const cell of cells) {
            const inRow = byRow.get(cell.rowNo);
            if(inRow) inRow.push(cell);
            else byRow.set(cell.rowNo, [cell]);
        }

        // Compute the text for the merged cell.
        let lines: string[];
        if(byRow.size === 1) {
            // We've got a single row, so horizontally concatentate
            // the selected cells.
            const sortedCells = cells
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
        const mergedRect = rect.unions(...cells.map(cell => grid.rectOfCell(g, cell)));
        const disabledGuides = new Set<number>();
        for(const cell of cells) {
            const theCell = grid.lookupCell(g, cell);
            const cellRect = grid.rectOfCell(g, cell);
            const offset = cellRect.left - mergedRect.left;
            for(const guide of theCell.data.disabledGuides) {
                disabledGuides.add(guide + offset);
            }
        }

        const newSelectedCell = grid.mergeCells(g, cells, { lines, disabledGuides });
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
