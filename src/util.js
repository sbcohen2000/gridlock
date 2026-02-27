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
