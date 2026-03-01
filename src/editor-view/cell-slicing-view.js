import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "../editor.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";

/**
 * A base class for slice cell views. Subclasses provide the direction-
 * specific preview rendering and slice prim.
 */
class CellSlicingView extends EditorView {
    /** @type {state.SlicingCells} */
    #scState;

    /** @type {point.P2 | null} */
    #hoveredPos = null;

    /**
     * @param {View} parent
     * @param {state.SlicingCells} st
     */
    constructor(parent, st) {
        super(parent);
        this.#scState = st;
    }

    /** @returns {state.SlicingCells} */
    get state() {
        return this.#scState;
    }

    /**
     * @param {number} rowNo
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {point.P2} p
     * @returns {HTMLElement}
     */
    viewLine(rowNo, leaf, p) {
        void p;

        const line = leaf.data.lines[rowNo];
        const lineElem = document.createElement("div");
        lineElem.className = "editor-line";
        lineElem.innerText = line;
        return lineElem;
    }

    /**
     * Perform the slice at the current hover position and return to
     * cell-editing mode.
     *
     * @abstract
     * @param {grid.Grid<state.Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<state.Cell>}
     */
    sliceAt(g, globalPos) {
        void g; void globalPos;
        throw new Error("Method not implemented");
    }

    /**
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {point.P2} pt
     * @returns {HTMLElement}
     */
    viewLeaf(leaf, pt) {
        const leafElem = super.viewLeaf(leaf, pt);

        leafElem.onmousemove = (e) => {
            const rect = leafElem.getBoundingClientRect();

            const relCol = Math.round(point.lerp(0, leaf.dims.width,  rect.left, e.clientX, rect.right));
            const relRow = Math.round(point.lerp(0, leaf.dims.height, rect.top, e.clientY,  rect.bottom));

            const globalX = pt.x + relCol;
            const globalY = pt.y + relRow;

            const newPos = point.mkP2(globalX, globalY);
            if(this.#hoveredPos === null
               || this.#hoveredPos.x !== newPos.x
               || this.#hoveredPos.y !== newPos.y) {
                this.#hoveredPos = newPos;
                this.requestRedraw();
            }
        };

        leafElem.onpointerdown = () => {
            if(this.#hoveredPos === null) return;
            this.#scState.grid = this.sliceAt(this.#scState.grid, this.#hoveredPos);
            this.requestReplaceEditorView(state.editCells(this.#scState));
        };

        return leafElem;
    }

    /**
     * @abstract
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {point.P2} leafPos
     * @param {point.P2} hoverGlobalPos
     * @returns {HTMLElement | null}
     */
    makePreviewElement(leaf, leafPos, hoverGlobalPos) {
        void leaf; void leafPos; void hoverGlobalPos;
        throw new Error("Method not implemented");
    }

    /**
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        if(this.#hoveredPos === null) return;

        const leafPos = grid.posOfLeaf(this.#scState.grid, leaf);
        const preview = this.makePreviewElement(leaf, leafPos, this.#hoveredPos);
        if(preview) {
            leafElem.appendChild(preview);
        }
    }

    toolbarItems() {
        const cellModeButton = document.createElement("span");
        cellModeButton.className = "editor-button";
        cellModeButton.innerText = "cell mode";
        cellModeButton.onclick = () => {
            this.requestReplaceEditorView(state.editCells(this.#scState));
        };

        return [cellModeButton, this.saveButton()];
    }
}

export class VerticalCellSlicingView extends CellSlicingView {
    /**
     * @param {grid.Grid<state.Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<state.Cell>}
     */
    sliceAt(g, globalPos) {
        return state.slicePrims.splitVerticallyAtGlobalPosition(g, globalPos);
    }

    /**
     * @param {grid.Leaf<state.Cell>} leaf
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
}

export class HorizontalCellSlicingView extends CellSlicingView {
    /**
     * @param {grid.Grid<state.Cell>} g
     * @param {point.P2} globalPos
     * @returns {grid.Grid<state.Cell>}
     */
    sliceAt(g, globalPos) {
        return state.slicePrims.splitHorizontallyAtGlobalPosition(g, globalPos);
    }

    /**
     * @param {grid.Leaf<state.Cell>} leaf
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
}
