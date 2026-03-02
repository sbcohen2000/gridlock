import * as grid from "./grid.js";
import * as point from "./point.js";
import * as serialize from "./editor/serialize.js";
import * as state from "./editor.js";
import * as toolbar from "./editor-view/toolbar.js";
import * as util from "./util.js";
import { View } from "./view.js";

/**
 * Group a string into a list of strings, those strings which contain
 * no spaces, and those strings with one or more spaces.
 *
 * @param {string} str
 * @returns {IteratorObject<String>}
 */
function groupBySpaces(str) {
    const re = /([^ ]+)|( +)/g;
    const matches = str.matchAll(re);
    return matches.map(match => match[0]);
}

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
     * Build the contents (span fragments) for a line element.
     *
     * @param {HTMLElement} lineElem
     * @param {string} line
     */
    #buildLineFragments(lineElem, line) {
        lineElem.replaceChildren();
        const groups = [...groupBySpaces(line)];
        for(let i = 0; i < groups.length; ++i) {
            const group = groups[i];
            const isLastGroup = i === groups.length - 1;
            if(group[0] === ' ') {
                // Unfortunately, Safari does not respect the css
                // background-size property in the correct way, so we
                // cannot use a single element to represent all of the
                // dots (using a background with repeat-x). Instead,
                // we must create an element for every space.
                for(let i = 0; i < group.length; ++i) {
                    const fragElem = document.createElement("span");
                    fragElem.className = "editor-space-fragment";
                    if(isLastGroup) {
                        fragElem.classList.add("editor-trailing-space-fragment");
                    }
                    fragElem.innerText = ' ';
                    lineElem.appendChild(fragElem);
                }
            } else {
                const fragElem = document.createElement("span");
                fragElem.className = "editor-text-fragment";
                fragElem.innerText = group;
                lineElem.appendChild(fragElem);
            }
        }
    }

    /**
     * View a particular line of the given leaf.
     *
     * @param {number} rowNo The index of the line to view.
     * @param {grid.Leaf<state.Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @param {HTMLElement} [prev] An existing line element to update in place.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this line.
     */
    viewLine(rowNo, leaf, p, prev) {
        void p;

        const line = leaf.data.lines[rowNo];
        const lineElem = prev ?? document.createElement("div");
        lineElem.className = "editor-line";
        this.#buildLineFragments(lineElem, line);
        return lineElem;
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
     * @param {HTMLElement} [prev] An existing leaf element to update in place.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this leaf.
     */
    viewLeaf(leaf, p, prev) {
        const sz = leaf.dims;
        const gridSpec = `${p.y + 1}/${p.x + 1}/span ${sz.height}/span ${sz.width}`;

        const leafElem = prev ?? document.createElement("div");
        leafElem.className      = "editor-leaf";
        leafElem.style.width    = `${sz.width}ch`;
        leafElem.style.position = "relative";
        leafElem.style.gridArea = gridSpec;

        const lineIndices = leaf.data.lines.map((_, i) => i);
        util.recycleChildren(
            leafElem, lineIndices,
            (rowNo, prev) => this.viewLine(rowNo, leaf, p, prev)
        );

        this.viewLeafSelection(leaf, leafElem);
        return leafElem;
    }

    /**
     * Return a sequence of HTML elements representing the editor
     * view's toolbar items.
     *
     * @returns {toolbar.ToolbarDescription[]}
     */
    describeToolbarItems() {
        return [{
            type: "button",
            label: "edit text",
            onclick: () => {
                this.requestReplaceEditorView(state.editText(this.state));
            }
        }, {
            type: "button",
            label: "select cells/edges",
            onclick: () => {
                this.requestReplaceEditorView(state.editCells(this.state));
            }
        }, {
            type: "button",
            label: "split vertically",
            onclick: () => {
                this.requestReplaceEditorView(state.sliceCellsVertically(this.state));
            }
        }, {
            type: "button",
            label: "split horizontally",
            onclick: () => {
                this.requestReplaceEditorView(state.sliceCellsHorizontally(this.state));
            }
        }, {
            type: "button",
            label: "clear",
            onclick: () => {
                this.requestReplaceEditorView(state.mk());
            },
        }, {
            type: "button",
            label: "save",
            onclick: () => {
                const serialized = serialize.printCellGrid(this.state.grid);
                console.log(`%c${util.showMultilineString(serialized)}`, "font-family: monospace; white-space: preserve;");
                localStorage.setItem("editorState", serialized);
            },
        }]
    }

    /**
     * Return a sequence of HTML elements representing the editor
     * view's toolbar items.
     *
     * @returns {HTMLElement[]}
     */
    toolbarItems() {
        return this.describeToolbarItems().map(descr => toolbar.mkToolbarItem(descr));
    }

    /**
     * View the editor state as an HTML object rooted at `root`.
     *
     * @param {HTMLElement} [prev] An existing element to update in place.
     * @returns {HTMLElement}
     */
    view(prev) {
        const root = prev ?? document.createElement("div");
        root.style.display = "inline-grid";
        root.style.gridTemplateColumns = "1ch";
        root.style.gridTemplateRows = "1em";
        this._root = root;

        const leaves = [...grid.allLeavesWithPosition(this.state.grid)];
        util.recycleChildren(
            root, leaves,
            ([leaf, p], prev) => this.viewLeaf(leaf, p, prev)
        );

        return root;
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
