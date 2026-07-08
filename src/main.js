const UI = {
  el: {},
  init() {
    const ids = ["loadingScreen","mainMenu","hud","touchControls","levelUpModal","upgradeChoices","gameOverModal","runStats","pauseModal","settingsModal","hpFill","xpFill","hpText","xpText","timerText","killsText","skillButton","skillCooldownText","bestTimeText","bestKillsText"];
    ids.forEach(id => this.el[id] = document.getElementById(id));
    document.getElementById("playButton").addEventListener("click", () => window.GaCherry.newRun());
    document.getElementById("pauseButton").addEventListener("click", () => window.GaCherry.pause());
    document.getElementById("resumeButton").addEventListener("click", () => window.GaCherry.resume());
    document.getElementById("retryButton").addEventListener("click", () => window.GaCherry.newRun());
    document.getElementById("backMenuButton").addEventListener("click", () => window.GaCherry.backToMenu());
    document.getElementById("pauseMenuButton").addEventListener("click", () => window.GaCherry.backToMenu());
    document.getElementById("settingsButton").addEventListener("click", () => this.showSettings());
    document.getElementById("closeSettingsButton").addEventListener("click", () => this.hideSettings());
    document.getElementById("fullscreenToggle").addEventListener("change", (e) => {
      if (e.target.checked && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
      if (!e.target.checked && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    });
  },
  showMenu(profile) {
    this.el.loadingScreen.classList.add("hidden");
    this.el.mainMenu.classList.remove("hidden");
    this.el.hud.classList.add("hidden");
    this.el.touchControls.classList.add("hidden");
    this.el.gameOverModal.classList.add("hidden");
    this.el.pauseModal.classList.add("hidden");
    this.updateProfile(profile);
  },
  showGame() {
    this.el.mainMenu.classList.add("hidden");
    this.el.gameOverModal.classList.add("hidden");
    this.el.pauseModal.classList.add("hidden");
    this.el.hud.classList.remove("hidden");
    this.el.touchControls.classList.remove("hidden");
  },
  updateProfile(profile) {
    this.el.bestTimeText.textContent = formatTime(profile.bestRunTime || 0);
    this.el.bestKillsText.textContent = profile.bestKills || 0;
  },
  updateHUD(game) {
    const p = game.player;
    this.el.hpFill.style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    this.el.xpFill.style.width = `${Math.max(0, p.xp / p.xpNext * 100)}%`;
    this.el.hpText.textContent = `HP ${Math.ceil(Math.max(0,p.hp))}/${p.maxHp}`;
    this.el.xpText.textContent = `LV ${p.level}  XP ${Math.floor(p.xp)}/${p.xpNext}`;
    this.el.timerText.textContent = formatTime(game.time);
    this.el.killsText.textContent = `${game.kills} kills`;
    const cd = p.skillTimer;
    this.el.skillButton.classList.toggle("cooldown", cd > 0);
    this.el.skillCooldownText.textContent = cd > 0 ? Math.ceil(cd) : "✦";
  },
  showLevelUp(choices) {
    this.el.upgradeChoices.innerHTML = "";
    for (const up of choices) {
      const btn = document.createElement("button");
      btn.className = "upgrade-card";
      btn.innerHTML = `<strong>${up.title}</strong><span>${up.desc}</span>`;
      btn.addEventListener("click", () => window.GaCherry.chooseUpgrade(up));
      this.el.upgradeChoices.appendChild(btn);
    }
    this.el.levelUpModal.classList.remove("hidden");
  },
  hideLevelUp() { this.el.levelUpModal.classList.add("hidden"); },
  showGameOver(stats, profile) {
    this.el.hud.classList.add("hidden");
    this.el.touchControls.classList.add("hidden");
    this.el.runStats.innerHTML = `
      <p>Idő: <b>${formatTime(stats.time)}</b></p>
      <p>Killek: <b>${stats.kills}</b></p>
      <p>Elért szint: <b>${stats.level}</b></p>
      <p>Összes XP: <b>${Math.floor(stats.xp)}</b></p>
      <hr style="border-color: rgba(255,255,255,.14)">
      <p>Best time: <b>${formatTime(profile.bestRunTime || 0)}</b></p>
      <p>Best kills: <b>${profile.bestKills || 0}</b></p>`;
    this.el.gameOverModal.classList.remove("hidden");
  },
  showPause() { this.el.pauseModal.classList.remove("hidden"); },
  hidePause() { this.el.pauseModal.classList.add("hidden"); },
  showSettings() { this.el.settingsModal.classList.remove("hidden"); },
  hideSettings() { this.el.settingsModal.classList.add("hidden"); }
};
window.UI = UI;

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

window.addEventListener("DOMContentLoaded", async () => {
  UI.init();
  const profile = ProfileService.load();
  const input = new InputManager();
  const canvas = document.getElementById("gameCanvas");
  window.GaCherry = new GaCherryGame(canvas, input, profile);
  await window.GaCherry.init();
  UI.showMenu(profile);
});
