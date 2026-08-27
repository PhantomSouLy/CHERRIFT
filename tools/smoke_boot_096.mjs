import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested =
  process.argv.find(argument => argument.startsWith("--case="))?.slice(7) ||
  "desktop";

const cases = {
  desktop: [1440, 900],
  "wide-desktop": [1920, 1080],
  "short-desktop": [1128, 584],
  "phone-portrait": [390, 844],
  "phone-landscape": [844, 390],
  "returning-session": [1280, 760],
  "auth-timeout": [1280, 760],
  "cloud-timeout": [390, 844]
};

if (!cases[requested]) {
  throw new Error(`Unknown smoke case: ${requested}`);
}

const [width, height] = cases[requested];
const authTimeoutCase = requested === "auth-timeout";
const cloudTimeoutCase = requested === "cloud-timeout";
const returning = requested === "returning-session" || cloudTimeoutCase;
const runtimeErrors = [];
const missingLocalRequests = [];
let activeWindow = null;
let authGetSessionCalls = 0;
let authGetSessionBeforeUi = 0;
let cloudBootstrapCalls = 0;
let delayedSubresourceRequested = false;
const activeMutationObservers = new Set();
const maxMutationObserverCallbacks = 5000;
let mutationObserverCallbacks = 0;
let mutationObserverRunaway = false;

function log(message) {
  console.log(`[boot-smoke] ${requested} · ${message}`);
}

function printable(value) {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); }
  catch (_) { return String(value); }
}

function recordRuntimeError(kind, values) {
  const message = `${kind}: ${values.map(printable).join(" ")}`;
  runtimeErrors.push(message);
  console.error(`[boot-smoke] ${requested} · ${message}`);
}

function safeSnapshot() {
  const window = activeWindow;
  if (!window) return { window: "not-created" };

  let boot = null;
  let auth = null;

  try { boot = window.CHERRIFT_BOOT?.getState?.() || null; }
  catch (error) { boot = { snapshotError: printable(error) }; }

  try { auth = window.CHERRIFT_AUTH?.getState?.() || null; }
  catch (error) { auth = { snapshotError: printable(error) }; }

  return {
    documentReadyState: window.document?.readyState || "unknown",
    bodyClass: window.document?.body?.className || "",
    boot,
    auth,
    globals: {
      UI: !!window.UI,
      save: !!window.UI?.save,
      game: !!window.UI?.game,
      prebeta: window.__CHERRIFT_PREBETA_READY__ === true,
      live: window.__CHERRIFT_LIVE_READY__ === true,
      cleanRuntime: !!window.__CHERRIFT_CLEAN_RUNTIME__,
      runtimeReady: window.__CHERRIFT_RUNTIME_READY__ === true
    },
    runtimeErrors: runtimeErrors.slice(-8)
  };
}

function diagnosticText(label) {
  let snapshot;
  try { snapshot = JSON.stringify(safeSnapshot(), null, 2); }
  catch (error) { snapshot = `snapshot_failed: ${printable(error)}`; }

  return [
    "",
    `[boot-smoke] DIAGNOSTICS · ${requested} · ${label}`,
    snapshot
  ].join("\n");
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".wav": "audio/wav"
};

function safeFile(urlPath) {
  const pathname = decodeURIComponent(
    new URL(urlPath, "http://localhost").pathname
  );
  const requestedPath = path.resolve(
    root,
    `.${pathname === "/" ? "/index.html" : pathname}`
  );

  return requestedPath === root ||
    requestedPath.startsWith(`${root}${path.sep}`)
    ? requestedPath
    : null;
}

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url || "/", "http://localhost").pathname
  );

  if (
    requested === "wide-desktop" &&
    pathname === "/__boot-smoke-delayed-subresource.html"
  ) {
    delayedSubresourceRequested = true;
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });
    // Intentionally leave this optional subresource unfinished. DOMContentLoaded
    // has already made the game interactive, while window.load must remain
    // pending. The boot controller must not wait for this response.
    return;
  }

  const file = safeFile(request.url || "/");

  if (!file) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, "index.html") : file;

    response.writeHead(200, {
      "content-type":
        contentTypes[path.extname(target).toLowerCase()] ||
        "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(await readFile(target));
  } catch (_) {
    missingLocalRequests.push(String(request.url || ""));
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;

function canvasContext() {
  const gradient = { addColorStop() {} };
  const values = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({ setTransform() {} }),
    getImageData: (_x, _y, w = 1, h = 1) => ({
      data: new Uint8ClampedArray(Math.max(4, w * h * 4)),
      width: w,
      height: h
    }),
    createImageData: (w = 1, h = 1) => ({
      data: new Uint8ClampedArray(Math.max(4, w * h * 4)),
      width: w,
      height: h
    }),
    measureText: text => ({ width: String(text).length * 8 }),
    isPointInPath: () => false,
    isPointInStroke: () => false
  };

  return new Proxy(values, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

function cloneJson(value) {
  try { return structuredClone(value); }
  catch (_) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }
}

function fallbackStarterSave(window, userId = "") {
  let save;

  try {
    save = window.CherriftStorage?.defaults?.();
  } catch (_) {}

  if (!save || typeof save !== "object") {
    save = {
      coins: 500,
      keys: 0,
      chests: { common: 3, rare: 0, epic: 0 },
      energy: 50,
      selectedSkin: "cherry_default",
      unlockedSkins: ["cherry_default"],
      selectedStageId: "world_1_1",
      unlockedStages: ["world_1_1"],
      clearedStages: {},
      stageStars: {},
      stageStats: {},
      firstClearClaimed: {},
      inventory: [],
      equipped: {},
      account: {
        level: 1,
        xp: 0,
        totalXp: 0,
        skillPoints: 1,
        manualV052: true,
        tree: { power: 0, vitality: 0, haste: 0, fortune: 0 },
        skillTreeV082: { ranks: {} },
        skillTreeV082Migrated: true
      },
      profile: {
        name: "Returning Cherry",
        activeTitle: "",
        frameId: "frame0lvl"
      },
      ownedTitles: [],
      settings: {
        volume: 60,
        touchMode: true,
        fpsLimit: 60
      }
    };
  }

  const result = cloneJson(save);
  result.profile ||= {};
  result.profile.name ||= "Returning Cherry";
  result.security = {
    ...(result.security || {}),
    accountOwnerId: String(userId || "")
  };

  return result;
}

function createFakeSupabase(window) {
  let session = returning
    ? {
        access_token: "smoke-access-token",
        refresh_token: "smoke-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "returning-user",
          email: "returning@example.invalid",
          user_metadata: { full_name: "Returning Cherry" },
          identities: [
            {
              provider: "discord",
              identity_data: {
                provider_id: "987654321",
                full_name: "Returning Cherry"
              }
            }
          ]
        }
      }
    : null;

  const authListeners = new Set();
  let updatedAt = "2026-08-20T00:00:00.000Z";

  function emitAuth(event) {
    for (const listener of authListeners) {
      queueMicrotask(() => {
        try { listener(event, session); }
        catch (error) {
          recordRuntimeError("supabase-auth-listener", [error]);
        }
      });
    }
  }

  async function invoke(_functionName, options = {}) {
    const body = options?.body || {};
    const action = String(body.action || "");

    switch (action) {
      case "bootstrap_save": {
        cloudBootstrapCalls += 1;
        if (cloudTimeoutCase) return new Promise(() => {});
        const save = fallbackStarterSave(window, session?.user?.id || "");
        return {
          data: {
            save_data: save,
            created: false,
            updated_at: updatedAt
          },
          error: null
        };
      }

      case "save_progress":
        updatedAt = new Date().toISOString();
        return {
          data: {
            ok: true,
            conflict: false,
            updated_at: updatedAt
          },
          error: null
        };

      case "reward_catalog":
        return { data: { resources: [] }, error: null };

      case "list_mail":
        return { data: { messages: [] }, error: null };

      case "mark_mail_read":
        return { data: { ok: true }, error: null };

      case "claim_mail":
      case "redeem":
        return {
          data: {
            result: {
              save_data: fallbackStarterSave(
                window,
                session?.user?.id || ""
              )
            }
          },
          error: null
        };

      default:
        return { data: { ok: true }, error: null };
    }
  }

  function queryResult(data = null) {
    return { data, error: null };
  }

  function makeQuery() {
    const query = {
      select() { return query; },
      insert() { return query; },
      upsert() { return query; },
      update() { return query; },
      delete() { return query; },
      eq() { return query; },
      neq() { return query; },
      in() { return query; },
      is() { return query; },
      order() { return query; },
      limit() { return query; },
      range() { return query; },
      maybeSingle() { return Promise.resolve(queryResult(null)); },
      single() { return Promise.resolve(queryResult(null)); },
      then(resolve, reject) {
        return Promise.resolve(queryResult([])).then(resolve, reject);
      }
    };
    return query;
  }

  const client = {
    auth: {
      async getSession() {
        authGetSessionCalls += 1;
        if (!window.UI?.save || !window.UI?.game) {
          authGetSessionBeforeUi += 1;
        }
        if (authTimeoutCase) return new Promise(() => {});
        return { data: { session }, error: null };
      },

      async getUser() {
        return { data: { user: session?.user || null }, error: null };
      },

      async signInWithOAuth(request) {
        return {
          data: {
            provider: request?.provider || "discord",
            url: "https://discord.test/oauth"
          },
          error: null
        };
      },

      onAuthStateChange(callback) {
        authListeners.add(callback);
        // Returning-session deliberately invokes synchronously. Auth v3 must
        // still deduplicate this event with its detached getSession probe.
        if (requested === "returning-session") callback("INITIAL_SESSION", session);
        else queueMicrotask(() => callback("INITIAL_SESSION", session));

        return {
          data: {
            subscription: {
              unsubscribe() {
                authListeners.delete(callback);
              }
            }
          }
        };
      },

      async signOut() {
        session = null;
        emitAuth("SIGNED_OUT");
        return { error: null };
      }
    },

    functions: { invoke },

    from() {
      return makeQuery();
    },

    async rpc() {
      return queryResult(null);
    },

    channel() {
      const channel = {
        on() { return channel; },
        subscribe(callback) {
          if (typeof callback === "function") {
            queueMicrotask(() => callback("SUBSCRIBED"));
          }
          return channel;
        },
        unsubscribe() {
          return Promise.resolve("ok");
        }
      };
      return channel;
    },

    removeChannel() {
      return Promise.resolve("ok");
    },

    storage: {
      from() {
        return {
          async upload() { return queryResult(null); },
          async download() { return queryResult(null); },
          getPublicUrl() {
            return { data: { publicUrl: "https://assets.test.invalid/file" } };
          }
        };
      }
    }
  };

  return client;
}

function installBrowserStubs(window) {
  window.__CHERRIFT_BOOT_SMOKE__ = true;

  if (requested === "wide-desktop") {
    window.document.addEventListener(
      "DOMContentLoaded",
      () => {
        const frame = window.document.createElement("iframe");
        frame.hidden = true;
        frame.title = "";
        frame.src = "__boot-smoke-delayed-subresource.html";
        window.document.body.appendChild(frame);
      },
      { once: true }
    );
  }

  if (authTimeoutCase || cloudTimeoutCase) {
    window.CHERRIFT_TIMEOUTS = {
      // The auth-timeout case intentionally outlives the whole Guest login
      // assertion. Passing proves that getSession() is detached from startup,
      // rather than merely hidden behind another short timeout.
      authBootstrapMs:authTimeoutCase ? 30000 : 120,
      authSessionMs:100,
      authLockMs:100,
      cloudBootstrapMs:180,
      functionInvokeMs:150,
      oauthStartMs:120,
      authSignOutMs:120
    };
  }

  // IMPORTANT: do not globally shorten browser timers.
  // The previous 20 ms clamp accelerated polling/refresh loops until JSDOM
  // starved its own event loop.
  const touchDevice = requested.startsWith("phone");

  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
    devicePixelRatio: { configurable: true, value: 1 },
    visualViewport: {
      configurable: true,
      value: {
        width,
        height,
        addEventListener() {},
        removeEventListener() {}
      }
    }
  });

  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: touchDevice ? 5 : 0
  });

  window.matchMedia = query => {
    const max = query.match(/max-width\s*:\s*(\d+)px/i);
    const min = query.match(/min-width\s*:\s*(\d+)px/i);
    const portrait = query.includes("orientation:portrait");
    const landscape = query.includes("orientation:landscape");
    const coarse = query.includes("pointer:coarse");
    const fine = query.includes("pointer:fine");

    const matches =
      (!max || width <= Number(max[1])) &&
      (!min || width >= Number(min[1])) &&
      (!portrait || height >= width) &&
      (!landscape || width > height) &&
      (!coarse || touchDevice) &&
      (!fine || !touchDevice) &&
      !query.includes("prefers-reduced-motion");

    return {
      matches,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true
    };
  };

  class FakeImage extends window.EventTarget {
    constructor() {
      super();
      this.width = 192;
      this.height = 192;
      this.naturalWidth = 192;
      this.naturalHeight = 192;
      this.complete = false;
      this.onload = null;
      this.onerror = null;
      this.decoding = "async";
      this._src = "";
    }

    set src(value) {
      this._src = String(value);

      const strip = this._src.match(
        /_(idle2|walk_attack_ranged|attack_ranged|attack_melee|idle|walk|ranged|skill|attack|melee|dash)_(?:down|up|left|right)\.png/i
      );

      if (strip) {
        const frames =
          strip[1] === "idle"
            ? 4
            : strip[1] === "skill" &&
                this._src.includes("succubus_cherry")
              ? 8
              : 6;

        this.width = this.naturalWidth = 192 * frames;
        this.height = this.naturalHeight = 192;
      }

      if (this._src.includes("assets/effects/warrior_cherry/")) {
        this.width = this.naturalWidth = 1448;
        this.height = this.naturalHeight = 1086;
      }

      queueMicrotask(() => {
        this.complete = true;
        const event = new window.Event("load");
        this.onload?.(event);
        this.dispatchEvent(event);
      });
    }

    get src() {
      return this._src;
    }

    decode() {
      return Promise.resolve();
    }
  }

  window.Image = FakeImage;

  window.Audio = class {
    constructor(source = "") {
      this.src = source;
      this.volume = 1;
      this.currentTime = 0;
    }
    load() {}
    play() { return Promise.resolve(); }
    pause() {}
    cloneNode() { return new window.Audio(this.src); }
  };

  window.HTMLCanvasElement.prototype.getContext = function() {
    const context = canvasContext();
    context.canvas = this;
    return context;
  };

  window.HTMLCanvasElement.prototype.toDataURL =
    () => "data:image/png;base64,";

  window.HTMLCanvasElement.prototype.getBoundingClientRect =
    () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON() { return this; }
    });

  window.Element.prototype.scrollIntoView ||= () => {};
  window.Element.prototype.scrollBy ||= () => {};
  window.scrollTo = () => {};
  window.confirm = () => true;
  window.Element.prototype.animate ||= () => ({
    cancel() {},
    finished: Promise.resolve()
  });
  window.HTMLElement.prototype.requestFullscreen ||=
    () => Promise.resolve();
  window.document.exitFullscreen ||= () => Promise.resolve();
  window.navigator.vibrate ||= () => true;
  window.requestIdleCallback ||= callback =>
    window.setTimeout(
      () => callback({
        didTimeout: false,
        timeRemaining: () => 20
      }),
      1
    );
  window.cancelIdleCallback ||=
    handle => window.clearTimeout(handle);

  window.ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async () => {} }
  });

  // Keep production MutationObserver behavior enabled. A previous smoke stub
  // hid a real runtime feedback loop that starved rendering and left the live
  // loading facade at 3%. Track and bound callbacks so future observer storms
  // fail deterministically instead of hanging the CI worker.
  const NativeMutationObserver = window.MutationObserver;
  window.MutationObserver = class BootSmokeMutationObserver {
    constructor(callback) {
      this.inner = new NativeMutationObserver(records => {
        mutationObserverCallbacks += 1;

        if (mutationObserverCallbacks > maxMutationObserverCallbacks) {
          if (!mutationObserverRunaway) {
            mutationObserverRunaway = true;
            for (const observer of activeMutationObservers) {
              observer.disconnect();
            }
            recordRuntimeError("mutation-observer-runaway", [
              `more than ${maxMutationObserverCallbacks} callbacks during boot`
            ]);
          }
          return;
        }

        callback(records, this);
      });
      activeMutationObservers.add(this);
    }

    observe(...args) { return this.inner.observe(...args); }
    disconnect() { return this.inner.disconnect(); }
    takeRecords() { return this.inner.takeRecords(); }
  };

  window.addEventListener("error", event => {
    recordRuntimeError("window-error", [
      event.message || event.error || "unknown error"
    ]);
  });

  window.addEventListener("unhandledrejection", event => {
    recordRuntimeError("unhandled-rejection", [
      event.reason || "unknown rejection"
    ]);
  });

  const fakeClient = createFakeSupabase(window);
  const fakeFactory = () => fakeClient;

  // Auth already supports this hook.
  window.__CHERRIFT_SUPABASE_FACTORY__ = fakeFactory;

  // Live Services captures window.supabase.createClient when its script loads,
  // so keep the vendor namespace but force createClient to use the same fake
  // client. This prevents any real Supabase connection during smoke tests.
  let supabaseNamespace = { createClient: fakeFactory };

  Object.defineProperty(window, "supabase", {
    configurable: true,
    enumerable: true,
    get() {
      return supabaseNamespace;
    },
    set(value) {
      if (value && (typeof value === "object" || typeof value === "function")) {
        supabaseNamespace = value;
      } else {
        supabaseNamespace = {};
      }

      try {
        supabaseNamespace.createClient = fakeFactory;
      } catch (_) {
        supabaseNamespace = {
          ...supabaseNamespace,
          createClient: fakeFactory
        };
      }
    }
  });
}

function fatalErrors() {
  return runtimeErrors.filter(message =>
    !/Could not load link/i.test(message) &&
    !/Not implemented: HTMLCanvasElement/i.test(message)
  );
}

async function waitFor(check, message, timeout = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const fatal = fatalErrors();

    if (fatal.length) {
      const diagnostics = diagnosticText(
        `${message} · runtime error`
      );
      console.error(diagnostics);
      throw new Error(
        `Runtime error while waiting for ${message}:\n${fatal[0]}`
      );
    }

    try {
      const value = check();
      if (value) return value;
    } catch (error) {
      const diagnostics = diagnosticText(
        `${message} · check threw`
      );
      console.error(diagnostics);
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 25));
  }

  const diagnostics = diagnosticText(`${message} · timeout`);
  console.error(diagnostics);
  throw new Error(`Timed out after ${timeout} ms: ${message}`);
}

function click(window, element, label) {
  assert.ok(element, `${label}: control exists`);
  element.dispatchEvent(
    new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true
    })
  );
}

const virtualConsole = new VirtualConsole();

virtualConsole.on("jsdomError", error => {
  const message = String(error?.message || error);

  if (
    /Not implemented: HTMLCanvasElement/i.test(message) ||
    /Could not load link/i.test(message)
  ) {
    return;
  }

  recordRuntimeError("jsdom", [error]);
});

virtualConsole.on("error", (...values) => {
  recordRuntimeError("console-error", values);
});

async function closeServerBounded(timeout = 1500) {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();

  await Promise.race([
    new Promise(resolve => {
      try {
        server.close(() => resolve("closed"));
      } catch (_) {
        resolve("already-closed");
      }
    }),
    new Promise(resolve => setTimeout(() => resolve("timeout"), timeout))
  ]);
}

let dom;

try {
  log("opening app");

  dom = await JSDOM.fromURL(
    requested === "desktop"
      ? `${baseUrl}?test=${encodeURIComponent(requested)}`
      : `${baseUrl}?smoke=${encodeURIComponent(requested)}`,
    {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        activeWindow = window;
        installBrowserStubs(window);
      }
    }
  );

  const { window } = dom;
  const { document } = window;
  activeWindow = window;

  log("waiting for boot controller");
  await waitFor(
    () => window.CHERRIFT_BOOT?.getState,
    "boot controller",
    15000
  );

  if (returning) {
    log("waiting for returning Discord session");

    await waitFor(
      () => {
        const boot = window.CHERRIFT_BOOT?.getState?.();
        const auth = window.CHERRIFT_AUTH?.getState?.();

        return (
          boot?.phase === "start" &&
          boot?.stable === true &&
          auth?.mode === "discord" &&
          auth?.signedIn === true &&
          !!window.UI?.save
        );
      },
      "returning Discord session",
      30000
    );
  } else {
    log("waiting for auth choice");

    await waitFor(
      () => {
        const boot = window.CHERRIFT_BOOT?.getState?.();
        const auth = window.CHERRIFT_AUTH?.getState?.();

        return (
          boot?.phase === "auth" &&
          auth?.mode === "gate"
        );
      },
      "auth choice",
      20000
    );

    if (authTimeoutCase) {
      // startAuthGate intentionally schedules session discovery on the next
      // timer turn so the local Guest UI is usable first. Depending on runner
      // timing, the gate can therefore become observable one turn before
      // getSession starts. Wait for that intended background transition instead
      // of sampling it synchronously and producing a flaky failure.
      await waitFor(
        () => authGetSessionCalls > 0,
        "auth-timeout background session probe",
        5000
      );
    }

    log("choosing Guest");
    click(
      window,
      document.getElementById("bootGuestV096"),
      `${requested} Guest login`
    );

    log("waiting for Guest save/runtime");
    await waitFor(
      () => {
        const boot = window.CHERRIFT_BOOT?.getState?.();
        const auth = window.CHERRIFT_AUTH?.getState?.();

        return (
          boot?.phase === "start" &&
          boot?.stable === true &&
          auth?.mode === "guest" &&
          !!window.UI?.save
        );
      },
      "Guest startup",
      30000
    );
  }

  const state = window.CHERRIFT_BOOT.getState();
  const auth = window.CHERRIFT_AUTH?.getState?.();

  if (requested === "desktop") {
    assert.equal(
      window.__CHERRIFT_STARTUP_TRACE__?.active,
      false,
      "desktop: startup diagnostics stay disabled on a normal page URL"
    );
  }

  assert.equal(
    authGetSessionBeforeUi,
    0,
    `${requested}: Supabase session discovery never runs before UI/save/game initialization`
  );

  if (cloudTimeoutCase) {
    assert.equal(auth?.mode, "discord", "cloud-timeout: Discord identity remains active");
    assert.equal(auth?.cloudReady, false, "cloud-timeout: unavailable cloud is not reported ready");
    assert.equal(auth?.offlineAccount, true, "cloud-timeout: account-bound fallback is active");
    assert.equal(
      window.UI?.save?.security?.accountOwnerId,
      "returning-user",
      "cloud-timeout: fallback remains bound to the authenticated account"
    );
  }

  if (returning) {
    assert.equal(
      cloudBootstrapCalls,
      1,
      `${requested}: INITIAL_SESSION and getSession share one cloud bootstrap`
    );
  }

  if (requested === "returning-session") {
    window.UI.save.coins = 4321;
    window.CherriftStorage.save(window.UI.save);
    const backup = JSON.parse(
      window.localStorage.getItem("cherrift-discord-backup-v2:returning-user") || "null"
    );
    assert.equal(backup?.saveData?.coins, 4321, "returning-session: account backup is synchronous");

    await window.CHERRIFT_AUTH.applySessionForTesting({
      user:{
        id:"brand-new-discord-user",
        user_metadata:{ full_name:"Brand New Cherry" },
        identities:[{
          provider:"discord",
          identity_data:{ provider_id:"1122334455" }
        }]
      }
    });

    assert.equal(window.CHERRIFT_AUTH.getState().account?.id, "brand-new-discord-user", "returning-session: account switch changes UUID");
    assert.equal(window.UI.save.security?.accountOwnerId, "brand-new-discord-user", "returning-session: save owner follows switched UUID");
    assert.equal(window.UI.save.coins, 500, "returning-session: previous account currency is not inherited");
  }

  log(
    `ready · mode=${auth?.mode || "unknown"} · ` +
    `waitingFor=${state.waitingFor || "none"}`
  );

  assert.equal(
    state.phase,
    "start",
    `${requested}: click-to-start phase`
  );
  assert.equal(
    state.stable,
    true,
    `${requested}: startup stable`
  );
  assert.equal(
    state.saveReady,
    true,
    `${requested}: save ready`
  );
  assert.equal(
    state.prebeta,
    true,
    `${requested}: pre-beta ready`
  );
  assert.equal(
    state.runtime,
    true,
    `${requested}: runtime ready`
  );

  if (requested === "wide-desktop") {
    await waitFor(
      () => delayedSubresourceRequested,
      "wide-desktop delayed optional subresource request",
      5000
    );
    assert.notEqual(
      document.readyState,
      "complete",
      "wide-desktop: lobby becomes ready before the global load event"
    );

    const wallet = document.getElementById("desktopCurrencyV0943");
    assert.ok(wallet, "wide-desktop: canonical desktop wallet exists");
    assert.equal(
      wallet.querySelectorAll(":scope > span[title]").length,
      4,
      "wide-desktop: canonical desktop wallet has four compact currencies"
    );

    window.UI.save.coins = 987654;
    window.dispatchEvent(
      new window.CustomEvent("cherrift:savechange", {
        detail: { source: "wide-desktop-smoke" }
      })
    );
    await waitFor(
      () => wallet.querySelector(':scope > span[title="Coin"] b')?.textContent === "987654",
      "wide-desktop live wallet refresh",
      5000
    );

    const prebetaCss = await readFile(
      path.join(root, "assets/cherrift_prebeta.css"),
      "utf8"
    );
    const compactBreakpoint = prebetaCss.indexOf(
      "@media(min-width:821px) and (max-width:1500px)"
    );
    assert.ok(compactBreakpoint > 0, "wide-desktop: compact breakpoint exists");
    const wideDesktopCss = prebetaCss.slice(0, compactBreakpoint);
    assert.match(
      wideDesktopCss,
      /#desktopCurrencyV0943 img\{[^}]*width:18px!important[^}]*height:18px!important/,
      "wide-desktop: currency images are bounded outside the 1500px breakpoint"
    );
    assert.match(
      wideDesktopCss,
      /#resourceBarV082\{display:none!important\}/,
      "wide-desktop: duplicate legacy resource bar is hidden"
    );
  }

  assert.ok(
    window.UI?.save,
    `${requested}: UI.save exists`
  );
  assert.ok(
    window.UI?.game,
    `${requested}: UI.game exists`
  );
  assert.ok(
    window.__CHERRIFT_CLEAN_RUNTIME__ ||
      window.__CHERRIFT_RUNTIME_READY__,
    `${requested}: Clean Runtime active`
  );

  assert.deepEqual(
    missingLocalRequests,
    [],
    `${requested}: active startup makes no missing local file request`
  );

  assert.equal(
    document.body.classList.contains("v060-booting"),
    true,
    `${requested}: lobby remains covered before Start`
  );

  log("releasing lobby");
  click(
    window,
    document.getElementById("bootStartV096"),
    `${requested} click-to-start`
  );

  await waitFor(
    () => !document.body.classList.contains("v060-booting"),
    "lobby release",
    10000
  );

  if (requested === "desktop" || requested === "phone-portrait") {
    window.UI.open("gachaV082");
    await waitFor(
      () => !document.getElementById("gachaChestOnlyV12")?.classList.contains("hidden"),
      `${requested} equipment chest route`,
      5000
    );
    assert.equal(
      document.querySelectorAll("#gachaChestOnlyV12 [data-gco-open]").length,
      2,
      `${requested}: Gacha exposes exactly 1x and 10x chest actions`
    );

    window.UI.openWorldSelect();
    await waitFor(
      () => !document.getElementById("worldSelectorV0942")?.classList.contains("hidden"),
      `${requested} world carousel route`,
      5000
    );
    assert.equal(
      document.getElementById("worldsV094")?.classList.contains("hidden"),
      true,
      `${requested}: legacy World grid stays hidden behind the carousel route`
    );
    assert.ok(
      document.querySelector("#worldSelectorV0942 .selector-card-v0942"),
      `${requested}: World carousel renders one focused world card`
    );

    window.UI.open("skins");
    await waitFor(
      () => !!document.querySelector("#skins .skin-showcase-v093 .skin-art-v093"),
      `${requested} Cherry selector art`,
      5000
    );
    if (requested === "phone-portrait") {
      const skinSelector = document.querySelector("#skins .skin-selector-v093");
      assert.equal(
        window.getComputedStyle(skinSelector).display,
        "grid",
        "phone-portrait: Cherry selector keeps a sized grid instead of a collapsing flex stack"
      );
      const sharedUiCss = await readFile(
        path.join(root, "assets/cherrift_ui.css"),
        "utf8"
      );

      assert.match(
        sharedUiCss,
        /#skins \.skin-selector-v093\{[^}]*grid-template-rows:minmax\(220px,1fr\) 104px 76px!important/,
        "phone-portrait: Cherry selector reserves a visible splash row"
      );

      assert.match(
        sharedUiCss,
        /#skins \.skin-showcase-v093\{[^}]*grid-row:1!important/,
        "phone-portrait: Cherry splash card occupies the sized selector row"
      );
    }

    window.UI.open("playerUpgrade");
    await waitFor(
      () => document.querySelectorAll("#skillBranchTabsV096 > button").length === 3 &&
        document.querySelectorAll("#playerUpgrade .skill-list-v096 .skill-node-v082").length > 0,
      `${requested} three-tab Player Upgrade list`,
      10000  // ← Dupla timeout mobilhoz
    );
    assert.equal(
      document.querySelector("#playerUpgrade .skill-core-v082"),
      null,
      `${requested}: removed Cherry core is not rendered`
    );
    if (requested === "phone-portrait") {
      const runtimeCss = await readFile(
        path.join(root, "assets/cherrift_runtime.css"),
        "utf8"
      );
      assert.doesNotMatch(
        runtimeCss,
        /#playerUpgrade \.skill-tree-track-v082\{[^}]*min-width:900px!important/,
        "phone-portrait: Skill Tree canvas is not fixed at 900px"
      );
    }
  }

  assert.equal(
    document.body.classList.contains("v062-startup-failed"),
    false,
    `${requested}: no startup failure`
  );

  const remainingErrors = fatalErrors();
  if (remainingErrors.length) {
    console.error(diagnosticText("post-start runtime errors"));
  }

  assert.deepEqual(
    remainingErrors,
    [],
    `${requested}: no runtime errors`
  );

  assert.equal(
    mutationObserverRunaway,
    false,
    `${requested}: MutationObservers remain bounded during startup`
  );

  log("PASS");
  console.log(
    `PASS ${requested} ${width}x${height} · deterministic Clean Runtime boot · ` +
    `observer callbacks=${mutationObserverCallbacks}`
  );
} catch (error) {
  console.error(diagnosticText("case failed"));
  throw error;
} finally {
  activeWindow = dom?.window || activeWindow;

  for (const observer of activeMutationObservers) {
    try { observer.disconnect(); }
    catch (_) {}
  }


  // A MutationObserver callback may already have queued one final UI microtask.
  // Drain it before JSDOM invalidates window.document, then disconnect again in
  // case that last patch pass reattached an observer.
  await Promise.resolve();
  await Promise.resolve();
  for (const observer of activeMutationObservers) {
    try { observer.disconnect(); }
    catch (_) {}
  }
  activeMutationObservers.clear();

  if (dom) {
    try { dom.window.close(); }
    catch (error) {
      console.warn(
        `[boot-smoke] ${requested} · JSDOM close warning: ${printable(error)}`
      );
    }
  }

  await closeServerBounded(1500);
  activeWindow = null;
}
