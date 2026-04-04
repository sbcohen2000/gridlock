/**
 * Defines a mixin which knows how to re-draw this view in response to
 * state changes.
 */

import { Recycler } from "../framework/framework.js";
import { assert } from "../util.js";
import { AbstractView } from "./abstract-view.js";

type Constructor<T = {}> = new (...args: any[]) => T;

export interface StateView<S> {
    state: S;
    setState(st: S | ((oldSt: S) => S)): void;
}

interface StatefulBase<S> extends AbstractView {
    /**
     * How do we view the state as an HTML element? This class is
     * implemented by the mixee.
     */
    viewState(_recycler: Recycler, view: StateView<S>): void;

    /**
     * A key to associate with this class. If there will be multiple
     * instances of this class, the mixee should define `key` to
     * disambiguate between the stored states.
     */
    key?: string;
}

export function Stateful<S, T extends Constructor<StatefulBase<S>>>(Base: T, initialState: S) {
    return class Stateful extends Base {
        #setState(s: S | ((old: S) => S)) {
            const key = this.key ?? "_default_key";
            const old = (Store.stateRef(this.constructor, initialState, key) as { ref: S } | undefined);
            assert(old !== undefined);

            if(s instanceof Function) {
                s = s(old.ref);
            }

            if(old.ref !== s) {
                old.ref = s;
                this.requestRedraw();
            }
        }

        get #state() {
            const key = this.key ?? "_default_key";
            const st = Store.stateRef(this.constructor, initialState, key) as { ref: S } | undefined;
            assert(st !== undefined);
            return st.ref;
        }

        view(r: Recycler) {
            let view: StateView<S> = {
                state: this.#state,
                setState: (st: S | ((oldSt: S) => S)) => {
                    if(st instanceof Function) {
                        this.#setState(st(this.#state));
                    } else {
                        this.#setState(st);
                    }
                }
            };

            this.viewState(r, view);
        }
    }
}

/**
 * A singleton class which stores the state of all of the instances of
 * the `Stateful` mixin.
 */
const Store = new class {
    /**
     * The map where we store the state. It's a nested map, where the
     * first layer corresponds to instances of `Stateful`, and the second
     * map is indexed by a user-specified key.
     */
    constrToState: WeakMap<Function, Map<string, { ref: any }>> = new WeakMap();

    stateRef(constr: Function, initialState: any, key?: string): { ref: any } {
        key = key ?? "_default_key";
        let instances = this.constrToState.get(constr);

        if(instances === undefined) {
            // This is the first time we've seen a stateful view of
            // `constr` type.
            instances = new Map();
            instances.set(key, { ref: initialState });
            this.constrToState.set(constr, instances);
        }

        const st = instances.get(key);
        assert(st !== undefined);
        return st;
    }
}
