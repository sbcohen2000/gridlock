import { CommonState, Inverse } from "../editor/common-state"

export type HistoryItem = {
  inverse: Inverse<CommonState>
}
