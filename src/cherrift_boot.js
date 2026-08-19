(() => {
  "use strict";
  if (window.__CHERRIFT_BOOT_V096__) return;
  window.__CHERRIFT_BOOT_V096__ = true;

  const startedAt = performance.now();
  const minimumVisibleMs = 900;
  const offlineFallbackMs = 15000;
  const state = {
    dom:false, ui:false, prebeta:false, live:false, loaded:false,
    assetsReady:false, stable:false, phase:"loading", released:false,
    authMode:"checking"
  };
  let shownProgress = 3;

  const byId = value => document.getElementById(value);
  const boot = () => byId("bootV060");

  // This runs from the deferred boot script, before the normal runtime layers.
  // It prevents the progress card from briefly inheriting a stale/right-shifted
  // mobile layout during the very first paint.
  function installMobileFirstPaintFix() {
    if (document.getElementById("cherriftBootMobileFirstPaint097")) return;
    const style = document.createElement("style");
    style.id = "cherriftBootMobileFirstPaint097";
    style.textContent = `
      @media (orientation:portrait), (max-width:620px) {
        #bootV060 .boot-stage-v096{
          left:50%!important;right:auto!important;
          width:min(430px,84vw)!important;max-width:84vw!important;
          margin:0!important;box-sizing:border-box!important;
          transform:translate3d(-50%,0,0)!important;
        }
        #bootV060 .boot-panel-v096,
        #bootV060 .boot-track-v060,
        #bootV060 .boot-status-v060{
          width:100%!important;max-width:100%!important;
          margin-left:0!important;margin-right:0!important;
          box-sizing:border-box!important;
        }
        #bootAuthV096>p{display:none!important}
        #bootAuthStatusV096{white-space:pre-line!important;line-height:1.45!important}
      }
    `;
    document.head.appendChild(style);
  }
  installMobileFirstPaintFix();

  function isPhoneBoot() {
    const touch = Number(navigator.maxTouchPoints) > 0 || matchMedia("(pointer:coarse)").matches;
    return touch && Math.min(innerWidth || 9999, innerHeight || 9999, screen.width || 9999, screen.height || 9999) <= 820;
  }

  function language() {
    return window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }

  function copy(hu, en) { return language() === "en" ? en : hu; }

  function targetProgress() {
    if (!state.dom) return 8;
    if (!state.ui) return 36;
    if (!state.prebeta) return 58;
    if (!state.live) return 74;
    if (!state.assetsReady) return 91;
    if (!state.loaded) return 96;
    return 100;
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
      intro.textContent = phone ? "" : copy("Jelentkezz be Discorddal a felhőmentéshez, vagy folytasd vendégként ezen az eszközön.", "Sign in with Discord for cloud saves, or continue as a Guest on this device.");
    }
    if (discord) discord.textContent = "DISCORD LOGIN";
    if (guest) guest.textContent = copy("FOLYTATÁS VENDÉGKÉNT", "CONTINUE AS GUEST");
    if (start) start.textContent = copy("KATTINTS A KEZDÉSHEZ", "CLICK TO START");
  }

  function authState() {
    try { return window.CHERRIFT_AUTH?.getState?.() || null; } catch (_) { return null; }
  }

  function setAuthBusy(busy, status = "") {
    for (const button of [byId("bootDiscordV096"), byId("bootGuestV096")]) if (button) button.disabled = busy;
    const label = byId("bootAuthStatusV096");
    if (label && status) label.textContent = status;
  }

  function showAuth() {
    state.authMode = "gate";
    syncCopy();
    setPhase("auth");
    const current = authState();
    const discord = byId("bootDiscordV096");
    if (discord) discord.disabled = current?.busy || window.CHERRIFT_AUTH?.clientReady === false;
    const status = byId("bootAuthStatusV096");
    if (status) status.textContent = isPhoneBoot() ? copy(
      "Vendég módban a mentéseid elvesznek!\nBizonyos funkciók nem elérhetőek ebben a módban.",
      "Guest-mode saves can be lost!\nSome features are unavailable in this mode."
    ) : copy("A vendégmentés csak ebben a böngészőben marad meg.", "Guest progress is stored only in this browser.");
  }

  function showStart(mode = "guest") {
    state.authMode = mode;
    syncCopy();
    setPhase("start");
    requestAnimationFrame(() => byId("bootStartV096")?.focus({ preventScroll:true }));
  }

  function decideAfterLoading() {
    const current = authState();
    if (!current || current.mode === "checking") return false;
    if (current.mode === "discord" && current.signedIn) showStart("discord");
    else if (current.mode === "guest") showStart("guest");
    else showAuth();
    return true;
  }

  function releaseToLobby() {
    if (state.released || state.phase !== "start") return;
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
    if (!api) return;
    if (action === "discord") {
      setAuthBusy(true, copy("Átirányítás Discordra…", "Redirecting to Discord…"));
      const ok = await api.signInWithDiscord?.();
      if (!ok) setAuthBusy(false, copy("A Discord bejelentkezés nem indult el. Próbáld újra.", "Discord sign-in did not start. Please try again."));
      return;
    }
    setAuthBusy(true, copy("Vendégmentés előkészítése…", "Preparing guest save…"));
    const ok = await api.continueAsGuest?.();
    if (ok !== false) showStart("guest");
    else setAuthBusy(false, copy("A vendég mód nem indítható.", "Guest mode could not start."));
  }

  function tick() {
    if (state.released || state.phase !== "loading") return;
    state.ui = Boolean(window.UI && window.CherriftStorage && byId("app"));
    state.prebeta = window.__CHERRIFT_PREBETA_READY__ === true;
    state.live = state.live || window.__CHERRIFT_LIVE_READY__ === true;
    state.assetsReady = state.assetsReady || Boolean(window.UI?.game && window.CHERRIFT_AUTH?.getState?.());
    const target = targetProgress();
    paintProgress(shownProgress + Math.max(.3, (target - shownProgress) * .085));

    const elapsed = performance.now() - startedAt;
    state.stable = state.dom && state.ui && state.prebeta && state.live && state.assetsReady && state.loaded;
    if (((state.stable && elapsed >= minimumVisibleMs) || elapsed >= offlineFallbackMs) && decideAfterLoading()) {
      paintProgress(100);
      return;
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener("click", event => {
    const auth = event.target.closest?.("[data-boot-auth]");
    if (auth && !auth.disabled) { event.preventDefault(); chooseAuth(auth.dataset.bootAuth); return; }
    if (event.target.closest?.("#bootStartV096")) { event.preventDefault(); releaseToLobby(); }
  });
  document.addEventListener("keydown", event => {
    if (state.phase === "start" && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); releaseToLobby(); }
  });

  window.addEventListener("cherrift:authgate", event => {
    if (!state.stable || state.released) return;
    const detail = event.detail || {};
    if (detail.visible) showAuth();
    else if (["guest", "discord"].includes(detail.mode)) showStart(detail.mode);
  });
  window.addEventListener("cherrift:languagechange", syncCopy);
  window.addEventListener("load", () => { state.loaded = true; }, { once:true });
  window.addEventListener("cherrift:prebeta-ready", () => { state.prebeta = true; }, { once:true });
  window.addEventListener("cherrift:live:ready", () => { state.live = true; }, { once:true });
  window.addEventListener("cherrift:runtime-ready", () => { state.assetsReady = true; });
  document.addEventListener("DOMContentLoaded", () => { state.dom = true; syncCopy(); }, { once:true });

  if (document.readyState !== "loading") state.dom = true;
  if (document.readyState === "complete") state.loaded = true;
  syncCopy();
  requestAnimationFrame(tick);

  window.CHERRIFT_BOOT = Object.freeze({
    version:"0.9.7-start-screen.1",
    getState:() => ({ ...state, progress:shownProgress }),
    showAuth,
    showStart,
    release:releaseToLobby
  });
})();
