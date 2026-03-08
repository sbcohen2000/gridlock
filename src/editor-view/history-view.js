/** @import { Recycler } from "../framework.js" */
import { CommittableRecycler } from "../framework.js";

/** @import { HistoryItem } from "./history.d.ts" */

/**
 * @param {Recycler} recycler
 * @param {HistoryItem[]} history
 */
export default function HistoryView(recycler, history) {
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
