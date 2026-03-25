import { util, view, state, framework, point } from "gridlock-lib";

import { EXAMPLES } from "./examples.js";
import { SHORT_COMMIT_HASH, COMMIT_HASH } from "./commit-hash.js";

import binder_ring_center_url       from "../www/assets/binder-ring-center.png";
import binder_ring_end_url          from "../www/assets/binder-ring-end.png";
import disable_cell_guides_icon_url from "../www/assets/disable-cell-guides-icon.png";
import edit_text_icon_url           from "../www/assets/edit-text-icon.png";
import info_icon_url                from "../www/assets/info-icon.png";
import load_icon_url                from "../www/assets/load-icon.png";
import merge_cells_icon_url         from "../www/assets/merge-cells-icon.png";
import move_guide_icon_url          from "../www/assets/move-guide-icon.png";
import redo_icon_url                from "../www/assets/redo-icon.png";
import save_icon_url                from "../www/assets/save-icon.png";
import select_cells_icon_url        from "../www/assets/select-cells-icon.png";
import slide_guide_icon_url         from "../www/assets/slide-guide-icon.png"
import split_cell_icon_url          from "../www/assets/split-cell-icon.png";
import split_row_icon_url           from "../www/assets/split-row-icon.png";
import trim_edge_icon_url           from "../www/assets/trim-edge-icon.png";
import undo_icon_url                from "../www/assets/undo-icon.png";

// Reload the page when esbuild issues a change event.
new EventSource('/esbuild').addEventListener('change', () => {
    location.reload();
});

/**
 * The width of the spiral binding.
 */
const BINDING_WIDTH = 24; //px;

class AppView extends view.AbstractView {
    #editorView: view.AbstractEditorView;
    #toolbarView: view.toolbar.ToolbarView;

    constructor(parent: view.AbstractView, initialEditorView: view.AbstractEditorView) {
        super(parent);
        this.#replaceEditorView(initialEditorView);
        this.#toolbarView = new view.toolbar.ToolbarView(this, [{
            type: "button",
            key: "undo-button",
            iconSrc: undo_icon_url,
            label: "undo",
            onclick: () => {
                this.#editorView.undo();
            }
        }, {
            type: "button",
            key: "redo-button",
            iconSrc: redo_icon_url,
            label: "redo",
            onclick: () => {
                this.#editorView.redo();
            }
        }, {
            type: "divider",
            key: "divider-1",
        }, {
            type: "button",
            key: "edit-text-button",
            iconSrc: edit_text_icon_url,
            label: "edit text",
            enabled: () => this.#editorView instanceof view.TextEditingView,
            onclick: () => {
                const [inv, st] = state.inverse.withSnapshotInverse(state.TextPrims.editText, "edit text")(this.#editorView.state);
                this.#editorView.commitInverse(inv);
                this.#editorView.requestReplaceEditorView(this.#editorView.createViewForState(st));
            }
        }, {
            type: "button",
            key: "select-cells-button",
            iconSrc: select_cells_icon_url,
            label: "select cells",
            enabled: () => this.#editorView instanceof view.CellEditingView,
            onclick: () => {
                const [inv, st] = state.inverse.withSnapshotInverse(state.CellPrims.editCells, "edit cells")(this.#editorView.state);
                this.#editorView.commitInverse(inv);
                this.#editorView.requestReplaceEditorView(this.#editorView.createViewForState(st));
            }
        }, {
            type: "button",
            key: "merge-cells-button",
            iconSrc: merge_cells_icon_url,
            label: "merge cells",
            disabled: () => !(this.#editorView instanceof view.CellEditingView)
                || !this.#editorView._ceState.canMergeSelectedCells(),
            onclick: () => {
                if(!(this.#editorView instanceof view.CellEditingView)) {
                    return;
                }

                const inv = this.#editorView._ceState.mergeSelectedCells();
                this.#editorView.commitInverse(inv);
            }
        }, {
            type: "button",
            key: "trim-edge-button",
            iconSrc: trim_edge_icon_url,
            label: "trim edge",
            enabled: () => false,
            onclick: () => {
                throw new Error("TODO");
            }
        }, {
            type: "button",
            key: "split-row-button",
            iconSrc: split_row_icon_url,
            label: "split row",
            enabled: () => this.#editorView instanceof view.RowSlicingView,
            onclick: () => {
                const [inv, st] = state.inverse.withSnapshotInverse(
                    state.SliceRowPrims.sliceRow, "start slicing row")(this.#editorView.state);
                this.#editorView.commitInverse(inv);
                this.#editorView.requestReplaceEditorView(this.#editorView.createViewForState(st));
            }
        }, {
            type: "button",
            key: "split-cell-button",
            iconSrc: split_cell_icon_url,
            label: "split cell",
            enabled: () => this.#editorView instanceof view.CellSlicingView,
            onclick: () => {
                const [inv, st] = state.inverse.withSnapshotInverse(
                    state.SliceCellPrims.sliceCell, "start slicing cells")(this.#editorView.state);
                this.#editorView.commitInverse(inv);
                this.#editorView.requestReplaceEditorView(this.#editorView.createViewForState(st));
            }
        }, {
            type: "divider",
            key: "divider-2",
        }, {
            type: "button",
            key: "move-guide-button",
            iconSrc: move_guide_icon_url,
            label: "move guides",
            enabled: () => this.#editorView.edgeDraggingMode === "Move",
            onclick: () => {
                this.#editorView.edgeDraggingMode = "Move";
                this.#editorView.requestRedraw();
            }
        }, {
            type: "button",
            key: "slide-guide-button",
            iconSrc: slide_guide_icon_url,
            label: "slide guides",
            enabled: () => this.#editorView.edgeDraggingMode === "Slide",
            onclick: () => {
                this.#editorView.edgeDraggingMode = "Slide";
                this.#editorView.requestRedraw();
            }
        }, {
            type: "divider",
            key: "divider-3",
        }, {
            type: "button",
            key: "disable-cell-guides-button",
            iconSrc: disable_cell_guides_icon_url,
            label: "disable cell guides",
            enabled: () => this.#editorView.cellGuidesDisabled,
            disabled: () => !this.#editorView.canDisableCellGuides,
            onclick: () => {
                this.#editorView.toggleCellGuidesDisabled();
            },
        }, {
            type: "spacer",
            key: "spacer-1",
        }, {
            type: "custom",
            key: "fill-char-text-input",
            constructView: (parent) => new view.FillCharPreviewView(parent, this.#editorView),
        }, {
            type: "spacer",
            key: "spacer-2"
        }, {
            type: "button",
            key: "save-button",
            iconSrc: save_icon_url,
            label: "save",
            onclick: () => {
                const serialized = state.serialize.printCompactGrid(this.#editorView.state);
                localStorage.setItem("editorState", serialized);
            },
        }, {
            type: "button",
            key: "load-button",
            label: "load",
            iconSrc: load_icon_url,
            onclick: (e) => {
                const examples: view.cmenu.ContextMenuItem[] =
                      [...Object.entries(EXAMPLES).map(([key, val]) => {
                          if(key === val) {
                              return view.cmenu.label(val);
                          } else {
                              return view.cmenu.button(key, () => {
                                  const grid = state.serialize.parseCompactGrid(val);
                                  const freshView = this.#editorView.createViewForState(state.TextPrims.editText({ grid }));
                                  this.#editorView.requestReplaceEditorView(freshView);
                              })
                          }
                      })];

                const footer: view.cmenu.ContextMenuItem[] = [
                    view.cmenu.divider(),
                    view.cmenu.button("clear", () => {
                        const freshView = this.#editorView.createViewForState(state.TextPrims.mkEmpty());
                        this.#editorView.requestReplaceEditorView(freshView);
                    })
                ];

                const menuDescr = {
                    origin: point.mkP2(e.clientX, e.clientY),
                    menu: examples.concat(footer)
                };
                this.#editorView.notify(new view.cmenu.OpenContextMenu(this.#editorView, menuDescr));
            },
        }, {
            type: "divider",
            key: "divier-3",
        }, {
            type: "button",
            label: "about",
            key: "about-button",
            iconSrc: info_icon_url,
            onclick: (e) => {
                const menuDescr: view.cmenu.ContextMenuDescription = {
                    origin: point.mkP2(e.clientX, e.clientY),
                    menu: [
                        view.cmenu.label("About"),
                        view.cmenu.button("Fork me on GitHub", () => {
                            window.open("https://github.com/sbcohen2000/gridlock", "_blank");
                        }),
                        view.cmenu.button(SHORT_COMMIT_HASH, () => {
                            window.open(`https://github.com/sbcohen2000/gridlock/commit/${COMMIT_HASH}`, "_blank");
                        }),
                        view.cmenu.divider(),
                        view.cmenu.button("Print ASCII Repr.", () => {
                            const serialized = state.serialize.printCommonState(this.#editorView.state);
                            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
                        }),
                        view.cmenu.button("Print Compact Repr.", () => {
                            const serialized = state.serialize.printCompactGrid(this.#editorView.state);
                            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
                        })
                    ]
                };
                this.#editorView.notify(new view.cmenu.OpenContextMenu(this.#editorView, menuDescr))
            }
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
    /** Event Handling                                                      **/

    /**
     * Replace the app's editor view.
     */
    #replaceEditorView(newView: view.AbstractEditorView) {
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

    handleEvent(e: view.ViewEvent): boolean {
        if (e instanceof view.ReplaceEditorViewEvent) {
            this.#replaceEditorView(e.newView);
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

    let initialView: view.AbstractEditorView;
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
        #appView: AppView;
        #focusedView: view.AbstractView;
        #animFrame: ReturnType<typeof requestAnimationFrame> | null;
        #currentContextMenu: view.cmenu.ContextMenuView | undefined;

        constructor(parent: view.AbstractView | null, initialView: view.AbstractEditorView) {
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
         */
        set focusedView(v: view.AbstractView) {
            if(this.#focusedView !== v) {
                let oldFocusedView = this.#focusedView;
                this.#focusedView = v;

                if(oldFocusedView) {
                    oldFocusedView.notify(new view.LostFocusViewEvent(this), true);
                }

                util.assert(this.#focusedView instanceof view.AbstractView, "The focused view is not a view.");
                this.#focusedView.notify(new view.ReceivedFocusViewEvent(this), true);
            }
        }

        handleEvent(e: view.ViewEvent): boolean {
            if (e instanceof view.ViewDeletedViewEvent) {
                if(this.#focusedView === e.deletedView) {
                    if(e.replacementView) {
                        // If the deleted view was replaced with a
                        // different one, focus the new view.
                        this.focusedView = e.replacementView;
                    } else {
                        // Otherwise, focus ourselves.
                        this.focusedView = this;
                    }
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
            } else if (e instanceof view.ReleaseFocusViewEvent) {
                if(this.#focusedView === e.initiator) {
                    this.focusedView = this;
                    this.requestRedraw();
                }
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
                    new view.KeyViewEvent(this.#currentContextMenu, e), true
                );
            } else if(this.#focusedView !== this) {
                this.#focusedView.notify(
                    new view.KeyViewEvent(this.#focusedView, e), true
                );
            }
        }

        view(): HTMLElement {
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
