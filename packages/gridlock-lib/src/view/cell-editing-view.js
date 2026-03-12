import * as grid from "../grid.js";
import { AbstractEditorView, PointerInLeafEventContext } from "./abstract-editor-view.js";
import { CellPrimsState } from "../state/cell-prims/state.js";
import { cellPrims } from "../state/index.js";

/** @import { Recycler } from "../framework/index.js" */
/** @import { Cell } from "../state/common-state.d.ts" */

export class CellEditingView extends AbstractEditorView {
    /** @type {CellPrimsState} */
    #ceState;

    /**
     * @param {AbstractEditorView} prev
     * @param {CellPrimsState} st The initial edit state.
     */
    constructor(prev, st) {
        super(prev);
        this.#ceState = st;
    }

    /** @returns {CellPrimsState} */
    get state() {
        return this.#ceState;
    }

    /**
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerInLeafEventContext} ctx
     */
    onPointerDownInLeaf(ctx) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        this.runPrimitiveWithUndoThenRedraw(
            this.#ceState,
            cellPrims.selectLeafUnderPoint,
            ctx.leafPosition,
            !ctx.event.shiftKey
        );
    }

    /**
     * Draw the selection of a leaf, if any, by adding items to the
     * recycler.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {Recycler} recycler
     */
    viewLeafSelection(leaf, recycler) {
        super.viewLeafSelection(leaf, recycler);

        if(this.#ceState.selection.leaves.has(leaf)) {
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }
}

AbstractEditorView.registerViewFactory(CellPrimsState, (prev, st) =>
    new CellEditingView(prev, /** @type {CellPrimsState} */ (st)));
