/* CHERRIFT network + startup guard
 * Canonical owner: browser network timeouts and non-blocking optional artwork
 * preload. This replaces the former network-guard + preload-rootfix layering.
 */
(() => {
  "use strict";

  if (window.__CHERRIFT_NETWORK_GUARD_INSTALLED__) return;
  window.__CHERRIFT_NETWORK_GUARD_INSTALLED__ = true;

  const VERSION = "0.9.8.2-network-startup";
  const NETWORK_TIMEOUT_MS = 12000;

  function isSupabaseRequest(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      if (!raw) return false;
      const url = new URL(raw, window.location.href);
      return /(?:^|\.)supabase\.co$/i.test(url.hostname) ||
        /(?:^|\.)supabase\.in$/i.test(url.hostname) ||
        /\/functions\/v1\//i.test(url.pathname) ||
        /\/auth\/v1\//i.test(url.pathname) ||
        /\/rest\/v1\//i.test(url.pathname);
    } catch (_) {
      return false;
    }
  }

  function installNetworkTimeout() {
    const originalFetch = typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : null;

    if (!originalFetch || typeof AbortController !== "function" || originalFetch.__cherriftNetworkTimeout) return;

    const guardedFetch = function cherriftGuardedFetch(input, init = {}) {
      if (!isSupabaseRequest(input)) return originalFetch(input, init);

      const upstreamSignal = init?.signal;
      if (upstreamSignal?.aborted) return originalFetch(input, init);

      const controller = new AbortController();
      let timedOut = false;
      let abortListener = null;

      if (upstreamSignal) {
        abortListener = () => controller.abort(upstreamSignal.reason);
        upstreamSignal.addEventListener("abort", abortListener, { once:true });
      }

      const timer = window.setTimeout(() => {
        timedOut = true;
        try {
          controller.abort(new DOMException("CHERRIFT network timeout", "TimeoutError"));
        } catch (_) {
          controller.abort();
        }
      }, NETWORK_TIMEOUT_MS);

      return originalFetch(input, { ...init, signal:controller.signal })
        .catch(error => {
          if (!timedOut) throw error;
          const timeout = new Error(`CHERRIFT network request timed out after ${NETWORK_TIMEOUT_MS} ms`);
          timeout.name = "TimeoutError";
          timeout.cause = error;
          throw timeout;
        })
        .finally(() => {
          window.clearTimeout(timer);
          if (upstreamSignal && abortListener) upstreamSignal.removeEventListener("abort", abortListener);
        });
    };

    guardedFetch.__cherriftNetworkTimeout = true;
    window.fetch = guardedFetch;
  }

  function installNonBlockingPreload(attempt = 0) {
    const runtime = window.CHERRIFT_V060;
    const originalPreload = runtime?.preload;

    if (!runtime || typeof originalPreload !== "function") {
      if (attempt < 80) window.setTimeout(() => installNonBlockingPreload(attempt + 1), 50);
      else console.warn("[CHERRIFT Startup] Optional artwork preload hook was unavailable.");
      return false;
    }

    if (originalPreload.__cherriftNonBlockingPreload) return true;

    if (!window.__CHERRIFT_ORIGINAL_V060_PRELOAD__) {
      window.__CHERRIFT_ORIGINAL_V060_PRELOAD__ = originalPreload.__original || originalPreload;
    }

    async function nonBlockingStartupPreload(_save, _onProgress) {
      const startedAt = performance.now();
      window.__CHERRIFT_PRELOAD_STATE__ = {
        status:"skipped-startup",
        startedAt:Date.now(),
        reason:"optional-artwork-warmup-decoupled",
        version:VERSION
      };

      // Preserve the historical async contract without allowing decorative
      // artwork to own the application startup lifecycle.
      await Promise.resolve();

      const durationMs = Math.round(performance.now() - startedAt);
      window.__CHERRIFT_PRELOAD_STATE__ = {
        status:"skipped-startup",
        durationMs,
        reason:"optional-artwork-warmup-decoupled",
        version:VERSION
      };

      return {
        failures:[],
        skipped:true,
        recovered:true,
        reason:"optional_artwork_warmup_decoupled"
      };
    }

    nonBlockingStartupPreload.__cherriftNonBlockingPreload = true;
    nonBlockingStartupPreload.__original = originalPreload;
    runtime.preload = nonBlockingStartupPreload;
    return true;
  }

  installNetworkTimeout();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => installNonBlockingPreload(), {
      once:true,
      capture:true
    });
  } else {
    installNonBlockingPreload();
  }

  window.__CHERRIFT_NETWORK_GUARD__ = Object.freeze({
    version:VERSION,
    active:typeof window.fetch === "function",
    timeoutMs:NETWORK_TIMEOUT_MS,
    preload:"non-blocking"
  });

  console.info(`[CHERRIFT] Network/startup guard ${VERSION} active.`);
})();
