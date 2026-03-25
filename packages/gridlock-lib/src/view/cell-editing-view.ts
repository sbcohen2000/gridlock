import * as cmenu from "./context-menu.js";
import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";
import { AbstractEditorView, PointerEventContext, PointerInCellEventContext } from "./abstract-editor-view.js";
import { AbstractEditorViewWithDragging } from "./abstract-editor-view-with-dragging.js";
import { CellPrims } from "../state/index.js";
import { DragState } from "./drag-state.js";
import { RowDraggingView } from "./row-dragging-view.js";
import { ViewsSelectedCells } from "./views-selected-cells-mixin.js";

import type { Recycler } from "../framework/index.js";
import type { Inverse, AnyState } from "../state/index.js";

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

            const descr: cmenu.ContextMenuDescription = {
                origin: point.mkP2(ctx.event.clientX, ctx.event.clientY),
                menu: [
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
                ]
            };

            this.notify(new cmenu.OpenContextMenu(this, descr));
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
        const pt     = ds.dGrid();
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

    get ceState() {
        return this._ceState;
    }
}

export const CellEditingView = ViewsSelectedCells(_CellEditingView);

AbstractEditorView.registerViewFactory(CellPrims, (prev, st) =>
    new CellEditingView(prev, st as CellPrims));
