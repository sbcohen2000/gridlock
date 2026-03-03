import * as serialize from "./editor/serialize-common-state.js";
import * as textPrims from "./editor/text-prims/text-prims.js";
import * as util from "./util.js";
import * as view from "./view.js";
import GLPK from "glpk.js";
import { CellEditingView } from "./editor-view/cell-editing-view.js";
import { EditorView } from "./editor-view.js";
import { VerticalCellSlicingView, HorizontalCellSlicingView } from "./editor-view/cell-slicing-view.js";
import { TextEditingView } from "./editor-view/text-editing-view.js";
import { View } from "./view.js";
import { theGLPKInstance } from "./glpk.js";
import { mkToolbarItem } from "./editor-view/toolbar.js";

/** @import { AnyState } from "./editor/any-state.d.ts" */

// Reload the page when esbuild issues a change event.
//
// If any of the changes was to a CSS file, we can do a hot-reload by
// replacing the link tag.
new EventSource('/esbuild').addEventListener('change', e => {
    const { added, removed, updated } = JSON.parse(e.data)

    if (!added.length && !removed.length && updated.length === 1) {
        for (const link of document.getElementsByTagName("link")) {
            const url = new URL(link.href)

            if (url.host === location.host && url.pathname === updated[0]) {
                const next = /** @type {HTMLLinkElement} */ (link.cloneNode());
                next.href = updated[0] + '?' + Math.random().toString(36).slice(2);
                next.onload = () => link.remove();
                if(link.parentNode) {
                    link.parentNode.insertBefore(next, link.nextSibling);
                }
                return;
            }
        }
    }

    location.reload();
})

class AppView extends View {
    /** @type {EditorView} */
    #editorView;

    /**
     * @param {View} parent
     * @param {AnyState} st
     */
    constructor(parent, st) {
        super(parent);
        this.#replaceViewFromState(st);
    }

    /**
     * View the editor's toolbar.
     *
     * @param {HTMLElement} [prev] An existing toolbar element to update in place.
     * @returns {HTMLElement} The HTML element generated to represent
     *     the editor's toolbar.
     */
    #viewToolbar(prev) {
        const toolbarElem = prev ?? document.createElement("div");
        toolbarElem.className = "editor-toolbar";

        const descriptions = this.#editorView.describeToolbarItems();
        util.recycleChildren(
            toolbarElem, descriptions,
            (descr, prev) => mkToolbarItem(descr, prev)
        );
        return toolbarElem;
    }

    /**
     * View the application rooted at the element `root`.
     *
     * @param {HTMLElement} [prev] An existing element to update in place.
     * @returns {HTMLElement}
     */
    view(prev) {
        const root = prev ?? document.createElement("div");
        util.recycleConstChildren(root,
            (prev) => this.#viewToolbar(prev),
            (prev) => this.#editorView.view(prev)
        );
        return root;
    }

    /**
     * Replace the app's editor view based on the kind of state passed
     * to this function.
     *
     * @param {AnyState} st
     */
    #replaceViewFromState(st) {
        const old = this.#editorView;
        switch(st.type) {
        case "TextPrimsState":
            this.#editorView = new TextEditingView(this, st); break;
        case "CellPrimsState":
            this.#editorView = new CellEditingView(this, st); break;
        case "SlicePrimsState":
            if(st.direction === "Vertical") {
                this.#editorView = new VerticalCellSlicingView(this, st);
            } else {
                this.#editorView = new HorizontalCellSlicingView(this, st);
            }
            break;
        }
        this.notifyViewDeleted(old);
        this.requestRedraw();
    }

    /**
     * @param {view.Event & view.EventInitiator} e
     * @returns {boolean}
     */
    handleEvent(e) {
        switch(e.type) {
        case "ReplaceEditorViewEvent": {
            this.#replaceViewFromState(e.newState);
            return true;
        }
        default:
            return false;
        }
    }
}

async function main() {
    theGLPKInstance.glpk = await GLPK();

    const editorRoot = document.getElementById("editor-root");
    if(!editorRoot) {
        throw new Error("Could not find #editor-root element");
    }

    let initialStateStr = localStorage.getItem("editorState");
    /** @type {AnyState} */
    let initialState;
    if(initialStateStr) {
        initialState = textPrims.editText(serialize.commonStateFromString(initialStateStr));
    } else {
        initialState = textPrims.editText(serialize.mkCommonState());
    }

    const topLevelView = new (class extends View {
        /** @type {AppView} */
        #appView;

        /** @type {View} */
        #focusedView;

        /** @type {ReturnType<requestAnimationFrame> | null} */
        #animFrame;

        /**
         * @param {View} parent
         * @param {AnyState} st The initial state
         */
        constructor(parent, st) {
            super(parent);
            this.#appView = new AppView(this, st);
            this.#focusedView = this;
        }

        /**
         * Redraw the application by requesting an animation frame.
         * If another request to redraw comes in before the next
         * animation frame, we'll cancel the request and make a new
         * one.
         */
        requestRedraw() {
            if(this.#animFrame) {
                window.cancelAnimationFrame(this.#animFrame);
            }

            this.#animFrame = window.requestAnimationFrame(() => {
                this.#animFrame = null;
                this.view();
                return true;
            });
        }

        /**
         * @param {view.Event & view.EventInitiator} e
         * @returns {boolean}
         */
        handleEvent(e) {
            switch(e.type) {
            case "ViewDeletedEvent": {
                if(this.#focusedView === e.view) {
                    console.log("The focused view was deleted.");
                    this.#focusedView = this;
                    this.requestRedraw();
                }
                return true;
            }
            case "RedrawEvent": {
                this.requestRedraw();
                return true;
            }
            case "RequestFocusEvent": {
                if(this.#focusedView !== e.initiator) {
                    console.log("Focus updated");
                    this.#focusedView = e.initiator;
                    this.requestRedraw();
                }
                return true;
            }
            case "KeyEvent": {
                return true;
            }
            default: return false;
            }
        }

        /**
         * @param {KeyboardEvent} e
         */
        handleKeyEvent(e) {
            if(this.#focusedView !== this) {
                this.#focusedView.notify({
                    type: "KeyEvent",
                    bubbles: true,
                    e
                }, true);
            }
        }

        /** @returns {HTMLElement} */
        view() {
            util.RecycleStatistics.reset();
            this.#appView.view(editorRoot);
            // console.log(util.RecycleStatistics.report());
            return editorRoot;
        }
    })(null, initialState);


    document.addEventListener("keydown", async (e) => {
        topLevelView.handleKeyEvent(e);
    });

    topLevelView.requestRedraw();
}

document.addEventListener("DOMContentLoaded", main);
