import * as fc from "fast-check";
import * as util from "../../src/util.js";
import { serialize, TextPrims } from "../../src/state/index.js";

/**
 * @typedef {"string" | "number" | "boolean" | "point"} Type
 */

/**
 * @typedef {{
 *   method: string,
 *   args: Type[],
 *   const: boolean,
 *   description: string,
 * }} PrimitiveDescriptor
 */

/** @type {PrimitiveDescriptor[]} */
const TEXT_PRIMS = [
    { method: "putPointAtStartOfGlobalLine", args: [], const: false, description: "Move point to start of line" },
    { method: "putPointAtEndOfGlobalLine", args: [], const: false, description: "Move point to end of line" },
    { method: "putPointOnNextGlobalLine", args: ["boolean"], const: false, description: "Move point to next line" },
    { method: "putPointOnPrevGlobalLine", args: ["boolean"], const: false, description: "Move point to previous line" },
    { method: "putPointOnNextGlobalCol", args: [], const: false, description: "Move point to next column" },
    { method: "putPointOnPrevGlobalCol", args: [], const: false, description: "Move point to previous column" },
    { method: "putPointOnGlobalPosition", args: ["point", "boolean"], const: false, description: "Move point to global position" },
    { method: "pointAtEndOfGlobalLine", args: [], const: true, description: "Check if point is at end of line" },
    { method: "pointAtBeginningOfGlobalLine", args: [], const: true, description: "Check if point is at beginning of line" },
    { method: "pointOnFirstGlobalLine", args: [], const: true, description: "Check if point is on first line" },
    { method: "pointOnLastGlobalLine", args: [], const: true, description: "Check if point is on last line" },
    { method: "globalLineIsEmpty", args: [], const: true, description: "Check if current line is empty" },
    { method: "textOnGlobalLine", args: ["number"], const: true, description: "Get text on a global line" },
    { method: "findGlobalPoint", args: [], const: true, description: "Find the global point" },
    { method: "removeGlobalLine", args: [], const: false, description: "Remove the current line" },
    { method: "removeGlobalNewline", args: [], const: false, description: "Remove the newline before the current line" },
    { method: "removeString", args: ["number"], const: false, description: "Remove characters before point" },
    { method: "insertGlobalNewline", args: [], const: false, description: "Insert a newline" },
    { method: "insertString", args: ["string", "boolean"], const: false, description: "Insert a string by expanding" },
];

/**
 * Generate an arbitrary value for a given primitive type.
 *
 * @param {Type} type The type to generate.
 * @returns {fc.Arbitrary<any>}
 */
function arbitraryForType(type) {
    switch(type) {
        case "string":
            return fc.stringMatching(/^[a-zA-Z0-9 ]*$/, { maxLength: 20 });
        case "number":
            return fc.integer({ min: 0, max: 10 });
        case "boolean":
            return fc.boolean();
        case "point":
            return fc.record({
                x: fc.integer({ min: 0, max: 20 }),
                y: fc.integer({ min: 0, max: 20 })
            });
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}

/**
 * @typedef {{
 *   includeConstPrims: boolean,
 *   includeNonConstPrims: boolean,
 * }} ArbitraryPrimitiveSettings
 */

/** @type {ArbitraryPrimitiveSettings} */
const defaultArbitraryPrimSettings = {
    includeConstPrims: true,
    includeNonConstPrims: true
};

/**
 * Generate an arbitrary primitive command.
 *
 * @param {Partial<ArbitraryPrimitiveSettings>} [settings]
 * @returns {fc.Arbitrary<[string, any[]]>} An arbitrary that generates
 *     a tuple of [method name, arguments array].
 */
export function arbitraryPrimitiveCommand(settings) {
    /** @type {ArbitraryPrimitiveSettings} */
    settings = { ...defaultArbitraryPrimSettings, ...settings };

    /** @type {fc.Arbitrary<[string, any[]]>[]} */
    const primitiveArbitraries = TEXT_PRIMS
          .filter(prim => {
              return ( prim.const && settings.includeConstPrims)
                  || (!prim.const && settings.includeNonConstPrims);
          })
          .map(prim => {
        const argArbitraries = prim.args.map(type => arbitraryForType(type));

        if(argArbitraries.length === 0) {
            return fc.constant([prim.method, []]);
        }

        return fc.tuple(...argArbitraries)
            .map(args => [prim.method, args]);
    });

    return fc.oneof(...primitiveArbitraries);
}

/**
 * @param {import("../../src/state/text-prims.js").TextPrims} st The initial state.
 * @param {[string, any[]][]} commands A list of arbitrary commands.
 * @returns {string} A summary of the arbitrary commands,
 *     along with a rendering of the initial and final states.
 */
export function summarizePrimitiveCommands(st, commands) {
    const initialState = serialize.printCommonState(st);
    const commandSummary = [];

    for(const [method, args] of commands) {
        const argStr = args.map(a => JSON.stringify(a)).join(", ");
        commandSummary.push(`  ${method}(${argStr})`);
        try {
            st[method](...args);
        } catch(e) {
            // If command fails during replay, just note it
        }
    }

    const errorMessage = [
        `Number of commands: ${commands.length}`,
        "\nInitial state:",
        util.showMultilineString(initialState),
        "\nCommands applied:",
        commandSummary.join("\n"),
        "\nFinal state:",
        serialize.printCommonState(st)
    ].join("\n");

    return errorMessage;
}

async function main() {
    const serialize = await import("../../src/state/serialize-common-state.js");

    // Parse command line arguments
    const args = process.argv.slice(2);
    const numCommands = args.length > 0 ? parseInt(args[0], 10) : 10;
    const seed = args.length > 1 ? parseInt(args[1], 10) : undefined;

    // Generate commands
    const commands = fc.sample(
        arbitraryPrimitiveCommand(),
        { numRuns: numCommands, seed }
    );

    // Create empty editor state
    const st = TextPrims.mkEmpty();

    console.log("Initial state:");
    console.log(serialize.printCommonState(st));
    console.log("\nApplying commands:");

    // Apply each command
    for(const [method, cmdArgs] of commands) {
        const argStr = cmdArgs.map(a => JSON.stringify(a)).join(", ");
        console.log(`  ${method}(${argStr})`);
        st[method](...cmdArgs);
    }

    console.log("\nFinal state:");
    console.log(serialize.printCommonState(st));
}

if(import.meta.main) {
    main();
}
