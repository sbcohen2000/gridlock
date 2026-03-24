import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as rect from "../../src/rect.js";
import * as util from "../../src/util.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { arbitraryPrimitiveCommand, summarizePrimitiveCommands } from "./arbitrary-primitive-command.js";
import { expect } from "chai";
import { serialize, TextPrims } from "../../src/state/index.js";
import { checkGridInvariants } from "../../src/state/state-iface.js";

/** @import { AnyState } from "../../src/state/state-iface.js" */

/**
 * Generate an arbitrary starting state by generating a grid and then
 * setting the point to an arbitrary position within the grid.
 *
 * @returns {fc.Arbitrary<TextPrims>} An arbitrary editor state
 */
function arbitraryStartingState() {
    return arbCellGrid.chain(g => {
        const outerRect = grid.rectOfGrid(g);
        return fc.record({
            x: fc.integer({ min: 0, max: rect.width(outerRect) }),
            y: fc.integer({ min: 0, max: rect.height(outerRect) })
        }).chain(pt => {
            const st = TextPrims.editText({ grid: g });
            st.putPointOnGlobalPosition(pt, true);
            return fc.constant(st);
        });
    });
}

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", () => {
        fc.assert(
            fc.property(
                fc.array(arbitraryPrimitiveCommand({ includeConstPrims: false }), { minLength: 0, maxLength: 1000 }),
                (commands) => {
                    // Start with a fresh editor state
                    const st = TextPrims.mkEmpty();

                    // Apply each command
                    for(const [method, args] of commands) {
                        st[method](...args);
                    }

                    // Check that grid invariants are preserved
                    expect(checkGridInvariants(st)).to.be.true;
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const commands = out.counterexample[0];
                    const st = TextPrims.mkEmpty();

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
                (st, [method, args]) => {
                    const clone = st.clone();
                    const beforeSerialization = serialize.printCommonState(clone);
                    clone[method](...args);
                    const afterSerialization = serialize.printCommonState(clone);
                    expect(afterSerialization).to.equal(beforeSerialization);
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const [st, command] = out.counterexample;

                    const summary = summarizePrimitiveCommands(st.clone(), [command]);
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
                (st, [method, args]) => {
                    /** @type {{ st: TextPrims }} */
                    const stObj = { st: st.clone() };

                    const beforeSerialization = serialize.printCommonState(stObj.st);
                    const beforeGlobalPt = stObj.st.findGlobalPoint();
                    const beforeLastGlobalCol = stObj.st.selection.lastGlobalCol;

                    const inv = stObj.st[method](...args);
                    inv.apply("st", stObj);

                    const afterSerialization = serialize.printCommonState(stObj.st);
                    const afterGlobalPt = stObj.st.findGlobalPoint();
                    expect(afterSerialization).to.equal(beforeSerialization);
                    expect(afterGlobalPt).to.deep.equal(beforeGlobalPt);
                    expect(stObj.st.selection.lastGlobalCol).to.equal(beforeLastGlobalCol);
                }
            ),
            {
                numRuns: 1000,
                reporter(out) {
                    if(!out.failed) return;
                    const [st, [method, args]] = out.counterexample;
                    const globalPt = st.findGlobalPoint();
                    const initialState = util.showMultilineString(serialize.printCommonState(st));

                    const argStr = args.map(a => JSON.stringify(a)).join(", ");
                    const commandSummary = `${method}(${argStr})`;

                    const inv = st[method](...args);
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
