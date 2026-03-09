# Gridlock

## Building (Development)

To run the development server, run:
``` sh
$ npm run watch
```
This will start a server on `localhost` which can be accessed in your browser.
When a source file is changed, the browser tab will be automatically refreshed.

## Type Checking

To typecheck all of the code in `src`, run:
``` sh
$ npm run typecheck
```

You may note that there are two `tsc` configuration files in the repository. `jsconfig.json` is meant to be picked-up by the editor to support typechecking in `src` and `test`.
But, `npm run typecheck` uses `jsconfig.typecheck.json` which excludes the `test` dir, because `chai`'s type annotations don't work so well and cause too many errors.

## Running Tests

To run all of the tests, run:
``` sh
$ npm test
```

To run a particular test, you can run, for example:
``` sh
$  npx mocha -g "Can parse a leaf"
```
This will run the test called "Can parse a leaf".

## TODO
- [ ] Example palette
- [ ] Command palette
- [ ] Other leaf-level tools:
    - [ ] Trimming a guide (merges the cells to the left and right)
    - [ ] Dragging a rule without resizing the cell to the left (it
            shifts contents between two cells, effectively only changing
            the position of the rule).
- [ ] Usability
  - [ ] It should be possible to induce a vertical guide by selecting
      the characters to left align (and vertical/horizontal guides are
      synthesized).
  - [ ] A cell should be designated with a "fill" character other than
        space.
- [ ] Aesthetics
  - [ ] Trailing spaces should look more paper-like
  - [ ] Cell halo should be more subtle
  - [ ] Give stuff a little more breathing room (especially around
        spiral binding)
  - [ ] It should be possible to hide a guide (how will the user show
        it again? Is hover sufficient?)
- [ ] Align-right/align left?

## Dev's TODOs
- [ ] Can we start with a table, which always stays constrained (for
      the special case where we want a table).
      - [ ] Automatic delimiters for tables (e.g. adding a column to a
            CSV)
- [ ] Would be nice if more things are happening one mode

## Long-Term TODOs
- [ ] Per-cell types
  - [ ] Other kinds of content/style per cell (images, rich text, etc.)

# Notes

## Constraint Solving

When the user wants to expand a leaf in the grid, we use the following
algorithm to ensure consistency in the other grid cells:

1. Let the leaves of the grid be called l₁, l₂, ..., lₙ
2. Let the leaf which is expanded be lₖ (1 ≤ k ≤ n), and let it be
   expanded by an amount w.
3. We introduce n variables, called e₁, ..., eₙ.
   - These correspond to the amount that l₁...lₙ are _expanded_.
4. Then, eₖ = w, since lₖ should be expanded by exactly w.
5. Let C₁, ... Cₚ (p ≥ 1) be the dependency trees of the grid's leaves.
   - It is the case that C₁, ... Cₚ are all subsets of l₁, l₂, ... lₙ.
6. For each Cᵢ:
   - Let Pₛ...Rᵣ be the paths in Cᵢ.
     - Let lₛ...lᵣ = Rᵢ,
       - Then eₛ + + eₛ₊₁ + ... + eᵣ = w
7. Let S₁, ..., Sᵣ (r ≥ 1) be sets of leaves which are constrained to
   be aligned.
8. For each Sᵢ:
   - Let lₛ...lᵣ = Sᵢ,
   - Then, eₛ = eₛ₊₁ = eᵣ
9. Solve the system, and for each expanded variable eᵢ:
   - Modify the corresponding leaf, expanding its with by eᵢ.
10. Traverse the tree, and correct the dimensions of each `Split` node
    so that it agrees with its children.

## Example Ideas

- C-style macros slashes at the end of the line (line continuations)
- multi-line strings for languages which don't support them (plusses
  at the end of the line).
- https://cs50.harvard.edu/college/2023/fall/notes/8/cs50Week8Slide014.png
- Replicate some features from notebooks?
- Plugins for e.g. Obsidian which add some structure? Can we reproduce
  some of those behaviors?
