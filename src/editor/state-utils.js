/** @import { CommonState, Inverse } from "./common-state.d.ts"; */

/**
 * Wrap a primitive operation so that it snapshots the state before
 * the operation and returns an inverse that restores from the
 * snapshot.
 *
 * @template {CommonState} S
 * @template {(st: S, ...args: never[]) => void | Promise<void>} F
 * @param {F} fn The primitive operation to wrap.
 * @returns {(...args: Parameters<F>) => Promise<Inverse<S>>}
 */
export function withDefaultInverse(fn) {
    return async (/** @type {S} */ st, /** @type {never[]} */ ...args) => {
        const snapshot = st.clone();
        await fn(st, ...args);
        return async (/** @type {S} */ st) => {
            Object.assign(st, snapshot);
        };
    };
}
