import * as grid from "../grid.js";
import * as point from "../point.js";
import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import { EdgeSlidingView } from "./edge-editing-view.js";
import { HorizontalCellSlicingView, VerticalCellSlicingView } from "./cell-slicing-view.js";
import { AbstractEditorView, PointerEventContext } from "../editor-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { View } from "../view.js";
import { standardToolbarItems } from "./standard-toolbar.js";

/** @import { Recycler } from "../framework.js" */
/** @import { CellPrimsState } from "../editor/cell-prims/state.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */
/** @import { HistoryItem } from "./history.d.ts" */

export class CellEditingView extends AbstractEditorView {
    /** @type {CellPrimsState} */
    #ceState;

    /**
     * @param {View} parent
     * @param {HistoryItem[]} history
     * @param {CellPrimsState} st The initial edit state.
     */
    constructor(parent, history, st) {
        super(parent, history);
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

    createTextEditingView(parent, st) { return new TextEditingView(parent, this.history, st); }
    createEdgeEditingView(parent, st, dragState) { return new EdgeSlidingView(parent, this.history, st, dragState); }
    createCellEditingView(parent, st) { void parent; void st; return this; }
    createVerticalCellSlicingView(parent, st) { return new VerticalCellSlicingView(parent, this.history, st); }
    createHorizontalCellSlicingView(parent, st) { return new HorizontalCellSlicingView(parent, this.history, st); }
}
