import * as point from "../point.js";
import { AbstractView, ViewEvent } from "./abstract-view.js";
import { CommittableRecycler } from "../framework/index.js";

/** @import { Recycler } from "../framework/index.js" */

/**
 * @typedef {Object} ContextMenuButton
 * @property {"button"} type  The type of item.
 * @property {string}   label The button's label.
 * @property {(e: MouseEvent) => void} [onclick] What should happen when the button is clicked.
 * @property {boolean}  [disabled] Whether or not the button should be shown as disabled.
 */

/**
 * Make a new `ContextMenuButton`.
 *
 * @param {string} label
 * @param {(e: MouseEvent) => void} [onclick]
 * @param {boolean} [disabled]
 * @returns {ContextMenuButton}
 */
export function button(label, onclick, disabled) {
    return { type: "button", label, onclick, disabled };
}

/**
 * @typedef {Object} ContextMenuLabel
 * @property {"label"} type  The type of item.
 * @property {string}  label The label's text.
 */

/**
 * Make a new `ContextMenuLabel`.
 *
 * @param {string} label
 * @returns {ContextMenuLabel}
 */
export function label(label) {
    return { type: "label", label };
}

/**
 * @typedef {Object} ContextMenuDivider
 * @property {"divider"} type The type of item.
 */

/**
 * Make a new `ContextMenuDivider`.
 *
 * @returns {ContextMenuDivider}
 */
export function divider() {
    return { type: "divider" };
}

/**
 * @typedef {ContextMenuButton | ContextMenuLabel | ContextMenuDivider} ContextMenuItem
 */

/**
 * @typedef {Object} ContextMenuDescription
 * @property {point.P2} origin The point (in client coordaintes) at
 *     which the context menu should appear.
 * @property {ContextMenuItem[]} menu The menu.
 */

export class OpenContextMenu extends ViewEvent {
    /** @type {ContextMenuDescription} */
    #menuDescr;

    /**
     * @param {AbstractView} initiator
     * @param {ContextMenuDescription} menuDescr
     */
    constructor(initiator, menuDescr) {
        super(initiator, true);
        this.#menuDescr = menuDescr;
    }

    /** @returns {ContextMenuDescription} */
    get menuDescr() {
        return this.#menuDescr;
    }
}

export class DismissContextMenu extends ViewEvent {
    /** @param {AbstractView} initiator */
    constructor(initiator) { super(initiator, true); }
}

export class ContextMenuView extends AbstractView {
    /**
     * @type {ContextMenuDescription}
     */
    #menuDescr;

    /**
     * @param {AbstractView} parent
     * @param {ContextMenuDescription} menuDescr
     */
    constructor(parent, menuDescr) {
        super(parent);
        this.#menuDescr = menuDescr;
    }

    /**
     * The HTMLElement which is used to represent the context menu.
     * @type {HTMLElement}
     */
    #menuElem;

    /**
     * Given the context menu's measured width and height, update its
     * position to be on the screen and close to the menu origin.
     *
     * @param {number} width
     * @param {number} height
     */
    #updateMenuPosition(width, height) {
        console.log(`Context menu measured with size ${width}px X ${height}px.`);

        const windowWidth  = window.innerWidth;
        const windowHeight = window.innerHeight;

        const idealOrigin = this.#menuDescr.origin;

        const idealLeft   = idealOrigin.x;
        const idealRight  = idealOrigin.x + width;
        const idealTop    = idealOrigin.y;
        const idealBottom = idealOrigin.y + height;

        // Find the hypothetical horizontal and vertical overlap that
        // we would incur if we placed the context menu at the ideal
        // origin.
        //
        // If they're negative, then the context menu overlaps the
        // left/top edges of the window, and if they're positive, the
        // context menu overlaps the bottom/right edges.
        //
        // If they're zero, then no adjustment to the position of the
        // context menu is necessary.
        const horzOverlap = Math.min(idealLeft, 0) + Math.max(0, idealRight - windowWidth);
        const vertOverlap = Math.min(idealTop, 0) + Math.max(0, idealBottom - windowHeight);

        this.#menuElem.style.top = `${idealOrigin.y - vertOverlap}px`;
        this.#menuElem.style.left = `${idealOrigin.x - horzOverlap}px`;

        // Only show scroll bars if they were necessary. We first
        // disconnect the resize observer so that the below does not
        // trigger a re-draw.
        this.#menuElemResizeObserver.disconnect();
        this.#menuElem.style.overflow = "auto";
    }

    /** @type {ResizeObserver} */
    #menuElemResizeObserver = new ResizeObserver((entries) => {
        for(const entry of entries) {
            if(entry.target === this.#menuElem) {
                // The context menu has been (re)sized. We need to
                // update its position to ensure that it is on screen
                // and nearby to the menu's origin.
                this.#updateMenuPosition(
                    entry.borderBoxSize[0].inlineSize,
                    entry.borderBoxSize[0].blockSize
                );
            }
        }
    });

    /**
     * View the context menu.
     *
     * @param {Recycler} recycler The recycler to add to.
     */
    view(recycler) {
        recycler.elem({ tag: "div", key: "context-menu-root" }, (ctxMenuRoot) => {
            new CommittableRecycler(ctxMenuRoot)
                .elem({ tag: "div", key: "context-menu-screen" }, (screenElem) => {
                    // Construct an element to sit behind the context
                    // menu, filling the entire screen, whose purpose is
                    // to detect mouse down events outside of the context
                    // menu, so that the user can close the menu by
                    // clicking outside of it.
                    screenElem.className = "editor-context-menu-screen";
                    screenElem.oncontextmenu = () => false;
                    screenElem.onpointerdown = () => {
                        this.notify(new DismissContextMenu(this));
                    };
                })
                .elem({ tag: "div", key: "context-menu" }, (menuElem) => {
                    this.#menuElem = menuElem;
                    this.#menuElemResizeObserver.disconnect();
                    this.#menuElemResizeObserver.observe(this.#menuElem);

                    // Note that positioning of the element is deferred until we
                    // know the rendered size of the context menu, which will be
                    // reported to this class via the above `ResizeObserver`.
                    this.#menuElem.className = "editor-context-menu";

                    // We always create the element with `overflow:
                    // scroll` so that the element is measured with scroll
                    // bars. This means we'll allocate room for them if
                    // they turn out to be necessary.
                    this.#menuElem.style.overflow = "scroll";

                    // This handler applies to buttons with no click
                    // handlers, or labels or dividers.
                    this.#menuElem.onclick = () => {
                        this.notify(new DismissContextMenu(this));
                    };

                    new CommittableRecycler(this.#menuElem)
                        .elems(this.#menuDescr.menu, { tag: "div", clearAttributes: true } , (item, elem) => {
                            switch(item.type) {
                            case "button": {
                                elem.className = "editor-context-menu-button";
                                if(item.disabled) {
                                    elem.classList.add("editor-context-menu-button-disabled");
                                }
                                elem.onclick = item.onclick;
                                elem.innerText = item.label;
                                break;
                            }
                            case "label": {
                                elem.className = "editor-context-menu-label";
                                elem.innerText = item.label;
                                break;
                            }
                            case "divider": {
                                elem.className = "editor-context-menu-divider";
                                break;
                            }
                            }
                        })
                        .commit();
                })
                .commit();
        });
    }
}
