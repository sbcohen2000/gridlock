import * as grid from "../grid.js";
import * as point from "../point.js";
import * as slicePrims from "../editor/slice-prims/slice-prims.js";
import { AbstractEditorView, PointerEventContext } from "../editor-view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { VerticalSlicePrimsState, HorizontalSlicePrimsState } from "../editor/slice-prims/state.js";

/** @import { Recycler } from "../framework.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class AbstractCellSlicingView extends AbstractEditorView {
    /** @type {VerticalSlicePrimsState | HorizontalSlicePrimsState} */
    #scState;

    /** @type {point.P2 | null} */
    #hoveredPos = null;

    /**
     * @param {AbstractEditorView} prev
     * @param {VerticalSlicePrimsState | HorizontalSlicePrimsState} st
     */
    constructor(prev, st) {
        super(prev);
        if(new.target === AbstractCellSlicingView) {
            throw new Error("Cannot instantiate AbstractCellSlicingView directly");
        }
        this.#scState = st;
    }

    /** @returns {VerticalSlicePrimsState | HorizontalSlicePrimsState} */
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
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerEventContext} _ctx
     */
    onPointerDownInLeaf(_ctx) {
        if(this.#hoveredPos === null) return;
        this.sliceAt(this.#hoveredPos);
        this.requestRedraw();
    }

    /**
     * Handle a pointer-move event inside a leaf element.
     *
     * @param {PointerEventContext} ctx
     */
    onPointerMoveInLeaf(ctx) {
        const pos = ctx.roundedGridPt;

        if(this.#hoveredPos === null
           || this.#hoveredPos.x !== pos.x
           || this.#hoveredPos.y !== pos.y) {
            this.#hoveredPos = pos;
            this.requestRedraw();
        }
    }

    /**
     * @abstract
     * @param {grid.Leaf<Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos, recycler) {
        void leaf; void leafPos; void hoverGlobalPos; void recycler;
        throw new Error("Method not implemented");
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {Recycler} recycler
     */
    viewLeafSelection(leaf, recycler) {
        super.viewLeafSelection(leaf, recycler);

        if(this.#hoveredPos === null) return;

        const leafPos = grid.posOfLeaf(this.#scState.grid, leaf);
        this.makePreviewElement(leaf, leafPos, this.#hoveredPos, recycler);
    }
}

export class VerticalCellSlicingView extends AbstractCellSlicingView {
    /**
     * @param {AbstractEditorView} prev
     * @param {VerticalSlicePrimsState} st
     */
    constructor(prev, st) {
        super(prev, st);
    }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.runPrimitiveWithUndoThenRedraw(
            /** @type {VerticalSlicePrimsState} */ (this.state),
            slicePrims.splitCellVerticallyAtGlobalRow,
            globalPos
        );
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos, recycler) {
        // Check if hover is within this leaf's column range
        if(hoverGlobalPos.x < leafPos.x || hoverGlobalPos.x >= leafPos.x + leaf.dims.width) return;
        if(hoverGlobalPos.y < leafPos.y || hoverGlobalPos.y >= leafPos.y + leaf.dims.height) return;

        const localRow = hoverGlobalPos.y - leafPos.y;

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

    describeToolbarItems() {
        return standardToolbarItems(this, "split vertically");
    }
}

export class HorizontalCellSlicingView extends AbstractCellSlicingView {
    /**
     * @param {AbstractEditorView} prev
     * @param {HorizontalSlicePrimsState} st
     */
    constructor(prev, st) {
        super(prev, st);
    }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.runPrimitiveWithUndoThenRedraw(
            /** @type {HorizontalSlicePrimsState} */ (this.state),
            slicePrims.splitCellHorizontallyAtGlobalCol,
            globalPos
        );
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @param {Recycler} recycler
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos, recycler) {
        // Check if hover is within this leaf's range
        if(hoverGlobalPos.x < leafPos.x || hoverGlobalPos.x >= leafPos.x + leaf.dims.width) return;
        if(hoverGlobalPos.y < leafPos.y || hoverGlobalPos.y >= leafPos.y + leaf.dims.height) return;

        const localCol = hoverGlobalPos.x - leafPos.x;

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

    describeToolbarItems() {
        return standardToolbarItems(this, "split horizontally");
    }
}

AbstractEditorView.registerViewFactory(VerticalSlicePrimsState, (prev, st) =>
    new VerticalCellSlicingView(prev, /** @type {VerticalSlicePrimsState} */ (st)));
AbstractEditorView.registerViewFactory(HorizontalSlicePrimsState, (prev, st) =>
    new HorizontalCellSlicingView(prev, /** @type {HorizontalSlicePrimsState} */ (st)));
