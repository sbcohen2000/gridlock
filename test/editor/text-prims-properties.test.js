import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as textPrims from "../../src/editor/text-prims/text-prims.js";
import GLPK from "glpk.js/node";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { arbitraryPrimitiveCommand, summarizePrimitiveCommands } from "../arbitrary-primitive-command.js";
import { expect } from "chai";

/** @import { TextPrimsState } from "../../src/editor/text-prims/state.d.ts" */

const glpk = await GLPK();

/**
 * Generate an arbitrary starting state by generating a grid and then
 * setting the point to an arbitrary position within the grid.
 *
 * @returns {fc.Arbitrary<TextPrimsState>} An arbitrary editor state
 */
function arbitraryStartingState() {
    return arbCellGrid.chain(g =>
        fc.record({
            x: fc.integer({ min: 0, max: g.dims.width }),
            y: fc.integer({ min: 0, max: g.dims.height })
        }).chain(pt => {
            const st = textPrims.editText({ grid: g });
            textPrims.putPointOnGlobalPosition(st, pt, true);
            return fc.constant(st);
        }));
}

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(arbitraryPrimitiveCommand(glpk, { includeConstPrims: false }), { minLength: 0, maxLength: 1000 }),
                async (commands) => {
                    // Start with a fresh editor state
                    const st = textPrims.editText(serialize.mkCommonState());

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
                    const st = textPrims.editText(serialize.mkCommonState());

                    const summary = summarizePrimitiveCommands(st, commands, glpk);
                    const errorMessage = `\nseed: ${out.seed}\nshrinks: ${out.numShrinks}\n${summary}`;
                    throw new Error(errorMessage);
                }
            }
        );
    });

    it("Const primitives do not modify the editor state", async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryStartingState(),
                arbitraryPrimitiveCommand(glpk, { includeConstPrims: true, includeNonConstPrims: false }),
                async (st, [fn, args]) => {
                    const beforeSerialization = serialize.printCommonState(st);
                    await fn(st, ...args);
                    const afterSerialization = serialize.printCommonState(st);
                    expect(afterSerialization).to.equal(beforeSerialization);
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const [st, command] = out.counterexample;

                    const summary = summarizePrimitiveCommands(st, [command], glpk);
                    const errorMessage = `\nseed: ${out.seed}\nshrinks: ${out.numShrinks}\n${summary}`;
                    throw new Error(errorMessage);
                }
            }
        );
    });
});
