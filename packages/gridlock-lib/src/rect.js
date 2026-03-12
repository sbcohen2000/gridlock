import * as point from "./point.js";

/**
 * @typedef {Object} Rect
 * @param {number} left
 * @param {number} right
 * @param {number} top
 * @param {number} bottom
 */

/**
 * Compute the width of a rectangle.
 *
 * @param {Rect} r
 * @returns {number}
 */
export function width(r) {
    return r.right - r.left;
}

/**
 * Compute the height of a rectangle.
 *
 * @param {Rect} r
 * @returns {number}
 */
export function height(r) {
    return r.bottom - r.top;
}

/**
 * Compute the area of a rectangle.
 *
 * @param {Rect} r
 * @returns {number}
 */
export function area(r) {
    return width(r) * height(r);
}

/**
 * Compute the union of several rectangles.
 * @param {...Rect} rects
 * @returns {Rect}
 */
export function unions(...rects) {
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const rect of rects) {
        left   = Math.min(left,   rect.left);
        right  = Math.max(right,  rect.right);
        top    = Math.min(top,    rect.top);
        bottom = Math.max(bottom, rect.bottom);
    }
    return { left, right, top, bottom };
}

/**
 * Get the position of the upper-left corner of the rectangle.
 *
 * @param {Rect} r
 * @returns {point.P2}
 */
export function upperLeft(r) {
    return point.mkP2(r.left, r.top);
}
