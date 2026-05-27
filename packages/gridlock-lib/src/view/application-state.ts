import type { Inverse, AnyState } from "../state/index.js";
import { CellPath } from "../grid.js";
import { DragState } from "./drag-state.js";

export type EdgeDraggingMode = "Move" | "Slide";

export interface EditorViewState {
    history: Inverse<AnyState>[];
    /**
     * The index of the item in `#history` which will be undone if
     * `undo` is called.
     */
    undoIndex: number;
    edgeDraggingMode: EdgeDraggingMode;
    lastClick: { cell: CellPath } | null;
    cellGuidesDisabled: boolean;
    editorState: AnyState;
    dragState: DragState | null;
    /**
     * The root element of the editor. We remember this so that we can
     * ask how much space the editor takes up on the screen, and so
     * that we can capture pointer events on the editor's element.
     */
    rootElement: HTMLElement | null;
}

export interface ApplicationState {
    editorViewState: EditorViewState;
}

/**
 * Create an `InitialViewState` to bootstrap the editor view.
 */
export function mkInitialEditorViewState(editorState: AnyState): EditorViewState {
    return {
        history: [],
        undoIndex: -1,
        edgeDraggingMode: "Move",
        lastClick: null,
        cellGuidesDisabled: false,
        editorState,
        dragState: null,
        rootElement: null
    };
}

