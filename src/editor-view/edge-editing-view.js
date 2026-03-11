import * as edgePrims from "../editor/edge-prims/edge-prims.js";
import * as grid from "../grid.js";
import * as point from "../point.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import { AbstractEditorView } from "../editor-view.js";
import { standardToolbarItems } from "./standard-toolbar.js";
import { EdgePrimsState, EdgeMovingPrimsState, EdgeSlidingPrimsState } from "../editor/edge-prims/state.js";

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
     * Apply the edge primitive for the given delta.
     *
     * @abstract
     * @param {EdgePrimsState} st
     * @param {number} d
     */
    applyEdgePrimitive(st, d) {
        void st; void d;
        throw new Error("Method not implemented");
    }

    /**
     * @param {HTMLElement} root
     */
    _viewRoot(root) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;

            const g    = this.#eeState.grid;
            const ds   = this.#dragState;
            const node = this.#eeState.selection;

            if(this.#eeState.selection.type === "Horz") {
                const dxPx         = e.clientX - ds.dragOriginPx.x;
                const dxGrid       = ds.dragOriginGrid.x + Math.round(dxPx / ds.gridScale.dx);
                const upperLeft    = grid.posOfLeaf(g, node);
                // Find the current position of the edge, and the
                // target position of the edge, both in global grid
                // coordinates.
                const currentEdgeX = upperLeft.x + node.left.dims.width;
                // The target position is the x-location of the cursor in grid units.
                const targetEdgeX  = dxGrid;
                const dw = targetEdgeX - currentEdgeX;

                if(this.#dragState.lastArg !== dw && dw !== 0) {
                    this.applyEdgePrimitive(this.#eeState, dw);
                }
                this.#dragState.lastArg = dw;
            } else {
                const dyPx         = e.clientY - ds.dragOriginPx.y;
                const dyGrid       = ds.dragOriginGrid.y + Math.round(dyPx / ds.gridScale.dy);
                const upperLeft    = grid.posOfLeaf(g, node);
                const currentEdgeY = upperLeft.y + node.left.dims.height;
                const targetEdgeY  = dyGrid;
                const dh = targetEdgeY - currentEdgeY;

                if(this.#dragState.lastArg !== dh && dh !== 0) {
                    this.applyEdgePrimitive(this.#eeState, dh);
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

    describeToolbarItems() {
        return standardToolbarItems(this);
    }
}

export class EdgeSlidingView extends AbstractEdgeDraggingView {
    /**
     * @param {EdgePrimsState} st
     * @param {number} d
     */
    applyEdgePrimitive(st, d) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeSlidingPrimsState} */ (st), edgePrims.slideEdge, d);
    }
}

export class EdgeMovingView extends AbstractEdgeDraggingView {
    /**
     * @param {EdgePrimsState} st
     * @param {number} d
     */
    applyEdgePrimitive(st, d) {
        this.runPrimitiveWithUndoThenRedraw(/** @type {EdgeMovingPrimsState} */ (st), edgePrims.moveEdge, d);
    }
}

AbstractEditorView.registerViewFactory(EdgeSlidingPrimsState, (prev, st, dragState) =>
    new EdgeSlidingView(prev, /** @type {EdgeSlidingPrimsState} */ (st), dragState));
AbstractEditorView.registerViewFactory(EdgeMovingPrimsState, (prev, st, dragState) =>
    new EdgeMovingView(prev, /** @type {EdgeMovingPrimsState} */ (st), dragState));
