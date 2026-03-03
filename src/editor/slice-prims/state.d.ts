/**
 * The editor state for cell slicing primitive operations.
 */

import { CommonState } from "../common-state";
export { CommonState } from "../common-state";

export interface SlicePrimsState extends CommonState {
  type: "SlicePrimsState";
  direction: "Vertical" | "Horizontal";
}
