import * as prims from "./slice-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The slice primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.splitCellVerticallyAtGlobalRow,
        args: ["point"],
        async: true,
        const: false,
        description: "Split a cell vertically at a global row"
    },
    {
        function: prims.splitCellHorizontallyAtGlobalCol,
        args: ["point"],
        async: true,
        const: false,
        description: "Split a cell horizontally at a global column"
    },
];
