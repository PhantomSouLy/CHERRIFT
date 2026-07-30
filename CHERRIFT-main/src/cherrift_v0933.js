(() => {
"use strict";

const VERSION = "0.9.3.3-desktop-layout-polish";
const CACHE_VERSION = "0933";
const DESKTOP_QUERY = "(min-width:821px)";
const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

if (!window.UI || !window.CherriftGame || !window.CherriftStorage) {
  console.error("[CHERRIFT v0.9.3.3] Required systems are missing.");
  return;
}

const runtime = {
  observer:null,
  refreshQueued:false,
  route:"menu",
  worldMode:"worlds",
  world:1,
  stageId:null,
  imageCache:new Map(),
  subnavSignature:""
};

function language() {
  return window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu";
}
function copy(hu, en) { return language() === "en" ? en : hu; }
function isDesktop() { return matchMedia(DESKTOP_QUERY).matches; }
function localized(key, fallback) {
  const value = window.CHERRIFT_LOCALIZATION?.t?.(key);
  return value && value !== key ? value : fallback;
}
function ensureCss() {
  if (id("v0933css")) return;
  const link = document.createElement("link");
  link.id = "v0933css";
  link.rel = "stylesheet";
  link.href = `v0933.css?v=${CACHE_VERSION}`;
  document.head.appendChild(link);
}
function cachedImage(source) {
  if (!source) return null;
  if (runtime.imageCache.has(source)) return runtime.imageCache.get(source);
  const image = new Image();
  image.decoding = "async";
  image.src = source;
  runtime.imageCache.set(source, image);
  return image;
}

/* Succubus basic attack: keep the corrected direction, reduce to a true 64px effect. */
function patchSuccubusClaw() {
  const proto = CherriftGame.prototype;
  if (proto.__v0933SuccubusClaw) return;
  proto.__v0933SuccubusClaw = true;
  const previousDrawBullet = proto.drawBullet;
  const source = `assets/effects/succubus_cherry/succubus_crimson_claw_wave.png?v=${CACHE_VERSION}`;
  cachedImage(source);

  proto.drawBullet = function drawBulletV0933(context, bullet) {
    if (bullet?.style !== "succubus_claw") return previousDrawBullet.call(this, context, bullet);
    const image = cachedImage(source);
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) {
      return previousDrawBullet.call(this, context, bullet);
    }

    const naturalAngle = -Math.PI / 4;
    const targetAngle = Number.isFinite(bullet.angle)
      ? bullet.angle
      : Math.atan2(Number(bullet.vy) || 0, Number(bullet.vx) || 1);
    const width = 64;
    const height = width * image.naturalHeight / image.naturalWidth;
    const lifeProgress = clamp((Number(bullet.life) || 0) / .62, 0, 1);
    const fade = Math.min(
      clamp((1 - lifeProgress) / .08, 0, 1),
      clamp(lifeProgress / .26, 0, 1)
    );

    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = .18 + fade * .82;
    context.translate(bullet.x, bullet.y);
    context.rotate(targetAngle - naturalAngle + Math.PI);
    context.imageSmoothingEnabled = false;
    context.shadowColor = "rgba(255,35,82,.62)";
    context.shadowBlur = 5;
    context.drawImage(image, -width * .08, -height * .82, width, height);
    context.restore();
  };
}

function panelVisible(panelId) {
  const panel = id(panelId);
  return !!panel && !panel.classList.contains("hidden") && getComputedStyle(panel).display !== "none";
}
function detectRoute() {
  if (panelVisible("menu")) return "menu";
  const active = q("#globalRailV060 [data-v082-route].active");
  if (active?.dataset.v082Route) return active.dataset.v082Route;
  const candidates = [
    "worlds", "skins", "gear", "arsenalV070", "playerUpgrade", "chests",
    "libraryV0551", "achievements", "profileV082", "weeklyV082", "statSummaryV082",
    "settings", "eventV093"
  ];
  return candidates.find(panelVisible) || runtime.route || "menu";
}

function routeGroup(route) {
  if (["menu", "worlds", "dailyQuests", "weeklyV082", "loginRewards", "eventV093"].includes(route)) return "play";
  if (["skins"].includes(route)) return "cherry";
  if (["gear", "arsenalV070", "bagV082"].includes(route)) return "gear";
  if (["playerUpgrade", "statSummaryV082"].includes(route)) return "progress";
  if (["gachaV082", "chests", "shopV082", "buffsV082"].includes(route)) return "economy";
  if (["collectionV082", "libraryV0551", "achievements"].includes(route)) return "collection";
  return "play";
}
function subnavItems(group) {
  const maps = {
    play:[
      ["menu", copy("Lobby", "Lobby")],
      ["worlds", copy("Chapterek", "Chapters")],
      ["dailyQuests", copy("Napi", "Daily")],
      ["weeklyV082", copy("Heti", "Weekly")],
      ["loginRewards", copy("Belépési jutalom", "Login Reward")]
    ],
    cherry:[
      ["skins", copy("Cherry részletek", "Cherry Details")],
      ["collectionV082", copy("Gyűjtemény", "Collection")]
    ],
    gear:[
      ["gear", copy("Felszerelés", "Loadout")],
      ["arsenalV070", "Arsenal"],
      ["bagV082", "BAG"]
    ],
    progress:[
      ["playerUpgrade", copy("Képességfa", "Skill Tree")],
      ["statSummaryV082", copy("Statok", "Stats")]
    ],
    economy:[
      ["gachaV082", "Gacha"],
      ["bagV082", "BAG"],
      ["shopV082", copy("Bolt", "Shop")],
      ["buffsV082", copy("Buffok", "Buffs")]
    ],
    collection:[
      ["collectionV082", copy("Gyűjtemény", "Collection")],
      ["achievements", copy("Eredmények", "Achievements")]
    ]
  };
  return maps[group] || maps.play;
}
function ensureSubnav() {
  let nav = id("desktopSubnavV0933");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "desktopSubnavV0933";
    nav.className = "desktop-subnav-v0933";
    nav.setAttribute("aria-label", "Secondary navigation");
    document.body.appendChild(nav);
  }
  return nav;
}
function renderDesktopChrome() {
  const rail = id("globalRailV060");
  if (!isDesktop()) {
    document.body.classList.remove("v0933-desktop");
    rail?.classList.remove("topnav-v0933");
    id("desktopSubnavV0933")?.classList.add("hidden");
    return;
  }

  document.body.classList.add("v0933-desktop");
  rail?.classList.add("topnav-v0933");
  const route = detectRoute();
  runtime.route = route;
  const upgradeLabel = q('[data-v082-route="playerUpgrade"] b', rail);
  if (upgradeLabel) upgradeLabel.textContent = copy("Fejlesztés", "Upgrade");
  const group = routeGroup(route);
  const nav = ensureSubnav();
  nav.classList.remove("hidden");
  const signature = `${language()}|${route}|${group}`;
  if (runtime.subnavSignature !== signature) {
    runtime.subnavSignature = signature;
    nav.innerHTML = `<div>${subnavItems(group).map(([target, label]) => {
      const active = target === route || (target === "gachaV082" && route === "chests") || (target === "collectionV082" && route === "libraryV0551");
      return `<button type="button" data-v0933-open="${escapeHtml(target)}" class="${active ? "active" : ""}">${escapeHtml(label)}</button>`;
    }).join("")}</div>`;
  }
}

function stages() { return window.CHERRIFT_V040?.stages || []; }
function worldStages(world) { return stages().filter(stage => Number(stage.world) === Number(world)); }
function worldUnlocked(world) {
  if (Number(world) === 1) return true;
  const previous = worldStages(Number(world) - 1);
  return previous.length > 0 && previous.every(stage => UI.save?.clearedStages?.[stage.id] || UI.save?.stageStats?.[stage.id]?.clears);
}
function stageUnlocked(stage) {
  if (!stage) return false;
  return UI.save?.unlockedStages?.includes(stage.id) || (worldUnlocked(stage.world) && Number(stage.index) === 1);
}
function starsFor(stage) {
  return clamp(Math.floor(Number(UI.save?.stageStars?.[stage.id] || UI.save?.stageStats?.[stage.id]?.stars || 0)), 0, 3);
}
function rewardText(reward) {
  const parts = [];
  if (reward?.coins) parts.push(`${reward.coins} Coin`);
  if (reward?.keys) parts.push(`${reward.keys} Key`);
  if (reward?.gems) parts.push(`${reward.gems} Gem`);
  return parts.join(" · ") || "—";
}
function worldName(world) {
  return localized(`worlds.w${world}.name`, `${copy("Világ", "World")} ${world}`);
}
function worldArt(world) {
  if (Number(world) === 1) return 'linear-gradient(180deg,rgba(5,3,12,.04),rgba(5,3,12,.70)),url("assets/map/world1/world1.png")';
  if (Number(world) === 2) return 'linear-gradient(180deg,rgba(5,3,12,.06),rgba(5,3,12,.76)),url("assets/map/world2.png")';
  return 'radial-gradient(circle at 55% 20%,rgba(255,145,66,.28),transparent 34%),linear-gradient(180deg,rgba(20,8,7,.12),rgba(8,3,7,.82)),url("assets/map/world1/world1.png")';
}
function selectedStage() {
  const list = worldStages(runtime.world);
  return list.find(stage => stage.id === runtime.stageId)
    || list.find(stage => stage.id === UI.save?.selectedStageId)
    || list.find(stageUnlocked)
    || list[0]
    || null;
}
function worldProgress(world) {
  const list = worldStages(world);
  const earned = list.reduce((sum, stage) => sum + starsFor(stage), 0);
  return {earned, max:list.length * 3};
}
function stageCard(stage, index) {
  const unlocked = stageUnlocked(stage);
  const active = stage.id === selectedStage()?.id;
  const stars = starsFor(stage);
  return `<button type="button" class="chapter-card-v0933 ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-v0933-stage="${escapeHtml(stage.id)}" style='--chapter-pos:${36 + index * 8}%;background-image:${escapeHtml(worldArt(stage.world))}'>
    <span class="chapter-lock-v0933">${unlocked ? "" : "🔒"}</span>
    <small>${stage.boss ? "BOSS" : `${copy("PÁLYA", "STAGE")} ${stage.index}`}</small>
    <strong>${escapeHtml(stage.name || `${stage.world}-${stage.index}`)}</strong>
    <b>${escapeHtml(stage.title || "")}</b>
    <em>${"★".repeat(stars)}${"☆".repeat(3 - stars)}</em>
  </button>`;
}
function renderWorldCards() {
  return [1, 2, 3].map(world => {
    const unlocked = worldUnlocked(world);
    const progress = worldProgress(world);
    return `<button type="button" class="world-card-v0933 ${unlocked ? "" : "locked"}" data-v0933-world="${world}" style='background-image:${escapeHtml(worldArt(world))}'>
      <span>${unlocked ? `WORLD ${world}` : "🔒"}</span>
      <div><small>${unlocked ? copy("VILÁG", "WORLD") : copy("ZÁROLVA", "LOCKED")}</small><h3>${escapeHtml(worldName(world))}</h3><p>${progress.earned} / ${progress.max} ★</p></div>
    </button>`;
  }).join("");
}
function chapterDetail(stage) {
  if (!stage) return "";
  const stars = starsFor(stage);
  const firstClaimed = !!UI.save?.firstClearClaimed?.[stage.id];
  return `<section class="chapter-detail-v0933">
    <div class="chapter-detail-title-v0933"><small>${copy("KIVÁLASZTOTT PÁLYA", "SELECTED STAGE")}</small><h3>${escapeHtml(stage.name)} · ${escapeHtml(stage.title || "")}</h3></div>
    <div class="chapter-stars-v0933" aria-label="${stars}/3 stars"><span>${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span><b>${stars} / 3</b></div>
    <div class="chapter-reward-v0933"><small>${copy("JUTALOM", "REWARD")}</small><b>${escapeHtml(rewardText(stage.repeatReward))}</b></div>
    <div class="chapter-reward-v0933 first"><small>${copy("ELSŐ TELJESÍTÉS", "FIRST REWARD")}</small><b>${escapeHtml(rewardText(stage.firstClearReward))}${firstClaimed ? ` · ✓ ${copy("Begyűjtve", "Claimed")}` : ""}</b></div>
  </section>`;
}
function worldPanelSignature() {
  const save = UI.save || {};
  return JSON.stringify({
    mode:runtime.worldMode,
    world:runtime.world,
    stage:runtime.stageId,
    language:language(),
    selected:save.selectedStageId,
    unlocked:save.unlockedStages,
    cleared:save.clearedStages,
    stars:save.stageStars,
    stats:save.stageStats,
    first:save.firstClearClaimed
  });
}
function renderDesktopWorldSelect(force = false) {
  if (!isDesktop()) return;
  const panel = id("worlds");
  if (!panel || panel.classList.contains("hidden") || !UI.save) return;
  const stage = selectedStage();
  runtime.stageId = stage?.id || null;
  const signature = worldPanelSignature();
  if (!force && panel.dataset.v0933Signature === signature && q(".chapter-select-v0933", panel)) return;
  panel.dataset.v0933Signature = signature;
  panel.dataset.i18nIgnore = "true";
  const chapterCards = worldStages(runtime.world).map(stageCard).join("");
  const playable = runtime.worldMode === "chapters" && stage && stageUnlocked(stage);

  panel.innerHTML = `<section class="chapter-select-v0933 ${runtime.worldMode === "chapters" ? "show-chapters" : "show-worlds"}">
    <header><small>CHERRIFT</small><h2>${runtime.worldMode === "worlds" ? copy("Világválasztás", "World Selection") : `${copy("Világ", "World")} ${runtime.world}`}</h2><p>${runtime.worldMode === "worlds" ? copy("Válassz világot.", "Choose a world.") : copy("Válassz pályát, majd indítsd el.", "Choose a stage, then start.")}</p></header>
    ${runtime.worldMode === "worlds"
      ? `<div class="world-card-grid-v0933">${renderWorldCards()}</div>`
      : `<div class="chapter-world-banner-v0933" style='background-image:${escapeHtml(worldArt(runtime.world))}'><button type="button" data-v0933-worlds-back>‹ ${copy("Világok", "Worlds")}</button><div><small>WORLD ${runtime.world}</small><h3>${escapeHtml(worldName(runtime.world))}</h3></div></div><div class="chapter-card-grid-v0933">${chapterCards || `<p>${copy("Ebben a világban még nincs pálya.", "No stages are available in this world yet.")}</p>`}</div>${chapterDetail(stage)}`}
    <footer>
      <button type="button" class="secondary" data-v0933-back>${copy("Vissza", "Back")}</button>
      <button type="button" class="primary" data-v0933-play ${playable ? "" : "disabled"}>${copy("Játék", "Play")}</button>
    </footer>
  </section>`;
}
function openWorld(world) {
  if (!worldUnlocked(world)) {
    UI.toast?.(copy("Ez a világ még zárolva van.", "This world is still locked."));
    return;
  }
  runtime.world = Number(world);
  runtime.worldMode = "chapters";
  const list = worldStages(runtime.world);
  runtime.stageId = list.find(stage => stage.id === UI.save?.selectedStageId)?.id || list.find(stageUnlocked)?.id || list[0]?.id || null;
  renderDesktopWorldSelect(true);
}
function launchStage() {
  const stage = selectedStage();
  if (!stage || !stageUnlocked(stage)) {
    UI.toast?.(copy("Ez a pálya még zárolva van.", "This stage is still locked."));
    return;
  }
  UI.save.selectedStageId = stage.id;
  UI.worldCarouselIndex = Math.max(0, stages().findIndex(entry => entry.id === stage.id));
  CherriftStorage.save(UI.save);
  UI.game?.start?.();
}

function patchUiLifecycle() {
  if (UI.__v0933Layout) return;
  UI.__v0933Layout = true;

  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV0933(save, game) {
      const result = previousInit(save, game);
      const selected = stages().find(stage => stage.id === save?.selectedStageId);
      runtime.world = selected?.world || 1;
      runtime.stageId = selected?.id || null;
      requestAnimationFrame(refreshAll);
      return result;
    };
  }

  const previousOpen = UI.open?.bind(UI);
  if (previousOpen) {
    UI.open = function openV0933(panel, ...args) {
      if (panel === "worlds" && !panelVisible("worlds")) runtime.worldMode = "worlds";
      const result = previousOpen(panel, ...args);
      requestAnimationFrame(() => {
        if (panel === "worlds" && isDesktop()) renderDesktopWorldSelect(true);
        refreshAll();
      });
      return result;
    };
  }

  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV0933(...args) {
      const result = previousRefresh(...args);
      requestAnimationFrame(refreshAll);
      return result;
    };
  }

  const previousWorldOpen = UI.openWorldSelect?.bind(UI);
  if (previousWorldOpen) {
    UI.openWorldSelect = function openWorldSelectV0933(...args) {
      const selected = stages().find(stage => stage.id === UI.save?.selectedStageId);
      runtime.world = selected?.world || 1;
      runtime.stageId = selected?.id || null;
      runtime.worldMode = "worlds";
      const result = previousWorldOpen(...args);
      requestAnimationFrame(() => renderDesktopWorldSelect(true));
      return result;
    };
  }

  const previousWorldRender = UI.renderWorldPanel?.bind(UI);
  if (previousWorldRender) {
    UI.renderWorldPanel = function renderWorldPanelV0933(...args) {
      const result = previousWorldRender(...args);
      if (isDesktop()) requestAnimationFrame(() => renderDesktopWorldSelect(true));
      return result;
    };
  }
}

function bindEvents() {
  if (document.documentElement.dataset.v0933Events) return;
  document.documentElement.dataset.v0933Events = "1";

  document.addEventListener("click", event => {
    const open = event.target.closest?.("[data-v0933-open]");
    if (open) {
      event.preventDefault();
      const route = open.dataset.v0933Open;
      if (route === "worlds") UI.openWorldSelect?.();
      else UI.open(route);
      return;
    }
    const world = event.target.closest?.("[data-v0933-world]");
    if (world) {
      event.preventDefault();
      openWorld(Number(world.dataset.v0933World));
      return;
    }
    const stage = event.target.closest?.("[data-v0933-stage]");
    if (stage) {
      event.preventDefault();
      const entry = stages().find(item => item.id === stage.dataset.v0933Stage);
      if (!stageUnlocked(entry)) {
        UI.toast?.(copy("Ez a pálya még zárolva van.", "This stage is still locked."));
        return;
      }
      runtime.stageId = entry.id;
      renderDesktopWorldSelect(true);
      return;
    }
    if (event.target.closest?.("[data-v0933-worlds-back]")) {
      event.preventDefault();
      runtime.worldMode = "worlds";
      renderDesktopWorldSelect(true);
      return;
    }
    if (event.target.closest?.("[data-v0933-play]")) {
      event.preventDefault();
      launchStage();
      return;
    }
    if (event.target.closest?.("[data-v0933-back]")) {
      event.preventDefault();
      if (runtime.worldMode === "chapters") {
        runtime.worldMode = "worlds";
        renderDesktopWorldSelect(true);
      } else UI.open("menu");
    }
  });
}

function refreshAll() {
  renderDesktopChrome();
  if (isDesktop() && panelVisible("worlds")) renderDesktopWorldSelect();
}
function scheduleRefresh() {
  if (runtime.refreshQueued) return;
  runtime.refreshQueued = true;
  requestAnimationFrame(() => {
    runtime.refreshQueued = false;
    refreshAll();
  });
}
function installObserver() {
  if (runtime.observer || !document.body) return;
  runtime.observer = new MutationObserver(scheduleRefresh);
  runtime.observer.observe(document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class"]
  });
}

ensureCss();
patchSuccubusClaw();
patchUiLifecycle();
bindEvents();
installObserver();
window.addEventListener("resize", () => {
  if (!isDesktop() && panelVisible("worlds")) UI.renderWorldPanel?.();
  scheduleRefresh();
});
window.addEventListener("cherrift:languagechange", () => {
  runtime.subnavSignature = "";
  scheduleRefresh();
});
scheduleRefresh();

window.CHERRIFT_V0933 = {
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  refresh:refreshAll,
  renderWorld:renderDesktopWorldSelect
};
console.info("[CHERRIFT] v0.9.3.3 desktop navigation, Cherry selector and chapter layout loaded.");
})();
