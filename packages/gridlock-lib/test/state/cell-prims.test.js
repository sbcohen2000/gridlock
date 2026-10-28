import * as fc from "fast-check";
import * as grid from "../../src/grid.js";
import * as point from "../../src/point.js";
import * as rect from "../../src/rect.js";
import { arbCellGrid } from "../arbitrary-cell-grid.js";
import { checkGridInvariants } from "../../src/state/state-iface.js";
import { expect } from "chai";
import { serialize, CellPrims } from "../../src/state/index.js";

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
            st.selectCellUnderPoint(point.mkP2(0, 0));
            expect(st.selection.length).to.equal(1);
        });

        it("Adds to the current selection when clear is false", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.selectCellUnderPoint(point.mkP2(6, 0), false);
            expect(st.selection.length).to.equal(2);
        });

        it("Removes from the selection when clear is true", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.selectCellUnderPoint(point.mkP2(6, 0), true);
            expect(st.selection.length).to.equal(1);
        });
    });

    describe("mergeSelectedCells", () => {
        it("Can merge rows with occluded content", () => {
            const src =
                  "ABoAGgAlAAEAJQAwAAEAMAA7AAEAOwBGAAEARgBIAAYAAAAAIABIAEwABgAAAAEgAEwAUAAGAAAAAyAAUABUAAYAAAAFIAABAAEAAQABAAEAAQAB\n" +
                  "a     \n" +
                  "b     \n" +
                  "c     \n" +
                  "d     \n" +
                  "e     \n" +
                  "f     \n" +
                  "g     "

            const st = CellPrims.editCells({ grid: serialize.parseCompactGrid(src) });
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.selectCellUnderPoint(point.mkP2(0, 1));
            st.selectCellUnderPoint(point.mkP2(0, 2));
            st.selectCellUnderPoint(point.mkP2(0, 3));
            st.mergeSelectedCells();

            const exp =
                  "AAgACAATAAQAEwAhAAYAAAAAIAABAAEAAQABAAEAAQAB\n" +
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

        it("Can merge a single cell", () => {
            const src =
                  "hello\n" +
                  "+-----+\n" +
                  "+-----+";

            const st = CellPrims.editCells({ grid: serialize.parseCommonState(src) });
            // Select the cell
            st.selectCellUnderPoint(point.mkP2(0, 0));

            expect(st.canMergeSelectedCells()).to.be.true;
            st.mergeSelectedCells();

            expect(serialize.printCommonState(st)).to.equal(src);
        });

        it("Can merge cells across multiple rows", () => {
            const src =
                  "a   b    c\n" +
                  "\n"           +
                  "d   e\n"      +
                  "\n"           +
                  "+---+----+----+\n" +
                  "|   |    |    |\n" +
                  "+---+----+----+\n" +
                  "|   |         |\n" +
                  "+---+---------+"

            const st = CellPrims.editCells({ grid: serialize.parseCommonState(src) });
            // Select the entire first row.
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.selectCellUnderPoint(point.mkP2(4, 0));
            st.selectCellUnderPoint(point.mkP2(9, 0));
            // Select the last cell in the second row.
            st.selectCellUnderPoint(point.mkP2(4, 2));

            expect(st.canMergeSelectedCells()).to.be.true;
            st.mergeSelectedCells();

            const exp =
                  "a   b    c\n" +
                  "\n"           +
                  "d   e\n"      +
                  "\n"           +
                  "+-------------+\n" +
                  "|             |\n" +
                  "+---+---------+\n" +
                  "|   |         |\n" +
                  "+---+---------+"

            expect(serialize.printCommonState(st)).to.equal(exp);
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

    describe("replaceCellContent", () => {
        it("Leaves a cell unchanged when moved onto itself", () => {
            const src =
                  "hello there\n" +
                  "+-----+-----+\n" +
                  "+-----+-----+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            const [cell] = st.selection;
            st.replaceCellContent(cell);

            expect(serialize.printCommonState(st)).to.equal(src);
            expect(st.selection).to.deep.equal([cell]);
        });
    })

    describe("copySubgrid", () => {
        it("Copies the selected cells so that they can be pasted", () => {
            const src =
                  "ab cd ef\n"    +
                  "+--+--+--+\n"  +
                  "+--+--+--+";

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(3, 0));
            st.selectCellUnderPoint(point.mkP2(6, 0));
            const clipping = st.copySubgrid();

            const target = mkCellState(
                  "xyz\n"      +
                  "+------+\n" +
                  "+------+");
            target.selectCellUnderPoint(point.mkP2(0, 0));
            target.pasteSubgrid(serialize.tryParseCompactGrid(clipping));

            const exp =
                  "cd ef\n"    +
                  "+--+---+\n" +
                  "+--+---+";
            expect(serialize.printCommonState(target)).to.equal(exp);
        });

        it("Returns undefined when the selection is not a rectangle", () => {
            const st = mkCellState(
                  "ab cd\n"   +
                  "\n"        +
                  "+--+--+\n" +
                  "+--+--+\n" +
                  "+--+--+");
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.selectCellUnderPoint(point.mkP2(0, 1));

            expect(st.copySubgrid()).to.be.undefined;
        });
    })

    describe("pasteSubgrid", () => {
        it("Pastes a subgrid over the selected cell", () => {
            const src =
                  "abc\n"      +
                  "+------+\n" +
                  "+------+";
            const subgrid = serialize.parseCommonState(
                  "ab cd\n"    +
                  "+--+--+\n"  +
                  "+--+--+");

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.pasteSubgrid(subgrid);

            const exp =
                  "ab cd\n"    +
                  "+--+---+\n" +
                  "+--+---+";
            expect(serialize.printCommonState(st)).to.equal(exp);
            expect(st.selection).to.deep.equal([{ rowNo: 0, colNo: 0 }, { rowNo: 0, colNo: 1 }]);
        });

        it("Pads pasted cells to the height of the row", () => {
            const src =
                  "abc\n"      +
                  "def\n"      +
                  "+------+\n" +
                  "|      |\n" +
                  "+------+";
            const subgrid = serialize.parseCommonState(
                  "xy\n"   +
                  "+--+\n" +
                  "+--+");

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.pasteSubgrid(subgrid);

            const exp =
                  "xy\n"       +
                  "\n"         +
                  "+------+\n" +
                  "|      |\n" +
                  "+------+";
            expect(serialize.printCommonState(st)).to.equal(exp);
            expect(checkGridInvariants(st)).to.be.true;
        });

        it("Does not share data with the subgrid", () => {
            const subgrid = serialize.parseCommonState(
                  "xy\n"   +
                  "+--+\n" +
                  "+--+");

            const st = mkCellState(
                  "abc\n"      +
                  "+------+\n" +
                  "+------+");
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.pasteSubgrid(subgrid);

            grid.lookupCell(st.grid, { rowNo: 0, colNo: 0 }).data.lines[0] = "changed";
            expect(subgrid.rows[0].cells[0].data.lines).to.deep.equal(["xy"]);
        });

        it("Does nothing when the subgrid does not fit", () => {
            const src =
                  "abc\n"   +
                  "+---+\n" +
                  "+---+";
            const subgrid = serialize.parseCommonState(
                  "abcde\n"    +
                  "++++++\n"   +
                  "++++++");

            const st = mkCellState(src);
            st.selectCellUnderPoint(point.mkP2(0, 0));
            st.pasteSubgrid(subgrid);

            expect(serialize.printCommonState(st)).to.equal(src);
            expect(st.selection).to.deep.equal([{ rowNo: 0, colNo: 0 }]);
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
