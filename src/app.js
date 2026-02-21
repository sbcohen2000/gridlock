import { EditorView, keymap } from "@codemirror/view"
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

document.addEventListener("DOMContentLoaded", async () => {
    const parser = await initializeParser();
    console.log(parser.parse("1 + 2"));

    const editorView = new EditorView({
        extensions: [keymap.of(defaultKeymap)],
        parent: document.body
    });
})
