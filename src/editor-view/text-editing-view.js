import * as grid from "../grid.js";
import * as point from "../point.js";
import * as state from "../editor.js";
import * as view from "../view.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";
import { theGLPKInstance } from "../glpk.js";

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
        const lineElem = super.viewLine(rowNo, leaf, p);

        const line = leaf.data.lines[rowNo];
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

            state.textPrims.putPointOnGlobalPosition(this.state, point.offset(p, point.mkV2(i, rowNo)));
            this.requestFocus();
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

    describeToolbarItems() {
        return [{
            type: "button",
            label: "cell mode",
            onclick: () => {
                this.requestReplaceEditorView(state.editCells(this.#teState))
            },
        }, ...super.describeToolbarItems()];
    }

    /**
     * Handle a keyboard event.
     *
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    #handleKeyEvent(e) {
        if(e.key.length === 1) {
            if(e.ctrlKey) {
                switch(e.key) {
                case "a": state.textPrims.putPointAtStartOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "e": state.textPrims.putPointAtEndOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "n": state.textPrims.putPointOnNextGlobalLine(this.#teState); this.requestRedraw(); break;
                case "p": state.textPrims.putPointOnPrevGlobalLine(this.#teState); this.requestRedraw(); break;
                case "b": state.textPrims.putPointOnPrevGlobalCol(this.#teState); this.requestRedraw(); break;
                case "f": state.textPrims.putPointOnNextGlobalCol(this.#teState); this.requestRedraw(); break;
                }
            } else {
                state.textPrims.insertString(this.#teState, e.key, theGLPKInstance.glpk).then(() => {
                    this.requestRedraw();
                });
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(state.textPrims.pointAtBeginningOfGlobalLine(this.#teState)) {
                    state.textPrims.removeGlobalLine(this.#teState);
                } else {
                    state.textPrims.removeString(this.#teState, 1);
                }
                this.requestRedraw();
            } break;
            case "Enter": {
                state.textPrims.insertGlobalNewline(this.#teState);
                this.requestRedraw();
            } break;
            default: break;
            }
        }
        return true;
    }

    /**
     * Handle an event.
     *
     * @param {view.Event & view.EventInitiator} e
     * @returns {boolean}
     */
    handleEvent(e) {
        switch(e.type) {
        case "KeyEvent":
            e.e.preventDefault();
            e.e.stopPropagation();
            return this.#handleKeyEvent(e.e);
        default:
            return false;
        }

    }
}
