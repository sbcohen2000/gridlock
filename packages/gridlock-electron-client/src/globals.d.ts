declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.css" {}

interface Versions {
  node: () => string;
  chrome: () => string;
  electron: () => string;
}

declare const versions: Versions;
