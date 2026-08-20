(() => {
  "use strict";

  if (window.__CHERRIFT_PRELOAD_ROOTFIX_0979__) return;
  window.__CHERRIFT_PRELOAD_ROOTFIX_0979__ = true;

  const runtime = window.CHERRIFT_V060;
  const originalPreload = runtime?.preload;

  window.__CHERRIFT_PRELOAD_ROOTFIX__ = Object.freeze({
    version:"0.9.7.9",
    active:Boolean(runtime && typeof originalPreload === "function"),
    strategy:"startup-nonblocking"
  });

  if (!runtime || typeof originalPreload !== "function") {
    console.warn(
      "[CHERRIFT Startup] V060 preload root-fix could not install: preload is unavailable."
    );
    return;
  }

  // Preserve the original strictly for diagnostics. Do NOT execute it in the
  // startup path: a broken artwork warm-up must never own the app lifecycle.
  if (!window.__CHERRIFT_ORIGINAL_V060_PRELOAD__) {
    window.__CHERRIFT_ORIGINAL_V060_PRELOAD__ =
      originalPreload.__original || originalPreload;
  }

  async function nonBlockingStartupPreload(_save, _onProgress) {
    const startedAt = performance.now();

    window.__CHERRIFT_PRELOAD_STATE__ = {
      status:"skipped-startup",
      startedAt:Date.now(),
      reason:"optional-artwork-warmup-decoupled",
      rootFix:"0.9.7.9"
    };

    // Yield one microtask so callers that expect an async preload still keep
    // the same Promise contract, while never waiting on artwork/network state.
    await Promise.resolve();

    const durationMs = Math.round(performance.now() - startedAt);

    window.__CHERRIFT_PRELOAD_STATE__ = {
      status:"skipped-startup",
      durationMs,
      reason:"optional-artwork-warmup-decoupled",
      rootFix:"0.9.7.9"
    };

    return {
      failures:[],
      skipped:true,
      recovered:true,
      reason:"optional_artwork_warmup_decoupled"
    };
  }

  nonBlockingStartupPreload.__cherriftPreloadRootFix0979 = true;
  nonBlockingStartupPreload.__original = originalPreload;

  runtime.preload = nonBlockingStartupPreload;

  console.info(
    "[CHERRIFT] Preload root-fix v0.9.7.9 active: optional artwork warm-up no longer gates startup."
  );
})();
