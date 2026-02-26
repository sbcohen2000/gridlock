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
- [X] Save/restore editor state
- [ ] Visualize spaces in the editor with a dot.
- [ ] Ctrl-b and Ctrl-f should skip over the end/beginning of a leaf
      if there is nothing in the way.

# Notes

## Constraint Solving

When the user wants to expand a leaf in the grid, we use the following
algorithm to ensure consistency in the other grid cells:

1. Let the leaves of the grid be called l₁, l₂, ..., lₙ
2. Let the leaf which is expanded be lₖ (1 ≤ k ≤ n), and let it be
   expanded by an amount w.
3. We introduce 2n variables, called s₁, ..., sₙ, and e₁, ..., eₙ.
   - These correspond to the amount that l₁,..., lₙ are _shifted_,
     and the amount that e₁...eₙ are _expanded_, respectively.
4. Then, sₖ = 0 and eₖ = w, since lₖ should be expanded, and never shifted.
5. Let C₁, ... Cₚ (p ≥ 1) be the dependency trees of the grid's leaves.
   - It is the case that C₁, ... Cₚ are all subsets of l₁, l₂, ... lₙ.
6. For each Cᵢ:
   - Let Pₛ...Rᵣ be the paths in Cᵢ.
     - Let lₛ...lᵣ = Rᵢ,
       - Then sₛ + eₛ + sₛ₊₁ + eₛ₊₁ + ... + sᵣ + eᵣ = w
7. Let S₁, ..., Sᵣ (r ≥ 1) be sets of leaves which are constrained to
   be aligned.
8. For each Sᵢ:
   - Let lₛ...lᵣ = Sᵢ,
   - Then, sₛ = sₛ₊₁ = sᵣ, and eₛ = eₛ₊₁ = eᵣ
9. Solve the system, and for each expanded variable eᵢ:
   - Modify the corresponding leaf, expanding its with by eᵢ.
10. Traverse the tree, and correct the dimensions of each `Split` node
    so that it agrees with its children.
