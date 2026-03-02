import * as grid from "./grid.js";
import * as point from "./point.js";
import * as serialize from "./editor/serialize.js";
import * as state from "./editor.js";
import * as util from "./util.js";
import { View } from "./view.js";

/**
 * An editor view is an instance of an editor state, which can show
 * itself on screen and respond to events.
 */
export class EditorView extends View {
    /**
     * @param {View} parent
     */
    constructor(parent) {
        super(parent);
    }

    /**
     * @abstract
     * @returns {state.EditorState}
     */
    get state() {
        throw new Error("Method not implemented");
    }

    /**
     * View a particular line of the given leaf.
     *
     * @abstract
     * @param {number} rowNo The index of the line to view.
     * @param {grid.Leaf<state.Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this line.
     */
    viewLine(rowNo, leaf, p) {
        void rowNo;
        void leaf;
        void p;
        throw new Error("Method not implemented");
    }

    /**
     * Draw the selection of a leaf, if any, given an element
     * representing the leaf.
     *
     * @virtual
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        void leaf;
        void leafElem;
    }

    /**
     * View a particular leaf of the grid.
     *
     * @param {grid.Leaf<state.Cell>} leaf The leaf to view.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this leaf.
     */
    viewLeaf(leaf, p) {
        const sz = leaf.dims;

        // Specify the position of the cell using CSS grid syntax.
        const gridSpec = `${p.y + 1}/${p.x + 1}/span ${sz.height}/span ${sz.width}`;

        const leafElem = document.createElement("div");
        leafElem.className      = "editor-leaf";
        leafElem.style.width    = `${sz.width}ch`;
        leafElem.style.position = "relative";
        leafElem.style.gridArea = gridSpec;

        // Construct the inside of the cell.
        for(let rowNo = 0; rowNo < leaf.data.lines.length; ++rowNo) {
            leafElem.appendChild(this.viewLine(rowNo, leaf, p));
        }

        this.viewLeafSelection(leaf, leafElem);
        return leafElem;
    }

    /**
     * Create a save button that persists the current grid to localStorage.
     *
     * @returns {HTMLElement}
     */
    saveButton() {
        const btn = document.createElement("span");
        btn.className = "editor-button";
        btn.innerText = "save";
        btn.onclick = () => {
            const serialized = serialize.printCellGrid(this.state.grid);
            console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
            localStorage.setItem("editorState", serialized);
        };
        return btn;
    }

    /**
     * Return a sequence of HTML elements representing the editor
     * view's toolbar items.
     *
     * @virtual
     * @returns {HTMLElement[]}
     */
    toolbarItems() {
        return [];
    }

    /**
     * View the editor state as an HTML object rooted at `root`.
     *
     * @returns {HTMLElement}
     */
    view() {
        if(!this._root) {
            this._root = document.createElement("div");
            this._root.style.display = "inline-grid";
            this._root.style.gridTemplateColumns = "1ch";
            this._root.style.gridTemplateRows = "1em";
        }

        this._root.replaceChildren();

        const leaves = grid.allLeavesWithPosition(this.state.grid);
        for(const [leaf, p] of leaves) {
            this._root.appendChild(this.viewLeaf(leaf, p));
        }

        return this._root;
    }

    /**
     * Update the state in response to a keyboard event.
     *
     * @param {KeyboardEvent} e The keyboard event.
     */
    async handleKeyEvent(e) {
        void e;
    }

    /**
     * @param {state.EditorState} newState
     */
    requestReplaceEditorView(newState) {
        this.notify({
            type: "ReplaceEditorViewEvent",
            newState,
            bubbles: true
        });
    }
}
