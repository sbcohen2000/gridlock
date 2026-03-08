import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as serialize from "../../src/editor/serialize-common-state.js";
import * as textPrims from "../../src/editor/text-prims/text-prims.js";
import * as util from "../../src/util.js";
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
            const [st] = textPrims.editText(serialize.commonStateFromGrid(g));
            textPrims.putPointOnGlobalPosition(st, pt, true);
            return fc.constant(st);
        }));
}

/**
 * Deep-clone a TextPrimsState via serialize/deserialize so that the
 * original state object remains unmutated (useful for reporters).
 *
 * @param {TextPrimsState} st The state to clone.
 * @returns {TextPrimsState} A fresh deep copy with the same cursor position.
 */
function cloneState(st) {
    const serialized = serialize.printCommonState(st);
    const [clone] = textPrims.editText(serialize.textEditingStateFromString(serialized));

    // Restore cursor position.
    const leafPos = grid.posOfLeaf(st.grid, st.selection.leaf);
    const globalPt = { x: leafPos.x + st.selection.pt.x, y: leafPos.y + st.selection.pt.y };
    textPrims.putPointOnGlobalPosition(clone, globalPt, true);
    clone.selection.lastGlobalCol = st.selection.lastGlobalCol;

    return clone;
}

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(arbitraryPrimitiveCommand(glpk, { includeConstPrims: false }), { minLength: 0, maxLength: 1000 }),
                async (commands) => {
                    // Start with a fresh editor state
                    const [st] = textPrims.editText(serialize.emptyTextEditingState());

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
                    const [st] = textPrims.editText(serialize.emptyTextEditingState());

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
                    const clone = cloneState(st);
                    const beforeSerialization = serialize.printCommonState(clone);
                    await fn(clone, ...args);
                    const afterSerialization = serialize.printCommonState(clone);
                    expect(afterSerialization).to.equal(beforeSerialization);
                }
            ),
            {
                numRuns: 1000,
                async reporter(out) {
                    if(!out.failed) return;
                    const [st, command] = out.counterexample;

                    const summary = await summarizePrimitiveCommands(cloneState(st), [command], glpk);
                    const errorMessage = [
                        `\nruns: ${out.numRuns}`,
                        `seed: ${out.seed}`,
                        `shrinks: ${out.numShrinks}`,
                        summary
                    ].join("\n");
                    throw new Error(errorMessage);
                }
            }
        );
    });

    it("Non-const prims' inverse acts as an inverse", async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryStartingState(),
                arbitraryPrimitiveCommand(glpk, { includeConstPrims: false, includeNonConstPrims: true }),
                async (st, [fn, args]) => {
                    const clone = cloneState(st);
                    const beforeSerialization = serialize.printCommonState(clone);
                    const beforeGlobalPt = textPrims.findGlobalPoint(clone);
                    const beforeLastGlobalCol = clone.selection.lastGlobalCol;
                    const inv = await fn(clone, ...args);
                    await inv(clone);
                    const afterSerialization = serialize.printCommonState(clone);
                    const afterGlobalPt = textPrims.findGlobalPoint(clone);
                    expect(afterSerialization).to.equal(beforeSerialization);
                    expect(afterGlobalPt).to.deep.equal(beforeGlobalPt);
                    expect(clone.selection.lastGlobalCol).to.equal(beforeLastGlobalCol);
                }
            ),
            {
                numRuns: 1000,
                async reporter(out) {
                    if(!out.failed) return;
                    const [st, [fn, args]] = out.counterexample;
                    const globalPt = textPrims.findGlobalPoint(st);
                    const initialState = util.showMultilineString(serialize.printCommonState(st));

                    const argStr = args.map(a =>
                        a === glpk ? "glpk" : JSON.stringify(a)
                    ).join(", ");
                    const commandSummary = `${fn.name}(${argStr})`;

                    const inv = await fn(st, ...args);
                    const afterCommand = serialize.printCommonState(st);

                    const afterInverse =
                          typeof inv === "function"
                          ? (await inv(st), serialize.printCommonState(st))
                          : "<no inverse>";

                    const errorMessage = [
                        `\nruns: ${out.numRuns}`,
                        `seed: ${out.seed}`,
                        `shrinks: ${out.numShrinks}`,
                        `point: (row ${globalPt.y}, col ${globalPt.x})`,
                        `command: ${commandSummary}`,
                        `Initial state:`,
                        initialState,
                        `After command:`,
                        afterCommand,
                        `After inverse:`,
                        afterInverse
                    ].join("\n");
                    throw new Error(errorMessage);
                }
            }
        );
    });
});
