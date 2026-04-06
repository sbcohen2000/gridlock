import "./row-dragging-view.css";
import * as grid from "../grid.js";
import * as rect from "../rect.js";
import type { Inverse, AnyState } from "../state/index.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellEditingView } from "./cell-editing-view.js";
import { CellPrims } from "../state/index.js";
import { DragState } from "./drag-state.js";
import { Recycler } from "../framework/index.js";
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
        if(this._targetRowNo !== undefined) {
            this.commitInverse(this._rdState.reorderRow(this._targetRowNo));
        }
        this.requestReplaceEditorView(new CellEditingView(this, this._rdState));
    }

    onDrag(e: PointerEvent, ds: DragState) {
        void e;
        const gridY = ds.posGrid().y;
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

    viewRowSelection(row: grid.RowPath, recycler: Recycler) {
        super.viewRowSelection(row, recycler);

        // Show a bar where the selected row would be inserted if the
        // user released the mouse at this instant.
        //
        // If the drop target is past the end of the grid, then
        // visualize the drop preview on the last row, but at the
        // bottom of the row as opposed to the top.
        const nRows = this._rdState.grid.rows.length;
        const targetPastEndOfGrid = this._targetRowNo === nRows && row.rowNo === nRows - 1;

        if(this._targetRowNo === row.rowNo || targetPastEndOfGrid) {
            // Then, the row will be inserted _above_ this row.
            recycler.elem({ tag: "div", key: "editor-row-drag-drop-preview" }, (dropPreviewElem) => {
                dropPreviewElem.className = "editor-row-drag-drop-preview";

                if(targetPastEndOfGrid) {
                    dropPreviewElem.classList.add("editor-row-drag-drop-preview-end");
                }
            });
        }
    }
}

export const RowDraggingView = ViewsSelectedCells(_RowDraggingView);
