import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as util from "../../src/util.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { arbitraryPrimitiveCommand, summarizePrimitiveCommands } from "./arbitrary-primitive-command.js";
import { expect } from "chai";
import { serialize, textPrims } from "../../src/state/index.js";

/** @import { TextPrimsState } from "../../src/state/text-prims/state.js" */

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
        })
    );
}

/**
 * Deep-clone a text prims state.
 *
 * @param {TextPrimsState} st
 * @returns {TextPrimsState}
 */
function cloneState(st) {
    const clone = st.clone();
    return clone;
}

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPrimitiveCommand({ includeConstPrims: false }), { minLength: 0, maxLength: 1000 }),
                (commands) => {
                    // Start with a fresh editor state
                    const [st] = textPrims.editText(serialize.emptyTextEditingState());

                    // Apply each command
                    for(const [fn, args] of commands) {
                        fn(st, ...args);
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

                    const summary = summarizePrimitiveCommands(st, commands);
                    const errorMessage = `\nseed: ${out.seed}\nshrinks: ${out.numShrinks}\n${summary}`;
                    throw new Error(errorMessage);
                }
            }
        );
    });

    it("Const primitives do not modify the editor state", () => {
        fc.assert(
            fc.property(
                arbitraryStartingState(),
                arbitraryPrimitiveCommand({ includeConstPrims: true, includeNonConstPrims: false }),
                (st, [fn, args]) => {
                    const clone = cloneState(st);
                    const beforeSerialization = serialize.printCommonState(clone);
                    fn(clone, ...args);
                    const afterSerialization = serialize.printCommonState(clone);
                    expect(afterSerialization).to.equal(beforeSerialization);
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const [st, command] = out.counterexample;

                    const summary = summarizePrimitiveCommands(cloneState(st), [command]);
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

    it("Non-const prims' inverse acts as an inverse", () => {
        fc.assert(
            fc.property(
                arbitraryStartingState(),
                arbitraryPrimitiveCommand({ includeConstPrims: false, includeNonConstPrims: true }),
                (st, [fn, args]) => {
                    const clone = cloneState(st);
                    const beforeSerialization = serialize.printCommonState(clone);
                    const beforeGlobalPt = textPrims.findGlobalPoint(clone);
                    const beforeLastGlobalCol = clone.selection.lastGlobalCol;
                    const inv = fn(clone, ...args);
                    inv.apply(clone);
                    const afterSerialization = serialize.printCommonState(clone);
                    const afterGlobalPt = textPrims.findGlobalPoint(clone);
                    expect(afterSerialization).to.equal(beforeSerialization);
                    expect(afterGlobalPt).to.deep.equal(beforeGlobalPt);
                    expect(clone.selection.lastGlobalCol).to.equal(beforeLastGlobalCol);
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const [st, [fn, args]] = out.counterexample;
                    const globalPt = textPrims.findGlobalPoint(st);
                    const initialState = util.showMultilineString(serialize.printCommonState(st));

                    const argStr = args.map(a => JSON.stringify(a)).join(", ");
                    const commandSummary = `${fn.name}(${argStr})`;

                    const inv = fn(st, ...args);
                    const afterCommand = serialize.printCommonState(st);

                    const afterInverse =
                          typeof inv === "object"
                          ? (inv.apply(st), serialize.printCommonState(st))
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
