import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as state from "../../src/editor.js";
import * as serialize from "../../src/editor/serialize.js";
import { arbitraryPrimitiveCommand } from "../arbitrary-primitive-command.js";
import GLPK from "glpk.js/node";
import { expect } from "chai";

const glpk = await GLPK();

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(arbitraryPrimitiveCommand(glpk, { includeConstPrims: false }), { minLength: 0, maxLength: 1000 }),
                async (commands) => {
                    // Start with a fresh editor state
                    const st = state.mk();

                    // Apply each command
                    for(const [fn, args] of commands) {
                        await fn(st, ...args);
                    }

                    // Check that grid dimensions are consistent
                    expect(grid.debugCheckGridDimsConsistency(st.grid)).to.be.true;
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;

                    const commands = out.counterexample[0];
                    const genericErrorMessage = fc.defaultReportMessage(out);

                    // Recreate the state to show the final result
                    const st = state.mk();
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
                        genericErrorMessage,
                        `\nNumber of commands: ${commands.length}`,
                        "\nInitial state:",
                        serialize.printCellGrid(state.mk().grid),
                        "\nCommands applied:",
                        commandSummary.join("\n"),
                        "\nFinal state:",
                        serialize.printCellGrid(st.grid)
                    ].join("\n");

                    throw new Error(errorMessage);
                }
            }
        );
    });
});
