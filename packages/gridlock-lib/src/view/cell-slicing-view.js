import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { SliceCellPrims, SliceRowPrims } from "../state/index.js";
import { AbstractEditorView, PointerEventContext } from "./abstract-editor-view.js";

/** @import { Recycler } from "../framework/index.js" */

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class AbstractCellSlicingView extends AbstractEditorView {
    /** @type {SliceRowPrims | SliceCellPrims} */
    #scState;

    /** @type {point.P2 | null} */
    _hoveredPos = null;

    /**
     * @param {AbstractEditorView} prev
     * @param {SliceRowPrims | SliceCellPrims} st
     */
    constructor(prev, st) {
        super(prev);
        if(new.target === AbstractCellSlicingView) {
            throw new Error("Cannot instantiate AbstractCellSlicingView directly");
        }
        this.#scState = st;
    }

    /** @returns {SliceRowPrims | SliceCellPrims} */
    get state() {
        return this.#scState;
    }

    /**
     * Perform the slice at the current hover position and return to
     * cell-editing mode.
     *
     * @abstract
     * @param {point.P2} globalPos
     * @returns {void}
     */
    sliceAt(globalPos) {
        void globalPos;
        throw new Error("Method not implemented");
    }

    /**
     * Handle a pointer-down event inside a cell element.
     *
     * @param {PointerEventContext} _ctx
     */
    onPointerDownInCell(_ctx) {
        if(this._hoveredPos === null) return;
        this.sliceAt(this._hoveredPos);
        this.requestRedraw();
    }

    /**
     * @abstract
     * @param {rect.Rect} cellRect
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(cellRect, hoverGlobalPos, recycler) {
        void cellRect; void hoverGlobalPos; void recycler;
        throw new Error("Method not implemented");
    }

    /**
     * @param {grid.CellPath} cell
     * @param {Recycler} recycler
     */
    viewCellSelection(cell, recycler) {
        super.viewCellSelection(cell, recycler);

        if(this._hoveredPos === null) return;

        const cellRect = grid.rectOfCell(this.#scState.grid, cell);
        this.makePreviewElement(cellRect, this._hoveredPos, recycler);
    }
}

export class RowSlicingView extends AbstractCellSlicingView {
    /**
     * @param {AbstractEditorView} prev
     * @param {SliceRowPrims} st
     */
    constructor(prev, st) {
        super(prev, st);
    }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.commitInverse(
            /** @type {SliceRowPrims} */ (this.state).splitRow(globalPos)
        );
    }

    /**
     * Handle a pointer-move event inside a cell element.
     *
     * @param {PointerEventContext} ctx
     */
    onPointerMoveInCell(ctx) {
        const pos = ctx.roundedGridPt;

        if(this._hoveredPos === null
           || this._hoveredPos.x !== pos.x
           || this._hoveredPos.y !== pos.y) {
            this._hoveredPos = pos;
            this.requestRedraw();
        }
    }

    /**
     * @param {rect.Rect} cellRect
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(cellRect, hoverGlobalPos, recycler) {
        if(hoverGlobalPos.x <= cellRect.left || hoverGlobalPos.x >= cellRect.right) return;
        if(hoverGlobalPos.y <= cellRect.top || hoverGlobalPos.y >= cellRect.bottom) return;

        const localRow = hoverGlobalPos.y - cellRect.top;

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
}

export class CellSlicingView extends AbstractCellSlicingView {
    /**
     * @param {AbstractEditorView} prev
     * @param {SliceCellPrims} st
     */
    constructor(prev, st) {
        super(prev, st);
    }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.commitInverse(
            /** @type {SliceCellPrims} */ (this.state).splitCellHorizontallyAtGlobalCol(globalPos)
        );
    }

    /**
     * Handle a pointer-move event inside a cell element.
     *
     * @param {PointerEventContext} ctx
     */
    onPointerMoveInCell(ctx) {
        const pos = ctx.roundedXFlooredYPt;

        if(this._hoveredPos === null
           || this._hoveredPos.x !== pos.x
           || this._hoveredPos.y !== pos.y) {
            this._hoveredPos = pos;
            this.requestRedraw();
        }
    }

    /**
     * @param {rect.Rect} cellRect
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(cellRect, hoverGlobalPos, recycler) {
        if(hoverGlobalPos.x <= cellRect.left || hoverGlobalPos.x >= cellRect.right) return;
        if(hoverGlobalPos.y <= cellRect.top || hoverGlobalPos.y >= cellRect.bottom) return;

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
}

AbstractEditorView.registerViewFactory(SliceRowPrims, (prev, st) =>
    new RowSlicingView(prev, /** @type {SliceRowPrims} */ (st)));
AbstractEditorView.registerViewFactory(SliceCellPrims, (prev, st) =>
    new CellSlicingView(prev, /** @type {SliceCellPrims} */ (st)));
