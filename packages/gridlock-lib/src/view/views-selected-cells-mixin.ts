/**
 * Defines a mixin which knows how to visualize selected cells, given
 * a method for finding the current selection.
 */

import * as grid from "../grid.js";
import { Recycler, CommittableRecycler } from "../framework/index.js";
import { CellPrims } from "../state/cell-prims.js";
import { AbstractEditorView } from "./abstract-editor-view.js";

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * The interface of the class which mixes-in `ViewsSelectedCells`.
 */
interface ViewsSelectedCellsBase {
    viewCellSelection(cell: grid.CellPath, recycler: Recycler): void;
    viewRowSelection(row: grid.RowPath, recycler: Recycler): void;
    onPointerDownInRowDragHandle(e: PointerEvent): void;
    ceState: CellPrims;
}

export function ViewsSelectedCells<T extends Constructor<ViewsSelectedCellsBase>>(Base: T) {
    return class ViewsSelectedCells extends Base {
        viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
            super.viewCellSelection(cell, recycler);

            // If the selection covers exactly one row, then the selection
            // will be drawn in `viewRowSelection` instead.
            if(this.ceState.selectionCoversRow()) return;

            if(this.ceState.selection.find(c => grid.eqCellPath(c, cell))) {
                recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                    haloElem.className = "editor-cell-halo";
                });
            }
        }

        viewRowSelection(row: grid.RowPath, r: Recycler) {
            super.viewRowSelection(row, r);

            const selectedRow = this.ceState.selectionCoversRow();
            if(!selectedRow) return;

            if(selectedRow.rowNo !== row.rowNo) return;

            r.elem({ tag: "div", key: "row-halo" }, (haloElem) => {
                haloElem.className = "editor-row-halo";

                new CommittableRecycler(haloElem)
                    .elem({ tag: "div", key: "row-halo-drag-handle" }, (dragHandleElem) => {
                    dragHandleElem.className = "editor-row-halo-drag-handle"
                    dragHandleElem.onpointerdown = (e) => this.onPointerDownInRowDragHandle(e);
                })
                .commit();
            });
        }
    }
}
