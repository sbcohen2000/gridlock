/**
 * Defines a mixin which knows how to re-draw this view in response to
 * state changes.
 *
 * The application state is effectively one big JavaScript object.
 *
 * Each mixee of `Stateful` can define a view function which
 * subscribes to a _path_ in this state object. The view will request a
 * re-draw when the value at the path changes.
 *
 * Each mixee can also cause the state at this path to be updated.
 */

import { Recycler } from "../framework/framework.js";
import { assert } from "../util.js";
import { AbstractView } from "./abstract-view.js";

/**
 * A path element into the application state.
 *
 * If it's a string, it represents the key of an object. If it's a
 * number, it represents an index into an array.
 */
type PathElem = string | number;

/**
 * A path is a sequence of path elements, where the topmost element
 * comes first.
 */
type Path = PathElem[];

export interface StateView<S> {
    state: S;
    setState(st: S | ((oldSt: S) => S)): void;
}

export abstract class AbstractStatefulView<S> extends AbstractView {
    #path: Path;
    #store: Store;

    constructor(parent: AbstractView | null, initialState: S, path: Path, store: Store = TheStore) {
        super(parent);
        this.#path = path;
        this.#store = store;
        this.#store.updateAtPath(path, (x) => x, initialState);
    }

    view(r: Recycler) {
        let view: StateView<S> = {
            state: this.#store.getAtPath(this.#path),
            setState: (st: S | ((oldSt: S) => S)) => {
                if(st instanceof Function) {
                    this.#store.updateAtPath(this.#path, st);
                } else {
                    this.#store.updateAtPath(this.#path, (_) => st);
                }
                this.requestRedraw();
            }
        };

        this.viewState(r, view);
    }

    /**
     * How do we view the state as an HTML element? This class is
     * implemented by the mixee.
     */
    abstract viewState(_recycler: Recycler, view: StateView<S>): void;
}

/**
 * A singleton class which stores the state of all of the instances of
 * the `Stateful` mixin.
 */
export class Store {
    #state: object;

    /**
     * Get the state value at the given `path`.
     */
    getAtPath(path: Path): any {
        let value = this.#state;
        for(const elem of path) {
            if(typeof elem === "number") {
                assert(Array.isArray(value));
            } else {
                assert(typeof value === "object");
            }
            value = value[elem];
        }
        return value;
    }

    /**
     * Update the state value at the given path.
     *
     * If `put` is provided, it will be put at the path, and path
     * elements will be created as necessary. Otherwise, an exception
     * is thrown if a nonexistent path element is accessed.
     */
    updateAtPath(path: Path, f: (v: any) => any, put?: any): any {
        if(path.length === 0) {
            // If we're trying to modify the root of the state object,
            // just do so directly.
            this.#state = f(this.#state ?? put);
            return;
        }

        // Initialize the state if it's empty.
        if(this.#state === undefined) {
            this.#state = freshValueForPathElem(path[0])
        }

        let parent = this.#state;
        for(let i = 0; i < path.length - 1; ++i) {
            const elem = path[i];
            if(Object.hasOwn(parent, elem)) {
                // The parent has a child with the next path segment.
                parent = parent[elem];
            } else {
                // The parent doesn't have a child with the next path
                // segment.  If we have a `put`, then we should create
                // a new child of the correct type.  Otheriwse, this
                // is an error.
                if(put === undefined) {
                    throw new Error("Path Error");
                } else {
                    parent[elem] = freshValueForPathElem(path[i + 1]);
                    parent = parent[elem];
                }
            }
        }

        // Perform our modification on this last path segment.
        const lastElem = path.at(-1);
        if(Object.hasOwn(parent, lastElem)) {
            parent[lastElem] = f(parent[lastElem]);
        } else if(put !== undefined) {
            parent[lastElem] = f(put);
        } else {
            throw new Error("Path Error");
        }
    }

    /**
     * Get the entire state of the store. This is currently exported
     * only for testing, no client should need to access this.
     */
    get state() {
        return this.#state;
    }
}

const TheStore = new Store();

function freshValueForPathElem(elem: PathElem): any[] | object {
    let v: any[] | object;
    if(typeof elem === "number") {
        v = [];
    } else {
        v = {};
    }
    return v;
}
