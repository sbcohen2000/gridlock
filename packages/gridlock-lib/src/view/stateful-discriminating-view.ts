/**
 * This module defines a view, called a `StatefulDiscriminatingView`,
 * which discriminates which view to render based on the kind of state
 * which inhabits it.
 *
 * A `StatefulDiscriminatingView` is constructed from a
 * `DiscriminatingViewBuilder`, which allows the client to specify a
 * number of functions which are used to construct the view based on
 * the state.
 */

import { AbstractStatefulView, Store, TheStore } from "./abstract-stateful-view.js";
import { AbstractView } from "./abstract-view.js";
import { Recycler } from "../framework/framework.js";

type CandidateView<S extends object, K extends keyof S> = (parent: AbstractView, initialState: S[K], key: K) => AbstractStatefulView<S, K> | undefined;

interface StatefulDisciminatingViewDescription<S extends object, K extends keyof S> {
    parent: AbstractView | null;
    initialState: S[K];
    key: K;
    store: Store<S, K>;
    candidates: CandidateView<S, K>[];
}

export class DiscriminatingViewBuilder<S extends object, K extends keyof S> {
    #descr: StatefulDisciminatingViewDescription<S, K>;

    constructor(parent: AbstractView | null, initialState: S[K], key: K, store: Store<S, K> = TheStore) {
        this.#descr = {
            parent,
            initialState,
            key,
            store,
            candidates: []
        };
    }

    /**
     * Register a view constructor with the view.
     *
     * The first `or` called on this object which returns a view,
     * rather than `undefined`, will be rendered.
     */
    or(
        f: (parent: AbstractView, initialState: S[K], key: K) => AbstractStatefulView<S, K> | undefined
    ): DiscriminatingViewBuilder<S, K> {
        this.#descr.candidates.push(f);
        return this;
    }

    build(): StatefulDiscriminatingView<S, K> {
        return new StatefulDiscriminatingView(this.#descr);
    }
}

class StatefulDiscriminatingView<S extends object, K extends keyof S> extends AbstractStatefulView<S, K> {
    readonly #candidates: CandidateView<S, K>[];
    #currentView: AbstractStatefulView<S, K> | null = null;

    /**
     * Given a state, iterate through our view candidates, finding a
     * new view which can render itself with the state.
     */
    #updateCurrentViewForState(st: S[K]) {
        const newView = this.#candidates.flatMap(f => f(this, st, this.key) ?? []);
        if(newView.length > 0) {
            const [theNewView] = newView;
            this.#currentView = theNewView;
        }
    }

    constructor(descr: StatefulDisciminatingViewDescription<S, K>) {
        super(descr.parent, descr.initialState, descr.key, descr.store);
        this.#candidates = descr.candidates;
        this.#updateCurrentViewForState(descr.initialState);
    }

    setState(st: S[K] | ((oldSt: S[K]) => S[K]), redraw: boolean = true) {
        if(st instanceof Function) {
            st = st(this.state);
        }

        this.#updateCurrentViewForState(st);

        // Then, update the state in the store.
        super.setState(st, redraw);
    }

    stateChanged() {
        this.#updateCurrentViewForState(this.state);
    }

    view(r: Recycler) {
        if(this.#currentView !== null) {
            this.#currentView.view(r);
        }
    }
}
