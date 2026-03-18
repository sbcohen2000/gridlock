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
    clone(): P;
};

export type AnyState = State<any>;
