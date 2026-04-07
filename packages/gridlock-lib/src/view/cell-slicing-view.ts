import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { SliceCellPrims, SliceRowPrims } from "../state/index.js";
import { AbstractEditorView, PointerEventContext } from "./abstract-editor-view.js";

import type { Recycler } from "../framework/index.js";
import type { Inverse, AnyState } from "../state/index.js";

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class AbstractCellSlicingView extends AbstractEditorView {
    _scState: SliceRowPrims | SliceCellPrims;

    _hoveredPos: point.P2 | null = null;

    constructor(prev: AbstractEditorView, state: SliceRowPrims | SliceCellPrims) {
        super(prev, state);
        if(new.target === AbstractCellSlicingView) {
            throw new Error("Cannot instantiate AbstractCellSlicingView directly");
        }
        this._scState = state;
    }

    /**
     * Perform the slice at the current hover position and return to
     * cell-editing mode.
     */
    sliceAt(globalPos: point.P2) {
        void globalPos;
        throw new Error("Method not implemented");
    }

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(_ctx: PointerEventContext) {
        if(this._hoveredPos === null) return;
        this.sliceAt(this._hoveredPos);
        this.requestRedraw();
    }
}

export class RowSlicingView extends AbstractCellSlicingView {
    constructor(prev: AbstractEditorView, st: SliceRowPrims) {
        super(prev, st);
    }

    sliceAt(globalPos: point.P2) {
        this.commitInverse(
            (this.state as SliceRowPrims).splitRow(globalPos)
        );
    }

    /**
     * Handle a pointer-move event inside a cell element.
     */
    onPointerMoveInCell(ctx: PointerEventContext) {
        const pos = ctx.roundedGridPt;

        if(this._hoveredPos === null
           || this._hoveredPos.x !== pos.x
           || this._hoveredPos.y !== pos.y) {
            this._hoveredPos = pos;
            this.requestRedraw();
        }
    }

    #makePreviewElement(rowRect: rect.Rect, hoverGlobalPos: point.P2, recycler: Recycler) {
        if(hoverGlobalPos.y <= rowRect.top || hoverGlobalPos.y >= rowRect.bottom) return;

        const localRow = hoverGlobalPos.y - rowRect.top;

        recycler.elem({ tag: "div", key: "slice-preview" }, (preview) => {
            preview.className = "editor-slice-preview";
            preview.style.position = "absolute";
            preview.style.top = `calc(${localRow}em - 1px)`;
            preview.style.left = "0";
            preview.style.width = "100%";
            preview.style.height = "0";
            preview.style.borderTop = "2px solid red";
            preview.style.pointerEvents = "none";
        });
    }

    viewRowSelection(row: grid.RowPath, recycler: Recycler) {
        super.viewRowSelection(row, recycler);

        if(this._hoveredPos === null) return;

        const rowRect = grid.rectOfRow(this._scState.grid, row);
        this.#makePreviewElement(rowRect, this._hoveredPos, recycler);
    }
}

export class CellSlicingView extends AbstractCellSlicingView {
    constructor(prev: AbstractEditorView, st: SliceCellPrims) {
        super(prev, st);
    }

    sliceAt(globalPos: point.P2) {
        this.commitInverse(
            (this.state as SliceCellPrims).splitCell(globalPos)
        );
    }

    /**
     * Handle a pointer-move event inside a cell element.
     */
    onPointerMoveInCell(ctx: PointerEventContext) {
        const pos = ctx.roundedXFlooredYPt;

        if(this._hoveredPos === null
           || this._hoveredPos.x !== pos.x
           || this._hoveredPos.y !== pos.y) {
            this._hoveredPos = pos;
            this.requestRedraw();
        }
    }

    #makePreviewElement(cellRect: rect.Rect, hoverGlobalPos: point.P2, recycler: Recycler) {
        if(hoverGlobalPos.x <= cellRect.left || hoverGlobalPos.x >= cellRect.right ) return;
        if(hoverGlobalPos.y <  cellRect.top  || hoverGlobalPos.y >= cellRect.bottom) return;

        const localCol = hoverGlobalPos.x - cellRect.left;

        recycler.elem({ tag: "div", key: "slice-preview" }, (preview) => {
            preview.className = "editor-slice-preview";
            preview.style.position = "absolute";
            preview.style.left = `calc(${localCol}ch - 1px)`;
            preview.style.top = "0";
            preview.style.height = "100%";
            preview.style.width = "0";
            preview.style.borderLeft = "2px solid red";
            preview.style.pointerEvents = "none";
        });
    }

    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        super.viewCellSelection(cell, recycler);

        if(this._hoveredPos === null) return;

        const cellRect = grid.rectOfCell(this._scState.grid, cell);
        this.#makePreviewElement(cellRect, this._hoveredPos, recycler);
    }
}
