import * as prims from "./edge-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The edge primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.selectEdgeOfNode,
        args: ["node"],
        const: false,
        description: "Select the edge of a node"
    },
    {
        function: prims.moveEdge,
        args: ["number"],
        const: false,
        description: "Shift the selected edge by n columns"
    },
    {
        function: prims.slideEdge,
        args: ["number"],
        const: false,
        description: "Slide the selected edge by n columns"
    }
];
