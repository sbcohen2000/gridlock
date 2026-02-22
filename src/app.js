import * as grid from "./grid.js";
import * as point from "./point.js";
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
 * @param {HTMLElement} gridContainer
 */
const gridViewPlugin = (gridContainer) => ViewPlugin.fromClass(class {
    /**
     * @type {grid.Grid}
     */
    #grid

    constructor() {
        this.#grid = grid.mk(0, 1);
    }

    /**
     * @param {ViewUpdate} update
     */
    update(update) {
        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            // fromA-toA is the range in the original document, and
            // fromB-toB is the range that replaces it in the new
            // document.

            // TODO: Need to classify the kinds of changes here. First
            // order of business: 1-character insertions and
            // deletions.
            //
            // Maybe we can use a transaction filter to actually
            // disallow other kinds of updates for now.

            const fromALine = update.startState.doc.lineAt(fromA);
            const fromARow = fromALine.number - 1;
            const fromACol = fromA - fromALine.from;

            const toBLine = update.state.doc.lineAt(toB);
            const toBRow = toBLine.number - 1;
            const toBCol = toB - toBLine.from;

            const fromLeaf = grid.leafUnderPoint(this.#grid, point.mkP2(fromACol, fromARow));

            const diffCol = toBCol - fromACol;
            const diffRow = toBRow - fromARow;

            console.log(diffCol, diffRow);

            if(Math.abs(diffCol) > 1 || Math.abs(diffRow) > 1) {
                console.error("I don't know how to deal with large insertions yet! The grid is almost certainly out of sync now.");
                return;
            }

            // console.log(diff);
        });

        const leading = update.view.defaultLineHeight;
        const charWidth = update.view.defaultCharacterWidth;
        this.#updateSVGUnderlay(this.#grid, leading, charWidth);
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
            keymap.of(defaultKeymap),
            gridViewPlugin(gridContainer),
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
