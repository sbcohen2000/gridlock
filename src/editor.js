export {
    putPointOnGlobalPosition,
    putPointAtStartOfGlobalLine,
    putPointAtStartOfLine,
    putPointAtEndOfGlobalLine,
    putPointAtEndOfLine,
    putPointOnNextGlobalLine,
    putPointOnNextLine,
    putPointOnPrevGlobalLine,
    putPointOnPrevLine,
    putPointOnNextGlobalCol,
    putPointOnNextCol,
    putPointOnPrevGlobalCol,
    putPointOnPrevCol,
    pointAtEndOfGlobalLine,
    pointAtBeginningOfGlobalLine,
    pointOnFirstGlobalLine,
    pointOnLastGlobalLine,
    globalLineIsEmpty,
    removeGlobalLine,
    removeString,
    insertGlobalNewline,
    insertString,
    splitCellVerticallyAtPoint,
    splitCellHorizontallyAtPoint,
} from "./editor/prims.js";
import * as prims from "./editor/prims.js";

export * from "./editor/state.js";

/**
 * @typedef {"string" | "number" | "glpk" | "boolean"} Type
 */

/**
 * @typedef  {Object} PrimitiveSignature
 * @property {any}     function    The function.n
 * @property {Type[]}  args        The type of the function's arguments.
 * @property {Type}    retty       The type of the function's result.
 * @property {boolean} async       Is the function async?
 * @property {boolean} const       Does the function ever mutate the editor state?
 * @property {string}  description A short description of the primitive.
 */

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
        function: prims.putPointAtStartOfLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to start of current line"
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
        function: prims.putPointAtEndOfLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to end of current line"
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
        function: prims.putPointOnNextLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to next line in current leaf"
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
        function: prims.putPointOnPrevLine,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to previous line in current leaf"
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
        function: prims.putPointOnNextCol,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to next column in current leaf"
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
        function: prims.putPointOnPrevCol,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Move point to previous column in current leaf"
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
        function: prims.splitCellVerticallyAtPoint,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split cell vertically at current row"
    },
    {
        function: prims.splitCellHorizontallyAtPoint,
        args: [],
        retty: "boolean",
        async: false,
        const: false,
        description: "Split cell horizontally at current column"
    },
];
