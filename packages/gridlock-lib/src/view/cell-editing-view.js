import { AbstractEditorView, PointerInCellEventContext } from "./abstract-editor-view.js";
import { CellPrims } from "../state/index.js";

/** @import * as grid from "../grid.js" */
/** @import { Recycler } from "../framework/index.js" */

export class CellEditingView extends AbstractEditorView {
    /** @type {CellPrims} */
    #ceState;

    /**
     * @param {AbstractEditorView} prev
     * @param {CellPrims} st The initial edit state.
     */
    constructor(prev, st) {
        super(prev);
        this.#ceState = st;
    }

    /** @returns {CellPrims} */
    get state() {
        return this.#ceState;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     *
     * @param {PointerInCellEventContext} ctx
     */
    onPointerDownInCell(ctx) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        this.commitInverse(
            this.#ceState.selectCellUnderPoint(
                ctx.flooredGridPt,
                !ctx.event.shiftKey
            )
        );
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     *
     * @param {grid.CellPath} cell
     * @param {Recycler} recycler
     */
    viewCellSelection(cell, recycler) {
        super.viewCellSelection(cell, recycler);

        if(this.#ceState.selection.has(cell)) {
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }
}

AbstractEditorView.registerViewFactory(CellPrims, (prev, st) =>
    new CellEditingView(prev, /** @type {CellPrims} */ (st)));
