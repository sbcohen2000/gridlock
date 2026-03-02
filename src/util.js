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
 * For each item, call `render(item, prev)` where `prev` is the
 * existing child at that index (if any). When `prev` is provided,
 * `render` should update it in place; when absent, it should create
 * a fresh element. After processing all items, remove any leftover
 * children.
 *
 * @template T
 * @param {HTMLElement} parent
 * @param {T[]} items
 * @param {(item: T, prev?: HTMLElement) => HTMLElement} render
 */
export function recycleChildren(parent, items, render) {
    const oldChildren = [...parent.children];
    for(let i = 0; i < items.length; ++i) {
        if(i < oldChildren.length) {
            const oldChild = /** @type {HTMLElement} */ (oldChildren[i]);
            // Remove attributes from `oldChild` in case `oldChild` is
            // used for a different purpose.
            oldChild.getAttributeNames().forEach(attr => oldChild.removeAttribute(attr));

            const updated = render(items[i], oldChild);
            if(updated !== oldChild) {
                // Updated doesn't use the same node as `oldChild`.
                oldChildren[i].replaceWith(updated);
            }
        } else {
            parent.appendChild(render(items[i]));
        }
    }
    // Remove leftover old children
    for(let i = items.length; i < oldChildren.length; ++i) {
        oldChildren[i].remove();
    }
}

/**
 * Like `recycleChildren`, but for a fixed set of children. Each
 * render callback produces one child; the callback receives the
 * existing child element (if any) as `prev`.
 *
 * @param {HTMLElement} parent
 * @param  {...(prev?: HTMLElement) => HTMLElement} renders
 */
export function recycleConstChildren(parent, ...renders) {
    const indices = renders.map((_, i) => i);
    recycleChildren(parent, indices, (i, prev) => renders[i](prev));
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
