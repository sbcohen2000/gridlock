import * as grid from "./grid.js";
import * as point from "./point.js";
import * as state from "./editor.js";
import * as serialize from "./editor/serialize.js";
import GLPK from "glpk.js";
import { selectEdgeAboveLeafAtPoint, selectEdgeBelowLeafAtPoint, selectEdgeLeftOfLeafAtPoint, selectEdgeRightOfLeafAtPoint } from "./editor/cell-prims/cell-prims.js";

// Reload the page when esbuild issues a change event.
//
// If any of the changes was to a CSS file, we can do a hot-reload by
// replacing the link tag.
new EventSource('/esbuild').addEventListener('change', e => {
    const { added, removed, updated } = JSON.parse(e.data)

    if (!added.length && !removed.length && updated.length === 1) {
        for (const link of document.getElementsByTagName("link")) {
            const url = new URL(link.href)

            if (url.host === location.host && url.pathname === updated[0]) {
                const next = /** @type {HTMLLinkElement} */ (link.cloneNode());
                next.href = updated[0] + '?' + Math.random().toString(36).slice(2);
                next.onload = () => link.remove();
                if(link.parentNode) {
                    link.parentNode.insertBefore(next, link.nextSibling);
                }
                return;
            }
        }
    }

    location.reload();
})

/**
 * Initialize the treeSitter
 *
 * @returns {Promise<treeSitter.Parser>} The initialized parser.
 */
async function initializeParser() {
    await treeSitter.Parser.init();
    const parser = new treeSitter.Parser();
    const JavaScript = await treeSitter.Language.load("/tree-sitter-javascript.wasm");
    parser.setLanguage(JavaScript);
    return parser;
}

/**
 * @typedef {{
 *  initiator: View
 * }} EventInitiator
 */

/**
 * @typedef {{
 *  bubbles: boolean
 * }} EventBase
 */

/**
 * Notify the parent that a child view would like to redraw.
 *
 * @typedef {{
 *   type: "RedrawEvent"
 *   bubbles: true
 * } & EventBase} RedrawEvent
 */

/**
 * Notify that a view wants to receive focus.
 *
 * @typedef {{
 *   type: "RequestFocusEvent",
 *   bubbles: true
 * } & EventBase} RequestFocusEvent
 */

/**
 * Notify that a keyboard key was pressed.
 *
 * @typedef {{
 *   type: "KeyEvent",
 *   e: KeyboardEvent
 *   bubbles: true
 * } & EventBase} KeyEvent
 */

/**
 * Notify that a view was deleted.
 *
 * @typedef {{
 *   type: "ViewDeletedEvent",
 *   view: View
 *   bubbles: true
 * } & EventBase} ViewDeletedEvent
 */

/**
 * Notify a view that it recieved focus.
 *
 * @typedef {{
 *   type: "ReceivedFocusEvent",
 *   bubbles: false
 * } & EventBase} RecievedFocusEvent
 */

/**
 * @typedef {{
 *  type: "ReplaceEditorViewEvent",
 *  newState: state.EditorState
 *  bubbles: true
 * } & EventBase} ReplaceEditorViewEvent
 */

/**
 * @typedef {RedrawEvent
 *  | ReplaceEditorViewEvent
 *  | KeyEvent
 *  | ViewDeletedEvent
 *  | RecievedFocusEvent
 *  | RequestFocusEvent
 *  } Event
 */

class View {
    /** @type {View | null}
     *
     * The parent view, or `null`, if this view is topmost. */
    #parent;

    /**
     * @returns {View | null}
     */
    get parent() {
        return this.#parent;
    }

    /**
     * Construct a new `View`, providing the `View's` parent.
     *
     * @param {View | null} parent
     */
    constructor(parent) {
        this.#parent = parent;
    }

    /**
     * @virtual
     * @returns {HTMLElement}
     */
    view() {
        return document.createElement("div");
    }

    /**
     * Notify the parent view of an event.
     * @param {Event} e The event.
     */
    notify(e) {
        const withInitiator = { ...e, initiator: this };
        let parent = this.#parent;

        while(parent && e.bubbles) {
            if(parent.handleEvent(withInitiator)) break;
            parent = parent.parent;
        }
    }

    /**
     * Handle an event.
     *
     * @param {Event & EventInitiator} e
     * @returns {boolean} `true` if the event should stop propagating
     *     (i.e. it was handled by this view), or `false` if the event
     *     should continue to bubble up the view tree.
     */
    handleEvent(e) {
        void e;
        return false;
    }

    /**
     * Request that the view re-draw itself.
     */
    requestRedraw () {
        this.notify({ type: "RedrawEvent", bubbles: true });
    }

    /**
     * Request that this view receive focus.
     */
    requestFocus() {
        this.notify({ type: "RequestFocusEvent", bubbles: true });
    }

    /**
     * Notify the views above us that a view was deleted from the
     * tree.
     *
     * @param {View} view The view which was deleted.
     */
    notifyViewDeleted(view) {
        this.notify({ type: "ViewDeletedEvent", view, bubbles: true });
    }
}

/**
 * An editor view is an instance of an editor state, which can show
 * itself on screen and respond to events.
 */
class EditorView extends View {
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
        // TODO: re-use elements.
        const root = document.createElement("div");

        root.style.display = "inline-grid";
        root.style.gridTemplateColumns = "1ch";
        root.style.gridTemplateRows = "1em";

        const leaves = grid.allLeavesWithPosition(this.state.grid);
        for(const [leaf, p] of leaves) {
            root.appendChild(this.viewLeaf(leaf, p));
        }

        return root;
    }

    /**
     * Update the state in response to a keyboard event.
     *
     * @param {KeyboardEvent} e    The keyboard event.
     * @param {any}           glpk The GLPK instance.
     */
    async handleKeyEvent(e, glpk) {
        void e;
        void glpk;
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

class TextEditingView extends EditorView {
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

class CellEditingView extends EditorView {
    /** @type {state.EditingCells} */
    #ceState;

    /**
     * @typedef {{
     *   leaf: grid.Leaf<state.Cell>,
     * }} LastClickInfo
     */

    /**
     * Information which records the leaf of the last click. This
     * field is automatically cleared after a time; it is used to
     * detect when the user has double-clicked on a leaf.
     *
     * @type {LastClickInfo | null}
     */
    #lastClick;

    /**
     * Check if a click, which clicked on `leaf` should be classified
     * as a double-click by consulting `#lastClick`.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @returns {boolean} `true` if this click should be handled as a
     *     double-click, and `false` if it should be handled as a
     *     single-click.
     */
    #classifyDoubleClick(leaf) {
        if(this.#lastClick !== null && this.#lastClick.leaf === leaf) {
            this.#lastClick = null;
            return true;
        } else {
            this.#lastClick = { leaf };
            window.setTimeout(() => this.#lastClick = null, 200);
            return false;
        }
    }

    /**
     * @param {View} parent
     * @param {state.EditingCells} st The initial edit state.
     */
    constructor(parent, st) {
        super(parent);
        this.#ceState = st;
    }

    /** @returns {state.EditingCells} */
    get state() {
        return this.#ceState;
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
        void p;

        const line = leaf.data.lines[rowNo];
        const lineElem = document.createElement("div");
        lineElem.className = "editor-line";
        lineElem.innerText = line;
        return lineElem;
    }

    /**
     * View a particular leaf of the grid.
     *
     * @param {grid.Leaf<state.Cell>} leaf The leaf to view.
     * @param {point.P2} pt The position of the upper-left corner of the leaf.
     * @returns {HTMLElement} The HTML element generated to represent
     *     this leaf.
     */
    viewLeaf(leaf, pt) {
        const leafElem = super.viewLeaf(leaf, pt);

        leafElem.onclick = (e) => {
            const rect = leafElem.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            // Classify the mouse click into one of five zones.  If
            // we're closest to one of the edges, we should select an
            // edge, while if we're closest to the center, we should
            // select the cell itself.
            /** @type {[number, (st: state.EditorState, p: point.P2) => boolean]} */
            const distanceToLeftEdge   = [relX,               selectEdgeLeftOfLeafAtPoint];
            /** @type {[number, (st: state.EditorState, p: point.P2) => boolean]} */
            const distanceToRightEdge  = [rect.width - relX,  selectEdgeRightOfLeafAtPoint];
            /** @type {[number, (st: state.EditorState, p: point.P2) => boolean]} */
            const distanceToTopEdge    = [relY,               selectEdgeAboveLeafAtPoint];
            /** @type {[number, (st: state.EditorState, p: point.P2) => boolean]} */
            const distanceToBottomEdge = [rect.height - relY, selectEdgeBelowLeafAtPoint];

            const [minD, edgeFn] = [
                distanceToLeftEdge,
                distanceToRightEdge,
                distanceToTopEdge,
                distanceToBottomEdge
            ].reduce(([minD, minFn], [d, fn]) => minD < d ? [minD, minFn] : [d, fn],
                     distanceToBottomEdge);

            // If the minimum distance to an edge is greater than 4px,
            // then we want to select the cell itself rather than one
            // of its edges.
            if(minD > 2) {
                state.cellPrims.selectLeafUnderPoint(this.#ceState, pt, !e.shiftKey);
            } else {
                edgeFn(this.#ceState, pt);
            }
            this.requestRedraw();
        };
        return leafElem;
    }

    /**
     * Draw the selection of a leaf, if any, given an element
     * representing the leaf.
     *
     * @param {grid.Leaf<state.Cell>} leaf
     * @param {HTMLElement} leafElem
     */
    viewLeafSelection(leaf, leafElem) {
        const sel = this.#ceState.selection;
        const haloElem = document.createElement("div");
        if(sel.type === "Leaves" && sel.leaves.has(leaf)) {
            // We're selecting leaves, so draw a halo around all of
            // the selected leaves.
            haloElem.className = "editor-cell-halo";
            leafElem.appendChild(haloElem);
        } else if(sel.type === "Edge" && sel.node.left === leaf) {
            // We're selecting edges, so draw a halo around the
            // selected edge.
            haloElem.className = "editor-edge-halo";

            if(sel.node.type === "Vert") {
                haloElem.style.left = "0";
                haloElem.style.bottom = "-2px";
                haloElem.style.width = "100%";
                haloElem.style.height = "4px";
            } else {
                haloElem.style.right = "-2px";
                haloElem.style.top = "0";
                haloElem.style.height = "100%";
                haloElem.style.width = "4px";
            }

            leafElem.appendChild(haloElem);
        }
    }

    toolbarItems() {
        const textModeButton = document.createElement("span");
        textModeButton.className = "editor-button";
        textModeButton.innerText = "text mode";
        textModeButton.onclick = () => {
            this.requestReplaceEditorView(state.editText(this.#ceState))
        };

        return [textModeButton];
    }
}

class AppView extends View {
    /** @type {EditorView} */
    #editorView;

    /**
     * @param {View} parent
     * @param {state.EditorState} st
     */
    constructor(parent, st) {
        super(parent);
        this.#replaceViewFromState(st);
    }

    /**
     * View the editor's toolbar.
     *
     * @returns {HTMLElement} The HTML element generated to represent
     *     the editor's toolbar.
     */
    #viewToolbar() {
        const toolbarElem = document.createElement("div");
        toolbarElem.className = "editor-toolbar";
        this.#editorView.toolbarItems().forEach((item) => {
            toolbarElem.appendChild(item);
        });
        return toolbarElem;
    }

    /**
     * View the application rooted at the element `root`.
     *
     * @returns {HTMLElement}
     */
    view() {
        const root = document.createElement("div");
        const toolbarElem = this.#viewToolbar();
        const editorElem = this.#editorView.view();

        root.appendChild(toolbarElem);
        root.appendChild(editorElem);
        return root;
    }

    /**
     * Replace the app's editor view based on the kind of state passed
     * to this function.
     *
     * @param {state.EditorState} st
     */
    #replaceViewFromState(st) {
        switch(st.type) {
        case "EditingText":
            this.#editorView = new TextEditingView(this, st); break;
        case "EditingCells": this.#editorView = new CellEditingView(this, st); break;
        }
        this.requestRedraw();
    }

    /**
     * @param {Event & EventInitiator} e
     * @returns {boolean}
     */
    handleEvent(e) {
        switch(e.type) {
        case "ReplaceEditorViewEvent": {
            this.#replaceViewFromState(e.newState);
            return true;
        }
        default:
            return false;
        }
    }
}

async function main() {
    const editorRoot = document.getElementById("editor-root");
    if(!editorRoot) {
        throw new Error("Could not find #editor-root element");
    }

    const glpk = await GLPK();

    let initialStateStr = localStorage.getItem("editorState");
    /** @type {state.EditorState} */
    let initialState;
    if(initialStateStr) {
        initialState = serialize.editorStateFromString(initialStateStr);
    } else {
        initialState = state.mk();
    }

    const topLevelView = new (class extends View {
        /** @type {AppView} */
        #appView;

        /** @type {View} */
        #focusedView;

        /** @type {ReturnType<requestAnimationFrame> | null} */
        #animFrame;

        /**
         * @param {View} parent
         * @param {state.EditorState} st The initial state
         */
        constructor(parent, st) {
            super(parent);
            this.#appView = new AppView(this, st);
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
         * @param {Event & EventInitiator} e
         * @returns {boolean}
         */
        handleEvent(e) {
            switch(e.type) {
            case "RedrawEvent": {
                this.requestRedraw();
                return true;
            }
            case "RequestFocusEvent": {
                this.#focusedView = e.initiator;
                this.requestRedraw();
                return true;
            }
            case "KeyEvent": {
                return true;
            }
            default: return false;
            }
        }

        /**
         * @param {KeyboardEvent} e
         */
        handleKeyEvent(e) {
            if(this.#focusedView !== this) {
                this.#focusedView.notify({
                    type: "KeyEvent",
                    bubbles: true,
                    e
                });
            }
        }

        /** @returns {HTMLElement} */
        view() {
            editorRoot.innerHTML = "";
            editorRoot.appendChild(this.#appView.view());
            return editorRoot;
        }
    })(null, initialState);


    document.addEventListener("keydown", async (e) => {
        topLevelView.handleKeyEvent(e);
    });

    topLevelView.requestRedraw();
}

document.addEventListener("DOMContentLoaded", main);
