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

import type { Inverse, AnyState } from "../state/index.js";

export interface DragState {
    dragOriginPx: point.P2;
    dragOriginGrid: point.P2;
    gridScale: point.V2;
    lastArg: number;
}

/**
 * Abstract base class for edge dragging views. Subclasses provide
 * the direction-specific edge primitives.
 */
export class AbstractEdgeDraggingView extends AbstractEditorView {
    _eeState: AnyState;
    #dragState: DragState | null;

    constructor(prev: AbstractEditorView, eeState: AnyState, dragState?: DragState) {
        super(prev);
        if(new.target === AbstractEdgeDraggingView) {
            throw new Error("Cannot instantiate AbstractEdgeDraggingView directly");
        }
        this._eeState = eeState;
        this.#dragState = dragState ?? null;
    }

    get state(): AnyState {
        return this._eeState;
    }

    applyInverse(inverse: Inverse<AnyState>) {
        inverse.apply<AbstractEdgeDraggingView, "_eeState">("_eeState", this);
    }

    /**
     * Compute the target edge delta from the pointer event and drag
     * state.
     */
    computeDelta(e: PointerEvent, ds: DragState): number {
        void e; void ds;
        throw new Error("Method not implemented");
    }

    /**
     * Apply the edge primitive for the given delta.
     */
    applyEdgePrimitive(d: number) {
        void d;
        throw new Error("Method not implemented");
    }

    _viewRoot(root: HTMLElement) {
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

function cellBoundaryDelta(state: MoveCellBoundaryPrims | SlideCellBoundaryPrims, e: PointerEvent, ds: DragState): number {
    const dxPx = e.clientX - ds.dragOriginPx.x;
    const dxGrid = ds.dragOriginGrid.x + Math.round(dxPx / ds.gridScale.dx);
    const currentEdgeX = grid.rectOfCell(state.grid, { rowNo: state.rowNo, colNo: state.colNo }).right;
    return dxGrid - currentEdgeX;
}

function rowBoundaryDelta(state: MoveRowBoundaryPrims | SlideRowBoundaryPrims, e: PointerEvent, ds: DragState): number {
    const dyPx = e.clientY - ds.dragOriginPx.y;
    const dyGrid = ds.dragOriginGrid.y + Math.round(dyPx / ds.gridScale.dy);
    const currentEdgeY = grid.rectOfRow(state.grid, { rowNo: state.rowNo }).bottom;
    return dyGrid - currentEdgeY;
}

export class SlideCellBoundaryView extends AbstractEdgeDraggingView {
    computeDelta(e: PointerEvent, ds: DragState) {
        return cellBoundaryDelta(this.state as SlideCellBoundaryPrims, e, ds);
    }
    applyEdgePrimitive(d: number) {
        this.commitInverse((this.state as SlideCellBoundaryPrims).slideVerticalEdge(d));
    }
}

export class MoveCellBoundaryView extends AbstractEdgeDraggingView {
    computeDelta(e: PointerEvent, ds: DragState) {
        return cellBoundaryDelta(this.state as MoveCellBoundaryPrims, e, ds);
    }
    applyEdgePrimitive(d: number) {
        this.commitInverse((this.state as MoveCellBoundaryPrims).moveVerticalEdge(d));
    }
}

export class SlideRowBoundaryView extends AbstractEdgeDraggingView {
    computeDelta(e: PointerEvent, ds: DragState) {
        return rowBoundaryDelta(this.state as SlideRowBoundaryPrims, e, ds);
    }
    applyEdgePrimitive(d: number) {
        this.commitInverse((this.state as SlideRowBoundaryPrims).slideHorizontalEdge(d));
    }
}

export class MoveRowBoundaryView extends AbstractEdgeDraggingView {
    computeDelta(e: PointerEvent, ds: DragState) {
        return rowBoundaryDelta(this.state as MoveRowBoundaryPrims, e, ds);
    }
    applyEdgePrimitive(d: number) {
        this.commitInverse((this.state as MoveRowBoundaryPrims).moveHorizontalEdge(d));
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
