import Recycler from "../framework.js";

/** @import { HistoryItem } from "./history.d.ts" */

/**
 * @param {Recycler} recycler
 * @param {HistoryItem[]} history
 */
export default function HistoryView(recycler, history) {
    recycler.elem({ tag: "div", key: "editor-history-view" }, e => {
        e.className = "editor-history-view";
        new Recycler(e)
            .elems(history, "div", (_item, elem) => {
                elem.innerText = "item";
            })
    });
}
