import * as prims from "./edge-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The edge primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.moveVerticalEdge,
        args: ["number"],
        const: false,
        description: "Move a vertical edge by n columns"
    },
    {
        function: prims.moveHorizontalEdge,
        args: ["number"],
        const: false,
        description: "Move a horizontal edge by n rows"
    },
    {
        function: prims.slideVerticalEdge,
        args: ["number"],
        const: false,
        description: "Slide a vertical edge by n columns"
    },
    {
        function: prims.slideHorizontalEdge,
        args: ["number"],
        const: false,
        description: "Slide a horizontal edge by n rows"
    }
];
