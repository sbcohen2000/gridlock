import * as prims from "./cell-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The cell primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.selectLeafUnderPoint,
        args: ["point", "boolean"],
        const: false,
        description: "Select the leaf under a global point"
    },
    {
        function: prims.canMergeSelectedCells,
        args: [],
        const: true,
        retty: "boolean",
        description: "Check if the selected cells can be merged into a single cell"
    },
    {
        function: prims.mergeSelectedCells,
        args: [],
        const: false,
        description: "Merge the selected cells"
    }
];
