/**
 * @typedef {Object} ToolbarButtonDescription
 * @property {"button"}   type       The type of description.
 * @property {string}     [label]    The button's label.
 * @property {boolean}    [disabled] Whether or not the button is disabled.
 * @property {() => void} [onclick]  What should happen when the button is clicked.
 */

/**
 * @typedef {ToolbarButtonDescription} ToolbarDescription
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
    if(descr.disabled ?? false) {
        buttonElem.classList.add("editor-button-disabled");
    }
    buttonElem.innerText = descr.label ?? "button";
    buttonElem.onclick = descr.onclick ?? (() => {});

    return buttonElem;
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
    }
}
