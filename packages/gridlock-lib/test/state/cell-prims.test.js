import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import { serialize, CellPrims } from "../../src/state/index.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { expect } from "chai";
import { checkGridInvariants } from "../../src/state/state-iface.js";

/**
 * Create a CellPrims from a cell-grid string.
 *
 * @param {string} src
 * @returns {CellPrims}
 */
function mkCellState(src) {
    const textState = serialize.textEditingStateFromCommonStateStr(src);
    return CellPrims.editCells(textState);
}

describe("cell-prims", () => {
    describe("selectCellUnderPoint", () => {
        it("Selects a leaf in a single-leaf grid", () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            expect(st.selection.length).to.equal(1);
        });

        it("Accumulates cells when clear is false", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            st.selectCellUnderPoint(point.mkP2(6, 0), false);
            expect(st.selection.length).to.equal(2);
        });

        it("Replaces selection when clear is true", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0), true);
            st.selectCellUnderPoint(point.mkP2(6, 0), true);
            expect(st.selection.length).to.equal(1);
        });
    });

    describe("mergeSelectedCells", () => {
        it("Can merge rows with occluded content", () => {
            const src =
                  "ABoAGgAkAAEAJAAuAAEALgA4AAEAOABCAAEAQgBEAAYAAAAAAEQASAAGAAAAAQBIAEwABgAAAAMATABQAAYAAAAFAAEAAQABAAEAAQABAAE=\n" +
                  "a     \n" +
                  "b     \n" +
                  "c     \n" +
                  "d     \n" +
                  "e     \n" +
                  "f     \n" +
                  "g     "

            const st = CellPrims.editCells({ grid: serialize.parseCompactGrid(src) });
            st.selectCellUnderPoint(point.mkP2(0, 0), false);
            st.selectCellUnderPoint(point.mkP2(0, 1), false);
            st.selectCellUnderPoint(point.mkP2(0, 2), false);
            st.selectCellUnderPoint(point.mkP2(0, 3), false);
            st.mergeSelectedCells();

            const exp =
                  "AAgACAASAAQAEgAgAAYAAAAAAAEAAQABAAEAAQABAAE=\n" +
                  "a     \n" +
                  "b     \n" +
                  "c     \n" +
                  "d     \n" +
                  "e     \n" +
                  "f     \n" +
                  "g     "

            expect(serialize.printCompactGrid(st)).to.equal(exp);
            expect(checkGridInvariants(st)).to.be.true;
        });
    });

    describe("clearCellContents", () => {
        it("Preserves grid invariants", () => {
            fc.assert(
                fc.property(
                    arbCellGrid.chain(g => {
                        const allCells = [...grid.allCells(g)];
                        return fc.record({
                            grid: fc.constant(g),
                            selection: fc.subarray(allCells, { minLength: 1 }),
                        });
                    }),
                    ({ grid: g, selection }) => {
                        const st = CellPrims.editCells({ grid: g });
                        for(const cell of selection) {
                            st.addCell(cell);
                        }
                        st.clearCellContents();
                        expect(checkGridInvariants(st)).to.be.true;
                    }
                ),
                { numRuns: 1000 }
            );
        });
    })

    describe("deleteRows", () => {
        it("Preserves grid invariants", () => {
            fc.assert(
                fc.property(
                    arbCellGrid.chain(g => {
                        const allCells = [...grid.allCells(g)];
                        return fc.record({
                            grid: fc.constant(g),
                            selection: fc.subarray(allCells, { minLength: 1 }),
                        });
                    }),
                    ({ grid: g, selection }) => {
                        const st = CellPrims.editCells({ grid: g });
                        for(const cell of selection) {
                            st.addCell(cell);
                        }
                        st.deleteRows();
                        expect(checkGridInvariants(st)).to.be.true;
                    }
                ),
                { numRuns: 1000 }
            );
        });
    })
});
