(() => {
"use strict";

const VERSION = "0.6.3-auth.2-cloud";
const CLOUD_SAVE_VERSION = "0.6.3-cloud.1";
const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
const CLOUD_TABLE = CONFIG.cloudSaveTable || "game_saves";
const SAVE_DEBOUNCE_MS = 650;
const id = name => document.getElementById(name);
const q = (selector, root = document) => root.querySelector(selector);

const COPY = {
  hu: {
    kicker: "FIÓK HOZZÁFÉRÉS",
    title: "Hogyan szeretnéd folytatni?",
    intro: "Lépj be Discorddal a felhőmentéshez, vagy játssz vendégként helyi mentéssel.",
    guest: "Vendégként folytatom",
    guestMeta: "Helyi mentés csak ezen az eszközön",
    discord: "Belépés Discorddal",
    discordMeta: "Supabase felhőmentés minden eszközön",
    warningTitle: "A vendégmentés elveszhet",
    warning: "A Guest-haladás csak ebben a böngészőben tárolódik. A böngészőadatok törlése, privát mód vagy másik eszköz esetén nem állítható vissza.",
    privacy: "A CHERRIFT nem látja és nem tárolja a Discord-jelszavadat.",
    checking: "Discord munkamenet és mentés ellenőrzése…",
    loadingCloud: "Felhőmentés betöltése…",
    redirecting: "Átirányítás a Discord belépéshez…",
    welcomeBack: "Üdv újra, Cherry!",
    loginFailed: "A Discord-belépés nem sikerült.",
    serviceUnavailable: "A Discord-belépés most nem érhető el. Vendégként továbbra is játszhatsz.",
    cloudUnavailable: "A Supabase felhőmentés nem érhető el. Futtasd a supabase/game_saves.sql fájlt a Supabase SQL Editorban, majd próbáld újra.",
    cloudSaveFailed: "A felhőmentés átmenetileg nem sikerült. A játék a következő mentésnél újrapróbálja.",
    signedOut: "Kijelentkeztél a Discord-fiókból.",
    connected: "Discord-fiók csatlakoztatva",
    cloudActive: "Discord mód · Supabase felhőmentés",
    localOnly: "Vendégmód · csak helyi mentés",
    signOut: "Kijelentkezés",
    accountKicker: "FIÓK",
    account: "CHERRIFT-fiók",
    accountIntro: "Discord-azonosítás és a jelenlegi mentési mód.",
    accountReady: "A haladás ehhez a Discord-fiókhoz kötve a Supabase-ben tárolódik, és másik eszközön is automatikusan betöltődik.",
    accountMemoryOnly: "A Discord-fiók aktív, de ebben a tesztkörnyezetben nincs adatbázis-kapcsolat.",
    guestAccount: "Jelenleg vendégként játszol. A mentés csak ezen az eszközön található.",
    discordLogin: "Discord Login",
    testBuild: "TESZTVERZIÓ · v0.9.0",
    language: "Nyelv"
  },
  en: {
    kicker: "ACCOUNT ACCESS",
    title: "How would you like to continue?",
    intro: "Sign in with Discord for cloud saves, or play as a Guest with a local save.",
    guest: "Continue as Guest",
    guestMeta: "Local save on this device only",
    discord: "Continue with Discord",
    discordMeta: "Supabase cloud save across devices",
    warningTitle: "Guest progress can be lost",
    warning: "Guest progress is stored only in this browser. It cannot be restored after clearing browser data, using private mode or moving to another device.",
    privacy: "CHERRIFT never sees or stores your Discord password.",
    checking: "Checking your Discord session and save…",
    loadingCloud: "Loading cloud save…",
    redirecting: "Redirecting to Discord sign-in…",
    welcomeBack: "Welcome back, Cherry!",
    loginFailed: "Discord sign-in was not completed.",
    serviceUnavailable: "Discord sign-in is temporarily unavailable. You can still continue as Guest.",
    cloudUnavailable: "Supabase cloud saves are unavailable. Run supabase/game_saves.sql in the Supabase SQL Editor, then try again.",
    cloudSaveFailed: "Cloud saving temporarily failed. The game will retry on the next save.",
    signedOut: "You signed out of Discord.",
    connected: "Discord account connected",
    cloudActive: "Discord mode · Supabase cloud save",
    localOnly: "Guest mode · local save only",
    signOut: "Sign out",
    accountKicker: "ACCOUNT",
    account: "CHERRIFT Account",
    accountIntro: "Discord identity and the current save mode.",
    accountReady: "Progress is tied to this Discord account, stored in Supabase and automatically loaded on other devices.",
    accountMemoryOnly: "Discord is active, but this test environment has no database connection.",
    guestAccount: "You are currently playing as a guest. The save exists only on this device.",
    discordLogin: "Discord Login",
    testBuild: "TEST BUILD · v0.9.0",
    language: "Language"
  }
};

const runtime = {
  client: null,
  session: null,
  mode: "checking",
  busy: false,
  statusKey: "checking",
  errorKey: "",
  errorDetail: "",
  gateVisible: false,
  bootReleased: false,
  startPromise: null,
  subscription: null,
  bootstrapPromise: null,
  bootstrapDone: false,
  bootstrapErrorKey: "",
  bootstrapErrorDetail: "",
  loadGuestSave: null,
  cloudReady: false,
  memoryOnly: false,
  pendingSave: null,
  saveTimer: 0,
  savePromise: Promise.resolve(),
  lastSavedJson: "",
  lastCloudSavedAt: "",
  cloudErrorShown: false
};

function language() {
  const active = window.CHERRIFT_I18N?.language || window.UI?.save?.settings?.language;
  return active === "en" ? "en" : "hu";
}

function text(key) {
  return COPY[language()][key] || COPY.en[key] || key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeDefaults(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) return Array.isArray(savedValue) ? cloneJson(savedValue) : cloneJson(defaultValue);
  if (isPlainObject(defaultValue)) {
    const source = isPlainObject(savedValue) ? savedValue : {};
    const merged = {};
    for (const [key, value] of Object.entries(defaultValue)) merged[key] = mergeDefaults(value, source[key]);
    for (const [key, value] of Object.entries(source)) if (!(key in merged)) merged[key] = cloneJson(value);
    return merged;
  }
  return savedValue === undefined ? defaultValue : savedValue;
}

function normalizeCloudSave(value) {
  const defaults = window.CherriftStorage?.defaults?.() || {};
  return mergeDefaults(defaults, isPlainObject(value) ? value : {});
}

function authRedirectUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function oauthErrorFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("error_description") ||
    url.searchParams.get("error_code") ||
    url.searchParams.get("error") || "";
}

function cleanOAuthUrl() {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["code", "error", "error_code", "error_description"]) {
    if (!url.searchParams.has(key)) continue;
    url.searchParams.delete(key);
    changed = true;
  }
  if (changed) window.history.replaceState(window.history.state, document.title, url.pathname + url.search + url.hash);
}

function createAuthClient() {
  const factory = window.__CHERRIFT_SUPABASE_FACTORY__ || window.supabase?.createClient;
  if (typeof factory !== "function" || !CONFIG.url || !CONFIG.publishableKey) return null;
  try {
    return factory(CONFIG.url, CONFIG.publishableKey, {
      auth: {
        storageKey: CONFIG.authStorageKey || "cherrift-supabase-auth-v063",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
  } catch (error) {
    console.error("[CHERRIFT Auth] Supabase client creation failed:", error);
    return null;
  }
}

function accountFromSession(session = runtime.session) {
  const user = session?.user;
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const discordIdentity = (user.identities || []).find(identity => identity.provider === "discord");
  const identity = discordIdentity?.identity_data || {};
  return {
    id: user.id,
    discordId: identity.provider_id || identity.sub || metadata.provider_id || "",
    name: metadata.full_name || metadata.global_name || metadata.name || metadata.preferred_username || metadata.user_name || identity.full_name || identity.name || "Discord Player",
    username: metadata.user_name || metadata.preferred_username || identity.user_name || identity.preferred_username || "",
    avatar: metadata.avatar_url || metadata.picture || identity.avatar_url || identity.picture || ""
  };
}

function applyDiscordProfileToSave(save, session = runtime.session) {
  const account = accountFromSession(session);
  if (!account || !save) return account;
  save.profile ||= { name: "Cherry Player", createdAt: Date.now() };
  if (save.profile.authProvider !== "discord" && !save.profile.localNameBeforeDiscord) {
    save.profile.localNameBeforeDiscord = save.profile.name || "Cherry Player";
  }
  save.profile.authProvider = "discord";
  save.profile.discordUserId = account.id;
  save.profile.discordId = account.discordId;
  save.profile.discordUsername = account.username;
  save.profile.name = account.name;
  save.profile.avatarUrl = account.avatar;
  return account;
}

function applyGuestProfileToSave(save) {
  if (!save) return save;
  save.profile ||= { name: "Cherry Player", createdAt: Date.now() };
  if (save.profile.authProvider === "discord") {
    save.profile.name = save.profile.localNameBeforeDiscord || "Cherry Player";
  }
  save.profile.authProvider = "guest";
  save.profile.discordUserId = "";
  save.profile.discordId = "";
  save.profile.discordUsername = "";
  save.profile.avatarUrl = "";
  return save;
}

function currentGuestSave() {
  const loader = runtime.loadGuestSave || (() => window.CherriftStorage?.load?.() || window.CherriftStorage?.defaults?.() || {});
  return loader();
}

async function selectCloudSave(userId) {
  if (typeof runtime.client?.from !== "function") return { supported: false, row: null };
  const result = await runtime.client
    .from(CLOUD_TABLE)
    .select("save_data, save_version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (result?.error) throw result.error;
  return { supported: true, row: result?.data || null };
}

async function upsertCloudSnapshot(snapshot) {
  const account = accountFromSession();
  if (!account || typeof runtime.client?.from !== "function") return false;
  const payload = {
    user_id: account.id,
    save_data: cloneJson(snapshot),
    save_version: CLOUD_SAVE_VERSION,
    updated_at: new Date().toISOString()
  };
  const result = await runtime.client
    .from(CLOUD_TABLE)
    .upsert(payload, { onConflict: "user_id" });
  if (result?.error) throw result.error;
  runtime.lastCloudSavedAt = payload.updated_at;
  return true;
}

function cloudErrorDetail(error) {
  return error?.message || error?.details || error?.hint || String(error || "");
}

async function bootstrapSave(loadGuestSave) {
  if (runtime.bootstrapPromise) return runtime.bootstrapPromise;
  runtime.loadGuestSave = typeof loadGuestSave === "function" ? loadGuestSave : null;
  runtime.bootstrapPromise = (async () => {
    const loadGuest = () => currentGuestSave();
    const oauthError = oauthErrorFromUrl();
    try {
      if (!runtime.client) {
        runtime.mode = "gate";
        runtime.bootstrapErrorKey = "serviceUnavailable";
        return loadGuest();
      }

      runtime.statusKey = "checking";
      const sessionResult = await runtime.client.auth.getSession();
      if (sessionResult?.error) throw sessionResult.error;
      const session = sessionResult?.data?.session;
      if (!session?.user) {
        runtime.mode = "gate";
        if (oauthError) {
          runtime.bootstrapErrorKey = "loginFailed";
          runtime.bootstrapErrorDetail = oauthError;
        }
        return loadGuest();
      }

      runtime.session = session;
      runtime.mode = "discord";
      runtime.statusKey = "loadingCloud";
      const cloud = await selectCloudSave(session.user.id);

      if (!cloud.supported) {
        const memorySave = normalizeCloudSave(loadGuest());
        applyDiscordProfileToSave(memorySave, session);
        runtime.memoryOnly = true;
        runtime.cloudReady = false;
        runtime.lastSavedJson = JSON.stringify(memorySave);
        console.warn("[CHERRIFT Cloud Save] Database API is unavailable in this environment; using memory-only Discord mode.");
        return memorySave;
      }

      let save;
      if (cloud.row?.save_data) {
        save = normalizeCloudSave(cloud.row.save_data);
      } else {
        save = normalizeCloudSave(loadGuest());
        applyDiscordProfileToSave(save, session);
        await upsertCloudSnapshot(save);
      }

      applyDiscordProfileToSave(save, session);
      runtime.cloudReady = true;
      runtime.lastSavedJson = JSON.stringify(save);
      runtime.lastCloudSavedAt = cloud.row?.updated_at || runtime.lastCloudSavedAt;
      return save;
    } catch (error) {
      console.error("[CHERRIFT Cloud Save] Initial cloud load failed:", error);
      runtime.bootstrapErrorKey = "cloudUnavailable";
      runtime.bootstrapErrorDetail = cloudErrorDetail(error);
      runtime.cloudReady = false;
      runtime.memoryOnly = false;
      runtime.mode = "gate";
      runtime.session = null;
      try { await runtime.client?.auth?.signOut?.({ scope: "local" }); } catch (_) {}
      return loadGuest();
    } finally {
      runtime.bootstrapDone = true;
      cleanOAuthUrl();
    }
  })();
  return runtime.bootstrapPromise;
}

function queueCloudSave(data) {
  if (runtime.mode !== "discord") return false;
  if (runtime.memoryOnly) return true;
  if (!runtime.cloudReady || !runtime.session?.user) return false;
  runtime.pendingSave = cloneJson(data);
  window.clearTimeout(runtime.saveTimer);
  runtime.saveTimer = window.setTimeout(() => { flushCloudSave(); }, SAVE_DEBOUNCE_MS);
  return true;
}

async function flushCloudSave() {
  window.clearTimeout(runtime.saveTimer);
  runtime.saveTimer = 0;
  const snapshot = runtime.pendingSave;
  runtime.pendingSave = null;
  if (!snapshot || runtime.mode !== "discord" || runtime.memoryOnly || !runtime.cloudReady) return true;
  const serialized = JSON.stringify(snapshot);
  if (serialized === runtime.lastSavedJson) return true;

  runtime.savePromise = runtime.savePromise.catch(() => {}).then(async () => {
    try {
      await upsertCloudSnapshot(snapshot);
      runtime.lastSavedJson = serialized;
      runtime.cloudErrorShown = false;
      renderAccountSettings();
      return true;
    } catch (error) {
      console.error("[CHERRIFT Cloud Save] Save failed:", error);
      if (!runtime.pendingSave) runtime.pendingSave = snapshot;
      if (!runtime.cloudErrorShown) {
        runtime.cloudErrorShown = true;
        window.UI?.toast?.(text("cloudSaveFailed"));
      }
      return false;
    } finally {
      if (runtime.pendingSave && !runtime.saveTimer) {
        runtime.saveTimer = window.setTimeout(() => { flushCloudSave(); }, SAVE_DEBOUNCE_MS * 2);
      }
    }
  });
  return runtime.savePromise;
}

function ensureGate() {
  if (id("authGateV064")) return id("authGateV064");
  const gate = document.createElement("section");
  gate.id = "authGateV064";
  gate.className = "auth-gate-v064";
  gate.hidden = true;
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "authTitleV064");
  gate.setAttribute("data-i18n-ignore", "true");
  gate.innerHTML = [
    '<div class="auth-backdrop-v064" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>',
    '<main class="auth-card-v064">',
      '<header class="auth-top-v064">',
        '<div><strong>CHERRIFT</strong><span id="authBuildV064"></span></div>',
        '<nav class="auth-language-v064" aria-label="Language">',
          '<button type="button" data-auth-language="hu">HU</button>',
          '<button type="button" data-auth-language="en">EN</button>',
        '</nav>',
      '</header>',
      '<div class="auth-emblem-v064" aria-hidden="true">✦</div>',
      '<p class="auth-kicker-v064" id="authKickerV064"></p>',
      '<h1 id="authTitleV064"></h1>',
      '<p class="auth-intro-v064" id="authIntroV064"></p>',
      '<div class="auth-options-v064">',
        '<button type="button" id="authGuestV064" class="auth-choice-v064 guest" data-auth-action="guest">',
          '<span class="auth-choice-icon-v064" aria-hidden="true">◇</span>',
          '<span><b id="authGuestTitleV064"></b><small id="authGuestMetaV064"></small></span>',
          '<i aria-hidden="true">›</i>',
        '</button>',
        '<button type="button" id="authDiscordV064" class="auth-choice-v064 discord" data-auth-action="discord">',
          '<span class="auth-choice-icon-v064 discord-mark-v064" aria-hidden="true">●●</span>',
          '<span><b id="authDiscordTitleV064"></b><small id="authDiscordMetaV064"></small></span>',
          '<i aria-hidden="true">›</i>',
        '</button>',
      '</div>',
      '<aside class="auth-warning-v064"><i aria-hidden="true">!</i><span><b id="authWarningTitleV064"></b><small id="authWarningV064"></small></span></aside>',
      '<p id="authErrorV064" class="auth-error-v064" role="alert" hidden></p>',
      '<p id="authStatusV064" class="auth-status-v064" aria-live="polite"></p>',
      '<footer><span aria-hidden="true">◆</span><p id="authPrivacyV064"></p></footer>',
    '</main>'
  ].join("");
  const boot = id("bootV060");
  if (boot) boot.insertAdjacentElement("afterend", gate);
  else document.body.prepend(gate);
  return gate;
}

function setGateError(key = "", detail = "") {
  runtime.errorKey = key;
  runtime.errorDetail = detail;
  renderGate();
}

function setGateStatus(key = "") {
  runtime.statusKey = key;
  renderGate();
}

function setBusy(value) {
  runtime.busy = !!value;
  renderGate();
}

function renderGate() {
  const gate = ensureGate();
  id("authBuildV064").textContent = text("testBuild");
  id("authKickerV064").textContent = text("kicker");
  id("authTitleV064").textContent = text("title");
  id("authIntroV064").textContent = text("intro");
  id("authGuestTitleV064").textContent = text("guest");
  id("authGuestMetaV064").textContent = text("guestMeta");
  id("authDiscordTitleV064").textContent = text("discord");
  id("authDiscordMetaV064").textContent = text("discordMeta");
  id("authWarningTitleV064").textContent = text("warningTitle");
  id("authWarningV064").textContent = text("warning");
  id("authPrivacyV064").textContent = text("privacy");
  gate.setAttribute("aria-label", text("title"));

  const error = id("authErrorV064");
  const errorText = runtime.errorKey
    ? text(runtime.errorKey) + (runtime.errorDetail ? " " + runtime.errorDetail : "")
    : "";
  error.textContent = errorText;
  error.hidden = !errorText;
  id("authStatusV064").textContent = runtime.statusKey ? text(runtime.statusKey) : "";

  const guest = id("authGuestV064");
  const discord = id("authDiscordV064");
  guest.disabled = runtime.busy;
  discord.disabled = runtime.busy || !runtime.client;
  discord.setAttribute("aria-disabled", String(discord.disabled));
  for (const button of gate.querySelectorAll("[data-auth-language]")) {
    button.classList.toggle("active", button.dataset.authLanguage === language());
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  }
}

function openGate(options = {}) {
  const gate = ensureGate();
  runtime.gateVisible = true;
  runtime.mode = "gate";
  runtime.busy = false;
  runtime.statusKey = options.statusKey || "";
  runtime.errorKey = options.errorKey || runtime.errorKey || "";
  runtime.errorDetail = options.errorDetail || runtime.errorDetail || "";
  gate.hidden = false;
  document.body.classList.add("auth-gated-v064");
  renderGate();
  window.setTimeout(() => id("authDiscordV064")?.focus(), 0);
  window.dispatchEvent(new CustomEvent("cherrift:authgate", { detail: { visible: true } }));
}

function closeGate(mode) {
  const gate = ensureGate();
  runtime.gateVisible = false;
  runtime.mode = mode;
  runtime.busy = false;
  runtime.statusKey = "";
  runtime.errorKey = "";
  runtime.errorDetail = "";
  gate.hidden = true;
  document.body.classList.remove("auth-gated-v064");
  window.dispatchEvent(new CustomEvent("cherrift:authgate", { detail: { visible: false, mode } }));
}

function saveProfile() {
  if (!window.UI?.save) return;
  try { window.CherriftStorage?.save?.(window.UI.save); } catch (error) {
    console.warn("[CHERRIFT Auth] Profile update could not be saved:", error);
  }
}

function applyDiscordProfile(session) {
  const account = applyDiscordProfileToSave(window.UI?.save, session);
  if (account) saveProfile();
  return account;
}

function switchUiToGuestSave() {
  runtime.mode = "guest";
  runtime.cloudReady = false;
  runtime.memoryOnly = false;
  runtime.pendingSave = null;
  window.clearTimeout(runtime.saveTimer);
  const save = applyGuestProfileToSave(currentGuestSave());
  if (window.UI) window.UI.save = save;
  if (window.UI?.game) window.UI.game.save = save;
  try { window.CherriftStorage?.save?.(save); } catch (error) {
    console.warn("[CHERRIFT Auth] Guest save could not be restored:", error);
  }
  return save;
}

function setAvatar(holder, account) {
  if (!holder) return;
  holder.replaceChildren();
  if (account?.avatar) {
    const image = document.createElement("img");
    image.src = account.avatar;
    image.alt = account.name;
    image.referrerPolicy = "no-referrer";
    image.draggable = false;
    holder.appendChild(image);
  } else {
    holder.textContent = "🐰";
  }
}

function renderMainAccount() {
  const card = q("#menu .login-card-v026");
  if (!card) return;
  card.setAttribute("data-i18n-ignore", "true");
  const account = runtime.mode === "discord" ? accountFromSession() : null;
  const name = q(".login-copy strong", card);
  const description = q(".login-copy p", card);
  const button = q(".discord-login", card);
  setAvatar(q(".avatar-badge", card), account);
  if (name) name.textContent = account?.name || (language() === "hu" ? "Vendég" : "Guest");
  if (description) description.textContent = account ? text(runtime.cloudReady ? "cloudActive" : "connected") : text("localOnly");
  if (button) {
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.dataset.authAction = account ? "signout" : "open";
    button.textContent = account ? text("signOut") : text("discordLogin");
    button.setAttribute("aria-label", button.textContent);
  }
  const railName = id("railProfileNameV060");
  if (railName && account) railName.textContent = account.name;
}

function renderAccountSettings() {
  const page = q('[data-v060-settings-page="account"]');
  if (!page) return;
  page.setAttribute("data-i18n-ignore", "true");
  const account = runtime.mode === "discord" ? accountFromSession() : null;
  const avatar = account?.avatar
    ? '<img src="' + escapeHtml(account.avatar) + '" alt="' + escapeHtml(account.name) + '" referrerpolicy="no-referrer" draggable="false">'
    : '<span aria-hidden="true">🐰</span>';
  const accountDescription = account
    ? text(runtime.cloudReady ? "accountReady" : "accountMemoryOnly")
    : text("guestAccount");
  page.innerHTML = [
    '<header><small>' + escapeHtml(text("accountKicker")) + '</small><h3>' + escapeHtml(text("account")) + '</h3><p>' + escapeHtml(text("accountIntro")) + '</p></header>',
    '<article class="auth-account-v064 ' + (account ? "connected" : "guest") + '">',
      '<div class="auth-account-avatar-v064">' + avatar + '</div>',
      '<div class="auth-account-copy-v064">',
        '<small>' + escapeHtml(account ? text(runtime.cloudReady ? "cloudActive" : "connected") : text("localOnly")) + '</small>',
        '<h4>' + escapeHtml(account?.name || (language() === "hu" ? "Vendég" : "Guest")) + '</h4>',
        '<p>' + escapeHtml(accountDescription) + '</p>',
      '</div>',
      '<button type="button" data-auth-action="' + (account ? "signout" : "open") + '">' + escapeHtml(account ? text("signOut") : text("discordLogin")) + '</button>',
    '</article>'
  ].join("");
  const tab = q('[data-v060-settings="account"]');
  const badge = q("em", tab);
  if (badge) badge.textContent = account ? (runtime.cloudReady ? "CLOUD" : "LIVE") : "LOGIN";
}

function syncAccountUi() {
  renderMainAccount();
  renderAccountSettings();
}

function completeDiscordSession(session) {
  if (!session?.user) return false;
  runtime.session = session;
  runtime.mode = "discord";
  applyDiscordProfile(session);
  closeGate("discord");
  syncAccountUi();
  window.UI?.refreshMenu?.();
  return true;
}

function continueAsGuest() {
  runtime.session = null;
  runtime.mode = "guest";
  applyGuestProfileToSave(window.UI?.save);
  saveProfile();
  closeGate("guest");
  syncAccountUi();
  window.UI?.refreshMenu?.();
  return true;
}

async function signInWithDiscord() {
  if (!runtime.client || runtime.busy) {
    setGateError("serviceUnavailable");
    return false;
  }
  setGateError();
  setGateStatus("redirecting");
  setBusy(true);
  try {
    const result = await runtime.client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: authRedirectUrl() }
    });
    if (result?.error) throw result.error;
    return true;
  } catch (error) {
    console.error("[CHERRIFT Auth] Discord OAuth failed:", error);
    runtime.busy = false;
    runtime.statusKey = "";
    setGateError("loginFailed", error?.message || "");
    return false;
  }
}

async function signOut() {
  if (runtime.busy) return false;
  runtime.busy = true;
  syncAccountUi();
  try {
    await flushCloudSave();
    const result = runtime.client ? await runtime.client.auth.signOut({ scope: "local" }) : null;
    if (result?.error) throw result.error;
    runtime.session = null;
    switchUiToGuestSave();
    openGate({ statusKey: "signedOut" });
    syncAccountUi();
    window.UI?.refreshMenu?.();
    return true;
  } catch (error) {
    console.error("[CHERRIFT Auth] Sign out failed:", error);
    runtime.busy = false;
    syncAccountUi();
    window.UI?.toast?.(text("loginFailed"));
    return false;
  }
}

function releaseBoot() {
  if (runtime.bootReleased) return;
  runtime.bootReleased = true;
  const boot = id("bootV060");
  const fill = id("bootFillV060");
  const percent = id("bootPercentV060");
  const status = id("bootTextV060");
  if (fill) fill.style.width = "100%";
  if (percent) percent.textContent = "100%";
  if (status) status.textContent = text("welcomeBack");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove("v060-booting");
    boot?.classList.add("done");
    window.setTimeout(() => boot?.remove(), 500);
  }));
}

function bindAuthSubscription() {
  if (!runtime.client || runtime.subscription) return;
  const result = runtime.client.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => {
      if (!runtime.bootstrapDone) return;
      if (session?.user && runtime.mode !== "discord") completeDiscordSession(session);
      else if (event === "SIGNED_OUT" && runtime.mode === "discord") {
        runtime.session = null;
        switchUiToGuestSave();
        openGate({ statusKey: "signedOut" });
        syncAccountUi();
      }
    }, 0);
  });
  runtime.subscription = result?.data?.subscription || null;
}

async function startAuthGate() {
  if (runtime.startPromise) return runtime.startPromise;
  runtime.startPromise = (async () => {
    ensureGate();
    renderGate();
    try {
      if (runtime.bootstrapPromise) await runtime.bootstrapPromise;
      if (runtime.session?.user && runtime.mode === "discord") {
        applyDiscordProfile(runtime.session);
        closeGate("discord");
        syncAccountUi();
      } else {
        openGate({
          errorKey: runtime.bootstrapErrorKey || "",
          errorDetail: runtime.bootstrapErrorDetail || ""
        });
      }
    } finally {
      releaseBoot();
    }
  })();
  return runtime.startPromise;
}

const previousStorageSave = window.CherriftStorage?.save?.bind(window.CherriftStorage);
if (previousStorageSave) {
  window.CherriftStorage.save = function saveByAccountMode(data) {
    if (runtime.mode === "discord") {
      queueCloudSave(data);
      return;
    }
    return previousStorageSave(data);
  };
}

window.addEventListener("pagehide", () => { flushCloudSave(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushCloudSave();
});

document.addEventListener("click", event => {
  const languageButton = event.target.closest?.("[data-auth-language]");
  if (languageButton) {
    event.preventDefault();
    window.CHERRIFT_I18N?.setLanguage?.(languageButton.dataset.authLanguage, true);
    renderGate();
    syncAccountUi();
    return;
  }
  const actionButton = event.target.closest?.("[data-auth-action]");
  if (!actionButton || actionButton.disabled) return;
  event.preventDefault();
  const action = actionButton.dataset.authAction;
  if (action === "guest") continueAsGuest();
  else if (action === "discord") signInWithDiscord();
  else if (action === "signout") signOut();
  else if (action === "open") openGate();
});

window.addEventListener("cherrift:languagechange", () => {
  renderGate();
  syncAccountUi();
  window.setTimeout(syncAccountUi, 0);
});

const previousInit = window.UI?.init?.bind(window.UI);
if (previousInit) {
  window.UI.init = function initAuthV064(save, game) {
    const result = previousInit(save, game);
    syncAccountUi();
    return result;
  };
}

const previousRefresh = window.UI?.refreshMenu?.bind(window.UI);
if (previousRefresh) {
  window.UI.refreshMenu = function refreshMenuAuthV064(...args) {
    const result = previousRefresh(...args);
    syncAccountUi();
    return result;
  };
}

const previousAfterUi = window.CHERRIFT_V060?.initAfterUI?.bind(window.CHERRIFT_V060);
if (previousAfterUi) {
  window.CHERRIFT_V060.initAfterUI = function initAfterUiAuthV064(...args) {
    const result = previousAfterUi(...args);
    syncAccountUi();
    return result;
  };
}

runtime.client = createAuthClient();
bindAuthSubscription();
ensureGate();
renderGate();

if (window.CHERRIFT_V060?.finishBoot) {
  window.CHERRIFT_V060.finishBoot = function finishBootWithAuthV064() {
    startAuthGate();
  };
}

window.CHERRIFT_AUTH = {
  version: VERSION,
  get clientReady() { return !!runtime.client; },
  get redirectUrl() { return authRedirectUrl(); },
  getState() {
    const account = accountFromSession();
    return {
      mode: runtime.mode,
      gateVisible: runtime.gateVisible,
      busy: runtime.busy,
      signedIn: !!account,
      cloudReady: runtime.cloudReady,
      memoryOnly: runtime.memoryOnly,
      cloudTable: CLOUD_TABLE,
      savePending: !!runtime.pendingSave,
      lastCloudSavedAt: runtime.lastCloudSavedAt,
      account: account ? { id: account.id, discordId: account.discordId, name: account.name, username: account.username, avatar: account.avatar } : null
    };
  },
  bootstrapSave,
  flushCloudSave,
  openGate,
  continueAsGuest,
  signInWithDiscord,
  signOut,
  start: startAuthGate,
  applySessionForTesting: completeDiscordSession
};

console.info("[CHERRIFT] Supabase Discord auth and cloud save loaded.");
})();
