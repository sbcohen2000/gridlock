import * as point from "./point.js";
import * as rect from "./rect.js";

export interface Grid<A> {
    type: "Grid";
    rows: Row<A>[];
}

export interface Row<A> {
    type: "Row";
    height: number;
    cells: Cell<A>[];
}

export interface Cell<A> {
    type: "Cell";
    width: number;
    label?: string;
    data?: A;
}

/**
 * The location of a row in the grid.
 */
export interface RowPath {
    rowNo: number;
}

/**
 * The location of a cell in the grid.
 */
export interface CellPath {
    rowNo: number;
    colNo: number;
}

/**
 * Check if two cell paths point to the same location.
 */
export function eqCellPath(a: CellPath, b: CellPath): boolean {
    return a.rowNo === b.rowNo && a.colNo === b.colNo;
}

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
    if(height <= 0) {
        throw new Error(`invalid grid height ${height}`);
    }

    const extras: Partial<{ data: A, label: string }> = {};
    if(data !== undefined) extras.data = data;
    if(label !== undefined) extras.label = label;

    return {
        type: "Grid",
        rows: [
            {
                type: "Row",
                height,
                cells: [{ type: "Cell", width, ...extras }],
            }
        ]
    }
}

/**
 * Iterate all of the row paths in the grid.
 */
export function* allRows<A>(g: Grid<A>): Generator<RowPath> {
    for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        yield { rowNo };
    }
}

/**
 * Iterate all of the cell paths in the given row.
 */
export function* allCellsOnRow<A>(g: Grid<A>, row: RowPath): Generator<CellPath> {
    const theRow = lookupRow(g, row);
    for(let colNo = 0; colNo < theRow.cells.length; ++colNo) {
        yield { rowNo: row.rowNo, colNo };
    }
}

/**
 * Iterate all of the cell paths in the grid.
 */
export function* allCells<A>(g: Grid<A>): Generator<CellPath> {
    for(const row of allRows(g)) {
        for(const cell of allCellsOnRow(g, row)) {
            yield cell;
        }
    }
}

/**
 * Find a positioned rectangle which covers the grid.
 *
 * @param g The grid.
 * @returns A rectangle covering the grid.
 */
export function rectOfGrid<A>(g: Grid<A>): rect.Rect {
    const lastRowNo = g.rows.length - 1;
    const lastColNo = g.rows[lastRowNo].cells.length - 1;
    return rect.unions(rectOfCell(g, { rowNo: 0, colNo: 0 }), rectOfCell(g, { rowNo: lastRowNo, colNo: lastColNo }));
}

/**
 * Find a positioned rectangle which covers the given row.
 *
 * @param g The grid.
 * @param row The row whose outer rectangle to calculate.
 */
export function rectOfRow<A>(g: Grid<A>, row: RowPath): rect.Rect {
    const lastColNo = g.rows[row.rowNo].cells.length - 1;
    return rect.unions(rectOfCell(g, { ...row, colNo: 0 }), rectOfCell(g, { ...row, colNo: lastColNo }));
}

/**
 * Lookup a row by its path in the grid.
 *
 * @param g The grid.
 * @param row The row path to lookup.
 * @returns The row, or `undefined` if the path is invalid.
 */
export function lookupRow<A>(g: Grid<A>, row: RowPath): Row<A> {
    return g.rows[row.rowNo];
}

/**
 * Lookup a cell by its path in the grid.
 *
 * @param g The grid
 * @param cell The cell path to lookup.
 * @returns The cell, or `undefined` if the path is invalid.
 */
export function lookupCell<A>(g: Grid<A>, cell: CellPath): Cell<A> {
    return g.rows[cell.rowNo]?.cells[cell.colNo];
}

/**
 * Find a positioned rectangle which covers the given cell.
 *
 * @param g The grid.
 * @param cell The cell whose position and size to find.
 */
export function rectOfCell<A>(g: Grid<A>, cell: CellPath): rect.Rect {
    let yTop = 0;
    for(let i = 0; i < cell.rowNo; ++i) {
        yTop += g.rows[i].height;
    }

    const theRow = g.rows[cell.rowNo];
    let xLeft = 0;
    for(let i = 0; i < cell.colNo; ++i) {
        xLeft += theRow.cells[i].width;
    }
    const theCell = theRow.cells[cell.colNo];

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
    return {
        type: "Grid",
        rows: g.rows.map(row => ({
            type: "Row",
            height: row.height,
            cells: row.cells.map(cell => {
                const c: Cell<A> = { type: "Cell", width: cell.width };
                if (cell.label !== undefined) c.label = cell.label;
                if (cell.data !== undefined) c.data = cloneData(cell.data);
                return c;
            })
        }))
    };
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
        drawVertLine(r.left, r.top, r.bottom);
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
    // We subtract 1 here to account for the extra vertical border.
    const width = lines.reduce((len, line) => Math.max(len, line.length), 0) - 1;
    const label = lines
        .slice(1, -1)                          // Remove horizontal borders
        .map(line => line.slice(1, -1).trim()) // Remove vertical borders
        .join("\n").trim();                    // Remove newlines
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

    // Split the row into cells, parsing each one.
    const cells: Cell<void>[] = [];
    let chunkBegin = 0;
    for(let i = 1; i < cols.length; ++i) {
        const col = cols[i];
        if(col.match(vertEdgeRe)) {
            const chunk = cols.slice(chunkBegin, i + 1);
            cells.push(parseCell(transposeLines(chunk)));
            chunkBegin = i;
        }
    }

    // We subtract 1 here to account for the extra horizontal border.
    return { type: "Row", cells, height: cols[0].length - 1 };
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

    // Split the lines into chunks, parsing each one.
    const rows: Row<void>[] = [];
    let chunkBegin = 0;
    for(let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        if(line.match(horzEdgeRe)) {
            const chunk = lines.slice(chunkBegin, i + 1);
            rows.push(parseRow(transposeLines(chunk)));
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
export function* allPositionedCells<A>(g: Grid<A>): Generator<[CellPath, rect.Rect]> {
    let x = 0;
    let y = 0;
    for(let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        const row = g.rows[rowNo];
        x = 0;
        for(let colNo = 0; colNo < row.cells.length; ++colNo) {
            const cell = row.cells[colNo];
            yield [{ rowNo, colNo }, rect.fromXYWH(x, y, cell.width, row.height)];
            x += cell.width;
        }
        y += row.height;
    }
}

/**
 * Yield all of the cells in the given `row` of the grid, along with a
 * rectangle describing their position and size.
 *
 * @param g The grid.
 * @param row The row number.
 */
export function* allPositionedCellsOnRow<A>(g: Grid<A>, row: RowPath): Generator<[CellPath, rect.Rect]> {
    let y = 0;
    for (let i = 0; i < row.rowNo; ++i) y += g.rows[i].height;
    const theRow = g.rows[row.rowNo];
    let x = 0;
    for (let colNo = 0; colNo < theRow.cells.length; ++colNo) {
        const cell = theRow.cells[colNo];
        yield [{ rowNo: row.rowNo, colNo }, rect.fromXYWH(x, y, cell.width, theRow.height)];
        x += cell.width;
    }
}

/**
 * Yield all of the rows in the grid, along with a rectangle
 * describing their position and size.
 *
 * @param g The grid.n
 */
export function* allPositionedRows<A>(g: Grid<A>): Generator<[RowPath, rect.Rect]> {
    const gridWidth = g.rows[0]?.cells.reduce((sum, cell) => sum + cell.width, 0) ?? 0;
    let y = 0;
    for (let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        const row = g.rows[rowNo];
        yield [{ rowNo }, rect.fromXYWH(0, y, gridWidth, row.height)];
        y += row.height;
    }
}

/**
 * Find the cell in `g` with a particular label, or return `undefined`
 * if no such leaf was found.
 *
 * @template A
 * @param g
 * @param label
 */
export function cellWithLabel<A>(g: Grid<A>, label: string): CellPath | undefined {
    return allCells(g).find(c => lookupCell(g, c).label === label);
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
 * Modify the height of a row.
 *
 * @param g The grid.
 * @param row The row whose height to modify.
 * @param n The amount to modify the height.
 */
export function modifyHeightOfRow<A>(g: Grid<A>, row: RowPath, n: number) {
    const theRow = lookupRow(g, row);
    n = Math.max(-(theRow.height - 1), n);
    theRow.height += n;
}

/**
 * Delete the row at the given path from the grid.
 */
export function deleteRow<A>(g: Grid<A>, row: RowPath) {
    g.rows.splice(row.rowNo, 1);
}

/**
 * Atomically modify the width of a list of cells. The cells provided
 * must span the entire vertical height of the grid with no overlap.
 *
 * This property is checked for safety.
 *
 * @template A
 * @param {Grid<A>} g The root node of the grid.
 * @param {CellPath[]} cells The cells whose width to modify.
 * @param {number}  n The amount to expand horizontally.
 */
export function modifyWidthOfCells<A>(g: Grid<A>, cells: CellPath[], n: number) {
    // Find the position of each leaf.
    const positioned: [CellPath, rect.Rect][] = cells.map(cell => [cell, rectOfCell(g, cell)]);

    // Sort the cells by increasing `y` position.
    positioned.sort(([_cA, rectA], [_cB, rectB]) => rectA.top - rectB.top);

    // Ensure that there are no gaps, and that the cells cover the
    // entire height of the grid.
    let y = 0;
    for(const [_cell, r] of positioned) {
        if(r.top < y) {
            throw new Error("vertically overlapping cells passed to modifyWidthOfCells");
        }
        y += rect.height(r);
    }

    const gridHeight = rect.height(rectOfGrid(g));
    if(y !== gridHeight) {
        throw new Error("the cells passed to modifyWidthOfCells do not cover the grid");
    }

    // Clamp n so no cell shrinks below width 1.
    for(const [cell, _r] of positioned) {
        const theCell = lookupCell(g, cell);
        n = Math.max(-(theCell.width - 1), n);
    }

    // Apply the clamped delta to all cells.
    for(const [cell, _r] of positioned) {
        lookupCell(g, cell).width += n;
    }
}

/**
 * Find the row in `g` that contains global y-coordinate `y`.
 */
export function rowUnderGlobalY<A>(g: Grid<A>, y: number): RowPath | undefined {
    let rowTop = 0;
    for (let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        const row = g.rows[rowNo];
        if (y >= rowTop && y < rowTop + row.height) {
            return { rowNo };
        }
        rowTop += row.height;
    }
    return undefined;
}

/**
 * Find all of the cells which are underneath global row `y`. The
 * cells are returned in order of ascending `x`-position.
 */
export function* cellsUnderGlobalY<A>(g: Grid<A>, y: number): Generator<CellPath> {
    const rp = rowUnderGlobalY(g, y);
    if (rp === undefined) return;
    const row = g.rows[rp.rowNo];
    for (let colNo = 0; colNo < row.cells.length; ++colNo) {
        yield { rowNo: rp.rowNo, colNo };
    }
}

/**
 * Find the column index in `row` that contains global x-coordinate `x`.
 */
function colUnderGlobalX<A>(row: Row<A>, x: number): number | undefined {
    let colLeft = 0;
    for (let colNo = 0; colNo < row.cells.length; ++colNo) {
        const cell = row.cells[colNo];
        if (x >= colLeft && x < colLeft + cell.width) {
            return colNo;
        }
        colLeft += cell.width;
    }
    return undefined;
}

/**
 * Find all of the cells which are underneath column `x`. The cells
 * are returned in order of ascending `y`-position.
 */
export function* cellsUnderGlobalX<A>(g: Grid<A>, x: number): Generator<CellPath> {
    for (let rowNo = 0; rowNo < g.rows.length; ++rowNo) {
        const colNo = colUnderGlobalX(g.rows[rowNo], x);
        if (colNo !== undefined) {
            yield { rowNo, colNo };
        }
    }
}

/**
 * Find the cell in `g` under the point `p`, or `undefined` if there
 * is no cell underneath `p`.
 */
export function cellUnderPoint<A>(g: Grid<A>, p: point.P2): CellPath | undefined {
    const rp = rowUnderGlobalY(g, p.y);
    if (rp === undefined) return undefined;
    const colNo = colUnderGlobalX(g.rows[rp.rowNo], p.x);
    if (colNo === undefined) return undefined;
    return { rowNo: rp.rowNo, colNo };
}

/**
 * Find the list of cells in `g` under the given `Rect`.
 */
export function cellsUnderRect<A>(g: Grid<A>, r: rect.Rect): CellPath[] {
    return [...allPositionedCells(g).flatMap(([cell, cellRect]) =>
        rect.intersects(r, cellRect) ? [cell] : [])];
}

/**
 * Check if a possibly unsorted sequence of numbers is contiguous.
 *
 * @param xs The numbers to test.
 */
function contiguous(xs: readonly number[]): boolean {
    const sorted = xs.toSorted((a, b) => a - b);
    for(let i = 0; i < sorted.length - 1; ++i) {
        if(sorted[i] !== sorted[i + 1] - 1) return false;
    }
    return true;
}

/**
 * Merge cells on a single row.
 */
function mergeCellsOnRow<A>(g: Grid<A>, rowNo: number, row: CellPath[], data: A, label?: string): CellPath {
    const theRow = g.rows[rowNo];

    const colNos = row.map(({ colNo }) => colNo);
    colNos.sort((a, b) => a - b);

    if(!contiguous(colNos)) {
        throw new Error("invalid merge");
    }

    // Perform the splice.
    const firstColNo = colNos.at( 0);
    const lastColNo  = colNos.at(-1);

    theRow.cells.splice(firstColNo, lastColNo - firstColNo + 1, {
        type: "Cell",
        width: colNos.reduce((width: number, colNo: number) =>
            width + lookupCell(g, { rowNo, colNo }).width, 0),
        data,
        label
    });

    return { rowNo, colNo: firstColNo };
}

/**
 * Merge the cells on multiple contiguous rows, given by `rowNos`.
 */
function mergeRows<A>(g: Grid<A>, rowNos: number[], data: A, label?: string): CellPath {
    rowNos.sort((a, b) => a - b);

    if(!contiguous(rowNos)) {
        throw new Error("invalid merge");
    }

    // Perform the splice.
    const firstRowNo = rowNos.at( 0);
    const lastRowNo  = rowNos.at(-1);

    g.rows.splice(firstRowNo, lastRowNo - firstRowNo + 1, {
        type: "Row",
        height: rowNos.reduce((height: number, rowNo: number) =>
            height + lookupRow(g, { rowNo }).height, 0),
        cells: [{
            type: "Cell",
            width: rect.width(rectOfRow(g, { rowNo: firstRowNo })),
            data,
            label
        }]
    });

    return { rowNo: firstRowNo, colNo: 0 };
}

export function collectCellsByRow(cells: CellPath[]): Map<number, CellPath[]> {
    const byRow: Map<number, CellPath[]> = new Map();
    cells.forEach(cell => {
        const inRow = byRow.get(cell.rowNo);
        if(inRow === undefined) {
            byRow.set(cell.rowNo, [cell]);
        } else {
            inRow.push(cell);
        }
    });
    return byRow;
}

/**
 * Test that the given cells cover a single row.
 */
export function cellsCoverRow<A>(g: Grid<A>, cells: CellPath[]): boolean {
    if(cells.length === 0) return false;
    const theRow = lookupRow(g, cells[0]);
    return cells.every(cell => cell.rowNo === cells[0].rowNo) && cells.length === theRow.cells.length;
}

/**
 * Given references to cells which must be adjacent on a single row,
 * or occupy entire rows, merge all of the cells into a single new
 * cell with the provided `data` and `label`.
 *
 * @returns The new cell.
 */
export function mergeCells<A>(g: Grid<A>, cells: CellPath[], data: A, label?: string): CellPath {
    const byRow = collectCellsByRow(cells);

    if(byRow.size === 1) {
        // The cells exist on a single row.
        const [rowNo, row] = byRow.entries().next().value;
        return mergeCellsOnRow(g, rowNo, row, data, label);
    } else {
        // The cells exist on multiple rows.
        for(const cells of byRow.values()) {
            if(!cellsCoverRow(g, [...cells])) {
                throw new Error("invalid merge");
            }
        }

        const rowNos = [...byRow.keys()];
        return mergeRows(g, rowNos, data, label);
    }
}

/**
 * Test if the provided cells can be merged into a single cell.
 *
 * @returns `true` if a merge operation is valid for the provided
 *     cells, and `false` otherwise.
 */
export function canMergeCells<A>(g: Grid<A>, cells: CellPath[]): boolean {
    if(cells.length < 2) return false;

    const byRow = collectCellsByRow(cells);

    if(byRow.size === 1) {
        // The cells occupy a single row.
        const [_, row] = byRow.entries().next().value;
        return contiguous(row.map(({ colNo }) => colNo));
    } else {
        // The cells occupy multiple rows. The rows must be
        // contiguous, and the cells on each row must occupy the
        // entire row.
        for(const [rowNo, cells] of byRow.entries()) {
            const theRow = g.rows[rowNo];
            if(cells.length !== theRow.cells.length) return false;
        }

        const rowNos = [...byRow.keys()];
        return contiguous(rowNos);
    }
}

/**
 * Split a cell into a right or left half at the given (local)
 * `splitCol`. The caller can provide functions describing how to
 * divide the `data` between left and right cells, and how to define
 * labels for the left and right halves.
 */
export function splitCell<A>(
    g: Grid<A>,
    cell: CellPath,
    splitCol: number,
    splitData: (a: A) => [A, A] = (a => [a, a]),
    splitLabel: (label: string) => [string, string] = (label => [label, label])
) {
    const theCell = lookupCell(g, cell);

    if(splitCol <= 0 || splitCol >= theCell.width) {
        throw new Error(`invalid split (splitCol ${splitCol} for cell of width ${theCell.width})`);
    }

    const leftCell: Cell<A> = { type: "Cell", width: splitCol };
    const rightCell: Cell<A> = { type: "Cell", width: theCell.width - splitCol };

    if (theCell.data !== undefined) {
        const [l, r] = splitData(theCell.data);
        leftCell.data = l;
        rightCell.data = r;
    }
    if (theCell.label !== undefined) {
        const [l, r] = splitLabel(theCell.label);
        leftCell.label = l;
        rightCell.label = r;
    }

    g.rows[cell.rowNo].cells.splice(cell.colNo, 1, leftCell, rightCell);
}

/**
 * Split a row into a top and bottom half at the given (local)
 * `splitRow`. The caller can provide function describing how to
 * divide the `data` between top and bottom cells, and how to define
 * labels for the top and bottom halves of each cell.
 */
export function splitRow<A>(
    g: Grid<A>,
    row: RowPath,
    splitAt: number,
    splitData: (a: A) => [A, A] = (a => [a, a]),
    splitLabel: (label: string) => [string, string] = (label => [label, label])
) {
    const theRow = g.rows[row.rowNo];

    if(splitAt <= 0 || splitAt >= theRow.height) {
        throw new Error(`invalid split (splitAt ${splitAt} for row of height ${theRow.height})`);
    }

    const topCells: Cell<A>[] = theRow.cells.map(cell => {
        const c: Cell<A> = { type: "Cell", width: cell.width };
        if (cell.data !== undefined) c.data = splitData(cell.data)[0];
        if (cell.label !== undefined) c.label = splitLabel(cell.label)[0];
        return c;
    });

    const bottomCells: Cell<A>[] = theRow.cells.map(cell => {
        const c: Cell<A> = { type: "Cell", width: cell.width };
        if (cell.data !== undefined) c.data = splitData(cell.data)[1];
        if (cell.label !== undefined) c.label = splitLabel(cell.label)[1];
        return c;
    });

    const topRow: Row<A> = { type: "Row", height: splitAt, cells: topCells };
    const bottomRow: Row<A> = { type: "Row", height: theRow.height - splitAt, cells: bottomCells };

    g.rows.splice(row.rowNo, 1, topRow, bottomRow);
}

