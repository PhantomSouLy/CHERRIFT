(() => {
  "use strict";

  const NETWORK_TIMEOUT_MS = 12000;
  const OPTIONAL_PRELOAD_TIMEOUT_MS = 10000;

  // Keep the compatibility global used by older CHERRIFT modules/tools.
  window.__CHERRIFT_NETWORK_GUARD__ = Object.freeze({
    version:"0.9.7.3-startup-recovery",
    active:typeof window.fetch === "function" && typeof AbortController === "function",
    timeoutMs:NETWORK_TIMEOUT_MS,
    optionalPreloadTimeoutMs:OPTIONAL_PRELOAD_TIMEOUT_MS
  });

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

  function installNetworkGuard() {
    if (window.__CHERRIFT_NETWORK_GUARD_V0973__) return;
    window.__CHERRIFT_NETWORK_GUARD_V0973__ = true;

    const originalFetch = typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : null;

    if (
      !originalFetch ||
      typeof AbortController !== "function" ||
      originalFetch.__cherriftTimeoutGuardV0973
    ) return;

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
          if (timedOut) {
            const timeout = new Error(`CHERRIFT network request timed out after ${NETWORK_TIMEOUT_MS} ms`);
            timeout.name = "TimeoutError";
            timeout.cause = error;
            throw timeout;
          }
          throw error;
        })
        .finally(() => {
          window.clearTimeout(timer);
          if (upstreamSignal && abortListener) {
            upstreamSignal.removeEventListener("abort", abortListener);
          }
        });
    };

    guardedFetch.__cherriftTimeoutGuardV0973 = true;
    window.fetch = guardedFetch;
  }

  function normalizePreloadResult(value) {
    if (!value || typeof value !== "object") return { failures:[] };
    if (Array.isArray(value.failures)) return value;
    return { ...value, failures:[] };
  }

  function installOptionalPreloadRecovery() {
    const runtime = window.CHERRIFT_V060;
    const originalPreload = runtime?.preload;
    if (typeof originalPreload !== "function" || originalPreload.__cherriftStartupRecoveryV0973) {
      return;
    }

    const wrappedPreload = async function cherriftRecoveredPreload(save, onProgress) {
      let progressOpen = true;
      let timer = 0;
      const startedAt = performance.now();

      window.__CHERRIFT_PRELOAD_STATE__ = {
        status:"running",
        startedAt:Date.now(),
        timeoutMs:OPTIONAL_PRELOAD_TIMEOUT_MS
      };

      const safeProgress = (...args) => {
        if (!progressOpen || typeof onProgress !== "function") return;
        try { onProgress(...args); } catch (_) {}
      };

      const preloadTask = Promise.resolve()
        .then(() => originalPreload.call(this, save, safeProgress))
        .then(
          value => ({ type:"done", value }),
          error => ({ type:"error", error })
        );

      const timeoutTask = new Promise(resolve => {
        timer = window.setTimeout(
          () => resolve({ type:"timeout" }),
          OPTIONAL_PRELOAD_TIMEOUT_MS
        );
      });

      const outcome = await Promise.race([preloadTask, timeoutTask]);
      progressOpen = false;
      window.clearTimeout(timer);

      if (outcome.type === "done") {
        window.__CHERRIFT_PRELOAD_STATE__ = {
          status:"done",
          durationMs:Math.round(performance.now() - startedAt)
        };
        return normalizePreloadResult(outcome.value);
      }

      if (outcome.type === "error") {
        console.warn(
          "[CHERRIFT Startup] Optional artwork preload failed; continuing with lazy loading.",
          outcome.error
        );
        window.__CHERRIFT_PRELOAD_STATE__ = {
          status:"failed",
          durationMs:Math.round(performance.now() - startedAt),
          error:String(outcome.error?.message || outcome.error || "preload_failed")
        };
        return {
          failures:["optional_preload_failed"],
          recovered:true
        };
      }

      // The V060 preload is only an artwork warm-up. The game has its own
      // ImageAssets loader, so a slow/missing optional image must never keep
      // the player behind the splash forever.
      console.warn(
        `[CHERRIFT Startup] Optional artwork preload exceeded ${OPTIONAL_PRELOAD_TIMEOUT_MS} ms; continuing startup.`
      );
      window.__CHERRIFT_PRELOAD_STATE__ = {
        status:"timed-out",
        durationMs:Math.round(performance.now() - startedAt),
        timeoutMs:OPTIONAL_PRELOAD_TIMEOUT_MS
      };
      return {
        failures:["optional_preload_timeout"],
        timedOut:true,
        recovered:true
      };
    };

    wrappedPreload.__cherriftStartupRecoveryV0973 = true;
    wrappedPreload.__original = originalPreload;
    runtime.preload = wrappedPreload;
  }

  function installDeferredAuthGate() {
    const api = window.CHERRIFT_AUTH;
    const originalGetState = api?.getState;
    if (typeof originalGetState !== "function" || window.__CHERRIFT_AUTH_GATE_RECOVERY_V0973__) {
      return;
    }

    window.__CHERRIFT_AUTH_GATE_RECOVERY_V0973__ = true;
    const rawGetState = originalGetState.bind(api);

    function recoveredGetState() {
      const current = rawGetState() || {};
      const uiReady = Boolean(window.UI?.save && window.UI?.game);

      // bootstrapSave intentionally switches a fresh browser to `gate` before
      // UI.init() exists. The boot overlay must not expose clickable auth
      // controls at that point: Guest/Discord would be acting on a UI/save that
      // has not been created yet. Keep boot in its loading phase until the app
      // has a real save/game, then expose the actual gate normally.
      if (!uiReady && (current.mode === "gate" || current.mode === "guest")) {
        return {
          ...current,
          mode:"checking",
          gateVisible:false,
          startupGateDeferred:true
        };
      }

      return current;
    }

    recoveredGetState.__cherriftStartupRecoveryV0973 = true;

    try {
      api.getState = recoveredGetState;
      if (api.getState === recoveredGetState) return;
    } catch (_) {}

    // Defensive fallback in case a future auth API object becomes frozen.
    try {
      window.CHERRIFT_AUTH = new Proxy(api, {
        get(target, property, receiver) {
          if (property === "getState") return recoveredGetState;
          return Reflect.get(target, property, receiver);
        }
      });
    } catch (error) {
      console.warn("[CHERRIFT Startup] Could not defer the early auth gate.", error);
    }
  }

  function installStartupRecovery() {
    installOptionalPreloadRecovery();
    installDeferredAuthGate();
  }

  installNetworkGuard();

  // This file is loaded before cherrift_app.js. Registering this handler now
  // means it runs before cherrift_app.js's own DOMContentLoaded bootstrap,
  // while CHERRIFT_V060 and CHERRIFT_AUTH have already been defined by then.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installStartupRecovery, {
      once:true,
      capture:true
    });
  } else {
    installStartupRecovery();
  }

  console.info(
    `[CHERRIFT] Network/startup guard v0.9.7.3 active (${NETWORK_TIMEOUT_MS} ms network, ${OPTIONAL_PRELOAD_TIMEOUT_MS} ms optional preload).`
  );
})();
