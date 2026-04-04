import { Recycler } from "../framework/index.js";
import { AbstractView } from "./abstract-view.js";
import { AbstractStatefulView } from "./abstract-stateful-view.js";

type RedrawDebugViewState = {
    data: {
        time: Date,
        pctRecycled: number
    }[];
}

export class RedrawDebugView extends AbstractStatefulView<RedrawDebugViewState> {
    constructor(parent: AbstractView | null) {
        super(
            parent,
            { data: [] },
            ["redraw_debug_view_state"]
        );
    }

    viewState(r: Recycler, st: RedrawDebugViewState) {
        r.elem("canvas", canvasElem => {
            canvasElem.width = 40;
            canvasElem.height = 10;
            const ctx = canvasElem.getContext("2d");

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(40, 10);
            ctx.stroke();
        });
    }

    /**
     * Record that a redraw has occurred.
     *
     * @param pctRedrawn Is the percent (on [0, 1]) of the HTML
     * elements which were recycled from the previous render.
     */
    recordRedraw(pctRecycled: number) {
        const date = new Date();
    }
}
