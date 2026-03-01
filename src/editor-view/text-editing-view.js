import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "../editor.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";

export class TextEditingView extends EditorView {
    /** @type {state.EditingText} */
    #teState

    /**
     * @param {View} parent
     * @param {state.EditingText} [st] The initial editor state.
     */
    constructor(parent, st) {
        super(parent);
        this.#teState = st ?? state.mk();
    }

    /** @returns {state.EditingText} */
    get state() {
        return this.#teState;
    }

    /**
     * View a particular line of the given leaf.
     *
     * @param {number} rowNo The index of the line to view.
     * @param {grid.Leaf<state.Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this line.
     */
    viewLine(rowNo, leaf, p) {
        const line = leaf.data.lines[rowNo];
        const lineElem = document.createElement("div");
        lineElem.className = "editor-line";
        lineElem.innerText = line;
        lineElem.onmousedown = (e) => {
            const rect = lineElem.getBoundingClientRect();
            // Find the portion of the `lineElem` which is
            // actually occupied by text.
            const pctFilled = line.length / leaf.dims.width;

            const x = e.clientX;
            const i = Math.floor(point.lerp(
                0,
                line.length,
                rect.left,
                x,
                rect.left + rect.width * pctFilled
            ));

            state.putPointOnGlobalPosition(this.state, point.offset(p, point.mkV2(i, rowNo)));
            this.requestRedraw();
        };
        return lineElem;
    }

    /**
     * Make an element to represent the cusor.
     *
     * @returns {HTMLElement}
     */
    #mkCursorElem() {
        const e = document.createElement("div");
        e.className = "editor-cursor";
        e.style.position = "absolute";
        return e;
    }

    /**
     * Draw the selection of a leaf, if any, given an element
     * representing the leaf.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        // Construct the cursor.
        const cursorElem = this.#mkCursorElem();
        leafElem.appendChild(cursorElem);
        cursorElem.style.display = "none";

        // If the leaf is selected, we need to draw the cursor.
        if(this.state.selection.leaf === leaf) {
            const ptDoc    = this.state.selection.pt;
            const xScreen  = `${ptDoc.x}ch`;
            const yScreen  = `${ptDoc.y}em`;

            cursorElem.style.display = "block";
            cursorElem.style.left = xScreen;
            cursorElem.style.top  = yScreen;
        }
    }

    /**
     * Return a sequence of HTML elements representing the editor
     * view's toolbar items.
     *
     * @virtual
     * @returns {HTMLElement[]}
     */
    toolbarItems() {
        const cellModeButton = document.createElement("span");
        cellModeButton.className = "editor-button";
        cellModeButton.innerText = "cell mode";
        cellModeButton.onclick = () => {
            this.requestReplaceEditorView(state.editCells(this.#teState))
        };

        return [cellModeButton];
    }
}
