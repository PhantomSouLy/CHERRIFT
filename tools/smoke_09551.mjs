// Stable npm-script entry point. The canonical smoke suite contains the
// current asset-format and balance assertions and no longer needs to generate
// or execute a patched temporary copy of itself.
await import("./smoke.mjs");
