export {
    putPointOnGlobalPosition,
    putPointAtStartOfGlobalLine,
    putPointAtStartOfLine,
    putPointAtEndOfGlobalLine,
    putPointAtEndOfLine,
    putPointOnNextGlobalLine,
    putPointOnNextLine,
    putPointOnPrevGlobalLine,
    putPointOnPrevLine,
    putPointOnNextGlobalCol,
    putPointOnNextCol,
    putPointOnPrevGlobalCol,
    putPointOnPrevCol,
    pointAtEndOfGlobalLine,
    pointAtBeginningOfGlobalLine,
    pointOnFirstGlobalLine,
    pointOnLastGlobalLine,
    globalLineIsEmpty,
    removeGlobalLine,
    removeString,
    insertGlobalNewline,
    insertString,
} from "./editor/text-prims/text-prims.js";

export * from "./editor/state.js";

import { PRIMITIVES as TEXT_PRIMITIVES } from "./editor/text-prims/registry.js";
import { PRIMITIVES as CELL_PRIMITIVES } from "./editor/cell-prims/registry.js";

export const PRIMITIVES = [...TEXT_PRIMITIVES, ...CELL_PRIMITIVES];
