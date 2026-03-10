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
        const: true,
        description: "Check if an edge can be selected under a global point"
    },
    {
        function: prims.selectEdgeUnderPoint,
        args: ["point", "string"],
        const: false,
        description: "Select an edge of the leaf under a global point"
    },
    {
        function: prims.moveVerticalEdge,
        args: ["number"],
        const: false,
        description: "Shift the selected vertical edge by n columns"
    },
    {
        function: prims.moveHorizontalEdge,
        args: ["number"],
        const: false,
        description: "Shift the selected horizontal edge by n rows"
    },
    {
        function: prims.slideVerticalEdge,
        args: ["number"],
        const: false,
        description: "Slide the selected vertical edge by n columns"
    },
    {
        function: prims.slideHorizontalEdge,
        args: ["number"],
        const: false,
        description: "Slide the selected horizontal edge by n rows"
    },
];
