/**
 * Primitive actions on cell edges.
 *
 * @module edge-prims
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";
import * as state from "../state-utils.js";
import * as util from "../../util.js";
import {
    EdgeMovingPrimsState, EdgeSlidingPrimsState,
    VertMovingPrimsState, HorzMovingPrimsState,
    VertSlidingPrimsState, HorzSlidingPrimsState
} from "./state.js";

/** @import { Inverse, CommonState, Cell } from "../common-state.d.ts" */

/**
 * Mutate the given list of lines so that it has at least `n` lines,
 * but if the length of `lines` exceeds `n`, only those empty lines
 * have been trimmed off.
 *
 * @param {number} n
 * @param {string[]} lines
 */
function trimEmptyLines(n, lines) {
    if(lines.length <= n) {
        return;
    }

    const maxTrim = lines.length - n;
    for(let i = 0; i < maxTrim; ++i) {
        if(lines.at(-1) === "") {
            lines.pop();
        } else {
            break;
        }
    }
}

/**
 * Ensure that the cell's lines array matches the row height,
 * adding or trimming empty lines as necessary.
 *
 * @param {grid.Grid<Cell>} g
 * @param {grid.CellPath} cellPath
 */
function _syncCellLinesToSize(g, cellPath) {
    const cell = grid.lookupCell(g, cellPath);
    const row  = grid.lookupRow(g, cellPath);
    if(cell.data.lines.length < row.height) {
        cell.data.lines.push(...Array.from(
            { length: row.height - cell.data.lines.length },
            () => ""
        ));
    } else if(row.height < cell.data.lines.length) {
        trimEmptyLines(row.height, cell.data.lines);
    }
}

/**
 * Given a global point and a direction, determine the edge state
 * for starting a moving-edge operation.
 *
 * @template {CommonState} S
 * @param {S} st
 * @param {point.P2} pt
 * @param {"Left" | "Right" | "Above" | "Below"} direction
 * @returns {[EdgeMovingPrimsState, Inverse<S>] | undefined}
 */
export function startMovingEdge(st, pt, direction) {
    const cell = grid.cellUnderPoint(st.grid, pt);
    if(cell === undefined) return undefined;

    /** @type {EdgeMovingPrimsState | undefined} */
    let edgeState;

    if(direction === "Left" && cell.colNo > 0) {
        edgeState = new VertMovingPrimsState(st.grid, cell.rowNo, cell.colNo - 1);
    } else if(direction === "Right") {
        const row = grid.lookupRow(st.grid, cell);
        if(cell.colNo < row.cells.length - 1) {
            edgeState = new VertMovingPrimsState(st.grid, cell.rowNo, cell.colNo);
        }
    } else if(direction === "Above" && cell.rowNo > 0) {
        edgeState = new HorzMovingPrimsState(st.grid, cell.rowNo - 1);
    } else if(direction === "Below") {
        if(cell.rowNo < st.grid.rows.length - 1) {
            edgeState = new HorzMovingPrimsState(st.grid, cell.rowNo);
        }
    }

    if(edgeState === undefined) return undefined;

    const snapshot = st.clone();
    return [edgeState, {
        apply: (_s) => snapshot,
        fwdDescription: "start moving edge"
    }];
}

/**
 * Given a global point and a direction, determine the edge state
 * for starting a sliding-edge operation.
 *
 * @template {CommonState} S
 * @param {S} st
 * @param {point.P2} pt
 * @param {"Left" | "Right" | "Above" | "Below"} direction
 * @returns {[EdgeSlidingPrimsState, Inverse<S>] | undefined}
 */
export function startSlidingEdge(st, pt, direction) {
    const cell = grid.cellUnderPoint(st.grid, pt);
    if(cell === undefined) return undefined;

    /** @type {EdgeSlidingPrimsState | undefined} */
    let edgeState;

    if(direction === "Left" && cell.colNo > 0) {
        edgeState = new VertSlidingPrimsState(st.grid, cell.rowNo, cell.colNo - 1);
    } else if(direction === "Right") {
        const row = grid.lookupRow(st.grid, cell);
        if(cell.colNo < row.cells.length - 1) {
            edgeState = new VertSlidingPrimsState(st.grid, cell.rowNo, cell.colNo);
        }
    } else if(direction === "Above" && cell.rowNo > 0) {
        edgeState = new HorzSlidingPrimsState(st.grid, cell.rowNo - 1);
    } else if(direction === "Below") {
        if(cell.rowNo < st.grid.rows.length - 1) {
            edgeState = new HorzSlidingPrimsState(st.grid, cell.rowNo);
        }
    }

    if(edgeState === undefined) return undefined;

    const snapshot = st.clone();
    return [edgeState, {
        apply: (_s) => snapshot,
        fwdDescription: "start sliding edge"
    }];
}

/**
 * Move a vertical edge by `n` columns. The edge is to the right
 * of the cell at `(st.rowNo, st.colNo)`. Moving expands/shrinks
 * the cell to the left of the edge across the full grid height.
 *
 * @param {VertMovingPrimsState} st
 * @param {number} n
 */
function _moveVerticalEdge(st, n) {
    const cellRect = grid.rectOfCell(st.grid, { rowNo: st.rowNo, colNo: st.colNo });
    const globalCol = cellRect.right - 1;
    const cells = [...grid.cellsUnderGlobalX(st.grid, globalCol)];
    grid.modifyWidthOfCells(st.grid, cells, n);
}

/**
 * Move a vertical edge by `n` columns.
 *
 * @type {(st: VertMovingPrimsState, n: number) => Inverse<VertMovingPrimsState>}
 */
export const moveVerticalEdge = state.withDefaultInverse(_moveVerticalEdge);

/**
 * Move a horizontal edge by `n` rows. The edge is below
 * row `st.rowNo`. Moving expands/shrinks that row.
 *
 * @param {HorzMovingPrimsState} st
 * @param {number} n
 */
function _moveHorizontalEdge(st, n) {
    const rowPath = { rowNo: st.rowNo };
    grid.modifyHeightOfRow(st.grid, rowPath, n);

    // Reconcile lines for all cells in the affected row.
    const row = grid.lookupRow(st.grid, rowPath);
    for(let colNo = 0; colNo < row.cells.length; ++colNo) {
        _syncCellLinesToSize(st.grid, { rowNo: st.rowNo, colNo });
    }
}

/**
 * Move a horizontal edge by `n` rows.
 *
 * @type {(st: HorzMovingPrimsState, n: number) => Inverse<HorzMovingPrimsState>}
 */
export const moveHorizontalEdge = state.withDefaultInverse(_moveHorizontalEdge);

/**
 * Slide a vertical edge by `n` columns. Sliding expands the cell
 * on one side and shrinks the cell on the other, keeping the
 * overall row width constant.
 *
 * @param {VertSlidingPrimsState} st
 * @param {number} n
 */
function _slideVerticalEdge(st, n) {
    const leftCell  = grid.lookupCell(st.grid, { rowNo: st.rowNo, colNo: st.colNo });
    const rightCell = grid.lookupCell(st.grid, { rowNo: st.rowNo, colNo: st.colNo + 1 });

    n = util.clamp(-(leftCell.width - 1), n, rightCell.width - 1);

    state.projectTextOntoLeaves((g) => {
        leftCell.width  += n;
        rightCell.width -= n;
        return g;
    }, st.grid);
}

/**
 * Slide a vertical edge by `n` columns.
 *
 * @type {(st: VertSlidingPrimsState, n: number) => Inverse<VertSlidingPrimsState>}
 */
export const slideVerticalEdge = state.withDefaultInverse(_slideVerticalEdge);

/**
 * Slide a horizontal edge by `n` rows. Sliding expands the row
 * above and shrinks the row below (or vice versa), keeping the
 * overall grid height constant.
 *
 * @param {HorzSlidingPrimsState} st
 * @param {number} n
 */
function _slideHorizontalEdge(st, n) {
    const topRow    = grid.lookupRow(st.grid, { rowNo: st.rowNo });
    const bottomRow = grid.lookupRow(st.grid, { rowNo: st.rowNo + 1 });

    n = util.clamp(-(topRow.height - 1), n, bottomRow.height - 1);

    state.projectTextOntoLeaves((g) => {
        topRow.height    += n;
        bottomRow.height -= n;
        return g;
    }, st.grid);
}

/**
 * Slide a horizontal edge by `n` rows.
 *
 * @type {(st: HorzSlidingPrimsState, n: number) => Inverse<HorzSlidingPrimsState>}
 */
export const slideHorizontalEdge = state.withDefaultInverse(_slideHorizontalEdge);
