import * as cellPrims from "../editor/cell-prims/cell-prims.js";
import * as serialize from "../editor/serialize-common-state.js";
import * as slicePrims from "../editor/slice-prims/slice-prims.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import * as util from "../util.js";
import { CellEditingView } from "./cell-editing-view.js";
import { HorizontalCellSlicingView, VerticalCellSlicingView } from "./cell-slicing-view.js";
import { TextEditingView } from "./text-editing-view.js";

/** @import { EditorView } from "../editor-view.js" */
/** @import { ToolbarDescription } from "./toolbar.js" */

/**
 * Build the standard set of toolbar items for an editor view.
 *
 * @param {EditorView} editorView The editor view to build toolbar items for.
 * @param {string} [disabledLabel] If provided, the button with this label
 *     will be disabled.
 * @returns {ToolbarDescription[]}
 */
export function standardToolbarItems(editorView, disabledLabel) {
    /** @param {string} label */
    const maybeDisabled = (label) => label === disabledLabel ? { disabled: true } : {};

    return [{
        type: "button",
        label: "edit text",
        ...maybeDisabled("edit text"),
        onclick: () => {
            editorView.requestReplaceEditorView(
                new TextEditingView(editorView.parent, textPrims.editText(editorView.state)));
        }
    }, {
        type: "button",
        label: "select cells",
        ...maybeDisabled("select cells"),
        onclick: () => {
            editorView.requestReplaceEditorView(
                new CellEditingView(editorView.parent, cellPrims.editCells(editorView.state)));
        }
    }, {
        type: "button",
        label: "split vertically",
        ...maybeDisabled("split vertically"),
        onclick: () => {
            editorView.requestReplaceEditorView(
                new VerticalCellSlicingView(editorView.parent, slicePrims.editSlice(editorView.state, "Vertical")));
        }
    }, {
        type: "button",
        label: "split horizontally",
        ...maybeDisabled("split horizontally"),
        onclick: () => {
            editorView.requestReplaceEditorView(
                new HorizontalCellSlicingView(editorView.parent, slicePrims.editSlice(editorView.state, "Horizontal")));
        }
    }, {
        type: "button",
        label: "clear",
        ...maybeDisabled("clear"),
        onclick: () => {
            editorView.requestReplaceEditorView(
                new TextEditingView(editorView.parent, textPrims.editText(serialize.mkCommonState())));
        },
    }, {
        type: "button",
        label: "save",
        ...maybeDisabled("save"),
        onclick: () => {
            const serialized = serialize.printCommonState(editorView.state);
            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
            localStorage.setItem("editorState", serialized);
        },
    }];
}
