import catalog from "./game_catalog.json" with { type: "json" };

// All persistent rewards and costs are computed here. The browser sends an
// operation and identifiers, never a currency delta, item roll or XP award.
const B = catalog.balance;
const n = (value) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const own = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);
const fail = (message) => {
  throw new Error(message);
};
const day = (now) => new Date(now).toISOString().slice(0, 10);
const week = (now) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return day(d);
};
const clone = (value) => structuredClone(value);
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const pick = (values, random) => values[Math.floor(random() * values.length)];
const ranks = (save) => save.account.skillTreeV082.ranks;
const allItems = (save) => [
  ...save.inventory,
  ...Object.values(save.equipped).filter(Boolean),
];
const QUESTS = [
  ["kills", 150, 180, "Slime Cleanup", "⚔"],
  ["runs", 3, 200, "Keep Moving", "▶"],
  ["clears", 2, 230, "Stage Hunter", "🗺"],
  ["coins", 200, 150, "Treasure Trail", "🪙"],
  ["chests", 2, 220, "Open Sesame", "📦"],
  ["gear", 4, 190, "Gear Collector", "🛡"],
  ["bosses", 1, 300, "Boss Breaker", "👑"],
];
const stat = (save, key) =>
  n(save.stats[{ coins: "coinsEarned", gear: "gearFound" }[key] || key]);
const loginRewards = [
  { coins: 300 },
  { chests: { common: 1 } },
  { coins: 400, drinks: { small: 1 } },
  { bloomGems: 10 },
  { coins: 600 },
  { chests: { rare: 1 } },
  { coins: 1000, bloomGems: 20, drinks: { standard: 1 } },
];
const eventLogin = [
  { coins: 300 },
  { chests: { common: 1 }, energy: 10 },
  { coins: 500, bloomGems: 5 },
  { chests: { common: 1 }, energy: 15 },
  { coins: 800, bloomGems: 10 },
  { chests: { rare: 1 }, energy: 20 },
  { coins: 1200, chests: { rare: 1 }, bloomGems: 25, drinks: { standard: 1 } },
];
const eventTasks = {
  login: { goal: 1, reward: { coins: 100 } },
  kills: { goal: 50, reward: { coins: 250, energy: 5 } },
  clears: { goal: 1, reward: { chests: { common: 1 }, energy: 10 } },
};
const eventShop = {
  small_drink: {
    price: { coins: 500 },
    limit: 2,
    reward: { drinks: { small: 1 } },
  },
  common_chest: {
    price: { coins: 650 },
    limit: 2,
    reward: { chests: { common: 1 } },
  },
  rare_chest: {
    price: { bloomGems: 70 },
    limit: 1,
    reward: { chests: { rare: 1 } },
  },
  epic_chest: {
    price: { bloomGems: 220 },
    limit: 1,
    reward: { chests: { epic: 1 } },
  },
};

function makeQuests(save, now, random) {
  const pool = [...QUESTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5).map(([type, target, coins, title, icon], i) => ({
    id: `${day(now)}_${i}_${type}`,
    type,
    target,
    title,
    icon,
    start: stat(save, type),
    claimed: false,
    reward: { coins },
  }));
}

export function prepareSave(value, now = Date.now(), random = rng) {
  const s = clone(value);
  s.coins = n(s.coins);
  s.bloomGems = n(s.bloomGems ?? s.blossomGems);
  s.blossomGems = s.bloomGems;
  s.sakuraEssence = n(s.sakuraEssence);
  s.inventory = Array.isArray(s.inventory) ? s.inventory : [];
  s.equipped ||= {};
  s.chests = { common: 0, rare: 0, epic: 0, ...s.chests };
  s.unlockedSkins = Array.isArray(s.unlockedSkins)
    ? s.unlockedSkins
    : ["cherry_default"];
  s.unlockedStages = Array.isArray(s.unlockedStages)
    ? s.unlockedStages
    : ["world_1_1"];
  s.clearedStages ||= {};
  s.firstClearClaimed ||= {};
  s.stageStars ||= {};
  s.stageStats ||= {};
  s.stats = {
    kills: 0,
    clears: 0,
    runs: 0,
    coinsEarned: 0,
    loginDays: 0,
    chests: 0,
    gearFound: 0,
    bosses: 0,
    ...s.stats,
  };
  s.account ||= { level: 1, xp: 0, totalXp: 0 };
  s.account.skillTreeV082 ||= { ranks: {}, resetCount: 0 };
  s.account.skillTreeV082.ranks ||= {};
  s.bag ||= {};
  s.bag.items ||= {};
  s.bag.materials ||= {};
  s.bag.materials.gearScrap = n(s.bag.materials.gearScrap);
  s.bag.materials.stones ||= {};
  s.bag.materials.slotCores ||= {};
  s.arsenal ||= {};
  s.arsenal.slots ||= {};
  for (const slot of B.slotOrder)
    s.arsenal.slots[slot] ||= { level: 1, stars: 1, salvageCount: 0 };
  s.economy ||= {};
  s.ownedTitles ||= [];
  s.titleRewardsClaimed ||= [];
  s.profile ||= {};
  s.prebeta ||= {};
  s.security ||= {};
  s.security.online ||= { receipts: [] };
  s.energyState ||= { max: 50, lastTick: now, refills: {}, drinks: {} };
  s.energyState.drinks ||= {};
  const energy = s.energyState,
    max = Math.max(50, n(energy.max));
  s.energy = n(s.energy ?? max);
  energy.max = max;
  const hours = Math.max(
    0,
    Math.floor((now - Number(energy.lastTick || now)) / 3600000),
  );
  if (s.energy < max) {
    s.energy = Math.min(max, s.energy + hours * 5);
    if (hours)
      energy.lastTick = Number(energy.lastTick || now) + hours * 3600000;
  } else energy.lastTick = now;
  if (energy.refills?.day !== day(now)) {
    s.energy = Math.max(s.energy, max);
    energy.refills = { day: day(now), coins: 0, bloomGems: 0, ad: 0 };
  }
  if (s.daily?.key !== day(now) || !s.security.online.dailyOwned) {
    s.daily = {
      key: day(now),
      quests: makeQuests(s, now, random),
      claimedBonus: false,
      rerolls: 1,
    };
    s.security.online.dailyOwned = true;
  }
  s.login ||= {};
  s.login.firstDay ||= day(now);
  s.login.claimed ||= {};
  if (s.weekly?.key !== week(now))
    s.weekly = {
      key: week(now),
      start: {
        runs: stat(s, "runs"),
        clears: stat(s, "clears"),
        kills: stat(s, "kills"),
      },
      claimed: false,
    };
  if (s.shop?.key !== day(now)) s.shop = { key: day(now), claims: {} };
  s.shop.claims ||= {};
  s.events ||= {};
  const event = (s.events.closed_beta_2026 ||= {
    loginDays: [],
    loginClaimed: [],
    daily: {},
    shop: {},
  });
  event.loginDays ||= [];
  event.loginClaimed ||= [];
  event.daily ||= {};
  event.shop ||= {};
  if (!event.loginDays.includes(day(now))) event.loginDays.push(day(now));
  event.daily[day(now)] ||= {
    baseKills: stat(s, "kills"),
    baseClears: stat(s, "clears"),
    claimed: [],
  };
  event.shop[day(now)] ||= {};
  s.buffs ||= {};
  s.buffs.active ||= [];
  return s;
}

function pay(s, price) {
  for (const [key, value] of Object.entries(price)) {
    if (n(s[key]) < value) fail("not_enough_" + key);
  }
  for (const [key, value] of Object.entries(price)) s[key] = n(s[key]) - value;
  s.blossomGems = s.bloomGems;
}
function grant(s, reward) {
  for (const key of ["coins", "bloomGems", "sakuraEssence"])
    s[key] = n(s[key]) + n(reward[key]);
  s.blossomGems = s.bloomGems;
  s.energy = Math.min(100, n(s.energy) + n(reward.energy));
  for (const [tier, amount] of Object.entries(reward.chests || {}))
    s.chests[tier] = n(s.chests[tier]) + n(amount);
  for (const [kind, amount] of Object.entries(reward.drinks || {}))
    s.energyState.drinks[kind] = n(s.energyState.drinks[kind]) + n(amount);
  s.economy.lifetimeCoinsEarned =
    n(s.economy.lifetimeCoinsEarned) + n(reward.coins);
  s.stats.coinsEarned = n(s.stats.coinsEarned) + n(reward.coins);
}
function itemPower(item) {
  return Math.round(
    Object.entries(item?.stats || {}).reduce(
      (sum, [key, value]) =>
        sum +
        Number(value || 0) *
          ({
            damage: 6,
            crit: 8,
            critDamage: 2.5,
            attackSpeed: 3,
            maxHp: 0.32,
            armor: 4,
            regen: 18,
            moveSpeed: 2.5,
            pickup: 0.8,
          }[key] || 1),
      0,
    ),
  );
}
function sellValue(item) {
  const base = catalog.rarities[item.rarity]?.sell || 4;
  return Math.max(
    base,
    Math.floor(base * (1 + (Math.max(1, n(item.itemLevel)) - 1) * 0.08)),
  );
}
function stageAllowed(s, stage) {
  const rights = s.prebeta?.entitlements || {};
  if (rights.owner || rights.allContent) return true;
  const w = stage.world,
    i = stage.index;
  if (
    w > 1 &&
    (s.account.level < B.worlds[w].unlockLevel ||
      ![1, 2, 3, 4, 5].every(
        (chapter) => n(s.stageStars[`world_${w - 1}_${chapter}`]) >= 1,
      ))
  )
    return false;
  return i === 1 || n(s.stageStars[`world_${w}_${i - 1}`]) >= 1;
}
function titleStats(s) {
  const total = {};
  for (const title of B.titles.filter((t) => s.ownedTitles.includes(t.id)))
    for (const [key, value] of Object.entries(title.stats || {}))
      total[key] = (total[key] || 0) + value;
  return total;
}
export function serverPower(s) {
  const title = titleStats(s),
    items = Object.values(s.equipped || {}).filter(Boolean),
    gearPower = items.reduce((sum, item) => sum + itemPower(item), 0),
    arsenal = items.reduce(
      (sum, item) =>
        sum +
        (gearPower / items.length) *
          Math.max(0, n(s.arsenal?.slots?.[item.slot]?.level) - 1) *
          0.025,
      0,
    );
  return Math.max(
    100,
    Math.round(
      100 +
        gearPower +
        arsenal +
        Math.max(0, n(s.account?.level) - 1) * 12 +
        n(title.damage) * 4 +
        n(title.maxHp) * 0.6 +
        n(title.allStats) * 12,
    ),
  );
}
function evaluateTitles(s) {
  for (const t of B.titles) {
    if (
      t.postBeta ||
      t.hidden ||
      t.gmOnly ||
      t.gatedByActivePlayers > n(s.economy.activePlayers)
    )
      continue;
    const r = t.requirement;
    let pass = false;
    if (r.type === "level") pass = n(s.account.level) >= r.value;
    if (r.type === "kills" || r.type === "loginDays")
      pass = n(s.stats[r.type]) >= r.value;
    if (r.type === "lifetimeCoins")
      pass = n(s.economy.lifetimeCoinsEarned) >= r.value;
    if (r.type === "skins") pass = s.unlockedSkins.length >= r.value;
    if (r.type === "skinRarity")
      pass =
        catalog.skins.filter(
          (skin) =>
            skin.rarity === r.rarity && s.unlockedSkins.includes(skin.id),
        ).length >= r.value;
    if (r.type === "worldStars")
      pass = [1, 2, 3, 4, 5].every(
        (i) => n(s.stageStars[`world_${r.world}_${i}`]) >= 3,
      );
    if (r.type === "allArsenal")
      pass = B.slotOrder.every(
        (slot) => n(s.arsenal.slots[slot].level) >= r.value,
      );
    if (r.type === "fullGearRarity")
      pass = B.slotOrder.every((slot) => s.equipped[slot]?.rarity === r.value);
    if (r.type === "bestWeeklyRank")
      pass =
        n(s.economy.bestWeeklyRank) > 0 &&
        n(s.economy.bestWeeklyRank) <= r.value;
    if (pass && !s.ownedTitles.includes(t.id)) {
      s.ownedTitles.push(t.id);
      if (t.reward && !s.titleRewardsClaimed.includes(t.id)) {
        grant(s, t.reward);
        s.titleRewardsClaimed.push(t.id);
      }
    }
  }
  s.account.skillPoints = Math.max(
    0,
    n(s.account.level) -
      Object.values(ranks(s)).reduce((sum, x) => sum + n(x), 0),
  );
  s.elementalResonance ||= {
    schema: 1,
    channel: "beta",
    points: 0,
    totalEarned: 0,
    lastRewardedLevel: 1,
    resetsUsed: 0,
    branches: {},
  };
  const earned = Math.max(0, n(s.account.level) - 4),
    elemental = s.elementalResonance;
  elemental.points =
    n(elemental.points) + Math.max(0, earned - n(elemental.totalEarned));
  elemental.totalEarned = Math.max(earned, n(elemental.totalEarned));
  elemental.lastRewardedLevel = n(s.account.level);
  s.power = serverPower(s);
  s.unlockedStages = catalog.stages
    .filter((stage) => stageAllowed(s, stage))
    .map((stage) => stage.id);
}
function awardXp(s, amount) {
  s.account.xp = n(s.account.xp) + amount;
  s.account.totalXp = n(s.account.totalXp) + amount;
  while (
    s.account.xp >= Math.round(120 + 55 * Math.pow(s.account.level, 1.5)) &&
    s.account.level < 1000
  ) {
    s.account.xp -= Math.round(120 + 55 * Math.pow(s.account.level, 1.5));
    s.account.level++;
  }
}
function syncGear(s) {
  for (const item of allItems(s)) {
    const level = n(s.arsenal.slots[item.slot]?.level) || 1;
    item.baseStats ||= clone(item.stats);
    item.stats = Object.fromEntries(
      Object.entries(item.baseStats).map(([key, v]) => [
        key,
        Math.round(Number(v) * (1 + (level - 1) * 0.025) * 10) / 10,
      ]),
    );
    item.arsenalLevel = level;
    item.itemLevel = level;
    item.arsenalStars = s.arsenal.slots[item.slot]?.stars || 1;
  }
}
function achievementReady(s, key) {
  const stars = Object.values(s.stageStars).reduce((sum, x) => sum + n(x), 0),
    worldClears = (w) =>
      [1, 2, 3, 4, 5].filter((i) => s.clearedStages[`world_${w}_${i}`]).length;
  const checks = {
    first_bloom: s.stats.clears >= 1,
    growing_bunny: s.account.level >= 5,
    petal_hunter: s.stats.kills >= 100,
    pocket_bloom: n(s.economy.lifetimeCoinsEarned) >= 1000,
    chest_peek: n(s.economy.totalChestOpens) >= 5,
    gear_up: allItems(s).length >= 5,
    star_seed: stars >= 5,
    meadow_path: worldClears(1) >= 5,
    pathfinder: s.stats.clears >= 10,
    bloom_veteran: s.account.level >= 10,
    rift_hunter: s.stats.kills >= 1000,
    rare_find: allItems(s).some((x) =>
      ["Rare", "Epic", "Legendary"].includes(x.rarity),
    ),
    star_gazer: stars >= 15,
    chest_hunter: n(s.economy.totalChestOpens) >= 25,
    collector: allItems(s).length >= 20,
    night_survivor: worldClears(2) >= 5,
    powerful_bloom: serverPower(s) >= 1000,
    golden_miracle: allItems(s).some((x) => x.rarity === "Legendary"),
    star_collector: stars >= 30,
    savannah_hero: worldClears(3) >= 5,
    arsenal_in_bloom: B.slotOrder.every(
      (slot) => s.arsenal.slots[slot].level >= 5,
    ),
    chest_master: n(s.economy.totalChestOpens) >= 100,
    cherry_garden: s.unlockedSkins.length >= 10,
    power_overflow: serverPower(s) >= 2500,
    perfect_meadow: [1, 2, 3, 4, 5].every(
      (i) => s.stageStars[`world_1_${i}`] >= 3,
    ),
    veteran_bunny: s.account.level >= 30,
  };
  return own(checks, key) && checks[key];
}
function gear(s, rarity, random, id) {
  const slot = pick(B.slotOrder, random),
    world = Math.max(
      1,
      ...Object.keys(s.clearedStages).map(
        (key) => Number(key.split("_")[1]) || 1,
      ),
    ),
    type = pick(Object.keys(catalog.gearTypes), random),
    spec = catalog.rarities[rarity],
    rollLevel = world * 5 - 4 + Math.floor(random() * 5),
    stats = {};
  for (let i = 0; i < spec.stats; i++) {
    const key = pick(catalog.gearTypes[type].stats, random);
    stats[key] =
      Math.round(
        ((stats[key] || 0) +
          (catalog.gearBase[key] || 2) *
            spec.mult *
            (1 + (rollLevel - 1) * 0.055) *
            (0.82 + random() * 0.38)) *
          10,
      ) / 10;
  }
  const quality = random(),
    mult = {
      Common: 0.86 + quality * 0.08,
      Uncommon: 0.84 + quality * 0.08,
      Rare: 0.82 + quality * 0.08,
      Epic: quality < 0.42 ? 0.8 : quality < 0.82 ? 0.87 : 0.94,
      Legendary: quality < 0.42 ? 0.74 : quality < 0.82 ? 0.82 : 0.92,
    }[rarity];
  for (const key of Object.keys(stats))
    stats[key] = Math.round(stats[key] * mult * 10) / 10;
  const item = {
    id,
    slot,
    type,
    rarity,
    stats,
    baseStats: clone(stats),
    itemLevel: 1,
    rollLevel,
    sourceWorld: world,
    balanceVersion: "0931",
    asset: {
      Weapon: "assets/items/equipments/weapons/sword_sword.png",
      Helmet: "assets/items/equipments/armors/leather_helmet.png",
      Armor: "assets/items/equipments/armors/leather_chestplate.png",
      Gloves: "assets/items/equipments/armors/leather_gloves.png",
      Boots: "assets/items/equipments/armors/leather_leg_armor.png",
      Ring: "assets/items/equipments/accessories/copper_ring.png",
      Necklace: "assets/items/equipments/accessories/copper_necklance.png",
    }[slot],
  };
  if (s.inventory.length >= 80) {
    const amount = sellValue(item);
    grant(s, { coins: amount });
    return { kind: "coins", rarity, amount, label: `${amount} Coin` };
  }
  s.inventory.push(item);
  s.stats.gearFound++;
  syncGear(s);
  return {
    kind: "gear",
    item,
    rarity,
    amount: 1,
    label: `${rarity} ${slot}`,
    asset: item.asset,
  };
}
function skin(s, rarity, random) {
  const pool = catalog.skins.filter((x) => x.rarity === rarity);
  const selected = pick(pool.length ? pool : catalog.skins, random),
    duplicate = s.unlockedSkins.includes(selected.id),
    amount = duplicate ? B.gacha.duplicateEssence[rarity] : 0;
  if (duplicate) grant(s, { sakuraEssence: amount });
  else s.unlockedSkins.push(selected.id);
  return {
    kind: "skin",
    duplicate,
    rarity,
    amount,
    skinId: selected.id,
    label: selected.name,
    asset: selected.splash || selected.icon,
  };
}
function arsenalCost(target) {
  if (target <= 5)
    return {
      coins: 100 + 50 * (target - 2),
      scrap: target,
      copper: 0,
      silver: 0,
    };
  if (target <= 15)
    return {
      coins: 350 + 75 * (target - 6),
      scrap: target,
      copper: 1 + Math.floor((target - 6) / 4),
      silver: 0,
    };
  return {
    coins: 1100 + 140 * (target - 16),
    scrap: target,
    copper: 3 + Math.floor((target - 16) / 4),
    silver: [18, 21, 24, 27, 30].includes(target) ? 1 : 0,
  };
}

export function applyGameAction(current, operation, params = {}, options = {}) {
  const now = options.now ?? Date.now(),
    random = options.random || rng,
    id = options.id || (() => crypto.randomUUID());
  const s = prepareSave(current, now, random),
    online = s.security.online;
  let rewards = [];
  if (operation === "refresh_state") {
    // Server time alone owns daily rollover, Energy regeneration and login days.
  } else if (operation === "start_run") {
    const training = params.stage_id === "training_test";
    const stage = training ? {id:"training_test",training:true} : catalog.stages.find((x) => x.id === params.stage_id);
    if (!stage) fail("invalid_stage");
    if (
      online.run &&
      now - online.run.startedAt < 30 * 60000 &&
      !online.run.ended
    )
      fail("run_already_active");
    if (training) {
      const title = s.profile.activeTitle;
      if (!["gm","senior_gm","head_gm"].includes(title) || !s.ownedTitles.includes(title)) fail("stage_locked");
    } else {
      if (!stageAllowed(s, stage)) fail("stage_locked");
      if (s.energy < 5) fail("not_enough_energy");
    }
    online.run = {
      id: id(),
      stageId: stage.id,
      startedAt: now,
      star: 0,
      kills: 0,
      ended: false,
      ...(training ? {training:true} : {}),
    };
    s.selectedStageId = stage.id;
    // Training has a server-authorized ticket, but never spends Energy,
    // consumes run buffs, counts a run, or grants progression.
    if (training) return {save:s,rewards};
    s.stats.runs++;
    for (const buff of s.buffs.active)
      buff.runs = Math.max(0, n(buff.runs) - 1);
    s.buffs.active = s.buffs.active.filter((b) => b.runs > 0);
  } else if (operation === "abandon_run") {
    if (!online.run || online.run.id !== params.run_id) fail("invalid_run");
    online.run.ended = true;
  } else if (operation === "checkpoint_run" || operation === "end_run") {
    const run = online.run;
    if (!run || run.id !== params.run_id || run.ended) fail("invalid_run");
    if (run.training) {
      if (operation !== "end_run" || n(params.star) || n(params.kills)) fail("invalid_run_progress");
      run.ended = true;
      return {save:s,rewards};
    }
    const stage = catalog.stages.find((x) => x.id === run.stageId),
      elapsed = (now - run.startedAt) / 1000,
      kills = n(params.kills),
      star = n(params.star);
    if (
      elapsed < 0 ||
      elapsed > 1800 ||
      kills < run.kills ||
      kills > stage.goalKills ||
      kills > Math.floor(elapsed * 8) ||
      star > 3
    )
      fail("invalid_run_progress");
    const threshold =
      star === 3
        ? stage.goalKills
        : star === 2
          ? Math.ceil(stage.goalKills * 0.5)
          : stage.id === "world_1_1"
            ? 0
            : Math.min(
                stage.raidEvery || Math.ceil(stage.goalKills * 0.25),
                stage.goalKills,
              );
    if (
      star > 0 &&
      (kills < threshold ||
        (stage.id === "world_1_1" && star === 1 && elapsed < 60))
    )
      fail("checkpoint_not_reached");
    if (star > run.star) {
      if (run.star === 0) {
        if (s.energy < 5) fail("not_enough_energy");
        s.energy -= 5;
        s.energyState.lastTick = now;
      }
      const delta = kills - run.kills;
      s.stats.kills += delta;
      grant(s, { coins: delta * (1 + stage.world) });
      awardXp(
        s,
        Math.round(
          ((stage.accountXp || 100) * Math.max(0, star - run.star)) / 3,
        ),
      );
      s.stageStars[stage.id] = Math.max(n(s.stageStars[stage.id]), star);
      s.stageStats[stage.id] ||= { clears: 0, bestTime: 0, bestKills: 0 };
      s.stageStats[stage.id].stars = s.stageStars[stage.id];
      run.kills = kills;
      run.star = star;
      if (star === 3) {
        const first = !s.firstClearClaimed[stage.id];
        grant(s, stage.repeatReward || {});
        if (first) {
          grant(s, stage.firstClearReward || {});
          s.firstClearClaimed[stage.id] = true;
        }
        s.clearedStages[stage.id] = true;
        s.stats.clears++;
        s.stats.bosses++;
        s.stageStats[stage.id].clears++;
        s.stageStats[stage.id].bestKills = Math.max(
          n(s.stageStats[stage.id].bestKills),
          kills,
        );
        s.stageStats[stage.id].bestTime = s.stageStats[stage.id].bestTime
          ? Math.min(s.stageStats[stage.id].bestTime, elapsed)
          : elapsed;
        const next =
          catalog.stages.find(
            (x) => x.id === `world_${stage.world}_${stage.index + 1}`,
          ) ||
          catalog.stages.find((x) => x.id === `world_${stage.world + 1}_1`);
        if (next && !s.unlockedStages.includes(next.id))
          s.unlockedStages.push(next.id);
        if (next) s.selectedStageId = next.id;
        rewards.push(
          gear(
            s,
            pick(["Common", "Common", "Uncommon", "Rare"], random),
            random,
            id(),
          ),
        );
        const stone = ["copper", "iron", "steel", "silver", "royal"][
          Math.min(4, stage.world - 1)
        ];
        s.bag.materials.stones[stone] =
          n(s.bag.materials.stones[stone]) + 1 + Math.floor(stage.world / 2);
        run.ended = true;
      }
    }
    if (operation === "end_run") run.ended = true;
  } else if (operation === "open_chest") {
    const tier = params.tier,
      count = n(params.count);
    if (!own(B.gacha.pity, tier) || ![1, 10].includes(count))
      fail("invalid_chest");
    if (n(s.chests[tier]) < count) fail("not_enough_chests");
    s.gacha ||= {};
    s.gacha.pity ||= {};
    s.gacha.opened ||= {};
    s.gacha.history ||= [];
    s.chests[tier] -= count;
    for (let i = 0; i < count; i++) {
      const pity = n(s.gacha.pity[tier]) + 1,
        guaranteed = pity >= B.gacha.pity[tier];
      s.gacha.pity[tier] = guaranteed ? 0 : pity;
      let reward;
      if (guaranteed)
        reward = skin(
          s,
          { common: "Common", rare: "Rare", epic: "Epic" }[tier],
          random,
        );
      else {
        const roll = Math.min(
          0.999999,
          random() + Math.min(0.15, titleStats(s).chestLuck || 0),
        );
        const table =
          tier === "common"
            ? [
                [0.66, "gear", "Common"],
                [0.88, "gear", "Uncommon"],
                [0.96, "skin", "Common"],
                [0.995, "gear", "Rare"],
                [1, "skin", "Rare"],
              ]
            : tier === "rare"
              ? [
                  [0.25, "gear", "Uncommon"],
                  [0.8, "gear", "Rare"],
                  [0.88, "skin", "Common"],
                  [0.98, "skin", "Rare"],
                  [1, "gear", "Epic"],
                ]
              : [
                  [0.48, "gear", "Rare"],
                  [0.85, "gear", "Epic"],
                  [0.9, "skin", "Rare"],
                  [1, "skin", "Epic"],
                ];
        const [, kind, rarity] = table.find((row) => roll < row[0]);
        reward =
          kind === "skin"
            ? skin(s, rarity, random)
            : gear(s, rarity, random, id());
      }
      rewards.push(reward);
      s.gacha.history.unshift({ type: tier, reward, at: now });
    }
    s.gacha.history = s.gacha.history.slice(0, 50);
    s.gacha.opened[tier] = n(s.gacha.opened[tier]) + count;
    s.stats.chests += count;
    s.economy.totalChestOpens = n(s.economy.totalChestOpens) + count;
  } else if (operation === "buy_chest") {
    const count = n(params.count) || 1;
    if (![1, 10].includes(count) || !own(B.gacha.pity, params.tier))
      fail("invalid_purchase");
    const price =
      params.tier === "common"
        ? { coins: 450 * count }
        : {
            bloomGems:
              B.gacha.prices[params.tier][count === 10 ? "ten" : "one"],
          };
    pay(s, price);
    s.chests[params.tier] = n(s.chests[params.tier]) + count;
  } else if (operation === "buy_skin") {
    const skin = catalog.skins.find((x) => x.id === params.skin_id);
    if (!skin || s.unlockedSkins.includes(skin.id)) fail("invalid_skin");
    pay(s, { sakuraEssence: B.gacha.essenceShop[skin.rarity] || 300 });
    s.unlockedSkins.push(skin.id);
  } else if (operation === "shop_free") {
    const reward = { freeCoins: { coins: 100 }, freeEnergy: { energy: 5 } }[
      params.kind
    ];
    if (
      !own({ freeCoins: 1, freeEnergy: 1 }, params.kind) ||
      !reward ||
      s.shop.claims[params.kind]
    )
      fail("already_claimed");
    s.shop.claims[params.kind] = true;
    grant(s, reward);
  } else if (operation === "salvage_gear" || operation === "merge_gear") {
    if (!B.slotOrder.includes(params.slot)) fail("invalid_slot");
    const candidates = s.inventory
      .filter((x) => x.slot === params.slot && !x.locked)
      .sort((a, b) => itemPower(a) - itemPower(b));
    const count = operation === "merge_gear" ? 3 : 1;
    if (candidates.length < count) fail("not_enough_items");
    const removed = candidates.slice(0, count),
      ids = removed.map((x) => x.id);
    s.inventory = s.inventory.filter((x) => !ids.includes(x.id));
    if (count === 3) {
      s.bag.materials.slotCores[params.slot] =
        n(s.bag.materials.slotCores[params.slot]) + 1;
      s.bag.materials.gearScrap += 3;
    } else {
      const reward =
        B.gear.dismantle[removed[0].rarity] || B.gear.dismantle.Common;
      s.bag.materials.gearScrap += reward.scrap;
      const state = s.arsenal.slots[params.slot];
      state.salvageCount = n(state.salvageCount) + 1;
      if (state.salvageCount % 3 === 0)
        s.bag.materials.slotCores[params.slot] =
          n(s.bag.materials.slotCores[params.slot]) + 1;
      s.bag.materials.stones.copper = n(s.bag.materials.stones.copper) + 1;
    }
  } else if (
    ["equip", "unequip", "lock", "sell", "dismantle"].includes(operation)
  ) {
    if (operation === "unequip") {
      if (!B.slotOrder.includes(params.slot)) fail("invalid_slot");
      const item = s.equipped[params.slot];
      if (!item) fail("item_not_found");
      if (s.inventory.length >= 80) fail("inventory_full");
      s.inventory.push(item);
      delete s.equipped[params.slot];
    } else {
      const ids = Array.isArray(params.item_ids)
        ? [...new Set(params.item_ids)]
        : [params.item_id];
      if (
        !ids.length ||
        ids.length > 80 ||
        ids.some((x) => typeof x !== "string" || !x || x.length > 100)
      )
        fail("invalid_items");
      const items = ids.map((key) =>
        s.inventory.find((item) => item.id === key),
      );
      if (items.some((x) => !x)) fail("item_not_found");
      if (operation === "equip") {
        if (items.length !== 1) fail("invalid_items");
        const item = items[0],
          old = s.equipped[item.slot];
        s.inventory = s.inventory.filter((x) => x.id !== item.id);
        if (old) s.inventory.push(old);
        s.equipped[item.slot] = item;
      } else if (operation === "lock") {
        for (const item of items) item.locked = !item.locked;
      } else {
        if (items.some((x) => x.locked)) fail("item_locked");
        s.inventory = s.inventory.filter((x) => !ids.includes(x.id));
        for (const item of items) {
          if (operation === "sell") grant(s, { coins: sellValue(item) });
          else {
            const reward =
              B.gear.dismantle[item.rarity] || B.gear.dismantle.Common;
            s.bag.materials.gearScrap += reward.scrap;
            s.bag.materials.stones.copper =
              n(s.bag.materials.stones.copper) + n(reward.copper);
            s.bag.materials.stones.silver =
              n(s.bag.materials.stones.silver) +
              n(reward.silver) +
              (reward.silverChance && random() < reward.silverChance ? 1 : 0);
          }
        }
      }
    }
  } else if (operation === "upgrade_arsenal") {
    if (!B.slotOrder.includes(params.slot)) fail("invalid_slot");
    const state = s.arsenal.slots[params.slot];
    if (!state) fail("invalid_slot");
    const target = n(state.level) + 1;
    if (target > 30 || target > n(s.account.level))
      fail("arsenal_level_locked");
    const cost = arsenalCost(target),
      m = s.bag.materials;
    if (
      m.gearScrap < cost.scrap ||
      n(m.stones.copper) < cost.copper ||
      n(m.stones.silver) < cost.silver
    )
      fail("not_enough_materials");
    pay(s, { coins: cost.coins });
    m.gearScrap -= cost.scrap;
    m.stones.copper = n(m.stones.copper) - cost.copper;
    m.stones.silver = n(m.stones.silver) - cost.silver;
    state.level = target;
    state.stars = target <= 10 ? 1 : target <= 20 ? 2 : 3;
    syncGear(s);
  } else if (operation === "upgrade_skill") {
    const key = params.node_id,
      node = catalog.skills.nodes[key],
      branch = catalog.skills.branches.find((b) => b.nodes.includes(key));
    if (!node || !branch) fail("invalid_skill");
    const previous = branch.nodes[branch.nodes.indexOf(key) - 1];
    const spent = Object.values(ranks(s)).reduce((sum, x) => sum + n(x), 0);
    if (
      s.account.level < node.unlock ||
      n(ranks(s)[key]) >= node.max ||
      spent >= s.account.level ||
      (previous && n(ranks(s)[previous]) < catalog.skills.nodes[previous].max)
    )
      fail("skill_locked");
    ranks(s)[key] = n(ranks(s)[key]) + 1;
  } else if (operation === "reset_skills") {
    if (!Object.values(ranks(s)).some((rank) => n(rank) > 0))
      fail("nothing_to_reset");
    const used = n(s.account.skillTreeV082.resetCount);
    pay(s, { coins: used === 0 ? 0 : 500 + used * 500 });
    s.account.skillTreeV082 = { ranks: {}, resetCount: used + 1 };
  } else if (operation === "refill_energy") {
    const kind = params.kind,
      rule = B.energy.refills[kind];
    if (
      !own(B.energy.refills, kind) ||
      !rule ||
      kind === "ad" ||
      n(s.energyState.refills[kind]) >= rule.dailyLimit ||
      s.energy >= 100
    )
      fail("refill_unavailable");
    pay(s, { [kind]: rule.cost });
    s.energy = Math.min(100, s.energy + rule.amount);
    s.energyState.refills[kind] = n(s.energyState.refills[kind]) + 1;
  } else if (operation === "drink_energy") {
    const amount = B.energy.drinks[params.kind];
    if (!amount || !n(s.energyState.drinks[params.kind]) || s.energy >= 100)
      fail("drink_unavailable");
    s.energyState.drinks[params.kind]--;
    s.energy = Math.min(100, s.energy + amount);
  } else if (operation === "buy_food" || operation === "use_food") {
    const food = catalog.food[params.food_id];
    if (!food) fail("invalid_food");
    if (operation === "buy_food") {
      pay(s, food.price.gems ? { bloomGems: food.price.gems } : food.price);
      s.bag.items[params.food_id] = n(s.bag.items[params.food_id]) + 1;
    } else {
      if (!n(s.bag.items[params.food_id])) fail("food_not_owned");
      const old = s.buffs.active.find(
        (x) => catalog.food[x.id]?.effect === food.effect,
      );
      if (!old && s.buffs.active.length >= 3) fail("buff_limit");
      s.bag.items[params.food_id]--;
      if (old) {
        old.id = params.food_id;
        old.value = Math.max(old.value, food.value);
        old.runs += food.runs;
      } else
        s.buffs.active.push({
          id: params.food_id,
          runs: food.runs,
          value: food.value,
        });
      s.economy.totalFoodUsed = n(s.economy.totalFoodUsed) + 1;
    }
  } else if (operation === "claim_login") {
    if (s.login.claimed[day(now)]) fail("already_claimed");
    const index =
      Math.max(
        0,
        Math.floor(
          (Date.parse(day(now)) - Date.parse(s.login.firstDay)) / 86400000,
        ),
      ) % 7;
    grant(s, loginRewards[index]);
    s.login.claimed[day(now)] = true;
    s.stats.loginDays++;
  } else if (operation === "claim_daily" || operation === "claim_daily_all") {
    const list =
      operation === "claim_daily_all"
        ? s.daily.quests
        : s.daily.quests.filter((x) => x.id === params.quest_id);
    if (!list.length) fail("invalid_quest");
    let claims = 0;
    for (const q of list) {
      if (!q.claimed && stat(s, q.type) - n(q.start) >= q.target) {
        q.claimed = true;
        grant(s, q.reward);
        claims++;
      }
    }
    if (!claims) fail("quest_not_ready");
  } else if (operation === "claim_daily_bonus") {
    if (s.daily.claimedBonus || !s.daily.quests.every((q) => q.claimed))
      fail("quest_not_ready");
    s.daily.claimedBonus = true;
    grant(s, { coins: 500, chests: { common: 1 }, energy: 15 });
  } else if (operation === "reroll_daily") {
    if (!n(s.daily.rerolls) || s.daily.quests.some((q) => q.claimed))
      fail("reroll_unavailable");
    s.daily.rerolls--;
    s.daily.quests = makeQuests(s, now, random);
  } else if (operation === "claim_weekly") {
    if (
      s.weekly.claimed ||
      !Object.entries({ runs: 5, clears: 3, kills: 300 }).every(
        ([key, goal]) => stat(s, key) - n(s.weekly.start[key]) >= goal,
      )
    )
      fail("weekly_not_ready");
    s.weekly.claimed = true;
    grant(s, {
      coins: 3500,
      bloomGems: 20,
      chests: { rare: 1 },
      drinks: { standard: 1 },
    });
  } else if (operation.startsWith("event_")) {
    const event = s.events.closed_beta_2026,
      today = event.daily[day(now)];
    if (operation === "event_login") {
      const index = n(params.day) - 1;
      if (
        index < 0 ||
        index >= 7 ||
        event.loginDays.length <= index ||
        event.loginClaimed.includes(index + 1)
      )
        fail("event_not_ready");
      grant(s, eventLogin[index]);
      event.loginClaimed.push(index + 1);
    } else if (operation === "event_daily") {
      const task = eventTasks[params.task_id];
      if (
        !task ||
        today.claimed.includes(params.task_id) ||
        (params.task_id !== "login" &&
          stat(s, params.task_id) -
            n(today[params.task_id === "kills" ? "baseKills" : "baseClears"]) <
            task.goal)
      )
        fail("event_not_ready");
      grant(s, task.reward);
      today.claimed.push(params.task_id);
    } else if (operation === "event_shop") {
      const item = eventShop[params.item_id],
        used = event.shop[day(now)];
      if (!item || n(used[params.item_id]) >= item.limit)
        fail("event_shop_limit");
      pay(s, item.price);
      grant(s, item.reward);
      used[params.item_id] = n(used[params.item_id]) + 1;
    } else fail("unknown_operation");
  } else if (operation === "welcome_reward") {
    s.eventsV093 ||= {};
    if (s.eventsV093.welcomeClaimed) fail("already_claimed");
    s.eventsV093.welcomeClaimed = true;
    grant(s, { coins: 250, chests: { common: 1 } });
  } else if (operation === "claim_achievement") {
    const achievement = catalog.achievements?.find(
      (a) => a.id === params.achievement_id,
    );
    s.fixAchievementsClaimed ||= [];
    if (
      !achievement ||
      s.fixAchievementsClaimed.includes(achievement.id) ||
      !achievementReady(s, achievement.id)
    )
      fail("achievement_not_ready");
    grant(s, achievement.reward);
    s.fixAchievementsClaimed.push(achievement.id);
    if (achievement.reward.themes) {
      s.settings ||= {};
      s.unlockedThemes ||= [];
      for (const theme of achievement.reward.themes)
        if (!s.unlockedThemes.includes(theme)) s.unlockedThemes.push(theme);
    }
  } else if (
    operation === "upgrade_elemental" ||
    operation === "reset_elemental"
  ) {
    s.elementalResonance ||= {
      branches: {},
      points: 0,
      totalEarned: 0,
      resetsUsed: 0,
      lastRewardedLevel: 1,
    };
    const e = s.elementalResonance;
    const order = [
        "power",
        "skillDamage",
        "skinAttackSpeed",
        "calling",
        "ring",
        "passive",
        "skin",
        "capstone",
      ],
      max = {
        power: 5,
        skillDamage: 3,
        skinAttackSpeed: 1,
        calling: 1,
        ring: 3,
        passive: 3,
        skin: 3,
        capstone: 1,
      };
    const level = n(s.account.level);
    if (level < 5) fail("elemental_locked");
    const earned = Math.max(0, level - 4);
    e.points = n(e.points) + Math.max(0, earned - n(e.totalEarned));
    e.totalEarned = Math.max(earned, n(e.totalEarned));
    if (operation === "reset_elemental") {
      const spent = Object.values(e.branches).reduce(
        (sum, b) => sum + Object.values(b).reduce((a, x) => a + n(x), 0),
        0,
      );
      if (!spent) fail("nothing_to_reset");
      pay(s, {
        bloomGems:
          n(e.resetsUsed) < 2
            ? 0
            : Math.min(100, Math.ceil((10 + spent * 2) / 5) * 5),
      });
      e.points = e.totalEarned;
      e.branches = {};
      e.resetsUsed = n(e.resetsUsed) + 1;
    } else {
      if (
        ![
          "blaze",
          "tidecall",
          "stoneveil",
          "windborne",
          "celestial",
          "abyssal",
        ].includes(params.element) ||
        !own(max, params.node)
      )
        fail("invalid_elemental");
      const branch = (e.branches[params.element] ||= {});
      const prev = order[order.indexOf(params.node) - 1];
      if (
        !e.points ||
        n(branch[params.node]) >= max[params.node] ||
        (prev && n(branch[prev]) < max[prev])
      )
        fail("elemental_node_locked");
      branch[params.node] = n(branch[params.node]) + 1;
      e.points--;
    }
  } else fail("unknown_operation");
  evaluateTitles(s);
  return { save: s, rewards };
}

export { catalog };
