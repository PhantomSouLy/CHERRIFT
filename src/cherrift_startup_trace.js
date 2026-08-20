(() => {
  "use strict";

  if (window.__CHERRIFT_STARTUP_TRACE__?.active) return;

  const state = {
    active: true,
    version: "0.9.7.8-startup-trace",
    installedAt: Date.now(),
    sequence: 0,
    last: "trace READY",
    steps: [],
    activeCalls: []
  };

  const now = () => Date.now();

  function safeError(error) {
    return String(
      error?.message ||
      error?.name ||
      error ||
      "unknown_error"
    ).slice(0, 180);
  }

  function compact(name) {
    return String(name)
      .replace("CherriftStorage.", "storage.")
      .replace("CHERRIFT_AUTH.", "auth.")
      .replace("CHERRIFT_V060.", "v060.");
  }

  function record(name, status, extra = {}) {
    const row = {
      id: ++state.sequence,
      name,
      status,
      at: now(),
      ...extra
    };

    state.steps.push(row);
    if (state.steps.length > 120) state.steps.splice(0, state.steps.length - 120);

    state.last = `${compact(name)} ${status}`;

    try {
      console.info("[CHERRIFT startup trace]", row);
    } catch (_) {}

    try {
      window.dispatchEvent(
        new CustomEvent("cherrift:startup-trace", {
          detail: row
        })
      );
    } catch (_) {}

    return row;
  }

  function activeCall() {
    if (!state.activeCalls.length) return null;
    return state.activeCalls[state.activeCalls.length - 1] || null;
  }

  function removeActive(token) {
    const index = state.activeCalls.indexOf(token);
    if (index >= 0) state.activeCalls.splice(index, 1);
  }

  function display() {
    const call = activeCall();

    if (call) {
      const seconds = Math.max(
        0,
        Math.floor((now() - call.startedAt) / 1000)
      );

      return `${compact(call.name)} FUT · ${seconds}s`;
    }

    const preload = window.__CHERRIFT_PRELOAD_STATE__;
    if (preload?.status === "running") {
      const seconds = Math.max(
        0,
        Math.floor((now() - Number(preload.startedAt || now())) / 1000)
      );
      return `preload-guard FUT · ${seconds}s`;
    }

    return state.last || "trace READY";
  }

  function wrap(owner, key, name) {
    if (!owner) {
      record(name, "MISSING");
      return false;
    }

    const original = owner[key];

    if (typeof original !== "function") {
      record(name, "NOT-FUNCTION");
      return false;
    }

    if (original.__cherriftStartupTraceWrapped) {
      return true;
    }

    function wrapped(...args) {
      const token = {
        name,
        startedAt: now()
      };

      state.activeCalls.push(token);
      record(name, "START");

      const began = performance.now();
      let result;

      try {
        result = original.apply(this, args);
      } catch (error) {
        removeActive(token);
        record(name, "THROW", {
          ms: Math.round(performance.now() - began),
          error: safeError(error)
        });
        throw error;
      }

      if (!result || typeof result.then !== "function") {
        removeActive(token);
        record(name, "END", {
          ms: Math.round(performance.now() - began)
        });
        return result;
      }

      const warningTimers = [
        [3000, ">3s"],
        [8000, ">8s"],
        [15000, ">15s"]
      ].map(([ms, label]) =>
        window.setTimeout(() => {
          if (state.activeCalls.includes(token)) {
            record(name, label, {
              elapsedMs: now() - token.startedAt
            });
          }
        }, ms)
      );

      return Promise.resolve(result).then(
        value => {
          warningTimers.forEach(clearTimeout);
          removeActive(token);
          record(name, "END", {
            ms: Math.round(performance.now() - began)
          });
          return value;
        },
        error => {
          warningTimers.forEach(clearTimeout);
          removeActive(token);
          record(name, "ERROR", {
            ms: Math.round(performance.now() - began),
            error: safeError(error)
          });
          throw error;
        }
      );
    }

    try {
      Object.defineProperty(
        wrapped,
        "__cherriftStartupTraceWrapped",
        { value: true }
      );
    } catch (_) {}

    try {
      owner[key] = wrapped;
      if (owner[key] !== wrapped) {
        record(name, "WRAP-REJECTED");
        return false;
      }
    } catch (error) {
      record(name, "WRAP-ERROR", {
        error: safeError(error)
      });
      return false;
    }

    record(name, "WRAPPED");
    return true;
  }

  state.display = display;
  state.snapshot = () => ({
    version: state.version,
    installedAt: state.installedAt,
    last: state.last,
    display: display(),
    activeCalls: state.activeCalls.map(call => ({
      name: call.name,
      elapsedMs: now() - call.startedAt
    })),
    steps: state.steps.slice(-40),
    auth: (() => {
      try {
        return window.CHERRIFT_AUTH?.getState?.() || null;
      } catch (error) {
        return { error: safeError(error) };
      }
    })(),
    ui: {
      exists: Boolean(window.UI),
      save: Boolean(window.UI?.save),
      game: Boolean(window.UI?.game)
    },
    preload: window.__CHERRIFT_PRELOAD_STATE__ || null
  });

  window.__CHERRIFT_STARTUP_TRACE__ = state;

  record("trace", "READY");

  // cherrift_app.js has fully executed before this file is loaded, while the
  // app's DOMContentLoaded startup has not run yet. These are therefore the
  // exact functions used by the real startup path.
  wrap(
    window.CherriftStorage,
    "load",
    "CherriftStorage.load"
  );

  wrap(
    window.CHERRIFT_AUTH,
    "bootstrapSave",
    "CHERRIFT_AUTH.bootstrapSave"
  );

  wrap(
    window.CHERRIFT_V060,
    "preload",
    "CHERRIFT_V060.preload"
  );

  wrap(
    window.UI,
    "init",
    "UI.init"
  );

  wrap(
    window.CHERRIFT_V060,
    "initAfterUI",
    "CHERRIFT_V060.initAfterUI"
  );

  wrap(
    window.CHERRIFT_AUTH,
    "start",
    "CHERRIFT_AUTH.start"
  );

  document.addEventListener(
    "DOMContentLoaded",
    () => record("event.DOMContentLoaded", "FIRED"),
    { once: true }
  );

  window.addEventListener(
    "load",
    () => record("event.load", "FIRED"),
    { once: true }
  );

  window.addEventListener(
    "error",
    event => {
      record("window.error", "ERROR", {
        error: safeError(
          event?.error ||
          event?.message ||
          "window_error"
        )
      });
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event => {
      record("promise", "UNHANDLED", {
        error: safeError(event?.reason)
      });
    }
  );

  console.info(
    "[CHERRIFT] Startup trace 0.9.7.8 installed. " +
    "Read window.__CHERRIFT_STARTUP_TRACE__.snapshot() for the full trace."
  );
})();
