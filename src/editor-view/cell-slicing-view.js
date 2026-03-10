import * as grid from "../grid.js";
import * as point from "../point.js";
import * as slicePrims from "../editor/slice-prims/slice-prims.js";
import { CellEditingView } from "./cell-editing-view.js";
import { EdgeSlidingView } from "./edge-editing-view.js";
import { AbstractEditorView, PointerEventContext } from "../editor-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { View } from "../view.js";
import { standardToolbarItems } from "./standard-toolbar.js";

/** @import { Recycler } from "../framework.js" */
/** @import { SlicePrimsState } from "../editor/slice-prims/state.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */
/** @import { HistoryItem } from "./history.d.ts" */

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class AbstractCellSlicingView extends AbstractEditorView {
    /** @type {SlicePrimsState} */
    #scState;

    /** @type {point.P2 | null} */
    #hoveredPos = null;

    /**
     * @param {View} parent
     * @param {HistoryItem[]} history
     * @param {SlicePrimsState} st
     */
    constructor(parent, history, st) {
        super(parent, history);
        if(new.target === AbstractCellSlicingView) {
            throw new Error("Cannot instantiate AbstractCellSlicingView directly");
        }
        this.#scState = st;
    }

    /** @returns {SlicePrimsState} */
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

    createTextEditingView(parent, st) { return new TextEditingView(parent, this.history, st); }
    createEdgeEditingView(parent, st, dragState) { return new EdgeSlidingView(parent, this.history, st, dragState); }
    createCellEditingView(parent, st) { return new CellEditingView(parent, this.history, st); }
    createVerticalCellSlicingView(parent, st) { return new VerticalCellSlicingView(parent, this.history, st); }
    createHorizontalCellSlicingView(parent, st) { return new HorizontalCellSlicingView(parent, this.history, st); }
}

export class VerticalCellSlicingView extends AbstractCellSlicingView {
    createVerticalCellSlicingView(parent, st) { void parent; void st; return this; }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.runPrimitiveWithUndoThenRedraw(this.state, slicePrims.splitCellVerticallyAtGlobalRow, globalPos);
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
    createHorizontalCellSlicingView(parent, st) { void parent; void st; return this; }

    /**
     * @param {point.P2} globalPos
     */
    sliceAt(globalPos) {
        this.runPrimitiveWithUndoThenRedraw(this.state, slicePrims.splitCellHorizontallyAtGlobalCol, globalPos);
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
