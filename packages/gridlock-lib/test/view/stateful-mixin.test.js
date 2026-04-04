import { Store } from "../../src/view/abstract-stateful-view.js";
import { expect } from "chai";

describe("Store", () => {
    it("Can initialize the store with an empty path", () => {
        const store = new Store();
        store.updateAtPath([], (x) => x, 42);
        expect(store.state).to.deep.equal(42);
    });

    it("Can initialize the store with a single key", () => {
        const store = new Store();
        store.updateAtPath(["a_key"], (x) => x, 42);
        expect(store.state).to.deep.equal({ a_key: 42 });
    });

    it("Can initialize the store with nested keys", () => {
        const store = new Store();
        store.updateAtPath(["a_key", "a_second_key"], (x) => x, 42);
        expect(store.state).to.deep.equal({
            a_key: {
                a_second_key: 42
            }
        });
    });

    it("Can initialize the store with a few different keys", () => {
        const store = new Store();
        store.updateAtPath(["a", "b", "c"], (x) => x, 1);
        store.updateAtPath(["a", "d"], (x) => x, 2);
        store.updateAtPath(["a", "e"], (x) => x, 3);
        expect(store.state).to.deep.equal({
            a: {
                b: {
                    c: 1
                },
                d: 2,
                e: 3
            }
        });
    });

    it("Can update store items", () => {
        const store = new Store();
        store.updateAtPath(["a", "b", 0], (x) => x, 0);
        store.updateAtPath(["a", "b", 1], (x) => x, 1);
        store.updateAtPath(["a", "b", 2], (x) => x, 2);
        expect(store.state).to.deep.equal({
            a: {
                b: [ 0, 1, 2 ]
            }
        });

        store.updateAtPath(["a", "b", 0], (x) => x + 1);
        store.updateAtPath(["a", "b", 1], (x) => x * 10);
        store.updateAtPath(["a", "b", 2], (x) => Math.pow(x, 8));

        expect(store.state).to.deep.equal({
            a: {
                b: [ 1, 10, 256 ]
            }
        });
    });
});
