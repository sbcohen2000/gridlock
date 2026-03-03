export * from "./editor/state.js";

import { PRIMITIVES as TEXT_PRIMITIVES } from "./editor/text-prims/registry.js";
import { PRIMITIVES as CELL_PRIMITIVES } from "./editor/cell-prims/registry.js";
import { PRIMITIVES as EDGE_PRIMITIVES } from "./editor/edge-prims/registry.js";
import { PRIMITIVES as SLICE_PRIMITIVES } from "./editor/slice-prims/registry.js";

export const PRIMITIVES = [...TEXT_PRIMITIVES, ...CELL_PRIMITIVES, ...EDGE_PRIMITIVES, ...SLICE_PRIMITIVES];

export * as textPrims from "./editor/text-prims/text-prims.js";
export * as cellPrims from "./editor/cell-prims/cell-prims.js";
export * as edgePrims from "./editor/edge-prims/edge-prims.js";
export * as slicePrims from "./editor/slice-prims/slice-prims.js";
