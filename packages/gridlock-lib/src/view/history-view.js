import { CommittableRecycler } from "../framework/index.js";

/** @import { Inverse, AnyState } from "../state/index.js" */
/** @import { Recycler } from "../framework/index.js" */

/**
 * @param {Recycler} recycler
 * @param {Inverse<AnyState>[]} history
 */
export function HistoryView(recycler, history) {
    recycler.elem({ tag: "div", key: "editor-history-view" }, e => {
        e.className = "editor-history-view";
        new CommittableRecycler(e)
            .elems(history.toReversed(), "div", (item, elem) => {
                const descr = item.fwdDescription ?? "<unknown operation>";
                elem.innerText = descr;
            })
            .commit();
    });
}
