import "./cell-dragging-view.css";
import * as grid from "../grid.js";
import type { Inverse, AnyState } from "../state/index.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellEditingView } from "./cell-editing-view.js";
import { CellPrims } from "../state/cell-prims.js";
import { DragState } from "./drag-state.js";
import { Recycler } from "../framework/index.js";
import { ViewsSelectedCells } from "./views-selected-cells-mixin.js";

class _CellDraggingView extends AbstractEditorViewWithDragging {
    _cdState: CellPrims;
    _targetCellPath: grid.CellPath | undefined;

    constructor(prev: AbstractEditorView, state: CellPrims, dragState?: DragState) {
        super(prev, state, dragState);
        this._cdState = state;
        this._targetCellPath = undefined;
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<_CellDraggingView, "_cdState">("_cdState", this);
        return this._cdState;
    }

    get ceState() {
        return this._cdState;
    }

    onDragEnd() {
        // When the drag ends, commit the change and then return to
        // the cell editing view.
        if(this._targetCellPath !== undefined) {
            this._cdState.replaceCellContent(this._targetCellPath);
        }
        this.requestReplaceEditorView(new CellEditingView(this, this._cdState));
    }

    onDrag(e: PointerEvent, ds: DragState) {
        void e;
        const posGrid = ds.posGrid();
        const cellPath = grid.cellUnderPoint(this._cdState.grid, posGrid);

        if(cellPath !== undefined
            && (this._targetCellPath === undefined
                || !grid.eqCellPath(cellPath, this._targetCellPath))) {
            this._targetCellPath = cellPath;
            this.requestRedraw();
        }
    }

    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        super.viewCellSelection(cell, recycler);

        // Preview the drop target by rendering an additional atop the
        // cell whose content will be replaced if the user relased the
        // mouse at this instant.

        if(this._targetCellPath !== undefined && grid.eqCellPath(cell, this._targetCellPath)) {
            recycler.elem({ tag: "div", key: "editor-cell-drag-drop-preview" }, (dropPreviewElem) => {
                dropPreviewElem.className = "editor-cell-drag-drop-preview";
            });
        }
    }
}

export const CellDraggingView = ViewsSelectedCells(_CellDraggingView);
