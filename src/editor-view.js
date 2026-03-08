import * as edgePrims from "./editor/edge-prims/edge-prims.js";
import * as grid from "./grid.js";
import * as point from "./point.js";
import * as textPrims from "./editor/text-prims/text-prims.js";
import Recycler from "./framework.js";
import { KeyViewEvent, View, ViewEvent } from "./view.js";

import binder_ring_center_url from "../assets/binder-ring-center.png";
import binder_ring_end_url from "../assets/binder-ring-end.png";
import { padLeftToLength } from "./util.js";
import HistoryView from "./editor-view/history-view.js";

/** @import { CommonState, Cell, Inverse } from "./editor/common-state.d.ts" */
/** @import { TextPrimsState } from "./editor/text-prims/state.d.ts" */
/** @import { EdgePrimsState, EdgeLocation } from "./editor/edge-prims/state.d.ts" */
/** @import { CellPrimsState } from "./editor/cell-prims/state.d.ts" */
/** @import { SlicePrimsState } from "./editor/slice-prims/state.d.ts" */
/** @import { ToolbarDescription } from "./editor-view/toolbar.js" */
/** @import { HistoryItem } from "./editor-view/history.d.ts" */

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
 * The thickness of the draggable region around an edge.
 * @type {number}
 */
const EDGE_HALO_THICK = 6;

/**
 * The width of the spiral binding.
 */
const BINDING_WIDTH = 24; //px;

/**
 * An editor view is an instance of an editor state, which can show
 * itself on screen and respond to events.
 */
export class EditorView extends View {
    /**
     * @param {View} parent
     * @param {HistoryItem[]} history
     */
    constructor(parent, history) {
        super(parent);
        this.#history = history;
    }

    /** @returns {HistoryItem[]} */
    get history() { return this.#history; }

    /**
     * @abstract
     * @returns {CommonState}
     */
    get state() {
        throw new Error("Method not implemented");
    }

    /*************************************************************************/
    /** Double-Click Classification                                         **/

    /**
     * @typedef {{
     *   leaf: grid.Leaf<Cell>,
     * }} LastClickInfo
     */

    /**
     * Information which records the leaf of the last click. This
     * field is automatically cleared after a time; it is used to
     * detect when the user has double-clicked on a leaf.
     *
     * @type {LastClickInfo | null}
     */
    #lastClick = null;

    /**
     * Check if a click, which clicked on `leaf` should be classified
     * as a double-click by consulting `#lastClick`.
     *
     * @param {grid.Leaf<Cell>} leaf
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
     * Given the global grid location of a click, try to edit the text
     * underneath the position.
     *
     * @param {PointerEventContext} ctx
     * @returns {boolean} `true` if the editor was re-targeted for
     *     text editing, and `false` otherwise.
     */
    editTextOnDoubleClick(ctx) {
        const isDoubleClick = this.#classifyDoubleClick(ctx.leaf);
        if(isDoubleClick) {
            // If the user double-clicked on the leaf, we want to
            // change to text-editing mode, setting the selection
            // to the point under the cursor.

            const [st, inv] = textPrims.editText(this.state);
            this.commitUndoableItem(inv);
            this.runPrimitiveWithUndo(st, textPrims.putPointOnGlobalPosition, ctx.flooredGridPt, true);
            this.requestReplaceEditorView(this.createTextEditingView(this.parent, st));
            return true;
        } else {
            return false;
        }
    }

    /*************************************************************************/
    /** Mouse-Near-Edge                                                     **/

    /**
     * Record if the mouse is near an edge of a leaf.
     *
     * @type {{
     *   leaf: grid.Leaf<Cell>,
     *   edge: EdgeLocation
     * } | null}
     */
    #mouseNearEdge = null;

    /**
     * Set the `#mouseNearEdge` property, requesting a re-draw only if
     * necessary.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {EdgeLocation} edge
     */
    #setMouseNearEdgeAndRedrawIfNecessary(leaf, edge) {
        if(this.#mouseNearEdge === null
           || this.#mouseNearEdge.leaf !== leaf
           || this.#mouseNearEdge.edge !== edge) {
            this.#mouseNearEdge = { leaf, edge };
            this.requestRedraw();
        }
    }

    /**
     * Clear the `#mouseNearEdge` property, requesting a re-draw only
     * if necessary.
     */
    #clearMouseNearEdgeAndRedrawIfNecessary() {
        if(this.#mouseNearEdge !== null) {
            this.#mouseNearEdge = null;
            this.requestRedraw();
        }
    }

    /**
     * Highlight an edge which is nearby to the pointer in the given
     * pointer event context.
     *
     * @param {PointerEventContext} ctx
     */
    highlightNearbyEdge(ctx) {
        const rect = ctx.leafRect;
        const relX = ctx.event.clientX - rect.left;
        const relY = ctx.event.clientY - rect.top;

        // Classify the mouse position into one of five zones.  If
        // we're closest to one of the edges, we should preview
        // that edge, while if we're closest to the center, we
        // should clear the preview.
        /** @type {[number, EdgeLocation]} */
        const distanceToLeftEdge   = [relX,               "Left"];
        /** @type {[number, EdgeLocation]} */
        const distanceToRightEdge  = [rect.width - relX,  "Right"];
        /** @type {[number, EdgeLocation]} */
        const distanceToTopEdge    = [relY,               "Above"];
        /** @type {[number, EdgeLocation]} */
        const distanceToBottomEdge = [rect.height - relY, "Below"];

        const [minD, edge] = [
            distanceToLeftEdge,
            distanceToRightEdge,
            distanceToTopEdge,
            distanceToBottomEdge
        ].reduce((minD, d) => minD < d ? minD : d, distanceToBottomEdge);

        if(minD <= EDGE_HALO_THICK / 2) {
            this.#setMouseNearEdgeAndRedrawIfNecessary(ctx.leaf, edge);
        } else {
            this.#clearMouseNearEdgeAndRedrawIfNecessary();
        }
    }

    /**
     * Try to drag an edge, but only if the click was close to one.
     *
     * @param {PointerEventContext} ctx
     * @returns {boolean} `true` if the editor was re-targeted for
     *     dragging an edge, and `false` otherwise.
     */
    startDraggingEdgeWhenCloseToOne(ctx) {
        const rect = ctx.leafRect;
        const relX = ctx.event.clientX - rect.left;
        const relY = ctx.event.clientY - rect.top;

        // Classify the mouse click into one of five zones.  If
        // we're closest to one of the edges, we should select an
        // edge, while if we're closest to the center, we should
        // select the cell itself.
        /** @type {[number, EdgeLocation]} */
        const distanceToLeftEdge   = [relX,               "Left"];
        /** @type {[number, EdgeLocation]} */
        const distanceToRightEdge  = [rect.width - relX,  "Right"];
        /** @type {[number, EdgeLocation]} */
        const distanceToTopEdge    = [relY,               "Above"];
        /** @type {[number, EdgeLocation]} */
        const distanceToBottomEdge = [rect.height - relY, "Below"];

        const [minD, edge] = [
            distanceToLeftEdge,
            distanceToRightEdge,
            distanceToTopEdge,
            distanceToBottomEdge
        ].reduce((minD, d) => minD < d ? minD : d, distanceToBottomEdge);

        if(minD <= EDGE_HALO_THICK / 2) {
            // Move to edge selection mode and select the edge.
            const [st, inv] = edgePrims.editEdge(this.state);
            if(!edgePrims.canSelectEdgeUnderPoint(st, ctx.leafPosition, edge)) {
                return false;
            } else {
                this.commitUndoableItem(inv);
            }
            edgePrims.selectEdgeUnderPoint(st, ctx.leafPosition, edge);

            // Capture the pointer of the root element so that the
            // user can drag outside of the current bounds of the
            // element if necessary.
            this._root.setPointerCapture(ctx.event.pointerId);

            /** @type {import("./editor-view/edge-editing-view.js").DragState} */
            const dragState = {
                dragOriginPx: point.mkP2(ctx.event.clientX, ctx.event.clientY),
                dragOriginGrid: ctx.roundedGridPt,
                gridScale: point.mkV2(ctx.rootRect.width / ctx.gridW, ctx.rootRect.height / ctx.gridH),
                lastArg: 0
            };

            this.requestReplaceEditorView(this.createEdgeEditingView(this.parent, st, dragState));
            return true;
        } else {
            return false;
        }
    }

    /*************************************************************************/
    /** View-Building Functions                                             **/

    /**
     * Build the contents (span fragments) for a line element.
     *
     * @param {HTMLElement} lineElem
     * @param {string} line
     */
    #buildLineFragments(lineElem, line) {
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
     * @param {grid.Leaf<Cell>} leaf The line's parent leaf.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @param {HTMLElement} lineElem The element to populate.
     */
    viewLine(rowNo, leaf, p, lineElem) {
        void p;

        const line = leaf.data.lines[rowNo];
        lineElem.className = "editor-line";
        this.#buildLineFragments(lineElem, line);
    }

    /**
     * Position an edge halo element based on the edge direction.
     *
     * @param {HTMLElement} elem
     * @param {EdgeLocation} edge
     */
    #positionEdgeHalo(elem, edge) {
        const haloOffset = `${-EDGE_HALO_THICK/2}px`;
        const haloThick  = `${EDGE_HALO_THICK}px`;

        switch(edge) {
        case "Above":
            elem.style.top = haloOffset;
            elem.style.left = "0";
            elem.style.width = "100%";
            elem.style.height = haloThick;
            break;
        case "Below":
            elem.style.bottom = haloOffset;
            elem.style.left = "0";
            elem.style.width = "100%";
            elem.style.height = haloThick;
            break;
        case "Left":
            elem.style.left = haloOffset;
            elem.style.top = "0";
            elem.style.height = "100%";
            elem.style.width = haloThick;
            break;
        case "Right":
            elem.style.right = haloOffset;
            elem.style.top = "0";
            elem.style.height = "100%";
            elem.style.width = haloThick;
            break;
        }
    }

    /**
     * Draw the selection of a leaf, if any, by adding items to the
     * recycler.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {Recycler} recycler
     */
    viewLeafSelection(leaf, recycler) {
        if(this.#mouseNearEdge !== null && this.#mouseNearEdge.leaf === leaf) {
            recycler.elem({ tag: "div", key: "edge-preview-halo" }, (elem) => {
                elem.className = "editor-edge-preview-halo";
                this.#positionEdgeHalo(elem, this.#mouseNearEdge.edge);
            });
        }
    }

    /**
     * View a particular leaf of the grid.
     *
     * @param {grid.Leaf<Cell>} leaf The leaf to view.
     * @param {point.P2} leafUl The position of the upper-left corner of the leaf.
     * @param {HTMLElement} leafElem The element to populate.
     */
    viewLeaf(leaf, leafUl, leafElem) {
        const sz = leaf.dims;
        const gridSpec = `${leafUl.y + 1}/${leafUl.x + 1}/span ${sz.height}/span ${sz.width}`;

        leafElem.className      = "editor-leaf";
        leafElem.style.width    = `${sz.width}ch`;
        leafElem.style.position = "relative";
        leafElem.style.gridArea = gridSpec;

        leafElem.onpointermove = (e) => {
            const ctx = new PointerEventContext(e, this, leaf, leafElem);
            this.onPointerMoveInLeaf(ctx);
        };

        leafElem.onpointerdown = (e) => {
            const ctx = new PointerEventContext(e, this, leaf, leafElem);
            this.onPointerDownInLeaf(ctx);
        }

        const lineIndices = leaf.data.lines.map((_, i) => i);
        const recycler = new Recycler(leafElem)
              .elems(lineIndices,
                     { tag: "div", clearChildren: true },
                     (rowNo, lineElem) => this.viewLine(rowNo, leaf, leafUl, lineElem)
                    );
        this.viewLeafSelection(leaf, recycler);
        recycler.commit();
    }

    /**
     * View the editor state as an HTML object rooted at `root`.
     *
     * @param {HTMLElement} root The root element to populate.
     */
    view(root) {
        root.className = "editor-root";
        this.#rootElemResizeObserver.disconnect();

        const r = new Recycler(root)
            .elem("div", (e) => this.#viewBinding(e))
            .elem("div", (e) => this.#viewLineNumbers(e))
            .elem("div", (gridRoot) => {
                gridRoot.style.display = "inline-grid";
                gridRoot.style.gridTemplateColumns = "1ch";
                gridRoot.style.gridTemplateRows = "1em";
                this._root = gridRoot;
                this.#rootElemResizeObserver.observe(this._root);

                const leaves = [...grid.allLeavesWithPosition(this.state.grid)];
                new Recycler(gridRoot)
                    .elems(leaves, "div", ([leaf, p], leafElem) => this.viewLeaf(leaf, p, leafElem))
                    .commit();
            })

        HistoryView(r, this.#history);
        r.commit();
    }

    /*************************************************************************/
    /** Event Handlers                                                      **/

    /**
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerEventContext} ctx
     */
    onPointerDownInLeaf(ctx) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        this.startDraggingEdgeWhenCloseToOne(ctx);
    }

    /**
     * Handle a pointer-move event inside a leaf element.
     *
     * @param {PointerEventContext} ctx
     */
    onPointerMoveInLeaf(ctx) {
        this.highlightNearbyEdge(ctx);
    }

    /**
     * @param {EditorView} newView
     */
    requestReplaceEditorView(newView) {
        this.notify(new ReplaceEditorViewEvent(this, newView));
    }

    /**
     * If the event is a key event, and the key event matches the key
     * for undo, issue an undo.
     *
     * @param {ViewEvent} e
     * @returns {boolean} `true` if the event was handled, and `false`
     *     otherwise.
     */
    handleUndoKey(e) {
        if(e instanceof KeyViewEvent) {
            if(e.e.ctrlKey && e.e.key === "/") {
                this.undo();
                return true;
            }
        }
        return false;
    }

    /**
     * @param {ViewEvent} e
     * @returns {boolean}
     */
    handleEvent(e) {
        return this.handleUndoKey(e);
    }

    /*************************************************************************/
    /** Undo History                                                        **/

    /** @type {HistoryItem[]} */
    #history = [];

    /**
     * @param {Inverse<CommonState>} inverse
     */
    commitUndoableItem(inverse) {
        this.#history.push({
            inverse
        });
        this.requestRedraw();
    }

    /**
     * Run a primitive operation, saving its inverse to the undo
     * history.
     *
     * @template {CommonState} S
     * @template {any[]} A
     * @param {S} st The current state.
     * @param {(st: S, ...args: A) => Promise<Inverse<S>> | Inverse<S>} prim The primitive operation to wrap.
     * @param {A} args The arguments to the primitive function
     */
    async runPrimitiveWithUndo(st, prim, ...args) {
        const inverse = await prim(st, ...args);
        this.commitUndoableItem(inverse);
    }

    /**
     * @see runPrimitiveWithUndo
     *
     * This is a helper for the common case where we want to run a
     * primitive operation and then immediately request that the
     * editor re-draw itself.
     *
     * @template {CommonState} S
     * @template {any[]} A
     * @param {S} st The current state.
     * @param {(st: S, ...args: A) => Promise<Inverse<S>> | Inverse<S>} prim The primitive operation to wrap.
     * @param {A} args The arguments to the primitive function
     */
    async runPrimitiveWithUndoThenRedraw(st, prim, ...args) {
        await this.runPrimitiveWithUndo(st, prim, ...args);
        this.requestRedraw();
    }

    undo() {
        if(this.#history.length === 0) {
            return;
        }

        const top = this.#history.pop();
        top.inverse(this.state);

        // Replace the view with one which can view the current state.
        this.requestReplaceEditorView(this.createViewForState(this.parent, this.state));
    }

    /*************************************************************************/
    /** Toolbar                                                             **/

    /**
     * Return a sequence of HTML elements representing the editor
     * view's toolbar items.
     *
     * @returns {ToolbarDescription[]}
     */
    describeToolbarItems() {
        return [];
    }

    /**
     * Create a new view appropriate for viewing the given state,
     * by discriminating on `st.type`.
     *
     * @param {View} parent
     * @param {CommonState} st
     * @returns {EditorView}
     */
    createViewForState(parent, st) {
        if(st.type === "TextPrimsState") {
            return this.createTextEditingView(parent, /** @type {TextPrimsState} */ (st));
        } else if(st.type === "EdgePrimsState") {
            return this.createEdgeEditingView(parent, /** @type {EdgePrimsState} */ (st));
        } else if(st.type === "CellPrimsState") {
            return this.createCellEditingView(parent, /** @type {CellPrimsState} */ (st));
        } else if(st.type === "SlicePrimsState") {
            const sliceSt = /** @type {SlicePrimsState} */ (st);
            if(sliceSt.direction === "Vertical") {
                return this.createVerticalCellSlicingView(parent, sliceSt);
            } else {
                return this.createHorizontalCellSlicingView(parent, sliceSt);
            }
        } else {
            throw new Error(`createViewForState: unknown state type '${st.type}'`);
        }
    }

    /**
     * implemented a text editing view. Subclasses must implement this.
     *
     * @abstract
     * @param {View} parent
     * @param {import("./editor/text-prims/state.d.ts").TextPrimsState} st
     * @returns {EditorView}
     */
    createTextEditingView(parent, st) {
        void parent; void st;
        throw new Error("Method not implemented");
    }

    /**
     * Create an edge editing view. Subclasses must implement this.
     *
     * @abstract
     * @param {View} parent
     * @param {import("./editor/edge-prims/state.d.ts").EdgePrimsState} st
     * @param {import("./editor-view/edge-editing-view.js").DragState} [dragState]
     * @returns {EditorView}
     */
    createEdgeEditingView(parent, st, dragState) {
        void parent; void dragState; void st;
        throw new Error("Method not implemented");
    }

    /**
     * Create a cell editing view. Subclasses must implement this.
     *
     * @abstract
     * @param {View} parent
     * @param {import("./editor/cell-prims/state.d.ts").CellPrimsState} st
     * @returns {EditorView}
     */
    createCellEditingView(parent, st) {
        void parent; void st;
        throw new Error("Method not implemented");
    }

    /**
     * Create a vertical cell slicing view. Subclasses must implement this.
     *
     * @abstract
     * @param {View} parent
     * @param {import("./editor/slice-prims/state.d.ts").SlicePrimsState} st
     * @returns {EditorView}
     */
    createVerticalCellSlicingView(parent, st) {
        void parent; void st;
        throw new Error("Method not implemented");
    }

    /**
     * Create a horizontal cell slicing view. Subclasses must implement this.
     *
     * @abstract
     * @param {View} parent
     * @param {import("./editor/slice-prims/state.d.ts").SlicePrimsState} st
     * @returns {EditorView}
     */
    createHorizontalCellSlicingView(parent, st) {
        void parent; void st;
        throw new Error("Method not implemented");
    }

    /*************************************************************************/
    /** Visual Decorations                                                  **/

    /**
     * The HTML element used to represent the spiral-ring binding.
     * @type {HTMLElement | undefined}
     */
    #bindingElem;

    /**
     * Update the spiral-ring binding visualization given the height
     * of the editor view in pixels.
     *
     * @param {number} height The height of the editor view in pixels.
     */
    #updateBinding(height) {
        if(!this.#bindingElem) {
            console.warn("Tried to update the spiral binding, but it's element is undefined");
            return;
        }

        const TOTAL_IMG_WIDTH = 41.6; // px, image coords.
        const PAGE_IMG_WIDTH  = 29;   // px, image coords.
        const IMG_HEIGHT      = 13;   // px, image coords.

        // The number of screen pixels for one image pixel.
        const imagePxToScreenPx = BINDING_WIDTH / PAGE_IMG_WIDTH;

        // Height of an image in screen pixels.
        const imgScreenHeight = IMG_HEIGHT * imagePxToScreenPx;

        const nCenters = Math.round(height / imgScreenHeight) - 1;

        const indices = Array.from({ length: nCenters + 1 }, (_, i) => i);
        new Recycler(this.#bindingElem)
            .elems(indices, "img", (idx, image) => {
                const img = /** @type {HTMLImageElement} */ (image);
                img.width = TOTAL_IMG_WIDTH * imagePxToScreenPx;
                img.style.position = "absolute";
                img.style.top = `${idx * imgScreenHeight}px`;
                img.style.right = `0`;
                if(idx < nCenters) {
                    // Draw a center.
                    img.src = binder_ring_center_url;
                } else {
                    // Draw the end cap.
                    img.src = binder_ring_end_url;
                }
            })
            .commit();
    }

    /** @type {ResizeObserver} */
    #rootElemResizeObserver = new ResizeObserver((entries) => {
        for(const entry of entries) {
            if(entry.target === this._root) {
                // The grid root has resized. We need to update the
                // spiral binding.
                this.#updateBinding(entry.borderBoxSize[0].blockSize);
            }
        }
    });

    /**
     * View the spiral-ring binding to the left of the editor.
     *
     * @param {HTMLElement} bindingElem The element to populate.
     */
    #viewBinding(bindingElem) {
        this.#bindingElem = bindingElem;
        this.#bindingElem.className = "editor-binding";
        this.#bindingElem.style.width = `${BINDING_WIDTH}px`;
    }

    /**
     * View a strip of line numbers to the left of the editor.
     *
     * @param {HTMLElement} lineNumsElem The element to populate.
     */
    #viewLineNumbers(lineNumsElem) {
        lineNumsElem.className = "editor-line-nums-margin";

        const nLines = this.state.grid.dims.height
        const lineNos = Array.from({ length: nLines }, (_, i) => i + 1);

        new Recycler(lineNumsElem)
            .elems(lineNos, "span", (lineNo, label) => {
                label.className = "editor-line-num";
                label.innerText = padLeftToLength(lineNo.toString(), 2);
            })
            .commit();
    }
}

/**
 * Notify that an editor view should be replaced.
 */
export class ReplaceEditorViewEvent extends ViewEvent {
    /** @type {EditorView} */
    #newView;

    /**
     * @param {View} initiator
     * @param {EditorView} newView
     */
    constructor(initiator, newView) {
        super(initiator, true);
        this.#newView = newView;
    }

    /** @returns {EditorView} */
    get newView() { return this.#newView; }
}

/**
 * Records computed information about a pointer event, so that we
 * don't have to recompute it all the time.
 */
export class PointerEventContext {
    /** @type {PointerEvent} */
    #event

    /** @type {EditorView} */
    #view

    /** @type {grid.Leaf<Cell>} */
    #leaf

    /** @type {HTMLElement} */
    #leafElem

    /**
     * Construct a new `PointerEventContext`.
     *
     * @param {PointerEvent}    event    The pointer event.
     * @param {EditorView}      view     The editor view.
     * @param {grid.Leaf<Cell>} leaf     The leaf under the pointer.
     * @param {HTMLElement}     leafElem The HTML
     *     element used to represent the leaf.
     */
    constructor(event, view, leaf, leafElem) {
        this.#event    = event;
        this.#view     = view;
        this.#leaf     = leaf;
        this.#leafElem = leafElem;
    }

    /**
     * Get the pointer event that started it all.
     *
     * @returns {PointerEvent}
     */
    get event() {
        return this.#event;
    }

    /**
     * The leaf under the pointer.
     *
     * @returns {grid.Leaf<Cell>}
     */
    get leaf() {
        return this.#leaf;
    }

    /**
     * Get the HTML element used to represent the leaf.
     *
     * @returns {HTMLElement}
     */
    get leafElem() {
        return this.#leafElem;
    }

    /** @type {point.P2 | undefined} */
    #leafPosCache;

    /**
     * The position of the leaf's upper-left corner in grid
     * coordiantes.
     *
     * @returns {point.P2}
     */
    get leafPosition() {
        if(!this.#leafPosCache) {
            this.#leafPosCache = grid.posOfLeaf(this.state.grid, this.leaf);
        }
        return this.#leafPosCache;
    }

    /**
     * Get the `CommonState` of the `View`.
     */
    get state() {
        return this.#view.state;
    }

    /**
     * Find the location of the event in grid coordinates, represented
     * as a point with decimal components.
     *
     * @returns {point.P2}
     */
    get #gridPt() {
        const rect = this.rootRect;
        const gridW    = this.state.grid.dims.width;
        const gridH    = this.state.grid.dims.height;
        const gridColF = point.lerp(0, gridW, rect.left, this.#event.clientX, rect.right);
        const gridRowF = point.lerp(0, gridH, rect.top, this.#event.clientY, rect.bottom);
        return point.mkP2(gridColF, gridRowF);
    }

    /**
     * Get the location of the event in grid coordinates, floored to
     * the nearest integer. This is useful to test which location was
     * clicked.
     *
     * @returns {point.P2}
     */
    get flooredGridPt() {
        return point.floorP2(this.#gridPt);
    }

    /**
     * Get the location of the event in grid coordinates, rounded to
     * the nearest integer. This is useful for positioning
     * between-location elements such as guides.
     *
     * @returns {point.P2}
     */
    get roundedGridPt() {
        return point.roundP2(this.#gridPt);
    }

    /**
     * The client bounding rectangle of the editor root element.
     *
     * @returns {DOMRect}
     */
    get rootRect() {
        return this.#view._root.getBoundingClientRect();
    }

    /**
     * The client bounding rectangle of the leaf under the pointer.
     */
    get leafRect() {
        return this.#leafElem.getBoundingClientRect();
    }

    /**
     * The number of columns in the top-level element of the grid.
     *
     * @returns {number}
     */
    get gridW() {
        return this.#view.state.grid.dims.width;
    }

    /**
     * The number of rows in the top-level element of the grid.
     *
     * @returns {number}
     */
    get gridH() {
        return this.#view.state.grid.dims.height;
    }
}
