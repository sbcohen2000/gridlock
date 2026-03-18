import type { Grid } from "../grid.js";

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

export interface State<P> {
    readonly grid: Grid<Cell>;

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
    mutateGrid(f: (grid: Grid<Cell>) => Grid<Cell>): boolean;
};

export type AnyState = State<any>;
