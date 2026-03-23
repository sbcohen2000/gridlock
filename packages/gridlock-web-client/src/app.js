import { view, state, framework } from "gridlock-lib";

import binder_ring_center_url from "../www/assets/binder-ring-center.png";
import binder_ring_end_url from "../www/assets/binder-ring-end.png";
import { describeToolbar } from "./toolbar.js";

// Reload the page when esbuild issues a change event.
new EventSource('/esbuild').addEventListener('change', () => {
    location.reload();
});

/**
 * The width of the spiral binding.
 */
const BINDING_WIDTH = 24; //px;

class AppView extends view.AbstractView {
    /** @type {view.AbstractEditorView} */
    #editorView;

    /**
     * @param {view.AbstractView} parent
     * @param {view.AbstractEditorView} initialEditorView
     */
    constructor(parent, initialEditorView) {
        super(parent);
        this.#replaceViewFromState(initialEditorView);
    }

    /*************************************************************************/
    /** Spiral-Ring Binding                                                 **/

    /**
     * The HTML element used to represent the spiral-ring binding.
     * @type {HTMLElement | undefined}
     */
    #bindingElem;

    /**
     * Update the spiral-ring binding visualization given the height
     * of the editor view in pixels.
     *
     * @param {number} height The height of the editor view in pixels.
     */
    #updateBinding(height) {
        if(!this.#bindingElem) {
            console.warn("Tried to update the spiral binding, but it's element is undefined");
            return;
        }

        const TOTAL_IMG_WIDTH = 41.6; // px, image coords.
        const PAGE_IMG_WIDTH  = 29;   // px, image coords.
        const IMG_HEIGHT      = 13;   // px, image coords.

        // The number of screen pixels for one image pixel.
        const imagePxToScreenPx = BINDING_WIDTH / PAGE_IMG_WIDTH;

        // Height of an image in screen pixels.
        const imgScreenHeight = IMG_HEIGHT * imagePxToScreenPx;

        const nCenters = Math.round(height / imgScreenHeight) - 1;

        const centerIndices = Array.from({ length: nCenters }, (_, i) => i);
        new framework.CommittableRecycler(this.#bindingElem)
            .elems(centerIndices, "img", (idx, image) => {
                const img = /** @type {HTMLImageElement} */ (image);
                img.width = TOTAL_IMG_WIDTH * imagePxToScreenPx;
                img.style.position = "absolute";
                img.style.top = `${idx * imgScreenHeight}px`;
                img.style.right = `0`;
                if(img.getAttribute("src") !== binder_ring_center_url) {
                    img.src = binder_ring_center_url;
                }
            })
            .elem({ tag: "img", key: "end-cap" }, (image) => {
                const img = /** @type {HTMLImageElement} */ (image);
                img.width = TOTAL_IMG_WIDTH * imagePxToScreenPx;
                img.style.position = "absolute";
                img.style.top = `${nCenters * imgScreenHeight}px`;
                img.style.right = `0`;
                if(img.getAttribute("src") !== binder_ring_end_url) {
                    img.src = binder_ring_end_url;
                }
            })
            .commit();
    }

    /** @type {ResizeObserver} */
    #rootElemResizeObserver = new ResizeObserver((entries) => {
        for(const entry of entries) {
            // The grid root has resized. We need to update the
            // spiral binding.
            this.#updateBinding(entry.borderBoxSize[0].blockSize);
        }
    });

    /**
     * View the spiral-ring binding to the left of the editor.
     *
     * @param {framework.Recycler} recycler The recycler to add to.
     */
    #viewBinding(recycler) {
        recycler.elem({ tag: "div", key: "binding" }, (bindingElem) => {
            this.#bindingElem = bindingElem;
            this.#bindingElem.className = "editor-binding";
            this.#bindingElem.style.width = `${BINDING_WIDTH}px`;
        });
    }

    /*************************************************************************/
    /** View                                                                **/

    /**
     * View the application.
     *
     * @param {framework.Recycler} r The recycler to add to.
     */
    view(r) {
        r.view(r => view.toolbar.ViewToolbar(describeToolbar(this.#editorView), r))
        r.elem({ tag: "div", key: "editor-box" }, e => {
            e.className = "editor-box";
            new framework.CommittableRecycler(e)
                .view(r => this.#viewBinding(r))
                .elem("div", e => {
                    this.#rootElemResizeObserver.disconnect();
                    new framework.CommittableRecycler(e)
                        .view(r => this.#editorView.view(r))
                        .commit();
                    this.#rootElemResizeObserver.observe(e);
                })
                .commit();
        });
    }

    /*************************************************************************/
    /** Event Handling                                                      **/

    /**
     * Replace the app's editor view.
     *
     * @param {view.AbstractEditorView} newView
     */
    #replaceViewFromState(newView) {
        const old = this.#editorView;
        this.#editorView = newView;
        newView.parent = this;

        if(old !== newView) {
            this.notifyViewDeleted(old);

            // Here, we `freeze` old in an attempt to catch bugs where
            // we use an editor view after it has been replaced.
            Object.freeze(old);
        }
        this.requestRedraw();
    }

    /**
     * @param {view.ViewEvent} e
     * @returns {boolean}
     */
    handleEvent(e) {
        if (e instanceof view.ReplaceEditorViewEvent) {
            this.#replaceViewFromState(e.newView);
            if(e.andThen) {
                e.andThen(e.newView);
            }
            // Only request focus if e.newView is still the current
            // view — it may have been replaced during andThen.
            if(this.#editorView === e.newView) {
                e.newView.requestFocus();
            }
            return true;
        }
        return false;
    }
}

function main() {
    let initialStateStr = localStorage.getItem("editorState");

    const initialViewState = view.mkInitialEditorViewState();

    /** @type {view.AbstractEditorView} */
    let initialView;
    try {
        if(!initialStateStr) {
            throw new Error("No saved state");
        }
        const g = state.serialize.parseCompactGrid(initialStateStr);
        initialView = new view.TextEditingView(
            initialViewState,
            state.TextPrims.editText({ grid: g })
        );
    } catch(e) {
        console.error("Could not recover saved state: ", e);
        initialView = new view.TextEditingView(
            initialViewState,
            state.TextPrims.mkEmpty({
                width: 30,
                height: 4
            })
        );
    }

    const topLevelView = new (class extends view.AbstractView {
        /** @type {AppView} */
        #appView;

        /** @type {view.AbstractView} */
        #focusedView;

        /** @type {ReturnType<requestAnimationFrame> | null} */
        #animFrame;

        /** @type {view.cmenu.ContextMenuView | undefined} */
        #currentContextMenu;

        /**
         * @param {view.AbstractView} parent
         * @param {view.AbstractEditorView} initialView The initial editor view
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
         * Set the currently focused view, dispatching the appropriate
         * events.
         *
         * @param {view.AbstractView} v
         */
        set focusedView(v) {
            if(this.#focusedView !== v) {
                let oldFocusedView = this.#focusedView;
                this.#focusedView = v;
                oldFocusedView.notify(new view.LostFocusViewEvent(this), true);
                this.#focusedView.notify(new view.ReceivedFocusViewEvent(this), true);
            }
        }

        /**
         * @param {view.ViewEvent} e
         * @returns {boolean}
         */
        handleEvent(e) {
            if (e instanceof view.ViewDeletedViewEvent) {
                if(this.#focusedView === e.view) {
                    this.#focusedView = this;
                    this.requestRedraw();
                }
                return true;
            } else if (e instanceof view.RedrawViewEvent) {
                this.requestRedraw();
                return true;
            } else if (e instanceof view.RequestFocusViewEvent) {
                if(this.#focusedView !== e.initiator) {
                    this.focusedView = e.initiator;
                    this.requestRedraw();
                }
                return true;
            } else if (e instanceof view.KeyViewEvent) {
                return true;
            } else if (e instanceof view.cmenu.OpenContextMenu) {
                const menu = new view.cmenu.ContextMenuView(this, e.menuDescr);
                this.#currentContextMenu = menu;
                this.requestRedraw();
                return true;
            } else if (e instanceof view.cmenu.DismissContextMenu) {
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
                    new view.KeyViewEvent(this.#currentContextMenu, e), true
                );
            } else if(this.#focusedView !== this) {
                this.#focusedView.notify(
                    new view.KeyViewEvent(this.#focusedView, e), true
                );
            }
        }

        /** @returns {HTMLElement} */
        view() {
            framework.RecycleStatistics.reset();

            const r = new framework.CommittableRecycler(document.body);
            this.#appView.view(r);

            if(this.#currentContextMenu) {
                this.#currentContextMenu.view(r);
            } else {
                r.elem({ tag: "div", key: "empty-context-menu" }, (_e) => {});
            }

            r.commit();

            // console.log(framework.RecycleStatistics.report());
            return document.body;
        }
    })(null, initialView);

    document.addEventListener("keydown", (e) => {
        topLevelView.handleKeyEvent(e);
    });

    topLevelView.requestRedraw();
}

document.addEventListener("DOMContentLoaded", main);
