(() => {
  "use strict";

  if (window.__CHERRIFT_SUPABASE_SINGLETON_V0975__) return;
  window.__CHERRIFT_SUPABASE_SINGLETON_V0975__ = true;

  const VERSION = "0.9.7.5-singleton";
  const AUTH_SESSION_TIMEOUT_MS = 8000;
  const FUNCTION_TIMEOUT_MS = 15000;

  const namespace = window.supabase;
  const cache = new Map();
  const stats = {
    nativeCreates: 0,
    reuses: 0,
    authTimeouts: 0,
    functionTimeouts: 0
  };

  function timeoutError(code, ms) {
    const error = new Error(`${code}:${ms}`);
    error.name = "TimeoutError";
    error.code = code;
    error.timeoutMs = ms;
    return error;
  }

  function withTimeout(value, ms, code, onTimeout) {
    let timer = 0;
    let settled = false;

    const source = Promise.resolve(value).then(
      result => {
        settled = true;
        return result;
      },
      error => {
        settled = true;
        throw error;
      }
    );

    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        if (settled) return;
        try { onTimeout?.(); } catch (_) {}
        reject(timeoutError(code, ms));
      }, ms);
    });

    return Promise.race([source, timeout]).finally(() => {
      window.clearTimeout(timer);
    });
  }

  function authStorageKey(url, options = {}) {
    const explicit = options?.auth?.storageKey;
    if (explicit) return String(explicit);

    try {
      const project = new URL(String(url)).hostname.split(".")[0];
      return project ? `sb-${project}-auth-token` : "supabase.auth.token";
    } catch (_) {
      return "supabase.auth.token";
    }
  }

  function clientKey(url, publishableKey, options = {}) {
    return [
      String(url || ""),
      String(publishableKey || ""),
      authStorageKey(url, options)
    ].join("::");
  }

  function wrapAuth(client) {
    const auth = client?.auth;
    if (!auth || typeof auth.getSession !== "function") return;

    if (auth.__CHERRIFT_GET_SESSION_TIMEOUT_V0975__) return;

    const originalGetSession = auth.getSession.bind(auth);

    auth.getSession = (...args) =>
      withTimeout(
        originalGetSession(...args),
        AUTH_SESSION_TIMEOUT_MS,
        "auth_session_timeout",
        () => { stats.authTimeouts += 1; }
      );

    try {
      Object.defineProperty(auth, "__CHERRIFT_GET_SESSION_TIMEOUT_V0975__", {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}
  }

  function wrapFunctionsInstance(functions) {
    if (!functions || typeof functions.invoke !== "function") return functions;
    if (functions.__CHERRIFT_FUNCTION_TIMEOUT_V0975__) return functions;

    const originalInvoke = functions.invoke.bind(functions);

    functions.invoke = (name, options = {}) => {
      const nextOptions = {
        ...(options || {})
      };

      // supabase-js 2.110.7 supports an invoke timeout. This aborts the actual
      // Edge Function request once it has reached the fetch layer.
      if (!Number.isFinite(Number(nextOptions.timeout))) {
        nextOptions.timeout = FUNCTION_TIMEOUT_MS;
      }

      return withTimeout(
        originalInvoke(name, nextOptions),
        FUNCTION_TIMEOUT_MS,
        "supabase_function_timeout",
        () => { stats.functionTimeouts += 1; }
      );
    };

    try {
      Object.defineProperty(functions, "__CHERRIFT_FUNCTION_TIMEOUT_V0975__", {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}

    return functions;
  }

  function findFunctionsDescriptor(client) {
    let cursor = client;
    while (cursor) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, "functions");
      if (descriptor) return descriptor;
      cursor = Object.getPrototypeOf(cursor);
    }
    return null;
  }

  function wrapFunctions(client) {
    if (!client || client.__CHERRIFT_FUNCTIONS_GETTER_V0975__) return;

    const descriptor = findFunctionsDescriptor(client);

    // SupabaseClient.functions is a prototype getter in supabase-js 2.110.7.
    // The old patch modified one temporary FunctionsClient and then discarded
    // it. Shadow the getter on the client so EVERY future access is wrapped.
    if (descriptor?.get) {
      const originalGetter = descriptor.get;

      try {
        Object.defineProperty(client, "functions", {
          configurable: true,
          enumerable: descriptor.enumerable ?? false,
          get() {
            return wrapFunctionsInstance(originalGetter.call(client));
          }
        });
      } catch (error) {
        console.warn(
          "[CHERRIFT Supabase] Could not shadow the Functions getter; auth/fetch guards remain active.",
          error
        );
      }
    } else {
      // Test/fake clients often expose functions as a stable plain object.
      try {
        wrapFunctionsInstance(client.functions);
      } catch (_) {}
    }

    try {
      Object.defineProperty(client, "__CHERRIFT_FUNCTIONS_GETTER_V0975__", {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}
  }

  function wrapClient(client) {
    if (!client || (typeof client !== "object" && typeof client !== "function")) {
      return client;
    }

    wrapAuth(client);
    wrapFunctions(client);
    return client;
  }

  function makeSingletonFactory(factory, owner = null) {
    if (typeof factory !== "function") return factory;
    if (factory.__CHERRIFT_SINGLETON_FACTORY_V0975__) return factory;

    const wrapped = function cherriftCreateSupabaseSingleton(
      url,
      publishableKey,
      options = {}
    ) {
      const key = clientKey(url, publishableKey, options);

      if (cache.has(key)) {
        stats.reuses += 1;
        return cache.get(key);
      }

      const client = wrapClient(
        factory.call(owner || this, url, publishableKey, options)
      );

      if (client) {
        cache.set(key, client);
        stats.nativeCreates += 1;
      }

      return client;
    };

    try {
      Object.defineProperty(wrapped, "__CHERRIFT_SINGLETON_FACTORY_V0975__", {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}

    return wrapped;
  }

  if (namespace && typeof namespace.createClient === "function") {
    namespace.createClient = makeSingletonFactory(
      namespace.createClient,
      namespace
    );
  } else {
    console.warn(
      "[CHERRIFT Supabase] supabase.createClient was not available before app startup."
    );
  }

  // Smoke/custom environments use this hook instead of window.supabase.
  // Give it the same persistent guards without changing its public contract.
  if (typeof window.__CHERRIFT_SUPABASE_FACTORY__ === "function") {
    const customFactory = window.__CHERRIFT_SUPABASE_FACTORY__;
    window.__CHERRIFT_SUPABASE_FACTORY__ = function(...args) {
      return wrapClient(customFactory(...args));
    };
  }

  window.CHERRIFT_SUPABASE_STARTUP_GUARD = Object.freeze({
    version: VERSION,
    authSessionTimeoutMs: AUTH_SESSION_TIMEOUT_MS,
    functionTimeoutMs: FUNCTION_TIMEOUT_MS,
    get nativeCreates() { return stats.nativeCreates; },
    get reuses() { return stats.reuses; },
    get authTimeouts() { return stats.authTimeouts; },
    get functionTimeouts() { return stats.functionTimeouts; },
    get cachedClients() { return cache.size; },
    wrapClient
  });

  console.info(
    `[CHERRIFT] Supabase singleton guard ${VERSION} active. ` +
    `Auth timeout ${AUTH_SESSION_TIMEOUT_MS} ms, Functions timeout ${FUNCTION_TIMEOUT_MS} ms.`
  );
})();
