import * as grid from "../grid.js";
import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import { AbstractEditorView, PointerEventContext } from "../editor-view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { CellPrimsState } from "../editor/cell-prims/state.js";

/** @import { Recycler } from "../framework.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */

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
     * @param {PointerEventContext} ctx
     */
    onPointerDownInLeaf(ctx) {
        if(this.startDraggingEdgeWhenCloseToOne(ctx)) {
            return;
        }

        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        this.runPrimitiveWithUndoThenRedraw(this.#ceState, cellPrims.selectLeafUnderPoint, ctx.leafPosition, !ctx.event.shiftKey);
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

    describeToolbarItems() {
        return standardToolbarItems(this, "select cells");
    }
}

AbstractEditorView.registerViewFactory(CellPrimsState, (prev, st) =>
    new CellEditingView(prev, /** @type {CellPrimsState} */ (st)));
