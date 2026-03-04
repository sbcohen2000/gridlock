import * as cmenu from "./context-menu.js";
import * as serialize from "./editor/serialize-common-state.js";
import * as textPrims from "./editor/text-prims/text-prims.js";
import * as util from "./util.js";
import GLPK from "glpk.js";
import { EditorView, ReplaceEditorViewEvent } from "./editor-view.js";
import { TextEditingView } from "./editor-view/text-editing-view.js";
import { View, RedrawViewEvent, RequestFocusViewEvent, KeyViewEvent, ViewDeletedViewEvent } from "./view.js";
import { mkToolbarItem } from "./editor-view/toolbar.js";
import { theGLPKInstance } from "./glpk.js";

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
     * @param {EditorView} initialEditorView
     */
    constructor(parent, initialEditorView) {
        super(parent);
        this.#replaceViewFromState(initialEditorView);
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
     * Replace the app's editor view.
     *
     * @param {EditorView} newView
     */
    #replaceViewFromState(newView) {
        const old = this.#editorView;
        this.#editorView = newView;
        newView.parent = this;
        this.notifyViewDeleted(old);
        this.requestRedraw();
    }

    /**
     * @param {import("./view.js").ViewEvent} e
     * @returns {boolean}
     */
    handleEvent(e) {
        if (e instanceof ReplaceEditorViewEvent) {
            this.#replaceViewFromState(e.newView);
            return true;
        }
        return false;
    }
}

async function main() {
    theGLPKInstance.glpk = await GLPK();

    const editorRoot = document.getElementById("editor-root");
    if(!editorRoot) {
        throw new Error("Could not find #editor-root element");
    }

    let initialStateStr = localStorage.getItem("editorState");
    /** @type {EditorView} */
    let initialView;
    if(initialStateStr) {
        initialView = new TextEditingView(null, textPrims.editText(serialize.commonStateFromString(initialStateStr)));
    } else {
        initialView = new TextEditingView(null, textPrims.editText(serialize.mkCommonState()));
    }

    const topLevelView = new (class extends View {
        /** @type {AppView} */
        #appView;

        /** @type {View} */
        #focusedView;

        /** @type {ReturnType<requestAnimationFrame> | null} */
        #animFrame;

        /** @type {cmenu.ContextMenu | undefined} */
        #currentContextMenu;

        /**
         * @param {View} parent
         * @param {EditorView} initialView The initial editor view
         */
        constructor(parent, initialView) {
            super(parent);
            this.#appView = new AppView(this, initialView);
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
         * @param {import("./view.js").ViewEvent} e
         * @returns {boolean}
         */
        handleEvent(e) {
            if (e instanceof ViewDeletedViewEvent) {
                if(this.#focusedView === e.view) {
                    console.log("The focused view was deleted.");
                    this.#focusedView = this;
                    this.requestRedraw();
                }
                return true;
            } else if (e instanceof RedrawViewEvent) {
                this.requestRedraw();
                return true;
            } else if (e instanceof RequestFocusViewEvent) {
                if(this.#focusedView !== e.initiator) {
                    console.log("Focus updated");
                    this.#focusedView = e.initiator;
                    this.requestRedraw();
                }
                return true;
            } else if (e instanceof KeyViewEvent) {
                return true;
            } else if (e instanceof cmenu.OpenContextMenu) {
                const menu = new cmenu.ContextMenuView(this, e.menuDescr);
                this.#currentContextMenu = menu;
                this.requestRedraw();
                return true;
            } else if (e instanceof cmenu.DismissContextMenu) {
                const menu = this.#currentContextMenu;
                this.#currentContextMenu = undefined;
                this.notifyViewDeleted(menu);
                this.requestRedraw();
                return true;
            }
            return false;
        }

        /**
         * @param {KeyboardEvent} e
         */
        handleKeyEvent(e) {
            if(this.#currentContextMenu) {
                this.#currentContextMenu.notify(
                    new KeyViewEvent(this.#currentContextMenu, e), true
                );
            } else if(this.#focusedView !== this) {
                this.#focusedView.notify(
                    new KeyViewEvent(this.#focusedView, e), true
                );
            }
        }

        /** @returns {HTMLElement} */
        view() {
            util.RecycleStatistics.reset();

            util.recycleConstChildren(
                editorRoot,
                (prev) => this.#appView.view(prev),
                (prev) => this.#currentContextMenu
                    ? this.#currentContextMenu.view(prev)
                    : document.createElement("div")
            );

            // console.log(util.RecycleStatistics.report());
            return editorRoot;
        }
    })(null, initialView);

    document.addEventListener("keydown", async (e) => {
        topLevelView.handleKeyEvent(e);
    });

    topLevelView.requestRedraw();
}

document.addEventListener("DOMContentLoaded", main);
