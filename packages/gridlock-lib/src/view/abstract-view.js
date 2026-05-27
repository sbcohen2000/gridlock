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
 * Notify that a view was deleted, and optionally inform our parent of
 * a view which replaced it, and should receive the deleted view's
 * focus status, if it had any.
 */
export class ViewDeletedViewEvent extends ViewEvent {
    /** @type {AbstractView} */
    #deletedView;
    /** @type {AbstractView | null} */
    #replacementView;

    /**
     * @param {AbstractView} initiator
     * @param {AbstractView} deletedView
     * @param {AbstractView} [replacementView]
     */
    constructor(initiator, deletedView, replacementView) {
        super(initiator, true);
        this.#deletedView = deletedView;
        this.#replacementView = replacementView ?? null;
    }

    /** @returns {AbstractView} */
    get deletedView() { return this.#deletedView; }
    /** @returns {AbstractView} */
    get replacementView() { return this.#replacementView; }
}

export class AbstractView {
    /** @type {AbstractView | null}
     *
     * The parent view, or `null`, if this view is topmost. */
    parent;

    /**
     * Construct a new `View`, providing the `View's` parent.
     *
     * @param {AbstractView | null} parent
     */
    constructor(parent) {
        this.parent = parent;
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
     * @param {ViewEvent} _e
     * @returns {boolean} `true` if the event should stop propagating
     *     (i.e. it was handled by this view), or `false` if the event
     *     should continue to bubble up the view tree.
     */
    handleEvent(_e) {
        return false;
    }

    /**
     * Request that the view re-draw itself.
     */
    requestRedraw () {
        this.notify(new RedrawViewEvent(this));
    }

    /**
     * Notify the views above us that a view was deleted from the
     * tree.
     *
     * @param {AbstractView} deletedView The view which was deleted.
     * @param {AbstractView} [replacementView] The view which replaced
     *     the deleted view, if any.
     */
    notifyViewDeleted(deletedView, replacementView) {
        this.notify(new ViewDeletedViewEvent(this, deletedView, replacementView));
    }
}
