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
 * Reconcile the children of `parent` against a list of items.
 *
 * For each item, if there's an existing child at that index, call
 * `reconcile(item, existingChild)` to update it in place. If there's
 * no existing child, call `create(item)` to build one from scratch
 * and append it. After processing all items, remove any leftover
 * children.
 *
 * @template T
 * @param {HTMLElement} parent
 * @param {T[]} items
 * @param {(item: T, prev: HTMLElement) => HTMLElement} reconcile
 * @param {(item: T) => HTMLElement} create
 */
export function reconcileChildren(parent, items, reconcile, create) {
    const oldChildren = [...parent.children];
    for(let i = 0; i < items.length; ++i) {
        if(i < oldChildren.length) {
            const updated = reconcile(items[i], /** @type {HTMLElement} */ (oldChildren[i]));
            if(updated !== oldChildren[i]) {
                oldChildren[i].replaceWith(updated);
            }
        } else {
            parent.appendChild(create(items[i]));
        }
    }
    // Remove leftover old children
    for(let i = items.length; i < oldChildren.length; ++i) {
        oldChildren[i].remove();
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
