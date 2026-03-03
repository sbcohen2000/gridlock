import * as prims from "./text-prims.js";

/** @import {PrimitiveSignature} from "../common-state.js" */

/**
 * The editor primitive operations.
 *
 * @type {PrimitiveSignature[]}
 */
export const PRIMITIVES = [
    {
        function: prims.putPointAtStartOfGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to start of global line"
    },
    {
        function: prims.putPointAtEndOfGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to end of global line"
    },
    {
        function: prims.putPointOnNextGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to next global line"
    },
    {
        function: prims.putPointOnPrevGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to previous global line"
    },
    {
        function: prims.putPointOnNextGlobalCol,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to next global column"
    },
    {
        function: prims.putPointOnPrevGlobalCol,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to previous global column"
    },
    {
        function: prims.pointAtEndOfGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if point is at end of global line"
    },
    {
        function: prims.pointAtBeginningOfGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if point is at beginning of global line"
    },
    {
        function: prims.pointOnFirstGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if point is on first global line"
    },
    {
        function: prims.pointOnLastGlobalLine,
        args: [],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if point is on last global line"
    },
    {
        function: prims.globalLineIsEmpty,
        args: [],
        retty: "boolean",
        async: false,
        const: true,
        description: "Check if current global line is empty"
    },
    {
        function: prims.removeGlobalLine,
        args: [],
        retty: "string",
        async: false,
        const: false,
        description: "Remove current global line and return its contents"
    },
    {
        function: prims.removeString,
        args: ["number"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Remove n characters before point"
    },
    {
        function: prims.insertGlobalNewline,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Insert a newline at current point"
    },
    {
        function: prims.insertString,
        args: ["string", "glpk", "boolean"],
        retty: "boolean",
        async: true,
        const: false,
        description: "Insert string at current point"
    },
    {
        function: prims.putPointOnGlobalPosition,
        args: ["point", "boolean"],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to a global position"
    },
    {
        function: prims.textOnGlobalLine,
        args: ["number"],
        retty: "string",
        async: false,
        const: true,
        description: "Get text content of a global line"
    },
];
