import { Recycler, CommittableRecycler } from "../framework/index.js";
import { AbstractView } from "./abstract-view.js";

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
    enabled?: () => boolean;
    /** Whether or not the button should be shown as disabled. */
    disabled?: () => boolean;
    /** What should happen when the button is clicked. */
    onclick?: (e: MouseEvent) => void;
}

interface ToolbarSpacerDescription extends BaseToolbarItemDescription {
    type: "spacer";
}

interface ToolbarDividerDescription extends BaseToolbarItemDescription {
    type: "divider";
}

interface ToolbarCustomElement extends BaseToolbarItemDescription {
    type: "custom";
    /** A view which represents the custom toolbar item. */
    view: AbstractView
}

export type ToolbarItemDescription =
ToolbarButtonDescription
| ToolbarSpacerDescription
| ToolbarDividerDescription
| ToolbarCustomElement;

/**
 * Build a button element in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarButton(descr: ToolbarButtonDescription, r: Recycler) {
    r.elem({ tag: "div", key: descr.key }, buttonElem => {
        const isEnabled = descr.enabled ? descr.enabled() : false;
        const isDisabled = descr.disabled ? descr.disabled() : false;

        buttonElem.className = "editor-button";
        if(isEnabled) {
            buttonElem.classList.add("editor-button-enabled");
        }

        if(isDisabled) {
            buttonElem.classList.add("editor-button-disabled");
        }

        if(descr.iconSrc) {
            new CommittableRecycler(buttonElem)
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
function viewToolbarSpacer(descr: ToolbarSpacerDescription, r: Recycler) {
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
function viewToolbarDivider(descr: ToolbarDividerDescription, r: Recycler) {
    r.elem({ tag: "div", key: descr.key }, dividerElem => {
        dividerElem.className = "editor-toolbar-divider";
    })
}

/**
 * Build a toolbar text input element in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarCustomElement(descr: ToolbarCustomElement, r: Recycler) {
    descr.view.view(r);
}

/**
 * Build a toolbar item in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarItem(descr: ToolbarItemDescription, r: Recycler) {
    switch(descr.type) {
        case "button":  return viewToolbarButton(descr, r);
        case "spacer":  return viewToolbarSpacer(descr, r);
        case "divider": return viewToolbarDivider(descr, r);
        case "custom":  return viewToolbarCustomElement(descr, r);
    }
}

export class ToolbarView extends AbstractView {
    #descr: ToolbarItemDescription[];

    constructor(parent: AbstractView, descr: ToolbarItemDescription[]) {
        super(parent);
        // Re-parent the views we've added in the toolbar item
        // descriptions.
        for(const item of descr) {
            if(item.type === "custom") {
                item.view.parent = this;
            }
        }
        this.#descr = descr;
    }

    view(r: Recycler) {
        r.elem("div", toolbarElem => {
            toolbarElem.className = "editor-toolbar";
            new CommittableRecycler(toolbarElem)
                .views(this.#descr, (d, r) => viewToolbarItem(d, r))
                .commit();
        });
    }
}
