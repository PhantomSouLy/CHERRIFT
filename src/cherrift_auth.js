(() => {
  "use strict";

  if (window.__CHERRIFT_AUTH_V3__) return;
  window.__CHERRIFT_AUTH_V3__ = true;

  const VERSION = "3.0.0-local-first-bootstrap+3.1.0-deterministic-pkce";
  const SAVE_VERSION = "0.9.5-prebeta.2";
  const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
  const PLAYER_FUNCTION = CONFIG.playerFunctionName || "player-api";
  const SAVE_DEBOUNCE_MS = 700;
  const TIMEOUTS = window.CHERRIFT_TIMEOUTS || {};

  function configuredTimeout(name, fallback) {
    const value = Number(TIMEOUTS[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  const AUTH_TIMEOUT_MS = configuredTimeout("authBootstrapMs", 6000);
  const OAUTH_TIMEOUT_MS = configuredTimeout("oauthStartMs", 6000);
  const CLOUD_TIMEOUT_MS = configuredTimeout("cloudBootstrapMs", 12000);
  const SIGN_OUT_TIMEOUT_MS = configuredTimeout("authSignOutMs", 4000);

  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;

  const COPY = {
    hu: {
      kicker:"FIÓK HOZZÁFÉRÉS",
      title:"Hogyan szeretnéd folytatni?",
      intro:"Lépj be Discorddal az online játékhoz, vagy nézz körül vendégként.",
      guest:"Vendégként folytatom",
      guestMeta:"Menüelőnézet · a játékhoz online belépés kell",
      discord:"Belépés Discorddal",
      discordMeta:"Biztonságos felhőmentés minden eszközön",
      warningTitle:"Online fejlődés",
      warning:"Jutalmat és fejlődést a szerver ment. Vendégként a menüket nézheted meg.",
      privacy:"A CHERRIFT nem látja és nem tárolja a Discord-jelszavadat.",
      checking:"Discord-munkamenet ellenőrzése…",
      loadingCloud:"Felhőmentés betöltése…",
      redirecting:"Átirányítás a Discord belépéshez…",
      signedOut:"Kijelentkeztél a Discord-fiókból.",
      loginFailed:"A Discord-belépés nem sikerült.",
      serviceUnavailable:"A Discord ellenőrzése nem válaszolt időben. Vendégként beléphetsz, vagy újrapróbálhatod a Discord-logint.",
      cloudUnavailable:"A felhőmentés most nem válaszol. A helyi másolat megmaradt; a játékhoz és új jutalmakhoz helyre kell állítani a kapcsolatot.",
      cloudSaveFailed:"A felhőmentés átmenetileg nem sikerült. A biztonsági mentés helyben megmaradt.",
      guestDisabled:"A vendégmód ebben a tesztidőszakban nem érhető el.",
      connected:"Discord-fiók csatlakoztatva",
      cloudActive:"Discord mód · Supabase felhőmentés",
      offlineAccount:"Discord mód · kapcsolat helyreállítása szükséges",
      localOnly:"Vendégmód · csak helyi mentés",
      signOut:"Kijelentkezés",
      discordLogin:"Discord Login",
      accountKicker:"FIÓK",
      account:"CHERRIFT-fiók",
      accountIntro:"Discord-azonosítás és a jelenlegi mentési mód.",
      accountReady:"A haladás ehhez a Discord-fiókhoz kötve, a Supabase-ben tárolódik.",
      accountOffline:"A helyi másolat megmaradt. Az online játék a kapcsolat helyreállítása után folytatható; az ütköző másolatokat külön megőrizzük.",
      guestAccount:"Vendégelőnézet. A játékhoz, jutalmakhoz és fejlődéshez online Discord-belépés szükséges.",
      testBuild:"PRE-BÉTA · v0.9.5"
    },
    en: {
      kicker:"ACCOUNT ACCESS",
      title:"How would you like to continue?",
      intro:"Sign in with Discord to play online, or preview the menus as a Guest.",
      guest:"Continue as Guest",
      guestMeta:"Menu preview · gameplay requires an online account",
      discord:"Continue with Discord",
      discordMeta:"Secure cloud save across devices",
      warningTitle:"Online progression",
      warning:"The server saves rewards and progression. Guest mode previews the menus.",
      privacy:"CHERRIFT never sees or stores your Discord password.",
      checking:"Checking Discord session…",
      loadingCloud:"Loading cloud save…",
      redirecting:"Redirecting to Discord sign-in…",
      signedOut:"You signed out of Discord.",
      loginFailed:"Discord sign-in was not completed.",
      serviceUnavailable:"Discord did not answer in time. Continue as Guest or retry Discord sign-in.",
      cloudUnavailable:"Cloud save is unavailable. Your local copy is preserved; reconnect to play and earn rewards.",
      cloudSaveFailed:"Cloud saving temporarily failed. The local account backup is still safe.",
      guestDisabled:"Guest mode is unavailable during this test period.",
      connected:"Discord account connected",
      cloudActive:"Discord mode · Supabase cloud save",
      offlineAccount:"Discord mode · reconnect to continue",
      localOnly:"Guest mode · local save only",
      signOut:"Sign out",
      discordLogin:"Discord Login",
      accountKicker:"ACCOUNT",
      account:"CHERRIFT Account",
      accountIntro:"Discord identity and the current save mode.",
      accountReady:"Progress is tied to this Discord account and stored in Supabase.",
      accountOffline:"Your local copy is preserved. Reconnect to resume online gameplay; conflicting copies are preserved separately.",
      guestAccount:"Guest preview. Gameplay, rewards and progression require an online Discord account.",
      testBuild:"PRE-BETA · v0.9.5"
    }
  };

  const runtime = {
    client:null,
    session:null,
    mode:"checking",
    gateVisible:false,
    busy:false,
    statusKey:"checking",
    errorKey:"",
    errorDetail:"",
    bootstrapSave:null,
    bootstrapDone:false,
    started:false,
    discovering:false,
    discoveryPromise:null,
    authAttempt:0,
    accountGeneration:0,
    guestExplicit:false,
    subscription:null,
    loadGuestSave:null,
    storageInstalled:false,
    baseStorageSave:null,
    cloudReady:false,
    onlinePolicy:false,
    offlineAccount:false,
    pendingSave:null,
    saveTimer:0,
    savePromise:Promise.resolve(),
    lastSavedJson:"",
    lastCloudSavedAt:"",
    activeUserId:"",
    cloudErrorShown:false,
    reconnecting:false,
    pendingAuthEvent:null
  };

  function language() {
    const current = window.CHERRIFT_I18N?.language || window.UI?.save?.settings?.language;
    return current === "en" ? "en" : "hu";
  }

  function text(key) {
    return COPY[language()][key] || COPY.en[key] || key;
  }

  function safeText(value, maximum = 100) {
    return String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, maximum);
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch (_) {
      return "";
    }
  }

  function cloneJson(value) {
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value ?? {})); }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function mergeDefaults(defaultValue, savedValue) {
    if (Array.isArray(defaultValue)) {
      return Array.isArray(savedValue) ? cloneJson(savedValue) : cloneJson(defaultValue);
    }
    if (isObject(defaultValue)) {
      const source = isObject(savedValue) ? savedValue : {};
      const result = {};
      for (const [key, value] of Object.entries(defaultValue)) {
        result[key] = mergeDefaults(value, source[key]);
      }
      for (const [key, value] of Object.entries(source)) {
        if (!(key in result)) result[key] = cloneJson(value);
      }
      return result;
    }
    return savedValue === undefined ? defaultValue : savedValue;
  }

  function normalizeSave(value) {
    const defaults = window.CherriftStorage?.defaults?.() || {};
    return mergeDefaults(defaults, isObject(value) ? value : {});
  }

  function deadline(factory, ms, code) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        const error = new Error(code);
        error.name = "TimeoutError";
        error.code = code;
        error.timeoutMs = ms;
        reject(error);
      }, ms);
    });
    let task;
    try { task = Promise.resolve().then(factory); }
    catch (error) { task = Promise.reject(error); }
    return Promise.race([task, timeout]).finally(() => window.clearTimeout(timer));
  }

  function authRedirectUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function oauthErrorFromUrl() {
    const url = new URL(window.location.href);
    return safeText(url.searchParams.get("error_description") ||
      url.searchParams.get("error_code") ||
      url.searchParams.get("error") || "", 180);
  }

  function oauthCodeFromUrl() {
    try {
      return safeText(new URL(window.location.href).searchParams.get("code") || "", 2048);
    } catch (_) {
      return "";
    }
  }

  function cleanOAuthUrl() {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["code", "error", "error_code", "error_description"]) {
      if (!url.searchParams.has(key)) continue;
      url.searchParams.delete(key);
      changed = true;
    }
    if (changed) {
      window.history.replaceState(
        window.history.state,
        document.title,
        `${url.pathname}${url.search}${url.hash}`
      );
    }
  }

  function clearLocalAuthArtifacts() {
    const key = String(CONFIG.authStorageKey || "cherrift-supabase-auth-v063");
    try {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(`${key}-code-verifier`);
    } catch (_) {}
  }

  function createClient() {
    const factory = window.__CHERRIFT_SUPABASE_FACTORY__ || window.supabase?.createClient;
    if (typeof factory !== "function" || !CONFIG.url || !CONFIG.publishableKey) return null;
    try {
      return factory(CONFIG.url, CONFIG.publishableKey, {
        auth:{
          storageKey:CONFIG.authStorageKey || "cherrift-supabase-auth-v063",
          persistSession:true,
          autoRefreshToken:true,
          // Callback processing is owned by discoverSession(). Letting
          // supabase-js auto-detect at the same time can race the explicit
          // PKCE exchange and consume the verifier before CHERRIFT sees the
          // resulting session (most visible in Opera/GX and cold tabs).
          detectSessionInUrl:false,
          flowType:"pkce"
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
    const identity = (user.identities || [])
      .find(item => item?.provider === "discord")?.identity_data || {};
    return {
      id:String(user.id),
      discordId:safeText(identity.provider_id || identity.sub || metadata.provider_id || "", 80),
      name:safeText(metadata.full_name || metadata.global_name || metadata.name || metadata.preferred_username || metadata.user_name || identity.full_name || identity.name || "Discord Player", 80),
      username:safeText(metadata.user_name || metadata.preferred_username || identity.user_name || identity.preferred_username || "", 80),
      avatar:safeHttpUrl(metadata.avatar_url || metadata.picture || identity.avatar_url || identity.picture || "")
    };
  }

  function applyDiscordProfile(save, session = runtime.session) {
    const account = accountFromSession(session);
    if (!account || !save) return account;
    save.profile ||= { name:"Cherry Player", createdAt:Date.now() };
    if (save.profile.authProvider !== "discord" && !save.profile.localNameBeforeDiscord) {
      save.profile.localNameBeforeDiscord = save.profile.name || "Cherry Player";
    }
    Object.assign(save.profile, {
      authProvider:"discord",
      discordUserId:account.id,
      discordId:account.discordId,
      discordUsername:account.username,
      name:account.name,
      avatarUrl:account.avatar
    });
    save.security = {
      ...(save.security || {}),
      accountOwnerId:account.id,
      schema:2
    };
    return account;
  }

  function applyGuestProfile(save) {
    if (!save) return save;
    save.profile ||= { name:"Cherry Player", createdAt:Date.now() };
    if (save.profile.authProvider === "discord") {
      save.profile.name = save.profile.localNameBeforeDiscord || "Cherry Player";
    }
    Object.assign(save.profile, {
      authProvider:"guest",
      discordUserId:"",
      discordId:"",
      discordUsername:"",
      avatarUrl:""
    });
    return save;
  }

  function currentGuestSave() {
    const loader = runtime.loadGuestSave || (() => window.CherriftStorage?.load?.());
    let value;
    try { value = loader?.(); }
    catch (error) {
      console.warn("[CHERRIFT Auth] Guest save could not be read; using defaults.", error);
    }
    return applyGuestProfile(normalizeSave(value || window.CherriftStorage?.defaults?.() || {}));
  }

  function backupKey(userId = runtime.session?.user?.id) {
    return userId ? `cherrift-discord-backup-v2:${String(userId)}` : "";
  }

  function accountContext() {
    return { userId:String(runtime.session?.user?.id || ""), generation:runtime.accountGeneration };
  }

  function isCurrentAccount(context) {
    return !!context?.userId && context.userId === String(runtime.session?.user?.id || "") &&
      context.generation === runtime.accountGeneration;
  }

  function readBackup(userId = runtime.session?.user?.id) {
    if (!userId) return null;
    const keys = [
      backupKey(userId),
      `cherrift-discord-backup-v1:${String(userId)}`
    ];
    for (const key of keys) {
      try {
        const record = JSON.parse(window.localStorage.getItem(key) || "null");
        if (!isObject(record?.saveData)) continue;
        if (String(record.ownerUserId || "") !== String(userId)) continue;
        if (String(record.saveData?.security?.accountOwnerId || "") !== String(userId)) continue;
        return {
          save:normalizeSave(record.saveData),
          cloudUpdatedAt:String(record.cloudUpdatedAt || ""),
          // Old backups did not distinguish an acknowledged snapshot from
          // offline progress. Preserve them conservatively during migration.
          dirty:record.dirty !== false
        };
      } catch (error) {
        console.warn("[CHERRIFT Auth] Account backup could not be read.", error);
      }
    }
    return null;
  }

  function writeBackup(save, userId = runtime.session?.user?.id, dirty = true, revision = runtime.lastCloudSavedAt) {
    const key = backupKey(userId);
    if (!key || !isObject(save) || String(save.security?.accountOwnerId || "") !== String(userId)) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        ownerUserId:String(userId),
        savedAt:new Date().toISOString(),
        cloudUpdatedAt:String(revision || ""),
        dirty,
        saveVersion:SAVE_VERSION,
        saveData:cloneJson(save)
      }));
      return true;
    } catch (error) {
      console.warn("[CHERRIFT Auth] Account backup could not be written.", error);
      return false;
    }
  }

  function preserveRecovery(save, userId, revision) {
    if (!save || !userId) return false;
    // A conflict must not destroy either branch. Keep the unsynced snapshot
    // under a separate account-owned key before acknowledging the remote.
    const key = `${backupKey(userId)}:recovery`;
    try {
      const records = JSON.parse(window.localStorage.getItem(key) || "[]");
      const snapshots = Array.isArray(records) ? records : [];
      const serialized = JSON.stringify(save);
      if (!snapshots.some(record => JSON.stringify(record.saveData) === serialized)) {
        snapshots.push({ ownerUserId:userId, savedAt:new Date().toISOString(), cloudUpdatedAt:revision, saveData:cloneJson(save) });
      }
      window.localStorage.setItem(key, JSON.stringify(snapshots));
      return true;
    } catch (error) {
      console.error("[CHERRIFT Auth] Recovery could not be preserved.", error);
      return false;
    }
  }

  function hasRecovery(userId) {
    try { return !!window.localStorage.getItem(`${backupKey(userId)}:recovery`); }
    catch (_) { return false; }
  }

  function progressDiffers(left, right) {
    return ["coins","bloomGems","sakuraEssence","chests","inventory","account","stageStars","unlockedStages","unlockedSkins"]
      .some(key => JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key]));
  }

  function downloadRecovery() {
    const userId = runtime.session?.user?.id;
    if (!userId) return;
    const data = window.localStorage.getItem(`${backupKey(userId)}:recovery`);
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type:"application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cherrift-save-recovery.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function starterDiscordSave(session = runtime.session) {
    const save = normalizeSave(window.CherriftStorage?.defaults?.() || {});
    save.coins = Number(window.CHERRIFT_BALANCE?.currencies?.coins?.starter ?? 500);
    save.keys = 0;
    save.chests = { common:3, rare:0, epic:0 };
    save.bloomGems = 0;
    save.blossomGems = 0;
    save.sakuraEssence = 0;
    save.heartTokens = 0;
    save.selectedSkin = "cherry_default";
    save.unlockedSkins = ["cherry_default"];
    save.inventory = [];
    save.equipped = {};
    save.selectedStageId = "world_1_1";
    save.unlockedStages = ["world_1_1"];
    save.clearedStages = {};
    save.stageStars = {};
    save.stageStats = {};
    save.firstClearClaimed = {};
    save.account = {
      ...(save.account || {}),
      level:1,
      xp:0,
      totalXp:0,
      skillPoints:1,
      manualV052:true,
      tree:{ power:0, vitality:0, haste:0, fortune:0 },
      skillTreeV082:{ ranks:{} },
      skillTreeV082Migrated:true
    };
    save.profile = { ...(save.profile || {}), activeTitle:"", frameId:"frame0lvl" };
    save.prebeta = { ...(save.prebeta || {}), schema:"prebeta-1", starterCreated:true, isStarter:true };
    applyDiscordProfile(save, session);
    return save;
  }

  async function callPlayerApi(action, payload = {}) {
    if (typeof runtime.client?.functions?.invoke !== "function") {
      throw new Error("player_api_unavailable");
    }
    const result = await deadline(
      () => runtime.client.functions.invoke(PLAYER_FUNCTION, {
        body:{ action, ...payload },
        timeout:CLOUD_TIMEOUT_MS
      }),
      CLOUD_TIMEOUT_MS,
      `player_api_${action}_timeout`
    );
    if (result?.error) {
      let code = result?.data?.error;
      try { code ||= (await result.error.context?.clone?.().json())?.error; } catch (_) {}
      if (code) throw new Error(String(code));
      throw result.error;
    }
    if (result?.data?.error) throw new Error(result.data.error);
    return result?.data || {};
  }

  async function bootstrapCloud(context = accountContext()) {
    const response = await callPlayerApi("bootstrap_save");
    if (!isCurrentAccount(context)) throw new Error("stale_account_response");
    if (!isObject(response.save_data)) throw new Error("invalid_bootstrap_save");
    runtime.onlinePolicy = response.gameplay_policy === "online-v1";
    const save = normalizeSave(response.save_data);
    applyDiscordProfile(save);
    return { save, updatedAt:String(response.updated_at || "") };
  }

  function applySaveToUi(save, source = "auth") {
    if (!save) return;
    if (window.UI) window.UI.save = save;
    if (window.UI?.game) window.UI.game.save = save;

    // Account hydration is not an acquisition. Close any acquisition UI left
    // from the previous account before refreshing the newly authoritative save.
    window.CHERRIFT_OBTAINED?.reset?.();

    window.UI?.refreshMenu?.();
    window.dispatchEvent(new CustomEvent("cherrift:savechange", { detail:{ source } }));
  }

  function acceptServerSave(value, revision, context = accountContext()) {
    if (!isCurrentAccount(context) || !isObject(value) ||
      String(value.security?.accountOwnerId || "") !== context.userId || typeof revision !== "string" || !revision) return false;
    const save = normalizeSave(value);
    applyDiscordProfile(save);
    runtime.lastCloudSavedAt = revision;
    runtime.lastSavedJson = JSON.stringify(save);
    writeBackup(runtime.pendingSave || save, context.userId, !!runtime.pendingSave);
    applySaveToUi(save, "server-operation");
    return true;
  }

  function fallbackDiscordSave(session, error) {
    const backup = readBackup(session?.user?.id);
    runtime.lastCloudSavedAt = backup?.cloudUpdatedAt || "";
    const save = backup?.save || starterDiscordSave(session);
    runtime.pendingSave = backup?.dirty ? cloneJson(save) : null;
    applyDiscordProfile(save, session);
    runtime.cloudReady = false;
    runtime.offlineAccount = true;
    runtime.errorKey = "cloudUnavailable";
    runtime.errorDetail = String(error?.message || error || "").slice(0, 180);
    writeBackup(save, session?.user?.id, backup?.dirty || false);
    return save;
  }

  function installStorageBridge() {
    if (runtime.storageInstalled || typeof window.CherriftStorage?.save !== "function") return;
    runtime.storageInstalled = true;
    runtime.baseStorageSave = window.CherriftStorage.save.bind(window.CherriftStorage);
    window.CherriftStorage.save = function saveByAuthMode(data) {
      if (runtime.mode === "discord" && runtime.session?.user) {
        return queueCloudSave(data);
      }
      return runtime.baseStorageSave(data);
    };
  }

  function queueCloudSave(value) {
    if (runtime.mode !== "discord" || !runtime.session?.user) return false;
    const save = normalizeSave(value);
    applyDiscordProfile(save);
    writeBackup(save);
    runtime.pendingSave = cloneJson(save);
    window.clearTimeout(runtime.saveTimer);
    if (runtime.cloudReady) {
      runtime.saveTimer = window.setTimeout(() => { flushCloudSave(); }, SAVE_DEBOUNCE_MS);
    }
    return true;
  }

  async function sendProgress(snapshot, context = accountContext()) {
    if (!isCurrentAccount(context)) return false;
    const revision = runtime.lastCloudSavedAt;
    const response = await callPlayerApi("save_progress", {
      save_data:cloneJson(snapshot),
      expected_updated_at:revision || null,
      save_version:SAVE_VERSION
    });
    if (!isCurrentAccount(context)) return false;
    if (response.conflict && isObject(response.save_data)) {
      const local = runtime.pendingSave || snapshot;
      if (!preserveRecovery(local, context.userId, revision)) throw new Error("recovery_storage_unavailable");
      runtime.lastCloudSavedAt = String(response.updated_at || "");
      const remote = normalizeSave(response.save_data);
      applyDiscordProfile(remote);
      runtime.pendingSave = null;
      runtime.lastSavedJson = JSON.stringify(remote);
      writeBackup(remote, context.userId, false);
      applySaveToUi(remote, "cloud-conflict");
      window.UI?.toast?.(language() === "hu" ? "Mentési ütközés: a helyi haladást külön megőriztük. Letölthető a Fiók beállításainál." : "Save conflict: local progress was preserved. Download it in Account settings.");
      return false;
    }
    if (!response.ok) throw new Error("cloud_save_rejected");
    runtime.lastCloudSavedAt = String(response.updated_at || runtime.lastCloudSavedAt);
    const acknowledged = isObject(response.save_data) ? normalizeSave(response.save_data) : snapshot;
    if (runtime.onlinePolicy && progressDiffers(snapshot, acknowledged) &&
      !preserveRecovery(snapshot, context.userId, revision)) throw new Error("recovery_storage_unavailable");
    runtime.lastSavedJson = JSON.stringify(acknowledged);
    // A newer local save may have appeared while this request was in flight.
    // Its base revision advances with this acknowledgement; keep it dirty.
    writeBackup(runtime.pendingSave || acknowledged, context.userId, !!runtime.pendingSave);
    if (!runtime.pendingSave && isObject(response.save_data)) applySaveToUi(acknowledged, "cloud-acknowledged");
    return true;
  }

  async function gameAction(operation, params = {}) {
    const context = accountContext();
    if (!isCurrentAccount(context) || runtime.mode !== "discord" || !runtime.cloudReady) throw new Error("online_account_required");
    if (!runtime.onlinePolicy) throw new Error("server_update_required");
    await flushCloudSave();
    if (!isCurrentAccount(context) || !runtime.cloudReady) throw new Error("online_account_required");
    const operationId = crypto.randomUUID();
    const task = runtime.savePromise.catch(() => {}).then(async () => {
      if (!isCurrentAccount(context)) throw new Error("stale_account_response");
      let response;
      for (let attempt=0; attempt<2; attempt++) {
        try {
          response = await callPlayerApi("game_action", { operation, params, operation_id:operationId, expected_updated_at:runtime.lastCloudSavedAt });
        } catch (error) {
          if (!isCurrentAccount(context)) throw new Error("stale_account_response");
          const networkFailure = /timeout|fetch|network/i.test(String(error?.name || "") + " " + String(error?.message || ""));
          if (networkFailure && attempt === 0) continue; // Same operation ID: a lost acknowledgement cannot double-spend.
          if (networkFailure) { runtime.cloudReady=false; runtime.offlineAccount=true; syncAccountUi(); }
          throw error;
        }
        if (!isCurrentAccount(context)) throw new Error("stale_account_response");
        if (!response.conflict) break;
        runtime.lastCloudSavedAt = String(response.updated_at || "");
        if (isObject(response.save_data)) applySaveToUi(normalizeSave(response.save_data), "action-conflict");
      }
      if (!response?.ok || !isObject(response.save_data)) throw new Error("game_action_rejected");
      const save = normalizeSave(response.save_data);
      applyDiscordProfile(save);
      runtime.lastCloudSavedAt = String(response.updated_at || "");
      runtime.lastSavedJson = JSON.stringify(save);
      runtime.pendingSave = null;
      writeBackup(save, context.userId, false);
      applySaveToUi(save, "game-action");
      return response;
    });
    runtime.savePromise = task.catch(() => {});
    return task;
  }

  async function flushCloudSave() {
    window.clearTimeout(runtime.saveTimer);
    runtime.saveTimer = 0;
    if (!runtime.cloudReady || runtime.mode !== "discord" || !runtime.session?.user) return false;
    const snapshot = runtime.pendingSave;
    const context = accountContext();
    runtime.pendingSave = null;
    if (!snapshot) return true;
    if (JSON.stringify(snapshot) === runtime.lastSavedJson) return true;

    runtime.savePromise = runtime.savePromise.catch(() => {}).then(async () => {
      if (!isCurrentAccount(context)) return false;
      try {
        const saved = await sendProgress(snapshot, context);
        if (!isCurrentAccount(context)) return false;
        runtime.cloudErrorShown = false;
        return saved;
      } catch (error) {
        if (!isCurrentAccount(context)) return false;
        console.error("[CHERRIFT Auth] Cloud save failed:", error);
        runtime.pendingSave ||= snapshot;
        runtime.cloudReady = false;
        runtime.offlineAccount = true;
        writeBackup(runtime.pendingSave, context.userId);
        if (!runtime.cloudErrorShown) {
          runtime.cloudErrorShown = true;
          window.UI?.toast?.(text("cloudSaveFailed"));
        }
        return false;
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
    gate.dataset.i18nIgnore = "true";
    gate.innerHTML = [
      '<div class="auth-backdrop-v064" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>',
      '<main class="auth-card-v064">',
        '<header class="auth-top-v064"><div><img class="auth-brand-logo-v099 cherrift-logo-full-v099" src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><span id="authBuildV064"></span></div>',
          '<nav class="auth-language-v064" aria-label="Language"><button type="button" data-auth-language="hu">HU</button><button type="button" data-auth-language="en">EN</button></nav>',
        '</header>',
        '<div class="auth-emblem-v064" aria-hidden="true"><img class="cherrift-logo-small-v099" src="assets/ui/cherrift_logo_small.png" alt=""></div>',
        '<p class="auth-kicker-v064" id="authKickerV064"></p>',
        '<h1 id="authTitleV064"></h1>',
        '<p class="auth-intro-v064" id="authIntroV064"></p>',
        '<div class="auth-options-v064">',
          '<button type="button" id="authGuestV064" class="auth-choice-v064 guest" data-auth-action="guest"><span class="auth-choice-icon-v064" aria-hidden="true">◇</span><span><b id="authGuestTitleV064"></b><small id="authGuestMetaV064"></small></span><i aria-hidden="true">›</i></button>',
          '<button type="button" id="authDiscordV064" class="auth-choice-v064 discord" data-auth-action="discord"><span class="auth-choice-icon-v064 discord-mark-v064" aria-hidden="true">●●</span><span><b id="authDiscordTitleV064"></b><small id="authDiscordMetaV064"></small></span><i aria-hidden="true">›</i></button>',
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

  function renderGate() {
    const gate = ensureGate();
    const values = {
      authBuildV064:"testBuild",
      authKickerV064:"kicker",
      authTitleV064:"title",
      authIntroV064:"intro",
      authGuestTitleV064:"guest",
      authGuestMetaV064:"guestMeta",
      authDiscordTitleV064:"discord",
      authDiscordMetaV064:"discordMeta",
      authWarningTitleV064:"warningTitle",
      authWarningV064:"warning",
      authPrivacyV064:"privacy"
    };
    for (const [elementId, key] of Object.entries(values)) {
      const element = id(elementId);
      if (element) element.textContent = text(key);
    }
    const status = id("authStatusV064");
    if (status) status.textContent = runtime.statusKey ? text(runtime.statusKey) : "";
    const error = id("authErrorV064");
    const errorText = runtime.errorKey
      ? `${text(runtime.errorKey)}${runtime.errorDetail ? ` ${runtime.errorDetail}` : ""}`
      : "";
    if (error) {
      error.textContent = errorText;
      error.hidden = !errorText;
    }
    const guest = id("authGuestV064");
    const discord = id("authDiscordV064");
    if (guest) guest.disabled = runtime.busy || CONFIG.guestEnabled === false;
    if (discord) discord.disabled = runtime.busy || !runtime.client;
    for (const button of gate.querySelectorAll("[data-auth-language]")) {
      const active = button.dataset.authLanguage === language();
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  function dispatchGate(visible, mode = runtime.mode) {
    window.dispatchEvent(new CustomEvent("cherrift:authgate", {
      detail:{ visible, mode }
    }));
  }

  function openGate(options = {}) {
    const gate = ensureGate();
    runtime.mode = "gate";
    runtime.gateVisible = true;
    runtime.busy = false;
    runtime.statusKey = options.statusKey || "";
    runtime.errorKey = options.errorKey || runtime.errorKey || "";
    runtime.errorDetail = options.errorDetail || runtime.errorDetail || "";
    gate.hidden = false;
    document.body.classList.add("auth-gated-v064");
    renderGate();
    dispatchGate(true, "gate");
    window.setTimeout(() => id("authDiscordV064")?.focus(), 0);
    return true;
  }

  function closeGate(mode) {
    const gate = ensureGate();
    runtime.mode = mode;
    runtime.gateVisible = false;
    runtime.busy = false;
    runtime.statusKey = "";
    runtime.errorKey = "";
    runtime.errorDetail = "";
    gate.hidden = true;
    document.body.classList.remove("auth-gated-v064");
    renderGate();
    dispatchGate(false, mode);
  }

  function setAvatar(holder, account) {
    if (!holder) return;
    holder.replaceChildren();
    if (!account?.avatar) {
      holder.textContent = "🐰";
      return;
    }
    const image = document.createElement("img");
    image.src = account.avatar;
    image.alt = account.name;
    image.referrerPolicy = "no-referrer";
    image.draggable = false;
    holder.appendChild(image);
  }

  function syncAccountUi() {
    const account = runtime.mode === "discord" ? accountFromSession() : null;
    const card = q("#menu .login-card-v026");
    if (card) {
      card.dataset.i18nIgnore = "true";
      setAvatar(q(".avatar-badge", card), account);
      const name = q(".login-copy strong", card);
      const description = q(".login-copy p", card);
      const button = q(".discord-login", card);
      if (name) name.textContent = account?.name || (language() === "hu" ? "Vendég" : "Guest");
      if (description) {
        description.textContent = account
          ? text(runtime.cloudReady ? "cloudActive" : "offlineAccount")
          : text("localOnly");
      }
      if (button) {
        button.disabled = false;
        button.dataset.authAction = account ? "signout" : "open";
        button.textContent = account ? text("signOut") : text("discordLogin");
      }
    }

    const page = q('[data-v060-settings-page="account"]');
    if (page) {
      const accountDescription = account
        ? text(runtime.cloudReady ? "accountReady" : "accountOffline")
        : text("guestAccount");
      const avatar = account?.avatar
        ? `<img src="${escapeHtml(account.avatar)}" alt="" referrerpolicy="no-referrer" draggable="false">`
        : '<span aria-hidden="true">🐰</span>';
      page.dataset.i18nIgnore = "true";
      page.innerHTML = [
        `<header><small>${escapeHtml(text("accountKicker"))}</small><h3>${escapeHtml(text("account"))}</h3><p>${escapeHtml(text("accountIntro"))}</p></header>`,
        `<article class="auth-account-v064 ${account ? "connected" : "guest"}">`,
          `<div class="auth-account-avatar-v064">${avatar}</div>`,
          `<div class="auth-account-copy-v064"><small>${escapeHtml(account ? text(runtime.cloudReady ? "cloudActive" : "offlineAccount") : text("localOnly"))}</small><h4>${escapeHtml(account?.name || (language() === "hu" ? "Vendég" : "Guest"))}</h4><p>${escapeHtml(accountDescription)}</p></div>`,
          `<button type="button" data-auth-action="${account ? "signout" : "open"}">${escapeHtml(account ? text("signOut") : text("discordLogin"))}</button>`,
        '</article>',
        account && hasRecovery(account.id)
          ? `<p>${language() === "hu" ? "Megőrzött helyi mentés található egy korábbi ütközésből." : "Local progress from a previous save conflict is preserved."}</p><button type="button" data-auth-action="recovery">${language() === "hu" ? "Mentési másolat letöltése" : "Download recovery copy"}</button>`
          : ""
      ].join("");
    }
  }

  function switchUiToGuestSave() {
    runtime.accountGeneration += 1;
    runtime.reconnecting = false;
    runtime.savePromise = Promise.resolve();
    runtime.mode = "guest";
    const save = currentGuestSave();
    runtime.cloudReady = false;
    runtime.onlinePolicy = false;
    runtime.offlineAccount = false;
    runtime.pendingSave = null;
    runtime.lastSavedJson = "";
    runtime.lastCloudSavedAt = "";
    window.clearTimeout(runtime.saveTimer);
    applySaveToUi(save, "guest");
    runtime.baseStorageSave?.(save);
    return save;
  }

  async function resolveDiscordSave(session) {
    const nextUserId = String(session?.user?.id || "");
    if (runtime.activeUserId !== nextUserId) {
      runtime.accountGeneration += 1;
      runtime.savePromise = Promise.resolve();
      window.clearTimeout(runtime.saveTimer);
      runtime.saveTimer = 0;
      runtime.pendingSave = null;
      runtime.lastSavedJson = "";
      runtime.lastCloudSavedAt = "";
      runtime.cloudReady = false;
      runtime.offlineAccount = false;
      runtime.reconnecting = false;
      window.CHERRIFT_OBTAINED?.reset?.();
    }
    runtime.session = session;
    runtime.activeUserId = nextUserId;
    const context = accountContext();
    const backup = readBackup(nextUserId);
    try {
      const { save:remote, updatedAt } = await bootstrapCloud(context);
      if (!isCurrentAccount(context)) return null;
      let save = remote;
      runtime.lastCloudSavedAt = updatedAt;
      runtime.cloudReady = true;
      runtime.offlineAccount = false;
      runtime.lastSavedJson = JSON.stringify(remote);
      runtime.pendingSave = null;
      if (backup?.dirty && JSON.stringify(backup.save) !== JSON.stringify(remote)) {
        if (backup.cloudUpdatedAt && backup.cloudUpdatedAt === updatedAt) {
          save = backup.save;
          applyDiscordProfile(save, session);
          runtime.pendingSave = cloneJson(save);
          runtime.saveTimer = window.setTimeout(() => flushCloudSave(), SAVE_DEBOUNCE_MS);
        } else if (!preserveRecovery(backup.save, nextUserId, backup.cloudUpdatedAt)) {
          throw new Error("recovery_storage_unavailable");
        }
      }
      writeBackup(save, nextUserId, !!runtime.pendingSave);
      return save;
    } catch (error) {
      if (!isCurrentAccount(context)) return null;
      console.warn("[CHERRIFT Auth] Cloud bootstrap failed; using account-bound fallback.", error);
      return fallbackDiscordSave(session, error);
    }
  }

  async function completeDiscordSession(session, attempt = runtime.authAttempt) {
    if (!session?.user) return false;
    if (attempt !== runtime.authAttempt || runtime.guestExplicit) return false;
    // A returning Discord session stays behind the boot screen. Showing the
    // login choice here caused the cleanup-era Discord -> gate -> start flash.
    runtime.mode = "checking";
    runtime.gateVisible = false;
    runtime.busy = true;
    runtime.statusKey = "loadingCloud";
    ensureGate().hidden = true;
    document.body.classList.remove("auth-gated-v064");
    renderGate();
    const save = await resolveDiscordSave(session);
    if (!save || attempt !== runtime.authAttempt || runtime.guestExplicit || runtime.activeUserId !== String(session.user.id)) return false;
    applySaveToUi(save, "discord-session");
    closeGate("discord");
    syncAccountUi();
    return true;
  }

  /*
   * CRITICAL STARTUP CONTRACT
   * -------------------------
   * This function is intentionally synchronous. Guest startup and UI.init()
   * must not depend on Supabase Auth, Web Locks, Discord, an Edge Function or
   * any network timeout. Session/cloud discovery starts only after the UI and
   * the real login gate exist (startAuthGate()).
   */
  function bootstrapSave(loadGuestSave) {
    if (runtime.bootstrapSave) return runtime.bootstrapSave;
    runtime.loadGuestSave = typeof loadGuestSave === "function" ? loadGuestSave : null;
    installStorageBridge();
    runtime.bootstrapSave = currentGuestSave();
    runtime.mode = "checking";
    runtime.gateVisible = false;
    runtime.statusKey = "checking";
    runtime.bootstrapDone = true;
    return runtime.bootstrapSave;
  }

  function continueAsGuest() {
    if (CONFIG.guestEnabled === false) {
      runtime.errorKey = "guestDisabled";
      renderGate();
      return false;
    }
    runtime.guestExplicit = true;
    runtime.authAttempt += 1;
    runtime.session = null;
    runtime.activeUserId = "";
    const save = switchUiToGuestSave();
    applyGuestProfile(save);
    runtime.baseStorageSave?.(save);
    closeGate("guest");
    syncAccountUi();
    return true;
  }

  async function signInWithDiscord() {
    if (!runtime.client || runtime.busy) return false;
    runtime.guestExplicit = false;
    runtime.authAttempt += 1;
    runtime.busy = true;
    runtime.statusKey = "redirecting";
    runtime.errorKey = "";
    runtime.errorDetail = "";
    renderGate();
    try {
      const result = await deadline(
        () => runtime.client.auth.signInWithOAuth({
          provider:"discord",
          options:{ redirectTo:authRedirectUrl() }
        }),
        OAUTH_TIMEOUT_MS,
        "discord_oauth_timeout"
      );
      if (result?.error) throw result.error;
      return true;
    } catch (error) {
      console.error("[CHERRIFT Auth] Discord OAuth failed:", error);
      runtime.busy = false;
      runtime.statusKey = "";
      runtime.errorKey = "loginFailed";
      runtime.errorDetail = String(error?.message || error || "").slice(0, 180);
      renderGate();
      return false;
    }
  }

  async function signOut() {
    if (runtime.busy) return false;
    runtime.busy = true;
    syncAccountUi();
    try {
      await flushCloudSave().catch(() => false);
      if (runtime.client) {
        const result = await deadline(
          () => runtime.client.auth.signOut({ scope:"local" }),
          SIGN_OUT_TIMEOUT_MS,
          "auth_signout_timeout"
        );
        if (result?.error) throw result.error;
      }
    } catch (error) {
      console.warn("[CHERRIFT Auth] Sign-out required local recovery.", error);
      clearLocalAuthArtifacts();
    }
    runtime.guestExplicit = true;
    runtime.authAttempt += 1;
    runtime.session = null;
    runtime.activeUserId = "";
    switchUiToGuestSave();
    openGate({ statusKey:"signedOut" });
    syncAccountUi();
    return true;
  }

  async function reconnectCloud() {
    if (
      runtime.reconnecting ||
      runtime.mode !== "discord" ||
      !runtime.session?.user ||
      runtime.cloudReady
    ) return false;
    runtime.reconnecting = true;
    const context = accountContext();
    try {
      if (runtime.pendingSave && runtime.lastCloudSavedAt) {
        runtime.cloudReady = true;
        await flushCloudSave();
        if (!isCurrentAccount(context)) return false;
        if (!runtime.cloudReady) return false;
      } else {
        const local = runtime.pendingSave;
        const { save:remote, updatedAt } = await bootstrapCloud(context);
        if (!isCurrentAccount(context)) return false;
        if (local && !preserveRecovery(local, context.userId, runtime.lastCloudSavedAt)) throw new Error("recovery_storage_unavailable");
        runtime.lastCloudSavedAt = updatedAt;
        runtime.lastSavedJson = JSON.stringify(remote);
        runtime.pendingSave = null;
        writeBackup(remote, context.userId, false);
        applySaveToUi(remote, "cloud-reconnect");
      }
      runtime.cloudReady = true;
      runtime.offlineAccount = false;
      syncAccountUi();
      return true;
    } catch (error) {
      if (!isCurrentAccount(context)) return false;
      runtime.cloudReady = false;
      runtime.offlineAccount = true;
      console.warn("[CHERRIFT Auth] Cloud reconnect failed.", error);
      return false;
    } finally {
      if (isCurrentAccount(context)) runtime.reconnecting = false;
    }
  }

  function bindAuthSubscription() {
    if (!runtime.client || runtime.subscription) return;
    const result = runtime.client.auth.onAuthStateChange((event, session) => {
      runtime.pendingAuthEvent = { event, session };
      window.setTimeout(processPendingAuthEvent, 0);
    });
    runtime.subscription = result?.data?.subscription || null;
  }

  function processPendingAuthEvent() {
    if (!runtime.bootstrapDone || !runtime.started || !runtime.pendingAuthEvent) return;
    if (runtime.discovering) return;
    const { event, session } = runtime.pendingAuthEvent;
    runtime.pendingAuthEvent = null;
    if (session?.user) {
      if (runtime.guestExplicit) return;
      if (runtime.mode !== "discord" || runtime.activeUserId !== String(session.user.id)) {
        const attempt = ++runtime.authAttempt;
        completeDiscordSession(session, attempt).catch(error => {
          console.error("[CHERRIFT Auth] Session completion failed:", error);
        });
      }
      return;
    }
    if (event === "SIGNED_OUT" && runtime.mode === "discord") {
      runtime.session = null;
      runtime.activeUserId = "";
      switchUiToGuestSave();
      openGate({ statusKey:"signedOut" });
      syncAccountUi();
    }
  }

  async function discoverSession() {
    if (runtime.discoveryPromise) return runtime.discoveryPromise;
    runtime.discoveryPromise = (async () => {
      const oauthError = oauthErrorFromUrl();
      const oauthCode = oauthCodeFromUrl();
      const attempt = ++runtime.authAttempt;
      runtime.discovering = true;
      runtime.statusKey = "checking";
      renderGate();

      try {
        if (!runtime.client) throw new Error("supabase_client_unavailable");
        let session = null;

        if (oauthCode) {
          if (typeof runtime.client.auth.exchangeCodeForSession !== "function") {
            throw new Error("pkce_exchange_unavailable");
          }
          const exchangeResult = await deadline(
            () => runtime.client.auth.exchangeCodeForSession(oauthCode),
            AUTH_TIMEOUT_MS,
            "auth_exchange_timeout"
          );
          if (exchangeResult?.error) throw exchangeResult.error;
          session = exchangeResult?.data?.session || null;
        }

        if (!session?.user) {
          const sessionResult = await deadline(
            () => runtime.client.auth.getSession(),
            AUTH_TIMEOUT_MS,
            "auth_session_timeout"
          );
          if (sessionResult?.error) throw sessionResult.error;
          session = sessionResult?.data?.session || null;
        }
        if (attempt !== runtime.authAttempt || runtime.guestExplicit) return false;

        if (!session?.user) {
          runtime.statusKey = "";
          if (oauthError) {
            runtime.errorKey = "loginFailed";
            runtime.errorDetail = oauthError;
          }
          renderGate();
          return false;
        }

        runtime.pendingAuthEvent = null;
        return await completeDiscordSession(session, attempt);
      } catch (error) {
        if (attempt !== runtime.authAttempt || runtime.guestExplicit) return false;
        console.warn("[CHERRIFT Auth] Background session discovery failed; Guest remains available.", error);
        runtime.session = null;
        runtime.activeUserId = "";
        runtime.cloudReady = false;
        runtime.offlineAccount = false;
        runtime.statusKey = "";
        runtime.errorKey = oauthError ? "loginFailed" : "serviceUnavailable";
        runtime.errorDetail = oauthError || "";
        renderGate();
        return false;
      } finally {
        runtime.discovering = false;
        // Only the single callback owner may remove the PKCE response. At
        // this point the exchange has either produced a session or a visible,
        // retryable error; it is never silently discarded before exchange.
        cleanOAuthUrl();
        window.setTimeout(processPendingAuthEvent, 0);
      }
    })();
    return runtime.discoveryPromise;
  }

  function startAuthGate() {
    if (runtime.started) return true;
    runtime.started = true;

    if (!runtime.bootstrapDone) bootstrapSave(runtime.loadGuestSave);
    if (!runtime.client) runtime.client = createClient();
    runtime.mode = "checking";
    runtime.gateVisible = false;
    runtime.busy = true;
    runtime.statusKey = oauthCodeFromUrl() ? "redirecting" : "checking";
    const gate = ensureGate();
    gate.hidden = true;
    document.body.classList.remove("auth-gated-v064");
    renderGate();
    syncAccountUi();
    window.dispatchEvent(new CustomEvent("cherrift:runtime-ready", {
      detail:{ mode:runtime.mode, signedIn:false }
    }));

    // Deliberately detached: neither a stuck browser Auth lock nor a slow
    // player-api call can own the loading screen or disable Guest.
    window.setTimeout(() => {
      discoverSession()
        .then(signedIn => {
          if (signedIn || runtime.guestExplicit || runtime.mode === "discord") return;
          openGate({
            errorKey:runtime.errorKey,
            errorDetail:runtime.errorDetail
          });
        })
        .catch(error => {
          console.error("[CHERRIFT Auth] Detached session discovery failed:", error);
          if (!runtime.guestExplicit) {
            openGate({ errorKey:"serviceUnavailable" });
          }
        });
    }, 0);
    // Register after the discovery timer. Even a custom client that invokes
    // INITIAL_SESSION synchronously cannot start a second competing bootstrap
    // before discoverSession() marks the attempt as active.
    bindAuthSubscription();
    return true;
  }

  function installRuntimeBridges() {
    installStorageBridge();
    if (window.CHERRIFT_V060?.finishBoot && !window.CHERRIFT_V060.finishBoot.__authV3) {
      const finish = function finishBootWithAuthV3() { return startAuthGate(); };
      finish.__authV3 = true;
      window.CHERRIFT_V060.finishBoot = finish;
    }
    const previousInit = window.UI?.init?.bind(window.UI);
    if (previousInit && !window.UI.init.__authV3) {
      const wrapped = function initAuthV3(...args) {
        const result = previousInit(...args);
        syncAccountUi();
        return result;
      };
      wrapped.__authV3 = true;
      window.UI.init = wrapped;
    }
  }

  ensureGate();
  renderGate();
  installRuntimeBridges();

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
    else if (action === "recovery") downloadRecovery();
  });

  window.addEventListener("pagehide", () => { flushCloudSave(); });
  window.addEventListener("online", () => { reconnectCloud(); });
  window.addEventListener("cherrift:languagechange", () => {
    renderGate();
    syncAccountUi();
  });
  window.addEventListener("cherrift:savechange", syncAccountUi);

  window.CHERRIFT_AUTH = {
    version:VERSION,
    get clientReady() { return !!runtime.client; },
    get redirectUrl() { return authRedirectUrl(); },
    getClient:() => runtime.client,
    captureAccount:accountContext,
    isCurrentAccount,
    acceptServerSave,
    getState() {
      const account = accountFromSession();
      return {
        mode:runtime.mode,
        gateVisible:runtime.gateVisible,
        busy:runtime.busy,
        signedIn:!!account,
        cloudReady:runtime.cloudReady,
        onlinePolicy:runtime.onlinePolicy,
        memoryOnly:false,
        offlineAccount:runtime.offlineAccount,
        savePending:!!runtime.pendingSave,
        lastCloudSavedAt:runtime.lastCloudSavedAt,
        account:account ? { ...account } : null
      };
    },
    bootstrapSave,
    start:startAuthGate,
    openGate,
    continueAsGuest,
    signInWithDiscord,
    signOut,
    flushCloudSave,
    gameAction,
    reconnectCloud,
    applySessionForTesting:completeDiscordSession
  };

  console.info(`[CHERRIFT] Auth ${VERSION} loaded: local startup is independent from Supabase.`);
})();
