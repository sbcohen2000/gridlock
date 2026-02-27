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
        function: prims.splitCellVerticallyAtRow,
        args: ["number"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split selected cell vertically at given row"
    },
    {
        function: prims.splitCellHorizontallyAtColumn,
        args: ["number"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split selected cell horizontally at given column"
    },
];
