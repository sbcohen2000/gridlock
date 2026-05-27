import "gridlock-lib/dist/index.css";
import "./app.css";
import { view, state, framework } from "gridlock-lib";

import { EXAMPLES } from "./examples.js";
import { SHORT_COMMIT_HASH, COMMIT_HASH } from "./commit-hash.js";

import binder_ring_center_url       from "../../../assets/binder-ring-center.png";
import binder_ring_end_url          from "../../../assets/binder-ring-end.png";
import disable_cell_guides_icon_url from "../../../assets/disable-cell-guides-icon.png";
import edit_text_icon_url           from "../../../assets/edit-text-icon.png";
import info_icon_url                from "../../../assets/info-icon.png";
import load_icon_url                from "../../../assets/load-icon.png";
import merge_cells_icon_url         from "../../../assets/merge-cells-icon.png";
import move_guide_icon_url          from "../../../assets/move-guide-icon.png";
import redo_icon_url                from "../../../assets/redo-icon.png";
import save_icon_url                from "../../../assets/save-icon.png";
import select_cells_icon_url        from "../../../assets/select-cells-icon.png";
import slide_guide_icon_url         from "../../../assets/slide-guide-icon.png"
import split_cell_icon_url          from "../../../assets/split-cell-icon.png";
import split_row_icon_url           from "../../../assets/split-row-icon.png";
import trim_edge_icon_url           from "../../../assets/trim-edge-icon.png";
import undo_icon_url                from "../../../assets/undo-icon.png";

// Reload the page when esbuild issues a change event.
new EventSource('/esbuild').addEventListener('change', () => {
    location.reload();
});

/**
 * The width of the spiral binding.
 */
const BINDING_WIDTH = 24; //px;

class AppView extends view.AbstractView {
    #editorView: view.AnyEditorView;
    #toolbarView: view.toolbar.ToolbarView;
    #redrawDebugView: view.RedrawDebugView;

    constructor(parent: view.AbstractView, editorState: state.AnyState) {
        super(parent);
        this.#editorView = view.EditorView(this, editorState);

        // Expose some functions on the window which can be used for
        // testing.
        {
            window["printCompactGrid"]  = () => state.serialize.printCompactGrid(this.#editorView.state.editorState);
            window["clearLocalStorage"] = () => localStorage.clear();
        }

        this.#redrawDebugView = new view.RedrawDebugView(this)
        this.#toolbarView = new view.toolbar.ToolbarView(this, [{
            type: "custom",
            key: "testy",
            view: this.#redrawDebugView
        }]);
    }

    /*************************************************************************/
    /** Spiral-Ring Binding                                                 **/

    /**
     * The HTML element used to represent the spiral-ring binding.
     */
    #bindingElem: HTMLElement | undefined;

    /**
     * Update the spiral-ring binding visualization given the height
     * of the editor view in pixels.
     *
     * @param height The height of the editor view in pixels.
     */
    #updateBinding(height: number) {
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
     * @param recycler The recycler to add to.
     */
    #viewBinding(recycler: framework.Recycler) {
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
     */
    view(r: framework.Recycler) {
        r.view(r => this.#toolbarView.view(r));
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
    /** Debugging                                                           **/

    recordRedraw(pctRecycled: number) {
        this.#redrawDebugView.recordRedraw(pctRecycled);
    }
}

function main() {
    let initialStateStr = localStorage.getItem("editorState");

    let initialEditorState: state.TextPrims;
    try {
        if(!initialStateStr) {
            throw new Error("No saved state");
        }
        const g = state.serialize.parseCompactGrid(initialStateStr);
        initialEditorState = state.TextPrims.editText({ grid: g });
    } catch(e) {
        console.error("Could not recover saved state: ", e);
        initialEditorState = state.TextPrims.mkEmpty({
            width: 30,
            height: 4
        });
    }

    const topLevelView = new (class extends view.AbstractView {
        #topView: view.FocusManager<AppView>;
        #animFrame: ReturnType<typeof requestAnimationFrame> | null;
        #currentContextMenu: view.cmenu.ContextMenuView | undefined;

        constructor(parent: view.AbstractView | null, editorState: state.AnyState) {
            super(parent);
            this.#topView = new view.FocusManager(this, fmgr => new AppView(fmgr, editorState));
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

        handleEvent(e: view.ViewEvent): boolean {
            if (e instanceof view.RedrawViewEvent) {
                this.requestRedraw();
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
                if(menu) {
                    this.notifyViewDeleted(menu);
                }
                this.requestRedraw();
                return true;
            }
            return false;
        }

        handleKeyEvent(e: KeyboardEvent) {
            if(this.#currentContextMenu) {
                this.#currentContextMenu.notify(
                    new view.KeyViewEvent(this.#currentContextMenu, e),
                    true
                );
            } else if(this.#topView.focusedView) {
                this.#topView.focusedView.notify(
                    new view.KeyViewEvent(this.#topView.focusedView, e),
                    true
                );
            }
        }

        view(): HTMLElement {
            framework.RecycleStatistics.reset();

            const r = new framework.CommittableRecycler(document.body);
            this.#topView.view(r);

            if(this.#currentContextMenu) {
                this.#currentContextMenu.view(r);
            } else {
                r.elem({ tag: "div", key: "empty-context-menu" }, (_e) => {});
            }

            r.commit();

            this.#topView.child.recordRedraw(framework.RecycleStatistics.recycledPct);
            return document.body;
        }
    })(null, initialEditorState);

    document.addEventListener("keydown", (e) => {
        topLevelView.handleKeyEvent(e);
    });

    topLevelView.requestRedraw();
}

document.addEventListener("DOMContentLoaded", main);
