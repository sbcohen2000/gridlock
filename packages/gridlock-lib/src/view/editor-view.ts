import { AbstractEditorView, AbstractEditorViewState, mkInitialEditorViewState } from "./abstract-editor-view.js";
import { AbstractView } from "./abstract-view.js";
import { AnyState } from "../state/state-iface.js";
import { DiscriminatingViewBuilder } from "./stateful-discriminating-view.js";
import { TextEditingView } from "./text-editing-view.js";
import { CellEditingView } from "./cell-editing-view.js";
import { CellSlicingView } from "./cell-slicing-view.js";
import { RowSlicingView } from "./cell-slicing-view.js";
import { MoveCellBoundaryView, MoveRowBoundaryView, SlideCellBoundaryView, SlideRowBoundaryView } from "./edge-editing-view.js";
import { AbstractStatefulView } from "./abstract-stateful-view.js";

export type AnyEditorView = AbstractStatefulView<AbstractEditorViewState>;

export function EditorView(parent: AbstractView | null, editorState: AnyState): AnyEditorView {
    return new DiscriminatingViewBuilder<AbstractEditorViewState>(parent,
        mkInitialEditorViewState(editorState),
        [ "editor-view" ]
    )
        .or(TextEditingView.fromAbstractViewState)
        // .or(CellEditingView.fromAbstractViewState)
        // .or(RowSlicingView.fromAbstractViewState)
        // .or(CellSlicingView.fromAbstractViewState)
        // .or(SlideCellBoundaryView.fromAbstractViewState)
        .or(MoveCellBoundaryView.fromAbstractViewState)
        // .or(SlideRowBoundaryView.fromAbstractViewState)
        // .or(MoveRowBoundaryView.fromAbstractViewState)
        .build();
}
