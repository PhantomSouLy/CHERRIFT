(() => {
"use strict";

const VERSION = "0.6.1-bloom-hotfix";
const MOBILE_BREAKPOINT = 860;
const NOTICE_KEY = "cherrift.v060.notices";
const id = name => document.getElementById(name);
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const isMobile = () => matchMedia(`(max-width:${MOBILE_BREAKPOINT}px)`).matches;

if (!window.UI || !window.CHERRIFT_DATA || !window.CHERRIFT_CONFIG) {
  console.error("[CHERRIFT v0.6.1] Core UI/data/config dependencies are missing.");
  return;
}

const SKIN_ASSETS = {
  cherry_default: {
    icon: "assets/player/skins/base_cherry/base_cherry_icon.png?v=060",
    splash: "assets/player/skins/base_cherry/base_cherry_splashart.png?v=060"
  },
  fairy_cherry: {
    icon: "assets/player/skins/fairy_cherry/fairy_cherry_icon.png?v=060",
    splash: "assets/player/skins/fairy_cherry/fairy_cherry_splashart.jpg?v=060"
  },
  beastclaw_cherry: {
    icon: "assets/player/skins/beastclaw_cherry/beastclaw_cherry_icon.png?v=060",
    splash: "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splashart.png?v=060"
  },
  ninja_cherry: {
    icon: "assets/player/skins/ninja_cherry/ninja_cherry_icon.png?v=060",
    splash: "assets/player/skins/ninja_cherry/ninja_cherry_splashart.png?v=060"
  },
  succubus_cherry: {
    icon: "assets/player/skins/succubus_cherry/succubus_cherry_icon.png?v=060",
    splash: "assets/player/skins/succubus_cherry/succubus_cherry_splashart.png?v=060"
  },
  warrior_cherry: {
    icon: "assets/player/skins/warrior_cherry/warrior_cherry_icon.png?v=060",
    splash: "assets/player/skins/warrior_cherry/warrior_cherry_splashart.png?v=060"
  },
  wuxia_sakura_cherry: {
    icon: "assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.png?v=060",
    splash: "assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_splashart.jpg?v=060"
  }
};

const runtime = {
  initialized: false,
  activePanel: "menu",
  inventoryCount: null,
  gachaTimer: 0,
  gachaFinish: null,
  previewRequest: 0,
  spriteCache: new Map(),
  notices: loadNotices()
};

function ensureCss() {
  id("v060css")?.remove();
  const link = document.createElement("link");
  link.id = "v060css";
  link.rel = "stylesheet";
  link.href = "v060.css?v=061";
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function currentSkin(save = UI.save) {
  return CHERRIFT_DATA.skins.find(skin => skin.id === save?.selectedSkin) ||
    CHERRIFT_DATA.skins[0];
}

function skinConfig(save = UI.save) {
  const selected = save?.selectedSkin || CHERRIFT_CONFIG.player.defaultSkin;
  return CHERRIFT_CONFIG.player.skins?.[selected] ||
    CHERRIFT_CONFIG.player.skins?.[CHERRIFT_CONFIG.player.defaultSkin];
}

function applyCanonicalSkinAssets() {
  for (const skin of CHERRIFT_DATA.skins) {
    const assets = SKIN_ASSETS[skin.id];
    if (!assets) continue;
    skin.icon = assets.icon;
    skin.splash = assets.splash;
  }
}

function imageMarkup(source, alt, className = "") {
  if (!source) return "";
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" draggable="false">`;
}

function updateImageMarkup(holder, source, alt, className = "") {
  if (!holder || !source) return false;
  const image = holder.firstElementChild;
  const unchanged =
    holder.childNodes.length === 1 &&
    image?.tagName === "IMG" &&
    image.getAttribute("class") === className &&
    image.getAttribute("src") === source &&
    image.getAttribute("alt") === String(alt ?? "") &&
    image.getAttribute("draggable") === "false";
  if (unchanged) return false;
  holder.innerHTML = imageMarkup(source, alt, className);
  return true;
}

function ensureGlobalRail() {
  if (id("globalRailV060")) return;
  const rail = document.createElement("aside");
  rail.id = "globalRailV060";
  rail.className = "global-rail-v060";
  rail.setAttribute("aria-label", "CHERRIFT navigation");
  rail.innerHTML = `
    <button type="button" class="rail-brand-v060" data-v060-open="menu">
      <strong>CHERRIFT</strong><small>GEAR &amp; LOADOUT</small>
    </button>
    <nav class="rail-nav-v060">
      <button type="button" data-v060-open="worlds" data-v060-panel="worlds"><i>▶</i><b>Play</b></button>
      <button type="button" data-v060-open="gear" data-v060-panel="gear"><i>⚔</i><b>Gear</b><em class="v060-dot" data-v060-badge="gear"></em></button>
      <button type="button" data-v060-open="playerUpgrade" data-v060-panel="playerUpgrade"><i>✦</i><b>Skills</b></button>
      <button type="button" data-v060-open="skins" data-v060-panel="skins"><span id="railSkinIconV060" class="rail-skin-v060"></span><b>Cherry</b><em class="v060-dot" data-v060-badge="skin"></em></button>
      <button type="button" data-v060-open="chests" data-v060-panel="chests"><i>◇</i><b>Gacha</b></button>
      <button type="button" data-v060-open="libraryV0551" data-v060-panel="libraryV0551"><i>▣</i><b>Library</b><em class="v060-dot" data-v060-badge="patch"></em></button>
    </nav>
    <div class="rail-bottom-v060">
      <button type="button" class="rail-settings-v060" data-v060-open="settings" data-v060-panel="settings"><i>⚙</i><b>Settings</b></button>
      <button type="button" class="rail-profile-v060" data-v060-open="libraryV0551">
        <span id="railProfileIconV060"></span>
        <span><b id="railProfileNameV060">Cherry Player</b><small id="railProfileLevelV060">Level 1</small></span>
      </button>
    </div>`;
  id("app")?.appendChild(rail);
}

function ensureMenuDashboard() {
  if (id("menuDashboardV060")) return;
  const menu = id("menu");
  if (!menu) return;
  const dashboard = document.createElement("section");
  dashboard.id = "menuDashboardV060";
  dashboard.className = "menu-dashboard-v060";
  dashboard.innerHTML = `
    <div class="dashboard-kicker-v060"><span>WORLD READY</span><b>v0.6.1 HOTFIX</b></div>
    <article class="dashboard-run-v060">
      <div class="dashboard-skin-v060"><span id="dashboardSkinIconV060"></span></div>
      <div class="dashboard-copy-v060">
        <small>ACTIVE CHERRY</small>
        <h2 id="dashboardSkinNameV060">Base Cherry</h2>
        <p id="dashboardStageV060">World 1-1 · Blooming Meadow</p>
      </div>
      <button type="button" id="dashboardPlayV060"><span>PLAY</span><small>Choose stage</small></button>
    </article>
    <nav class="dashboard-shortcuts-v060" aria-label="Quick actions">
      <button type="button" data-v060-open="dailyQuests"><i>✓</i><span><b>Daily</b><small>Quests &amp; rewards</small></span></button>
      <button type="button" data-v060-open="achievements"><i>♛</i><span><b>Achievements</b><small>Permanent goals</small></span></button>
      <button type="button" data-v060-open="settings"><i>⚙</i><span><b>Settings</b><small>Game &amp; account</small></span></button>
    </nav>`;
  menu.appendChild(dashboard);

  const patchCard = q(".patch-card", menu);
  if (patchCard) {
    patchCard.tabIndex = 0;
    patchCard.dataset.v060PatchCard = "true";
    patchCard.innerHTML = `
      <header><h3>Bloom Update</h3><span>v0.6.1 <i class="v060-dot" data-v060-badge="patch"></i></span></header>
      <p>Mobile Play, Library, camera, Gacha and responsive layout hotfix.</p>
      <div class="side-art">✦</div>`;
  }
}

function ensureSettingsLayout() {
  const settings = id("settings");
  if (!settings || id("settingsShellV060")) return;
  settings.innerHTML = `
    <header class="panel-head panel-head-v060">
      <button class="back" type="button" aria-label="Back">←</button>
      <div><small>CHERRIFT OPTIONS</small><h2>Settings</h2><p>Customize the game for desktop and mobile.</p></div>
    </header>
    <div id="settingsShellV060" class="settings-shell-v060">
      <nav class="settings-tabs-v060" aria-label="Settings categories">
        <button type="button" class="active" data-v060-settings="general"><i>✦</i><b>General</b></button>
        <button type="button" data-v060-settings="audio"><i>♪</i><b>Audio</b></button>
        <button type="button" data-v060-settings="display"><i>▣</i><b>Display</b></button>
        <button type="button" data-v060-settings="controls"><i>⌁</i><b>Controls</b></button>
        <button type="button" data-v060-settings="gameplay"><i>◇</i><b>Gameplay UI</b></button>
        <button type="button" data-v060-settings="accessibility"><i>◉</i><b>Accessibility</b></button>
        <button type="button" data-v060-settings="account"><i>♙</i><b>Account</b><em>Later</em></button>
      </nav>
      <main class="settings-content-v060">
        <section class="settings-page-v060 active" data-v060-settings-page="general">
          <header><small>GENERAL</small><h3>Game preferences</h3><p>Saved automatically on this device.</p></header>
          <label class="setting-line-v060"><span><b>Language</b><small>Interface language</small></span><select id="languageV060"><option value="hu">Magyar</option><option value="en">English</option></select></label>
          <label class="setting-line-v060"><span><b>Preload artwork</b><small>Load skin icons and splash art before the menu appears</small></span><input id="preloadArtworkV060" type="checkbox" checked></label>
          <div class="setting-info-v060"><i>✦</i><p>The new loader prevents the old menu from flashing before current data and critical images are ready.</p></div>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="audio">
          <header><small>AUDIO</small><h3>Sound</h3><p>Balance CHERRIFT audio output.</p></header>
          <label class="setting-line-v060"><span><b>Master volume</b><small>All game audio</small></span><input id="volume" type="range" min="0" max="100" value="60"></label>
          <label class="setting-line-v060 disabled"><span><b>Music volume</b><small>Available with the audio update</small></span><input type="range" min="0" max="100" value="70" disabled></label>
          <label class="setting-line-v060 disabled"><span><b>Effects volume</b><small>Available with the audio update</small></span><input type="range" min="0" max="100" value="85" disabled></label>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="display">
          <header><small>DISPLAY</small><h3>Performance &amp; screen</h3><p>Balanced defaults are recommended.</p></header>
          <label class="setting-line-v060"><span><b>FPS limit</b><small>Maximum rendered frames per second</small></span><select id="fpsLimit"><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
          <label class="setting-line-v060"><span><b>View zoom</b><small>A fair, closer combat view on every screen</small></span><select id="viewZoom"><option value="1.00">Balanced</option><option value="1.10">Closer</option><option value="1.20">Close-up</option></select></label>
          <button type="button" id="fullscreen" class="setting-action-v060">⛶ Toggle fullscreen</button>
          <button type="button" id="settingsFullscreen" hidden aria-hidden="true">Toggle fullscreen</button>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="controls">
          <header><small>CONTROLS</small><h3>Desktop &amp; mobile input</h3><p>Mobile controls remain optimized for full-screen touch.</p></header>
          <label class="setting-line-v060"><span><b>Full-screen touch movement</b><small>Move from the left play area on phones</small></span><input id="touchMode" type="checkbox" checked></label>
          <label class="setting-line-v060"><span><b>UI scale</b><small>HUD and skill-button size</small></span><input id="uiScale" type="range" min="85" max="125" step="5" value="100"></label>
          <div class="setting-info-v060"><i>⌁</i><p>The skill button stays separate in the lower-right corner on mobile.</p></div>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="gameplay">
          <header><small>GAMEPLAY UI</small><h3>Combat information</h3><p>Choose how much information appears during a run.</p></header>
          <label class="setting-line-v060"><span><b>Compact objective HUD</b><small>Use the smaller stage objective display</small></span><input id="compactHud" type="checkbox" checked></label>
          <label class="setting-line-v060"><span><b>Damage numbers</b><small>Show damage dealt above enemies</small></span><input id="damageNumbersToggle" type="checkbox" checked></label>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="accessibility">
          <header><small>ACCESSIBILITY</small><h3>Comfort options</h3><p>Visual settings also affect Gacha and menu effects.</p></header>
          <label class="setting-line-v060"><span><b>Reduce motion</b><small>Minimize decorative movement and reveal effects</small></span><input id="reducedMotionV060" type="checkbox"></label>
          <label class="setting-line-v060"><span><b>High contrast UI</b><small>Increase text and control contrast</small></span><input id="highContrastV060" type="checkbox"></label>
        </section>
        <section class="settings-page-v060" data-v060-settings-page="account">
          <header><small>ACCOUNT</small><h3>CHERRIFT Account</h3><p>This area is prepared for a future account system.</p></header>
          <div class="account-coming-v060"><i>♙</i><h4>Account sync is coming later</h4><p>Login, cloud saves, linked profiles and account security will appear here without another settings redesign.</p><button type="button" disabled>COMING SOON</button></div>
        </section>
      </main>
    </div>
    <aside class="settings-quick-v060">
      <div><small>QUICK ACTIONS</small><b>Your settings save automatically</b></div>
      <button id="settingsBackAction" type="button">Back</button>
      <button id="settingsResumeAction" type="button" class="primary">Resume run</button>
    </aside>`;
}

function ensureGachaLayout() {
  const panel = id("chests");
  if (!panel || id("gachaV060")) return;
  panel.innerHTML = `
    <header class="panel-head panel-head-v060">
      <button class="back" type="button" aria-label="Back">←</button>
      <div><small>KEY SUMMON</small><h2>Gacha</h2><p>Use a key to reveal gear and rare Cherry skins.</p></div>
      <div class="gacha-balance-v060"><span>KEYS</span><b id="gachaKeysV060">0</b></div>
    </header>
    <main id="gachaV060" class="gacha-v060">
      <section class="gacha-stage-v060">
        <div class="gacha-petal-field-v060" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="gacha-rings-v060" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="gacha-chest-v060" aria-label="Bloom Chest" data-sprite-slot="gacha-chest">
          <div class="gacha-chest-glow-v060"></div>
          <div class="gacha-chest-lid-v060"><i></i></div>
          <div class="gacha-chest-body-v060"><i></i><b>✦</b></div>
          <div class="gacha-chest-sprite-v060" aria-hidden="true"></div>
        </div>
        <div class="gacha-burst-v060" aria-hidden="true"></div>
        <p id="gachaStatusV060">A Bloom Chest is ready</p>
      </section>
      <section class="gacha-control-v060">
        <div><small>BLOOM CHEST</small><h3>Open the Chest</h3><p>Reveal gear and, on rare occasions, a new Cherry skin.</p></div>
        <button id="openChest" type="button"><span>OPEN · 1 KEY</span><small>Reveal one reward</small></button>
        <button id="gachaSkipV060" class="gacha-skip-v060" type="button">Skip animation</button>
      </section>
      <div id="chestResult" class="gacha-result-v060" aria-live="polite"></div>
    </main>`;
}

function ensureUpgradePreview() {
  const layout = q("#playerUpgrade .v052-upgrade-layout");
  if (!layout || id("upgradePreviewV060")) return;
  const preview = document.createElement("section");
  preview.id = "upgradePreviewV060";
  preview.className = "upgrade-preview-v060 glass";
  preview.innerHTML = `
    <header><small>ACTIVE CHERRY</small><h3 id="upgradeSkinNameV060">Cherry</h3><p>Your equipped skin and stable idle preview.</p></header>
    <div class="upgrade-character-v060"><div class="upgrade-aura-v060"></div><canvas id="upgradeCherryCanvasV060" class="v060-stable-sprite" width="320" height="360"></canvas><div class="upgrade-floor-v060"></div></div>
    <button type="button" data-v060-open="skins">Change skin</button>`;
  layout.insertBefore(preview, layout.firstChild);
  id("playerUpgrade")?.classList.add("player-upgrade-v060");
}

function ensureGearPreview() {
  const original = id("gearCherryCanvasV0560");
  if (!original || id("gearCherryStableV060")) return;
  const stable = document.createElement("canvas");
  stable.id = "gearCherryStableV060";
  stable.className = "v060-stable-sprite gear-stable-v060";
  stable.width = 320;
  stable.height = 320;
  stable.setAttribute("aria-label", "Selected Cherry stable idle animation");
  original.insertAdjacentElement("afterend", stable);
}

function ensureMobileNavigation() {
  const nav = id("globalMobileNavV052");
  if (!nav || nav.dataset.v060Ready) return;
  nav.dataset.v060Ready = "true";
  nav.classList.add("mobile-nav-v060");
  nav.innerHTML = `
    <button type="button" data-v060-open="gear" data-v060-panel="gear"><span>⚔</span><b>Gear</b><em class="v060-dot" data-v060-badge="gear"></em></button>
    <button type="button" data-v060-open="playerUpgrade" data-v060-panel="playerUpgrade"><span>✦</span><b>Skills</b></button>
    <button type="button" data-v060-open="menu" data-v060-panel="menu" class="home"><span>⌂</span><b>Home</b></button>
    <button type="button" data-v060-open="chests" data-v060-panel="chests"><span>◇</span><b>Gacha</b></button>
    <button type="button" data-v060-open="libraryV0551" data-v060-panel="libraryV0551"><span>▣</span><b>Library</b></button>
    <button type="button" data-v060-open="skins" data-v060-panel="skins"><span id="mobileSkinIconV060" class="mobile-skin-icon-v060"></span><b>Cherry</b><em class="v060-dot" data-v060-badge="skin"></em></button>`;

  q(".mobile-more-v060")?.remove();
}

function ensureMobilePanelTabs() {
  const upgradeLayout = q("#playerUpgrade .v052-upgrade-layout");
  if (upgradeLayout && !id("upgradeTabsV061")) {
    const preview = id("upgradePreviewV060");
    const level = q(".v052-level-card", upgradeLayout);
    const tree = q(".v052-tree", upgradeLayout);
    if (preview && level && tree) {
      preview.dataset.v061UpgradePane = "cherry";
      level.dataset.v061UpgradePane = "level";
      tree.dataset.v061UpgradePane = "tree";
      upgradeLayout.insertAdjacentHTML("beforebegin", `
        <nav id="upgradeTabsV061" class="mobile-panel-tabs-v061" aria-label="Player upgrade sections">
          <button type="button" data-v061-upgrade-tab="cherry">Cherry</button>
          <button type="button" data-v061-upgrade-tab="level">Level</button>
          <button type="button" data-v061-upgrade-tab="tree" class="active">Skill tree</button>
        </nav>`);
      selectUpgradeTab("tree");
    }
  }

  const gearMain = q("#gear .gear-main-v0560");
  if (gearMain && !id("gearTabsV061")) {
    const loadout = q(".gear-loadout-v0560", gearMain);
    const inventory = q(".gear-inventory-v0560", gearMain);
    const header = q(".gear-header-v0560", gearMain);
    if (loadout && inventory && header) {
      loadout.dataset.v061GearPane = "loadout";
      inventory.dataset.v061GearPane = "inventory";
      header.insertAdjacentHTML("afterend", `
        <nav id="gearTabsV061" class="mobile-panel-tabs-v061" aria-label="Gear sections">
          <button type="button" data-v061-gear-tab="loadout" class="active">Loadout</button>
          <button type="button" data-v061-gear-tab="inventory">Inventory</button>
        </nav>`);
      selectGearTab("loadout");
    }
  }
}

function selectUpgradeTab(tab) {
  qa("[data-v061-upgrade-tab]").forEach(button => button.classList.toggle("active", button.dataset.v061UpgradeTab === tab));
  qa("[data-v061-upgrade-pane]").forEach(pane => pane.classList.toggle("active-mobile-pane-v061", pane.dataset.v061UpgradePane === tab));
}

function selectGearTab(tab) {
  qa("[data-v061-gear-tab]").forEach(button => button.classList.toggle("active", button.dataset.v061GearTab === tab));
  qa("[data-v061-gear-pane]").forEach(pane => pane.classList.toggle("active-mobile-pane-v061", pane.dataset.v061GearPane === tab));
}

function loadNotices() {
  try {
    return { version: "", gear: false, skin: false, patch: false, ...JSON.parse(localStorage.getItem(NOTICE_KEY) || "{}") };
  } catch (_) {
    return { version: "", gear: false, skin: false, patch: false };
  }
}

function saveNotices() {
  try { localStorage.setItem(NOTICE_KEY, JSON.stringify(runtime.notices)); } catch (_) {}
}

function initializeNotices() {
  if (runtime.notices.version !== VERSION) {
    runtime.notices.version = VERSION;
    runtime.notices.patch = true;
    saveNotices();
  }
  updateBadges();
}

function setNotice(name, value) {
  if (!(name in runtime.notices) || runtime.notices[name] !== value) {
    runtime.notices[name] = value;
    saveNotices();
  }
  updateBadges();
}

function updateBadges() {
  for (const name of ["gear", "skin", "patch"]) {
    qa(`[data-v060-badge="${name}"]`).forEach(dot => {
      dot.classList.toggle("show", !!runtime.notices[name]);
      dot.setAttribute("aria-hidden", runtime.notices[name] ? "false" : "true");
    });
  }
}

function bindNavigation() {
  document.addEventListener("click", event => {
    const upgradeTab = event.target.closest("[data-v061-upgrade-tab]");
    if (upgradeTab) {
      event.preventDefault();
      selectUpgradeTab(upgradeTab.dataset.v061UpgradeTab);
      return;
    }

    const gearTab = event.target.closest("[data-v061-gear-tab]");
    if (gearTab) {
      event.preventDefault();
      selectGearTab(gearTab.dataset.v061GearTab);
      return;
    }

    const open = event.target.closest("[data-v060-open]");
    if (open) {
      event.preventDefault();
      const panel = open.dataset.v060Open;
      if (panel === "worlds" && UI.openWorldSelect) UI.openWorldSelect();
      else UI.open(panel);
      if (panel === "libraryV0551") {
        setTimeout(() => window.CHERRIFT_V0551?.renderLibrary?.("profile"), 0);
      }
      return;
    }

    const patch = event.target.closest("[data-v060-patch-card]");
    if (patch) {
      setNotice("patch", false);
      UI.toast?.("CHERRIFT v0.6.1 · Bloom Hotfix");
    }
  }, true);

  id("dashboardPlayV060")?.addEventListener("click", () => {
    if (UI.openWorldSelect) UI.openWorldSelect();
    else id("playBtn")?.click();
  });
}

function bindSettings() {
  qa("[data-v060-settings]").forEach(button => {
    button.addEventListener("click", () => selectSettingsTab(button.dataset.v060Settings));
  });

  const bindSaved = (elementId, key, read = element => element.checked) => {
    const element = id(elementId);
    if (!element) return;
    element.addEventListener("change", () => {
      UI.save.settings[key] = read(element);
      CherriftStorage.save(UI.save);
      applySettingsClasses();
    });
  };

  bindSaved("languageV060", "language", element => element.value);
  bindSaved("preloadArtworkV060", "preloadArtwork");
  bindSaved("reducedMotionV060", "reducedMotion");
  bindSaved("highContrastV060", "highContrast");

  const compact = id("compactHud");
  if (compact) compact.addEventListener("change", () => {
    UI.save.settings.compactHud = compact.checked;
    CherriftStorage.save(UI.save);
    document.body.classList.toggle("v060-compact-hud", compact.checked);
  });

  const scale = id("uiScale");
  if (scale) scale.addEventListener("input", () => {
    UI.save.settings.uiScale = Number(scale.value);
    document.documentElement.style.setProperty("--ui-scale", String(Number(scale.value) / 100));
    CherriftStorage.save(UI.save);
  });
}

function selectSettingsTab(tab = "general") {
  qa("[data-v060-settings]").forEach(button => button.classList.toggle("active", button.dataset.v060Settings === tab));
  qa("[data-v060-settings-page]").forEach(page => page.classList.toggle("active", page.dataset.v060SettingsPage === tab));
}

function syncSettings() {
  const settings = UI.save?.settings;
  if (!settings) return;
  settings.language ??= "hu";
  settings.preloadArtwork ??= true;
  settings.reducedMotion ??= matchMedia("(prefers-reduced-motion:reduce)").matches;
  settings.highContrast ??= false;
  if (![1, 1.1, 1.2].includes(Number(settings.viewZoom))) settings.viewZoom = 1;

  if (id("languageV060")) id("languageV060").value = settings.language;
  if (id("preloadArtworkV060")) id("preloadArtworkV060").checked = settings.preloadArtwork !== false;
  if (id("reducedMotionV060")) id("reducedMotionV060").checked = !!settings.reducedMotion;
  if (id("highContrastV060")) id("highContrastV060").checked = !!settings.highContrast;
  if (id("compactHud")) id("compactHud").checked = settings.compactHud !== false;
  if (id("uiScale")) id("uiScale").value = settings.uiScale || 100;
  if (id("viewZoom")) id("viewZoom").value = String(settings.viewZoom);
  syncSettingsActions();
  applySettingsClasses();
  CherriftStorage.save(UI.save);
}

function syncSettingsActions() {
  const resume = id("settingsResumeAction");
  const fromPause = document.body.classList.contains("settings-from-pause") && UI.game?.mode === "paused";
  resume?.classList.toggle("hidden", !fromPause);
  q(".settings-quick-v060")?.classList.toggle("from-pause-v061", fromPause);
}

function applySettingsClasses() {
  const settings = UI.save?.settings || {};
  document.body.classList.toggle("v060-reduced-motion", !!settings.reducedMotion);
  document.body.classList.toggle("v060-high-contrast", !!settings.highContrast);
  document.body.classList.toggle("v060-compact-hud", settings.compactHud !== false);
  document.documentElement.style.setProperty("--ui-scale", String(Number(settings.uiScale || 100) / 100));
}

function patchGacha() {
  const previousOpenChest = UI.openChest?.bind(UI);
  if (!previousOpenChest) return;

  UI.openChest = function openGachaV060(...args) {
    if (runtime.gachaFinish) return;
    if ((this.save?.keys || 0) <= 0) return previousOpenChest(...args);

    const stage = id("gachaV060");
    const button = id("openChest");
    const status = id("gachaStatusV060");
    const result = id("chestResult");
    const reduce = !!this.save?.settings?.reducedMotion;
    const duration = reduce ? 80 : 1450;

    stage?.classList.remove("is-revealed");
    stage?.classList.add("is-opening");
    if (button) button.disabled = true;
    if (status) status.textContent = "The Bloom Chest is opening…";
    if (result) result.innerHTML = '<span class="gacha-wait-v060">Opening the chest…</span>';

    const finish = () => {
      if (!runtime.gachaFinish) return;
      clearTimeout(runtime.gachaTimer);
      runtime.gachaFinish = null;
      const beforeIds = new Set((this.save.inventory || []).map(item => item?.id).filter(Boolean));
      const unlockedBefore = new Set(this.save.unlockedSkins || []);
      previousOpenChest(...args);
      const rewardGear = (this.save.inventory || []).find(item => item && !beforeIds.has(item.id)) || this.save.inventory?.at?.(-1);
      if (rewardGear) setNotice("gear", true);
      const newSkinId = (this.save.unlockedSkins || []).find(skinId => !unlockedBefore.has(skinId));
      const unlockedSkin = CHERRIFT_DATA.skins.find(skin => skin.id === newSkinId);
      if (unlockedSkin) {
        setNotice("skin", true);
      }
      if (result) result.innerHTML = renderGachaReward(rewardGear, unlockedSkin);
      stage?.classList.remove("is-opening");
      stage?.classList.add("is-revealed");
      if (button) button.disabled = false;
      if (status) status.textContent = "Chest opened — reward revealed";
      updateResourceDisplays();
      window.setTimeout(() => stage?.classList.remove("is-revealed"), reduce ? 120 : 1100);
    };

    runtime.gachaFinish = finish;
    runtime.gachaTimer = window.setTimeout(finish, duration);
  };

  id("gachaSkipV060")?.addEventListener("click", () => runtime.gachaFinish?.());
}

function prettyStatName(name) {
  return String(name || "Stat")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, letter => letter.toUpperCase());
}

function renderGachaReward(gear, unlockedSkin) {
  const rarity = String(gear?.rarity || "Common");
  const rarityClass = `rarity-${rarity.toLowerCase()}`;
  const name = gear ? (UI.gearName?.(gear) || `${rarity} ${gear.slot || "Gear"}`) : "Mystery reward";
  const icon = gear ? (UI.gearEmoji?.(gear) || "✦") : "✦";
  const stats = Object.entries(gear?.stats || {}).map(([key, value]) =>
    `<li><span>${escapeHtml(prettyStatName(key))}</span><b>+${escapeHtml(value)}</b></li>`
  ).join("");
  const skinCard = unlockedSkin ? `
    <aside class="gacha-unlock-v060">
      ${imageMarkup(unlockedSkin.icon, unlockedSkin.name)}
      <span><small>NEW CHERRY UNLOCKED</small><b>${escapeHtml(unlockedSkin.name)}</b></span>
    </aside>` : "";

  return `<div class="gacha-reward-wrap-v061">
    <article class="gacha-reward-card-v061 ${rarityClass}">
      <div class="gacha-reward-icon-v061"><span>${escapeHtml(icon)}</span><i>✦</i></div>
      <div class="gacha-reward-copy-v061">
        <small>${escapeHtml(rarity)} · ${escapeHtml(gear?.slot || "Reward")}</small>
        <h4>${escapeHtml(name)}</h4>
        <ul>${stats || "<li><span>Collection reward</span><b>New</b></li>"}</ul>
      </div>
    </article>
    ${skinCard}
  </div>`;
}

function stableSpriteEntry(source, frames) {
  if (!source) return null;
  const key = `${source}|${frames}`;
  if (runtime.spriteCache.has(key)) return runtime.spriteCache.get(key);

  const entry = { image: new Image(), frames, ready: false, metrics: [] };
  entry.image.decoding = "async";
  entry.image.onload = () => {
    entry.metrics = calculateFrameMetrics(entry.image, frames);
    entry.ready = true;
  };
  entry.image.onerror = () => { entry.ready = false; };
  entry.image.src = source;
  runtime.spriteCache.set(key, entry);
  return entry;
}

function calculateFrameMetrics(image, frames) {
  const frameWidth = Math.max(1, Math.floor(image.naturalWidth / frames));
  const frameHeight = Math.max(1, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const metrics = [];

  try {
    for (let frame = 0; frame < frames; frame++) {
      context.clearRect(0, 0, frameWidth, frameHeight);
      context.drawImage(image, frame * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
      const pixels = context.getImageData(0, 0, frameWidth, frameHeight).data;
      let minX = frameWidth, minY = frameHeight, maxX = -1, maxY = -1;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          if (pixels[(y * frameWidth + x) * 4 + 3] < 10) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      metrics.push(maxX >= minX ? {
        x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1
      } : { x: 0, y: 0, width: frameWidth, height: frameHeight });
    }
  } catch (_) {
    for (let frame = 0; frame < frames; frame++) metrics.push({ x: 0, y: 0, width: frameWidth, height: frameHeight });
  }
  return metrics;
}

function drawStablePreview(canvas, timestamp) {
  if (!canvas || canvas.offsetParent === null) return;
  const config = skinConfig();
  const idle = config?.states?.idle;
  const source = idle?.dirs?.down;
  const frames = Math.max(1, Number(idle?.frames) || 4);
  const fps = Math.max(1, Number(idle?.fps) || 3);
  const entry = stableSpriteEntry(source, frames);
  if (!entry?.ready || !entry.metrics.length) return;

  const cssWidth = Math.max(1, canvas.clientWidth || 320);
  const cssHeight = Math.max(1, canvas.clientHeight || 320);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(cssWidth * dpr);
  const pixelHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const frame = Math.floor(timestamp / 1000 * fps) % frames;
  const box = entry.metrics[frame] || entry.metrics[0];
  const sourceFrameWidth = entry.image.naturalWidth / frames;
  const availableWidth = cssWidth * .86;
  const availableHeight = cssHeight * .91;
  const scale = Math.min(availableWidth / box.width, availableHeight / box.height);
  const targetWidth = box.width * scale;
  const targetHeight = box.height * scale;
  const targetX = (cssWidth - targetWidth) / 2;
  const groundY = cssHeight * .94;
  const targetY = groundY - targetHeight;

  context.drawImage(
    entry.image,
    frame * sourceFrameWidth + box.x,
    box.y,
    box.width,
    box.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight
  );
}

function startStablePreviews() {
  if (runtime.previewRequest) return;
  const loop = timestamp => {
    runtime.previewRequest = requestAnimationFrame(loop);
    qa("canvas.v060-stable-sprite").forEach(canvas => drawStablePreview(canvas, timestamp));
  };
  runtime.previewRequest = requestAnimationFrame(loop);
}

function updateResourceDisplays() {
  const save = UI.save;
  if (!save) return;
  if (id("gachaKeysV060")) id("gachaKeysV060").textContent = save.keys || 0;
  if (id("mobileKeysValue")) id("mobileKeysValue").textContent = save.keys || 0;
  if (id("menuKeys")) id("menuKeys").textContent = save.keys || 0;

  const skin = currentSkin(save);
  const iconTargets = ["railSkinIconV060", "railProfileIconV060", "dashboardSkinIconV060", "mobileSkinIconV060"];
  for (const targetId of iconTargets) {
    const target = id(targetId);
    if (target) target.innerHTML = imageMarkup(skin?.icon, skin?.name || "Cherry");
  }
  if (id("dashboardSkinNameV060")) id("dashboardSkinNameV060").textContent = skin?.name || "Cherry";
  if (id("upgradeSkinNameV060")) id("upgradeSkinNameV060").textContent = skin?.name || "Cherry";
  if (id("railProfileNameV060")) id("railProfileNameV060").textContent = save.profile?.name || "Cherry Player";
  if (id("railProfileLevelV060")) id("railProfileLevelV060").textContent = `Level ${save.account?.level || 1}`;
  const selectedStage = window.CHERRIFT_V040?.stages?.find(stage => stage.id === save.selectedStageId) || window.CHERRIFT_V040?.stages?.[0];
  if (id("dashboardStageV060") && selectedStage) id("dashboardStageV060").textContent = `${selectedStage.name} · ${selectedStage.title}`;

  const inventoryCount = save.inventory?.length || 0;
  if (runtime.inventoryCount === null) runtime.inventoryCount = inventoryCount;
  else if (inventoryCount > runtime.inventoryCount) setNotice("gear", true);
  runtime.inventoryCount = inventoryCount;
}

function decorateSkinCarousel() {
  const skin = CHERRIFT_DATA.skins[UI.skinIndex || 0] || currentSkin();
  if (!skin) return;
  const splash = id("skinSplash");
  if (splash && skin.splash) {
    splash.style.backgroundImage = `linear-gradient(180deg,rgba(8,4,14,.01),rgba(8,4,14,.28)),url("${skin.splash}")`;
    splash.style.backgroundSize = "cover";
    splash.style.backgroundPosition = "center top";
    splash.classList.add("v060-real-splash");
  }
  const mini = id("skinMini");
  if (mini) mini.innerHTML = imageMarkup(skin.icon, skin.name);
}

function decorateProfiles() {
  const skin = currentSkin();
  const holders = [
    q("#libraryBodyV0551 .v0551-profile-card > span"),
    q("#profileBodyV055 .v055-profile-hero > span"),
    id("mobileGearHeroV053")
  ].filter(Boolean);
  for (const holder of holders) {
    holder.classList.add("profile-skin-icon-v060");
    updateImageMarkup(holder, skin?.icon, skin?.name || "Cherry");
  }

  const cards = qa("#libraryBodyV0551 .v0551-collect");
  if (cards.length === CHERRIFT_DATA.skins.length) {
    cards.forEach((card, index) => {
      const skinData = CHERRIFT_DATA.skins[index];
      const holder = q("span", card);
      if (!holder || !skinData?.icon || card.classList.contains("unknown")) return;
      holder.classList.add("skin-collection-icon-v060");
      updateImageMarkup(holder, skinData.icon, skinData.name);
    });
  }
}

function updateActiveNavigation(panel) {
  runtime.activePanel = panel;
  document.body.dataset.v060Panel = panel;
  qa("[data-v060-panel]").forEach(button => button.classList.toggle("active", button.dataset.v060Panel === panel));
  if (panel === "gear") setNotice("gear", false);
  if (panel === "skins") setNotice("skin", false);
  if (panel === "settings") {
    syncSettings();
    syncSettingsActions();
  }
  if (panel === "skins") decorateSkinCarousel();
  if (["libraryV0551", "profileV055", "collectionV055"].includes(panel)) setTimeout(decorateProfiles, 0);
  updateResourceDisplays();
}

function patchUiLifecycle() {
  const previousOpen = UI.open?.bind(UI);
  if (previousOpen) {
    UI.open = function openV060(panel, ...args) {
      const result = previousOpen(panel, ...args);
      updateActiveNavigation(panel);
      return result;
    };
  }

  const previousShowGame = UI.showGame?.bind(UI);
  if (previousShowGame) {
    UI.showGame = function showGameV061(...args) {
      const result = previousShowGame(...args);
      document.body.classList.add("is-playing");
      document.body.classList.remove("is-loading-stage");
      ["menu", "skins", "gear", "chests", "settings", "worlds", "playerUpgrade", "libraryV0551"].forEach(name => id(name)?.classList.add("hidden"));
      ["hud", "skill", "stageHud"].forEach(name => id(name)?.classList.remove("hidden"));
      id("globalMobileNavV052")?.classList.add("force-hidden-v053", "v0551-nav-hidden");
      return result;
    };
  }

  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV060(...args) {
      const result = previousRefresh(...args);
      updateResourceDisplays();
      decorateProfiles();
      return result;
    };
  }

  const previousCarousel = UI.renderSkinCarousel?.bind(UI);
  if (previousCarousel) {
    UI.renderSkinCarousel = function renderSkinCarouselV060(...args) {
      const result = previousCarousel(...args);
      decorateSkinCarousel();
      return result;
    };
  }
}

function observeDynamicPanels() {
  const root = id("app") || document.body;
  const options = { childList: true, subtree: true };
  const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.type === "childList")) return;
    observer.disconnect();
    try {
      if (!id("upgradePreviewV060")) ensureUpgradePreview();
      if (!id("gearCherryStableV060")) ensureGearPreview();
      ensureMobilePanelTabs();
      decorateProfiles();
    } finally {
      observer.observe(root, options);
    }
  });
  observer.observe(root, options);
}

function preloadImage(source) {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ source, ok });
    };
    const timeout = window.setTimeout(() => finish(false), 8000);
    image.decoding = "async";
    image.onload = async () => {
      try { await image.decode?.(); } catch (_) {}
      finish(true);
    };
    image.onerror = () => finish(false);
    image.src = source;
  });
}

async function preload(save, report = () => {}) {
  applyCanonicalSkinAssets();
  const selected = currentSkin(save);
  const selectedConfig = skinConfig(save);
  const sources = new Set(["assets/ui/mainmenu.png?v=060"]);

  if (save?.settings?.preloadArtwork !== false) {
    for (const skin of CHERRIFT_DATA.skins) {
      if (skin.icon) sources.add(skin.icon);
      if (skin.splash) sources.add(skin.splash);
    }
  } else {
    if (selected?.icon) sources.add(selected.icon);
    if (selected?.splash) sources.add(selected.splash);
  }
  if (selectedConfig?.states?.idle?.dirs?.down) sources.add(selectedConfig.states.idle.dirs.down);

  const list = [...sources];
  const failures = [];
  let done = 0;
  report(0, list.length, "Preparing artwork…");
  await Promise.all(list.map(async source => {
    const result = await preloadImage(source);
    if (!result.ok) failures.push(source);
    done++;
    report(done, list.length, `Loading artwork ${done}/${list.length}`);
  }));
  return { total: list.length, failures };
}

function backgroundPreloadIdleSheets() {
  const schedule = window.requestIdleCallback || (callback => setTimeout(callback, 450));
  schedule(() => {
    for (const config of Object.values(CHERRIFT_CONFIG.player.skins || {})) {
      const idle = config?.states?.idle;
      if (idle?.dirs?.down) stableSpriteEntry(idle.dirs.down, Math.max(1, Number(idle.frames) || 4));
    }
  });
}

function initAfterUI() {
  if (runtime.initialized) return;
  runtime.initialized = true;
  ensureMobileNavigation();
  ensureMobilePanelTabs();
  bindNavigation();
  bindSettings();
  patchGacha();
  patchUiLifecycle();
  observeDynamicPanels();
  initializeNotices();
  syncSettings();
  updateResourceDisplays();
  decorateSkinCarousel();
  decorateProfiles();
  startStablePreviews();
  backgroundPreloadIdleSheets();
  updateActiveNavigation("menu");
  window.addEventListener("resize", () => {
    ensureMobileNavigation();
    ensureMobilePanelTabs();
    updateResourceDisplays();
  });
  console.info("[CHERRIFT] v0.6.1 Bloom hotfix initialized.");
}

function finishBoot() {
  const boot = id("bootV060");
  const fill = id("bootFillV060");
  const percent = id("bootPercentV060");
  const text = id("bootTextV060");
  if (fill) fill.style.width = "100%";
  if (percent) percent.textContent = "100%";
  if (text) text.textContent = "Welcome back, Cherry";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove("v060-booting");
    boot?.classList.add("done");
    window.setTimeout(() => boot?.remove(), 500);
  }));
}

function diagnostics() {
  const requiredIds = [
    "globalRailV060", "menuDashboardV060", "settingsShellV060", "gachaV060",
    "openChest", "chestResult", "gearCherryStableV060", "upgradeCherryCanvasV060"
  ];
  return {
    version: VERSION,
    missingElements: requiredIds.filter(name => !id(name)),
    missingSkinAssets: CHERRIFT_DATA.skins.filter(skin => !skin.icon || !skin.splash).map(skin => skin.id),
    activePanel: runtime.activePanel,
    mobile: isMobile()
  };
}

ensureCss();
applyCanonicalSkinAssets();
ensureGlobalRail();
ensureMenuDashboard();
ensureSettingsLayout();
ensureGachaLayout();
ensureUpgradePreview();
ensureGearPreview();
ensureMobilePanelTabs();

window.CHERRIFT_V060 = {
  version: VERSION,
  skinAssets: SKIN_ASSETS,
  preload,
  initAfterUI,
  finishBoot,
  diagnostics,
  setNotice
};

console.info("[CHERRIFT] v0.6.1 Bloom hotfix layer loaded.");
})();
