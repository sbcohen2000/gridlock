import { TextPrims, CellPrims } from "../state/index.js";
import { AbstractEditorView, PointerInCellEventContext } from "./abstract-editor-view.js";
import { KeyViewEvent } from "./abstract-view.js";
import { withSnapshotInverse } from "../state/inverse.js";

import type * as grid from "../grid.js";
import type { InitialViewState } from "./abstract-editor-view.js";
import type { Recycler } from "../framework/index.js";
import type { ViewEvent } from "./abstract-view.js";
import type { Inverse, AnyState } from "../state/index.js";

export class TextEditingView extends AbstractEditorView {
    _teState: TextPrims;

    constructor(prev: AbstractEditorView | InitialViewState, state: TextPrims) {
        super(prev, state);
        this._teState = state;
    }

    get canDisableCellGuides(): boolean {
        return true;
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<TextEditingView, "_teState">("_teState", this);
        return this._teState;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(ctx: PointerInCellEventContext) {
        const gridPt = ctx.flooredGridPt;

        if(ctx.event.shiftKey && (ctx.cell.rowNo !== this._teState.selection.cell.rowNo || ctx.cell.colNo !== this._teState.selection.cell.colNo)) {
            // The gridPt is outside of the current cell, so
            // transition to a cell-editing state where the two
            // cells are selected.

            const [inv, st] = withSnapshotInverse(
                (s: TextPrims) => CellPrims.editCells(s),
                "edit cells"
            )(this._teState);
            this.commitInverse(inv);
            st.selection.add(this._teState.selection.cell);
            st.selection.add(ctx.cell);
            this.requestReplaceEditorView(this.createViewForState(st));
        } else {
            // Move the point to `gridPt`.
            this.commitInverse(this._teState.putPointOnGlobalPosition(gridPt));
            this.requestFocus();
        }
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     */
    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        super.viewCellSelection(cell, recycler);

        if(this._teState.selection.cell.rowNo === cell.rowNo && this._teState.selection.cell.colNo === cell.colNo) {
            recycler.elem({ tag: "div", key: "cursor" }, (cursorElem) => {
                cursorElem.className = "editor-cursor";
                cursorElem.style.position = "absolute";
                cursorElem.style.left = `${this._teState.selection.pt.x}ch`;
                cursorElem.style.top  = `${this._teState.selection.pt.y}em`;
            });
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }

    #handleKeyEvent(e: KeyboardEvent): boolean {
        if(e.key.length === 1) {
            if(e.ctrlKey) {
                switch(e.key) {
                case "a": this.commitInverse(this._teState.putPointAtStartOfGlobalLine()); break;
                case "e": this.commitInverse(this._teState.putPointAtEndOfGlobalLine()); break;
                case "n": this.commitInverse(this._teState.putPointOnNextGlobalLine()); break;
                case "p": this.commitInverse(this._teState.putPointOnPrevGlobalLine()); break;
                case "b": this.commitInverse(this._teState.putPointOnPrevGlobalCol()); break;
                case "f": this.commitInverse(this._teState.putPointOnNextGlobalCol()); break;
                }
            } else {
                this.commitInverse(this._teState.insertString(e.key));
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(this._teState.pointAtBeginningOfGlobalLine()) {
                    this.commitInverse(this._teState.removeGlobalNewline());
                } else {
                    this.commitInverse(this._teState.removeString(1));
                }
            } break;
            case "Enter": {
                this.commitInverse(this._teState.insertGlobalNewline());
            } break;
            default: break;
            }
        }
        return true;
    }

    handleEvent(e: ViewEvent): boolean {
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
    new TextEditingView(prev, st as TextPrims));
