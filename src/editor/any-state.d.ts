import { CellPrimsState  } from "./cell-prims/state";
import { EdgePrimsState  } from "./edge-prims/state";
import { SlicePrimsState } from "./slice-prims/state";
import { TextPrimsState  } from "./text-prims/state";

export type AnyState = CellPrimsState | EdgePrimsState | SlicePrimsState | TextPrimsState;
