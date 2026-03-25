/**
 * Defines a mixin which knows how to find the current fill char of
 * the selection and also update the selection with a new fill char.
 */

import * as grid from "../grid.js";
import { Recycler } from "../framework/index.js";
import { AnyState } from "../state/index.js";
import { Inverse, SnapshotInverse } from "../state/inverse.js";

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * The interface of the class which mixes-in `InteractsWithFillChar`.
 */
interface InteractsWithFillCharBase {
    selectedCells: grid.CellPath[];
    state: AnyState;
}

export function InteractsWithFillChar<T extends Constructor<InteractsWithFillCharBase>>(Base: T) {
    return class InteractsWithFillChar extends Base {
        /**
         * Set the fill char of the selected cells to the given
         * `char`.
         */
        setFillChar(char: string): Inverse<InteractsWithFillChar> {
            char = char[0] ?? " ";
            const snapshot = this.state.clone();

            this.selectedCells.forEach(cell => {
                const theCell = grid.lookupCell(this.state.grid, cell);
                if(char === ' ') {
                    // Then, unset the `fillChar` on all of the cells.
                    delete theCell.data.fillChar;
                } else {
                    theCell.data.fillChar = char;
                }
            });

            return new SnapshotInverse(snapshot, "set fill character");
        }

        /**
         * Get a summary of the fill char for the given selection.
         *
         * If the fill char is not the same for all of the elements in
         * the selection, this is indicated the view.
         */
        viewFillChar(r: Recycler): void {
            const fillChars = new Set(this.selectedCells.map(cell => {
                const theCell = grid.lookupCell(this.state.grid, cell);
                return theCell.data.fillChar ?? " ";
            }));
            r.elem("span", fillCharElem => {
                if(fillChars.size === 1) {
                    const theFillChar: string = fillChars.values().next().value;
                    fillCharElem.innerText = theFillChar;
                    fillCharElem.className = "editor-fill-char-preview";

                    if(theFillChar === " ") {
                        fillCharElem.classList.add("editor-space-fragment");
                    }
                } else {
                    fillCharElem.innerText = "multiple";
                }
            });
        }
    }
}

export function interactsWithFillChar<T extends Constructor<InteractsWithFillCharBase>>(
    obj: any
): obj is InstanceType<ReturnType<typeof InteractsWithFillChar<T>>> {
    return obj && typeof obj.viewFillChar === "function";
}
