import * as fc from "fast-check";
import * as g from "../src/grid.js";

/**
 * Construct a new leaf node with the given width and height.
 *
 * @param {number} w The width of the leaf node.
 * @param {number} h The height of the leaf node.
 * @returns {g.Leaf<void>}
 */
function leaf(w, h) {
    return {
        type: "Leaf",
        dims: { width: w, height: h }
    }
}

/**
 * Join two grids horizontally, even if they have different heights.
 *
 * @param {g.Grid<void>} left
 * @param {g.Grid<void>} right
 * @returns {fc.Arbitrary<g.Grid<void>>}
 */
function joinH(left, right) {
    if(left.dims.height === right.dims.height) {
        // Then, we can directly
        // horizontally concatenate the two
        // sublayouts.

        return fc.constant({
            type: "Horz",
            dims: {
                width: left.dims.width + right.dims.width,
                height: left.dims.height
            },
            left,
            right
        });
    } else {
        // We need to introduce a leaf to
        // make the left and right subtrees
        // have the same height.

        const smaller = left.dims.height < right.dims.height ? left : right;
        const larger  = left.dims.height < right.dims.height ? right : left;
        const dh = larger.dims.height - smaller.dims.height;

        return fc.constant({
            type: "Horz",
            dims: {
                width: smaller.dims.width + larger.dims.width,
                height: larger.dims.height
            },
            left: {
                type: "Vert",
                dims: {
                    width: smaller.dims.width,
                    height: larger.dims.height
                },
                left: smaller,
                right: leaf(smaller.dims.width, dh)
            },
            right: larger
        });
    }

}

/**
 * Join two grids vertically, even if they have different widths.
 *
 * @param {g.Grid<void>} left
 * @param {g.Grid<void>} right
 * @returns {fc.Arbitrary<g.Grid<void>>}
 */
function joinV(left, right) {
    if(left.dims.width === right.dims.width) {
        // Then, we can directly vertically
        // concatenate the two sublayouts.

        return fc.constant({
            type: "Vert",
            dims: {
                width: left.dims.width,
                height: left.dims.height + right.dims.height
            },
            left,
            right
        });
    } else {
        // We need to introduce a leaf to
        // make the left and right subtrees
        // have the same width.

        const smaller = left.dims.width < right.dims.width ? left : right;
        const larger  = left.dims.width < right.dims.width ? right : left;
        const dw = larger.dims.width - smaller.dims.width;

        return fc.constant({
            type: "Vert",
            dims: {
                width: larger.dims.width,
                height: smaller.dims.height + larger.dims.height
            },
            left: {
                type: "Horz",
                dims: {
                    width: larger.dims.width,
                    height: smaller.dims.height
                },
                left: smaller,
                right: leaf(dw, smaller.dims.height)
            },
            right: larger
        });
    }
}

export const grid = fc.letrec((tie) => ({
    tree: fc.oneof({ depthSize: "small", withCrossShrink: true }, tie("leaf"), tie("node")),
    node: tie("tree")
        .chain(left => tie("tree")
               .chain(right => fc.oneof(fc.constant("Vert"), fc.constant("Horz"))
                      .chain(type =>
                          type === "Vert" ? joinV(left, right) : joinH(left, right)))),
    leaf: fc.record({
        type: fc.constant("Leaf"),
        dims: fc.record({
            width: fc.integer({ min: 1, max: 10 }),
            height: fc.integer({ min: 1, max: 10 })
        })
    })
}));

async function main() {
    const printer = await import("../src/grid.js");
    const samples = fc.sample(grid.tree, { numRuns: 5 });

    let i = 0;
    for (const sample of samples) {
        console.log(`== Sample ${++i} =======================`);
        console.log(printer.printASCII(sample));
    }
}

if (import.meta.main) {
    main();
}
