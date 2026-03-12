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
 * Pad a string to the right with spaces so that it's length is equal
 * to `len`. If the input string's length is greater than `len`, this
 * function returns the input unchanged.
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
 * @see padRightToLength
 *
 * @param {string} str The string to pad
 * @param {number} len The desired length of the string
 * @returns {string}
 */
export function padLeftToLength(str, len) {
    let out = str;
    for(let i = str.length; i < len; ++i) {
        out = " " + out;
    }
    return out;
}

/**
 * Log the given string as a copy-pastable JavaScript expression.
 *
 * @param {string} str
 */
export function showMultilineString(str) {
    const pfx = "localStorage.setItem(\n  \"editorState\",\n"
    const linePfx = "  ";
    const lines   = str.split("\n");
    const escaped = lines.map(line => JSON.stringify(line + "\n"));
    const longest = escaped.reduce((maxL, line) => Math.max(maxL, line.length), 0);
    const padded  = escaped.map(line => padRightToLength(line, longest));
    return pfx + linePfx + padded.join(`+\n${linePfx}`) + ");"
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

