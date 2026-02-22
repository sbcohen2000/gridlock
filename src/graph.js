/**
 * @template A
 * @typedef {{
 *   index: number | undefined,
 *   lowlink: number,
 *   onstack: boolean,
 *   data: A,
 *   outgoing: Set<Edge<A>>,
 *   incoming: Set<Edge<A>>
 * }} Vertex
 */

/**
 * @template A
 * @typedef {{
 *   from: Vertex<A>,
 *   to: Vertex<A>
 * }} Edge
 */

/**
 * A directed graph datastructure which implements Tarjan's
 * strongly-connected components algorithm.
 *
 * @template A
 */
export default class Graph {
    /**
     * The vertices of the graph.
     *
     * @type {Set<Vertex<A>>}
     */
    #vertices = new Set();

    /**
     * The edges of the graph.
     *
     * @type {Set<Edge<A>>}
     */
    #edges = new Set();

    /**
     * Add a new vertex to the graph.
     *
     * @param {A} data The data associated with this vertex.
     * @returns {Vertex<A>} A vertex.
     */
    addVertex(data) {
        /** @type {Vertex<A>} */
        const v  = {
            index: undefined,
            lowlink: 0,
            onstack: false,
            data,
            outgoing: new Set(),
            incoming: new Set()
        };
        this.#vertices.add(v);
        return v;
    }

    /**
     * Add a new edge between vertices `a` and `b`.
     *
     * @param {Vertex<A>} from The "from" vertex.
     * @param {Vertex<A>} to The "to" vertex.
     * @returns {Edge<A>} A new edge.
     */
    addEdge(from, to) {
        /** @type {Edge<A>} */
        const e = { from, to };
        this.#edges.add(e);
        from.outgoing.add(e);
        to.incoming.add(e);
        return e;
    }

    /**
     * Find the strongly-connected components of the graph, returning
     * them in topologically sorted order as a nested list (the outer
     * list representing the SCCs, and the inner list recording the
     * contents of each SCC).
     *
     * Implementation is copied from here:
     * https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
     *
     * @returns {Vertex<A>[][]}
     */
    scc() {
        /** @type{number} */
        let index = 0;
        /** @type{Vertex<A>[]} */
        let stk = [];
        /** @type{Vertex<A>[][]} */
        let out = [];

        // First, reset the vertices. `index` is a field which is
        // `undefined` until the node has been discovered, and
        // otherwise it records the time that the node was discovered.
        this.#vertices.forEach(v => {
            v.index   = undefined;
            v.lowlink = 0;
            v.onstack = false;
        });

        /** @param {Vertex<A>} v */
        const strongconnect = (v) => {
            v.index   = index;
            v.lowlink = index;
            ++index;
            stk.push(v);
            v.onstack = true;

            // For each edge going out of `v`...
            v.outgoing.forEach(({ to: w }) => {
                if(w.index === undefined) {
                    // Successor `w` has not yet been visited, so we
                    // recurse on it.
                    strongconnect(w);
                    v.lowlink = Math.min(v.lowlink, w.lowlink);
                } else if(w.onstack) {
                    // Successor `w` is in the stack, and hence in the
                    // current SCC.  If w is not on stack, then (v, w)
                    // is an edge pointing to an SCC already found and
                    // must be ignored
                    v.lowlink = Math.min(v.lowlink, w.index);
                }
            });

            if(v.lowlink === v.index) {
                // Start a new SCC
                /** @type {Vertex<A>[]} */
                const scc = [];
                let w;
                do {
                    w = stk.pop();
                    w.onstack = false;
                    scc.push(w);
                } while(w !== v);

                out.push(scc);
            }
        }

        for(const v of this.#vertices.values()) {
            if(v.index === undefined) {
                strongconnect(v);
            }
        }

        return out;
    }
}
