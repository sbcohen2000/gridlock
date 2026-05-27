/**
 * Defines an abstract which knows how to re-draw itself in response
 * to state changes.
 *
 * The application state is effectively one big JavaScript
 * object. Views can store their own state into keys of the
 * object. When a view modifies the state, all of the other views
 * which subscribe to the same key will be notified.
 */

import { assert } from "../util.js";
import { AbstractView, ViewDeletedViewEvent, ViewEvent } from "./abstract-view.js";

export type Store<S extends object, K extends keyof S> = {
    [P in K]: [any, Set<AbstractStatefulView<S, any>>]
}

export const TheStore: Store<any, any> = {};

export abstract class AbstractStatefulView<S extends object, K extends keyof S> extends AbstractView {
    readonly #key: K;
    readonly #store: Store<S, K>;

    constructor(parent: AbstractView | null, initialState: S[K], key: K, store: Store<S, K> = TheStore) {
        super(parent);
        this.#key = key;
        this.#store = store;

        let existing = this.#store[key];
        if(!existing) {
            existing = [initialState, new Set([this])];
        } else {
            existing[1].add(this);
        }

        this.#store[key] = existing;
    }

    /**
     * Get this view's store key.
     */
    get key(): K {
        return this.#key;
    }

    /**
     * Update the state of this view.
     *
     * The second optional argument allows the user to suppress the
     * redraw which this operation will normally cause.
     */
    setState(st: S[K] | ((oldSt: S[K]) => S[K]), redraw: boolean = true) {
        const record = this.#store[this.#key];
        assert(record !== undefined);
        const [oldValue, listeners] = record;

        let newValue: S[K];
        if(st instanceof Function) {
            newValue = st(oldValue);
        } else {
            newValue = st;
        }

        this.#store[this.#key][0] = newValue;

        for(const listener of listeners) {
            if(listener !== this) {
                listener.stateChanged();
            }
        }

        if(redraw) {
            this.requestRedraw();
        }
    }

    /**
     * Subclasses may implement this to recieve notification if a view
     * which was listening to the same state changed the state.
     *
     * It is not called on the view which initiated the state change.
     */
    stateChanged() {
        // Do nothing.
    }

    handleViewDeletedEvent(e: ViewEvent): boolean {
        if(e instanceof ViewDeletedViewEvent && e.deletedView === this) {
            // Remove ourselves from the listeners. This is
            // important to prevent memory leaks, since the
            // listeners map may be the only reference we retain
            // to the deleted view.
            this.#store[this.#key][1].delete(this);
            return true;
        }
        return false;
    }

    handleEvent(e: ViewEvent): boolean {
        return this.handleViewDeletedEvent(e) || super.handleEvent(e);
    }

    /**
     * Get the state of this component.
     */
    get state(): S[K] {
        return this.#store[this.#key][0]!
    }
}
