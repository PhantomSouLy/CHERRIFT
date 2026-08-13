(() => {
  "use strict";
  if (window.__CHERRIFT_LIVE_SERVICES_V12__) return;
  window.__CHERRIFT_LIVE_SERVICES_V12__ = true;

  const VERSION = "1.2.0-mail-api";
  const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
  const factory = window.supabase?.createClient;
  const listeners = new Set();
  const state = {
    client: null,
    session: null,
    messages: [],
    catalog: [],
    ready: false,
    refreshTimer: 0,
    busy: new Set()
  };

  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
  const clone = value => {
    try { return structuredClone(value); } catch (_) {
      try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
    }
  };

  function emit(type, detail = {}) {
    const payload = { type, ...detail, state: snapshot() };
    for (const listener of listeners) {
      try { listener(payload); } catch (error) { console.warn("[CHERRIFT Live Services] listener failed", error); }
    }
    window.dispatchEvent(new CustomEvent(`cherrift:live:${type}`, { detail: payload }));
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
    const { data, error } = await state.client.functions.invoke("player-api", {
      body: { action, ...payload }
    });
    if (error) {
      let detail = data?.error || error.message || "edge_function_error";
      if (error.context instanceof Response) {
        try { detail = (await error.context.clone().json())?.error || detail; } catch (_) {}
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
    try { window.CherriftStorage?.save?.(current); } catch (error) { console.warn("[CHERRIFT Live Services] local save failed", error); }
    UI.refreshMenu?.();
    window.dispatchEvent(new CustomEvent("cherrift:savechange", { detail: { source: "server" } }));
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
        ? data.resources.filter(row => row?.active !== false && !String(row?.id || "").startsWith("key.") && row?.id !== "chest.legendary")
        : [];
      emit("catalog");
    } catch (error) {
      console.warn("[CHERRIFT Live Services] catalog refresh failed", error);
    }
    return state.catalog;
  }

  async function refreshMail({ silent = false } = {}) {
    clearTimeout(state.refreshTimer);
    if (!state.session?.user) {
      state.messages = [];
      emit("mail");
      return [];
    }
    try {
      const data = await invoke("list_mail");
      state.messages = Array.isArray(data.messages) ? data.messages : [];
      emit("mail");
    } catch (error) {
      if (!silent) console.warn("[CHERRIFT Live Services] mail refresh failed", error);
      emit("error", { error, action: "list_mail" });
    } finally {
      state.refreshTimer = window.setTimeout(() => refreshMail({ silent: true }), 60000);
    }
    return state.messages;
  }

  async function markRead(mailId) {
    const message = state.messages.find(item => item.id === mailId);
    if (!message || message.read || state.busy.has(`read:${mailId}`)) return message || null;
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
    if (!mailId || state.busy.has(`claim:${mailId}`)) throw new Error("mail_busy");
    state.busy.add(`claim:${mailId}`);
    try {
      const data = await invoke("claim_mail", { mail_id: mailId });
      applyServerSave(data.result?.save_data);
      const message = state.messages.find(item => item.id === mailId);
      if (message) { message.read = true; message.claimed = true; }
      emit("mail", { claimedId: mailId });
      await refreshMail({ silent: true });
      return data.result || data;
    } finally {
      state.busy.delete(`claim:${mailId}`);
    }
  }

  async function redeem(code) {
    const cleanCode = String(code || "").trim();
    if (cleanCode.length < 8) throw new Error("invalid_redeem_code");
    const data = await invoke("redeem", { code: cleanCode });
    applyServerSave(data.result?.save_data);
    emit("redeem", { result: data.result || data });
    return data.result || data;
  }

  function onChange(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function start() {
    if (state.ready) return;
    if (typeof factory !== "function" || !CONFIG.url || !CONFIG.publishableKey) {
      window.setTimeout(start, 180);
      return;
    }
    state.client = factory(CONFIG.url, CONFIG.publishableKey, {
      auth: {
        storageKey: CONFIG.authStorageKey || "cherrift-supabase-auth-v063",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce"
      }
    });
    state.ready = true;
    const { data } = await state.client.auth.getSession();
    state.session = data?.session || null;
    state.client.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      emit("session");
      if (session) await refreshCatalog();
      await refreshMail({ silent: true });
    });
    if (state.session) await refreshCatalog();
    await refreshMail({ silent: true });
    window.__CHERRIFT_LIVE_READY__ = true;
    emit("ready");
    console.info(`[CHERRIFT] Live Services ${VERSION} loaded without Mail-panel injection.`);
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
