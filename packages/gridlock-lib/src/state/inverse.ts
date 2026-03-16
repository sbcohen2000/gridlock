import { AnyState } from "./state-iface.js";

export type KeysWithType<T extends object, V> = {[K in keyof T]: T[K] extends V ? K : never;}[keyof T];

/**
 * The inverse operation.
 */
export interface Inverse<S> {
    /**
     * A description of the forward operation to which this is an
     * inverse operation.
     */
    fwdDescription?: string;

    /**
     * A function which tries to compose this inverse with another
     * inverse. It is applied to an inverse that occured _before_ this
     * inverse. It returns a new `Inverse` if the inverses could be
     * composed, or `null` if they couldn't.
     */
    compose?(i: Inverse<any>): Inverse<S> | null;

    /**
     * A function which, when applied to the state, will mutate it
     * undoing the forward operation. It is passed an approximation of
     * a double-pointer; the caller must provide this function with
     * the _key_ used to store the state, so that it can be completely
     * replaced with a value of a different class, if necessary.
     */
    apply<A extends object, K extends KeysWithType<A, AnyState>>(key: K, stHolder: A): void;
}

/**
 * An inverse which snapshots the edit state.
 *
 * @template {{ grid: import("../grid.js").Grid<Cell>, clone(): any }} S
 */
export class SnapshotInverse<S extends AnyState> implements Inverse<S> {
    #snapshot: S
    #fwdDescription: string | undefined

    /**
     * @param snapshot The snapshot of the state before the operation.
     * @param [fwdDescription] A description of the forward operation.
     */
    constructor(snapshot: S, fwdDescription?: string) {
        this.#snapshot = snapshot;
        this.#fwdDescription = fwdDescription;
    }

    apply<A extends object, K extends KeysWithType<A, AnyState>>(key: K, stHolder: A): void {
        (stHolder[key] as AnyState) = this.#snapshot;
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
 * @template S
 * @template A
 * @param fn The primitive operation to wrap.
 * @param [fwdDescription] A description of the forward
 *     operation.
 */
export function withSnapshotInverse<S extends AnyState, A extends any[], R>(
    fn: (st: S, ...args: A) => R,
    fwdDescription?: string
): (st: S, ...args: A) => [Inverse<S>, R] {
    return (st: S, ...args: A) => {
        const snapshot = st.clone();
        const r = fn(st, ...args);
        return [new SnapshotInverse(snapshot, fwdDescription), r];
    }
}

/**
 * The identity inverse.
 */
export class IdInverse implements Inverse<any> {
    apply<A extends object, K extends KeysWithType<A, AnyState>>(_key: K, _stHolder: A): void {
        // Nothing to be done.
    }

    compose(i: Inverse<any>): Inverse<any> {
        // Identity composes with everything.
        return i;
    }

    get fwdDescription() {
        return "no change";
    }
}

export const id = /** @type {Inverse<any>} */ (new IdInverse());
