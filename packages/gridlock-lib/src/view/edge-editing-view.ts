import * as grid from "../grid.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import {
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims
} from "../state/index.js";
import type { Inverse, AnyState } from "../state/index.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { DragState } from "./drag-state.js";
import { TextPrims } from "../state/index.js";
import { withSnapshotInverse } from "../state/inverse.js";

/**
 * Abstract base class for edge dragging views. Subclasses provide
 * the direction-specific edge primitives.
 */
export abstract class AbstractEdgeDraggingView extends AbstractEditorViewWithDragging {
    _eeState: AnyState;
    private _lastDelta: number = 0;

    constructor(prev: AbstractEditorView, eeState: AnyState, dragState?: DragState) {
        super(prev, eeState, dragState);
        this._eeState = eeState;

        if(prev instanceof AbstractEdgeDraggingView) {
            this._lastDelta = prev._lastDelta;
        }
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<AbstractEdgeDraggingView, "_eeState">("_eeState", this);
        return this._eeState;
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

    onDrag(e: PointerEvent, ds: DragState) {
        const d = this.computeDelta(e, ds);

        if(d !== this._lastDelta && d !== 0) {
            this.applyEdgePrimitive(d);
        }
        this._lastDelta = d;
    }

    onDragEnd(e: PointerEvent, ds: DragState) {
        void e;
        void ds;

        // Once the drag ends, switch to text-editing view.
        const [inv, st] = withSnapshotInverse(TextPrims.editText, "edit text")(this.state);
        this.commitInverse(inv);
        this.requestReplaceEditorView(this.createViewForState(st));
    }
}

function cellBoundaryDelta(state: MoveCellBoundaryPrims | SlideCellBoundaryPrims, e: PointerEvent, ds: DragState): number {
    const dxGrid = ds.dxGrid(e);
    const currentEdgeX = grid.rectOfCell(state.grid, { rowNo: state.rowNo, colNo: state.colNo }).right;
    return dxGrid - currentEdgeX;
}

function rowBoundaryDelta(state: MoveRowBoundaryPrims | SlideRowBoundaryPrims, e: PointerEvent, ds: DragState): number {
    const dyGrid = ds.dyGrid(e);
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
