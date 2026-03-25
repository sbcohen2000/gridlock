import { CommittableRecycler, Recycler } from "../framework/framework.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AbstractView } from "./abstract-view.js";
import { interactsWithFillChar } from "./interacts-with-fill-char-mixin.js";

export class FillCharPreviewView extends AbstractView {
    /**
     * The editor view.
     */
    #editorView: AbstractEditorView;

    constructor(parent: AbstractView | null, editorView: AbstractEditorView) {
        super(parent);
        this.#editorView = editorView;
    }

    view(r: Recycler) {
        r.elem({ tag: "div", key: "fill-char-preview-view" }, previewElem => {
            previewElem.className = "editor-fill-char-preview-view";
            if(this.hasFocus) {
                previewElem.classList.add("editor-fill-char-preview-view-focused");
            }

            previewElem.onclick = () => {
                this.requestFocus();
            };

            new CommittableRecycler(previewElem)
                .view(r => {
                     if(interactsWithFillChar(this.#editorView)) {
                         this.#editorView.viewFillChar(r)
                     }
                 })
                .commit();
        });
    }
}
