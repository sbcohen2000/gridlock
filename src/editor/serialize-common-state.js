import * as grid from "../grid.js";
import { editText } from "./text-prims/text-prims.js";

/** @import { CommonState, Cell } from "./common-state.d.ts" */
/** @import { TextPrimsState } from "./text-prims/state.js" */

/**
 * Create a `TextPrimsState` from a grid.
 *
 * @param {grid.Grid<Cell>} g
 * @returns {TextPrimsState}
 */
export function commonStateFromGrid(g) {
    return editText({
        grid: g,
        clone() {
            /**
             * This initial state has no inverse.
             */
            return null;
        }
    })[0];
}

/**
 * Create a default CommonState with a single leaf containing one empty line.
 *
 * @returns {TextPrimsState}
 */
export function emptyTextEditingState() {
    /** @type {grid.Grid<Cell>} */
    const g = grid.mk(1, 1, { lines: [""] });
    return commonStateFromGrid(g);
}

/**
 * Print a grid of cells, by printing its ASCII representation
 * immediately followed by the cell text of each grid.
 *
 * @param {CommonState} st The common state to encode.
 * @returns {string} The encoded cell grid.
 */
export function printCommonState(st) {
    const g = st.grid;

    // Build a 2d array of characters with the same size as the grid.
    const chars = [];
    for(let i = 0; i < g.dims.height; ++i) {
        const row = [];
        for(let j = 0; j < g.dims.width; ++j) {
            row.push(' ');
        }
        chars.push(row);
    }

    const leaves = grid.allLeavesWithPosition(g);
    for(const [leaf, p] of leaves) {
        let row = 0;
        for(const line of leaf.data.lines) {
            chars[p.y + row].splice(p.x, line.length, ...line);
            ++row;
        }
    }

    const textPart = chars.map(row => row.join("").trimEnd()).join("\n");
    const gridPart = grid.printASCII(g);

    return textPart + "\n" + gridPart;
}

/**
 * Parse a grid of cells, using the same format as `printCellGrid`.
 *
 * @param {string} src The source to parse.
 * @returns {grid.Grid<Cell>} The parsed cell grid.
 */
export function parseCellGrid(src) {
    const srcLines = src.trimEnd().split("\n");
    // The first half of the lines will contain the text portion,
    // while the second half will contain the grid portion. The grid
    // portion always has one additional line.
    const gridPart = srcLines.slice((srcLines.length - 1) / 2);

    const g = /** @type {grid.Grid<Cell>} */ (grid.parseASCII(gridPart.join("\n")));

    const leaves = grid.allLeavesWithPosition(g);
    for(const [leaf, p] of leaves) {
        leaf.data = { lines: [] };
        for(let row = p.y; row < p.y + leaf.dims.height; ++row) {
            leaf.data.lines.push(srcLines[row].slice(p.x, p.x + leaf.dims.width).trimEnd());
        }
    }

    return g;
}

/**
 * Parse a cell grid from `src`, and turn it into a full-fledged
 * editor state.
 *
 * @param {string} src The source to parse as a cell grid.
 * @returns {TextPrimsState}
 */
export function textEditingStateFromString(src) {
    const g = parseCellGrid(src);
    return commonStateFromGrid(g);
}
