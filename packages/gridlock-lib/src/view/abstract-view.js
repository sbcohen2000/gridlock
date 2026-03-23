/** @import { Recycler } from "../framework/index.js" */

export class ViewEvent {
    /**
     * The view which initiated the event
     * @type {AbstractView}
     */
    #initiator;

    /**
     * Should the view bubble to its parent?
     */
    #bubbles;

    /**
     * @param {AbstractView} initiator
     * @param {boolean} bubbles
     */
    constructor(initiator, bubbles) {
        this.#initiator = initiator;
        this.#bubbles = bubbles;
    }

    /** @returns {AbstractView} */
    get initiator() {
        return this.#initiator;
    }

    /** @returns {boolean} */
    get bubbles() {
        return this.#bubbles
    }
}

/**
 * Notify the parent that a child view would like to redraw.
 */
export class RedrawViewEvent extends ViewEvent {
    /** @param {AbstractView} initiator */
    constructor(initiator) { super(initiator, true); }
}

/**
 * Notify that a view wants to receive focus.
 */
export class RequestFocusViewEvent extends ViewEvent {
    /** @param {AbstractView} initiator */
    constructor(initiator) { super(initiator, true); }
}

/**
 * Notify that a keyboard key was pressed.
 */
export class KeyViewEvent extends ViewEvent {
    /** @type {KeyboardEvent} */
    #e;

    /**
     * @param {AbstractView} initiator
     * @param {KeyboardEvent} e
     */
    constructor(initiator, e) {
        super(initiator, true);
        this.#e = e;
    }

    /** @returns {KeyboardEvent} */
    get e() { return this.#e; }
}

/**
 * Notify that a view was deleted.
 */
export class ViewDeletedViewEvent extends ViewEvent {
    /** @type {AbstractView} */
    #view;

    /**
     * @param {AbstractView} initiator
     * @param {AbstractView} view
     */
    constructor(initiator, view) {
        super(initiator, true);
        this.#view = view;
    }

    /** @returns {AbstractView} */
    get view() { return this.#view; }
}

/**
 * Notify a view that it received focus.
 */
export class ReceivedFocusViewEvent extends ViewEvent {
    /** @param {AbstractView} initiator */
    constructor(initiator) { super(initiator, false); }
}

export class LostFocusViewEvent extends ViewEvent {
    /** @param {AbstractView} initiator */
    constructor(initiator) { super(initiator, false); }
}

export class AbstractView {
    /** @type {AbstractView | null}
     *
     * The parent view, or `null`, if this view is topmost. */
    parent;

    /**
     * @param {boolean}
     */
    #hasFocus;

    /** @returns {boolean} */
    get hasFocus() {
        return this.#hasFocus;
    }

    /**
     * Construct a new `View`, providing the `View's` parent.
     *
     * @param {AbstractView | null} parent
     */
    constructor(parent) {
        this.parent = parent;
        this.#hasFocus = false;
    }

    /**
     * @param {Recycler} _recycler The recycler to add to.
     */
    view(_recycler) {
    }

    /**
     * Notify the parent view of an event.
     * @param {ViewEvent} e The event.
     * @param {boolean} [dispatchToThis] Allow `this` view to handle
     *    the event. By default, `this` is not given a chance to
     *    handle the event.
     */
    notify(e, dispatchToThis) {
        if(dispatchToThis) {
            this.handleEvent(e);
        }

        let parent = this.parent;

        while(parent && e.bubbles) {
            if(parent.handleEvent(e)) break;
            parent = parent.parent;
        }
    }

    /**
     * Handle an event.
     *
     * @param {ViewEvent} e
     * @returns {boolean} `true` if the event should stop propagating
     *     (i.e. it was handled by this view), or `false` if the event
     *     should continue to bubble up the view tree.
     */
    handleEvent(e) {
        return this.handleLostFocusViewEvent(e) || this.handleReceivedFocusViewEvent(e);
    }

    /**
     * Request that the view re-draw itself.
     */
    requestRedraw () {
        this.notify(new RedrawViewEvent(this));
    }

    /**
     * Request that this view receive focus.
     */
    requestFocus() {
        this.notify(new RequestFocusViewEvent(this));
    }

    /**
     * Notify the views above us that a view was deleted from the
     * tree.
     *
     * @param {AbstractView} view The view which was deleted.
     */
    notifyViewDeleted(view) {
        this.notify(new ViewDeletedViewEvent(this, view));
    }

    /**
     * Handle a recieved focus event, updating this view's own
     * `isFocused` property.
     *
     * @param {ViewEvent} e
     * @returns {boolean} `true` if the event was a
     *   `ReceivedFocusViewEvent`, and `false` otherwise.
     */
    handleReceivedFocusViewEvent(e) {
        if(e instanceof ReceivedFocusViewEvent) {
            this.#hasFocus = true;
            return true;
        }
        return false;
    }

    /**
     * Handle a lost focus event, updating this view's own `isFocused`
     * property.
     *
     * @param {ViewEvent} e
     * @returns {boolean} `true` if the event was a `LostFocusEvent`,
     *     and `false` otherwise.
     */
    handleLostFocusViewEvent(e) {
        if(e instanceof LostFocusViewEvent) {
            this.#hasFocus = false;
            return true;
        }
        return false;
    }
}
