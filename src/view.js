export class ViewEvent {
    /**
     * The view which initiated the event
     * @type {View}
     */
    #initiator;

    /**
     * Should the view bubble to its parent?
     */
    #bubbles;

    /**
     * @param {View} initiator
     * @param {boolean} bubbles
     */
    constructor(initiator, bubbles) {
        this.#initiator = initiator;
        this.#bubbles = bubbles;
    }

    /** @returns {View} */
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
    /** @param {View} initiator */
    constructor(initiator) { super(initiator, true); }
}

/**
 * Notify that a view wants to receive focus.
 */
export class RequestFocusViewEvent extends ViewEvent {
    /** @param {View} initiator */
    constructor(initiator) { super(initiator, true); }
}

/**
 * Notify that a keyboard key was pressed.
 */
export class KeyViewEvent extends ViewEvent {
    /** @type {KeyboardEvent} */
    #e;

    /**
     * @param {View} initiator
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
    /** @type {View} */
    #view;

    /**
     * @param {View} initiator
     * @param {View} view
     */
    constructor(initiator, view) {
        super(initiator, true);
        this.#view = view;
    }

    /** @returns {View} */
    get view() { return this.#view; }
}

/**
 * Notify a view that it received focus.
 */
export class ReceivedFocusViewEvent extends ViewEvent {
    /** @param {View} initiator */
    constructor(initiator) { super(initiator, false); }
}

export class View {
    /** @type {View | null}
     *
     * The parent view, or `null`, if this view is topmost. */
    parent;

    /**
     * Construct a new `View`, providing the `View's` parent.
     *
     * @param {View | null} parent
     */
    constructor(parent) {
        this.parent = parent;
    }

    /**
     * @param {HTMLElement} [prev] An existing element to update in place.
     * @returns {HTMLElement}
     */
    view(prev) {
        return prev ?? document.createElement("div");
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
        void e;
        return false;
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
     * @param {View} view The view which was deleted.
     */
    notifyViewDeleted(view) {
        this.notify(new ViewDeletedViewEvent(this, view));
    }
}
