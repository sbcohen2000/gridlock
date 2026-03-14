import * as point from "./point.js";
import * as rect from "./rect.js";

interface Grid<A> {
    type: "Grid";
    rows: Row<A>[];
}

interface Row<A> {
    type: "Row";
    height: number;
    cells: Cell<A>[];
}

interface Cell<A> {
    type: "Cell";
    width: number;
    label?: string;
    data?: A;
};

type AnyGridObj<A> = Grid<A> | Row<A> | Cell<A>;

type GridObjOfType<A, K extends AnyGridObj<A>["type"]> = K extends "Grid" ? Grid<A> : (K extends "Row" ? Row<A> : Cell<A>);

/**
 * Construct a new `Grid` with the provided dimensions.
 *
 * @template A
 * @param width The width of the `GridSquare`.
 * @param height The height of the `GridSquare`.
 * @param [data] The data to associate with this cell.
 * @param [label] The label to associate with this cell.
 */
export function mk<A>(width: number, height: number, data?: A, label?: string): Grid<A> {
    const extras = { data, label };

    return {
        type: "Grid",
        rows: [
            {
                type: "Row",
                height,
                cells: [{ type: "Cell", width }],
                ...extras
            }
        ]
    }
}

/**
 * Find a positioned rectangle which covers the grid.
 *
 * @param g The grid.
 * @returns A rectangle covering the grid.
 */
export function rectOfGrid<A>(g: Grid<A>): rect.Rect {
    const firstCell = g.rows[0].cells[0];
    const lastCell  = g.rows.at(-1).cells.at(-1);
    return rect.unions(rectOfCell(g, firstCell), rectOfCell(g, lastCell));
}

/**
 * Find a positioned rectangle which covers the given row.
 *
 * @param g The grid.
 * @param row The row whose position and size to find.
 */
export function rectOfRow<A>(g: Grid<A>, row: Row<A>): rect.Rect {
    const firstCell = row.cells[0];
    const lastCell  = row.cells.at(-1);
    return rect.unions(rectOfCell(g, firstCell), rectOfCell(g, lastCell));
}

/**
 * Find a positioned rectangle which covers the given cell.
 *
 * @param g The grid.
 * @param cell The cell whose position and size to find.
 */
export function rectOfCell<A>(g: Grid<A>, cell: Cell<A>): rect.Rect {
    const path = pathToCell(g, cell);
    let yTop = 0;
    for(let i = 0; i < path.row; ++i) {
        yTop += g.rows[i].height;
    }

    const theRow = g.rows[path.row];
    let xLeft = 0;
    for(let i = 0; i < path.col; ++i) {
        xLeft += theRow.cells[i].width;
    }
    const theCell = theRow.cells[path.col];

    return {
        left: xLeft,
        top: yTop,
        right: xLeft + theCell.width,
        bottom: yTop + theRow.height
    };
}

/**
 * Produce a deep-copy of a grid.
 *
 * @template A
 * @param g The grid to copy.
 * @param [cloneData] How to clone the data at each leaf.
 * @returns A new `Grid`, identical to `g`, but sharing no
 *     pointers with it.
 */
export function clone<A>(g: Grid<A>, cloneData: ((a: A) => A) = (a) => a): Grid<A> {
    throw new Error("TODO");
}

/**
 * Produce a deep-copy of a grid, mapping a list of cells that we care
 * about through the clone. That is, this function operates as an
 * identity on both of its arguments, but of course, the arguments and
 * the results will not be equal by reference, only by structure.
 *
 * The `nodes` passed to this function must occur in `g`. Otherwise,
 * an error is thrown.
 *
 * @template A
 * @param g The grid to copy.
 * @param rows The rows to pass through.
 * @param cells The cells to pass through.
 * @returns The new grid, along with the passed-through rows and cells.
 */
export function cloneMappingNodes<A>(
    g: Grid<A>, rows: Row<A>[] = [],
    cells: Cell<A>[] = [],
    cloneData: ((a: A) => A) = (a) => a
): { rows: Row<A>[], cells: Cell<A>[], g: Grid<A> } {
    const rowPaths  = rows.map(row => pathToRow(g, row));
    const cellPaths = cells.map(cell => pathToCell(g, cell));

    // Clone g.
    const newG = clone(g, cloneData);

    // Find the new identity of the input nodes.
    return {
        rows: rowPaths.map(path => evaluatePath(newG, path!)!),
        cells: cellPaths.map(path => evaluatePath(newG, path!)!),
        g: newG
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
 * @param g The grid.
 * @returns A string representation of the grid.
 */
export function printASCII<A>(g: Grid<A>): string {
    const outerRect = rectOfGrid(g);

    // Build a 2d array of characters with the same size as the
    // dimensions of the outermost grid node.
    const chars = [];
    for(let i = 0; i <= rect.height(outerRect); ++i) {
        const row = [];
        for(let j = 0; j <= rect.width(outerRect); ++j) {
            row.push(' ');
        }
        chars.push(row);
    }

    /**
     * Draw a character `c` in `chars` at the position `x`, `y`.
     */
    const drawPoint = (x: number, y: number, c: string) => {
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
     */
    const drawHorzLine = (xBegin: number, xEnd: number, y: number) => {
        for(let x = xBegin; x <= xEnd; ++x) drawPoint(x, y, '-');
    }

    /**
     * Draw a vertical line in `chars`.
     */
    const drawVertLine = (x: number, yBegin: number, yEnd: number) => {
        for(let y = yBegin; y <= yEnd; ++y) drawPoint(x, y, '|');
    }

    /**
     * Draw a square in `chars`.
     */
    const drawRect = (r: rect.Rect) => {
        drawVertLine(r.left, r.top, r.right);
        drawHorzLine(r.left, r.right, r.top);
        drawVertLine(r.right, r.top, r.bottom);
        drawHorzLine(r.left, r.right, r.bottom);
    }

    let y = 0;
    for(const row of g.rows) {
        let x = 0;
        for(const cell of row.cells) {
            drawVertLine(x, y, y + row.height);
            x += cell.width;
        }
        drawHorzLine(0, rect.width(outerRect), y);
        y += row.height;
    }

    drawRect(outerRect);

    // Produce an output string from the array.
    return chars.map(row => row.join("")).join("\n");
}

/**
 * Transpose a list of lines into a list of columns.
 *
 * @param lines The lines to transpose
 * @returns The columns.
 * @throws When the input is not rectangular.
 */
export function transposeLines(lines: string[]): string[] {
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
 * Collect all nodes in a grid.
 *
 * @template A
 * @param {Grid<A>} g
 * @returns {IteratorObject<Grid<A>>}
 */
export function allNodes(g) {
    return allNodesWithPosition(g).map(([n, _]) => n);
}

/**
 * Collect all leaves in a grid.
 *
 * @template A
 * @param {Grid<A>} g
 * @returns {IteratorObject<Leaf<A>>}
 */
export function allLeaves(g) {
    return allNodes(g).filter(n => n.type === "Leaf");
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
 * A path from root to a row or leaf in a grid.
 */
type Path<A, K extends AnyGridObj<A>["type"]> =
  K extends "Grid" ? { kind: "Grid" }
  : (K extends "Row" ? { kind: "Row", row: number }
  : { kind: "Cell", row: number, col: number });

/**
 * Find the path to the given row in the grid.
 *
 * @param g The grid
 * @param row The row.
 * @returns A path, or `undefined` if the `cell` couldn't be found in `g`.
 */
export function pathToRow<A>(g: Grid<A>, row: Row<A>): Path<A, "Row"> | undefined {
    throw new Error("TODO");
}

/**
 * Find the path to the given cell in the grid.
 *
 * @param g The grid
 * @param cell The cell.
 * @returns A path, or `undefined` if the `cell` couldn't be found in `g`.
 */
export function pathToCell<A>(g: Grid<A>, cell: Cell<A>): Path<A, "Cell"> | undefined {
    throw new Error("TODO");
}

/**
 * Evaluate a `path` in grid `g`.
 *
 * @template A
 * @param {Grid<A>} g The grid
 * @param {GridPath} path The path to evaluate.
 * @returns The element that the path refers to, or `undefined`
 *     if the path isn't valid for this grid.
 */
export function evaluatePath<A, K extends AnyGridObj<A>["type"]>(
    g: Grid<A>,
    path: Path<A, K>
): GridObjOfType<A, K> | undefined {
    throw new Error("TODO");
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
 * Given references to leaves which must form a rectangle, return a
 * new graph which has merged the given leaves into one.
 *
 * @template A
 * @param {Grid<A>} g
 * @param {Leaf<A>[]} leaves The leaves to merge.
 * @param {A} data The data of this new leaf.
 * @param {string} [label] The label of this new leaf.
 * @returns {[Leaf<A>, Grid<A>]} The new leaf, and the new grid.
 */
export function mergeLeaves(g, leaves, data, label) {

    const r = outerRectangleOfLeaves(g, leaves.values());
    if(!rectangleCoversLeaves(g, leaves.values(), r)) {
        throw new Error("leaves cannot be merged");
    }

    const newLeafUpperLeft = rect.upperLeft(r);

    /** @type { Leaf<A> } */
    const newLeaf = {
        type: "Leaf",
        dims: {
            width: rect.width(r),
            height: rect.height(r)
        },
        data
    };

    if(label !== undefined) {
        newLeaf.label = label;
    }

    // TODO: As an optimization, it might be better to find the lowest
    // common ancestor of the leaves, and re-associate leaves only on
    // that ancestor, rather than the entire grid.

    // Filter out the old leaves.
    const newLeaves = [...allLeavesWithPosition(g).filter(([leaf, _]) => {
        return leaves.indexOf(leaf) === -1;
    })];

    newLeaves.push([newLeaf, newLeafUpperLeft]);

    return [newLeaf, reassociateLeaves(newLeaves.values(), g.dims.width, g.dims.height)];
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
