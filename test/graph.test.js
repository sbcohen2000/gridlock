import * as assert from "node:assert";
import Graph from "../src/graph.js";

describe("scc", () => {
    it("Can find SCCs in a graph with no edges", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        const c = g.addVertex("c");

        const sccs = g.scc();

        assert.deepEqual(sccs, [[a], [b], [c]]);
    });

    it("Can find SCCs in a simple two-node cycle", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        g.addEdge(a, b);
        g.addEdge(b, a);

        const sccs = g.scc();

        assert.deepEqual(sccs, [[b, a]]);
    });

    it("Can find SCCs in a three-node cycle", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        const c = g.addVertex("c");
        g.addEdge(a, b);
        g.addEdge(b, c);
        g.addEdge(c, a);

        const sccs = g.scc();

        assert.deepEqual(sccs, [[c, b, a]]);
    });

    it("Can find SCCs in a DAG", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        const c = g.addVertex("c");
        g.addEdge(a, b);
        g.addEdge(b, c);

        const sccs = g.scc();

        assert.deepEqual(sccs, [[c], [b], [a]]);
    });

    it("Can find SCCs in a graph with multiple components", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        const c = g.addVertex("c");
        const d = g.addVertex("d");

        // First cycle, between nodes a and b.
        g.addEdge(a, b);
        g.addEdge(b, a);

        // Second cycle, between nodes c and d.
        g.addEdge(c, d);
        g.addEdge(d, c);

        const sccs = g.scc();

        assert.deepEqual(sccs, [[b, a], [d, c]]);
    });

    it("Can find SCCs in a graph with a cycle and non-cycle nodes", () => {
        const g = new Graph();
        const a = g.addVertex("a");
        const b = g.addVertex("b");
        const c = g.addVertex("c");
        const d = g.addVertex("d");

        // Cycle between nodes a and b
        g.addEdge(a, b);
        g.addEdge(b, a);

        // c depends on a, and b depends on d.
        g.addEdge(c, a);
        g.addEdge(b, d);

        const sccs = g.scc();

        assert.deepEqual(sccs, [[d], [b, a], [c]]);
    });
});
