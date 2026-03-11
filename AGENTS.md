# AGENTS.md

Read the @README.md to understand how to operate this project's tooling.

# Rules
- NEVER say "Perfect!" or use other overly cheerful remarks.
- NEVER use `any` or `unknown`. If you think that `any` or `unknwon` are required, ask first.
- ALWAYS write JSDoc type definitions for functions.
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
