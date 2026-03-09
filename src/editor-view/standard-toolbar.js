import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import * as cmenu from "../context-menu.js";
import * as point from "../point.js";
import * as serialize from "../editor/serialize-common-state.js";
import * as slicePrims from "../editor/slice-prims/slice-prims.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import * as util from "../util.js";
import { SHORT_COMMIT_HASH, COMMIT_HASH } from "../commit-hash.js";
import { CellEditingView } from "./cell-editing-view.js";
import { HorizontalCellSlicingView, VerticalCellSlicingView } from "./cell-slicing-view.js";
import { TextEditingView } from "./text-editing-view.js";

/** @import { EditorView } from "../editor-view.js" */
/** @import { ToolbarDescription } from "./toolbar.js" */

import edit_text_icon_url from "../../www/assets/edit-text-icon.png"
import info_icon_url from "../../www/assets/info-icon.png"
import load_icon_url from "../../www/assets/load-icon.png";
import merge_cells_icon_url from "../../www/assets/merge-cells-icon.png"
import save_icon_url from "../../www/assets/save-icon.png";
import select_cells_icon_url from "../../www/assets/select-cells-icon.png";
import split_horizontally_icon_url from "../../www/assets/split-horizontally-icon.png";
import split_vertically_icon_url from "../../www/assets/split-vertically-icon.png";
import trim_edge_icon_url from "../../www/assets/trim-edge-icon.png";

/**
 * Build the standard set of toolbar items for an editor view.
 *
 * @param {EditorView} editorView The editor view to build toolbar items for.
 * @param {string} [enabledLabel] If provided, the button with this label
 *     will be enabled.
 * @returns {ToolbarDescription[]}
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
            editorView.requestReplaceEditorView(
                new TextEditingView(editorView.parent, editorView.history, st));
        }
    }, {
        type: "button",
        iconSrc: select_cells_icon_url,
        label: "select cells",
        ...maybeEnabled("select cells"),
        onclick: () => {
            const [st, inv] = cellPrims.editCells(editorView.state);
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(
                new CellEditingView(editorView.parent, editorView.history, st));
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
            const [st, inv] = slicePrims.editSlice(editorView.state, "Vertical");
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(
                new VerticalCellSlicingView(editorView.parent, editorView.history, st));
        }
    }, {
        type: "button",
        iconSrc: split_horizontally_icon_url,
        label: "split horizontally",
        ...maybeEnabled("split horizontally"),
        onclick: () => {
            const [st, inv] = slicePrims.editSlice(editorView.state, "Horizontal");
            editorView.commitUndoableItem(inv);
            editorView.requestReplaceEditorView(
                new HorizontalCellSlicingView(editorView.parent, editorView.history, st));
        }
    }, {
        type: "spacer",
    }, {
        type: "button",
        iconSrc: save_icon_url,
        label: "save",
        ...maybeEnabled("save"),
        onclick: () => {
            const serialized = serialize.printCommonState(editorView.state);
            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
            localStorage.setItem("editorState", serialized);
        },
    }, {
        type: "button",
        label: "load",
        iconSrc: load_icon_url,
        ...maybeEnabled("load"),
        onclick: (e) => {
            /** @type {cmenu.ContextMenuDescription} */
            const menuDescr = {
                origin: point.mkP2(e.clientX, e.clientY),
                menu: [
                    cmenu.label("examples"),
                    cmenu.button("example 1"),
                    cmenu.button("example 2"),
                    cmenu.button("example 3")
                ]
            };
            editorView.notify(new cmenu.OpenContextMenu(editorView, menuDescr));
        },
    }, {
        type: "button",
        label: "about",
        iconSrc: info_icon_url,
        ...maybeEnabled("about"),
        onclick: (e) => {
            /** @type {cmenu.ContextMenuDescription} */
            const menuDescr = {
                origin: point.mkP2(e.clientX, e.clientY),
                menu: [
                    cmenu.label("About"),
                    cmenu.button("Fork me on GitHub", () => {
                        window.open("https://github.com/sbcohen2000/gridlock", "_blank");
                    }),
                    cmenu.button(SHORT_COMMIT_HASH, () => {
                        window.open(`https://github.com/sbcohen2000/gridlock/commit/${COMMIT_HASH}`, "_blank");
                    }),
                ]
            };
            editorView.notify(new cmenu.OpenContextMenu(editorView, menuDescr))
        }
    }];
}
