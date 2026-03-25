import { Recycler, CommittableRecycler } from "../framework/index.js";

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

interface ToolbarTextInputDescription extends BaseToolbarItemDescription {
    type: "textInput";
    /** The text value of the input element. */
    value: string;
    /** Called when the text input's value is modified by the user. */
    onchange?: (newValue: string) => void;
    /** Called when the text input gains focus. */
    onfocus?: () => void;
}

export type ToolbarItemDescription =
ToolbarButtonDescription
| ToolbarSpacerDescription
| ToolbarDividerDescription
| ToolbarTextInputDescription;

/**
 * Build a button element in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarButton(descr: ToolbarButtonDescription, r: Recycler) {
    r.elem({ tag: "div", key: descr.key }, buttonElem => {

        buttonElem.className = "editor-button";
        if(descr.enabled ?? false) {
            buttonElem.classList.add("editor-button-enabled");
        }

        if(descr.disabled ?? false) {
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
function viewToolbarTextInput(descr: ToolbarTextInputDescription, r: Recycler) {
    r.elem({ tag: "input", key: descr.key }, inputElem => {
        inputElem.className = "editor-toolbar-text-input";
        inputElem.value = descr.value;
        inputElem.spellcheck = false;
        inputElem.onchange = (e) => {
            if(descr.onchange) {
                descr.onchange((e.target as HTMLInputElement).value);
            }
        };

        inputElem.onfocus = () => {
            if(descr.onfocus) {
                descr.onfocus();
            }
        };
    });
}

/**
 * Build a toolbar item in the given recycler.
 *
 * @param descr
 * @param r
 */
function viewToolbarItem(descr: ToolbarItemDescription, r: Recycler) {
    switch(descr.type) {
        case "button":    return viewToolbarButton(descr, r);
        case "spacer":    return viewToolbarSpacer(descr, r);
        case "divider":   return viewToolbarDivider(descr, r);
        case "textInput": return viewToolbarTextInput(descr, r);
    }
}

/**
 * Build a toolbar in the given recycler.
 *
 * @param descr
 * @param r
 */
export function ViewToolbar(descr: ToolbarItemDescription[], r: Recycler) {
    r.elem("div", toolbarElem => {
        toolbarElem.className = "editor-toolbar";
        new CommittableRecycler(toolbarElem)
            .views(descr, (d, r) => viewToolbarItem(d, r))
            .commit();
    });
}
