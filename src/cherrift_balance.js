(() => {
  "use strict";
  if (window.CHERRIFT_BALANCE) return;

  const VERSION = "0.9.5-prebeta.1";
  const SLOT_ORDER = Object.freeze(["Weapon", "Helmet", "Armor", "Gloves", "Boots", "Ring", "Necklace"]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const integer = value => Math.max(0, Math.floor(Number(value) || 0));

  const CURRENCIES = Object.freeze({
    coins: { name: "Coin", starter: 500 },
    bloomGems: { name: "Bloom Gem", starter: 0 },
    sakuraEssence: { name: "Sakura Essence", starter: 0 },
    scrap: { name: "Scrap", starter: 0 },
    heartTokens: { name: "Heart Token", starter: 0, enabled: false }
  });

  const ENERGY = Object.freeze({
    starterMax: 50,
    naturalPerHour: 5,
    stageCost: 5,
    trainingCost: 0,
    manualOvercap: 100,
    drinks: Object.freeze({ small: 10, standard: 25, large: 50 }),
    refills: Object.freeze({
      coins: Object.freeze({ cost: 800, amount: 10, dailyLimit: 2 }),
      bloomGems: Object.freeze({ cost: 40, amount: 25, dailyLimit: 3 }),
      ad: Object.freeze({ amount: 10, dailyLimit: 3, enabled: false })
    })
  });

  const WORLD_PROGRESSION = Object.freeze({
    1: Object.freeze({ unlockLevel: 1, completionLevel: 5, recommendedPower: [100, 850], hp: 1, damage: 1, speed: 1 }),
    2: Object.freeze({ unlockLevel: 5, completionLevel: 10, recommendedPower: [800, 1400], hp: 1.55, damage: 1.35, speed: 1.04 }),
    3: Object.freeze({ unlockLevel: 10, completionLevel: 15, recommendedPower: [1350, 2100], hp: 2.25, damage: 1.8, speed: 1.08 }),
    4: Object.freeze({ unlockLevel: 15, completionLevel: 20, recommendedPower: [2000, 2900], hp: 3.2, damage: 2.4, speed: 1.12 }),
    5: Object.freeze({ unlockLevel: 20, completionLevel: 30, recommendedPower: [2800, 4200], hp: 4.6, damage: 3.2, speed: 1.16 }),
    6: Object.freeze({ unlockLevel: 30, completionLevel: 35, recommendedPower: [4100, 5600], hp: 6.2, damage: 4.2, speed: 1.2 })
  });

  const STAGE_REWARDS = Object.freeze({
    1: Object.freeze({ repeat: [90, 100, 110, 125, 150], first: [250, 320, 390, 470, 600] }),
    2: Object.freeze({ repeat: [140, 155, 170, 190, 230], first: [400, 500, 610, 740, 900] }),
    3: Object.freeze({ repeat: [200, 220, 245, 270, 330], first: [650, 770, 900, 1040, 1200] }),
    4: Object.freeze({ repeat: [280, 310, 345, 385, 470], first: [900, 1080, 1280, 1480, 1700] }),
    5: Object.freeze({ repeat: [400, 450, 500, 560, 680], first: [1300, 1550, 1820, 2100, 2400] }),
    6: Object.freeze({ repeat: [560, 630, 700, 780, 950], first: [1900, 2250, 2620, 3000, 3400] })
  });

  const GEAR = Object.freeze({
    rarities: Object.freeze({
      Common: Object.freeze({ multiplier: 1, color: "#f5ebf1" }),
      Uncommon: Object.freeze({ multiplier: 1.18, color: "#86ed9d" }),
      Rare: Object.freeze({ multiplier: 1.35, color: "#77c8ff" }),
      Epic: Object.freeze({ multiplier: 1.8, color: "#d591ff" }),
      Legendary: Object.freeze({ multiplier: 2.4, color: "#ffd36e" })
    }),
    rollQuality: Object.freeze([0.9, 1.1]),
    slotStats: Object.freeze({
      Weapon: Object.freeze(["damage"]),
      Helmet: Object.freeze(["maxHp", "armor"]),
      Armor: Object.freeze(["maxHp", "armor"]),
      Gloves: Object.freeze(["attackSpeed", "crit"]),
      Boots: Object.freeze(["moveSpeed", "maxHp"]),
      Ring: Object.freeze(["crit", "critDamage", "damage"]),
      Necklace: Object.freeze(["skillDamage", "cooldownReduction", "regen"])
    }),
    dismantle: Object.freeze({
      Common: Object.freeze({ scrap: 3, copper: 0, silver: 0 }),
      Uncommon: Object.freeze({ scrap: 5, copper: 0, silver: 0 }),
      Rare: Object.freeze({ scrap: 8, copper: 1, silver: 0 }),
      Epic: Object.freeze({ scrap: 20, copper: 2, silver: 0, silverChance: 0.08 }),
      Legendary: Object.freeze({ scrap: 55, copper: 0, silver: 3 })
    })
  });

  const ARSENAL = Object.freeze({
    maxLevel: 30,
    levelMultiplier: 0.025,
    stars: Object.freeze({ 1: 10, 2: 20, 3: 30 })
  });

  function arsenalCost(targetLevel) {
    const target = clamp(Math.floor(targetLevel), 2, ARSENAL.maxLevel);
    if (target <= 5) return { target, coins: 100 + 50 * (target - 2), scrap: target, copper: 0, silver: 0 };
    if (target <= 15) return {
      target,
      coins: 350 + 75 * (target - 6),
      scrap: target,
      copper: 1 + Math.floor((target - 6) / 4),
      silver: 0
    };
    return {
      target,
      coins: 1100 + 140 * (target - 16),
      scrap: target,
      copper: 3 + Math.floor((target - 16) / 4),
      silver: [18, 21, 24, 27, 30].includes(target) ? 1 : 0
    };
  }

  function xpToNext(level) {
    const current = Math.max(1, Math.floor(Number(level) || 1));
    return Math.round(120 + 55 * Math.pow(current, 1.5));
  }

  const GACHA = Object.freeze({
    pity: Object.freeze({ common: 10, rare: 15, epic: 25 }),
    duplicateEssence: Object.freeze({ Common: 5, Uncommon: 8, Rare: 15, Epic: 45, Legendary: 120 }),
    prices: Object.freeze({
      rare: Object.freeze({ one: 80, ten: 760 }),
      epic: Object.freeze({ one: 240, ten: 2280 })
    }),
    essenceShop: Object.freeze({ Common: 100, Uncommon: 175, Rare: 300, Epic: 900, Legendary: 2400 })
  });

  const TITLES = Object.freeze([
    { id:"gm", name:"Game Master", nameHu:"Game Master", nameEn:"Game Master", rarity:"Rare", gmOnly:true, requirement:{ type:"gmOnly" } },
    { id:"senior_gm", name:"Senior Game Master", nameHu:"Senior Game Master", nameEn:"Senior Game Master", rarity:"Epic", gmOnly:true, requirement:{ type:"gmOnly" } },
    { id:"head_gm", name:"Head Game Master", nameHu:"Head Game Master", nameEn:"Head Game Master", rarity:"Legendary", gmOnly:true, requirement:{ type:"gmOnly" } },
    { id:"rookie_bunny", name:"Rookie Bunny", rarity:"Rare", requirement:{ type:"level", value:5 } },
    { id:"meadow_explorer", name:"Meadow Explorer", rarity:"Rare", stats:{ maxHp:50 }, requirement:{ type:"worldStars", world:1 } },
    { id:"night_hunter", name:"Night Hunter", rarity:"Rare", stats:{ damage:10 }, requirement:{ type:"worldStars", world:2 } },
    { id:"safari_bunny", name:"Safari Bunny", rarity:"Rare", stats:{ maxHp:10 }, requirement:{ type:"worldStars", world:3 } },
    { id:"hard_rock", name:"Hard Rock", rarity:"Rare", stats:{ damage:5 }, requirement:{ type:"worldStars", world:4 } },
    { id:"desert_explorer", name:"Desert Explorer", rarity:"Rare", stats:{ maxHp:10 }, requirement:{ type:"worldStars", world:5 } },
    { id:"ruins_walker", name:"Ruins Walker", rarity:"Rare", stats:{ damage:5 }, requirement:{ type:"worldStars", world:6 } },
    { id:"jungler_bunny", name:"Jungler Bunny", rarity:"Rare", stats:{ maxHp:10 }, hidden:true, requirement:{ type:"worldStars", world:7 } },
    { id:"banker", name:"Banker", rarity:"Rare", stats:{ coinGain:0.01 }, requirement:{ type:"lifetimeCoins", value:10000 } },
    { id:"got_rich", name:"Got Rich", rarity:"Epic", stats:{ coinGain:0.01 }, requirement:{ type:"lifetimeCoins", value:100000 } },
    { id:"golden_bunny", name:"Golden Bunny", rarity:"Legendary", stats:{ coinGain:0.05 }, requirement:{ type:"lifetimeCoins", value:1000000 } },
    { id:"scrap_hunter", name:"Scrap Hunter", rarity:"Rare", requirement:{ type:"allArsenal", value:5 } },
    { id:"dismantler", name:"Dismantler", rarity:"Rare", requirement:{ type:"allArsenal", value:15 } },
    { id:"crazy_set", name:"Crazy Set", rarity:"Rare", hiddenUntilLevel:25, requirement:{ type:"allArsenal", value:25 } },
    { id:"got_some_armors", name:"Got Some Armors", rarity:"Epic", postBeta:true, requirement:{ type:"allArsenal", value:40 } },
    { id:"iron_bunny", name:"Iron Bunny", rarity:"Epic", postBeta:true, requirement:{ type:"allArsenal", value:55 } },
    { id:"master_dismantler", name:"Master Dismantler", rarity:"Epic", postBeta:true, requirement:{ type:"allArsenal", value:75 } },
    { id:"arsenal_hunter", name:"Arsenal Hunter", rarity:"Epic", postBeta:true, requirement:{ type:"allArsenal", value:90 } },
    { id:"one_hundred_army", name:"One Hundred Army", rarity:"Legendary", stats:{ allStats:5 }, postBeta:true, requirement:{ type:"allArsenal", value:100 } },
    { id:"rare_bunny", name:"Rare Bunny", rarity:"Rare", requirement:{ type:"fullGearRarity", value:"Rare" } },
    { id:"epic_bunny", name:"Epic Bunny", rarity:"Epic", stats:{ maxHp:50 }, requirement:{ type:"fullGearRarity", value:"Epic" } },
    { id:"legendary_bunny", name:"Legendary Bunny", rarity:"Legendary", stats:{ damage:20 }, requirement:{ type:"fullGearRarity", value:"Legendary" } },
    { id:"cute_bunny", name:"Cute Bunny", rarity:"Rare", requirement:{ type:"skinRarity", rarity:"Common", value:5 } },
    { id:"pro_bunny", name:"Pro Bunny", rarity:"Rare", requirement:{ type:"skinRarity", rarity:"Rare", value:5 } },
    { id:"cutest_bunny", name:"Cutest Bunny", rarity:"Epic", requirement:{ type:"skinRarity", rarity:"Epic", value:5 } },
    { id:"adorable_bunny", name:"Adorable Bunny", rarity:"Legendary", requirement:{ type:"skinRarity", rarity:"Legendary", value:5 } },
    { id:"collector", name:"Collector", rarity:"Rare", requirement:{ type:"skins", value:10 } },
    { id:"bunny_collector", name:"Bunny Collector", rarity:"Rare", requirement:{ type:"skins", value:20 } },
    { id:"shape_of_bunny", name:"Shape of Bunny", rarity:"Epic", stats:{ chestLuck:0.02 }, requirement:{ type:"skins", value:30 } },
    { id:"monster_slayer", name:"Monster Slayer", rarity:"Rare", requirement:{ type:"kills", value:1000 } },
    { id:"sharpbun", name:"SharpBun", rarity:"Rare", requirement:{ type:"kills", value:3500 } },
    { id:"fighter", name:"Fighter", rarity:"Rare", requirement:{ type:"kills", value:5000 } },
    { id:"monster_hunter", name:"Monster Hunter", rarity:"Rare", requirement:{ type:"kills", value:7500 } },
    { id:"killer_bunny", name:"Killer Bunny", rarity:"Epic", stats:{ maxHp:50 }, requirement:{ type:"kills", value:10000 } },
    { id:"hitbun", name:"HitBun", rarity:"Epic", requirement:{ type:"kills", value:15000 } },
    { id:"killer_master", name:"Killer Master", rarity:"Epic", requirement:{ type:"kills", value:30000 } },
    { id:"legendary_slayer", name:"Legendary Slayer", rarity:"Legendary", stats:{ allStats:5 }, requirement:{ type:"kills", value:50000 } },
    { id:"cherry_fan", name:"Cherry Fan", rarity:"Legendary", reward:{ bloomGems:200 }, requirement:{ type:"loginDays", value:365 } },
    { id:"best_bunny", name:"Best Bunny", rarity:"Rare", gatedByActivePlayers:100, requirement:{ type:"bestWeeklyRank", value:50 } },
    { id:"master_bunny", name:"Master Bunny", rarity:"Epic", gatedByActivePlayers:100, requirement:{ type:"bestWeeklyRank", value:3 } },
    { id:"grandmaster_bunny", name:"GrandMaster Bunny", rarity:"Legendary", gatedByActivePlayers:100, requirement:{ type:"bestWeeklyRank", value:2 } },
    { id:"top_bunny", name:"#1 TOP Bunny", rarity:"Mythical", gatedByActivePlayers:100, requirement:{ type:"bestWeeklyRank", value:1 } }
  ]);

  const FRAMES = Object.freeze([
    { id:"frame0lvl", name:"Bloom Frame", asset:"assets/player/frames/frame0lvl.png", requirement:{ type:"default" } },
    { id:"frame5lvl", name:"Rookie Frame", asset:"assets/player/frames/frame5lvl.png", requirement:{ type:"level", value:5 } },
    { id:"frame30lvl", name:"Level 30 Frame", asset:"assets/player/frames/frame30lvl.png", requirement:{ type:"level", value:30 } },
    { id:"frame50lvl", name:"Level 50 Frame", asset:"assets/player/frames/frame50lvl.png", requirement:{ type:"level", value:50 } },
    { id:"frame80lvl", name:"Level 80 Frame", asset:"assets/player/frames/frame80lvl.png", requirement:{ type:"level", value:80 } },
    { id:"frame100lvl", name:"Level 100 Frame", asset:"assets/player/frames/frame100lvl.png", requirement:{ type:"level", value:100 } },
    { id:"frame150lvl", name:"Level 150 Frame", asset:"assets/player/frames/frame150lvl.png", requirement:{ type:"level", value:150 } },
    { id:"frame200lvl", name:"Level 200 Frame", asset:"assets/player/frames/frame200lvl.png", requirement:{ type:"level", value:200 } },
    { id:"frame225lvl", name:"Level 225 Frame", asset:"assets/player/frames/frame225lvl.png", requirement:{ type:"level", value:225 } },
    { id:"frame250lvl", name:"Level 250 Frame", asset:"assets/player/frames/frame250lvl.png", requirement:{ type:"level", value:250 } },
    { id:"frame_beta", name:"Beta Tester Frame", asset:"assets/player/frames/frame_beta.png", requirement:{ type:"entitlement", value:"beta" } },
    { id:"frame_pre_reg", name:"Pre-registration Frame", asset:"assets/player/frames/frame_pre_reg.png", requirement:{ type:"entitlement", value:"preRegistration" } },
    { id:"frame_event_1", name:"Event Frame I", asset:"assets/player/frames/frame_event_1.png", requirement:{ type:"entitlement", value:"event1" } },
    { id:"frame_event_2", name:"Event Frame II", asset:"assets/player/frames/frame_event_2.png", requirement:{ type:"entitlement", value:"event2" } },
    { id:"frame_event_3", name:"Event Frame III", asset:"assets/player/frames/frame_event_3.png", requirement:{ type:"entitlement", value:"event3" } },
    { id:"frame_rank50", name:"Top 50 Frame", asset:"assets/player/frames/frame_rank50.png", requirement:{ type:"bestWeeklyRank", value:50 } },
    { id:"frame_rank3", name:"Top 3 Frame", asset:"assets/player/frames/frame_rank3.png", requirement:{ type:"bestWeeklyRank", value:3 } },
    { id:"frame_rank2", name:"Top 2 Frame", asset:"assets/player/frames/frame_rank2.png", requirement:{ type:"bestWeeklyRank", value:2 } },
    { id:"frame_rank1", name:"Top 1 Frame", asset:"assets/player/frames/frame_rank1.png", requirement:{ type:"bestWeeklyRank", value:1 } }
  ]);

  window.CHERRIFT_BALANCE = Object.freeze({
    version: VERSION,
    saveSchema: "prebeta-1",
    releaseChannel: "prebeta",
    slotOrder: SLOT_ORDER,
    currencies: CURRENCIES,
    energy: ENERGY,
    worlds: WORLD_PROGRESSION,
    stageRewards: STAGE_REWARDS,
    gear: GEAR,
    arsenal: ARSENAL,
    gacha: GACHA,
    titles: TITLES,
    frames: FRAMES,
    social: Object.freeze({ baseFriendSlots:30, level20Bonus:5, outgoingPerSlot:1, incomingPerSlot:1 }),
    daily: Object.freeze({ questCount:5, questCoinMin:150, questCoinMax:300, completionCoins:500, completionCommonChests:1, completionEnergy:15 }),
    weekly: Object.freeze({ coins:3500, bloomGems:20, rareChests:1, energyDrink:"standard" }),
    xpToNext,
    arsenalCost,
    integer
  });
})();
