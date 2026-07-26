(() => {
"use strict";

const VERSION = "0.8.3-item-art-reward-overlay";
const DISPLAY_VERSION = "v0.8.3";
const RARITIES = new Set(["Common", "Uncommon", "Rare", "Epic", "Legendary"]);

const ITEM_ASSETS = Object.freeze({
  currency: Object.freeze({
    coins: "assets/items/coin.png",
    blossomGems: "assets/items/blossom_gem.png",
    sakuraEssence: "assets/items/sakura_potion.png",
    gearScrap: "assets/items/scraps.png"
  }),
  actions: Object.freeze({
    dismantle: "assets/items/dismantle.png",
    merge: "assets/items/merge.png",
    upgrade: "assets/items/upgrade.png"
  }),
  chests: Object.freeze({
    common: "assets/items/chests/common_chest.png",
    rare: "assets/items/chests/rare_chest.png",
    epic: "assets/items/chests/epic_chest.png",
    legendary: "assets/items/chests/legendary_chest.png"
  }),
  stones: Object.freeze({
    copper: "assets/items/stones/copper_enhancement_stone.png",
    iron: "assets/items/stones/iron_enhancement_stone.png",
    steel: "assets/items/stones/steel_enchancement_stone.png",
    silver: "assets/items/stones/silver_enhancement_stone.png",
    royal: "assets/items/stones/royal_enhancement_stone.png",
    magical: "assets/items/stones/magical_enhancement_stone.png"
  }),
  cores: Object.freeze({
    Weapon: "assets/items/cores/weapon_core.png",
    Helmet: "assets/items/cores/helmet_core.png",
    Armor: "assets/items/cores/chestplate_core.png",
    Gloves: "assets/items/cores/glove_core.png",
    Boots: "assets/items/cores/boots_core.png",
    Ring: "assets/items/cores/ring_core.png",
    Necklace: "assets/items/cores/necklance_core.png"
  }),
  skills: Object.freeze({
    damage: "assets/items/skills/Damage_icon.png",
    maxHp: "assets/items/skills/Max_HP_icon.png",
    orbXp: "assets/items/skills/Orb_XP_Gain_icon.png",
    movementSpeed: "assets/items/skills/Movement_Speed_icon.png",
    critChance: "assets/items/skills/Critical_Chance_icon.png",
    luckChance: "assets/items/skills/Lucky_Chance.png",
    critDamage: "assets/items/skills/Critical_Damage_icon.png",
    damageReduction: "assets/items/skills/Damage_Reduction_icon.png",
    damageReductionAlt: "assets/items/skills/Damage_Reduction_icon_2.png",
    hpRegen: "assets/items/skills/HP_Regeneration_icon.png",
    cooldownReduction: "assets/items/skills/Skill_Cooldown_Reduction_icon.png"
  }),
  buffs: Object.freeze({
    goldenLuckyChance: "assets/items/buffs/Golden_Lucky_Chance.png",
    bagBuff: "assets/items/buffs/bag_buff.png",
    bagBuff2: "assets/items/buffs/bag_buff_2.png",
    bagBuff3: "assets/items/buffs/bag_buff_3.png",
    carrotSoup: "assets/items/buffs/bunny_carrot_soup.png",
    cherryCake: "assets/items/buffs/cherry_cake.png",
    coinCookie: "assets/items/buffs/coin_cookie.png",
    dumpling: "assets/items/buffs/dumplin.png",
    fancyBento: "assets/items/buffs/fancy_bento.png",
    goldenDumpling: "assets/items/buffs/golden_dumplin.png",
    healingMochi: "assets/items/buffs/healing_mochi.png",
    luckySakuraTea: "assets/items/buffs/lucky_sakura_tea.png",
    magicMacaron: "assets/items/buffs/magic_macaron.png",
    magicMacaronPurple: "assets/items/buffs/magic_macaron_purple.png",
    spicyNoodles: "assets/items/buffs/spicy_noodle.png",
    supportDrink: "assets/items/buffs/support_drink.png"
  })
});

const COPY = {
  hu: {
    obtained: "Megszerezve",
    continue: "Folytatás",
    commonChestKey: "Common ládakulcs",
    skillPoint: "Skill Point",
    moreRewards: "További jutalmak",
    rewardCount: "jutalom"
  },
  en: {
    obtained: "Obtained",
    continue: "Continue",
    commonChestKey: "Common Chest Key",
    skillPoint: "Skill Point",
    moreRewards: "More rewards",
    rewardCount: "rewards"
  }
};

const state = {
  ready: false,
  snapshot: null,
  queue: [],
  active: false,
  observer: null,
  decorateQueued: false,
  suppressDepth: 0
};

const id = name => document.getElementById(name);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function language() {
  return window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
}
function t(key) { return COPY[language()][key] || COPY.en[key] || key; }
function count(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function safeRarity(value, fallback = "Common") { return RARITIES.has(value) ? value : fallback; }
function normalizeAsset(value) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function allAssetPaths() {
  const paths = [];
  const visit = value => {
    if (typeof value === "string") paths.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(ITEM_ASSETS);
  return [...new Set(paths)];
}
function preloadAssets() {
  for (const source of allAssetPaths()) {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
  }
}

function ensureCss() {
  if (id("v083css")) return;
  const link = document.createElement("link");
  link.id = "v083css";
  link.rel = "stylesheet";
  link.href = "v083.css?v=083";
  document.head.appendChild(link);
}

function imageMarkup(source, alt, className = "item-icon-v083") {
  const asset = normalizeAsset(source);
  if (!asset) return "";
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(asset)}" alt="${escapeHtml(alt)}" draggable="false">`;
}

function setElementIcon(element, source, alt, className = "item-icon-v083") {
  if (!element || !source) return;
  if (element.dataset.v083Icon === source && q("img", element)) return;
  element.dataset.v083Icon = source;
  element.innerHTML = imageMarkup(source, alt, className);
}

function prependButtonIcon(button, source, alt) {
  if (!button || !source || button.dataset.v083Icon === source) return;
  button.dataset.v083Icon = source;
  const image = document.createElement("img");
  image.className = "button-icon-v083";
  image.src = source;
  image.alt = alt;
  image.draggable = false;
  button.prepend(image);
}

function wireCatalogAssets() {
  const catalog = window.CHERRIFT_V080?.foodCatalog;
  if (!catalog) return;
  const mapping = {
    coin_cookie: ITEM_ASSETS.buffs.coinCookie,
    lucky_sakura_tea: ITEM_ASSETS.buffs.luckySakuraTea,
    treasure_bento: ITEM_ASSETS.buffs.fancyBento,
    warrior_steak: ITEM_ASSETS.buffs.supportDrink,
    spicy_noodles: ITEM_ASSETS.buffs.spicyNoodles,
    cherry_cake: ITEM_ASSETS.buffs.cherryCake,
    carrot_soup: ITEM_ASSETS.buffs.carrotSoup,
    healing_mochi: ITEM_ASSETS.buffs.healingMochi,
    magic_macaron: ITEM_ASSETS.buffs.magicMacaron,
    golden_dumpling: ITEM_ASSETS.buffs.goldenDumpling
  };
  for (const [itemId, asset] of Object.entries(mapping)) {
    if (catalog[itemId]) catalog[itemId].asset = asset;
  }
  if (catalog.treasure_bento) catalog.treasure_bento.name = "Fancy Bento";
  if (catalog.warrior_steak) {
    catalog.warrior_steak.name = "Support Drink";
    catalog.warrior_steak.icon = "✚";
  }
  const chests = window.CHERRIFT_V080?.chestDefs;
  if (chests) {
    for (const type of ["common", "rare", "epic"]) {
      if (chests[type]) chests[type].asset = ITEM_ASSETS.chests[type];
    }
  }
}

function materialAssetFromLabel(label) {
  const text = String(label || "").trim();
  if (/gear scrap/i.test(text)) return ITEM_ASSETS.currency.gearScrap;
  if (/sakura essence/i.test(text)) return ITEM_ASSETS.currency.sakuraEssence;
  for (const [stone, asset] of Object.entries(ITEM_ASSETS.stones)) {
    if (new RegExp(`\\b${stone}\\b`, "i").test(text)) return asset;
  }
  for (const [slot, asset] of Object.entries(ITEM_ASSETS.cores)) {
    if (new RegExp(`\\b${slot}\\b`, "i").test(text) && /core/i.test(text)) return asset;
  }
  return "";
}

function decorateResourceBars() {
  const titleMap = {
    Coin: ITEM_ASSETS.currency.coins,
    "Blossom Gem": ITEM_ASSETS.currency.blossomGems,
    "Sakura Essence": ITEM_ASSETS.currency.sakuraEssence,
    "Gear Scrap": ITEM_ASSETS.currency.gearScrap
  };
  qa("#resourceBarV082 span[title]").forEach(pill => {
    const asset = titleMap[pill.getAttribute("title")];
    if (!asset || pill.dataset.v083Decorated === asset) return;
    pill.dataset.v083Decorated = asset;
    const oldImage = q(".resource-icon-v083", pill);
    oldImage?.remove();
    pill.insertAdjacentHTML("afterbegin", imageMarkup(asset, pill.getAttribute("title") || "Item", "resource-icon-v083"));
    const textNodes = Array.from(pill.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    for (const node of textNodes) if (node.textContent.trim()) node.textContent = " ";
  });

  const walletMap = [
    ["v080Coins", ITEM_ASSETS.currency.coins, "Coin"],
    ["v080Gems", ITEM_ASSETS.currency.blossomGems, "Blossom Gem"],
    ["v080Essence", ITEM_ASSETS.currency.sakuraEssence, "Sakura Essence"]
  ];
  for (const [counterId, asset, label] of walletMap) {
    const counter = id(counterId);
    const pill = counter?.parentElement;
    if (!pill || pill.dataset.v083Decorated === asset) continue;
    pill.dataset.v083Decorated = asset;
    const textNodes = Array.from(pill.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    for (const node of textNodes) if (node.textContent.trim()) node.textContent = " ";
    pill.insertAdjacentHTML("afterbegin", imageMarkup(asset, label, "resource-icon-v083"));
  }
}

function decorateChests() {
  qa(".chest-card-v080").forEach(card => {
    const type = q("[data-v080-open-chest]", card)?.dataset.v080OpenChest;
    const image = q(".v080-art img", card);
    if (type && image && ITEM_ASSETS.chests[type]) image.src = ITEM_ASSETS.chests[type];
  });
  qa("[data-v080-goto-gacha]").forEach(button => {
    const type = button.dataset.v080GotoGacha;
    setElementIcon(q(":scope > span", button), ITEM_ASSETS.chests[type], `${type} Chest`, "chest-mini-icon-v083");
  });
  qa("[data-v080-buy-chest]").forEach(button => {
    const type = button.dataset.v080BuyChest;
    const card = button.closest("article");
    setElementIcon(q(":scope > span", card), ITEM_ASSETS.chests[type], `${type} Chest`, "shop-chest-icon-v083");
  });
}

function decorateBagMaterials() {
  qa(".material-grid-v080 article").forEach(card => {
    const label = q("small", card)?.textContent || "";
    const asset = materialAssetFromLabel(label);
    setElementIcon(q(":scope > span", card), asset, label, "material-icon-v083");
  });
}

function decorateArsenal() {
  qa(".arsenal-card-v070[data-v070-slot-card]").forEach(card => {
    const slot = card.dataset.v070SlotCard;
    setElementIcon(q("header > span", card), ITEM_ASSETS.cores[slot], `${slot} Core`, "arsenal-slot-icon-v083");
  });
  qa("[data-v082-material]").forEach(button => {
    const key = button.dataset.v082Material;
    const asset = ITEM_ASSETS.stones[key]
      || (key === "gearScrap" ? ITEM_ASSETS.currency.gearScrap : "")
      || (key === "slotCore" ? ITEM_ASSETS.actions.merge : "");
    prependButtonIcon(button, asset, key);
  });
  qa(".arsenal-main-action-v082,[data-v070-level],[data-v070-star]").forEach(button => prependButtonIcon(button, ITEM_ASSETS.actions.upgrade, "Upgrade"));
  qa("[data-v070-salvage],[data-v082-bulk-dismantle]").forEach(button => prependButtonIcon(button, ITEM_ASSETS.actions.dismantle, "Dismantle"));
  qa("[data-v070-merge]").forEach(button => prependButtonIcon(button, ITEM_ASSETS.actions.merge, "Merge"));
}

function decorateSkillTree() {
  qa("[data-v082-skill]").forEach(button => {
    const skillId = button.dataset.v082Skill;
    const asset = ITEM_ASSETS.skills[skillId];
    if (!asset) return;
    const card = button.closest(".skill-node-v082");
    setElementIcon(q(".skill-node-icon-v082", card), asset, skillId, "skill-icon-v083");
  });
  const routeButton = q('[data-v082-route="playerUpgrade"] i');
  setElementIcon(routeButton, ITEM_ASSETS.actions.upgrade, "Player Upgrade", "rail-icon-v083");
}

function decoratePermanentBuffs() {
  const map = {
    "Treasure Hunter I": ITEM_ASSETS.buffs.goldenLuckyChance,
    "World Explorer": ITEM_ASSETS.buffs.bagBuff,
    "Veteran Focus": ITEM_ASSETS.buffs.bagBuff2,
    "Cherry Supporter": ITEM_ASSETS.buffs.supportDrink
  };
  qa(".permanent-grid-v080 article").forEach(card => {
    const label = q("h3", card)?.textContent?.trim() || "";
    setElementIcon(q(":scope > span", card), map[label], label, "permanent-buff-icon-v083");
  });
}

function decorateAll() {
  state.decorateQueued = false;
  wireCatalogAssets();
  decorateResourceBars();
  decorateChests();
  decorateBagMaterials();
  decorateArsenal();
  decorateSkillTree();
  decoratePermanentBuffs();
}

function scheduleDecorate() {
  if (state.decorateQueued) return;
  state.decorateQueued = true;
  requestAnimationFrame(decorateAll);
}

function installDecoratorObserver() {
  if (state.observer || !document.body) return;
  state.observer = new MutationObserver(scheduleDecorate);
  state.observer.observe(document.body, { childList: true, subtree: true });
  scheduleDecorate();
}

function mapCounts(value) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  for (const [key, amount] of Object.entries(value)) out[key] = count(amount);
  return out;
}

function snapshot(save) {
  const source = save && typeof save === "object" ? save : {};
  const materials = source.bag?.materials || {};
  const inventory = new Map();
  for (const item of Array.isArray(source.inventory) ? source.inventory : []) {
    if (!item) continue;
    const key = String(item.id || `${item.slot || "gear"}_${item.createdAt || inventory.size}`);
    inventory.set(key, {
      id: key,
      slot: item.slot,
      type: item.type,
      rarity: item.rarity,
      itemLevel: item.itemLevel,
      stats: item.stats,
      createdAt: item.createdAt
    });
  }
  return {
    coins: count(source.coins),
    blossomGems: count(source.blossomGems),
    sakuraEssence: count(source.sakuraEssence),
    keys: count(source.keys),
    skillPoints: count(source.account?.skillPoints),
    chests: mapCounts(source.chests),
    stones: mapCounts(materials.stones),
    slotCores: mapCounts(materials.slotCores),
    gearScrap: count(materials.gearScrap),
    bagItems: mapCounts(source.bag?.items),
    skins: new Set(Array.isArray(source.unlockedSkins) ? source.unlockedSkins.filter(Boolean) : []),
    inventory
  };
}

function rewardItem({ key, name, amount = 1, asset = "", glyph = "", html = "", rarity = "Common", kind = "item", subtitle = "" }) {
  return {
    key: key || `${kind}:${name}`,
    name: String(name || "Reward"),
    amount: Math.max(1, count(amount) || 1),
    asset: normalizeAsset(asset),
    glyph: String(glyph || ""),
    html: String(html || ""),
    rarity: safeRarity(rarity),
    kind,
    subtitle: String(subtitle || "")
  };
}

function gearReward(item) {
  const rarity = safeRarity(item?.rarity);
  const slot = item?.slot || "Gear";
  const type = item?.type || "";
  const label = [rarity, type, slot].filter(Boolean).join(" ");
  const rendered = window.UI?.gearEmoji?.(item);
  const html = typeof rendered === "string" && rendered.includes("<") ? rendered : "";
  const glyph = html ? "" : (typeof rendered === "string" ? rendered : "⚙");
  return rewardItem({ key:`gear:${item?.id || label}`, name:label, html, glyph, rarity, kind:"gear", subtitle:`Lv.${count(item?.itemLevel) || 1}` });
}

function skinReward(skinId) {
  const skin = window.CHERRIFT_DATA?.skins?.find?.(entry => entry.id === skinId);
  const icon = skin?.icon || "";
  const asset = typeof icon === "string" && !icon.includes("<") && /^(?:assets\/|https?:\/\/|data:)/.test(icon) ? icon : "";
  const html = typeof icon === "string" && icon.includes("<") ? icon : "";
  const glyph = asset || html ? "" : (skin?.emoji || icon || "🐰");
  return rewardItem({ key:`skin:${skinId}`, name:skin?.name || skinId, asset, html, glyph, rarity:safeRarity(skin?.rarity, "Rare"), kind:"skin", subtitle:"Cherry Skin" });
}

function bagItemReward(itemId, amount) {
  const food = window.CHERRIFT_V080?.foodCatalog?.[itemId];
  return rewardItem({
    key:`food:${itemId}`,
    name:food?.name || itemId.replaceAll("_", " "),
    amount,
    asset:food?.asset || "",
    glyph:food?.icon || "✦",
    rarity:safeRarity(food?.rarity),
    kind:"buff",
    subtitle:food ? `${food.runs || 0} ${language() === "hu" ? "kör" : "runs"}` : ""
  });
}

function mergeGenericRewards(items) {
  const out = [];
  const positions = new Map();
  for (const item of items) {
    if (item.kind === "gear" || item.kind === "skin") {
      out.push(item);
      continue;
    }
    const mergeKey = item.key;
    if (!positions.has(mergeKey)) {
      positions.set(mergeKey, out.length);
      out.push(item);
    } else {
      out[positions.get(mergeKey)].amount += item.amount;
    }
  }
  return out;
}

function collectRewards(before, after) {
  if (!before || !after) return [];
  const items = [];

  for (const [key, item] of after.inventory.entries()) {
    if (!before.inventory.has(key)) items.push(gearReward(item));
  }
  for (const skinId of after.skins) {
    if (!before.skins.has(skinId)) items.push(skinReward(skinId));
  }

  const chestRarity = { common:"Common", rare:"Rare", epic:"Epic", legendary:"Legendary" };
  for (const type of ["legendary", "epic", "rare", "common"]) {
    const delta = count(after.chests[type]) - count(before.chests[type]);
    if (delta > 0) items.push(rewardItem({ key:`chest:${type}`, name:`${type[0].toUpperCase()}${type.slice(1)} Chest`, amount:delta, asset:ITEM_ASSETS.chests[type], rarity:chestRarity[type], kind:"chest" }));
  }
  const keyDelta = after.keys - before.keys;
  if (keyDelta > 0) items.push(rewardItem({ key:"key:common", name:t("commonChestKey"), amount:keyDelta, asset:ITEM_ASSETS.chests.common, rarity:"Common", kind:"key" }));

  for (const [itemId, amount] of Object.entries(after.bagItems)) {
    const delta = amount - count(before.bagItems[itemId]);
    if (delta > 0) items.push(bagItemReward(itemId, delta));
  }

  for (const [slot, asset] of Object.entries(ITEM_ASSETS.cores)) {
    const delta = count(after.slotCores[slot]) - count(before.slotCores[slot]);
    if (delta > 0) items.push(rewardItem({ key:`core:${slot}`, name:`${slot} Core`, amount:delta, asset, rarity:"Rare", kind:"core" }));
  }
  const stoneRarity = { copper:"Common", iron:"Uncommon", steel:"Rare", silver:"Epic", royal:"Legendary", magical:"Legendary" };
  for (const stone of ["magical", "royal", "silver", "steel", "iron", "copper"]) {
    const delta = count(after.stones[stone]) - count(before.stones[stone]);
    if (delta > 0) items.push(rewardItem({ key:`stone:${stone}`, name:`${stone[0].toUpperCase()}${stone.slice(1)} Enhancement Stone`, amount:delta, asset:ITEM_ASSETS.stones[stone], rarity:stoneRarity[stone], kind:"stone" }));
  }
  const scrapDelta = after.gearScrap - before.gearScrap;
  if (scrapDelta > 0) items.push(rewardItem({ key:"material:gearScrap", name:"Gear Scrap", amount:scrapDelta, asset:ITEM_ASSETS.currency.gearScrap, rarity:"Common", kind:"material" }));

  const essenceDelta = after.sakuraEssence - before.sakuraEssence;
  if (essenceDelta > 0) items.push(rewardItem({ key:"currency:sakuraEssence", name:"Sakura Essence", amount:essenceDelta, asset:ITEM_ASSETS.currency.sakuraEssence, rarity:"Epic", kind:"currency" }));
  const gemDelta = after.blossomGems - before.blossomGems;
  if (gemDelta > 0) items.push(rewardItem({ key:"currency:blossomGem", name:"Blossom Gem", amount:gemDelta, asset:ITEM_ASSETS.currency.blossomGems, rarity:"Rare", kind:"currency" }));
  const coinDelta = after.coins - before.coins;
  if (coinDelta > 0) items.push(rewardItem({ key:"currency:coin", name:"Coin", amount:coinDelta, asset:ITEM_ASSETS.currency.coins, rarity:"Common", kind:"currency" }));
  const skillPointDelta = after.skillPoints - before.skillPoints;
  if (skillPointDelta > 0) items.push(rewardItem({ key:"account:skillPoint", name:t("skillPoint"), amount:skillPointDelta, asset:ITEM_ASSETS.actions.upgrade, rarity:"Epic", kind:"account" }));

  return mergeGenericRewards(items);
}

function gameplayActive() {
  return document.body?.classList.contains("is-playing") === true;
}

function ensureRewardOverlay() {
  let overlay = id("rewardOverlayV083");
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "rewardOverlayV083";
  overlay.className = "reward-overlay-v083";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "rewardTitleV083");
  overlay.innerHTML = `
    <div class="reward-shell-v083">
      <header class="reward-head-v083"><i></i><h2 id="rewardTitleV083">${escapeHtml(t("obtained"))}</h2><i></i></header>
      <div id="rewardItemsV083" class="reward-items-v083"></div>
      <button id="rewardContinueV083" type="button" class="reward-continue-v083">${escapeHtml(t("continue"))}</button>
    </div>`;
  document.body.appendChild(overlay);
  id("rewardContinueV083")?.addEventListener("click", closeCurrentReward);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeCurrentReward();
  });
  return overlay;
}

function rewardArt(item) {
  if (item.html) return `<div class="reward-art-v083 reward-art-html-v083">${item.html}</div>`;
  if (item.asset) return `<div class="reward-art-v083">${imageMarkup(item.asset, item.name, "reward-image-v083")}</div>`;
  return `<div class="reward-art-v083"><span>${escapeHtml(item.glyph || "✦")}</span></div>`;
}

function rewardCard(item) {
  const rarity = safeRarity(item.rarity);
  return `<article class="reward-item-v083 rarity-${rarity.toLowerCase()}">
    <div class="reward-amount-v083">${item.amount > 1 ? `×${item.amount}` : ""}</div>
    ${rewardArt(item)}
    <div class="reward-copy-v083"><h3>${escapeHtml(item.name)}</h3>${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}</div>
    <small>${escapeHtml(rarity)}</small>
  </article>`;
}

function renderRewardBatch(batch) {
  const overlay = ensureRewardOverlay();
  const title = id("rewardTitleV083");
  const list = id("rewardItemsV083");
  const continueButton = id("rewardContinueV083");
  if (title) title.textContent = batch.title || t("obtained");
  if (continueButton) continueButton.textContent = t("continue");
  if (list) list.innerHTML = batch.items.map(rewardCard).join("");
  overlay.classList.add("open");
  document.body.classList.add("reward-open-v083");
  state.active = true;
  window.setTimeout(() => continueButton?.focus({ preventScroll:true }), 80);
}

function showRewards(items, options = {}) {
  const normalized = Array.isArray(items) ? items.filter(Boolean).map(item => rewardItem(item)) : [];
  if (!normalized.length || gameplayActive() || state.suppressDepth > 0) return false;
  state.queue.push({ title:options.title || t("obtained"), items:normalized });
  if (!state.active) renderRewardBatch(state.queue.shift());
  return true;
}

function closeCurrentReward() {
  const overlay = id("rewardOverlayV083");
  overlay?.classList.remove("open");
  document.body.classList.remove("reward-open-v083");
  state.active = false;
  if (state.queue.length) window.setTimeout(() => renderRewardBatch(state.queue.shift()), 140);
}

function patchRewardDetection() {
  if (!window.CherriftStorage || CherriftStorage.__v083RewardDetection) return;
  const previousSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.save = function saveV083(save) {
    const before = state.snapshot;
    const result = previousSave(save);
    const after = snapshot(save);
    state.snapshot = after;
    if (state.ready && state.suppressDepth === 0 && !gameplayActive()) {
      const rewards = collectRewards(before, after);
      if (rewards.length) showRewards(rewards);
    }
    return result;
  };
  CherriftStorage.__v083RewardDetection = true;
}

function patchUiLifecycle() {
  if (!window.UI || UI.__v083ItemArt) return;
  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV083(save, game) {
      const result = previousInit(save, game);
      wireCatalogAssets();
      state.snapshot = snapshot(save);
      state.ready = true;
      ensureRewardOverlay();
      installDecoratorObserver();
      scheduleDecorate();
      patchVersion();
      return result;
    };
  }
  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV083(...args) {
      const result = previousRefresh(...args);
      scheduleDecorate();
      patchVersion();
      return result;
    };
  }
  const previousOpen = UI.open?.bind(UI);
  if (previousOpen) {
    UI.open = function openV083(...args) {
      const result = previousOpen(...args);
      scheduleDecorate();
      return result;
    };
  }
  UI.__v083ItemArt = true;
}

function withSuppressedRewards(callback) {
  state.suppressDepth++;
  try { return callback(); }
  finally { state.suppressDepth = Math.max(0, state.suppressDepth - 1); }
}

function patchVersion() {
  document.title = window.CHERRIFT_BUILD?.title || "CHERRIFT v0.9.0 – TEST BUILD";
  const label = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = label;
  const menu = id("menuBuildVersion");
  if (menu) menu.textContent = label;
  qa(".version-badge-v063,[data-v063-version]").forEach(element => { element.textContent = label; });
}

function bindGlobalEvents() {
  document.addEventListener("keydown", event => {
    if (!state.active || !["Escape", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    closeCurrentReward();
  });
  window.addEventListener("cherrift:languagechange", () => {
    const title = id("rewardTitleV083");
    const button = id("rewardContinueV083");
    if (title && state.active) title.textContent = t("obtained");
    if (button) button.textContent = t("continue");
    wireCatalogAssets();
    scheduleDecorate();
    patchVersion();
  });
}

ensureCss();
wireCatalogAssets();
patchRewardDetection();
patchUiLifecycle();
bindGlobalEvents();
patchVersion();
preloadAssets();

window.CHERRIFT_ITEM_ASSETS = ITEM_ASSETS;
window.CHERRIFT_REWARDS = {
  show: showRewards,
  close: closeCurrentReward,
  withSuppressed: withSuppressedRewards,
  collectRewards,
  snapshot
};
window.CHERRIFT_V083 = {
  version: VERSION,
  displayVersion: DISPLAY_VERSION,
  assets: ITEM_ASSETS,
  decorate: decorateAll,
  showRewards
};

console.info("[CHERRIFT] v0.8.3 item artwork and reward overlay loaded.");
})();
