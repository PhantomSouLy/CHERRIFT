(() => {
  if (!window.UI || !window.CherriftGame) return;

  const forceShowLevelModal = () => {
    const modal = document.getElementById("levelModal");
    if (!modal) return;

    document.body.classList.remove("is-loading-stage");
    document.body.classList.add("is-playing", "is-levelup");
    document.getElementById("stageLoading")?.classList.add("hidden");
    document.getElementById("skill")?.classList.add("hidden");
    modal.classList.remove("hidden");
    modal.style.display = "grid";
    modal.style.pointerEvents = "auto";

    const card = modal.querySelector(".modal-card");
    if (card) card.style.pointerEvents = "auto";

    modal.querySelectorAll(".upgrade-card").forEach(btn => {
      btn.type = "button";
      btn.style.pointerEvents = "auto";
    });
  };

  const clearLevelModal = () => {
    const modal = document.getElementById("levelModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "";
      modal.style.pointerEvents = "";
    }

    document.body.classList.remove("is-levelup");

    if (UI.game?.mode === "playing") {
      document.body.classList.add("is-playing");
      document.getElementById("hud")?.classList.remove("hidden");
      document.getElementById("stageHud")?.classList.remove("hidden");
      document.getElementById("skill")?.classList.remove("hidden");
    }
  };

  const oldShowLevelUp = UI.showLevelUp?.bind(UI);
  UI.showLevelUp = function safeShowLevelUp(game) {
    if (typeof oldShowLevelUp === "function") oldShowLevelUp(game);
    forceShowLevelModal();
  };

  const oldHideLevelUp = UI.hideLevelUp?.bind(UI);
  UI.hideLevelUp = function safeHideLevelUp() {
    if (typeof oldHideLevelUp === "function") oldHideLevelUp();
    clearLevelModal();
  };

  const proto = CherriftGame.prototype;

  proto.__showQueuedLevelUp = function showQueuedLevelUp() {
    const p = this.player;
    if (!p || (p.pendingLevelUps || 0) <= 0) return;

    this.mode = "level";
    document.body.classList.add("is-levelup");
    UI.showLevelUp(this);
  };

  proto.gainXp = function queuedGainXp(value) {
    const p = this.player;
    if (!p) return;

    p.xp += value;
    let gained = 0;
    let safety = 0;

    while (p.xp >= p.xpNext && safety++ < 25) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(p.xpNext * 1.22 + 9);
      gained++;
    }

    if (gained > 0) {
      p.pendingLevelUps = (p.pendingLevelUps || 0) + gained;

      // Only open the modal once. Extra levels become queued choices.
      if (this.mode === "playing") this.__showQueuedLevelUp();
    }
  };

  proto.applyUpgrade = function safeApplyUpgrade(upgrade) {
    const p = this.player;
    if (!p) return;

    try {
      upgrade?.apply?.(p);
    } catch (err) {
      console.error("Upgrade apply failed", err);
      UI.toast?.("Upgrade hiba");
    }

    p.pendingLevelUps = Math.max(0, (p.pendingLevelUps || 1) - 1);
    UI.hideLevelUp();

    if (p.pendingLevelUps > 0) {
      // Next queued level-up choice. Use a tiny delay so mobile click/touch state can clear.
      setTimeout(() => this.__showQueuedLevelUp(), 80);
    } else {
      this.mode = "playing";
      document.body.classList.remove("is-levelup");
      document.body.classList.add("is-playing");
      document.getElementById("hud")?.classList.remove("hidden");
      document.getElementById("stageHud")?.classList.remove("hidden");
      document.getElementById("skill")?.classList.remove("hidden");
      try { UI.updateHUD?.(this); } catch (_) {}
    }
  };

  // If a save/test run is already stuck in level mode, recover the modal after this patch loads.
  setTimeout(() => {
    if (UI.game?.mode === "level") forceShowLevelModal();
  }, 250);
})();