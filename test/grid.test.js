import * as assert from "node:assert";
import * as grid from "../src/grid.js";

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
        const str = grid.debugPrint(grid.mk(3, 4));
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+"
        assert.equal(str, src);
    });
});

describe("debugParse", () => {
    it("Can parse a leaf", () => {
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+";
        const g = grid.debugParse(src)
        assert.deepEqual(g, {
            type: "Leaf",
            dims: { width: 3, height: 4 }
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
            partition: 2,
            dims: { width: 7, height: 3 },
            left: {
                type: "Leaf",
                dims: { width: 3, height: 3 }
            },
            right: {
                type: "Leaf",
                dims: { width: 5, height: 3 }
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
            partition: 1,
            dims: { width: 7, height: 3 },
            left: {
                type: "Leaf",
                dims: { width: 7, height: 2 }
            },
            right: {
                type: "Leaf",
                dims: { width: 7, height: 2 }
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
            partition: 2,
            dims: { width: 7, height: 4 },
            left: {
                type: "Leaf",
                dims: { width: 3, height: 4 }
            },
            right: {
                type: "Vert",
                partition: 1,
                dims: { width: 5, height: 4 },
                left: {
                    type: "Leaf",
                    dims: { width: 5, height: 2 }
                },
                right: {
                    type: "Leaf",
                    dims: { width: 5, height: 3 }
                }
            }
        });
    });
});
