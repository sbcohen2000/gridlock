import * as arbg from "./arbitrary-grid.js";
import * as fc from "fast-check";
import * as grid from "../src/grid";
import * as point from "../src/point.js";
import * as rect from "../src/rect.js";
import { expect } from "chai";

describe("transposeLines", () => {
    it("Can transpose the empty list", () => {
        expect(grid.transposeLines([])).to.deep.equal([]);
    });

    it("Can transpose a list with one row", () => {
        expect(grid.transposeLines(["hello"])).to.deep.equal(["h", "e", "l", "l", "o"]);
    });

    it("Throws on non-rectangular inputs", () => {
        expect(() => grid.transposeLines(["hello", "friend"])).to.throw();
    });

    it("Can transpose multi-line inputs", () => {
        expect(grid.transposeLines(["hello", "there"])).to.deep.equal(["ht", "eh", "le", "lr", "oe"]);
    });
});

describe("printASCII", () => {
    it("Can print a cell", () => {
        const act = grid.printASCII(grid.mk(2, 3));
        const exp =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+"
        expect(act).to.equal(exp);
    });

    it("Can print a more complex grid", () => {
        const act = grid.printASCII({
            type: "Grid",
            rows: [
                {
                    type: "Row",
                    cells: [
                        {
                            type: "Cell",
                            width: 3
                        },
                        {
                            type: "Cell",
                            width: 2,
                        }
                    ],
                    height: 4
                },
                {
                    type: "Row",
                    cells: [
                        {
                            type: "Cell",
                            width: 3
                        },
                        {
                            type: "Cell",
                            width: 2
                        }
                    ],
                    height: 2
                }
            ]
        });

        const exp =
              "+--+-+\n" +
              "|  | |\n" +
              "|  | |\n" +
              "|  | |\n" +
              "+--+-+\n" +
              "|  | |\n" +
              "+--+-+"
        expect(act).to.equal(exp);

    });
});

describe("parseASCII", () => {
    it("Can parse a small grid", () => {
        const src =
              "++\n" +
              "++";
        const g = grid.parseASCII(src)
        expect(g).to.deep.equal(
            grid.mk(1, 1)
        );
    });

    it("Can parse a cell", () => {
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+";
        const g = grid.parseASCII(src)
        expect(g).to.deep.equal(
            grid.mk(2, 3)
        );
    });

    it("Can parse a grid with a single vertical partition", () => {
        const src =
              "+-+---+\n" +
              "| |   |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        expect(g).to.deep.equal({
            type: "Grid",
            rows: [
                {
                    type: "Row",
                    height: 2,
                    cells: [
                        {
                            type: "Cell",
                            width: 2,
                        },
                        {
                            type: "Cell",
                            width: 4
                        }
                    ]
                }
            ]
        });
    });

    it("Can parse a grid with a single horizontal partition", () => {
        const src =
              "+-----+\n" +
              "+-----+\n" +
              "+-----+";

        const g = grid.parseASCII(src);
        expect(g).to.deep.equal({
            type: "Grid",
            rows: [
                {
                    type: "Row",
                    height: 1,
                    cells: [
                        {
                            type: "Cell",
                            width: 6
                        }
                    ]
                },
                {
                    type: "Row",
                    height: 1,
                    cells: [
                        {
                            type: "Cell",
                            width: 6
                        }
                    ]
                }
            ]
        });
    });

    it("Can parse a grid with some labels", () => {
        const src =
              "+-+---+\n" +
              "+-+---+\n" +
              "|a| b |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        const a = grid.cellWithLabel(g, "a")!;
        expect(grid.lookupCell(g, a).width).to.equal(2);

        const b = grid.cellWithLabel(g, "b")!;
        expect(grid.lookupCell(g, b).width).to.equal(4);

        const c = grid.cellWithLabel(g, "c");
        expect(c).to.be.undefined;
    });

    it("Can parse grids printed by printASCII", () => {
        fc.assert(
            fc.property(arbg.arbGrid, (g0) => {
                const src0 = grid.printASCII(g0);
                const g1 = grid.parseASCII(src0);
                const src1 = grid.printASCII(g1);
                expect(src0).to.equal(src1);
            }),
            {
                reporter(out) {
                    if(!out.failed) return;
                    const genericErrorMessage = fc.defaultReportMessage(out);
                    const src0 = grid.printASCII(out.counterexample![0]);
                    const g1   = grid.parseASCII(src0);
                    const src1 = grid.printASCII(g1);

                    throw new Error(`${genericErrorMessage}\nOriginal grid:\n${src0}\nAs parsed:\n${src1}`);
                }
            }
        )
    });
});

describe("arbitrary-grid", () => {
    it("Produces grids with consistent dimensions", () => {
        fc.assert(
            fc.property(arbg.arbGrid, (g) => {
                expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
            })
        )
    });
});

describe("rectOfCell", () => {
    it("Can find the location of a root cell", () => {
        const src =
              "+-+\n" +
              "| |\n" +
              "| |\n" +
              "+-+";

        const g = grid.parseASCII(src);
        expect(grid.rectOfCell(g, { rowNo: 0, colNo: 0 })).to.deep.equal(rect.fromXYWH(0, 0, 2, 3));
    });

    it("Can find the location of cells in a nested grid", () => {

        const src =
            "+-+-+\n" +
            "|a|b|\n" +
            "+-+-+\n" +
            "|c|d|\n" +
            "+-+-+";

        const g = grid.parseASCII(src);
        const a = grid.cellWithLabel(g, "a")!;
        const b = grid.cellWithLabel(g, "b")!;
        const c = grid.cellWithLabel(g, "c")!;
        const d = grid.cellWithLabel(g, "d")!;

        expect(grid.rectOfCell(g, a)).to.deep.equal(rect.fromXYWH(0, 0, 2, 2));
        expect(grid.rectOfCell(g, b)).to.deep.equal(rect.fromXYWH(2, 0, 2, 2));
        expect(grid.rectOfCell(g, c)).to.deep.equal(rect.fromXYWH(0, 2, 2, 2));
        expect(grid.rectOfCell(g, d)).to.deep.equal(rect.fromXYWH(2, 2, 2, 2));
    });
});

describe("cellUnderPoint", () => {
    it("Handles boundary points correctly", () => {
        const src =
            "+-+-+\n" +
            "|a|b|\n" +
            "+-+-+\n" +
            "|c|d|\n" +
            "+-+-+";

        const g = grid.parseASCII(src);
        const a = grid.cellWithLabel(g, "a");
        const b = grid.cellWithLabel(g, "b");
        const c = grid.cellWithLabel(g, "c");
        const d = grid.cellWithLabel(g, "d");

        // Points in 'a' (top-left, width=2, height=2)
        expect(grid.cellUnderPoint(g, point.mkP2(0, 0))).to.deep.equal(a);
        expect(grid.cellUnderPoint(g, point.mkP2(1, 1))).to.deep.equal(a);

        // Points in 'b' (top-right, starts at x=2)
        expect(grid.cellUnderPoint(g, point.mkP2(2, 0))).to.deep.equal(b);
        expect(grid.cellUnderPoint(g, point.mkP2(3, 1))).to.deep.equal(b);

        // Points in 'c' (bottom-left, starts at y=2)
        expect(grid.cellUnderPoint(g, point.mkP2(0, 2))).to.deep.equal(c);
        expect(grid.cellUnderPoint(g, point.mkP2(1, 3))).to.deep.equal(c);

        // Points in 'd' (bottom-right, starts at x=2, y=2)
        expect(grid.cellUnderPoint(g, point.mkP2(2, 2))).to.deep.equal(d);
        expect(grid.cellUnderPoint(g, point.mkP2(3, 3))).to.deep.equal(d);
    });
});

describe("mergeCells", () => {
    it("Can merge cells in a two-cell grid", () => {
        const src =
              "+-+---+\n" +
              "|a| b |\n" +
              "+-+---+";

        const g = grid.parseASCII(src);
        const la = grid.cellWithLabel(g, "a")!;
        const lb = grid.cellWithLabel(g, "b")!;

        const exp =
              "+-----+\n" +
              "|     |\n" +
              "+-----+";

        grid.mergeCells(g, [la, lb], null);
        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Can merge the cells in a grid with many cells", () => {
        let src =
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "+--+--+--+\n" +
            "|d |e |f |\n" +
            "+--+--+--+\n" +
            "|g    |h |\n" +
            "+-----+--+";

        const g  = grid.parseASCII(src);
        const la = grid.cellWithLabel(g, "a")!;
        const lb = grid.cellWithLabel(g, "b")!;
        const lc = grid.cellWithLabel(g, "c")!;
        const lg = grid.cellWithLabel(g, "g")!;
        const lh = grid.cellWithLabel(g, "h")!;


        // ----------------------------------------------------------
        let exp1 =
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|        |\n" +
            "+--------+";

        grid.mergeCells(g, [lg, lh], null);
        expect(grid.printASCII(g)).to.equal(exp1);

        // ----------------------------------------------------------
        let exp2 =
            "+--------+\n" +
            "|        |\n" +
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "+--+--+--+\n" +
            "|        |\n" +
            "+--------+";

        grid.mergeCells(g, [la, lb, lc], null);
        expect(grid.printASCII(g)).to.equal(exp2);

        // ----------------------------------------------------------
        let exp3 =
            "+--------+\n" +
            "|        |\n" +
            "|        |\n" +
            "|        |\n" +
            "|        |\n" +
            "|        |\n" +
            "+--------+";

        grid.mergeCells(g, [...grid.allCells(g)], null);
        expect(grid.printASCII(g)).to.equal(exp3);
    });

    it("Merging cells preserves grid consistency", () => {
        fc.assert(
            fc.property(
                arbg.arbGrid.chain((g) => {
                    const cells = [...grid.allCells(g)];
                    return fc.shuffledSubarray(cells).chain(someCells => fc.constant([g, someCells]))
                }),
                ([g, someCells]) => {
                    const nCells = [...grid.allCells(g)].length;
                    const someCellsR = rect.unions(someCells.map(cell => grid.rectOfCell(g, cell)));

                    // If the cells are valid to merge...
                    fc.pre(grid.canMergeCells(g, someCells));

                    // Then merging the cells should result in
                    // another well-formed grid.
                    const newCell = grid.mergeCells(g, someCells, null);

                    expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;

                    const newCellR = grid.rectOfCell(g, newCell);
                    expect(newCellR).to.deep.equal(someCellsR);

                    expect([...grid.allCells(g)].length).to.equal(nCells - someCells.length + 1);
                }));
    });
});

describe("splitRow", () => {
    it("Splits a root cell into top and bottom", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+"
        );

        grid.splitRow(g, { rowNo: 0 }, 2);

        const exp =
              "+--+\n" +
              "|  |\n" +
              "+--+\n" +
              "|  |\n" +
              "+--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Can split a row with multiple cells (1)", () => {
        const g = grid.parseASCII(
            "+--+--+--+\n" +
            "|  |  |  |\n" +
            "+--+--+--+"
        );

        grid.splitRow(g, { rowNo: 0 }, 1);

        const exp =
              "+--+--+--+\n" +
              "+--+--+--+\n" +
              "+--+--+--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Can split a row with multiple cells (2)", () => {
        const g = grid.parseASCII(
            "+--+-----+\n" +
            "|  |     |\n" +
            "+--+--+--+\n" +
            "|     |  |\n" +
            "+-----+--+"
        );

        grid.splitRow(g, { rowNo: 1 }, 1);

        const exp =
              "+--+-----+\n" +
              "|  |     |\n" +
              "+--+--+--+\n" +
              "+-----+--+\n" +
              "+-----+--+"

        expect(grid.printASCII(g)).to.equal(exp);
    });
});

describe("splitCell", () => {
    it("Splits a nested cell", () => {
        const g = grid.parseASCII(
            "+-+---+\n" +
            "| |b  |\n" +
            "| |   |\n" +
            "+-+---+"
        );

        const b = grid.cellWithLabel(g, "b")!;
        grid.splitCell(g, b, 1);

        const exp =
            "+-++--+\n" +
            "| ||  |\n" +
            "| ||  |\n" +
            "+-++--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Can split a cell in a multi-row grid", () => {
        const g = grid.parseASCII(
            "+--+-----+\n" +
            "|  |     |\n" +
            "+--+--+--+\n" +
            "| a   |  |\n" +
            "+-----+--+"
        );

        const cell = grid.cellWithLabel(g, "a")!;
        grid.splitCell(g, cell, 3);

        const exp =
              "+--+-----+\n" +
              "|  |     |\n" +
              "+--+--+--+\n" +
              "|  |  |  |\n" +
              "+--+--+--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });
});

describe("cellsUnderGlobalY", () => {
    it("Returns the root cell when querying a single-cell grid", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+"
        );

        const cells = [...grid.cellsUnderGlobalY(g, 0)];
        expect(cells).to.have.lengthOf(1);
        expect(cells[0]).to.deep.equal({ rowNo: 0, colNo: 0 });

        const cells1 = [...grid.cellsUnderGlobalY(g, 1)];
        expect(cells1).to.have.lengthOf(1);
        expect(cells1[0]).to.deep.equal({ rowNo: 0, colNo: 0 });
    });

    it("Returns all horizontally split cells at the same row", () => {
        const g = grid.parseASCII(
            "+--+--+--+\n" +
            "|a |b |c |\n" +
            "+--+--+--+"
        );

        const a = grid.cellWithLabel(g, "a");
        const b = grid.cellWithLabel(g, "b");
        const c = grid.cellWithLabel(g, "c");

        const cells = [...grid.cellsUnderGlobalY(g, 0)];
        expect(cells).to.have.lengthOf(3);
        expect(cells).to.deep.include.members([a, b, c]);
    });

    it("Returns only cells that contain the specified row", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.cellWithLabel(g, "a");
        const b = grid.cellWithLabel(g, "b");
        const c = grid.cellWithLabel(g, "c");

        const cellsRow0 = [...grid.cellsUnderGlobalY(g, 0)];
        expect(cellsRow0).to.have.lengthOf(2);
        expect(cellsRow0).to.deep.include.members([a, b]);

        const cellsRow1 = [...grid.cellsUnderGlobalY(g, 1)];
        expect(cellsRow1).to.have.lengthOf(2);
        expect(cellsRow1).to.deep.include.members([a, b]);

        const cellsRow2 = [...grid.cellsUnderGlobalY(g, 3)];
        expect(cellsRow2).to.have.lengthOf(1);
        expect(cellsRow2[0]).to.deep.equal(c);
    });
});

describe("modifyHeightOfRow", () => {
    it("Grows a single cell that spans the full width", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+"
        );

        grid.modifyHeightOfRow(g, { rowNo: 0 }, 2);

        const exp =
            "+--+\n" +
            "|  |\n" +
            "|  |\n" +
            "|  |\n" +
            "+--+";

        expect(grid.printASCII(g)).to.equal(exp);
    });

    it("Shrinks multiple cells on the same row", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|  |  |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|     |\n" +
            "+-----+"
        );

        grid.modifyHeightOfRow(g, { rowNo: 0 }, -1);

        const exp =
            "+--+--+\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|     |\n" +
            "+-----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Won't shrink a row to have height of zero", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|  |  |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|     |\n" +
            "+-----+"
        );

        grid.modifyHeightOfRow(g, { rowNo: 0 }, -10);

        const exp =
            "+--+--+\n" +
            "+--+--+\n" +
            "|     |\n" +
            "+-----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });
});

describe("modifyWidthOfCells", () => {
    it("Can modify the width of a single-cell grid", () => {
        const g = grid.parseASCII(
            "+--+\n" +
            "|  |\n" +
            "+--+"
        );

        grid.modifyWidthOfCells(g, [{ rowNo: 0, colNo: 0 }], 2);

        const exp =
              "+----+\n" +
              "|    |\n" +
              "+----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Can modify the width of cells in a multi-cell grid (1)", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.cellWithLabel(g, "a")!;
        const c = grid.cellWithLabel(g, "c")!;

        grid.modifyWidthOfCells(g, [a, c], -1);

        const exp =
              "+-+--+\n" +
              "| |  |\n" +
              "| |  |\n" +
              "+-+--+\n" +
              "|    |\n" +
              "+----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Can modify the width of cells in a multi-cell grid (2)", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const b = grid.cellWithLabel(g, "b")!;
        const c = grid.cellWithLabel(g, "c")!;

        grid.modifyWidthOfCells(g, [b, c], -1);

        const exp =
              "+--+-+\n" +
              "|  | |\n" +
              "|  | |\n" +
              "+--+-+\n" +
              "|    |\n" +
              "+----+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });

    it("Throws when provided with cells which do not span the entire height of the grid", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const b = grid.cellWithLabel(g, "b")!;

        expect(() => grid.modifyWidthOfCells(g, [b], -1)).to.throw;
    });

    it("Throws when provided with cells which overlap", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.cellWithLabel(g, "a")!;
        const b = grid.cellWithLabel(g, "b")!;
        const c = grid.cellWithLabel(g, "c")!;

        expect(() => grid.modifyWidthOfCells(g, [a, b, c], -1)).to.throw;
    });

    it("Won't shrink a cell to have zero width", () => {
        const g = grid.parseASCII(
            "+--+--+\n" +
            "|a |b |\n" +
            "|  |  |\n" +
            "+--+--+\n" +
            "|c    |\n" +
            "+-----+"
        );

        const a = grid.cellWithLabel(g, "a")!;
        const c = grid.cellWithLabel(g, "c")!;

        grid.modifyWidthOfCells(g, [a, c], -4);

        const exp =
              "++--+\n" +
              "||  |\n" +
              "||  |\n" +
              "++--+\n" +
              "|   |\n" +
              "+---+";

        expect(grid.printASCII(g)).to.equal(exp);
        expect(grid.debugCheckGridDimsConsistency(g)).to.be.true;
    });
});
