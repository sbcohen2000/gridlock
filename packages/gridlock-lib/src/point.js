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
 * Return a new `P2` whose coordinates have been rounded to the
 * nearest integer.
 *
 * @param {P2} p
 * @returns {P2}
 */
export function roundP2(p) {
    return { x: Math.round(p.x), y: Math.round(p.y) };
}

/**
 * Return a new `P2` whose coordinates have been floored to the next
 * smallest integer.
 *
 * @param {P2} p
 * @returns {P2}
 */
export function floorP2(p) {
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
}

/**
 * Clone a point.
 *
 * @param {P2} p
 * @returns {P2}
 */
export function cloneP2(p) {
    return { x: p.x, y: p.y };
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

/**
 * Clone a vector.
 *
 * @param {V2} v
 * @returns {V2}
 */
export function cloneV2(v) {
    return { dx: v.dx, dy: v.dy };
}

/**
 * Linearly interpolate.
 *
 * @param {number} omin The minimum output value.
 * @param {number} omax The maximum output value.
 * @param {number} imin The minimum input value (maps to omin).
 * @param {number} xx   The input.
 * @param {number} imax The maximum output value (maps to omax).
 * @returns {number}
 */
export function lerp(omin, omax, imin, xx, imax) {
    if(imax - imin === 0) {
        return omin;
    }

    const t = (xx - imin) / (imax - imin);
    return (1 - t) * omin + t * omax;
}

/**
 * Find the distance between two points.
 *
 * @param {P2} a
 * @param {P2} b
 * @returns {number}
 */
export function distance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}
