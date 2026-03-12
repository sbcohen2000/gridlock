/** @import { CommonState, Inverse } from "./common-state.d.ts"; */

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
