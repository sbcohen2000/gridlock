import * as grid from "../grid.js";
import { AbstractView } from "./abstract-view.js";
import { EditorViewState } from "./application-state.js";
import {
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims
} from "../state/index.js";
import type { AnyState } from "../state/index.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { DragState } from "./drag-state.js";
import { TextPrims } from "../state/index.js";
import { withSnapshotInverse } from "../state/inverse.js";

/**
 * Abstract base class for edge dragging views. Subclasses provide
 * the direction-specific edge primitives.
 */
export abstract class AbstractEdgeDraggingView<S extends AnyState> extends AbstractEditorViewWithDragging {
    private _lastDelta: number = 0;

    constructor(parent: AbstractView, editorState: S) {
        super(parent, editorState);
    }

    /**
     * Compute the target edge delta from the drag state.
     */
    computeDelta(ds: DragState): number {
        void ds;
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
        void e;

        const d = this.computeDelta(ds);

        if(d !== this._lastDelta && d !== 0) {
            this.applyEdgePrimitive(d);
        }
        this._lastDelta = d;
    }

    onDragEnd(e: PointerEvent, ds: DragState) {
        void e;
        void ds;

        const [inv, st] = withSnapshotInverse(TextPrims.editText, "edit text")(this.state.editorState);
        this.stepEditorState(inv);
        this.setEditorState(st);
    }
}

function cellBoundaryDelta(state: MoveCellBoundaryPrims | SlideCellBoundaryPrims, ds: DragState): number {
    const gridX = ds.posGrid().x;
    const currentEdgeX = grid.rectOfCell(state.grid, { rowNo: state.rowNo, colNo: state.colNo }).right;
    return gridX - currentEdgeX;
}

function rowBoundaryDelta(state: MoveRowBoundaryPrims | SlideRowBoundaryPrims, ds: DragState): number {
    const gridY = ds.posGrid().y;
    const currentEdgeY = grid.rectOfRow(state.grid, { rowNo: state.rowNo }).bottom;
    return gridY - currentEdgeY;
}

export class SlideCellBoundaryView extends AbstractEdgeDraggingView<SlideCellBoundaryPrims> {
    static fromAbstractViewState(parent: AbstractView | null, st: EditorViewState) {
        if(st.editorState instanceof SlideCellBoundaryPrims) {
            return new SlideCellBoundaryView(parent, st.editorState);
        } else {
            return undefined;
        }
    }

    computeDelta(ds: DragState) {
        return cellBoundaryDelta(this.typedEditorState(SlideCellBoundaryPrims), ds);
    }

    applyEdgePrimitive(d: number) {
        this.stepEditorState(this.typedEditorState(SlideCellBoundaryPrims).slideVerticalEdge(d));
    }
}

export class MoveCellBoundaryView extends AbstractEdgeDraggingView<MoveCellBoundaryPrims> {
    static fromAbstractViewState(parent: AbstractView | null, st: EditorViewState) {
        if(st.editorState instanceof MoveCellBoundaryPrims) {
            return new MoveCellBoundaryView(parent, st.editorState);
        } else {
            return undefined;
        }
    }

    computeDelta(ds: DragState) {
        return cellBoundaryDelta(this.typedEditorState(MoveCellBoundaryPrims), ds);
    }

    applyEdgePrimitive(d: number) {
        this.stepEditorState(this.typedEditorState(MoveCellBoundaryPrims).moveVerticalEdge(d));
    }
}

export class SlideRowBoundaryView extends AbstractEdgeDraggingView<SlideRowBoundaryPrims> {
    static fromAbstractViewState(parent: AbstractView | null, st: EditorViewState) {
        if(st.editorState instanceof SlideRowBoundaryPrims) {
            return new SlideRowBoundaryView(parent, st.editorState);
        } else {
            return undefined;
        }
    }

    computeDelta(ds: DragState) {
        return rowBoundaryDelta(this.typedEditorState(SlideRowBoundaryPrims), ds);
    }

    applyEdgePrimitive(d: number) {
        this.stepEditorState(this.typedEditorState(SlideRowBoundaryPrims).slideHorizontalEdge(d));
    }
}

export class MoveRowBoundaryView extends AbstractEdgeDraggingView<MoveRowBoundaryPrims> {
    static fromAbstractViewState(parent: AbstractView | null, st: EditorViewState) {
        if(st.editorState instanceof MoveRowBoundaryPrims) {
            return new MoveRowBoundaryView(parent, st.editorState);
        } else {
            return undefined;
        }
    }

    computeDelta(ds: DragState) {
        return rowBoundaryDelta(this.typedEditorState(MoveRowBoundaryPrims), ds);
    }

    applyEdgePrimitive(d: number) {
        this.stepEditorState(this.typedEditorState(MoveRowBoundaryPrims).moveHorizontalEdge(d));
    }
}
