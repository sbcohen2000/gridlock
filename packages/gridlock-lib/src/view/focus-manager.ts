import * as util from "../util.js";
import { Recycler } from "../framework/framework.js";
import { AbstractView, ViewDeletedViewEvent, ViewEvent } from "./abstract-view.js";

/**
 * Notify that a view wants to receive focus.
 */
export class RequestFocusViewEvent extends ViewEvent {
    constructor(initiator: AbstractView) { super(initiator, true); }
}

/**
 * Notify that a view wants its focus to be released.
 */
export class ReleaseFocusViewEvent extends ViewEvent {
    constructor(initiator: AbstractView) { super(initiator, true); }
}

/**
 * Notify a view that it received focus.
 */
export class ReceivedFocusViewEvent extends ViewEvent {
    constructor(initiator: AbstractView) { super(initiator, false); }
}

export class LostFocusViewEvent extends ViewEvent {
    constructor(initiator: AbstractView) { super(initiator, false); }
}

export class FocusManager<C extends AbstractView> extends AbstractView {
    child: C;
    #focusedView: AbstractView | null;

    constructor(parent: AbstractView, child: (mgr: FocusManager<C>) => C) {
        super(parent);
        this.child = child(this);
    }

    view(recycler: Recycler) {
        this.child.view(recycler);
    }

    get focusedView(): AbstractView {
        return this.#focusedView;
    }

    /**
     * Set the currently focused view, dispatching the appropriate
     * events.
     */
    set focusedView(v: AbstractView) {
        if(this.#focusedView !== v) {
            let oldFocusedView = this.#focusedView;
            this.#focusedView = v;

            if(oldFocusedView) {
                oldFocusedView.notify(new LostFocusViewEvent(this), true);
            }

            util.assert(this.#focusedView instanceof AbstractView, "The focused view is not a view.");
            this.#focusedView.notify(new ReceivedFocusViewEvent(this), true);
        }
    }

    handleEvent(e: ViewEvent): boolean {
        if (e instanceof ViewDeletedViewEvent) {
            if(this.#focusedView === e.deletedView) {
                if(e.replacementView) {
                    // If the deleted view was replaced with a
                    // different one, focus the new view.
                    this.focusedView = e.replacementView;
                } else {
                    // Otherwise, focus ourselves.
                    this.focusedView = this;
                }
            }
            return true;
        } else if (e instanceof RequestFocusViewEvent) {
            if(this.#focusedView !== e.initiator) {
                this.focusedView = e.initiator;
                this.requestRedraw();
            }
            return true;
        } else if (e instanceof ReleaseFocusViewEvent) {
            if(this.#focusedView === e.initiator) {
                this.focusedView = this;
                this.requestRedraw();
            }
        }
        return false;
    }
}

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * The interface of the class which mixes-in `Focusable`.
 */
type FocusableBase = {
    /**
     * A focusable view must be able to get its parent (so that we can
     * look for the nearest `FocusManager`).
     */
    get parent(): AbstractView;
} & AbstractView;

export function Focusable<T extends Constructor<FocusableBase>>(Base: T) {
    return class Focusable extends Base {
        /**
         * Find the nearest `FocusManager` above us, or `null` if
         * there is no `FocusManager` above us.
         */
        #findFocusManager(): FocusManager<any> | null {
            let fcs: AbstractView | null = this;
            while((fcs = fcs.parent) !== null) {
                if(fcs instanceof FocusManager) {
                    return fcs;
                }
            }
            return null;
        }

        /**
         * Test if this view has focus.
         */
        hasFocus(): boolean {
            const mgr = this.#findFocusManager();
            return mgr && mgr.focusedView === this;
        }

        /**
         * Request that this view receive focus.
         */
        requestFocus() {
            this.notify(new RequestFocusViewEvent(this));
        }

        /**
         * Request that this view release focus.
         */
        releaseFocus() {
            this.notify(new ReleaseFocusViewEvent(this));
        }
    }
}
