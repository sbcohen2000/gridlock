/**
 * A tiny UI framework which manages sharing nodes between two
 * renderings of DOM nodes. The main idea of this module is to use
 * actual HTML elements as much as possible rather than their proxies
 * (e.g. a virtual DOM). We want to use as much of the functionality
 * that the DOM already affords as possible, while contending with the
 * fact that we want to write `view` functions which pretend that
 * they're building up a view of HTML elements from scratch on every
 * render.
 *
 * @module framework
 */

import { diff } from "./framework/lcs.js";

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @typedef {Object} ElemSettingsObject
 * @property {T}      tag  The element's tag.
 * @property {string} [id] The element's id.
 */

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @typedef {T | ElemSettingsObject<T>} ElemSettings
 */

/**
 * The `Recycler` class accepts a `parent` HTML element and constructs
 * or re-uses elements in `parent` according to the description
 * specified by the builder methods.
 *
 * Usage:
 * ```
 * new Recycler(parent)
 *   .elem("div",  e => ...)
 *   .elem("span", e => ...)
 *   .elems(ts, "div", (t, e) => ...)
 *   .commit()
 * ```
 *
 * The `Recycler` re-uses elements by finding a diff between the
 * existing parent's children and the children specified by a
 * `Recycler`. If the `parent` has an element with a given tag, the
 * `Recycler` will try to match that child element with a new child
 * with the same tag.
 *
 * If a child has an `id`, then re-use will occur only for elements
 * which specify the same `id`. This allows the client to specify a
 * particular element order, or to ensure that an element, will _not_
 * be re-used, even if it has the same tag.
 */
export default class Recycler {
    /**
     * @template {keyof HTMLElementTagNameMap} T
     * @template A
     * @typedef {{
     *   item: A,
     *   render: (a: A, e: HTMLElementTagNameMap[T]) => void
     * } & ElemSettingsObject<T>} SpecObject
     */

    /**
     * The child element specifications.
     *
     * @type {SpecObject<any, any>[]}
     */
    #spec;

    /**
     * The parent HTML element.
     *
     * @type {HTMLElement}
     */
    #parent;

    /**
     * @param {HTMLElement} parent
     */
    constructor(parent) {
        this.#parent = parent;
        this.#spec = [];
    }

    /**
     * Construct a single element of the given tag type.
     *
     * @template {keyof HTMLElementTagNameMap} T
     * @param {ElemSettings<T>} settings
     * @param {(e: HTMLElementTagNameMap[T]) => void} render
     * @returns {Recycler}
     */
    elem(settings, render) {
        if(typeof settings === "string") {
            settings = { tag: settings };
        }

        this.#spec.push({ ...settings, render: (_item, e) => render(e), item: null })
        return this;
    }

    /**
     * Construct an element for each item in the given iterable, each
     * using a tag of the given type.
     *
     * @template {keyof HTMLElementTagNameMap} T
     * @template A
     * @param {Iterable<A>} items
     * @param {ElemSettings<T>} settings
     * @param {(a: A, e: HTMLElementTagNameMap[T]) => void} render
     * @returns {Recycler}
     */
    elems(items, settings, render) {
        if(typeof settings === "string") {
            settings = { tag: settings };
        }

        for(const item of items) {
            this.#spec.push({ ...settings, render, item });
        }
        return this;
    }

    /**
     * Commit the specified elements to our `parent`.
     */
    commit() {
        /**
         * Find a string which represents the tag and id of an
         * HTMLElement.
         *
         * @param {HTMLElement} e
         * @returns {string}
         */
        const identifierOfElement = (e) =>
              `${e.tagName.toUpperCase()}:${e.id ?? ""}`;

        /** @type {HTMLElement[]} */
        const oldChildren = [];
        for(const child of this.#parent.children) {
            oldChildren.push(/** @type {HTMLElement} */ (child));
        }

        const oldChildrenStr = oldChildren.map(identifierOfElement);
        const newChildrenStr = this.#spec.map(
            spec => `${spec.tag.toUpperCase()}:${spec.id ?? ""}`
        );
        const ops = diff(oldChildrenStr, newChildrenStr);

        // Apply the diff to oldChildren to build a mapped array where
        // kept positions hold the reusable old HTMLElement and inserted
        // positions hold null (meaning a new element must be created).
        /** @type {(HTMLElement | null)[]} */
        const mapped = [...oldChildren];
        for(let i = ops.length - 1; i >= 0; --i) {
            const op = ops[i];
            if(op.op === "delete") {
                mapped.splice(op.index, 1);
            } else {
                mapped.splice(op.index, 0, null);
            }
        }

        // Build the new children list, reusing old elements where the
        // diff indicates a match.
        const doc = this.#parent.ownerDocument;
        /** @type {Set<HTMLElement>} */
        const reused = new Set();
        /** @type {HTMLElement[]} */
        const newChildren = [];

        for(let i = 0; i < this.#spec.length; i++) {
            const spec = this.#spec[i];
            let elem;
            if(mapped[i] !== null) {
                elem = mapped[i];
                reused.add(elem);
            } else {
                elem = /** @type {HTMLElement} */ (doc.createElement(spec.tag));
                if(spec.id) elem.id = spec.id;
            }
            spec.render(spec.item, elem);
            newChildren.push(elem);
        }

        // Mutate `parent` according to `ops`. We're careful here to
        // only insert and remove individual children so that shared
        // elements are never removed from the tree (which can
        // interfere with, e.g. pointer events).
        let refNode = this.#parent.firstElementChild;
        for(const elem of newChildren) {
            if(elem === refNode) {
                refNode = refNode.nextElementSibling;
            } else {
                this.#parent.insertBefore(elem, refNode);
            }
        }

        // Remove old children that weren't reused.
        for(const old of oldChildren) {
            if(!reused.has(old)) {
                old.remove();
            }
        }
    }
}
