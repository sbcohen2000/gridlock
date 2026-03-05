/**
 * Return the last element of an iterator, or `undefined` if the
 * iterator was empty.
 *
 * @template A
 * @param {IterableIterator<A>} i
 * @returns {A | undefined}
 */
export function iterLast(i) {
    let last = undefined;
    for (const x of i) {
        last = x;
    }
    return last;
}

/**
 * Restrict the value of `x` to lie between `lo` and `hi`.
 *
 * @param {number} lo The lower bound.
 * @param {number} x  The input value.
 * @param {number} hi The upper bound.
 * @returns {number}
 */
export function clamp(lo, x, hi) {
    if(x < lo) {
        return lo;
    } else if(x > hi) {
        return hi;
    }
    return x;
}

/**
 * Assert that the condition holds.
 *
 * @param {boolean} cond
 * @param {string} [msg]
 * @returns {asserts cond}
 */
export function assert(cond, msg) {
    if(cond) return;
    throw new Error(`Assertion failure. ${msg ?? ""}`);
}

/**
 * Pad a string to the right with spaces so that, if it was shorter
 * than `len`, its width is equal to `len`.
 *
 * @param {string} str The string to pad
 * @param {number} len The desired length of the string
 * @returns {string}
 */
export function padRightToLength(str, len) {
    let out = str;
    for(let i = str.length; i < len; ++i) {
        out += " ";
    }
    return out;
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

/**
 * A factory function that returns an element for the render callback
 * to populate. The element may be recycled from a previous render
 * (when the tag and id match) or freshly created.
 *
 * @callback CreateElement
 * @param {string} tagName
 * @param {string} [id]
 * @returns {HTMLElement}
 */

/**
 * A builder-pattern reconciler that lets you declare both single
 * items and arrays of items in one flat chain, then commit them in a
 * single reconciliation pass against the parent's existing children.
 *
 * Usage:
 * ```
 * new Recycler(parent)
 *   .item(renderer)
 *   .items(array, renderer)
 *   .item(renderer)
 *   .commit()
 * ```
 */
export class Recycler {
    /** @type {HTMLElement} */
    #parent;

    /** @type {((create: CreateElement) => HTMLElement)[]} */
    #entries = [];

    /** @param {HTMLElement} parent */
    constructor(parent) {
        this.#parent = parent;
    }

    /**
     * Add a single render callback.
     *
     * @param {(create: CreateElement) => HTMLElement} render
     * @returns {this}
     */
    item(render) {
        this.#entries.push(render);
        return this;
    }

    /**
     * Add a render callback for each element in `arr`.
     *
     * @template T
     * @param {T[]} arr
     * @param {(item: T, create: CreateElement) => HTMLElement} render
     * @returns {this}
     */
    items(arr, render) {
        for(const item of arr) {
            this.#entries.push((create) => render(item, create));
        }
        return this;
    }

    /**
     * Run reconciliation: iterate the accumulated entries, recycle or
     * create elements, and remove unclaimed leftovers.
     */
    commit() {
        const parent = this.#parent;
        const entries = this.#entries;
        const oldChildren = [...parent.children];

        // Index old children that have an id, keyed by "TAG:id".
        /** @type {Map<string, HTMLElement>} */
        const idIndex = new Map();
        for(const child of oldChildren) {
            const el = /** @type {HTMLElement} */ (child);
            if(el.id) {
                idIndex.set(`${el.tagName}:${el.id}`, el);
            }
        }

        // Track which old children have been claimed (recycled or
        // displaced) so we know which leftovers to remove.
        /** @type {Set<HTMLElement>} */
        const claimed = new Set();

        for(let i = 0; i < entries.length; ++i) {
            const positionalChild = i < oldChildren.length
                  ? /** @type {HTMLElement} */ (oldChildren[i])
                  : null;
            let created = null;
            /** @type {HTMLElement | null} */
            let recycled = null;

            /** @type {CreateElement} */
            const create = (tagName, id) => {
                if(created !== null) {
                    throw new Error("create() called more than once in a single render callback");
                }
                const upperTag = tagName.toUpperCase();

                // Try to find a matching old child to recycle.
                if(id !== undefined) {
                    // When an id is provided, search by tag+id.
                    const key = `${upperTag}:${id}`;
                    const match = idIndex.get(key);
                    if(match && !claimed.has(match)) {
                        recycled = match;
                    }
                } else if(positionalChild
                          && !claimed.has(positionalChild)
                          && positionalChild.tagName === upperTag
                          && !positionalChild.id) {
                    // No id: fall back to positional match (only if the
                    // positional child also has no id).
                    recycled = positionalChild;
                }

                if(recycled) {
                    recycled.getAttributeNames().forEach(attr => recycled.removeAttribute(attr));
                    created = recycled;
                } else {
                    created = document.createElement(tagName);
                }
                if(id !== undefined) {
                    created.id = id;
                }
                return created;
            };

            const result = entries[i](create);
            if(result !== created) {
                throw new Error("render must return the element produced by create()");
            }

            // Claim the positional child regardless of whether it was
            // recycled, so it is not removed as a leftover.
            if(positionalChild) {
                claimed.add(positionalChild);
            }

            if(recycled) {
                claimed.add(recycled);
                RecycleStatistics.recycled++;
                if(recycled !== positionalChild) {
                    // The recycled element came from elsewhere; move it
                    // into position.
                    if(positionalChild) {
                        positionalChild.replaceWith(recycled);
                    } else {
                        parent.appendChild(recycled);
                    }
                }
            } else if(positionalChild) {
                positionalChild.replaceWith(result);
                RecycleStatistics.created++;
            } else {
                parent.appendChild(result);
                RecycleStatistics.created++;
            }
        }
        // Remove unclaimed old children.
        for(const child of oldChildren) {
            if(!claimed.has(/** @type {HTMLElement} */ (child))) {
                child.remove();
                RecycleStatistics.removed++;
            }
        }
    }
}

/**
 * Log the given string as a copy-pastable JavaScript expression.
 *
 * @param {string} str
 */
export function showMultilineString(str) {
    const linePfx = "      ";
    const lines   = str.split("\n");
    const escaped = lines.map(line => JSON.stringify(line + "\n"));
    const longest = escaped.reduce((maxL, line) => Math.max(maxL, line.length), 0);
    const padded  = escaped.map(line => padRightToLength(line, longest));
    return "const src =\n" + linePfx + padded.join(`+\n${linePfx}`) + ";"
}
