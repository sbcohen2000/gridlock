/** @import { CommonState, Inverse } from "./common-state.d.ts"; */

/**
 * Wrap a primitive operation so that it snapshots the state before
 * the operation and returns an inverse that restores from the
 * snapshot.
 *
 * @template {CommonState} S
 * @template {any[]} A
 * @param {(st: S, ...args: A) => void | Promise<void>} fn The primitive operation to wrap.
 * @param {string} [fwdDescription] A description of the forward
 *     operation.
 * @returns {(st: S, ...args: A) => Promise<Inverse<S>>}
 */
export function withDefaultInverse(fn, fwdDescription) {
    return async (/** @type {S} */ st, /** @type {A} */ ...args) => {
        const snapshot = st.clone();
        await fn(st, ...args);
        return { apply: async (/** @type {S} */ st) => {
            Object.assign(st, snapshot);
        }, fwdDescription };
    };
}

/**
 * The identity inverse.
 * @type {Inverse<CommonState>}
 */
export const id = {
    apply: async (/** @type {CommonState} */ _st) => {},
    compose(i) {
        // Identity composes with everything.
        return i;
    },
    fwdDescription: "no change"
};
