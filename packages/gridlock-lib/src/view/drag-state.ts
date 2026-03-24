import * as point from "../point.js";

/**
 * The default threshold in pixels under which we will consider a drag
 * to be a click.
 */
const DEFAULT_DRAG_THRESHOLD = 3;

export interface DragStateInitializer {
    /** The position of the drag in client coordinates. */
    dragOriginPx: point.P2;
    /** The position of the drag in grid coordinates. */
    dragOriginGrid: point.P2;
    /** The number of pixels in each grid cell. */
    gridScale: point.V2;
    /** The pointer id. It will only ever be captured on the root
     * element of the editor (called `this._root` in subclasses of
     * `AbstractEditorView`.
     */
    pointerId: number;
    /**
     * A function which will be run if a drag started by `startDrag`
     * didn't qualify as a drag. It is passed the pointer-up event.
     */
    onClick?: (e: PointerEvent) => void;
    /**
     * The threshold in pixels under which we will consider a drag to
     * be a click. It defaults to 3px.
     */
    dragThreshold?: number;
}

export class DragState {
    #st: DragStateInitializer;

    /**
     * The distance we've dragged, tracked for the purposes of
     * classifying this drag as a click.
     */
    #d: number;

    /** The distance from the drag origin, in pixels. */
    #dPx: point.P2;

    constructor(init: DragStateInitializer) {
        this.#st = { ...init };
        this.#d = 0;
        this.#dPx = point.mkOrigin();
    }

    /**
     * Update the drag state with a new pointer event.
     */
    update(e: PointerEvent) {
        const d = point.mkP2(
            e.clientX - this.#st.dragOriginPx.x,
            e.clientY - this.#st.dragOriginPx.y,
        );

        this.#d += point.distance(d, this.#dPx);
        this.#dPx = d;
    }

    /**
     * Get the captured pointerId.
     */
    get pointerId(): number {
        return this.#st.pointerId;
    }

    /**
     * Find the location of the drag origin in grid coordiantes.
     */
    get dragOriginGrid(): point.P2 {
        return this.#st.dragOriginGrid;
    }

    /**
     * Get the `onClick` handler for this `DragState`, or `undefined`
     * if no `onClick` handler was attached.
     */
    get onClick(): ((e: PointerEvent) => void) | undefined {
        return this.#st.onClick;
    }

    /**
     * Find the difference in pixels between the position of the drag
     * start and the position of the cursor.
     */
    get dPx() {
        return this.#dPx;
    }

    /**
     * Find the position of the current drag position in grid
     * coordiantes.
     *
     * The second argument is an optional function which determines
     * how a decimal coordiante will be turned into an integer
     * one. (The default is rounding).
     */
    dGrid(intoInt: (a: number) => number = Math.round): point.P2 {
        return point.offset(this.#st.dragOriginGrid,
            point.mkV2(
                intoInt(this.dPx.x / this.#st.gridScale.dx),
                intoInt(this.dPx.y / this.#st.gridScale.dy)
            )
        );
    }

    /**
     * Get this drag's drag threshold.
     */
    get dragThreshold(): number {
        return this.#st.dragThreshold ?? DEFAULT_DRAG_THRESHOLD;
    }

    /**
     * Should this drag be considered a click?
     */
    get isClick(): boolean {
        return this.#d < this.dragThreshold;
    }
}
