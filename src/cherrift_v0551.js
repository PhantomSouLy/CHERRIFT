(() => {
"use strict";

const VERSION = "0.5.5.1-mobile-library-gear-pause-hotfix";
const id = n => document.getElementById(n);
const q = (s, r=document) => r.querySelector(s);
const qa = (s, r=document) => Array.from(r.querySelectorAll(s));
const mobile = () => matchMedia("(max-width:820px)").matches;

if (!window.UI || !window.CHERRIFT_V055C || !window.CHERRIFT_V053) {
  console.error("[CHERRIFT v0.5.5.1] v0.5.5c and v0.5.3 required.");
  return;
}

function ensureCss() {
  if (id("v0551css")) return;
  const link = document.createElement("link");
  link.id = "v0551css";
  link.rel = "stylesheet";
  link.href = "v0551.css?v=0551";
  document.head.appendChild(link);
}

function hideMobileNavDuringGameStates() {
  const nav = id("globalMobileNavV052");
  if (!nav) return;

  const modalOpen = [
    "pauseModal", "levelModal", "stageClearModal", "stageLoading", "gameOver"
  ].some(name => {
    const el = id(name);
    return el && !el.classList.contains("hidden");
  });

  const hide =
    document.body.classList.contains("is-playing") ||
    document.body.classList.contains("is-levelup") ||
    document.body.classList.contains("is-loading-stage") ||
    modalOpen;

  nav.classList.toggle("v0551-nav-hidden", hide);
}

/* ---------- Single mobile Library ---------- */

const LIBRARY_TABS = [
  ["profile", "👤", "Profile"],
  ["stats", "📊", "Stats"],
  ["gear", "🛡️", "Gear"],
  ["enemies", "👹", "Enemies"],
  ["skins", "🐇", "Skins"],
  ["worlds", "🌍", "Worlds"]
];

function ensureLibrary() {
  if (id("libraryV0551")) return;

  const panel = document.createElement("section");
  panel.id = "libraryV0551";
  panel.className = "panel hidden v055-panel v0551-library";
  panel.innerHTML = `
    <header class="panel-head">
      <button class="back" type="button">←</button>
      <div><h2>Library</h2><p>Profile, collection, enemies and statistics.</p></div>
    </header>
    <nav class="v0551-library-tabs">
      ${LIBRARY_TABS.map(([key,icon,label]) =>
        `<button type="button" data-library-tab="${key}"><span>${icon}</span><b>${label}</b></button>`
      ).join("")}
    </nav>
    <div id="libraryBodyV0551" class="v0551-library-body"></div>`;
  id("app").appendChild(panel);

  q(".back", panel).onclick = () => UI.open("menu");
}

function totalPower(save) {
  return Math.round(100 + Object.values(save.equipped || {})
    .reduce((sum, item) => sum + (window.CHERRIFT_V050?.itemPower?.(item) || 0), 0));
}

function renderLibrary(tab="profile") {
  ensureLibrary();
  const body = id("libraryBodyV0551");
  const save = UI.save;
  if (!body || !save) return;

  qa("[data-library-tab]").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.libraryTab === tab)
  );

  if (tab === "profile") {
    const skin = CHERRIFT_DATA.skins.find(x => x.id === save.selectedSkin);
    const cleared = Object.keys(save.clearedStages || {}).length;
    const achievements = Object.keys(save.achievements || {}).length;
    body.innerHTML = `
      <section class="glass v0551-profile-card">
        <span>${skin?.emoji || "🐰"}</span>
        <div>
          <h2>${save.profile?.name || "Cherry Player"}</h2>
          <p>Player Level ${save.account?.level || 1}</p>
          <b>Power ${totalPower(save)}</b>
        </div>
      </section>
      <div class="v0551-stat-grid">
        <article><small>STAGES</small><b>${cleared}/${CHERRIFT_V040.stages.length}</b></article>
        <article><small>ACHIEVEMENTS</small><b>${achievements}</b></article>
        <article><small>TOTAL XP</small><b>${Math.floor(save.account?.totalXp || 0)}</b></article>
        <article><small>GEAR OWNED</small><b>${(save.inventory?.length || 0) + Object.keys(save.equipped || {}).length}</b></article>
      </div>`;
  }

  if (tab === "stats") {
    const stats = save.stats || {};
    const values = {
      "Enemies defeated": stats.kills || 0,
      "Runs started": stats.runs || 0,
      "Stage clears": stats.clears || 0,
      "Boss kills": stats.bosses || 0,
      "Coins earned": stats.coinsEarned || 0,
      "Chests opened": stats.chests || 0,
      "Gear found": stats.gearFound || 0,
      "Best time": UI.fmt?.(save.best?.time || 0) || "0:00"
    };
    body.innerHTML = `<div class="v0551-stat-grid">${
      Object.entries(values).map(([name,value]) =>
        `<article><small>${name}</small><b>${value}</b></article>`
      ).join("")
    }</div>`;
  }

  if (tab === "gear") {
    const owned = [...(save.inventory || []), ...Object.values(save.equipped || {}).filter(Boolean)];
    body.innerHTML = `<div class="v0551-collection-grid">${
      owned.length ? owned.map(item => `
        <article class="glass v0551-collect rarity-${String(item.rarity).toLowerCase()}">
          <span>${UI.gearEmoji(item)}</span>
          <b>${item.rarity} ${item.slot}</b>
          <small>Lv.${item.itemLevel || 1}</small>
        </article>`).join("") : "<p>No gear collected.</p>"
    }</div>`;
  }

  if (tab === "enemies") {
    const enemies = window.CHERRIFT_V040?.enemies || {};
    body.innerHTML = `<div class="v0551-collection-grid">${
      Object.entries(enemies).map(([key, enemy]) => {
        const seen = !!save.discoveredEnemies?.[key];
        return `<article class="glass v0551-collect ${seen ? "" : "unknown"}">
          <span>${seen ? (enemy.boss ? "👑" : "👾") : "?"}</span>
          <b>${seen ? enemy.name : "Unknown Enemy"}</b>
          <small>${seen ? `HP ${enemy.hp} · Speed ${enemy.speed}` : "Defeat to discover"}</small>
        </article>`;
      }).join("")
    }</div>`;
  }

  if (tab === "skins") {
    body.innerHTML = `<div class="v0551-collection-grid">${
      CHERRIFT_DATA.skins.map(skin => {
        const unlocked = save.unlockedSkins.includes(skin.id);
        return `<article class="glass v0551-collect ${unlocked ? "" : "unknown"}">
          <span>${unlocked ? skin.emoji : "?"}</span>
          <b>${unlocked ? skin.name : "Unknown Skin"}</b>
          <small>${unlocked ? skin.rarity : "Locked"}</small>
        </article>`;
      }).join("")
    }</div>`;
  }

  if (tab === "worlds") {
    const worlds = [...new Set(CHERRIFT_V040.stages.map(stage => stage.world))];
    body.innerHTML = `<div class="v0551-collection-grid">${
      worlds.map(world => {
        const worldStages = CHERRIFT_V040.stages.filter(stage => stage.world === world);
        const done = worldStages.filter(stage => save.clearedStages?.[stage.id]).length;
        const stars = worldStages.reduce((sum, stage) => sum + (save.stageStars?.[stage.id] || 0), 0);
        return `<article class="glass v0551-collect">
          <span>🌍</span><b>World ${world}</b>
          <small>${done}/${worldStages.length} stages · ${stars}/${worldStages.length*3} ⭐</small>
        </article>`;
      }).join("")
    }</div>`;
  }
}

function patchMobileLibraryNavigation() {
  const more = id("mobileMoreV055");
  if (more) {
    more.innerHTML = `
      <h3>LIBRARY & MORE</h3>
      <button data-v0551-library="profile">👤<b>Library</b></button>
      <button data-v055-open="dailyQuests">📅<b>Daily</b></button>
      <button data-v055-open="shopV055">🛒<b>Shop</b></button>
      <button data-v055-open="loginRewards">🎁<b>Login</b></button>`;
  }

  const bottomNav = id("globalMobileNavV052");
  if (bottomNav) {
    const goals = q('[data-v052-open="achievements"]', bottomNav);
    if (goals) {
      goals.dataset.v0551Library = "profile";
      delete goals.dataset.v052Open;
      goals.innerHTML = "<span>📚</span><b>Library</b>";
    }
  }
}

/* ---------- Mobile Gear interaction hotfix ---------- */

function patchGearInteractions() {
  if (!mobile()) return;

  const gearPanel = id("gear");
  if (!gearPanel) return;

  gearPanel.classList.add("v0551-mobile-gear");

  qa("#gear .gear-slot, #gear .inv-item, #gear [data-mobile-slot], #gear [data-mobile-item]")
    .forEach(el => {
      el.draggable = false;
      el.ondragstart = event => event.preventDefault();
      el.style.touchAction = "manipulation";
    });
}

document.addEventListener("pointerdown", event => {
  if (!mobile()) return;
  const clickable = event.target.closest(
    "#mobileGearV053 button, #mobileGearV053 [data-mobile-item], #mobileGearV053 [data-mobile-slot]"
  );
  if (!clickable) return;
  event.stopPropagation();
}, true);

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-library-tab]");
  if (tab) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderLibrary(tab.dataset.libraryTab);
    return;
  }

  const libraryOpen = event.target.closest("[data-v0551-library]");
  if (libraryOpen) {
    event.preventDefault();
    event.stopImmediatePropagation();
    UI.open("libraryV0551");
    renderLibrary(libraryOpen.dataset.v0551Library || "profile");
  }
}, true);

/* ---------- UI.open compatibility ---------- */

ensureCss();
ensureLibrary();
patchMobileLibraryNavigation();

const previousOpen = UI.open.bind(UI);
UI.open = function openV0551(panel, ...args) {
  if (panel === "libraryV0551") {
    [
      "menu","skins","gear","chests","settings","worlds","playerUpgrade","achievements",
      "dailyQuests","loginRewards","shopV055","profileV055","statisticsV055",
      "collectionV055","bestiaryV055","libraryV0551"
    ].forEach(name => id(name)?.classList.toggle("hidden", name !== panel));

    document.body.classList.remove("is-playing", "is-levelup", "is-loading-stage");
    renderLibrary("profile");
  } else {
    previousOpen(panel, ...args);
    id("libraryV0551")?.classList.add("hidden");
  }

  if (panel === "gear") setTimeout(patchGearInteractions, 0);
  setTimeout(hideMobileNavDuringGameStates, 0);
};

/* Hide old separate mobile panels from mobile navigation only. */
if (mobile()) {
  ["profileV055","statisticsV055","collectionV055","bestiaryV055"].forEach(name => {
    const panel = id(name);
    if (panel) panel.dataset.mobileLegacy = "true";
  });
}

/* Strong pause/game-state watcher */
const observer = new MutationObserver(hideMobileNavDuringGameStates);
observer.observe(document.body, {
  attributes:true,
  attributeFilter:["class"],
  subtree:true,
  childList:false
});

["pauseModal","levelModal","stageClearModal","stageLoading","gameOver"].forEach(name => {
  const el = id(name);
  if (el) observer.observe(el, {attributes:true, attributeFilter:["class"]});
});

const oldPause = UI.pause?.bind(UI);
if (oldPause) {
  UI.pause = function pauseV0551(...args) {
    const result = oldPause(...args);
    hideMobileNavDuringGameStates();
    return result;
  };
}

const oldResume = UI.resume?.bind(UI);
if (oldResume) {
  UI.resume = function resumeV0551(...args) {
    const result = oldResume(...args);
    hideMobileNavDuringGameStates();
    return result;
  };
}

const oldShowGame = UI.showGame?.bind(UI);
if (oldShowGame) {
  UI.showGame = function showGameV0551(...args) {
    const result = oldShowGame(...args);
    hideMobileNavDuringGameStates();
    return result;
  };
}

const oldRenderGear = UI.renderGear?.bind(UI);
if (oldRenderGear) {
  UI.renderGear = function renderGearV0551(...args) {
    const result = oldRenderGear(...args);
    setTimeout(patchGearInteractions, 0);
    return result;
  };
}

window.addEventListener("resize", () => {
  patchMobileLibraryNavigation();
  patchGearInteractions();
  hideMobileNavDuringGameStates();
});

hideMobileNavDuringGameStates();

window.CHERRIFT_V0551 = {
  version: VERSION,
  renderLibrary,
  hideMobileNavDuringGameStates
};

console.info("[CHERRIFT] v0.5.5.1 mobile hotfix loaded.");
})();