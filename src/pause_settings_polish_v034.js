(() => {
  if (!window.UI || !window.CherriftGame) return;

  const KEY = "cherrift_v034_settings";
  const defaults = {
    volume: 60,
    touchMode: true,
    fpsLimit: 60,
    uiScale: 100,
    viewZoom: 1.00,
    compactHud: true,
    damageNumbers: true
  };

  const settings = { ...defaults, ...(safeRead() || {}) };

  function safeRead() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) { return null; }
  }
  function safeWrite() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
  }

  function setInputValue(id, value, checked=false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (checked) el.checked = !!value;
    else el.value = String(value);
  }

  function getStageHud() {
    return document.getElementById("stageHud");
  }

  function applyUiScale() {
    const scale = Math.max(0.85, Math.min(1.25, Number(settings.uiScale || 100) / 100));
    document.documentElement.style.setProperty("--ui-scale-v034", String(scale));
    document.body.classList.add("ui-scale-applied");
  }

  function applyCompactHud() {
    const hud = getStageHud();
    if (!hud) return;
    hud.classList.toggle("v034-force-compact", !!settings.compactHud);
  }

  function applyVolume() {
    const vol = Math.max(0, Math.min(100, Number(settings.volume || 60)));
    const gain = vol / 100;
    // Placeholder global volume store. Safe even if no audio system is wired yet.
    window.CHERRIFT_AUDIO_VOLUME = gain;
  }

  function applyTouchMode() {
    if (window.CHERRIFT_CONFIG?.input) {
      window.CHERRIFT_CONFIG.input.touchMode = !!settings.touchMode;
    }
  }

  function applyFps() {
    if (!window.CHERRIFT_CONFIG) return;
    window.CHERRIFT_CONFIG.fps = Number(settings.fpsLimit || 60);
  }

  function computeBaseZoom(game) {
    const vv = window.visualViewport;
    const w = Math.max(320, Math.floor(vv?.width || window.innerWidth || document.documentElement.clientWidth || screen.width || 360));
    const h = Math.max(240, Math.floor(vv?.height || window.innerHeight || document.documentElement.clientHeight || screen.height || 640));
    const shortSide = Math.min(w, h);
    const mobile = shortSide <= 820;
    const portrait = h >= w;

    if (mobile && portrait) return 0.82;
    if (mobile) return 0.74;
    if (shortSide <= 980) return 0.66;
    return 0.58;
  }

  function applyZoom(game) {
    const g = game || UI.game;
    if (!g) return;
    const mult = Math.max(0.90, Math.min(1.10, Number(settings.viewZoom || 1)));
    const zoom = computeBaseZoom(g) * mult;
    g.zoom = zoom;
    try { g.resize?.(); } catch (_) {}
    g.zoom = zoom; // resize may overwrite it
    try { if (g.mode === "playing") g.render?.(); } catch (_) {}
  }

  function applyAll(game) {
    applyUiScale();
    applyCompactHud();
    applyVolume();
    applyTouchMode();
    applyFps();
    applyZoom(game);
  }

  function syncInputs() {
    setInputValue("volume", settings.volume);
    setInputValue("touchMode", settings.touchMode, true);
    setInputValue("fpsLimit", settings.fpsLimit);
    setInputValue("uiScale", settings.uiScale);
    setInputValue("viewZoom", Number(settings.viewZoom).toFixed(2));
    setInputValue("compactHud", settings.compactHud, true);
    setInputValue("damageNumbersToggle", settings.damageNumbers, true);
  }

  function bindSetting(id, handler, eventName = "input") {
    const el = document.getElementById(id);
    if (!el || el.__v034bound) return;
    el.__v034bound = true;
    el.addEventListener(eventName, handler);
    if (eventName !== "change") el.addEventListener("change", handler);
  }

  function saveAndApply(game) {
    safeWrite();
    applyAll(game);
  }

  function openPauseSettings(e) {
    e?.preventDefault?.();
    document.body.classList.add("settings-from-pause");
    document.getElementById("pauseModal")?.classList.add("hidden");
    UI.open?.("settings");
    updateQuickActionVisibility(true);
  }

  function backFromSettings(e) {
    e?.preventDefault?.();
    const fromPause = document.body.classList.contains("settings-from-pause") && UI.game?.mode === "playing";
    if (fromPause) {
      document.getElementById("settings")?.classList.add("hidden");
      document.getElementById("pauseModal")?.classList.remove("hidden");
    } else {
      UI.open?.("menu");
    }
    updateQuickActionVisibility(fromPause);
  }

  function resumeFromSettings(e) {
    e?.preventDefault?.();
    document.body.classList.remove("settings-from-pause");
    document.getElementById("settings")?.classList.add("hidden");
    UI.resume?.();
  }

  function updateQuickActionVisibility(fromPause = document.body.classList.contains("settings-from-pause")) {
    const resume = document.getElementById("settingsResumeAction");
    const back = document.getElementById("settingsBackAction");
    resume?.classList.toggle("hidden", !fromPause);
    if (back) back.textContent = fromPause ? "BACK TO PAUSE" : "BACK";
  }

  function bindButtons() {
    const pauseSettings = document.getElementById("pauseSettings");
    if (pauseSettings && !pauseSettings.__v034bound) {
      pauseSettings.__v034bound = true;
      pauseSettings.addEventListener("click", openPauseSettings);
    }

    const settingsBack = document.querySelector('#settings .panel-head .back');
    if (settingsBack && !settingsBack.__v034bound) {
      settingsBack.__v034bound = true;
      settingsBack.addEventListener("click", backFromSettings, { capture:true });
    }

    const backAction = document.getElementById("settingsBackAction");
    if (backAction && !backAction.__v034bound) {
      backAction.__v034bound = true;
      backAction.addEventListener("click", backFromSettings);
    }

    const resumeAction = document.getElementById("settingsResumeAction");
    if (resumeAction && !resumeAction.__v034bound) {
      resumeAction.__v034bound = true;
      resumeAction.addEventListener("click", resumeFromSettings);
    }

    const pauseFullscreen = document.getElementById("pauseFullscreen");
    if (pauseFullscreen && !pauseFullscreen.__v034label) {
      pauseFullscreen.__v034label = true;
      pauseFullscreen.textContent = "⛶ FULLSCREEN";
    }

    const fsButtons = [document.getElementById("fullscreen"), document.getElementById("settingsFullscreen")].filter(Boolean);
    fsButtons.forEach(btn => {
      if (btn.__v034bound) return;
      btn.__v034bound = true;
      btn.addEventListener("click", e => {
        e.preventDefault();
        UI.fullscreen?.();
        setTimeout(() => applyZoom(UI.game), 160);
      });
    });
  }

  function bindControls() {
    bindSetting("volume", e => { settings.volume = Number(e.target.value || 60); saveAndApply(UI.game); });
    bindSetting("touchMode", e => { settings.touchMode = !!e.target.checked; saveAndApply(UI.game); }, "change");
    bindSetting("fpsLimit", e => { settings.fpsLimit = Number(e.target.value || 60); saveAndApply(UI.game); }, "change");
    bindSetting("uiScale", e => { settings.uiScale = Number(e.target.value || 100); saveAndApply(UI.game); });
    bindSetting("viewZoom", e => { settings.viewZoom = Number(e.target.value || 1); saveAndApply(UI.game); }, "change");
    bindSetting("compactHud", e => { settings.compactHud = !!e.target.checked; saveAndApply(UI.game); }, "change");
    bindSetting("damageNumbersToggle", e => { settings.damageNumbers = !!e.target.checked; saveAndApply(UI.game); }, "change");
  }

  // Make v0.3.3 damage number patch respect the new toggle.
  const proto = CherriftGame.prototype;
  if (proto.damageEnemy && !proto.__v034DamageTogglePatched) {
    const oldDamageEnemy = proto.damageEnemy;
    proto.damageEnemy = function v034DamageEnemy(e, dmg) {
      const beforeCount = Array.isArray(this.effects) ? this.effects.length : 0;
      const result = oldDamageEnemy.call(this, e, dmg);
      if (!settings.damageNumbers && Array.isArray(this.effects) && this.effects.length > beforeCount) {
        this.effects = this.effects.filter(fx => fx?.type !== "damageText");
      }
      return result;
    };
    proto.__v034DamageTogglePatched = true;
  }

  const oldStart = proto.start;
  if (!proto.__v034StartSettingsPatched) {
    proto.start = async function v034StartSettings(...args) {
      const result = await oldStart.apply(this, args);
      applyAll(this);
      return result;
    };
    proto.__v034StartSettingsPatched = true;
  }

  const oldPause = UI.pause?.bind(UI);
  if (oldPause && !UI.__v034PausePatched) {
    UI.pause = function v034Pause(...args) {
      const result = oldPause(...args);
      document.body.classList.remove("settings-from-pause");
      bindButtons();
      updateQuickActionVisibility(false);
      return result;
    };
    UI.__v034PausePatched = true;
  }

  const oldResume = UI.resume?.bind(UI);
  if (oldResume && !UI.__v034ResumePatched) {
    UI.resume = function v034Resume(...args) {
      document.body.classList.remove("settings-from-pause");
      document.getElementById("settings")?.classList.add("hidden");
      updateQuickActionVisibility(false);
      return oldResume(...args);
    };
    UI.__v034ResumePatched = true;
  }

  const oldOpen = UI.open?.bind(UI);
  if (oldOpen && !UI.__v034OpenPatched) {
    UI.open = function v034Open(id, ...rest) {
      const result = oldOpen(id, ...rest);
      if (id === "settings") {
        syncInputs();
        bindButtons();
        bindControls();
        updateQuickActionVisibility(document.body.classList.contains("settings-from-pause"));
      } else if (id !== "pauseModal") {
        if (id !== "settings") document.body.classList.remove("settings-from-pause");
      }
      return result;
    };
    UI.__v034OpenPatched = true;
  }

  const oldBind = UI.bind.bind(UI);
  UI.bind = function v034Bind(...args) {
    const result = oldBind.apply(this, args);
    syncInputs();
    bindButtons();
    bindControls();
    applyAll(this.game);
    updateQuickActionVisibility(false);
    return result;
  };

  ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange", "pageshow"].forEach(eventName => {
    window.addEventListener(eventName, () => setTimeout(() => applyZoom(UI.game), 120), { passive:true });
    document.addEventListener(eventName, () => setTimeout(() => applyZoom(UI.game), 120), { passive:true });
  });

  // Initial apply
  setTimeout(() => {
    syncInputs();
    applyAll(UI.game);
    bindButtons();
    bindControls();
    updateQuickActionVisibility(false);
  }, 0);
})();