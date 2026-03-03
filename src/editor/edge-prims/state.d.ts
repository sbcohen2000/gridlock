/**
 * The editor state for edge modification operations.
 */

import * as grid from "../../grid.js";
import { CommonState } from "../common-state";
export { CommonState, Cell } from "../common-state";

export type CanonicalEdgeLocation = "Right" | "Below";
export type EdgeLocation = CanonicalEdgeLocation | "Left" | "Above";

export interface EdgePrimsState extends CommonState {
  type: "EdgePrimsState";
  selection: {
    edge: CanonicalEdgeLocation,
    leaf: grid.Leaf<Cell>,
  }
}
