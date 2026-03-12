import * as framework from "../framework/index.js";

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
 * Build a button element in the given recycler.
 *
 * @param {ToolbarButtonDescription} descr
 * @param {framework.UncommittableRecycler} r
 */
function viewToolbarButton(descr, r) {
    r.elem("div", buttonElem => {

        buttonElem.className = "editor-button";
        if(descr.enabled ?? false) {
            buttonElem.classList.add("editor-button-enabled");
        }

        if(descr.iconSrc) {
            new framework.CommittableRecycler(buttonElem)
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
    });
}

/**
 * Build a spacer element in the given recycler.
 *
 * @param {ToolbarSpacerDescription} _descr
 * @param {framework.UncommittableRecycler} r
 */
function viewToolbarSpacer(_descr, r) {
    r.elem("div", spacerElem => {
        spacerElem.className = "editor-toolbar-spacer";
    });
}

/**
 * Build a toolbar divider element in the given recycler.
 *
 * @param {ToolbarDividerDescription} _descr
 * @param {framework.UncommittableRecycler} r
 */
function viewToolbarDivider(_descr, r) {
    r.elem("div", dividerElem => {
        dividerElem.className = "editor-toolbar-divider";
    })
}

/**
 * Build a toolbar item in the given recycler.
 *
 * @param {ToolbarDescription} descr
 * @param {framework.UncommittableRecycler} r
 */
function viewToolbarItem(descr, r) {
    switch(descr.type) {
    case "button":  return viewToolbarButton(descr, r);
    case "spacer":  return viewToolbarSpacer(descr, r);
    case "divider": return viewToolbarDivider(descr, r);
    }
}

/**
 * Build a toolbar in the given recycler.
 *
 * @param {ToolbarDescription[]} descr
 * @param {framework.UncommittableRecycler} r
 */
export function ViewToolbar(descr, r) {
    r.elem("div", toolbarElem => {
        new framework.CommittableRecycler(toolbarElem)
            .views(descr, (d, r) => viewToolbarItem(d, r));
    });
}
