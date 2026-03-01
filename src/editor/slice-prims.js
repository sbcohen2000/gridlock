import * as grid from "../grid.js";
import * as point from "../point.js";

/**
 * @param {grid.Grid<import("./state.js").Cell>} g
 * @param {point.P2} globalPos — a global grid position; the row within the leaf is derived from this
 * @returns {grid.Grid<import("./state.js").Cell>}
 */
export function splitVerticallyAtGlobalPosition(g, globalPos) {
    const leaf = grid.leafUnderPoint(g, globalPos);
    if(!leaf) return g;
    const leafPos = grid.posOfLeaf(g, leaf);
    const localRow = globalPos.y - leafPos.y;
    const [, newGrid] = grid.splitLeafVertically(g, leaf, localRow, (cellData) => [
        { lines: cellData.lines.slice(0, localRow) },
        { lines: cellData.lines.slice(localRow) },
    ]);
    return newGrid;
}

/**
 * @param {grid.Grid<import("./state.js").Cell>} g
 * @param {point.P2} globalPos
 * @returns {grid.Grid<import("./state.js").Cell>}
 */
export function splitHorizontallyAtGlobalPosition(g, globalPos) {
    const leaf = grid.leafUnderPoint(g, globalPos);
    if(!leaf) return g;
    const leafPos = grid.posOfLeaf(g, leaf);
    const localCol = globalPos.x - leafPos.x;
    const [, newGrid] = grid.splitLeafHorizontally(g, leaf, localCol, (cellData) => [
        { lines: cellData.lines.map(line => line.slice(0, localCol)) },
        { lines: cellData.lines.map(line => line.slice(localCol)) },
    ]);
    return newGrid;
}
