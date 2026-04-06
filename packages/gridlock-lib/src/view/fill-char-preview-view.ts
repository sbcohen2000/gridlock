import "./fill-char-preview-view.css";
import { CommittableRecycler, Recycler } from "../framework/framework.js";
import { AbstractEditorView } from "./abstract-editor-view.js";
import { AbstractView, KeyViewEvent, ViewEvent } from "./abstract-view.js";
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
        const ev = this.#editorView;
        if(!interactsWithFillChar(ev)) {
            return;
        }

        r.elem({ tag: "div", key: "fill-char-preview-view" }, previewElem => {
            previewElem.className = "editor-fill-char-preview-view";
            if(this.hasFocus) {
                previewElem.classList.add("editor-fill-char-preview-view-focused");
            }

            previewElem.onclick = () => {
                this.requestFocus();
            };

            new CommittableRecycler(previewElem)
                .view(r => ev.viewFillChar(r))
                .commit();
        });
    }

    #handleKeyEvent(e: KeyboardEvent): boolean {
        if(e.key.length === 1 && !e.ctrlKey) {
            if(interactsWithFillChar(this.#editorView)) {
                this.#editorView.commitInverse(this.#editorView.setFillChar(e.key));
                return true;
            }
        }

        return false;
    }

    handleEvent(e: ViewEvent): boolean {
        if(e instanceof KeyViewEvent) {
            e.e.preventDefault();
            e.e.stopPropagation();
            if(this.#handleKeyEvent(e.e)) {
                return true;
            }
        }

        return super.handleEvent(e);
    }
}
