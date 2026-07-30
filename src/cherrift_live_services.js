(() => {
  "use strict";
  if (window.__CHERRIFT_LIVE_SERVICES__) return;
  window.__CHERRIFT_LIVE_SERVICES__ = Object.freeze({ version: "1.0.0" });

  const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
  const factory = window.supabase?.createClient;
  const id = (name) => document.getElementById(name);
  const q = (selector, root = document) => root.querySelector(selector);

  const state = {
    client: null,
    session: null,
    messages: [],
    busyMailId: "",
    refreshTimer: 0,
    ready: false,
  };

  const COPY = {
    hu: {
      redeemTitle: "Redeem kód",
      redeemIntro: "Írd be a GM-től kapott beváltókódot.",
      redeemPlaceholder: "CHERRY-XXXX-XXXX-XXXX",
      redeemButton: "Kód beváltása",
      redeemLogin: "A beváltáshoz Discord-belépés szükséges.",
      redeemSuccess: "A kód jutalma megérkezett.",
      mailClaimed: "A levél jutalma megérkezett.",
      alreadyClaimed: "Ezt a jutalmat már átvetted.",
      unavailable: "Ez a jutalom már nem érhető el.",
      userLimit: "Ezt a kódot már beváltottad.",
      invalidCode: "Érvénytelen vagy lejárt kód.",
      connectionError: "A szerveres művelet nem sikerült.",
      liveSource: "GM Mail",
      skins: "skin",
    },
    en: {
      redeemTitle: "Redeem code",
      redeemIntro: "Enter a code received from a GM.",
      redeemPlaceholder: "CHERRY-XXXX-XXXX-XXXX",
      redeemButton: "Redeem code",
      redeemLogin: "Discord sign-in is required to redeem a code.",
      redeemSuccess: "The code reward has been added.",
      mailClaimed: "The mail reward has been added.",
      alreadyClaimed: "You have already claimed this reward.",
      unavailable: "This reward is no longer available.",
      userLimit: "You have already redeemed this code.",
      invalidCode: "Invalid or expired code.",
      connectionError: "The server operation failed.",
      liveSource: "GM Mail",
      skins: "skin",
    },
  };

  function language() {
    return window.CHERRIFT_I18N?.language === "en" ? "en" : "hu";
  }

  function text(key) {
    return COPY[language()][key] || COPY.en[key] || key;
  }

  function liveId(mailId) {
    return `gm:${mailId}`;
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function rewardText(reward) {
    const parts = [];
    if (reward?.coins) parts.push(`🪙 ${reward.coins}`);
    if (reward?.keys) parts.push(`🗝 ${reward.keys}`);
    if (Array.isArray(reward?.skins) && reward.skins.length) parts.push(`🐰 ${reward.skins.length} ${text("skins")}`);
    return parts.join(" · ");
  }

  function showToast(message) {
    window.UI?.toast?.(message);
  }

  async function invoke(action, payload = {}) {
    if (!state.client) throw new Error("client_unavailable");
    const { data, error } = await state.client.functions.invoke("player-api", {
      body: { action, ...payload },
    });
    if (error) {
      let detail = data?.error || error.message || "edge_function_error";
      if (error.context instanceof Response) {
        try {
          const parsed = await error.context.clone().json();
          detail = parsed?.error || detail;
        } catch (_) {}
      }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function messageByCatalogId(catalogId) {
    return state.messages.find((message) => liveId(message.id) === catalogId) || null;
  }

  function ensureMailboxState(catalogId, read, claimed) {
    if (!window.UI?.save) return;
    UI.save.mailbox ||= {};
    UI.save.mailbox.states ||= {};
    UI.save.mailbox.states[catalogId] = {
      read: read === true,
      claimed: claimed === true,
    };
  }

  function rebuildCatalog() {
    const api = window.CHERRIFT_V063;
    const catalog = api?.mailCatalog;
    if (!Array.isArray(catalog)) return;
    for (let index = catalog.length - 1; index >= 0; index -= 1) {
      if (catalog[index]?.__gmLive === true) catalog.splice(index, 1);
    }
    const lang = language();
    const items = state.messages.map((message) => {
      const catalogId = liveId(message.id);
      ensureMailboxState(catalogId, message.read, message.claimed);
      return {
        id: catalogId,
        version: `${text("liveSource")} · ${new Date(message.created_at).toLocaleDateString(lang === "hu" ? "hu-HU" : "en-US")}`,
        titleKey: lang === "en" ? message.title_en : message.title_hu,
        bodyKey: lang === "en" ? message.body_en : message.body_hu,
        attachments: message.attachments || null,
        __gmLive: true,
        __gmMailId: message.id,
      };
    });
    catalog.unshift(...items);
    api.normalizeMailbox?.(window.UI?.save || {});
    api.renderMail?.();
    decorateMailAttachments();
  }

  async function refreshMail() {
    clearTimeout(state.refreshTimer);
    if (!state.session?.user) {
      state.messages = [];
      rebuildCatalog();
      renderRedeemPanel();
      return;
    }
    try {
      const data = await invoke("list_mail");
      state.messages = Array.isArray(data.messages) ? data.messages : [];
      rebuildCatalog();
    } catch (error) {
      console.warn("[CHERRIFT Live Services] Mail refresh failed:", error);
    } finally {
      state.refreshTimer = setTimeout(refreshMail, 60000);
    }
  }

  function applyServerSave(nextSave) {
    if (!isObject(nextSave) || !window.UI?.save) return;
    const current = UI.save;
    for (const key of Object.keys(current)) delete current[key];
    Object.assign(current, nextSave);
    if (UI.game) UI.game.save = current;
    try { window.CherriftStorage?.save?.(current); } catch (_) {}
    UI.refreshMenu?.();
    window.CHERRIFT_V063?.normalizeMailbox?.(current);
  }

  function mapClaimError(error, redeem = false) {
    const code = String(error?.message || error || "");
    if (code.includes("mail_already_claimed")) return text("alreadyClaimed");
    if (code.includes("mail_not_available")) return text("unavailable");
    if (code.includes("redeem_user_limit_reached")) return text("userLimit");
    if (code.includes("redeem_not_available") || code.includes("invalid_redeem_code")) return text("invalidCode");
    return redeem ? text("invalidCode") : text("connectionError");
  }

  async function claimLiveMail(button, message) {
    if (!message || state.busyMailId) return;
    state.busyMailId = message.id;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "…";
    try {
      const data = await invoke("claim_mail", { mail_id: message.id });
      applyServerSave(data.result?.save_data);
      const local = state.messages.find((item) => item.id === message.id);
      if (local) {
        local.read = true;
        local.claimed = true;
      }
      ensureMailboxState(liveId(message.id), true, true);
      showToast(text("mailClaimed"));
      await refreshMail();
    } catch (error) {
      showToast(mapClaimError(error));
      button.disabled = false;
      button.textContent = original;
    } finally {
      state.busyMailId = "";
    }
  }

  async function markLiveMailRead(message) {
    if (!message || message.read) return;
    message.read = true;
    ensureMailboxState(liveId(message.id), true, message.claimed);
    try { await invoke("mark_mail_read", { mail_id: message.id }); }
    catch (error) { console.warn("[CHERRIFT Live Services] Read state failed:", error); }
  }

  function ensureStyles() {
    if (id("cherriftLiveServicesCss")) return;
    const style = document.createElement("style");
    style.id = "cherriftLiveServicesCss";
    style.textContent = `
      .redeem-live-v1{margin:16px 0 0;padding:18px;border:1px solid rgba(255,134,193,.26);border-radius:18px;background:linear-gradient(135deg,rgba(255,87,164,.10),rgba(37,18,39,.72));}
      .redeem-live-v1 header{margin-bottom:13px}.redeem-live-v1 h3{margin:0 0 4px}.redeem-live-v1 p{margin:0;color:rgba(255,229,242,.72);font-size:12px}
      .redeem-live-v1 form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:13px}.redeem-live-v1 input{min-width:0;min-height:46px;padding:0 13px;border:1px solid rgba(255,213,234,.18);border-radius:12px;background:rgba(10,5,12,.45);color:#fff;text-transform:uppercase;outline:none}.redeem-live-v1 input:focus{border-color:rgba(255,113,181,.62)}
      .redeem-live-v1 button{min-height:46px;padding:0 16px;border:0;border-radius:12px;color:#fff;font-weight:900;background:linear-gradient(120deg,#d52f7d,#ec78af)}.redeem-live-v1 button:disabled{opacity:.55}
      .redeem-live-v1 .redeem-status-v1{min-height:18px;margin-top:9px;font-size:11px}.mail-attachments-v063 b:empty{display:none}
      @media(max-width:560px){.redeem-live-v1{margin:12px 0 90px}.redeem-live-v1 form{grid-template-columns:1fr}.redeem-live-v1 button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureRedeemPanel() {
    const mailPanel = id("mailV063");
    const mailBody = id("mailBodyV063");
    if (!mailPanel || !mailBody) return null;
    let panel = id("redeemLiveV1");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "redeemLiveV1";
      panel.className = "redeem-live-v1";
      mailBody.insertAdjacentElement("afterend", panel);
      panel.addEventListener("submit", async (event) => {
        const form = event.target.closest("form");
        if (!form) return;
        event.preventDefault();
        const input = id("redeemInputV1");
        const button = id("redeemButtonV1");
        const status = id("redeemStatusV1");
        const code = input?.value?.trim() || "";
        if (!state.session?.user) {
          status.textContent = text("redeemLogin");
          return;
        }
        if (code.length < 8) {
          status.textContent = text("invalidCode");
          return;
        }
        button.disabled = true;
        status.textContent = "…";
        try {
          const data = await invoke("redeem", { code });
          applyServerSave(data.result?.save_data);
          input.value = "";
          status.textContent = `${text("redeemSuccess")} ${rewardText(data.result?.reward)}`.trim();
          showToast(text("redeemSuccess"));
        } catch (error) {
          status.textContent = mapClaimError(error, true);
          showToast(status.textContent);
        } finally {
          button.disabled = false;
        }
      });
    }
    return panel;
  }

  function renderRedeemPanel() {
    ensureStyles();
    const panel = ensureRedeemPanel();
    if (!panel) return;
    const signedIn = !!state.session?.user;
    panel.innerHTML = `
      <header><h3>${text("redeemTitle")}</h3><p>${signedIn ? text("redeemIntro") : text("redeemLogin")}</p></header>
      <form><input id="redeemInputV1" maxlength="32" autocomplete="off" autocapitalize="characters" placeholder="${text("redeemPlaceholder")}" ${signedIn ? "" : "disabled"}><button id="redeemButtonV1" type="submit" ${signedIn ? "" : "disabled"}>${text("redeemButton")}</button></form>
      <p id="redeemStatusV1" class="redeem-status-v1" aria-live="polite"></p>`;
  }

  function decorateMailAttachments() {
    const active = q('[data-v063-mail-id].active');
    if (!active) return;
    const message = messageByCatalogId(active.dataset.v063MailId);
    if (!message?.attachments) return;
    const label = q(".mail-reader-v063 .mail-attachments-v063 b");
    if (!label) return;
    const nextText = rewardText(message.attachments);
    if (label.textContent !== nextText) label.textContent = nextText;
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const claim = event.target.closest?.("[data-v063-claim-mail]");
      if (claim) {
        const message = messageByCatalogId(claim.dataset.v063ClaimMail);
        if (message) {
          event.preventDefault();
          event.stopImmediatePropagation();
          claimLiveMail(claim, message);
          return;
        }
      }

      const mailButton = event.target.closest?.("[data-v063-mail-id]");
      if (mailButton) {
        const message = messageByCatalogId(mailButton.dataset.v063MailId);
        if (message) window.setTimeout(() => markLiveMailRead(message), 0);
      }

      if (event.target.closest?.('[data-v063-open="mailV063"]')) {
        window.setTimeout(() => {
          renderRedeemPanel();
          refreshMail();
        }, 0);
      }
    }, true);

    window.addEventListener("cherrift:languagechange", () => {
      rebuildCatalog();
      renderRedeemPanel();
    });

    const observer = new MutationObserver(() => {
      ensureRedeemPanel();
      decorateMailAttachments();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function start() {
    if (state.ready) return;
    if (typeof factory !== "function" || !CONFIG.url || !CONFIG.publishableKey) return;
    if (!window.CHERRIFT_V063 || !window.UI || !window.CHERRIFT_AUTH) {
      window.setTimeout(start, 120);
      return;
    }
    state.ready = true;
    state.client = factory(CONFIG.url, CONFIG.publishableKey, {
      auth: {
        storageKey: CONFIG.authStorageKey || "cherrift-supabase-auth-v063",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
    bindEvents();
    ensureStyles();
    renderRedeemPanel();
    const { data } = await state.client.auth.getSession();
    state.session = data?.session || null;
    state.client.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      renderRedeemPanel();
      refreshMail();
    });
    await refreshMail();
    console.info("[CHERRIFT] Live GM Mail and Redeem services loaded.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
