import * as state from "./editor.js";

/**
 * @typedef {{
 *  initiator: View
 * }} EventInitiator
 */

/**
 * @typedef {{
 *  bubbles: boolean
 * }} EventBase
 */

/**
 * Notify the parent that a child view would like to redraw.
 *
 * @typedef {{
 *   type: "RedrawEvent"
 *   bubbles: true
 * } & EventBase} RedrawEvent
 */

/**
 * Notify that a view wants to receive focus.
 *
 * @typedef {{
 *   type: "RequestFocusEvent",
 *   bubbles: true
 * } & EventBase} RequestFocusEvent
 */

/**
 * Notify that a keyboard key was pressed.
 *
 * @typedef {{
 *   type: "KeyEvent",
 *   e: KeyboardEvent
 *   bubbles: true
 * } & EventBase} KeyEvent
 */

/**
 * Notify that a view was deleted.
 *
 * @typedef {{
 *   type: "ViewDeletedEvent",
 *   view: View
 *   bubbles: true
 * } & EventBase} ViewDeletedEvent
 */

/**
 * Notify a view that it recieved focus.
 *
 * @typedef {{
 *   type: "ReceivedFocusEvent",
 *   bubbles: false
 * } & EventBase} RecievedFocusEvent
 */

/**
 * @typedef {{
 *  type: "ReplaceEditorViewEvent",
 *  newState: state.EditorState
 *  bubbles: true
 * } & EventBase} ReplaceEditorViewEvent
 */

/**
 * @typedef {RedrawEvent
 *  | ReplaceEditorViewEvent
 *  | KeyEvent
 *  | ViewDeletedEvent
 *  | RecievedFocusEvent
 *  | RequestFocusEvent
 *  } Event
 */

export class View {
    /** @type {View | null}
     *
     * The parent view, or `null`, if this view is topmost. */
    #parent;

    /**
     * @returns {View | null}
     */
    get parent() {
        return this.#parent;
    }

    /**
     * Construct a new `View`, providing the `View's` parent.
     *
     * @param {View | null} parent
     */
    constructor(parent) {
        this.#parent = parent;
    }

    /**
     * @virtual
     * @param {HTMLElement} [prev] An existing element to update in place.
     * @returns {HTMLElement}
     */
    view(prev) {
        return prev ?? document.createElement("div");
    }

    /**
     * Notify the parent view of an event.
     * @param {Event} e The event.
     * @param {boolean} [dispatchToThis] Allow `this` view to handle
     *    the event. By default, `this` is not given a chance to
     *    handle the event.
     */
    notify(e, dispatchToThis) {
        const withInitiator = { ...e, initiator: this };

        if(dispatchToThis) {
            this.handleEvent(withInitiator);
        }

        let parent = this.#parent;

        while(parent && e.bubbles) {
            if(parent.handleEvent(withInitiator)) break;
            parent = parent.parent;
        }
    }

    /**
     * Handle an event.
     *
     * @param {Event & EventInitiator} e
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
        this.notify({ type: "RedrawEvent", bubbles: true });
    }

    /**
     * Request that this view receive focus.
     */
    requestFocus() {
        this.notify({ type: "RequestFocusEvent", bubbles: true });
    }

    /**
     * Notify the views above us that a view was deleted from the
     * tree.
     *
     * @param {View} view The view which was deleted.
     */
    notifyViewDeleted(view) {
        this.notify({ type: "ViewDeletedEvent", view, bubbles: true });
    }
}
