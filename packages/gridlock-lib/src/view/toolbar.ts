import * as framework from "../framework/index.js";

interface BaseToolbarItemDescription {
    type: string; /** The type of description. */
    key: string;  /** A unique key for the item. */
}

interface ToolbarButtonDescription extends BaseToolbarItemDescription {
    type: "button",
    /** The button's icon URL, if it should be displayed with an icon. */
    iconSrc?: string,
    /** The button's label. */
    label?: string;
    /** Whether or not the button should be shown as enabled. */
    enabled?: boolean;
    /** Whether or not the button should be shown as disabled. */
    disabled?: boolean;
    /** What should happen when the button is clicked. */
    onclick?: (e: MouseEvent) => void;
}

interface ToolbarSpacerDescription extends BaseToolbarItemDescription {
    type: "spacer";
}

interface ToolbarDividerDescription extends BaseToolbarItemDescription {
    type: "divider";
}

export type ToolbarItemDescription =
ToolbarButtonDescription
| ToolbarSpacerDescription
| ToolbarDividerDescription;

/**
 * Build a button element in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarButton(descr: ToolbarButtonDescription, r: framework.UncommittableRecycler) {
    r.elem({ tag: "div", key: descr.key }, buttonElem => {

        buttonElem.className = "editor-button";
        if(descr.enabled ?? false) {
            buttonElem.classList.add("editor-button-enabled");
        }

        if(descr.disabled ?? false) {
            buttonElem.classList.add("editor-button-disabled");
        }

        if(descr.iconSrc) {
            new framework.CommittableRecycler(buttonElem)
                .elem("img", (iconImg) => {
                iconImg.className = "editor-button-icon";
                if(iconImg.getAttribute("src") !== descr.iconSrc) {
                    iconImg.src = descr.iconSrc;
                }
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
 * @param descr
 * @param r
 */
function viewToolbarSpacer(descr: ToolbarSpacerDescription, r: framework.UncommittableRecycler) {
    r.elem({ tag: "div", key: descr.key }, spacerElem => {
        spacerElem.className = "editor-toolbar-spacer";
    });
}

/**
 * Build a toolbar divider element in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarDivider(descr: ToolbarDividerDescription, r: framework.UncommittableRecycler) {
    r.elem({ tag: "div", key: descr.key }, dividerElem => {
        dividerElem.className = "editor-toolbar-divider";
    })
}

/**
 * Build a toolbar item in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarItem(descr: ToolbarItemDescription, r: framework.UncommittableRecycler) {
    switch(descr.type) {
        case "button":  return viewToolbarButton(descr, r);
        case "spacer":  return viewToolbarSpacer(descr, r);
        case "divider": return viewToolbarDivider(descr, r);
    }
}

/**
 * Build a toolbar in the given recycler.
 *
 * @param descr
 * @param r
 */
export function ViewToolbar(descr: ToolbarItemDescription[], r: framework.UncommittableRecycler) {
    r.elem("div", toolbarElem => {
        toolbarElem.className = "editor-toolbar";
        new framework.CommittableRecycler(toolbarElem)
            .views(descr, (d, r) => viewToolbarItem(d, r))
            .commit();
    });
}
