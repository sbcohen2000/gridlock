import { TextPrims, CellPrims } from "../state/index.js";
import { AbstractEditorView, PointerInCellEventContext } from "./abstract-editor-view.js";
import { KeyViewEvent } from "./abstract-view.js";
import { withSnapshotInverse } from "../state/inverse.js";

/** @import * as grid from "../grid.js" */
/** @import { InitialViewState } from "./abstract-editor-view.js" */
/** @import { Recycler } from "../framework/index.js" */
/** @import { ViewEvent } from "./abstract-view.js" */

export class TextEditingView extends AbstractEditorView {
    /** @type {TextPrims} */
    #teState

    /**
     * @param {AbstractEditorView | InitialViewState} prev
     * @param {TextPrims} [st] The initial editor state.
     */
    constructor(prev, st) {
        super(prev);
        this.#teState = st;
    }

    /** @returns {TextPrims} */
    get state() {
        return this.#teState;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     *
     * @param {PointerInCellEventContext} ctx
     */
    onPointerDownInCell(ctx) {
        const gridPt = ctx.flooredGridPt;

        if(ctx.event.shiftKey && (ctx.cell.rowNo !== this.#teState.selection.cell.rowNo || ctx.cell.colNo !== this.#teState.selection.cell.colNo)) {
            // The gridPt is outside of the current cell, so
            // transition to a cell-editing state where the two
            // cells are selected.

            const [inv, st] = withSnapshotInverse(
                /** @param {TextPrims} s */
                (s) => CellPrims.editCells(s),
                "edit cells"
            )(this.state);
            this.commitInverse(inv);
            st.selection.add(this.#teState.selection.cell);
            st.selection.add(ctx.cell);
            this.requestReplaceEditorView(this.createViewForState(st));
        } else {
            // Move the point to `gridPt`.
            this.commitInverse(this.#teState.putPointOnGlobalPosition(gridPt));
            this.requestFocus();
        }
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

        if(this.#teState.selection.cell.rowNo === cell.rowNo && this.#teState.selection.cell.colNo === cell.colNo) {
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
                case "a": this.commitInverse(this.#teState.putPointAtStartOfGlobalLine()); break;
                case "e": this.commitInverse(this.#teState.putPointAtEndOfGlobalLine()); break;
                case "n": this.commitInverse(this.#teState.putPointOnNextGlobalLine()); break;
                case "p": this.commitInverse(this.#teState.putPointOnPrevGlobalLine()); break;
                case "b": this.commitInverse(this.#teState.putPointOnPrevGlobalCol()); break;
                case "f": this.commitInverse(this.#teState.putPointOnNextGlobalCol()); break;
                }
            } else {
                this.commitInverse(this.#teState.insertString(e.key));
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(this.#teState.pointAtBeginningOfGlobalLine()) {
                    this.commitInverse(this.#teState.removeGlobalNewline());
                } else {
                    this.commitInverse(this.#teState.removeString(1));
                }
            } break;
            case "Enter": {
                this.commitInverse(this.#teState.insertGlobalNewline());
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

AbstractEditorView.registerViewFactory(TextPrims, (prev, st) =>
    new TextEditingView(prev, /** @type {TextPrims} */ (st)));
