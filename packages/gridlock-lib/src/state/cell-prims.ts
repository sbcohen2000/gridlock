import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { Cell, cloneCellData, splitCellData, State, horizontallyCatCellLines, rowLines } from "./state-iface.js";
import { SnapshotInverse, Inverse, IdInverse } from "./inverse.js";
import { applyPartition, findOptimalPartition } from "./find-optimal-partition.js";

/**
 * The initial width of newly created cells.
 */
const INITIAL_CELL_WIDTH = 3;

export class CellPrims implements State<CellPrims> {
    grid: grid.Grid<Cell>;
    selection: grid.CellPath[];

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
     * Are we seelcting more than one cell?
     */
    get pluralCells(): boolean {
        return this.selection.length !== 1;
    }

    /**
     * Are we selecting more than one row?
     */
    get pluralRows(): boolean {
        if(this.selection.length === 0) return true;
        return this.selection.some(cell => cell.rowNo !== this.selection[0].rowNo);
    }

    /**
     * Check if the selection includes the given cell path.
     */
    hasCell(cell: grid.CellPath): boolean {
        return this.selection.some(s => grid.eqCellPath(s, cell));
    }

    /**
     * Remove the given cell path from the selection.
     */
    removeCell(cell: grid.CellPath) {
        this.selection = this.selection.filter(s => s.colNo !== cell.colNo || s.rowNo !== cell.rowNo);
    }

    /**
     * Clear the current selection.
     */
    clearSelection() {
        this.selection = [];
    }

    /**
     * Add a cell to the selection.
     */
    addCell(cell: grid.CellPath) {
        if(!this.hasCell(cell)) {
            this.selection.push({ ...cell });
        }
    }

    selectCellsUnderRect(r: rect.Rect, invert?: boolean): Inverse<CellPrims> {
        const cells = grid.cellsUnderRect(this.grid, r);

        if(cells.length === 0) {
            return new IdInverse();
        }

        // Find the intersection of the current selection and the
        // cells under the rectangle.
        const intersection = cells.filter(cell => this.hasCell(cell));

        if(invert && intersection.length === 0) {
            // We're removing from the selection, but the cells under
            // the rectangle aren't any of the selected ones.
            return new IdInverse();
        }

        if(!invert && intersection.length === cells.length
            && intersection.length === this.selection.length) {
            // We're replacing the selection, but the cells under the
            // rectangle are the same as those already selected.
            return new IdInverse();
        }

        const snapshot = this.clone();

        if(invert) {
            cells.forEach(cell => this.removeCell(cell));
        } else {
            this.clearSelection();
            cells.forEach(cell => this.addCell(cell));
        }

        return new SnapshotInverse(snapshot, "select cell");
    }

    selectCellUnderPoint(pt: point.P2, clear?: boolean): Inverse<CellPrims> {
        const cell = grid.cellUnderPoint(this.grid, pt);

        if(!cell) {
            return new IdInverse();
        }

        const snapshot = this.clone();

        if(clear) {
            this.clearSelection();
        }

        if(this.hasCell(cell)) {
            this.removeCell(cell);
        } else {
            this.addCell(cell);
        }

        return new SnapshotInverse(snapshot, "select cell");
    }

    canMergeSelectedCells(): boolean {
        return grid.canMergeCells(this.grid, [...this.selection.values()]);
    }

    /**
     * If the current selection covers a single row, then return a
     * path to the selected row. Otherwise, return `undefined`.
     */
    selectionCoversRow(): grid.RowPath | undefined {
        const byRow = grid.collectCellsByRow(this.selection);
        if(byRow.size === 1) {
            const [rowNo, cells]: [number, grid.CellPath[]] = byRow.entries().next().value;

            // Ensure that the cells cover the entire row.
            if(!grid.cellsCoverRow(this.grid, cells)) {
                return undefined;
            }

            return { rowNo };
        }
        return undefined;
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

    /**
     * Delete the rows of the selected cells.
     */
    deleteRows(): Inverse<CellPrims> {
        if(this.selection.length === 0) return new IdInverse();

        // Collect unique row numbers to delete, sorted descending so
        // that splicing doesn't shift indices of rows yet to be removed.
        const rowNos = [...new Set(this.selection.map(cell => cell.rowNo))]
            .toSorted((a, b) => b - a);

        if(rowNos.length >= this.grid.rows.length) {
            // When all of the rows in the grid are selected, only
            // keep the last row.
            rowNos.shift();
        }

        const snapshot = this.clone();

        for(const rowNo of rowNos) {
            grid.deleteRow(this.grid, { rowNo });
        }

        this.selection = [];
        return new SnapshotInverse(snapshot, "delete rows");
    }

    /**
     * Clear the contents of the selected cells.
     */
    clearCellContents(): Inverse<CellPrims> {
        if(this.selection.length === 0) return new IdInverse();
        const snapshot = this.clone();

        for(const cell of this.selection) {
            const theCell = grid.lookupCell(this.grid, cell);
            const theRow  = grid.lookupRow(this.grid, cell);
            theCell.data.lines = Array.from({ length: theRow.height }, () => "");
        }

        return new SnapshotInverse(snapshot, "clear cell content");
    }

    /**
     * We can insert a row below the currently selected cells if the
     * entire selection is on a single row.
     */
    canInsertRow(): boolean {
        return !this.pluralRows;
    }

    /**
     * Create a new empty row with the same cell layout as the
     * selected row.
     */
    private emptyRowLike(rowNo: number): grid.Row<Cell> {
        const row = grid.lookupRow(this.grid, { rowNo });
        return {
            type: "Row",
            height: 1,
            cells: row.cells.map(cell => ({
                type: "Cell" as const,
                width: cell.width,
                data: { lines: [""], disabledGuides: new Set<number>() },
            })),
        };
    }

    /**
     * Insert a row below the selected cell.
     */
    insertRowBelow(): Inverse<CellPrims> {
        if(!this.canInsertRow()) {
            return new IdInverse();
        }

        const snapshot = this.clone();
        const rowNo = this.selection[0].rowNo;
        this.grid.rows.splice(rowNo + 1, 0, this.emptyRowLike(rowNo));

        return new SnapshotInverse(snapshot, "insert row below");
    }

    /**
     * Insert a row above the selected cell.
     */
    insertRowAbove(): Inverse<CellPrims> {
        if(!this.canInsertRow()) {
            return new IdInverse();
        }

        const snapshot = this.clone();
        const rowNo = this.selection[0].rowNo;
        this.grid.rows.splice(rowNo, 0, this.emptyRowLike(rowNo));

        // Adjust the selection to point at the original row, which
        // is now one row lower.
        for(const cell of this.selection) {
            cell.rowNo += 1;
        }

        return new SnapshotInverse(snapshot, "insert row above");
    }

    /**
     * Relocate row `src` so that is appears at row index `dst`. Note
     * that `dst` ranges on `[0, n]` where `n` is the number of rows
     * currently in the grid.
     */
    relocateRow(dst: number): Inverse<CellPrims> {
        const srcRow = this.selectionCoversRow();
        if(!srcRow) return new IdInverse();

        const src = srcRow.rowNo;
        if(dst === src || dst === src + 1) return new IdInverse();

        const snapshot = this.clone();

        // Remove the row from its current position.
        const [row] = this.grid.rows.splice(src, 1);

        // If dst is after src, the removal shifted indices down by one.
        const insertAt = dst > src ? dst - 1 : dst;
        this.grid.rows.splice(insertAt, 0, row);

        // Update the selection to follow the relocated row.
        for(const cell of this.selection) {
            cell.rowNo = insertAt;
        }

        return new SnapshotInverse(snapshot, "relocate row");
    }

    /**
     * We can insert a cell to the right of the selected cells if the
     * selected cells are all on different rows.
     */
    canInsertCell(): boolean {
        if(this.selection.length === 0) return false;
        const rows = new Set(this.selection.map(cell => cell.rowNo));
        return rows.size === this.selection.length;
    }

    /**
     * Insert a cell to the left of `target`.
     *
     * @param target The cell to insert to the left of.
     * @param n The initial width of the cell.
     */
    private insertOneCellLeft(target: grid.CellPath) {
        // 1. Insert an `INITIAL_CELL_WIDTH`-space prefix before each
        //     line of the `target` cell.
        const theCell = grid.lookupCell(this.grid, target);
        const prefix = util.whitespace(INITIAL_CELL_WIDTH);
        theCell.data.lines = theCell.data.lines.map(line => prefix + line);

        // 2. Shift the disabled guides, if any, by
        //     `INITIAL_CELL_WIDTH` spaces.
        theCell.data.disabledGuides = new Set(
            theCell.data.disabledGuides.values().map(x => x + INITIAL_CELL_WIDTH)
        );

        // 3. Split the `target` cell at local column
        //     `INITIAL_CELL_WIDTH`.
        grid.splitCell(this.grid, target, INITIAL_CELL_WIDTH, splitCellData(INITIAL_CELL_WIDTH));
    }

    /**
     * Insert a new cell to the left of the selected cells.
     */
    insertCellLeft(): Inverse<CellPrims> {
        if(!this.canInsertCell()) {
            return new IdInverse();
        }

        const part = findOptimalPartition(this.grid, this.selection, INITIAL_CELL_WIDTH);
        // TODO: We should probably expand the boundary of the grid
        // rather than let this case happen.
        if(part.length === 0) return new IdInverse();

        const snapshot = this.clone();

        applyPartition(this.grid, part);
        this.selection.forEach(cell => this.insertOneCellLeft(cell));
        return new SnapshotInverse(snapshot, "insert cells to the left");
    }

    private insertOneCellRight(target: grid.CellPath) {
        // 1. Expand the width of `target` by INITIAL_CELL_WIDTH
        //    (already done by the caller via applyPartition)

        // 2. Split the `target` cell at local column
        //     `target.width - INITIAL_CELL_WIDTH`.
        const theCell = grid.lookupCell(this.grid, target);
        const splitCol = theCell.width - INITIAL_CELL_WIDTH;
        grid.splitCell(this.grid, target, splitCol, splitCellData(splitCol));
    }

    /**
     * Insert a new cell to the right of the selected cells.
     */
    insertCellRight(): Inverse<CellPrims> {
        if(!this.canInsertCell()) {
            return new IdInverse();
        }

        const part = findOptimalPartition(this.grid, this.selection, INITIAL_CELL_WIDTH);
        // TODO: We should probably expand the boundary of the grid
        // rather than let this case happen.
        if(part.length === 0) return new IdInverse();

        const snapshot = this.clone();

        applyPartition(this.grid, part);
        this.selection.forEach(cell => this.insertOneCellRight(cell));
        return new SnapshotInverse(snapshot, "insert cells to the right");
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
            this.selectCellUnderPoint(loc);
        }

        return true;
    }
}
