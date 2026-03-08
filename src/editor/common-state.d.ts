/**
 * The state common to all primitive sub-states.
 */

import { Grid } from "../grid";

interface Cell {
  /**
   * The lines of text in the cell.
   */
  lines: string[];
}

export interface CommonState {
  /**
   * The current grid.
   */
  grid: Grid<Cell>;

  /**
   * How to clone ones self.
   */
  clone(): This;
}

/**
 * Parameter and return types for primitive functions.
 */
export type Type = "string" | "number" | "point" | "glpk" | "boolean";

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
  apply(st: S): Promise<S>;
}

interface PrimitiveSignatureBase {
  /** The function */
  function: any,
  /** The type of the function's arguments. */
  args: Type[],
  /** Is the function async? */
  async: boolean,
  /** A short description of the primitive. */
  description: string
}

export type PrimitiveSignature = ({
  /**
   * A constant function must not mutate the editor state, and it
   * must return a value, the type of which is given in `retty`.
   */
  const: true;
  /** Return type. */
  retty: Type;
} | {
  /** A non-constant function must return an inverse operation. */
  const: false;
}) & PrimitiveSignatureBase;
