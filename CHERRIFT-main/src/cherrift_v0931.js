(() => {
"use strict";

const VERSION = "0.9.3.1-gameplay-economy-hotfix";
const CACHE_VERSION = "0931";
const FOOD_CAP = 99;
const INVENTORY_CAP = 80;
const STAR_CAP = 3;
const RARITY_INDEX = { Common:0, Uncommon:1, Rare:2, Epic:3, Legendary:4 };
const SKIN_ESSENCE = { Common:5, Uncommon:8, Rare:15, Epic:40, Legendary:100 };
const GEAR_SCRAP = { Common:2, Uncommon:4, Rare:8, Epic:18, Legendary:40 };
const ARSENAL_LEVEL_CAP = { 1:10, 2:25, 3:50, 4:100, 5:100 };
const runtime = {
  gearSource:"world",
  gearRarity:"all",
  decorating:false,
  observer:null
};

const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const count = value => Math.max(0, Math.floor(Number(value) || 0));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;

if (!window.CherriftGame || !window.CherriftStorage || !window.UI || !window.CHERRIFT_CONFIG) {
  console.error("[CHERRIFT v0.9.3.1] Required runtime systems are missing.");
  return;
}

function language() {
  return window.CHERRIFT_LOCALIZATION?.language?.() ||
    (window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu");
}

function copy(hu, en) { return language() === "en" ? en : hu; }

function deepClone(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch (_) {}
  }
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
}

function ensureCss() {
  if (id("v0931css")) return;
  const link = document.createElement("link");
  link.id = "v0931css";
  link.rel = "stylesheet";
  link.href = `v0931.css?v=${CACHE_VERSION}`;
  document.head.appendChild(link);
}

function suppressRewardSave(save) {
  const execute = () => CherriftStorage.save(save);
  return window.CHERRIFT_REWARDS?.withSuppressed
    ? CHERRIFT_REWARDS.withSuppressed(execute)
    : execute();
}

/* -------------------------------------------------------------------------
 * Food stacks and Gacha
 * ---------------------------------------------------------------------- */
function foodCatalog() { return window.CHERRIFT_V080?.foodCatalog || {}; }

function normalizeFoodStacks(save) {
  if (!save || typeof save !== "object") return save;
  save.bag ||= {};
  save.bag.items = save.bag.items && typeof save.bag.items === "object" ? save.bag.items : {};
  for (const key of Object.keys(foodCatalog())) {
    save.bag.items[key] = clamp(count(save.bag.items[key]), 0, FOOD_CAP);
  }
  return save;
}

function patchFoodStorage() {
  if (CherriftStorage.__v0931FoodCap) return;
  const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  const previousLoad = CherriftStorage.load.bind(CherriftStorage);
  const previousSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.defaults = () => normalizeFoodStacks(previousDefaults());
  CherriftStorage.load = () => normalizeFoodStacks(previousLoad());
  CherriftStorage.save = save => {
    normalizeFoodStacks(save);
    const game = UI.game;
    const escrow = game?.__runEscrowV0931;
    const activeRun = game?.save === save && escrow && !escrow.finished && ["playing", "level", "paused"].includes(game.mode);
    if (!activeRun) return previousSave(save);
    const persisted = deepClone(save);
    restoreRewardSnapshot(persisted, escrow.committed);
    return previousSave(normalizeFoodStacks(persisted));
  };
  CherriftStorage.__v0931FoodCap = true;
}

function chestCount(save, type) {
  if (type === "common") return count(save.chests?.common) + count(save.keys);
  return count(save.chests?.[type]);
}

function consumeChest(save, type) {
  save.chests ||= {common:0, rare:0, epic:0};
  if (type === "common") {
    if (count(save.chests.common) > 0) save.chests.common--;
    else if (count(save.keys) > 0) save.keys--;
    else return false;
    return true;
  }
  if (count(save.chests[type]) <= 0) return false;
  save.chests[type]--;
  return true;
}

function highestWorld(save) {
  let world = 1;
  for (const key of Object.keys(save.clearedStages || {})) {
    world = Math.max(world, Number(key.match(/world_(\d+)/)?.[1]) || 1);
  }
  return world;
}

function randomFrom(list) { return list.length ? list[Math.floor(Math.random() * list.length)] : null; }

function randomSkin(rarity) {
  return randomFrom((window.CHERRIFT_DATA?.skins || []).filter(skin => skin.rarity === rarity));
}

function eligibleFoods(save, chestType) {
  const allowed = chestType === "common"
    ? new Set(["Common"])
    : chestType === "rare"
      ? new Set(["Common", "Rare"])
      : new Set(["Rare", "Epic", "Legendary"]);
  return Object.entries(foodCatalog()).filter(([key, food]) =>
    allowed.has(food?.rarity || "Common") && count(save.bag?.items?.[key]) < FOOD_CAP
  );
}

function grantFood(save, chestType) {
  const options = eligibleFoods(save, chestType);
  const selected = randomFrom(options);
  if (!selected) return null;
  const [itemId, food] = selected;
  const current = count(save.bag.items[itemId]);
  const requested = chestType === "epic" ? 2 : 1;
  const amount = Math.max(1, Math.min(requested, FOOD_CAP - current));
  save.bag.items[itemId] = current + amount;
  return {
    kind:"food", rarity:food.rarity || "Common", amount, itemId,
    label:food.name || itemId.replaceAll("_", " "), asset:food.asset || "", icon:food.icon || "✦"
  };
}

function grantSkin(save, rarity) {
  save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
  const skin = randomSkin(rarity);
  if (!skin) {
    const amount = SKIN_ESSENCE[rarity] || 5;
    save.sakuraEssence = count(save.sakuraEssence) + amount;
    return {kind:"essence", rarity, amount, label:"Sakura Essence"};
  }
  if (save.unlockedSkins.includes(skin.id)) {
    const amount = SKIN_ESSENCE[rarity] || 5;
    save.sakuraEssence = count(save.sakuraEssence) + amount;
    return {
      kind:"duplicateSkin", rarity, amount, skinId:skin.id,
      label:skin.name, asset:skin.icon || skin.splash || "", icon:skin.emoji || "🐰"
    };
  }
  save.unlockedSkins.push(skin.id);
  return {kind:"skin", rarity, skinId:skin.id, label:skin.name, asset:skin.icon || skin.splash || "", icon:skin.emoji || "🐰"};
}

function grantGear(save, rarity, world) {
  if (!window.CHERRIFT_V050?.createGear) return grantSkin(save, rarity === "Epic" ? "Rare" : "Common");
  runtime.gearSource = "gacha";
  let item;
  try { item = CHERRIFT_V050.createGear(Math.max(world, rarity === "Epic" ? 3 : 1), rarity); }
  finally { runtime.gearSource = "world"; }
  window.CHERRIFT_V070?.syncItemToArsenal?.(item, save);
  save.bag ||= {};
  save.bag.materials ||= {gearScrap:0, stones:{}, slotCores:{}};
  if ((save.inventory || []).length >= INVENTORY_CAP) {
    const amount = GEAR_SCRAP[item?.rarity] || 2;
    save.bag.materials.gearScrap = count(save.bag.materials.gearScrap) + amount;
    return {kind:"scrap", rarity:item?.rarity || rarity, amount, label:"Gear Scrap", item};
  }
  save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
  save.inventory.push(item);
  save.lootStats ||= {};
  save.lootStats.totalDrops = count(save.lootStats.totalDrops) + 1;
  if (item.rarity === "Rare") save.lootStats.rareDrops = count(save.lootStats.rareDrops) + 1;
  if (item.rarity === "Epic") save.lootStats.epicDrops = count(save.lootStats.epicDrops) + 1;
  if (item.rarity === "Legendary") save.lootStats.legendaryDrops = count(save.lootStats.legendaryDrops) + 1;
  return {kind:"gear", rarity:item.rarity, amount:1, label:`${item.rarity} ${item.type} ${item.slot}`, item, icon:"⚙"};
}

function fallbackWithoutFood(save, type, world) {
  const roll = Math.random();
  if (type === "common") return roll < .78 ? grantGear(save, "Common", world) : grantSkin(save, roll < .97 ? "Common" : "Rare");
  if (type === "rare") return roll < .62 ? grantGear(save, roll < .24 ? "Common" : "Rare", world) : grantSkin(save, roll < .90 ? "Rare" : "Common");
  return roll < .72 ? grantGear(save, roll < .49 ? "Rare" : "Epic", world) : grantSkin(save, roll < .94 ? "Rare" : "Epic");
}

function rollChestReward(save, type) {
  save.gacha ||= {};
  save.gacha.pity ||= {common:0, rare:0, epic:0};
  const pityLimit = Number(window.CHERRIFT_V080?.chestDefs?.[type]?.pity) || ({common:10, rare:15, epic:25}[type] || 10);
  const pity = count(save.gacha.pity[type]) + 1;
  save.gacha.pity[type] = pity;
  const guaranteed = pity % pityLimit === 0;
  const world = highestWorld(save);
  if (guaranteed) {
    if (type === "common") return grantSkin(save, "Common");
    if (type === "rare") return grantSkin(save, "Rare");
    return Math.random() < .88 ? grantGear(save, "Epic", world) : grantSkin(save, "Epic");
  }

  const roll = Math.random();
  if (type === "common") {
    if (roll < .55) return grantGear(save, "Common", world);
    if (roll < .80) return grantFood(save, type) || fallbackWithoutFood(save, type, world);
    if (roll < .95) return grantSkin(save, "Common");
    if (roll < .99) return grantGear(save, "Rare", world);
    return grantSkin(save, "Rare");
  }
  if (type === "rare") {
    if (roll < .22) return grantGear(save, "Common", world);
    if (roll < .60) return grantGear(save, "Rare", world);
    if (roll < .85) return grantFood(save, type) || fallbackWithoutFood(save, type, world);
    if (roll < .90) return grantSkin(save, "Common");
    return grantSkin(save, "Rare");
  }
  if (roll < .42) return grantGear(save, "Rare", world);
  if (roll < .62) return grantGear(save, "Epic", world);
  if (roll < .82) return grantFood(save, type) || fallbackWithoutFood(save, type, world);
  if (roll < .88) return grantSkin(save, "Common");
  if (roll < .98) return grantSkin(save, "Rare");
  return grantSkin(save, "Epic");
}

function rewardOverlayItem(reward) {
  const assets = window.CHERRIFT_ITEM_ASSETS;
  if (reward.kind === "gear") return {
    key:`gear:${reward.item?.id || Date.now()}`, name:reward.label, amount:1,
    glyph:"⚙", rarity:reward.rarity, kind:"gear", subtitle:`Lv.${reward.item?.itemLevel || 1}`
  };
  if (reward.kind === "food") return {
    key:`food:${reward.itemId}`, name:reward.label, amount:reward.amount,
    asset:reward.asset, glyph:reward.icon, rarity:reward.rarity, kind:"buff",
    subtitle:copy(`Maximum ${FOOD_CAP} db`, `Maximum stack ${FOOD_CAP}`)
  };
  if (reward.kind === "skin") return {
    key:`skin:${reward.skinId}`, name:reward.label, amount:1,
    asset:reward.asset, glyph:reward.icon, rarity:reward.rarity, kind:"skin", subtitle:"Cherry Skin"
  };
  if (reward.kind === "scrap") return {
    key:"material:gearScrap", name:"Gear Scrap", amount:reward.amount,
    asset:assets?.currency?.gearScrap || "", glyph:"⚙", rarity:reward.rarity, kind:"material"
  };
  return {
    key:"currency:sakuraEssence", name:"Sakura Essence", amount:reward.amount,
    asset:assets?.currency?.sakuraEssence || "", glyph:"🌸", rarity:reward.rarity || "Epic", kind:"currency"
  };
}

function showNormalReward(reward) {
  if (window.CHERRIFT_REWARDS?.show) CHERRIFT_REWARDS.show([rewardOverlayItem(reward)]);
  else UI.toast?.(`${copy("Megszerezve", "Obtained")}: ${reward.label}`);
}

function duplicateArt(reward) {
  const source = typeof reward.asset === "string" && !reward.asset.includes("<") ? reward.asset : "";
  return source
    ? `<img src="${source.replaceAll('"','&quot;')}" alt="${String(reward.label).replaceAll('"','&quot;')}">`
    : `<span>${reward.icon || "🐰"}</span>`;
}

function showDuplicateExchange(reward, chestType) {
  let overlay = id("duplicateExchangeV0931");
  if (!overlay) {
    overlay = document.createElement("section");
    overlay.id = "duplicateExchangeV0931";
    overlay.className = "duplicate-exchange-v0931";
    overlay.innerHTML = `<div class="duplicate-shell-v0931"><button type="button" data-v0931-duplicate-close aria-label="Close">×</button><small id="duplicateChestV0931"></small><div id="duplicateSkinV0931" class="duplicate-skin-v0931"></div><div class="duplicate-slash-v0931"></div><h2 id="duplicateNameV0931"></h2><p id="duplicateOwnedV0931"></p><div id="duplicateRewardV0931" class="duplicate-reward-v0931"></div><button type="button" class="duplicate-continue-v0931" data-v0931-duplicate-close>${copy("FOLYTATÁS", "CONTINUE")}</button></div>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove("hit", "exchange");
  id("duplicateChestV0931").textContent = `${String(chestType).toUpperCase()} CHEST`;
  id("duplicateSkinV0931").innerHTML = duplicateArt(reward);
  id("duplicateNameV0931").textContent = reward.label;
  id("duplicateOwnedV0931").textContent = copy("Már megszerezve", "Already obtained");
  const essenceAsset = window.CHERRIFT_ITEM_ASSETS?.currency?.sakuraEssence;
  id("duplicateRewardV0931").innerHTML = `${essenceAsset ? `<img src="${essenceAsset}" alt="">` : "<span>🌸</span>"}<div><small>${copy("Átváltva erre", "Exchanged into")}</small><b>+${reward.amount} Sakura Essence</b></div>`;
  q(".duplicate-continue-v0931", overlay).textContent = copy("FOLYTATÁS", "CONTINUE");
  overlay.classList.add("open");
  window.setTimeout(() => overlay.classList.add("hit"), 420);
  window.setTimeout(() => overlay.classList.add("exchange"), 930);
}

function closeDuplicateExchange() { id("duplicateExchangeV0931")?.classList.remove("open", "hit", "exchange"); }

function openChestHotfix(type) {
  const save = normalizeFoodStacks(UI.save);
  if (!save || !["common", "rare", "epic"].includes(type)) return false;
  if (!consumeChest(save, type)) {
    UI.toast?.(copy("Nincs ilyen ládád.", "You do not own this chest."));
    return false;
  }
  const reward = rollChestReward(save, type);
  save.economy ||= {};
  save.economy.totalChestOpens = count(save.economy.totalChestOpens) + 1;
  save.gacha.history = Array.isArray(save.gacha.history) ? save.gacha.history : [];
  save.gacha.history.unshift({
    type,
    reward:{kind:reward.kind, rarity:reward.rarity, label:reward.label, amount:reward.amount || 0},
    at:Date.now()
  });
  save.gacha.history = save.gacha.history.slice(0, 50);
  suppressRewardSave(save);
  UI.refreshMenu?.();
  window.CHERRIFT_V080?.render?.();
  if (reward.kind === "duplicateSkin") showDuplicateExchange(reward, type);
  else showNormalReward(reward);
  return true;
}

/* -------------------------------------------------------------------------
 * Gear rolls, rarity filter and Arsenal costs
 * ---------------------------------------------------------------------- */
function downgradeGearItem(item, rarity) {
  if (!item || !rarity || item.rarity === rarity) return item;
  const rarityMult = {Common:1, Uncommon:1.35, Rare:1.8, Epic:2.4, Legendary:3.15};
  const ratio = (rarityMult[rarity] || 1) / (rarityMult[item.rarity] || 1);
  const source = item.baseStats && Object.keys(item.baseStats).length ? item.baseStats : item.stats;
  item.rarity = rarity;
  item.baseStats = Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, round1(Number(value || 0) * ratio)]));
  item.stats = deepClone(item.baseStats);
  return item;
}

function balanceGearItem(item) {
  if (!item || item.balanceVersion === CACHE_VERSION) return item;
  const tierRoll = Math.random();
  const multipliers = {
    Common: .86 + tierRoll * .08,
    Uncommon: .84 + tierRoll * .08,
    Rare: .82 + tierRoll * .08,
    Epic: tierRoll < .42 ? .80 : tierRoll < .82 ? .87 : .94,
    Legendary: tierRoll < .42 ? .74 : tierRoll < .82 ? .82 : .92
  };
  const multiplier = multipliers[item.rarity] || .86;
  const source = item.baseStats && Object.keys(item.baseStats).length ? item.baseStats : item.stats;
  item.baseStats = Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, round1(Number(value || 0) * multiplier)]));
  item.stats = deepClone(item.baseStats);
  item.rollQualityV0931 = tierRoll < .42 ? "low" : tierRoll < .82 ? "standard" : "high";
  item.balanceVersion = CACHE_VERSION;
  return item;
}

function patchGearGenerator() {
  if (!window.CHERRIFT_V050?.createGear || CHERRIFT_V050.createGear.__v0931Balanced) return;
  const previous = CHERRIFT_V050.createGear;
  const balanced = function createGearV0931(world = 1, forcedRarity = null, forcedSlot = null) {
    let item = previous(world, forcedRarity, forcedSlot);
    if (!item) return item;
    const earlyWorld = Math.max(1, Number(world) || 1);
    if (runtime.gearSource !== "gacha") {
      const epicDowngrade = item.rarity === "Epic" && earlyWorld <= 2 && Math.random() < .72;
      const legendaryDowngrade = item.rarity === "Legendary" && earlyWorld <= 3 && Math.random() < .86;
      if (epicDowngrade) item = previous(world, "Rare", forcedSlot || item.slot);
      else if (legendaryDowngrade) item = previous(world, Math.random() < .76 ? "Rare" : "Epic", forcedSlot || item.slot);
    }

    return balanceGearItem(item);
  };
  balanced.__v0931Balanced = true;
  CHERRIFT_V050.createGear = balanced;

  const proto = CherriftGame.prototype;
  if (!proto.__v0931GearDrops) {
    const previousDamageEnemy = proto.damageEnemy;
    proto.damageEnemy = function damageEnemyGearBalanceV0931(enemy, damage) {
      const beforeIds = new Set((this.save?.inventory || []).map(item => item?.id).filter(Boolean));
      const result = previousDamageEnemy.call(this, enemy, damage);
      if (!enemy?.dead || !this.save) return result;
      const world = Math.max(1, Number(this.stage?.world) || 1);
      const added = (this.save.inventory || []).filter(item => item?.id && !beforeIds.has(item.id));
      if (!added.length) return result;
      for (const item of added) {
        if (item.rarity === "Epic" && world <= 2 && Math.random() < .72) downgradeGearItem(item, "Rare");
        else if (item.rarity === "Legendary" && world <= 3 && Math.random() < .86) downgradeGearItem(item, Math.random() < .76 ? "Rare" : "Epic");
        balanceGearItem(item);
        window.CHERRIFT_V070?.syncItemToArsenal?.(item, this.save);
      }
      suppressRewardSave(this.save);
      return result;
    };
    proto.__v0931GearDrops = true;
  }
}

function ensureGearRarityFilters() {
  const base = id("gearFiltersV0560");
  if (!base || id("gearRarityFiltersV0931")) return;
  const nav = document.createElement("nav");
  nav.id = "gearRarityFiltersV0931";
  nav.className = "gear-rarity-filters-v0931";
  nav.innerHTML = `<small>${copy("RITKASÁG", "RARITY")}</small><button type="button" data-v0931-gear-rarity="all" class="active">${copy("Összes", "All")}</button><button type="button" data-v0931-gear-rarity="Common">Common</button><button type="button" data-v0931-gear-rarity="Rare">Rare</button>`;
  base.insertAdjacentElement("afterend", nav);
}

function applyGearRarityFilter() {
  ensureGearRarityFilters();
  qa("[data-v0931-gear-rarity]").forEach(button => button.classList.toggle("active", button.dataset.v0931GearRarity === runtime.gearRarity));
  qa("#gearInventoryGridV0560 .gear-item-v0560").forEach(card => {
    const visible = runtime.gearRarity === "all" || card.classList.contains(`rarity-${runtime.gearRarity.toLowerCase()}`);
    card.classList.toggle("rarity-hidden-v0931", !visible);
  });
}

function arsenalCost(state) {
  const original = window.CHERRIFT_V070?.levelCost?.(state) || {};
  const target = Math.max(2, Number(original.target) || count(state?.level) + 1);
  return {
    target,
    coins:Math.floor((Number(original.coins) || 100) * 1.12 + target * 22),
    stone:target <= 5 ? "copper" : (original.stone || "copper"),
    stones:Math.max(1, Number(original.stones) || 1, Math.ceil(1 + target * .65)),
    scrap:target <= 6
      ? ({2:10,3:12,4:15,5:18,6:22}[target] || 10)
      : Math.ceil(22 + (target - 6) * 3.2 + Math.pow(target - 6, 1.22))
  };
}

function arsenalCostText(cost) {
  return `🪙 ${cost.coins} · ${cost.stone} ×${cost.stones} · Gear Scrap ×${cost.scrap}`;
}

function decorateArsenalCosts() {
  if (!window.CHERRIFT_V070 || !UI.save?.arsenal?.slots) return;
  qa(".arsenal-card-v070[data-v070-slot-card]").forEach(card => {
    const slot = card.dataset.v070SlotCard;
    const state = UI.save.arsenal.slots[slot];
    if (!state) return;
    const cap = ARSENAL_LEVEL_CAP[state.stars] || 100;
    if (state.level >= cap) return;
    const target = q(".arsenal-cost-v070 p", card);
    if (target) target.textContent = arsenalCostText(arsenalCost(state));
  });
}

function upgradeArsenalHotfix(slot) {
  const api = window.CHERRIFT_V070;
  const save = api?.normalize?.(UI.save);
  const state = save?.arsenal?.slots?.[slot];
  if (!save || !state) return false;
  const cap = ARSENAL_LEVEL_CAP[state.stars] || 100;
  if (state.level >= cap) return false;
  const cost = arsenalCost(state);
  const materials = save.bag.materials;
  if (count(save.coins) < cost.coins || count(materials.stones?.[cost.stone]) < cost.stones || count(materials.gearScrap) < cost.scrap) {
    UI.toast?.(copy("Nincs elég Coin, kő vagy Gear Scrap.", "Not enough Coins, stones or Gear Scrap."));
    return false;
  }
  save.coins -= cost.coins;
  materials.stones[cost.stone] -= cost.stones;
  materials.gearScrap -= cost.scrap;
  state.level = cost.target;
  api.syncAllItems?.(save);
  suppressRewardSave(save);
  UI.refreshMenu?.();
  UI.renderGear?.();
  api.render?.();
  decorateArsenalCosts();
  UI.toast?.(`${copy("Arsenal fejlesztve", "Arsenal upgraded")}: ${slot} Lv.${state.level}`);
  return true;
}

/* -------------------------------------------------------------------------
 * Succubus combat polish
 * ---------------------------------------------------------------------- */
function nearestLiving(game, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of game.enemies || []) {
    if (!enemy || enemy.dead) continue;
    const distance = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
    if (distance < bestDistance) { best = enemy; bestDistance = distance; }
  }
  return best;
}

function spawnSuccubusBullet(game, options) {
  game.bullets.push({
    customV0553:true,
    customV0931:true,
    x:game.player.x,
    y:game.player.y - 8,
    life:1,
    hitIds:new Set(),
    ...options
  });
}

function patchSuccubusCombat() {
  const proto = CherriftGame.prototype;
  if (proto.__v0931Succubus) return;
  proto.__v0931Succubus = true;

  const previousStart = proto.start;
  proto.start = async function startSuccubusV0931(...args) {
    const result = await previousStart.apply(this, args);
    if (this.player?.skin === "succubus_cherry") {
      this.player.projectileCount = 1;
      this.player.soulShield = Math.max(0, Number(this.player.soulShield) || 0);
      this.player.soulShieldMax = Math.max(0, Number(this.player.soulShieldMax) || 0);
      this.player.__shieldSeenV0931 = this.player.soulShield;
    }
    return result;
  };

  const previousAutoFire = proto.autoFire;
  proto.autoFire = function autoFireSuccubusV0931() {
    const player = this.player;
    if (!player || player.skin !== "succubus_cherry") return previousAutoFire.call(this);
    const interval = player.fireInterval * (player.skillBuff > 0 ? .55 : 1);
    if (player.fireTimer > 0 || player.skillCastTimer > 0) return;
    const enemy = this.nearest?.(720) || nearestLiving(this, player.x, player.y);
    if (!enemy) return;
    player.fireTimer = interval;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    spawnSuccubusBullet(this, {
      vx:dx / length * 430,
      vy:dy / length * 430,
      r:17,
      dmg:player.damage * 1.08,
      life:.62,
      style:"succubus_claw",
      drainRate:.05,
      pierce:1,
      angle:Math.atan2(dy, dx)
    });
  };

  const previousSkill = proto.skill;
  proto.skill = function skillSuccubusV0931() {
    const player = this.player;
    if (!player || player.skin !== "succubus_cherry") return previousSkill.call(this);
    if (player.skillTimer > 0) return;
    const state = this.activeSkinConfig()?.states?.skill || {};
    const duration = Number(state.duration) || .55;
    player.skillTimer = player.skillCooldown;
    player.skillCastTimer = duration;
    player.skillCastDuration = duration;
    player.skillDir = player.lastDir || "down";
    player.__succubusPhaseV0931 = {start:this.t || 0, end:(this.t || 0) + duration + .32};

    this.effects.push({type:"succubus_phase_in_v0931", x:player.x, y:player.y, t:0, life:.28});
    this.effects.push({type:"succubus_cast_v0931", x:player.x, y:player.y, t:0, life:.72, r:82});
    this.effects.push({type:"succubus_phase_out_v0931", x:player.x, y:player.y, t:-duration, life:duration + .42});

    const living = (this.enemies || []).filter(enemy => !enemy.dead);
    const soulCount = Math.min(8, Math.max(4, living.length ? Math.ceil(living.length * .75) : 4));
    for (let index = 0; index < soulCount; index++) {
      const angle = index / soulCount * Math.PI * 2 + (Math.random() - .5) * .32;
      const target = living.length ? living[(index + Math.floor(Math.random() * living.length)) % living.length] : null;
      spawnSuccubusBullet(this, {
        vx:Math.cos(angle) * 245,
        vy:Math.sin(angle) * 245,
        speed:245,
        r:8,
        dmg:player.damage * .78,
        life:2.25,
        style:"succubus_soul",
        drainRate:.10,
        shieldOnFull:true,
        target,
        turnRate:4.4,
        phase:Math.random() * Math.PI * 2,
        zigzagV0931:true
      });
    }
  };

  const previousUpdateBullets = proto.updateBullets;
  proto.updateBullets = function updateBulletsSuccubusV0931(dt) {
    for (const bullet of this.bullets || []) {
      if (!bullet?.zigzagV0931 || bullet.dead) continue;
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
      const wave = Math.sin((this.t || 0) * 12 + (bullet.phase || 0)) * 54 * dt;
      bullet.x += -bullet.vy / speed * wave;
      bullet.y += bullet.vx / speed * wave;
    }
    return previousUpdateBullets.call(this, dt);
  };

  const previousDrawPlayer = proto.drawPlayer;
  proto.drawPlayer = function drawPlayerSuccubusV0931(context, player) {
    if (player?.skin !== "succubus_cherry") return previousDrawPlayer.call(this, context, player);
    const shield = player.soulShield;
    const shieldMax = player.soulShieldMax;
    try {
      player.soulShield = 0;
      player.soulShieldMax = 0;
      context.save();
      const phase = player.__succubusPhaseV0931;
      if (phase && (this.t || 0) <= phase.end) {
        const elapsed = (this.t || 0) - phase.start;
        const fadeIn = clamp(elapsed / .16, 0, 1);
        const fadeOut = clamp((phase.end - (this.t || 0)) / .22, 0, 1);
        context.globalAlpha = Math.max(.18, Math.min(fadeIn, fadeOut));
      }
      previousDrawPlayer.call(this, context, player);
      context.restore();
    } finally {
      player.soulShield = shield;
      player.soulShieldMax = shieldMax;
    }
    if (shield > 0 && (player.__shieldFxUntilV0931 || 0) > (this.t || 0)) {
      const started = player.__shieldFxStartV0931 || (this.t || 0);
      const remaining = player.__shieldFxUntilV0931 - (this.t || 0);
      const fade = Math.min(clamp(((this.t || 0) - started) / .22, 0, 1), clamp(remaining / .38, 0, 1));
      context.save();
      context.globalAlpha = .12 + fade * .52;
      context.strokeStyle = "#6effa5";
      context.shadowColor = "#45ff91";
      context.shadowBlur = 16;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(player.x, player.y - 13, 42 + Math.sin((this.t || 0) * 5) * 2, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  };

  const previousDrawEffect = proto.drawEffect;
  proto.drawEffect = function drawEffectSuccubusV0931(context, effect) {
    if (!effect || !["succubus_phase_in_v0931", "succubus_phase_out_v0931", "succubus_cast_v0931"].includes(effect.type)) {
      return previousDrawEffect.call(this, context, effect);
    }
    if (effect.t < 0) return;
    const progress = clamp(effect.t / Math.max(.01, effect.life), 0, 1);
    const alpha = Math.sin(progress * Math.PI);
    context.save();
    context.translate(effect.x, effect.y - 8);
    context.globalAlpha = alpha;
    if (effect.type === "succubus_cast_v0931") {
      const radius = 16 + progress * (effect.r || 82);
      context.strokeStyle = "#ff5c86";
      context.shadowColor = "#ff315e";
      context.shadowBlur = 14;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(255,70,112,.16)";
      context.beginPath();
      context.arc(0, 0, radius * .72, 0, Math.PI * 2);
      context.fill();
    } else {
      const inward = effect.type === "succubus_phase_out_v0931";
      for (let index = 0; index < 10; index++) {
        const angle = index / 10 * Math.PI * 2 + (this.t || 0) * (inward ? -.8 : .8);
        const radius = inward ? 46 * (1 - progress) + 8 : 8 + progress * 46;
        context.fillStyle = index % 2 ? "#ff8aa7" : "#ffd4df";
        context.beginPath();
        context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius * .65, 3.2, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
  };
}

/* -------------------------------------------------------------------------
 * Run reward checkpoints, chapter stars and pacing
 * ---------------------------------------------------------------------- */
function rewardSnapshot(save) {
  return {
    coins:count(save.coins),
    keys:count(save.keys),
    blossomGems:count(save.blossomGems),
    sakuraEssence:count(save.sakuraEssence),
    chests:deepClone(save.chests || {}),
    inventory:deepClone(save.inventory || []),
    bag:deepClone(save.bag || {}),
    lootStats:deepClone(save.lootStats || {})
  };
}

function restoreRewardSnapshot(save, snapshot) {
  if (!save || !snapshot) return;
  save.coins = snapshot.coins;
  save.keys = snapshot.keys;
  save.blossomGems = snapshot.blossomGems;
  save.sakuraEssence = snapshot.sakuraEssence;
  save.chests = deepClone(snapshot.chests);
  save.inventory = deepClone(snapshot.inventory);
  save.bag = deepClone(snapshot.bag);
  save.lootStats = deepClone(snapshot.lootStats);
}

function firstStarReached(game) {
  const stage = game.stage;
  if (!stage) return false;
  if (stage.id === "world_1_1") return Number(game.time) >= 60;
  const raidTarget = Math.max(1, Number(stage.raidEvery) || Math.ceil(Number(stage.goalKills || 1) * .25));
  return Number(game.kills) >= Math.min(raidTarget, Number(stage.goalKills || raidTarget));
}

function runStar(game) {
  const stage = game.stage;
  if (!stage) return 0;
  if (game.stageState?.cleared || Number(game.kills) >= Number(stage.goalKills || Infinity)) return 3;
  if (Number(game.kills) >= Math.ceil(Number(stage.goalKills || 1) * .5)) return 2;
  if (firstStarReached(game)) return 1;
  return 0;
}

function updateHudStars(game) {
  if (!game?.stage) return;
  let line = id("runStarsV0931");
  const host = q("#stageHud .stage-box");
  if (!line && host) {
    line = document.createElement("span");
    line.id = "runStarsV0931";
    line.className = "run-stars-v0931";
    host.appendChild(line);
  }
  const current = game.__runEscrowV0931?.currentStar || runStar(game);
  if (line) line.textContent = `${"★".repeat(current)}${"☆".repeat(STAR_CAP - current)}`;
}

function commitRunCheckpoint(game, star, silent = false) {
  const escrow = game.__runEscrowV0931;
  const stage = game.stage;
  if (!escrow || !stage || star <= escrow.currentStar) return;
  escrow.currentStar = clamp(star, 0, STAR_CAP);
  escrow.committed = rewardSnapshot(game.save);
  escrow.committedRunCoins = Number(game.runCoins) || 0;
  game.save.stageStars ||= {};
  game.save.stageStars[stage.id] = Math.max(count(game.save.stageStars[stage.id]), escrow.currentStar);
  game.save.stageStats ||= {};
  game.save.stageStats[stage.id] ||= {clears:0, bestTime:0, bestKills:0};
  game.save.stageStats[stage.id].stars = Math.max(count(game.save.stageStats[stage.id].stars), escrow.currentStar);
  suppressRewardSave(game.save);
  updateHudStars(game);
  if (!silent && escrow.currentStar < 3) UI.toast?.(`${"★".repeat(escrow.currentStar)} · ${copy("Jutalmak biztosítva", "Rewards secured")}`);
}

function rollbackUnsecured(game) {
  const escrow = game?.__runEscrowV0931;
  if (!escrow || escrow.finished || escrow.rolledBack) return;
  restoreRewardSnapshot(game.save, escrow.committed);
  game.runCoins = Number(escrow.committedRunCoins) || 0;
  escrow.rolledBack = true;
  suppressRewardSave(game.save);
}

function decorateWorldStars() {
  if (!UI.save) return;
  qa("[data-v093-chapter]").forEach(button => {
    const stageId = button.dataset.v093Chapter;
    const stars = clamp(count(UI.save.stageStars?.[stageId] || UI.save.stageStats?.[stageId]?.stars), 0, STAR_CAP);
    let holder = q(".chapter-stars-v0931", button);
    if (!holder) {
      holder = document.createElement("i");
      holder.className = "chapter-stars-v0931";
      button.appendChild(holder);
    }
    holder.textContent = `${"★".repeat(stars)}${"☆".repeat(STAR_CAP - stars)}`;
  });
  const detail = q(".chapter-detail-v093 .chapter-title-v093");
  const selectedId = window.CHERRIFT_V093?.state?.chapterId;
  if (detail && selectedId) {
    let holder = q(".chapter-detail-stars-v0931", detail);
    if (!holder) {
      holder = document.createElement("i");
      holder.className = "chapter-detail-stars-v0931";
      detail.appendChild(holder);
    }
    const stars = clamp(count(UI.save.stageStars?.[selectedId] || UI.save.stageStats?.[selectedId]?.stars), 0, STAR_CAP);
    holder.textContent = `${"★".repeat(stars)}${"☆".repeat(STAR_CAP - stars)}`;
  }
}

function isPhoneViewport() {
  const width = window.visualViewport?.width || innerWidth || 1280;
  const height = window.visualViewport?.height || innerHeight || 720;
  return Math.min(width, height) <= 820;
}

function patchRunAndPacing() {
  const proto = CherriftGame.prototype;
  if (proto.__v0931RunBalance) return;
  proto.__v0931RunBalance = true;

  const previousStart = proto.start;
  proto.start = async function startRunV0931(...args) {
    const result = await previousStart.apply(this, args);
    if (this.player && this.stage) {
      this.__runEscrowV0931 = {
        stageId:this.stage.id,
        currentStar:0,
        committed:rewardSnapshot(this.save),
        committedRunCoins:Number(this.runCoins) || 0,
        finished:false,
        rolledBack:false
      };
      this.save.stageStars ||= {};
      this.player.projectileCount = this.player.skin === "succubus_cherry" ? 1 : this.player.projectileCount;
      updateHudStars(this);
    }
    return result;
  };

  const previousSpawn = proto.spawn;
  proto.spawn = function spawnBalancedV0931(dt) {
    if (!this.stage) return previousSpawn.call(this, dt);
    const originalMax = this.stage.maxEnemies;
    this.stage.maxEnemies = Math.max(12, Math.round((Number(originalMax) || 36) * .88));
    try { return previousSpawn.call(this, Math.max(0, dt) * .90); }
    finally { this.stage.maxEnemies = originalMax; }
  };

  const previousTriggerRaid = proto.triggerRaid;
  if (previousTriggerRaid) {
    proto.triggerRaid = function triggerRaidBalancedV0931(boss = false, ...args) {
      if (boss || !this.stage) return previousTriggerRaid.call(this, boss, ...args);
      const original = this.stage.raidCount;
      this.stage.raidCount = Math.max(6, Math.round((Number(original) || 14) * .90));
      try { return previousTriggerRaid.call(this, boss, ...args); }
      finally { this.stage.raidCount = original; }
    };
  }

  const previousSpawnEnemy = proto.spawnEnemy;
  proto.spawnEnemy = function spawnEnemyBalancedV0931(...args) {
    const before = this.enemies?.length || 0;
    const result = previousSpawnEnemy.apply(this, args);
    const world = Math.max(1, Number(this.stage?.world) || 1);
    const worldEase = 1 / (1 + Math.max(0, world - 1) * .028);
    for (const enemy of (this.enemies || []).slice(before)) {
      if (!enemy || enemy.isBoss) continue;
      enemy.speed *= .92 * worldEase;
      enemy.hp *= 1 / (1 + Math.max(0, world - 1) * .018);
      enemy.maxHp *= 1 / (1 + Math.max(0, world - 1) * .018);
    }
    return result;
  };

  const previousUpdate = proto.update;
  proto.update = function updateRunV0931(dt) {
    const result = previousUpdate.call(this, dt);
    const player = this.player;
    if (player?.skin === "succubus_cherry") {
      const shield = Math.max(0, Number(player.soulShield) || 0);
      const seen = Math.max(0, Number(player.__shieldSeenV0931) || 0);
      if (shield > seen + .01) {
        player.__shieldFxStartV0931 = this.t || 0;
        player.__shieldFxUntilV0931 = (this.t || 0) + 2.6;
      }
      player.__shieldSeenV0931 = shield;
    }
    const star = runStar(this);
    if (star > (this.__runEscrowV0931?.currentStar || 0)) commitRunCheckpoint(this, star, star === 3);
    updateHudStars(this);
    return result;
  };

  const previousStageClear = proto.stageClear;
  proto.stageClear = function stageClearStarsV0931(...args) {
    if (this.stage && !this.stageState?.cleared) {
      this.save.stageStars ||= {};
      this.save.stageStars[this.stage.id] = 3;
    }
    const result = previousStageClear.apply(this, args);
    if (this.__runEscrowV0931) {
      this.__runEscrowV0931.finished = true;
      commitRunCheckpoint(this, 3, true);
      this.__runEscrowV0931.committed = rewardSnapshot(this.save);
    }
    decorateWorldStars();
    return result;
  };

  const previousGameOver = proto.gameOver;
  proto.gameOver = function gameOverRewardsV0931(...args) {
    rollbackUnsecured(this);
    return previousGameOver.apply(this, args);
  };

  const previousDrawWorld = proto.drawWorld;
  proto.drawWorld = function drawWorldMobileZoomV0931(context) {
    const phone = isPhoneViewport();
    const originalScale = context.scale;
    const originalAlpha = context.globalAlpha;
    const originalComposite = context.globalCompositeOperation;
    let adjusted = false;
    if (phone) {
      context.scale = function scaleV0931(x, y) {
        if (!adjusted && Math.abs(Number(x) - Number(y)) < .001 && Number(x) > .8 && Number(x) < 2) {
          adjusted = true;
          return originalScale.call(this, Number(x) * .95, Number(y) * .95);
        }
        return originalScale.call(this, x, y);
      };
    }
    try {
      if (this.player?.skin === "succubus_cherry") {
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }
      return previousDrawWorld.call(this, context);
    } finally {
      context.scale = originalScale;
      context.globalAlpha = originalAlpha;
      context.globalCompositeOperation = originalComposite;
    }
  };

  const previousQuit = UI.quit?.bind(UI);
  if (previousQuit) {
    UI.quit = function quitRewardsV0931(...args) {
      rollbackUnsecured(this.game);
      return previousQuit(...args);
    };
  }
}

/* -------------------------------------------------------------------------
 * HUD and UI hooks
 * ---------------------------------------------------------------------- */
function patchHud() {
  if (UI.__v0931Hud) return;
  UI.__v0931Hud = true;
  const previousUpdateHud = UI.updateHUD?.bind(UI);
  if (previousUpdateHud) {
    UI.updateHUD = function updateHudV0931(game) {
      const result = previousUpdateHud(game);
      const player = game?.player;
      const hpBar = q("#hud .bar.hp");
      if (hpBar && !id("hpShieldFillV0931")) {
        const fill = document.createElement("i");
        fill.id = "hpShieldFillV0931";
        fill.className = "hp-shield-fill-v0931";
        hpBar.insertBefore(fill, id("hpText"));
      }
      const shieldFill = id("hpShieldFillV0931");
      const shield = Math.max(0, Number(player?.soulShield) || 0);
      if (shieldFill) {
        shieldFill.style.width = `${clamp(shield / Math.max(1, Number(player?.maxHp) || 1) * 100, 0, 100)}%`;
        shieldFill.classList.toggle("show", shield > .01);
      }
      if (player && id("hpText")) {
        const total = Math.ceil(Math.max(0, Number(player.hp) || 0) + shield);
        id("hpText").textContent = `HP ${total}/${Math.ceil(Number(player.maxHp) || 0)}`;
      }
      updateHudStars(game);
      return result;
    };
  }
}

function patchUiRefresh() {
  const previousRenderGear = UI.renderGear?.bind(UI);
  if (previousRenderGear && !UI.__v0931RenderGear) {
    UI.renderGear = function renderGearV0931(...args) {
      const result = previousRenderGear(...args);
      requestAnimationFrame(applyGearRarityFilter);
      return result;
    };
    UI.__v0931RenderGear = true;
  }
  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh && !UI.__v0931Refresh) {
    UI.refreshMenu = function refreshV0931(...args) {
      const result = previousRefresh(...args);
      requestAnimationFrame(() => { applyGearRarityFilter(); decorateArsenalCosts(); decorateWorldStars(); });
      return result;
    };
    UI.__v0931Refresh = true;
  }
  const previousOpen = UI.open?.bind(UI);
  if (previousOpen && !UI.__v0931Open) {
    UI.open = function openV0931(...args) {
      const result = previousOpen(...args);
      requestAnimationFrame(() => { applyGearRarityFilter(); decorateArsenalCosts(); decorateWorldStars(); });
      return result;
    };
    UI.__v0931Open = true;
  }
}

function bindCaptureActions() {
  window.addEventListener("click", event => {
    const target = event.target;
    if (!target?.closest) return;

    const chest = target.closest("[data-v080-open-chest]");
    if (chest) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openChestHotfix(chest.dataset.v080OpenChest);
      return;
    }

    const foodBuy = target.closest("[data-v080-buy-food]");
    if (foodBuy && count(UI.save?.bag?.items?.[foodBuy.dataset.v080BuyFood]) >= FOOD_CAP) {
      event.preventDefault();
      event.stopImmediatePropagation();
      UI.toast?.(copy(`Ez a food már elérte a ${FOOD_CAP}-es maximumot.`, `This food already reached the ${FOOD_CAP} stack cap.`));
      return;
    }

    const arsenal = target.closest("[data-v070-level]");
    if (arsenal) {
      event.preventDefault();
      event.stopImmediatePropagation();
      upgradeArsenalHotfix(arsenal.dataset.v070Level);
      return;
    }

    const rarity = target.closest("[data-v0931-gear-rarity]");
    if (rarity) {
      event.preventDefault();
      event.stopImmediatePropagation();
      runtime.gearRarity = rarity.dataset.v0931GearRarity;
      applyGearRarityFilter();
      return;
    }

    if (target.closest("[data-v0931-duplicate-close]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDuplicateExchange();
    }
  }, true);
}

function installObserver() {
  if (runtime.observer || !document.body) return;
  let queued = false;
  runtime.observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyGearRarityFilter();
      decorateArsenalCosts();
      decorateWorldStars();
    });
  });
  runtime.observer.observe(document.body, {childList:true, subtree:true});
}

function bindRunExitSafety() {
  window.addEventListener("beforeunload", () => {
    const game = UI.game;
    if (!game?.__runEscrowV0931 || game.__runEscrowV0931.finished) return;
    rollbackUnsecured(game);
  });
}

function patchVersion() {
  const patch = q("#menu .patch-card");
  if (patch) {
    const copyNode = q(":scope > p", patch);
    if (copyNode) copyNode.textContent = language() === "en"
      ? "Gameplay balance, Succubus polish, Gacha duplicate exchange, chapter stars and mobile camera hotfix."
      : "Gameplay balance, Succubus javítás, Gacha duplicate exchange, chapter-csillagok és mobilkamera hotfix.";
  }
}

ensureCss();
patchFoodStorage();
patchGearGenerator();
patchSuccubusCombat();
patchRunAndPacing();
patchHud();
patchUiRefresh();
bindCaptureActions();
bindRunExitSafety();
installObserver();
patchVersion();

window.addEventListener("cherrift:languagechange", () => {
  const filter = id("gearRarityFiltersV0931");
  if (filter) filter.remove();
  ensureGearRarityFilters();
  applyGearRarityFilter();
  decorateWorldStars();
  patchVersion();
});

window.CHERRIFT_V0931 = Object.freeze({
  version:VERSION,
  foodCap:FOOD_CAP,
  openChest:openChestHotfix,
  arsenalCost,
  commitRunCheckpoint,
  rollbackUnsecured,
  refresh:() => { applyGearRarityFilter(); decorateArsenalCosts(); decorateWorldStars(); }
});

console.info("[CHERRIFT] v0.9.3.1 Gameplay, Economy and Progression hotfix loaded.");
})();
