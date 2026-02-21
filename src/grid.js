import * as point from "./point.js";

/**
 * @typedef {{
 *   width:  number;
 *   height: number;
 * }} Size
 */

/**
 * @typedef {{
 *   type:      "Vert" | "Horz";
 *   dims:      Size;
 *   left:      Grid;
 *   right:     Grid;
 * }} Split
 */

/**
 * @typedef {{
 *   type:    "Leaf";
 *   dims:    Size;
 * }} Leaf
 */

/**
 * @typedef {Split | Leaf} Grid;
 */

/**
 * Construct a new `GridSquare` with the provided dimensions.
 *
 * @param {number} width The width of the `GridSquare`.
 * @param {number} height The height of the `GridSquare`.
 * @returns {Grid}
 */
export function mk(width, height) {
    return {
        type: "Leaf",
        dims: { width, height }
    }
}

/**
 * Compute the partition point of a `Split`.
 *
 * @param {Split} s The split whose partition to calculate.
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
 * @param {Grid} g The grid.
 * @returns {string} A string representation of the grid.
 */
export function debugPrint(g) {
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
     * @param {Grid} g The current node in the grid.
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
 * See the description in `debugPrint` for how to interpret the
 * drawings that this function can parse.
 *
 * @param {string} src The source to parse.
 * @returns {Grid} The parsed grid.
 * @throws If a parse error occurred.
 */
export function debugParse(src) {
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
     * A recursive helper which behaves the same as debugParse, except
     * it takes as argument a list of lines, rather than a string.
     *
     * @param {string[]} rows
     * @returns {Grid}
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
                return {
                    type: "Leaf",
                    dims
                }
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
 * Check that for each node in the `Grid` `g`, the dimensions of the
 * node's children sum to the dimensions of its parent.
 *
 * @param {Grid} g The grid on which to check consistency of
 *                 dimensions.
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

