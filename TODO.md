# Before Deadline
- [ ] Specify fill character
- [ ] Mode where we view the program text, entirely expanded, without grid lines
  - Edits can be disallowed in this mode
- [X] Selected cell outlines should be more prominent, as well as disabled guides
- [X] Line numbers are wrong for incomplete rows

# General
- [ ] Rename `slideEdge` and friends -> `redistribute`
- [ ] Rename `moveEdge` and friends -> `resizeEdge`
- [ ] Instead of the `apply` function on `inverse` which needs you to
  specify a field, make a new type called `RefCell` and just make
  `apply` take one. Of course, it means that the state in each view
  will need to be in a `RefCell`, but we can define a getter in the
  class to simplify state access.
- [ ] Dragging should be a mixin, not an ABC
