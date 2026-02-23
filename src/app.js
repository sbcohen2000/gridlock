import * as grid from "./grid.js";
import * as point from "./point.js";
import { EditorState, StateField, Transaction, Annotation, AnnotationType } from "@codemirror/state"
import { EditorView, keymap, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"

// Reload the page when esbuild issues a change event.
//
// If any of the changes was to a CSS file, we can do a hot-reload by
// replacing the link tag.
new EventSource('/esbuild').addEventListener('change', e => {
    const { added, removed, updated } = JSON.parse(e.data)

    if (!added.length && !removed.length && updated.length === 1) {
        for (const link of document.getElementsByTagName("link")) {
            const url = new URL(link.href)

            if (url.host === location.host && url.pathname === updated[0]) {
                const next = /** @type {HTMLLinkElement} */ (link.cloneNode());
                next.href = updated[0] + '?' + Math.random().toString(36).slice(2);
                next.onload = () => link.remove();
                if(link.parentNode) {
                    link.parentNode.insertBefore(next, link.nextSibling);
                }
                return;
            }
        }
    }

    location.reload();
})

/**
 * Initialize the treeSitter
 *
 * @returns {Promise<treeSitter.Parser>} The initialized parser.
 */
async function initializeParser() {
    await treeSitter.Parser.init();
    const parser = new treeSitter.Parser();
    const JavaScript = await treeSitter.Language.load("/tree-sitter-javascript.wasm");
    parser.setLanguage(JavaScript);
    return parser;
}

/**
 * Define a type which represents an insertion into a leaf of the
 * grid.
 *
 * @typedef {{
 *   type: "Insertion",
 *   leaf: grid.Leaf,
 *   n: number
 * }} Insertion
 */

/**
 * Define a type which represents insertion of a newline to a leaf of
 * the grid.
 *
 * @typedef {{
 *   type: "Newline",
 *   leaf: grid.Leaf,
 * }} Newline
 */

/**
 * Define a type which represents a deletion from a leaf in the grid.
 *
 * @typedef {{
 *   type: "Deletion",
 *   leaf: grid.Leaf,
 *   n: number
 * }} Deletion
 */

/**
 * @typedef {Insertion | Newline | Deletion} GridUpdate
 */

/**
 * @type {AnnotationType<GridUpdate>}
 */
const gridUpdateAnno = Annotation.define();

const gridField = StateField.define({
    /**
     * @param {EditorState} state
     * @returns {grid.Grid}
     */
    create(state) {
        const nLines = state.doc.lines;
        // Find the width of the maximum line.
        let maxLineLen = 0;
        for(const line of state.doc.iterLines()) {
            maxLineLen = Math.max(maxLineLen, line.length);
        }
        return grid.mk(maxLineLen, nLines);
    },

    /**
     * @param {grid.Grid} value
     * @param {Transaction} transaction
     * @returns {grid.Grid}
     */
    update(value, transaction) {
        const ann = transaction.annotation(gridUpdateAnno);
        console.log(ann);
        return value;
    }
});

/**
 * @param {HTMLElement} gridContainer
 */
const gridViewPlugin = (gridContainer) => ViewPlugin.fromClass(class {
    /**
     * @param {ViewUpdate} update
     */
    update(update) {
        const grid = update.state.field(gridField);
        const leading = update.view.defaultLineHeight;
        const charWidth = update.view.defaultCharacterWidth;
        this.#updateSVGUnderlay(grid, leading, charWidth);
    }

    /**
     * Set the SVG underlay of the codemirror instance to the given
     * rendering.
     *
     * @param {grid.Grid} g
     * @param {number} leading
     * @param {number} charWidth
     */
    #updateSVGUnderlay(g, leading, charWidth) {
        const svgSrc = grid.toSVG(g, leading, charWidth);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgSrc, "image/svg+xml");

        gridContainer.innerHTML = "";
        gridContainer.appendChild(doc.documentElement);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
  const editorRoot = document.getElementById("editor-root");
  if (!editorRoot) {
    throw new Error("Could not locate #editor-root");
  }
  const gridContainer = document.getElementById("grid-container");
  if (!gridContainer) {
    throw new Error("Could not locate #rocks-container element");
  }

    const parser = await initializeParser();
    console.log(parser.parse("1 + 2"));

    const editorView = new EditorView({
        extensions: [
            gridField.extension,
            gridViewPlugin(gridContainer),
            keymap.of(defaultKeymap),
            EditorView.inputHandler.of((view, from, to, text, insert) => {
                // Here, we intercept input events so that we can
                // classify them, and make sure that they won't get
                // the grid out of sync.
                //
                // insert, when called, returns the default
                // transaction that corresponds to this event.
                const g = view.state.field(gridField);
                const fromLine = view.state.doc.lineAt(from);
                const fromRow  = fromLine.number;
                const fromCol  = from - fromLine.from;

                const leaf = grid.leafUnderPoint(g, point.mkP2(fromCol, fromRow));

                /** @type {Insertion} */
                const anno = {
                    type: "Insertion",
                    leaf,
                    n: text.length
                };

                const tr = insert();

                /**
                 * We augment the transaction that we would've
                 * dispatched with an extra annotation which tells us
                 * to insert a character into the relevant grid cell.
                 *
                 * @type {import("@codemirror/state").TransactionSpec}
                 */
                const trSpec = {
                    changes: tr.changes,
                    selection: tr.selection,
                    effects: tr.effects,
                    scrollIntoView: tr.scrollIntoView,
                    annotations: [ gridUpdateAnno.of(anno) ]
                };

                view.dispatch(trSpec);
                return true;
            }),
            // These are necessary to get the SVG underlay to line up
            // with the text properly.
            EditorView.theme({
                ".cm-content": {
                    padding: 0
                },
                ".cm-line": {
                    padding: 0,
                }
            })
        ],
        parent: editorRoot
    });
})
