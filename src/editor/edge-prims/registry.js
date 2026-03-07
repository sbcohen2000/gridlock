import * as prims from "./edge-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The edge primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.canSelectEdgeUnderPoint,
        args: ["point", "string"],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if an edge can be selected under a global point"
    },
    {
        function: prims.selectEdgeUnderPoint,
        args: ["point", "string"],
        async: true,
        const: false,
        description: "Select an edge of the leaf under a global point"
    },
    {
        function: prims.modifyVerticalEdge,
        args: ["number", "glpk"],
        async: true,
        const: false,
        description: "Shift the selected vertical edge by n columns"
    },
    {
        function: prims.modifyHorizontalEdge,
        args: ["number"],
        async: true,
        const: false,
        description: "Shift the selected horizontal edge by n rows"
    },
];
