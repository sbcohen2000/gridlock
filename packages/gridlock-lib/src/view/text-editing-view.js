import * as grid from "../grid.js";
import { textPrims, cellPrims } from "../state/index.js";
import { AbstractEditorView, PointerInLeafEventContext } from "./abstract-editor-view.js";
import { KeyViewEvent } from "./abstract-view.js";
import { TextPrimsState } from "../state/text-prims/state.js";

/** @import { Cell } from "../state/common-state.d.ts" */
/** @import { InitialViewState } from "./abstract-editor-view.js" */
/** @import { Recycler } from "../framework/index.js" */
/** @import { ViewEvent } from "./abstract-view.js" */

export class TextEditingView extends AbstractEditorView {
    /** @type {TextPrimsState} */
    #teState

    /**
     * @param {AbstractEditorView | InitialViewState} prev
     * @param {TextPrimsState} [st] The initial editor state.
     */
    constructor(prev, st) {
        super(prev);
        this.#teState = st;
    }

    /** @returns {TextPrimsState} */
    get state() {
        return this.#teState;
    }

    /**
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerInLeafEventContext} ctx
     */
    onPointerDownInLeaf(ctx) {
        const gridPt = ctx.flooredGridPt;

        if(ctx.event.shiftKey && ctx.leaf !== this.#teState.selection.leaf) {
            // The gridPt is outside of the current cell, so
            // transition to a cell-editing state where the two
            // cells are selected.

            const [st, inv] = cellPrims.editCells(this.state);
            this.commitUndoableItem(inv);
            st.selection.leaves.add(this.#teState.selection.leaf);
            st.selection.leaves.add(ctx.leaf);
            this.requestReplaceEditorView(this.createViewForState(st));
        } else {
            // Move the point to `gridPt`.
            this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointOnGlobalPosition, gridPt);
            this.requestFocus();
        }
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

        if(this.#teState.selection.leaf === leaf) {
            recycler.elem({ tag: "div", key: "cursor" }, (cursorElem) => {
                cursorElem.className = "editor-cursor";
                cursorElem.style.position = "absolute";
                cursorElem.style.left = `${this.state.selection.pt.x}ch`;
                cursorElem.style.top  = `${this.state.selection.pt.y}em`;
            });
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }

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
                case "a": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointAtStartOfGlobalLine); break;
                case "e": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointAtEndOfGlobalLine); break;
                case "n": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointOnNextGlobalLine); break;
                case "p": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointOnPrevGlobalLine); break;
                case "b": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointOnPrevGlobalCol); break;
                case "f": this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.putPointOnNextGlobalCol); break;
                }
            } else {
                this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.insertString, e.key);
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(textPrims.pointAtBeginningOfGlobalLine(this.#teState)) {
                    this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.removeGlobalNewline);
                } else {
                    this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.removeString, 1);
                }
            } break;
            case "Enter": {
                this.runPrimitiveWithUndoThenRedraw(this.#teState, textPrims.insertGlobalNewline);
            } break;
            default: break;
            }
        }
        return true;
    }

    /**
     * Handle an event.
     *
     * @param {ViewEvent} e
     * @returns {boolean}
     */
    handleEvent(e) {
        if(this.handleUndoKey(e)) {
            return true;
        }

        if (e instanceof KeyViewEvent) {
            e.e.preventDefault();
            e.e.stopPropagation();
            return this.#handleKeyEvent(e.e);
        }
        return false;
    }
}

AbstractEditorView.registerViewFactory(TextPrimsState, (prev, st) =>
    new TextEditingView(prev, /** @type {TextPrimsState} */ (st)));
