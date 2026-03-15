/**
 * The editor state for text-edit level primitive operations.
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";

/** @import { Cell } from "../common-state.d.ts" */

export class TextPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {{ pt: point.P2, cell: grid.CellPath, lastGlobalCol: number }} selection
     */
    constructor(g, selection) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {{ pt: point.P2, cell: grid.CellPath, lastGlobalCol: number }} */
        this.selection = selection;
    }

    /** @returns {TextPrimsState} */
    clone() {
        const g = grid.clone(
            this.grid,
            data => ({ lines: [...data.lines] })
        );
        return new TextPrimsState(g, {
            pt: point.cloneP2(this.selection.pt),
            cell: this.selection.cell,
            lastGlobalCol: this.selection.lastGlobalCol
        });
    }
}
