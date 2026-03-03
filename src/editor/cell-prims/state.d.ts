/**
 * The editor state for cell-level primitive operations.
 */

import * as grid from "../../grid";
import { CommonState, Cell } from "../common-state";
export { CommonState } from "../common-state";

export interface CellPrimsState extends CommonState {
  type: "CellPrimsState";
  selection: {
    leaves: Set<grid.Leaf<Cell>>
  }
}
