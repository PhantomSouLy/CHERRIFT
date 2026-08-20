(() => {
  "use strict";

  const AUTH_SESSION_TIMEOUT_MS = 8000;
  const FUNCTION_TIMEOUT_MS = 12000;

  function timeoutError(code, ms) {
    const error = new Error(`${code}:${ms}`);
    error.name = "TimeoutError";
    error.code = code;
    error.timeoutMs = ms;
    return error;
  }

  function withTimeout(value, ms, code) {
    let timer = 0;

    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        reject(timeoutError(code, ms));
      }, ms);
    });

    return Promise.race([
      Promise.resolve(value),
      timeout
    ]).finally(() => {
      window.clearTimeout(timer);
    });
  }

  function wrapClient(client) {
    if (!client || typeof client !== "object") return client;
    if (client.__CHERRIFT_STARTUP_TIMEOUTS__) return client;

    try {
      Object.defineProperty(client, "__CHERRIFT_STARTUP_TIMEOUTS__", {
        configurable: false,
        enumerable: false,
        value: true
      });
    } catch (_) {}

    if (typeof client.auth?.getSession === "function") {
      const originalGetSession = client.auth.getSession.bind(client.auth);

      client.auth.getSession = (...args) =>
        withTimeout(
          originalGetSession(...args),
          AUTH_SESSION_TIMEOUT_MS,
          "auth_session_timeout"
        );
    }

    if (typeof client.functions?.invoke === "function") {
      const originalInvoke = client.functions.invoke.bind(client.functions);

      client.functions.invoke = (...args) =>
        withTimeout(
          originalInvoke(...args),
          FUNCTION_TIMEOUT_MS,
          "supabase_function_timeout"
        );
    }

    return client;
  }

  function wrapFactory(factory, owner = null) {
    if (typeof factory !== "function") return factory;
    if (factory.__CHERRIFT_STARTUP_TIMEOUT_FACTORY__) return factory;

    const wrapped = function cherriftCreateClientWithStartupTimeouts(...args) {
      return wrapClient(factory.apply(owner || this, args));
    };

    try {
      Object.defineProperty(wrapped, "__CHERRIFT_STARTUP_TIMEOUT_FACTORY__", {
        configurable: false,
        enumerable: false,
        value: true
      });
    } catch (_) {}

    return wrapped;
  }

  const namespace = window.supabase;

  if (namespace && typeof namespace.createClient === "function") {
    namespace.createClient = wrapFactory(
      namespace.createClient,
      namespace
    );
  } else {
    console.warn(
      "[CHERRIFT Startup] Supabase namespace is unavailable before app startup."
    );
  }

  // Preserve test/custom factories, but give them the same startup protection.
  if (typeof window.__CHERRIFT_SUPABASE_FACTORY__ === "function") {
    window.__CHERRIFT_SUPABASE_FACTORY__ = wrapFactory(
      window.__CHERRIFT_SUPABASE_FACTORY__
    );
  }

  window.CHERRIFT_SUPABASE_STARTUP_GUARD = Object.freeze({
    version: "0.9.7.4",
    authSessionTimeoutMs: AUTH_SESSION_TIMEOUT_MS,
    functionTimeoutMs: FUNCTION_TIMEOUT_MS,
    wrapClient
  });

  console.info(
    `[CHERRIFT] Supabase startup guard active: auth ${AUTH_SESSION_TIMEOUT_MS} ms, functions ${FUNCTION_TIMEOUT_MS} ms.`
  );
})();