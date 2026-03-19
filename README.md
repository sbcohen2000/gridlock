<p align="center">
  <img width="100" height="100" alt="gridlock-logo" src="https://github.com/user-attachments/assets/26b39c5b-dc30-41ed-b69c-e8e9710864d2" />
</p>

# Gridlock

[live demo](https://sbcohen2000.github.io/gridlock/)

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

## Example Ideas

- C-style macros slashes at the end of the line (line continuations)
- multi-line strings for languages which don't support them (plusses
  at the end of the line).
- https://cs50.harvard.edu/college/2023/fall/notes/8/cs50Week8Slide014.png
- Replicate some features from notebooks?
- Plugins for e.g. Obsidian which add some structure? Can we reproduce
  some of those behaviors?
