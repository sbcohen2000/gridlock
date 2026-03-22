import { CommittableRecycler } from "../framework/index.js";
import { SnapshotInverse } from "../state/inverse.js";

/** @import { Inverse, AnyState } from "../state/index.js" */
/** @import { Recycler } from "../framework/index.js" */

/**
 * @param {Recycler} recycler
 * @param {Inverse<AnyState>[]} history
 * @param {number} undoIndex
 */
export function HistoryView(recycler, history, undoIndex) {
    recycler.elem({ tag: "div", key: "editor-history-view" }, e => {
        e.className = "editor-history-view";

        if(history.length === 0) {
            return;
        }

        const beforeUndo = history.slice(0, undoIndex);
        const atUndo     = history[undoIndex];
        const afterUndo  = history.slice(undoIndex + 1);

        /**
         * @param {Inverse<AnyState>} item
         * @param {HTMLDivElement} elem
         */
        const viewElem = (item, elem) => {
            elem.classList.add("editor-history-item");
            const descr = item.fwdDescription ?? "<unknown operation>";

            if(item instanceof SnapshotInverse) {
                elem.classList.add("editor-history-snapshot-item");
            }

            elem.innerText = descr;
        }

        // Note that the history items are added in reverse order so
        // that we can use `column-reverse`, which keeps the element
        // scrolled to the end.
        new CommittableRecycler(e)
            .elems(afterUndo.toReversed(), { tag: "div", key: "after-undo-item", clearAttributes: true }, viewElem)
            .elem({ tag: "div", key: "at-undo-item", clearAttributes: true }, (elem) => {
                viewElem(atUndo, elem);
                elem.classList.add("editor-history-undo-item");
            })
            .elems(beforeUndo.toReversed(), { tag: "div", key: "before-undo-item", clearAttributes: true }, viewElem)
            .commit();
    });
}
