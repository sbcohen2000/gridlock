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
 * Construct an HTML element suitable for putting in the view toolbar.
 *
 * @param {ToolbarButtonDescription} [descr]
 * @returns {HTMLElement}
 */
function mkToolbarButton(descr) {
    descr = descr ?? { type: "button" };

    const buttonElem = document.createElement("span");
    buttonElem.className = "editor-button";
    if(descr.disabled ?? false) {
        buttonElem.classList.add("editor-button-disabled");
    }
    buttonElem.innerText = descr.label ?? "button";
    buttonElem.onclick = descr.onclick ?? (() => {});

    return buttonElem;
}

/**
 * Construct an HTML element representing the given description.
 *
 * @param {ToolbarDescription} descr
 * @returns {HTMLElement}
 */
export function mkToolbarItem(descr) {
    switch(descr.type) {
    case "button": return mkToolbarButton(descr);
    }
}
