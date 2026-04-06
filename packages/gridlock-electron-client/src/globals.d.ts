interface Versions {
  node: () => string;
  chrome: () => string;
  electron: () => string;
}

declare const versions: Versions;
