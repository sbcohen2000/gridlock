import type { Grid } from "../grid.js";
import type * as point from "../point.js";

export interface Cell {
    lines: string[];
}

/**
 * The inverse operation.
 */
export interface Inverse<S> {
    /**
     * A description of the forward operation to which this is an
     * inverse operation.
     */
    fwdDescription?: string;

    /**
     * A function which tries to compose this inverse with another
     * inverse. It is applied to an inverse that occured _before_ this
     * inverse. It returns a new `Inverse` if the inverses could be
     * composed, or `null` if they couldn't.
     */
    compose?(i: Inverse<any>): Inverse<S> | null;

    /**
     * A function which, when applied to the state, will mutate it
     * undoing the forward operation.
     */
    apply(st: State<any>): S;
}

export interface State<P> {
    readonly grid: Grid<Cell>;
    clone(): P;
};
