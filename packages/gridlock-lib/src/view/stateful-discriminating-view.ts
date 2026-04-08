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

import { AbstractStatefulView, Path, Store, TheStore } from "./abstract-stateful-view.js";
import { AbstractView } from "./abstract-view.js";
import { Recycler } from "../framework/framework.js";

type CandidateView<S> = (parent: AbstractView, initialState: S, path: Path) => AbstractStatefulView<S> | undefined;

interface StatefulDisciminatingViewDescription<S> {
    parent: AbstractView | null;
    initialState: S;
    path: Path;
    store: Store;
    candidates: CandidateView<S>[];
}

export class DiscriminatingViewBuilder<S> {
    #descr: StatefulDisciminatingViewDescription<S>;

    constructor(parent: AbstractView | null, initialState: S, path: Path, store: Store = TheStore) {
        this.#descr = {
            parent,
            initialState,
            path,
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
        f: (parent: AbstractView, initialState: S, path: Path) => AbstractStatefulView<S> | undefined
    ): DiscriminatingViewBuilder<S> {
        this.#descr.candidates.push(f);
        return this;
    }

    build(): StatefulDiscriminatingView<S> {
        return new StatefulDiscriminatingView(this.#descr);
    }
}

class StatefulDiscriminatingView<S> extends AbstractStatefulView<S> {
    readonly #candidates: CandidateView<S>[];
    #currentView: AbstractStatefulView<S> | null = null;

    /**
     * Given a state, iterate through our view candidates, finding a
     * new view which can render itself with the state.
     */
    #updateCurrentViewForState(st: S) {
        const newView = this.#candidates.flatMap(f => f(this, st, this.path) ?? []);
        if(newView.length > 0) {
            const [theNewView] = newView;
            this.#currentView = theNewView;
        }
    }

    constructor(descr: StatefulDisciminatingViewDescription<S>) {
        super(descr.parent, descr.initialState, descr.path, descr.store);
        this.#candidates = descr.candidates;
        this.#updateCurrentViewForState(descr.initialState);
    }

    setState(st: S | ((oldSt: S) => S), redraw: boolean = true) {
        if(st instanceof Function) {
            st = st(this.state);
        }

        this.#updateCurrentViewForState(st);

        // Then, update the state in the store.
        super.setState(st, redraw);
    }

    view(r: Recycler) {
        if(this.#currentView !== null) {
            this.#currentView.view(r);
        }
    }
}
