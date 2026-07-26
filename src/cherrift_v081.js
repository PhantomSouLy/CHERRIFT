(() => {
"use strict";

const VERSION = "0.8.1-arsenal-layout-hotfix";
const DISPLAY_VERSION = "v0.8.1";
const PANEL_ID = "arsenalV070";
const OPEN_CLASS = "arsenal-open-v081";
const id = name => document.getElementById(name);

if (!window.UI || !window.CHERRIFT_V070) {
  console.error("[CHERRIFT v0.8.1] Arsenal v0.7.0 is required.");
  return;
}

function ensureCss() {
  if (id("v081css")) return;
  const link = document.createElement("link");
  link.id = "v081css";
  link.rel = "stylesheet";
  link.href = "v081.css?v=081";
  document.head.appendChild(link);
}

function arsenalPanel() {
  return id(PANEL_ID);
}

function movePanelToBody() {
  const panel = arsenalPanel();
  if (!panel) return null;
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "CHERRIFT Arsenal");
  return panel;
}

function isOpen() {
  const panel = arsenalPanel();
  return !!panel && !panel.classList.contains("hidden");
}

function openShell() {
  const panel = movePanelToBody();
  if (!panel) return;
  document.body.classList.add(OPEN_CLASS);
  panel.classList.add("arsenal-fixed-v081");
  panel.scrollTop = 0;
}

function closeShell() {
  document.body.classList.remove(OPEN_CLASS);
}

function syncShell() {
  movePanelToBody();
  if (isOpen()) openShell();
  else closeShell();
}

function patchNavigation() {
  if (UI.__v081ArsenalLayout) return;
  const previousOpen = UI.open.bind(UI);
  UI.open = function openV081(panel, ...args) {
    const result = previousOpen(panel, ...args);
    if (panel === PANEL_ID) {
      requestAnimationFrame(() => {
        openShell();
        window.CHERRIFT_V070?.render?.();
      });
    } else {
      closeShell();
    }
    return result;
  };
  UI.__v081ArsenalLayout = true;
}


function patchLifecycle() {
  if (UI.__v081Lifecycle) return;
  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV081(save, game) {
      const result = previousInit(save, game);
      syncShell();
      patchVersion();
      return result;
    };
  }
  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV081(...args) {
      const result = previousRefresh(...args);
      patchVersion();
      return result;
    };
  }
  const previousShowGame = UI.showGame?.bind(UI);
  if (previousShowGame) {
    UI.showGame = function showGameV081(...args) {
      closeShell();
      arsenalPanel()?.classList.add("hidden");
      return previousShowGame(...args);
    };
  }
  UI.__v081Lifecycle = true;
}

function patchVersion() {
  document.title = window.CHERRIFT_BUILD?.title || "CHERRIFT v0.9.0 – TEST BUILD";
  const label = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
  const boot = document.querySelector(".boot-sub-v060");
  if (boot) boot.textContent = label;
  const menu = id("menuBuildVersion");
  if (menu) menu.textContent = label;
  document.querySelectorAll(".version-badge-v063,[data-v063-version]").forEach(label => {
    label.textContent = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
  });
}

function bindSafetyEvents() {
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !isOpen()) return;
    event.preventDefault();
    UI.open("gear");
  });

  const root = id("app") || document.body;
  const observer = new MutationObserver(() => syncShell());
  observer.observe(root, { childList:true, subtree:false });

  window.addEventListener("resize", () => {
    if (isOpen()) openShell();
  });
  window.addEventListener("cherrift:languagechange", () => {
    requestAnimationFrame(syncShell);
  });
}

ensureCss();
movePanelToBody();
patchNavigation();
patchLifecycle();
patchVersion();
bindSafetyEvents();
syncShell();

window.CHERRIFT_V081 = {
  version: VERSION,
  displayVersion: DISPLAY_VERSION,
  sync: syncShell,
  open: openShell,
  close: closeShell
};

console.info("[CHERRIFT] v0.8.1 Arsenal layout hotfix loaded.");
})();
