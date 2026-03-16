import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { CommittableRecycler } from "../framework/index.js";
import { HistoryView } from "./history-view.js";
import { KeyViewEvent, AbstractView, ViewEvent } from "./abstract-view.js";
import {
    TextPrims,
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims
} from "../state/index.js";
import { padLeftToLength } from "../util.js";
import { withSnapshotInverse } from "../state/inverse.js";

/** @import { Inverse, AnyState } from "../state/index.js" */
/** @import { DragState } from "./edge-editing-view.js" */
/** @import { Recycler } from "../framework/index.js" */

/**
 * @typedef {"Move" | "Slide"} EdgeDraggingMode
 */

/**
 * An object with the same shape as `AbstractEditorView` for the
 * purposes of bootstrapping the initial view.
 *
 * @typedef {{
 *   parent: AbstractView | null,
 *   history: Inverse<AnyState>[],
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

    /** @returns {Inverse<AnyState>[]} */
    get history() { return this.#history; }

    /**
     * @abstract
     * @returns {AnyState}
     */
    get state() {
        throw new Error("Method not implemented");
    }

    /*************************************************************************/
    /** View Factory Registry                                               **/

    /**
     * A mapping from state types to the type of view which can be
     * used to represent the state.
     *
     * @type {Map<Function | symbol, (prev: AbstractEditorView, st: AnyState, ...args: *[]) => AbstractEditorView>}
     */
    static #viewForState = new Map();

    /**
     * Register a view factory for a given state class.
     *
     * @param {Function | symbol} stCtor The state class (or sentinel tag) to associate with this factory.
     * @param {(prev: AbstractEditorView, st: AnyState, ...args: *[]) => AbstractEditorView} viewCtor
     */
    static registerViewFactory(stCtor, viewCtor) {
        AbstractEditorView.#viewForState.set(stCtor, viewCtor);
    }

    /**
     * Create a new view appropriate for viewing the given state,
     * by looking up the factory registered for `st`'s class.
     *
     * @param {AnyState} st
     * @param {...*} args
     * @returns {AbstractEditorView}
     */
    createViewForState(st, ...args) {
        const factory = AbstractEditorView.#viewForState.get(st.constructor);
        if(!factory) {
            throw new Error(`createViewForState: no factory registered for '${st.constructor.name}'`);
        }
        return factory(this, st, ...args);
    }

    /*************************************************************************/
    /** Double-Click Classification                                         **/

    /**
     * @typedef {{
     *   cell: grid.CellPath,
     * }} LastClickInfo
     */

    /**
     * Information which records the cell of the last click. This
     * field is automatically cleared after a time; it is used to
     * detect when the user has double-clicked on a cell.
     *
     * @type {LastClickInfo | null}
     */
    #lastClick = null;

    /**
     * Check if a click, which clicked on `cell` should be classified
     * as a double-click by consulting `#lastClick`.
     *
     * @param {grid.CellPath} cell
     * @returns {boolean} `true` if this click should be handled as a
     *     double-click, and `false` if it should be handled as a
     *     single-click.
     */
    #classifyDoubleClick(cell) {
        if(this.#lastClick !== null && this.#lastClick.cell === cell) {
            this.#lastClick = null;
            return true;
        } else {
            this.#lastClick = { cell };
            window.setTimeout(() => this.#lastClick = null, 200);
            return false;
        }
    }

    /**
     * Given the global grid location of a click, try to edit the text
     * underneath the position.
     *
     * @param {PointerInCellEventContext} ctx
     * @returns {boolean} `true` if the editor was re-targeted for
     *     text editing, and `false` otherwise.
     */
    editTextOnDoubleClick(ctx) {
        const isDoubleClick = this.#classifyDoubleClick(ctx.cell);
        if(isDoubleClick) {
            // If the user double-clicked on the cell, we want to
            // change to text-editing mode, setting the selection
            // to the point under the cursor.

            const [inv, st] = withSnapshotInverse(TextPrims.editText, "edit text")(this.state);
            this.commitInverse(inv);

            this.commitInverse(st.putPointOnGlobalPosition(ctx.flooredGridPt, true));
            this.requestReplaceEditorView(this.createViewForState(st));
            return true;
        } else {
            return false;
        }
    }

    /*************************************************************************/
    /** Edge Dragging                                                       **/

    /**
     * Try to start dragging a row guide.
     *
     * @param {PointerEventContext} ctx
     * @param {grid.RowPath} row
     * @returns {boolean} `true` if the editor was re-targeted for
     *     dragging a row guide, and `false` otherwise.
     */
    startDraggingRowGuide(ctx, row) {
        const [inv, st] = this.edgeDraggingMode === "Move"
              ? withSnapshotInverse(MoveRowBoundaryPrims.moveRowBoundary)(this.state, row.rowNo)
              : withSnapshotInverse(SlideRowBoundaryPrims.slideRowBoundary)(this.state, row.rowNo);

        this.commitInverse(inv);
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
     * Try to start dragging a cell guide.
     *
     * @param {PointerEventContext} ctx
     * @param {grid.CellPath} cell
     * @returns {boolean} `true` if the editor was re-targeted for
     *     dragging a row guide, and `false` otherwise.
     */
    startDraggingCellGuide(ctx, cell) {
        const [inv, st] = this.edgeDraggingMode === "Move"
              ? withSnapshotInverse(MoveCellBoundaryPrims.moveCellBoundary)(this.state, cell.rowNo, cell.colNo)
              : withSnapshotInverse(SlideCellBoundaryPrims.slideCellBoundary)(this.state, cell.rowNo, cell.colNo);

        this.commitInverse(inv);
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
     * @param {grid.RowPath} row
     */
    onPointerDownInRowGuide(ctx, row) {
        this.startDraggingRowGuide(ctx, row);
    }

    /**
     * @param {PointerEventContext} ctx
     * @param {grid.CellPath} cell
     */
    onPointerDownInCellGuide(ctx, cell) {
        this.startDraggingCellGuide(ctx, cell);
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
     * View a particular line of the given cell.
     *
     * @param {number}        lineNo    The (local) index of the line to view.
     * @param {grid.CellPath} cell      The line's parent cell.
     * @param {Recycler}      r         The recycler to add to.
     */
    viewLine(lineNo, cell, r) {
        const theCell = grid.lookupCell(this.state.grid, cell);

        const line = theCell.data.lines[lineNo];
        r.elem({ tag: "div", key: `line-${lineNo}`, clearChildren: true }, (lineElem) => {
            lineElem.className = "editor-line";
            this.#buildLineFragments(lineElem, line);
        });
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     *
     * @param {grid.CellPath} cell
     * @param {Recycler} recycler
     */
    viewCellSelection(cell, recycler) {
        void cell;
        void recycler;
    }

    /**
     * View a single cell in the grid.
     *
     * @param {grid.CellPath} cell
     * @param {Recycler} r
     */
    #viewCell(cell, r) {
        r.elem({ tag: "div", key: `cell-${cell.rowNo}-${cell.colNo}`, clearAttributes: true }, (cellElem) => {
            const theCell = grid.lookupCell(this.state.grid, cell);
            cellElem.className = "editor-cell";
            cellElem.style.width = `${theCell.width}ch`;

            cellElem.onpointermove = (e) => {
                const ctx = new PointerInCellEventContext(e, this, cell);
                this.onPointerMoveInCell(ctx);
            }

            cellElem.onpointerdown = (e) => {
                const ctx = new PointerInCellEventContext(e, this, cell);
                this.onPointerDownInCell(ctx);
            }

            new CommittableRecycler(cellElem)
                .views(theCell.data.lines.map((_, i) => i), (rowNo, r) =>
                    this.viewLine(rowNo, cell, r))
                .view(r => this.viewCellSelection(cell, r))
                .elem({ tag: "div", key: "cell-guide-hitbox" }, (cellGuideHitboxElem) => {
                    cellGuideHitboxElem.className = "editor-cell-guide-hitbox";
                    cellGuideHitboxElem.onpointerdown = (e) => {
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInCellGuide(ctx, cell);
                    }
                })
                .elem({ tag: "div", key: "cell-guide" }, (cellGuideElem) => {
                    cellGuideElem.className = "editor-cell-guide";
                })
                .commit();
        });
    }

    /**
     * View a single row in the grid
     *
     * @param {grid.RowPath} row
     * @param {Recycler} r
     */
    #viewRow(row, r) {
        r.elem({ tag: "div", key: `row-${row.rowNo}`, clearAttributes: true }, (rowElem) => {
            const theRow = grid.lookupRow(this.state.grid, row);
            rowElem.className = "editor-row";
            rowElem.style.height = `${theRow.height}em`;

            new CommittableRecycler(rowElem)
                .views(grid.allCellPaths(this.state.grid, row), (cell, r) => this.#viewCell(cell, r))
                .elem({ tag: "div", key: "row-guide-hitbox" }, (rowGuideHitboxElem) => {
                    rowGuideHitboxElem.className = "editor-row-guide-hitbox";
                    rowGuideHitboxElem.onpointerdown = (e) => {
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInRowGuide(ctx, row);
                    }
                })
                .elem({ tag: "div", key: "row-guide" }, (rowGuideElem) => {
                    rowGuideElem.className = "editor-row-guide";
                })
                .commit();
        });
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
                gridRoot.className = "grid-root";
                this._root = gridRoot;

                new CommittableRecycler(gridRoot)
                    .views(grid.allRowPaths(this.state.grid), (row, r) => this.#viewRow(row, r))
                    .commit();
            })
            .view(r => HistoryView(r, this.#history))
            .commit();
    }

    /**
     * Add the editor to the given recycler.
     *
     * @param {Recycler} r The recycler to add to.
     */
    view(r) {
        r.elem("div", (root) => this._viewRoot(root));
    }

    /*************************************************************************/
    /** Event Handlers                                                      **/

    /**
     * Handle a pointer-down event inside a cell element.
     *
     * @param {PointerInCellEventContext} ctx
     */
    onPointerDownInCell(ctx) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }
    }

    /**
     * Handle a pointer-move event inside a cell element.
     *
     * @param {PointerInCellEventContext} ctx
     */
    onPointerMoveInCell(ctx) {
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

    /** @type {Inverse<AnyState>[]} */
    #history = [];

    /**
     * @param {Inverse<AnyState>} inverse
     */
    commitInverse(inverse) {
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
     * Apply an inverse to the editor state.
     *
     * @abstract
     * @param {Inverse<AnyState>} inverse
     */
    applyInverse(inverse) {
        void inverse;
        throw new Error("Method not implemented");
    }

    undo() {
        if(this.#history.length === 0) {
            return;
        }

        const top = this.#history.pop();
        this.applyInverse(top);

        // Replace the view with one which can view the current state.
        this.requestReplaceEditorView(this.createViewForState(this.state));
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

            const nLines = rect.height(grid.rectOfGrid(this.state.grid));
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
     * Get the `State` of the `View`.
     */
    get state() {
        return this.#view.state;
    }

    /**
     * @type {rect.Rect | undefined}
     */
    #gridRectCache;

    get gridRect() {
        if(!this.#gridRectCache) {
            this.#gridRectCache = grid.rectOfGrid(this.state.grid);
        }
        return this.#gridRectCache;
    }

    /**
     * Find the location of the event in grid coordinates, represented
     * as a point with decimal components.
     *
     * @returns {point.P2}
     */
    get #gridPt() {
        const elemRect = this.rootRect;
        const gridColF = point.lerp(0, this.gridW, elemRect.left, this.#event.clientX, elemRect.right);
        const gridRowF = point.lerp(0, this.gridH, elemRect.top, this.#event.clientY, elemRect.bottom);
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
     * The number of columns in the grid.
     *
     * @returns {number}
     */
    get gridW() {
        return rect.width(this.gridRect);
    }

    /**
     * The number of lines in the grid.
     *
     * @returns {number}
     */
    get gridH() {
        return rect.height(this.gridRect);
    }
}

export class PointerInCellEventContext extends PointerEventContext {
    /** @type {grid.CellPath} */
    #cell

    /**
     * Construct a new `PointerInCellEventContext`.
     *
     * @param {PointerEvent}       event The pointer event.
     * @param {AbstractEditorView} view  The editor view.
     * @param {grid.CellPath}      cell  The cell under the pointer.
     */
    constructor(event, view, cell) {
        super(event, view);
        this.#cell = cell;
    }

    /**
     * The cell under the point.
     *
     * @returns {grid.CellPath}
     */
    get cell() {
        return this.#cell;
    }

    /** @type {rect.Rect | undefined} */
    #cellRectCache;

    /**
     * The rectangle occupied by the cell in grid coordinates.
     *
     * @returns {rect.Rect}
     */
    get cellRect() {
        if(!this.#cellRectCache) {
            this.#cellRectCache = grid.rectOfCell (this.state.grid, this.cell);
        }
        return this.#cellRectCache;
    }
}
