import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "../editor.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";
import { theGLPKInstance } from "../glpk.js";
import { assert } from "../util.js";

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
     *   edge: state.EdgeLocation
     * } | null}
     */
    #mouseNearEdge = null;

    /**
     * Set the `#mouseNearEdge` property, requesting a re-draw only if
     * necessary.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {state.EdgeLocation} edge
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
     * @param {point.P2} leafUl The position of the upper-left corner of the leaf.
     * @param {HTMLElement} [prev] An existing leaf element to update in place.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this leaf.
     */
    viewLeaf(leaf, leafUl, prev) {
        const leafElem = super.viewLeaf(leaf, leafUl, prev);

        leafElem.onmousemove = (e) => {
            const rect = leafElem.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            // Classify the mouse position into one of five zones.  If
            // we're closest to one of the edges, we should preview
            // that edge, while if we're closest to the center, we
            // should clear the preview.
            /** @type {[number, state.EdgeLocation]} */
            const distanceToLeftEdge   = [relX,               "Left"];
            /** @type {[number, state.EdgeLocation]} */
            const distanceToRightEdge  = [rect.width - relX,  "Right"];
            /** @type {[number, state.EdgeLocation]} */
            const distanceToTopEdge    = [relY,               "Above"];
            /** @type {[number, state.EdgeLocation]} */
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

            const rootRect = this._root.getBoundingClientRect();
            const gridW    = this.#ceState.grid.dims.width;
            const gridH    = this.#ceState.grid.dims.height;
            // Yes, it is intentional that the column is rounded while
            // the row is floored. This seems to produce the most
            // intuitive behavior (perhaps it's because cell
            // boundaries are centered _between_ columns, while lines
            // are centered _on_ the line).
            const gridCol  = Math.round(point.lerp(0, gridW, rootRect.left, e.clientX, rootRect.right));
            const gridRow  = Math.floor(point.lerp(0, gridH, rootRect.top, e.clientY, rootRect.bottom));
            const globalPt = point.mkP2(gridCol, gridRow);

            const isDoubleClick = this.#classifyDoubleClick(leaf);
            if(isDoubleClick) {
                // If the user double-clicked on the leaf, we want to
                // change to text-editing mode, setting the selection
                // to the point under the cursor.

                const st = state.mk(this.#ceState.grid);
                console.log(globalPt);
                state.textPrims.putPointOnGlobalPosition(st, globalPt, true);

                this.requestReplaceEditorView(st);
                return;
            }

            // Classify the mouse click into one of five zones.  If
            // we're closest to one of the edges, we should select an
            // edge, while if we're closest to the center, we should
            // select the cell itself.
            /** @type {[number, state.EdgeLocation]} */
            const distanceToLeftEdge   = [relX,               "Left"];
            /** @type {[number, state.EdgeLocation]} */
            const distanceToRightEdge  = [rect.width - relX,  "Right"];
            /** @type {[number, state.EdgeLocation]} */
            const distanceToTopEdge    = [relY,               "Above"];
            /** @type {[number, state.EdgeLocation]} */
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
                if(!state.edgePrims.selectEdgeUnderPoint(this.#ceState, leafUl, edge)) {
                    return;
                }
                assert(this.#ceState.selection.type === "Edge");
                const leftLeaf = this.#ceState.selection.leaf;

                // Capture the pointer of the root element so that the
                // user can drag outside of the current bounds of the
                // element if necessary.
                this._root.setPointerCapture(e.pointerId);

                this.#dragState = {
                    dragOriginPx: point.mkP2(e.clientX, e.clientY),
                    dragOriginGrid: globalPt,
                    gridScale: point.mkV2(rootRect.width / gridW, rootRect.height / gridH),
                    dir: edge === "Above" || edge === "Below" ? "UpDown" : "LeftRight",
                    leftLeaf,
                    lastArg: 0
                };
            } else {
                state.cellPrims.selectLeafUnderPoint(this.#ceState, leafUl, !e.shiftKey);
            }
            this.requestRedraw();
        };

        return leafElem;
    }

    /**
     * Position an edge halo element based on the edge direction.
     *
     * @param {HTMLElement} elem
     * @param {state.EdgeLocation} edge
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
        // Remove old halo/overlay elements
        leafElem.querySelectorAll(".editor-cell-halo, .editor-edge-halo").forEach(el => el.remove());

        const sel = this.#ceState.selection;
        const haloElem = document.createElement("div");
        if(sel.type === "Leaves" && sel.leaves.has(leaf)) {
            haloElem.className = "editor-cell-halo";
            leafElem.appendChild(haloElem);
        } else if(sel.type === "Edge" && sel.leaf === leaf) {
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
     * @param {HTMLElement} [prev]
     * @returns {HTMLElement}
     */
    view(prev) {
        const root = super.view(prev);

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
                    state.edgePrims.modifyVerticalEdge(this.#ceState, dw, theGLPKInstance.glpk, settings).then(didUpdate => {
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
                    if(state.edgePrims.modifyHorizontalEdge(this.#ceState, dh)) {
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

    describeToolbarItems() {
        return super.describeToolbarItems().map(descr =>
            descr.label === "select cells/edges" ? { ...descr, disabled: true } : descr);
    }
}
