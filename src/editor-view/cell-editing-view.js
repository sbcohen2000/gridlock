import * as grid from "../grid.js";
import * as point from "../point.js";
import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import { EdgeEditingView } from "./edge-editing-view.js";
import { EditorView, PointerEventContext } from "../editor-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { View } from "../view.js";
import { standardToolbarItems } from "./standard-toolbar.js";

/** @import { CellPrimsState } from "../editor/cell-prims/state.d.ts" */
/** @import { Cell } from "../editor/common-state.d.ts" */

export class CellEditingView extends EditorView {
    /** @type {CellPrimsState} */
    #ceState;

    /**
     * @param {View} parent
     * @param {CellPrimsState} st The initial edit state.
     */
    constructor(parent, st) {
        super(parent);
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

        cellPrims.selectLeafUnderPoint(this.#ceState, ctx.leafPosition, !ctx.event.shiftKey);
        this.requestRedraw();
    }

    /**
     * Draw the selection of a leaf, if any, by adding items to the
     * recycler.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {import("../framework.js").default} recycler
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

    createTextEditingView(parent, st) { return new TextEditingView(parent, st); }
    createEdgeEditingView(parent, dragState, st) { return new EdgeEditingView(parent, dragState, st); }
    createCellEditingView(parent, st) { return new CellEditingView(parent, st); }
}
