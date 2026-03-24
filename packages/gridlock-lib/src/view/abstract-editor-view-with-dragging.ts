import { AbstractEditorView } from "./abstract-editor-view.js";
import { AnyState } from "../state/state-iface.js";
import { DragState } from "./drag-state.js";

export abstract class AbstractEditorViewWithDragging extends AbstractEditorView {
    #dragState: DragState | null;

    constructor(prev: AbstractEditorView, editorState: AnyState, dragState?: DragState) {
        super(prev, editorState);
        this.#dragState = dragState ?? null;

        if(this.#dragState && !this._root.hasPointerCapture(this.#dragState.pointerId)) {
            this._root.setPointerCapture(this.#dragState.pointerId);
        }
    }

    /**
     * Subclasses implement this to handle pointer move events within
     * the editor root.
     */
    onDrag(e: PointerEvent, ds: DragState): void {
        void e;
        void ds;
    }

    /**
     * Subclasses implement this to handle the pointer up event that
     * causes the end of the drag.
     */
    onDragEnd(e: PointerEvent, ds: DragState): void {
        void e;
        void ds;
    }

    _viewRoot(root: HTMLElement) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;
            this.onDrag(e, this.#dragState);
        };

        root.onpointerup = (e) => {
            root.releasePointerCapture(e.pointerId);
            if(this.#dragState) {
                this.onDragEnd(e, this.#dragState);
            }
            this.#dragState = null;
        };
    }
}
