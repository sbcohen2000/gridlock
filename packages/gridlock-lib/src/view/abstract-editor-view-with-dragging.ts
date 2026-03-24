import { AbstractEditorView } from "./abstract-editor-view.js";
import { AnyState } from "../state/state-iface.js";
import { DragState } from "./drag-state.js";

export abstract class AbstractEditorViewWithDragging extends AbstractEditorView {
    #dragState: DragState | null;

    /**
     * Construct a new editor view which will call `onDrag` and
     * `onDragEnd` after a drag has started.
     *
     * If `dragState` is provided to the constructor, then a drag will
     * begin upon construction of this view.
     */
    constructor(prev: AbstractEditorView, editorState: AnyState, dragState?: DragState) {
        super(prev, editorState);
        this.#dragState = dragState ?? null;

        if(dragState) {
            this.startDrag(dragState);
        }
    }

    /**
     * Start a new drag. This method will attempt to capture the
     * pointer of the given `dragState` if it isn't already captured.
     *
     * If a drag has already started, this method has no effect.
     */
    startDrag(dragState: DragState) {
        this.#dragState = dragState;
        if(!this._root.hasPointerCapture(this.#dragState.pointerId)) {
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

    /**
     * Get the current drag state, or `null` if no drag is currently
     * occuring.
     */
    get dragState(): DragState | null {
        return this.#dragState ?? null;
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
