import * as fc from "fast-check";
import { PRIMITIVES } from "../src/editor.js";

/**
 * Generate an arbitrary value for a given primitive type.
 *
 * @param {"string" | "number" | "glpk" | "boolean"} type The type to generate.
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
    const primitiveArbitraries = PRIMITIVES
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

async function main() {
    // Example usage: generate and print some sample primitive commands
    const GLPK = (await import("glpk.js/node")).default;
    const glpk = await GLPK();

    const samples = fc.sample(arbitraryPrimitiveCommand(glpk), { numRuns: 10 });

    console.log("Sample primitive commands:");
    for(const [fn, args] of samples) {
        console.log(`  ${fn.name}(${args.map(a => a === glpk ? "glpk" : JSON.stringify(a)).join(", ")})`);
    }
}

if(import.meta.main) {
    main();
}
