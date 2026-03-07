import * as fc from "fast-check";
import * as util from "../src/util.js";
import * as serialize from "../src/editor/serialize-common-state.js";
import { PRIMITIVES as TEXT_PRIMS } from "../src/editor/text-prims/registry.js";

/** @import { Type } from "../src/editor/common-state.js" */
/** @import { TextPrimsState } from "../src/editor/text-prims/state.d.ts" */

/**
 * Generate an arbitrary value for a given primitive type.
 *
 * @param {Type} type The type to generate.
 * @param {any} glpk The glpk instance (used when type is "glpk").
 * @returns {fc.Arbitrary<any>}
 */
function arbitraryForType(type, glpk) {
    switch(type) {
        case "string":
            return fc.stringMatching(/^[a-zA-Z0-9 ]*$/, { maxLength: 20 });
        case "number":
            return fc.integer({ min: 0, max: 10 });
        case "glpk":
            return fc.constant(glpk);
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
 * Given a glpk instance, this generates a random primitive function call
 * with random arguments.
 *
 * @param {any} glpk The glpk instance.
 * @param {Partial<ArbitraryPrimitiveSettings>} [settings]
 * @returns {fc.Arbitrary<[Function, any[]]>} An arbitrary that generates
 *     a tuple of [primitive name, arguments array].
 */
export function arbitraryPrimitiveCommand(glpk, settings) {
    /** @type {ArbitraryPrimitiveSettings} */
    settings = { ...defaultArbitraryPrimSettings, ...settings };

    /** @type {fc.Arbitrary<[Function, any[]]>[]} */
    const primitiveArbitraries = TEXT_PRIMS
          .filter(prim => {
              return ( prim.const && settings.includeConstPrims)
                  || (!prim.const && settings.includeNonConstPrims);
          })
          .map(prim => {
        const argArbitraries = prim.args.map(type => arbitraryForType(type, glpk));

        if(argArbitraries.length === 0) {
            return fc.constant([prim.function, []]);
        }

        return fc.tuple(...argArbitraries)
            .map(args => [prim.function, args]);
    });

    return fc.oneof(...primitiveArbitraries);
}

/**
 *
 * @param {TextPrimsState} st The initial state.
 * @param {[Function, any[]][]} commands A list of arbitrary commands.
 * @param {any} glpk The GLPK instance.
 * @returns {Promise<string>} A summary of the arbitrary commands,
 *     along with a rendering of the initial and final states.
 */
export async function summarizePrimitiveCommands(st, commands, glpk) {
    const initialState = serialize.printCommonState(st);
    const commandSummary = [];

    for(const [fn, args] of commands) {
        const argStr = args.map(a =>
            a === glpk ? "glpk" : JSON.stringify(a)
        ).join(", ");
        commandSummary.push(`  ${fn.name}(${argStr})`);
        try {
            fn(st, ...args);
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
    const GLPK = (await import("glpk.js/node")).default;
    const glpk = await GLPK();
    const textPrims = await import("../src/editor/text-prims/text-prims.js");
    const serialize = await import("../src/editor/serialize-common-state.js");

    // Parse command line arguments
    const args = process.argv.slice(2);
    const numCommands = args.length > 0 ? parseInt(args[0], 10) : 10;
    const seed = args.length > 1 ? parseInt(args[1], 10) : undefined;

    // Generate commands
    const commands = fc.sample(
        arbitraryPrimitiveCommand(glpk),
        { numRuns: numCommands, seed }
    );

    // Create empty editor state
    const [st] = textPrims.editText(serialize.mkCommonState());

    console.log("Initial state:");
    console.log(serialize.printCommonState(st));
    console.log("\nApplying commands:");

    // Apply each command
    for(const [fn, cmdArgs] of commands) {
        const argStr = cmdArgs.map(a => a === glpk ? "glpk" : JSON.stringify(a)).join(", ");
        console.log(`  ${fn.name}(${argStr})`);
        await fn(st, ...cmdArgs);
    }

    console.log("\nFinal state:");
    console.log(serialize.printCommonState(st));
}

if(import.meta.main) {
    main();
}
