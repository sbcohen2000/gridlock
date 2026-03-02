# Gooey Code

## Building (Development)

To run the development server, run:
``` sh
$ npm run watch
```
This will start a server on `localhost` which can be accessed in your browser.
When a source file is changed, the browser tab will be automatically refreshed.

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
- [ ] Command palette
- [ ] Visualize spaces in the editor with a dot.
- [ ] Ctrl-f should skip over the end/beginning of a leaf if there is
      nothing in the way.
- [X] Dragging a rule resizes the leaf to the left of it.
    - [X] Need to introduce a new selection mode whose atomic selections
            are leaves rather than points. The dragging should operate
            on this kind of selection.
    - [x] Change the selection type for edge selections so that they reference
            a single leaf and a direction, rather than a parent node (this will
            permit selecting more kinds of edges).
        - [X] Restrict left-right drags so that they don't intersect
              the text.
        - [ ] Allow the leftmost and bottom-most edges to be selected
              and moved
- [ ] Other leaf-level tools:
    - [ ] Trimming a rule (merges the cells to the left and right)
    - [ ] Introducing a new rule inside a cell (maybe it gets put in the
            middle).
    - [ ] Dragging a rule without resizing the cell to the left (it
            shifts contents between two cells, effectively only changing
            the position of the rule).

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
