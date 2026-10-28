import "./cell-editing-view.css";
import * as cmenu from "./context-menu.js";
import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { AbstractEditorView, PointerEventContext, PointerInCellEventContext } from "./abstract-editor-view.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellPrims, serialize } from "../state/index.js";
import { DragState } from "./drag-state.js";
import { RowDraggingView } from "./row-dragging-view.js";
import { ViewsSelectedCells } from "./views-selected-cells-mixin.js";

import type { Recycler } from "../framework/index.js";
import type { Inverse, AnyState } from "../state/index.js";
import { CellDraggingView } from "./cell-dragging-view.js";
import { InteractsWithFillChar } from "./interacts-with-fill-char-mixin.js";

class _CellEditingView extends AbstractEditorViewWithDragging {
    _ceState: CellPrims;

    constructor(prev: AbstractEditorView, state: CellPrims) {
        super(prev, state);
        this._ceState = state;

        if(prev instanceof _CellEditingView) {
            this._dragRect = prev._dragRect;
        }
    }

    applyInverse(inverse: Inverse<AnyState>): AnyState {
        inverse.apply<_CellEditingView, "_ceState">("_ceState", this);
        return this._ceState;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(ctx: PointerInCellEventContext) {
        if(this.editTextOnDoubleClick(ctx)) {
            return;
        }

        const rightClick = ctx.event.buttons === 2;

        if(rightClick) {
            // Right mouse button was pressed.
            ctx.event.preventDefault();
            ctx.event.stopPropagation();

            // If the right click occured in a cell which is already
            // selected, then only open the context menu.

            // However, if the right-click occured in a non-selected cell,
            // clear the selection and select the clicked cell.
            if(!this._ceState.hasCell(ctx.cell)) {
                this._ceState.clearSelection();
                this._ceState.addCell(ctx.cell);
            }

            const canInsertRow = this._ceState.canInsertRow();
            const canInsertCell = this._ceState.canInsertCell();
            const cellsPluralSuffix = this._ceState.pluralCells ? "s" : "";
            const rowsPluralSuffix = this._ceState.pluralRows ? "s" : "";

            const canMergeCells = this._ceState.canMergeSelectedCells();
            const clipping = this.doCopy();
            const origin = point.mkP2(ctx.event.clientX, ctx.event.clientY);

            const menu: cmenu.ContextMenuItem[] = [
                cmenu.button(`Delete row${rowsPluralSuffix}`, () => {
                    this.commitInverse(this._ceState.deleteRows());
                }),
                cmenu.divider(),
                cmenu.button("Clear cell contents", () => {
                    this.commitInverse(this._ceState.clearCellContents());
                }),
                cmenu.divider(),
                cmenu.button("Insert row above", () => {
                    this.commitInverse(this._ceState.insertRowAbove());
                }, !canInsertRow),
                cmenu.button("Insert row below", () => {
                    this.commitInverse(this._ceState.insertRowBelow());
                }, !canInsertRow),
                cmenu.divider(),
                cmenu.button(`Insert cell${cellsPluralSuffix} to the left`, () => {
                    this.commitInverse(this._ceState.insertCellLeft());
                }, !canInsertCell),
                cmenu.button(`Insert cell${cellsPluralSuffix} to the right`, () => {
                    this.commitInverse(this._ceState.insertCellRight());
                }, !canInsertCell),
                cmenu.divider(),
                cmenu.button("Merge cells", () => {
                    this.commitInverse(this._ceState.mergeSelectedCells());
                }, !canMergeCells)
            ];

            navigator.clipboard.readText().catch(() => "").then(clipboard => {
                this.notify(new cmenu.OpenContextMenu(this, {
                    origin,
                    menu: [
                        cmenu.button("Copy", () => {
                            if(clipping === undefined) return;
                            navigator.clipboard.writeText(clipping)
                                .catch(err => console.error('Failed to write clipboard:', err));
                        }, clipping === undefined),
                        cmenu.button("Paste", () => this.doPaste(clipboard), clipboard === ""),
                        cmenu.divider(),
                        ...menu,
                    ],
                }));
            });
            return;
        }

        const ds = ctx.intoDragState("Floor", (e) => {
            // On click,
            this.commitInverse(
                this._ceState.selectCellUnderPoint(
                    ctx.flooredGridPt,
                    !e.shiftKey
                )
            );
        });

        this.startDrag(ds);
    }

    /**
     * Record a rectangle in grid coordinates of the current drag. It
     * is `null` if there is no present drag.
     */
    private _dragRect: rect.Rect | null = null;

    onDrag(e: PointerEvent, ds: DragState) {
        const origin = ds.dragOriginGrid;
        const pt     = ds.posGrid();
        // Now, update _dragRect to a rectangle which encloses the
        // positions `origin` and `pt`.

        const newRect = rect.unions(
            rect.fromPoint(origin, 1, 1),
            rect.fromPoint(pt, 1, 1)
        );

        if(!this._dragRect || !rect.eqRect(newRect, this._dragRect)) {
            this._dragRect = newRect;

            this.commitInverse(
                this._ceState.selectCellsUnderRect(
                    this._dragRect,
                    e.shiftKey
                ),
            );
        }

        this.requestRedraw();
    }

    onDragEnd(e: PointerEvent, ds: DragState) {
        void e;
        void ds;
        this._dragRect = null;
        this.requestRedraw();
    }

    viewGridRootOverlay(r: Recycler) {
        if(this.dragState && this._dragRect && rect.area(this._dragRect) > 0) {
            r.elem({ tag: "div", key: "cell-selection-drag-preview" }, (cellSelectionDragPreviewElem) => {
                cellSelectionDragPreviewElem.className = "editor-cell-selection-drag-preview";
                cellSelectionDragPreviewElem.style.left   = `${this._dragRect.left}ch`;
                cellSelectionDragPreviewElem.style.top    = `${this._dragRect.top}em`;
                cellSelectionDragPreviewElem.style.width  = `${rect.width(this._dragRect)}ch`;
                cellSelectionDragPreviewElem.style.height = `${rect.height(this._dragRect)}em`;
            });
        }
    }

    onPointerDownInRowDragHandle(e: PointerEvent) {
        const ctx = new PointerEventContext(e, this);
        const rowDragView = new RowDraggingView(this, this._ceState, ctx.intoDragState("Round", () => {
            // If the drag ended up being just a
            // click, replace the drag view with
            // another cell-editing view.
            this.requestReplaceEditorView(new CellEditingView(this, this._ceState));
        }));
        this.requestReplaceEditorView(rowDragView);
    }

    onPointerDownInCellDragHandle(e: PointerEvent) {
        const ctx = new PointerEventContext(e, this);
        const cellDragView = new CellDraggingView(this, this._ceState, ctx.intoDragState("Round", () => {
            // If the drag ended up being just a
            // click, replace the drag view with
            // another cell-editing view.
            this.requestReplaceEditorView(new CellEditingView(this, this._ceState));
        }));
        this.requestReplaceEditorView(cellDragView);
    }

    doCopy(): string | undefined {
        return this._ceState.copySubgrid();
    }

    /**
     * Paste the `clipboard` contents over the selected cells. If they
     * are a compact grid, paste them structurally. Otherwise, paste
     * them as text at the upper-left corner of the selection.
     */
    doPaste(clipboard: string) {
        if(clipboard === "" || this._ceState.selection.length === 0) return;

        const subgrid = serialize.tryParseCompactGrid(clipboard);
        if(subgrid) {
            this.commitInverse(this._ceState.pasteSubgrid(subgrid));
            return;
        }

        const target = rect.unions(...this._ceState.selection.map(cell =>
            grid.rectOfCell(this._ceState.grid, cell)));
        this.editTextAt(rect.upperLeft(target), newView => newView.doPaste(clipboard));
    }

    get ceState() {
        return this._ceState;
    }

    get selectedCells(): grid.CellPath[] {
        return this._ceState.selection;
    }
}

export const CellEditingView =
    InteractsWithFillChar(ViewsSelectedCells(_CellEditingView));

AbstractEditorView.registerViewFactory(CellPrims, (prev, st) =>
    new CellEditingView(prev, st as CellPrims));
