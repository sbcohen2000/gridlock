import * as point from "./point.js";

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
 *   tree?:   Tree<A>;
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
 * @returns {Grid<A>} A new `Grid`, identical to `g`, but sharing no
 *                    pointers with it.
 */
export function clone(g) {
    switch(g.type) {
    case "Vert":
    case "Horz": return { ...g, left: clone(g.left), right: clone(g.right) }
    case "Leaf": return { ...g }
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
export function* allNodes(g, p) {
    if(!p) {
        p = point.mkOrigin();
    }

    switch(g.type) {
    case "Vert": {
        yield [g, p];
        for(const c of allNodes(g.left, p)) {
            yield c;
        }
        for(const c of allNodes(g.right, point.offset(p, point.mkV2(0, g.left.dims.height)))) {
            yield c;
        }
    } break;
    case "Horz": {
        yield [g, p];
        for(const c of allNodes(g.left, p)) {
            yield c;
        }
        for(const c of allNodes(g.right, point.offset(p, point.mkV2(g.left.dims.width, 0)))) {
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
    return /** @type{IteratorObject<Leaf<A>>} */ (allNodes(g).flatMap(([n, _]) =>
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
    return /** @type{IteratorObject<[Leaf<A>, point.P2]>} */ (allNodes(g).flatMap((np) =>
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
export function findLeafWithLabel(g, label) {
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
 *                        which is the parent of `focus`, and the last
 *                        of which is `g`.  If `focus` is not a child
 *                        of `g`, then undefined is returned.
 */
export function findParentChain(g, focus) {
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
 * Find the position of the top-left corner of a node in the grid.
 *
 * @template A
 * @param {Grid<A>} g The grid.
 * @param {Grid<A>} focus The node we'd like to find the position of.
 * @returns {point.P2 | undefined} The position of the top-left
 *                                 corner, or `undefined` if the
 *                                 `focus`ed node couldn't be found.
 */
export function findLeafLocation(g, focus) {
    let p = point.mkOrigin();
    const chain = findParentChain(g, focus);
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
 * Modify the height of the given `Grid`, with no regard for `g`'s
 * parent.
 *
 * This is a helper of `modifyHeight`. No one should ever call this.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {number} n The amount to expand vertically.
 */
function modifySubtreeHeight(g, n) {
    switch(g.type) {
    case "Horz": {
        // Both of our children need to be expanded.
        modifySubtreeHeight(g.left, n);
        modifySubtreeHeight(g.right, n);
        g.dims.height += n;
    } break;
    case "Vert": {
        // Expand our left-side downward. This is an arbitrary
        // choice.
        modifySubtreeHeight(g.left, n);
        g.dims.height += n;
    } break;
    case "Leaf": {
        g.dims.height += n;
    } break;
    }
}

/**
 * Modify the focused `Grid`'s height.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {number} n The amount to expand vertically.
 * @param {Grid<A>} focus The grid cell to modify.
 * @returns {Grid<A>} The grid.
 */
export function modifyHeight(g, n, focus) {
    modifySubtreeHeight(focus, n);

    // Walk up the parent chain, performing repairs to the dimensions
    // along the way.
    let last = focus;
    const chain = findParentChain(g, focus);
    for(const splt of chain) {
        switch(splt.type) {
        case "Horz": {
            if(splt.left === last) {
                // We've come from the left branch. Expand the right to match.
                modifySubtreeHeight(splt.right, n);
            } else {
                // We've come from the right branch. Expand the left to match.
                modifySubtreeHeight(splt.left, n);
            }
        } break;
        case "Vert": break; // Nothing to do.
        }
        splt.dims.height += n;

        last = splt;
    }

    return g;
}

/**
 * Find the distance from the left edge of the `focus` to the left
 * margin.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {Grid<A>} focus The grid cell whose left edge we'd like to
 *                        measure.
 * @returns {number} The distance from the left edge of `focus` to the
 *                   left margin.
 */
export function distanceToLeftEdge(g, focus) {
    const chain = findParentChain(g, focus);

    let last = focus;
    let d = 0;
    for(const splt of chain) {
        switch(splt.type) {
        case "Horz": {
            // Only if we've come from the right branch should we
            // account for the distance of this `Split`'s _left_
            // child.
            if(splt.right === last) {
                d += splt.left.dims.width;
            }
        } break;
        case "Vert": break; // Nothing to do.
        }

        last = splt;
    }

    return d;
}

/**
 * @template A
 * @typedef {{
 *   children: Tree<A>[]
 *   leaf: Leaf<A>
 * }} Tree
 */

/**
 * Attach the `leaves` at every leaf of `tree`.
 *
 * @template A
 * @param {Tree<A>} tree
 * @param {Tree<A>[]} leaves
 */
function attachAtLeaves(tree, leaves) {
    if(tree.children.length === 0) {
        tree.children.push(...leaves);
    } else {
        tree.children.forEach(child => attachAtLeaves(child, leaves));
    }
}

/**
 * Construct a set of dependency trees from a `Grid`, which represent
 * the dependency between leaves needed to establish the _location of
 * the left edge_ of each leaf.
 *
 * Each leaf in `g` will be annotated with a `tree` field, which
 * records the tree node which was constructed to represent the leaf.
 *
 * @template A
 * @param {Grid<A>} g The grid whose dependency trees to generate.
 * @returns {Tree<A>[]} The dependency trees (roots are leftmost leaves).
 */
export function constructDependencyTrees(g) {
    switch(g.type) {
    case "Horz": {
        const lefts = constructDependencyTrees(g.left);
        const rights = constructDependencyTrees(g.right);

        // Right children depend on left children.
        lefts.forEach(left => {
            attachAtLeaves(left, rights);
        });
        return lefts;
    }
    case "Vert": {
        const lefts  = constructDependencyTrees(g.left);
        const rights = constructDependencyTrees(g.right);
        return lefts.concat(rights);
    }
    case "Leaf": {
        return [{ children: [], leaf: g }];
    }
    }
}

/**
 * Print a debug representation of a dependency tree.
 * @template A
 * @param {Tree<A>[]} deps
 * @returns {string}
 */
export function debugPrintDeps(deps) {
    let nextFreshId = 0;
    const freshId = () => nextFreshId++;

    /** @param {Tree<A>} t */
    const go = (t) => {
        const label = t.leaf.label ?? ("leaf" + freshId())

        if(t.children.length === 0) {
            return label;
        } else {
            return "(" + label + " " + t.children.map(go).join(" ") + ")"
        }
    };

    return deps.map(go).join("\n");
}

/**
 * Find all of the paths from root to leaf in the given `tree`.
 *
 * @template A
 * @param {Tree<A>} tree
 * @returns {Leaf<A>[][]} The paths.
 */
export function allPaths(tree) {
    if(tree.children.length === 0) {
        return [[tree.leaf]];
    }

    const paths = [];
    for(const child of tree.children) {
        const childPaths = allPaths(child);
        for(const childPath of childPaths) {
            paths.push([tree.leaf, ...childPath]);
        }
    }
    return paths;
}

/**
 * Modify the focused `Grid`'s width.
 *
 * @see constructDependencyTrees
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {number} w The amount expand horizontally.
 * @param {Grid<A>} focus The grid cell to modify.
 * @param {any} glpk The GLPK instance to use for solving.
 * @param {Tree<A>[]} [deps] A set of dependency trees recording the
 *                           horizontal positioning relationships in
 *                           the grid. If it is not provided, a
 *                           dependency tree will be generated from
 *                           scratch.
 * @param {Leaf<A>[][]} [constraints] Sets of leaves which should have
 *                                    the same relative position
 *                                    and/or same size after the width
 *                                    has been modified.
 * @returns {Promise<Grid<A>>} The grid.
 */
export async function modifyWidth(g, w, focus, glpk, deps, constraints) {
    if(deps === undefined) {
        deps = constructDependencyTrees(g);
    }

    if(constraints === undefined) {
        constraints = [];
    }

    // Step 1: Get all leaves
    const leaves = [...allLeaves(g)];
    const leafToIdx = new Map();
    leaves.forEach((leaf, idx) => leafToIdx.set(leaf, idx));

    const focusIdx = leafToIdx.get(focus);
    if(focusIdx === undefined) {
        throw new Error("Focus leaf not found in grid");
    }

    // Step 3: Build the LP problem

    // Create variable names: s_0, s_1, ..., s_n-1, e_0, e_1, ..., e_n-1
    const vars = [];
    const subjectTo = [];

    // Variables for each leaf (shift and expand)
    for(let i = 0; i < leaves.length; i++) {
        vars.push({ name: `s_${i}`, coef: 0 });
        vars.push({ name: `e_${i}`, coef: 0 });
    }

    // Constraint: s_focus = 0
    subjectTo.push({
        name: `focus_shift`,
        vars: [{ name: `s_${focusIdx}`, coef: 1 }],
        bnds: { type: glpk.GLP_FX, ub: 0, lb: 0 }
    });

    // Constraint: e_focus = n
    subjectTo.push({
        name: `focus_expand`,
        vars: [{ name: `e_${focusIdx}`, coef: 1 }],
        bnds: { type: glpk.GLP_FX, ub: w, lb: w }
    });

    // Constraint: For each connected component, and each path of the
    // connected component, sum of shifts and expansions = n
    deps.forEach((cc, ccIdx) => {
        allPaths(cc).forEach(path => {
            const pathVars = path.flatMap(leaf => {
                const idx = leafToIdx.get(leaf);
                return [ { name: `s_${idx}`, coef: 1 }, { name: `e_${idx}`, coef: 1 } ];
            });

            subjectTo.push({
                name: `cc_${ccIdx}`,
                vars: pathVars,
                bnds: { type: glpk.GLP_FX, ub: w, lb: w }
            });
        });
    });

    // Constraint: For each alignment set, shifts are equal and expansions are equal
    constraints.forEach((alignSet, setIdx) => {
        if(alignSet.length < 2) return;

        const firstIdx = leafToIdx.get(alignSet[0]);
        for(let i = 1; i < alignSet.length; i++) {
            const idx = leafToIdx.get(alignSet[i]);
            // s_first - s_i = 0
            subjectTo.push({
                name: `align_s_${setIdx}_${i}`,
                vars: [
                    { name: `s_${firstIdx}`, coef: 1 },
                    { name: `s_${idx}`, coef: -1 }
                ],
                bnds: { type: glpk.GLP_FX, ub: 0, lb: 0 }
            });
            // e_first - e_i = 0
            subjectTo.push({
                name: `align_e_${setIdx}_${i}`,
                vars: [
                    { name: `e_${firstIdx}`, coef: 1 },
                    { name: `e_${idx}`, coef: -1 }
                ],
                bnds: { type: glpk.GLP_FX, ub: 0, lb: 0 }
            });
        }
    });

    // Solve the MILP with integer variables
    const result = await glpk.solve({
        name: 'ModifyWidth',
        objective: {
            direction: glpk.GLP_MIN,
            name: 'obj',
            vars: vars
        },
        subjectTo: subjectTo,
        generals: vars.map(v => v.name)
    });

    if(result.result.status !== glpk.GLP_OPT) {
        throw new Error("invalid constraint set");
    }

    // Step 4: Apply expansions to leaves
    leaves.forEach((leaf, idx) => {
        const expand = result.result.vars[`e_${idx}`];
        if(expand > 0) {
            leaf.dims.width += expand;
        }
    });

    // Step 5: Update tree dimensions
    /** @param {Grid<A>} g */
    const updateDims = (g) => {
        switch(g.type) {
        case "Vert": {
            updateDims(g.left);
            updateDims(g.right);
            g.dims.width = g.left.dims.width;
            g.dims.height = g.left.dims.height + g.right.dims.height;
        } break;
        case "Horz": {
            updateDims(g.left);
            updateDims(g.right);
            g.dims.width = g.left.dims.width + g.right.dims.width;
            g.dims.height = g.left.dims.height;
        } break;
        case "Leaf": return;
        }
    }

    updateDims(g);
    return g;
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
        if(p.x <= g.dims.width && p.y <= g.dims.height) {
            return g;
        } else {
            return undefined;
        }
    }
    }
}
