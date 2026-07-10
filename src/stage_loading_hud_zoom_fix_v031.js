(() => {
  if (!window.UI) return;

  const STAGES = [
    "world_1_1", "world_1_2", "world_1_3", "world_1_4", "world_1_5",
    "world_2_1", "world_2_2", "world_2_3", "world_2_4", "world_2_5"
  ];

  const stageTitle = () => {
    const name = document.getElementById("carouselStageName")?.textContent || "World 1-1";
    const title = document.getElementById("carouselStageTitle")?.textContent || "Blooming Meadow";
    return `${name} · ${title}`;
  };

  const setLoading = (percent, text) => {
    const fill = document.getElementById("loadingFill");
    const label = document.getElementById("loadingText");
    if (fill) fill.style.width = `${Math.max(8, Math.min(100, percent))}%`;
    if (label) label.textContent = text;
  };

  const showLoading = () => {
    const loading = document.getElementById("stageLoading");
    document.body.classList.add("is-loading-stage");
    document.body.classList.remove("is-playing");
    document.getElementById("loadingStageName") && (document.getElementById("loadingStageName").textContent = stageTitle());
    setLoading(12, "Preparing stage...");
    loading?.classList.remove("hidden");

    ["hud", "skill", "stageHud", "worlds", "menu", "skins", "gear", "chests", "settings", "stageClearModal", "gameOver", "pauseModal", "levelModal"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
  };

  const hideLoading = game => {
    document.body.classList.remove("is-loading-stage");
    document.body.classList.add("is-playing");
    document.getElementById("stageLoading")?.classList.add("hidden");

    ["worlds", "menu", "skins", "gear", "chests", "settings", "stageClearModal", "gameOver", "pauseModal", "levelModal"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });

    document.getElementById("hud")?.classList.remove("hidden");
    document.getElementById("stageHud")?.classList.remove("hidden");
    document.getElementById("skill")?.classList.remove("hidden");

    normalizeViewport(game);
    updateCompactStageHud(game);
  };

  const normalizeViewport = game => {
    const g = game || UI.game;
    const canvas = g?.canvas || document.getElementById("game");
    const app = document.getElementById("app");
    const vv = window.visualViewport;
    const w = Math.max(320, Math.floor(vv?.width || window.innerWidth || document.documentElement.clientWidth || screen.width || 360));
    const h = Math.max(240, Math.floor(vv?.height || window.innerHeight || document.documentElement.clientHeight || screen.height || 640));

    if (canvas) {
      canvas.style.position = "fixed";
      canvas.style.inset = "0";
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.style.minWidth = `${w}px`;
      canvas.style.minHeight = `${h}px`;
      canvas.style.display = "block";
      canvas.style.visibility = "visible";
      canvas.style.opacity = "1";
    }

    if (app) {
      app.style.position = "fixed";
      app.style.inset = "0";
      app.style.width = `${w}px`;
      app.style.height = `${h}px`;
      app.style.background = "transparent";
    }

    // Middle-ground zoom:
    // - mobile portrait uses a bit more map than before, but not tiny
    // - fullscreen and non-fullscreen get the same scale decision
    // - PC remains broader
    if (g) {
      const shortSide = Math.min(w, h);
      const longSide = Math.max(w, h);
      const mobile = shortSide <= 820;
      const portrait = h >= w;

      if (mobile && portrait) {
        g.zoom = 0.82;
      } else if (mobile) {
        g.zoom = 0.74;
      } else if (shortSide <= 980) {
        g.zoom = 0.66;
      } else {
        g.zoom = 0.58;
      }

      // Let resize update real canvas pixel buffer if the game has this method.
      try { g.resize?.(); } catch (_) {}

      // Re-apply because some resize methods recalc zoom internally.
      if (mobile && portrait) g.zoom = 0.82;
      else if (mobile) g.zoom = 0.74;
      else if (shortSide <= 980) g.zoom = 0.66;
      else g.zoom = 0.58;

      try { if (g.mode === "playing") g.render?.(); } catch (_) {}
    }
  };

  const queueNormalize = game => {
    requestAnimationFrame(() => normalizeViewport(game));
    setTimeout(() => normalizeViewport(game), 70);
    setTimeout(() => normalizeViewport(game), 180);
    setTimeout(() => normalizeViewport(game), 420);
    setTimeout(() => normalizeViewport(game), 850);
  };

  const updateCompactStageHud = game => {
    const g = game || UI.game;
    const stage = g?.stage || g?.getSelectedStage?.();
    if (!stage) return;

    const name = document.getElementById("stageHudName");
    const goal = document.getElementById("stageHudGoal");
    if (name) name.textContent = stage.name || "Stage";
    if (goal) goal.textContent = `${Math.min(g.kills || 0, stage.goalKills || 0)}/${stage.goalKills || 0}`;
  };

  const hidePanelsForLaunch = () => {
    ["worlds", "menu", "skins", "gear", "chests", "settings", "stageClearModal", "gameOver", "pauseModal", "levelModal"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
  };

  const openWorldSelect = e => {
    e?.preventDefault?.();
    e?.stopImmediatePropagation?.();
    document.body.classList.remove("is-playing", "is-loading-stage");
    document.getElementById("stageLoading")?.classList.add("hidden");
    ["hud", "skill", "stageHud", "pauseModal", "gameOver", "levelModal", "stageClearModal"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    if (typeof UI.openWorldSelect === "function") UI.openWorldSelect();
    else UI.open?.("worlds");
  };

  const launchStageWithLoading = async e => {
    e?.preventDefault?.();
    e?.stopImmediatePropagation?.();
    if (UI.__stageLaunchBusy) return;

    const index = Math.max(0, Math.min(STAGES.length - 1, UI.worldCarouselIndex || 0));
    const stageId = STAGES[index] || STAGES[0];
    const unlocked = Array.isArray(UI.save?.unlockedStages) ? UI.save.unlockedStages.includes(stageId) : stageId === STAGES[0];

    if (!unlocked) {
      UI.toast?.("Ez a pálya még locked");
      return;
    }

    UI.__stageLaunchBusy = true;

    try {
      UI.save.selectedStageId = stageId;
      CherriftStorage.save(UI.save);

      showLoading();
      hidePanelsForLaunch();

      setLoading(32, "Loading map...");
      await new Promise(resolve => setTimeout(resolve, 90));

      normalizeViewport(UI.game);

      setLoading(58, "Spawning Cherry...");
      await UI.game.start();

      // Game.start currently makes HUD/skill visible too early, so hide them again until first render pass.
      document.getElementById("hud")?.classList.add("hidden");
      document.getElementById("skill")?.classList.add("hidden");
      document.getElementById("stageHud")?.classList.add("hidden");

      setLoading(82, "Drawing stage...");
      queueNormalize(UI.game);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      setLoading(100, "Ready!");
      await new Promise(resolve => setTimeout(resolve, 160));

      hideLoading(UI.game);
      queueNormalize(UI.game);
    } catch (err) {
      console.error("Stage launch failed", err);
      document.body.classList.remove("is-loading-stage");
      document.getElementById("stageLoading")?.classList.add("hidden");
      UI.toast?.("Stage start hiba");
    } finally {
      UI.__stageLaunchBusy = false;
    }
  };

  const installFlow = () => {
    const rebind = (id, handler) => {
      const old = document.getElementById(id);
      if (!old) return null;
      const clone = old.cloneNode(true);
      old.replaceWith(clone);
      clone.addEventListener("click", handler, { capture:true });
      return clone;
    };

    rebind("playBtn", openWorldSelect);
    rebind("mobilePlayBtn", openWorldSelect);
    rebind("worldLaunchBtn", launchStageWithLoading);
    rebind("worldBackBtn", e => {
      e?.preventDefault?.();
      document.body.classList.remove("is-loading-stage");
      document.getElementById("stageLoading")?.classList.add("hidden");
      UI.open?.("menu");
    });

    const mobileMode = document.getElementById("mobileModeBtn");
    if (mobileMode) mobileMode.style.display = "none";

    document.querySelectorAll('[data-open="worlds"]').forEach(btn => {
      btn.addEventListener("click", openWorldSelect, { capture:true });
    });

    UI.launchSelectedWorld = launchStageWithLoading;
  };

  const oldBind = UI.bind.bind(UI);
  UI.bind = function stageLoadingBind(...args) {
    const result = oldBind.apply(this, args);
    installFlow();
    setTimeout(installFlow, 0);
    return result;
  };

  const oldUpdateHUD = UI.updateHUD?.bind(UI);
  if (oldUpdateHUD) {
    UI.updateHUD = function compactUpdateHUD(game) {
      oldUpdateHUD(game);
      updateCompactStageHud(game);
    };
  }

  const oldShowStageHUD = UI.showStageHUD?.bind(UI);
  if (oldShowStageHUD) {
    UI.showStageHUD = function compactShowStageHUD(game) {
      oldShowStageHUD(game);
      updateCompactStageHud(game);
    };
  }

  if (window.CherriftGame && !CherriftGame.prototype.__zoomNormalizePatch) {
    const originalStart = CherriftGame.prototype.start;
    CherriftGame.prototype.start = async function normalizedStart(...args) {
      const result = await originalStart.apply(this, args);
      normalizeViewport(this);
      return result;
    };
    CherriftGame.prototype.__zoomNormalizePatch = true;
  }

  ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange", "pageshow"].forEach(eventName => {
    window.addEventListener(eventName, () => queueNormalize(window.UI?.game), { passive:true });
    document.addEventListener(eventName, () => queueNormalize(window.UI?.game), { passive:true });
  });
})();