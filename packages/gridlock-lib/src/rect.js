import * as point from "./point.js";

/**
 * @typedef {Object} Rect
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
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

/**
 * Create a new rectangle from the coordinates of its upper-left
 * corner, and its width and height.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function fromXYWH(x, y, w, h) {
    return {
        left: x,
        top: y,
        right: x + w,
        bottom: y + h
    }
}

/**
 * Create a new rectangle from two points.
 *
 * @param {point.P2} a
 * @param {point.P2} b
 * @returns {Rect}
 */
export function fromPoints(a, b) {
    return {
        left: Math.min(a.x, b.x),
        right: Math.max(a.x, b.x),
        top: Math.min(a.y, b.y),
        bottom: Math.max(a.y, b.y)
    }
}

/**
 * Test if two rectangles intersect.
 *
 * @param {Rect} a
 * @param {Rect} b
 * @returns {boolean} `true` if `a` and `b` intersect, and `false`
 *     otherwise.
 */
export function intersects(a, b) {
    return a.left < b.right && a.right > b.left
        && a.top < b.bottom && a.bottom > b.top;
}
