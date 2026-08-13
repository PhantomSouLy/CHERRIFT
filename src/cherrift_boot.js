(() => {
  "use strict";
  if (window.__CHERRIFT_BOOT_V096__) return;
  window.__CHERRIFT_BOOT_V096__ = true;

  const startedAt = performance.now();
  const minimumVisibleMs = 900;
  const offlineFallbackMs = 12000;
  const state = {
    dom: false,
    ui: false,
    prebeta: false,
    live: false,
    loaded: false,
    released: false
  };
  let shownProgress = 3;

  const byId = id => document.getElementById(id);
  function targetProgress() {
    if (!state.dom) return 8;
    if (!state.ui) return 36;
    if (!state.prebeta) return 60;
    if (!state.live) return 78;
    if (!state.loaded) return 93;
    return 100;
  }

  function paintProgress(value) {
    shownProgress = Math.max(shownProgress, Math.min(100, Math.round(value)));
    const fill = byId("bootFillV060");
    const percent = byId("bootPercentV060");
    if (fill) fill.style.width = `${shownProgress}%`;
    if (percent) percent.textContent = `${shownProgress}%`;
  }

  function setPhase() {
    const cherry = document.querySelector(".boot-cherry-v096");
    if (!cherry) return;
    const cycle = (performance.now() - startedAt) % 3900;
    cherry.dataset.phase = cycle >= 2050 && cycle < 3200 ? "think" : "run";
  }

  function isStable() {
    return state.dom && state.ui && state.prebeta && state.live && state.loaded;
  }

  function release() {
    if (state.released) return;
    state.released = true;
    paintProgress(100);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const boot = byId("bootV060");
      document.body.classList.remove("v060-booting");
      if (boot) {
        boot.classList.add("done");
        boot.setAttribute("aria-hidden", "true");
        setTimeout(() => boot.remove(), 450);
      }
      window.dispatchEvent(new CustomEvent("cherrift:boot-ready", {
        detail: { durationMs: Math.round(performance.now() - startedAt) }
      }));
    }));
  }

  function tick() {
    if (state.released) return;
    state.ui = Boolean(window.UI && window.CherriftStorage && byId("app"));
    state.prebeta = window.__CHERRIFT_PREBETA_READY__ === true;
    state.live = state.live || window.__CHERRIFT_LIVE_READY__ === true;
    setPhase();

    const target = targetProgress();
    paintProgress(shownProgress + Math.max(.35, (target - shownProgress) * .09));

    const elapsed = performance.now() - startedAt;
    if ((isStable() && elapsed >= minimumVisibleMs) || elapsed >= offlineFallbackMs) {
      release();
      return;
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", () => { state.dom = true; }, { once: true });
  window.addEventListener("load", () => { state.loaded = true; }, { once: true });
  window.addEventListener("cherrift:prebeta-ready", () => { state.prebeta = true; }, { once: true });
  window.addEventListener("cherrift:live:ready", () => { state.live = true; }, { once: true });

  if (document.readyState !== "loading") state.dom = true;
  if (document.readyState === "complete") state.loaded = true;
  requestAnimationFrame(tick);
})();
