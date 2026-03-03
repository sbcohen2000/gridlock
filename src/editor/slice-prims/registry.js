import * as prims from "./slice-prims.js";

/**
 * @typedef {import("../text-prims/registry.js").Type} Type
 * @typedef {import("../text-prims/registry.js").PrimitiveSignature} PrimitiveSignature
 */

/**
 * The slice primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.splitVerticallyAtGlobalPosition,
        args: ["point"],
        retty: "grid",
        async: false,
        const: true,
        description: "Split grid vertically at a global position"
    },
    {
        function: prims.splitHorizontallyAtGlobalPosition,
        args: ["point"],
        retty: "grid",
        async: false,
        const: true,
        description: "Split grid horizontally at a global position"
    },
];
