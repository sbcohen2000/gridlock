import { state, util, view, point } from "gridlock-lib";

const {
    cellPrims,
    textPrims,
    slicePrims
} = state;

import { SHORT_COMMIT_HASH, COMMIT_HASH } from "./commit-hash.js";

import edit_text_icon_url from "../../www/assets/edit-text-icon.png"
import info_icon_url from "../../www/assets/info-icon.png"
import load_icon_url from "../../www/assets/load-icon.png";
import merge_cells_icon_url from "../../www/assets/merge-cells-icon.png"
import move_guide_icon_url from "../../www/assets/move-guide-icon.png"
import save_icon_url from "../../www/assets/save-icon.png";
import select_cells_icon_url from "../../www/assets/select-cells-icon.png";
import slide_guide_icon_url from "../../www/assets/slide-guide-icon.png"
import split_horizontally_icon_url from "../../www/assets/split-horizontally-icon.png";
import split_vertically_icon_url from "../../www/assets/split-vertically-icon.png";
import trim_edge_icon_url from "../../www/assets/trim-edge-icon.png";

/**
 * Build the standard set of toolbar items for an editor view.
 *
 * @param {view.AbstractEditorView} editorView The editor view to build toolbar items for.
 * @param {string} [enabledLabel] If provided, the button with this label
 *     will be enabled.
 * @returns {view.toolbar.ToolbarDescription[]}
 */
export function standardToolbarItems(editorView, enabledLabel) {
    /** @param {string} label */
    const maybeEnabled = (label) => label === enabledLabel ? { enabled: true } : {};

    return [{
        type: "button",
        iconSrc: edit_text_icon_url,
        label: "edit text",
        ...maybeEnabled("edit text"),
        onclick: () => {
            const [st, inv] = textPrims.editText(editorView.state);
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        iconSrc: select_cells_icon_url,
        label: "select cells",
        ...maybeEnabled("select cells"),
        onclick: () => {
            const [st, inv] = cellPrims.editCells(editorView.state);
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        iconSrc: merge_cells_icon_url,
        label: "merge cells",
        ...maybeEnabled("merge cells"),
        onclick: () => {
            console.log("TODO (merge cells)");
        }
    }, {
        type: "button",
        iconSrc: trim_edge_icon_url,
        label: "trim edge",
        ...maybeEnabled("trim edge"),
        onclick: () => {
            console.log("TODO (trim edge)");
        }
    }, {
        type: "button",
        iconSrc: split_vertically_icon_url,
        label: "split vertically",
        ...maybeEnabled("split vertically"),
        onclick: () => {
            const [st, inv] = slicePrims.editVerticalSlice(editorView.state);
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "button",
        iconSrc: split_horizontally_icon_url,
        label: "split horizontally",
        ...maybeEnabled("split horizontally"),
        onclick: () => {
            const [st, inv] = slicePrims.editHorizontalSlice(editorView.state);
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(editorView.createViewForState(st));
        }
    }, {
        type: "divider",
    }, {
        type: "button",
        iconSrc: move_guide_icon_url,
        label: "move guides",
        enabled: editorView.edgeDraggingMode === "Move",
        onclick: () => {
            editorView.edgeDraggingMode = "Move";
            editorView.requestRedraw();
        }
    }, {
        type: "button",
        iconSrc: slide_guide_icon_url,
        label: "slide guides",
        enabled: editorView.edgeDraggingMode === "Slide",
        onclick: () => {
            editorView.edgeDraggingMode = "Slide";
            editorView.requestRedraw();
        }
    }, {
        type: "divider",
    }, {
        type: "spacer",
    }, {
        type: "button",
        iconSrc: save_icon_url,
        label: "save",
        ...maybeEnabled("save"),
        onclick: () => {
            const serialized = state.serialize.printCommonState(editorView.state);
            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
            localStorage.setItem("editorState", serialized);
        },
    }, {
        type: "button",
        label: "load",
        iconSrc: load_icon_url,
        ...maybeEnabled("load"),
        onclick: (e) => {
            /** @type {view.cmenu.ContextMenuDescription} */
            const menuDescr = {
                origin: point.mkP2(e.clientX, e.clientY),
                menu: [
                    view.cmenu.label("examples"),
                    view.cmenu.button("example 1"),
                    view.cmenu.button("example 2"),
                    view.cmenu.button("example 3"),
                    view.cmenu.divider(),
                    view.cmenu.button("clear", () => {
                        const freshView = editorView.createViewForState(state.serialize.emptyTextEditingState());
                        editorView.requestReplaceEditorView(freshView);
                    })
                ]
            };
            editorView.notify(new view.cmenu.OpenContextMenu(editorView, menuDescr));
        },
    }, {
        type: "divider"
    }, {
        type: "button",
        label: "about",
        iconSrc: info_icon_url,
        ...maybeEnabled("about"),
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
                ]
            };
            editorView.notify(new view.cmenu.OpenContextMenu(editorView, menuDescr))
        }
    }];
}
