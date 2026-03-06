/**
 * This module implements an algorithm for finding the longest common
 * subsequence of two strings.
 *
 * Source: https://en.wikipedia.org/wiki/Longest_common_subsequence
 *
 * @module lcs.js
 */

/**
 * @typedef {Object} Table
 * @property {Int32Array} table
 * @property {number}     iStart
 * @property {number}     sz0
 * @property {number}     sz1
 */

/**
 * Construct the memo table from two strings.
 *
 * @template A
 * @param {A[]} as The first string.
 * @param {A[]} bs The second string.
 * @returns {Table}
 */
function mkTable(as, bs) {
    const aLen  = as.length;
    const bLen  = bs.length;

    // Try to shrink the table by pre-searching for a matching prefix
    // and suffix of `as` and `bs` (as will be the case most of the
    // time).
    let iStart = 1;
    let i0End = aLen;
    let i1End = bLen;

    // Trim from the front.
    while(iStart <= i0End && iStart <= i1End && as[iStart - 1] === bs[iStart - 1]) {
        ++iStart;
    }

    // Trim from the back.
    while(iStart <= i0End && iStart <= i1End && as[i0End - 1] === bs[i1End - 1]) {
        --i0End;
        --i1End;
    }

    const sz0 = i0End - iStart + 2;
    const sz1 = i1End - iStart + 2;
    const table = new Int32Array(sz0 * sz1);

    for(let i0 = 1; i0 < sz0; ++i0) {
        for(let i1 = 1; i1 < sz1; ++i1) {
            const ii = i0 * sz1 + i1;

            if(as[iStart + i0 - 2] === bs[iStart + i1 - 2]) {
                table[ii] = table[(i0 - 1) * sz1 + (i1 - 1)] + 1
            } else {
                table[ii] = Math.max(
                    table[      i0 * sz1 + (i1 - 1)],
                    table[(i0 - 1) * sz1 +       i1]
                );
            }
        }
    }

    return { table, sz0, sz1, iStart };
}

/**
 * Represents an operation which, when performed on string `a` will
 * bring it to string `b`. All indices refer to string `a`.
 *
 * @template A
 * @typedef {{
 *   op: "delete",
 *   index: number
 * } | {
 *   op: "insert",
 *   index: number,
 *   elem: A
 * }
 * } DiffOp
 */

/**
 * Find the diff between two strings.
 *
 * @template A
 * @param {A[]} as
 * @param {A[]} bs
 * @returns {DiffOp<A>[]}
 */
export function diff(as, bs) {
    const { iStart, sz0, sz1, table } = mkTable(as, bs);

    /** @type {DiffOp<A>[]} */
    let out = [];

    /**
     * @param {number} i0 Index into `as`.
     * @param {number} i1 Index into `bs`.
     */
    const go = (i0, i1) => {
        if(i0 === 0 && i1 === 0) return;

        if(i0 > 0 && i1 > 0 && as[iStart + i0 - 2] === bs[iStart + i1 - 2]) {
            return go(i0 - 1, i1 - 1);
        }

        const insCost = table[      i0 * sz1 + (i1 - 1)];
        const delCost = table[(i0 - 1) * sz1 + i1      ];
        if(i1 > 0 && (i0 === 0 || insCost >= delCost)) {
            go(i0, i1 - 1);
            out.push({ op: "insert", index: iStart + i0 - 1, elem: bs[iStart + i1 - 2] });
        } else if(i0 > 0) {
            go(i0 - 1, i1);
            out.push({ op: "delete", index: iStart + i0 - 2 });
        }
    };

    go(sz0 - 1, sz1 - 1);
    return out;
}

/**
 * Patch `as` by applying the given `diff`.
 *
 * @template A
 * @param {A[]} as
 * @param {DiffOp<A>[]} diff
 * @returns {A[]}
 */
export function patch(as, diff) {
    // Apply the diff in reverse order so that the indices don't get
    // messed up as we go.
    const bs = [...as];

    for(let i = diff.length - 1; i >= 0; --i) {
        const op = diff[i];
        switch(op.op) {
        case "delete": bs.splice(op.index, 1);          break;
        case "insert": bs.splice(op.index, 0, op.elem); break;
        }
    }

    return bs;
}
