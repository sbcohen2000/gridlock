import * as prims from "./cell-prims.js";

/**
 * @typedef {import("../text-prims/registry.js").Type} Type
 * @typedef {import("../text-prims/registry.js").PrimitiveSignature} PrimitiveSignature
 */

/**
 * The cell primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.selectLeafUnderPoint,
        args: ["point", "boolean"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Select the leaf under a global point"
    },
];
