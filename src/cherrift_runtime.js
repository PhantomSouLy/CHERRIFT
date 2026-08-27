/* CHERRIFT clean runtime
 * Canonical owner: gameplay rendering/performance, global run lifecycle,
 * achievements, and the tiny cross-screen shell helpers that are not owned by
 * a feature module. Feature-screen DOM ownership lives in the feature modules; runtime does not repatch those screens.
 */
(() => {
  "use strict";

  if (window.__CHERRIFT_RUNTIME_CLEAN__) return;
  window.__CHERRIFT_RUNTIME_CLEAN__ = true;

  const VERSION = "0.9.8.2-clean-runtime";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const num = value => Math.max(0, Math.floor(Number(value) || 0));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const state = {
    started:false,
    wrapped:false,
    clickBound:false,
    achievementFilter:"all",
    worldImages:new Map(),
    enemyImages:new Map(),
    patterns:new WeakMap(),
    fireflySprites:new WeakMap(),
    inGameSettings:false,
    runActive:false
  };

  const ENEMY_SHEETS = Object.freeze({
    pink_slime:{src:"assets/enemies/world_1/slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:7,displayW:78,displayH:66},
    blue_slime:{src:"assets/enemies/world_1/blue_slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:7,displayW:82,displayH:66},
    tank_blue_slime:{src:"assets/enemies/world_1/tank_blue_slime_sprite_sheet.png",cols:4,rows:4,moveRow:1,fps:6,displayW:112,displayH:94},
    small_mushroom:{src:"assets/enemies/world_1/small_mushroom_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:6,displayW:76,displayH:68},
    angry_ent:{src:"assets/enemies/world_1/angry_ent_sprite_sheet_rgba.png",cols:4,rows:3,moveRow:1,fps:6,displayW:102,displayH:116},
    angry_mushroom:{src:"assets/enemies/world_2/angry_mushroom_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:6,displayW:92,displayH:80},
    dark_ent:{src:"assets/enemies/world_2/dark_ent_sprite_sheet_rgba.png",cols:4,rows:3,moveRow:1,fps:6,displayW:106,displayH:120},
    ghost_slime:{src:"assets/enemies/world_2/ghost_slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:9,displayW:78,displayH:64,alpha:.88},
    shadow_bat:{src:"assets/enemies/world_2/shadow_bat_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:10,displayW:84,displayH:64,yOffset:-4},
    big_green_slime:{src:"assets/enemies/world_3/big_green_slime_sprite.png",cols:4,rows:3,moveRow:1,fps:6,displayW:104,displayH:82},
    falcon:{src:"assets/enemies/world_3/falcon_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:9,displayW:90,displayH:72,yOffset:-5},
    small_coyote:{src:"assets/enemies/world_3/small_coyote_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:8,displayW:88,displayH:68},
    red_rock_golem:{src:"assets/enemies/world_4/red_rock_golem_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:6,displayW:118,displayH:112},
    red_slime:{src:"assets/enemies/world_4/red_slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:7,displayW:80,displayH:66},
    spike_slime:{src:"assets/enemies/world_4/spike_slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:7,displayW:86,displayH:72},
    sand_ancient_ruin_guardian:{src:"assets/enemies/world_5/sand_ancient_ruin_guardian_sprite_shee.png",cols:4,rows:3,moveRow:1,fps:6,displayW:120,displayH:112},
    sand_scorpion:{src:"assets/enemies/world_5/sand_scorpion_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:8,displayW:96,displayH:74},
    sand_snake:{src:"assets/enemies/world_5/sand_snake_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:8,displayW:90,displayH:72},
    ancient_guardian:{src:"assets/enemies/world_6/ancient_guardian_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:6,displayW:126,displayH:122},
    ancient_sentinel:{src:"assets/enemies/world_6/ancient_sentinel_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:6,displayW:112,displayH:112},
    dark_bat:{src:"assets/enemies/world_6/dark_bat_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:10,displayW:88,displayH:66,yOffset:-5},
    dark_ghostly_slime:{src:"assets/enemies/world_6/dark_ghostly_slime_sprite_sheet.png",cols:4,rows:3,moveRow:1,fps:9,displayW:82,displayH:68,alpha:.88}
  });

  const ENEMY_DEFS = Object.freeze({
    pink_slime:{name:"Pink Slime",hp:34,speed:105,r:20,xp:4,damage:10},
    blue_slime:{name:"Blue Slime",hp:48,speed:122,r:22,xp:5,damage:10},
    tank_blue_slime:{name:"Tank Blue Slime",hp:135,speed:58,r:31,xp:9,damage:16},
    small_mushroom:{name:"Small Mushroom",hp:46,speed:80,r:21,xp:5,damage:9},
    angry_ent:{name:"Angry Ent",hp:126,speed:58,r:30,xp:10,damage:16},
    angry_mushroom:{name:"Angry Mushroom",hp:62,speed:82,r:24,xp:7,damage:8,ranged:true,shootRange:520,shootCooldown:2.4,projectileSpeed:260,projectileDamage:10},
    dark_ent:{name:"Dark Ent",hp:150,speed:62,r:31,xp:11,damage:18},
    ghost_slime:{name:"Ghost Slime",hp:24,speed:165,r:20,xp:4,damage:9,alpha:.86},
    shadow_bat:{name:"Bat",hp:38,speed:112,r:20,xp:4,damage:10,flying:true},
    big_green_slime:{name:"Big Green Slime",hp:112,speed:72,r:29,xp:9,damage:14},
    falcon:{name:"Falcon",hp:44,speed:150,r:20,xp:6,damage:11,flying:true},
    small_coyote:{name:"Small Coyote",hp:72,speed:128,r:23,xp:7,damage:13},
    red_rock_golem:{name:"Red Rock Golem",hp:190,speed:54,r:33,xp:13,damage:20},
    red_slime:{name:"Red Slime",hp:62,speed:116,r:22,xp:7,damage:12},
    spike_slime:{name:"Spike Slime",hp:82,speed:104,r:24,xp:8,damage:15},
    sand_ancient_ruin_guardian:{name:"Sand Ancient Ruin Guardian",hp:215,speed:62,r:34,xp:15,damage:22},
    sand_scorpion:{name:"Sand Scorpion",hp:108,speed:112,r:26,xp:10,damage:17},
    sand_snake:{name:"Sand Snake",hp:76,speed:142,r:22,xp:8,damage:15},
    ancient_guardian:{name:"Ancient Guardian",hp:250,speed:58,r:36,xp:18,damage:24},
    ancient_sentinel:{name:"Ancient Sentinel",hp:180,speed:72,r:31,xp:14,damage:21},
    dark_bat:{name:"Dark Bat",hp:62,speed:148,r:21,xp:8,damage:14,flying:true},
    dark_ghostly_slime:{name:"Dark Ghostly Slime",hp:70,speed:142,r:22,xp:8,damage:14,alpha:.86}
  });

  const WORLD_POOLS = Object.freeze({
    1:[["pink_slime"],["pink_slime","blue_slime"],["pink_slime","blue_slime","small_mushroom"],["blue_slime","small_mushroom","angry_ent"],["blue_slime","tank_blue_slime","small_mushroom","angry_ent"]],
    2:[["ghost_slime","shadow_bat"],["ghost_slime","shadow_bat","angry_mushroom"],["shadow_bat","angry_mushroom","tank_blue_slime"],["ghost_slime","shadow_bat","dark_ent","tank_blue_slime"],["shadow_bat","angry_mushroom","dark_ent","tank_blue_slime"]],
    3:[["small_mushroom","small_coyote"],["small_coyote","falcon"],["small_coyote","falcon","big_green_slime"],["big_green_slime","falcon","small_coyote"],["big_green_slime","falcon","small_coyote","angry_ent"]],
    4:[["red_slime","small_coyote"],["red_slime","spike_slime","falcon"],["red_slime","spike_slime","small_coyote"],["spike_slime","red_rock_golem","small_coyote"],["red_slime","spike_slime","red_rock_golem","falcon"]],
    5:[["spike_slime","sand_snake"],["sand_snake","sand_scorpion"],["spike_slime","sand_snake","sand_scorpion"],["sand_snake","sand_scorpion","sand_ancient_ruin_guardian"],["spike_slime","sand_scorpion","sand_ancient_ruin_guardian"]],
    6:[["dark_ghostly_slime","dark_bat"],["dark_ghostly_slime","dark_bat","ancient_sentinel"],["dark_bat","ancient_sentinel","ancient_guardian"],["dark_ghostly_slime","ancient_sentinel","ancient_guardian"],["dark_ghostly_slime","dark_bat","ancient_sentinel","ancient_guardian"]]
  });

  const WORLD_MAPS = Object.freeze({
    1:{ground:"assets/map/world1/world1_ground_1.png",tint:"rgba(252,244,205,.025)",objects:{bush1:{src:"assets/map/world1/world1_bush_1.png",count:11,w:96,h:76,anchor:.73},bush2:{src:"assets/map/world1/world1_bush_2.png",count:10,w:94,h:74,anchor:.73},bush3:{src:"assets/map/world1/world1_bush_3.png",count:9,w:92,h:72,anchor:.73},flower1:{src:"assets/map/world1/world1_flower_1.png",count:11,w:31,h:31,anchor:.66},flower2:{src:"assets/map/world1/world1_flower_2.png",count:9,w:34,h:34,anchor:.66},flower3:{src:"assets/map/world1/world1_flower_3.png",count:9,w:31,h:31,anchor:.66},log:{src:"assets/map/world1/world1_log_1.png",count:7,w:104,h:62,anchor:.70,solid:true,r:28},mushroom:{src:"assets/map/world1/world1_mushroom_1.png",count:11,w:42,h:40,anchor:.72},rock1:{src:"assets/map/world1/world1_rock_1.png",count:9,w:92,h:72,anchor:.72,solid:true,r:27},rock2:{src:"assets/map/world1/world1_rock_2.png",count:9,w:86,h:68,anchor:.72,solid:true,r:25},rockSmall:{src:"assets/map/world1/world1_rock_small_1.png",count:13,w:42,h:34,anchor:.70},tree1:{src:"assets/map/world1/world1_tree_1.png",count:8,w:132,h:176,anchor:.84,solid:true,r:25},tree2:{src:"assets/map/world1/world1_tree_2.png",count:7,w:142,h:192,anchor:.85,solid:true,r:27}}},
    2:{ground:"assets/map/world2/world2_ground_1.png",tint:"rgba(13,18,47,.16)",objects:{bush1:{src:"assets/map/world2/world2_bush_1.png",count:10,w:94,h:74,anchor:.73},bush2:{src:"assets/map/world2/world2_bush_2.png",count:9,w:92,h:72,anchor:.73},bush3:{src:"assets/map/world2/world2_bush_3.png",count:9,w:90,h:70,anchor:.73},flower1:{src:"assets/map/world2/world2_flower_1.png",count:8,w:34,h:34,anchor:.66},flower2:{src:"assets/map/world2/world2_flower_2.png",count:8,w:34,h:34,anchor:.66},flower3:{src:"assets/map/world2/world2_flower_3.png",count:8,w:36,h:36,anchor:.66},rock1:{src:"assets/map/world2/world2_rock_1.png",count:9,w:88,h:68,anchor:.72,solid:true,r:25},rock2:{src:"assets/map/world2/world2_rock_2.png",count:9,w:88,h:68,anchor:.72,solid:true,r:25},rock3:{src:"assets/map/world2/world2_rock_3.png",count:8,w:82,h:64,anchor:.72,solid:true,r:24},tree1:{src:"assets/map/world2/world2_tree_1.png",count:8,w:132,h:178,anchor:.84,solid:true,r:25},tree2:{src:"assets/map/world2/world2_tree_2.png",count:7,w:142,h:192,anchor:.85,solid:true,r:27},firefly:{src:"assets/map/world2/world2_firefly_01.png",count:7,w:18,h:18,anchor:.50,alpha:.78,glow:true}}},
    3:{ground:"assets/map/world3/world3_ground_1.png",tint:"rgba(201,159,76,.035)",objects:{bones:{src:"assets/map/world3/world3_bones.png",count:7,w:72,h:50,anchor:.68},bush1:{src:"assets/map/world3/world3_bush_1.png",count:9,w:96,h:76,anchor:.73},bush2:{src:"assets/map/world3/world3_bush_2.png",count:9,w:94,h:74,anchor:.73},log:{src:"assets/map/world3/world3_log.png",count:7,w:104,h:62,anchor:.70,solid:true,r:28},rock1:{src:"assets/map/world3/world3_rock_1.png",count:10,w:90,h:70,anchor:.72,solid:true,r:26},rock2:{src:"assets/map/world3/world3_rock_2.png",count:9,w:86,h:68,anchor:.72,solid:true,r:25},grass1:{src:"assets/map/world3/world3_tall_grass_1.png",count:13,w:78,h:60,anchor:.76},grass2:{src:"assets/map/world3/world3_tall_grass_2.png",count:12,w:74,h:58,anchor:.76},tree1:{src:"assets/map/world3/world3_tree_1.png",count:7,w:138,h:184,anchor:.85,solid:true,r:27},tree2:{src:"assets/map/world3/world3_tree_2.png",count:6,w:146,h:196,anchor:.86,solid:true,r:29}}},
    4:{ground:"assets/map/world4/world4_ground_1.png",tint:"rgba(176,83,46,.045)",objects:{bigRock:{src:"assets/map/world4/world4_big_rock_1.png",count:6,w:126,h:94,anchor:.73,solid:true,r:36},bones:{src:"assets/map/world4/world4_bones_1.png",count:8,w:74,h:50,anchor:.68},bush:{src:"assets/map/world4/world4_bush_1.png",count:9,w:86,h:68,anchor:.73},cactus1:{src:"assets/map/world4/world4_cactus_1.png",count:7,w:104,h:142,anchor:.84,solid:true,r:23},cactus2:{src:"assets/map/world4/world4_cactus_2.png",count:8,w:84,h:118,anchor:.83,solid:true,r:20},flower:{src:"assets/map/world4/world4_flower_1.png",count:7,w:46,h:42,anchor:.68},rock1:{src:"assets/map/world4/world4_rock_1.png",count:9,w:104,h:78,anchor:.72,solid:true,r:30},rock2:{src:"assets/map/world4/world4_rock_2.png",count:9,w:92,h:72,anchor:.72,solid:true,r:27},veryBig:{src:"assets/map/world4/world4_rock_very_big_1.png",count:5,w:148,h:108,anchor:.73,solid:true,r:42},tree:{src:"assets/map/world4/world4_tree_1.png",count:6,w:136,h:184,anchor:.85,solid:true,r:27}}},
    5:{ground:"assets/map/world5/world5_ground_1.png",tint:"rgba(246,183,89,.035)",objects:{dune:{src:"assets/map/world5/world5_dune_01.png",count:13,w:190,h:90,anchor:.62},deadBush:{src:"assets/map/world5/world5_dead_bush_01.png",count:12,w:64,h:50,anchor:.72},bones:{src:"assets/map/world5/world5_bones_01.png",count:8,w:76,h:52,anchor:.68},cactus:{src:"assets/map/world5/world5_mini_cactus_01.png",count:14,w:58,h:78,anchor:.79,solid:true,r:15},flower:{src:"assets/map/world5/world5_flower_01.png",count:10,w:38,h:38,anchor:.66}}},
    6:{ground:"assets/map/world6/world6_ground_1.png",tint:"rgba(20,11,43,.16)",objects:{bonePiles:{src:"assets/map/world6/world6_bone_piles_01.png",count:8,w:76,h:52,anchor:.68},crystal:{src:"assets/map/world6/world6_crystal_01.png",count:11,w:62,h:72,anchor:.77,solid:true,r:14},pillar:{src:"assets/map/world6/world6_pillar_01.png",count:8,w:88,h:148,anchor:.83,solid:true,r:22},runestone:{src:"assets/map/world6/world6_runestone_01.png",count:9,w:78,h:106,anchor:.81,solid:true,r:19},statue1:{src:"assets/map/world6/world6_statue_01.png",count:5,w:86,h:138,anchor:.83,solid:true,r:22},statue2:{src:"assets/map/world6/world6_statue_02.png",count:5,w:86,h:138,anchor:.83,solid:true,r:22},stone:{src:"assets/map/world6/world6_stone_01.png",count:14,w:78,h:58,anchor:.71,solid:true,r:18},tree:{src:"assets/map/world6/world6_tree_01.png",count:9,w:122,h:184,anchor:.85,solid:true,r:24}}}
  });

  const ACHIEVEMENTS = Object.freeze([
    {id:"first_bloom",tier:3,name:"Első Virágzás",desc:"Teljesítsd az első pályádat.",test:s=>totalClears(s)>=1,progress:s=>`${Math.min(1,totalClears(s))}/1 stage`,reward:{coins:150,chests:{common:1}}},
    {id:"growing_bunny",tier:3,name:"Fejlődő Nyuszi",desc:"Érd el az 5. játékosszintet.",test:s=>level(s)>=5,progress:s=>`${Math.min(5,level(s))}/5 level`,reward:{coins:250,chests:{common:1}}},
    {id:"petal_hunter",tier:3,name:"Petal Hunter",desc:"Defeat 100 enemies.",test:s=>kills(s)>=100,progress:s=>`${Math.min(100,kills(s))}/100 enemies`,reward:{coins:220,chests:{common:1}}},
    {id:"pocket_bloom",tier:3,name:"Pocket Bloom",desc:"Earn 1,000 Coin in total.",test:s=>lifetimeCoins(s)>=1000,progress:s=>`${Math.min(1000,lifetimeCoins(s))}/1000 Coin`,reward:{coins:250}},
    {id:"chest_peek",tier:3,name:"Chest Peek",desc:"Open 5 chests.",test:s=>chestOpens(s)>=5,progress:s=>`${Math.min(5,chestOpens(s))}/5 chests`,reward:{coins:180,chests:{common:1}}},
    {id:"gear_up",tier:3,name:"Gear Up",desc:"Own 5 equipment items.",test:s=>gearCount(s)>=5,progress:s=>`${Math.min(5,gearCount(s))}/5 gear`,reward:{coins:240,chests:{common:1}}},
    {id:"star_seed",tier:3,name:"Star Seed",desc:"Earn 5 stage stars.",test:s=>totalStars(s)>=5,progress:s=>`${Math.min(5,totalStars(s))}/5 stars`,reward:{coins:300}},
    {id:"meadow_path",tier:3,name:"Meadow Path",desc:"Clear all five Meadow chapters.",test:s=>worldClears(s,1)>=5,progress:s=>`${Math.min(5,worldClears(s,1))}/5 chapters`,reward:{coins:350,chests:{common:2}}},
    {id:"pathfinder",tier:2,name:"Pathfinder",desc:"Complete 10 stage clears.",test:s=>totalClears(s)>=10,progress:s=>`${Math.min(10,totalClears(s))}/10 clears`,reward:{coins:650,chests:{rare:1}}},
    {id:"bloom_veteran",tier:2,name:"Bloom Veteran",desc:"Reach Player Level 10.",test:s=>level(s)>=10,progress:s=>`${Math.min(10,level(s))}/10 level`,reward:{coins:700,chests:{common:2},bloomGems:5}},
    {id:"rift_hunter",tier:2,name:"Rift Hunter",desc:"Defeat 1,000 enemies.",test:s=>kills(s)>=1000,progress:s=>`${Math.min(1000,kills(s))}/1000 enemies`,reward:{coins:800,chests:{rare:1}}},
    {id:"rare_find",tier:2,name:"Rare Find",desc:"Own a Rare or better equipment item.",test:s=>hasRarity(s,["Rare","Epic","Legendary"]),progress:s=>hasRarity(s,["Rare","Epic","Legendary"])?"Found":"Not found",reward:{coins:600,chests:{common:2},bloomGems:5}},
    {id:"star_gazer",tier:2,name:"Star Gazer",desc:"Earn 15 stage stars.",test:s=>totalStars(s)>=15,progress:s=>`${Math.min(15,totalStars(s))}/15 stars`,reward:{coins:750,chests:{rare:1}}},
    {id:"chest_hunter",tier:2,name:"Chest Hunter",desc:"Open 25 chests.",test:s=>chestOpens(s)>=25,progress:s=>`${Math.min(25,chestOpens(s))}/25 chests`,reward:{coins:650,chests:{rare:1},bloomGems:5}},
    {id:"collector",tier:2,name:"Collector",desc:"Own 20 equipment items.",test:s=>gearCount(s)>=20,progress:s=>`${Math.min(20,gearCount(s))}/20 gear`,reward:{coins:850,chests:{rare:1}}},
    {id:"night_survivor",tier:2,name:"Night Survivor",desc:"Clear all five Meadow Night chapters.",test:s=>worldClears(s,2)>=5,progress:s=>`${Math.min(5,worldClears(s,2))}/5 chapters`,reward:{coins:900,chests:{rare:1},bloomGems:8}},
    {id:"powerful_bloom",tier:2,name:"Powerful Bloom",desc:"Reach 1,000 total Power.",test:s=>power(s)>=1000,progress:s=>`${Math.min(1000,power(s))}/1000 Power`,reward:{coins:900,chests:{rare:1}}},
    {id:"golden_miracle",tier:1,name:"Golden Miracle",desc:"Own a Legendary equipment item.",test:s=>hasRarity(s,["Legendary"]),progress:s=>hasRarity(s,["Legendary"])?"Legendary found":"Not found",reward:{coins:1800,chests:{epic:1},bloomGems:25}},
    {id:"star_collector",tier:1,name:"Star Collector",desc:"Earn 30 stage stars.",test:s=>totalStars(s)>=30,progress:s=>`${Math.min(30,totalStars(s))}/30 stars`,reward:{coins:1700,chests:{rare:2},bloomGems:20}},
    {id:"savannah_hero",tier:1,name:"Savannah Hero",desc:"Clear all five Savanna chapters.",test:s=>worldClears(s,3)>=5,progress:s=>`${Math.min(5,worldClears(s,3))}/5 chapters`,reward:{coins:1900,chests:{epic:1},bloomGems:25}},
    {id:"arsenal_in_bloom",tier:1,name:"Arsenal in Bloom",desc:"Raise every Arsenal slot to Level 5.",test:s=>minArsenal(s)>=5,progress:s=>`${Math.min(5,minArsenal(s))}/5 minimum Arsenal level`,reward:{coins:2200,chests:{rare:2},bloomGems:25}},
    {id:"chest_master",tier:1,name:"Chest Master",desc:"Open 100 chests.",test:s=>chestOpens(s)>=100,progress:s=>`${Math.min(100,chestOpens(s))}/100 chests`,reward:{coins:2500,chests:{epic:1},bloomGems:30}},
    {id:"cherry_garden",tier:1,name:"Cherry Garden",desc:"Own 10 Cherry skins.",test:s=>(s.unlockedSkins||[]).length>=10,progress:s=>`${Math.min(10,(s.unlockedSkins||[]).length)}/10 skins`,reward:{coins:2000,chests:{epic:1},bloomGems:35}},
    {id:"power_overflow",tier:1,name:"Power Overflow",desc:"Reach 2,500 total Power.",test:s=>power(s)>=2500,progress:s=>`${Math.min(2500,power(s))}/2500 Power`,reward:{coins:2800,chests:{epic:1},bloomGems:40}},
    {id:"perfect_meadow",tier:1,name:"My First Cozy World",desc:"Earn all 15 stars in World 1.",test:s=>worldStars(s,1)>=15,progress:s=>`${Math.min(15,worldStars(s,1))}/15 stars`,reward:{coins:100,chests:{rare:1},bloomGems:10,themes:["cozy_cherry"]}},
    {id:"veteran_bunny",tier:1,name:"Veteran Bunny",desc:"Reach Player Level 30.",test:s=>level(s)>=30,progress:s=>`${Math.min(30,level(s))}/30 level`,reward:{coins:4000,chests:{epic:2},bloomGems:50}}
  ]);

  function language(){
    return window.CHERRIFT_LOCALIZATION?.language?.() === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }
  function copy(hu,en){ return language() === "en" ? en : hu; }
  function isPhone(){
    const touch = Number(navigator.maxTouchPoints) > 0 || matchMedia("(pointer:coarse)").matches;
    return touch && Math.min(innerWidth || 9999, innerHeight || 9999, screen.width || 9999, screen.height || 9999) <= 820;
  }
  function mobile(){ return matchMedia("(max-width:820px)").matches; }

  function totalClears(save){
    const stats = Object.values(save?.stageStats || {}).reduce((sum,entry) => sum + num(entry?.clears), 0);
    return stats || Object.values(save?.clearedStages || {}).filter(Boolean).length;
  }
  function level(save){ return Math.max(1, num(save?.account?.level || save?.level || 1)); }
  function kills(save){ return num(save?.stats?.kills || save?.kills); }
  function lifetimeCoins(save){ return Math.max(num(save?.economy?.lifetimeCoinsEarned), num(save?.stats?.coinsEarned), num(save?.coins)); }
  function chestOpens(save){ return num(save?.economy?.totalChestOpens || save?.gacha?.totalOpens); }
  function gearItems(save){ return [...(save?.inventory || []), ...Object.values(save?.equipped || {}).filter(Boolean)]; }
  function gearCount(save){ return gearItems(save).length; }
  function hasRarity(save, rarities){ return gearItems(save).some(item => rarities.includes(String(item?.rarity || ""))); }
  function totalStars(save){ return Object.values(save?.stageStars || {}).reduce((sum,value) => sum + clamp(num(value),0,3),0); }
  function worldStageIds(world){ return Array.from({length:5},(_,index) => `world_${world}_${index + 1}`); }
  function worldClears(save,world){ return worldStageIds(world).filter(stageId => save?.clearedStages?.[stageId] || num(save?.stageStats?.[stageId]?.clears) > 0 || num(save?.stageStars?.[stageId]) > 0).length; }
  function worldStars(save,world){ return worldStageIds(world).reduce((sum,stageId) => sum + clamp(num(save?.stageStars?.[stageId] || save?.stageStats?.[stageId]?.stars),0,3),0); }
  function power(save){ return num(save?.power || window.CHERRIFT_PREBETA?.calculatePower?.(save)); }
  function minArsenal(save){
    const slots = Object.values(save?.arsenal?.slots || {});
    return slots.length ? Math.min(...slots.map(slot => Math.max(1, num(slot?.level)))) : 1;
  }

  function configureWorldStages(){
    for (const stage of window.CHERRIFT_V040?.stages || []) {
      const world = Number(stage?.world || String(stage?.id || "").match(/world_(\d+)/)?.[1]);
      const chapter = Number(stage?.index || String(stage?.id || "").match(/_(\d+)$/)?.[1]);
      if (!(world >= 1 && world <= 6) || !(chapter >= 1 && chapter <= 5) || stage.training) continue;
      const variant = chapter <= 2 ? 1 : chapter <= 4 ? 2 : world === 4 ? 2 : 3;
      stage.splash = `assets/map/world${world}/world${world}_splashart_${variant}.png`;
      const pool = WORLD_POOLS[world]?.[chapter - 1];
      if (pool?.length) stage.enemyPool = [...pool];
    }
  }

  function preload(source,map,key=source){
    if (!source || map.has(key)) return map.get(key);
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    map.set(key,image);
    return image;
  }

  function seededRandom(seedText){
    let seed = 2166136261;
    for (const char of String(seedText || "world")) {
      seed ^= char.charCodeAt(0);
      seed = Math.imul(seed,16777619);
    }
    return () => {
      seed += 0x6D2B79F5;
      let value = seed;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function stageWorld(game){
    const stage = game?.stage || game?.getSelectedStage?.() || window.CHERRIFT_V040?.stages?.find?.(entry => entry.id === game?.save?.selectedStageId);
    return Math.floor(Number(stage?.world) || Number(String(stage?.id || "").match(/world[_-]?(\d+)/i)?.[1]) || 0);
  }

  function objectCount(baseCount,world,key){
    if (Number(world) === 2 && key === "firefly") return mobile() ? 4 : 5;
    const factor = Number(world) === 2 ? (mobile() ? .32 : .42) : (mobile() ? .74 : 1);
    return Math.max(1,Math.round(baseCount * factor));
  }

  function preloadWorld(world){
    const config = WORLD_MAPS[world];
    if (!config) return;
    preload(config.ground,state.worldImages,`ground:${world}`);
    for (const [key,spec] of Object.entries(config.objects)) preload(spec.src,state.worldImages,`${world}:${key}`);
  }

  function buildWorld(game,world){
    const config = WORLD_MAPS[world];
    if (!config) return game?.obstacles;
    preloadWorld(world);
    const random = seededRandom(`${game.stage?.id || `world_${world}`}:clean`);
    const worldSize = Math.max(2400,Number(window.CHERRIFT_CONFIG?.worldSize) || 4200);
    const half = worldSize / 2 - 190;
    const placed = [];
    const objects = [];
    for (const [key,spec] of Object.entries(config.objects)) {
      for (let index = 0; index < objectCount(spec.count,world,key); index += 1) {
        let x = 0, y = 0, attempts = 0;
        do {
          x = (random() * 2 - 1) * half;
          y = (random() * 2 - 1) * half;
          attempts += 1;
        } while (
          attempts < 18 &&
          (Math.hypot(x,y) < 330 || (spec.solid && placed.some(item => Math.hypot(x-item.x,y-item.y) < (spec.r || 20) + item.r + 54)))
        );
        const object = {
          __cherriftCleanWorld:true,
          cherriftMapObject:true,
          kind:`clean_world_${world}_${key}`,
          assetKey:`clean_w${world}_${key}`,
          worldId:world,
          objectKey:key,
          x,y,
          boxW:spec.w,boxH:spec.h,drawW:spec.w,drawH:spec.h,
          anchor:Number.isFinite(Number(spec.anchor)) ? Number(spec.anchor) : .72,
          alpha:Number.isFinite(Number(spec.alpha)) ? Number(spec.alpha) : 1,
          glow:!!spec.glow,
          solid:!!spec.solid,
          r:spec.r || 0,
          collisionRadius:spec.r || 0
        };
        if (object.glow) {
          object.baseX=x; object.baseY=y; object.phase=random()*Math.PI*2;
          object.driftX=8+random()*9; object.driftY=5+random()*7;
        }
        if (object.solid) placed.push({x,y,r:spec.r || 20});
        objects.push(object);
      }
    }
    game.obstacles = objects;
    game.__cherriftCleanSolidObjects = objects.filter(object => object.solid);
    game.__cherriftCleanWorld = world;
    return objects;
  }

  function pattern(context,image){
    if (!image) return null;
    let value = state.patterns.get(image);
    if (!value) {
      try { value = context.createPattern(image,"repeat"); state.patterns.set(image,value); }
      catch (_) { value = null; }
    }
    return value;
  }

  function drawGround(game,context,zoom,previous){
    const world = stageWorld(game);
    const config = WORLD_MAPS[world];
    const image = state.worldImages.get(`ground:${world}`) || preload(config?.ground,state.worldImages,`ground:${world}`);
    if (!config || !image?.complete || !(image.naturalWidth || image.width)) return previous?.call(game,context,zoom);
    const camera = game.camera || {x:0,y:0};
    const safeZoom = Math.max(.1,Number(zoom) || 1);
    const viewW = Math.max(1,Number(game.w) || context.canvas?.width || 1280) / safeZoom;
    const viewH = Math.max(1,Number(game.h) || context.canvas?.height || 720) / safeZoom;
    const margin = mobile() ? 90 : 150;
    const x = camera.x - viewW/2 - margin;
    const y = camera.y - viewH/2 - margin;
    context.save();
    context.fillStyle = pattern(context,image) || "#3a2f34";
    context.fillRect(x,y,viewW + margin*2,viewH + margin*2);
    if (config.tint) { context.fillStyle=config.tint; context.fillRect(x,y,viewW + margin*2,viewH + margin*2); }
    context.restore();
  }

  function objectInView(game,object,margin=180){
    const camera = game.camera || {x:0,y:0};
    const zoom = Math.max(.1,Number(game.zoom) || 1);
    const width = Math.max(1,Number(game.w) || innerWidth) / zoom;
    const height = Math.max(1,Number(game.h) || innerHeight) / zoom;
    return Math.abs(Number(object.x)-Number(camera.x)) <= width/2 + margin && Math.abs(Number(object.y)-Number(camera.y)) <= height/2 + margin;
  }

  function fireflyCanvas(image){
    let variants = state.fireflySprites.get(image);
    if (!variants) { variants = new Map(); state.fireflySprites.set(image,variants); }
    const key = mobile() ? "mobile" : "desktop";
    if (variants.has(key)) return variants.get(key);
    const edge = mobile() ? 56 : 68;
    const canvas = document.createElement("canvas");
    canvas.width=edge; canvas.height=edge;
    const context = canvas.getContext("2d");
    const center = edge/2;
    const gradient = context.createRadialGradient(center,center,1,center,center,edge*.48);
    gradient.addColorStop(0,"rgba(255,250,167,.58)");
    gradient.addColorStop(.16,"rgba(237,255,111,.30)");
    gradient.addColorStop(.48,"rgba(201,239,72,.09)");
    gradient.addColorStop(1,"rgba(180,228,48,0)");
    context.fillStyle=gradient; context.fillRect(0,0,edge,edge);
    const icon=mobile()?15:17;
    context.drawImage(image,Math.round(center-icon/2),Math.round(center-icon/2),icon,icon);
    variants.set(key,canvas);
    return canvas;
  }

  function drawObject(game,context,object){
    if (!objectInView(game,object,object.glow?120:210)) return;
    const spec = WORLD_MAPS[object.worldId]?.objects?.[object.objectKey];
    const image = state.worldImages.get(`${object.worldId}:${object.objectKey}`) || preload(spec?.src,state.worldImages,`${object.worldId}:${object.objectKey}`);
    if (!image?.complete || !(image.naturalWidth || image.width)) return;
    const width=Number(object.drawW)||64, height=Number(object.drawH)||64;
    const anchor=Number.isFinite(Number(object.anchor))?Number(object.anchor):.72;
    let drawX=Number(object.x)||0, drawY=Number(object.y)||0, pulse=1;
    if (object.glow) {
      const time=Number(game.t)||performance.now()/1000;
      drawX=Number(object.baseX||object.x)+Math.sin(time*.72+object.phase)*Number(object.driftX||12);
      drawY=Number(object.baseY||object.y)+Math.cos(time*.58+object.phase)*Number(object.driftY||8);
      pulse=.82+.18*Math.sin(time*1.7+object.phase);
      object.x=drawX; object.y=drawY;
    }
    context.save();
    context.globalAlpha=clamp((Number(object.alpha)||1)*pulse,0,1);
    context.imageSmoothingEnabled=true;
    if (object.glow) {
      const sprite=fireflyCanvas(image);
      context.drawImage(sprite,Math.round(drawX-sprite.width/2),Math.round(drawY-sprite.height/2));
      context.restore();
      return;
    }
    context.drawImage(image,Math.round(drawX-width/2),Math.round(drawY-height*anchor),Math.round(width),Math.round(height));
    context.restore();
  }

  function hitObstacle(game,previous){
    const player=game.player, world=stageWorld(game);
    if (!player || !WORLD_MAPS[world]) return previous?.call(game) || false;
    for (const object of game.__cherriftCleanSolidObjects || (game.obstacles || []).filter(entry => entry?.solid)) {
      if (!object?.__cherriftCleanWorld) continue;
      const radius=Math.max(1,Number(object.collisionRadius||object.r));
      const width=Math.max(1,Number(object.drawW||object.boxW));
      const height=Math.max(1,Number(object.drawH||object.boxH));
      const anchor=Number.isFinite(Number(object.anchor))?Number(object.anchor):.72;
      const bottom=Number(object.y)+height*(1-anchor);
      let rx=Math.max(radius,width*.18), ry=Math.max(7,Math.min(radius,height*.10));
      if (/rock|stone|bones|log/.test(String(object.objectKey||"").toLowerCase())) { rx=Math.max(radius,width*.30); ry=Math.max(8,height*.14); }
      const cx=Number(object.x), cy=bottom-ry*.8;
      const dx=(Number(player.x)-cx)/(rx+(Number(player.r)||18));
      const dy=(Number(player.y)-cy)/(ry+(Number(player.r)||18));
      if (dx*dx+dy*dy<1) return true;
    }
    return false;
  }

  function customizeEnemy(enemy){
    const type=enemy?.enemyType||enemy?.type, spec=ENEMY_DEFS[type];
    if (!spec) return;
    const old=enemy.spec||{}, oldHp=Math.max(1,Number(old.hp)||34), oldSpeed=Math.max(1,Number(old.speed)||105);
    const hpRatio=spec.hp/oldHp, speedRatio=spec.speed/oldSpeed;
    enemy.hp=Math.max(1,Number(enemy.hp)*hpRatio);
    enemy.maxHp=Math.max(enemy.hp,Number(enemy.maxHp)*hpRatio);
    enemy.speed=Math.max(1,Number(enemy.speed)*speedRatio);
    enemy.r=spec.r; enemy.xp=spec.xp; enemy.damage=spec.damage; enemy.alpha=spec.alpha||enemy.alpha||1;
    enemy.sheetId=type; enemy.spec={...spec,sheetId:type};
    if (spec.ranged&&!Number.isFinite(enemy.shootTimer)) enemy.shootTimer=.5+Math.random();
  }

  function drawEnemy(game,context,enemy){
    const type=enemy?.enemyType||enemy?.type, sheet=ENEMY_SHEETS[type];
    const image=state.enemyImages.get(type)||preload(sheet?.src,state.enemyImages,type);
    if (!sheet) return false;
    if (!objectInView(game,enemy,140)) return true;
    if (!image?.complete || !(image.naturalWidth||image.width)) return false;
    const cols=sheet.cols||4, nw=image.naturalWidth||image.width, nh=image.naturalHeight||image.height;
    const inferred=Math.round((nh*cols)/Math.max(1,nw));
    const rows=inferred>=2&&inferred<=6?inferred:(sheet.rows||3);
    const frameW=Math.floor(nw/cols), frameH=Math.floor(nh/rows);
    if (!frameW||!frameH) return false;
    const attack=rows>=4&&(enemy.attacking||enemy.isAttacking||Number(enemy.attackTimer)>0||Number(enemy.shootFlash)>0||(Number.isFinite(enemy.shootTimer)&&enemy.shootTimer<=.18));
    const row=enemy.dead?rows-1:attack?2:(sheet.moveRow??1);
    const frame=Math.floor(((game.t||0)+(enemy.phase||0))*(sheet.fps||7))%cols;
    const bossScale=enemy.isBoss?1.42:1, pulse=1+Math.sin((game.t||0)*5.4+(enemy.phase||0))*.018;
    const width=sheet.displayW*bossScale*pulse, height=sheet.displayH*bossScale*pulse;
    context.save();
    context.imageSmoothingEnabled=true;
    context.globalAlpha=enemy.hit>0?.68:(sheet.alpha||enemy.alpha||1);
    context.drawImage(image,frame*frameW,row*frameH,frameW,frameH,Math.round(enemy.x-width/2),Math.round(enemy.y-height/2+(sheet.yOffset||0)),Math.round(width),Math.round(height));
    context.restore();
    return true;
  }

  function installGameRuntime(){
    const proto=window.CherriftGame?.prototype;
    if (!proto || proto.__cherriftCleanRuntime) return !!proto;
    proto.__cherriftCleanRuntime=true;
    configureWorldStages();
    for (const [key,sheet] of Object.entries(ENEMY_SHEETS)) preload(sheet.src,state.enemyImages,key);
    const previousGenerateMap=proto.generateMap;
    const previousStart=proto.start;
    const previousDrawGround=proto.drawGround;
    const previousDrawObstacle=proto.drawObstacle;
    const previousHitObstacle=proto.hitObstacle;
    const previousSpawnEnemy=proto.spawnEnemy;
    const previousDrawEnemy=proto.drawEnemy;
    const previousDrawPickup=proto.drawPickup;
    const previousResize=proto.resize;

    proto.loop=function cherriftFrameLoop(now){
      const active=this.mode==="playing";
      const requested=Math.max(30,Math.min(60,Number(this.save?.settings?.fpsLimit||window.CHERRIFT_CONFIG?.performance?.defaultFpsLimit||60)));
      const lowEnd=(Number(navigator.deviceMemory||0)>0&&Number(navigator.deviceMemory)<=4)||(Number(navigator.hardwareConcurrency||0)>0&&Number(navigator.hardwareConcurrency)<=4);
      const fps=matchMedia("(max-width:820px)").matches&&lowEnd?Math.min(45,requested):requested;
      const minFrameMs=1000/fps;
      if (document.hidden) { this.last=now; requestAnimationFrame(value=>this.loop(value)); return; }
      if (active && now-this.last>=minFrameMs-.5) {
        const dt=Math.min(.05,(now-this.last)/1000||0);
        this.last=now; this.t+=dt; this.update(dt); this.render(); this.__cherriftRenderedMode=this.mode;
      } else if (!active && (this.__cherriftRenderedMode!==this.mode || this.__cherriftNeedsRender)) {
        this.last=now; this.render(); this.__cherriftRenderedMode=this.mode; this.__cherriftNeedsRender=false;
      }
      requestAnimationFrame(value=>this.loop(value));
    };

    if (typeof previousGenerateMap==="function") proto.generateMap=function(...args){
      const legacy=previousGenerateMap.apply(this,args), world=stageWorld(this);
      return WORLD_MAPS[world]?buildWorld(this,world):legacy;
    };
    if (typeof previousStart==="function") proto.start=async function(...args){
      const before=stageWorld(this);
      if (WORLD_MAPS[before]) preloadWorld(before);
      const result=await previousStart.apply(this,args), world=stageWorld(this);
      if (WORLD_MAPS[world]) buildWorld(this,world);
      if (this.player&&!this.player.__cleanBaseCombat) {
        this.player.crit=Math.max(0,Number(this.player.crit||0)-.02);
        this.player.critDamage=Math.max(1,Number(this.player.critDamage||1.5)-.25);
        this.player.__cleanBaseCombat=true;
      }
      return result;
    };
    if (typeof previousDrawGround==="function") proto.drawGround=function(context,zoom=1){ return drawGround(this,context,zoom,previousDrawGround); };
    if (typeof previousDrawObstacle==="function") proto.drawObstacle=function(context,object){
      const world=stageWorld(this);
      if (WORLD_MAPS[world]) {
        if (!object?.__cherriftCleanWorld || Number(object.worldId)!==world) return;
        return drawObject(this,context,object);
      }
      return previousDrawObstacle.call(this,context,object);
    };
    proto.hitObstacle=function(...args){
      return WORLD_MAPS[stageWorld(this)] ? hitObstacle(this,previousHitObstacle) : (typeof previousHitObstacle==="function"?previousHitObstacle.apply(this,args):false);
    };
    if (typeof previousSpawnEnemy==="function") proto.spawnEnemy=function(...args){
      const before=this.enemies?.length||0, result=previousSpawnEnemy.apply(this,args);
      for (const enemy of (this.enemies||[]).slice(before)) customizeEnemy(enemy);
      return result;
    };
    if (typeof previousDrawEnemy==="function") proto.drawEnemy=function(context,enemy){
      if (drawEnemy(this,context,enemy)) return;
      return previousDrawEnemy.call(this,context,enemy);
    };
    if (typeof previousDrawPickup==="function") proto.drawPickup=function(context,pickup){
      if (!objectInView(this,pickup,90)) return;
      if (pickup?.type!=="xp") return previousDrawPickup.call(this,context,pickup);
      const large=Number(pickup.value)>=5;
      const image=this.assets?.get?.(large?"xpBig":"xpSmall")||this.assets?.get?.(large?"xpLarge":"xpSmall");
      if (!image) return previousDrawPickup.call(this,context,pickup);
      const maximum=large?24:17, nw=Math.max(1,Number(image.naturalWidth||image.width)||maximum), nh=Math.max(1,Number(image.naturalHeight||image.height)||maximum);
      const scale=maximum/Math.max(nw,nh), width=Math.max(8,Math.round(nw*scale)), height=Math.max(8,Math.round(nh*scale));
      context.save(); context.imageSmoothingEnabled=true;
      if ("imageSmoothingQuality" in context) context.imageSmoothingQuality="high";
      context.drawImage(image,Math.round(pickup.x-width/2),Math.round(pickup.y-height/2),width,height);
      context.restore();
    };
    if (typeof previousResize==="function") proto.resize=function(...args){
      const lowEnd=(Number(navigator.deviceMemory||0)>0&&Number(navigator.deviceMemory)<=4)||(Number(navigator.hardwareConcurrency||0)>0&&Number(navigator.hardwareConcurrency)<=4);
      const phone=matchMedia("(max-width:820px)").matches;
      this.dpr=Math.max(1,Math.min(window.devicePixelRatio||1,phone?(lowEnd?1:1.2):1.5));
      const result=previousResize.apply(this,args);
      this.__cherriftNeedsRender=true;
      if (this.ctx) {
        this.ctx.imageSmoothingEnabled=true;
        if ("imageSmoothingQuality" in this.ctx) this.ctx.imageSmoothingQuality=phone?"medium":"high";
      }
      return result;
    };
    if (window.UI?.updateHUD && !window.UI.updateHUD.__cherriftThrottled) {
      const updateHud=window.UI.updateHUD.bind(window.UI); let lastHud=0;
      const throttled=function(game){ const now=performance.now(); if(now-lastHud<100)return; lastHud=now; return updateHud(game); };
      throttled.__cherriftThrottled=true;
      window.UI.updateHUD=throttled;
    }
    return true;
  }

  function achievementIcon(tier){ return tier===1?"assets/ui/achivement_gold.png":tier===2?"assets/ui/achivement_silver.png":"assets/ui/achivement_bronze.png"; }
  function rewardText(reward={}){
    const parts=[];
    if(reward.coins)parts.push(`🪙 ${reward.coins}`);
    if(reward.chests?.common)parts.push(`${reward.chests.common} Common Chest`);
    if(reward.chests?.rare)parts.push(`${reward.chests.rare} Rare Chest`);
    if(reward.chests?.epic)parts.push(`${reward.chests.epic} Epic Chest`);
    if(reward.bloomGems)parts.push(`${reward.bloomGems} Bloom Gem`);
    if(reward.themes?.includes("cozy_cherry"))parts.push("Cozy Cherry Theme");
    return parts.join(" · ")||"Special reward";
  }
  function findAchievementsPanel(){
    const direct=id("achievements");
    if(direct&&!direct.classList.contains("hidden"))return direct;
    return qa("#app > section,.panel,.screen").find(panel=>!panel.classList.contains("hidden")&&/^(Achievements|Eredmények)$/i.test(clean(q("h1,h2",panel)?.textContent)))||null;
  }
  function renderAchievements(panel=findAchievementsPanel()){
    if(!panel||!window.UI?.save)return;
    const save=window.UI.save;
    save.fixAchievementsClaimed=Array.isArray(save.fixAchievementsClaimed)?save.fixAchievementsClaimed:[];
    const claimed=new Set(save.fixAchievementsClaimed), filter=state.achievementFilter;
    const list=ACHIEVEMENTS.filter(item=>filter==="all"||String(item.tier)===filter);
    panel.dataset.crAchievements="1";
    panel.innerHTML=`<div class="cr-ach-shell"><header class="cr-ach-head"><button class="cr-ach-back" type="button" data-cr-ach-back aria-label="Back">←</button><div><h1>${copy("Eredmények","Achievements")}</h1></div></header><nav class="cr-ach-filter">${[["all",copy("Mind","All")],["1","Tier 1 · Gold"],["2","Tier 2 · Silver"],["3","Tier 3 · Bronze"]].map(([key,label])=>`<button type="button" data-cr-ach-filter="${key}" class="${filter===key?"active":""}">${label}</button>`).join("")}</nav><div class="cr-ach-grid">${list.map(item=>{const unlocked=!!item.test(save),isClaimed=claimed.has(item.id),tierColor=item.tier===1?"#e8b84d":item.tier===2?"#9eb8cf":"#b97857";return `<article class="cr-ach-card ${unlocked?"":"locked"}" style="--tier-color:${tierColor}"><div class="cr-ach-tier"><img src="${achievementIcon(item.tier)}" alt=""></div><div class="cr-ach-copy"><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p><small>${esc(item.progress(save))}</small><small class="reward">${esc(rewardText(item.reward))}</small></div><button class="cr-ach-action" type="button" data-cr-ach-claim="${item.id}" ${!unlocked||isClaimed?"disabled":""}>${isClaimed?copy("ÁTVÉVE","CLAIMED"):unlocked?copy("ÁTVÉTEL","CLAIM"):copy("ZÁROLVA","LOCKED")}</button></article>`}).join("")}</div></div>`;
  }
  function grantAchievement(achievementId){
    const achievement=ACHIEVEMENTS.find(item=>item.id===achievementId), save=window.UI?.save;
    if(!achievement||!save||!achievement.test(save))return;
    save.fixAchievementsClaimed=Array.isArray(save.fixAchievementsClaimed)?save.fixAchievementsClaimed:[];
    if(save.fixAchievementsClaimed.includes(achievementId))return;
    const reward=achievement.reward||{};
    save.coins=num(save.coins)+num(reward.coins);
    save.chests={common:0,rare:0,epic:0,...(save.chests||{})};
    for(const tier of["common","rare","epic"])save.chests[tier]=num(save.chests[tier])+num(reward.chests?.[tier]);
    if(reward.bloomGems){save.bloomGems=num(save.bloomGems??save.blossomGems)+num(reward.bloomGems);save.blossomGems=save.bloomGems;}
    for(const themeId of reward.themes||[])window.CHERRIFT_THEMES?.unlock?.(themeId,save,{silent:true});
    save.fixAchievementsClaimed.push(achievementId);
    try{window.CherriftStorage?.save?.(save);}catch(_){}
    window.UI?.refreshMenu?.();
    window.dispatchEvent(new CustomEvent("cherrift:savechange",{detail:{source:"achievement",id:achievementId}}));
    renderAchievements();
  }

  function normalizePlayerProgression(){
    const save=window.UI?.save;
    if(!save?.account)return;
    save.account.skillTreeV082||={ranks:{}};
    const spent=Object.values(save.account.skillTreeV082.ranks||{}).reduce((sum,value)=>sum+num(value),0);
    const available=Math.max(0,Math.max(1,num(save.account.level||1))-spent);
    if(num(save.account.skillPoints)<available){
      save.account.skillPoints=available;
      try{window.CherriftStorage?.save?.(save);}catch(_){}
    }
  }




  function ensureDesktopEnergy(){
    if(mobile()||!window.UI?.save)return;
    let button=id("crDesktopEnergy");
    if(!button){
      button=document.createElement("button");
      button.id="crDesktopEnergy";
      button.type="button";
      button.innerHTML='<span class="bolt">⚡</span><b></b>';
      button.title="Energy";
    }
    const target=q("#globalRailV060 .rail-bottom-v060")||id("resourceBarV082");
    if(target&&button.parentElement!==target)target.appendChild(button);
    window.CHERRIFT_PREBETA?.refreshEnergy?.(window.UI.save);
    const max=Math.max(1,Number(window.UI.save.energyState?.max)||50);
    q("b",button).textContent=`${Math.max(0,Number(window.UI.save.energy)||0)}/${max}`;
  }

  function lobbyRoute(){
    if(id("socialV082")&&!id("socialV082").classList.contains("hidden"))return"socialV082";
    if(id("rankingPrebeta")&&!id("rankingPrebeta").classList.contains("hidden"))return"rankingPrebeta";
    if(id("buffsV082")&&!id("buffsV082").classList.contains("hidden"))return"buffsV082";
    if(id("menu")&&!id("menu").classList.contains("hidden"))return"menu";
    return"";
  }

  function ensureLobbySubnav(){
    if(mobile()){id("crLobbySubnav")?.remove();return;}
    const route=lobbyRoute();
    let nav=id("crLobbySubnav");
    if(!route){nav?.remove();return;}
    if(!nav){
      nav=document.createElement("nav");
      nav.id="crLobbySubnav";
      nav.innerHTML='<button type="button" data-cr-lobby="socialV082">Social</button><button type="button" data-cr-lobby="rankingPrebeta">Rank</button><button type="button" data-cr-lobby="buffsV082">Buff List</button>';
      id("globalRailV060")?.insertAdjacentElement("afterend",nav);
    }
    qa("[data-cr-lobby]",nav).forEach(button=>button.classList.toggle("active",button.dataset.crLobby===route));
  }

  function ensurePortraitGuard(){
    let guard=id("portraitOnlyCR");
    if(!guard){
      guard=document.createElement("section");
      guard.id="portraitOnlyCR";
      guard.setAttribute("role","alert");
      guard.innerHTML='<article><i aria-hidden="true">▯</i><h2>Fordítsd álló helyzetbe</h2><p>A CHERRIFT telefonon álló nézetre készült. A játék folytatásához fordítsd vissza a készüléket.</p></article>';
      document.body.appendChild(guard);
    }
    const blocked=isPhone()&&innerWidth>innerHeight;
    document.body.classList.toggle("cr-phone-landscape",blocked);
    guard.setAttribute("aria-hidden",blocked?"false":"true");
  }

  function openInGameSettings(){
    if(window.UI?.game?.mode!=="paused")return false;
    state.inGameSettings=true;
    document.body.classList.add("settings-from-pause","ingame-settings-open","cr-run-active");
    id("pauseModal")?.classList.add("hidden");
    id("settings")?.classList.remove("hidden");
    q('#settings [data-v060-settings="general"]')?.click?.();
    return true;
  }

  function closeInGameSettings(options={}){
    if(!state.inGameSettings&&!document.body.classList.contains("ingame-settings-open"))return false;
    state.inGameSettings=false;
    document.body.classList.remove("ingame-settings-open");
    id("settings")?.classList.add("hidden");
    if(options.resume===true)window.UI?.resume?.();
    else id("pauseModal")?.classList.remove("hidden");
    return true;
  }

  function releaseRunObjects(game=window.UI?.game){
    if(!game)return;
    for(const key of["enemies","bullets","projectiles","enemyProjectiles","pickups","effects","damageTexts","obstacles","mapObjects","__v050Drops"]){
      if(Array.isArray(game[key]))game[key].length=0;
    }
    if(game.keys?.clear)game.keys.clear();
    game.touchTarget=null;
    game.pointerTarget=null;
  }

  function enterRun(){
    state.runActive=true;
    document.body.classList.add("cr-run-active");
    document.body.classList.remove("cr-lobby-active");
    window.dispatchEvent(new CustomEvent("cherrift:run-enter"));
  }

  function leaveRun(){
    state.runActive=false;
    state.inGameSettings=false;
    document.body.classList.remove("cr-run-active","ingame-settings-open","settings-from-pause");
    document.body.classList.add("cr-lobby-active");
    releaseRunObjects();
    window.dispatchEvent(new CustomEvent("cherrift:run-exit"));
  }

  function bindRunLifecycle(){
    const proto=window.CherriftGame?.prototype;
    if(proto&&!proto.__cherriftRunLifecycle){
      const startRun=proto.start;
      proto.start=async function startRunIsolated(...args){
        document.body.classList.add("cr-run-loading");
        try {
          const result=await startRun.apply(this,args);
          enterRun();
          return result;
        } finally {
          document.body.classList.remove("cr-run-loading");
        }
      };
      proto.__cherriftRunLifecycle=true;
    }
    if(window.UI?.quit&&!window.UI.quit.__cherriftRunLifecycle){
      const quit=window.UI.quit.bind(window.UI);
      const wrapped=function quitRunIsolated(...args){
        closeInGameSettings();
        const stage=window.UI?.game?.stage;
        window.UI?.showStageLoading?.({name:copy("Visszatérés a lobbyba","Returning to lobby"),title:stage?.title||"CHERRIFT"});
        document.body.classList.add("cr-run-loading");
        const result=quit(...args);
        leaveRun();
        id("stageLoading")?.classList.remove("hidden");
        setTimeout(()=>{
          window.UI?.hideStageLoading?.();
          document.body.classList.remove("cr-run-loading");
          window.CHERRIFT_REWARDS?.flush?.();
        },180);
        return result;
      };
      wrapped.__cherriftRunLifecycle=true;
      window.UI.quit=wrapped;
    }
  }

  function refreshShell(){
    if(!window.UI?.save)return;
    configureWorldStages();
    normalizePlayerProgression();
    ensureDesktopEnergy();
    ensureLobbySubnav();
    ensurePortraitGuard();
    const achievements=findAchievementsPanel();
    if(achievements)renderAchievements(achievements);
  }

  function wrapUi(){
    if(state.wrapped||!window.UI)return;
    state.wrapped=true;
    const open=window.UI.open?.bind(window.UI);
    if(open)window.UI.open=function(...args){
      if(args[0]==="settings"&&window.UI?.game?.mode==="paused")return openInGameSettings();
      const result=open(...args);
      requestAnimationFrame(refreshShell);
      return result;
    };
    const refresh=window.UI.refreshMenu?.bind(window.UI);
    if(refresh)window.UI.refreshMenu=function(...args){
      const result=refresh(...args);
      requestAnimationFrame(refreshShell);
      return result;
    };
  }

  function bindClicks(){
    if(state.clickBound)return;
    state.clickBound=true;
    document.addEventListener("click",event=>{
      const target=event.target?.closest?.("button,a");
      if(!target)return;
      if(target.id==="pauseSettings"){
        event.preventDefault();event.stopImmediatePropagation();openInGameSettings();return;
      }
      if(document.body.classList.contains("ingame-settings-open")&&(target.id==="settingsBackAction"||target.closest("#settings .back"))){
        event.preventDefault();event.stopImmediatePropagation();closeInGameSettings();return;
      }
      if(document.body.classList.contains("ingame-settings-open")&&target.id==="settingsResumeAction"){
        event.preventDefault();event.stopImmediatePropagation();closeInGameSettings({resume:true});return;
      }
      if(target.dataset.crAchBack!==undefined){event.preventDefault();window.UI?.open?.("menu");return;}
      if(target.dataset.crAchFilter){event.preventDefault();state.achievementFilter=target.dataset.crAchFilter;renderAchievements();return;}
      if(target.dataset.crAchClaim){event.preventDefault();grantAchievement(target.dataset.crAchClaim);return;}
      if(target.dataset.crLobby){
        event.preventDefault();
        const route=target.dataset.crLobby;
        if(route==="socialV082"||route==="rankingPrebeta")window.CHERRIFT_PREBETA?.open?.(route)||window.UI?.open?.(route);
        else window.UI?.open?.(route);
        requestAnimationFrame(refreshShell);
        return;
      }
      if(target.id==="crDesktopEnergy"){event.preventDefault();window.CHERRIFT_PREBETA?.showEnergyModal?.();return;}
      if(target.matches("[data-r5-menu-tool],[data-cr-menu-tool]")){
        event.preventDefault();event.stopImmediatePropagation();
        const action=target.dataset.r5MenuTool||target.dataset.crMenuTool;
        if(action==="feedback"||action==="bug"){
          const systems=window.CHERRIFT_V063;
          if(systems?.runtime)systems.runtime.supportType=action;
          window.UI?.open?.("supportV063");
          queueMicrotask(()=>{q(`[data-v063-support-type="${action}"]`)?.click?.();systems?.renderSupport?.();});
        }else if(action==="web")window.open("https://www.happycherrychan.hu","_blank","noopener,noreferrer");
        else if(action==="twitch")window.open("https://www.twitch.tv/happycherrychan","_blank","noopener,noreferrer");
      }
    },true);
  }

  function start(attempt=0){
    if(state.started)return;
    if(!document.body||!window.UI||!window.CherriftGame){
      if(attempt<180)return setTimeout(()=>start(attempt+1),50);
      console.error("[CHERRIFT Runtime] Core dependencies did not become ready.");
      return;
    }
    state.started=true;
    configureWorldStages();
    installGameRuntime();
    wrapUi();
    bindRunLifecycle();
    bindClicks();
    for(const eventName of["resize","orientationchange","cherrift:savechange","cherrift:economychange","cherrift:languagechange","cherrift:themechange","cherrift:prebeta-ready"]){
      addEventListener(eventName,()=>requestAnimationFrame(refreshShell),{passive:eventName==="resize"||eventName==="orientationchange"});
    }

    const api=Object.freeze({
      version:VERSION,
      refresh:refreshShell,
      open:(route,...args)=>window.UI?.open?.(route,...args),
      syncNav:refreshShell,
      openInGameSettings,
      closeInGameSettings,
      normalizeMap:game=>{
        const world=stageWorld(game);
        return WORLD_MAPS[world]?buildWorld(game,world):game?.obstacles;
      },
      worldMaps:WORLD_MAPS,
      worldPools:WORLD_POOLS,
      enemyDefs:ENEMY_DEFS,
      enemySheets:ENEMY_SHEETS,
      achievements:ACHIEVEMENTS,
      isPhone
    });

    window.CHERRIFT_RUNTIME=api;
    window.__CHERRIFT_RUNTIME_READY__=true;
    window.__CHERRIFT_CLEAN_RUNTIME__=true;
    refreshShell();
    window.dispatchEvent(new CustomEvent("cherrift:runtime-ready",{detail:{version:VERSION}}));
    window.dispatchEvent(new CustomEvent("cherrift:runtime-clean-ready",{detail:{version:VERSION}}));
    console.info(`[CHERRIFT] ${VERSION} loaded.`);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>start(),{once:true});
  else start();
})();
