import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as state from "../../src/editor.js";
import { arbitraryPrimitiveCommand } from "../arbitrary-primitive-command.js";
import GLPK from "glpk.js/node";
import { expect } from "chai";

const glpk = await GLPK();

describe("Primitive command properties", () => {
    it("Applying arbitrary primitive commands maintains grid consistency", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(arbitraryPrimitiveCommand(glpk), { minLength: 0, maxLength: 50 }),
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
            { numRuns: 100 }
        );
    });
});
