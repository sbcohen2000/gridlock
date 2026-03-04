import * as util from "../util.js";

/**
 * @typedef {Object} ToolbarButtonDescription
 * @property {"button"}   type       The type of description.
 * @property {string}     [iconSrc]  The button's icon URL.
 * @property {string}     [label]    The button's label.
 * @property {boolean}    [enabled]  Whether or not the button is enabled.
 * @property {() => void} [onclick]  What should happen when the button is clicked.
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
 * @param {ToolbarButtonDescription} [descr]
 * @param {HTMLElement} [prev] An existing button element to update in place.
 * @returns {HTMLElement}
 */
function mkToolbarButton(descr, prev) {
    descr = descr ?? { type: "button" };

    const buttonElem = prev ?? document.createElement("span");
    buttonElem.className = "editor-button";
    if(descr.enabled ?? false) {
        buttonElem.classList.add("editor-button-enabled");
    }

    if(descr.iconSrc) {
        util.recycleConstChildren(
            buttonElem,
            (prev) => {
                /** @type {HTMLImageElement} */
                const iconImg = (prev && prev instanceof HTMLImageElement) ? prev : document.createElement("img");
                iconImg.className = "editor-button-icon";
                iconImg.src = descr.iconSrc;
                iconImg.width  = 18;
                iconImg.height = 18;
                return iconImg;
            }
        );
    } else {
        buttonElem.innerText = descr.label ?? "button";
    }

    buttonElem.onclick = descr.onclick ?? (() => {});

    return buttonElem;
}

/**
 * Construct or update an HTML elenet suitable for putting in the view toolbar.
 *
 * @param {ToolbarSpacerDescription} [descr]
 * @param {HTMLElement} [prev] An existing spacer element to update in place.
 * @returns {HTMLElement}
 */
function mkToolbarSpacer(descr, prev) {
    descr = descr ?? { type: "spacer" };

    const spacerElem = prev ?? document.createElement("span");
    spacerElem.className = "editor-toolbar-spacer";
    return spacerElem;
}

/**
 * Construct or update an HTML element representing the given description.
 *
 * @param {ToolbarDescription} descr
 * @param {HTMLElement} [prev] An existing element to update in place.
 * @returns {HTMLElement}
 */
export function mkToolbarItem(descr, prev) {
    switch(descr.type) {
    case "button": return mkToolbarButton(descr, prev);
    case "spacer": return mkToolbarSpacer(descr, prev);
    }
}
