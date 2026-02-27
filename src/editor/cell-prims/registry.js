import * as prims from "./cell-prims.js";

/**
 * @typedef {import("../text-prims/registry.js").Type} Type
 * @typedef {import("../text-prims/registry.js").PrimitiveSignature} PrimitiveSignature
 */

/**
 * The cell-grid primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.splitCellVerticallyAtPoint,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split cell vertically at current row"
    },
    {
        function: prims.splitCellHorizontallyAtPoint,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split cell horizontally at current column"
    },
];
