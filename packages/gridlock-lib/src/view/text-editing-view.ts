import "./text-editing-view.css";
import "./views-selected-cells-mixin.css";
import * as grid from "../grid.js";
import {
    AbstractEditorView,
    PointerInCellEventContext,
    AbstractEditorViewState,
} from "./abstract-editor-view.js";
import { InteractsWithFillChar } from "./interacts-with-fill-char-mixin.js";
import { KeyViewEvent } from "./abstract-view.js";
import { SnapshotInverse, withSnapshotInverse } from "../state/inverse.js";
import { TextPrims, CellPrims } from "../state/index.js";

import type { AbstractView } from "./abstract-view.js";
import type { Recycler } from "../framework/index.js";
import type { ViewEvent } from "./abstract-view.js";
import type { AnyState } from "../state/index.js";
import { assert } from "chai";

class _TextEditingView extends AbstractEditorView {
    static fromAbstractViewState(parent: AbstractView | null, st: AbstractEditorViewState) {
        if(st.editorState instanceof TextPrims) {
            return new TextEditingView(parent, st.editorState);
        } else {
            return undefined;
        }
    }

    constructor(parent: AbstractView, editorState: TextPrims) {
        super(parent, editorState);
    }

    get teState(): TextPrims {
        let state = this.typedEditorState(TextPrims);
        assert(state !== null, `In TextEditingView, teState is ${state} (expected TextPrims)`);
        return state;
    }

    get canDisableCellGuides(): boolean {
        return true;
    }

    /**
     * Handle a pointer-down event inside a cell element.
     */
    onPointerDownInCell(ctx: PointerInCellEventContext) {
        if(ctx.event.buttons === 2) {
            // Right mouse button was pressed. Switch this state to a
            // cell-editing state and open the context menu.
            const st = CellPrims.editCells(this.editorState);
            st.addCell(ctx.cell);
            this.setEditorState(st);
            // TODO: Open context menu
            return;
        }

        const gridPt = ctx.flooredGridPt;
        if(ctx.event.shiftKey && !this.cellIsSelected(ctx.cell)) {
            // The gridPt is outside of the current cell, so
            // transition to a cell-editing state where the two
            // cells are selected.

            const [inv, st] = withSnapshotInverse(
                (s: TextPrims) => CellPrims.editCells(s),
                "edit cells"
            )(this.teState);
            this.stepEditorState(inv)
            st.addCell(this.teState.selection.cell);
            st.addCell(ctx.cell);
            this.setEditorState(st);
        } else {
            // Move the point to `gridPt`.
            this.stepEditorState(this.teState.putPointOnGlobalPosition(gridPt));
            this.requestFocus();
        }
    }

    /**
     * Test if the given `cell` is the selected cell.
     */
    cellIsSelected(cell: grid.CellPath) {
        return grid.eqCellPath(this.teState.selection.cell, cell);
    }

    /**
     * Draw the selection of a cell, if any, by adding items to the
     * recycler.
     */
    viewCellSelection(cell: grid.CellPath, recycler: Recycler) {
        super.viewCellSelection(cell, recycler);

        if(this.cellIsSelected(cell)) {
            recycler.elem({ tag: "div", key: "cursor", clearAttributes: true }, (cursorElem) => {
                cursorElem.className = "editor-cursor";
                cursorElem.style.position = "absolute";
                cursorElem.style.left = `${this.teState.selection.pt.x}ch`;
                cursorElem.style.top  = `${this.teState.selection.pt.y}em`;
                if(!this.hasFocus) {
                    cursorElem.classList.add("editor-cursor-unfocused");
                }
            });
            recycler.elem({ tag: "div", key: "cell-halo" }, (haloElem) => {
                haloElem.className = "editor-cell-halo";
            });
        }
    }

    displayClippedText(cell: grid.CellPath): boolean {
        return this.cellIsSelected(cell);
    }

    #handleKeyEvent(e: KeyboardEvent): boolean {
        if(e.key.length === 1) {
            if(e.ctrlKey) {
                switch(e.key) {
                    case "a": this.stepEditorState(this.teState.putPointAtStartOfGlobalLine()); break;
                    case "e": this.stepEditorState(this.teState.putPointAtEndOfGlobalLine()); break;
                    case "n": this.stepEditorState(this.teState.putPointOnNextGlobalLine()); break;
                    case "p": this.stepEditorState(this.teState.putPointOnPrevGlobalLine()); break;
                    case "b": this.stepEditorState(this.teState.putPointOnPrevGlobalCol()); break;
                    case "f": this.stepEditorState(this.teState.putPointOnNextGlobalCol()); break;
                    default: return false;
                }
            } else {
                this.stepEditorState(this.teState.insertString(e.key));
            }
        } else {
            switch(e.key) {
            case "Backspace": {
                if(this.teState.pointAtBeginningOfGlobalLine()) {
                    this.stepEditorState(this.teState.removeGlobalNewline());
                } else {
                    this.stepEditorState(this.teState.removeString(1));
                }
            } break;
            case "Enter": {
                this.stepEditorState(this.teState.insertGlobalNewline());
            } break;
                default: return false;
            }
        }
        return true;
    }

    handleEvent(e: ViewEvent): boolean {
        if (e instanceof KeyViewEvent) {
            e.e.preventDefault();
            e.e.stopPropagation();
            if(this.#handleKeyEvent(e.e)) {
                return true;
            }
        }

        return super.handleEvent(e);
    }

    /*************************************************************************/
    /** Copy & Paste                                                        **/

    doCopy(): string | undefined {
        return undefined;
    }

    doPaste(clipboard: string) {
        const snapshot = this.teState.clone();

        const lines = clipboard.split("\n");
        for(let i = 0; i < lines.length; ++i) {
            const isLast = i === lines.length - 1;

            this.teState.insertString(lines[i]);
            if(!isLast) {
                this.teState.insertLocalNewline();
            }
        }

        this.stepEditorState(new SnapshotInverse(snapshot, "paste text"));
    }

    get selectedCells(): grid.CellPath[] {
        return [this.teState.selection.cell];
    }
}

export const TextEditingView = InteractsWithFillChar(_TextEditingView);
