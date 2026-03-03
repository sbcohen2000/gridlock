import * as grid from "../grid.js";
import * as point from "../point.js";
import * as textPrims from "../editor/text-prims/text-prims.js";
import * as toolbar from "./toolbar.js";
import * as view from "../view.js";
import { EditorView } from "../editor-view.js";
import { View } from "../view.js";
import { theGLPKInstance } from "../glpk.js";

/** @import { TextPrimsState, Cell } from "../editor/text-prims/state.d.ts" */

export class TextEditingView extends EditorView {
    /** @type {TextPrimsState} */
    #teState

    /**
     * @param {View} parent
     * @param {TextPrimsState} [st] The initial editor state.
     */
    constructor(parent, st) {
        super(parent);
        this.#teState = st;
    }

    /** @returns {TextPrimsState} */
    get state() {
        return this.#teState;
    }

    /**
     * View a particular line of the given leaf.
     *
     * @param {number} rowNo The index of the line to view.
     * @param {grid.Leaf<Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @param {HTMLElement} [prev] An existing line element to update in place.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this line.
     */
    viewLine(rowNo, leaf, p, prev) {
        const lineElem = super.viewLine(rowNo, leaf, p, prev);

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

            textPrims.putPointOnGlobalPosition(this.state, point.offset(p, point.mkV2(i, rowNo)));
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
     * @param {grid.Leaf<Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        // Reuse existing cursor element or create a new one.
        let cursorElem = /** @type {HTMLElement | null} */ (leafElem.querySelector(".editor-cursor"));
        if(!cursorElem) {
            cursorElem = this.#mkCursorElem();
            leafElem.appendChild(cursorElem);
        }
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
     * @returns {toolbar.ToolbarDescription[]}
     */
    describeToolbarItems() {
        return super.describeToolbarItems().map(descr =>
            descr.label === "edit text" ? { ...descr, disabled: true } : descr);
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
                case "a": textPrims.putPointAtStartOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "e": textPrims.putPointAtEndOfGlobalLine(this.#teState); this.requestRedraw(); break;
                case "n": textPrims.putPointOnNextGlobalLine(this.#teState); this.requestRedraw(); break;
                case "p": textPrims.putPointOnPrevGlobalLine(this.#teState); this.requestRedraw(); break;
                case "b": textPrims.putPointOnPrevGlobalCol(this.#teState); this.requestRedraw(); break;
                case "f": textPrims.putPointOnNextGlobalCol(this.#teState); this.requestRedraw(); break;
                }
            } else {
                textPrims.insertString(this.#teState, e.key, theGLPKInstance.glpk).then(() => {
                    this.requestRedraw();
                });
            }
        } else {
            // Only if there's no command state do we allow the
            // processing of non-letter characters.

            switch(e.key) {
            case "Backspace": {
                if(textPrims.pointAtBeginningOfGlobalLine(this.#teState)) {
                    textPrims.removeGlobalLine(this.#teState);
                } else {
                    textPrims.removeString(this.#teState, 1);
                }
                this.requestRedraw();
            } break;
            case "Enter": {
                textPrims.insertGlobalNewline(this.#teState);
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
