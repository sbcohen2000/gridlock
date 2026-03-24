# AGENTS.md

Read the @README.md to understand how to operate this project's tooling.

# Rules
- NEVER say "Perfect!" or use other overly cheerful remarks.
- NEVER use `any` or `unknown`. If you think that `any` or `unknwon` are required, ask first.
- NEVER remove comments.
- ALWAYS write a comment above a function you declare explaining briefly what it does.
- ALWAYS typecheck. The typechecker can be run with `npm run typecheck`.
- If you need to import a type from another module, do NOT include files
within the type definition like this:
  ```
  /**
   * @returns {fc.Arbitrary<Promise<import("../../src/editor/text-prims/state.d.ts").TextPrimsState>>}
   */
  ```
  Always write this instead:
  ```
  /** @import { TextPrimsState } from "../../src/editor/text-prims/state.d.ts" */

  ...

  /**
   * @returns {fc.Arbitrary<Promise<TextPrimsState>>} An arbitrary editor state
   */
  ```

# Grid Invariants
- Each cell in the grid must have at least one (possibly empty) line of text.
- The number of lines of text in a cell _may_ exceed the cell's height, but it _cannot_ be less than the cell's height.
  - When the number of lines exceeds the height, this is sometimes referred to as an "incomplete" or "clipped" cell.
- Similar to lines, the length of a line of text _may_ exceed it's parent cell's width.
  - But as opposed to height, there is no restriction on how short a line may be (any line can be empty).
- Each cell's disabled guides must point to a local column somewhere within the cell (i.e. the guide's value is
  greater than zero, but less than the cell's width).
