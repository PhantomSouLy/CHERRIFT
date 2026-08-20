(() => {
  "use strict";

  // CHERRIFT v0.9.7.7
  // Supabase startup guard / singleton + bounded Auth cleanup.
  //
  // Why this exists:
  // supabase-js serializes several Auth operations behind an internal lock.
  // If a session operation stalls, a recovery signOut() can otherwise wait on
  // the same lock forever. The game bootstrap then remains pending forever.
  // Every Auth operation used during startup/recovery is therefore bounded.

  if (window.__CHERRIFT_SUPABASE_SINGLETON_V0977__) return;
  window.__CHERRIFT_SUPABASE_SINGLETON_V0977__ = true;

  const VERSION = "0.9.7.7-bounded-auth-lock";

  const timeoutConfig = window.CHERRIFT_TIMEOUTS || {};

  function configuredTimeout(name, fallback) {
    const value = Number(timeoutConfig[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  const AUTH_SESSION_TIMEOUT_MS = configuredTimeout("authSessionMs", 8000);
  const AUTH_SIGN_OUT_TIMEOUT_MS = configuredTimeout("authSignOutMs", 2000);
  const AUTH_REFRESH_TIMEOUT_MS = configuredTimeout("authRefreshMs", 8000);
  const AUTH_SET_SESSION_TIMEOUT_MS = configuredTimeout("authSetSessionMs", 8000);
  const AUTH_GET_USER_TIMEOUT_MS = configuredTimeout("authGetUserMs", 8000);
  const AUTH_LOCK_TIMEOUT_MS = configuredTimeout("authLockMs", 6000);
  const FUNCTION_TIMEOUT_MS = configuredTimeout("functionInvokeMs", 15000);

  const namespace = window.supabase;
  const cache = new Map();
  const stats = {
    nativeCreates: 0,
    reuses: 0,
    authTimeouts: 0,
    authSessionTimeouts: 0,
    authSignOutTimeouts: 0,
    authRefreshTimeouts: 0,
    authSetSessionTimeouts: 0,
    authGetUserTimeouts: 0,
    authLockTimeouts: 0,
    functionTimeouts: 0
  };

  function timeoutError(code, ms) {
    const error = new Error(`${code}:${ms}`);
    error.name = "TimeoutError";
    error.code = code;
    error.timeoutMs = ms;
    return error;
  }

  function withTimeout(valueOrFactory, ms, code, onTimeout) {
    let timer = 0;
    let settled = false;
    let value;

    // Accept a factory so synchronous throws are converted to a rejected
    // Promise instead of escaping before the timeout wrapper is installed.
    try {
      value = typeof valueOrFactory === "function"
        ? valueOrFactory()
        : valueOrFactory;
    } catch (error) {
      return Promise.reject(error);
    }

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

  function markFunction(fn, marker) {
    try {
      Object.defineProperty(fn, marker, {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}
    return fn;
  }

  function wrapAuthMethod(auth, methodName, ms, code, timeoutStatKey) {
    const original = auth?.[methodName];
    if (typeof original !== "function") return;

    const marker = `__CHERRIFT_AUTH_TIMEOUT_${methodName.toUpperCase()}_V0977__`;
    if (original[marker]) return;

    const bound = original.bind(auth);
    const wrapped = (...args) =>
      withTimeout(
        () => bound(...args),
        ms,
        code,
        () => {
          stats.authTimeouts += 1;
          if (timeoutStatKey && timeoutStatKey in stats) {
            stats[timeoutStatKey] += 1;
          }
        }
      );

    markFunction(wrapped, marker);

    try {
      auth[methodName] = wrapped;
    } catch (error) {
      console.warn(
        `[CHERRIFT Supabase] Could not wrap auth.${methodName}; startup guard is partially active.`,
        error
      );
    }
  }

  function wrapAuth(client) {
    const auth = client?.auth;
    if (!auth) return;
    if (auth.__CHERRIFT_AUTH_GUARD_V0977__) return;

    wrapAuthMethod(
      auth,
      "getSession",
      AUTH_SESSION_TIMEOUT_MS,
      "auth_session_timeout",
      "authSessionTimeouts"
    );

    // CRITICAL: bootstrap recovery calls signOut({ scope: "local" }). If the
    // Supabase Auth lock is already wedged, awaiting signOut without a bound
    // can keep CHERRIFT at auth.bootstrapSave forever.
    wrapAuthMethod(
      auth,
      "signOut",
      AUTH_SIGN_OUT_TIMEOUT_MS,
      "auth_signout_timeout",
      "authSignOutTimeouts"
    );

    // Keep the other lock-backed Auth operations bounded too. These do not
    // change successful behavior; only a never-settling call is cut off.
    wrapAuthMethod(
      auth,
      "refreshSession",
      AUTH_REFRESH_TIMEOUT_MS,
      "auth_refresh_timeout",
      "authRefreshTimeouts"
    );

    wrapAuthMethod(
      auth,
      "setSession",
      AUTH_SET_SESSION_TIMEOUT_MS,
      "auth_set_session_timeout",
      "authSetSessionTimeouts"
    );

    wrapAuthMethod(
      auth,
      "getUser",
      AUTH_GET_USER_TIMEOUT_MS,
      "auth_get_user_timeout",
      "authGetUserTimeouts"
    );

    try {
      Object.defineProperty(auth, "__CHERRIFT_AUTH_GUARD_V0977__", {
        value: true,
        configurable: false,
        enumerable: false
      });
    } catch (_) {}
  }

  function wrapFunctionsInstance(functions) {
    if (!functions || typeof functions.invoke !== "function") return functions;
    if (functions.__CHERRIFT_FUNCTION_TIMEOUT_V0977__) return functions;

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
        () => originalInvoke(name, nextOptions),
        FUNCTION_TIMEOUT_MS,
        "supabase_function_timeout",
        () => { stats.functionTimeouts += 1; }
      );
    };

    try {
      Object.defineProperty(functions, "__CHERRIFT_FUNCTION_TIMEOUT_V0977__", {
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
    if (!client || client.__CHERRIFT_FUNCTIONS_GETTER_V0977__) return;

    const descriptor = findFunctionsDescriptor(client);

    // SupabaseClient.functions is a prototype getter in supabase-js 2.110.7.
    // Shadow it on the client so every future access gets the same guard.
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
      // Smoke/custom environments often expose functions as a stable object.
      try {
        wrapFunctionsInstance(client.functions);
      } catch (_) {}
    }

    try {
      Object.defineProperty(client, "__CHERRIFT_FUNCTIONS_GETTER_V0977__", {
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

  function boundedAuthLock(name, acquireTimeout, fn) {
    const lockApi = window.navigator?.locks;
    if (!lockApi || typeof lockApi.request !== "function") {
      return Promise.resolve().then(fn);
    }

    const requested = Number(acquireTimeout);
    const ms = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, AUTH_LOCK_TIMEOUT_MS)
      : AUTH_LOCK_TIMEOUT_MS;

    if (typeof AbortController !== "function") {
      return withTimeout(
        () => lockApi.request(String(name), { mode:"exclusive" }, fn),
        ms,
        "auth_lock_timeout",
        () => {
          stats.authTimeouts += 1;
          stats.authLockTimeouts += 1;
        }
      );
    }

    const controller = new AbortController();
    let timer = 0;
    let timedOut = false;

    timer = window.setTimeout(() => {
      timedOut = true;
      try {
        controller.abort(new DOMException("CHERRIFT auth lock timeout", "TimeoutError"));
      } catch (_) {
        controller.abort();
      }
    }, ms);

    return Promise.resolve()
      .then(() =>
        lockApi.request(
          String(name),
          { mode:"exclusive", signal:controller.signal },
          () => Promise.resolve().then(fn)
        )
      )
      .catch(error => {
        if (timedOut || error?.name === "AbortError" || error?.name === "TimeoutError") {
          stats.authTimeouts += 1;
          stats.authLockTimeouts += 1;
          throw timeoutError("auth_lock_timeout", ms);
        }
        throw error;
      })
      .finally(() => {
        window.clearTimeout(timer);
      });
  }

  function clientOptionsWithBoundedLock(options = {}) {
    const next = { ...(options || {}) };
    const auth = { ...(next.auth || {}) };

    // Supabase auth normally waits on the browser Web Locks API. A stale lock
    // can leave getSession() pending forever. Keep the lock semantics, but make
    // acquisition bounded so bootstrap can safely fall back instead of hanging.
    if (typeof auth.lock !== "function") {
      auth.lock = boundedAuthLock;
    }

    next.auth = auth;
    return next;
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

  function makeSingletonFactory(factory, owner = null) {
    if (typeof factory !== "function") return factory;
    if (factory.__CHERRIFT_SINGLETON_FACTORY_V0977__) return factory;

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

      const guardedOptions = clientOptionsWithBoundedLock(options);
      const client = wrapClient(
        factory.call(owner || this, url, publishableKey, guardedOptions)
      );

      if (client) {
        cache.set(key, client);
        stats.nativeCreates += 1;
      }

      return client;
    };

    markFunction(wrapped, "__CHERRIFT_SINGLETON_FACTORY_V0977__");
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
    window.__CHERRIFT_SUPABASE_FACTORY__ = function(url, publishableKey, options = {}) {
      return wrapClient(
        customFactory(
          url,
          publishableKey,
          clientOptionsWithBoundedLock(options)
        )
      );
    };
  }

  window.CHERRIFT_SUPABASE_STARTUP_GUARD = Object.freeze({
    version: VERSION,
    authSessionTimeoutMs: AUTH_SESSION_TIMEOUT_MS,
    authSignOutTimeoutMs: AUTH_SIGN_OUT_TIMEOUT_MS,
    authRefreshTimeoutMs: AUTH_REFRESH_TIMEOUT_MS,
    authSetSessionTimeoutMs: AUTH_SET_SESSION_TIMEOUT_MS,
    authGetUserTimeoutMs: AUTH_GET_USER_TIMEOUT_MS,
    authLockTimeoutMs: AUTH_LOCK_TIMEOUT_MS,
    functionTimeoutMs: FUNCTION_TIMEOUT_MS,
    get nativeCreates() { return stats.nativeCreates; },
    get reuses() { return stats.reuses; },
    get authTimeouts() { return stats.authTimeouts; },
    get authSessionTimeouts() { return stats.authSessionTimeouts; },
    get authSignOutTimeouts() { return stats.authSignOutTimeouts; },
    get authRefreshTimeouts() { return stats.authRefreshTimeouts; },
    get authSetSessionTimeouts() { return stats.authSetSessionTimeouts; },
    get authGetUserTimeouts() { return stats.authGetUserTimeouts; },
    get authLockTimeouts() { return stats.authLockTimeouts; },
    get functionTimeouts() { return stats.functionTimeouts; },
    get cachedClients() { return cache.size; },
    boundedAuthLock,
    wrapClient
  });

  console.info(
    `[CHERRIFT] Supabase singleton guard ${VERSION} active. ` +
    `Auth session ${AUTH_SESSION_TIMEOUT_MS} ms, auth lock ${AUTH_LOCK_TIMEOUT_MS} ms, ` +
    `signOut ${AUTH_SIGN_OUT_TIMEOUT_MS} ms, Functions ${FUNCTION_TIMEOUT_MS} ms.`
  );
})();
