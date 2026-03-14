// Run with: npx tsx test/sample-arbitrary-grids.ts

import * as fc from "fast-check";
import * as grid from "../src/grid.js";
import { arbGrid } from "./arbitrary-grid.js";

const samples = fc.sample(arbGrid, { numRuns: 5 });

let i = 0;
for (const sample of samples) {
    console.log(`== Sample ${++i} =======================`);
    console.log(grid.printASCII(sample));
}
