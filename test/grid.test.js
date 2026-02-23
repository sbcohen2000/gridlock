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

describe("debugPrint", () => {
    it("Can print a leaf", () => {
        const act = grid.debugPrint(grid.mk(2, 3));
        const exp =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+"
        expect(act).to.equal(exp);
    });

    it("Can print a more complex tree", () => {
        const act = grid.debugPrint({
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

describe("debugParse", () => {
    it("Can parse a small leaf", () => {
        const src =
              "++\n" +
              "++";
        const g = grid.debugParse(src)
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
        const g = grid.debugParse(src)
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

        const g = grid.debugParse(src);
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

        const g = grid.debugParse(src);
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

        const g = grid.debugParse(src);
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

        const g = grid.debugParse(src);
        const a = grid.findLeafWithLabel(g, "a");
        expect(a.dims).to.deep.equal({ width: 2, height: 3 });

        const b = grid.findLeafWithLabel(g, "b");
        expect(b.dims).to.deep.equal({ width: 4, height: 2 });

        const c = grid.findLeafWithLabel(g, "c");
        expect(c).to.be.undefined;
    });

    it("It can parse trees printed by debugPrint", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g0) => {
                const src0 = grid.debugPrint(g0);
                const g1 = grid.debugParse(src0);
                const src1 = grid.debugPrint(g1);
                expect(src0).to.equal(src1);
            }),
            {
                reporter(out) {
                    if(!out.failed) return;
                    const genericErrorMessage = fc.defaultReportMessage(out);
                    const src0 = grid.debugPrint(out.counterexample[0]);
                    const g1   = grid.debugParse(src0);
                    const src1 = grid.debugPrint(g1);

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

describe("findParentChain", () => {
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
        const chain = grid.findParentChain(tree, focus);

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

        const chain = grid.findParentChain(tree, irrelevant);

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

        const g = grid.debugParse(src);
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

        const g = grid.debugParse(src);
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

        const g = grid.debugParse(src);
        await grid.modifyWidth(g, 2, g.left, glpk);
        expect(grid.debugPrint(g)).to.equal(
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

        const g = grid.debugParse(src);
        await grid.modifyWidth(g, 2, g.right.left, glpk);
        expect(grid.debugPrint(g)).to.equal(
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

        const g = grid.debugParse(src);
        await grid.modifyWidth(g, 2, g.right.right, glpk);
        expect(grid.debugPrint(g)).to.equal(
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

        const g = grid.debugParse(src);

        const a = grid.findLeafWithLabel(g, "a");
        const b = grid.findLeafWithLabel(g, "b");
        const x = grid.findLeafWithLabel(g, "x");
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

        expect(grid.debugPrint(g)).to.be.oneOf([alt1, alt2]);
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

        expect(grid.debugPrint(g)).to.be.oneOf([alt3, alt4]);
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

        const g = grid.debugParse(src);
        grid.modifyHeight(g, 2, g.right.left);
        expect(grid.debugPrint(g)).to.equal(
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

        const g = grid.debugParse(src);
        grid.modifyHeight(g, 2, g.right.right);
        expect(grid.debugPrint(g)).to.equal(
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

        const g = grid.debugParse(src);
        grid.modifyHeight(g, 2, g.left);
        expect(grid.debugPrint(g)).to.equal(
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
        let g = grid.debugParse(src);

        expect(grid.distanceToLeftEdge(g, g.left)).to.equal(0);
        expect(grid.distanceToLeftEdge(g, g.right.left)).to.equal(2);
        expect(grid.distanceToLeftEdge(g, g.right.right.left)).to.equal(5);
        expect(grid.distanceToLeftEdge(g, g.right.right.right)).to.equal(9);
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

        const g = grid.debugParse(src);
        const a = grid.findLeafWithLabel(g, "a");
        const b = grid.findLeafWithLabel(g, "b");
        const c = grid.findLeafWithLabel(g, "c");
        const d = grid.findLeafWithLabel(g, "d");

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
