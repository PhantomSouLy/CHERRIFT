(() => {
  "use strict";

  if (window.__CHERRIFT_FIXPACK_095_1__) return;
  window.__CHERRIFT_FIXPACK_095_1__ = true;

  const VERSION = "0.9.5-fixpack-1";
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const id = value => document.getElementById(value);
  const num = value => Math.max(0, Math.floor(Number(value) || 0));
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const state = {
    started:false,
    observer:null,
    patchQueued:false,
    route:"menu",
    splashToken:0,
    splashCache:new Map(),
    petalLayer:null,
    worldImages:new Map(),
    enemyImages:new Map(),
    patternCache:new WeakMap(),
    achievementFilter:"all"
  };

  const SKIN_ICON_OVERRIDES = Object.freeze({
    cherry_default:"assets/player/skins/base_cherry/base_cherry_icon.png",
    archer_cherry:"assets/player/skins/archer_cherry/archer_cherry_icon.jpg",
    beastclaw_cherry:"assets/player/skins/beastclaw_cherry/beatclaw_cherry_icon.jpg",
    cake_deliver_cherry:"assets/player/skins/cake_deliver_cherry/cake_delivery_cherry_icon.jpg",
    fairy_cherry:"assets/player/skins/fairy_cherry/fairy_cherry_icon.jpg",
    kimono_cherry:"assets/player/skins/kimono_cherry/kimono_cherry_icon.jpg",
    ninja_cherry:"assets/player/skins/ninja_cherry/ninja_cherry_icon.jpg",
    pajama_cherry:"assets/player/skins/pajama_cherry/pajama_cherry_icon.jpg",
    school_uniform_cherry:"assets/player/skins/school_uniform_cherry/school_uniform_cherry_icon.jpg",
    sport_cherry:"assets/player/skins/sport_cherry/sport_cherry_icon.jpg",
    succubus_cherry:"assets/player/skins/succubus_cherry/succubus_cherry_icon.jpg",
    warrior_cherry:"assets/player/skins/warrior_cherry/warrior_cherry_icon.jpg",
    wuxia_sakura_cherry:"assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.jpg"
  });

  const SKIN_FOLDER_ALIASES = Object.freeze({
    cherry_default:"base_cherry"
  });

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
    1:[
      ["pink_slime"],
      ["pink_slime","blue_slime"],
      ["pink_slime","blue_slime","small_mushroom"],
      ["blue_slime","small_mushroom","angry_ent"],
      ["blue_slime","tank_blue_slime","small_mushroom","angry_ent"]
    ],
    2:[
      ["ghost_slime","shadow_bat"],
      ["ghost_slime","shadow_bat","angry_mushroom"],
      ["shadow_bat","angry_mushroom","tank_blue_slime"],
      ["ghost_slime","shadow_bat","dark_ent","tank_blue_slime"],
      ["shadow_bat","angry_mushroom","dark_ent","tank_blue_slime"]
    ],
    3:[
      ["small_mushroom","small_coyote"],
      ["small_coyote","falcon"],
      ["small_coyote","falcon","big_green_slime"],
      ["big_green_slime","falcon","small_coyote"],
      ["big_green_slime","falcon","small_coyote","angry_ent"]
    ],
    4:[
      ["red_slime","small_coyote"],
      ["red_slime","spike_slime","falcon"],
      ["red_slime","spike_slime","small_coyote"],
      ["spike_slime","red_rock_golem","small_coyote"],
      ["red_slime","spike_slime","red_rock_golem","falcon"]
    ],
    5:[
      ["spike_slime","sand_snake"],
      ["sand_snake","sand_scorpion"],
      ["spike_slime","sand_snake","sand_scorpion"],
      ["sand_snake","sand_scorpion","sand_ancient_ruin_guardian"],
      ["spike_slime","sand_scorpion","sand_ancient_ruin_guardian"]
    ],
    6:[
      ["dark_ghostly_slime","dark_bat"],
      ["dark_ghostly_slime","dark_bat","ancient_sentinel"],
      ["dark_bat","ancient_sentinel","ancient_guardian"],
      ["dark_ghostly_slime","ancient_sentinel","ancient_guardian"],
      ["dark_ghostly_slime","dark_bat","ancient_sentinel","ancient_guardian"]
    ]
  });

  const WORLD_MAPS = Object.freeze({
    5:{
      theme:"sand_desert",
      ground:"assets/map/world5/world5_ground_1.png",
      objects:{
        dune:{src:"assets/map/world5/world5_dune_01.png",count:16,w:190,h:90,anchor:.62,solid:false},
        dead_bush:{src:"assets/map/world5/world5_dead_bush_01.png",count:14,w:54,h:42,anchor:.72,solid:false},
        bones:{src:"assets/map/world5/world5_bones_01.png",count:9,w:70,h:48,anchor:.68,solid:false},
        cactus:{src:"assets/map/world5/world5_mini_cactus_01.png",count:18,w:48,h:64,anchor:.76,solid:true,r:14},
        flower:{src:"assets/map/world5/world5_flower_01.png",count:12,w:34,h:34,anchor:.66,solid:false}
      }
    },
    6:{
      theme:"dark_ruins",
      ground:"assets/map/world6/world6_ground_1.png",
      objects:{
        bone_piles:{src:"assets/map/world6/world6_bone_piles_01.png",count:10,w:70,h:48,anchor:.68,solid:false},
        crystal:{src:"assets/map/world6/world6_crystal_01.png",count:14,w:58,h:66,anchor:.76,solid:true,r:14},
        pillar:{src:"assets/map/world6/world6_pillar_01.png",count:10,w:84,h:142,anchor:.82,solid:true,r:22},
        runestone:{src:"assets/map/world6/world6_runestone_01.png",count:11,w:74,h:100,anchor:.80,solid:true,r:19},
        statue1:{src:"assets/map/world6/world6_statue_01.png",count:6,w:82,h:132,anchor:.82,solid:true,r:22},
        statue2:{src:"assets/map/world6/world6_statue_02.png",count:6,w:82,h:132,anchor:.82,solid:true,r:22},
        stone:{src:"assets/map/world6/world6_stone_01.png",count:18,w:72,h:54,anchor:.70,solid:true,r:18},
        tree:{src:"assets/map/world6/world6_tree_01.png",count:12,w:118,h:178,anchor:.84,solid:true,r:24}
      }
    }
  });

  const ACHIEVEMENTS = Object.freeze([
    {id:"first_bloom",tier:3,name:"First Bloom",desc:"Clear your first stage.",test:s=>totalClears(s)>=1,progress:s=>`${Math.min(1,totalClears(s))}/1 stage`,reward:{coins:150,chests:{common:1}}},
    {id:"growing_bunny",tier:3,name:"Growing Bunny",desc:"Reach Player Level 5.",test:s=>level(s)>=5,progress:s=>`${Math.min(5,level(s))}/5 level`,reward:{coins:250,chests:{common:1}}},
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

  function totalClears(save) {
    const stats = Object.values(save?.stageStats || {}).reduce((sum, entry) => sum + num(entry?.clears), 0);
    if (stats) return stats;
    return Object.values(save?.clearedStages || {}).filter(Boolean).length;
  }
  function level(save) { return Math.max(1, num(save?.account?.level || save?.level || 1)); }
  function kills(save) { return num(save?.stats?.kills || save?.kills); }
  function lifetimeCoins(save) { return Math.max(num(save?.economy?.lifetimeCoinsEarned), num(save?.stats?.coinsEarned), num(save?.coins)); }
  function chestOpens(save) { return num(save?.economy?.totalChestOpens || save?.gacha?.totalOpens); }
  function gearItems(save) { return [...(save?.inventory || []), ...Object.values(save?.equipped || {}).filter(Boolean)]; }
  function gearCount(save) { return gearItems(save).length; }
  function hasRarity(save, rarities) { return gearItems(save).some(item => rarities.includes(String(item?.rarity || ""))); }
  function totalStars(save) { return Object.values(save?.stageStars || {}).reduce((sum, value) => sum + clamp(num(value), 0, 3), 0); }
  function worldStageIds(world) { return Array.from({length:5}, (_, index) => `world_${world}_${index + 1}`); }
  function worldClears(save, world) { return worldStageIds(world).filter(stageId => save?.clearedStages?.[stageId] || num(save?.stageStats?.[stageId]?.clears) > 0 || num(save?.stageStars?.[stageId]) > 0).length; }
  function worldStars(save, world) { return worldStageIds(world).reduce((sum, stageId) => sum + clamp(num(save?.stageStars?.[stageId] || save?.stageStats?.[stageId]?.stars), 0, 3), 0); }
  function power(save) { return num(save?.power || window.CHERRIFT_PREBETA?.calculatePower?.(save)); }
  function minArsenal(save) {
    const slots = Object.values(save?.arsenal?.slots || {});
    return slots.length ? Math.min(...slots.map(slot => Math.max(1, num(slot?.level)))) : 1;
  }

  function ensureCss() {
    if (id("cherriftFixpack095Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftFixpack095Css";
    style.textContent = `
      /* #1 Cherry Selector splash stage: fixed geometry on PC + phone. */
      :is(#cherrySelectorV095,#skins) :is(.cherry-selector-art-v095,.skin-art-v093,.fix-splash-host-v095){
        position:relative!important;overflow:hidden!important;background-position:center!important;
        background-repeat:no-repeat!important;background-size:contain!important;
        min-width:0!important;isolation:isolate
      }
      #cherrySelectorV095 .cherry-selector-art-v095{
        width:100%!important;height:clamp(390px,58vh,650px)!important;min-height:390px!important;
        max-height:650px!important;flex:1 1 auto!important
      }
      :is(#cherrySelectorV095,#skins) .fix-splash-img-v095{
        position:absolute!important;inset:50px 18px 18px!important;width:calc(100% - 36px)!important;
        height:calc(100% - 68px)!important;display:block!important;object-fit:contain!important;
        object-position:center!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;
        z-index:0!important;filter:none!important
      }
      :is(#cherrySelectorV095,#skins) .fix-splash-img-v095.hidden{display:none!important}
      #cherrySelectorV095 :is(.cherry-selector-view-toggle-v095,.cherry-selector-toggle-v095){position:relative!important;z-index:2!important}
      @media(max-width:820px){
        #cherrySelectorV095 .cherry-selector-art-v095{height:clamp(300px,48vh,470px)!important;min-height:300px!important;max-height:470px!important}
        :is(#cherrySelectorV095,#skins) .fix-splash-img-v095{inset:44px 10px 10px!important;width:calc(100% - 20px)!important;height:calc(100% - 54px)!important}
      }
      @media(max-width:520px){#cherrySelectorV095 .cherry-selector-art-v095{height:360px!important;min-height:360px!important}}

      /* #2 Remove only the right-side pink pin/diamond from active primary nav buttons. */
      #globalRailV060 :is(.rail-nav-v082,.rail-nav-v060) > button.active::after,
      .topnav-v0933 :is(.rail-nav-v082,.rail-nav-v060) > button.active::after{
        content:none!important;display:none!important;opacity:0!important
      }

      /* #4 Replace the old tight/fast click burst with the slower Sakura drift. */
      #clickPetalBurstV0943{display:none!important;visibility:hidden!important}
      #fixClickPetalLayerV095{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147482100;contain:strict}
      .fix-click-petal-v095{position:absolute;width:8px;height:13px;border-radius:78% 22% 72% 28%;transform-origin:50% 65%;
        pointer-events:none;will-change:transform,opacity;box-shadow:0 2px 6px rgba(63,11,42,.16)}

      /* #5 Gear sort/action control must stay inside the CHERRIFT dark theme. */
      #gear .fix-gear-level-control-v095,
      #gear select.fix-gear-level-control-v095,
      #gear button.fix-gear-level-control-v095{
        color:var(--theme-text,#f5ddea)!important;border:1px solid var(--theme-outline-soft,rgba(224,112,165,.32))!important;
        background:linear-gradient(180deg,var(--theme-surface-2,#281525),var(--theme-surface-3,#1a0e19))!important;
        box-shadow:none!important;opacity:1!important
      }
      #gear .fix-gear-level-control-v095:hover{border-color:var(--theme-primary-soft,#d86b9e)!important;background:var(--theme-surface,#32182c)!important}
      #gear .fix-gear-level-control-v095:disabled{color:var(--theme-muted,#997d8d)!important;background:var(--theme-surface-3,#1a0e19)!important;opacity:.62!important}

      /* #7 All small skin slots use the square icon, never a tall splash. */
      .fix-skin-icon-v095{object-fit:cover!important;object-position:center!important;overflow:hidden!important}
      :is(.shop-card-v080,.skin-icon-v093,.cherry-selector-thumb-v095,.fix-small-skin-slot-v095) img.fix-skin-icon-v095{
        width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important
      }
      :is(.shop-card-v080,.shop-skin-card,.skin-shop-card,.cherry-selector-thumb-v095,.skin-icon-v093){overflow:hidden!important}
      :is(.shop-card-v080,.shop-skin-card,.skin-shop-card) :is(img,.fix-skin-icon-v095){object-fit:cover!important;object-position:center!important}

      /* #8 Duplicate skin conversion animation. */
      .gco-dupe-art-wrap-v095{position:relative!important;display:block!important;width:min(330px,72vw)!important;margin:8px auto 12px!important;overflow:hidden!important;border-radius:14px}
      .gco-dupe-art-wrap-v095 .gco-skin-art{width:100%!important;max-width:none!important;margin:0!important;animation:fixDupeFadeV095 1.05s ease both!important}
      .gco-dupe-cross-v095{position:absolute;inset:0;pointer-events:none;opacity:0;animation:fixDupeCrossV095 .78s .20s ease forwards}
      .gco-dupe-cross-v095::before,.gco-dupe-cross-v095::after{content:"";position:absolute;left:8%;top:49%;width:84%;height:5px;border-radius:99px;background:linear-gradient(90deg,transparent,#c93678 12%,#ff80b6 50%,#c93678 88%,transparent);box-shadow:0 0 14px rgba(255,62,145,.58)}
      .gco-dupe-cross-v095::before{transform:rotate(32deg)} .gco-dupe-cross-v095::after{transform:rotate(-32deg)}
      .gco-skin-reveal.fix-duplicate-v095 h3{animation:fixEssencePulseV095 .55s .56s ease both}
      @keyframes fixDupeFadeV095{0%,32%{filter:none;opacity:1;transform:scale(1)}100%{filter:grayscale(.92) saturate(.24) brightness(.72);opacity:.56;transform:scale(.975)}}
      @keyframes fixDupeCrossV095{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
      @keyframes fixEssencePulseV095{0%{transform:scale(.96);opacity:.72}55%{transform:scale(1.045);text-shadow:0 0 20px rgba(234,80,154,.48)}100%{transform:scale(1);opacity:1}}

      /* #9 Gacha uses the global wallet. Keep only the chest counters locally. */
      body.v0933-desktop #desktopCurrencyV0943{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      body:has(#gachaChestOnlyV12:not(.hidden)) .resource-bar-v082,
      body:has(#gachaChestOnlyV12:not(.hidden)) #resourceBarV082{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      #gachaChestOnlyV12 #gcoWallet{display:none!important}
      #gachaChestOnlyV12 #gcoChestWallet{display:flex!important}
      @media(min-width:821px){
        body.v0933-desktop #globalRailV060.topnav-v0933{grid-template-columns:190px minmax(0,1fr) auto!important}
      }

      /* #10 Stable Lobby secondary navigation. */
      #fixLobbySubnavV095{min-height:38px;display:flex;align-items:center;gap:28px;padding:0 max(18px,calc((100vw - 1520px)/2));
        border-bottom:1px solid var(--theme-outline-soft,rgba(130,56,94,.2));background:var(--theme-surface-glass,rgba(255,247,250,.96));
        color:var(--theme-text,#53333f);position:relative;z-index:8000}
      #fixLobbySubnavV095 button{height:38px;padding:0 10px;border:0;border-bottom:3px solid transparent;color:inherit;background:transparent;font:800 12px/1 system-ui,sans-serif;cursor:pointer}
      #fixLobbySubnavV095 button.active{border-bottom-color:var(--theme-primary,#c65b89);color:var(--theme-primary-strong,#a82f67)}
      @media(max-width:820px){#fixLobbySubnavV095{gap:8px;justify-content:center;padding:0 8px;overflow-x:auto}#fixLobbySubnavV095 button{flex:0 0 auto}}

      /* #11 Mail entry in the global utility group. */
      #fixMailButtonV095{position:relative!important;min-width:40px!important;min-height:36px!important;display:grid!important;place-items:center!important;
        border:1px solid var(--theme-outline-soft,rgba(255,180,216,.2))!important;border-radius:10px!important;color:var(--theme-text,#f6dbea)!important;
        background:var(--theme-surface-2,rgba(35,16,32,.75))!important;cursor:pointer!important;font-size:17px!important}
      #fixMailButtonV095 .fix-mail-badge-v095{position:absolute;right:-4px;top:-5px;min-width:16px;height:16px;padding:0 4px;display:none;place-items:center;border-radius:99px;background:#e8438d;color:#fff;font:800 9px/16px system-ui,sans-serif}
      #fixMailButtonV095.has-unread .fix-mail-badge-v095{display:grid}

      /* #3 Achievement tier UI. */
      .fix-ach-shell-v095{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:18px 0 40px;color:var(--theme-text,#f4e8ef)}
      .fix-ach-head-v095{display:flex;align-items:center;gap:16px;margin-bottom:14px}.fix-ach-back-v095{width:52px;height:48px;border-radius:14px;border:1px solid var(--theme-outline-soft,rgba(220,120,170,.28));color:inherit;background:var(--theme-surface-2,rgba(28,14,27,.8));font-size:20px;cursor:pointer}
      .fix-ach-head-v095 h1{margin:0;font:800 clamp(34px,5vw,50px)/1 Georgia,serif}.fix-ach-head-v095 p{margin:4px 0 0;color:var(--theme-muted,#b99eac)}
      .fix-ach-filter-v095{display:flex;gap:8px;margin:10px 0 16px;overflow-x:auto;padding-bottom:4px}.fix-ach-filter-v095 button{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--theme-outline-soft,rgba(220,120,170,.25));color:inherit;background:var(--theme-surface-2,rgba(30,14,27,.78));font-weight:800;cursor:pointer}.fix-ach-filter-v095 button.active{color:#fff;background:var(--theme-selection,#b93d76)}
      .fix-ach-grid-v095{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.fix-ach-card-v095{min-height:126px;display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:center;padding:14px;border:1px solid var(--tier-color,rgba(220,120,170,.28));border-radius:16px;background:linear-gradient(145deg,var(--theme-surface-glass,rgba(28,13,26,.94)),var(--theme-surface-2,rgba(22,10,21,.92)));box-shadow:0 10px 26px rgba(0,0,0,.12)}
      .fix-ach-card-v095.locked{opacity:.62}.fix-ach-tier-v095{width:62px;height:62px;display:grid;place-items:center}.fix-ach-tier-v095 img{width:58px;height:58px;object-fit:contain}.fix-ach-copy-v095 h3{margin:0 0 4px;font-size:17px}.fix-ach-copy-v095 p,.fix-ach-copy-v095 small{display:block;margin:0;color:var(--theme-muted,#b99eac);font-size:12px}.fix-ach-copy-v095 .reward{margin-top:7px;color:var(--theme-text,#f4e8ef);font-weight:800}.fix-ach-action-v095{min-width:82px;min-height:34px;padding:0 10px;border:1px solid var(--tier-color,rgba(220,120,170,.35));border-radius:9px;color:#fff;background:var(--theme-button,#b93d76);font-weight:900}.fix-ach-action-v095:disabled{color:var(--theme-muted,#a38b98);background:var(--theme-surface-3,#25131f);opacity:.7}
      @media(max-width:1050px){.fix-ach-grid-v095{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:680px){.fix-ach-shell-v095{width:min(100% - 18px,720px)}.fix-ach-grid-v095{grid-template-columns:1fr}.fix-ach-card-v095{grid-template-columns:58px 1fr;min-height:120px}.fix-ach-tier-v095{width:52px;height:52px}.fix-ach-tier-v095 img{width:50px;height:50px}.fix-ach-action-v095{grid-column:2;justify-self:start}}

      @media(prefers-reduced-motion:reduce){.fix-click-petal-v095,.gco-dupe-art-wrap-v095 .gco-skin-art,.gco-dupe-cross-v095,.gco-skin-reveal.fix-duplicate-v095 h3{animation-duration:.01ms!important;animation-delay:0ms!important}}
    `;
    document.head.appendChild(style);
  }

  function skinById(skinId) { return window.CHERRIFT_DATA?.skins?.find?.(skin => skin.id === skinId) || null; }
  function skinIdFromFolder(folder) {
    if (folder === "base_cherry") return "cherry_default";
    return Object.keys(SKIN_ICON_OVERRIDES).find(idValue => (SKIN_FOLDER_ALIASES[idValue] || idValue) === folder) || folder;
  }
  function skinIdFromName(name) {
    const normalized = String(name || "").trim().toLowerCase();
    return window.CHERRIFT_DATA?.skins?.find?.(skin => String(skin.name || "").trim().toLowerCase() === normalized)?.id || "";
  }
  function skinFolder(skinId) {
    const skin = skinById(skinId);
    return skin?.folder || SKIN_FOLDER_ALIASES[skinId] || skinId;
  }
  function skinIcon(skinId) {
    if (skinId === "mage_cherry") return skinById(skinId)?.icon || `assets/player/skins/mage_cherry/mage_cherry_icon.png`;
    return SKIN_ICON_OVERRIDES[skinId] || skinById(skinId)?.icon || "";
  }
  function skinSplashCandidates(skinId) {
    const skin = skinById(skinId);
    const folder = skinFolder(skinId);
    return [...new Set([
      skin?.splash,
      `assets/player/skins/${folder}/${folder}_splashart.png`,
      `assets/player/skins/${folder}/${skinId}_splashart.png`,
      skinIcon(skinId)
    ].filter(Boolean))];
  }
  function loadFirstImage(candidates, token) {
    return new Promise(resolve => {
      let index = 0;
      const next = () => {
        if (token !== state.splashToken || index >= candidates.length) return resolve(null);
        const source = candidates[index++];
        if (state.splashCache.get(source) === false) return next();
        if (state.splashCache.get(source) === true) return resolve(source);
        const image = new Image();
        image.decoding = "async";
        image.onload = () => { state.splashCache.set(source, true); resolve(source); };
        image.onerror = () => { state.splashCache.set(source, false); next(); };
        image.src = source;
      };
      next();
    });
  }

  function patchSkinMetadata() {
    for (const skin of window.CHERRIFT_DATA?.skins || []) {
      const source = skinIcon(skin.id);
      if (!source || skin.id === "mage_cherry") continue;
      try { skin.icon = source; } catch (_) {}
    }
  }

  function selectedPreviewSkinId(root) {
    const selectors = [
      ".skin-icon-v093.active[data-v093-skin]",
      ".active[data-skin-id]", ".selected[data-skin-id]",
      ".active[data-skin]", ".selected[data-skin]",
      "[aria-selected=true][data-skin-id]", "[aria-selected=true][data-skin]"
    ];
    for (const selector of selectors) {
      const node = q(selector, root);
      const value = node?.dataset?.v093Skin || node?.dataset?.skinId || node?.dataset?.skin;
      if (value) return value;
    }
    const details = qa("h1,h2,h3", root).find(node => /Cherry/i.test(node.textContent || "") && !/Selector/i.test(node.textContent || ""));
    return skinIdFromName(details?.textContent) || window.UI?.save?.selectedSkin || "cherry_default";
  }

  function selectorRoot() {
    const direct = id("cherrySelectorV095");
    if (direct && !direct.classList.contains("hidden")) return direct;
    return qa("#app > section,.panel,.screen,main").find(root => !root.classList?.contains("hidden") && /Cherry Selector/i.test(root.textContent || "")) || null;
  }

  function selectorArtHost(root) {
    const direct = q(".cherry-selector-art-v095,.skin-art-v093,[data-cherry-splash],[data-skin-art]", root);
    if (direct) return direct;
    const splashButton = qa("button", root).find(button => /^Splash Art$/i.test(button.textContent.trim()));
    if (!splashButton) return null;
    let node = splashButton.parentElement;
    const candidates = [];
    while (node && node !== root) {
      const rect = node.getBoundingClientRect();
      if (rect.width >= 280 && rect.height >= 240) candidates.push({node,area:rect.width * rect.height});
      node = node.parentElement;
    }
    return candidates.sort((a,b) => a.area - b.area)[0]?.node || null;
  }

  function splashModeActive(root) {
    const button = qa("button", root).find(entry => /^Splash Art$/i.test(entry.textContent.trim()));
    if (!button) return true;
    const pressed = button.getAttribute("aria-pressed");
    if (pressed !== null) return pressed === "true";
    return button.classList.contains("active") || !qa("button", root).some(entry => /^Game View$/i.test(entry.textContent.trim()) && entry.classList.contains("active"));
  }

  async function patchSelectorSplash() {
    const root = selectorRoot();
    if (!root) return;
    const host = selectorArtHost(root);
    if (!host) return;
    host.classList.add("fix-splash-host-v095");
    let image = q(":scope > .fix-splash-img-v095", host);
    if (!image) {
      image = document.createElement("img");
      image.className = "fix-splash-img-v095";
      image.alt = "Cherry splash art";
      host.prepend(image);
    }
    const skinId = selectedPreviewSkinId(root);
    const token = ++state.splashToken;
    const source = await loadFirstImage(skinSplashCandidates(skinId), token);
    if (token !== state.splashToken || !source) return;
    if (image.getAttribute("src") !== source) image.setAttribute("src", source);
    image.dataset.skinId = skinId;
    image.classList.toggle("hidden", !splashModeActive(root));
    host.style.backgroundSize = "contain";
    host.style.backgroundPosition = "center";
    host.style.backgroundRepeat = "no-repeat";
  }

  function imageSkinId(image) {
    const src = String(image.getAttribute("src") || "");
    const folder = src.match(/assets\/player\/skins\/([^/]+)\//)?.[1];
    if (folder) return skinIdFromFolder(folder);
    const holder = image.closest?.("[data-skin-id],[data-skin],[data-v093-skin]");
    const explicit = holder?.dataset?.skinId || holder?.dataset?.skin || holder?.dataset?.v093Skin;
    if (explicit) return explicit;
    const card = image.closest?.(".skin-icon-v093,.cherry-selector-thumb-v095,.shop-card-v080,.shop-skin-card,.skin-shop-card,.cherry-nav-v0942,.cherry-nav-bf,.fix-small-skin-slot-v095") || image.parentElement;
    const named = skinIdFromName(image.alt || image.title || q("h2,h3,h4,b,strong", card)?.textContent || card?.textContent || "");
    if (named) return named;
    const normalizedSrc = src.toLowerCase();
    return Object.keys(SKIN_ICON_OVERRIDES).find(skinId => {
      const folderName = skinFolder(skinId).toLowerCase();
      return normalizedSrc.includes(folderName) || normalizedSrc.includes(skinId.toLowerCase());
    }) || "";
  }

  function isSmallSkinImage(image) {
    if (image.closest(".gco-skin-reveal,.fix-splash-host-v095,.cherry-selector-art-v095,.skin-art-v093")) return false;
    if (image.closest(".skin-icon-v093,.cherry-selector-thumb-v095,.shop-card-v080,.shop-skin-card,.skin-shop-card,.cherry-nav-v0942,.cherry-nav-bf,.mobile-profile-v0932")) return true;
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.width <= 320 && rect.height <= 320;
  }

  function patchSkinImages() {
    patchSkinMetadata();
    const images = new Set([
      ...qa('img[src*="assets/player/skins/"]'),
      ...qa('.skin-icon-v093 img,.cherry-selector-thumb-v095 img,.shop-card-v080 img,.shop-skin-card img,.skin-shop-card img,.cherry-nav-v0942 img,.cherry-nav-bf img,[data-skin-id] img,[data-skin] img,[data-v093-skin] img')
    ]);
    images.forEach(image => {
      if (!isSmallSkinImage(image)) return;
      const skinId = imageSkinId(image);
      const source = skinIcon(skinId);
      if (!source || skinId === "mage_cherry") return;
      if (image.getAttribute("src") !== source) image.setAttribute("src", source);
      image.classList.add("fix-skin-icon-v095");
      image.closest(".shop-card-v080,.shop-skin-card,.skin-shop-card,.skin-icon-v093,.cherry-selector-thumb-v095")?.classList.add("fix-small-skin-slot-v095");
    });
  }

  function ensurePetalLayer() {
    if (state.petalLayer?.isConnected) return state.petalLayer;
    const layer = document.createElement("div");
    layer.id = "fixClickPetalLayerV095";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    state.petalLayer = layer;
    return layer;
  }

  function sakuraBurst(x, y) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = ensurePetalLayer();
    const palette = ["#a92466","#c93d7e","#e85b9b","#f58ab8","#ffd0e3"];
    const count = 5 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index++) {
      const petal = document.createElement("i");
      petal.className = "fix-click-petal-v095";
      petal.style.background = palette[Math.floor(Math.random() * palette.length)];
      const startX = x + (Math.random() - .5) * 30;
      const startY = y + (Math.random() - .5) * 22;
      petal.style.left = `${startX}px`;
      petal.style.top = `${startY}px`;
      layer.appendChild(petal);
      const angle = Math.random() * Math.PI * 2;
      const distance = 48 + Math.random() * 82;
      const driftX = Math.cos(angle) * distance + (Math.random() - .5) * 34;
      const driftY = Math.sin(angle) * distance * .22 + 78 + Math.random() * 72;
      const sway = (Math.random() - .5) * 54;
      const rotation = (Math.random() - .5) * 520;
      const duration = 2250 + Math.random() * 1050;
      const animation = petal.animate([
        {transform:`translate3d(0,0,0) rotate(${Math.random()*90-45}deg) scale(.68)`,opacity:0},
        {offset:.10,transform:`translate3d(${driftX*.10}px,${-5-Math.random()*10}px,0) rotate(${rotation*.08}deg) scale(1)`,opacity:.94},
        {offset:.34,transform:`translate3d(${driftX*.30 + sway}px,${driftY*.18}px,0) rotate(${rotation*.30}deg) scale(.96)`,opacity:.90},
        {offset:.66,transform:`translate3d(${driftX*.66 - sway*.55}px,${driftY*.55}px,0) rotate(${rotation*.68}deg) scale(.90)`,opacity:.72},
        {transform:`translate3d(${driftX + sway*.25}px,${driftY}px,0) rotate(${rotation}deg) scale(.72)`,opacity:0}
      ], {duration,delay:Math.random()*120,easing:"cubic-bezier(.20,.46,.24,1)",fill:"forwards"});
      animation.onfinish = () => petal.remove();
    }
  }

  function patchGearControl() {
    const gear = id("gear");
    if (!gear || gear.classList.contains("hidden")) return;
    qa("button,select", gear).forEach(control => {
      const text = `${control.textContent || ""} ${control.value || ""}`.trim();
      if (/^Level\b|\bLevel\s*[↓↑]/i.test(text)) control.classList.add("fix-gear-level-control-v095");
    });
  }

  function patchSettingsAccount() {
    const settings = id("settings");
    if (!settings || settings.classList.contains("hidden")) return;
    window.CHERRIFT_ACCOUNT_MAIL?.patchVisibleRoute?.();
    const pages = qa(".settings-page-v060", settings);
    const accountPage = pages.find(page => {
      const marker = `${page.id || ""} ${page.dataset.settingsPage || ""} ${q("h2,h3", page)?.textContent || ""}`.toLowerCase();
      return page.classList.contains("active") && (marker.includes("account") || marker.includes("fiók"));
    }) || pages.find(page => {
      const marker = `${page.id || ""} ${page.dataset.settingsPage || ""} ${q("h2,h3", page)?.textContent || ""}`.toLowerCase();
      return marker.includes("account") || marker.includes("fiók");
    });
    const card = id("settingsAccountBugfixV0941");
    if (accountPage && card && !accountPage.contains(card)) accountPage.appendChild(card);
  }

  function patchDuplicateReveal() {
    qa(".gco-skin-reveal").forEach(card => {
      if (!/Duplicate|Duplik/i.test(card.textContent || "") || card.classList.contains("fix-duplicate-v095")) return;
      card.classList.add("fix-duplicate-v095");
      const image = q(".gco-skin-art", card);
      if (!image) return;
      const wrap = document.createElement("div");
      wrap.className = "gco-dupe-art-wrap-v095";
      image.before(wrap);
      wrap.appendChild(image);
      const cross = document.createElement("span");
      cross.className = "gco-dupe-cross-v095";
      cross.setAttribute("aria-hidden", "true");
      wrap.appendChild(cross);
    });
  }

  function walletUnreadCount() {
    const save = window.UI?.save || {};
    return num(save.mailUnread || save.mailbox?.unread || save.mail?.unread || save.account?.unreadMail);
  }

  function ensureMailButton() {
    let button = id("fixMailButtonV095");
    if (!button) {
      button = document.createElement("button");
      button.id = "fixMailButtonV095";
      button.type = "button";
      button.title = "Mail";
      button.setAttribute("aria-label", "Mail");
      button.dataset.fixMail = "1";
      button.innerHTML = '<span aria-hidden="true">✉</span><b class="fix-mail-badge-v095"></b>';
    }
    const desktopTarget = q("#globalRailV060 .rail-bottom-v060");
    const mobileTarget = q("#mobileMenuV082 .mobile-menu-grid-v082");
    if (matchMedia("(min-width:821px)").matches && desktopTarget) {
      const settings = q(".rail-settings-v060", desktopTarget);
      if (button.parentElement !== desktopTarget) desktopTarget.insertBefore(button, settings || null);
    } else if (mobileTarget && button.parentElement !== mobileTarget) {
      mobileTarget.appendChild(button);
    } else if (!button.isConnected && document.body) document.body.appendChild(button);
    const unread = walletUnreadCount();
    button.classList.toggle("has-unread", unread > 0);
    const badge = q(".fix-mail-badge-v095", button);
    if (badge) badge.textContent = unread > 99 ? "99+" : String(unread || "");
  }

  function visiblePanelByHeading(pattern) {
    return qa("#app > section,.panel,.screen").find(panel => {
      if (panel.classList.contains("hidden")) return false;
      const heading = q("h1,h2", panel)?.textContent || "";
      return pattern.test(heading);
    }) || null;
  }

  function lobbyRoute() {
    if (id("rankingPrebeta") && !id("rankingPrebeta").classList.contains("hidden")) return "rankingPrebeta";
    if (id("socialV082") && !id("socialV082").classList.contains("hidden")) return "socialV082";
    if (visiblePanelByHeading(/^Buff List$/i) || (id("buffsV082") && !id("buffsV082").classList.contains("hidden"))) return "buffsV082";
    if (id("menu") && !id("menu").classList.contains("hidden")) return "menu";
    return "";
  }

  function ensureLobbySubnav() {
    const route = lobbyRoute();
    let nav = id("fixLobbySubnavV095");
    const original = id("desktopSubnavV0933");
    if (!route) {
      nav?.remove();
      original?.style.removeProperty("display");
      return;
    }
    if (original) original.style.setProperty("display", "none", "important");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "fixLobbySubnavV095";
      nav.setAttribute("aria-label", "Lobby navigation");
      nav.innerHTML = `
        <button type="button" data-fix-lobby-route="socialV082">Social</button>
        <button type="button" data-fix-lobby-route="rankingPrebeta">Rank</button>
        <button type="button" data-fix-lobby-route="buffsV082">Buff List</button>`;
      const rail = id("globalRailV060");
      if (rail?.parentNode) rail.insertAdjacentElement("afterend", nav);
      else document.body.prepend(nav);
    }
    qa("button[data-fix-lobby-route]", nav).forEach(button => button.classList.toggle("active", button.dataset.fixLobbyRoute === route));

    qa('.prebeta-back[data-prebeta-open="menu"]').forEach(button => {
      button.removeAttribute("data-prebeta-open");
      button.dataset.fixLobbyBack = "1";
    });
  }

  function forceLobbyOpen() {
    try { window.CHERRIFT_ACCOUNT_MAIL?.hide?.(); } catch (_) {}
    try { window.CHERRIFT_WORLD_UI?.hide?.(); } catch (_) {}
    id("rankingPrebeta")?.classList.add("hidden");
    id("socialV082")?.classList.add("hidden");
    if (window.CHERRIFT_STABILITY?.open) window.CHERRIFT_STABILITY.open("menu");
    else window.UI?.open?.("menu");
    requestAnimationFrame(() => {
      id("menu")?.classList.remove("hidden");
      state.route = "menu";
      ensureLobbySubnav();
    });
  }

  function achievementIcon(tier) {
    return tier === 1 ? "assets/ui/achivement_gold.png" : tier === 2 ? "assets/ui/achivement_silver.png" : "assets/ui/achivement_bronze.png";
  }
  function tierName(tier) { return tier === 1 ? "Gold" : tier === 2 ? "Silver" : "Bronze"; }
  function rewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} Coin`);
    if (reward.chests?.common) parts.push(`${reward.chests.common} Common Chest`);
    if (reward.chests?.rare) parts.push(`${reward.chests.rare} Rare Chest`);
    if (reward.chests?.epic) parts.push(`${reward.chests.epic} Epic Chest`);
    if (reward.bloomGems) parts.push(`${reward.bloomGems} Bloom Gem`);
    if (reward.themes?.includes("cozy_cherry")) parts.push("Cozy Cherry Theme");
    return parts.join(" · ") || "Special reward";
  }

  function findAchievementsPanel() {
    const direct = id("achievements");
    if (direct && !direct.classList.contains("hidden")) return direct;
    return qa("#app > section,.panel,.screen").find(panel => !panel.classList.contains("hidden") && /^Achievements$/i.test(q("h1,h2", panel)?.textContent?.trim() || "")) || null;
  }

  function renderAchievements(panel = findAchievementsPanel()) {
    if (!panel || !window.UI?.save) return;
    const save = UI.save;
    save.fixAchievementsClaimed = Array.isArray(save.fixAchievementsClaimed) ? save.fixAchievementsClaimed : [];
    const claimed = new Set(save.fixAchievementsClaimed);
    const filter = state.achievementFilter;
    const list = ACHIEVEMENTS.filter(achievement => filter === "all" || String(achievement.tier) === filter);
    panel.dataset.fixAchievements = "1";
    panel.innerHTML = `<div class="fix-ach-shell-v095">
      <header class="fix-ach-head-v095"><button class="fix-ach-back-v095" type="button" data-fix-ach-back aria-label="Back">←</button><div><h1>Achievements</h1><p>Permanent milestones and rewards.</p></div></header>
      <nav class="fix-ach-filter-v095" aria-label="Achievement tier filter">
        ${[["all","All"],["1","Tier 1 · Gold"],["2","Tier 2 · Silver"],["3","Tier 3 · Bronze"]].map(([key,label]) => `<button type="button" data-fix-ach-filter="${key}" class="${filter===key?"active":""}">${label}</button>`).join("")}
      </nav>
      <div class="fix-ach-grid-v095">${list.map(achievement => {
        const unlocked = !!achievement.test(save);
        const isClaimed = claimed.has(achievement.id);
        const tierColor = achievement.tier === 1 ? "#e8b84d" : achievement.tier === 2 ? "#9eb8cf" : "#b97857";
        return `<article class="fix-ach-card-v095 ${unlocked?"":"locked"}" style="--tier-color:${tierColor}">
          <div class="fix-ach-tier-v095"><img src="${achievementIcon(achievement.tier)}" alt="${tierName(achievement.tier)}"></div>
          <div class="fix-ach-copy-v095"><h3>${esc(achievement.name)}</h3><p>${esc(achievement.desc)}</p><small>${esc(achievement.progress(save))}</small><small class="reward">${esc(rewardText(achievement.reward))}</small></div>
          <button class="fix-ach-action-v095" type="button" data-fix-ach-claim="${achievement.id}" ${!unlocked||isClaimed?"disabled":""}>${isClaimed?"CLAIMED":unlocked?"CLAIM":"LOCKED"}</button>
        </article>`;
      }).join("")}</div>
    </div>`;
  }

  function grantAchievement(achievementId) {
    const achievement = ACHIEVEMENTS.find(entry => entry.id === achievementId);
    const save = window.UI?.save;
    if (!achievement || !save || !achievement.test(save)) return;
    save.fixAchievementsClaimed = Array.isArray(save.fixAchievementsClaimed) ? save.fixAchievementsClaimed : [];
    if (save.fixAchievementsClaimed.includes(achievementId)) return;
    const reward = achievement.reward || {};
    save.coins = num(save.coins) + num(reward.coins);
    save.chests = {...{common:0,rare:0,epic:0},...(save.chests || {})};
    for (const tier of ["common","rare","epic"]) save.chests[tier] = num(save.chests[tier]) + num(reward.chests?.[tier]);
    if (reward.bloomGems) {
      save.bloomGems = num(save.bloomGems ?? save.blossomGems) + num(reward.bloomGems);
      save.blossomGems = save.bloomGems;
    }
    for (const themeId of reward.themes || []) window.CHERRIFT_THEMES?.unlock?.(themeId, save, {silent:true});
    save.fixAchievementsClaimed.push(achievementId);
    try { window.CherriftStorage?.save?.(save); } catch (_) {}
    try { window.UI?.refreshMenu?.(); } catch (_) {}
    window.dispatchEvent(new CustomEvent("cherrift:savechange", {detail:{source:"achievement",id:achievementId}}));
    renderAchievements();
  }

  function patchAchievements() {
    const panel = findAchievementsPanel();
    if (!panel) return;
    if (panel.dataset.fixAchievements !== "1" || !q(".fix-ach-shell-v095", panel)) renderAchievements(panel);
  }

  function applyStagePoolsAndWorlds() {
    const stages = window.CHERRIFT_V040?.stages || window.CHERRIFT_DATA?.stages || [];
    for (const stage of stages) {
      const world = Number(stage.world || String(stage.id || "").match(/world_(\d+)/)?.[1]);
      const chapter = Number(stage.index || String(stage.id || "").match(/_(\d+)$/)?.[1]);
      const pool = WORLD_POOLS[world]?.[chapter - 1];
      if (pool?.length) stage.enemyPool = [...pool];
      if (WORLD_MAPS[world]) {
        stage.theme = WORLD_MAPS[world].theme;
        stage.splash = WORLD_MAPS[world].ground;
        stage.placeholder = false;
        stage.desc = world === 5 ? "Cross the buried Sand Desert ruins and survive its guardians." : "Descend into the Dark Ruins and survive the ancient sentinels.";
      }
    }
    if (window.CHERRIFT_V040) {
      try { CHERRIFT_V040.enemyDefs = {...(CHERRIFT_V040.enemyDefs || {}),...ENEMY_DEFS}; } catch (_) {}
      try { CHERRIFT_V040.enemySheets = {...(CHERRIFT_V040.enemySheets || {}),...ENEMY_SHEETS}; } catch (_) {}
    }
  }

  function preloadImage(source, targetMap, key = source) {
    if (!source || targetMap.has(key)) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => targetMap.set(key, image);
    image.onerror = () => targetMap.set(key, null);
    image.src = `${source}${source.includes("?")?"&":"?"}v=095fix1`;
    targetMap.set(key, image);
  }

  function preloadWorldAssets() {
    for (const [world, config] of Object.entries(WORLD_MAPS)) {
      preloadImage(config.ground, state.worldImages, `ground:${world}`);
      for (const [key, object] of Object.entries(config.objects)) preloadImage(object.src, state.worldImages, `${world}:${key}`);
    }
  }

  function preloadEnemyAssets() {
    for (const [enemyId, sheet] of Object.entries(ENEMY_SHEETS)) preloadImage(sheet.src, state.enemyImages, enemyId);
  }

  function seededRandom(seedText) {
    let seed = 2166136261;
    for (const char of String(seedText || "world")) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619); }
    return () => {
      seed += 0x6D2B79F5;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildWorldObjects(game, world) {
    const config = WORLD_MAPS[world];
    if (!config) return;
    const random = seededRandom(`${game.stage?.id || `world_${world}`}:095fix1`);
    const worldSize = Number(window.CHERRIFT_CONFIG?.worldSize) || 4200;
    const half = worldSize / 2 - 170;
    const keep = (game.obstacles || []).filter(object => !object?.v094Map && !object?.__fixWorldObjectV095);
    const objects = [];
    for (const [key, spec] of Object.entries(config.objects)) {
      for (let index = 0; index < spec.count; index++) {
        let x = (random() * 2 - 1) * half;
        let y = (random() * 2 - 1) * half;
        let attempts = 0;
        while (Math.hypot(x, y) < 300 && attempts++ < 8) {
          x = (random() * 2 - 1) * half;
          y = (random() * 2 - 1) * half;
        }
        objects.push({
          __fixWorldObjectV095:true, kind:`fix_world_${world}_${key}`, assetKey:`fix_w${world}_${key}`,
          fixWorld:world, fixKey:key, x,y, drawW:spec.w,drawH:spec.h,anchor:spec.anchor,
          solid:!!spec.solid,r:spec.r || 0,collisionRadius:spec.r || 0
        });
      }
    }
    game.obstacles = [...keep, ...objects];
  }

  function customizeSpawnedEnemy(enemy) {
    if (!enemy) return;
    const type = enemy.enemyType || enemy.type;
    const spec = ENEMY_DEFS[type];
    if (!spec) return;
    const oldSpec = enemy.spec || {};
    const oldHp = Math.max(1, Number(oldSpec.hp) || 34);
    const oldSpeed = Math.max(1, Number(oldSpec.speed) || 105);
    const hpRatio = spec.hp / oldHp;
    const speedRatio = spec.speed / oldSpeed;
    enemy.hp = Math.max(1, Number(enemy.hp) * hpRatio);
    enemy.maxHp = Math.max(enemy.hp, Number(enemy.maxHp) * hpRatio);
    enemy.speed = Math.max(1, Number(enemy.speed) * speedRatio);
    enemy.r = spec.r;
    enemy.xp = spec.xp;
    enemy.damage = spec.damage;
    enemy.alpha = spec.alpha || enemy.alpha || 1;
    enemy.sheetId = type;
    enemy.spec = {...spec,sheetId:type};
    if (spec.ranged && !Number.isFinite(enemy.shootTimer)) enemy.shootTimer = .5 + Math.random();
  }

  function drawEnemySheet(game, context, enemy) {
    const type = enemy?.enemyType || enemy?.type;
    const sheet = ENEMY_SHEETS[type];
    const image = state.enemyImages.get(type);
    if (!sheet || !image || !image.complete || !(image.naturalWidth || image.width)) return false;
    const cols = sheet.cols || 4;
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    const inferredRows = Math.round((naturalHeight * cols) / Math.max(1, naturalWidth));
    const rows = inferredRows >= 2 && inferredRows <= 6 ? inferredRows : (sheet.rows || 3);
    const frameW = Math.floor(naturalWidth / cols);
    const frameH = Math.floor(naturalHeight / rows);
    if (!frameW || !frameH) return false;
    // Standard sheets are Idle / Walk / Dead. Four-row ranged sheets insert
    // Attack before Dead, so the last row is always the death row.
    const attackVisual = rows >= 4 && (
      enemy.attacking || enemy.isAttacking || Number(enemy.attackTimer) > 0 ||
      Number(enemy.shootFlash) > 0 || (Number.isFinite(enemy.shootTimer) && enemy.shootTimer <= .18)
    );
    const row = enemy.dead ? rows - 1 : attackVisual ? 2 : (sheet.moveRow ?? 1);
    const frame = Math.floor(((game.t || 0) + (enemy.phase || 0)) * (sheet.fps || 7)) % cols;
    const bossScale = enemy.isBoss ? 1.42 : 1;
    const pulse = 1 + Math.sin((game.t || 0) * 5.4 + (enemy.phase || 0)) * .018;
    const drawW = sheet.displayW * bossScale * pulse;
    const drawH = sheet.displayH * bossScale * pulse;
    context.save();
    context.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
    context.globalAlpha = enemy.hit > 0 ? .68 : (sheet.alpha || enemy.alpha || 1);
    context.drawImage(image, frame * frameW, row * frameH, frameW, frameH,
      Math.round(enemy.x - drawW / 2), Math.round(enemy.y - drawH / 2 + (sheet.yOffset || 0)),
      Math.round(drawW), Math.round(drawH));
    context.restore();
    if (enemy.hp < enemy.maxHp) {
      context.save();
      context.globalAlpha = .86;
      context.fillStyle = "rgba(0,0,0,.38)";
      context.fillRect(enemy.x - enemy.r, enemy.y + enemy.r + 8, enemy.r * 2, 4);
      context.fillStyle = enemy.isBoss ? "#ff4ec2" : "#ff8ccc";
      context.fillRect(enemy.x - enemy.r, enemy.y + enemy.r + 8, enemy.r * 2 * clamp(enemy.hp / enemy.maxHp,0,1), 4);
      context.restore();
    }
    return true;
  }

  function worldPattern(context, image) {
    if (!image) return null;
    let pattern = state.patternCache.get(image);
    if (!pattern) {
      try { pattern = context.createPattern(image, "repeat"); state.patternCache.set(image, pattern); }
      catch (_) { return null; }
    }
    return pattern;
  }

  function installGameWorldAndEnemyPatch() {
    const proto = window.CherriftGame?.prototype;
    if (!proto || proto.__fixpack095WorldEnemy) return;
    proto.__fixpack095WorldEnemy = true;
    applyStagePoolsAndWorlds();
    preloadWorldAssets();
    preloadEnemyAssets();

    const previousGenerateMap = proto.generateMap;
    if (typeof previousGenerateMap === "function") {
      proto.generateMap = function generateMapFixpack095(...args) {
        const result = previousGenerateMap.apply(this, args);
        const world = Number(this.stage?.world || this.getSelectedStage?.()?.world);
        if (WORLD_MAPS[world]) buildWorldObjects(this, world);
        return result;
      };
    }

    const previousSpawnEnemy = proto.spawnEnemy;
    if (typeof previousSpawnEnemy === "function") {
      proto.spawnEnemy = function spawnEnemyFixpack095(...args) {
        const before = this.enemies?.length || 0;
        const result = previousSpawnEnemy.apply(this, args);
        for (const enemy of (this.enemies || []).slice(before)) customizeSpawnedEnemy(enemy);
        return result;
      };
    }

    const previousDrawEnemy = proto.drawEnemy;
    if (typeof previousDrawEnemy === "function") {
      proto.drawEnemy = function drawEnemyFixpack095(context, enemy) {
        if (drawEnemySheet(this, context, enemy)) return;
        return previousDrawEnemy.call(this, context, enemy);
      };
    }

    const previousDrawGround = proto.drawGround;
    if (typeof previousDrawGround === "function") {
      proto.drawGround = function drawGroundFixpack095(context, zoom = 1) {
        const world = Number(this.stage?.world || this.getSelectedStage?.()?.world);
        const config = WORLD_MAPS[world];
        const image = state.worldImages.get(`ground:${world}`);
        if (!config || !image || !image.complete || !(image.naturalWidth || image.width)) return previousDrawGround.call(this, context, zoom);
        const viewW = this.w / zoom, viewH = this.h / zoom;
        const startX = this.camera.x - viewW / 2 - 180;
        const startY = this.camera.y - viewH / 2 - 180;
        const width = viewW + 360, height = viewH + 360;
        const pattern = worldPattern(context, image);
        context.save();
        context.fillStyle = pattern || (world === 5 ? "#c99a59" : "#282536");
        context.fillRect(startX,startY,width,height);
        if (world === 6) {
          context.globalAlpha = .18; context.fillStyle = "#161126"; context.fillRect(startX,startY,width,height);
        } else {
          context.globalAlpha = .08; context.fillStyle = "#f3c67e"; context.fillRect(startX,startY,width,height);
        }
        context.restore();
      };
    }

    const previousDrawObstacle = proto.drawObstacle;
    if (typeof previousDrawObstacle === "function") {
      proto.drawObstacle = function drawObstacleFixpack095(context, object) {
        if (!object?.__fixWorldObjectV095) return previousDrawObstacle.call(this, context, object);
        const image = state.worldImages.get(`${object.fixWorld}:${object.fixKey}`);
        if (!image || !image.complete || !(image.naturalWidth || image.width)) return;
        const width = Number(object.drawW) || 64;
        const height = Number(object.drawH) || 64;
        const anchor = Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72;
        context.save();
        context.globalAlpha = 1;
        context.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
        context.drawImage(image,Math.round(object.x-width/2),Math.round(object.y-height*anchor),Math.round(width),Math.round(height));
        context.restore();
      };
    }

  }

  function repairGachaWallet() {
    if (!id("gachaChestOnlyV12") || id("gachaChestOnlyV12").classList.contains("hidden")) return;
    id("gcoWallet")?.setAttribute("aria-hidden","true");
    window.CHERRIFT_STABILITY?.refresh?.();
  }

  function patchAll() {
    if (!state.started) return;
    patchSkinImages();
    patchSelectorSplash();
    patchGearControl();
    patchSettingsAccount();
    patchDuplicateReveal();
    repairGachaWallet();
    ensureMailButton();
    ensureLobbySubnav();
    patchAchievements();
    applyStagePoolsAndWorlds();
  }

  function queuePatch() {
    if (state.patchQueued) return;
    state.patchQueued = true;
    requestAnimationFrame(() => {
      state.patchQueued = false;
      patchAll();
    });
  }

  function installObserver() {
    if (state.observer || !document.body) return;
    state.observer = new MutationObserver(queuePatch);
    state.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","aria-selected","aria-pressed","src"]});
  }

  function installClickHandlers() {
    document.addEventListener("click", event => {
      if (document.body.classList.contains("is-playing")) return;
      if (!event.target.closest?.("#fixClickPetalLayerV095")) sakuraBurst(event.clientX,event.clientY);
    }, {passive:true});

    document.addEventListener("click", event => {
      const target = event.target.closest?.("[data-fix-mail],[data-fix-lobby-route],[data-fix-lobby-back],[data-fix-ach-filter],[data-fix-ach-claim],[data-fix-ach-back]");
      if (!target) {
        const text = event.target.closest?.("button")?.textContent?.trim() || "";
        if (/^(Account|Settings)$/i.test(text)) setTimeout(() => window.CHERRIFT_ACCOUNT_MAIL?.patchVisibleRoute?.(), 30);
        if (/^(Splash Art|Game View)$/i.test(text) || event.target.closest?.("[data-skin-id],[data-skin],[data-v093-skin]")) setTimeout(patchSelectorSplash, 30);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (target.dataset.fixMail !== undefined) return window.CHERRIFT_ACCOUNT_MAIL?.openMail?.();
      if (target.dataset.fixLobbyBack !== undefined) return forceLobbyOpen();
      if (target.dataset.fixLobbyRoute) {
        const route = target.dataset.fixLobbyRoute;
        state.route = route;
        if (typeof window.CHERRIFT_STABILITY?.open === "function") window.CHERRIFT_STABILITY.open(route);
        else window.UI?.open?.(route);
        return setTimeout(ensureLobbySubnav, 30);
      }
      if (target.dataset.fixAchBack !== undefined) return forceLobbyOpen();
      if (target.dataset.fixAchFilter) {
        state.achievementFilter = target.dataset.fixAchFilter;
        return renderAchievements();
      }
      if (target.dataset.fixAchClaim) return grantAchievement(target.dataset.fixAchClaim);
    });
  }

  function installUiRefreshPatch() {
    if (!window.UI || UI.__fixpack095UiRefresh) return;
    UI.__fixpack095UiRefresh = true;
    const previousRefresh = UI.refreshMenu?.bind(UI);
    if (previousRefresh) UI.refreshMenu = function refreshMenuFixpack095(...args) {
      const result = previousRefresh(...args);
      queuePatch();
      return result;
    };
  }

  function ready() {
    return !!(window.UI && window.CherriftStorage && window.CHERRIFT_STABILITY && window.CHERRIFT_PREBETA && window.CHERRIFT_ACCOUNT_MAIL && window.CHERRIFT_ECONOMY_V11 && window.CherriftGame);
  }

  function start(attempt = 0) {
    if (state.started) return;
    if (!ready()) {
      if (attempt < 160) return setTimeout(() => start(attempt + 1), 80);
      console.warn(`[CHERRIFT] ${VERSION}: core wait timed out; installing UI-only fallback.`);
    }
    state.started = true;
    ensureCss();
    patchSkinMetadata();
    applyStagePoolsAndWorlds();
    preloadEnemyAssets();
    preloadWorldAssets();
    installGameWorldAndEnemyPatch();
    installUiRefreshPatch();
    installClickHandlers();
    installObserver();
    patchAll();
    window.addEventListener("resize", queuePatch);
    window.addEventListener("cherrift:savechange", queuePatch);
    window.addEventListener("cherrift:economychange", queuePatch);
    window.addEventListener("cherrift:languagechange", queuePatch);
    window.__CHERRIFT_FIXPACK_095_READY__ = true;
    window.dispatchEvent(new CustomEvent("cherrift:fixpack-095-ready"));
    console.info(`[CHERRIFT] ${VERSION} loaded: UI, Gacha, Achievements, navigation, skin icons, Worlds 5-6 and enemy repo paths patched.`);
  }

  window.CHERRIFT_FIXPACK_095 = Object.freeze({
    version:VERSION,
    refresh:queuePatch,
    achievementCatalog:ACHIEVEMENTS,
    enemySheets:ENEMY_SHEETS,
    enemyDefs:ENEMY_DEFS,
    worldPools:WORLD_POOLS,
    worldMaps:WORLD_MAPS
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => start(), {once:true});
  else start();
})();

/* ========================================================================== 
   v0.9.5 FIXPACK 2 — strict per-world maps + mobile UI polish
   Keeps each world on its own /assets/map/worldN asset pool, fixes the
   profile-frame crop on mobile, removes desktop lobby navigation from phone,
   moves secondary Lobby routes into More, and nudges Gear slots downward.
   ========================================================================== */
(() => {
  "use strict";
  if (window.__CHERRIFT_FIXPACK_095_2__) return;
  window.__CHERRIFT_FIXPACK_095_2__ = true;

  const VERSION = "0.9.5-fixpack-4-strict-map-return";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const mobile = () => matchMedia("(max-width:820px)").matches;
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const state = {
    started:false,
    observer:null,
    queued:false,
    images:new Map(),
    patterns:new WeakMap(),
    activeWorld:0,
    morePointerOpen:null,
    morePointerId:null,
    fireflyGlow:null
  };

  // IMPORTANT: every path in a world's map configuration must live inside
  // that world's own directory. Splash art is deliberately excluded from the
  // object pools, so a chapter preview can never appear as a world obstacle.
  const WORLD_MAPS_STRICT = Object.freeze({
    1:Object.freeze({
      ground:"assets/map/world1/world1_ground_1.png",
      tint:"rgba(252,244,205,.025)",
      objects:Object.freeze({
        bush1:{src:"assets/map/world1/world1_bush_1.png",count:11,w:96,h:76,anchor:.73},
        bush2:{src:"assets/map/world1/world1_bush_2.png",count:10,w:94,h:74,anchor:.73},
        bush3:{src:"assets/map/world1/world1_bush_3.png",count:9,w:92,h:72,anchor:.73},
        flower1:{src:"assets/map/world1/world1_flower_1.png",count:11,w:31,h:31,anchor:.66},
        flower2:{src:"assets/map/world1/world1_flower_2.png",count:9,w:34,h:34,anchor:.66},
        flower3:{src:"assets/map/world1/world1_flower_3.png",count:9,w:31,h:31,anchor:.66},
        log:{src:"assets/map/world1/world1_log_1.png",count:7,w:104,h:62,anchor:.70,solid:true,r:28},
        mushroom:{src:"assets/map/world1/world1_mushroom_1.png",count:11,w:42,h:40,anchor:.72},
        rock1:{src:"assets/map/world1/world1_rock_1.png",count:9,w:92,h:72,anchor:.72,solid:true,r:27},
        rock2:{src:"assets/map/world1/world1_rock_2.png",count:9,w:86,h:68,anchor:.72,solid:true,r:25},
        rockSmall:{src:"assets/map/world1/world1_rock_small_1.png",count:13,w:42,h:34,anchor:.70},
        tree1:{src:"assets/map/world1/world1_tree_1.png",count:8,w:132,h:176,anchor:.84,solid:true,r:25},
        tree2:{src:"assets/map/world1/world1_tree_2.png",count:7,w:142,h:192,anchor:.85,solid:true,r:27}
      })
    }),
    2:Object.freeze({
      ground:"assets/map/world2/world2_ground_1.png",
      tint:"rgba(13,18,47,.16)",
      objects:Object.freeze({
        bush1:{src:"assets/map/world2/world2_bush_1.png",count:10,w:94,h:74,anchor:.73},
        bush2:{src:"assets/map/world2/world2_bush_2.png",count:9,w:92,h:72,anchor:.73},
        bush3:{src:"assets/map/world2/world2_bush_3.png",count:9,w:90,h:70,anchor:.73},
        flower1:{src:"assets/map/world2/world2_flower_1.png",count:8,w:34,h:34,anchor:.66},
        flower2:{src:"assets/map/world2/world2_flower_2.png",count:8,w:34,h:34,anchor:.66},
        flower3:{src:"assets/map/world2/world2_flower_3.png",count:8,w:36,h:36,anchor:.66},
        rock1:{src:"assets/map/world2/world2_rock_1.png",count:9,w:88,h:68,anchor:.72,solid:true,r:25},
        rock2:{src:"assets/map/world2/world2_rock_2.png",count:9,w:88,h:68,anchor:.72,solid:true,r:25},
        rock3:{src:"assets/map/world2/world2_rock_3.png",count:8,w:82,h:64,anchor:.72,solid:true,r:24},
        tree1:{src:"assets/map/world2/world2_tree_1.png",count:8,w:132,h:178,anchor:.84,solid:true,r:25},
        tree2:{src:"assets/map/world2/world2_tree_2.png",count:7,w:142,h:192,anchor:.85,solid:true,r:27},
        firefly:{src:"assets/map/world2/world2_firefly_01.png",count:7,w:18,h:18,anchor:.50,alpha:.78,glow:true}
      })
    }),
    3:Object.freeze({
      ground:"assets/map/world3/world3_ground_1.png",
      tint:"rgba(201,159,76,.035)",
      objects:Object.freeze({
        bones:{src:"assets/map/world3/world3_bones.png",count:7,w:72,h:50,anchor:.68},
        bush1:{src:"assets/map/world3/world3_bush_1.png",count:9,w:96,h:76,anchor:.73},
        bush2:{src:"assets/map/world3/world3_bush_2.png",count:9,w:94,h:74,anchor:.73},
        log:{src:"assets/map/world3/world3_log.png",count:7,w:104,h:62,anchor:.70,solid:true,r:28},
        rock1:{src:"assets/map/world3/world3_rock_1.png",count:10,w:90,h:70,anchor:.72,solid:true,r:26},
        rock2:{src:"assets/map/world3/world3_rock_2.png",count:9,w:86,h:68,anchor:.72,solid:true,r:25},
        grass1:{src:"assets/map/world3/world3_tall_grass_1.png",count:13,w:78,h:60,anchor:.76},
        grass2:{src:"assets/map/world3/world3_tall_grass_2.png",count:12,w:74,h:58,anchor:.76},
        tree1:{src:"assets/map/world3/world3_tree_1.png",count:7,w:138,h:184,anchor:.85,solid:true,r:27},
        tree2:{src:"assets/map/world3/world3_tree_2.png",count:6,w:146,h:196,anchor:.86,solid:true,r:29}
      })
    }),
    4:Object.freeze({
      ground:"assets/map/world4/world4_ground_1.png",
      tint:"rgba(176,83,46,.045)",
      objects:Object.freeze({
        bigRock:{src:"assets/map/world4/world4_big_rock_1.png",count:6,w:126,h:94,anchor:.73,solid:true,r:36},
        bones:{src:"assets/map/world4/world4_bones_1.png",count:8,w:74,h:50,anchor:.68},
        bush:{src:"assets/map/world4/world4_bush_1.png",count:9,w:86,h:68,anchor:.73},
        cactus1:{src:"assets/map/world4/world4_cactus_1.png",count:7,w:104,h:142,anchor:.84,solid:true,r:23},
        cactus2:{src:"assets/map/world4/world4_cactus_2.png",count:8,w:84,h:118,anchor:.83,solid:true,r:20},
        flower:{src:"assets/map/world4/world4_flower_1.png",count:7,w:46,h:42,anchor:.68},
        rock1:{src:"assets/map/world4/world4_rock_1.png",count:9,w:104,h:78,anchor:.72,solid:true,r:30},
        rock2:{src:"assets/map/world4/world4_rock_2.png",count:9,w:92,h:72,anchor:.72,solid:true,r:27},
        veryBig:{src:"assets/map/world4/world4_rock_very_big_1.png",count:5,w:148,h:108,anchor:.73,solid:true,r:42},
        tree:{src:"assets/map/world4/world4_tree_1.png",count:6,w:136,h:184,anchor:.85,solid:true,r:27}
      })
    }),
    5:Object.freeze({
      ground:"assets/map/world5/world5_ground_1.png",
      tint:"rgba(246,183,89,.035)",
      objects:Object.freeze({
        dune:{src:"assets/map/world5/world5_dune_01.png",count:13,w:190,h:90,anchor:.62},
        deadBush:{src:"assets/map/world5/world5_dead_bush_01.png",count:12,w:64,h:50,anchor:.72},
        bones:{src:"assets/map/world5/world5_bones_01.png",count:8,w:76,h:52,anchor:.68},
        cactus:{src:"assets/map/world5/world5_mini_cactus_01.png",count:14,w:58,h:78,anchor:.79,solid:true,r:15},
        flower:{src:"assets/map/world5/world5_flower_01.png",count:10,w:38,h:38,anchor:.66}
      })
    }),
    6:Object.freeze({
      ground:"assets/map/world6/world6_ground_1.png",
      tint:"rgba(20,11,43,.16)",
      objects:Object.freeze({
        bonePiles:{src:"assets/map/world6/world6_bone_piles_01.png",count:8,w:76,h:52,anchor:.68},
        crystal:{src:"assets/map/world6/world6_crystal_01.png",count:11,w:62,h:72,anchor:.77,solid:true,r:14},
        pillar:{src:"assets/map/world6/world6_pillar_01.png",count:8,w:88,h:148,anchor:.83,solid:true,r:22},
        runestone:{src:"assets/map/world6/world6_runestone_01.png",count:9,w:78,h:106,anchor:.81,solid:true,r:19},
        statue1:{src:"assets/map/world6/world6_statue_01.png",count:5,w:86,h:138,anchor:.83,solid:true,r:22},
        statue2:{src:"assets/map/world6/world6_statue_02.png",count:5,w:86,h:138,anchor:.83,solid:true,r:22},
        stone:{src:"assets/map/world6/world6_stone_01.png",count:14,w:78,h:58,anchor:.71,solid:true,r:18},
        tree:{src:"assets/map/world6/world6_tree_01.png",count:9,w:122,h:184,anchor:.85,solid:true,r:24}
      })
    })
  });

  const FRAME_FIT = Object.freeze({
    frame0lvl:{inset:14,x:50,y:48},
    frame5lvl:{inset:15,x:50,y:48},
    frame30lvl:{inset:14,x:50,y:49},
    frame50lvl:{inset:14,x:50,y:49},
    frame80lvl:{inset:15,x:50,y:49},
    frame100lvl:{inset:15,x:50,y:49},
    frame150lvl:{inset:15,x:50,y:49},
    frame200lvl:{inset:15,x:50,y:49},
    frame225lvl:{inset:15,x:50,y:49},
    frame250lvl:{inset:15,x:50,y:49},
    frame_beta:{inset:14,x:50,y:48},
    default:{inset:14,x:50,y:49}
  });

  function ensureCss() {
    if (id("cherriftFixpack0952Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftFixpack0952Css";
    style.textContent = `
      /* The desktop Lobby sub-navigation must never leak into the phone UI. */
      @media(max-width:820px){
        #fixLobbySubnavV095,#desktopSubnavV0933,#desktopCurrencyV0943,
        body:not(.is-playing) #globalRailV060{display:none!important;visibility:hidden!important;pointer-events:none!important}

        /* Equipped slot cards are slightly lower on the mobile loadout without
           replacing their existing transform/position rules. */
        #gear .gear-slot-v0560{translate:0 12px!important}

        #mobileMenuV082 .fix-more-route-v0952,
        #mobileMenuV082 #fixMailButtonV095{
          width:100%!important;min-width:0!important;min-height:72px!important;
          display:grid!important;grid-template-rows:auto auto;place-items:center!important;
          align-content:center!important;gap:5px!important;padding:8px 7px!important;
          border-radius:16px!important;border:1px solid var(--theme-outline-soft,#ffffff25)!important;
          background:var(--theme-surface-2,#ffffff09)!important;
          color:var(--theme-text,#fff)!important;font:800 12px/1.1 system-ui,sans-serif!important;
          box-shadow:none!important;position:relative!important
        }
        #mobileMenuV082 .fix-more-route-v0952>span,
        #mobileMenuV082 #fixMailButtonV095>.fix-more-mail-icon-v0952{font-size:22px!important;line-height:1!important}
        #mobileMenuV082 .fix-more-route-v0952>b,
        #mobileMenuV082 #fixMailButtonV095>.fix-more-mail-label-v0952{display:block!important;font-size:11px!important;line-height:1.05!important}
        #mobileMenuV082 #fixMailButtonV095>.fix-mail-badge-v095{
          position:absolute!important;top:5px!important;right:7px!important;min-width:17px!important;height:17px!important;
          padding:0 4px!important;border-radius:99px!important;display:none!important;place-items:center!important;
          color:#fff!important;background:#e8448d!important;font-size:9px!important
        }
        #mobileMenuV082 #fixMailButtonV095.has-unread>.fix-mail-badge-v095{display:grid!important}
      }

      /* A frame is an overlay around the avatar, not another 100%-cover image.
         This deliberately beats the older .profile-avatar-bf img rule. */
      .profile-avatar-bf{
        overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;
        position:relative!important
      }
      .profile-avatar-bf>.prebeta-avatar,
      .profile-avatar-v082>.prebeta-avatar{
        --avatar-inset:14%;--avatar-x:50%;--avatar-y:49%;
        position:relative!important;display:block!important;width:100%!important;height:100%!important;
        overflow:visible!important;border-radius:0!important;isolation:isolate
      }
      .profile-avatar-bf>.prebeta-avatar>img:first-child,
      .profile-avatar-v082>.prebeta-avatar>img:first-child{
        position:absolute!important;z-index:1!important;
        left:var(--avatar-inset)!important;top:var(--avatar-inset)!important;
        width:calc(100% - (var(--avatar-inset) * 2))!important;
        height:calc(100% - (var(--avatar-inset) * 2))!important;
        object-fit:cover!important;object-position:var(--avatar-x) var(--avatar-y)!important;
        border-radius:50%!important;clip-path:circle(49% at 50% 50%)!important
      }
      .profile-avatar-bf>.prebeta-avatar>.prebeta-avatar-frame,
      .profile-avatar-v082>.prebeta-avatar>.prebeta-avatar-frame{
        position:absolute!important;z-index:2!important;inset:0!important;
        width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;
        border-radius:0!important;clip-path:none!important;pointer-events:none!important
      }
      .fix-more-mail-label-v0952{display:none}
    `;
    document.head.appendChild(style);
  }

  function stageWorld(game) {
    const stage = game?.stage || game?.getSelectedStage?.() ||
      window.CHERRIFT_V040?.stages?.find?.(entry => entry.id === game?.save?.selectedStageId);
    return Math.floor(number(stage?.world) || number(String(stage?.id || "").match(/world[_-]?(\d+)/i)?.[1]));
  }

  function seededRandom(seedText) {
    let seed = 2166136261;
    for (const char of String(seedText || "world")) {
      seed ^= char.charCodeAt(0);
      seed = Math.imul(seed, 16777619);
    }
    return () => {
      seed += 0x6D2B79F5;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function preload(source, key) {
    if (!source) return null;
    let image = state.images.get(key);
    if (image) return image;
    image = new Image();
    image.decoding = "async";
    image.src = `${source}${source.includes("?") ? "&" : "?"}v=095fix2`;
    state.images.set(key, image);
    return image;
  }

  function preloadWorld(world) {
    const config = WORLD_MAPS_STRICT[world];
    if (!config) return;
    state.activeWorld = world;
    preload(config.ground, `ground:${world}`);
    for (const [key, spec] of Object.entries(config.objects)) preload(spec.src, `${world}:${key}`);
  }

  function objectCount(baseCount, world, key) {
    // World 2 previously created almost one hundred decorative/collision
    // objects.  That made its per-frame draw and collision work considerably
    // heavier than every other world, especially on phones.  Keep every
    // gameplay value untouched and retain all seven fireflies, but thin only
    // the repeated scenery.  The deterministic placement still makes the
    // night meadow look full without paying for off-screen duplicates.
    if (Number(world) === 2 && key === "firefly") return Math.max(1, baseCount);
    const factor = Number(world) === 2 ? (mobile() ? .45 : .55) : (mobile() ? .74 : 1);
    return Math.max(1, Math.round(baseCount * factor));
  }

  function strictObjectSize(object, image) {
    if (object.__fix0952Sized && object.drawW && object.drawH) return {width:object.drawW,height:object.drawH};
    const boxW = Math.max(8, number(object.boxW) || 64);
    const boxH = Math.max(8, number(object.boxH) || 64);
    const naturalW = Math.max(1, number(image?.naturalWidth || image?.width) || boxW);
    const naturalH = Math.max(1, number(image?.naturalHeight || image?.height) || boxH);
    const scale = Math.min(boxW / naturalW, boxH / naturalH);
    object.drawW = Math.max(8, Math.round(naturalW * scale));
    object.drawH = Math.max(8, Math.round(naturalH * scale));
    object.__fix0952Sized = true;
    return {width:object.drawW,height:object.drawH};
  }

  function buildStrictWorld(game, world) {
    const config = WORLD_MAPS_STRICT[world];
    if (!config) return;
    preloadWorld(world);
    const random = seededRandom(`${game.stage?.id || `world_${world}`}:strict0952`);
    const worldSize = Math.max(2400, number(window.CHERRIFT_CONFIG?.worldSize) || 4200);
    const half = worldSize / 2 - 190;
    const placedSolids = [];
    const objects = [];

    for (const [key, spec] of Object.entries(config.objects)) {
      for (let index = 0; index < objectCount(spec.count, world, key); index += 1) {
        let x = 0, y = 0, attempts = 0;
        do {
          x = (random() * 2 - 1) * half;
          y = (random() * 2 - 1) * half;
          attempts += 1;
        } while (
          attempts < 18 && (
            Math.hypot(x, y) < 330 ||
            (spec.solid && placedSolids.some(item => Math.hypot(x-item.x,y-item.y) < (spec.r || 20) + item.r + 54))
          )
        );

        const object = {
          __fixWorldObjectV095:true,
          __fixStrictWorldV0952:true,
          v094Map:false,
          kind:`strict_world_${world}_${key}`,
          assetKey:`strict_w${world}_${key}`,
          fixWorld:world,
          fixKey:key,
          x,y,
          boxW:spec.w,boxH:spec.h,
          drawW:spec.w,drawH:spec.h,
          anchor:Number.isFinite(Number(spec.anchor)) ? Number(spec.anchor) : .72,
          alpha:Number.isFinite(Number(spec.alpha)) ? Number(spec.alpha) : 1,
          glow:!!spec.glow,
          solid:!!spec.solid,
          r:spec.r || 0,
          collisionRadius:spec.r || 0
        };
        if (object.glow) {
          object.baseX=x; object.baseY=y;
          object.phase=random()*Math.PI*2;
          object.driftX=8+random()*9;
          object.driftY=5+random()*7;
        }
        if (object.solid) placedSolids.push({x,y,r:spec.r || 20});
        objects.push(object);
      }
    }

    // Strict replacement is intentional. Base/legacy objects are not retained:
    // that retention was the source of World 4 assets appearing in World 5.
    game.obstacles = objects;
    game.__fixStrictWorldV0952 = world;
    return objects;
  }

  function pattern(context, image) {
    if (!image) return null;
    let value = state.patterns.get(image);
    if (!value) {
      try { value = context.createPattern(image, "repeat"); state.patterns.set(image, value); }
      catch (_) { value = null; }
    }
    return value;
  }

  function drawStrictGround(game, context, zoom, previousDrawGround) {
    const world = stageWorld(game);
    const config = WORLD_MAPS_STRICT[world];
    if (!config) return previousDrawGround?.call(game, context, zoom);
    const image = preload(config.ground, `ground:${world}`);
    if (!image?.complete || !(image.naturalWidth || image.width)) return previousDrawGround?.call(game, context, zoom);
    const camera = game.camera || {x:0,y:0};
    const safeZoom = Math.max(.1, number(zoom) || 1);
    const viewW = Math.max(1, number(game.w) || context.canvas?.width || 1280) / safeZoom;
    const viewH = Math.max(1, number(game.h) || context.canvas?.height || 720) / safeZoom;
    const margin = mobile() ? 90 : 150;
    const x = camera.x - viewW / 2 - margin;
    const y = camera.y - viewH / 2 - margin;
    const width = viewW + margin * 2;
    const height = viewH + margin * 2;
    const fill = pattern(context, image);
    context.save();
    context.fillStyle = fill || "#3a2f34";
    context.fillRect(x,y,width,height);
    if (config.tint) {
      context.fillStyle = config.tint;
      context.fillRect(x,y,width,height);
    }
    context.restore();
  }

  function fireflyGlowCanvas() {
    if (state.fireflyGlow) return state.fireflyGlow;
    const canvas=document.createElement("canvas"); canvas.width=96; canvas.height=96;
    const ctx=canvas.getContext("2d");
    const gradient=ctx.createRadialGradient(48,48,1,48,48,46);
    gradient.addColorStop(0,"rgba(255,248,151,.82)");
    gradient.addColorStop(.12,"rgba(239,255,96,.48)");
    gradient.addColorStop(.42,"rgba(205,242,64,.14)");
    gradient.addColorStop(1,"rgba(180,228,48,0)");
    ctx.fillStyle=gradient; ctx.fillRect(0,0,96,96);
    state.fireflyGlow=canvas;
    return canvas;
  }

  function objectInView(game, object, margin=180) {
    const camera=game.camera || {x:0,y:0};
    const zoom=Math.max(.1,number(game.zoom)||1);
    const width=Math.max(1,number(game.w)||innerWidth)/zoom;
    const height=Math.max(1,number(game.h)||innerHeight)/zoom;
    return Math.abs(number(object.x)-number(camera.x)) <= width/2+margin && Math.abs(number(object.y)-number(camera.y)) <= height/2+margin;
  }

  function drawStrictObject(game, context, object) {
    if (!objectInView(game,object,object.glow?120:210)) return;
    const image = preload(WORLD_MAPS_STRICT[object.fixWorld]?.objects?.[object.fixKey]?.src, `${object.fixWorld}:${object.fixKey}`);
    if (!image?.complete || !(image.naturalWidth || image.width)) return;
    const size = strictObjectSize(object, image);
    const anchor = Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72;
    let drawX=number(object.x),drawY=number(object.y);
    let pulse=1;
    if (object.glow) {
      const time=(number(game.t)||performance.now()/1000);
      drawX=number(object.baseX||object.x)+Math.sin(time*.72+object.phase)*number(object.driftX||12);
      drawY=number(object.baseY||object.y)+Math.cos(time*.58+object.phase)*number(object.driftY||8);
      pulse=.82+.18*Math.sin(time*1.7+object.phase);
      object.x=drawX; object.y=drawY;
    }
    context.save();
    context.globalAlpha = clamp((number(object.alpha) || 1)*pulse, 0, 1);
    context.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = mobile() ? "medium" : "high";
    if (object.glow) {
      const aura=mobile()?50:64;
      context.globalCompositeOperation="screen";
      context.drawImage(fireflyGlowCanvas(),Math.round(drawX-aura/2),Math.round(drawY-aura/2),aura,aura);
      context.globalCompositeOperation="source-over";
      context.globalAlpha=clamp(number(object.alpha)||1,0,1);
    }
    context.drawImage(
      image,
      Math.round(drawX - size.width / 2),
      Math.round(drawY - size.height * anchor),
      size.width,size.height
    );
    context.restore();
  }

  function strictHit(game, previousHitObstacle) {
    const player = game.player;
    if (!player || !WORLD_MAPS_STRICT[stageWorld(game)]) return previousHitObstacle?.call(game) || false;
    for (const object of game.obstacles || []) {
      if (!object?.__fixStrictWorldV0952 || !object.solid) continue;
      const radius = Math.max(1, number(object.collisionRadius || object.r));
      const width = Math.max(1, number(object.drawW || object.boxW));
      const height = Math.max(1, number(object.drawH || object.boxH));
      const anchor = Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72;
      const bottom = number(object.y) + height * (1 - anchor);
      let rx = Math.max(radius, width * .18);
      let ry = Math.max(7, Math.min(radius, height * .10));
      const key = String(object.fixKey || "").toLowerCase();
      if (/rock|stone|bones|log/.test(key)) { rx = Math.max(radius,width*.30); ry = Math.max(8,height*.14); }
      const cx = number(object.x), cy = bottom - ry * .80;
      const dx = (number(player.x) - cx) / (rx + (number(player.r) || 18));
      const dy = (number(player.y) - cy) / (ry + (number(player.r) || 18));
      if (dx*dx + dy*dy < 1) return true;
    }
    return false;
  }

  function installMapPatch() {
    const proto = window.CherriftGame?.prototype;
    if (!proto || proto.__fixStrictWorld0952) return !!proto;
    proto.__fixStrictWorld0952 = true;

    const previousGenerateMap = proto.generateMap;
    if (typeof previousGenerateMap === "function") {
      proto.generateMap = function generateMapFix0952(...args) {
        const legacyResult = previousGenerateMap.apply(this,args);
        const world = stageWorld(this);
        if (WORLD_MAPS_STRICT[world]) {
          // generateMap() is assigned directly to this.obstacles by the core
          // runtime. Returning the legacy array here would immediately undo
          // the strict world replacement even though buildStrictWorld() ran.
          return buildStrictWorld(this,world);
        }
        return legacyResult;
      };
    }

    const previousStart = proto.start;
    if (typeof previousStart === "function") {
      proto.start = async function startFix0952(...args) {
        const worldBefore = stageWorld(this);
        if (WORLD_MAPS_STRICT[worldBefore]) preloadWorld(worldBefore);
        const result = await previousStart.apply(this,args);
        const world = stageWorld(this);
        // Always perform a final deterministic replacement after the whole
        // legacy start chain. Several older wrappers can write obstacles after
        // generateMap(), so a marker alone is not sufficient evidence that the
        // final array is still clean.
        if (WORLD_MAPS_STRICT[world]) buildStrictWorld(this,world);
        return result;
      };
    }

    const previousDrawGround = proto.drawGround;
    if (typeof previousDrawGround === "function") {
      proto.drawGround = function drawGroundFix0952(context, zoom = 1) {
        return drawStrictGround(this,context,zoom,previousDrawGround);
      };
    }

    const previousDrawObstacle = proto.drawObstacle;
    if (typeof previousDrawObstacle === "function") {
      proto.drawObstacle = function drawObstacleFix0952(context, object) {
        const world = stageWorld(this);
        if (WORLD_MAPS_STRICT[world]) {
          // World 1-6 are strict: never render a legacy/mismatched object even
          // if an older asynchronous layer appends one after stage start.
          if (!object?.__fixStrictWorldV0952 || Number(object.fixWorld) !== world) return;
          return drawStrictObject(this,context,object);
        }
        return previousDrawObstacle.call(this,context,object);
      };
    }

    const previousHitObstacle = proto.hitObstacle;
    proto.hitObstacle = function hitObstacleFix0952(...args) {
      const world = stageWorld(this);
      if (!WORLD_MAPS_STRICT[world]) return typeof previousHitObstacle === "function" ? previousHitObstacle.apply(this,args) : false;
      return strictHit(this, previousHitObstacle);
    };
    return true;
  }

  function frameIdFromNode(node) {
    const source = q(".prebeta-avatar-frame",node)?.getAttribute("src") || "";
    return window.UI?.save?.profile?.frameId || source.match(/\/([^/]+)\.png(?:\?|$)/)?.[1] || "default";
  }

  function patchAvatarFrames() {
    qa(".profile-avatar-bf>.prebeta-avatar,.profile-avatar-v082>.prebeta-avatar").forEach(node => {
      const frameId = frameIdFromNode(node);
      const fit = FRAME_FIT[frameId] || FRAME_FIT.default;
      node.style.setProperty("--avatar-inset", `${fit.inset}%`);
      node.style.setProperty("--avatar-x", `${fit.x}%`);
      node.style.setProperty("--avatar-y", `${fit.y}%`);
      node.dataset.fixFrameFit = frameId;
    });
  }

  function ensureMobileMoreRoutes() {
    const nav = id("fixLobbySubnavV095");
    if (nav) nav.setAttribute("aria-hidden", mobile() ? "true" : "false");
    if (!mobile()) return;
    const drawer = id("mobileMenuV082");
    const grid = q(".mobile-menu-grid-v082",drawer);
    if (!grid) return;

    const routes = [
      {route:"socialV082",label:"Social",icon:"♧"},
      {route:"rankingPrebeta",label:"Rank",icon:"♛"},
      {route:"buffsV082",label:"Buff List",icon:"✦"}
    ];
    for (const item of routes) {
      const selector = [
        `[data-v082-open="${item.route}"]`,
        `[data-open="${item.route}"]`,
        `[data-v082-route="${item.route}"]`,
        `[data-prebeta-open="${item.route}"]`
      ].join(",");
      if (q(selector,grid)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fix-more-route-v0952";
      button.dataset.v082Open = item.route;
      button.innerHTML = `<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
      grid.appendChild(button);
    }

    const mail = id("fixMailButtonV095");
    if (mail && mail.parentElement === grid) {
      let icon = q(".fix-more-mail-icon-v0952",mail);
      if (!icon) {
        const oldIcon = q(":scope > span",mail);
        if (oldIcon) oldIcon.className = "fix-more-mail-icon-v0952";
        else {
          icon = document.createElement("span");
          icon.className = "fix-more-mail-icon-v0952";
          icon.setAttribute("aria-hidden","true");
          icon.textContent = "✉";
          mail.prepend(icon);
        }
      }
      if (!q(".fix-more-mail-label-v0952",mail)) {
        const label = document.createElement("b");
        label.className = "fix-more-mail-label-v0952";
        label.textContent = "Mail";
        const badge = q(".fix-mail-badge-v095",mail);
        mail.insertBefore(label,badge || null);
      }
    }
  }

  function moreButtonFromTarget(target) {
    return target?.closest?.(
      '#globalMobileNavV052 > button[data-v082-toggle-mobile],.mobile-nav-v090 > button[data-v082-toggle-mobile]'
    ) || null;
  }

  function drawerIsOpen() {
    const drawer = id("mobileMenuV082");
    return !!drawer && !drawer.classList.contains("hidden") && !drawer.classList.contains("force-closed-v0942");
  }

  function forceMoreDrawer(open) {
    const drawer = id("mobileMenuV082");
    if (!drawer) return;
    drawer.classList.toggle("hidden", !open);
    drawer.classList.toggle("force-closed-v0942", !open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      drawer.style.removeProperty("display");
      drawer.style.removeProperty("visibility");
      drawer.style.removeProperty("opacity");
      drawer.style.removeProperty("pointer-events");
    }
    document.body?.classList.toggle("mobile-menu-open-v082", open);
    document.body?.classList.toggle("more-open", open);
    document.body?.classList.toggle("drawer-open", open);
    try { window.CHERRIFT_STABILITY?.syncNav?.(open ? "more" : "menu"); } catch (_) {}
  }

  function installMoreDrawerReliability() {
    if (document.documentElement.dataset.fixMore09521 === "1") return;
    document.documentElement.dataset.fixMore09521 = "1";

    // Record the state at the beginning of the tap. Older navigation layers
    // may toggle the drawer during the following click; after that click has
    // finished we force the one intended final state.
    document.addEventListener("pointerdown", event => {
      if (!mobile()) return;
      const button = moreButtonFromTarget(event.target);
      if (!button || button.disabled) return;
      state.morePointerOpen = drawerIsOpen();
      state.morePointerId = event.pointerId;
    }, true);

    document.addEventListener("pointerup", event => {
      if (!mobile()) return;
      const button = moreButtonFromTarget(event.target);
      if (!button || button.disabled) return;
      if (state.morePointerId !== null && event.pointerId !== state.morePointerId) return;
      const desiredOpen = !(state.morePointerOpen ?? drawerIsOpen());
      state.morePointerOpen = null;
      state.morePointerId = null;
      setTimeout(() => {
        forceMoreDrawer(desiredOpen);
        ensureMobileMoreRoutes();
      }, 0);
    }, true);

    document.addEventListener("pointercancel", event => {
      if (state.morePointerId === event.pointerId) {
        state.morePointerOpen = null;
        state.morePointerId = null;
      }
    }, true);

    // Keyboard/accessibility fallback.
    document.addEventListener("keydown", event => {
      if (!mobile() || !["Enter"," "].includes(event.key)) return;
      const button = moreButtonFromTarget(event.target);
      if (!button || button.disabled || event.repeat) return;
      event.preventDefault();
      forceMoreDrawer(!drawerIsOpen());
      ensureMobileMoreRoutes();
    }, true);
  }

  function patchGearMobile() {
    if (!mobile()) return;
    const gear = id("gear");
    if (!gear || gear.classList.contains("hidden")) return;
    qa(".gear-slot-v0560",gear).forEach(slot => slot.classList.add("fix-gear-slot-mobile-v0952"));
  }

  function patchUi() {
    ensureCss();
    patchAvatarFrames();
    ensureMobileMoreRoutes();
    patchGearMobile();
  }

  function queue() {
    if (state.queued) return;
    state.queued = true;
    requestAnimationFrame(() => {
      state.queued = false;
      patchUi();
      installMapPatch();
    });
  }

  function start(attempt = 0) {
    if (state.started) return;
    if (!document.body || !window.CherriftGame) {
      if (attempt < 180) return setTimeout(() => start(attempt + 1),80);
    }
    state.started = true;
    ensureCss();
    installMapPatch();
    installMoreDrawerReliability();
    patchUi();
    if (document.body) {
      state.observer = new MutationObserver(queue);
      state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","src"]});
    }
    addEventListener("resize",queue,{passive:true});
    addEventListener("cherrift:savechange",queue);
    addEventListener("cherrift:prebeta-ready",queue);
    window.__CHERRIFT_FIXPACK_0952_READY__ = true;
    window.dispatchEvent(new CustomEvent("cherrift:fixpack-0952-ready"));
    console.info(`[CHERRIFT] ${VERSION} loaded: strict World 1-6 maps (final-return guarded), mobile layout and reliable More drawer active.`);
  }

  window.CHERRIFT_FIXPACK_0952 = Object.freeze({
    version:VERSION,
    worldMaps:WORLD_MAPS_STRICT,
    refresh:queue
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",() => start(),{once:true});
  else start();
})();
