import * as grid from "../grid.js";
import * as point from "../point.js";
import * as rect from "../rect.js";

/** @import { Cell, Inverse } from "./state-iface.js"; */

/**
 * An inverse which snapshots the edit state.
 *
 * @template {{ grid: import("../grid.js").Grid<Cell>, clone(): any }} S
 * @implements {Inverse<S>}
 */
export class SnapshotInverse {
    /** @type {S} */
    #snapshot

    /** @type {string | undefined} */
    #fwdDescription

    /**
     * @param {S} snapshot The snapshot of the state before the operation.
     * @param {string} [fwdDescription] A description of the forward operation.
     */
    constructor(snapshot, fwdDescription) {
        this.#snapshot = snapshot;
        this.#fwdDescription = fwdDescription;
    }

    /**
     * @param {S} st
     */
    apply(st) {
        Object.assign(st, this.#snapshot);
        return st;
    }

    get fwdDescription() {
        return this.#fwdDescription;
    }
}

/**
 * Wrap a primitive operation so that it snapshots the state before
 * the operation and returns an inverse that restores from the
 * snapshot.
 *
 * @template {{ grid: import("../grid.js").Grid<Cell>, clone(): any }} S
 * @template {any[]} A
 * @param {(st: S, ...args: A) => void} fn The primitive operation to wrap.
 * @param {string} [fwdDescription] A description of the forward
 *     operation.
 * @returns {(st: S, ...args: A) => Inverse<S>}
 */
export function withDefaultInverse(fn, fwdDescription) {
    return (/** @type {S} */ st, /** @type {A} */ ...args) => {
        const snapshot = st.clone();
        fn(st, ...args);
        return new SnapshotInverse(snapshot, fwdDescription);
    };
}

/**
 * The identity inverse.
 *
 * @implements {Inverse<any>}
 */
export class IdInverse {
    /**
     * @param {any} st
     */
    apply(st) { return st; }

    /**
     * @param {Inverse<any>} i
     * @returns {Inverse<any>}
     */
    compose(i) {
        // Identity composes with everything.
        return i;
    }

    get fwdDescription() {
        return "no change";
    }
}

export const id = /** @type {Inverse<any>} */ (new IdInverse());

/**
 * Given a function `f` which knows how to mutate the structure of the
 * grid, remember the text in the cells underneath `f`, call `f`,
 * then restore the text to the cells.
 *
 * @param {(grid: grid.Grid<Cell>) => grid.Grid<Cell>} f
 * @param {grid.Grid<Cell>} g
 * @returns {grid.Grid<Cell>}
 */
export function projectTextOntoLeaves(f, g) {
    // Construct a rectangle of characters to hold the text
    const outerRect = grid.rectOfGrid(g);

    const text = Array.from({ length: rect.height(outerRect) }, () =>
        Array.from({ length: rect.width(outerRect) }, () => null));

    /**
     * @param {[grid.CellPath, rect.Rect]} positionedCell
     */
    const projOntoText = (positionedCell) => {
        const [cell, cellRect] = positionedCell;
        const theCell = grid.lookupCell(g, cell);
        for(let i = 0; i < theCell.data.lines.length; ++i) {
            const line = theCell.data.lines[i];
            const row = i + cellRect.top;
            text[row].splice(cellRect.left, line.length, ...Array.from(line));
        }
    }

    // Project the leaf text onto `text`.
    grid.allPositionedCells(g).forEach(projOntoText);
    const newG = f(g);

    /**
     * @param {[grid.CellPath, rect.Rect]} positionedCell
     */
    const projOntoLeaves = (positionedCell) => {
        const [cell, cellRect] = positionedCell;
        const theCell = grid.lookupCell(newG, cell);
        theCell.data.lines = [];
        for(let i = 0; i < rect.height(cellRect); ++i) {
            const row = i + cellRect.top;
            const line = text[row]
                  .slice(cellRect.left, cellRect.left + rect.width(cellRect))
                  .map(c => c ?? " ")
                  .join("")
                  .trimEnd();
            theCell.data.lines.push(line);
       }
   }

    // Project the text back onto the leaves.
    grid.allPositionedCells(newG).forEach(projOntoLeaves);

    return newG;
}

