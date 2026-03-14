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
 * Given a list of lines, parse them into a `Cell`.
 *
 * @param lines The lines.
 * @returns The parsed cell.
 * @throws If a parse error occured
 */
function parseCell(lines: string[]): Cell<void> {
    const width = lines.reduce((len, line) => Math.max(len, line.length), 0);
    const label = lines.map(line => line.trimEnd()).join("\n").trim();
    const cell: Cell<void> = {
        type: "Cell",
        width,
    };

    if(label !== "") {
        cell.label = label;
    }

    return cell;
}

/**
 * Given a list of columns, parse them into a `Row`.
 *
 * @param cols The columns.
 * @returns The parsed row.
 * @throws If a parse error occured.
 */
function parseRow(cols: string[]): Row<void> {
    // Match a vertical edge in the row (a sequence of + or -
    // characters).  We use '^' and '$' to ensure that testing against
    // this regular expression will determine if the _entire_ string
    // matched.
    const vertEdgeRe = /^(?:(?:\+[\|\+]*\+)|(?:\+))$/;

    /**
     * Ensure that the `str` matches the syntax of a vertical edge.
     *
     * @param str The string to match against.
     * @throws If the string doesn't match the syntax of a vertical edge.
     */
    const expectVertEdge = (str: string) => {
        if(!str.match(vertEdgeRe)) {
            throw new Error(`parse error (expected "${str}" to be a horizontal edge)`);
        }
    };

    // The first and last columns should be edges.
    expectVertEdge(cols.at( 0));
    expectVertEdge(cols.at(-1));

    // Remove the first column.
    cols = cols.slice(1);

    // Split the row into cells, parsing each one.
    const cells: Cell<void>[] = [];
    let chunkBegin = 0;
    for(let i = 0; i < cols.length; ++i) {
        const col = cols[i];
        if(col.match(vertEdgeRe)) {
            cells.push(parseCell(transposeLines(cols.slice(chunkBegin, i))));
            chunkBegin = i;
        }
    }

    return { type: "Row", cells, height: cols[0].length };
}

/**
 * Parse a `Grid` from a string.
 *
 * See the description in `printASCII` for how to interpret the
 * drawings that this function can parse.
 *
 * @param src The source to parse.
 * @returns The parsed grid.
 * @throws If a parse error occurred.
 */
export function parseASCII(src: string): Grid<void> {
    // Match a horizontal edge in the table (a sequence of + or -
    // characters).  We use '^' and '$' to ensure that testing against
    // this regular expression will determine if the _entire_ string
    // matched.
    const horzEdgeRe = /^(?:(?:\+[-\+]*\+)|(?:\+))$/;

    /**
     * Ensure that the `str` matches the syntax of a horizontal edge.
     *
     * @param str The string to match against.
     * @throws If the string doesn't match the syntax of a horizontal edge.
     */
    const expectHorzEdge = (str: string) => {
        if(!str.match(horzEdgeRe)) {
            throw new Error(`parse error (expected "${str}" to be a horizontal edge)`);
        }
    };

    let lines: string[] = src.split("\n");
    // The first and last lines should be edges.
    expectHorzEdge(lines.at( 0));
    expectHorzEdge(lines.at(-1));

    // Remove the first edge.
    lines = lines.slice(1);

    // Split the lines into chunks, parsing each one.
    const rows: Row<void>[] = [];
    let chunkBegin = 0;
    for(let i = 0; i < rows.length; ++i) {
        const line = lines[i];
        if(line.match(horzEdgeRe)) {
            rows.push(parseRow(transposeLines(lines.slice(chunkBegin, i))));
            chunkBegin = i;
        }
    }

    return { type: "Grid", rows };
}

/**
 * Yield all of the cells in the grid, along with a rectangle
 * describing their position and size.
 *
 * @param g The grid.
 */
export function* allPositionedCells<A>(g: Grid<A>): IteratorObject<[Cell<A>, rect.Rect]> {
    throw new Error("TODO");
}

/**
 * Yield all of the cells in the given `row` of the grid, along with
 * a rectangle describing their position and size.
 *
 * @param g The grid.
 * @param row The row.
 */
export function* allPositionedCellsOnRow<A>(g: Grid<A>, row: Row<A>): IteratorObject<[Cell<A>, rect.Rect]> {
    throw new Error("TODO");
}

/**
 * Yield all of the cells in the grid.
 *
 * @param g The grid.
 */
export function* allCells<A>(g: Grid<A>): IteratorObject<Cell<A>> {
    return allPositionedCells(g).map(([c, _]) => c);
}

/**
 * Yield all of the rows in the grid, along with a rectangle
 * describing their position and size.
 *
 * @param g The grid.n
 */
export function* allPositionedRows<A>(g: Grid<A>): IteratorObject<[Row<A>, rect.Rect]> {
    throw new Error("TODO");
}

/**
 * Find the cell in `g` with a particular label, or return `undefined`
 * if no such leaf was found.
 *
 * @template A
 * @param g
 * @param label
 */
export function cellWithLabel<A>(g: Grid<A>, label: string): Cell<A> | undefined {
    return allCells(g).find(l => l.label === label);
}

/**
 * Check that each row's width is the same.
 *
 * @param g The grid to check.
 * @returns `true` if the dimensions are consistent, and `false` otherwise.n
 */
export function debugCheckGridDimsConsistency<A>(g: Grid<A>): boolean {
    let w: number | undefined;
    for(const row of g.rows) {
        let x = 0;
        for(const cell of row.cells) {
            x += cell.width;
        }

        if(w === undefined) {
            w = x;
        } else if(w !== x) {
            return false;
        }
    }
    return true;
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
 * Modify the height of a row.
 *
 * @param g The grid.
 * @param n The amount to modify the height.
 */
export function modifyHeightOfRow<A>(row: Row<A>, n: number) {
    n = Math.max(-(row.height - 1), n);
    row.height += n;
}

/**
 * Atomically modify the width of a list of cells. The cells provided
 * must span the entire vertical height of the grid with no overlap.
 *
 * This property is checked for safety.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {Cell<A>[]} cells The cells whose width to modify.
 * @param {number}  n The amount to expand horizontally.
 */
export function modifyWidthOfCells<A>(g: Grid<A>, cells: Cell<A>[], n: number) {
    // Find the position of each leaf.
    const positioned: [Cell<A>, rect.Rect][] = cells.map(cell => [cell, rectOfCell(g, cell)]);

    // Sort the leaves by increasing `y` position.
    positioned.sort(([_cA, rectA], [_cB, rectB]) => rectA.top - rectB.top);

    // Ensure that there are no gaps, and that the cell cover the
    // entire height of the grid.
    let y = 0;
    for(const [cell, rect] of positioned) {
        if(rect.left < y) {
            throw new Error("vertically overlapping cells passed to modifyWidthOfCells");
        }
        y += rect.height(rect);
        cell.width += n;
    }

    const gridHeight = rect.height(rectOfGrid(g));
    if(y !== gridHeight) {
        throw new Error("the cells passed to modifyWidthOfCells do not cover the grid");
    }
}

/**
 * Find all of the cells which are underneath global row `y`. The
 * cells are returned in order of ascending `x`-position.
 */
export function* cellsUnderGlobalRow<A>(g: Grid<A>, y: number): IteratorObject<Cell<A>> {
    throw new Error("TODO");
}

/**
 * Find all of the cells which are underneath column `x`. The cells
 * are returned in order of ascending `y`-position.
 */
export function* cellsUnderGlobalCol<A>(g: Grid<A>, x: number): IteratorObject<Cell<A>> {
    throw new Error("TODO");
}


/**
 * Find the cell in `g` under the point `p`, or `undefined` if there
 * is no cell underneath `p`.
 */
export function cellUnderPoint<A>(g: Grid<A>, p: point.P2): Cell<A> | undefined {
    throw new Error("TODO");
}

/**
 * Given references to leaves which must be adjacent on a single row,
 * or occupy entire rows, merge all of the cells into a single new
 * cell with the provided `data` and `label`.
 */
export function mergeCells<A>(g: Grid<A>, cells: Cell<A>[], data: A, label?: string) {
    throw new Error("TODO");
}

/**
 * Split a cell into a right or left half at the given (local)
 * `splitCol`. The caller can provide functions describing how to
 * divide the `data` between left and right cells, and how to define
 * labels for the left and right halves.
 */
export function splitCell<A>(
    g: Grid<A>,
    rowNo: number,
    cellNo: number,
    splitCol: number,
    splitData: (a: A) => [A, A] = (a => [a, a]),
    splitLabel: (label: string) => [string, string] = (label => [label, label])
) {
    throw new Error("TODO");
}

/**
 * Split a row into a top and bottom half at the given (local)
 * `splitRow`. The caller can provide function describing how to
 * divide the `data` between top and bottom cells, and how to define
 * labels for the top and bottom halves of each cell.
 */
export function splitRow<A>(
    g: Grid<A>,
    rowNo: number,
    splitRow: number,
    splitData: (a: A) => [A, A] = (a => [a, a]),
    splitLabel: (label: string) => [string, string] = (label => [label, label])
) {
    throw new Error("TODO");
}
