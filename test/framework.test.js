import { expect } from "chai";
import { JSDOM } from "jsdom";
import Recycler from "../src/framework.js";

/**
 * Construct a new JSDOM document for testing purposes.
 *
 * @returns {Document}
 */
function freshDoc() {
    const { document } = (new JSDOM(`<!DOCTYPE html>`)).window;
    return document;
}

describe("Recycler", () => {
    it("Can recycle a single node", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elem("span", e => e.innerText = "hello")
            .commit();

        expect(d.childElementCount).to.be.equal(1, "the div should have one child");
        const theSpan = /** @type{HTMLElement} */ (d.firstElementChild);
        expect(theSpan.tagName).to.be.equal("SPAN", "the div's child is a span");
        expect(theSpan.innerText).to.be.equal("hello", "the span has inner text 'hello'");

        new Recycler(d)
            .elem("span", e => e.innerText = "hello")
            .commit();

        expect(d.firstElementChild).to.equal(theSpan, "the span wasn't re-created");
    });

    it("Can recycle a list of nodes with the same tag", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elems(Array.from({ length: 100 }, (_, i) => i),
                   "div",
                   (i, e) => e.innerText = i.toString())
            .commit();

        expect(d.childElementCount).to.be.equal(100);
        const children = d.children;

        new Recycler(d)
            .elems(Array.from({ length: 100 }, (_, i) => i),
                   "div",
                   (i, e) => e.innerText = i.toString())
            .commit();

        expect(d.children).to.equal(children);
    });

    it("Won't recycle nodes with different tags", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elem("span", _e => {})
            .elem("div", _e => {})
            .commit();

        const theSpan = /** @type{HTMLElement} */ (d.firstElementChild);
        const theDiv  = /** @type{HTMLElement} */ (d.lastElementChild);

        new Recycler(d)
            .elem("p", _e => {})
            .elem("div", _e => {})
            .commit();

        expect(d.firstElementChild.tagName).to.equal("P");
        expect(d.firstElementChild).to.not.equal(theSpan, "the span wasn't re-used");
        expect(d.lastElementChild).to.equal(theDiv, "the div _was_ re-used");
    });

    it("Won't recycle nodes with different IDs", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elem({ tag: "div", id: "a" }, _e => {})
            .elem({ tag: "div"          }, _e => {})
            .commit();

        const div1 = /** @type{HTMLElement} */ (d.firstElementChild);
        const div2  = /** @type{HTMLElement} */ (d.lastElementChild);

        new Recycler(d)
            .elem({ tag: "div", id: "b" }, _e => {})
            .elem({ tag: "div"          }, _e => {})
            .commit();

        expect(d.firstElementChild).to.not.equal(div1);
        expect(d.lastElementChild).to.equal(div2);
    });

    it("Can handle the removal of nodes between recycles", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elem({ tag: "div"          }, _e => {})
            .elem({ tag: "div", id: "a" }, _e => {})
            .elem({ tag: "div"          }, _e => {})
            .commit();

        const div2 = /** @type{HTMLElement} */ (d.firstElementChild.nextElementSibling);
        const div3 = /** @type{HTMLElement} */ (d.lastElementChild);

        new Recycler(d)
            .elem({ tag: "div", id: "a" }, _e => {})
            .elem({ tag: "div"          }, _e => {})
            .commit();

        expect(d.firstElementChild).to.equal(div2);
        expect(d.lastElementChild).to.equal(div3);
    });

    it("Can handle the addition of nodes between recycles", () => {
        const document = freshDoc();
        const d = document.createElement("div");

        new Recycler(d)
            .elem({ tag: "div", id: "a" }, _e => {})
            .commit();

        const div1 = /** @type{HTMLElement} */ (d.firstElementChild);

        new Recycler(d)
            .elem({ tag: "div"          }, _e => {})
            .elem({ tag: "div", id: "a" }, _e => {})
            .elem({ tag: "div"          }, _e => {})
            .commit();

        expect(d.childElementCount).to.equal(3);
        expect(d.firstElementChild).to.not.equal(div1);
        expect(d.lastElementChild).to.not.equal(div1);
    });
});
