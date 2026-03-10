import { expect } from "chai";
import * as grid from "../src/grid.js";
import * as point from "../src/point.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";
describe("transposeLines", () => {
    it("Can transpose the empty list", () => {
        expect(grid.transposeLines([])).to.deep.equal([]);
    });

    it("Can transpose a list with one row", () => {
        expect(grid.transposeLines(["hello"])).to.deep.equal(["h", "e", "l", "l", "o"]);
    });

    it("Throws on non-rectangular inputs", () => {
        expect(() => grid.transposeLines(["hello", "friend"])).to.throw();
    });

    it("Can transpose multi-line inputs", () => {
        expect(grid.transposeLines(["hello", "there"])).to.deep.equal(["ht", "eh", "le", "lr", "oe"]);
    });
});

describe("printASCII", () => {
    it("Can print a leaf", () => {
        const act = grid.printASCII(grid.mk(2, 3));
        const exp =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+"
        expect(act).to.equal(exp);
    });

    it("Can print a more complex tree", () => {
        const act = grid.printASCII({
            "type": "Horz",
            "dims": {
                "width": 5,
                "height": 6
            },
            "left": {
                "type": "Vert",
                "dims": {
                    "width": 3,
                    "height": 6
                },
                "left": {
                    "type": "Leaf",
                    "dims": {
                        "width": 3,
                        "height": 4
                    }
                },
                "right": {
                    "type": "Leaf",
                    "dims": {
                        "width": 3,
                        "height": 2
                    }
                }
            },
            "right": {
                "type": "Leaf",
                "dims": {
                    "width": 2,
                    "height": 6
                }
            }
        });

        const exp =
              "+--+-+\n" +
              "|  | |\n" +
              "|  | |\n" +
              "|  | |\n" +
              "+--+ |\n" +
              "|  | |\n" +
              "+--+-+"
        expect(act).to.equal(exp);

    });
});

describe("parseASCII", () => {
    it("Can parse a small leaf", () => {
        const src =
              "++\n" +
              "++";
        const g = grid.parseASCII(src)
        expect(g).to.deep.equal({
            type: "Leaf",
            dims: { width: 1, height: 1 }
        });
    });

    it("Can parse a leaf", () => {
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+";
        const g = grid.parseASCII(src)
        expect(g).to.deep.equal({
            type: "Leaf",
            dims: { width: 2, height: 3 }
        });
    });

    it("Can parse a grid with a single vertical partition", () => {
        const src =
              "+-+---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        expect(g).to.deep.equal({
            type: "Horz",
            dims: { width: 6, height: 2 },
            left: {
                type: "Leaf",
                dims: { width: 2, height: 2 }
            },
            right: {
                type: "Leaf",
                dims: { width: 4, height: 2 }
            }
        });
    });

    it("Can parse a grid with a single horizontal partition", () => {
        const src =
              "+-----+\n" +
              "+-----+\n" +
              "+-----+";

        const g = grid.parseASCII(src);
        expect(g).to.deep.equal({
            type: "Vert",
            dims: { width: 6, height: 2 },
            left: {
                type: "Leaf",
                dims: { width: 6, height: 1 }
            },
            right: {
                type: "Leaf",
                dims: { width: 6, height: 1 }
            }
        });
    });

    it("Can parse a grid with a horizontal and a vertical partition", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        expect(g).to.deep.equal({
            type: "Horz",
            dims: { width: 6, height: 3 },
            left: {
                type: "Leaf",
                dims: { width: 2, height: 3 }
            },
            right: {
                type: "Vert",
                dims: { width: 4, height: 3 },
                left: {
                    type: "Leaf",
                    dims: { width: 4, height: 1 }
                },
                right: {
                    type: "Leaf",
                    dims: { width: 4, height: 2 }
                }
            }
        });
    });

    it("Can parse a grid with some labels", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "|a| b |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        const a = grid.leafWithLabel(g, "a");
        expect(a.dims).to.deep.equal({ width: 2, height: 3 });

        const b = grid.leafWithLabel(g, "b");
        expect(b.dims).to.deep.equal({ width: 4, height: 2 });

        const c = grid.leafWithLabel(g, "c");
        expect(c).to.be.undefined;
    });

    it("It can parse trees printed by printASCII", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g0) => {
                const src0 = grid.printASCII(g0);
                const g1 = grid.parseASCII(src0);
                const src1 = grid.printASCII(g1);
                expect(src0).to.equal(src1);
            }),
            {
                reporter(out) {
                    if(!out.failed) return;
                    const genericErrorMessage = fc.defaultReportMessage(out);
                    const src0 = grid.printASCII(out.counterexample[0]);
                    const g1   = grid.parseASCII(src0);
                    const src1 = grid.printASCII(g1);

                    throw new Error(`${genericErrorMessage}\nOriginal grid:\n${src0}\nAs parsed:\n${src1}`);
                }
            }
        )
    });
});

describe("arbitrary-grid", () => {
    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g) => {
                expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
            })
        )
    });
});

describe("parentChain", () => {
    it("Can find the parent chain of a simple tree", () => {
        /** @type {grid.Grid<void>} */
        const tree = {
            type: "Horz",
            dims: { width: 6, height: 3 },
            left: {
                type: "Leaf",
                dims: { width: 2, height: 3 }
            },
            right: {
                type: "Vert",
                dims: { width: 4, height: 3 },
                left: {
                    type: "Leaf",
                    dims: { width: 4, height: 1 },
                    label: "a",
                },
                right: {
                    type: "Leaf",
                    dims: { width: 4, height: 2 }
                }
            }
        };

        const focus = grid.leafWithLabel(tree, "a");
        const chain = grid.parentChain(tree, focus);

        expect(chain).to.deep.equal([
            tree.right, tree
        ]);
    });

    it("Returns undefined when the focus isn't in the tree", () => {
        /** @type {grid.Grid<void>} */
        const tree = {
            type: "Horz",
            dims: { width: 6, height: 3 },
            left: {
                type: "Leaf",
                dims: { width: 2, height: 3 }
            },
            right: {
                type: "Vert",
                dims: { width: 4, height: 3 },
                left: {
                    type: "Leaf",
                    dims: { width: 4, height: 1 }
                },
                right: {
                    type: "Leaf",
                    dims: { width: 4, height: 2 }
                }
            }
        };

        /** @type {grid.Grid<void>} */
        const irrelevant = {
            type: "Leaf",
            dims: { width: 4, height: 2 }
        };

        const chain = grid.parentChain(tree, irrelevant);

        expect(chain).to.be.undefined;
    });
});


describe("posOfLeaf", () => {
    it("Can find the location of a root leaf", () => {
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+";

        const g = grid.parseASCII(src);
        expect(grid.posOfLeaf(g, g)).to.deep.equal({ x: 0, y: 0 });
    });

    it("Can find the location of leaves in a nested grid", () => {
        const src =
              "+--+-+\n" +
              "|a | |\n" +
              "|  |b|\n" +
              "|  | |\n" +
              "+--+ |\n" +
              "|c | |\n" +
              "+--+-+";

        const g = grid.parseASCII(src);
        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");

        expect(grid.posOfLeaf(g, a)).to.deep.equal({ x: 0, y: 0 });
        expect(grid.posOfLeaf(g, b)).to.deep.equal({ x: 3, y: 0 });
        expect(grid.posOfLeaf(g, c)).to.deep.equal({ x: 0, y: 4 });
    });
});

describe("leafUnderPoint", () => {
    it("Handles boundary points correctly", () => {
        const src =
            "+-+-+\n" +
            "|a|b|\n" +
            "+-+-+\n" +
            "|c|d|\n" +
            "+-+-+";

        const g = grid.parseASCII(src);
        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");
        const d = grid.leafWithLabel(g, "d");

        // Points in 'a' (top-left, width=2, height=2)
        expect(grid.leafUnderPoint(g, point.mkP2(0, 0))).to.equal(a);
        expect(grid.leafUnderPoint(g, point.mkP2(1, 1))).to.equal(a);

        // Points in 'b' (top-right, starts at x=2)
        expect(grid.leafUnderPoint(g, point.mkP2(2, 0))).to.equal(b);
        expect(grid.leafUnderPoint(g, point.mkP2(3, 1))).to.equal(b);

        // Points in 'c' (bottom-left, starts at y=2)
        expect(grid.leafUnderPoint(g, point.mkP2(0, 2))).to.equal(c);
        expect(grid.leafUnderPoint(g, point.mkP2(1, 3))).to.equal(c);

        // Points in 'd' (bottom-right, starts at x=2, y=2)
        expect(grid.leafUnderPoint(g, point.mkP2(2, 2))).to.equal(d);
        expect(grid.leafUnderPoint(g, point.mkP2(3, 3))).to.equal(d);
    });
});

describe("removeEmptyLeaves", () => {
    it("Removes a child with zero width", () => {
        /** @type {grid.Grid<void>} */
        const left = { type: "Leaf", dims: { width: 0, height: 2 } };
        /** @type {grid.Grid<void>} */
        const right = { type: "Leaf", dims: { width: 3, height: 2 } };
        /** @type {grid.Grid<void>} */
        const g = {
            type: "Horz",
            dims: { width: 3, height: 2 },
            left,
            right
        };

        const [result, removed] = grid.removeEmptyLeaves(g);
        expect(result).to.equal(right);
        expect(removed).to.deep.equal([left]);
    });

    it("Removes nested empty leaves", () => {
        /** @type {grid.Grid<void>} */
        const innerRight = { type: "Leaf", dims: { width: 0, height: 3 } };
        /** @type {grid.Grid<void>} */
        const outerRight = { type: "Leaf", dims: { width: 4, height: 0 } };
        /** @type {grid.Grid<void>} */
        const survivor = { type: "Leaf", dims: { width: 4, height: 3 } };
        /** @type {grid.Grid<void>} */
        const g = {
            type: "Vert",
            dims: { width: 4, height: 5 },
            left: {
                type: "Horz",
                dims: { width: 4, height: 3 },
                left: survivor,
                right: innerRight
            },
            right: outerRight
        };

        const [result, removed] = grid.removeEmptyLeaves(g);
        expect(result).to.equal(survivor);
        expect(removed).to.have.members([innerRight, outerRight]);
        expect(removed).to.have.lengthOf(2);
    });

    it("Removes both children when both are empty", () => {
        /** @type {grid.Grid<void>} */
        const left = { type: "Leaf", dims: { width: 0, height: 3 } };
        /** @type {grid.Grid<void>} */
        const right = { type: "Leaf", dims: { width: 0, height: 3 } };
        /** @type {grid.Grid<void>} */
        const g = {
            type: "Horz",
            dims: { width: 0, height: 3 },
            left,
            right
        };

        const [result, removed] = grid.removeEmptyLeaves(g);
        expect(result).to.be.undefined;
        expect(removed).to.have.members([left, right]);
        expect(removed).to.have.lengthOf(2);
    });
});

describe("reassociateLeaves", () => {
    describe("searchSweepEvents", () => {
        it("Works for a single sweep event", () => {
            let src =
                "+---+\n" +
                "|   |\n" +
                "+---+";

            const g = grid.parseASCII(src);
            const leaves = grid.allLeavesWithPosition(g);
            const { lrSweeps, udSweeps } = grid.compileSweepEvents(leaves);

            expect(lrSweeps).to.have.lengthOf(1);
            expect(udSweeps).to.have.lengthOf(1);

            const res0 = grid.searchSweepEvents(lrSweeps, 2, "x");
            expect(res0).to.not.be.undefined;

            const [n, left, right] = res0;
            expect(n).to.be.equal(0);
            expect(left).to.have.lengthOf(0);
            expect(right).to.have.lengthOf(1);
            expect(right[0].leaf).to.be.equal(g);
        });

        it("Works for a more complex grid", () => {
            let src =
                "+--+--+--+\n" +
                "|a |b |c |\n" +
                "|  +--+--+\n" +
                "|  |d |e |\n" +
                "+--+--+--+\n" +
                "|f    |g |\n" +
                "+-----+--+";

            const g  = grid.parseASCII(src);
            const la = grid.leafWithLabel(g, "a");
            const lb = grid.leafWithLabel(g, "b");
            const lc = grid.leafWithLabel(g, "c");
            const ld = grid.leafWithLabel(g, "d");
            const le = grid.leafWithLabel(g, "e");
            const lf = grid.leafWithLabel(g, "f");
            const lg = grid.leafWithLabel(g, "g");

            const leaves = grid.allLeavesWithPosition(g);
            const { lrSweeps, udSweeps } = grid.compileSweepEvents(leaves);

            expect(lrSweeps).to.have.lengthOf(7);
            expect(udSweeps).to.have.lengthOf(7);

            // Check the left-right sweep events.
            {
                const res = grid.searchSweepEvents(lrSweeps, g.dims.height, "x", 1);
                expect(res).to.not.be.undefined;

                const [n, left, right] = res;
                expect(n).to.be.equal(6);          // The 6th column.
                expect(left).to.have.lengthOf(4);  // 4 leaves to the left.
                expect(right).to.have.lengthOf(3); // 3 leaves to the right.

                expect(left.map(swp => swp.leaf)).to.include.members([la, lb, ld, lf]);
                expect(right.map(swp => swp.leaf)).to.include.members([lc, le, lg]);
            }

            // Check the up-down sweep events
            {
                const res1 = grid.searchSweepEvents(udSweeps, g.dims.width, "y", 1);
                expect(res1).to.not.be.undefined;

                const [n, up, down] = res1;
                expect(n).to.be.equal(4);         // The 4th row.
                expect(up).to.have.lengthOf(5);   // 5 leaves above.
                expect(down).to.have.lengthOf(2); // 2 leaves below.

                expect(up.map(swp => swp.leaf)).to.include.members([la, lb, lc, ld, le]);
                expect(down.map(swp => swp.leaf)).to.include.members([lf, lg]);
            }
        });
    });

    it("Does not change the ASCII printing of a random grid", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g) => {
                const leaves = grid.allLeavesWithPosition(g);
                const rebuilt = grid.reassociateLeaves(leaves, g.dims.width, g.dims.height);
                expect(grid.debugCheckGridDimsConsistency(rebuilt)).to.be.true;
                expect(grid.printASCII(rebuilt)).to.equal(grid.printASCII(g));
            })
        );
    });
});

describe("checkLeavesAdjacent", () => {
    it("Detects horizontally adjacent leaves", () => {
        const g = grid.parseASCII(
            "+-+--+\n" +
            "|a| b|\n" +
            "+-+--+"
        );
        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.ok;
        expect(grid.checkLeavesAdjacent(g, b, a)).to.be.ok;
    });

    it("Detects vertically adjacent leaves", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|a |\n" +
            "+--+\n" +
            "|b |\n" +
            "+--+"
        );
        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.ok;
        expect(grid.checkLeavesAdjacent(g, b, a)).to.be.ok;
    });

    it("Rejects non-adjacent leaves", () => {
        const g = grid.parseASCII(
            "+-+-+-+\n" +
            "|a|b|c|\n" +
            "+-+-+-+"
        );
        const a = grid.leafWithLabel(g, "a");
        const c = grid.leafWithLabel(g, "c");
        expect(grid.checkLeavesAdjacent(g, a, c)).to.be.null;
    });

    it("Rejects touching leaves with matching dimensions", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  +--+\n" +
            "|  |c |\n" +
            "+--+--+"
        );
        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.null;
        expect(grid.checkLeavesAdjacent(g, a, c)).to.be.null;
        expect(grid.checkLeavesAdjacent(g, b, c)).to.be.ok;
    });

    it("Any grid with more than one leaf has at least one adjacent pair", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g) => {
                const leaves = [...grid.allLeaves(g)];
                fc.pre(leaves.length >= 2);

                for (let i = 0; i < leaves.length; ++i) {
                    for (let j = i + 1; j < leaves.length; ++j) {
                        if (grid.checkLeavesAdjacent(g, leaves[i], leaves[j])) {
                            return true;
                        }
                    }
                }
                return false;
            })
        );
    });
});

describe("mergeLeaves", () => {
    it("Can merge the leaves in a tree with only two leaves", () => {
        const src =
              "+-+---+\n" +
              "|a| b |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        const la = grid.leafWithLabel(g, "a");
        const lb = grid.leafWithLabel(g, "b");

        const exp =
              "+-----+\n" +
              "|     |\n" +
              "+-----+";

        const [_, g1] = grid.mergeLeaves(g, la, lb);
        expect(grid.printASCII(g1)).to.equal(exp);
    });

    it("Can merge the leaves in a tree with many leaves", () => {
        let src =
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "|  +--+--+\n" +
            "|  |d |e |\n" +
            "+--+--+--+\n" +
            "|f    |g |\n" +
            "+-----+--+";

        const g  = grid.parseASCII(src);
        const lc = grid.leafWithLabel(g, "c");
        const le = grid.leafWithLabel(g, "e");

        const lb = grid.leafWithLabel(g, "b");
        const ld = grid.leafWithLabel(g, "d");

        const lf = grid.leafWithLabel(g, "f");
        const lg = grid.leafWithLabel(g, "g");

        // ----------------------------------------------------------
        let exp1 =
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "|  +--+  |\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|     |  |\n" +
            "+-----+--+";

        const [_l1, g1] = grid.mergeLeaves(g, lc, le);
        expect(grid.printASCII(g1)).to.equal(exp1);

        // ----------------------------------------------------------
        let exp2 =
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "|  |  |  |\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|     |  |\n" +
            "+-----+--+";

        const [_l2, g2] = grid.mergeLeaves(g1, lb, ld);
        expect(grid.printASCII(g2)).to.equal(exp2);

        // ----------------------------------------------------------
        let exp3 =
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "|  |  |  |\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|        |\n" +
            "+--------+";

        const [_l3, g3] = grid.mergeLeaves(g2, lf, lg);
        expect(grid.printASCII(g3)).to.equal(exp3);
    });

    it("Merging an adjacent pair reduces the leaf count by one", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g) => {
                const leaves = [...grid.allLeaves(g)];
                fc.pre(leaves.length >= 2);

                // Find an adjacent pair.
                for (let i = 0; i < leaves.length; ++i) {
                    for (let j = i + 1; j < leaves.length; ++j) {
                        if (grid.checkLeavesAdjacent(g, leaves[i], leaves[j])) {
                            const [_, merged] = grid.mergeLeaves(g, leaves[i], leaves[j]);
                            const newLeaves = [...grid.allLeaves(merged)];
                            expect(newLeaves).to.have.lengthOf(leaves.length - 1);
                            return;
                        }
                    }
                }

                // The adjacency property test guarantees we never reach here.
                expect.fail("No adjacent pair found");
            })
        );
    });
});

describe("splitLeafVertically", () => {
    it("Splits a root leaf into top and bottom", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+"
        );

        const [_, result] = grid.splitLeafVertically(
            g, /** @type {grid.Leaf<void>} */(g), 2,
            () => [undefined, undefined],
        );

        const exp =
              "+--+\n" +
              "|  |\n" +
              "+--+\n" +
              "|  |\n" +
              "+--+";

        expect(grid.printASCII(result)).to.equal(exp);
    });

    it("Splits a nested leaf", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|  |b |\n" +
            "|  |  |\n" +
            "+--+--+"
        );

        const b = grid.leafWithLabel(g, "b");
        grid.splitLeafVertically(
            g, b, 1,
            () => [undefined, undefined],
        );

        const exp =
            "+--+--+\n" +
            "|  +--+\n" +
            "|  |  |\n" +
            "+--+--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Does nothing when row is out of bounds", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+"
        );

        const before = grid.printASCII(g);
        grid.splitLeafVertically(
            g, /** @type {grid.Leaf<void>} */(g), 0,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);

        grid.splitLeafVertically(
            g, /** @type {grid.Leaf<void>} */(g), 2,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);
    });
});

describe("splitLeafHorizontally", () => {
    it("Splits a root leaf into left and right", () => {
        const g = grid.parseASCII(
            "+---+\n" +
            "|   |\n" +
            "+---+"
        );

        const [_, result] = grid.splitLeafHorizontally(
            g, /** @type {grid.Leaf<void>} */(g), 2,
            () => [undefined, undefined],
        );

        const exp =
            "+-+-+\n" +
            "| | |\n" +
            "+-+-+";

        expect(grid.printASCII(result)).to.equal(exp);
    });

    it("Splits a nested leaf", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+\n" +
            "|b |\n" +
            "+--+"
        );

        const b = grid.leafWithLabel(g, "b");
        grid.splitLeafHorizontally(
            g, b, 1,
            () => [undefined, undefined],
        );

        const exp =
            "+--+\n" +
            "|  |\n" +
            "++-+\n" +
            "|| |\n" +
            "++-+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Does nothing when col is out of bounds", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+"
        );

        const before = grid.printASCII(g);
        grid.splitLeafHorizontally(
            g, /** @type {grid.Leaf<void>} */(g), 0,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);

        grid.splitLeafHorizontally(
            g, /** @type {grid.Leaf<void>} */(g), 3,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);
    });
});

describe("leavesUnderRow", () => {
    it("Returns the root leaf when querying a single-leaf grid", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+"
        );

        const leaves = [...grid.leavesUnderRow(g, 0)];
        expect(leaves).to.have.lengthOf(1);
        expect(leaves[0]).to.equal(g);

        const leaves1 = [...grid.leavesUnderRow(g, 1)];
        expect(leaves1).to.have.lengthOf(1);
        expect(leaves1[0]).to.equal(g);
    });

    it("Returns all horizontally split leaves at the same row", () => {
        const g = grid.parseASCII(
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "+--+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");

        const leaves = [...grid.leavesUnderRow(g, 0)];
        expect(leaves).to.have.lengthOf(3);
        expect(leaves).to.include.members([a, b, c]);
    });

    it("Returns only leaves that contain the specified row", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");

        const leavesRow0 = [...grid.leavesUnderRow(g, 0)];
        expect(leavesRow0).to.have.lengthOf(2);
        expect(leavesRow0).to.include.members([a, b]);

        const leavesRow1 = [...grid.leavesUnderRow(g, 1)];
        expect(leavesRow1).to.have.lengthOf(2);
        expect(leavesRow1).to.include.members([a, b]);

        const leavesRow2 = [...grid.leavesUnderRow(g, 3)];
        expect(leavesRow2).to.have.lengthOf(1);
        expect(leavesRow2[0]).to.equal(c);
    });

    it("Works with a more complex grid", () => {
        const g = grid.parseASCII(
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "|  +--+--+\n" +
            "|  |d |e |\n" +
            "+--+--+--+\n" +
            "|f    |g |\n" +
            "+-----+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");
        const d = grid.leafWithLabel(g, "d");
        const e = grid.leafWithLabel(g, "e");
        const f = grid.leafWithLabel(g, "f");
        const g_leaf = grid.leafWithLabel(g, "g");

        const leavesRow0 = [...grid.leavesUnderRow(g, 0)];
        expect(leavesRow0).to.have.lengthOf(3);
        expect(leavesRow0).to.include.members([a, b, c]);

        const leavesRow2 = [...grid.leavesUnderRow(g, 2)];
        expect(leavesRow2).to.have.lengthOf(3);
        expect(leavesRow2).to.include.members([a, d, e]);

        const leavesRow4 = [...grid.leavesUnderRow(g, 4)];
        expect(leavesRow4).to.have.lengthOf(2);
        expect(leavesRow4).to.include.members([f, g_leaf]);
    });

    it("Returns leaves sorted by x-coordinate", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => {
                    return fc.record({
                        g: fc.constant(g),
                        y: fc.integer({ min: 0, max: g.dims.height - 1 })
                    });
                }),
                ({ g, y }) => {
                    const leaves = [...grid.leavesUnderRow(g, y)];

                    // Get the x-coordinates of all returned leaves
                    const xCoords = leaves.map(leaf => {
                        const pos = grid.posOfLeaf(g, leaf);
                        return pos.x;
                    });

                    // Check that they are sorted in ascending order
                    for(let i = 1; i < xCoords.length; i++) {
                        expect(xCoords[i]).to.be.greaterThan(xCoords[i - 1]);
                    }
                }
            )
        );
    });
});

describe("leavesToLeftOf", () => {
    it("Returns nothing for a leaf at the left edge", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        expect([...grid.leavesToLeftOf(g, a)]).to.have.lengthOf(0);
    });

    it("Returns the single leaf to the left", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");

        const leaves = [...grid.leavesToLeftOf(g, b)];
        expect(leaves).to.have.lengthOf(1);
        expect(leaves[0]).to.equal(a);
    });

    it("Returns multiple leaves when they tile the left side", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |c |\n" +
            "+--+  |\n" +
            "|b |  |\n" +
            "+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");

        const leaves = [...grid.leavesToLeftOf(g, c)];
        expect(leaves).to.have.lengthOf(2);
        expect(leaves[0]).to.equal(a);
        expect(leaves[1]).to.equal(b);
    });

    it("Does not return a leaf below the queried leaf", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |d |\n" +
            "+--+  |\n" +
            "|b |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");
        const d = grid.leafWithLabel(g, "d");

        const leaves = [...grid.leavesToLeftOf(g, d)];
        expect(leaves).to.deep.equal([a, b]);
        expect(leaves).to.not.include(c);
    });
});

describe("modifyHeightOfLeaves", () => {
    it("Grows a single leaf that spans the full width", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+"
        );

        grid.modifyHeightOfLeaves(g, 2, [/** @type {grid.Leaf<void>} */(g)]);

        const exp =
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Grows multiple leaves on the same row", () => {
        const g = grid.parseASCII(
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "+--+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const c = grid.leafWithLabel(g, "c");
        grid.modifyHeightOfLeaves(g, 1, [a, b, c]);

        const exp =
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "|  |  |  |\n" +
            "+--+--+--+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Shrinks multiple leaves on the same row", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        grid.modifyHeightOfLeaves(g, -1, [a, b]);

        const exp =
            "+--+--+\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|     |\n" +
            "+-----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Throws when leaves do not cover the full width", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "+--+--+"
        );

        const a = grid.leafWithLabel(g, "a");
        expect(() => grid.modifyHeightOfLeaves(g, 1, [a])).to.throw(
            "the leaves passed to modifyHeightOfLeaves do not cover the grid"
        );
    });

    it("Throws when leaves overlap horizontally", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        // a and c overlap in the x-range [0, 3)
        const a = grid.leafWithLabel(g, "a");
        const c = grid.leafWithLabel(g, "c");
        expect(() => grid.modifyHeightOfLeaves(g, 1, [a, c])).to.throw(
            "horizontally overlapping leaves passed to modifyHeightOfLeaves"
        );
    });
});

describe("leftNeighborhoodOfLeaf", () => {
    it("Works", () => {
        let src =
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "|  +--+--+\n" +
            "|  |d |e |\n" +
            "+--+--+--+\n" +
            "|f    |g |\n" +
            "+-----+--+";

        const g = grid.parseASCII(src);

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const d = grid.leafWithLabel(g, "d");
        const e = grid.leafWithLabel(g, "e");
        const f = grid.leafWithLabel(g, "f");

        {
            const [l, r] = grid.leftNeighborhoodOfLeaf(g, a);
            expect(l).to.be.empty
            expect(r).to.contain(a);
        }

        {
            const [l, r] = grid.leftNeighborhoodOfLeaf(g, f);
            expect(l).to.be.empty
            expect(r).to.contain(f);
        }


        {
            const [l, r] = grid.leftNeighborhoodOfLeaf(g, d);
            expect(l).to.contain(a);
            expect(l).to.have.lengthOf(1);
            expect(r).to.contain(b);
            expect(r).to.contain(d);
            expect(r).to.have.lengthOf(2);
        }

        {
            const [l, r] = grid.leftNeighborhoodOfLeaf(g, e);
            expect(l).to.have.lengthOf(1);
            expect(l).to.contain(d);
            expect(r).to.have.lengthOf(1);
            expect(r).to.contain(e);
        }
    });
});
