import * as rect from "../rect.js";
import * as grid from "../grid.js";
import type { Inverse, AnyState } from "../state/index.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellEditingView } from "./cell-editing-view.js";
import { CellPrims } from "../state/index.js";
import { DragState } from "./drag-state.js";
import { ViewsSelectedCells } from "./views-selected-cells-mixin.js";

class _RowDraggingView extends AbstractEditorViewWithDragging {
    _rdState: CellPrims;
    _targetRowNo: number | undefined;

    constructor(prev: AbstractEditorView, state: CellPrims, dragState?: DragState) {
        super(prev, state, dragState);
        this._rdState = state;
        this._targetRowNo = undefined;
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<_RowDraggingView, "_rdState">("_rdState", this);
        return this._rdState;
    }

    onDragEnd() {
        // When the drag ends, commit the change and then return to
        // the cell editing view.
        this.commitInverse(this._rdState.relocateRow(this._targetRowNo));
        this.requestReplaceEditorView(new CellEditingView(this, this._rdState));
    }

    onDrag(e: PointerEvent, ds: DragState) {
        void e;
        const gridY = ds.dGrid(Math.floor).y;
        let newRowNo: number;
        if(gridY >= rect.height(grid.rectOfGrid(this._rdState.grid))) {
            newRowNo = this._rdState.grid.rows.length;
        } else {
            newRowNo = grid.rowUnderGlobalY(this._rdState.grid, gridY)?.rowNo;
        }

        if(newRowNo !== undefined && newRowNo !== this._targetRowNo) {
            this._targetRowNo = newRowNo;
            this.requestRedraw();
        }
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
