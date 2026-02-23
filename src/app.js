import * as grid from "./grid.js";
import * as point from "./point.js";
import * as state from "./editor.js";
import GLPK from "glpk.js";

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
 * Make an element to represent the cusor.
 *
 * @returns {HTMLElement}
 */
function mkCursorElem() {
    const e = document.createElement("div");
    e.className = "editor-cursor";
    e.style.position = "absolute";
    return e;
}

/**
 * @param {HTMLElement}       root The root element of the editor.
 * @param {state.EditorState} st   The current editor state.
 */
function viewEditorState(root, st) {
    // TODO: re-use elements.
    root.style.display = "inline-grid";
    root.style.gridTemplateColumns = "1ch";
    root.style.gridTemplateRows = "1em";
    root.innerHTML = "";

    const nodes = grid.allNodes(st.grid);
    for(const [node, p] of nodes) {
        if(node.type !== "Leaf") continue;
        const sz = node.dims;

        // Specify the position of the cell using CSS grid syntax.
        const gridSpec = `${p.y + 1}/${p.x + 1}/span ${sz.height}/span ${sz.width}`;

        const leafElem = document.createElement("div");
        leafElem.className      = "editor-leaf";
        leafElem.style.width    = `${sz.width}ch`;
        leafElem.style.position = "relative";
        leafElem.style.gridArea = gridSpec;

        // Construct the inside of the cell.
        let row = 0;
        for(const line of node.data.lines) {
            const thisRow = row;
            const lineElem = document.createElement("div");
            lineElem.className = "editor-line";
            lineElem.innerText = line;
            lineElem.onmousedown = (e) => {
                const rect = lineElem.getBoundingClientRect();
                // Find the portion of the `lineElem` which is
                // actually occupied by text.
                const pctFilled = line.length / node.dims.width;

                const x = e.clientX;
                const i = Math.floor(point.lerp(
                    0,
                    line.length,
                    rect.left,
                    x,
                    rect.left + rect.width * pctFilled
                ));

                state.updateSingleSelection(node, point.mkP2(i, thisRow), st);
                viewEditorState(root, st);
            };
            leafElem.appendChild(lineElem);

            ++row;
        }

        root.appendChild(leafElem);

        // Construct the cursor.
        const cursorElem = mkCursorElem();
        leafElem.appendChild(cursorElem);
        cursorElem.style.display = "none";

        // If the leaf is selected, we need to draw the cursor.
        if(st.selection.type === "Single" && st.selection.leaf === node) {
            const ptDoc    = st.selection.pt;
            const xScreen  = `${ptDoc.x}ch`;
            const yScreen  = `${ptDoc.y}em`;

            cursorElem.style.display = "block";
            cursorElem.style.left = xScreen;
            cursorElem.style.top  = yScreen;
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const editorRoot = document.getElementById("editor-root");
    if(!editorRoot) {
        throw new Error("Could not find #editor-root element");
    }

    const glpk = await GLPK();
    const st = state.mk();

    const [setDirty, viewIfDirty] = (() => {
        let dirty = false;

        return [
            () => { dirty = true },
            () => {
                if(dirty) {
                    viewEditorState(editorRoot, st);
                    dirty = false;
                }
            }
        ];
    })();

    setDirty();
    viewIfDirty();

    document.addEventListener("keydown", async (e) => {
        if(e.key.length === 1) {
            await state.insertString(e.key, st, glpk);
            setDirty();
        } else {
            switch(e.key) {
            case "Backspace": state.removeCharBeforePoint(st); setDirty(); break;
            case "Enter": {
                if(e.metaKey) {
                    state.newRowBelowPoint(st);
                    setDirty();
                } else {
                    await state.makeGlobalNewline("", st, glpk);
                    setDirty();
                }
            } break;
            default: break;
            }
        }

        viewIfDirty();
    });
});
