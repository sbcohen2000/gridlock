import { Recycler } from "../framework/index.js";
import { AbstractView } from "./abstract-view.js";
import { AbstractStatefulView } from "./abstract-stateful-view.js";

const HISTORY_LEN = 10; // seconds
const TO_MILLIS = 1000; // seconds -> milliseconds.

type RedrawDebugViewState = {
    /**
     * The wall-clock time of the redraw in milliseconds.
     */
    time: number,
    /**
     * The percent of HTML elements which were recycled in the redraw.
     */
    pctRecycled: number,
}[];

export class RedrawDebugView extends AbstractStatefulView<RedrawDebugViewState> {
    constructor(parent: AbstractView | null) {
        super(
            parent,
            [],
            ["redraw_debug_view_state"]
        );
    }

    *#forEachBarInPlot(
        canvasWidth: number,
        canvasHeight: number,
    ): Generator<{ x: number, yMiddle: number }> {
        const xscl = canvasWidth / (HISTORY_LEN * TO_MILLIS); // px / ms
        const now = new Date().getTime();

        for(const record of this.state) {
            const msAgo = now - record.time;
            const x = canvasWidth - (msAgo * xscl);

            /**
             * yMiddle is the point at which we should draw a
             * different color.
             */
            const yMiddle = record.pctRecycled * canvasHeight;
            yield { x, yMiddle };
        }
    }

    view(r: Recycler) {
        r.elem("canvas", canvasElem => {
            canvasElem.width = 40;
            canvasElem.height = 10;
            const ctx = canvasElem.getContext("2d");

            ctx.beginPath();
            for(const { x, yMiddle } of this.#forEachBarInPlot(canvasElem.width, canvasElem.height)) {
                ctx.moveTo(x, canvasElem.height);
                ctx.lineTo(x, yMiddle);
            }
            ctx.strokeStyle = "red";
            ctx.stroke();

            ctx.beginPath();
            for(const { x, yMiddle } of this.#forEachBarInPlot(canvasElem.width, canvasElem.height)) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, yMiddle);
            }
            ctx.strokeStyle = "gray";
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
        const now = new Date().getTime();
        this.setState(oldSt =>
            // Only keep records from no greater than 10 seconds ago
            oldSt.filter(({ time }) => now - time < HISTORY_LEN * TO_MILLIS).concat({
                time: now,
                pctRecycled
            }),
            false
        );
    }
}
