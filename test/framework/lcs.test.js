import * as fc from "fast-check";
import { diff, patch } from "../../src/framework/lcs.js";
import { expect } from "chai";

describe("lcs", () => {
    describe("diff", () => {
        it("returns an empty diff for identical arrays", () => {
            const a = [1, 2, 3];
            expect(diff(a, a)).to.deep.equal([]);
        });

        it("diffs an empty array to a non-empty array", () => {
            const ops = diff([], [1, 2]);
            expect(patch([], ops)).to.deep.equal([1, 2]);
        });

        it("diffs a non-empty array to an empty array", () => {
            const ops = diff([1, 2], []);
            expect(patch([1, 2], ops)).to.deep.equal([]);
        });

        it("handles a single insertion", () => {
            const ops = diff([1, 3], [1, 2, 3]);
            expect(patch([1, 3], ops)).to.deep.equal([1, 2, 3]);
        });

        it("handles a single deletion", () => {
            const ops = diff([1, 2, 3], [1, 3]);
            expect(patch([1, 2, 3], ops)).to.deep.equal([1, 3]);
        });

        it("handles a complete replacement", () => {
            const ops = diff([1, 2], [3, 4]);
            expect(patch([1, 2], ops)).to.deep.equal([3, 4]);
        });
    });

    describe("patch is the inverse of diff", () => {
        it("for any two arrays, patch(a, diff(a, b)) === b", () => {
            const arbArr = fc.array(fc.integer({ min: 0, max: 10 }), { maxLength: 20 });

            fc.assert(fc.property(arbArr, arbArr, (a, b) => {
                const ops = diff(a, b);
                const result = patch(a, ops);
                expect(result).to.deep.equal(b);
            }));
        });
    });
});
