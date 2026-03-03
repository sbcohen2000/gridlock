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
    {
        function: prims.selectLeafUnderPoint,
        args: ["point", "boolean"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Select the leaf under a global point"
    },
    {
        function: prims.selectEdgeUnderPoint,
        args: ["point", "string"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Select an edge of the leaf under a global point"
    },
    {
        function: prims.modifyVerticalEdge,
        args: ["number", "glpk", "solveSettings"],
        retty: "boolean",
        async: true,
        const: false,
        description: "Shift the selected vertical edge by n columns"
    },
    {
        function: prims.modifyHorizontalEdge,
        args: ["number"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Shift the selected horizontal edge by n rows"
    },
];
