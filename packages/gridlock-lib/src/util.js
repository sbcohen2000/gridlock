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
 * Produce a string of spaces with length `n`.
 *
 * @param {number} n The number of spaces.
 * @returns {string}
 */
export function whitespace(n) {
    let out = "";
    for(; n > 0; --n) {
        out += " ";
    }
    return out;
}

/**
 * Pad a string to the right with spaces so that it's length is equal
 * to `len`. If the input string's length is greater than `len`, this
 * function returns the input unchanged.
 *
 * @param {string} str The string to pad
 * @param {number} len The desired length of the string
 * @returns {string}
 */
export function padRightToLength(str, len) {
    return str + whitespace(Math.max(0, len - str.length));
}

/**
 * @see padRightToLength
 *
 * @param {string} str The string to pad
 * @param {number} len The desired length of the string
 * @returns {string}
 */
export function padLeftToLength(str, len) {
    return whitespace(Math.max(0, len - str.length)) + str;
}

/**
 * Log the given string as a copy-pastable JavaScript expression.
 *
 * @param {string} str
 * @param {boolean} [pad] Should the line delimiters be padded to the
 *     same column? (Default is false).
 */
export function showMultilineString(str, pad) {
    const pfx = "\"example_name\":\n("
    const linePfx = " ";
    const lines   = str.split("\n");
    let out = lines.map(line => JSON.stringify(line + "\n"));
    if(pad) {
        const longest = out.reduce((maxL, line) => Math.max(maxL, line.length), 0);
        out = out.map(line => padRightToLength(line, longest));
    }
    return pfx + linePfx + out.join(`+\n${linePfx}`) + "),"
}

/**
 * Find the minimum element of the given iterator of numbers, or
 * `Infinity` if the iterator is empty.
 *
 * @param {IteratorObject<number>} as
 * @returns {number}
 */
export function minimum(as) {
    return as.reduce((m, a) => Math.min(m, a), Infinity);
}

/**
 * Find the maximum element of the given iterator of numbers, or
 * `-Infinity` if the iterator is empty.
 *
 * @param {IteratorObject<number>} as
 * @returns {number}
 */
export function maximum(as) {
    return as.reduce((m, a) => Math.max(m, a), -Infinity);
}

