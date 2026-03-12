import * as grid from "../grid.js";
import * as point from "../point.js";
import { CommittableRecycler } from "../framework/index.js";
import { HistoryView } from "./history-view.js";
import { KeyViewEvent, AbstractView, ViewEvent } from "./abstract-view.js";
import { edgePrims, textPrims } from "../state/index.js";
import { padLeftToLength } from "../util.js";

/** @import { Recycler } from "../framework/index.js" */
/** @import { CommonState, Cell, Inverse } from "../state/common-state.d.ts" */
/** @import { HistoryItem } from "./history.d.ts" */
/** @import { DragState } from "./edge-editing-view.js" */

/**
 * @typedef {"Move" | "Slide"} EdgeDraggingMode
 */

/**
 * An object with the same shape as `AbstractEditorView` for the
 * purposes of bootstrapping the initial view.
 *
 * @typedef {{
 *   parent: AbstractView | null,
 *   history: HistoryItem[],
 *   edgeDraggingMode: EdgeDraggingMode,
 * }} InitialViewState
 */

/**
 * Create an `InitialViewState` to bootstrap the editor view.n
 *
 * @returns {InitialViewState}
 */
export function mkInitialEditorViewState() {
    return { parent: null, history: [], edgeDraggingMode: "Move" };
}

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
export class AbstractEditorView extends AbstractView {
    /**
     * @param {AbstractEditorView | InitialViewState} prev
     */
    constructor(prev) {
        super(prev.parent);
        if(new.target === AbstractEditorView) {
            throw new Error("Cannot instantiate AbstractEditorView directly");
        }
        this.#history = prev.history;
        this.#edgeDraggingMode = prev.edgeDraggingMode;
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
    /** View Factory Registry                                               **/

    /**
     * @type {Map<Function | symbol, (prev: AbstractEditorView, st: CommonState, ...args: *[]) => AbstractEditorView>}
     */
    static #viewFactories = new Map();

    /**
     * Register a view factory for a given state class.
     *
     * @param {Function | symbol} key The state class (or sentinel tag) to associate with this factory.
     * @param {(prev: AbstractEditorView, st: CommonState, ...args: *[]) => AbstractEditorView} factory
     */
    static registerViewFactory(key, factory) {
        AbstractEditorView.#viewFactories.set(key, factory);
    }

    /**
     * Create a new view appropriate for viewing the given state,
     * by looking up the factory registered for `st`'s class.
     *
     * @param {CommonState} st
     * @param {...*} args
     * @returns {AbstractEditorView}
     */
    createViewForState(st, ...args) {
        const factory = AbstractEditorView.#viewFactories.get(st.constructor);
        if(!factory) {
            throw new Error(`createViewForState: no factory registered for '${st.constructor.name}'`);
        }
        return factory(this, st, ...args);
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
     * @param {PointerInLeafEventContext} ctx
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
            this.requestReplaceEditorView(this.createViewForState(st));
            return true;
        } else {
            return false;
        }
    }

    /*************************************************************************/
    /** Edge Dragging                                                       **/

    /**
     * Try to drag an edge, but only if the click was close to one.
     *
     * @param {PointerEventContext} ctx
     * @param {grid.Split<Cell>} node
     * @returns {boolean} `true` if the editor was re-targeted for
     *     dragging an edge, and `false` otherwise.
     */
    startDraggingEdge(ctx, node) {
        // Create the appropriate edge state based on dragging mode.
        const [st, inv] = this.edgeDraggingMode === "Slide"
              ? edgePrims.startSlidingEdge(this.state)
              : edgePrims.startMovingEdge(this.state);

        this.commitUndoableItem(inv);
        this.runPrimitiveWithUndo(st, edgePrims.selectEdgeOfNode, node);

        // Capture the pointer of the root element so that the
        // user can drag outside of the current bounds of the
        // element if necessary.
        this._root.setPointerCapture(ctx.event.pointerId);

        /** @type {DragState} */
        const dragState = {
            dragOriginPx: point.mkP2(ctx.event.clientX, ctx.event.clientY),
            dragOriginGrid: ctx.roundedGridPt,
            gridScale: point.mkV2(ctx.rootRect.width / ctx.gridW, ctx.rootRect.height / ctx.gridH),
            lastArg: 0
        };

        this.requestReplaceEditorView(this.createViewForState(st, dragState));
        return true;
    }

    /**
     * @param {PointerEventContext} ctx
     * @param {grid.Split<Cell>} node
     */
    onPointerDownInHorizontalGuide(ctx, node) {
        this.startDraggingEdge(ctx, node);
    }

    /**
     * @param {PointerEventContext} ctx
     * @param {grid.Split<Cell>} node
     */
    onPointerDownInVerticalGuide(ctx, node) {
        this.startDraggingEdge(ctx, node);
    }

    /*************************************************************************/
    /** View-Building Functions                                             **/

    /**
     * View a single node in the grid.
     *
     * @param {grid.Split<Cell>} node
     * @param {point.P2} p
     * @param {Recycler} r
     */
    #viewNode(node, p, r) {
        r.elem({ tag: "div", key: `node-${p.y}-${p.x}-${node.dims.height}-${node.dims.width}`, clearAttributes: true }, (nodeElem) => {
            const sz = node.dims;
            const gridSpec = node.type === "Vert"
                  ? `${p.y + 1}/${p.x + 1}/span ${node.left.dims.height}/span ${sz.width}`
                  : `${p.y + 1}/${p.x + 1}/span ${sz.height}/span ${node.left.dims.width}`;
            nodeElem.className      = "editor-node";
            nodeElem.style.gridArea = gridSpec;

            const r = new CommittableRecycler(nodeElem);

            if(node.type === "Vert") {
                r.elem({ tag: "div", key: "horizontal-guide-hitbox" }, (horizontalGuideHitboxElem) => {
                    horizontalGuideHitboxElem.className = "editor-horizontal-guide-hitbox";
                    horizontalGuideHitboxElem.onpointerdown = (e) => {
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInHorizontalGuide(ctx, node);
                    }
                })
                r.elem({ tag: "div", key: "horizontal-guide" }, (horizontalGuideElem) => {
                    horizontalGuideElem.className = "editor-horizontal-guide";
                })
            } else {
                r.elem({ tag: "div", key: "vertical-guide-hitbox" }, (verticalGuideHitboxElem) => {
                    verticalGuideHitboxElem.className = "editor-vertical-guide-hitbox";
                    verticalGuideHitboxElem.onpointerdown = (e) => {
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInVerticalGuide(ctx, node);
                    }
                })
                r.elem({ tag: "div", key: "vertical-guide" }, (verticalGuideElem) => {
                    verticalGuideElem.className = "editor-vertical-guide";
                });
            }

            r.commit();
        });
    }

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
     * @param {Recycler} recycler The recycler to add to.
     */
    viewLine(rowNo, leaf, p, recycler) {
        void p;

        const line = leaf.data.lines[rowNo];
        recycler.elem({ tag: "div", key: `line-${rowNo}`, clearChildren: true }, (lineElem) => {
            lineElem.className = "editor-line";
            this.#buildLineFragments(lineElem, line);
        });
    }

    /**
     * Draw the selection of a leaf, if any, by adding items to the
     * recycler.
     *
     * @param {grid.Leaf<Cell>} leaf
     * @param {Recycler} recycler
     */
    viewLeafSelection(leaf, recycler) {
        void leaf;
        void recycler;
    }

    /**
     * View a particular leaf of the grid.
     *
     * @param {grid.Leaf<Cell>} leaf The leaf to view.
     * @param {point.P2} p The position of the upper-left corner of the leaf.
     * @param {Recycler} recycler The recycler to add to.
     */
    viewLeaf(leaf, p, recycler) {
        recycler.elem({ tag: "div", key: `leaf-${p.y}-${p.x}` }, (leafElem) => {
            const sz = leaf.dims;
            const gridSpec = `${p.y + 1}/${p.x + 1}/span ${sz.height}/span ${sz.width}`;

            leafElem.className      = "editor-cell";
            leafElem.style.width    = `${sz.width}ch`;
            leafElem.style.gridArea = gridSpec;

            leafElem.onpointermove = (e) => {
                const ctx = new PointerInLeafEventContext(e, this, leaf);
                this.onPointerMoveInLeaf(ctx);
            };

            leafElem.onpointerdown = (e) => {
                const ctx = new PointerInLeafEventContext(e, this, leaf);
                this.onPointerDownInLeaf(ctx);
            }

            return new CommittableRecycler(leafElem)
                .views(leaf.data.lines.map((_, i) => i), (rowNo, r) => {
                    this.viewLine(rowNo, leaf, p, r);
                })
                .view(r => this.viewLeafSelection(leaf, r))
                .commit();
        });
    }

    /**
     * Add the editor to the given recycler.
     *
     * @param {Recycler} r The recycler to add to.
     */
    view(r) {
        r.elem("div", (root) => this._viewRoot(root));
    }

    /**
     * Populate the root element of the editor view. Subclasses may
     * override this to attach additional behaviour to the root element.
     *
     * @param {HTMLElement} root
     */
    _viewRoot(root) {
        root.className = "editor-root";

        new CommittableRecycler(root)
            .view(r => this.#viewLineNumbers(r))
            .elem("div", (gridRoot) => {
                gridRoot.style.display = "inline-grid";
                gridRoot.style.gridTemplateColumns = "1ch";
                gridRoot.style.gridTemplateRows = "1em";
                this._root = gridRoot;

                new CommittableRecycler(gridRoot)
                    .views(grid.allNodesWithPosition(this.state.grid), ([node, p], r) => {
                        if(node.type === "Leaf") {
                            this.viewLeaf(node, p, r);
                        } else {
                            this.#viewNode(node, p, r);
                        }
                    })
                    .commit();
            })
            .view(r => HistoryView(r, this.#history))
            .commit();
    }

    /*************************************************************************/
    /** Event Handlers                                                      **/

    /**
     * Handle a pointer-down event inside a leaf element.
     *
     * @param {PointerInLeafEventContext} ctx
     */
    onPointerDownInLeaf(ctx) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }
    }

    /**
     * Handle a pointer-move event inside a leaf element.
     *
     * @param {PointerInLeafEventContext} ctx
     */
    onPointerMoveInLeaf(ctx) {
        void ctx;
    }

    /**
     * @param {AbstractEditorView} newView
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
        // Try to compact the history by composing inverses.
        while(this.#history.length > 0) {
            const top = this.#history.at(-1);
            if(!inverse.compose) {
                break;
            }

            const newTop = inverse.compose(top);
            if(!newTop) {
                break;
            }

            this.#history.pop();
            inverse = newTop;
        }

        this.#history.push(inverse);
        this.requestRedraw();
    }

    /**
     * Run a primitive operation, saving its inverse to the undo
     * history.
     *
     * @template {CommonState} S
     * @template {any[]} A
     * @param {S} st The current state.
     * @param {(st: S, ...args: A) => Inverse<S>} prim The primitive operation to wrap.
     * @param {A} args The arguments to the primitive function
     */
    runPrimitiveWithUndo(st, prim, ...args) {
        const inverse = prim(st, ...args);
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
     * @param {(st: S, ...args: A) => Inverse<S>} prim The primitive operation to wrap.
     * @param {A} args The arguments to the primitive function
     */
    runPrimitiveWithUndoThenRedraw(st, prim, ...args) {
        this.runPrimitiveWithUndo(st, prim, ...args);
        this.requestRedraw();
    }

    undo() {
        if(this.#history.length === 0) {
            return;
        }

        const top = this.#history.pop();
        const newState = top.apply(this.state);

        // Replace the view with one which can view the current state.
        this.requestReplaceEditorView(this.createViewForState(newState));
    }

    /*************************************************************************/
    /** Visual Decorations                                                  **/

    /**
     * View a strip of line numbers to the left of the editor.
     *
     * @param {Recycler} recycler The recycler to add to.
     */
    #viewLineNumbers(recycler) {
        recycler.elem({ tag: "div", key: "line-numbers-margin" }, (lineNumsElem) => {
            lineNumsElem.className = "editor-line-nums-margin";

            const nLines = this.state.grid.dims.height
            const lineNos = Array.from({ length: nLines }, (_, i) => i + 1);

            new CommittableRecycler(lineNumsElem)
                .elems(lineNos, "span", (lineNo, label) => {
                    label.className = "editor-line-num";
                    label.innerText = padLeftToLength(lineNo.toString(), 2);
                })
                .commit();
        });
    }

    /*************************************************************************/
    /** Edge Dragging Mode                                                  **/

    /** @type {EdgeDraggingMode} */
    #edgeDraggingMode = "Move";

    /** @param {EdgeDraggingMode} mode */
    set edgeDraggingMode(mode) {
        this.#edgeDraggingMode = mode;
    }

    /** @returns {EdgeDraggingMode} */
    get edgeDraggingMode() {
        return this.#edgeDraggingMode;
    }
}

/**
 * Notify that an editor view should be replaced.
 */
export class ReplaceEditorViewEvent extends ViewEvent {
    /** @type {AbstractEditorView} */
    #newView;

    /**
     * @param {AbstractView} initiator
     * @param {AbstractEditorView} newView
     */
    constructor(initiator, newView) {
        super(initiator, true);
        this.#newView = newView;
    }

    /** @returns {AbstractEditorView} */
    get newView() { return this.#newView; }
}

/**
 * Records computed information about a pointer event, so that we
 * don't have to recompute it all the time.
 */
export class PointerEventContext {
    /** @type {PointerEvent} */
    #event

    /** @type {AbstractEditorView} */
    #view

    /**
     * Construct a new `PointerEventContext`.
     *
     * @param {PointerEvent}       event The pointer event.
     * @param {AbstractEditorView} view  The editor view.
     */
    constructor(event, view) {
        this.#event = event;
        this.#view  = view;
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
        const rect     = this.rootRect;
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
     * Get the location of the event in grid coordinates, rounded to
     * the nearest integer column, and floored to the nearest integer
     * row.
     *
     * @returns {point.P2}
     */
    get roundedXFlooredYPt() {
        const pt = this.#gridPt;
        return point.mkP2(Math.round(pt.x), Math.floor(pt.y));
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

export class PointerInLeafEventContext extends PointerEventContext {
    /** @type {grid.Leaf<Cell>} */
    #leaf

    /**
     * Construct a new `PointerInLeafEventContext`.
     *
     * @param {PointerEvent}       event The pointer event.
     * @param {AbstractEditorView} view  The editor view.
     * @param {grid.Leaf<Cell>}    leaf  The leaf under the pointer.
     */
    constructor(event, view, leaf) {
        super(event, view);
        this.#leaf     = leaf;
    }

    /** @type {point.P2 | undefined} */
    #leafPosCache;

    /**
     * The leaf under the point.
     *
     * @returns {grid.Leaf<Cell>}
     */
    get leaf() {
        return this.#leaf;
    }

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
}
