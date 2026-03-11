import * as edgePrims from "../editor/edge-prims/edge-prims.js";
import * as grid from "../grid.js";
import * as point from "../point.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import { AbstractEditorView } from "../editor-view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { EdgePrimsState, EdgeMovingPrimsState, EdgeSlidingPrimsState } from "../editor/edge-prims/state.js";

/** @import { Recycler } from "../framework.js" */
/** @import { Cell } from "../editor/common-state.d.ts" */

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

/**
 * Abstract base class for edge dragging views. Subclasses provide
 * the direction-specific edge primitives (slide vs. move).
 */
export class AbstractEdgeDraggingView extends AbstractEditorView {
    /** @type {EdgePrimsState} */
    #eeState;

    /** @type {DragState | null} */
    #dragState;

    /**
     * @param {AbstractEditorView} prev
     * @param {EdgePrimsState} eeState
     * @param {DragState} [dragState]
     */
    constructor(prev, eeState, dragState) {
        super(prev);
        if(new.target === AbstractEdgeDraggingView) {
            throw new Error("Cannot instantiate AbstractEdgeDraggingView directly");
        }
        this.#eeState = eeState;
        this.#dragState = dragState ?? null;
    }

    /** @returns {EdgePrimsState} */
    get state() {
        return this.#eeState;
    }

    /**
     * Apply the vertical edge primitive for the given delta.
     *
     * @abstract
     * @param {EdgePrimsState} st
     * @param {number} dw
     */
    applyVerticalEdgePrimitive(st, dw) {
        void st; void dw;
        throw new Error("Method not implemented");
    }

    /**
     * Apply the horizontal edge primitive for the given delta.
     *
     * @abstract
     * @param {EdgePrimsState} st
     * @param {number} dh
     */
    applyHorizontalEdgePrimitive(st, dh) {
        void st; void dh;
        throw new Error("Method not implemented");
    }

    /**
     * @param {HTMLElement} root
     */
    _viewRoot(root) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;

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

                if(this.#dragState.lastArg !== dw && dw !== 0) {
                    this.applyVerticalEdgePrimitive(this.#eeState, dw);
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
                    this.applyHorizontalEdgePrimitive(this.#eeState, dh);
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
                this.requestReplaceEditorView(this.createViewForState(st));
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
}

export class EdgeSlidingView extends AbstractEdgeDraggingView {
    /**
     * @param {EdgePrimsState} st
     * @param {number} dw
     */
    applyVerticalEdgePrimitive(st, dw) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeSlidingPrimsState} */ (st), edgePrims.slideVerticalEdge, dw);
    }

    /**
     * @param {EdgePrimsState} st
     * @param {number} dh
     */
    applyHorizontalEdgePrimitive(st, dh) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeSlidingPrimsState} */ (st), edgePrims.slideHorizontalEdge, dh);
    }
}

export class EdgeMovingView extends AbstractEdgeDraggingView {
    /**
     * @param {EdgePrimsState} st
     * @param {number} dw
     */
    applyVerticalEdgePrimitive(st, dw) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeMovingPrimsState} */ (st), edgePrims.moveVerticalEdge, dw);
    }

    /**
     * @param {EdgePrimsState} st
     * @param {number} dh
     */
    applyHorizontalEdgePrimitive(st, dh) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeMovingPrimsState} */ (st), edgePrims.moveHorizontalEdge, dh);
    }
}

AbstractEditorView.registerViewFactory(EdgeSlidingPrimsState, (prev, st, dragState) =>
    new EdgeSlidingView(prev, /** @type {EdgeSlidingPrimsState} */ (st), dragState));
AbstractEditorView.registerViewFactory(EdgeMovingPrimsState, (prev, st, dragState) =>
    new EdgeMovingView(prev, /** @type {EdgeMovingPrimsState} */ (st), dragState));
