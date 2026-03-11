import * as point from "./point.js";
import * as rect from "./rect.js";

/**
 * @typedef {{
 *   width:  number;
 *   height: number;
 * }} Size
 */

/**
 * @template A
 * @typedef {{
 *   type:      "Vert" | "Horz";
 *   dims:      Size;
 *   left:      Grid<A>;
 *   right:     Grid<A>;
 * }} Split
 */

/**
 * @template A
 * @typedef {{
 *   type:    "Leaf";
 *   dims:    Size;
 *   label?:  string;
 *   data?:   A
 * }} Leaf
 */

/**
 * @template A
 * @typedef {Split<A> | Leaf<A>} Grid<A>;
 */

/**
 * Construct a new `GridSquare` with the provided dimensions.
 *
 * @template A
 * @param {number} width The width of the `GridSquare`.
 * @param {number} height The height of the `GridSquare`.
 * @param {A} [data] The data to associate with this leaf.
 * @returns {Leaf<A>}
 */
export function mk(width, height, data) {
    /** @type {Leaf<A>} */
    const leaf = {
        type: "Leaf",
        dims: { width, height },
    };

    if(data !== undefined) {
        leaf.data = data;
    }

    return leaf;
}

/**
 * Produce a deep-copy of a grid.
 *
 * @template A
 * @param {Grid<A>} g The grid to copy.
 * @param {(a: A) => A} [cloneData] How to clone the data at each leaf.
 * @returns {Grid<A>} A new `Grid`, identical to `g`, but sharing no
 *                    pointers with it.
 */
export function clone(g, cloneData = (a) => a) {
    switch(g.type) {
    case "Vert":
    case "Horz": return {
        ...g,
        dims: { ...g.dims },
        left: clone(g.left, cloneData),
        right: clone(g.right, cloneData)
    }
    case "Leaf": return { ...g, dims: { ...g.dims }, data: cloneData(g.data) }
    }
}

/**
 * Compute the partition point of a `Split`.
 *
 * @template A
 * @param {Split<A>} s The split whose partition to calculate.
 * @returns {number}
 */
export function partition(s) {
    return s.type === "Vert" ? s.left.dims.height : s.left.dims.width;
}

/**
 * Recalculate the dimensions of all of the `Split` nodes in a grid.
 * This function must be used with care, because it does not make any
 * effort to enforce the invariant that the child dimensions match up
 * with the parents; it forces the property to hold when you're
 * already positive that it does.
 *
 * @template A
 * @param {Grid<A>} g The grid whose intermediate dimensions to
 *     recalculate.
 */
export function recalculateSplitDimensions(g) {
    switch(g.type) {
    case "Vert": {
        recalculateSplitDimensions(g.left);
        recalculateSplitDimensions(g.right);
        g.dims.width = g.left.dims.width;
        g.dims.height = g.left.dims.height + g.right.dims.height;
    } break;
    case "Horz": {
        recalculateSplitDimensions(g.left);
        recalculateSplitDimensions(g.right);
        g.dims.width = g.left.dims.width + g.right.dims.width;
        g.dims.height = g.left.dims.height;
    } break;
    case "Leaf": return;
    }
}

/**
 * Render a grid using ASCII characters for testing and debugging
 * purposes.
 *
 * For a given grid node, the _top_ and _left_ edges belong to the
 * area of the grid, whereas the _bottom_ and _right_ edges belong
 * either to no grid or some adjacent grid node. For example, the
 * grid:
 * ```
 * +-+---+
 * | |   |
 * +-+---+
 * ```
 * Should be interpreted as having dimensions `{ width: 6, height: 2 }`,
 * even though the drawing occupies 7 columns and 4 rows. That's because
 * the bottom-most row and right-most column don't contribute to the
 * grid's height.
 *
 * It follows that the vertical partition in the grid belongs to the
 * _right_ child, not the _left_. That is, the _right_ child has a width
 * of 4 units, and the _left_ child has a width of 2 units.
 *
 * @template A
 * @param {Grid<A>} g The grid.
 * @returns {string} A string representation of the grid.
 */
export function printASCII(g) {
    // Build a 2d array of characters with the same size as the
    // dimensions of the outermost grid node.
    const chars = [];
    for(let i = 0; i <= g.dims.height; ++i) {
        const row = [];
        for(let j = 0; j <= g.dims.width; ++j) {
            row.push(' ');
        }
        chars.push(row);
    }

    /**
     * Draw a character `c` in `chars` at the position `x`, `y`.
     *
     * @param {number} x
     * @param {number} y
     * @param {string} c
     */
    const drawPoint = (x, y, c) => {
        const cur = chars[y][x];
        if(cur === "+") return;

        let cNew = c;
        switch (cur + c) {
        case "|-":
        case "-|": cNew = "+";
        }
        chars[y][x] = cNew;
    }

    /**
     * Draw a horizontal line in `chars`.
     *
     * @param {number} xBegin
     * @param {number} xEnd
     * @param {number} y
     */
    const drawHorzLine = (xBegin, xEnd, y) => {
        for(let x = xBegin; x <= xEnd; ++x) drawPoint(x, y, '-');
    }

    /**
     * Draw a vertical line in `chars`.
     *
     * @param {number} x
     * @param {number} yBegin
     * @param {number} yEnd
     */
    const drawVertLine = (x, yBegin, yEnd) => {
        for(let y = yBegin; y <= yEnd; ++y) drawPoint(x, y, '|');
    }

    /**
     * Draw a square in `chars`.
     *
     * @param {number} xBegin
     * @param {number} yBegin
     * @param {number} xEnd
     * @param {number} yEnd
     */
    const drawSquare = (xBegin, yBegin, xEnd, yEnd) => {
        drawVertLine(xBegin, yBegin, yEnd);
        drawHorzLine(xBegin, xEnd, yBegin);
        drawVertLine(xEnd, yBegin, yEnd);
        drawHorzLine(xBegin, xEnd, yEnd);
    }

    /**
     * @param {Grid<A>} g The current node in the grid.
     * @param {point.P2} topLeft The top-left corner of the current context.
     */
    const go = (g, topLeft) => {
        switch (g.type) {
        case "Vert": {
            drawHorzLine(topLeft.x, topLeft.x + g.dims.width, topLeft.y + partition(g));
            go(g.left, topLeft);
            go(g.right, point.offset(topLeft, point.mkV2(0, partition(g))));
        } break;
        case "Horz": {
            drawVertLine(topLeft.x + partition(g), topLeft.y, topLeft.y + g.dims.height);
            go(g.left, topLeft);
            go(g.right, point.offset(topLeft, point.mkV2(partition(g), 0)));
        } break;
        case "Leaf": break;
        }
    }

    go(g, point.mkOrigin());
    drawSquare(0, 0, g.dims.width, g.dims.height);

    // Produce an output string from the array.
    return chars.map(row => row.join("")).join("\n");
}

/**
 * Transpose a list of lines into a list of columns.
 *
 * @param {string[]} lines The lines to transpose
 * @returns {string[]} The columns.
 * @throws When the input is not rectangular.
 */
export function transposeLines(lines) {
    if(lines.length === 0) {
        return [];
    }

    const w = lines[0].length;
    const h = lines.length;

    const out = [];
    for(let i = 0; i < w; ++i) {
        let col = "";
        for(let j = 0; j < h; ++j) {
            if(i == 0 && lines[j].length !== w) {
                throw new Error("not rectangular");
            }
            col += lines[j][i];
        }
        out.push(col);
    }
    return out;
};

/**
 * Like `List.find`, except finds the index of the found element.
 *
 * @template A
 * @param {(a: A) => boolean} f A predicate to apply to each element
 *                              of the input list.
 * @param {A[]} as The list of `as`.
 * @param {number} [skip] If provided, skip the first `skip` matches
 *                        before returning.
 * @returns {number | undefined} The index of the first element `a`
 *                               for which `f a` returned `true`, or
 *                               `undefined` if no such element
 *                               exists.
 */
function findi(f, as, skip) {
    skip = skip ?? 0;

    for(let i = 0; i < as.length; ++i) {
        if(f(as[i])) {
            if(skip === 0) {
                return i;
            } else {
                --skip;
            }
        }
    }
    return undefined;
}

/**
 * Parse a `Grid` from a string.
 *
 * See the description in `printASCII` for how to interpret the
 * drawings that this function can parse.
 *
 * @param {string} src The source to parse.
 * @returns {Grid<void>} The parsed grid.
 * @throws If a parse error occurred.
 */
export function parseASCII(src) {
    // Match a horizontal edge in the table (a sequence of + or -
    // characters).  We use '^' and '$' to ensure that testing against
    // this regular expression will determine if the _entire_ string
    // matched.
    const horzEdgeRe = /^(?:(?:\+[-\+]*\+)|(?:\+))$/;
    const vertEdgeRe = /^(?:(?:\+[\|\+]*\+)|(?:\+))$/;

    /**
     * Ensure that the `str` matches the syntax of the given regular
     * expression.
     *
     * @param {string} str The string to match against.
     * @param {RegExp} re The regular expression to match.
     * @throws If the string doesn't match the syntax of an edge.
     */
    const expectEdge = (str, re) => {
        if(!str.match(re)) {
            throw new Error(`parse error (expected "${str}" to be an edge)`);
        }
    };

    /**
     * A recursive helper which behaves the same as parseASCII, except
     * it takes as argument a list of lines, rather than a string.
     *
     * @param {string[]} rows
     * @returns {Grid<void>}
     */
    const goLines = (rows) => {
        // The first and last lines should be edges.
        expectEdge(rows.at( 0), horzEdgeRe);
        expectEdge(rows.at(-1), horzEdgeRe);

        const columns = transposeLines(rows);
        const dims = { width: rows[0].length - 1, height: rows.length - 1 };

        // The first and last columns should be edges.
        expectEdge(columns.at( 0), vertEdgeRe);
        expectEdge(columns.at(-1), vertEdgeRe);

        // Find a partition of `lines`. It could be either horizontal
        // or vertical.
        //
        // We skip one to account for the fact that columns will begin
        // with an edge belonging to the parent frame.
        const horzPartition = findi(
            col => col.match(vertEdgeRe) !== null,
            columns.slice(0, -1), 1
        );

        if(horzPartition !== undefined) {
            const leftLines  = rows.map(row => row.slice(0, horzPartition + 1));
            const rightLines = rows.map(row => row.slice(horzPartition));

            const left  = goLines(leftLines);
            const right = goLines(rightLines);

            return {
                type: "Horz",
                dims,
                left,
                right
            }
        } else {
            // Search for a horizontal partition. We skip one to
            // account for the fact that rows' first row belongs to
            // the parent frame.
            const vertPartition = findi(
                row => row.match(horzEdgeRe) !== null,
                rows.slice(0, -1), 1
            );

            if(vertPartition === undefined) {
                // Then, there's no vertical or horizontal partition.
                // So, we have a leaf.

                // Find the inner text of the leaf so that we can look for a label.
                const text = rows
                      .slice(1, -1)
                      .map(row => row.slice(1, -1))
                      .join("")
                      .trim();

                /** @type{Leaf<void>} */
                const leaf = {
                    type: "Leaf",
                    dims
                };

                if(text !== "") {
                    leaf.label = text;
                }

                return leaf;
            }

            // See reasoning above for index offsets.
            const topLines    = rows.slice(0, vertPartition + 1);
            const bottomLines = rows.slice(vertPartition);

            const left  = goLines(topLines);
            const right = goLines(bottomLines);

            return {
                type: "Vert",
                dims,
                left,
                right
            }
        }
    };

    return goLines(src.split("\n"));
}

/**
 * Collect all nodes in a grid.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {point.P2} [p]
 * @returns {IteratorObject<[Grid<A>, point.P2]>}
 */
export function* allNodesWithPosition(g, p) {
    if(!p) {
        p = point.mkOrigin();
    }

    switch(g.type) {
    case "Vert": {
        yield [g, p];
        for(const c of allNodesWithPosition(g.left, p)) {
            yield c;
        }
        for(const c of allNodesWithPosition(g.right, point.offset(p, point.mkV2(0, g.left.dims.height)))) {
            yield c;
        }
    } break;
    case "Horz": {
        yield [g, p];
        for(const c of allNodesWithPosition(g.left, p)) {
            yield c;
        }
        for(const c of allNodesWithPosition(g.right, point.offset(p, point.mkV2(g.left.dims.width, 0)))) {
            yield c;
        }
    } break;
    case "Leaf": yield [g, p]; break;
    }
}

/**
 * Collect all leaves in a grid.
 *
 * @template A
 * @param {Grid<A>} g
 * @returns {IteratorObject<Leaf<A>>}
 */
export function allLeaves(g) {
    return /** @type{IteratorObject<Leaf<A>>} */ (allNodesWithPosition(g).flatMap(([n, _]) =>
        n.type === "Leaf" ? [n] : []));
}

/**
 * Collect all leaves in a grid, along with their global positions.
 *
 * @template A
 * @param {Grid<A>} g
 * @returns {IteratorObject<[Leaf<A>, point.P2]>}
 */
export function allLeavesWithPosition(g) {
    return /** @type{IteratorObject<[Leaf<A>, point.P2]>} */ (allNodesWithPosition(g).flatMap((np) =>
        np[0].type === "Leaf" ? [np] : []));
}

/**
 * Find the leaf node in `g` with a particular label, or return
 * `undefined` if no such leaf was found.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {string} label
 * @returns {Leaf<A> | undefined}
 */
export function leafWithLabel(g, label) {
    return allLeaves(g).find(l => l.label === label);
}

/**
 * Check that for each node in the `Grid` `g`, the dimensions of the
 * node's children sum to the dimensions of its parent.
 *
 * @template A
 * @param {Grid<A>} g The grid on which to check consistency of
 *                    dimensions.
 * @returns {boolean} `true` if the dimensions are consistent, and
 *                    `false` otherwise.
 */
export function debugCheckGridDimsConsistency(g) {
    switch(g.type) {
    case "Vert":
        return g.left.dims.width === g.right.dims.width
            && g.left.dims.width === g.dims.width
            && g.left.dims.height + g.right.dims.height === g.dims.height
            && debugCheckGridDimsConsistency(g.left)
            && debugCheckGridDimsConsistency(g.right);
    case "Horz":
        return g.left.dims.height === g.right.dims.height
            && g.left.dims.height === g.dims.height
            && g.left.dims.width + g.right.dims.width === g.dims.width
            && debugCheckGridDimsConsistency(g.left)
            && debugCheckGridDimsConsistency(g.right);
    case "Leaf": return true;
    }
}

/**
 * Find a list of `Grid`s, each element a node which must be traversed
 * to go from node `grid` to node `focus`.
 *
 * @template A
 * @param {Grid<A>} g The root of the grid.
 * @param {Grid<A>} focus The focused child of `g`.
 * @returns {Split<A>[] | undefined} A list of grids, in the first of
 *     which is the parent of `focus`, and the last of which is `g`.
 *     If `focus` is not a child of `g`, then undefined is returned.
 */
export function parentChain(g, focus) {
    /**
     * @type {Split<A>[]}
     */
    const out = [];
    /**
     * @param {Grid<A>} g
     * @returns {Split<A>[] | undefined}
     */
    const go = (g) => {
        if(g === focus) {
            return out;
        } else {
            switch(g.type) {
            case "Horz":
            case "Vert": {
                let chain = go(g.left);
                if(chain === undefined) {
                    chain = go(g.right);
                }

                if(chain !== undefined) {
                    chain.push(g);
                }
                return chain;
            }
            case "Leaf": return undefined;
            }
        }
    };
    return go(g);
}

/**
 * Test if the given node is inside the given grid.
 *
 * @template A
 * @param {Grid<A>} g     The grid.
 * @param {Grid<A>} focus The node to check is in `g`.
 * @returns {boolean}
 */
export function nodeIsInTree(g, focus) {
    return parentChain(g, focus) !== undefined;
}

/**
 * Find the position of the top-left corner of a node in the grid.
 *
 * @template A
 * @param {Grid<A>} g The grid.
 * @param {Grid<A>} focus The node we'd like to find the position of.
 * @returns {point.P2 | undefined} The position of the top-left
 *                                 corner, or `undefined` if the
 *                                 `focus`ed node couldn't be found.
 */
export function posOfLeaf(g, focus) {
    let p = point.mkOrigin();
    const chain = parentChain(g, focus);
    if(chain === undefined) {
        return undefined;
    }

    let last = focus;
    for(const split of chain) {
        if(split.right === last) {
            // We've come from the right, so we need to
            // offset `p`.
            const ofs = split.type === "Vert"
                  ? point.mkV2(0, split.left.dims.height)
                  : point.mkV2(split.left.dims.width, 0);
            p = point.offset(p, ofs);
        }

        last = split;
    }

    return p;
}

/**
 * Atomically modify the height of a list of leaves. The leaves
 * provided must span the entire horizontal width of the grid with no
 * overlap.
 *
 * This property is checked for safety.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {number}  n The amount to expand vertically.
 * @param {Leaf<A>[]} leaves The leaves whose height to modify.
 * @returns {Grid<A>} The grid.
 */
export function modifyHeightOfLeaves(g, n, leaves) {
    // Find the position of each leaf.
    /** @type {[Leaf<A>, point.P2][]} */
    const positioned = leaves.map(leaf => [leaf, posOfLeaf(g, leaf)]);

    // Sort the leaves by increasing `x` position.
    positioned.sort((a, b) => a[1].x - b[1].x);

    // Ensure that there are no gaps, and that the leaves cover the
    // entire width of the grid.
    let x = 0;
    for(const [leaf, p] of positioned) {
        if(p.x < x) {
            throw new Error("horizontally overlapping leaves passed to modifyHeightOfLeaves");
        }
        x += leaf.dims.width;

        leaf.dims.height += n;
    }

    if(x !== g.dims.width) {
        throw new Error("the leaves passed to modifyHeightOfLeaves do not cover the grid");
    }

    // Now, re-calculate the grid dimensions and return the grid.
    recalculateSplitDimensions(g);
    return g;
}

/**
 * Atomically modify the width of a list of leaves. The leaves
 * provided must span the entire vertical height of the grid with no
 * overlap.
 *
 * This property is checked for safety.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {number}  n The amount to expand horizontally.
 * @param {Leaf<A>[]} leaves The leaves whose width to modify.
 * @returns {Grid<A>} The grid.
 */
export function modifyWidthOfLeaves(g, n, leaves) {
    // Find the position of each leaf.
    /** @type {[Leaf<A>, point.P2][]} */
    const positioned = leaves.map(leaf => [leaf, posOfLeaf(g, leaf)]);

    // Sort the leaves by increasing `y` position.
    positioned.sort((a, b) => a[1].y - b[1].y);

    // Ensure that there are no gaps, and that the leaves cover the
    // entire height of the grid.
    let y = 0;
    for(const [leaf, p] of positioned) {
        if(p.y < y) {
            throw new Error("vertically overlapping leaves passed to modifyWidthOfLeaves");
        }
        y += leaf.dims.height;

        leaf.dims.width += n;
    }

    if(y !== g.dims.height) {
        throw new Error("the leaves passed to modifyWidthOfLeaves do not cover the grid");
    }

    // Now, re-calculate the grid dimensions and return the grid.
    recalculateSplitDimensions(g);
    return g;
}

/**
 * Find all of the leaves which are underneath row `y`. The leaves are
 * returned in order of ascending `x`-position.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {number} y
 * @returns {IteratorObject<Leaf<A>>}
 */
export function* leavesUnderRow(g, y) {
    switch(g.type) {
    case "Vert": {
        if(y < g.left.dims.height) {
            yield* leavesUnderRow(g.left, y);
        } else {
            yield* leavesUnderRow(g.right, y - g.left.dims.height);
        }
    } break;
    case "Horz": {
        yield* leavesUnderRow(g.left, y);
        yield* leavesUnderRow(g.right, y);
    } break;
    case "Leaf": if(y < g.dims.height) yield g; break;
    };
}

/**
 * Find all of the leaves which are underneath column `x`. The leaves are
 * returned in order of ascending `y`-position.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {number} x
 * @returns {IteratorObject<Leaf<A>>}
 */
export function* leavesUnderCol(g, x) {
    switch(g.type) {
    case "Horz": {
        if(x < g.left.dims.width) {
            yield* leavesUnderCol(g.left, x);
        } else {
            yield* leavesUnderCol(g.right, x - g.left.dims.width);
        }
    } break;
    case "Vert": {
        yield* leavesUnderCol(g.left, x);
        yield* leavesUnderCol(g.right, x);
    } break;
    case "Leaf": if(x < g.dims.width) yield g; break;
    };
}

/**
 * Find the leaf node of the grid `g` under the point `p`, or
 * `undefined` if there is no leaf underneath `p`.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {point.P2} p
 * @returns {Leaf<A> | undefined}
 */
export function leafUnderPoint(g, p) {
    switch(g.type) {
    case "Vert": {
        if(p.y < g.left.dims.height) {
            return leafUnderPoint(g.left, p);
        } else {
            return leafUnderPoint(g.right, point.offset(p, point.mkV2(0, -g.left.dims.height)))
        }
    }
    case "Horz": {
        if(p.x < g.left.dims.width) {
            return leafUnderPoint(g.left, p);
        } else {
            return leafUnderPoint(g.right, point.offset(p, point.mkV2(-g.left.dims.width, 0)))
        }
    }
    case "Leaf": {
        if(p.x >= 0 && p.y >= 0 && p.x < g.dims.width && p.y < g.dims.height) {
            return g;
        } else {
            return undefined;
        }
    }
    }
}

/**
 * Find the leaf to the left of `leaf` in `g`, if it exists.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leaf
 * @returns {Leaf<A> | undefined} The leaf to the left of `leaf`, or `undefined`
 *     if there is no leaf to the left of `leaf`.
 */
export function leafToLeftOf(g, leaf) {
    const upperLeft = posOfLeaf(g, leaf);
    const query = point.offset(upperLeft, point.mkV2(-1, 0));
    return leafUnderPoint(g, query);
}

/**
 * Find the leaf to the right of `leaf` in `g`, if it exists.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leaf
 * @returns {Leaf<A> | undefined} The leaf to the right of `leaf`, or `undefined`
 *     if there is no leaf to the right of `leaf`.
 */
export function leafToRightOf(g, leaf) {
    const upperLeft = posOfLeaf(g, leaf);
    const query = point.offset(upperLeft, point.mkV2(leaf.dims.width, 0));
    return leafUnderPoint(g, query);
}

/**
 * Find the leaf above `leaf` in `g`, if it exists.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leaf
 * @returns {Leaf<A> | undefined} The leaf above `leaf`, or `undefined`
 *     if there is no leaf above `leaf`.
 */
export function leafAbove(g, leaf) {
    const upperLeft = posOfLeaf(g, leaf);
    const query = point.offset(upperLeft, point.mkV2(0, -1));
    return leafUnderPoint(g, query);
}

/**
 * Find the leaf below `leaf` in `g`, if it exists.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leaf
 * @returns {Leaf<A> | undefined} The leaf below `leaf`, or `undefined`
 *     if there is no leaf below `leaf`.
 */
export function leafBelow(g, leaf) {
    const upperLeft = posOfLeaf(g, leaf);
    const query = point.offset(upperLeft, point.mkV2(0, leaf.dims.height));
    return leafUnderPoint(g, query);
}

/**
 * Find a rectangle encoding the global position and size of a leaf in
 * the grid.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leaf
 * @returns {rect.Rect}
 */
function rectOfLeaf(g, leaf) {
    const pos = posOfLeaf(g, leaf);
    return {
        left: pos.x,
        top: pos.y,
        right: pos.x + leaf.dims.width,
        bottom: pos.y + leaf.dims.height
    };
}

/**
 * Find a positioned rectangle which covers all of the leaves.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {IteratorObject<Leaf<A>>} leaves
 * @returns {rect.Rect | undefined}
 */
export function outerRectangleOfLeaves(g, leaves) {
    const rects = leaves.map(leaf => rectOfLeaf(g, leaf));
    return rect.unions(...rects);
}

/**
 * Check if the rectangle covers the given leaves with no gaps.
 *
 * Note that this  function doesn't check that the  given rectangle is
 * over  top of  the  leaves. (Since  if you  got  the rectangle  with
 * `outerRectangleOfLeaves`, then the rectangle  will have the correct
 * position and dimension.)
 *
 * @template A
 * @param {Grid<A>} g
 * @param {IteratorObject<Leaf<A>>} leaves
 * @param {rect.Rect} r
 * @returns {boolean}
 */
export function rectangleCoversLeaves(g, leaves, r) {
    const rects = leaves.map(leaf => rectOfLeaf(g, leaf));
    const totalArea = rects.reduce((area, r) => area + rect.area(r), 0);
    return rect.area(r) === totalArea;
}

/**
 * Remove from the grid all leaf nodes which have zero width or
 * height.
 *
 * @template A
 * @param {Grid<A>} g The grid whose empty leaves to remove.
 * @returns {[Grid<A> | undefined, Leaf<A>[]]} The new grid, along with a list of
 *                                             the removed leaves.
 */
export function removeEmptyLeaves(g) {
    switch(g.type) {
    case "Vert":
    case "Horz": {
        const [left,   removedFromLeft] = removeEmptyLeaves(g.left);
        const [right, removedFromRight] = removeEmptyLeaves(g.right);
        const allRemoved = removedFromLeft.concat(removedFromRight);

        if(!left) {
            return [right, allRemoved];
        }

        if(!right) {
            return [left, allRemoved];
        }

        return [{...g, left, right}, allRemoved];
    }
    case "Leaf": {
        if(g.dims.width === 0 || g.dims.height === 0) {
            return [undefined, [g]];
        } else {
            return [g, []];
        }
    }
    }
}

/**
 * @template A
 * @typedef {{ upperLeft: point.P2, len: number, leaf: Leaf<A> }} Sweep
 */

/**
 * Return an offset and two lists, the elements upto but not including
 * a subsequence with equal `ofs` and `len` summing to `sum`, and the
 * elements after.
 *
 * If `skip` is provided, `skip` the first `skip` matches.
 *
 * If no such subsequence was found, the function returns `undefined`.
 *
 * Do not call this function. It is exported only for testing.
 *
 * @template A
 * @param {Sweep<A>[]} sweeps
 * @param {number} sum
 * @param {keyof point.P2} on
 * @param {number} [skip]
 * @returns {[number, Sweep<A>[], Sweep<A>[]] | undefined}
 */
export function searchSweepEvents(sweeps, sum, on, skip) {
    if(!skip) {
        skip = 0;
    }

    let cumSum = 0;
    let runLen = 0;

    for(let i = 0; i < sweeps.length; ++i) {
        cumSum += sweeps[i].len;

        if(cumSum === sum) {
            if(skip === 0) {
                return [
                    sweeps[i].upperLeft[on],
                    sweeps.slice(0, i - runLen),
                    sweeps.slice(i - runLen)
                ];
            } else {
                // Reset.
                runLen = 0;
                cumSum = 0;
            }
            --skip;
        }

        if(i === sweeps.length - 1) {
            // If we're at the last element and we didn't just return
            // from hitting the target sum, there's no hope for us.
            return undefined;
        }

        if(sweeps[i].upperLeft[on] === sweeps[i + 1].upperLeft[on]) {
            // The next sweep has the same offset. We can increase the
            // run length.
            ++runLen;
        } else {
            // The next sweep has a different offset. So, reset the
            // run length.
            runLen = 0;
            cumSum = 0;
        }
    }

    return undefined;
}

/**
 * Compile left-to-right and up-to-down sweep events from the given
 * list of `leaves`.
 *
 * Do not call this function. It is exported only for testing.
 *
 * @template A
 * @param {IteratorObject<[Leaf<A>, point.P2]>} leaves
 * @returns {{ lrSweeps: Sweep<A>[], udSweeps: Sweep<A>[] }}
 */
export function compileSweepEvents(leaves) {
    /**
     * @param {keyof point.P2} on
     * @returns {(a: Sweep<A>, b: Sweep<A>) => number}
     */
    const cmpSweepEvents = (on) => {
        let other = on === "x" ? "y" : "x";
        return (a, b) => {
            if(a.upperLeft[on] === b.upperLeft[on]) {
                return a.upperLeft[other] - b.upperLeft[other];
            }
            return a.upperLeft[on] - b.upperLeft[on];
        }
    };

    /**
     * One sweep event for each left-edge of every leaf in `leaves`.
     * @type {Sweep<A>[]}
     */
    const lrSweeps = [];

    /**
     * One sweep event for each top-edge of every leaf in `leaves`.
     * @type {Sweep<A>[]}
     */
    const udSweeps = [];

    // Construct sweep events.
    for(const [leaf, upperLeft] of leaves) {
        lrSweeps.push({ upperLeft, len: leaf.dims.height, leaf });
        udSweeps.push({ upperLeft, len: leaf.dims.width,  leaf });
    }

    // Sort sweep events.
    lrSweeps.sort(cmpSweepEvents("x"));
    udSweeps.sort(cmpSweepEvents("y"));

    return { lrSweeps, udSweeps };
}

/**
 * Re-"parse" the given list of positioned leaves into a `Grid`. It is
 * assumed that the leaves, when arranged on the plane, form a square
 * with the provided dimensions.
 *
 * Do not call this function. It is exported only for testing.
 *
 * @template A
 * @param {IteratorObject<[Leaf<A>, point.P2]>} leaves
 * @param {number} width  The width of the square formed by `leaves`.
 * @param {number} height The height of the square formed by `leaves`.
 * @returns {Grid<A>}
 */
export function reassociateLeaves(leaves, width, height) {
    const { lrSweeps, udSweeps } = compileSweepEvents(leaves);

    /**
     * @param {Sweep<A>[]} lrSweeps
     * @param {Sweep<A>[]} udSweeps
     * @param {number} w Width of the sub-region.
     * @param {number} h Height of the sub-region.
     * @returns {Grid<A>}
     */
    const go = (lrSweeps, udSweeps, w, h) => {
        if(lrSweeps.length !== udSweeps.length) {
            throw new Error("Assertion failure. LR and UD sweeps have different lengths!");
        }

        if(lrSweeps.length === 1) {
            // If we're down to one sweep event, emit the leaf.
            return lrSweeps[0].leaf;
        }

        // First, check for a set of `horzSweeps` all with the same
        // value.
        const lrPartition = searchSweepEvents(lrSweeps, h, "x", 1);
        if(lrPartition !== undefined) {
            const [x, leftOfPartLR, rightOfPartLR] = lrPartition;

            // Find the ud sweep events to the left and right of the
            // partition.
            const leftOfPartUD  = udSweeps.filter(swp => swp.upperLeft.x <  x);
            const rightOfPartUD = udSweeps.filter(swp => swp.upperLeft.x >= x);

            const leftWidth  = x - lrSweeps[0].upperLeft.x;
            const rightWidth = w - leftWidth;

            const leftSubtree  = go(leftOfPartLR, leftOfPartUD, leftWidth, h);
            const rightSubtree = go(rightOfPartLR, rightOfPartUD, rightWidth, h);

            return {
                type: "Horz",
                left: leftSubtree,
                right: rightSubtree,
                dims: {
                    width: leftSubtree.dims.width + rightSubtree.dims.width,
                    height: leftSubtree.dims.height // rightSubtree.dims.height must be the same.
                }
            }
        } else {
            // Check for a set of `vertSweeps` all with the same value.
            const udPartition = searchSweepEvents(udSweeps, w, "y", 1);

            if(udPartition !== undefined) {
                const [y, abovePartUD, belowPartUD] = udPartition;

                // Find the lr sweep events above and below the partition.
                const abovePartLR = lrSweeps.filter(swp => swp.upperLeft.y <  y);
                const belowPartLR = lrSweeps.filter(swp => swp.upperLeft.y >= y);

                const aboveHeight = y - udSweeps[0].upperLeft.y;
                const belowHeight = h - aboveHeight;

                const aboveSubtree = go(abovePartLR, abovePartUD, w, aboveHeight);
                const belowSubtree = go(belowPartLR, belowPartUD, w, belowHeight);

                return {
                    type: "Vert",
                    left: aboveSubtree,
                    right: belowSubtree,
                    dims: {
                        width: aboveSubtree.dims.width, // belowSubtree.dims.width must be the same.
                        height: aboveSubtree.dims.height + belowSubtree.dims.height
                    }
                }
            } else {
                // The leaves could not be parsed as a binary
                // partition.
                throw new Error("invalid leaf arrangement");
            }
        }
    }

    return go(lrSweeps, udSweeps, width, height);
}

/**
 * @typedef {"AAboveB" | "ABelowB" | "ALeftOfB" | "ARightOfB"} LeafAdjacency
 */

/**
 * Check that two leaves, annotated with their positions, are adjacent
 * in the grid. Two leaves are adjacent if they are touching along an
 * edge, and along the edge that they touch they have the same
 * dimension.
 *
 * @template A
 * @param {[Leaf<A>, point.P2]} a The first leaf.
 * @param {[Leaf<A>, point.P2]} b The second leaf.
 * @returns {LeafAdjacency | null}
 */
function _checkLeavesAdjacent([leafA, leafALoc], [leafB, leafBLoc]) {
    if(leafALoc.x === leafBLoc.x && leafA.dims.width === leafB.dims.width) {
        // Then, the leaves are potentially aligned vertically.
        if(leafALoc.y + leafA.dims.height === leafBLoc.y) {
            return "AAboveB";
        } else if(leafALoc.y - leafB.dims.height === leafBLoc.y) {
            return "ABelowB";
        }
    }

    if(leafALoc.y === leafBLoc.y && leafA.dims.height === leafB.dims.height) {
        // Then, the leaves are potentially aligned horizontally.
        if(leafALoc.x + leafA.dims.width === leafBLoc.x) {
            return "ALeftOfB";
        } else if (leafALoc.x - leafB.dims.width === leafBLoc.x) {
            return "ARightOfB";
        }
    }

    return null;
}

/**
 * Check that two leaves are adjacent in the grid. Two leaves are
 * adjacent if they are touching along an edge, and along the edge
 * that they touch they have the same dimension.
 *
 * @template A
 * @param {Grid<A>} g The grid.
 * @param {Leaf<A>} a The first leaf.
 * @param {Leaf<A>} b The second leaf.
 * @returns {LeafAdjacency | null}
 */
export function checkLeavesAdjacent(g, a, b) {
    const aLoc = posOfLeaf(g, a);
    const bLoc = posOfLeaf(g, b);
    return _checkLeavesAdjacent([a, aLoc], [b, bLoc]);
}

/**
 * Given references to two leaves which must be adjacent and have the
 * same dimension along their adjacent edge, return a new graph which
 * has merged the two leaves into one.
 *
 * If the leaves aren't adjacent, the grid is returned unchanged.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} leafA The first leaf.
 * @param {Leaf<A>} leafB The second leaf.
 * @param {(a: A, b: A) => A} [mergeData] How to merge the data of
 *     `leafA` and `leafB`. If omitted, the data of `leafA` is kept,
 *     while the data of `leafB` is discarded.
 * @param {(a: string, b: string) => string} [mergeLabel] How to merge
 *     the labels of `leafA` and `leafB`. If omitted, the label of
 *     `leafA` is kept, while the label of `leafB` is discarded.
 * @returns {[Leaf<A> | null, Grid<A>]} The new leaf, and the new grid.
 */
export function mergeLeaves(g, leafA, leafB, mergeData, mergeLabel) {
    if(!mergeData) {
        mergeData = (a, _) => a;
    }

    if(!mergeLabel) {
        mergeLabel = (a, _) => a;
    }

    const leafALoc = posOfLeaf(g, leafA);
    const leafBLoc = posOfLeaf(g, leafB);

    if(!_checkLeavesAdjacent([leafA, leafALoc], [leafB, leafBLoc])) {
        return [null, g];
    }

    const newLeafUpperLeft = point.mkP2(
        Math.min(leafALoc.x, leafBLoc.x),
        Math.min(leafALoc.y, leafBLoc.y)
    );

    const newLeafLowerRight = point.mkP2(
        Math.max(leafALoc.x + leafA.dims.width, leafBLoc.x + leafB.dims.width),
        Math.max(leafALoc.y + leafA.dims.height, leafBLoc.y + leafB.dims.height)
    );

    /** @type { Leaf<A> } */
    const newLeaf = {
        type: "Leaf",
        dims: {
            width: newLeafLowerRight.x - newLeafUpperLeft.x,
            height: newLeafLowerRight.y - newLeafUpperLeft.y
        },
        data: mergeData(leafA.data, leafB.data),
        label: mergeLabel(leafA.label, leafB.label),
    };

    // TODO: As an optimization, it might be better to find the lowest
    // common ancestor of the leaves, and re-associate leaves only on
    // that ancestor, rather than the entire grid.

    // Filter out `leafA` and `leafB`.n
    let leaves = [...allLeavesWithPosition(g).filter(([leaf, _]) => leaf !== leafA && leaf !== leafB)];
    leaves.push([newLeaf, newLeafUpperLeft]);

    return [newLeaf, reassociateLeaves(leaves.values(), g.dims.width, g.dims.height)];
}

/**
 * Split the `focus`ed leaf in the grid `g` at `row`. This function
 * only modifies the grid if `row` is greater than zero, and less than
 * the height of the focused leaf (since otherwise, one of the
 * offshoots would have no height).
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} focus
 * @param {number} row
 * @param {(a: A) => [A, A]} splitData How should the data of the
 *     focused leaf be split between the offshoots?
 * @param {(a: string) => [string, string]} [splitLabel] How should
 *     the label of the leaf be split between the offshoots? If
 *     omitted, the default duplicates the label.
 * @returns {[Grid<A> | null, Grid<A>]} The new parent node, and the new grid.
 */
export function splitLeafVertically(g, focus, row, splitData, splitLabel) {
    if(!splitLabel) {
        splitLabel = (label) => [label, label];
    }

    if(row <= 0 || row >= focus.dims.height) {
        return [null, g];
    }

    /** @type {Leaf<A>} */
    const top = {
        type: "Leaf",
        dims: { width: focus.dims.width, height: row },
    };
    /** @type {Leaf<A>} */
    const bottom = {
        type: "Leaf",
        dims: { width: focus.dims.width, height: focus.dims.height - row }
    };

    if(focus.data !== undefined) {
        const [topData, bottomData] = splitData(focus.data);
        top.data = topData;
        bottom.data = bottomData;
    }

    if(focus.label !== undefined) {
        const [topLabel, bottomLabel] = splitLabel(focus.label);
        top.label = topLabel;
        bottom.label = bottomLabel;
    }

    /** @type {Split<A>} */
    const newNode = {
        type: "Vert",
        left: top,
        right: bottom,
        dims: {...focus.dims}
    };

    const chain = parentChain(g, focus);

    if(chain.length === 0) {
        // If `focus` is the root, then we simply construct a new root
        // and return it.
        return [newNode, newNode];
    } else {
        const parent = chain[0];
        if(parent.left === focus) {
            // Replace the left child.
            parent.left = newNode;
        } else {
            // Replace the right child.
            parent.right = newNode;
        }
    }

    return [newNode, g];
}

/**
 * Split the `focus`ed leaf in the grid `g` at `col`. This function
 * only modifies the grid if `col` is greater than zero, and less than
 * the width of the focused leaf (since otherwise, one of the
 * offshoots would have no width).
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>} focus
 * @param {number} col
 * @param {(a: A) => [A, A]} splitData How should the data of the
 *     focused leaf be split between the offshoots?
 * @param {(a: string) => [string, string]} [splitLabel] How should
 *     the label of the leaf be split between the offshoots? If
 *     omitted, the default duplicates the label.
 * @returns {[Grid<A> | null, Grid<A>]} The new parent node, and the new grid.
 */
export function splitLeafHorizontally(g, focus, col, splitData, splitLabel) {
    if(!splitLabel) {
        splitLabel = (label) => [label, label];
    }

    if(col <= 0 || col >= focus.dims.width) {
        return [null, g];
    }

    /** @type {Leaf<A>} */
    const left = {
        type: "Leaf",
        dims: { width: col, height: focus.dims.height },
    };
    /** @type {Leaf<A>} */
    const right = {
        type: "Leaf",
        dims: { width: focus.dims.width - col, height: focus.dims.height }
    };

    if(focus.data !== undefined) {
        const [leftData, rightData] = splitData(focus.data);
        left.data = leftData;
        right.data = rightData;
    }

    if(focus.label !== undefined) {
        const [leftLabel, rightLabel] = splitLabel(focus.label);
        left.label = leftLabel;
        right.label = rightLabel;
    }

    /** @type {Split<A>} */
    const newNode = {
        type: "Horz",
        left: left,
        right: right,
        dims: {...focus.dims}
    };

    const chain = parentChain(g, focus);

    if(chain.length === 0) {
        return [newNode, newNode];
    } else {
        const parent = chain[0];
        if(parent.left === focus) {
            parent.left = newNode;
        } else {
            parent.right = newNode;
        }
    }

    return [newNode, g];
}
