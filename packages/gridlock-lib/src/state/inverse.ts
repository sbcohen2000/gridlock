import { AnyState } from "./state-iface.js";

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
     * undoing the forward operation.
     */
    apply(st: AnyState): S;
}

/**
 * An inverse which snapshots the edit state.
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

    apply(_st: AnyState): S {
        return this.#snapshot;
    }

    get fwdDescription() {
        return this.#fwdDescription;
    }
}

/**
 * Like a `SnapshotInverse`, but automatically composes with a
 * `TimedSnapshotInverse` which came before it if the
 * `TimedSnapshotInverse` has the same `fwdDescription`, and the
 * inverse was created within a certain time of this inverse.
 */
export class TimedSnapshotInverse<S extends AnyState> extends SnapshotInverse<S> {
    #limit: number;
    #timeCreated: number;

    /**
     * @param snapshot The snapshot of the state before the operation.
     * @param limit The time in milliseconds that must elapse before
     *     this snapshot _wont_ compose with itself.
     * @param fwdDescription A description of the forward operation.
     */
    constructor(snapshot: S, limit: number, fwdDescription: string) {
        super(snapshot, fwdDescription);
        this.#limit = limit;
        this.#timeCreated = new Date().getTime();
    }

    compose(i: Inverse<any>): Inverse<S> | null {
        if(i instanceof TimedSnapshotInverse
            && i.fwdDescription === this.fwdDescription
            && Math.max(0, this.#timeCreated - i.#timeCreated) < this.#limit) {
            i.#timeCreated = this.#timeCreated;
            return i;
        }

        return null;
    }
}

/**
 * Wrap a primitive operation so that it snapshots the state before
 * the operation and returns an inverse that restores from the
 * snapshot.
 *
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
    apply(st: any): any {
        return st;
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
