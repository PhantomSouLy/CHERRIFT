(() => {
  "use strict";
  if (window.__CHERRIFT_NETWORK_GUARD__) return;

  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  const timeoutMs = 12000;

  function hostOf(input) {
    try {
      const raw = typeof input === "string" || input instanceof URL ? String(input) : String(input?.url || "");
      return new URL(raw, window.location.href).hostname.toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function guardedHost(input) {
    const host = hostOf(input);
    return host === "supabase.co" || host.endsWith(".supabase.co");
  }

  if (!nativeFetch || typeof AbortController !== "function") {
    window.__CHERRIFT_NETWORK_GUARD__ = Object.freeze({ version:"0.9.5-net-guard.1", active:false, timeoutMs });
    return;
  }

  window.fetch = function cherriftGuardedFetch(input, init = {}) {
    if (!guardedHost(input)) return nativeFetch(input, init);

    const controller = new AbortController();
    const upstream = init?.signal;
    let detach = null;

    if (upstream) {
      const forwardAbort = () => {
        try { controller.abort(upstream.reason); } catch (_) { controller.abort(); }
      };
      if (upstream.aborted) forwardAbort();
      else {
        upstream.addEventListener("abort", forwardAbort, { once:true });
        detach = () => upstream.removeEventListener("abort", forwardAbort);
      }
    }

    const timer = window.setTimeout(() => {
      try {
        const reason = typeof DOMException === "function"
          ? new DOMException(`CHERRIFT network timeout after ${timeoutMs} ms`, "TimeoutError")
          : undefined;
        controller.abort(reason);
      } catch (_) {
        controller.abort();
      }
    }, timeoutMs);

    return nativeFetch(input, { ...init, signal:controller.signal }).finally(() => {
      window.clearTimeout(timer);
      detach?.();
    });
  };

  window.__CHERRIFT_NETWORK_GUARD__ = Object.freeze({
    version:"0.9.5-net-guard.1",
    active:true,
    timeoutMs
  });
})();
