import * as grid from "../grid.js";
import * as point from "../point.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import {
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims,
    TextPrims
} from "../state/index.js";
import { withSnapshotInverse } from "../state/inverse.js";

/** @import { AnyState } from "../state/index.js" */

/**
 * @typedef {Object} DragState
 * @property {point.P2} dragOriginPx   The drag origin in pixels
 * @property {point.P2} dragOriginGrid The drag origin in grid units
 * @property {point.V2} gridScale      The number of pixels in a grid square
 * @property {number}   lastArg        The last dh/dw argument we passed to
 *     modifyHeight/modifyWidth. We remember this in order to not
 *     call these functions unless their argument has actually
 *     changed.
 */

/**
 * Abstract base class for edge dragging views. Subclasses provide
 * the direction-specific edge primitives.
 */
export class AbstractEdgeDraggingView extends AbstractEditorView {
    /** @type {AnyState} */
    #eeState;

    /** @type {DragState | null} */
    #dragState;

    /**
     * @param {AbstractEditorView} prev
     * @param {AnyState} eeState
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

    /** @returns {AnyState} */
    get state() {
        return this.#eeState;
    }

    /**
     * Compute the target edge delta from the pointer event and drag
     * state.
     *
     * @abstract
     * @param {PointerEvent} e
     * @param {DragState} ds
     * @returns {number}
     */
    computeDelta(e, ds) {
        void e; void ds;
        throw new Error("Method not implemented");
    }

    /**
     * Apply the edge primitive for the given delta.
     *
     * @abstract
     * @param {number} d
     */
    applyEdgePrimitive(d) {
        void d;
        throw new Error("Method not implemented");
    }

    /**
     * @param {HTMLElement} root
     */
    _viewRoot(root) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;

            const d = this.computeDelta(e, this.#dragState);

            if(this.#dragState.lastArg !== d && d !== 0) {
                this.applyEdgePrimitive(d);
            }
            this.#dragState.lastArg = d;
        };

        root.onpointerup = (e) => {
            if(this.#dragState) {
                this.#dragState = null;
                root.releasePointerCapture(e.pointerId);
                const [inv, st] = withSnapshotInverse(TextPrims.editText, "edit text")(this.state);
                this.commitInverse(inv);
                this.requestReplaceEditorView(this.createViewForState(st));
            }
        };

    }
}

/**
 * Compute the delta for a cell boundary (vertical edge) drag.
 *
 * @param {MoveCellBoundaryPrims | SlideCellBoundaryPrims} state
 * @param {PointerEvent} e
 * @param {DragState} ds
 * @returns {number}
 */
function cellBoundaryDelta(state, e, ds) {
    const dxPx = e.clientX - ds.dragOriginPx.x;
    const dxGrid = ds.dragOriginGrid.x + Math.round(dxPx / ds.gridScale.dx);
    const currentEdgeX = grid.rectOfCell(state.grid, { rowNo: state.rowNo, colNo: state.colNo }).right;
    return dxGrid - currentEdgeX;
}

/**
 * Compute the delta for a row boundary (horizontal edge) drag.
 *
 * @param {MoveRowBoundaryPrims | SlideRowBoundaryPrims} state
 * @param {PointerEvent} e
 * @param {DragState} ds
 * @returns {number}
 */
function rowBoundaryDelta(state, e, ds) {
    const dyPx = e.clientY - ds.dragOriginPx.y;
    const dyGrid = ds.dragOriginGrid.y + Math.round(dyPx / ds.gridScale.dy);
    const currentEdgeY = grid.rectOfRow(state.grid, { rowNo: state.rowNo }).bottom;
    return dyGrid - currentEdgeY;
}

export class SlideCellBoundaryView extends AbstractEdgeDraggingView {
    /** @param {PointerEvent} e @param {DragState} ds */
    computeDelta(e, ds) {
        return cellBoundaryDelta(/** @type {SlideCellBoundaryPrims} */ (this.state), e, ds);
    }
    /** @param {number} d */
    applyEdgePrimitive(d) {
        this.commitInverse(/** @type {SlideCellBoundaryPrims} */ (this.state).slideVerticalEdge(d));
    }
}

export class MoveCellBoundaryView extends AbstractEdgeDraggingView {
    /** @param {PointerEvent} e @param {DragState} ds */
    computeDelta(e, ds) {
        return cellBoundaryDelta(/** @type {MoveCellBoundaryPrims} */ (this.state), e, ds);
    }
    /** @param {number} d */
    applyEdgePrimitive(d) {
        this.commitInverse(/** @type {MoveCellBoundaryPrims} */ (this.state).moveVerticalEdge(d));
    }
}

export class SlideRowBoundaryView extends AbstractEdgeDraggingView {
    /** @param {PointerEvent} e @param {DragState} ds */
    computeDelta(e, ds) {
        return rowBoundaryDelta(/** @type {SlideRowBoundaryPrims} */ (this.state), e, ds);
    }
    /** @param {number} d */
    applyEdgePrimitive(d) {
        this.commitInverse(/** @type {SlideRowBoundaryPrims} */ (this.state).slideHorizontalEdge(d));
    }
}

export class MoveRowBoundaryView extends AbstractEdgeDraggingView {
    /** @param {PointerEvent} e @param {DragState} ds */
    computeDelta(e, ds) {
        return rowBoundaryDelta(/** @type {MoveRowBoundaryPrims} */ (this.state), e, ds);
    }
    /** @param {number} d */
    applyEdgePrimitive(d) {
        this.commitInverse(/** @type {MoveRowBoundaryPrims} */ (this.state).moveHorizontalEdge(d));
    }
}

AbstractEditorView.registerViewFactory(SlideCellBoundaryPrims, (prev, st, dragState) =>
    new SlideCellBoundaryView(prev, st, dragState));
AbstractEditorView.registerViewFactory(MoveCellBoundaryPrims, (prev, st, dragState) =>
    new MoveCellBoundaryView(prev, st, dragState));
AbstractEditorView.registerViewFactory(SlideRowBoundaryPrims, (prev, st, dragState) =>
    new SlideRowBoundaryView(prev, st, dragState));
AbstractEditorView.registerViewFactory(MoveRowBoundaryPrims, (prev, st, dragState) =>
    new MoveRowBoundaryView(prev, st, dragState));
