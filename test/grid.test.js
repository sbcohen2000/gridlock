import { expect } from "chai";
import * as grid from "../src/grid.js";
import * as point from "../src/point.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";
import GLPK from "glpk.js/node";

const glpk = await GLPK();

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

        const focus = tree.right.left;
        const chain = grid.parentChain(tree, focus);

        expect(chain).to.deep.equal([
            tree.right, tree
        ]);
    });

    it("Returns undefined when the focus isn't in the tree", () => {
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

        const irrelevant = {
            type: "Leaf",
            dims: { width: 4, height: 2 }
        };

        const chain = grid.parentChain(tree, irrelevant);

        expect(chain).to.be.undefined;
    });
});

describe("constructDependencyTrees", () => {
    it("Can construct the dependency tree for a small grid", () => {
        const src =
              "+--+---+\n" +
              "|  | b |\n" +
              "|a +---+\n" +
              "|  | c |\n" +
              "+--+---+";

        const g = grid.parseASCII(src);
        const deps = grid.constructDependencyTrees(g);

        expect(grid.debugPrintDeps(deps))
            .to.equal("(a b c)");
    });

    it("Can construct the dependency tree for a larger grid", () => {
        const src =
              "+---+---+\n" +
              "| a | b |\n" +
              "+---+---+\n" +
              "| c | d |\n" +
              "+---+---+";

        const g = grid.parseASCII(src);
        const deps = grid.constructDependencyTrees(g);

        expect(grid.debugPrintDeps(deps))
            .to.equal("(a b d)\n(c b d)");
    });
});

describe("allPaths", () => {
    it("Can find paths in a tree with no children", () => {
        const leaf = grid.mk(2, 3);
        const tree = { children: [], leaf };

        const paths = grid.allPaths(tree);
        expect(paths).to.have.lengthOf(1);
        expect(paths[0]).to.deep.equal([leaf]);
    });

    it("Can find paths in a tree with one child", () => {
        const leafA = grid.mk(2, 3);
        const leafB = grid.mk(2, 3);
        const childTree = { children: [], leaf: leafB };
        const tree = { children: [childTree], leaf: leafA };

        const paths = grid.allPaths(tree);
        expect(paths).to.have.lengthOf(1);
        expect(paths[0]).to.have.lengthOf(2);
        expect(paths[0][0]).to.equal(leafA);
        expect(paths[0][1]).to.equal(leafB);
    });

    it("Can find paths in a tree with multiple children", () => {
        const leafA = grid.mk(2, 3);
        const leafB = grid.mk(2, 3);
        const leafC = grid.mk(2, 3);

        const childTree1 = { children: [], leaf: leafB };
        const childTree2 = { children: [], leaf: leafC };
        const tree = { children: [childTree1, childTree2], leaf: leafA };

        const paths = grid.allPaths(tree);
        expect(paths).to.have.lengthOf(2);
        expect(paths[0]).to.deep.equal([leafA, leafB]);
        expect(paths[1]).to.deep.equal([leafA, leafC]);
    });

    it("Can find paths in a deeper tree structure", () => {
        const leafA = grid.mk(2, 3);
        const leafB = grid.mk(2, 3);
        const leafC = grid.mk(2, 3);
        const leafD = grid.mk(2, 3);

        // Tree structure: a -> b -> [c, d]
        const childTree2 = { children: [], leaf: leafC };
        const childTree3 = { children: [], leaf: leafD };
        const childTree1 = { children: [childTree2, childTree3], leaf: leafB };
        const tree = { children: [childTree1], leaf: leafA };

        const paths = grid.allPaths(tree);
        expect(paths).to.have.lengthOf(2);
        expect(paths[0]).to.deep.equal([leafA, leafB, leafC]);
        expect(paths[1]).to.deep.equal([leafA, leafB, leafD]);
    });

    it("Can find paths in a complex branching tree", () => {
        const leafA = grid.mk(2, 3);
        const leafB = grid.mk(2, 3);
        const leafC = grid.mk(2, 3);
        const leafD = grid.mk(2, 3);
        const leafE = grid.mk(2, 3);

        // Tree structure:    a
        //                   / \
        //                  b   c
        //                 /     \
        //                d       e
        const tree1 = { children: [], leaf: leafD };
        const tree2 = { children: [], leaf: leafE };
        const childB = { children: [tree1], leaf: leafB };
        const childC = { children: [tree2], leaf: leafC };
        const tree = { children: [childB, childC], leaf: leafA };

        const paths = grid.allPaths(tree);
        expect(paths).to.have.lengthOf(2);
        expect(paths[0]).to.deep.equal([leafA, leafB, leafD]);
        expect(paths[1]).to.deep.equal([leafA, leafC, leafE]);
    });
});

describe("modifyWidth", () => {
    it("Can modify the width of a leaf", async () => {
        const g = grid.mk(2, 3);
        await grid.modifyWidth(g, 2, g, glpk);
        expect(g.dims.width).to.equal(4);
    });

    it("Can modify the width of a leaf in a small tree (1)", async () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        await grid.modifyWidth(g, 2, g.left, glpk);
        expect(grid.printASCII(g)).to.equal(
            "+---+---+\n" +
            "|   +---+\n" +
            "|   |   |\n" +
            "+---+---+"
        );
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Can modify the width of a leaf in a small tree (2)", async () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        await grid.modifyWidth(g, 2, g.right.left, glpk);
        expect(grid.printASCII(g)).to.equal(
            "+-+-----+\n" +
            "| +-----+\n" +
            "| |     |\n" +
            "+-+-----+"
        );
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Can modify the width of a leaf in a small tree (3)", async () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        await grid.modifyWidth(g, 2, g.right.right, glpk);
        expect(grid.printASCII(g)).to.equal(
            "+-+-----+\n" +
            "| +-----+\n" +
            "| |     |\n" +
            "+-+-----+"
        );
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => {
                    const nodes = grid.allNodes(g);
                    return fc.record({
                        g: fc.constant(g),
                        focus: fc.constantFrom(...nodes),
                        n: fc.integer({ min: 1, max: 5 })
                    });
                }),
                ({ g, focus, n }) => {
                    grid.modifyWidth(g, n, focus);
                    expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
                }
            )
        );
    });

    it("Can modify the width of leaves with an induced dependency.", async () => {
        const src =
              "+-+-+--+\n" +
              "|x|y| a|\n" +
              "+-+-+--+\n" +
              "+------+\n" +
              "+-+--+-+\n" +
              "|z|w |b|\n" +
              "+-+--+-+";

        const g = grid.parseASCII(src);

        const a = grid.leafWithLabel(g, "a");
        const b = grid.leafWithLabel(g, "b");
        const x = grid.leafWithLabel(g, "x");
        const deps = grid.constructDependencyTrees(g);

        // Increase the width of leaf `x` by two. This should induce a
        // change in the width of `z` or `w`.
        await grid.modifyWidth(g, 2, x, glpk, deps, [[a, b]]);

        const alt1 =
              "+---+-+--+\n" +
              "|   | |  |\n" +
              "+---+-+--+\n" +
              "+--------+\n" +
              "+---+--+-+\n" +
              "|   |  | |\n" +
              "+---+--+-+";

        const alt2 =
              "+---+-+--+\n" +
              "|   | |  |\n" +
              "+---+-+--+\n" +
              "+--------+\n" +
              "+-+----+-+\n" +
              "| |    | |\n" +
              "+-+----+-+";

        expect(grid.printASCII(g)).to.be.oneOf([alt1, alt2]);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;

        // Increase the width of leaf `a` by one. This should induce a
        // change in the width of `b`
        await grid.modifyWidth(g, 1, a, glpk, deps, [[a, b]]);

        const alt3 =
              "+---+-+---+\n" +
              "|   | |   |\n" +
              "+---+-+---+\n" +
              "+---------+\n" +
              "+---+--+--+\n" +
              "|   |  |  |\n" +
              "+---+--+--+";
        const alt4 =
              "+---+-+---+\n" +
              "|   | |   |\n" +
              "+---+-+---+\n" +
              "+---------+\n" +
              "+-+----+--+\n" +
              "| |    |  |\n" +
              "+-+----+--+";

        expect(grid.printASCII(g)).to.be.oneOf([alt3, alt4]);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => {
                    const nodes = grid.allNodes(g);
                    return fc.record({
                        g: fc.constant(g),
                        focus: fc.constantFrom(...nodes),
                        n: fc.integer({ min: 1, max: 5 })
                    });
                }),
                ({ g, focus, n }) => {
                    grid.modifyWidth(g, n, focus);
                    expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
                }
            )
        );
    });

});

describe("modifyHeight", () => {
    it("Can modify the height of a leaf", () => {
        const g = grid.mk(2, 3);
        grid.modifyHeight(g, 2, g);
        expect(g.dims.height).to.equal(5);
    });

    it("Can modify the height of a leaf in a small tree (1)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        grid.modifyHeight(g, 2, g.right.left);
        expect(grid.printASCII(g)).to.equal(
            "+-+---+\n" +
            "| |   |\n" +
            "| |   |\n" +
            "| +---+\n" +
            "| |   |\n" +
            "+-+---+"
        );
    });

    it("Can modify the height of a leaf in a small tree (2)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        grid.modifyHeight(g, 2, g.right.right);
        expect(grid.printASCII(g)).to.equal(
            "+-+---+\n" +
            "| +---+\n" +
            "| |   |\n" +
            "| |   |\n" +
            "| |   |\n" +
            "+-+---+"
        );
    });

    it("Can modify the height of a leaf in a small tree (3)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        grid.modifyHeight(g, 2, g.left);
        expect(grid.printASCII(g)).to.equal(
            "+-+---+\n" +
            "| |   |\n" +
            "| |   |\n" +
            "| +---+\n" +
            "| |   |\n" +
            "+-+---+"
        );
    });

    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => {
                    const nodes = grid.allNodes(g);
                    return fc.record({
                        g: fc.constant(g),
                        focus: fc.constantFrom(...nodes.map(n => n[0])),
                        n: fc.integer({ min: 1, max: 5 })
                    });
                }),
                ({ g, focus, n }) => {
                    grid.modifyHeight(g, n, focus);
                    expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
                }
            )
        );
    });
});

describe("distanceToLeftEdge", () => {
    it("Can find the distance to the left edge of a leaf", () => {
        const g = grid.mk(2, 3);
        expect(grid.distanceToLeftEdge(g, g)).to.equal(0);
    });

    it("Can find the distance to the left edge of nodes in a simple grid", () => {
        let src =
            "+-+--+---+----+\n" +
            "+-+--+---+----+"
        let g = grid.parseASCII(src);

        expect(grid.distanceToLeftEdge(g, g.left)).to.equal(0);
        expect(grid.distanceToLeftEdge(g, g.right.left)).to.equal(2);
        expect(grid.distanceToLeftEdge(g, g.right.right.left)).to.equal(5);
        expect(grid.distanceToLeftEdge(g, g.right.right.right)).to.equal(9);
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
        const left = { type: "Leaf", dims: { width: 0, height: 2 } };
        const right = { type: "Leaf", dims: { width: 3, height: 2 } };
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
        const innerRight = { type: "Leaf", dims: { width: 0, height: 3 } };
        const outerRight = { type: "Leaf", dims: { width: 4, height: 0 } };
        const survivor = { type: "Leaf", dims: { width: 4, height: 3 } };
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
        const left = { type: "Leaf", dims: { width: 0, height: 3 } };
        const right = { type: "Leaf", dims: { width: 0, height: 3 } };
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
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.true;
        expect(grid.checkLeavesAdjacent(g, b, a)).to.be.true;
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
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.true;
        expect(grid.checkLeavesAdjacent(g, b, a)).to.be.true;
    });

    it("Rejects non-adjacent leaves", () => {
        const g = grid.parseASCII(
            "+-+-+-+\n" +
            "|a|b|c|\n" +
            "+-+-+-+"
        );
        const a = grid.leafWithLabel(g, "a");
        const c = grid.leafWithLabel(g, "c");
        expect(grid.checkLeavesAdjacent(g, a, c)).to.be.false;
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
        expect(grid.checkLeavesAdjacent(g, a, b)).to.be.false;
        expect(grid.checkLeavesAdjacent(g, a, c)).to.be.false;
        expect(grid.checkLeavesAdjacent(g, b, c)).to.be.true;
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

        const g1 = grid.mergeLeaves(g, la, lb);
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

        const g1 = grid.mergeLeaves(g, lc, le);
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

        const g2 = grid.mergeLeaves(g1, lb, ld);
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

        const g3 = grid.mergeLeaves(g2, lf, lg);
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
                            const merged = grid.mergeLeaves(g, leaves[i], leaves[j]);
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

        const result = grid.splitLeafVertically(
            g, g, 2,
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
            g, g, 0,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);

        grid.splitLeafVertically(
            g, g, 2,
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

        const result = grid.splitLeafHorizontally(
            g, g, 2,
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
            g, g, 0,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);

        grid.splitLeafHorizontally(
            g, g, 3,
            () => [undefined, undefined],
        );
        expect(grid.printASCII(g)).to.equal(before);
    });
});
