import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "../editor.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";
import { theGLPKInstance } from "../glpk.js";

export class CellEditingView extends EditorView {
    /** @type {state.EditingCells} */
    #ceState;

    /**
     * @typedef {{
     *   leaf: grid.Leaf<state.Cell>,
     * }} LastClickInfo
     */

    /**
     * Information which records the leaf of the last click. This
     * field is automatically cleared after a time; it is used to
     * detect when the user has double-clicked on a leaf.
     *
     * @type {LastClickInfo | null}
     */
    #lastClick = null;

    /**
     * Check if a click, which clicked on `leaf` should be classified
     * as a double-click by consulting `#lastClick`.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @returns {boolean} `true` if this click should be handled as a
     *     double-click, and `false` if it should be handled as a
     *     single-click.
     */
    #classifyDoubleClick(leaf) {
        if(this.#lastClick !== null && this.#lastClick.leaf === leaf) {
            this.#lastClick = null;
            return true;
        } else {
            this.#lastClick = { leaf };
            window.setTimeout(() => this.#lastClick = null, 200);
            return false;
        }
    }

    /**
     * Record if the mouse is near an edge of a leaf.
     *
     * @type {{
     *   leaf: grid.Leaf<state.Cell>,
     *   edge: state.RelEdgeLocation
     * } | null}
     */
    #mouseNearEdge = null;

    /**
     * Set the `#mouseNearEdge` property, requesting a re-draw only if
     * necessary.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {state.RelEdgeLocation} edge
     */
    #setMouseNearEdgeAndRedrawIfNecessary(leaf, edge) {
        if(this.#mouseNearEdge === null
           || this.#mouseNearEdge.leaf !== leaf
           || this.#mouseNearEdge.edge !== edge) {
            this.#mouseNearEdge = { leaf, edge };
            this.requestRedraw();
        }
    }

    /**
     * Clear the `#mouseNearEdge` property, requesting a re-draw only
     * if necessary.
     */
    #clearMouseNearEdgeAndRedrawIfNecessary() {
        if(this.#mouseNearEdge !== null) {
            this.#mouseNearEdge = null;
            this.requestRedraw();
        }
    }

    /**
     * @param {View} parent
     * @param {state.EditingCells} st The initial edit state.
     */
    constructor(parent, st) {
        super(parent);
        this.#ceState = st;
    }

    /** @returns {state.EditingCells} */
    get state() {
        return this.#ceState;
    }

    /**
     * View a particular line of the given leaf.
     *
     * @param {number} rowNo The index of the line to view.
     * @param {grid.Leaf<state.Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this line.
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
     * @type {boolean}
     */
    #isDraggingSelectedLeaf;

    /**
     * View a particular leaf of the grid.
     *
     * @param {grid.Leaf<state.Cell>} leaf The leaf to view.
     * @param {point.P2} pt The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this leaf.
     */
    viewLeaf(leaf, pt) {
        const leafElem = super.viewLeaf(leaf, pt);

        /**
         * Convert a point in screen space to a point in the local
         * coordinate space of the leaf.
         *
         * @param {point.P2} pt
         * @returns {point.P2}
         */
        const screenPosToLocalPos = (pt) => {
            const rect = leafElem.getBoundingClientRect();
            const relX = pt.x - rect.left;
            const relY = pt.y - rect.top;

            const relCol = Math.floor(point.lerp(0, leaf.dims.width,  0, relX, rect.width));
            const relRow = Math.floor(point.lerp(0, leaf.dims.height, 0, relY, rect.height));

            return point.mkP2(relCol, relRow);
        };

        leafElem.onmousemove = (e) => {
            const rect = leafElem.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            // Classify the mouse position into one of five zones.  If
            // we're closest to one of the edges, we should preview
            // that edge, while if we're closest to the center, we
            // should clear the preview.
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToLeftEdge   = [relX,               "Left"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToRightEdge  = [rect.width - relX,  "Right"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToTopEdge    = [relY,               "Above"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToBottomEdge = [rect.height - relY, "Below"];

            const [minD, edge] = [
                distanceToLeftEdge,
                distanceToRightEdge,
                distanceToTopEdge,
                distanceToBottomEdge
            ].reduce((minD, d) => minD < d ? minD : d, distanceToBottomEdge);

            if(minD <= 2) {
                this.#setMouseNearEdgeAndRedrawIfNecessary(leaf, edge);
            } else {
                this.#clearMouseNearEdgeAndRedrawIfNecessary();
            }
        };

        leafElem.onpointerdown = (e) => {
            const rect = leafElem.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            const isDoubleClick = this.#classifyDoubleClick(leaf);
            if(isDoubleClick) {
                // If the user double-clicked on the leaf, we want to
                // change to text-editing mode, setting the selection
                // to the point under the cursor.

                const localPt = screenPosToLocalPos(point.mkP2(e.clientX, e.clientY));

                const st = state.mk(this.#ceState.grid);
                state.textPrims.putPointOnGlobalPosition(
                    st,
                    point.offset(pt, point.mkV2(localPt.x, localPt.y)),
                    true
                );

                this.requestReplaceEditorView(st);
                return;
            }

            // Classify the mouse click into one of five zones.  If
            // we're closest to one of the edges, we should select an
            // edge, while if we're closest to the center, we should
            // select the cell itself.
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToLeftEdge   = [relX,               "Left"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToRightEdge  = [rect.width - relX,  "Right"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToTopEdge    = [relY,               "Above"];
            /** @type {[number, state.RelEdgeLocation]} */
            const distanceToBottomEdge = [rect.height - relY, "Below"];

            const [minD, edge] = [
                distanceToLeftEdge,
                distanceToRightEdge,
                distanceToTopEdge,
                distanceToBottomEdge
            ].reduce((minD, d) => minD < d ? minD : d, distanceToBottomEdge);

            // If the minimum distance to an edge is greater than 2px,
            // then we want to select the cell itself rather than one
            // of its edges.
            if(minD <= 2) {
                this.#ceState.selection = { type: "Edge", edge, leaf };
                this._root.setPointerCapture(e.pointerId);
                this.#isDraggingSelectedLeaf = true;
            } else {
                state.cellPrims.selectLeafUnderPoint(this.#ceState, pt, !e.shiftKey);
            }
            this.requestRedraw();
        };

        return leafElem;
    }

    /**
     * Position an edge halo element based on the edge direction.
     *
     * @param {HTMLElement} elem
     * @param {state.RelEdgeLocation} edge
     */
    #positionEdgeHalo(elem, edge) {
        switch(edge) {
        case "Above":
            elem.style.top = "-2px";
            elem.style.left = "0";
            elem.style.width = "100%";
            elem.style.height = "4px";
            break;
        case "Below":
            elem.style.bottom = "-2px";
            elem.style.left = "0";
            elem.style.width = "100%";
            elem.style.height = "4px";
            break;
        case "Left":
            elem.style.left = "-2px";
            elem.style.top = "0";
            elem.style.height = "100%";
            elem.style.width = "4px";
            break;
        case "Right":
            elem.style.right = "-2px";
            elem.style.top = "0";
            elem.style.height = "100%";
            elem.style.width = "4px";
            break;
        }
    }

    /**
     * Draw the selection of a leaf, if any, given an element
     * representing the leaf.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        const sel = this.#ceState.selection;
        const haloElem = document.createElement("div");
        if(sel.type === "Leaves" && sel.leaves.has(leaf)) {
            // We're selecting leaves, so draw a halo around all of
            // the selected leaves.
            haloElem.className = "editor-cell-halo";
            leafElem.appendChild(haloElem);
        } else if(sel.type === "Edge" && sel.leaf === leaf) {
            // We're selecting edges, so draw a halo around the
            // selected edge.
            haloElem.className = "editor-edge-halo";
            this.#positionEdgeHalo(haloElem, sel.edge);
            leafElem.appendChild(haloElem);
        }

        if(this.#mouseNearEdge !== null && this.#mouseNearEdge.leaf === leaf) {
            const edgePreviewHaloElem = document.createElement("div");
            edgePreviewHaloElem.className = "editor-edge-halo editor-edge-preview-halo";
            this.#positionEdgeHalo(edgePreviewHaloElem, this.#mouseNearEdge.edge);
            leafElem.appendChild(edgePreviewHaloElem);
        }
    }

    /**
     * @returns {HTMLElement}
     */
    view() {
        const root = super.view();

        root.onpointermove = (e) => {
            if(!this.#isDraggingSelectedLeaf) return;
            if(this.#ceState.selection.type !== "Edge") return;

            const rootRect = root.getBoundingClientRect();
            const globalX = e.clientX - rootRect.left;
            const globalY = e.clientY - rootRect.top;

            const gridW = this.#ceState.grid.dims.width;
            const gridH = this.#ceState.grid.dims.height;

            const globalCol = Math.floor(point.lerp(0, gridW, 0, globalX, rootRect.width));
            const globalRow = Math.floor(point.lerp(0, gridH, 0, globalY, rootRect.height));

            const sel = this.#ceState.selection;

            if(sel.edge === "Above" || sel.edge === "Below") {
                const aboveLeaf = state.cellPrims.leafAboveSelectedEdge(this.#ceState);
                const upperLeft = grid.posOfLeaf(this.#ceState.grid, aboveLeaf);
                const dh = globalRow - (upperLeft.y + aboveLeaf.dims.height);

                state.cellPrims.modifyHorizontalEdge(this.#ceState, dh);
                this.requestRedraw();
            } else {
                const leftLeaf = state.cellPrims.leafLeftOfSelectedEdge(this.#ceState);
                const upperLeft = grid.posOfLeaf(this.#ceState.grid, leftLeaf);
                const dw = globalCol - (upperLeft.x + leftLeaf.dims.width);

                state.cellPrims.modifyVerticalEdge(this.#ceState, dw, theGLPKInstance.glpk).then(() => {
                    this.requestRedraw();
                });
            }
        };

        root.onpointerup = (e) => {
            console.log("POINTER UP!");
            if(this.#isDraggingSelectedLeaf) {
                this.#isDraggingSelectedLeaf = false;
                root.releasePointerCapture(e.pointerId);
            }
        };

        return root;
    }

    toolbarItems() {
        const textModeButton = document.createElement("span");
        textModeButton.className = "editor-button";
        textModeButton.innerText = "text mode";
        textModeButton.onclick = () => {
            this.requestReplaceEditorView(state.editText(this.#ceState))
        };

        return [textModeButton, this.saveButton()];
    }
}
