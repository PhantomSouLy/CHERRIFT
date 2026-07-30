(() => {
"use strict";

const VERSION = "0.6.2-quality-localization";
const id = name => document.getElementById(name);
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const t = source => window.CHERRIFT_I18N?.translate?.(source) || source;

if (!window.UI || !window.CherriftGame || !window.CHERRIFT_V060) {
  console.error("[CHERRIFT v0.6.2] v0.6.1 UI and core game systems are required.");
  return;
}

CHERRIFT_CONFIG.version = VERSION;
CHERRIFT_DATA.version = VERSION;

function ensureCss() {
  if (id("v062css")) return;
  const link = document.createElement("link");
  link.id = "v062css";
  link.rel = "stylesheet";
  link.href = "v062.css?v=062";
  document.head.appendChild(link);
}

function clearCombatChrome() {
  for (const name of ["raidWarningV040", "bossHudV040"]) {
    const element = id(name);
    if (!element) continue;
    element.classList.remove("show");
    element.setAttribute("aria-hidden", "true");
  }
}

function patchPanelLifecycle() {
  const previousOpen = UI.open?.bind(UI);
  if (previousOpen) {
    UI.open = function openV062(panel, ...args) {
      const result = previousOpen(panel, ...args);
      if (panel !== "game") clearCombatChrome();
      document.body.classList.toggle("v062-menu-state", !document.body.classList.contains("is-playing"));
      return result;
    };
  }

  const previousQuit = UI.quit?.bind(UI);
  if (previousQuit) {
    UI.quit = function quitV062(...args) {
      const result = previousQuit(...args);
      clearCombatChrome();
      return result;
    };
  }

  const previousGameOver = UI.showGameOver?.bind(UI);
  if (previousGameOver) {
    UI.showGameOver = function showGameOverV062(...args) {
      clearCombatChrome();
      return previousGameOver(...args);
    };
  }
}

function requestedZoom() {
  const setting = Number(UI.save?.settings?.viewZoom);
  return [1, 1.1, 1.2].includes(setting) ? setting : 1;
}

function fairCameraZoom() {
  const width = window.visualViewport?.width || window.innerWidth || 1280;
  const height = window.visualViewport?.height || window.innerHeight || 720;
  const phone = Math.min(width, height) <= 860;
  const portrait = height >= width;
  const base = phone ? (portrait ? 1.42 : 1.36) : 1.34;
  return Math.min(1.72, base * requestedZoom());
}

function patchCameraZoom() {
  const prototype = CherriftGame.prototype;
  const previousDrawWorld = prototype.drawWorld;
  if (typeof previousDrawWorld !== "function" || previousDrawWorld.__v062Zoom) return;

  function drawWorldV062(context) {
    const performanceConfig = CHERRIFT_CONFIG.performance ||= {};
    const previousConfigZoom = performanceConfig.cameraZoom;
    const zoom = fairCameraZoom();
    this.zoom = zoom;
    performanceConfig.cameraZoom = zoom;
    try {
      return previousDrawWorld.call(this, context);
    } finally {
      performanceConfig.cameraZoom = previousConfigZoom;
    }
  }
  drawWorldV062.__v062Zoom = true;
  prototype.drawWorld = drawWorldV062;
}

function patchStartLock() {
  const prototype = CherriftGame.prototype;
  const previousStart = prototype.start;
  if (typeof previousStart !== "function" || previousStart.__v062StartLock) return;

  function startV062(...args) {
    if (this.mode === "playing" && document.body.classList.contains("is-playing")) {
      return Promise.resolve(this);
    }
    if (this.__v062StartPromise) return this.__v062StartPromise;
    const launch = Promise.resolve().then(() => previousStart.apply(this, args));
    this.__v062StartPromise = launch;
    const release = () => {
      window.setTimeout(() => {
        if (this.__v062StartPromise === launch) this.__v062StartPromise = null;
      }, 650);
    };
    launch.then(release, release);
    return launch;
  }
  startV062.__v062StartLock = true;
  prototype.start = startV062;
}

function ensureLibraryServices() {
  const library = id("libraryV0551");
  const tabs = q(".v0551-library-tabs", library);
  if (!library || !tabs || id("libraryServicesV062")) return;
  const services = document.createElement("nav");
  services.id = "libraryServicesV062";
  services.className = "library-services-v062";
  services.setAttribute("aria-label", "Rewards and services");
  services.innerHTML = `
    <button type="button" data-v062-open="dailyQuests"><span>✓</span><b>Daily Quests</b></button>
    <button type="button" data-v062-open="achievements"><span>♛</span><b>Achievements</b></button>
    <button type="button" data-v062-open="loginRewards"><span>🎁</span><b>Login Rewards</b></button>
    <button type="button" data-v062-open="shopV055"><span>🛒</span><b>Shop</b></button>`;
  tabs.insertAdjacentElement("afterend", services);
}

function activateExistingFeatures() {
  const routes = new Map([
    ["SHOP", "shopV055"],
    ["MISSIONS", "dailyQuests"],
    ["ACHIEVEMENTS", "achievements"]
  ]);
  for (const button of qa(".menu-left .main-nav .menu-btn.locked")) {
    const label = q("i", button)?.textContent?.trim().toUpperCase();
    const route = routes.get(label);
    if (!route) continue;
    button.disabled = false;
    button.classList.remove("locked");
    button.dataset.v062Open = route;
    const status = q("em", button);
    if (status) status.textContent = "LIVE";
    const lock = q(":scope > b", button);
    if (lock) lock.textContent = "›";
  }

  const mission = q("#menu .mission-card");
  if (mission) {
    mission.tabIndex = 0;
    mission.setAttribute("role", "button");
    mission.dataset.v062Open = "dailyQuests";
    const status = q("header span", mission);
    if (status) status.textContent = "LIVE";
  }

  const dashboard = q("#menuDashboardV060 .dashboard-shortcuts-v060");
  if (dashboard && !q('[data-v062-open="shopV055"]', dashboard)) {
    dashboard.insertAdjacentHTML("beforeend", `
      <button type="button" data-v062-open="shopV055"><i>🛒</i><span><b>Shop</b><small>Daily offers</small></span></button>
      <button type="button" data-v062-open="loginRewards"><i>🎁</i><span><b>Login Rewards</b><small>Seven-day track</small></span></button>`);
  }
}

function disableDecorativeControls() {
  const discordLogin = q(".discord-login");
  if (discordLogin) {
    discordLogin.disabled = true;
    discordLogin.setAttribute("aria-label", "Discord login is coming later");
  }

  for (const button of qa("#menu .top-icons button:not([data-open]), #menu .social-row button:not([data-open]), .locked-feature-v051")) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }

  for (const button of qa(".mobile-resource-v051:not(.keys)")) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }
}

function updateVersionLabels() {
  const title = id("menuBuildVersion");
  if (title) title.textContent = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
  const kicker = q("#menuDashboardV060 .dashboard-kicker-v060 b");
  if (kicker) kicker.textContent = window.CHERRIFT_BUILD?.displayVersion || "v0.9.0";
  const patchCard = q("#menu .patch-card");
  if (patchCard) {
    const version = q("header span", patchCard);
    const description = q("p", patchCard);
    if (version) version.innerHTML = `${window.CHERRIFT_BUILD?.displayVersion || "v0.9.0"} <i class="v060-dot" data-v060-badge="patch"></i>`;
    if (description) description.textContent = "HU/EN localization, stable navigation, fair camera, save and input fixes.";
  }
  const bootSubtitle = q(".boot-sub-v060");
  if (bootSubtitle) bootSubtitle.textContent = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
}

function improveAccessibility() {
  const labels = {
    pause: "Pause",
    skill: "Use active skill",
    skinPrev: "Previous skin",
    skinNext: "Next skin",
    worldPrevBtn: "Previous stage",
    worldNextBtn: "Next stage",
    openChest: "Open the Bloom Chest",
    gachaSkipV060: "Skip animation",
    fullscreen: "Toggle fullscreen",
    pauseFullscreen: "Toggle fullscreen"
  };
  for (const [elementId, label] of Object.entries(labels)) {
    const element = id(elementId);
    if (element && !element.getAttribute("aria-label")) element.setAttribute("aria-label", label);
  }
  qa(".back").forEach(button => button.setAttribute("aria-label", "Back"));
  qa(".modal").forEach(modal => {
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
  });
  qa("button").forEach(button => {
    if (!button.hasAttribute("type")) button.type = "button";
  });
}

function updateZoomCopy() {
  const select = id("viewZoom");
  if (!select) return;
  const labels = {
    "1.00": "Balanced · 1.34×",
    "1.10": "Closer · 1.47×",
    "1.20": "Close-up · 1.61×"
  };
  for (const option of select.options) {
    if (labels[option.value]) option.textContent = labels[option.value];
  }
}

function runAfterUiSetup() {
  clearCombatChrome();
  ensureLibraryServices();
  activateExistingFeatures();
  disableDecorativeControls();
  updateVersionLabels();
  improveAccessibility();
  updateZoomCopy();
  window.CHERRIFT_I18N?.translateSubtree?.(document.documentElement);
}

document.addEventListener("click", event => {
  const opener = event.target.closest?.("[data-v062-open]");
  if (!opener || opener.matches(":disabled,[aria-disabled='true']")) return;
  event.preventDefault();
  UI.open(opener.dataset.v062Open);
}, true);

document.addEventListener("keydown", event => {
  if (!event.target?.matches?.("[data-v062-open][role='button']") || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  UI.open(event.target.dataset.v062Open);
});

const previousInit = UI.init?.bind(UI);
if (previousInit) {
  UI.init = function initV062(...args) {
    const result = previousInit(...args);
    runAfterUiSetup();
    return result;
  };
}

const previousAfterUi = CHERRIFT_V060.initAfterUI?.bind(CHERRIFT_V060);
if (previousAfterUi) {
  CHERRIFT_V060.initAfterUI = function initAfterUiV062(...args) {
    const result = previousAfterUi(...args);
    runAfterUiSetup();
    return result;
  };
}

window.addEventListener("resize", () => {
  if (!document.body.classList.contains("is-playing")) clearCombatChrome();
  updateZoomCopy();
});
window.addEventListener("cherrift:languagechange", () => window.setTimeout(runAfterUiSetup, 0));

function diagnostics() {
  const duplicateIds = Object.entries(qa("[id]").reduce((counts, element) => {
    counts[element.id] = (counts[element.id] || 0) + 1;
    return counts;
  }, {})).filter(([, count]) => count > 1).map(([name]) => name);
  return {
    version: VERSION,
    language: window.CHERRIFT_I18N?.language || null,
    gameMode: UI.game?.mode || null,
    cameraZoom: fairCameraZoom(),
    duplicateIds,
    combatOverlayVisibleOutsideRun: !document.body.classList.contains("is-playing") &&
      [id("raidWarningV040"), id("bossHudV040")].some(element => element?.classList.contains("show")),
    libraryServices: !!id("libraryServicesV062")
  };
}

ensureCss();
patchPanelLifecycle();
patchCameraZoom();
patchStartLock();
runAfterUiSetup();

window.CHERRIFT_V062 = {
  version: VERSION,
  clearCombatChrome,
  fairCameraZoom,
  runAfterUiSetup,
  diagnostics
};

console.info("[CHERRIFT] v0.6.2 quality and localization update loaded.");
})();
