(() => {
"use strict";

const VERSION = "0.9.3.4-world-map-training";
const CACHE_VERSION = "0934";
const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

if (!window.UI || !window.CherriftGame || !window.CherriftStorage || !window.CHERRIFT_V040) {
  console.error("[CHERRIFT v0.9.3.4] Required world systems are missing.");
  return;
}

const runtime = {
  view:"worlds",
  world:0,
  stageId:"training_test",
  rendering:false,
  renderQueued:false
};

const WORLD_META = {
  0:{
    nameHu:"Teszt Training", nameEn:"Test Training",
    descHu:"Sebzésmérő gyakorlópálya egy végtelen életű tanky dummyval.",
    descEn:"Damage testing ground with an infinite-health tanky dummy.",
    art:'linear-gradient(180deg,rgba(7,4,12,.08),rgba(7,4,12,.72)),url("assets/map/training_teszt.png")'
  },
  1:{
    nameHu:"Blooming Meadow", nameEn:"Blooming Meadow",
    descHu:"Világos erdő, nagyobb fákkal és tiszta, valódi map dekorációkkal.",
    descEn:"Bright forest with larger trees and clean map decorations.",
    art:'linear-gradient(180deg,rgba(5,3,12,.03),rgba(5,3,12,.64)),url("assets/map/world1/world1_splashart_1.png"),url("assets/map/world1/world1_ground_1.png")'
  },
  2:{
    nameHu:"Night Bloom", nameEn:"Night Bloom",
    descHu:"World 1 éjszakai változata meleg Cherry-fénnyel és pulzáló szentjánosbogarakkal.",
    descEn:"Night version of World 1 with Cherry's warm body light and pulsing fireflies.",
    art:'linear-gradient(180deg,rgba(4,3,8,.10),rgba(4,3,8,.76)),url("assets/map/world2/world2_splashart_1.png"),url("assets/map/world2/world2_splashart.png"),url("assets/map/world2/world2_ground_1.png")'
  },
  3:{
    nameHu:"Sunlit Savanna", nameEn:"Sunlit Savanna",
    descHu:"Aranyló szavanna. A splash art elkészültéig a pálya saját groundjából kap előnézetet.",
    descEn:"Golden savanna. Its ground texture is used as a preview until the splash art is ready.",
    art:'radial-gradient(circle at 70% 18%,rgba(255,210,105,.30),transparent 34%),linear-gradient(180deg,rgba(64,31,10,.08),rgba(25,10,6,.74)),url("assets/map/world3/world3_ground_1.png")'
  },
  4:{
    nameHu:"Red Desert", nameEn:"Red Desert",
    descHu:"Vörös sivatag ritka, hatalmas sziklaóriásokkal a későbbi pályákon.",
    descEn:"Red desert with rare colossal rocks in the later stages.",
    art:'linear-gradient(180deg,rgba(41,8,4,.05),rgba(18,4,5,.70)),url("assets/map/world4/world4_splashart_1.png"),url("assets/map/world4/world4_splashart_2.png"),url("assets/map/world4/world4_ground_1.png")'
  }
};

const MAP_ASSETS = {
  0:{ground:"assets/map/training_teszt.png"},
  1:{
    ground:"assets/map/world1/world1_ground_1.png",
    bush1:"assets/map/world1/world1_bush_1.png", bush2:"assets/map/world1/world1_bush_2.png", bush3:"assets/map/world1/world1_bush_3.png",
    flower1:"assets/map/world1/world1_flower_1.png", flower2:"assets/map/world1/world1_flower_2.png", flower3:"assets/map/world1/world1_flower_3.png",
    log:"assets/map/world1/world1_log_1.png", mushroom:"assets/map/world1/world1_mushroom_1.png",
    rock1:"assets/map/world1/world1_rock_1.png", rock2:"assets/map/world1/world1_rock_2.png", rockSmall:"assets/map/world1/world1_rock_small_1.png",
    tree1:"assets/map/world1/world1_tree_1.png", tree2:"assets/map/world1/world1_tree_2.png"
  },
  2:{
    ground:"assets/map/world2/world2_ground_1.png",
    bush1:"assets/map/world2/world2_bush_1.png", bush2:"assets/map/world2/world2_bush_2.png", bush3:"assets/map/world2/world2_bush_3.png",
    flower1:"assets/map/world2/world2_flower_1.png", flower2:"assets/map/world2/world2_flower_2.png", flower3:"assets/map/world2/world2_flower_3.png",
    rock1:"assets/map/world2/world2_rock_1.png", rock2:"assets/map/world2/world2_rock_2.png", rock3:"assets/map/world2/world2_rock_3.png",
    tree1:"assets/map/world2/world2_tree_1.png", tree2:"assets/map/world2/world2_tree_2.png"
  },
  3:{
    ground:"assets/map/world3/world3_ground_1.png", bones:"assets/map/world3/world3_bones.png",
    bush1:"assets/map/world3/world3_bush_1.png", bush2:"assets/map/world3/world3_bush_2.png", log:"assets/map/world3/world3_log.png",
    rock1:"assets/map/world3/world3_rock_1.png", rock2:"assets/map/world3/world3_rock_2.png",
    grass1:"assets/map/world3/world3_tall_grass_1.png", grass2:"assets/map/world3/world3_tall_grass_2.png",
    tree1:"assets/map/world3/world3_tree_1.png", tree2:"assets/map/world3/world3_tree_2.png"
  },
  4:{
    ground:"assets/map/world4/world4_ground_1.png", bigRock:"assets/map/world4/world4_big_rock_1.png",
    bones:"assets/map/world4/world4_bones_1.png", bush:"assets/map/world4/world4_bush_1.png",
    cactus1:"assets/map/world4/world4_cactus_1.png", cactus2:"assets/map/world4/world4_cactus_2.png", flower:"assets/map/world4/world4_flower_1.png",
    rock1:"assets/map/world4/world4_rock_1.png", rock2:"assets/map/world4/world4_rock_2.png",
    rock3:"assets/map/world4/world_rock_3.png", rock4:"assets/map/world4/world_rock_4.png",
    veryBig1:"assets/map/world4/world4_rock_very_big_1.png", veryBig2:"assets/map/world4/world4_very_big_rock_2.png",
    tree:"assets/map/world4/world4_tree_1.png"
  }
};

const FIREFLY_CANDIDATES = [
  "assets/map/world2/world2_firefly.png",
  "assets/map/world2/world2_firefly_1.png",
  "assets/map/world2/firefly.png",
  "assets/map/world2/firefly_1.png"
];

function language() {
  return window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu";
}
function copy(hu, en) { return language() === "en" ? en : hu; }
function stages() { return window.CHERRIFT_V040?.stages || []; }
function worldStages(world) { return stages().filter(stage => Number(stage.world) === Number(world)); }
function isTestBuild() {
  return /TEST|TESZT/i.test(`${window.CHERRIFT_BUILD?.title || ""} ${window.CHERRIFT_BUILD?.label || ""}`);
}
function stageCleared(stage) {
  return !!(UI.save?.clearedStages?.[stage.id] || UI.save?.stageStats?.[stage.id]?.clears || UI.save?.completedStages?.includes?.(stage.id));
}
function worldUnlocked(world) {
  const number = Number(world);
  if (number <= 1 || isTestBuild()) return true;
  const previous = worldStages(number - 1);
  return previous.length > 0 && previous.every(stageCleared);
}
function stageUnlocked(stage) {
  if (!stage) return false;
  if (stage.training) return true;
  return UI.save?.unlockedStages?.includes?.(stage.id) || (worldUnlocked(stage.world) && Number(stage.index) === 1);
}
function firstClearClaimed(stageId) {
  const value = UI.save?.firstClearClaimed;
  return Array.isArray(value) ? value.includes(stageId) : !!value?.[stageId];
}
function rewardText(reward) {
  const parts = [];
  if (reward?.coins) parts.push(`${reward.coins} Coin`);
  if (reward?.keys) parts.push(`${reward.keys} Key`);
  if (reward?.gems) parts.push(`${reward.gems} Gem`);
  return parts.join(" · ") || "—";
}
function starsFor(stage) {
  return clamp(Math.floor(Number(UI.save?.stageStars?.[stage.id] || UI.save?.stageStats?.[stage.id]?.stars || 0)), 0, 3);
}

function addStageIfMissing(stage) {
  if (!stages().some(entry => entry.id === stage.id)) stages().push(stage);
}
function installStages() {
  const training = {
    id:"training_test", world:0, index:0, name:"Training Test", title:"Damage Laboratory", theme:"training",
    goalKills:Number.POSITIVE_INFINITY, maxEnemies:0, raidEvery:Number.POSITIVE_INFINITY, raidCount:0, enemyPool:[], training:true,
    repeatReward:{}, firstClearReward:{}, desc:"Infinite dummy damage test. The 10-second total resets after inactivity."
  };
  if (!stages().some(stage => stage.id === training.id)) stages().unshift(training);

  [
    {id:"world_3_1",world:3,index:1,name:"World 3-1",title:"Golden Grasslands",theme:"savanna",goalKills:180,maxEnemies:48,raidEvery:40,raidCount:20,enemyPool:["pink_slime","green_slime","spider"],repeatReward:{coins:56},firstClearReward:{coins:105},desc:"World 1 and World 2 enemies meet on the open savanna."},
    {id:"world_3_2",world:3,index:2,name:"World 3-2",title:"Acacia Trail",theme:"savanna",goalKills:200,maxEnemies:52,raidEvery:43,raidCount:22,enemyPool:["green_slime","blue_slime","beetle","spider"],repeatReward:{coins:62},firstClearReward:{coins:118},desc:"Mixed slime and insect waves among giant savanna trees."},
    {id:"world_3_3",world:3,index:3,name:"World 3-3",title:"Dry Riverbed",theme:"savanna",goalKills:220,maxEnemies:56,raidEvery:46,raidCount:24,enemyPool:["pink_slime","blue_slime","crawler","spider"],repeatReward:{coins:69},firstClearReward:{coins:132,keys:1},desc:"Faster mixed raids through the dry riverbed."},
    {id:"world_3_4",world:3,index:4,name:"World 3-4",title:"Predator's Reach",theme:"savanna",goalKills:245,maxEnemies:60,raidEvery:49,raidCount:27,enemyPool:["big_slime","beetle","moth","crawler"],repeatReward:{coins:77},firstClearReward:{coins:148},desc:"Tanky slimes and fast night creatures share the savanna."},
    {id:"world_3_5",world:3,index:5,name:"World 3-5",title:"Savanna Heart",theme:"savanna",goalKills:275,maxEnemies:66,raidEvery:52,raidCount:30,enemyPool:["pink_slime","green_slime","blue_slime","big_slime","spider","beetle","crawler","moth"],repeatReward:{coins:88},firstClearReward:{coins:170,keys:1},desc:"The complete World 1 and World 2 enemy mix."},
    {id:"world_4_1",world:4,index:1,name:"World 4-1",title:"Crimson Dust",theme:"red_desert",goalKills:210,maxEnemies:52,raidEvery:42,raidCount:22,enemyPool:["green_slime","blue_slime","beetle","crawler"],repeatReward:{coins:72},firstClearReward:{coins:138},desc:"The first red desert route."},
    {id:"world_4_2",world:4,index:2,name:"World 4-2",title:"Cactus Expanse",theme:"red_desert",goalKills:235,maxEnemies:56,raidEvery:45,raidCount:24,enemyPool:["pink_slime","big_slime","spider","moth"],repeatReward:{coins:81},firstClearReward:{coins:154},desc:"Dense cactus fields and tougher mixed waves."},
    {id:"world_4_3",world:4,index:3,name:"World 4-3",title:"Colossus Stones",theme:"red_desert",goalKills:260,maxEnemies:60,raidEvery:48,raidCount:27,enemyPool:["blue_slime","big_slime","beetle","crawler","moth"],repeatReward:{coins:91},firstClearReward:{coins:174,keys:1},desc:"The first colossal desert rock appears here."},
    {id:"world_4_4",world:4,index:4,name:"World 4-4",title:"Burning Ridge",theme:"red_desert",goalKills:285,maxEnemies:64,raidEvery:51,raidCount:30,enemyPool:["pink_slime","green_slime","big_slime","spider","beetle","crawler"],repeatReward:{coins:102},firstClearReward:{coins:196},desc:"Two rare colossal rocks shape the battlefield."},
    {id:"world_4_5",world:4,index:5,name:"World 4-5",title:"Red Titan Basin",theme:"red_desert",goalKills:320,maxEnemies:70,raidEvery:54,raidCount:34,enemyPool:["pink_slime","green_slime","blue_slime","big_slime","spider","beetle","crawler","moth"],repeatReward:{coins:116},firstClearReward:{coins:225,keys:1},desc:"Three fixed colossal rocks mark the final red desert arena."}
  ].forEach(addStageIfMissing);
}

function ensureSave(save = UI.save) {
  if (!save) return;
  save.unlockedStages = Array.isArray(save.unlockedStages) ? save.unlockedStages : ["world_1_1"];
  if (!save.unlockedStages.includes("training_test")) save.unlockedStages.unshift("training_test");
  save.clearedStages = save.clearedStages && typeof save.clearedStages === "object" ? save.clearedStages : {};
  save.stageStats = save.stageStats && typeof save.stageStats === "object" ? save.stageStats : {};
}

function ensureCss() {
  if (id("v094css")) return;
  const link = document.createElement("link");
  link.id = "v094css";
  link.rel = "stylesheet";
  link.href = `v094.css?v=${CACHE_VERSION}`;
  document.head.appendChild(link);
}

function ensureWorldScreen() {
  let screen = id("worldsV094");
  if (!screen) {
    screen = document.createElement("section");
    screen.id = "worldsV094";
    screen.className = "panel hidden world-screen-v094";
    screen.dataset.i18nIgnore = "true";
    id("app")?.appendChild(screen);
  }
  return screen;
}
function hideLegacyWorldPanel() { id("worlds")?.classList.add("hidden"); }
function hideWorldScreen() { ensureWorldScreen().classList.add("hidden"); }
function showWorldScreen() {
  hideLegacyWorldPanel();
  ensureWorldScreen().classList.remove("hidden");
  document.body.classList.add("v094-world-open");
}

function selectedStage() {
  const list = worldStages(runtime.world);
  return list.find(stage => stage.id === runtime.stageId)
    || list.find(stage => stage.id === UI.save?.selectedStageId)
    || list.find(stageUnlocked)
    || list[0]
    || null;
}
function worldName(world) {
  const meta = WORLD_META[world];
  return meta ? copy(meta.nameHu, meta.nameEn) : `${copy("Világ", "World")} ${world}`;
}
function worldDescription(world) {
  const meta = WORLD_META[world];
  return meta ? copy(meta.descHu, meta.descEn) : "";
}
function worldArt(world) { return WORLD_META[world]?.art || WORLD_META[1].art; }
function worldProgress(world) {
  const list = worldStages(world);
  return {earned:list.reduce((sum, stage) => sum + starsFor(stage), 0), max:list.length * 3};
}

function renderWorldCards() {
  return [0,1,2,3,4].map(world => {
    const unlocked = worldUnlocked(world);
    const progress = worldProgress(world);
    const training = world === 0;
    return `<button type="button" class="world-card-v094 ${unlocked ? "" : "locked"} ${training ? "training" : ""}" data-v094-world="${world}" style='background-image:${worldArt(world)}'>
      <span>${training ? copy("TESZT", "TEST") : unlocked ? `WORLD ${world}` : "🔒"}</span>
      <div><small>${training ? copy("GYAKORLÓPÁLYA", "TRAINING GROUND") : unlocked ? copy("VILÁG", "WORLD") : copy("ZÁROLVA", "LOCKED")}</small>
      <h3>${escapeHtml(worldName(world))}</h3><p>${training ? "∞ HP Dummy" : `${progress.earned} / ${progress.max} ★`}</p></div>
    </button>`;
  }).join("");
}
function renderStageCards() {
  const chosen = selectedStage();
  return worldStages(runtime.world).map(stage => {
    const unlocked = stageUnlocked(stage);
    const active = stage.id === chosen?.id;
    const stars = starsFor(stage);
    return `<button type="button" class="stage-card-v094 ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-v094-stage="${escapeHtml(stage.id)}" style='background-image:${worldArt(stage.world)}'>
      <span>${stage.training ? "∞" : unlocked ? (stage.boss ? "BOSS" : `${stage.world}-${stage.index}`) : "🔒"}</span>
      <small>${stage.training ? copy("TESZT PÁLYA", "TEST STAGE") : `${copy("PÁLYA", "STAGE")} ${stage.index}`}</small>
      <h3>${escapeHtml(stage.title || stage.name)}</h3>
      <p>${stage.training ? copy("10 másodperces sebzésmérés", "10-second damage meter") : `${"★".repeat(stars)}${"☆".repeat(3-stars)}`}</p>
    </button>`;
  }).join("");
}
function stageDetails(stage) {
  if (!stage) return "";
  if (stage.training) {
    return `<section class="stage-details-v094 training"><div><small>${copy("KIVÁLASZTOTT PÁLYA", "SELECTED STAGE")}</small><h3>${copy("Teszt Training · Damage Laboratory", "Test Training · Damage Laboratory")}</h3><p>${copy("Egy nagy, kék, tüskés dummy vár a spawn mellett. Nem mozog, nem támad és nem tud meghalni.", "A large blue spiked dummy waits beside the spawn. It cannot move, attack, or die.")}</p></div><aside><small>${copy("MÉRÉS", "MEASUREMENT")}</small><b>${copy("Aktuális + összesített sebzés", "Current + total damage")}</b><em>${copy("10 mp tétlenség után reset", "Resets after 10s idle")}</em></aside></section>`;
  }
  return `<section class="stage-details-v094"><div><small>${copy("KIVÁLASZTOTT PÁLYA", "SELECTED STAGE")}</small><h3>${escapeHtml(stage.name)} · ${escapeHtml(stage.title || "")}</h3><p>${escapeHtml(stage.desc || worldDescription(stage.world))}</p></div><aside><small>${copy("JUTALOM", "REWARD")}</small><b>${escapeHtml(rewardText(stage.repeatReward))}</b><em>${copy("Első:", "First:")} ${escapeHtml(rewardText(stage.firstClearReward))}${firstClearClaimed(stage.id) ? ` · ✓ ${copy("Begyűjtve", "Claimed")}` : ""}</em></aside></section>`;
}
function renderWorldSelector(force = false) {
  if (runtime.rendering || !UI.save) return;
  const screen = ensureWorldScreen();
  if (screen.classList.contains("hidden") && !force) return;
  runtime.rendering = true;
  try {
    const stage = selectedStage();
    runtime.stageId = stage?.id || null;
    const playable = runtime.view === "stages" && stage && stageUnlocked(stage);
    screen.innerHTML = `<div class="world-shell-v094 ${runtime.view === "stages" ? "show-stages" : "show-worlds"}">
      <header class="world-header-v094"><button type="button" data-v094-back aria-label="Back">←</button><div><small>CHERRIFT · WORLD UPDATE</small><h2>${runtime.view === "worlds" ? copy("Világválasztás", "World Selection") : escapeHtml(worldName(runtime.world))}</h2><p>${runtime.view === "worlds" ? copy("PC-szerű selector, telefonra igazított kártyákkal.", "PC-style selector with phone-sized cards.") : escapeHtml(worldDescription(runtime.world))}</p></div></header>
      ${runtime.view === "worlds"
        ? `<main class="world-card-grid-v094">${renderWorldCards()}</main>`
        : `<main><section class="world-banner-v094" style='background-image:${worldArt(runtime.world)}'><button type="button" data-v094-worlds-back>‹ ${copy("Világok", "Worlds")}</button><div><small>${runtime.world === 0 ? copy("TESZT", "TEST") : `WORLD ${runtime.world}`}</small><h3>${escapeHtml(worldName(runtime.world))}</h3></div></section><section class="stage-card-grid-v094">${renderStageCards()}</section>${stageDetails(stage)}</main>`}
      <footer class="world-footer-v094"><button type="button" class="secondary" data-v094-back>${copy("Vissza", "Back")}</button><button type="button" class="primary" data-v094-play ${playable ? "" : "disabled"}>${stage?.training ? copy("Training indítása", "Start Training") : copy("Játék", "Play")}</button></footer>
    </div>`;
  } finally {
    runtime.rendering = false;
  }
}
function scheduleRender(force = false) {
  if (runtime.renderQueued) return;
  runtime.renderQueued = true;
  requestAnimationFrame(() => {
    runtime.renderQueued = false;
    renderWorldSelector(force);
  });
}
function openWorldSelector() {
  ensureSave();
  const selected = stages().find(stage => stage.id === UI.save?.selectedStageId);
  runtime.world = selected?.world ?? 0;
  runtime.stageId = selected?.id || "training_test";
  runtime.view = "worlds";
  UI.open("worlds");
}
function openWorld(world) {
  if (!worldUnlocked(world)) {
    UI.toast?.(copy("Ez a világ még zárolva van.", "This world is still locked."));
    return;
  }
  runtime.world = Number(world);
  runtime.view = "stages";
  const list = worldStages(runtime.world);
  runtime.stageId = list.find(stage => stage.id === UI.save?.selectedStageId)?.id || list.find(stageUnlocked)?.id || list[0]?.id || null;
  renderWorldSelector(true);
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
  hideWorldScreen();
  document.body.classList.remove("v094-world-open");
  UI.game?.start?.();
}

function patchUi() {
  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV094(save, game) {
      ensureSave(save);
      const result = previousInit(save, game);
      ensureSave(save);
      ensureWorldScreen();
      return result;
    };
  }

  const previousOpen = UI.open?.bind(UI);
  if (previousOpen) {
    UI.open = function openV094(panel, ...args) {
      const result = previousOpen(panel, ...args);
      if (panel === "worlds") {
        hideLegacyWorldPanel();
        showWorldScreen();
        scheduleRender(true);
      } else {
        hideWorldScreen();
        document.body.classList.remove("v094-world-open");
      }
      return result;
    };
  }

  UI.openWorldSelect = openWorldSelector;
  UI.renderWorldPanel = () => renderWorldSelector(true);
  UI.launchSelectedWorld = launchStage;
}

function bindSelectorEvents() {
  if (document.documentElement.dataset.v094WorldEvents) return;
  document.documentElement.dataset.v094WorldEvents = "1";
  document.addEventListener("click", event => {
    const world = event.target.closest?.("[data-v094-world]");
    if (world) { event.preventDefault(); openWorld(Number(world.dataset.v094World)); return; }
    const stageButton = event.target.closest?.("[data-v094-stage]");
    if (stageButton) {
      event.preventDefault();
      const stage = stages().find(entry => entry.id === stageButton.dataset.v094Stage);
      if (!stageUnlocked(stage)) return UI.toast?.(copy("Ez a pálya még zárolva van.", "This stage is still locked."));
      runtime.stageId = stage.id;
      renderWorldSelector(true);
      return;
    }
    if (event.target.closest?.("[data-v094-worlds-back]")) { event.preventDefault(); runtime.view = "worlds"; renderWorldSelector(true); return; }
    if (event.target.closest?.("[data-v094-play]")) { event.preventDefault(); launchStage(); return; }
    if (event.target.closest?.("[data-v094-back]")) {
      event.preventDefault();
      if (runtime.view === "stages") { runtime.view = "worlds"; renderWorldSelector(true); }
      else UI.open("menu");
    }
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function makeRandom(seed) {
  let state = seed || 0x9e3779b9;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function mobileDensity() {
  const mobile = matchMedia("(max-width:820px)").matches;
  const low = UI.save?.settings?.effectQuality === "low";
  return mobile ? (low ? .58 : .70) : 1;
}
function mapSeed(stage) {
  return hashString(`${stage?.id || "world"}:${Date.now()}:${Math.random()}`);
}

function addMapObjects(list, random, options) {
  const density = options.density ?? 1;
  const count = Math.max(0, Math.round((options.count || 0) * density));
  const minSpawnDistance = options.minSpawnDistance ?? 330;
  const margin = options.margin ?? 260;
  const worldHalf = (Number(CHERRIFT_CONFIG.worldSize) || 4200) / 2 - margin;
  for (let index = 0; index < count; index++) {
    let placed = false;
    for (let attempt = 0; attempt < 120 && !placed; attempt++) {
      const x = (random() * 2 - 1) * worldHalf;
      const y = (random() * 2 - 1) * worldHalf;
      const collisionRadius = options.collisionRadius || 0;
      const spacing = options.spacing ?? 32;
      if (Math.hypot(x, y) < minSpawnDistance) continue;
      if (list.some(object => Math.hypot(object.x - x, object.y - y) < (object.placementRadius || object.collisionRadius || 22) + (options.placementRadius || collisionRadius || 22) + spacing)) continue;
      const assetKeys = Array.isArray(options.assetKeys) ? options.assetKeys : [options.assetKey];
      const assetKey = assetKeys[Math.floor(random() * assetKeys.length)] || null;
      list.push({
        kind:options.kind || "mapAssetV094", assetKey, x, y,
        r:collisionRadius || options.r || 18, collisionRadius,
        placementRadius:options.placementRadius || collisionRadius || Math.max(options.drawW || 40, options.drawH || 40) * .18,
        solid:options.solid === true, drawW:options.drawW || 64, drawH:options.drawH || 64,
        anchor:options.anchor ?? .72, phase:random() * Math.PI * 2,
        drift:options.drift || 0, v094Map:true
      });
      placed = true;
    }
  }
}

function generateWorldMap(stage) {
  if (!stage || stage.training) return [];
  const world = Number(stage.world);
  const index = Math.max(1, Number(stage.index) || 1);
  const density = mobileDensity();
  const random = makeRandom(mapSeed(stage));
  const list = [];

  if (world === 1) {
    addMapObjects(list,random,{assetKeys:["w1_tree1","w1_tree2"],count:11,drawW:272,drawH:272,collisionRadius:72,placementRadius:105,solid:true,anchor:.80,density});
    addMapObjects(list,random,{assetKeys:["w1_rock1","w1_rock2"],count:10,drawW:112,drawH:92,collisionRadius:38,solid:true,anchor:.60,density});
    addMapObjects(list,random,{assetKeys:["w1_rockSmall"],count:10,drawW:78,drawH:64,collisionRadius:25,solid:true,anchor:.58,density});
    addMapObjects(list,random,{assetKeys:["w1_log"],count:8,drawW:148,drawH:94,collisionRadius:44,placementRadius:60,solid:true,anchor:.62,density});
    addMapObjects(list,random,{assetKeys:["w1_bush1","w1_bush2","w1_bush3"],count:18,drawW:112,drawH:94,solid:false,anchor:.62,density});
    addMapObjects(list,random,{assetKeys:["w1_flower1","w1_flower2","w1_flower3","w1_mushroom"],count:30,drawW:58,drawH:54,solid:false,anchor:.55,density,spacing:12});
  } else if (world === 2) {
    addMapObjects(list,random,{assetKeys:["w2_tree1","w2_tree2"],count:10,drawW:270,drawH:270,collisionRadius:72,placementRadius:105,solid:true,anchor:.80,density});
    addMapObjects(list,random,{assetKeys:["w2_rock1","w2_rock2","w2_rock3"],count:12,drawW:108,drawH:88,collisionRadius:36,solid:true,anchor:.60,density});
    addMapObjects(list,random,{assetKeys:["w2_bush1","w2_bush2","w2_bush3"],count:17,drawW:110,drawH:92,solid:false,anchor:.62,density});
    addMapObjects(list,random,{assetKeys:["w2_flower1","w2_flower2","w2_flower3"],count:24,drawW:56,drawH:52,solid:false,anchor:.55,density,spacing:12});
    const fireflies = matchMedia("(max-width:820px)").matches ? 8 : 12;
    addMapObjects(list,random,{kind:"fireflyV094",assetKey:"w2_firefly",count:fireflies,drawW:34,drawH:34,solid:false,anchor:.50,density:UI.save?.settings?.effectQuality === "low" ? .70 : 1,spacing:80,drift:16,minSpawnDistance:210});
  } else if (world === 3) {
    addMapObjects(list,random,{assetKeys:["w3_tree1","w3_tree2"],count:9,drawW:336,drawH:336,collisionRadius:92,placementRadius:132,solid:true,anchor:.82,density});
    addMapObjects(list,random,{assetKeys:["w3_rock1","w3_rock2"],count:12,drawW:124,drawH:102,collisionRadius:42,solid:true,anchor:.61,density});
    addMapObjects(list,random,{assetKeys:["w3_log"],count:7,drawW:160,drawH:98,collisionRadius:46,solid:true,anchor:.62,density});
    addMapObjects(list,random,{assetKeys:["w3_bush1","w3_bush2"],count:18,drawW:118,drawH:96,solid:false,anchor:.62,density});
    addMapObjects(list,random,{assetKeys:["w3_grass1","w3_grass2","w3_bones"],count:31,drawW:76,drawH:66,solid:false,anchor:.58,density,spacing:14});
  } else if (world === 4) {
    addMapObjects(list,random,{assetKeys:["w4_tree","w4_cactus1","w4_cactus2"],count:10,drawW:178,drawH:214,collisionRadius:54,placementRadius:78,solid:true,anchor:.80,density});
    addMapObjects(list,random,{assetKeys:["w4_bigRock"],count:5,drawW:238,drawH:188,collisionRadius:78,placementRadius:102,solid:true,anchor:.64,density});
    addMapObjects(list,random,{assetKeys:["w4_rock1","w4_rock2","w4_rock3","w4_rock4"],count:13,drawW:120,drawH:96,collisionRadius:40,solid:true,anchor:.60,density});
    addMapObjects(list,random,{assetKeys:["w4_bush","w4_flower","w4_bones"],count:24,drawW:72,drawH:64,solid:false,anchor:.56,density,spacing:14});
    const colossalCount = index < 3 ? 0 : index === 3 ? 1 : index === 4 ? 2 : 3;
    addMapObjects(list,random,{assetKeys:["w4_veryBig1","w4_veryBig2"],count:colossalCount,drawW:468,drawH:376,collisionRadius:132,placementRadius:190,solid:true,anchor:.66,density:1,spacing:170,minSpawnDistance:520,margin:360});
  }
  return list;
}

function assetEntries(world) {
  const source = MAP_ASSETS[world] || {};
  return Object.entries(source).map(([name, path]) => [`w${world}_${name}`, path]);
}
function silentLoadImage(path) {
  return new Promise(resolve => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${path}?v=${CACHE_VERSION}`;
  });
}
async function preloadFirefly(game) {
  if (game.assets.get("w2_firefly") || game.__v094FireflyChecked) return;
  game.__v094FireflyChecked = true;
  for (const path of FIREFLY_CANDIDATES) {
    const image = await silentLoadImage(path);
    if (image) { game.assets.images.w2_firefly = image; break; }
  }
}
async function preloadWorld(game, world) {
  game.__v094WorldLoads ||= new Map();
  if (game.__v094WorldLoads.has(world)) return game.__v094WorldLoads.get(world);
  const promise = (async () => {
    await Promise.all(assetEntries(world).map(async ([key, path]) => {
      if (game.assets.get(key)) return true;
      return game.assets.loadImage(key, `${path}?v=${CACHE_VERSION}`);
    }));
    if (Number(world) === 2) await preloadFirefly(game);
  })();
  game.__v094WorldLoads.set(world, promise);
  return promise;
}

function ensureTrainingPanel() {
  let panel = id("trainingDamageV094");
  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "trainingDamageV094";
    panel.className = "training-damage-v094 hidden";
    panel.innerHTML = `<small>${copy("DUMMY SEBZÉS · 10 MP", "DUMMY DAMAGE · 10S")}</small><div><span>${copy("Aktuális", "Current")}</span><b data-v094-current>0</b></div><div><span>${copy("Összesített", "Total")}</span><b data-v094-total>0</b></div><em data-v094-reset>${copy("Üss rá a méréshez", "Hit it to start")}</em>`;
    document.body.appendChild(panel);
  }
  return panel;
}
function hideTrainingPanel() { ensureTrainingPanel().classList.add("hidden"); }
function showTrainingPanel(game) {
  const panel = ensureTrainingPanel();
  panel.classList.remove("hidden");
  game.trainingStatsV094 = {current:0,total:0,lastHitAt:0};
  updateTrainingPanel(game, true);
}
function updateTrainingPanel(game, force = false) {
  const panel = ensureTrainingPanel();
  if (!game.stage?.training) { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  const stats = game.trainingStatsV094 || (game.trainingStatsV094 = {current:0,total:0,lastHitAt:0});
  const now = performance.now();
  const elapsed = stats.lastHitAt ? (now - stats.lastHitAt) / 1000 : 0;
  if (stats.lastHitAt && elapsed >= 10) {
    stats.current = 0; stats.total = 0; stats.lastHitAt = 0;
  }
  const current = q("[data-v094-current]", panel), total = q("[data-v094-total]", panel), reset = q("[data-v094-reset]", panel);
  if (force || current?.textContent !== String(Math.round(stats.current))) current && (current.textContent = Math.round(stats.current).toLocaleString());
  if (force || total?.textContent !== String(Math.round(stats.total))) total && (total.textContent = Math.round(stats.total).toLocaleString());
  if (reset) reset.textContent = stats.lastHitAt ? copy(`${Math.max(0,10-elapsed).toFixed(1)} mp múlva reset`, `Reset in ${Math.max(0,10-elapsed).toFixed(1)}s`) : copy("Üss rá a méréshez", "Hit it to start");
}
function createTrainingDummy(game) {
  const dummy = {
    enemyType:"training_dummy", type:"training_dummy", name:"Tanky Training Slime",
    x:150, y:0, r:66, hp:Number.POSITIVE_INFINITY, maxHp:Number.POSITIVE_INFINITY,
    speed:0, xp:0, color:"#4aa7ff", hit:0, phase:0, isTrainingDummyV094:true
  };
  game.enemies = [dummy];
  game.trainingDummyV094 = dummy;
  showTrainingPanel(game);
}

function drawHeart(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * .28);
  context.bezierCurveTo(x - size * .62, y - size * .10, x - size * .48, y - size * .58, x, y - size * .30);
  context.bezierCurveTo(x + size * .48, y - size * .58, x + size * .62, y - size * .10, x, y + size * .28);
  context.closePath();
}

function patchGame() {
  const proto = CherriftGame.prototype;

  const previousStart = proto.start;
  proto.start = async function startV094(...args) {
    const stage = this.getSelectedStage?.() || stages().find(entry => entry.id === this.save?.selectedStageId);
    await preloadWorld(this, Number(stage?.world ?? 1));
    hideTrainingPanel();
    const result = await previousStart.apply(this, args);
    this.__v094PatternCache = new Map();
    if (this.stage?.training) createTrainingDummy(this);
    return result;
  };

  const previousGenerateMap = proto.generateMap;
  proto.generateMap = function generateMapV094(...args) {
    const stage = this.stage || this.getSelectedStage?.();
    if (stage && Number(stage.world) >= 0 && Number(stage.world) <= 4) return generateWorldMap(stage);
    return previousGenerateMap.apply(this, args);
  };

  const previousHitObstacle = proto.hitObstacle;
  proto.hitObstacle = function hitObstacleV094(...args) {
    if ((this.obstacles || []).some(object => object?.v094Map)) {
      const player = this.player;
      return (this.obstacles || []).some(object => object.solid && Math.hypot(player.x-object.x, player.y-object.y) < player.r + (object.collisionRadius || (object.r || 0) * .62));
    }
    return previousHitObstacle.apply(this, args);
  };

  const previousSpawn = proto.spawn;
  proto.spawn = function spawnV094(dt) {
    if (this.stage?.training) return;
    return previousSpawn.call(this, dt);
  };

  const previousUpdateEnemies = proto.updateEnemies;
  proto.updateEnemies = function updateEnemiesV094(dt) {
    if (this.stage?.training) {
      for (const enemy of this.enemies || []) enemy.hit = Math.max(0, (enemy.hit || 0) - dt);
      return;
    }
    return previousUpdateEnemies.call(this, dt);
  };

  const previousUpdate = proto.update;
  proto.update = function updateV094(dt) {
    const result = previousUpdate.call(this, dt);
    if (this.stage?.training) updateTrainingPanel(this);
    return result;
  };

  const previousDamageEnemy = proto.damageEnemy;
  proto.damageEnemy = function damageEnemyV094(enemy, damage) {
    if (enemy?.isTrainingDummyV094) {
      const amount = Math.max(0, Number(damage) || 0);
      enemy.hit = .09;
      const stats = this.trainingStatsV094 || (this.trainingStatsV094 = {current:0,total:0,lastHitAt:0});
      stats.current = amount;
      stats.total += amount;
      stats.lastHitAt = performance.now();
      if (UI.save?.settings?.damageNumbers !== false && amount > 0) {
        this.effects.push({type:"damageText",x:enemy.x+(Math.random()-.5)*18,y:enemy.y-enemy.r-8,value:Math.max(1,Math.round(amount)),t:0,life:.48,big:amount>(this.player?.damage||20)*1.45});
      }
      this.effects.push({type:"dummyHitV094",x:enemy.x,y:enemy.y,t:0,life:.22});
      updateTrainingPanel(this, true);
      return;
    }

    const wasDead = !!enemy?.dead;
    const result = previousDamageEnemy.call(this, enemy, damage);
    if (!wasDead && enemy?.dead && this.player) {
      const chance = enemy.isBoss ? .35 : enemy.eliteV088 ? .18 : .08;
      if (Math.random() < chance) {
        const ratio = enemy.isBoss ? .28 : enemy.eliteV088 ? .20 : .14;
        this.pickups.push({
          type:"hp", x:enemy.x+(Math.random()-.5)*18, y:enemy.y+(Math.random()-.5)*18,
          value:Math.max(8,Math.round(this.player.maxHp*ratio)), r:12,
          bornV089:this.t, phaseV089:Math.random()*Math.PI*2, hpDropV094:true
        });
      }
    }
    return result;
  };

  const previousUpdatePickups = proto.updatePickups;
  proto.updatePickups = function updatePickupsV094(dt) {
    const hpPickups = (this.pickups || []).filter(pickup => pickup.type === "hp");
    if (!hpPickups.length) return previousUpdatePickups.call(this, dt);
    this.pickups = this.pickups.filter(pickup => pickup.type !== "hp");
    const result = previousUpdatePickups.call(this, dt);
    const player = this.player;
    for (const pickup of hpPickups) {
      const distance = Math.hypot(pickup.x-player.x, pickup.y-player.y);
      if (distance < player.pickup) {
        const speed = 260 + (1-distance/player.pickup)*520;
        pickup.x += (player.x-pickup.x)/(distance||1)*speed*dt;
        pickup.y += (player.y-pickup.y)/(distance||1)*speed*dt;
      }
      if (distance < player.r+pickup.r+6) {
        pickup.dead = true;
        const before = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + pickup.value);
        const healed = Math.max(0, Math.round(player.hp-before));
        if (healed > 0) UI.toast?.(`+${healed} HP`);
      }
    }
    this.pickups.push(...hpPickups.filter(pickup => !pickup.dead));
    return result;
  };

  const previousDrawObj = proto.drawObj;
  proto.drawObj = function drawObjV094(context, object) {
    if (object?.type === "hp") return this.drawPickup(context, object);
    return previousDrawObj.call(this, context, object);
  };

  const previousDrawPickup = proto.drawPickup;
  proto.drawPickup = function drawPickupV094(context, pickup) {
    if (pickup?.type !== "hp") return previousDrawPickup.call(this, context, pickup);
    const bob = Math.sin(this.t*4+(pickup.phaseV089||0))*2;
    const pulse = 1 + Math.sin(this.t*5+(pickup.phaseV089||0))*.08;
    context.save();
    context.translate(pickup.x,pickup.y+bob);
    context.scale(pulse,pulse);
    context.shadowColor="#ff5d83";
    context.shadowBlur=UI.save?.settings?.effectQuality === "low" ? 5 : 13;
    context.fillStyle="#ff4f73";
    context.strokeStyle="#fff0f4";
    context.lineWidth=2;
    drawHeart(context,0,0,22);
    context.fill();context.stroke();
    context.restore();
  };

  const previousDrawGround = proto.drawGround;
  proto.drawGround = function drawGroundV094(context, zoom=1) {
    const stage = this.stage || this.getSelectedStage?.();
    const world = Number(stage?.world);
    if (!(world >= 0 && world <= 4)) return previousDrawGround.call(this, context, zoom);
    const key = `w${world}_ground`;
    const image = this.assets.get(key);
    const viewWidth = this.w/zoom, viewHeight = this.h/zoom;
    const x = this.camera.x-viewWidth/2-96, y = this.camera.y-viewHeight/2-96;
    const width = viewWidth+192, height = viewHeight+192;
    if (!image) {
      context.fillStyle = world===0?"#342640":world===2?"#14222a":world===3?"#b38b42":world===4?"#a33e2d":"#4c9b50";
      context.fillRect(x,y,width,height);
      return;
    }
    this.__v094PatternCache ||= new Map();
    let pattern = this.__v094PatternCache.get(key);
    if (!pattern) { pattern = context.createPattern(image,"repeat"); this.__v094PatternCache.set(key,pattern); }
    context.save();context.fillStyle=pattern;context.fillRect(x,y,width,height);context.restore();
  };

  const previousDrawObstacle = proto.drawObstacle;
  proto.drawObstacle = function drawObstacleV094(context, object) {
    if (!object?.v094Map) return previousDrawObstacle.call(this, context, object);
    const zoom = this.zoom || 1;
    const halfW = this.w/zoom/2 + (object.drawW||64);
    const halfH = this.h/zoom/2 + (object.drawH||64);
    if (Math.abs(object.x-this.camera.x)>halfW || Math.abs(object.y-this.camera.y)>halfH) return;

    if (object.kind === "fireflyV094") {
      const low = UI.save?.settings?.effectQuality === "low";
      const driftX = Math.sin(this.t*.42+object.phase)*(object.drift||14);
      const driftY = Math.cos(this.t*.31+object.phase*1.7)*(object.drift||14)*.55;
      const pulse = .45 + (Math.sin(this.t*1.8+object.phase)*.5+.5)*.55;
      const image = this.assets.get("w2_firefly");
      context.save();context.translate(object.x+driftX,object.y+driftY);context.globalAlpha=pulse;
      context.globalCompositeOperation="lighter";context.shadowColor="#fff0a4";context.shadowBlur=low?4:16;
      if (image) context.drawImage(image,-object.drawW/2,-object.drawH/2,object.drawW,object.drawH);
      else { const gradient=context.createRadialGradient(0,0,0,0,0,14);gradient.addColorStop(0,"rgba(255,255,218,1)");gradient.addColorStop(.28,"rgba(255,226,115,.86)");gradient.addColorStop(1,"rgba(255,205,76,0)");context.fillStyle=gradient;context.beginPath();context.arc(0,0,14,0,Math.PI*2);context.fill(); }
      context.restore();return;
    }

    const image = this.assets.get(object.assetKey);
    if (!image) return;
    context.save();
    context.drawImage(image,object.x-object.drawW/2,object.y-object.drawH*object.anchor,object.drawW,object.drawH);
    context.restore();
  };

  const previousDrawEnemy = proto.drawEnemy;
  proto.drawEnemy = function drawEnemyV094(context, enemy) {
    if (!enemy?.isTrainingDummyV094) return previousDrawEnemy.call(this, context, enemy);
    const r = enemy.r || 66;
    const pulse = 1 + Math.sin(this.t*2.2)*.025;
    context.save();context.translate(enemy.x,enemy.y);context.scale(pulse,pulse);
    context.fillStyle="rgba(0,0,0,.30)";context.beginPath();context.ellipse(0,r*.56,r*1.02,r*.33,0,0,Math.PI*2);context.fill();
    context.fillStyle="#2378d8";context.strokeStyle="#8fd5ff";context.lineWidth=4;
    for(let index=0;index<12;index++){const angle=index/12*Math.PI*2;const sx=Math.cos(angle)*r*.88,sy=Math.sin(angle)*r*.61;context.save();context.translate(sx,sy);context.rotate(angle);context.beginPath();context.moveTo(0,-8);context.lineTo(r*.42,0);context.lineTo(0,8);context.closePath();context.fill();context.stroke();context.restore();}
    const body=context.createRadialGradient(-r*.24,-r*.30,4,0,0,r*1.15);body.addColorStop(0,"#91dcff");body.addColorStop(.45,"#3f9af0");body.addColorStop(1,"#1b5fae");context.fillStyle=body;context.strokeStyle=enemy.hit>0?"#ffffff":"#aee5ff";context.lineWidth=5;context.beginPath();context.ellipse(0,0,r*1.04,r*.78,0,0,Math.PI*2);context.fill();context.stroke();
    context.fillStyle="#0b2444";context.beginPath();context.ellipse(-r*.30,-r*.12,8,12,-.18,0,Math.PI*2);context.ellipse(r*.30,-r*.12,8,12,.18,0,Math.PI*2);context.fill();
    context.strokeStyle="#0b2444";context.lineWidth=5;context.beginPath();context.moveTo(-r*.20,r*.22);context.quadraticCurveTo(0,r*.35,r*.20,r*.22);context.stroke();
    context.font="900 18px system-ui,sans-serif";context.textAlign="center";context.fillStyle="#eaf8ff";context.strokeStyle="rgba(0,0,0,.55)";context.lineWidth=4;context.strokeText("∞ HP",0,-r-18);context.fillText("∞ HP",0,-r-18);
    context.restore();
  };

  const previousDrawEffect = proto.drawEffect;
  proto.drawEffect = function drawEffectV094(context, effect) {
    if (effect?.type !== "dummyHitV094") return previousDrawEffect.call(this, context, effect);
    const alpha = Math.max(0,1-effect.t/effect.life);
    context.save();context.globalAlpha=alpha;context.strokeStyle="#bfeaff";context.lineWidth=5;context.beginPath();context.arc(effect.x,effect.y,70+(1-alpha)*38,0,Math.PI*2);context.stroke();context.restore();
  };

  const previousDrawWorld = proto.drawWorld;
  proto.drawWorld = function drawWorldV094(context) {
    const result = previousDrawWorld.call(this, context);
    if (Number(this.stage?.world) !== 2 || !this.player) return result;
    const low = UI.save?.settings?.effectQuality === "low" || matchMedia("(max-width:520px)").matches;
    const zoom = this.zoom || 1;
    const screenX = this.w/2 + (this.player.x-this.camera.x)*zoom;
    const screenY = this.h/2 + (this.player.y-this.camera.y)*zoom;
    context.save();
    if (!low) {
      context.globalCompositeOperation="screen";
      const warm=context.createRadialGradient(screenX,screenY,12,screenX,screenY,285);
      warm.addColorStop(0,"rgba(255,224,157,.16)");warm.addColorStop(.45,"rgba(255,194,108,.07)");warm.addColorStop(1,"rgba(255,190,100,0)");
      context.fillStyle=warm;context.fillRect(0,0,this.w,this.h);
    }
    context.globalCompositeOperation="source-over";
    const darkness=context.createRadialGradient(screenX,screenY,low?82:96,screenX,screenY,low?315:410);
    darkness.addColorStop(0,"rgba(8,6,10,0)");darkness.addColorStop(.52,"rgba(8,6,10,.08)");darkness.addColorStop(1,low?"rgba(8,6,10,.34)":"rgba(8,6,10,.46)");
    context.fillStyle=darkness;context.fillRect(0,0,this.w,this.h);context.restore();
    return result;
  };
}

installStages();
ensureCss();
patchUi();
bindSelectorEvents();
patchGame();
ensureWorldScreen();
window.addEventListener("resize", () => scheduleRender());
window.addEventListener("cherrift:languagechange", () => scheduleRender(true));

window.CHERRIFT_V094 = {
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  stages,
  renderWorld:renderWorldSelector,
  generateWorldMap
};
console.info("[CHERRIFT] v0.9.3.4 World, map, HP drop and Training update loaded.");
})();
