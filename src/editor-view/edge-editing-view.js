import * as edgePrims from "../editor/edge-prims/edge-prims.js";
import * as grid from "../grid.js";
import * as point from "../point.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import * as view from "../view.js";
import { CellEditingView } from "./cell-editing-view.js";
import { HorizontalCellSlicingView, VerticalCellSlicingView } from "./cell-slicing-view.js";
import { EditorView } from "../editor-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { theGLPKInstance } from "../glpk.js";

/** @import { Recycler } from "../framework.js" */
/** @import { EdgePrimsState } from "../editor/edge-prims/state.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */
/** @import { HistoryItem } from "./history.d.ts" */

/**
 * @typedef {Object} DragState
 * @property {point.P2} dragOriginPx   The drag origin in pixels
 * @property {point.P2} dragOriginGrid The drag origin in grid units
 * @property {point.V2} gridScale      The number of pixels in a grid square
 * @property {number}   lastArg        The last dh/dw argument we passed to
 *     modifyHeight/modifyHeight. We remember this in order to not
 *     call these functions unless their argument has actually
 *     changed.
 */

/**
 * The thickness of the draggable region around an edge.
 * @type {number}
 */
const EDGE_HALO_THICK = 2;

export class EdgeEditingView extends EditorView {
    /** @type {EdgePrimsState} */
    #eeState;

    /** @type {DragState | null} */
    #dragState;

    /**
     * @param {view.View} parent
     * @param {HistoryItem[]} history
     * @param {EdgePrimsState} eeState
     * @param {DragState} [dragState]
     */
    constructor(parent, history, eeState, dragState) {
        super(parent, history);
        this.#eeState = eeState;
        this.#dragState = dragState ?? null;
    }

    /** @returns {EdgePrimsState} */
    get state() {
        return this.#eeState;
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
     * @param {HTMLElement} root
     */
    _viewRoot(root) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;

            // Construct a new `AbortController` for this drag action,
            // aborting the previous abort controller if it exists.
            if(this.#GLPKAbortController !== null) {
                this.#GLPKAbortController.abort();
            }
            this.#GLPKAbortController = new AbortController();

            const g        = this.#eeState.grid;
            const ds       = this.#dragState;
            const leftLeaf = this.#eeState.selection.leaf;

            if(this.#eeState.selection.edge === "Right") {
                const dxPx         = e.clientX - ds.dragOriginPx.x;
                const dxGrid       = ds.dragOriginGrid.x + Math.round(dxPx / ds.gridScale.dx);
                const upperLeft    = grid.posOfLeaf(g, leftLeaf);
                // Find the current position of the edge, and the
                // target position of the edge, both in global grid
                // coordinates.
                const currentEdgeX = upperLeft.x + leftLeaf.dims.width;
                // The target position is the x-location of the cursor in grid units.
                const targetEdgeX  = dxGrid;
                const dw = targetEdgeX - currentEdgeX;

                // Invoke the solver to modify the `leftLeaf`'s width by `dw`.
                const settings = {
                    abortSignal: this.#GLPKAbortController.signal
                };

                if(this.#dragState.lastArg !== dw && dw !== 0) {
                    this.runPrimitiveWithUndoThenRedraw(this.#eeState, edgePrims.moveVerticalEdge, dw, theGLPKInstance.glpk, settings);
                }
                this.#dragState.lastArg = dw;
            } else {
                const dyPx         = e.clientY - ds.dragOriginPx.y;
                const dyGrid       = ds.dragOriginGrid.y + Math.round(dyPx / ds.gridScale.dy);
                const upperLeft    = grid.posOfLeaf(g, leftLeaf);
                const currentEdgeY = upperLeft.y + leftLeaf.dims.height;
                const targetEdgeY  = dyGrid;
                const dh = targetEdgeY - currentEdgeY;

                if(this.#dragState.lastArg !== dh && dh !== 0) {
                    this.runPrimitiveWithUndoThenRedraw(this.#eeState, edgePrims.moveHorizontalEdge, dh);
                }
                this.#dragState.lastArg = dh;
            }
        };

        root.onpointerup = (e) => {
            if(this.#dragState) {
                this.#dragState = null;
                root.releasePointerCapture(e.pointerId);
                const [st, inv] = textPrims.editText(this.state);
                this.commitUndoableItem(inv);
                this.requestReplaceEditorView(new TextEditingView(this.parent, this.history, st));
            }
        };

    }

    /**
     * Position an edge halo element based on the edge direction.
     *
     * @param {HTMLElement} elem
     */
    #positionEdgeHalo(elem) {
        const haloOffset = `${-EDGE_HALO_THICK/2}px`;
        const haloThick  = `${EDGE_HALO_THICK}px`;

        switch(this.#eeState.selection.edge) {
        case "Below":
            elem.style.bottom = haloOffset;
            elem.style.left = "0";
            elem.style.width = "100%";
            elem.style.height = haloThick;
            break;
        case "Right":
            elem.style.right = haloOffset;
            elem.style.top = "0";
            elem.style.height = "100%";
            elem.style.width = haloThick;
            break;
        }
    }

    /**
     * Draw the selection of a leaf, if any, by adding items to the
     * recycler.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {Recycler} recycler
     */
    viewLeafSelection(leaf, recycler) {
        if(leaf === this.#eeState.selection.leaf) {
            recycler.elem({ tag: "div", key: "edge-halo" }, (elem) => {
                elem.className = "editor-edge-halo";
                this.#positionEdgeHalo(elem);
            });
        }
    }

    describeToolbarItems() {
        return standardToolbarItems(this);
    }

    createTextEditingView(parent, st) { return new TextEditingView(parent, this.history, st); }
    createEdgeEditingView(parent, st, dragState) { void parent; void st; void dragState; return this; }
    createCellEditingView(parent, st) { return new CellEditingView(parent, this.history, st); }
    createVerticalCellSlicingView(parent, st) { return new VerticalCellSlicingView(parent, this.history, st); }
    createHorizontalCellSlicingView(parent, st) { return new HorizontalCellSlicingView(parent, this.history, st); }
}
