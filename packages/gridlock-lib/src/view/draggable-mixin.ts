import { DragState } from "./drag-state.js";

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * The interface of the class which mixes-in `Draggable`.
 */
interface DraggableBase {

}

export function Draggable<T extends Constructor<DraggableBase>>(Base: T) {
    return class Draggable extends Base {

    }
}
