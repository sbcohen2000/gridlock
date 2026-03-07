/**
 * The editor state for text-edit level primitive operations.
 */

export { Cell, CommonState } from "../common-state";
import * as commonState from "../common-state";
import * as grid from "../../grid.js";
import * as point from "../../point.js";

export interface TextPrimsState extends commonState.CommonState {
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




