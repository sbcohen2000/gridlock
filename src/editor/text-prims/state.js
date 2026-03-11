/**
 * The editor state for text-edit level primitive operations.
 */

import * as grid from "../../grid.js";
import * as point from "../../point.js";

/** @import { Cell } from "../common-state.d.ts" */

export class TextPrimsState {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {{ pt: point.P2, leaf: grid.Leaf<Cell>, lastGlobalCol: number }} selection
     */
    constructor(g, selection) {
        /** @type {grid.Grid<Cell>} */
        this.grid = g;
        /** @type {{ pt: point.P2, leaf: grid.Leaf<Cell>, lastGlobalCol: number }} */
        this.selection = selection;
    }

    /** @returns {TextPrimsState} */
    clone() {
        const [g, [newLeaf]] = grid.cloneMappingNodes(
            this.grid,
            [this.selection.leaf],
            data => ({ lines: [...data.lines] })
        );
        return new TextPrimsState(g, {
            pt: point.mkP2(this.selection.pt.x, this.selection.pt.y),
            leaf: /** @type {grid.Leaf<Cell>} */ (newLeaf),
            lastGlobalCol: this.selection.lastGlobalCol
        });
    }
}
