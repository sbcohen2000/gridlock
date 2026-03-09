import { CommittableRecycler } from "../framework.js";

/**
 * @typedef {Object} ToolbarButtonDescription
 * @property {"button"}   type       The type of description.
 * @property {string}     [iconSrc]  The button's icon URL.
 * @property {string}     [label]    The button's label.
 * @property {boolean}    [enabled]  Whether or not the button is enabled.
 * @property {(e: MouseEvent) => void} [onclick]  What should happen when the button is clicked.
 */

/**
 * @typedef {Object} ToolbarSpacerDescription
 * @property {"spacer"} type The type of description.
 */

/**
 * @typedef {Object} ToolbarDividerDescription
 * @property {"divider"} type The type of description.
 */

/**
 * @typedef {ToolbarButtonDescription | ToolbarSpacerDescription | ToolbarDividerDescription} ToolbarDescription
 */

/**
 * Construct or update an HTML element suitable for putting in the view toolbar.
 *
 * @param {ToolbarButtonDescription} descr
 * @param {HTMLSpanElement} buttonElem
 */
function mkToolbarButton(descr, buttonElem) {

    buttonElem.className = "editor-button";
    if(descr.enabled ?? false) {
        buttonElem.classList.add("editor-button-enabled");
    }

    if(descr.iconSrc) {
        new CommittableRecycler(buttonElem)
            .elem("img", (iconImg) => {
                iconImg.className = "editor-button-icon";
                iconImg.src = descr.iconSrc;
                iconImg.width  = 18;
                iconImg.height = 18;
            })
            .commit();
    } else {
        buttonElem.innerText = descr.label ?? "button";
    }

    buttonElem.onclick = descr.onclick ?? (() => {});
}

/**
 * Construct or update an HTML element suitable for putting in the
 * view toolbar.
 *
 * @param {ToolbarSpacerDescription} _descr
 * @param {HTMLSpanElement} spacerElem
 */
function mkToolbarSpacer(_descr, spacerElem) {
    spacerElem.className = "editor-toolbar-spacer";
}

/**
 * Construct or update an HTML element suitable for putting in the
 * view toolbar.
 *
 * @param {ToolbarDividerDescription} _descr
 * @param {HTMLSpanElement} dividerElem
 */
function mkToolbarDivider(_descr, dividerElem) {
    dividerElem.className = "editor-toolbar-divider";
}

/**
 * Construct or update an HTML element representing the given description.
 *
 * @param {ToolbarDescription} descr
 * @param {HTMLSpanElement} elem
 */
export function mkToolbarItem(descr, elem) {
    switch(descr.type) {
    case "button":  return mkToolbarButton(descr, elem);
    case "spacer":  return mkToolbarSpacer(descr, elem);
    case "divider": return mkToolbarDivider(descr, elem);
    }
}
