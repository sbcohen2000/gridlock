export * from "./editor/state.js";

import { PRIMITIVES as TEXT_PRIMITIVES } from "./editor/text-prims/registry.js";
import { PRIMITIVES as CELL_PRIMITIVES } from "./editor/cell-prims/registry.js";

export const PRIMITIVES = [...TEXT_PRIMITIVES, ...CELL_PRIMITIVES];

export * as textPrims from "./editor/text-prims/text-prims.js";
export * as cellPrims from "./editor/cell-prims/cell-prims.js";
