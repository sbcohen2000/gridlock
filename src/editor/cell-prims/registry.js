import * as prims from "./cell-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The cell primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.selectLeafUnderPoint,
        args: ["point", "boolean"],
        const: false,
        description: "Select the leaf under a global point"
    },
];
