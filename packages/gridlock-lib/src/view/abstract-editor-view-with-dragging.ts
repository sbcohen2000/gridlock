import * as point from "../point.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AnyState } from "../state/state-iface.js";
import { TextPrims } from "../state/index.js";
import { withSnapshotInverse } from "../state/inverse.js";

export interface DragState {
    readonly dragOriginPx: point.P2;
    readonly dragOriginGrid: point.P2;
    readonly gridScale: point.V2;
}

export abstract class AbstractEditorViewWithDragging extends AbstractEditorView {
    #dragState: DragState | null;

    constructor(prev: AbstractEditorView, editorState: AnyState, dragState?: DragState) {
        super(prev, editorState);
        this.#dragState = dragState ?? null;
    }

    /**
     * Subclasses implement this to handle pointer move events within
     * the editor root.
     */
    abstract onDrag(e: PointerEvent, ds: DragState): void;

    _viewRoot(root: HTMLElement) {
        super._viewRoot(root);

        root.onpointermove = (e) => {
            if(!this.#dragState) return;
            this.onDrag(e, this.#dragState);
        };

        root.onpointerup = (e) => {
            root.releasePointerCapture(e.pointerId);
            if(this.#dragState) {
                this.#dragState = null;
                const [inv, st] = withSnapshotInverse(TextPrims.editText, "edit text")(this.state);
                this.commitInverse(inv);
                this.requestReplaceEditorView(this.createViewForState(st));
            }
        };
    }
}
