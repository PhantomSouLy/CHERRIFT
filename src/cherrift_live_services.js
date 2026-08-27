(() => {
  "use strict";
  if (window.__CHERRIFT_LIVE_SERVICES_V12__) return;
  window.__CHERRIFT_LIVE_SERVICES_V12__ = true;

  const VERSION = "1.2.1-startup-safe";
  const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
  const listeners = new Set();

  const state = {
    client: null,
    session: null,
    messages: [],
    catalog: [],
    ready: false,
    starting: false,
    refreshTimer: 0,
    busy: new Set()
  };

  const isObject = value =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const clone = value => {
    try { return structuredClone(value); }
    catch (_) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch (_) { return value; }
    }
  };

  const sleep = ms =>
    new Promise(resolve => window.setTimeout(resolve, ms));

  function emit(type, detail = {}) {
    const payload = { type, ...detail, state: snapshot() };
    for (const listener of listeners) {
      try { listener(payload); }
      catch (error) {
        console.warn("[CHERRIFT Live Services] listener failed", error);
      }
    }
    window.dispatchEvent(
      new CustomEvent(`cherrift:live:${type}`, { detail: payload })
    );
  }

  function snapshot() {
    return {
      ready: state.ready,
      session: state.session,
      messages: state.messages.map(message => ({ ...message })),
      catalog: state.catalog.map(row => ({ ...row }))
    };
  }

  async function invoke(action, payload = {}) {
    if (!state.client) throw new Error("client_unavailable");

    const { data, error } = await state.client.functions.invoke(
      "player-api",
      {
        body: { action, ...payload }
      }
    );

    if (error) {
      let detail = data?.error || error.message || "edge_function_error";

      if (error.context instanceof Response) {
        try {
          detail =
            (await error.context.clone().json())?.error ||
            detail;
        } catch (_) {}
      }

      throw new Error(detail);
    }

    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  function applyServerSave(nextSave) {
    if (!isObject(nextSave) || !window.UI?.save) return;

    const current = UI.save;
    for (const key of Object.keys(current)) delete current[key];
    Object.assign(current, clone(nextSave));

    window.CHERRIFT_ECONOMY_V11?.normalize?.(current);
    if (UI.game) UI.game.save = current;

    try {
      window.CherriftStorage?.save?.(current);
    } catch (error) {
      console.warn("[CHERRIFT Live Services] local save failed", error);
    }

    UI.refreshMenu?.();
    window.dispatchEvent(
      new CustomEvent("cherrift:savechange", {
        detail: { source: "server" }
      })
    );
  }

  async function refreshCatalog() {
    if (!state.session?.user) {
      state.catalog = [];
      emit("catalog");
      return [];
    }

    try {
      const data = await invoke("reward_catalog");
      state.catalog = Array.isArray(data.resources)
        ? data.resources.filter(
            row =>
              row?.active !== false &&
              !String(row?.id || "").startsWith("key.") &&
              row?.id !== "chest.legendary"
          )
        : [];
      emit("catalog");
    } catch (error) {
      console.warn(
        "[CHERRIFT Live Services] catalog refresh failed",
        error
      );
    }

    return state.catalog;
  }

  async function refreshMail({ silent = false } = {}) {
    window.clearTimeout(state.refreshTimer);

    if (!state.session?.user) {
      state.messages = [];
      emit("mail");
      return [];
    }

    try {
      const data = await invoke("list_mail");
      state.messages = Array.isArray(data.messages)
        ? data.messages
        : [];
      emit("mail");
    } catch (error) {
      if (!silent) {
        console.warn(
          "[CHERRIFT Live Services] mail refresh failed",
          error
        );
      }
      emit("error", { error, action: "list_mail" });
    } finally {
      state.refreshTimer = window.setTimeout(
        () => refreshMail({ silent: true }),
        60000
      );
    }

    return state.messages;
  }

  async function markRead(mailId) {
    const message = state.messages.find(item => item.id === mailId);

    if (
      !message ||
      message.read ||
      state.busy.has(`read:${mailId}`)
    ) {
      return message || null;
    }

    message.read = true;
    emit("mail");
    state.busy.add(`read:${mailId}`);

    try {
      await invoke("mark_mail_read", { mail_id: mailId });
    } catch (error) {
      message.read = false;
      emit("mail");
      throw error;
    } finally {
      state.busy.delete(`read:${mailId}`);
    }

    return message;
  }

  async function claimMail(mailId) {
    if (!mailId || state.busy.has(`claim:${mailId}`)) {
      throw new Error("mail_busy");
    }

    state.busy.add(`claim:${mailId}`);

    try {
      const data = await invoke("claim_mail", {
        mail_id: mailId
      });

      applyServerSave(data.result?.save_data);

      const message = state.messages.find(
        item => item.id === mailId
      );

      if (message) {
        message.read = true;
        message.claimed = true;
      }

      emit("mail", { claimedId: mailId });
      await refreshMail({ silent: true });
      return data.result || data;
    } finally {
      state.busy.delete(`claim:${mailId}`);
    }
  }

  async function redeem(code) {
    const cleanCode = String(code || "").trim();
    if (cleanCode.length < 8) {
      throw new Error("invalid_redeem_code");
    }

    const data = await invoke("redeem", {
      code: cleanCode
    });

    applyServerSave(data.result?.save_data);
    emit("redeem", { result: data.result || data });
    return data.result || data;
  }

  function onChange(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function waitForPrimaryStartup(maxMs = 30000) {
    const startedAt = performance.now();

    while (performance.now() - startedAt < maxMs) {
      let auth = null;

      try {
        auth = window.CHERRIFT_AUTH?.getState?.() || null;
      } catch (_) {}

      // Live Services is optional startup work. It must not create another
      // auth client or compete for the Supabase auth lock while the main app
      // is still resolving the authoritative save.
      if (
        window.UI?.save &&
        auth &&
        auth.mode !== "checking"
      ) {
        return true;
      }

      await sleep(75);
    }

    return false;
  }

  function finishReady() {
    if (state.ready) return;
    state.ready = true;
    window.__CHERRIFT_LIVE_READY__ = true;
    emit("ready");
  }

  async function refreshOptionalServices() {
    try {
      if (state.session) await refreshCatalog();
      await refreshMail({ silent: true });
    } catch (error) {
      console.warn(
        "[CHERRIFT Live Services] optional refresh failed",
        error
      );
    }
  }

  async function start() {
    if (state.ready || state.starting) return;
    state.starting = true;

    try {
      const primaryReady = await waitForPrimaryStartup();

      if (!primaryReady) {
        console.warn(
          "[CHERRIFT Live Services] Main startup did not settle within 30s; " +
          "Live Services stays non-blocking."
        );
        finishReady();
        return;
      }

      const sharedAuthClient = window.CHERRIFT_AUTH?.getClient?.() || null;
      const factory = window.supabase?.createClient;

      if (
        !sharedAuthClient &&
        (
          typeof factory !== "function" ||
          !CONFIG.url ||
          !CONFIG.publishableKey
        )
      ) {
        finishReady();
        return;
      }

      // The factory is wrapped by cherrift_network_guard.js and returns
      // the SAME project/auth-storage client already owned by CHERRIFT Auth.
      // This removes the second GoTrueClient that previously raced for the
      // same browser lock/storage key.
      state.client = sharedAuthClient || factory(
        CONFIG.url,
        CONFIG.publishableKey,
        {
          auth: {
            storageKey:
              CONFIG.authStorageKey ||
              "cherrift-supabase-auth-v063",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: "pkce"
          }
        }
      );

      const sessionResult =
        await state.client.auth.getSession();

      if (sessionResult?.error) {
        throw sessionResult.error;
      }

      state.session =
        sessionResult?.data?.session || null;

      state.client.auth.onAuthStateChange(
        (_event, session) => {
          state.session = session;
          emit("session");

          // Do not await network work inside the auth callback. Supabase Auth
          // waits for callbacks; awaiting Functions calls here can create a
          // lock/deadlock chain during token refresh and page startup.
          window.setTimeout(() => {
            refreshOptionalServices();
          }, 0);
        }
      );

      // Mark Live ready BEFORE optional Mail/catalog network calls.
      finishReady();

      window.setTimeout(() => {
        refreshOptionalServices();
      }, 0);

      console.info(
        `[CHERRIFT] Live Services ${VERSION} loaded on the shared Supabase client.`
      );
    } catch (error) {
      console.warn(
        "[CHERRIFT Live Services] Startup failed; continuing without optional live services.",
        error
      );
      finishReady();
    } finally {
      state.starting = false;
    }
  }

  window.CHERRIFT_LIVE_SERVICES = Object.freeze({
    version: VERSION,
    snapshot,
    onChange,
    invoke,
    refreshCatalog,
    refreshMail,
    markRead,
    claimMail,
    redeem,
    applyServerSave,
    get session() { return state.session; },
    get messages() { return state.messages; },
    get catalog() { return state.catalog; }
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
