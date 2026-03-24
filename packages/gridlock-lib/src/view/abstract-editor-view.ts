import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import * as util from "../util.js";
import { CommittableRecycler } from "../framework/index.js";
import { HistoryView } from "./history-view.js";
import { KeyViewEvent, AbstractView, ViewEvent } from "./abstract-view.js";
import {
    TextPrims,
    MoveCellBoundaryPrims,
    MoveRowBoundaryPrims,
    SlideCellBoundaryPrims,
    SlideRowBoundaryPrims,
    disableCellGuides,
    enableCellGuides
} from "../state/index.js";
import { DragState } from "./drag-state.js";
import { SnapshotInverse, TimedSnapshotInverse, withSnapshotInverse } from "../state/inverse.js";
import { cellContentExceedsCellWidth, maximumCellHeight, rowContentExceedsRowHeight } from "../state/state-iface.js";
import { padLeftToLength } from "../util.js";

import type { Inverse, AnyState } from "../state/index.js";
import type { Recycler } from "../framework/index.js";

const MAX_HISTORY: number = 100;

export type EdgeDraggingMode = "Move" | "Slide";

export interface InitialViewState {
    parent: AbstractView | null;
    history: Inverse<AnyState>[];
    undoIndex: number;
    edgeDraggingMode: EdgeDraggingMode;
    cellGuidesDisabled: false;
}

/**
 * Create an `InitialViewState` to bootstrap the editor view.
 */
export function mkInitialEditorViewState(): InitialViewState {
    return {
        parent: null,
        history: [],
        edgeDraggingMode: "Move",
        cellGuidesDisabled: false,
        undoIndex: -1,
    };
}

/**
 * Group a string into a list of strings, those strings which contain
 * no spaces, and those strings with one or more spaces.
 */
function groupBySpaces(str: string): IteratorObject<string> {
    const re = /([^ ]+)|( +)/g;
    const matches = str.matchAll(re);
    return matches.map(match => match[0]);
}

/**
 * An editor view is an instance of an editor state, which can show
 * itself on screen and respond to events.
 */
export abstract class AbstractEditorView extends AbstractView {
    _root!: HTMLElement;

    #history: Inverse<AnyState>[] = [];

    /**
     * The index of the item in `#history` which will be undone if
     * `undo` is called.
     */
    #undoIndex: number = -1;

    #edgeDraggingMode: EdgeDraggingMode = "Move";
    #lastClick: { cell: grid.CellPath } | null = null;
    #cellGuidesDisabled: boolean = false;
    #state: AnyState;

    constructor(prev: AbstractEditorView | InitialViewState, state: AnyState) {
        super(prev.parent);
        this.#history = prev.history;
        this.#undoIndex = prev.undoIndex;
        this.#edgeDraggingMode = prev.edgeDraggingMode;
        this.#state = state;
        this.#cellGuidesDisabled = prev.cellGuidesDisabled;
        this._root = prev instanceof AbstractEditorView ? prev._root : undefined;

        if(this.#cellGuidesDisabled && !this.canDisableCellGuides) {
            this.enableCellGuides();
        }
    }

    get history(): Inverse<AnyState>[] { return this.#history; }

    get undoIndex(): number { return this.#undoIndex; }

    /**
     * Get the current (generic) editor state.
     */
    get state(): AnyState {
        return this.#state;
    }

    /*************************************************************************/
    /** View Factory Registry                                               **/

    static #viewForState = new Map<
        Function | symbol,
        (prev: AbstractEditorView, st: AnyState, ...args: any[]) => AbstractEditorView
    >();

    static registerViewFactory(
        stCtor: Function | symbol,
        viewCtor: (prev: AbstractEditorView, st: AnyState, ...args: any[]) => AbstractEditorView
    ) {
        AbstractEditorView.#viewForState.set(stCtor, viewCtor);
    }

    createViewForState(st: AnyState, ...args: any[]): AbstractEditorView {
        const factory = AbstractEditorView.#viewForState.get(st.constructor);
        if(!factory) {
            throw new Error(`createViewForState: no factory registered for '${st.constructor.name}'`);
        }
        return factory(this, st, ...args);
    }

    /*************************************************************************/
    /** Double-Click Classification                                         **/

    /**
     * Check if a click, which clicked on `cell` should be classified
     * as a double-click by consulting `#lastClick`.
     */
    #classifyDoubleClick(cell: grid.CellPath): boolean {
        if(this.#lastClick !== null && grid.eqCellPath(this.#lastClick.cell, cell)) {
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
     */
    editTextOnDoubleClick(ctx: PointerInCellEventContext): boolean {
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
    /** enable/disable guides                                               **/

    /**
     * Is it valid to disable cell guides in the current editing mode?
     */
    get canDisableCellGuides(): boolean {
        return false;
    }

    get cellGuidesDisabled(): boolean {
        return this.#cellGuidesDisabled;
    }

    toggleCellGuidesDisabled(andThen?: ReplaceEditorViewCB) {
        if(this.#cellGuidesDisabled) {
            this.enableCellGuides(andThen);
        } else {
            this.disableCellGuides(andThen);
        }
    }

    /**
     * Disable the cell guides in the document, storing their
     * locations in the first cell on the line (which, after this
     * method is called), will be the only cell on the line.
     */
    disableCellGuides(andThen?: ReplaceEditorViewCB) {
        if(!this.canDisableCellGuides || this.#cellGuidesDisabled) {
            if(andThen) {
                andThen(this);
            }
            return;
        }

        console.log("Disabling cell guides");
        this.#cellGuidesDisabled = true;
        const newSt = disableCellGuides(this.state);
        this.requestReplaceEditorView(this.createViewForState(newSt), andThen);
    }

    /**
     * Re-enable cell guides after they have been disabled.
     */
    enableCellGuides(andThen?: ReplaceEditorViewCB) {
        if(!this.#cellGuidesDisabled) {
            if(andThen) {
                andThen(this);
            }
            return;
        }

        console.log("Enabling cell guides");
        this.#cellGuidesDisabled = false;
        const newSt = enableCellGuides(this.state);
        this.requestReplaceEditorView(this.createViewForState(newSt), andThen);
    }

    /*************************************************************************/
    /** Guide Dragging                                                      **/

    /**
     * Try to start dragging a row guide.
     */
    startDraggingRowGuide(ctx: PointerEventContext, row: grid.RowPath): boolean {
        // If the row is incomplete (its content overflows its boundary), we can't
        // slide it. So, we move it instead.
        const theRow = grid.lookupRow(ctx.state.grid, row);
        const incomplete = rowContentExceedsRowHeight(theRow);

        const [inv, st] = this.edgeDraggingMode === "Move" || incomplete
              ? withSnapshotInverse(MoveRowBoundaryPrims.moveRowBoundary)(this.state, row.rowNo)
              : withSnapshotInverse(SlideRowBoundaryPrims.slideRowBoundary)(this.state, row.rowNo);

        this.commitInverse(inv);

        const ds = ctx.intoDragState();
        this.requestReplaceEditorView(this.createViewForState(st, ds));
        return true;
    }

    /**
     * Try to start dragging a cell guide.
     */
    startDraggingCellGuide(ctx: PointerEventContext, cell: grid.CellPath): boolean {
        // If the cell is incomplete (its content overflows its boundary), we can't
        // slide it. So, we move it instead.
        const theCell = grid.lookupCell(ctx.state.grid, cell);
        const incomplete = cellContentExceedsCellWidth(theCell);

        const [inv, st] = this.edgeDraggingMode === "Move" || incomplete
              ? withSnapshotInverse(MoveCellBoundaryPrims.moveCellBoundary)(this.state, cell.rowNo, cell.colNo)
              : withSnapshotInverse(SlideCellBoundaryPrims.slideCellBoundary)(this.state, cell.rowNo, cell.colNo);

        this.commitInverse(inv);

        const ds = ctx.intoDragState();
        this.requestReplaceEditorView(this.createViewForState(st, ds));
        return true;
    }

    onPointerDownInRowGuide(ctx: PointerEventContext, row: grid.RowPath) {
        this.startDraggingRowGuide(ctx, row);
    }

    onPointerDownInCellGuide(ctx: PointerEventContext, cell: grid.CellPath) {
        this.startDraggingCellGuide(ctx, cell);
    }

    /*************************************************************************/
    /** View-Building Functions                                             **/

    /**
     * Build the contents (span fragments) for a line element.
     */
    #buildLineFragments(lineElem: HTMLElement, line: string, cellWidth: number) {
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

        if(line.length > cellWidth) {
            const overflowTape = document.createElement("span");
            overflowTape.style.width = `${line.length - cellWidth}ch`;
            overflowTape.className = "editor-line-overflow-tape";
            lineElem.appendChild(overflowTape);

            const overflowShadowCaster = document.createElement("span");
            overflowShadowCaster.style.width = `${line.length - cellWidth}ch`;
            overflowShadowCaster.className = "editor-line-overflow-shadow-caster";
            lineElem.appendChild(overflowShadowCaster);
        }
    }

    /**
     * View a particular line of the given cell.
     */
    viewLine(lineNo: number, cell: grid.CellPath, r: Recycler) {
        const theCell = grid.lookupCell(this.state.grid, cell);

        const line = theCell.data.lines[lineNo];
        r.elem({ tag: "div", key: `line-${lineNo}`, clearChildren: true }, (lineElem) => {
            lineElem.className = "editor-line";
            lineElem.style.minWidth = `${line.length}ch`;

            this.#buildLineFragments(lineElem, line, theCell.width);
        });
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     */
    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        void cell;
        void recycler;
    }

    /**
     * Implemented by subclasses to inform this view if it should
     * display the clipped text of a cell.
     */
    displayClippedText(cell: grid.CellPath): boolean {
        void cell;
        return false;
    }

    /**
     * Implemented by subclasses to inform this view if it should
     * consider the given cell selected.
     */
    cellIsSelected(cell: grid.CellPath): boolean {
        void cell;
        return false;
    }

    /**
     * View the disabled guide for at local-column `guideX`. The
     * function is passed the `disabledCell` path, which is the path
     * of the cell, had it not been disabled. (I.e. be careful,
     * because `disabledCell` doesn't exist in the viewed grid).
     */
    #viewDisabledCellGuide(disabledCell: grid.CellPath, guideX: number, r: Recycler) {
        r.elem({ tag: "div", key: `disabled-cell-guide-${guideX}` }, (disabledGuideElem) => {
            disabledGuideElem.className = "editor-cell-guide";
            disabledGuideElem.classList.add("editor-disabled-cell-guide");
            disabledGuideElem.style.right = `calc(100% - ${guideX}ch - 0.5px)`;
        })
        r.elem({ tag: "div", key: `disabled-cell-guide-hitbox-${guideX}` }, (disabledGuideHitboxElem) => {
            disabledGuideHitboxElem.className = "editor-cell-guide-hitbox";
            disabledGuideHitboxElem.style.right = `calc(100% - ${guideX}ch - 2px)`;
            disabledGuideHitboxElem.onpointerdown = (e) => {
                e.stopPropagation();

                // Since cell guides are disabled before running the
                // below, we use the hypothetical location of the
                // disabled cell, since by the time we process the
                // drag action, a cell at the hypothetical position
                // will actually exist.
                this.enableCellGuides(newView => {
                    const ctx = new PointerEventContext(e, newView);
                    util.assert(grid.lookupCell(newView.state.grid, disabledCell) !== undefined);
                    newView.onPointerDownInCellGuide(ctx, disabledCell);
                });
            }
        })
    }

    /**
     * View a single cell in the grid.
     */
    #viewCell(cell: grid.CellPath, rowHeight: number, r: Recycler) {
        r.elem({ tag: "div", key: `cell-${cell.rowNo}-${cell.colNo}` }, (cellElem) => {
            const isLastOnRow = grid.lookupRow(this.state.grid, cell).cells.length - 1 === cell.colNo;
            const theCell = grid.lookupCell(this.state.grid, cell);
            const incomplete = cellContentExceedsCellWidth(theCell);
            cellElem.className = "editor-cell";

            const displayClippedText = this.displayClippedText(cell);
            if(displayClippedText) {
                cellElem.classList.add("editor-cell-display-clipped");
            }

            if(cellElem.getAttribute("data-last-width") !== theCell.width.toString()) {
                cellElem.setAttribute("data-last-width", theCell.width.toString());

                // Then, this cell has a new width since the last
                // frame.
                cellElem.classList.add("editor-cell-width-changed");
            }
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
                .elem({ tag: "div", key: "cell-lines-clip-box", clearAttributes: true }, (cellLinesClipBoxElem) => {
                    if(!displayClippedText) {
                        cellLinesClipBoxElem.className = "editor-cell-clip-box";
                    }

                    new CommittableRecycler(cellLinesClipBoxElem)
                        .views(theCell.data.lines
                            .map((_: string, rowNo: number) => rowNo)
                            .filter(rowNo => rowNo < rowHeight),
                            (rowNo: number, r: Recycler) =>
                                this.viewLine(rowNo, cell, r))
                        .commit();
                })
                .views([...theCell.data.disabledGuides.values()]
                    .toSorted((a, b) => a - b)
                    .map((guideX: number, colNo: number) => [guideX, colNo]),
                    ([guideX, colNo]: [number, number], r: Recycler) =>
                        this.#viewDisabledCellGuide({ rowNo: cell.rowNo, colNo }, guideX, r))
                .view((r: Recycler) => this.viewCellSelection(cell, r))
                .elem({ tag: "div", key: "cell-guide-hitbox" }, (cellGuideHitboxElem) => {
                    cellGuideHitboxElem.className = "editor-cell-guide-hitbox";
                    cellGuideHitboxElem.onpointerdown = (e) => {
                        e.stopPropagation();
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInCellGuide(ctx, cell);
                    }
                })
                .elem({ tag: "div", key: "cell-guide" }, (cellGuideElem) => {
                    cellGuideElem.className = "editor-cell-guide";
                    // If the cell is the last on its row, or it's right
                    // edge is already delimited by a blind, there's no
                    // need to show a guide element.
                    if(isLastOnRow || incomplete) {
                        cellGuideElem.style.display = "none";
                    } else {
                        cellGuideElem.style.display = "block";
                    }
                })
                .elem({ tag: "div", key: "cell-blind" }, (cellBlindElem) => {
                    cellBlindElem.className = "editor-cell-blind";
                    const selected = this.cellIsSelected(cell);
                    cellBlindElem.style.display = incomplete && !selected ? "block" : "none";
                })
                .commit();
        });
    }

    /**
     * Draw the selection of a row, if any, by adding items to the
     * recycler.
     */
    viewRowSelection(row: grid.RowPath, recycler: Recycler) {
        void row;
        void recycler;
    }

    /**
     * View a single row in the grid
     */
    #viewRow(row: grid.RowPath, r: Recycler) {
        r.elem({ tag: "div", key: `row-${row.rowNo}`, clearAttributes: true }, (rowElem) => {
            const isLastInGrid = this.state.grid.rows.length - 1 === row.rowNo;
            const theRow = grid.lookupRow(this.state.grid, row);
            rowElem.className = "editor-row";
            rowElem.style.height = `${theRow.height}em`;

            const incomplete = rowContentExceedsRowHeight(theRow);
            if(incomplete) {
                rowElem.classList.add("editor-row-incomplete");
            }

            new CommittableRecycler(rowElem)
                .views(grid.allCellsOnRow(this.state.grid, row), (cell: grid.CellPath, r: Recycler) =>
                    this.#viewCell(cell, theRow.height, r))
                .view((r: Recycler) => this.viewRowSelection(row, r))
                .elem({ tag: "div", key: "row-guide-hitbox" }, (rowGuideHitboxElem) => {
                    rowGuideHitboxElem.className = "editor-row-guide-hitbox";
                    rowGuideHitboxElem.onpointerdown = (e) => {
                        const ctx = new PointerEventContext(e, this);
                        this.onPointerDownInRowGuide(ctx, row);
                    }
                })
                .elem({ tag: "div", key: "row-guide" }, (rowGuideElem) => {
                   rowGuideElem.className = "editor-row-guide";
                   // If this row is the last in the grid, or it's already delimited at its
                   // end by a blind, we don't need to draw its guide.
                   if(isLastInGrid || incomplete) {
                       rowGuideElem.style.display = "none";
                   } else {
                       rowGuideElem.style.display = "block";
                   }
                })
                .elem({ tag: "div", key: "row-blind" }, (rowBlindElem) => {
                    rowBlindElem.className = "editor-row-blind";
                    rowBlindElem.style.display = incomplete ? "block" : "none";
                })
                .commit();
        });
    }

    /**
     * Give subclasses a chance to draw an overlay over the entire
     * grid.
     */
    viewGridRootOverlay(r: Recycler) {
        void r;
    }

    /**
     * Populate the root element of the editor view. Subclasses may
     * override this to attach additional behaviour to the root element.
     */
    _viewRoot(root: HTMLElement) {
        root.oncontextmenu = () => false;

        root.className = "editor-root";

        new CommittableRecycler(root)
            .elem({ tag: "div", key: "line-numbers-margin" }, (lineNumsElem) => {
                let y = 1;
                const lineNos = grid.allRows(this.state.grid).flatMap(row => {
                    const theRow = grid.lookupRow(this.state.grid, row);
                    const lineNos = Array.from({ length: theRow.height }, (_, i) => i + y);
                    y += maximumCellHeight(theRow);
                    return lineNos;
                });

                lineNumsElem.className = "editor-line-nums-margin";

                new CommittableRecycler(lineNumsElem)
                    .elems(lineNos, "span", (lineNo, label) => {
                        label.className = "editor-line-num";
                        label.innerText = padLeftToLength(lineNo.toString(), 2);
                    })
                    .commit();
            })
            .elem("div", (gridRoot) => {
                gridRoot.className = "grid-root";

                // We must be careful that this._root is always recycled,
                // since we might have pointer events attached to it, and those
                // pointer events must survive `ReplaceEditorViewEvent`s.
                util.assert(!this._root || this._root === gridRoot);
                this._root = gridRoot;

                new CommittableRecycler(gridRoot)
                    .views(
                        grid.allRows(this.state.grid),
                        (row: grid.RowPath, r: Recycler) =>
                            this.#viewRow(row, r))
                    .view(r => this.viewGridRootOverlay(r))
                    .commit();
            })
            .view((r: Recycler) => HistoryView(r, this.#history, this.#undoIndex))
            .commit();
    }

    /**
     * Add the editor to the given recycler.
     */
    view(r: Recycler) {
        r.elem("div", (root) => this._viewRoot(root));
    }

    /*************************************************************************/
    /** Event Handlers                                                      **/

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(ctx: PointerInCellEventContext) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }
    }

    /**
     * Handle a pointer-move event inside a cell element.
     */
    onPointerMoveInCell(ctx: PointerInCellEventContext) {
        void ctx;
    }

    requestReplaceEditorView(
        newView: AbstractEditorView,
        andThen?: (newView: AbstractEditorView) => void
    ) {
        this.notify(new ReplaceEditorViewEvent(this, newView, andThen));
    }

    /**
     * If the event is a key event, and the key event matches the key
     * for undo, issue an undo.
     */
    handleUndoKey(e: ViewEvent): boolean {
        if(e instanceof KeyViewEvent) {
            if(e.e.ctrlKey && e.e.key === "/") {
                this.undo();
                return true;
            }
        }
        return false;
    }

    /*************************************************************************/
    /** Event Handlers / Copy & Paste                                       **/

    /**
     * A subclass may implement this method in order to specify a
     * string which, at this moment, should be committed to the
     * clipboard.
     *
     * If it returns `undefined`, then the clipboard is unchanged.
     */
    doCopy(): string | undefined {
        return undefined;
    }

    /**
     * Test if `e` is a key-event matching the description of the copy
     * chord, and if so, call `doCopy`.
     */
    handleCopyKey(e: ViewEvent): boolean {
        if(e instanceof KeyViewEvent) {
            if(e.e.ctrlKey && e.e.key === "w") {
                const clipping = this.doCopy();
                if(clipping !== undefined) {
                    console.error("TODO: Copy to clipboard");
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Paste the clipboard contents (given by `str`) into the view.
     *
     * Subclasses should implement this.
     */
    doPaste(str: string) {
        void str;
        // By default, do nothing.
    }

    /**
     * Test if `e` is a key-event matching the description of the
     * paste chord, and if so, call `doPaste`.
     */
    handlePasteKey(e: ViewEvent): boolean {
        if(e instanceof KeyViewEvent) {
            if(e.e.ctrlKey && e.e.key === "y") {
                navigator.clipboard.readText()
                    .then(text => this.doPaste(text))
                    .catch(err => console.error('Failed to read clipboard:', err));

                return true;
            }
        }
        return false;
    }

    handleEvent(e: ViewEvent): boolean {
        return this.handleUndoKey(e)
            || this.handleCopyKey(e)
            || this.handlePasteKey(e)
            || super.handleEvent(e);
    }

    /*************************************************************************/
    /** Undo History                                                        **/

    commitInverse(inverse: Inverse<AnyState>) {
        // Clear everything after the `undoIndex`.
        this.#history = this.#history.slice(0, this.undoIndex + 1);

        // Try to compact the history by composing inverses.
        while(this.#history.length > 0) {
            const top = this.#history.at(-1)!;
            if(!inverse.compose) {
                break;
            }

            const newTop = inverse.compose(top);
            if(!newTop) {
                break;
            }

            this.#history.pop();
            --this.#undoIndex;
            inverse = newTop;
        }

        this.#history.push(inverse);
        ++this.#undoIndex;

        while(this.#history.length > MAX_HISTORY) {
            this.#history.shift();
            --this.#undoIndex;
        }

        util.assert(
            0 <= this.#undoIndex && this.#undoIndex < this.#history.length,
            `undoIndex is out of range (it is ${this.#undoIndex}, but history has length ${this.#history.length}).`
        );

        this.requestRedraw();
    }

    abstract applyInverse(inverse: Inverse<AnyState>): AnyState;

    undo() {
        if(this.#undoIndex === 0 || this.#history.length === 0) {
            return;
        }

        if(this.#undoIndex === this.#history.length - 1) {
            // If we're undoing from the last action, make a snapshot
            // representing the current editor state. Otherwise, we
            // won't be able to redo to the current state.
            this.commitInverse(new TimedSnapshotInverse(this.state.clone(), Infinity, "top"));
            --this.#undoIndex; // Don't set the undo index to "top".
        }

        const top = this.#history[this.#undoIndex];
        --this.#undoIndex;

        const restoredState = this.applyInverse(top);

        // Replace the view with one which can view the restored state.
        this.requestReplaceEditorView(this.createViewForState(restoredState));
    }

    redo() {
        // Look ahead to the next snapshot inverse. (We can't undo a
        // non-snapshot inverse for now).

        let nextSnapshotIdx = this.#history.slice(this.#undoIndex + 1).findIndex(inverse =>
            inverse instanceof SnapshotInverse
        );

        // If there's no next snapshot, then we can't redo.
        if(nextSnapshotIdx < 0) return;
        nextSnapshotIdx += this.#undoIndex + 1;

        this.#undoIndex = nextSnapshotIdx;
        const restoredState = this.applyInverse(this.#history[nextSnapshotIdx]);

        // Replace the view with one which can view the restored state.
        this.requestReplaceEditorView(this.createViewForState(restoredState));
    }

    /*************************************************************************/
    /** Edge Dragging Mode                                                  **/

    set edgeDraggingMode(mode: EdgeDraggingMode) {
        this.#edgeDraggingMode = mode;
    }

    get edgeDraggingMode(): EdgeDraggingMode {
        return this.#edgeDraggingMode;
    }
}

type ReplaceEditorViewCB = (newView: AbstractEditorView) => void;

/**
 * Notify that an editor view should be replaced.
 *
 * The event takes an optional function to apply to the new editor
 * view after it has been instantiated.
 */
export class ReplaceEditorViewEvent extends ViewEvent {
    #newView: AbstractEditorView;
    #andThen: ReplaceEditorViewCB | undefined;

    constructor(
        initiator: AbstractView,
        newView: AbstractEditorView,
        andThen?: ReplaceEditorViewCB
    ) {
        super(initiator, true);
        this.#newView = newView;
        this.#andThen = andThen;
    }

    get newView(): AbstractEditorView { return this.#newView; }
    get andThen(): ReplaceEditorViewCB | undefined { return this.#andThen };
}

/**
 * Records computed information about a pointer event, so that we
 * don't have to recompute it all the time.
 */
export class PointerEventContext {
    #event: PointerEvent;
    #view: AbstractEditorView;
    #gridRectCache?: rect.Rect;

    constructor(event: PointerEvent, view: AbstractEditorView) {
        this.#event = event;
        this.#view  = view;
    }

    get event(): PointerEvent {
        return this.#event;
    }

    get state() {
        return this.#view.state;
    }

    get gridRect(): rect.Rect {
        if(!this.#gridRectCache) {
            this.#gridRectCache = grid.rectOfGrid(this.state.grid);
        }
        return this.#gridRectCache;
    }

    /**
     * Find the location of the event in grid coordinates, represented
     * as a point with decimal components.
     */
    get #gridPt(): point.P2 {
        const elemRect = this.rootRect;
        const gridColF = point.lerp(0, this.gridW, elemRect.left, this.#event.clientX, elemRect.right);
        const gridRowF = point.lerp(0, this.gridH, elemRect.top, this.#event.clientY, elemRect.bottom);
        return point.mkP2(gridColF, gridRowF);
    }

    /**
     * Get the location of the event in grid coordinates, floored to
     * the nearest integer.
     */
    get flooredGridPt(): point.P2 {
        return point.floorP2(this.#gridPt);
    }

    /**
     * Get the location of the event in grid coordinates, rounded to
     * the nearest integer.
     */
    get roundedGridPt(): point.P2 {
        return point.roundP2(this.#gridPt);
    }

    /**
     * Get the location of the event in grid coordinates, rounded to
     * the nearest integer column, and floored to the nearest integer
     * row.
     */
    get roundedXFlooredYPt(): point.P2 {
        const pt = this.#gridPt;
        return point.mkP2(Math.round(pt.x), Math.floor(pt.y));
    }

    get rootRect(): DOMRect {
        return this.#view._root.getBoundingClientRect();
    }

    get gridW(): number {
        return rect.width(this.gridRect);
    }

    get gridH(): number {
        return rect.height(this.gridRect);
    }

    /**
     * Construct a new `DragState` from this `PointerEventContext`.
     *
     * The optional argument specifies if the grid cell under the
     * pointer should be determined by rounding to the nearest cell,
     * or choosing the containing cell.
     */
    intoDragState(roundOrFloorGridOrigin: "Round" | "Floor" = "Round"): DragState {
        return new DragState({
            dragOriginPx: point.mkP2(this.event.clientX, this.event.clientY),
            dragOriginGrid: roundOrFloorGridOrigin === "Round" ? this.roundedGridPt : this.flooredGridPt,
            gridScale: point.mkV2(this.rootRect.width / this.gridW, this.rootRect.height / this.gridH),
            pointerId: this.event.pointerId
        });
    }
}

export class PointerInCellEventContext extends PointerEventContext {
    #cell: grid.CellPath;
    #cellRectCache?: rect.Rect;

    constructor(event: PointerEvent, view: AbstractEditorView, cell: grid.CellPath) {
        super(event, view);
        this.#cell = cell;
    }

    get cell(): grid.CellPath {
        return this.#cell;
    }

    get cellRect(): rect.Rect {
        if(!this.#cellRectCache) {
            this.#cellRectCache = grid.rectOfCell(this.state.grid, this.cell);
        }
        return this.#cellRectCache;
    }
}
