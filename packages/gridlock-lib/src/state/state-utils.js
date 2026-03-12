import * as grid from "../grid.js";
import * as point from "../point.js";

/** @import { Cell, CommonState, Inverse } from "./common-state.d.ts"; */

/**
 * An inverse which snapshots the edit state.
 *
 * @template {CommonState} S
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
 * @template {CommonState} S
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
 * @implements {Inverse<CommonState>}
 */
export class IdInverse {
    /**
     * @param {CommonState} st
     */
    apply(st) { return st; }

    /**
     * @param {Inverse<any>} i
     * @returns {Inverse<CommonState>}
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
 * grid, remember the text in the leaves underneath `f`, call `f`,
 * then restore the text to the leaves.
 *
 * @param {(grid: grid.Grid<Cell>) => grid.Grid<Cell>} f
 * @param {grid.Grid<Cell>} g
 * @returns {grid.Grid<Cell>}
 */
export function projectTextOntoLeaves(f, g) {
    // Construct a rectangle of characters to hold the text
    const text = Array.from({ length: g.dims.height }, () =>
        Array.from({ length: g.dims.width }, () => null));

    /**
     * @param {[grid.Leaf<Cell>, point.P2]} positionedLeaf
     */
    const projOntoText = (positionedLeaf) => {
        const [leaf, pos] = positionedLeaf;
        for(let i = 0; i < leaf.data.lines.length; ++i) {
            const line = leaf.data.lines[i];
            const row = i + pos.y;
            text[row].splice(pos.x, line.length, ...Array.from(line));
        }
    }

    // Project the leaf text onto `text`.
    grid.allLeavesWithPosition(g).forEach(projOntoText);
    const newG = f(g);

    /**
     * @param {[grid.Leaf<Cell>, point.P2]} positionedLeaf
     */
    const projOntoLeaves = (positionedLeaf) => {
        const [leaf, pos] = positionedLeaf;
        leaf.data.lines = [];
        for(let i = 0; i < leaf.dims.height; ++i) {
            const row = i + pos.y;
            const line = text[row].slice(pos.x, pos.x + leaf.dims.width)
                  .map(c => c ?? " ")
                  .join("")
                  .trimEnd();
            leaf.data.lines.push(line);
       }
   }

    // Project the text back onto the leaves.
    grid.allLeavesWithPosition(newG).forEach(projOntoLeaves);

    return newG;
}

