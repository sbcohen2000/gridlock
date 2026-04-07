// Ambient declarations for static assets and globals injected at
// runtime. This file must NOT have any top-level imports or exports —
// doing so would turn it into a module, causing the wildcard `declare
// module` patterns below to lose their global ambient scope.

declare module "*.png" {
    const content: string;
    export default content;
}

declare module "*.css" {}

declare const electronAPI: import("./ipc").ElectronAPI;
