import { AbstractEditorView, PointerInCellEventContext } from "./abstract-editor-view.js";
import { CellPrims } from "../state/index.js";

import type * as grid from "../grid.js";
import type { Recycler } from "../framework/index.js";
import type { Inverse, AnyState } from "../state/index.js";

export class CellEditingView extends AbstractEditorView {
    _ceState: CellPrims;

    constructor(prev: AbstractEditorView, state: CellPrims) {
        super(prev, state);
        this._ceState = state;
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<CellEditingView, "_ceState">("_ceState", this);
        return this._ceState;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(ctx: PointerInCellEventContext) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        this.commitInverse(
            this._ceState.selectCellUnderPoint(
                ctx.flooredGridPt,
                !ctx.event.shiftKey
            )
        );
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     */
    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        super.viewCellSelection(cell, recycler);

        if(this._ceState.selection.values().find(c => c.colNo === cell.colNo && c.rowNo === cell.rowNo)) {
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }
}

AbstractEditorView.registerViewFactory(CellPrims, (prev, st) =>
    new CellEditingView(prev, st as CellPrims));
