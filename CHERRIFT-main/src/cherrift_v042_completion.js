(() => {
  "use strict";

  const VERSION = "0.4.2-completion-foundation";
  const SAVE_SCHEMA = 5;
  const BACKUP_KEY = "cherrift_save_backup_v04";

  if (!window.CherriftStorage || !window.CherriftGame || !window.CHERRIFT_DATA || !window.CHERRIFT_CONFIG) {
    console.error("[CHERRIFT v0.4.2] Base modules missing.");
    return;
  }

  CHERRIFT_CONFIG.version = VERSION;
  CHERRIFT_DATA.version = VERSION;

  const storage = window.CherriftStorage;
  const originalDefaults = storage.defaults.bind(storage);
  const originalLoad = storage.load.bind(storage);
  const originalSave = storage.save.bind(storage);

  function uniqueStrings(value, fallback = []) {
    return [...new Set((Array.isArray(value) ? value : fallback).filter(v => typeof v === "string" && v))];
  }

  function normalizeSave(save) {
    const defaults = originalDefaults();
    const out = save && typeof save === "object" ? save : {};

    out.schemaVersion = Math.max(SAVE_SCHEMA, Number(out.schemaVersion) || 0);
    out.coins = Math.max(0, Number(out.coins) || 0);
    out.keys = Math.max(0, Number(out.keys) || 0);
    out.inventory = Array.isArray(out.inventory) ? out.inventory.filter(Boolean) : [];
    out.equipped = out.equipped && typeof out.equipped === "object" ? out.equipped : {};
    out.best = { time: 0, kills: 0, ...(defaults.best || {}), ...(out.best || {}) };
    out.settings = {
      volume: 60,
      touchMode: true,
      fpsLimit: 60,
      uiScale: 100,
      viewZoom: 1,
      language: "hu",
      preloadArtwork: true,
      reducedMotion: false,
      highContrast: false,
      damageNumbers: true,
      compactHud: true,
      ...(defaults.settings || {}),
      ...(out.settings || {})
    };

    out.settings.volume = Math.max(0, Math.min(100, Number(out.settings.volume) || 0));
    out.settings.fpsLimit = [30, 60].includes(Number(out.settings.fpsLimit)) ? Number(out.settings.fpsLimit) : 60;
    out.settings.uiScale = Math.max(85, Math.min(125, Number(out.settings.uiScale) || 100));
    out.settings.viewZoom = [1, 1.1, 1.2].includes(Number(out.settings.viewZoom)) ? Number(out.settings.viewZoom) : 1;
    out.settings.language = ["hu", "en"].includes(out.settings.language) ? out.settings.language : "hu";
    out.settings.preloadArtwork = out.settings.preloadArtwork !== false;
    out.settings.reducedMotion = !!out.settings.reducedMotion;
    out.settings.highContrast = !!out.settings.highContrast;
    out.settings.touchMode = out.settings.touchMode !== false;
    out.settings.damageNumbers = out.settings.damageNumbers !== false;
    out.settings.compactHud = out.settings.compactHud !== false;

    out.unlockedSkins = uniqueStrings(out.unlockedSkins, ["cherry_default"]);
    if (!out.unlockedSkins.includes("cherry_default")) out.unlockedSkins.unshift("cherry_default");
    if (!CHERRIFT_DATA.skins.some(s => s.id === out.selectedSkin) || !out.unlockedSkins.includes(out.selectedSkin)) {
      out.selectedSkin = "cherry_default";
    }

    out.unlockedStages = uniqueStrings(out.unlockedStages, ["world_1_1"]);
    if (!out.unlockedStages.includes("world_1_1")) out.unlockedStages.unshift("world_1_1");
    out.completedStages = uniqueStrings(out.completedStages, []);
    out.firstClearClaimed = uniqueStrings(out.firstClearClaimed, out.completedStages);
    out.selectedStageId = typeof out.selectedStageId === "string" && out.selectedStageId ? out.selectedStageId : "world_1_1";
    if (!out.unlockedStages.includes(out.selectedStageId)) out.selectedStageId = out.unlockedStages[0] || "world_1_1";

    out.lastSavedAt = Number(out.lastSavedAt) || 0;
    return out;
  }

  storage.defaults = function defaultsV042() {
    return normalizeSave(originalDefaults());
  };

  storage.load = function loadV042() {
    let loaded;
    let primaryCorrupt = false;
    try {
      const raw = localStorage.getItem(storage.key);
      if (raw) JSON.parse(raw);
    } catch (_) {
      primaryCorrupt = true;
    }

    if (!primaryCorrupt) {
      try {
        loaded = originalLoad();
      } catch (_) {
        loaded = null;
      }
    }

    if (primaryCorrupt || !loaded || typeof loaded !== "object") {
      try {
        const backup = JSON.parse(localStorage.getItem(BACKUP_KEY) || "null");
        loaded = backup && typeof backup === "object" ? backup : originalDefaults();
      } catch (_) {
        loaded = originalDefaults();
      }
    }

    const normalized = normalizeSave(loaded);
    try { originalSave(normalized); } catch (_) {}
    return normalized;
  };

  storage.save = function saveV042(data) {
    const normalized = normalizeSave(data);
    normalized.lastSavedAt = Date.now();

    try {
      const current = localStorage.getItem(storage.key);
      if (current) localStorage.setItem(BACKUP_KEY, current);
    } catch (_) {}

    try {
      originalSave(normalized);
      return true;
    } catch (error) {
      console.error("[CHERRIFT v0.4.2] Save failed:", error);
      return false;
    }
  };

  const proto = CherriftGame.prototype;

  function getStage(game) {
    return game?.stage || game?.currentStage || null;
  }

  function bossAlive(game, bossId) {
    return (game.enemies || []).some(enemy => enemy && !enemy.dead && enemy.hp > 0 && (
      enemy.id === bossId || enemy.type === bossId || enemy.enemyId === bossId || enemy.boss === true
    ));
  }

  function ensureBoss(game) {
    if (!game || game.mode !== "playing" || !game.player) return;
    const stage = getStage(game);
    if (!stage?.boss || game.__v042BossSpawned || bossAlive(game, stage.boss)) return;

    const goal = Number(stage.goalKills || stage.goal || 0);
    const kills = Number(game.kills || 0);
    const triggerAt = Math.max(1, goal - 1);
    if (kills < triggerAt) return;

    const before = (game.enemies || []).length;
    let spawned = false;

    if (typeof game.spawnEnemy === "function") {
      try { spawned = game.spawnEnemy(stage.boss) !== false; } catch (_) {}
    }

    if (!spawned && typeof game.createEnemy === "function") {
      try {
        const enemy = game.createEnemy(stage.boss);
        if (enemy) {
          game.enemies = game.enemies || [];
          game.enemies.push(enemy);
          spawned = true;
        }
      } catch (_) {}
    }

    if (spawned || (game.enemies || []).length > before) {
      game.__v042BossSpawned = true;
      console.info("[CHERRIFT v0.4.2] Boss ensured:", stage.boss);
    }
  }

  const originalStart = proto.start;
  if (typeof originalStart === "function") {
    proto.start = function startV042(...args) {
      this.__v042BossSpawned = false;
      const result = originalStart.apply(this, args);
      try { storage.save(this.save); } catch (_) {}
      return result;
    };
  }

  const originalUpdate = proto.update;
  if (typeof originalUpdate === "function") {
    proto.update = function updateV042(dt) {
      const safeDt = Number.isFinite(dt) ? Math.min(dt, 0.1) : 0;
      const result = originalUpdate.call(this, safeDt);
      ensureBoss(this);
      return result;
    };
  }

  function pauseForBackground() {
    const game = window.UI?.game;
    if (!game || game.mode !== "playing") return;

    if (typeof window.UI?.pause === "function") {
      try { window.UI.pause(); } catch (_) {}
    } else if (typeof game.pause === "function") {
      try { game.pause(); } catch (_) {}
    } else {
      game.mode = "paused";
      document.body.classList.remove("is-playing");
      document.getElementById("pauseModal")?.classList.remove("hidden");
    }

    try { storage.save(game.save || window.UI?.save); } catch (_) {}
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseForBackground();
  });

  window.addEventListener("pagehide", () => {
    try { storage.save(window.UI?.save || window.UI?.game?.save); } catch (_) {}
  });

  window.addEventListener("beforeunload", () => {
    try { storage.save(window.UI?.save || window.UI?.game?.save); } catch (_) {}
  });

  const autosave = window.setInterval(() => {
    const save = window.UI?.save || window.UI?.game?.save;
    if (save) storage.save(save);
  }, 30000);
  window.addEventListener("pagehide", () => clearInterval(autosave), { once: true });

  console.info("[CHERRIFT v0.4.2] Completion foundation loaded.");
})();
