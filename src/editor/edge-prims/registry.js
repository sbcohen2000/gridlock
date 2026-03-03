import * as prims from "./edge-prims.js";

/**
 * @typedef {import("../text-prims/registry.js").Type} Type
 * @typedef {import("../text-prims/registry.js").PrimitiveSignature} PrimitiveSignature
 */

/**
 * The edge primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
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
        args: ["number", "glpk"],
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
