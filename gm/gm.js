(() => {
  "use strict";

  const CONFIG = window.CHERRIFT_SUPABASE_CONFIG || {};
  const factory = window.supabase?.createClient;
  const $ = (id) => document.getElementById(id);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    client: null,
    session: null,
    admin: null,
    account: null,
    mailTarget: null,
    profileTarget: null,
    profileOriginal: null,
    toastTimer: 0,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toast(message, error = false) {
    const el = $("toast");
    el.textContent = String(message || "");
    el.classList.toggle("error", !!error);
    el.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function setBusy(button, busy, busyText = "Folyamatban…") {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  async function copyText(value) {
    const text = String(value || "");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast("Vágólapra másolva.");
  }

  function cleanRedirectUrl() {
    const url = new URL(location.href);
    for (const key of ["code", "error", "error_code", "error_description"]) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  }

  async function api(action, payload = {}) {
    if (!state.client) throw new Error("Supabase kliens nem érhető el.");
    const { data, error } = await state.client.functions.invoke("gm-api", {
      body: { action, ...payload },
    });
    if (error) {
      let detail = data?.error || error.message || "Edge Function hiba";
      const response = error.context;
      if (response instanceof Response) {
        try {
          const parsed = await response.clone().json();
          detail = parsed?.error || detail;
        } catch (_) {}
      }
      const wrapped = new Error(detail);
      wrapped.data = data;
      throw wrapped;
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function accountLabel(player) {
    return player?.name || player?.username || player?.discordId || player?.id || "Ismeretlen játékos";
  }

  function avatarMarkup(player) {
    if (player?.avatar) return `<img class="result-avatar" src="${escapeHtml(player.avatar)}" alt="">`;
    return `<span class="result-avatar" aria-hidden="true"></span>`;
  }

  function showAuthStatus(text) {
    $("authStatus").textContent = text;
  }

  function showUnauthorized(userId, account) {
    $("unauthorizedBox").classList.remove("hidden");
    $("unauthorizedUserId").textContent = userId || "";
    showAuthStatus(`${accountLabel(account)} be van jelentkezve, de nincs GM-joga.`);
  }

  function showApp(data) {
    state.admin = data.admin;
    state.account = data.account;
    $("authView").classList.add("hidden");
    $("gmApp").classList.remove("hidden");
    $("adminName").textContent = accountLabel(data.account);
    $("adminRole").textContent = String(data.admin.role || "GM").toUpperCase();
    $("accountSheetName").textContent = accountLabel(data.account);
    $("accountSheetId").textContent = data.account.id || "";
    const avatar = $("adminAvatar");
    if (data.account.avatar) {
      avatar.src = data.account.avatar;
      avatar.hidden = false;
      $("adminAvatarFallback").hidden = true;
    }
    refreshMailHistory();
    refreshRedeemHistory();
  }

  async function resolveSession() {
    if (!state.client) return;
    showAuthStatus("Discord munkamenet ellenőrzése…");
    const { data, error } = await state.client.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    if (!state.session) {
      showAuthStatus("Jelentkezz be a saját Discord-fiókoddal.");
      $("discordLoginBtn").disabled = false;
      return;
    }
    showAuthStatus("GM-jogosultság ellenőrzése…");
    try {
      const me = await api("me");
      showApp(me);
    } catch (error) {
      const message = String(error?.message || error || "");
      if (message.includes("not_an_active_gm")) {
        const user = state.session.user;
        showUnauthorized(user?.id, {
          id: user?.id,
          name: user?.user_metadata?.full_name || user?.user_metadata?.name,
          username: user?.user_metadata?.user_name,
        });
      } else {
        showAuthStatus(`A gm-api nem érhető el: ${message}`);
        toast(message, true);
      }
    }
  }

  async function login() {
    if (!state.client) return;
    const button = $("discordLoginBtn");
    setBusy(button, true, "Átirányítás…");
    const { error } = await state.client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: cleanRedirectUrl() },
    });
    if (error) {
      setBusy(button, false);
      toast(error.message, true);
    }
  }

  async function logout() {
    await state.client?.auth.signOut({ scope: "local" });
    location.replace(cleanRedirectUrl());
  }

  function activateModule(name) {
    qa("[data-module-view]").forEach((section) => section.classList.toggle("active", section.dataset.moduleView === name));
    qa("[data-module]").forEach((button) => button.classList.toggle("active", button.dataset.module === name));
    $("accountSheet").classList.add("hidden");
    scrollTo({ top: 0, behavior: "smooth" });
    if (name === "profiles") refreshActivity();
  }

  function listFromText(value) {
    return [...new Set(String(value || "").split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
  }

  function rewardFrom(prefix) {
    const coins = Number($(prefix + "Coins")?.value || 0);
    const keys = Number($(prefix + "Keys")?.value || 0);
    const skins = listFromText($(prefix + "Skins")?.value || "");
    const reward = {};
    if (Number.isInteger(coins) && coins > 0) reward.coins = coins;
    if (Number.isInteger(keys) && keys > 0) reward.keys = keys;
    if (skins.length) reward.skins = skins;
    return reward;
  }

  function rewardText(reward) {
    const parts = [];
    if (reward?.coins) parts.push(`${reward.coins} érme`);
    if (reward?.keys) parts.push(`${reward.keys} kulcs`);
    if (Array.isArray(reward?.skins) && reward.skins.length) parts.push(`${reward.skins.length} skin`);
    return parts.join(" · ") || "Nincs melléklet";
  }

  function localDateToIso(id) {
    const value = $(id)?.value;
    return value ? new Date(value).toISOString() : null;
  }

  async function searchPlayers(query, container, onSelect) {
    container.innerHTML = `<p class="empty">Keresés…</p>`;
    try {
      const data = await api("search_players", { query });
      const players = data.players || [];
      if (!players.length) {
        container.innerHTML = `<p class="empty">Nincs találat.</p>`;
        return;
      }
      container.innerHTML = players.map((player, index) => `
        <button type="button" class="search-result" data-player-index="${index}">
          ${avatarMarkup(player)}
          <span><b>${escapeHtml(accountLabel(player))}</b><small>${escapeHtml(player.username || player.discordId || player.id)}</small><small>${player.coins || 0} érme · ${player.keys || 0} kulcs</small></span>
        </button>`).join("");
      qa("[data-player-index]", container).forEach((button) => {
        button.addEventListener("click", () => onSelect(players[Number(button.dataset.playerIndex)]));
      });
    } catch (error) {
      container.innerHTML = `<p class="empty">A keresés sikertelen.</p>`;
      toast(error.message, true);
    }
  }

  function selectMailPlayer(player) {
    state.mailTarget = player;
    $("mailSelectedPlayer").classList.remove("hidden");
    $("mailSelectedPlayer").innerHTML = `<span><b>${escapeHtml(accountLabel(player))}</b><small>${escapeHtml(player.id)}</small></span><button type="button" id="clearMailPlayer">Törlés</button>`;
    $("mailPlayerResults").innerHTML = "";
    $("clearMailPlayer").addEventListener("click", () => {
      state.mailTarget = null;
      $("mailSelectedPlayer").classList.add("hidden");
      $("mailSelectedPlayer").innerHTML = "";
    });
    updateMailPreview();
  }

  function updateMailAudience() {
    const audience = document.querySelector('input[name="mailAudience"]:checked')?.value || "user";
    $("mailTargetBox").classList.toggle("hidden", audience === "all");
    $("broadcastConfirm").classList.toggle("hidden", audience !== "all");
    updateMailPreview();
  }

  function updateMailPreview() {
    const audience = document.querySelector('input[name="mailAudience"]:checked')?.value || "user";
    $("mailPreviewAudience").textContent = audience === "all" ? "Minden játékos" : state.mailTarget ? accountLabel(state.mailTarget) : "Egy játékos";
    $("mailPreviewTitle").textContent = $("mailTitleHu").value.trim() || "A levél címe";
    $("mailPreviewBody").textContent = $("mailBodyHu").value.trim() || "Itt jelenik meg a levél szövege.";
    $("mailPreviewReward").textContent = rewardText(rewardFrom("mail"));
  }

  async function submitMail(event) {
    event.preventDefault();
    const audience = document.querySelector('input[name="mailAudience"]:checked')?.value || "user";
    if (audience === "user" && !state.mailTarget) return toast("Előbb válassz játékost.", true);
    if (audience === "all" && !$("broadcastConfirmCheck").checked) return toast("Erősítsd meg a globális küldést.", true);
    const titleHu = $("mailTitleHu").value.trim();
    const bodyHu = $("mailBodyHu").value.trim();
    if (!titleHu || !bodyHu) return toast("A magyar cím és szöveg kötelező.", true);
    const startsAt = localDateToIso("mailStartsAt");
    const expiresAt = localDateToIso("mailExpiresAt");
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) return toast("A lejáratnak a kezdés után kell lennie.", true);

    const button = $("mailSubmitBtn");
    setBusy(button, true, "Küldés…");
    try {
      await api("send_mail", {
        audience_type: audience,
        target_user_id: audience === "user" ? state.mailTarget.id : null,
        title_hu: titleHu,
        title_en: $("mailTitleEn").value.trim(),
        body_hu: bodyHu,
        body_en: $("mailBodyEn").value.trim(),
        attachments: rewardFrom("mail"),
        starts_at: startsAt,
        expires_at: expiresAt,
      });
      toast(audience === "all" ? "Globális levél elküldve." : "Levél elküldve.");
      $("mailTitleHu").value = "";
      $("mailTitleEn").value = "";
      $("mailBodyHu").value = "";
      $("mailBodyEn").value = "";
      $("mailCoins").value = "0";
      $("mailKeys").value = "0";
      $("mailSkins").value = "";
      $("broadcastConfirmCheck").checked = false;
      updateMailPreview();
      refreshMailHistory();
    } catch (error) {
      toast(`Küldési hiba: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat("hu-HU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
    catch { return String(value); }
  }

  async function refreshMailHistory() {
    const container = $("mailHistory");
    if (!container || $("gmApp").classList.contains("hidden")) return;
    container.innerHTML = `<p class="empty">Betöltés…</p>`;
    try {
      const data = await api("recent_mail");
      const messages = data.messages || [];
      container.innerHTML = messages.length ? messages.map((message) => `
        <article class="activity-item"><header><b>${escapeHtml(message.title_hu)}</b><small>${formatDate(message.created_at)}</small></header>
        <p>${message.audience_type === "all" ? "Minden játékos" : escapeHtml(message.target_user_id || "Játékos")} · ${escapeHtml(rewardText(message.attachments))}</p></article>`).join("") : `<p class="empty">Még nincs elküldött levél.</p>`;
    } catch (error) {
      container.innerHTML = `<p class="empty">Nem sikerült betölteni.</p>`;
    }
  }

  async function submitRedeem(event) {
    event.preventDefault();
    const reward = rewardFrom("redeem");
    if (!Object.keys(reward).length) return toast("Adj legalább egy jutalmat a kódhoz.", true);
    const max = Number($("redeemMax").value);
    const perUser = Number($("redeemPerUser").value);
    if (!Number.isInteger(max) || max < 1 || !Number.isInteger(perUser) || perUser < 1 || perUser > max) return toast("Ellenőrizd a beváltási limiteket.", true);
    const startsAt = localDateToIso("redeemStartsAt");
    const expiresAt = localDateToIso("redeemExpiresAt");
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) return toast("A lejáratnak a kezdés után kell lennie.", true);
    const button = $("redeemSubmitBtn");
    setBusy(button, true, "Létrehozás…");
    try {
      const data = await api("create_redeem", {
        rewards: reward,
        max_redemptions: max,
        per_user_limit: perUser,
        starts_at: startsAt,
        expires_at: expiresAt,
      });
      $("redeemCodeValue").textContent = data.code;
      $("redeemResult").classList.remove("hidden");
      $("redeemResult").scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Redeem kód elkészült. Most másold ki.");
      refreshRedeemHistory();
    } catch (error) {
      toast(`Kódhiba: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  async function refreshRedeemHistory() {
    const container = $("redeemHistory");
    if (!container || $("gmApp").classList.contains("hidden")) return;
    container.innerHTML = `<p class="empty">Betöltés…</p>`;
    try {
      const data = await api("recent_redeems");
      const codes = data.codes || [];
      container.innerHTML = codes.length ? codes.map((code) => `
        <article class="activity-item"><header><b>${escapeHtml(code.code_prefix)}-••••</b><small>${formatDate(code.created_at)}</small></header>
        <p>${code.total_redemptions}/${code.max_redemptions} beváltás · játékosonként ${code.per_user_limit} · ${escapeHtml(rewardText(code.rewards))}</p></article>`).join("") : `<p class="empty">Még nincs létrehozott kód.</p>`;
    } catch (error) {
      container.innerHTML = `<p class="empty">Nem sikerült betölteni.</p>`;
    }
  }

  function stringifyPretty(value, fallback) {
    try { return JSON.stringify(value ?? fallback, null, 2); }
    catch { return JSON.stringify(fallback, null, 2); }
  }

  function selectProfilePlayer(player) {
    state.profileTarget = player;
    $("profileSearchResults").innerHTML = "";
    loadProfile(player.id);
  }

  async function loadProfile(userId) {
    $("profileEmpty").classList.remove("hidden");
    $("profileEmpty").innerHTML = `<b>Profil betöltése…</b>`;
    $("profileWorkspace").classList.add("hidden");
    try {
      const data = await api("get_profile", { target_user_id: userId });
      const profile = data.profile;
      state.profileOriginal = profile;
      const account = profile.account;
      const saveRow = profile.save;
      const save = saveRow.save_data || {};
      $("profileEmpty").classList.add("hidden");
      $("profileWorkspace").classList.remove("hidden");
      $("profileName").textContent = accountLabel(account);
      $("profileIdentity").textContent = [account.username, account.discordId, account.id].filter(Boolean).join(" · ");
      $("profileSaveMeta").textContent = `${saveRow.save_version || "—"} · frissítve: ${formatDate(saveRow.updated_at)}`;
      const avatar = $("profileAvatar");
      if (account.avatar) {
        avatar.src = account.avatar;
        avatar.hidden = false;
        $("profileAvatarFallback").hidden = true;
      } else {
        avatar.hidden = true;
        $("profileAvatarFallback").hidden = false;
      }
      $("profileCoins").value = Number(save.coins) || 0;
      $("profileKeys").value = Number(save.keys) || 0;
      $("profileSelectedSkin").value = typeof save.selectedSkin === "string" ? save.selectedSkin : "cherry_default";
      $("profileSelectedStage").value = typeof save.selectedStageId === "string" ? save.selectedStageId : "world_1_1";
      $("profileUnlockedSkins").value = Array.isArray(save.unlockedSkins) ? save.unlockedSkins.join("\n") : "";
      $("profileUnlockedStages").value = Array.isArray(save.unlockedStages) ? save.unlockedStages.join("\n") : "";
      $("profileInventory").value = stringifyPretty(save.inventory, []);
      $("profileEquipped").value = stringifyPretty(save.equipped, {});
      $("profileReason").value = "";
      $("rawSaveJson").textContent = stringifyPretty(save, {});
      updateProfileDiff();
    } catch (error) {
      $("profileEmpty").classList.remove("hidden");
      $("profileEmpty").innerHTML = `<b>Nem sikerült betölteni.</b><p>${escapeHtml(error.message)}</p>`;
      toast(error.message, true);
    }
  }

  function currentProfilePatch() {
    const inventory = JSON.parse($("profileInventory").value || "[]");
    const equipped = JSON.parse($("profileEquipped").value || "{}");
    if (!Array.isArray(inventory)) throw new Error("Az Inventory JSON tömb legyen: [ ... ]");
    if (!equipped || typeof equipped !== "object" || Array.isArray(equipped)) throw new Error("Az Equipped JSON objektum legyen: { ... }");
    return {
      coins: Number($("profileCoins").value),
      keys: Number($("profileKeys").value),
      selectedSkin: $("profileSelectedSkin").value.trim(),
      selectedStageId: $("profileSelectedStage").value.trim(),
      unlockedSkins: listFromText($("profileUnlockedSkins").value),
      unlockedStages: listFromText($("profileUnlockedStages").value),
      inventory,
      equipped,
    };
  }

  function changedPatch() {
    if (!state.profileOriginal) return {};
    const original = state.profileOriginal.save.save_data || {};
    const current = currentProfilePatch();
    const patch = {};
    for (const [key, value] of Object.entries(current)) {
      const before = key in original ? original[key] : key === "inventory" ? [] : key === "equipped" ? {} : key.startsWith("unlocked") ? [] : undefined;
      if (JSON.stringify(before) !== JSON.stringify(value)) patch[key] = value;
    }
    return patch;
  }

  function updateProfileDiff() {
    const box = $("profileDiff");
    if (!state.profileOriginal || $("profileWorkspace").classList.contains("hidden")) return;
    try {
      const patch = changedPatch();
      const keys = Object.keys(patch);
      box.classList.toggle("changed", keys.length > 0);
      box.textContent = keys.length ? `Módosul: ${keys.join(", ")}` : "Még nincs módosítás.";
    } catch (error) {
      box.classList.add("changed");
      box.textContent = `JSON hiba: ${error.message}`;
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (!state.profileTarget) return toast("Nincs kiválasztott játékos.", true);
    let patch;
    try { patch = changedPatch(); }
    catch (error) { return toast(error.message, true); }
    if (!Object.keys(patch).length) return toast("Nincs mentendő módosítás.", true);
    const reason = $("profileReason").value.trim();
    if (reason.length < 3) return toast("Írd le a módosítás indokát.", true);
    if (!confirm(`Biztosan módosítod ${accountLabel(state.profileTarget)} profilját?\n\nAutomatikus snapshot készül.`)) return;
    const button = $("profileSaveBtn");
    setBusy(button, true, "Snapshot + mentés…");
    try {
      const data = await api("update_profile", {
        target_user_id: state.profileTarget.id,
        patch,
        reason,
      });
      toast(`Profil mentve. Snapshot: ${data.result?.snapshot_id || "elkészült"}`);
      await loadProfile(state.profileTarget.id);
      refreshActivity();
    } catch (error) {
      toast(`Mentési hiba: ${error.message}`, true);
    } finally {
      setBusy(button, false);
    }
  }

  async function refreshActivity() {
    const container = $("auditHistory");
    if (!container || $("gmApp").classList.contains("hidden")) return;
    container.innerHTML = `<p class="empty">Betöltés…</p>`;
    try {
      const data = await api("recent_activity");
      const rows = data.activity || [];
      container.innerHTML = rows.length ? rows.map((row) => `
        <article class="activity-item"><header><b>${escapeHtml(row.action)}</b><small>${formatDate(row.created_at)}</small></header>
        <p>${escapeHtml(row.status)}${row.target_user_id ? ` · ${escapeHtml(row.target_user_id)}` : ""}${row.error_code ? ` · ${escapeHtml(row.error_code)}` : ""}</p></article>`).join("") : `<p class="empty">Még nincs naplózott művelet.</p>`;
    } catch (error) {
      container.innerHTML = `<p class="empty">A napló nem érhető el.</p>`;
    }
  }

  function bindEvents() {
    $("discordLoginBtn").addEventListener("click", login);
    $("logoutBtn").addEventListener("click", logout);
    $("copyUserIdBtn").addEventListener("click", () => copyText($("unauthorizedUserId").textContent));
    $("accountBtn").addEventListener("click", () => $("accountSheet").classList.toggle("hidden"));
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#accountBtn,#accountSheet")) $("accountSheet").classList.add("hidden");
    });
    qa("[data-module]").forEach((button) => button.addEventListener("click", () => activateModule(button.dataset.module)));

    qa('input[name="mailAudience"]').forEach((input) => input.addEventListener("change", updateMailAudience));
    $("mailSearchBtn").addEventListener("click", () => searchPlayers($("mailPlayerSearch").value, $("mailPlayerResults"), selectMailPlayer));
    $("mailPlayerSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); $("mailSearchBtn").click(); } });
    qa("#mailForm input,#mailForm textarea").forEach((field) => field.addEventListener("input", updateMailPreview));
    $("mailForm").addEventListener("submit", submitMail);
    $("refreshMailHistory").addEventListener("click", refreshMailHistory);

    $("redeemForm").addEventListener("submit", submitRedeem);
    $("copyRedeemBtn").addEventListener("click", () => copyText($("redeemCodeValue").textContent));
    $("refreshRedeemHistory").addEventListener("click", refreshRedeemHistory);

    $("profileSearchBtn").addEventListener("click", () => searchPlayers($("profileSearch").value, $("profileSearchResults"), selectProfilePlayer));
    $("profileSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); $("profileSearchBtn").click(); } });
    qa("#profileForm input,#profileForm textarea").forEach((field) => field.addEventListener("input", updateProfileDiff));
    $("profileForm").addEventListener("submit", submitProfile);
    $("refreshActivity").addEventListener("click", refreshActivity);
  }

  async function start() {
    bindEvents();
    updateMailAudience();
    updateMailPreview();
    if (typeof factory !== "function" || !CONFIG.url || !CONFIG.publishableKey) {
      showAuthStatus("A Supabase kliens konfigurációja hiányzik.");
      $("discordLoginBtn").disabled = true;
      return;
    }
    state.client = factory(CONFIG.url, CONFIG.publishableKey, {
      auth: {
        storageKey: CONFIG.authStorageKey || "cherrift-supabase-auth-v063",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
    state.client.auth.onAuthStateChange((_event, session) => { state.session = session; });
    try { await resolveSession(); }
    catch (error) {
      showAuthStatus(`Belépési hiba: ${error.message}`);
      toast(error.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
