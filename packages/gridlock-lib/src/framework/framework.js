/**
 * A tiny UI framework which makes it easier to share DOM nodes
 * between two renderings of a view. The reason we do this is not so
 * much for performance reasons as it is for ensuring that when we
 * attach handlers to nodes in a `view` function, they aren't removed
 * with the old node when we draw a new view.
 *
 * The main pain-point in writing elm-style view functions is that if
 * we write them naively, new DOM nodes will be constructed on each
 * `view`, loosing these precious references, some of which may need
 * to be retained between views (e.g. pointer captures).
 *
 * This module gives us a class, called `CommittableRecycler`, which
 * acts like a factory for DOM nodes, but transparently constructs a
 * new node only when it couldn't find a node in the _old_ DOM which
 * it can re-use for the current render. The `CommittableRecycler` is
 * shallow; it only constructs nodes corresponding to the _children_
 * of the parent node it's given.
 *
 * It's also designed, somewhat purposely, to not be very clever. This
 * is an attempt to make it predictable. The criteria for sharing
 * nodes is simple:
 *   1. If two nodes have the same tag, they
 *      are candidates to be shared, with a single exception:
 *   2. If a node has a `key` property, it will only be shared
 *      with another node with the same `key`.
 *
 * The second rule is effectively the sole means by which we can
 * control recycling in a fine-grained way.
 *
 * If two nodes aren't semantically equal (i.e. they can't be
 * interchanged, because, for example, one acts as a button and one
 * acts as a label), they must have either different tags or different
 * `key`s. Otherwise, there's no guarantee that the
 * `CommittableRecycler` won't choose the first node to play the role
 * of a button in one view and a label in the next.
 *
 * If this doesn't seem like a big deal, consider that once the
 * `CommittableRecycler` decides to recycle an element, it doesn't
 * touch it at all. (It doesn't, for example, remove the element's
 * children). So, if we don't differentiate between the label and the
 * button, our label could end up with a button's children.
 *
 * @module framework
 */

import { diff } from "./lcs.js";

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @typedef {Object} ElemSettingsObject
 * @property {T}       tag  The element's tag.
 * @property {string}  [key] The element's key.
 * @property {boolean} [clearAttributes] If `true`, then the
 *     attributes of a recycled node will be cleared before being
 *     returned to the client. The default is `false`.
 * @property {boolean} [clearChildren] If `true`, then the children of
 *     a recycled node will be cleared before being returned to the
 *     client. The default is `false`. Be careful; setting this
 *     property to `true` defeats the purpose of the `Recycler`
 *     (albeit locally) since the subtree rooted at a child of this
 *     node will always have to be constructed from scratch.
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
 * new CommittableRecycler(parent)
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
 * If a child has a `key`, then re-use will occur only for elements
 * which specify the same `key`. This allows the client to specify a
 * particular element order, or to ensure that an element, will _not_
 * be re-used, even if it has the same tag.
 */
/**
 * @typedef {CommittableRecycler | UncommittableRecycler} Recycler
 */
export class CommittableRecycler {
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
     * Check if there exists a spec item with the given tag and key.
     *
     * @param {string} tag
     * @param {string} [key]
     * @returns {boolean}
     */
    #hasSpecWithSameTagAndKey(tag, key) {
        return this.#spec.find(obj => {
            return obj.tag === tag && obj.key === key;
        }) !== undefined;
    }

    /**
     * Print a warning if a specification has already been issued with
     * the same tag and key.
     *
     * @param {string} tag
     * @param {string} [key]
     */
    #warnAboutSimilarTagsOrKeys(tag, key) {
        if(this.#hasSpecWithSameTagAndKey(tag, key)) {
            console.warn(`Two spec items with the same tag (${tag}${key ? `:${key}` : ""}).`);
        }
    }

    /**
     * Construct a single element of the given tag type.
     *
     * @template {keyof HTMLElementTagNameMap} T
     * @param {ElemSettings<T>} settings
     * @param {(e: HTMLElementTagNameMap[T]) => void} render
     * @returns {CommittableRecycler}
     */
    elem(settings, render) {
        if(typeof settings === "string") {
            settings = { tag: settings };
        }

        this.#warnAboutSimilarTagsOrKeys(settings.tag, settings.key);
        this.#spec.push({ ...settings, render: (_item, e) => render(e), item: null })
        return this;
    }

    /**
     * Pass the `Recycler` to a view function which adds additional
     * elements.
     *
     * @param {(r: UncommittableRecycler) => void} f
     * @returns {CommittableRecycler}
     */
    view(f) {
        f(new UncommittableRecycler(this));
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
     * @returns {CommittableRecycler}
     */
    elems(items, settings, render) {
        if(typeof settings === "string") {
            settings = { tag: settings };
        }

        this.#warnAboutSimilarTagsOrKeys(settings.tag, settings.key);
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
         * Find a string which represents the tag and key of an
         * HTMLElement.
         *
         * @param {HTMLElement} e
         * @returns {string}
         */
        const identifierOfElement = (e) =>
              `${e.tagName.toUpperCase()}:${e.getAttribute("data-key") ?? ""}`;

        /** @type {HTMLElement[]} */
        const oldChildren = [];
        for(const child of this.#parent.children) {
            oldChildren.push(/** @type {HTMLElement} */ (child));
        }

        const oldChildrenStr = oldChildren.map(identifierOfElement);
        const newChildrenStr = this.#spec.map(
            spec => `${spec.tag.toUpperCase()}:${spec.key ?? ""}`
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
                if(spec.clearAttributes) {
                    elem.getAttributeNames().forEach(attrName => {
                        if(attrName !== "data-key") {
                            elem.removeAttribute(attrName);
                        }
                    });
                }
                if(spec.clearChildren) {
                    elem.replaceChildren();
                }

                ++RecycleStatistics.recycled;
            } else {
                elem = /** @type {HTMLElement} */ (doc.createElement(spec.tag));
                if(spec.key) elem.setAttribute("data-key", spec.key);

                ++RecycleStatistics.created;
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

                ++RecycleStatistics.removed;
            }
        }
    }
}

/**
 * A `CommittableRecycler` without a `commit` method.
 */
export class UncommittableRecycler {
    /** @type {CommittableRecycler} */
    #recycler;

    /** @param {CommittableRecycler} recycler */
    constructor(recycler) {
        this.#recycler = recycler;
    }

    /**
     * Construct a single element of the given tag type.
     *
     * @template {keyof HTMLElementTagNameMap} T
     * @param {ElemSettings<T>} settings
     * @param {(e: HTMLElementTagNameMap[T]) => void} render
     * @returns {UncommittableRecycler}
     */
    elem(settings, render) {
        this.#recycler.elem(settings, render);
        return this;
    }

    /**
     * @template {keyof HTMLElementTagNameMap} T
     * @template A
     * @param {Iterable<A>} items
     * @param {ElemSettings<T>} settings
     * @param {(a: A, e: HTMLElementTagNameMap[T]) => void} render
     * @returns {UncommittableRecycler}
     */
    elems(items, settings, render) {
        this.#recycler.elems(items, settings, render);
        return this;
    }

    /**
     * Pass the recycler to a view function which adds additional
     * elements.
     *
     * @param {(r: UncommittableRecycler) => void} f
     * @returns {UncommittableRecycler}
     */
    view(f) {
        this.#recycler.view(f);
        return this;
    }
}


/**
 * Global singleton tracking how many DOM elements are recycled vs
 * created during a draw cycle.
 */
export const RecycleStatistics = new class {
    /** @type {number} Number of elements reused from a previous render. */
    recycled = 0;
    /** @type {number} Number of elements freshly created. */
    created = 0;
    /** @type {number} Number of leftover elements removed. */
    removed = 0;

    /** Reset all counters. Call this before each draw. */
    reset() {
        this.recycled = 0;
        this.created  = 0;
        this.removed  = 0;
    }

    /**
     * Total elements processed (recycled + created + removed).
     * @returns {number}
     */
    get total() {
        return this.recycled + this.created + this.removed;
    }

    /**
     * Percentage of processed elements that were recycled,
     * or 0 if no elements were processed.
     * @returns {number}
     */
    get recycledPct() {
        return this.total === 0 ? 0 : this.recycled / this.total;
    }

    /**
     * Return a summary string suitable for logging.
     * @returns {string}
     */
    report() {
        return `recycled: ${this.recycled}, created: ${this.created}, removed: ${this.removed}, ` +
            `total: ${this.total}, reuse: ${(this.recycledPct * 100).toFixed(1)}%`;
    }
};
