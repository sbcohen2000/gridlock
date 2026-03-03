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
}

/**
 * Parameter and return types for primitive functions.
 */
export type Type = "string" | "number" | "point" | "glpk" | "boolean";

export interface PrimitiveSignature {
  /** The function */
  function: any,
  /** The type of the function's arguments. */
  args: Type[],
  /** The type of the function's result. */
  retty: Type,
  /** Is the function async? */
  async: boolean,
  /** Does the function ever mutate the editor state? */
  const: boolean,
  /** A short description of the primitive. */
  description: string
};
