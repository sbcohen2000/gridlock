import { Recycler } from "../framework/framework.js";
import { AbstractView } from "./abstract-view.js";

export class FillCharPreviewView extends AbstractView {
    view(r: Recycler) {
        r.elem("span", spanElem => {
            spanElem.innerText = "working";
        });
    }
}
