import type { Grid } from "../grid.js";

export interface Cell {
    lines: string[];
}

export interface State<P> {
    readonly grid: Grid<Cell>;
    clone(): P;
};

export type AnyState = State<any>;
