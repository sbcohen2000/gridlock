import { Recycler } from "../framework/index.js";
import { Stateful, StateView } from "./stateful-mixin.js";
import { AbstractView } from "./abstract-view.js";

type RedrawDebugViewState = {
    redraws: number;
}

class _RedrawDebugView extends AbstractView {
    viewState(r: Recycler, v: StateView<RedrawDebugViewState>) {
        r.elem("span", spanElem => {
            spanElem.innerText = v.state.redraws.toString();
            spanElem.onclick = () => {
                v.setState(({ redraws }) => ({ redraws: redraws + 1 }));
            };
        });
    }

    path = ["redraw_debug_view_state"];
}

export const RedrawDebugView = Stateful(_RedrawDebugView, {
    redraws: 0,
});
