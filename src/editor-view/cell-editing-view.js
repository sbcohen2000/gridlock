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
     * Draw the selection of a leaf, if any, given an element
     * representing the leaf.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        super.viewLeafSelection(leaf, leafElem);

        // Remove old halo elements
        leafElem.querySelectorAll(".editor-cell-halo").forEach(el => el.remove());

        const haloElem = document.createElement("div");
        if(this.#ceState.selection.leaves.has(leaf)) {
            haloElem.className = "editor-cell-halo";
            leafElem.appendChild(haloElem);
        }
    }

    describeToolbarItems() {
        return standardToolbarItems(this, "select cells");
    }

    createTextEditingView(parent, st) { return new TextEditingView(parent, st); }
    createEdgeEditingView(parent, dragState, st) { return new EdgeEditingView(parent, dragState, st); }
    createCellEditingView(parent, st) { return new CellEditingView(parent, st); }
}
