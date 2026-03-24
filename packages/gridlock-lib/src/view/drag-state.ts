import * as point from "../point.js";

export interface DragStateInitializer {
    /** The position of the drag in client coordinates. */
    dragOriginPx: point.P2;
    /** The position of the drag in grid coordinates. */
    dragOriginGrid: point.P2;
    /** The number of pixels in each grid cell. */
    gridScale: point.V2;
    /** The pointer id. It will only ever be captured on the root
     * element of the editor (called `this._root` in subclasses of
     * `AbstractEditorView`. */
    pointerId: number;
}

export class DragState {
    #st: DragStateInitializer;

    constructor(init: DragStateInitializer) {
        this.#st = { ...init };
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
     * Find the difference in pixels between the x-position of the
     * drag start and the x-position of the cursor.
     */
    dxPx(e: PointerEvent) {
        return e.clientX - this.#st.dragOriginPx.x;
    }

    /**
     * Find the x-position of the current drag position in grid
     * coordiantes.
     *
     * The second argument is an optional function which determines
     * how a decimal coordiante will be turned into an integer
     * one. (The default is rounding).
     */
    gridX(e: PointerEvent, intoInt: (a: number) => number = Math.round) {
        return this.#st.dragOriginGrid.x + intoInt(this.dxPx(e) / this.#st.gridScale.dx)
    }

    /**
     * Find the difference in pixels between the y-position of the
     * drag start and the y-position of the cursor.
     */
    dyPx(e: PointerEvent) {
        return e.clientY - this.#st.dragOriginPx.y;
    }

    /**
     * Find the y-position of the current drag position in rounded
     * grid coordinates.
     *
     * The second argument is an optional function which determines
     * how a decimal coordinate will be turned into an integer
     * one. (The default is rounding).
     */
    gridY(e: PointerEvent, intoInt: (a: number) => number = Math.round) {
        return this.#st.dragOriginGrid.y + intoInt(this.dyPx(e) / this.#st.gridScale.dy)
    }
}
