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
     * Find the difference in grid coordinates between the x-position
     * of the drag start and the x-position of the cursor.
     */
    dxGrid(e: PointerEvent) {
        return this.#st.dragOriginGrid.x + Math.round(this.dxPx(e) / this.#st.gridScale.dx)
    }

    /**
     * Find the difference in pixels between the y-position of the
     * drag start and the y-position of the cursor.
     */
    dyPx(e: PointerEvent) {
        return e.clientY - this.#st.dragOriginPx.y;
    }

    /**
     * Find the difference in grid coordinates between the y-position
     * of the drag start and the y-position of the cursor.
     */
    dyGrid(e: PointerEvent) {
        return this.#st.dragOriginGrid.y + Math.round(this.dyPx(e) / this.#st.gridScale.dy)
    }
}
