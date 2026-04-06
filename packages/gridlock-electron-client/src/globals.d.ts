/** Allows TypeScript to accept CSS imports; bundling is handled by esbuild. */
declare module "*.css" {}

interface Versions {
  node: () => string;
  chrome: () => string;
  electron: () => string;
}

declare const versions: Versions;
