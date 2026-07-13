(() => {
  "use strict";

  const VERSION = "0.5.0-progression-world3";
  const SAVE_SCHEMA = 5;
  const MAX_INVENTORY = 80;
  const id = name => document.getElementById(name);
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  if (!window.CHERRIFT_V040 || !window.CherriftStorage || !window.CherriftGame || !window.UI || !window.CHERRIFT_DATA) {
    console.error("[CHERRIFT v0.5] Required v0.4 systems are missing.");
    return;
  }

  const stages = CHERRIFT_V040.stages;
  const enemies = CHERRIFT_V040.enemies;

  const RARITIES = {
    Common:    { mult:1.00, stats:1, sell:4,   color:"#f0f0f0", weight:60 },
    Uncommon:  { mult:1.35, stats:2, sell:8,   color:"#79ee96", weight:25 },
    Rare:      { mult:1.80, stats:3, sell:16,  color:"#68c8ff", weight:10 },
    Epic:      { mult:2.40, stats:3, sell:35,  color:"#c882ff", weight:4 },
    Legendary: { mult:3.15, stats:4, sell:80,  color:"#ffbc54", weight:1 }
  };

  Object.assign(CHERRIFT_DATA.rarities, RARITIES);

  const WORLD3 = [
    { id:"world_3_1", world:3, index:1, name:"World 3-1", title:"Emberfall Path", theme:"ember_ruins", goalKills:170, maxEnemies:38, raidEvery:38, raidCount:16, enemyPool:["ember_slime","ash_moth","stone_imp"], repeatReward:{coins:62}, firstClearReward:{coins:125,keys:1}, accountXp:90, desc:"A hamuval borított ösvényen tűzlények és kőszörnyek támadnak." },
    { id:"world_3_2", world:3, index:2, name:"World 3-2", title:"Cinder Garden", theme:"ember_ruins", goalKills:190, maxEnemies:42, raidEvery:42, raidCount:18, enemyPool:["ember_slime","ash_moth","stone_imp","magma_beetle"], repeatReward:{coins:70}, firstClearReward:{coins:140}, accountXp:105, desc:"A kihűlt kert alatt még mindig izzik a föld." },
    { id:"world_3_3", world:3, index:3, name:"World 3-3", title:"Broken Furnace", theme:"ember_ruins", goalKills:215, maxEnemies:46, raidEvery:44, raidCount:20, enemyPool:["ember_slime","stone_imp","magma_beetle","flame_wisp"], repeatReward:{coins:80}, firstClearReward:{coins:160,keys:1}, accountXp:120, desc:"A régi kohó romjai között egyre erősebb hullámok érkeznek." },
    { id:"world_3_4", world:3, index:4, name:"World 3-4", title:"Ashen Crown", theme:"ember_ruins", goalKills:240, maxEnemies:50, raidEvery:48, raidCount:22, enemyPool:["ash_moth","stone_imp","magma_beetle","flame_wisp"], repeatReward:{coins:92}, firstClearReward:{coins:185}, accountXp:140, desc:"Az Ashen Crown elit lényei őrzik a világ magját." },
    { id:"world_3_5", world:3, index:5, name:"World 3-5", title:"Heart of Cinders", theme:"ember_ruins", goalKills:275, maxEnemies:54, raidEvery:52, raidCount:24, enemyPool:["ember_slime","magma_beetle","flame_wisp","stone_imp"], boss:"cinder_guardian", repeatReward:{coins:110,keys:1}, firstClearReward:{coins:240,keys:2}, accountXp:190, desc:"World 3 záró pálya: győzd le a Cinder Guardiant." }
  ];

  if (!stages.some(s => s.world === 3)) stages.push(...WORLD3);

  Object.assign(enemies, {
    ember_slime:{ name:"Ember Slime", hp:92, speed:86, r:25, xp:8, color:"#ff7352", visualStyle:"blob" },
    ash_moth:{ name:"Ash Moth", hp:70, speed:126, r:22, xp:8, color:"#d8a0b8", visualStyle:"moth" },
    stone_imp:{ name:"Stone Imp", hp:132, speed:72, r:28, xp:10, color:"#a58a7a", visualStyle:"bug" },
    magma_beetle:{ name:"Magma Beetle", hp:175, speed:58, r:31, xp:12, color:"#ff9b45", visualStyle:"bug" },
    flame_wisp:{ name:"Flame Wisp", hp:82, speed:144, r:20, xp:9, color:"#ffd06a", visualStyle:"moth" },
    cinder_guardian:{ name:"Cinder Guardian", hp:1850, speed:54, r:64, xp:42, color:"#ff7b32", visualStyle:"bossBug", boss:true }
  });

  function unique(list) {
    return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];
  }

  function xpForLevel(level) {
    return Math.floor(120 + Math.pow(Math.max(1, level), 1.42) * 58);
  }

  function normalize(save) {
    save = save && typeof save === "object" ? save : {};
    save.schemaVersion = Math.max(SAVE_SCHEMA, Number(save.schemaVersion) || 0);
    save.account = {
      level:1,
      xp:0,
      xpNext:xpForLevel(1),
      totalXp:0,
      ...(save.account || {})
    };
    save.account.level = Math.max(1, Math.floor(Number(save.account.level) || 1));
    save.account.xp = Math.max(0, Number(save.account.xp) || 0);
    save.account.totalXp = Math.max(save.account.xp, Number(save.account.totalXp) || 0);
    save.account.xpNext = xpForLevel(save.account.level);

    save.inventory = Array.isArray(save.inventory) ? save.inventory.filter(Boolean) : [];
    save.equipped = save.equipped && typeof save.equipped === "object" ? save.equipped : {};
    save.unlockedStages = unique(save.unlockedStages);
    save.clearedStages = save.clearedStages && typeof save.clearedStages === "object" ? save.clearedStages : {};
    save.stageStats = save.stageStats && typeof save.stageStats === "object" ? save.stageStats : {};
    save.firstClearClaimed = save.firstClearClaimed && typeof save.firstClearClaimed === "object" ? save.firstClearClaimed : {};
    save.lootStats = {
      totalDrops:0,
      rareDrops:0,
      epicDrops:0,
      legendaryDrops:0,
      soldItems:0,
      ...(save.lootStats || {})
    };

    for (const item of [...save.inventory, ...Object.values(save.equipped)]) {
      if (!item) continue;
      item.locked = item.locked === true;
      item.itemLevel = Math.max(1, Number(item.itemLevel) || 1);
      item.rarity = RARITIES[item.rarity] ? item.rarity : "Common";
      item.stats = item.stats && typeof item.stats === "object" ? item.stats : {};
    }

    if (save.clearedStages["world_2_5"] && !save.unlockedStages.includes("world_3_1")) {
      save.unlockedStages.push("world_3_1");
    }
    return save;
  }

  const oldDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  CherriftStorage.defaults = function defaultsV050() {
    return normalize(oldDefaults());
  };
  const oldLoad = CherriftStorage.load.bind(CherriftStorage);
  CherriftStorage.load = function loadV050() {
    return normalize(oldLoad());
  };
  const oldSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.save = function saveV050(save) {
    return oldSave(normalize(save));
  };

  function weightedRarity(world = 1, boss = false) {
    const bonus = Math.max(0, world - 1);
    let roll = Math.random() * 100;
    const legendary = (boss ? 4 : 0.7) + bonus * 0.35;
    const epic = (boss ? 12 : 3.5) + bonus * 0.8;
    const rare = (boss ? 30 : 10) + bonus * 1.6;
    const uncommon = 26;
    if ((roll -= legendary) < 0) return "Legendary";
    if ((roll -= epic) < 0) return "Epic";
    if ((roll -= rare) < 0) return "Rare";
    if ((roll -= uncommon) < 0) return "Uncommon";
    return "Common";
  }

  const BASE_STATS = {
    damage:4, crit:2.5, critDamage:7, attackSpeed:4.5,
    maxHp:18, armor:3.5, regen:0.35,
    moveSpeed:7, pickup:14
  };

  function createGear(world = 1, forcedRarity = null, forcedSlot = null) {
    const slots = CHERRIFT_DATA.slots;
    const types = Object.keys(CHERRIFT_DATA.gearTypes);
    const rarity = forcedRarity || weightedRarity(world, false);
    const raritySpec = RARITIES[rarity];
    const type = types[Math.floor(Math.random() * types.length)];
    const slot = forcedSlot || slots[Math.floor(Math.random() * slots.length)];
    const pool = [...CHERRIFT_DATA.gearTypes[type].stats];
    const stats = {};
    const itemLevel = Math.max(1, world * 5 - 4 + Math.floor(Math.random() * 5));

    for (let i = 0; i < raritySpec.stats; i++) {
      const stat = pool[Math.floor(Math.random() * pool.length)];
      const levelScale = 1 + (itemLevel - 1) * 0.055;
      const value = (BASE_STATS[stat] || 2) * raritySpec.mult * levelScale * (0.82 + Math.random() * 0.38);
      stats[stat] = Math.round(((stats[stat] || 0) + value) * 10) / 10;
    }

    return {
      id:`gear_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      slot, type, rarity, itemLevel, stats, locked:false,
      sourceWorld:world,
      createdAt:Date.now()
    };
  }

  function itemPower(item) {
    if (!item) return 0;
    const weights = {
      damage:6, crit:8, critDamage:2.5, attackSpeed:3,
      maxHp:0.32, armor:4, regen:18, moveSpeed:2.5, pickup:0.8
    };
    return Math.round(Object.entries(item.stats || {}).reduce((sum, [key, value]) => sum + value * (weights[key] || 1), 0));
  }

  function sellValue(item) {
    const base = RARITIES[item?.rarity]?.sell || 4;
    return Math.max(base, Math.floor(base * (1 + ((item?.itemLevel || 1) - 1) * 0.08)));
  }

  function addItem(save, item, toast = true) {
    normalize(save);
    if (save.inventory.length >= MAX_INVENTORY) {
      const value = sellValue(item);
      save.coins += value;
      if (toast) UI.toast(`Inventory full · item converted to ${value} coins`);
      return false;
    }
    save.inventory.push(item);
    save.lootStats.totalDrops++;
    if (item.rarity === "Rare") save.lootStats.rareDrops++;
    if (item.rarity === "Epic") save.lootStats.epicDrops++;
    if (item.rarity === "Legendary") save.lootStats.legendaryDrops++;
    if (toast) UI.toast(`${item.rarity} ${item.slot} dropped!`);
    return true;
  }

  function grantAccountXp(save, amount) {
    normalize(save);
    const result = { gained:Math.max(0, Math.floor(amount || 0)), levels:0 };
    save.account.xp += result.gained;
    save.account.totalXp += result.gained;
    while (save.account.xp >= save.account.xpNext) {
      save.account.xp -= save.account.xpNext;
      save.account.level++;
      result.levels++;
      save.account.xpNext = xpForLevel(save.account.level);
    }
    return result;
  }

  function injectUI() {
    if (!id("v050Style")) {
      const link = document.createElement("link");
      link.id = "v050Style";
      link.rel = "stylesheet";
      link.href = "v050.css?v=050";
      document.head.appendChild(link);
    }

    const news = q(".news-card .news-row");
    if (news && !id("accountProgressV050")) {
      const card = document.createElement("div");
      card.id = "accountProgressV050";
      card.className = "account-progress-v050";
      card.innerHTML = `
        <div class="account-level-line"><span>Player Level</span><b id="accountLevelV050">1</b></div>
        <div class="account-xp-bar"><i id="accountXpFillV050"></i></div>
        <small id="accountXpTextV050">0 / 178 XP</small>`;
      news.insertAdjacentElement("afterend", card);
    }

    const invPanel = q("#gear .inventory-panel");
    if (invPanel && !id("inventoryToolsV050")) {
      const tools = document.createElement("div");
      tools.id = "inventoryToolsV050";
      tools.className = "inventory-tools-v050";
      tools.innerHTML = `
        <select id="inventoryFilterV050">
          <option value="all">All slots</option>
          ${CHERRIFT_DATA.slots.map(slot => `<option value="${slot}">${slot}</option>`).join("")}
        </select>
        <select id="inventorySortV050">
          <option value="power">Power</option>
          <option value="rarity">Rarity</option>
          <option value="level">Item level</option>
          <option value="newest">Newest</option>
        </select>
        <span id="inventoryCapV050">0/${MAX_INVENTORY}</span>`;
      q(".panel-title-row", invPanel)?.insertAdjacentElement("afterend", tools);
    }
  }

  function updateAccountUI(save) {
    if (!save) return;
    normalize(save);
    const level = id("accountLevelV050");
    const text = id("accountXpTextV050");
    const fill = id("accountXpFillV050");
    if (level) level.textContent = save.account.level;
    if (text) text.textContent = `${Math.floor(save.account.xp)} / ${save.account.xpNext} XP`;
    if (fill) fill.style.width = `${clamp(save.account.xp / save.account.xpNext * 100, 0, 100)}%`;
  }

  function rarityIndex(name) {
    return Object.keys(RARITIES).indexOf(name);
  }

  function getVisibleInventory(save) {
    const filter = id("inventoryFilterV050")?.value || "all";
    const sort = id("inventorySortV050")?.value || "power";
    let list = [...save.inventory];
    if (filter !== "all") list = list.filter(item => item.slot === filter);
    list.sort((a, b) => {
      if (sort === "rarity") return rarityIndex(b.rarity) - rarityIndex(a.rarity) || itemPower(b) - itemPower(a);
      if (sort === "level") return (b.itemLevel || 1) - (a.itemLevel || 1) || itemPower(b) - itemPower(a);
      if (sort === "newest") return (b.createdAt || 0) - (a.createdAt || 0);
      return itemPower(b) - itemPower(a);
    });
    return list;
  }

  function compareMarkup(item, equipped) {
    if (!equipped || equipped.id === item.id) return "";
    const keys = unique([...Object.keys(item.stats || {}), ...Object.keys(equipped.stats || {})]);
    return `<div class="compare-v050"><h5>Compared to equipped</h5>${keys.map(key => {
      const delta = (item.stats?.[key] || 0) - (equipped.stats?.[key] || 0);
      const cls = delta > 0 ? "better" : delta < 0 ? "worse" : "";
      return `<div><span>${key}</span><b class="${cls}">${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}</b></div>`;
    }).join("")}</div>`;
  }

  const oldInit = UI.init.bind(UI);
  UI.init = function initV050(save, game) {
    normalize(save);
    injectUI();
    const result = oldInit(save, game);
    updateAccountUI(save);
    const filter = id("inventoryFilterV050");
    const sort = id("inventorySortV050");
    if (filter) filter.onchange = () => this.renderGear();
    if (sort) sort.onchange = () => this.renderGear();
    return result;
  };

  const oldRefreshMenu = UI.refreshMenu.bind(UI);
  UI.refreshMenu = function refreshMenuV050(...args) {
    normalize(this.save);
    const result = oldRefreshMenu(...args);
    const build = id("menuBuildVersion");
    if (build) build.textContent = "v0.5.0 PROGRESSION";
    updateAccountUI(this.save);
    return result;
  };

  const oldRenderWorld = UI.renderWorldPanel?.bind(UI);
  UI.renderWorldPanel = function renderWorldPanelV050(...args) {
    const result = oldRenderWorld ? oldRenderWorld(...args) : undefined;
    const stage = stages[this.worldCarouselIndex || 0];
    const img = id("carouselStageImage");
    if (stage?.world === 3 && img) {
      img.classList.add("world3-v050");
      img.classList.remove("night");
      img.style.backgroundImage = "radial-gradient(circle at 50% 25%, rgba(255,136,66,.32), transparent 35%), linear-gradient(180deg,#39231d,#130b0b)";
    } else {
      img?.classList.remove("world3-v050");
    }
    return result;
  };

  UI.makeGear = function makeGearV050() {
    const world = Number(this.game?.stage?.world || 1);
    return createGear(world);
  };

  UI.sellGear = function sellGearV050(gearId) {
    const index = this.save.inventory.findIndex(item => item.id === gearId);
    if (index < 0) return;
    const item = this.save.inventory[index];
    if (item.locked) return this.toast("Unlock this item before selling");
    const value = sellValue(item);
    this.save.inventory.splice(index, 1);
    this.save.coins += value;
    this.save.lootStats.soldItems++;
    this.selectedGear = null;
    CherriftStorage.save(this.save);
    this.toast(`Sold for ${value} coins`);
    this.renderGear();
    this.refreshMenu();
  };

  UI.toggleGearLockV050 = function toggleGearLockV050(gearId) {
    const item = this.save.inventory.find(g => g.id === gearId) ||
      Object.values(this.save.equipped || {}).find(g => g?.id === gearId);
    if (!item) return;
    item.locked = !item.locked;
    CherriftStorage.save(this.save);
    this.toast(item.locked ? "Item locked" : "Item unlocked");
    this.showGearDetails(item, this.save.inventory.includes(item) ? "inventory" : "equipped");
  };

  const oldShowDetails = UI.showGearDetails.bind(UI);
  UI.showGearDetails = function showGearDetailsV050(item, source) {
    oldShowDetails(item, source);
    const details = id("gearDetails");
    if (!details || !item) return;
    const equipped = this.save.equipped?.[item.slot];
    const title = q(".gear-detail-title h4", details);
    if (title) title.textContent = `${item.rarity} ${item.type} ${item.slot} · Lv.${item.itemLevel || 1}`;
    const power = document.createElement("div");
    power.className = "item-power-v050";
    power.innerHTML = `<span>Item Power</span><b>${itemPower(item)}</b>`;
    q(".gear-detail-title", details)?.insertAdjacentElement("afterend", power);

    if (source === "inventory") {
      q(".gear-detail-actions", details)?.insertAdjacentHTML("beforeend",
        `<button type="button" data-action="lock">${item.locked ? "Unlock" : "Lock"}</button>`);
      details.insertAdjacentHTML("beforeend", compareMarkup(item, equipped));
    } else {
      q(".gear-detail-actions", details)?.insertAdjacentHTML("beforeend",
        `<button type="button" data-action="lock">${item.locked ? "Unlock" : "Lock"}</button>`);
    }

    q('[data-action="sell"]', details)?.toggleAttribute("disabled", item.locked);
    q('[data-action="lock"]', details)?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleGearLockV050(item.id);
    });
  };

  const oldRenderGear = UI.renderGear.bind(UI);
  UI.renderGear = function renderGearV050(...args) {
    normalize(this.save);
    const originalInventory = this.save.inventory;
    this.save.inventory = getVisibleInventory(this.save);
    const result = oldRenderGear(...args);
    this.save.inventory = originalInventory;

    const cap = id("inventoryCapV050");
    if (cap) cap.textContent = `${this.save.inventory.length}/${MAX_INVENTORY}`;

    qa("#inventory .inv-item").forEach(button => {
      const item = this.save.inventory.find(g => g.id === button.dataset.gearId);
      if (!item) return;
      button.classList.toggle("locked-v050", item.locked);
      button.insertAdjacentHTML("beforeend",
        `<i class="item-level-v050">Lv.${item.itemLevel || 1}</i><i class="item-power-badge-v050">${itemPower(item)}</i>${item.locked ? '<i class="item-lock-v050">🔒</i>' : ""}`);
    });
    return result;
  };

  const gameProto = CherriftGame.prototype;
  const oldStart = gameProto.start;
  gameProto.start = async function startV050(...args) {
    normalize(this.save);
    const result = await oldStart.apply(this, args);
    if (this.player) {
      const level = this.save.account.level;
      const hpBonus = (level - 1) * 2;
      const damageBonus = (level - 1) * 0.45;
      this.player.maxHp += hpBonus;
      this.player.hp += hpBonus;
      this.player.damage += damageBonus;
      this.player.accountLevel = level;
    }
    this.__v050Drops = [];
    return result;
  };

  const oldDamageEnemy = gameProto.damageEnemy;
  gameProto.damageEnemy = function damageEnemyV050(enemy, damage) {
    const aliveBefore = enemy && !enemy.dead && enemy.hp > 0;
    oldDamageEnemy.call(this, enemy, damage);
    if (!aliveBefore || !enemy?.dead || enemy.__lootRolledV050) return;
    enemy.__lootRolledV050 = true;

    const world = Number(this.stage?.world || 1);
    const isBoss = !!enemy.isBoss;
    const chance = isBoss ? 1 : 0.055 + world * 0.012;
    if (Math.random() > chance) return;

    let rarity = weightedRarity(world, isBoss);
    if (isBoss && rarityIndex(rarity) < rarityIndex("Rare")) rarity = "Rare";
    const item = createGear(world, rarity);
    if (addItem(this.save, item, true)) {
      this.__v050Drops = this.__v050Drops || [];
      this.__v050Drops.push(item);
      CherriftStorage.save(this.save);
    }
  };

  const oldStageClear = gameProto.stageClear;
  gameProto.stageClear = function stageClearV050(...args) {
    if (!this.stage || this.stageState?.cleared) return oldStageClear.apply(this, args);
    const stageBefore = this.stage;
    const wasFirst = !this.save.firstClearClaimed?.[stageBefore.id];
    const result = oldStageClear.apply(this, args);

    const xp = Number(stageBefore.accountXp || (stageBefore.world * 25 + stageBefore.index * 10 + (wasFirst ? 30 : 0)));
    this.__v050AccountResult = grantAccountXp(this.save, xp);

    if (stageBefore.boss && !(this.__v050Drops || []).some(item => item.sourceWorld === stageBefore.world && rarityIndex(item.rarity) >= rarityIndex("Rare"))) {
      const guaranteed = createGear(stageBefore.world, stageBefore.world >= 3 ? "Epic" : "Rare");
      addItem(this.save, guaranteed, false);
      this.__v050Drops = this.__v050Drops || [];
      this.__v050Drops.push(guaranteed);
    }

    if (stageBefore.id === "world_2_5" && !this.save.unlockedStages.includes("world_3_1")) {
      this.save.unlockedStages.push("world_3_1");
    }

    CherriftStorage.save(this.save);
    updateAccountUI(this.save);
    return result;
  };

  const oldShowStageClear = UI.showStageClear.bind(UI);
  UI.showStageClear = function showStageClearV050(game, info = {}) {
    oldShowStageClear(game, info);
    let box = id("v050ClearRewards");
    if (!box) {
      box = document.createElement("div");
      box.id = "v050ClearRewards";
      box.className = "v050-clear-rewards glass";
      q("#stageClearModal .stage-clear-summary")?.insertAdjacentElement("afterend", box);
    }
    const account = game.__v050AccountResult || { gained:0, levels:0 };
    const drops = game.__v050Drops || [];
    box.innerHTML = `
      <div><span>Player XP</span><b>+${account.gained}${account.levels ? ` · Level up ×${account.levels}` : ""}</b></div>
      <div><span>Gear drops</span><b>${drops.length ? drops.map(item => `${item.rarity} ${item.slot}`).join(" · ") : "No gear drop"}</b></div>`;
    updateAccountUI(this.save);
  };

  const oldGenerateMap = gameProto.generateMap;
  gameProto.generateMap = function generateMapV050(...args) {
    const result = oldGenerateMap.apply(this, args);
    if (this.stage?.world === 3) {
      result.forEach((obj, index) => {
        if (index % 3 === 0 && obj.kind === "flowers") obj.kind = "mushroom";
        obj.world3Tint = true;
      });
    }
    return result;
  };

  const oldDrawWorld = gameProto.drawWorld;
  gameProto.drawWorld = function drawWorldV050(ctx) {
    oldDrawWorld.call(this, ctx);
    if (this.stage?.world === 3) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#8a321c";
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }
  };

  injectUI();
  window.CHERRIFT_V050 = {
    version:VERSION,
    world3:WORLD3,
    rarities:RARITIES,
    createGear,
    itemPower,
    sellValue,
    xpForLevel
  };

  console.info("[CHERRIFT v0.5] Progression, loot, inventory and World 3 loaded.");
})();