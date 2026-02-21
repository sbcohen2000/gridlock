import * as assert from "node:assert";
import * as grid from "../src/grid.js";
import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";

describe("transposeLines", () => {
    it("Can transpose the empty list", () => {
        assert.deepEqual(
            grid.transposeLines([]),
            []
        )
    });

    it("Can transpose a list with one row", () => {
        assert.deepEqual(
            grid.transposeLines(["hello"]),
            ["h", "e", "l", "l", "o"]
        );
    });

    it("Throws on non-rectangular inputs", () => {
        assert.throws(
            () => grid.transposeLines(["hello", "friend"])
        );
    });

    it("Can transpose multi-line inputs", () => {
        assert.deepEqual(
            grid.transposeLines([ "hello",
                                  "there" ]),
            ["ht", "eh", "le", "lr", "oe" ]
        );
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
        assert.equal(act, exp);
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
        assert.equal(act, exp);

    });
});

describe("debugParse", () => {
    it("Can parse a small leaf", () => {
        const src =
              "++\n" +
              "++";
        const g = grid.debugParse(src)
        assert.deepEqual(g, {
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
        assert.deepEqual(g, {
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
        assert.deepEqual(g, {
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
        assert.deepEqual(g, {
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
        assert.deepEqual(g, {
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

    it("It can parse trees printed by debugPrint", () => {
        fc.assert(
            fc.property(arbg.grid.tree, (g0) => {
                const src0 = grid.debugPrint(g0);
                const g1 = grid.debugParse(src0);
                const src1 = grid.debugPrint(g1);
                assert.equal(src0, src1);
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
                assert.ok(grid.debugCheckGridDimsConsistency(g));
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

        assert.deepEqual(chain, [
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

        assert.deepEqual(chain, undefined);
    });
});

/**
 * Collect all nodes in a grid tree.
 */
function allNodes(g) {
    switch(g.type) {
    case "Vert":
    case "Horz": return [g, ...allNodes(g.left), ...allNodes(g.right)];
    case "Leaf": return [g];
    }
}

describe("modifyWidth", () => {
    it("Can modify the width of a leaf", () => {
        const g = grid.mk(2, 3);
        grid.modifyWidth(g, 2, g);
        assert.equal(g.dims.width, 4);
    });

    it("Can modify the width of a leaf in a small tree (1)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.debugParse(src);
        grid.modifyWidth(g, 2, g.left);
        assert.equal(
            grid.debugPrint(g),
            "+---+---+\n" +
            "|   +---+\n" +
            "|   |   |\n" +
            "+---+---+"
        );
    });

    it("Can modify the width of a leaf in a small tree (2)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.debugParse(src);
        grid.modifyWidth(g, 2, g.right.left);
        assert.equal(
            grid.debugPrint(g),
            "+-+-----+\n" +
            "| +-----+\n" +
            "| |     |\n" +
            "+-+-----+"
        );
    });

    it("Can modify the width of a leaf in a small tree (3)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.debugParse(src);
        grid.modifyWidth(g, 2, g.right.right);
        assert.equal(
            grid.debugPrint(g),
            "+-+-----+\n" +
            "| +-----+\n" +
            "| |     |\n" +
            "+-+-----+"
        );
    });

    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(
                arbg.grid.tree.chain(g => {
                    const nodes = allNodes(g);
                    return fc.record({
                        g: fc.constant(g),
                        focus: fc.constantFrom(...nodes),
                        n: fc.integer({ min: 1, max: 5 })
                    });
                }),
                ({ g, focus, n }) => {
                    grid.modifyWidth(g, n, focus);
                    assert.ok(grid.debugCheckGridDimsConsistency(g));
                }
            )
        );
    });
});

describe("modifyHeight", () => {
    it("Can modify the height of a leaf", () => {
        const g = grid.mk(2, 3);
        grid.modifyHeight(g, 2, g);
        assert.equal(g.dims.height, 5);
    });

    it("Can modify the height of a leaf in a small tree (1)", () => {
        const src =
              "+-+---+\n" +
              "| +---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.debugParse(src);
        grid.modifyHeight(g, 2, g.right.left);
        assert.equal(
            grid.debugPrint(g),
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
        assert.equal(
            grid.debugPrint(g),
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
        assert.equal(
            grid.debugPrint(g),
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
                    const nodes = allNodes(g);
                    return fc.record({
                        g: fc.constant(g),
                        focus: fc.constantFrom(...nodes),
                        n: fc.integer({ min: 1, max: 5 })
                    });
                }),
                ({ g, focus, n }) => {
                    grid.modifyHeight(g, n, focus);
                    assert.ok(grid.debugCheckGridDimsConsistency(g));
                }
            )
        );
    });
});

describe("distanceToLeftEdge", () => {
    it("Can find the distance to the left edge of a leaf", () => {
        const g = grid.mk(2, 3);
        assert.equal(grid.distanceToLeftEdge(g, g), 0);
    });

    it("Can find the distance to the left edge of nodes in a simple grid", () => {
        let src =
            "+-+--+---+----+\n" +
            "+-+--+---+----+"
        let g = grid.debugParse(src);

        assert.equal(grid.distanceToLeftEdge(g, g.left), 0);
        assert.equal(grid.distanceToLeftEdge(g, g.right.left), 2);
        assert.equal(grid.distanceToLeftEdge(g, g.right.right.left), 5);
        assert.equal(grid.distanceToLeftEdge(g, g.right.right.right), 9);
    });
});
