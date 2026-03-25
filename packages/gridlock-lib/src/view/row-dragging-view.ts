import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellPrims } from "../state/index.js";
import type { Inverse, AnyState } from "../state/index.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { DragState } from "./drag-state.js";
import { CellEditingView } from "./cell-editing-view.js";
import { ViewsSelectedCells } from "./views-selected-cells-mixin.js";

class _RowDraggingView extends AbstractEditorViewWithDragging {
    _rdState: CellPrims;

    constructor(prev: AbstractEditorView, state: CellPrims, dragState?: DragState) {
        super(prev, state, dragState);
        this._rdState = state;
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<_RowDraggingView, "_rdState">("_rdState", this);
        return this._rdState;
    }

    onDragEnd() {
        // When the drag ends, return to the cell editing view.
        this.requestReplaceEditorView(new CellEditingView(this, this._rdState));
    }

    get ceState() {
        return this._rdState;
    }

    onPointerDownInRowDragHandle(e: PointerEvent) {
        void e;
        // Do nothing.
    }
}

export const RowDraggingView = ViewsSelectedCells(_RowDraggingView);
