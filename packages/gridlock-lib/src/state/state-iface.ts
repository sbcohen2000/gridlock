import { maximum, padRightToLength } from "../util.js";
import * as grid from "../grid.js";

export interface Cell {
    lines: string[];
    /**
     * The location of any disabled guides within this cell.
     */
    disabledGuides: Set<number>;
    /**
     * The cell's fill character. If it's not given, it defaults to
     * space.
     */
    fillChar?: string;
}

export function cloneCellData(data: Cell): Cell {
    return {
        lines: [...data.lines],
        disabledGuides: new Set(data.disabledGuides),
        fillChar: data.fillChar
    };
}

export function maximumLineLength(data: Cell): number {
    return maximum(data.lines.map(line => line.length).values());
}

export function maximumCellHeight(row: grid.Row<Cell>): number {
    return maximum(row.cells.map(cell => cell.data.lines.length).values());
}

/**
 * Split a cell's data at a local column, trimming trailing whitespace
 * and partitioning disabled guides.
 */
export function splitCellData(col: number): (cellData: Cell) => [Cell, Cell] {
    return (cellData: Cell) => [
        {
            lines: cellData.lines.map(line => line.slice(0, col).trimEnd()),
            disabledGuides: new Set(cellData.disabledGuides.values().filter(x => x < col))
        },
        {
            lines: cellData.lines.map(line => line.slice(col).trimEnd()),
            disabledGuides: new Set(cellData.disabledGuides.values().filter(x => x > col))
        },
    ];
}

/**
 * Split a cell's data at a local row, copying disabled guides to
 * both halves.
 */
export function splitRowData(row: number): (cellData: Cell) => [Cell, Cell] {
    return (cellData: Cell) => [
        { lines: cellData.lines.slice(0, row), disabledGuides: new Set(cellData.disabledGuides) },
        { lines: cellData.lines.slice(row), disabledGuides: new Set(cellData.disabledGuides) },
    ];
}

export function cellContentExceedsCellWidth(cell: grid.Cell<Cell>): boolean {
    return maximumLineLength(cell.data) > cell.width;
}

export function rowContentExceedsRowHeight(row: grid.Row<Cell>): boolean {
    return row.cells.some(cell => row.height < cell.data.lines.length);
}

export interface State<P> {
    readonly grid: grid.Grid<Cell>;

    /**
     * Clone the editor state.
     */
    clone(): P;

    /**
     * Repair the editing state after a modification to the grid which
     * could have destroyed the editing state's invariants (such as
     * the deletion of the selected cell).
     *
     * It is the caller's responisibility to ensure that `f` does not
     * destroy invariants on the `grid` datastructure.
     *
     * It is the implementor's responsibility to ensure that so long
     * as `grid` is well-formed, the editor state is well-formed after
     * `f` is called.
     *
     * The function may return `true` or `false`. If the edit state
     * invariants couldn't be restored, then return `false`. It is the
     * caller's responsibility, in this case, to come up with a new
     * editor since `f` will have invalidated this one beyond repair.
     */
    mutateGrid(f: (grid: grid.Grid<Cell>) => grid.Grid<Cell>): boolean;
};

export type AnyState = State<any>;

/**
 * Produce lines representing the horizontal concatenation of cell text.
 */
export function horizontallyCatCellLines(cells: Iterable<grid.Cell<Cell>>): string[] {
    const cellArray = [...cells];
    const height = maximum(cellArray.values().map(cell => cell.data.lines.length));

    let out: string[] = Array.from({ length: height }, () => "");
    for(const cell of cellArray) {
        for(let j = 0; j < cell.data.lines.length; ++j) {
            out[j] += padRightToLength(cell.data.lines[j], cell.width);
        }
    }

    return out.map(line => line.trimEnd());
}

/**
 * Get lines of text from a row by horizontally concatenating its
 * cells, padded to the row's height.
 */
export function rowLines(row: grid.Row<Cell>): string[] {
    const lines = horizontallyCatCellLines(row.cells);
    while(lines.length < row.height) lines.push("");
    return lines;
}

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

/**
 * Add or remove blank lines from the cell at `cellPath` so that the
 * height of its parent row does not exceed the number of lines in the
 * cell's text.
 */
export function ensureCellLinesMatchRowHeight(g: grid.Grid<Cell>, cellPath: grid.CellPath): void {
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

/**
 * Ensure that the disabled guides in a cell are within the cell's
 * bounds, removing those guides which are not within bounds.
 */
export function ensureCellDisabledGuidesInBounds(cell: grid.Cell<Cell>) {
    const width = cell.width;
    cell.data.disabledGuides = new Set(new Set(cell.data.disabledGuides.values().filter(x => x < width)));
}

/**
 * Check that inavariants of the grid hold.
 */
export function checkGridInvariants(st: { grid: grid.Grid<Cell> }): boolean {
    if(!grid.debugCheckGridDimsConsistency(st.grid)) {
        return false;
    }

    for(const cell of grid.allCells(st.grid)) {
        const theRow = grid.lookupRow(st.grid, cell);
        const theCell = grid.lookupCell(st.grid, cell);

        if(theRow.height <= 0) return false;
        if(theCell.width <= 0) return false;

        // Each cell must have enough lines to account for its height (it
        // can have more, but not fewer).
        if(theCell.data.lines.length <= 0 || theCell.data.lines.length < theRow.height) {
            return false;
        }

        // Each cell's disabled guides must be less than cell's width
        // and greater than zero.
        for(const guide of theCell.data.disabledGuides.values()) {
            if(0 <= guide || theCell.width <= guide) {
                return false;
            }
        }
    }

    return true;
}
