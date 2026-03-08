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
   * The type of the state.
   */
  type: string;

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
 * The inverse operation, or `null` if the operation has no inverse,
 */
export type Inverse<S> = (st: S) => Promise<void>;

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
