/**
 * @typedef {{
 *   x: number;
 *   y: number;
 * }} P2
 */

/**
 * @typedef {{
 *   dx: number;
 *   dy: number;
 * }} V2
 */

/**
 * The point at the origin (with coordinates zero).
 *
 * @returns {P2} A new point, representing the origin.
 */
export function mkOrigin() {
    return { x: 0, y: 0 };
}

/**
 * Offset a point by a vector, returning a new point.
 *
 * @param {P2} p The point to offset.
 * @param {V2} v The vector by which to offset `p`.
 * @returns {P2} The offset point.
 */
export function offset(p, v) {
    return { x: p.x + v.dx, y: p.y + v.dy };
}

/**
 * Construct a new point from its components.
 *
 * @param {number} x
 * @param {number} y
 */
export function mkP2(x, y) {
    return { x, y };
}

/**
 * Construct a new vector from its components.
 *
 * @param {number} dx
 * @param {number} dy
 */
export function mkV2(dx, dy) {
    return { dx, dy };
}
