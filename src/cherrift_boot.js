(() => {
  "use strict";
  if (window.__CHERRIFT_BOOT_V096__) return;
  window.__CHERRIFT_BOOT_V096__ = true;

  const startedAt = performance.now();
  const minimumVisibleMs = 900;
  const warningAfterMs = 12000;
  const state = {
    dom:false,
    ui:false,
    authReady:false,
    saveReady:false,
    prebeta:false,
    live:false,
    runtime:false,
    loaded:false,
    stable:false,
    phase:"loading",
    released:false,
    authMode:"checking",
    loopToken:0,
    warningShown:false
  };
  let shownProgress = 3;

  const byId = value => document.getElementById(value);
  const boot = () => byId("bootV060");

  function isPhoneBoot() {
    const touch = Number(navigator.maxTouchPoints) > 0 || matchMedia("(pointer:coarse)").matches;
    return touch && Math.min(innerWidth || 9999, innerHeight || 9999, screen.width || 9999, screen.height || 9999) <= 820;
  }

  function language() {
    return window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }

  function copy(hu, en) {
    return language() === "en" ? en : hu;
  }

  function authState() {
    try {
      return window.CHERRIFT_AUTH?.getState?.() || null;
    } catch (_) {
      return null;
    }
  }

  function authMode(current = authState()) {
    if (!current || current.mode === "checking") return "checking";
    if (current.mode === "discord" && current.signedIn) return "discord";
    if (current.mode === "guest") return "guest";
    return "gate";
  }

  function refreshReadiness() {
    const current = authState();
    state.dom = state.dom || document.readyState !== "loading";
    state.ui = Boolean(window.UI && window.CherriftStorage && byId("app"));
    state.authReady = authMode(current) !== "checking";
    state.saveReady = Boolean(window.UI?.save);
    state.prebeta = window.__CHERRIFT_PREBETA_READY__ === true;
    state.live = state.live || window.__CHERRIFT_LIVE_READY__ === true;
    state.runtime = state.runtime || window.__CHERRIFT_RUNTIME_READY__ === true || window.__CHERRIFT_CLEAN_RUNTIME__ === true || Boolean(window.CHERRIFT_RUNTIME);
    state.loaded = state.loaded || document.readyState === "complete";
    // Live services (Mail/catalog) are deliberately non-blocking. A slow or offline
    // Supabase connection must never keep the player behind the loading screen.
    state.stable = state.dom && state.ui && state.authReady && state.saveReady && state.prebeta && state.runtime && state.loaded;
    return current;
  }

  function targetProgress() {
    if (!state.dom) return 10;
    if (!state.ui) return 30;
    if (!state.authReady) return 48;
    if (!state.saveReady) return 62;
    if (!state.prebeta) return 76;
    if (!state.runtime) return 88;
    if (!state.live) return 94;
    if (!state.loaded) return 98;
    return 100;
  }

  function loadingMessage() {
    if (!state.dom) return copy("CHERRIFT indítása…", "Starting CHERRIFT…");
    if (!state.ui) return copy("Felület előkészítése…", "Preparing interface…");
    if (!state.authReady) return copy("Bejelentkezés ellenőrzése…", "Checking sign-in…");
    if (!state.saveReady) {
      const mode = authMode();
      if (mode === "discord") return copy("Felhőmentés betöltése…", "Loading cloud save…");
      if (mode === "guest") return copy("Helyi mentés betöltése…", "Loading local save…");
      return copy("Profil előkészítése…", "Preparing profile…");
    }
    if (!state.prebeta) return copy("Játékrendszerek betöltése…", "Loading game systems…");
    if (!state.runtime) return copy("Felület véglegesítése…", "Finalizing interface…");
    if (!state.live) return copy("Online szolgáltatások kapcsolása…", "Connecting online services…");
    if (!state.loaded) return copy("Utolsó ellenőrzések…", "Running final checks…");
    return copy("Kész…", "Ready…");
  }

  function waitingFor() {
    const missing = [];
    if (!state.ui) missing.push("UI");
    if (!state.authReady) missing.push("Auth");
    if (!state.saveReady) missing.push("Save");
    if (!state.prebeta) missing.push("Pre-beta");
    if (!state.runtime) missing.push("Runtime");
    if (!state.live) missing.push("Live");
    if (!state.loaded) missing.push("Load");
    return missing.join(", ") || "unknown";
  }

  function paintProgress(value, message = "") {
    shownProgress = Math.max(shownProgress, Math.min(100, Math.round(value)));
    const fill = byId("bootFillV060");
    const percent = byId("bootPercentV060");
    const label = byId("bootTextV060");
    if (fill) fill.style.width = `${shownProgress}%`;
    if (percent) percent.textContent = `${shownProgress}%`;
    if (label && message) label.textContent = message;
  }

  function setPhase(phase) {
    state.phase = phase;
    state.loopToken += 1;
    const root = boot();
    if (!root) return;
    root.dataset.bootPhase = phase;
    byId("bootLoadingV096")?.toggleAttribute("hidden", phase !== "loading");
    byId("bootAuthV096")?.toggleAttribute("hidden", phase !== "auth");
    byId("bootStartV096")?.toggleAttribute("hidden", phase !== "start");
  }

  function syncCopy() {
    const title = byId("bootAuthTitleV096");
    const intro = byId("bootAuthV096")?.querySelector("p");
    const discord = byId("bootDiscordV096")?.querySelector("b");
    const guest = byId("bootGuestV096")?.querySelector("b");
    const start = byId("bootStartV096")?.querySelector("span");
    const phone = isPhoneBoot();
    if (title) title.textContent = phone ? copy("Jelentkezz be.", "Sign in.") : copy("Hogyan folytatod?", "How would you like to continue?");
    if (intro) {
      intro.hidden = phone;
      intro.textContent = phone ? "" : copy(
        "Jelentkezz be Discorddal a felhőmentéshez, vagy folytasd vendégként ezen az eszközön.",
        "Sign in with Discord for cloud saves, or continue as a Guest on this device."
      );
    }
    if (discord) discord.textContent = "DISCORD LOGIN";
    if (guest) guest.textContent = copy("FOLYTATÁS VENDÉGKÉNT", "CONTINUE AS GUEST");
    if (start) start.textContent = copy("KATTINTS A KEZDÉSHEZ", "CLICK TO START");
  }

  function setAuthBusy(busy, status = "") {
    for (const button of [byId("bootDiscordV096"), byId("bootGuestV096")]) {
      if (button) button.disabled = busy;
    }
    const label = byId("bootAuthStatusV096");
    if (label && status) label.textContent = status;
  }

  function showAuth() {
    if (state.released) return;
    state.authMode = "gate";
    syncCopy();
    setPhase("auth");
    const current = authState();
    const discord = byId("bootDiscordV096");
    const guest = byId("bootGuestV096");
    if (discord) discord.disabled = Boolean(current?.busy || window.CHERRIFT_AUTH?.clientReady === false);
    if (guest) guest.disabled = Boolean(current?.busy);
    const status = byId("bootAuthStatusV096");
    if (status) {
      status.textContent = isPhoneBoot() ? copy(
        "Vendég módban a mentéseid elvesznek!\nBizonyos funkciók nem elérhetőek ebben a módban.",
        "Guest-mode saves can be lost!\nSome features are unavailable in this mode."
      ) : copy(
        "A vendégmentés csak ebben a böngészőben marad meg.",
        "Guest progress is stored only in this browser."
      );
    }
  }

  function showStart(mode = "guest") {
    if (state.released) return;
    state.authMode = mode;
    paintProgress(100);
    syncCopy();
    setPhase("start");
    requestAnimationFrame(() => byId("bootStartV096")?.focus({ preventScroll:true }));
  }

  function startLoadingLoop(message = "") {
    if (state.released) return;
    setPhase("loading");
    if (message) paintProgress(shownProgress, message);
    const token = state.loopToken;
    requestAnimationFrame(() => tick(token));
  }

  function finalizeIfReady(current = authState()) {
    const mode = authMode(current);
    if (mode === "checking") return false;
    if (mode === "gate") return false;
    state.authMode = mode;
    if (!state.stable) return false;
    showStart(mode);
    return true;
  }

  function releaseToLobby() {
    if (state.released || state.phase !== "start" || !state.stable) return;
    state.released = true;
    document.body.classList.remove("v060-booting", "auth-gated-v064");
    window.UI?.open?.("menu");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const root = boot();
      root?.classList.add("done");
      root?.setAttribute("aria-hidden", "true");
      window.setTimeout(() => root?.remove(), 650);
      window.dispatchEvent(new CustomEvent("cherrift:boot-ready", {
        detail:{ durationMs:Math.round(performance.now() - startedAt), mode:state.authMode }
      }));
    }));
  }

  async function chooseAuth(action) {
    const api = window.CHERRIFT_AUTH;
    if (!api) {
      setAuthBusy(false, copy("A bejelentkezési modul még nem érhető el.", "The sign-in module is not ready yet."));
      return;
    }
    if (action === "discord") {
      setAuthBusy(true, copy("Átirányítás Discordra…", "Redirecting to Discord…"));
      const ok = await api.signInWithDiscord?.();
      if (!ok) {
        setAuthBusy(false, copy("A Discord bejelentkezés nem indult el. Próbáld újra.", "Discord sign-in did not start. Please try again."));
      }
      return;
    }

    setAuthBusy(true, copy("Vendégmentés előkészítése…", "Preparing guest save…"));
    const ok = await api.continueAsGuest?.();
    if (ok === false) {
      setAuthBusy(false, copy("A vendég mód nem indítható.", "Guest mode could not start."));
      return;
    }
    state.authMode = "guest";
    startLoadingLoop(copy("Vendégprofil betöltése…", "Loading guest profile…"));
  }

  function tick(token) {
    if (token !== state.loopToken || state.released || state.phase !== "loading") return;

    const current = refreshReadiness();
    const mode = authMode(current);
    const elapsed = performance.now() - startedAt;
    const target = targetProgress();
    paintProgress(shownProgress + Math.max(.25, (target - shownProgress) * .09), loadingMessage());

    if (elapsed >= minimumVisibleMs && mode === "gate") {
      showAuth();
      return;
    }

    if (elapsed >= minimumVisibleMs && finalizeIfReady(current)) return;

    if (!state.warningShown && elapsed >= warningAfterMs) {
      state.warningShown = true;
      console.warn(`[CHERRIFT Boot] Startup is still waiting for: ${waitingFor()}`);
      const label = byId("bootTextV060");
      if (label) label.textContent = copy(
        `Betöltés folyamatban… (${waitingFor()})`,
        `Still loading… (${waitingFor()})`
      );
    }

    requestAnimationFrame(() => tick(token));
  }

  document.addEventListener("click", event => {
    const auth = event.target.closest?.("[data-boot-auth]");
    if (auth && !auth.disabled) {
      event.preventDefault();
      chooseAuth(auth.dataset.bootAuth);
      return;
    }
    if (event.target.closest?.("#bootStartV096")) {
      event.preventDefault();
      releaseToLobby();
    }
  });

  document.addEventListener("keydown", event => {
    if (state.phase === "start" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      releaseToLobby();
    }
  });

  window.addEventListener("cherrift:authgate", event => {
    if (state.released) return;
    const detail = event.detail || {};
    if (detail.visible) {
      if (performance.now() - startedAt >= minimumVisibleMs) showAuth();
      return;
    }
    if (["guest", "discord"].includes(detail.mode)) {
      state.authMode = detail.mode;
      startLoadingLoop(copy("Profil betöltése…", "Loading profile…"));
    }
  });

  window.addEventListener("cherrift:languagechange", syncCopy);
  window.addEventListener("load", () => { state.loaded = true; }, { once:true });
  window.addEventListener("cherrift:prebeta-ready", () => { state.prebeta = true; });
  window.addEventListener("cherrift:live:ready", () => { state.live = true; });
  window.addEventListener("cherrift:runtime-ready", () => { state.runtime = true; });
  window.addEventListener("cherrift:runtime-clean-ready", () => { state.runtime = true; });
  document.addEventListener("DOMContentLoaded", () => { state.dom = true; syncCopy(); }, { once:true });

  if (document.readyState !== "loading") state.dom = true;
  if (document.readyState === "complete") state.loaded = true;
  syncCopy();
  startLoadingLoop();

  window.CHERRIFT_BOOT = Object.freeze({
    version:"0.9.5-clean-boot.3",
    getState:() => ({ ...state, progress:shownProgress, waitingFor:waitingFor() }),
    showAuth,
    showStart,
    release:releaseToLobby,
    refresh:refreshReadiness
  });
})();
