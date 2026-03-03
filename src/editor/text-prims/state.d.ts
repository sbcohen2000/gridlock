/**
 * The editor state for text-edit level primitive operations.
 */

import { CommonState } from "../common-state";
export { Cell, CommonState } from "../common-state";
import * as point from "../../point.js";
import * as grid from "../../grid.js";

export interface TextPrimsState extends CommonState {
  type: "TextPrimsState";
  selection: {
    /**
     * The position of the point within the leaf (relative to the
     * selected leaf).
     */
    pt:   point.P2,
    /**
     * The currently selected leaf.
     */
    leaf: grid.Leaf<Cell>,
    /**
     * The last column that the user navigated to. It is stored so
     * that as the user moves up and down lines, we can and maintain
     * this column position.
     */
    lastGlobalCol: number
  }
}
