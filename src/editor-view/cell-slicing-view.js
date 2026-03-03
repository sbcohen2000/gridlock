import * as grid from "../grid.js";
import * as point from "../point.js";
import * as slicePrims from "../editor/slice-prims/slice-prims.js";
import { CellEditingView } from "./cell-editing-view.js";
import { EdgeEditingView } from "./edge-editing-view.js";
import { EditorView, PointerEventContext } from "../editor-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { View } from "../view.js";
import { standardToolbarItems } from "./standard-toolbar.js";

/** @import { SlicePrimsState } from "../editor/slice-prims/state.d.ts" */
/** @import { Cell } from "../editor/common-state.d.ts" */

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class CellSlicingView extends EditorView {
    /** @type {SlicePrimsState} */
    #scState;

    /** @type {point.P2 | null} */
    #hoveredPos = null;

    /**
     * @param {View} parent
     * @param {SlicePrimsState} st
     */
    constructor(parent, st) {
        super(parent);
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
     * @param {grid.Grid<Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<Cell>}
     */
    sliceAt(g, globalPos) {
        void g; void globalPos;
        throw new Error("Method not implemented");
    }

    /**
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerEventContext} _ctx
     */
    onPointerDownInLeaf(_ctx) {
        if(this.#hoveredPos === null) return;
        this.#scState.grid = this.sliceAt(this.#scState.grid, this.#hoveredPos);
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
     * @returns {HTMLElement | null}
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos) {
        void leaf; void leafPos; void hoverGlobalPos;
        throw new Error("Method not implemented");
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        super.viewLeafSelection(leaf, leafElem);

        // Remove old preview elements
        leafElem.querySelectorAll(".editor-slice-preview").forEach(el => el.remove());

        if(this.#hoveredPos === null) return;

        const leafPos = grid.posOfLeaf(this.#scState.grid, leaf);
        const preview = this.makePreviewElement(leaf, leafPos, this.#hoveredPos);
        if(preview) {
            leafElem.appendChild(preview);
        }
    }

    createTextEditingView(parent, st) { return new TextEditingView(parent, st); }
    createEdgeEditingView(parent, dragState, st) { return new EdgeEditingView(parent, dragState, st); }
    createCellEditingView(parent, st) { return new CellEditingView(parent, st); }
}

export class VerticalCellSlicingView extends CellSlicingView {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<Cell>}
     */
    sliceAt(g, globalPos) {
        const st = slicePrims.editSlice({ grid: g }, "Vertical");
        slicePrims.splitCellVerticallyAtGlobalRow(st, globalPos);
        return st.grid;
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @returns {HTMLElement | null}
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos) {
        // Check if hover is within this leaf's column range
        if(hoverGlobalPos.x < leafPos.x || hoverGlobalPos.x >= leafPos.x + leaf.dims.width) return null;
        if(hoverGlobalPos.y < leafPos.y || hoverGlobalPos.y >= leafPos.y + leaf.dims.height) return null;

        const localRow = hoverGlobalPos.y - leafPos.y;

        const preview = document.createElement("div");
        preview.className = "editor-slice-preview";
        preview.style.position = "absolute";
        preview.style.top = `${localRow}em`;
        preview.style.left = "0";
        preview.style.width = "100%";
        preview.style.height = "0";
        preview.style.borderTop = "1px dashed";
        preview.style.pointerEvents = "none";
        return preview;
    }

    describeToolbarItems() {
        return standardToolbarItems(this, "split vertically");
    }
}

export class HorizontalCellSlicingView extends CellSlicingView {
    /**
     * @param {grid.Grid<Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<Cell>}
     */
    sliceAt(g, globalPos) {
        const st = slicePrims.editSlice({ grid: g }, "Horizontal");
        slicePrims.splitCellHorizontallyAtGlobalCol(st, globalPos);
        return st.grid;
    }

    /**
     * @param {grid.Leaf<Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @returns {HTMLElement | null}
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos) {
        // Check if hover is within this leaf's range
        if(hoverGlobalPos.x < leafPos.x || hoverGlobalPos.x >= leafPos.x + leaf.dims.width) return null;
        if(hoverGlobalPos.y < leafPos.y || hoverGlobalPos.y >= leafPos.y + leaf.dims.height) return null;

        const localCol = hoverGlobalPos.x - leafPos.x;

        const preview = document.createElement("div");
        preview.className = "editor-slice-preview";
        preview.style.position = "absolute";
        preview.style.left = `${localCol}ch`;
        preview.style.top = "0";
        preview.style.height = "100%";
        preview.style.width = "0";
        preview.style.borderLeft = "1px dashed";
        preview.style.pointerEvents = "none";
        return preview;
    }

    describeToolbarItems() {
        return standardToolbarItems(this, "split horizontally");
    }
}
