import * as util from "../util.js";

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
 * @typedef {ToolbarButtonDescription | ToolbarSpacerDescription} ToolbarDescription
 */

/**
 * Construct or update an HTML element suitable for putting in the view toolbar.
 *
 * @param {ToolbarButtonDescription} descr
 * @param {import("../util.js").CreateElement} create Factory to obtain the button element.
 * @returns {HTMLElement}
 */
function mkToolbarButton(descr, create) {

    const buttonElem = create("span");
    buttonElem.className = "editor-button";
    if(descr.enabled ?? false) {
        buttonElem.classList.add("editor-button-enabled");
    }

    if(descr.iconSrc) {
        new util.Recycler(buttonElem)
            .item((create) => {
                const iconImg = /** @type {HTMLImageElement} */ (create("img"));
                iconImg.className = "editor-button-icon";
                iconImg.src = descr.iconSrc;
                iconImg.width  = 18;
                iconImg.height = 18;
                return iconImg;
            })
            .commit();
    } else {
        buttonElem.innerText = descr.label ?? "button";
    }

    buttonElem.onclick = descr.onclick ?? (() => {});

    return buttonElem;
}

/**
 * Construct or update an HTML element suitable for putting in the view toolbar.
 *
 * @param {ToolbarSpacerDescription} descr
 * @param {import("../util.js").CreateElement} create Factory to obtain the spacer element.
 * @returns {HTMLElement}
 */
function mkToolbarSpacer(descr, create) {

    const spacerElem = create("span");
    spacerElem.className = "editor-toolbar-spacer";
    return spacerElem;
}

/**
 * Construct or update an HTML element representing the given description.
 *
 * @param {ToolbarDescription} descr
 * @param {import("../util.js").CreateElement} create Factory to obtain the element.
 * @returns {HTMLElement}
 */
export function mkToolbarItem(descr, create) {
    switch(descr.type) {
    case "button": return mkToolbarButton(descr, create);
    case "spacer": return mkToolbarSpacer(descr, create);
    }
}
