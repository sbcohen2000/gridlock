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
     * An `AbortController` which is used to discard GLPK results
     * which become out-of-date before they can be applied to graph
     * when the user drags a vertical guide quickly.
     *
     * @type {AbortController | null}
     */
    #GLPKAbortController = null;

    /**
     * @typedef {Object} DragState
     * @property {point.P2} dragOriginPx          The drag origin in pixels
     * @property {point.P2} dragOriginGrid        The drag origin in grid units
     * @property {point.V2} gridScale             The number of pixels in a grid square
     * @property {"UpDown" | "LeftRight"} dir     The direction of the drag.
     * @property {number} lastArg                 The last dh/dw argument we passed to
     *                                            modifyHeight/modifyHeight. We remember
     *                                            this in order to not call these functions
     *                                            unless their argument has actually changed.
     * @property {grid.Leaf<state.Cell>} leftLeaf The leaf whose width or height to modify.
     */

    /**
     * State captured at the start of a drag, used to compute stable
     * deltas even when the grid's total dimensions change mid-drag.
     *
     * @type {DragState | null}
     */
    #dragState = null;

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
                const rootRect = this._root.getBoundingClientRect();
                const gridW    = this.#ceState.grid.dims.width;
                const gridH    = this.#ceState.grid.dims.height;
                const gridCol  = Math.round(point.lerp(0, gridW, rootRect.left, e.clientX, rootRect.right));
                const gridRow  = Math.round(point.lerp(0, gridH, rootRect.top, e.clientY, rootRect.bottom));
                const leftLeaf = state.cellPrims.leafAssociatedWithEdgeSelection(this.#ceState);

                this.#dragState = {
                    dragOriginPx: point.mkP2(e.clientX, e.clientY),
                    dragOriginGrid: point.mkP2(gridCol, gridRow),
                    gridScale: point.mkV2(rootRect.width / gridW, rootRect.height / gridH),
                    dir: edge === "Above" || edge === "Below" ? "UpDown" : "LeftRight",
                    leftLeaf,
                    lastArg: 0
                };
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
            if(!this.#dragState) return;
            if(this.#ceState.selection.type !== "Edge") return;

            // Construct a new `AbortController` for this drag action,
            // aborting the previous abort controller if it exists.
            if(this.#GLPKAbortController !== null) {
                this.#GLPKAbortController.abort();
            }
            this.#GLPKAbortController = new AbortController();

            const g  = this.#ceState.grid;
            const ds = this.#dragState;

            if(ds.dir === "LeftRight") {
                const dxPx         = e.clientX - ds.dragOriginPx.x;
                const dxGrid       = ds.dragOriginGrid.x + Math.round(dxPx / ds.gridScale.dx);
                const upperLeft    = grid.posOfLeaf(g, ds.leftLeaf);
                // Find the current position of the edge, and the
                // target position of the edge, both in global grid
                // coordinates.
                const currentEdgeX = upperLeft.x + ds.leftLeaf.dims.width;
                // The target position is the x-location of the cursor in grid units.
                const targetEdgeX  = dxGrid;
                const dw = targetEdgeX - currentEdgeX;

                // Invoke the solver to modify the `leftLeaf`'s width by `dw`.
                const settings = {
                    abortSignal: this.#GLPKAbortController.signal
                };

                if(this.#dragState.lastArg !== dw && dw !== 0) {
                    state.cellPrims.modifyVerticalEdge(this.#ceState, dw, theGLPKInstance.glpk, settings).then(didUpdate => {
                        if(didUpdate) {
                            this.requestRedraw();
                        }
                    });
                }
                this.#dragState.lastArg = dw;
            } else {
                const dyPx         = e.clientY - ds.dragOriginPx.y;
                const dyGrid       = ds.dragOriginGrid.y + Math.round(dyPx / ds.gridScale.dy);
                const upperLeft    = grid.posOfLeaf(g, ds.leftLeaf);
                const currentEdgeY = upperLeft.y + ds.leftLeaf.dims.height;
                const targetEdgeY  = dyGrid;
                const dh = targetEdgeY - currentEdgeY;

                if(this.#dragState.lastArg !== dh && dh !== 0) {
                    if(state.cellPrims.modifyHorizontalEdge(this.#ceState, dh)) {
                        this.requestRedraw();
                    }
                }
                this.#dragState.lastArg = dh;
            }
        };

        root.onpointerup = (e) => {
            if(this.#dragState) {
                this.#dragState = null;
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

        const sliceVButton = document.createElement("span");
        sliceVButton.className = "editor-button";
        sliceVButton.innerText = "slice ─";
        sliceVButton.onclick = () => {
            this.requestReplaceEditorView(state.sliceCellsVertically(this.#ceState));
        };

        const sliceHButton = document.createElement("span");
        sliceHButton.className = "editor-button";
        sliceHButton.innerText = "slice │";
        sliceHButton.onclick = () => {
            this.requestReplaceEditorView(state.sliceCellsHorizontally(this.#ceState));
        };

        return [textModeButton, sliceVButton, sliceHButton, this.saveButton()];
    }
}
