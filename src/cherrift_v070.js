(() => {
"use strict";

const VERSION = "0.7.0-arsenal-enhancement";
const DISPLAY_VERSION = "v0.7.0";
const SAVE_SCHEMA = 7;
const BETA_STAR_CAP = 2;
const SLOT_ORDER = ["Weapon", "Helmet", "Armor", "Gloves", "Boots", "Ring", "Necklace"];
const SLOT_ICONS = { Weapon:"⚔", Helmet:"⛑", Armor:"🛡", Gloves:"🧤", Boots:"🥾", Ring:"◉", Necklace:"◇" };
const STONE_ORDER = ["copper", "iron", "steel", "silver", "royal", "magical"];
const RARITY_INDEX = { Common:0, Uncommon:1, Rare:2, Epic:3, Legendary:4 };
const RARITY_SCRAP = { Common:2, Uncommon:4, Rare:8, Epic:18, Legendary:40 };
const STAR_LEVEL_CAP = { 1:10, 2:25, 3:50, 4:100, 5:100 };
const STAT_LABELS = {
  damage:"Attack", maxHp:"HP", armor:"Armor", crit:"Critical Rate",
  critDamage:"Critical Damage", attackSpeed:"Attack Speed", moveSpeed:"Move Speed",
  regen:"HP Regen", pickup:"Pickup Range"
};

const COPY = {
  hu: {
    arsenal:"Arsenal", subtitle:"A slotot fejleszted, nem az egyes geart.", backGear:"Vissza a Gearhez",
    materials:"Anyagok", levelUp:"SZINTLÉPÉS", starUp:"CSILLAGOZÁS", max:"MAX",
    betaCap:"A tesztbuildben a maximum 2★ és Lv.25.", effective:"Hatékony bónusz",
    next:"Következő", cost:"Költség", notEnough:"Nincs elég alapanyag.", upgraded:"Arsenal fejlesztve",
    starred:"Arsenal csillagozva", salvage:"Leggyengébb bontása", merge:"3 gear összeolvasztása",
    noGear:"Nincs bontható gear ebben a slotban.", needThree:"Legalább 3 zárolatlan gear kell ugyanebben a slotban.",
    salvaged:"Gear lebontva", merged:"3 gearből Merge Core készült", slotCore:"Slot Core",
    gearScrap:"Gear Scrap", testerDrop:"Arsenal anyag", currentStats:"Aktuális slot stat-szorzó",
    levelLocked:"Előbb csillagozd az Arsenalt.", futureStars:"A 3–5★ későbbi frissítésben nyílik meg.",
    arsenalLevel:"Arsenal szint", gearSync:"Minden ilyen slotú gear automatikusan ezt a szintet használja.",
    openArsenal:"ARSENAL", titleHint:"A Gear slotok hosszú távú fejlesztése"
  },
  en: {
    arsenal:"Arsenal", subtitle:"Upgrade the slot, not each individual gear item.", backGear:"Back to Gear",
    materials:"Materials", levelUp:"LEVEL UP", starUp:"STAR UP", max:"MAX",
    betaCap:"This test build caps Arsenal at 2★ and Lv.25.", effective:"Effective bonus",
    next:"Next", cost:"Cost", notEnough:"Not enough materials.", upgraded:"Arsenal upgraded",
    starred:"Arsenal starred up", salvage:"Salvage weakest", merge:"Merge 3 gear items",
    noGear:"No salvageable gear in this slot.", needThree:"You need at least 3 unlocked gear items in this slot.",
    salvaged:"Gear salvaged", merged:"3 gear items converted into a Merge Core", slotCore:"Slot Core",
    gearScrap:"Gear Scrap", testerDrop:"Arsenal material", currentStats:"Current slot stat multiplier",
    levelLocked:"Star up the Arsenal first.", futureStars:"Stars 3–5 unlock in a later update.",
    arsenalLevel:"Arsenal level", gearSync:"Every gear item in this slot automatically uses this level.",
    openArsenal:"ARSENAL", titleHint:"Long-term progression for every Gear slot"
  }
};

const id = name => document.getElementById(name);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

if (!window.CherriftStorage || !window.UI || !window.CHERRIFT_DATA || !window.CHERRIFT_V050) {
  console.error("[CHERRIFT v0.7] Required progression systems are missing.");
  return;
}

function language() {
  return window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu";
}
function t(key) { return COPY[language()][key] || COPY.en[key] || key; }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function round1(value) { return Math.round(Number(value || 0) * 10) / 10; }
function cloneStats(stats) {
  const out = {};
  for (const [key, value] of Object.entries(stats || {})) out[key] = Number(value || 0);
  return out;
}
function emptySlotState() { return { level:1, stars:1, salvageCount:0 }; }
function emptyMaterials() {
  return {
    gearScrap:0,
    stones:{ copper:0, iron:0, steel:0, silver:0, royal:0, magical:0 },
    slotCores:Object.fromEntries(SLOT_ORDER.map(slot => [slot, 0]))
  };
}
function normalizeMaterials(value) {
  const base = emptyMaterials();
  const source = value && typeof value === "object" ? value : {};
  base.gearScrap = Math.max(0, Math.floor(Number(source.gearScrap) || 0));
  for (const key of STONE_ORDER) base.stones[key] = Math.max(0, Math.floor(Number(source.stones?.[key]) || 0));
  for (const slot of SLOT_ORDER) base.slotCores[slot] = Math.max(0, Math.floor(Number(source.slotCores?.[slot]) || 0));
  return base;
}
function normalizeSlotState(value) {
  const out = { ...emptySlotState(), ...(value && typeof value === "object" ? value : {}) };
  out.stars = clamp(Math.floor(Number(out.stars) || 1), 1, 5);
  out.level = clamp(Math.floor(Number(out.level) || 1), 1, STAR_LEVEL_CAP[out.stars] || 100);
  out.salvageCount = Math.max(0, Math.floor(Number(out.salvageCount) || 0));
  return out;
}
function slotState(save, slot) {
  normalize(save);
  return save.arsenal.slots[slot];
}
function arsenalMultiplier(state) {
  const level = Math.max(1, Number(state?.level) || 1);
  const stars = Math.max(1, Number(state?.stars) || 1);
  return 1 + (level - 1) * 0.045 + (stars - 1) * 0.10;
}
function captureIntrinsicStats(item) {
  if (!item || typeof item !== "object") return item;
  if (!item.baseStats || typeof item.baseStats !== "object" || !Object.keys(item.baseStats).length) {
    item.baseStats = cloneStats(item.stats);
  }
  if (!item.rollLevel) item.rollLevel = Math.max(1, Math.floor(Number(item.itemLevel) || 1));
  return item;
}
function syncItemToArsenal(item, save) {
  if (!item || !SLOT_ORDER.includes(item.slot)) return item;
  captureIntrinsicStats(item);
  const state = save.arsenal.slots[item.slot];
  const multiplier = arsenalMultiplier(state);
  item.stats = Object.fromEntries(Object.entries(item.baseStats).map(([key, value]) => [key, round1(Number(value || 0) * multiplier)]));
  item.itemLevel = state.level;
  item.arsenalStars = state.stars;
  item.arsenalMultiplier = round1(multiplier * 100) / 100;
  return item;
}
function syncAllItems(save) {
  for (const item of save.inventory || []) syncItemToArsenal(item, save);
  for (const item of Object.values(save.equipped || {})) syncItemToArsenal(item, save);
  return save;
}
function normalize(save) {
  const out = save && typeof save === "object" ? save : {};
  out.schemaVersion = Math.max(SAVE_SCHEMA, Number(out.schemaVersion) || 0);
  out.bag = out.bag && typeof out.bag === "object" ? out.bag : {};
  out.bag.materials = normalizeMaterials(out.bag.materials);
  out.arsenal = out.arsenal && typeof out.arsenal === "object" ? out.arsenal : {};
  out.arsenal.slots = out.arsenal.slots && typeof out.arsenal.slots === "object" ? out.arsenal.slots : {};
  for (const slot of SLOT_ORDER) out.arsenal.slots[slot] = normalizeSlotState(out.arsenal.slots[slot]);
  out.inventory = Array.isArray(out.inventory) ? out.inventory.filter(Boolean) : [];
  out.equipped = out.equipped && typeof out.equipped === "object" ? out.equipped : {};
  syncAllItems(out);
  return out;
}

function patchStorage() {
  if (CherriftStorage.__v070Arsenal) return;
  const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  const previousLoad = CherriftStorage.load.bind(CherriftStorage);
  const previousSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.defaults = () => normalize(previousDefaults());
  CherriftStorage.load = () => normalize(previousLoad());
  CherriftStorage.save = save => previousSave(normalize(save));
  CherriftStorage.__v070Arsenal = true;
}

function addGearFamilies() {
  CHERRIFT_DATA.gearTypes.Golden ||= {
    label:"Golden", role:"Luck / Economy", emoji:"🟡",
    stats:["crit", "pickup", "moveSpeed", "attackSpeed"]
  };
  CHERRIFT_DATA.gearTypes.Violet ||= {
    label:"Violet", role:"Skill / Critical", emoji:"🟣",
    stats:["damage", "crit", "critDamage", "attackSpeed"]
  };
}

function levelCap(state) { return STAR_LEVEL_CAP[state.stars] || 100; }
function stoneForTargetLevel(targetLevel) {
  if (targetLevel <= 10) return "copper";
  if (targetLevel <= 25) return "iron";
  if (targetLevel <= 50) return "steel";
  if (targetLevel <= 75) return "silver";
  if (targetLevel <= 100) return "royal";
  return "magical";
}
function levelCost(state) {
  const target = state.level + 1;
  const stone = stoneForTargetLevel(target);
  return {
    target,
    coins: Math.floor(90 + Math.pow(target, 1.62) * 34),
    stone,
    stones: Math.ceil(1 + target * 0.55),
    scrap: target >= 6 ? Math.ceil(target * 0.32) : 0
  };
}
function starCost(state, slot) {
  const nextStars = state.stars + 1;
  return {
    nextStars,
    coins: Math.floor(1800 * Math.pow(state.stars, 1.8)),
    cores: state.stars,
    scrap: 15 * state.stars,
    stone: stoneForTargetLevel(levelCap(state)),
    stones: 12 * state.stars,
    slot
  };
}
function hasLevelCost(save, cost) {
  const mat = save.bag.materials;
  return save.coins >= cost.coins && mat.stones[cost.stone] >= cost.stones && mat.gearScrap >= cost.scrap;
}
function hasStarCost(save, cost) {
  const mat = save.bag.materials;
  return save.coins >= cost.coins && mat.slotCores[cost.slot] >= cost.cores && mat.gearScrap >= cost.scrap && mat.stones[cost.stone] >= cost.stones;
}
function spendLevelCost(save, cost) {
  save.coins -= cost.coins;
  save.bag.materials.stones[cost.stone] -= cost.stones;
  save.bag.materials.gearScrap -= cost.scrap;
}
function spendStarCost(save, cost) {
  save.coins -= cost.coins;
  save.bag.materials.slotCores[cost.slot] -= cost.cores;
  save.bag.materials.gearScrap -= cost.scrap;
  save.bag.materials.stones[cost.stone] -= cost.stones;
}
function saveAndRefresh(message) {
  normalize(UI.save);
  CherriftStorage.save(UI.save);
  UI.refreshMenu?.();
  UI.renderGear?.();
  renderArsenal();
  if (message) UI.toast?.(message);
}
function upgradeSlot(slot) {
  const save = normalize(UI.save);
  const state = save.arsenal.slots[slot];
  const cap = levelCap(state);
  if (state.level >= cap) {
    UI.toast?.(state.stars >= BETA_STAR_CAP ? t("betaCap") : t("levelLocked"));
    return false;
  }
  const cost = levelCost(state);
  if (!hasLevelCost(save, cost)) { UI.toast?.(t("notEnough")); return false; }
  spendLevelCost(save, cost);
  state.level = cost.target;
  syncAllItems(save);
  saveAndRefresh(`${t("upgraded")}: ${slot} Lv.${state.level}`);
  return true;
}
function starUpSlot(slot) {
  const save = normalize(UI.save);
  const state = save.arsenal.slots[slot];
  if (state.stars >= BETA_STAR_CAP) { UI.toast?.(t("futureStars")); return false; }
  if (state.level < levelCap(state)) { UI.toast?.(t("levelLocked")); return false; }
  const cost = starCost(state, slot);
  if (!hasStarCost(save, cost)) { UI.toast?.(t("notEnough")); return false; }
  spendStarCost(save, cost);
  state.stars = cost.nextStars;
  syncAllItems(save);
  saveAndRefresh(`${t("starred")}: ${slot} ${"★".repeat(state.stars)}`);
  return true;
}
function itemPower(item) {
  return window.CHERRIFT_V050?.itemPower?.(item) || Object.values(item?.stats || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}
function salvageCandidates(save, slot) {
  return (save.inventory || []).filter(item => item?.slot === slot && !item.locked)
    .sort((a, b) => (RARITY_INDEX[a.rarity] || 0) - (RARITY_INDEX[b.rarity] || 0) || itemPower(a) - itemPower(b));
}
function salvageWeakest(slot) {
  const save = normalize(UI.save);
  const item = salvageCandidates(save, slot)[0];
  if (!item) { UI.toast?.(t("noGear")); return false; }
  const index = save.inventory.findIndex(entry => entry.id === item.id);
  if (index < 0) return false;
  save.inventory.splice(index, 1);
  const scrap = RARITY_SCRAP[item.rarity] || 2;
  const state = save.arsenal.slots[slot];
  save.bag.materials.gearScrap += scrap;
  state.salvageCount += 1;
  let core = 0;
  if (state.salvageCount % 3 === 0) {
    save.bag.materials.slotCores[slot] += 1;
    core = 1;
  }
  const stone = stoneForTargetLevel(Math.max(2, Number(item.rollLevel) || 1));
  const stoneGain = Math.max(1, Math.floor((RARITY_INDEX[item.rarity] || 0) / 2) + 1);
  save.bag.materials.stones[stone] += stoneGain;
  saveAndRefresh(`${t("salvaged")}: +${scrap} ${t("gearScrap")}${core ? ` · +1 ${t("slotCore")}` : ""}`);
  return true;
}
function mergeThree(slot) {
  const save = normalize(UI.save);
  const candidates = salvageCandidates(save, slot).slice(0, 3);
  if (candidates.length < 3) { UI.toast?.(t("needThree")); return false; }
  const ids = new Set(candidates.map(item => item.id));
  save.inventory = save.inventory.filter(item => !ids.has(item.id));
  save.bag.materials.slotCores[slot] += 1;
  save.bag.materials.gearScrap += 3;
  saveAndRefresh(`${t("merged")}: ${slot}`);
  return true;
}

function grantStageMaterials(game) {
  const save = normalize(game.save || UI.save);
  const world = Math.max(1, Number(game.stage?.world) || 1);
  const stone = ["copper", "iron", "steel", "silver", "royal"][Math.min(4, world - 1)];
  const isBoss = !!game.stage?.boss;
  const amount = isBoss ? 4 + world : 1 + Math.floor(world / 2);
  save.bag.materials.stones[stone] += amount;
  if (isBoss) save.bag.materials.gearScrap += Math.max(2, world);
  CherriftStorage.save(save);
  game.__v070MaterialReward = { stone, amount, scrap:isBoss ? Math.max(2, world) : 0 };
}
function patchStageRewards() {
  const proto = window.CherriftGame?.prototype;
  if (!proto || proto.__v070StageRewards) return;
  const previous = proto.stageClear;
  proto.stageClear = function stageClearV070(...args) {
    const alreadyCleared = !!this.stageState?.cleared;
    const result = previous.apply(this, args);
    if (!alreadyCleared && this.stageState?.cleared) grantStageMaterials(this);
    return result;
  };
  proto.__v070StageRewards = true;

  const previousShow = UI.showStageClear?.bind(UI);
  if (previousShow) {
    UI.showStageClear = function showStageClearV070(game, info) {
      const result = previousShow(game, info);
      const reward = game.__v070MaterialReward;
      if (reward) {
        let box = id("v070StageMaterial");
        if (!box) {
          box = document.createElement("div");
          box.id = "v070StageMaterial";
          box.className = "v070-stage-material glass";
          q("#stageClearModal .stage-clear-summary")?.insertAdjacentElement("afterend", box);
        }
        box.innerHTML = `<span>${escapeHtml(t("testerDrop"))}</span><b>+${reward.amount} ${escapeHtml(reward.stone)} stone${reward.scrap ? ` · +${reward.scrap} Gear Scrap` : ""}</b>`;
      }
      return result;
    };
  }
}

function ensureCss() {
  if (id("v070css")) return;
  const link = document.createElement("link");
  link.id = "v070css";
  link.rel = "stylesheet";
  link.href = "v070.css?v=070";
  document.head.appendChild(link);
}
function ensurePanel() {
  if (id("arsenalV070")) return;
  const app = id("app");
  if (!app) return;
  const panel = document.createElement("section");
  panel.id = "arsenalV070";
  panel.className = "panel hidden arsenal-v070";
  panel.setAttribute("data-i18n-ignore", "true");
  panel.innerHTML = `
    <header class="arsenal-head-v070">
      <button type="button" data-v070-open="gear" class="arsenal-back-v070">←</button>
      <div><small>CHERRIFT · ${DISPLAY_VERSION}</small><h1>${t("arsenal")}</h1><p>${t("subtitle")}</p></div>
      <div class="arsenal-wallet-v070"><span>🪙 <b id="arsenalCoinsV070">0</b></span><span>⚙ <b id="arsenalScrapV070">0</b></span></div>
    </header>
    <div class="arsenal-note-v070">${t("betaCap")}</div>
    <main class="arsenal-grid-v070" id="arsenalGridV070"></main>
  `;
  app.appendChild(panel);
}
function ensureNavigation() {
  const railNav = q(".gear-rail-nav-v0560");
  if (railNav && !q("[data-v070-open='arsenalV070']", railNav)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.v070Open = "arsenalV070";
    button.innerHTML = `<span>✥</span><b>${t("arsenal")}</b>`;
    railNav.children[0]?.insertAdjacentElement("afterend", button);
  }
  const mainNav = q("#menu .main-nav");
  if (mainNav && !q("[data-v070-open='arsenalV070']", mainNav)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-btn arsenal-menu-v070";
    button.dataset.v070Open = "arsenalV070";
    button.innerHTML = `<span>✥</span><i>${t("openArsenal")}</i><em>${t("titleHint")}</em><b>›</b>`;
    q("[data-open='gear']", mainNav)?.insertAdjacentElement("afterend", button);
  }
  const gearHeader = q(".gear-header-v0560");
  if (gearHeader && !q(".gear-open-arsenal-v070", gearHeader)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gear-open-arsenal-v070";
    button.dataset.v070Open = "arsenalV070";
    button.textContent = `✥ ${t("arsenal")}`;
    gearHeader.appendChild(button);
  }
}
function materialSummary(save) {
  const m = save.bag.materials;
  return STONE_ORDER.slice(0, 5).map(key => `<span><i class="stone-${key}-v070"></i>${escapeHtml(key)} <b>${m.stones[key]}</b></span>`).join("");
}
function costMarkup(cost) {
  const lines = [`🪙 ${cost.coins}`, `${escapeHtml(cost.stone)} ×${cost.stones}`];
  if (cost.scrap) lines.push(`Gear Scrap ×${cost.scrap}`);
  if (cost.cores) lines.push(`${escapeHtml(cost.slot)} Core ×${cost.cores}`);
  return lines.join(" · ");
}
function slotStatsPreview(save, slot) {
  const item = save.equipped?.[slot] || save.inventory?.find(entry => entry.slot === slot);
  if (!item) return `<p class="arsenal-empty-v070">${escapeHtml(t("gearSync"))}</p>`;
  const entries = Object.entries(item.stats || {}).slice(0, 4);
  return `<div class="arsenal-stat-preview-v070">${entries.map(([key, value]) => `<span>${escapeHtml(STAT_LABELS[key] || key)} <b>+${round1(value)}</b></span>`).join("")}</div>`;
}
function renderArsenal() {
  const panel = id("arsenalV070");
  const grid = id("arsenalGridV070");
  if (!panel || !grid || !UI.save) return;
  const save = normalize(UI.save);
  id("arsenalCoinsV070").textContent = Math.floor(save.coins || 0);
  id("arsenalScrapV070").textContent = save.bag.materials.gearScrap;
  const note = q(".arsenal-note-v070", panel);
  if (note) note.innerHTML = `<strong>${escapeHtml(t("materials"))}:</strong> ${materialSummary(save)}<small>${escapeHtml(t("betaCap"))}</small>`;

  grid.innerHTML = SLOT_ORDER.map(slot => {
    const state = save.arsenal.slots[slot];
    const cap = levelCap(state);
    const multiplier = arsenalMultiplier(state);
    const level = levelCost(state);
    const star = starCost(state, slot);
    const levelDisabled = state.level >= cap;
    const starDisabled = state.stars >= BETA_STAR_CAP || state.level < cap;
    const stars = "★".repeat(state.stars) + "☆".repeat(5 - state.stars);
    return `
      <article class="arsenal-card-v070" data-v070-slot-card="${slot}">
        <header><span>${SLOT_ICONS[slot]}</span><div><small>${escapeHtml(slot)} Arsenal</small><h2>Lv.${state.level} · ${stars}</h2></div></header>
        <div class="arsenal-level-track-v070"><i style="width:${Math.min(100, state.level / cap * 100)}%"></i></div>
        <div class="arsenal-mult-v070"><span>${escapeHtml(t("currentStats"))}</span><b>×${multiplier.toFixed(3)}</b></div>
        ${slotStatsPreview(save, slot)}
        <div class="arsenal-cost-v070"><small>${escapeHtml(t("next"))}: Lv.${Math.min(cap, state.level + 1)}</small><p>${levelDisabled ? escapeHtml(t("max")) : costMarkup(level)}</p></div>
        <div class="arsenal-actions-v070">
          <button type="button" data-v070-level="${slot}" ${levelDisabled ? "disabled" : ""}>${escapeHtml(levelDisabled ? t("max") : t("levelUp"))}</button>
          <button type="button" data-v070-star="${slot}" ${starDisabled ? "disabled" : ""}>${escapeHtml(t("starUp"))}<small>${costMarkup(star)}</small></button>
        </div>
        <div class="arsenal-recycle-v070">
          <button type="button" data-v070-salvage="${slot}">${escapeHtml(t("salvage"))}</button>
          <button type="button" data-v070-merge="${slot}">${escapeHtml(t("merge"))}</button>
          <small>${escapeHtml(t("slotCore"))}: ${save.bag.materials.slotCores[slot]} · Salvage ${state.salvageCount}/3</small>
        </div>
      </article>`;
  }).join("");
}
function showArsenal() {
  ensurePanel();
  ensureNavigation();
  id("menu")?.classList.add("hidden");
  qa("#app > .panel").forEach(panel => panel.classList.add("hidden"));
  id("arsenalV070")?.classList.remove("hidden");
  document.body.classList.remove("is-playing");
  renderArsenal();
}
function patchNavigation() {
  if (UI.__v070Navigation) return;
  const previousOpen = UI.open.bind(UI);
  UI.open = function openV070(panel, ...args) {
    if (panel === "arsenalV070") {
      previousOpen("menu");
      showArsenal();
      return;
    }
    id("arsenalV070")?.classList.add("hidden");
    return previousOpen(panel, ...args);
  };
  UI.__v070Navigation = true;

  document.addEventListener("click", event => {
    const open = event.target.closest?.("[data-v070-open]");
    if (open) { event.preventDefault(); UI.open(open.dataset.v070Open); return; }
    const level = event.target.closest?.("[data-v070-level]");
    if (level) { event.preventDefault(); upgradeSlot(level.dataset.v070Level); return; }
    const star = event.target.closest?.("[data-v070-star]");
    if (star) { event.preventDefault(); starUpSlot(star.dataset.v070Star); return; }
    const salvage = event.target.closest?.("[data-v070-salvage]");
    if (salvage) { event.preventDefault(); salvageWeakest(salvage.dataset.v070Salvage); return; }
    const merge = event.target.closest?.("[data-v070-merge]");
    if (merge) { event.preventDefault(); mergeThree(merge.dataset.v070Merge); }
  }, true);
}

function patchUi() {
  if (UI.__v070ArsenalUi) return;
  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV070(save, game) {
      normalize(save);
      const result = previousInit(save, game);
      ensurePanel(); ensureNavigation(); updateVersion(); renderArsenal();
      return result;
    };
  }
  const previousRenderGear = UI.renderGear?.bind(UI);
  if (previousRenderGear) {
    UI.renderGear = function renderGearV070(...args) {
      if (this.save) normalize(this.save);
      const result = previousRenderGear(...args);
      ensureNavigation();
      qa("[data-v0560-slot]").forEach(button => {
        const slot = button.dataset.v0560Slot;
        const state = this.save?.arsenal?.slots?.[slot];
        if (!state || q(".arsenal-badge-v070", button)) return;
        button.insertAdjacentHTML("beforeend", `<i class="arsenal-badge-v070">A${state.level} · ${state.stars}★</i>`);
      });
      qa("#gearInventoryGridV0560 [data-v0560-item-id]").forEach(button => {
        const item = [...(this.save?.inventory || []), ...Object.values(this.save?.equipped || {})].find(entry => entry?.id === button.dataset.v0560ItemId);
        if (!item || q(".arsenal-item-badge-v070", button)) return;
        button.insertAdjacentHTML("beforeend", `<i class="arsenal-item-badge-v070">Lv.${item.itemLevel || 1}</i>`);
      });
      return result;
    };
  }
  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV070(...args) {
      if (this.save) normalize(this.save);
      const result = previousRefresh(...args);
      ensureNavigation(); updateVersion();
      return result;
    };
  }
  UI.__v070ArsenalUi = true;
}
function updateVersion() {
  document.title = `CHERRIFT ${DISPLAY_VERSION} – ARSENAL UPDATE`;
  const labels = [id("menuBuildVersion"), id("buildVersionV060")].filter(Boolean);
  for (const label of labels) label.textContent = `${DISPLAY_VERSION} · ARSENAL UPDATE`;
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = `${DISPLAY_VERSION} · ARSENAL UPDATE`;
  qa(".version-badge-v063, [data-v063-version]").forEach(label => { label.textContent = `${DISPLAY_VERSION} · TEST BUILD`; });
}

ensureCss();
patchStorage();
addGearFamilies();
ensurePanel();
patchNavigation();
patchStageRewards();
patchUi();
updateVersion();

window.addEventListener("cherrift:languagechange", () => {
  const panel = id("arsenalV070");
  if (panel) panel.remove();
  ensurePanel(); ensureNavigation(); renderArsenal(); updateVersion();
});

window.CHERRIFT_V070 = {
  version:VERSION,
  displayVersion:DISPLAY_VERSION,
  slots:SLOT_ORDER,
  normalize,
  syncAllItems,
  syncItemToArsenal,
  arsenalMultiplier,
  levelCost,
  starCost,
  upgradeSlot,
  starUpSlot,
  salvageWeakest,
  mergeThree,
  render:renderArsenal,
  open:showArsenal
};

console.info("[CHERRIFT] v0.7.0 Arsenal & Enhancement loaded.");
})();
