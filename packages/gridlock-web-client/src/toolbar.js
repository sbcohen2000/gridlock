import { state, util, view, point } from "gridlock-lib";

import { EXAMPLES } from "./examples.js";
import { SHORT_COMMIT_HASH, COMMIT_HASH } from "./commit-hash.js";

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

/**
 * Build the standard set of toolbar items for an editor view.
 *
 * @param {view.AbstractEditorView} editorView The editor view to build toolbar items for.
 * @returns {view.toolbar.ToolbarItemDescription[]}
 */
export function describeToolbar(editorView) {
    return [{
        type: "button",
        key: "undo-button",
        iconSrc: undo_icon_url,
        label: "undo",
        onclick: () => {
            editorView.undo();
        }
    }, {
        type: "button",
        key: "redo-button",
        iconSrc: redo_icon_url,
        label: "redo",
        onclick: () => {
            editorView.redo();
        }
    }, {
        type: "divider",
        key: "divider-1",
    }, {
        type: "button",
        key: "edit-text-button",
        iconSrc: edit_text_icon_url,
        label: "edit text",
        enabled: editorView instanceof view.TextEditingView,
        onclick: () => {
            const [inv, st] = state.inverse.withSnapshotInverse(state.TextPrims.editText, "edit text")(editorView.state);
            editorView.commitInverse(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        key: "select-cells-button",
        iconSrc: select_cells_icon_url,
        label: "select cells",
        enabled: editorView instanceof view.CellEditingView,
        onclick: () => {
            const [inv, st] = state.inverse.withSnapshotInverse(state.CellPrims.editCells, "edit cells")(editorView.state);
            editorView.commitInverse(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        key: "merge-cells-button",
        iconSrc: merge_cells_icon_url,
        label: "merge cells",
        disabled: !(editorView instanceof view.CellEditingView) || !editorView._ceState.canMergeSelectedCells(),
        onclick: () => {
            if(!(editorView instanceof view.CellEditingView)) {
                return;
            }

            const inv = editorView._ceState.mergeSelectedCells();
            editorView.commitInverse(inv);
        }
    }, {
        type: "button",
        key: "trim-edge-button",
        iconSrc: trim_edge_icon_url,
        label: "trim edge",
        enabled: false,
        onclick: () => {
            throw new Error("TODO");
        }
    }, {
        type: "button",
        key: "split-row-button",
        iconSrc: split_row_icon_url,
        label: "split row",
        enabled: editorView instanceof view.RowSlicingView,
        onclick: () => {
            const [inv, st] = state.inverse.withSnapshotInverse(
                state.SliceRowPrims.sliceRow, "start slicing row")(editorView.state);
            editorView.commitInverse(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        key: "split-cell-button",
        iconSrc: split_cell_icon_url,
        label: "split cell",
        enabled: editorView instanceof view.CellSlicingView,
        onclick: () => {
            const [inv, st] = state.inverse.withSnapshotInverse(
                state.SliceCellPrims.sliceCell, "start slicing cells")(editorView.state);
            editorView.commitInverse(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "divider",
        key: "divider-2",
    }, {
        type: "button",
        key: "move-guide-button",
        iconSrc: move_guide_icon_url,
        label: "move guides",
        enabled: editorView.edgeDraggingMode === "Move",
        onclick: () => {
            editorView.edgeDraggingMode = "Move";
            editorView.requestRedraw();
        }
    }, {
        type: "button",
        key: "slide-guide-button",
        iconSrc: slide_guide_icon_url,
        label: "slide guides",
        enabled: editorView.edgeDraggingMode === "Slide",
        onclick: () => {
            editorView.edgeDraggingMode = "Slide";
            editorView.requestRedraw();
        }
    }, {
        type: "divider",
        key: "divider-3",
    }, {
        type: "button",
        key: "disable-cell-guides-button",
        iconSrc: disable_cell_guides_icon_url,
        label: "disable cell guides",
        enabled: editorView.cellGuidesDisabled,
        disabled: !editorView.canDisableCellGuides,
        onclick: () => {
            editorView.toggleCellGuidesDisabled();
        },
    }, {
        type: "spacer",
        key: "spacer-1",
    }, {
        type: "button",
        key: "save-button",
        iconSrc: save_icon_url,
        label: "save",
        onclick: () => {
            const serialized = state.serialize.printCompactGrid(editorView.state);
            localStorage.setItem("editorState", serialized);
        },
    }, {
        type: "button",
        key: "load-button",
        label: "load",
        iconSrc: load_icon_url,
        onclick: (e) => {
            /** @type {view.cmenu.ContextMenuItem[]} */
            const examples = [...Object.entries(EXAMPLES).map(([key, val]) => {
                if(key === "LABEL") {
                    return view.cmenu.label(val);
                } else {
                    return view.cmenu.button(key, () => {
                        const grid = state.serialize.parseCompactGrid(val);
                        const freshView = editorView.createViewForState(state.TextPrims.editText({ grid }));
                        editorView.requestReplaceEditorView(freshView);
                    })
                }
            })];

            /** @type {view.cmenu.ContextMenuItem[]} */
            const footer = [
                view.cmenu.divider(),
                view.cmenu.button("clear", () => {
                    const freshView = editorView.createViewForState(state.TextPrims.mkEmpty());
                    editorView.requestReplaceEditorView(freshView);
                })
            ];

            /** @type {view.cmenu.ContextMenuDescription} */
            const menuDescr = {
                origin: point.mkP2(e.clientX, e.clientY),
                menu: examples.concat(footer)
            };
            editorView.notify(new view.cmenu.OpenContextMenu(editorView, menuDescr));
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
            /** @type {view.cmenu.ContextMenuDescription} */
            const menuDescr = {
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
                        const serialized = state.serialize.printCommonState(editorView.state);
                        console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
                    }),
                    view.cmenu.button("Print Compact Repr.", () => {
                        const serialized = state.serialize.printCompactGrid(editorView.state);
                        console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
                    })
                ]
            };
            editorView.notify(new view.cmenu.OpenContextMenu(editorView, menuDescr))
        }
    }];
}
