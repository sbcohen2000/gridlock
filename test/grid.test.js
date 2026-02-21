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
