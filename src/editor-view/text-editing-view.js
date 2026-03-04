import * as grid from "../grid.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import { CellEditingView } from "./cell-editing-view.js";
import { EdgeEditingView } from "./edge-editing-view.js";
import { EditorView, PointerEventContext } from "../editor-view.js";
import { View, KeyViewEvent } from "../view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { theGLPKInstance } from "../glpk.js";

/** @import { TextPrimsState, Cell } from "../editor/text-prims/state.d.ts" */

export class TextEditingView extends EditorView {
    /** @type {TextPrimsState} */
    #teState

    /**
     * @param {View} parent
     * @param {TextPrimsState} [st] The initial editor state.
     */
    constructor(parent, st) {
        super(parent);
        this.#teState = st;
    }

    /** @returns {TextPrimsState} */
    get state() {
        return this.#teState;
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

        const gridPt = ctx.flooredGridPt;

        if(ctx.event.shiftKey && ctx.leaf !== this.#teState.selection.leaf) {
            // The gridPt is outside of the current cell, so
            // transition to a cell-editing state where the two
            // cells are selected.

            const st = cellPrims.editCells(this.state);
            st.selection.leaves.add(this.#teState.selection.leaf);
            st.selection.leaves.add(ctx.leaf);
            this.requestReplaceEditorView(new CellEditingView(this.parent, st));
        } else {
            // Move the point to `gridPt`.
            textPrims.putPointOnGlobalPosition(this.state, gridPt);
            this.requestFocus();
            this.requestRedraw();
        }
    }

    /**
     * Make an element to represent the cusor.
     *
     * @returns {HTMLElement}
     */
    #mkCursorElem() {
        const e = document.createElement("div");
        e.className = "editor-cursor";
        e.style.position = "absolute";
        return e;
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

        // Reuse existing cursor element or create a new one.
        let cursorElem = /** @type {HTMLElement | null} */ (leafElem.querySelector(".editor-cursor"));
        if(!cursorElem) {
            cursorElem = this.#mkCursorElem();
            leafElem.appendChild(cursorElem);
        }
        cursorElem.style.display = "none";

        // If the leaf is selected, we need to draw the cursor.
        if(this.state.selection.leaf === leaf) {
            const ptDoc    = this.state.selection.pt;
            const xScreen  = `${ptDoc.x}ch`;
            const yScreen  = `${ptDoc.y}em`;

            cursorElem.style.display = "block";
            cursorElem.style.left = xScreen;
            cursorElem.style.top  = yScreen;
        }

        // Remove old halo elements
        leafElem.querySelectorAll(".editor-cell-halo").forEach(el => el.remove());

        const haloElem = document.createElement("div");
        if(this.#teState.selection.leaf === leaf) {
            haloElem.className = "editor-cell-halo";
            leafElem.appendChild(haloElem);
        }
    }

    describeToolbarItems() {
        return standardToolbarItems(this, "edit text");
    }

    createTextEditingView(parent, st) { return new TextEditingView(parent, st); }
    createEdgeEditingView(parent, dragState, st) { return new EdgeEditingView(parent, dragState, st); }
    createCellEditingView(parent, st) { return new CellEditingView(parent, st); }

    /**
     * Handle a keyboard event.
     *
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    #handleKeyEvent(e) {
        if(e.key.length === 1) {
            if(e.ctrlKey) {
                switch(e.key) {
                case "a": textPrims.putPointAtStartOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "e": textPrims.putPointAtEndOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "n": textPrims.putPointOnNextGlobalLine(this.#teState); this.requestRedraw(); break;
                case "p": textPrims.putPointOnPrevGlobalLine(this.#teState); this.requestRedraw(); break;
                case "b": textPrims.putPointOnPrevGlobalCol(this.#teState); this.requestRedraw(); break;
                case "f": textPrims.putPointOnNextGlobalCol(this.#teState); this.requestRedraw(); break;
                }
            } else {
                textPrims.insertString(this.#teState, e.key, theGLPKInstance.glpk).then(() => {
                    this.requestRedraw();
                });
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(textPrims.pointAtBeginningOfGlobalLine(this.#teState)) {
                    textPrims.removeGlobalLine(this.#teState);
                } else {
                    textPrims.removeString(this.#teState, 1);
                }
                this.requestRedraw();
            } break;
            case "Enter": {
                textPrims.insertGlobalNewline(this.#teState);
                this.requestRedraw();
            } break;
            default: break;
            }
        }
        return true;
    }

    /**
     * Handle an event.
     *
     * @param {import("../view.js").ViewEvent} e
     * @returns {boolean}
     */
    handleEvent(e) {
        if (e instanceof KeyViewEvent) {
            e.e.preventDefault();
            e.e.stopPropagation();
            return this.#handleKeyEvent(e.e);
        }
        return false;
    }
}
