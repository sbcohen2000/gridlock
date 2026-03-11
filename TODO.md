# General
- [ ] Rename `posOfLeaf` -> `posOfNode`.
- [ ] Rename `slideEdge` and friends -> `replaceEdge`
- [ ] Rename `moveEdge` and friends -> `resizeEdge`

# Primitive Interface Refactor
- [ ] Primitives become methods on the class which represents the state of the primitive.
- [ ] `edit___` functions, like `editText` for `TextPrims` become static
    methods which call copy constructors.
    - They're static methods because they must also return an inverse operation.
