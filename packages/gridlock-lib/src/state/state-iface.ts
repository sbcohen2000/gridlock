import { maximum, padRightToLength } from "../util.js";
import * as grid from "../grid.js";

export interface Cell {
    lines: string[];
    /**
     * The location of any disabled guides within this cell.
     */
    disabledGuides: Set<number>;
}

export function cloneCellData(data: Cell): Cell {
    return {
        lines: [...data.lines],
        disabledGuides: new Set(data.disabledGuides)
    };
}

export function maximumLineLength(data: Cell): number {
    return maximum(data.lines.map(line => line.length).values());
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
 * Get lines of text from a row by horizontally concatenating its cells,
 * padded to the row's height.
 */
export function rowLines(row: grid.Row<Cell>): string[] {
    const lines = horizontallyCatCellLines(row.cells);
    while(lines.length < row.height) lines.push("");
    return lines;
}
