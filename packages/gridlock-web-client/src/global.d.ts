declare module "*.png" {
  const content: string;
  export default content;
}

/** Allows TypeScript to accept CSS imports; bundling is handled by esbuild. */
declare module "*.css" {}
