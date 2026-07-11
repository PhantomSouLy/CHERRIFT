
(() => {
  "use strict";

  const VERSION = "0.4.0b-clean-css";
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const id = name => document.getElementById(name);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  if (!window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA || !window.CherriftStorage || !window.CherriftGame || !window.UI) {
    console.error("CHERRIFT v0.4 init failed: base modules missing.");
    return;
  }

  CHERRIFT_CONFIG.version = VERSION;
  CHERRIFT_DATA.version = VERSION;

  const STAGES = [
    { id:"world_1_1", world:1, index:1, name:"World 1-1", title:"Blooming Meadow", theme:"forest_day", goalKills:120, maxEnemies:34, raidEvery:30, raidCount:14, enemyPool:["pink_slime","green_slime"], repeatReward:{coins:28}, firstClearReward:{coins:55,keys:1}, desc:"Az első pálya: több mob, raid hullámok, stabil progression." },
    { id:"world_1_2", world:1, index:2, name:"World 1-2", title:"Petal Trail", theme:"forest_day", goalKills:135, maxEnemies:38, raidEvery:34, raidCount:16, enemyPool:["pink_slime","green_slime","blue_slime"], repeatReward:{coins:32}, firstClearReward:{coins:62}, desc:"Gyorsabb spawn, több slime típus." },
    { id:"world_1_3", world:1, index:3, name:"World 1-3", title:"Clover Crossing", theme:"forest_day", goalKills:155, maxEnemies:42, raidEvery:38, raidCount:18, enemyPool:["pink_slime","green_slime","blue_slime","big_slime"], repeatReward:{coins:36}, firstClearReward:{coins:70}, desc:"Vegyes slime raid hullámok." },
    { id:"world_1_4", world:1, index:4, name:"World 1-4", title:"Rooted Hollow", theme:"forest_day", goalKills:175, maxEnemies:48, raidEvery:42, raidCount:22, enemyPool:["pink_slime","green_slime","blue_slime","big_slime"], repeatReward:{coins:42}, firstClearReward:{coins:82,keys:1}, desc:"Tankosabb slimeok, nagyobb raid nyomás." },
    { id:"world_1_5", world:1, index:5, name:"World 1-5", title:"Slime Nest", theme:"forest_day", goalKills:210, maxEnemies:56, raidEvery:46, raidCount:25, enemyPool:["pink_slime","green_slime","blue_slime","big_slime"], boss:"slime_king", repeatReward:{coins:52}, firstClearReward:{coins:110,keys:1}, desc:"World 1 záró pálya mini boss-szal." },
    { id:"world_2_1", world:2, index:1, name:"World 2-1", title:"Night Bloom", theme:"forest_night", goalKills:145, maxEnemies:40, raidEvery:36, raidCount:18, enemyPool:["spider","beetle","crawler"], repeatReward:{coins:38}, firstClearReward:{coins:72}, desc:"Első éjszakai pálya rovar/pók enemy poollal." },
    { id:"world_2_2", world:2, index:2, name:"World 2-2", title:"Moonlit Grove", theme:"forest_night", goalKills:165, maxEnemies:45, raidEvery:40, raidCount:21, enemyPool:["spider","beetle","crawler","moth"], repeatReward:{coins:44}, firstClearReward:{coins:84}, desc:"Éjszakai raid hullámok gyorsabb ellenfelekkel." },
    { id:"world_2_3", world:2, index:3, name:"World 2-3", title:"Shadow Thicket", theme:"forest_night", goalKills:185, maxEnemies:50, raidEvery:44, raidCount:24, enemyPool:["spider","beetle","crawler","moth"], repeatReward:{coins:50}, firstClearReward:{coins:96}, desc:"Sűrűbb spawn, agresszívebb rovarok." },
    { id:"world_2_4", world:2, index:4, name:"World 2-4", title:"Echo Burrow", theme:"forest_night", goalKills:205, maxEnemies:56, raidEvery:48, raidCount:27, enemyPool:["spider","beetle","crawler","moth"], repeatReward:{coins:58}, firstClearReward:{coins:110,keys:1}, desc:"Erős éjszakai raid pálya." },
    { id:"world_2_5", world:2, index:5, name:"World 2-5", title:"Midnight Den", theme:"forest_night", goalKills:240, maxEnemies:64, raidEvery:52, raidCount:30, enemyPool:["spider","beetle","crawler","moth"], boss:"night_queen", repeatReward:{coins:68}, firstClearReward:{coins:135,keys:1}, desc:"World 2 záró pálya mini boss-szal." }
  ];

  const ENEMIES = {
    pink_slime:{ name:"Pink Slime", hp:34, speed:105, r:20, xp:4, color:"#ff5bac", visualStyle:"slimeSprite" },
    green_slime:{ name:"Green Slime", hp:42, speed:74, r:23, xp:3, color:"#76f48a", visualStyle:"blob" },
    blue_slime:{ name:"Blue Slime", hp:68, speed:60, r:28, xp:5, color:"#62d8ff", visualStyle:"blob" },
    big_slime:{ name:"Big Slime", hp:110, speed:48, r:36, xp:8, color:"#58e074", visualStyle:"blob" },
    spider:{ name:"Spider", hp:48, speed:118, r:21, xp:5, color:"#4b2a6d", visualStyle:"bug" },
    beetle:{ name:"Beetle", hp:96, speed:58, r:27, xp:7, color:"#2cb57d", visualStyle:"bug" },
    moth:{ name:"Moth", hp:54, speed:96, r:24, xp:6, color:"#b7e8ff", visualStyle:"moth" },
    crawler:{ name:"Crawler", hp:62, speed:130, r:19, xp:6, color:"#8b69ff", visualStyle:"bug" },
    slime_king:{ name:"Slime King", hp:920, speed:44, r:58, xp:25, color:"#ff5bac", visualStyle:"bossSlime", boss:true },
    night_queen:{ name:"Night Queen", hp:1050, speed:52, r:56, xp:28, color:"#9b6dff", visualStyle:"bossBug", boss:true }
  };

  const SKIN_META = {
    cherry_default:{ splash:"assets/player/skins/base_cherry/base_cherry_splash_art.png", combat:"Ranged", skill:"Bloom Dash", info:"Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel." },
    fairy_cherry:{ splash:"assets/player/skins/fairy_cherry/fairy_cherry_splash_art.jpg", combat:"Magic", skill:"Magic Burst", info:"Mágikus burst Cherry körül. Több ellenfelet sebez egyszerre." },
    beastclaw_cherry:{ splash:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png", combat:"Melee", skill:"Savage Rend", info:"Rövid előretörés és nagy területű karmolás. Közelharci burst sebzés." }
  };

  const WORLD1_GROUND = {
    basic:"assets/map/world1_grass_basic.png",
    flowersRocks:"assets/map/world1_grass_flowers_rocks.png",
    dirtClearing:"assets/map/world1_dirt_clearing.png",
    grassDirtMix:"assets/map/world1_grass_dirt_mix.png",
    cloverFlowers:"assets/map/world1_grass_clover_flowers.png"
  };

  function installConfigData() {
    Object.assign(CHERRIFT_CONFIG.map, {
      grassNight:"assets/map/grass_tile02.png",
      flower1:"assets/map/flower1.png",
      flower2:"assets/map/flower2.png",
      mushroom:"assets/map/mushroom.png",
      world1:"assets/map/world1.png",
      world2:"assets/map/world2.png",
      ...WORLD1_GROUND
    });

    CHERRIFT_CONFIG.player.skins.cherry_default.attackType = "ranged";
    CHERRIFT_CONFIG.player.skins.fairy_cherry.attackType = "ranged";
    CHERRIFT_CONFIG.player.skins.beastclaw_cherry = {
      id:"beastclaw_cherry",
      folder:"beastclaw_cherry",
      attackType:"melee",
      skillType:"savage_rend",
      meleeRange:124,
      meleeCone:94,
      states:{
        idle:{fps:3,frames:4,dirs:{down:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_idle_down.png",up:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_idle_up.png",left:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_idle_left.png",right:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_idle_right.png"}},
        walk:{fps:8,frames:6,dirs:{down:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_walk_down.png",up:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_walk_up.png",left:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_walk_left.png",right:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_walk_right.png"}},
        attack:{fps:18,frames:6,duration:.30,dirs:{down:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_attack_down.png",up:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_attack_up.png",left:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_attack_left.png",right:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_attack_right.png"}},
        skill:{fps:16,frames:6,duration:.42,dirs:{down:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_skill_down.png",up:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_skill_up.png",left:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_skill_left.png",right:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_skill_right.png"}}
      }
    };

    CHERRIFT_DATA.skins = [
      { id:"cherry_default", name:"Base Cherry", rarity:"Common", emoji:"🐰", weapon:"Pink Bloom Orb", skill:"Bloom Dash", desc:"Alap Cherry skin.", stats:{damage:0,speed:0}, gradient:["#ff73b9","#281226"] },
      { id:"fairy_cherry", name:"Fairy Cherry", rarity:"Rare", emoji:"🧚‍♀️", weapon:"Fairy Bloom Orb", skill:"Magic Burst", desc:"Tündér Cherry skin.", stats:{damage:2,speed:8}, gradient:["#b6ffd8","#ff9ed0"] },
      { id:"beastclaw_cherry", name:"Beastclaw Cherry", rarity:"Rare", emoji:"🐺", weapon:"Beast Claws", skill:"Savage Rend", desc:"Közelharci karmolás és Savage Rend skill.", stats:{damage:4,speed:3}, gradient:["#f7e6d7","#4b271f"] }
    ];

    CHERRIFT_DATA.upgrades = [
      { id:"damage_core", name:"Bloom Force", desc:"+15% sebzés", apply:p=>{p.damage*=1.15;} },
      { id:"quick_core", name:"Quick Bloom", desc:"+12% attack speed", apply:p=>{p.fireInterval*=.88;} },
      { id:"swift_core", name:"Swift Bunny", desc:"+10% mozgási sebesség", apply:p=>{p.speed*=1.10;} },
      { id:"hp_core", name:"Soft Shield", desc:"+24 max HP és gyógyítás", apply:p=>{p.maxHp+=24;p.hp=Math.min(p.maxHp,p.hp+32);} },
      { id:"pickup_core", name:"Petal Magnet", desc:"+32 pickup radius", apply:p=>{p.pickup+=32;} },
      { id:"crit_core", name:"Lucky Bloom", desc:"+8% crit chance", apply:p=>{p.crit+=.08;} },
      { id:"skill_flow", name:"Skill Flow", desc:"-15% skill cooldown", apply:p=>{p.skillCooldown=Math.max(2.5,p.skillCooldown*.85);} },
      { id:"multi_strike", name:"Multi Strike", desc:"Ranged: +1 lövés · Melee: +18% range", apply:p=>{ if(p.attackType==="melee") p.meleeRangeMult=(p.meleeRangeMult||1)*1.18; else p.projectileCount=Math.min(5,(p.projectileCount||1)+1); } },
      { id:"combat_arc", name:"Combat Arc", desc:"Ranged: szélesebb spread · Melee: szélesebb cone", apply:p=>{ if(p.attackType==="melee") p.meleeConeBonus=(p.meleeConeBonus||0)+14; else p.projectileSpread=Math.min(.34,(p.projectileSpread||.13)+.04); } },
      { id:"thorn_aura", name:"Thorn Aura", desc:"Közeli enemyk lassan sebződnek", apply:p=>{p.auraDps=(p.auraDps||0)+5;} }
    ];
  }

  installConfigData();

  function normalizeSave(save) {
    save.coins = +save.coins || 0;
    save.keys = +save.keys || 0;
    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.equipped = save.equipped || {};
    save.settings = { volume:60, touchMode:true, fpsLimit:60, uiScale:100, viewZoom:1, damageNumbers:true, compactHud:true, ...(save.settings || {}) };
    save.best = { time:0, kills:0, ...(save.best || {}) };
    save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : ["cherry_default","fairy_cherry","beastclaw_cherry"];
    ["cherry_default","fairy_cherry","beastclaw_cherry"].forEach(s=>{if(!save.unlockedSkins.includes(s)) save.unlockedSkins.push(s);});
    if (!CHERRIFT_DATA.skins.some(s=>s.id===save.selectedSkin)) save.selectedSkin = "cherry_default";
    save.selectedStageId = save.selectedStageId || "world_1_1";
    save.unlockedStages = Array.isArray(save.unlockedStages) ? save.unlockedStages : ["world_1_1"];
    if (!save.unlockedStages.includes("world_1_1")) save.unlockedStages.push("world_1_1");
    save.clearedStages = save.clearedStages || {};
    save.stageStats = save.stageStats || {};
    save.firstClearClaimed = save.firstClearClaimed || {};
    return save;
  }

  const oldDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  CherriftStorage.defaults = function(){ return normalizeSave(oldDefaults()); };
  const oldLoad = CherriftStorage.load.bind(CherriftStorage);
  CherriftStorage.load = function(){ return normalizeSave(oldLoad()); };

  const extraAssetPaths = {
    grassNight:CHERRIFT_CONFIG.map.grassNight,
    flower1:CHERRIFT_CONFIG.map.flower1,
    flower2:CHERRIFT_CONFIG.map.flower2,
    mushroom:CHERRIFT_CONFIG.map.mushroom,
    world1:CHERRIFT_CONFIG.map.world1,
    world2:CHERRIFT_CONFIG.map.world2,
    world1Basic:WORLD1_GROUND.basic,
    world1FlowersRocks:WORLD1_GROUND.flowersRocks,
    world1DirtClearing:WORLD1_GROUND.dirtClearing,
    world1GrassDirtMix:WORLD1_GROUND.grassDirtMix,
    world1CloverFlowers:WORLD1_GROUND.cloverFlowers,
    skinSplashBase:SKIN_META.cherry_default.splash,
    skinSplashFairy:SKIN_META.fairy_cherry.splash,
    skinSplashBeast:SKIN_META.beastclaw_cherry.splash
  };

  if (window.ImageAssets && !ImageAssets.prototype.__v040Patched) {
    const oldLoadAll = ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll = async function(){
      await oldLoadAll.call(this);
      await Promise.all(Object.entries(extraAssetPaths).map(([key,src]) => this.loadImage(key, src)));
      this.ready = true;
    };
    ImageAssets.prototype.__v040Patched = true;
  }

  function createBoot(){
    let el = id("bootPreloaderV040");
    if(el) return el;
    el = document.createElement("section");
    el.id = "bootPreloaderV040";
    el.className = "boot-preloader-v040";
    el.innerHTML = '<div class="boot-card-v040"><h1>CHERRIFT</h1><div class="boot-bar-v040"><i id="bootFillV040"></i></div><div id="bootTextV040" class="boot-text-v040">Preparing assets...</div></div>';
    document.body.appendChild(el);
    return el;
  }
  function setBootProgress(pct, text){
    const fill=id("bootFillV040"), label=id("bootTextV040");
    if(fill) fill.style.width = `${clamp(pct,5,100)}%`;
    if(label) label.textContent = text;
  }
  function hideBoot(){ id("bootPreloaderV040")?.classList.add("hidden"); document.body.classList.remove("preloading-v040"); }

  function setText(nodeId, value){ const el=id(nodeId); if(el) el.textContent=value; }
  function rewardText(obj){ const p=[]; if(obj?.coins) p.push(`+${obj.coins} coins`); if(obj?.keys) p.push(`+${obj.keys} key`); return p.join(" · ") || "-"; }
  function currentStage(save=UI.save){ normalizeSave(save); return STAGES.find(s=>s.id===save.selectedStageId)||STAGES[0]; }
  function stageIndex(stageId){ return Math.max(0, STAGES.findIndex(s=>s.id===stageId)); }
  function isStageUnlocked(stage, save=UI.save){ normalizeSave(save); return save.unlockedStages.includes(stage.id); }
  function isStageCleared(stage, save=UI.save){ return !!save.clearedStages?.[stage.id] || !!save.stageStats?.[stage.id]?.clears; }
  function cleanDragGhosts(){ qa(".drag-ghost,.dragging").forEach(el=>{ if(el.classList?.contains("dragging")) el.classList.remove("dragging"); else el.remove(); }); document.body.classList.remove("gear-dragging-v037","gear-dragging-v038","gear-dragging-v039c"); }
  function bindClick(el, fn){ if(!el) return; el.onclick=e=>{ e.preventDefault(); e.stopPropagation(); cleanDragGhosts(); fn(e); }; }

  function createRaidWarning(){
    const el=document.createElement("div");
    el.id="raidWarningV040";
    el.className="raid-warning-v040";
    el.innerHTML="<b>RAID INCOMING</b><small>Wave approaching</small>";
    id("app")?.appendChild(el);
    return el;
  }
  function createBossHud(){
    const el=document.createElement("div");
    el.id="bossHudV040";
    el.className="boss-hud-v040";
    el.innerHTML='<div class="boss-name">Boss</div><div class="boss-bar"><i></i></div>';
    id("app")?.appendChild(el);
    return el;
  }
  function updateBossHud(game){
    const hud=id("bossHudV040") || createBossHud();
    const boss=(game.enemies||[]).find(e=>e.isBoss && !e.dead);
    if(!boss){ hud.classList.remove("show"); return; }
    hud.querySelector(".boss-name").textContent = boss.name || "Mini Boss";
    hud.querySelector(".boss-bar i").style.width = `${clamp(boss.hp/boss.maxHp*100,0,100)}%`;
    hud.classList.add("show");
  }
  function isFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function isMobileLike(){ const w=window.visualViewport?.width||window.innerWidth||0; const h=window.visualViewport?.height||window.innerHeight||0; return Math.min(w,h)<=820; }
  function computeZoom(game){ const w=window.visualViewport?.width||window.innerWidth||game.w||720; const h=window.visualViewport?.height||window.innerHeight||game.h||1280; const mobile=Math.min(w,h)<=820; const portrait=h>=w; const setting=+(UI?.save?.settings?.viewZoom||1); if(mobile&&portrait&&!isFullscreen()) return 1.08*setting; if(mobile&&portrait&&isFullscreen()) return .94*setting; if(mobile) return .86*setting; return .78*setting; }
  function applyViewportClass(){ document.body.classList.toggle("mobile-browser-v040", isMobileLike() && !isFullscreen()); }

  function patchUI(){
    UI.init = function(save, game){
      this.save = normalizeSave(save);
      this.game = game;
      this.skinIndex = Math.max(0, CHERRIFT_DATA.skins.findIndex(s=>s.id===this.save.selectedSkin));
      this.worldCarouselIndex = stageIndex(this.save.selectedStageId);
      this.bind();
      this.refreshMenu();
      this.renderSkinCarousel();
      this.renderGear();
      this.renderWorldPanel();
      document.body.classList.add("preloading-v040");
      createBoot();
      setBootProgress(20, "Loading CHERRIFT assets...");
      Promise.all([game.assetReady]).then(()=>{ setBootProgress(100, "Ready!"); setTimeout(hideBoot, 180); }).catch(()=>{ setBootProgress(100, "Ready with missing optional assets"); setTimeout(hideBoot, 250); });
    };

    UI.bind = function(){
      bindClick(id("playBtn"), () => this.openWorldSelect());
      bindClick(id("mobilePlayBtn"), () => this.openWorldSelect());
      qa("[data-open]").forEach(btn => bindClick(btn, () => { const target=btn.dataset.open; if(target==="worlds") this.openWorldSelect(); else this.open(target); }));
      qa(".back").forEach(btn => bindClick(btn, () => { if(document.body.classList.contains("settings-from-pause") && !id("settings")?.classList.contains("hidden")){ id("settings")?.classList.add("hidden"); id("pauseModal")?.classList.remove("hidden"); return; } this.open("menu"); }));
      bindClick(id("pause"), () => this.pause());
      bindClick(id("resume"), () => this.resume());
      bindClick(id("quit"), () => this.quit());
      bindClick(id("retry"), () => this.game.start());
      bindClick(id("toMenu"), () => this.quit());
      bindClick(id("openChest"), () => this.openChest());
      bindClick(id("skinPrev"), () => { this.skinIndex=(this.skinIndex-1+CHERRIFT_DATA.skins.length)%CHERRIFT_DATA.skins.length; this.renderSkinCarousel(); });
      bindClick(id("skinNext"), () => { this.skinIndex=(this.skinIndex+1)%CHERRIFT_DATA.skins.length; this.renderSkinCarousel(); });
      bindClick(id("skinEquip"), () => { const skin=CHERRIFT_DATA.skins[this.skinIndex]; if(!this.save.unlockedSkins.includes(skin.id)) return this.toast("Skin locked"); this.save.selectedSkin=skin.id; CherriftStorage.save(this.save); this.refreshMenu(); this.renderSkinCarousel(); this.toast(`${skin.name} equipped`); });
      bindClick(id("worldPrevBtn"), () => this.moveWorldCarousel(-1));
      bindClick(id("worldNextBtn"), () => this.moveWorldCarousel(1));
      bindClick(id("worldBackBtn"), () => this.open("menu"));
      bindClick(id("worldLaunchBtn"), () => this.launchSelectedWorld());
      bindClick(id("fullscreen"), () => this.fullscreen());
      bindClick(id("settingsFullscreen"), () => this.fullscreen());
      bindClick(id("pauseFullscreen"), () => this.fullscreen());
      bindClick(id("pauseSettings"), () => { document.body.classList.add("settings-from-pause"); id("pauseModal")?.classList.add("hidden"); this.open("settings"); });
      bindClick(id("settingsBackAction"), () => { if(document.body.classList.contains("settings-from-pause")){ id("settings")?.classList.add("hidden"); id("pauseModal")?.classList.remove("hidden"); } else this.open("menu"); });
      bindClick(id("settingsResumeAction"), () => this.resume());
      bindClick(id("nextStageBtn"), () => { this.hideStageClear(); this.game.start(); });
      bindClick(id("replayStageBtn"), () => { this.hideStageClear(); this.game.start(); });
      bindClick(id("stageClearToMenuBtn"), () => { this.hideStageClear(); this.quit(); });

      const volume=id("volume"); if(volume){ volume.value=this.save.settings.volume; volume.oninput=()=>{this.save.settings.volume=+volume.value;CherriftStorage.save(this.save);}; }
      const touch=id("touchMode"); if(touch){ touch.checked=!!this.save.settings.touchMode; touch.onchange=()=>{this.save.settings.touchMode=touch.checked;this.game.input.touchMode=touch.checked;CherriftStorage.save(this.save);}; this.game.input.touchMode=!!this.save.settings.touchMode; }
      const fps=id("fpsLimit"); if(fps){ fps.value=String(this.save.settings.fpsLimit||60); fps.onchange=()=>{this.save.settings.fpsLimit=+fps.value;this.game.fpsLimit=this.save.settings.fpsLimit;CherriftStorage.save(this.save);this.toast(`${this.save.settings.fpsLimit} FPS limit set`);}; }
      const zoom=id("viewZoom"); if(zoom){ zoom.value=String(this.save.settings.viewZoom||1); zoom.onchange=()=>{this.save.settings.viewZoom=+zoom.value;CherriftStorage.save(this.save);this.game.resize();}; }
      const dmg=id("damageNumbersToggle"); if(dmg){ dmg.checked=this.save.settings.damageNumbers!==false; dmg.onchange=()=>{this.save.settings.damageNumbers=dmg.checked;CherriftStorage.save(this.save);}; }
    };

    UI.open = function(panel){
      cleanDragGhosts();
      document.body.classList.remove("is-playing");
      ["menu","skins","gear","chests","settings","worlds"].forEach(name=>id(name)?.classList.toggle("hidden", name!==panel));
      ["hud","skill","stageHud"].forEach(name=>id(name)?.classList.add("hidden"));
      ["gameOver","pauseModal","levelModal","stageClearModal","stageLoading"].forEach(name=>id(name)?.classList.add("hidden"));
      if(panel==="menu") this.refreshMenu();
      if(panel==="skins") this.renderSkinCarousel();
      if(panel==="gear") this.renderGear();
      if(panel==="worlds") this.renderWorldPanel();
    };

    UI.showGame = function(){
      ["menu","skins","gear","chests","settings","worlds","gameOver","pauseModal","levelModal","stageClearModal","stageLoading"].forEach(name=>id(name)?.classList.add("hidden"));
      id("hud")?.classList.remove("hidden"); id("skill")?.classList.remove("hidden"); id("stageHud")?.classList.remove("hidden");
      document.body.classList.add("is-playing"); document.body.classList.remove("is-loading-stage"); applyViewportClass();
    };

    UI.refreshMenu = function(){
      normalizeSave(this.save);
      setText("menuBuildVersion","v0.4.0b CLEAN CSS");
      setText("menuCoins", this.save.coins); setText("menuKeys", this.save.keys);
      setText("mobileCoinsValue", this.save.coins); setText("mobileKeysValue", this.save.keys); setText("mobileEnergyValue", "5");
      const skin=CHERRIFT_DATA.skins.find(s=>s.id===this.save.selectedSkin)||CHERRIFT_DATA.skins[0];
      setText("selectedSkinText", `${skin.emoji} ${skin.name}`);
      setText("bestRun", `${this.fmt(this.save.best.time)} · ${this.save.best.kills} kills`);
      const stage=currentStage(this.save);
      setText("selectedStageDesktop", stage.name);
      setText("mobileStageChip", stage.name); setText("mobileStageTitle", stage.title);
      setText("mobileStageSub", isStageCleared(stage,this.save) ? "Cleared" : "Ready to clear");
      setText("mobileObjectiveValue", `${stage.goalKills} enemies`);
      setText("mobileRewardValue", rewardText(stage.repeatReward));
      setText("mobileFirstRewardValue", this.save.firstClearClaimed?.[stage.id] ? "Claimed" : rewardText(stage.firstClearReward));
      const art=id("mobileStageArt"); if(art){ art.classList.add("has-world-art"); art.style.backgroundImage=`linear-gradient(180deg,rgba(5,3,12,.05),rgba(5,3,12,.35)), url("${stage.world===2?CHERRIFT_CONFIG.map.world2:CHERRIFT_CONFIG.map.world1}")`; }
      CherriftStorage.save(this.save);
    };

    UI.renderSkinCarousel = function(){
      const skins=CHERRIFT_DATA.skins; if(!skins.length) return;
      this.skinIndex=clamp(this.skinIndex||0,0,skins.length-1);
      const skin=skins[this.skinIndex], meta=SKIN_META[skin.id]||{splash:"",combat:"Ranged",skill:skin.skill,info:skin.desc};
      const unlocked=this.save.unlockedSkins.includes(skin.id), selected=this.save.selectedSkin===skin.id;
      qa(".skin-meta-row-v036a,.skin-meta-row-v036b,.skin-meta-row-v038,.skin-meta-row-v039b").forEach(el=>el.remove());
      const rarity=id("skinRarity");
      if(rarity){ rarity.textContent=`${skin.rarity}${unlocked?"":" · LOCKED"}`; rarity.className=`rarity-pill rarity-${String(skin.rarity).toLowerCase()}`; }
      let row=id("skinMetaRowV040");
      if(!row && rarity){ row=document.createElement("div"); row.id="skinMetaRowV040"; row.className="skin-meta-row-v040"; rarity.insertAdjacentElement("afterend",row); }
      if(row && rarity){ row.innerHTML=""; row.appendChild(rarity); const combat=document.createElement("span"); combat.className="combat-pill-v040"; combat.textContent=meta.combat; row.appendChild(combat); }
      setText("skinName", skin.name); setText("skinDesc",""); setText("skinMini","");
      const kit=q("#skins .skin-kit");
      if(kit){ kit.className="skin-kit skin-kit-v040"; kit.innerHTML=`<div id="skillLineV040" class="skill-line-v040 glass"><span>Skill</span><b><i class="skill-icon-v040">✦</i><span>${meta.skill}</span></b><p id="skillBubbleV040" class="skill-bubble-v040 hidden">${meta.info}</p></div>`; bindClick(id("skillLineV040"),()=>id("skillBubbleV040")?.classList.toggle("hidden")); }
      const equip=id("skinEquip"); if(equip){ equip.disabled=!unlocked; equip.textContent=selected?"EQUIPPED":unlocked?"EQUIP":"LOCKED"; }
      const splash=id("skinSplash"); if(splash){ splash.classList.add("has-splash-art"); splash.classList.remove("no-splash-art","splash-loading"); splash.style.backgroundImage=`linear-gradient(180deg,rgba(5,3,12,.03),rgba(5,3,12,.22)), url("${meta.splash}")`; }
      setText("skinPortrait","");
    };

    UI.renderGear = function(){
      cleanDragGhosts();
      const inv=id("inventory"); if(!inv) return;
      qa(".gear-slot").forEach(btn=>{
        const slot=btn.dataset.slot, gear=this.save.equipped?.[slot];
        btn.draggable=false; btn.ondragstart=e=>{e.preventDefault();return false;};
        btn.className=`gear-slot ${slot.toLowerCase()} ${gear?"":"empty"} ${this.selectedGear&&this.selectedGear.id===gear?.id?"selected":""}`;
        btn.dataset.short=slot.slice(0,3).toUpperCase(); btn.dataset.gearId=gear?.id||""; btn.innerHTML=gear?`<span>${this.gearEmoji(gear)}</span>`:"";
        bindClick(btn,()=>{ if(gear) this.showGearDetails(gear,"equipped"); else this.showEmptySlot(slot); this.highlightGear(gear?.id); });
      });
      inv.innerHTML="";
      this.save.inventory.forEach(gear=>{
        const el=document.createElement("button");
        el.type="button"; el.draggable=false; el.ondragstart=e=>{e.preventDefault();return false;};
        el.className=`inv-item rarity-${gear.rarity.toLowerCase()} ${this.selectedGear&&this.selectedGear.id===gear.id?"selected":""}`;
        el.dataset.gearId=gear.id; el.dataset.slot=gear.slot; el.innerHTML=`<span>${this.gearEmoji(gear)}</span><small>${gear.slot}</small>`;
        bindClick(el,()=>{this.showGearDetails(gear,"inventory");this.highlightGear(gear.id);});
        inv.appendChild(el);
      });
      setText("inventoryCount", `${this.save.inventory.length} items`);
      const stats=this.totalGearStats(this.save), total=id("totalStats");
      if(total) total.innerHTML="<h3>Total Stats</h3>"+(Object.keys(stats).length?Object.entries(stats).map(([k,v])=>`<div class="stat-line"><span>${k}</span><b>+${Math.round(v*10)/10}</b></div>`).join(""):"<p>No gear equipped.</p>");
      if(!this.selectedGear) this.showEmptySlot("Select item");
    };

    UI.highlightGear = function(){ this.renderGear(); };
    UI.showGearDetails = function(gear,source){
      this.selectedGear=gear;
      const actions=source==="inventory" ? `<button data-action="equip">Equip</button><button data-action="sell">Sell</button>` : `<button data-action="unequip">Unequip</button>`;
      const details=id("gearDetails");
      if(details){
        details.innerHTML=`<div class="gear-detail-title"><div class="gear-detail-icon">${this.gearEmoji(gear)}</div><div><h4>${this.gearName(gear)}</h4><small class="rarity-${gear.rarity.toLowerCase()} type-${gear.type.toLowerCase()}">${gear.rarity} · ${gear.type}</small></div></div><div>${Object.entries(gear.stats).map(([k,v])=>`<div class="stat-line"><span>${k}</span><b>+${v}</b></div>`).join("")}</div><div class="gear-detail-actions">${actions}</div>`;
        qa("#gearDetails [data-action]").forEach(btn=>bindClick(btn,()=>{ if(btn.dataset.action==="equip") this.equipGear(gear.id); if(btn.dataset.action==="sell") this.sellGear(gear.id); if(btn.dataset.action==="unequip") this.unequipGear(gear.slot); }));
      }
      this.renderGear();
    };

    UI.openWorldSelect = function(){ normalizeSave(this.save); this.worldCarouselIndex=stageIndex(this.save.selectedStageId); this.open("worlds"); this.renderWorldPanel(); };
    UI.moveWorldCarousel = function(dir){ this.worldCarouselIndex=clamp((this.worldCarouselIndex||0)+dir,0,STAGES.length-1); this.renderWorldPanel(); };
    UI.renderWorldPanel = function(){
      normalizeSave(this.save);
      this.worldCarouselIndex=clamp(this.worldCarouselIndex||0,0,STAGES.length-1);
      const stage=STAGES[this.worldCarouselIndex], unlocked=isStageUnlocked(stage,this.save), cleared=isStageCleared(stage,this.save);
      setText("carouselWorldLabel",`World ${stage.world}`); setText("carouselStageName",stage.name); setText("carouselStageTitle",stage.title); setText("carouselStageDesc",stage.desc);
      setText("carouselStageObjective",`${stage.goalKills} enemies`); setText("carouselStageReward",rewardText(stage.repeatReward)); setText("carouselStageFirstReward",this.save.firstClearClaimed?.[stage.id]?"Claimed":rewardText(stage.firstClearReward)); setText("worldSelectedInfo",`${stage.name} · ${stage.title} · ${stage.goalKills} enemies`);
      const state=id("carouselStageState"); if(state){ state.className=`world-state-pill ${cleared?"cleared":unlocked?"unlocked":"locked"}`; state.textContent=cleared?"Cleared":unlocked?"Unlocked":"Locked"; }
      const img=id("carouselStageImage"); if(img){ img.classList.add("has-world-art"); img.classList.toggle("night", stage.theme==="forest_night"); img.style.backgroundImage=`linear-gradient(180deg,rgba(5,3,12,.04),rgba(5,3,12,.36)), url("${stage.world===2?CHERRIFT_CONFIG.map.world2:CHERRIFT_CONFIG.map.world1}")`; }
      const prev=id("worldPrevBtn"), next=id("worldNextBtn"), launch=id("worldLaunchBtn");
      if(prev) prev.disabled=this.worldCarouselIndex<=0; if(next) next.disabled=this.worldCarouselIndex>=STAGES.length-1; if(launch){ launch.disabled=!unlocked; launch.textContent=unlocked?"PLAY":"LOCKED"; }
      let dots=id("worldStageDotsV040");
      if(!dots){ dots=document.createElement("div"); dots.id="worldStageDotsV040"; dots.className="world-stage-dots-v040"; id("carouselStageImage")?.insertAdjacentElement("afterend",dots); }
      if(dots){ dots.innerHTML=STAGES.map((s,i)=>`<button type="button" class="${i===this.worldCarouselIndex?"active":""} ${isStageUnlocked(s,this.save)?"":"locked"}" data-i="${i}" title="${s.name}"></button>`).join(""); qa("#worldStageDotsV040 button").forEach(btn=>bindClick(btn,()=>{this.worldCarouselIndex=+btn.dataset.i;this.renderWorldPanel();})); }
    };
    UI.launchSelectedWorld = function(){ const stage=STAGES[this.worldCarouselIndex||0]; if(!isStageUnlocked(stage,this.save)) return this.toast("Stage locked"); this.save.selectedStageId=stage.id; CherriftStorage.save(this.save); this.game.start(); };
    UI.showStageLoading = function(stage){ setText("loadingStageName",`${stage.name} · ${stage.title}`); setText("loadingText","Preparing Cherry..."); const fill=id("loadingFill"); if(fill) fill.style.width="20%"; id("stageLoading")?.classList.remove("hidden"); document.body.classList.add("is-loading-stage"); setTimeout(()=>{if(fill) fill.style.width="72%";},80); };
    UI.hideStageLoading = function(){ id("stageLoading")?.classList.add("hidden"); document.body.classList.remove("is-loading-stage"); };
    UI.updateStageHUD = function(game){
      const stage=game?.stage||currentStage(this.save); if(!stage) return;
      setText("stageHudName",stage.name); setText("stageHudGoal",`${Math.min(game.kills||0,stage.goalKills)}/${stage.goalKills}`);
      const raid=id("raidWarningV040")||createRaidWarning();
      if(game.stageState?.raidBannerTimer>0){ raid.querySelector("b").textContent=game.stageState.raidBoss?"MINI BOSS":"RAID INCOMING"; raid.querySelector("small").textContent=game.stageState.raidText||"Wave approaching"; raid.classList.add("show"); } else raid.classList.remove("show");
    };
    UI.showStageClear = function(game,info={}){
      const stage=game.stage; setText("stageClearTitle","STAGE CLEAR!"); setText("stageClearSubtitle",`${stage.name} · ${stage.title} · ${this.fmt(game.time)} · ${game.kills}/${stage.goalKills} defeated`);
      id("stageRewardsRepeat").innerHTML=rewardText(stage.repeatReward); id("stageRewardsFirst").innerHTML=info.firstClear?rewardText(stage.firstClearReward):"Claimed"; setText("stageUnlockText", info.nextStage?`${info.nextStage.name} unlocked`:"All current stages cleared"); id("stageClearModal")?.classList.remove("hidden");
      const actions=q("#stageClearModal .stage-clear-actions"); if(actions&&!id("stageClearWorldBtn")){ const btn=document.createElement("button"); btn.id="stageClearWorldBtn"; btn.className="menu-btn center"; btn.textContent="WORLD SELECT"; bindClick(btn,()=>{this.hideStageClear();this.openWorldSelect();}); actions.insertBefore(btn,id("stageClearToMenuBtn")||null); }
    };
    UI.hideStageClear = function(){ id("stageClearModal")?.classList.add("hidden"); };
    UI.updateHUD = function(game){
      const p=game.player; if(!p) return;
      id("hpFill").style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`; setText("hpText",`HP ${Math.ceil(Math.max(0,p.hp))}/${Math.ceil(p.maxHp)}`);
      id("xpFill").style.width=`${Math.min(100,p.xp/p.xpNext*100)}%`; setText("xpText",`LV ${p.level} XP ${p.xp}/${p.xpNext}`);
      setText("timer",this.fmt(game.time)); setText("runCoins",game.runCoins);
      const skill=id("skill"), cd=id("cooldown"); if(p.skillTimer>0){ skill.classList.add("cooldown"); cd.textContent=p.skillTimer.toFixed(1); } else { skill.classList.remove("cooldown"); cd.textContent=""; }
      this.updateStageHUD(game); updateBossHud(game);
    };
    UI.showLevelUp = function(game){ const list=id("upgrades"); if(!list) return; list.innerHTML=""; [...CHERRIFT_DATA.upgrades].sort(()=>Math.random()-.5).slice(0,3).forEach(up=>{ const btn=document.createElement("button"); btn.className="upgrade-card"; btn.innerHTML=`<strong>${up.name}</strong><span>${up.desc}</span>`; bindClick(btn,()=>game.applyUpgrade(up)); list.appendChild(btn); }); id("levelModal")?.classList.remove("hidden"); };
    UI.hideLevelUp = function(){ id("levelModal")?.classList.add("hidden"); };
    UI.pause = function(){ if(this.game.mode!=="playing") return; this.game.mode="paused"; document.body.classList.remove("is-playing"); id("pauseModal")?.classList.remove("hidden"); };
    UI.resume = function(){ if(this.game.mode!=="paused") return; this.game.mode="playing"; document.body.classList.add("is-playing"); document.body.classList.remove("settings-from-pause"); id("pauseModal")?.classList.add("hidden"); id("settings")?.classList.add("hidden"); id("hud")?.classList.remove("hidden"); id("skill")?.classList.remove("hidden"); id("stageHud")?.classList.remove("hidden"); applyViewportClass(); };
    UI.quit = function(){ this.game.mode="menu"; this.game.player=null; document.body.classList.remove("is-playing"); this.open("menu"); };
    UI.fullscreen = function(){ const root=document.documentElement; const active=document.fullscreenElement||document.webkitFullscreenElement; const req=root.requestFullscreen||root.webkitRequestFullscreen; const exit=document.exitFullscreen||document.webkitExitFullscreen; const done=active?exit?.call(document):req?.call(root); Promise.resolve(done).finally(()=>setTimeout(()=>{applyViewportClass();this.game.resize();this.game.render();},180)); };
  }

  function hash2(x,y){ let h=(x*374761393+y*668265263)>>>0; h=(h^(h>>13))>>>0; h=(h*1274126177)>>>0; return ((h^(h>>16))>>>0)/4294967295; }

  function patchGame(){
    const proto=CherriftGame.prototype;
    const baseUpdate=proto.update, baseDamageEnemy=proto.damageEnemy, baseUpdateEnemies=proto.updateEnemies, baseDrawEffect=proto.drawEffect;

    proto.getSelectedStage=function(){ normalizeSave(this.save); return STAGES.find(s=>s.id===this.save.selectedStageId)||STAGES[0]; };
    proto.start=async function(){
      const stage=this.getSelectedStage(); UI.showStageLoading(stage); await this.assetReady;
      const skin=this.activeSkinData(), skinCfg=this.activeSkinConfig(), gear=UI.totalGearStats(this.save);
      this.stage=stage; this.stageState={spawnTimer:0,nextRaidAt:stage.raidEvery,raidBannerTimer:0,raidText:"",raidBoss:false,bossSpawned:false,cleared:false};
      this.mode="playing"; this.runCoins=0; this.time=0; this.kills=0;
      this.player={x:0,y:0,r:18,hp:100+(gear.maxHp||0),maxHp:100+(gear.maxHp||0),speed:235+(skin.stats.speed||0)+(gear.moveSpeed||0),damage:20+(skin.stats.damage||0)+(gear.damage||0),fireInterval:Math.max(.18,.42/(1+(gear.attackSpeed||0)/100)),fireTimer:0,bulletSpeed:560,pickup:110+(gear.pickup||0),crit:.05+(gear.crit||0)/100,critDamage:1.5+(gear.critDamage||0)/100,armor:gear.armor||0,regen:gear.regen||0,level:1,xp:0,xpNext:18,skillTimer:0,skillCooldown:8,skillCastTimer:0,skillCastDuration:0,dashTimer:0,skin:skin.id,attackType:skinCfg.attackType||"ranged",attackCastTimer:0,attackCastDuration:0,skillBuff:0,projectileCount:1,projectileSpread:.13,meleeRangeMult:1,meleeConeBonus:0,auraDps:0,lastDir:"down",moving:false};
      this.enemies=[]; this.bullets=[]; this.pickups=[]; this.effects=[]; this.obstacles=this.generateMap(); this.spawnTimer=0; this.camera={x:this.player.x,y:this.player.y}; this.zoom=computeZoom(this); this.last=performance.now();
      setTimeout(()=>{UI.hideStageLoading();UI.showGame();UI.updateHUD(this);this.resize();},160);
    };
    proto.generateMap=function(){
      const obs=[], stage=this.stage||this.getSelectedStage();
      const add=(kind,count,r,solid=true)=>{ for(let i=0;i<count;i++){ let x=0,y=0,ok=false; for(let t=0;t<90&&!ok;t++){ x=(Math.random()-.5)*3600; y=(Math.random()-.5)*3600; ok=Math.hypot(x,y)>260 && obs.every(o=>Math.hypot(o.x-x,o.y-y)>(o.r||20)+r+38); } if(ok) obs.push({kind,x,y,r,solid,phase:Math.random()*9,variant:Math.random()>.5?"flower2":"flower1"}); } };
      add("treeBig",stage.world===2?10:8,74,true); add("treeSmall",12,54,true); add("log",14,48,true); add("bush1",14,42,true); add("bush2",13,42,true); add("rockBig",9,38,true); add("rockSmall",14,26,true); add("flowers",42,18,false); add("mushroom",stage.world===2?24:14,22,false); return obs;
    };
    proto.spawn=function(dt){
      if(!this.stage||!this.stageState||this.kills>=this.stage.goalKills) return;
      const st=this.stageState; st.spawnTimer-=dt; st.raidBannerTimer=Math.max(0,st.raidBannerTimer-dt);
      if(!st.bossSpawned&&this.stage.boss&&this.kills>=Math.floor(this.stage.goalKills*.78)){ st.bossSpawned=true; this.triggerRaid(true); }
      if(this.kills>=st.nextRaidAt&&this.kills<this.stage.goalKills-5){ st.nextRaidAt+=this.stage.raidEvery; this.triggerRaid(false); }
      if(st.spawnTimer<=0&&this.enemies.length<(this.stage.maxEnemies||36)){ const pressure=1+this.time/150; st.spawnTimer=Math.max(.18,.72/pressure); const count=1+Math.floor(this.time/45); for(let i=0;i<count;i++) this.spawnEnemy(); }
    };
    proto.triggerRaid=function(boss=false){ if(boss){ this.spawnEnemy(this.stage.boss,true); this.stageState.raidText=`${ENEMIES[this.stage.boss]?.name||"Mini Boss"} appeared`; this.stageState.raidBoss=true; this.stageState.raidBannerTimer=2.2; return; } const count=this.stage.raidCount||14; for(let i=0;i<count;i++) this.spawnEnemy(); this.stageState.raidText=`Raid wave · ${count} enemies`; this.stageState.raidBoss=false; this.stageState.raidBannerTimer=1.9; };
    proto.spawnEnemy=function(forcedType=null,boss=false){
      const stage=this.stage||this.getSelectedStage(), pool=stage.enemyPool||["pink_slime","green_slime"], type=forcedType||pool[Math.floor(Math.random()*pool.length)], spec=ENEMIES[type]||ENEMIES.pink_slime;
      const a=Math.random()*Math.PI*2, d=Math.max(this.w,this.h)/(this.zoom||1)*.62+160, scale=1+Math.min(.9,this.time/220)+(stage.index-1)*.06+(stage.world-1)*.18;
      this.enemies.push({enemyType:type,type,name:spec.name,x:this.player.x+Math.cos(a)*d,y:this.player.y+Math.sin(a)*d,r:spec.r,hp:spec.hp*scale,maxHp:spec.hp*scale,speed:spec.speed*(1+Math.min(.35,this.time/260)),xp:spec.xp,color:spec.color,visualStyle:spec.visualStyle,isBoss:boss||!!spec.boss,hit:0,phase:Math.random()*9});
    };
    proto.update=function(dt){ baseUpdate.call(this,dt); if(this.mode!=="playing"||!this.player||!this.stage) return; const p=this.player; p.attackCastTimer=Math.max(0,(p.attackCastTimer||0)-dt); if(p.auraDps>0){ const radius=92+Math.min(80,(p.pickup||110)*.16); for(const e of this.enemies){ if(e.dead) continue; if(Math.hypot(e.x-p.x,e.y-p.y)<=radius+e.r){ e.hp-=p.auraDps*dt; e.hit=Math.max(e.hit||0,.04); if(e.hp<=0&&!e.dead) this.damageEnemy(e,1); } } } if(!this.stageState.cleared&&this.kills>=this.stage.goalKills) this.stageClear(); UI.updateStageHUD(this); };
    proto.stageClear=function(){ if(!this.stage||this.stageState.cleared) return; this.stageState.cleared=true; this.mode="stageclear"; const stage=this.stage, next=STAGES[STAGES.findIndex(s=>s.id===stage.id)+1]||null, firstClear=!this.save.firstClearClaimed?.[stage.id]; this.save.coins+=stage.repeatReward?.coins||0; this.save.keys+=stage.repeatReward?.keys||0; if(firstClear){ this.save.coins+=stage.firstClearReward?.coins||0; this.save.keys+=stage.firstClearReward?.keys||0; this.save.firstClearClaimed[stage.id]=true; } this.save.clearedStages[stage.id]=true; this.save.stageStats[stage.id]=this.save.stageStats[stage.id]||{clears:0,bestTime:0,bestKills:0}; this.save.stageStats[stage.id].clears++; this.save.stageStats[stage.id].bestTime=this.save.stageStats[stage.id].bestTime?Math.min(this.save.stageStats[stage.id].bestTime,this.time):this.time; this.save.stageStats[stage.id].bestKills=Math.max(this.save.stageStats[stage.id].bestKills||0,this.kills); if(next&&!this.save.unlockedStages.includes(next.id)) this.save.unlockedStages.push(next.id); if(next) this.save.selectedStageId=next.id; CherriftStorage.save(this.save); UI.showStageClear(this,{firstClear,nextStage:next}); };
    proto.autoFire=function(){
      const p=this.player; if(!p) return; const skin=this.activeSkinConfig(), interval=p.fireInterval*(p.skillBuff>0?.55:1); if(p.fireTimer>0) return; const target=this.nearest(skin.attackType==="melee"?190:720); if(!target) return; p.fireTimer=interval; const dx=target.x-p.x,dy=target.y-p.y,angle=Math.atan2(dy,dx);
      if(skin.attackType==="melee"){ p.attackCastTimer=skin.states?.attack?.duration||.30; p.attackCastDuration=p.attackCastTimer; p.attackDir=Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down"); this.meleeHit(angle,(skin.meleeRange||124)*(p.meleeRangeMult||1),(skin.meleeCone||94)+(p.meleeConeBonus||0),p.damage*1.08); this.effects.push({type:"slash",x:p.x,y:p.y,a:angle,r:(skin.meleeRange||124)*(p.meleeRangeMult||1),t:0,life:.22}); return; }
      const count=Math.max(1,Math.min(5,Math.floor(p.projectileCount||1))), spread=p.projectileSpread||.13, style=p.skin==="fairy_cherry"?"petal":"orb", l=Math.hypot(dx,dy)||1, base=Math.atan2(dy,dx);
      for(let i=0;i<count;i++){ const off=(i-(count-1)/2)*spread, a=count>1?base+off:base; this.bullets.push({x:p.x,y:p.y-10,vx:(count>1?Math.cos(a):dx/l)*p.bulletSpeed,vy:(count>1?Math.sin(a):dy/l)*p.bulletSpeed,r:style==="petal"?8:7,dmg:p.damage,life:1.45,style}); }
    };
    proto.meleeHit=function(angle,range,coneDeg,damage){ const half=coneDeg*Math.PI/180/2; for(const e of this.enemies){ if(e.dead) continue; const dx=e.x-this.player.x,dy=e.y-this.player.y,d=Math.hypot(dx,dy); if(d>range+e.r) continue; const ea=Math.atan2(dy,dx); const da=Math.atan2(Math.sin(ea-angle),Math.cos(ea-angle)); if(Math.abs(da)<=half||d<50) this.damageEnemy(e,damage); } };
    proto.skill=function(){ const p=this.player; if(!p||p.skillTimer>0) return; const skin=this.activeSkinConfig(), state=skin.states.skill, duration=state.duration||.4, dir=p.lastDir||"down"; p.skillTimer=p.skillCooldown; p.skillCastTimer=duration; p.skillCastDuration=duration; p.skillDir=dir; if(skin.skillType==="savage_rend"){ const v=this.dirVector(dir), angle=Math.atan2(v.y,v.x); p.invuln=Math.max(p.invuln||0,.24); p.dashDir=v; p.dashTimer=.16; p.dashSpeed=640; this.meleeHit(angle,185*(p.meleeRangeMult||1),150+(p.meleeConeBonus||0),p.damage*3.2); this.effects.push({type:"slash",x:p.x,y:p.y,a:angle,r:190*(p.meleeRangeMult||1),t:0,life:.38}); return; } if(skin.skillType==="dash"){ const mv=this.input.getMoveVector(), v=Math.hypot(mv.x,mv.y)>.08?mv:this.dirVector(dir); p.dashDir=v; p.dashTimer=skin.dashDuration||duration; p.dashSpeed=skin.dashSpeed||760; p.invuln=Math.max(p.invuln||0,p.dashTimer); this.effects.push({type:"dash",x:p.x,y:p.y,vx:v.x,vy:v.y,t:0,life:.32}); for(const e of this.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<skin.dashDamageRadius) this.damageEnemy(e,p.damage*skin.dashDamageMult); return; } const radius=skin.burstRadius||185; this.effects.push({type:"burst",x:p.x,y:p.y,r:radius,t:0,life:.45}); for(const e of this.enemies) if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r) this.damageEnemy(e,p.damage*3.2); };
    proto.damageEnemy=function(enemy,damage){ const was=enemy.dead; if(UI.save?.settings?.damageNumbers!==false&&damage>0) this.effects.push({type:"damageText",x:enemy.x+(Math.random()-.5)*18,y:enemy.y-enemy.r-8,value:Math.max(1,Math.round(damage)),t:0,life:.48,big:damage>(this.player?.damage||20)*1.45}); baseDamageEnemy.call(this,enemy,damage); if(!was&&enemy.dead) this.effects.push({type:"deathPop",x:enemy.x,y:enemy.y,r:enemy.r||24,t:0,life:.28}); };
    proto.updateEnemies=function(dt){ baseUpdateEnemies.call(this,dt); };
    proto.drawWorld=function(c){ c.fillStyle="#1f7d45"; c.fillRect(0,0,this.w,this.h); this.zoom=computeZoom(this); const zoom=this.zoom; c.save(); c.translate(this.w/2,this.h/2); c.scale(zoom,zoom); c.translate(-this.camera.x,-this.camera.y); this.drawGround(c,zoom); const ground=this.obstacles.filter(o=>o.kind==="flowers"||o.kind==="mushroom"), solid=this.obstacles.filter(o=>!(o.kind==="flowers"||o.kind==="mushroom")); for(const o of ground) this.drawObstacle(c,o); const drawables=[...solid,...this.pickups,...this.enemies,...(this.player?[this.player]:[]),...this.bullets,...this.effects]; drawables.sort((a,b)=>(a.y||0)-(b.y||0)); for(const o of drawables) this.drawObj(c,o); c.restore(); };
    proto.drawObj=function(c,o){ if(o===this.player) return this.drawPlayer(c,o); if(o?.kind) return this.drawObstacle(c,o); if(o?.type==="xp"||o?.type==="coin"||o?.type==="key") return this.drawPickup(c,o); if(o?.hp!==undefined) return this.drawEnemy(c,o); if(o?.style) return this.drawBullet(c,o); if(o?.type) return this.drawEffect(c,o); };
    proto.drawGround=function(c,zoom=1){ const stage=this.stage||this.getSelectedStage(), size=128, viewW=this.w/zoom, viewH=this.h/zoom, sx=Math.floor((this.camera.x-viewW/2)/size)-1, ex=Math.floor((this.camera.x+viewW/2)/size)+1, sy=Math.floor((this.camera.y-viewH/2)/size)-1, ey=Math.floor((this.camera.y+viewH/2)/size)+1; if(stage.theme==="forest_night"){ const tile=this.assets.get("grassNight")||this.assets.get("grass"); for(let gx=sx;gx<=ex;gx++)for(let gy=sy;gy<=ey;gy++){const x=gx*size,y=gy*size;if(tile)c.drawImage(tile,x,y,size+1,size+1);c.save();c.globalAlpha=.18;c.fillStyle="#07122d";c.fillRect(x,y,size+1,size+1);c.restore();} return;} const base=this.assets.get("world1Basic")||this.assets.get("grass"); for(let gx=sx;gx<=ex;gx++)for(let gy=sy;gy<=ey;gy++){const x=gx*size,y=gy*size;this.drawTileCropped(c,base,x,y,size,1); const h=hash2(gx,gy); let img=null,alpha=0; if(h<.18){img=this.assets.get("world1GrassDirtMix");alpha=.42;} else if(h<.28){img=this.assets.get("world1CloverFlowers");alpha=.32;} else if(h<.36){img=this.assets.get("world1FlowersRocks");alpha=.28;} else if(h<.42){img=this.assets.get("world1DirtClearing");alpha=.34;} if(img)this.drawTileCropped(c,img,x,y,size,alpha);} };
    proto.drawTileCropped=function(c,img,x,y,size,alpha=1){ if(!img){c.fillStyle="#3d9f49";c.fillRect(x,y,size+1,size+1);return;} const sw=img.naturalWidth||img.width, sh=img.naturalHeight||img.height, crop=Math.floor(Math.min(sw,sh)*.16); c.save(); c.globalAlpha=alpha; c.drawImage(img,crop,crop,sw-crop*2,sh-crop*2,x,y,size+1,size+1); c.restore(); };
    proto.drawObstacle=function(c,o){ const draw=(key,x,y,w,h)=>this.drawImageCentered(c,key,x,y,w,h); if(o.kind==="treeBig"&&draw("treeBig",o.x,o.y-16,190,190))return; if(o.kind==="treeSmall"&&draw("treeSmall",o.x,o.y-12,150,150))return; if(o.kind==="bush1"&&draw("bush1",o.x,o.y,116,98))return; if(o.kind==="bush2"&&draw("bush2",o.x,o.y,118,100))return; if(o.kind==="log"&&draw("log",o.x,o.y,132,82))return; if(o.kind==="rockBig"&&draw("rockBig",o.x,o.y,88,70))return; if(o.kind==="rockSmall"&&draw("rockSmall",o.x,o.y,96,76))return; if(o.kind==="mushroom"&&draw("mushroom",o.x,o.y,72,62))return; if(o.kind==="flowers"){const key=o.variant||(Math.floor((o.x+o.y)/64)%2?"flower2":"flower1"); if(draw(key,o.x,o.y,54,54))return;} };
    proto.drawEnemy=function(c,e){ const pulse=1+Math.sin(this.t*6+e.phase)*.035; c.save(); if(e.hit>0)c.globalAlpha=.66; if(e.visualStyle==="slimeSprite"||e.visualStyle==="bossSlime"){ const img=this.assets.get("slime"); if(img){ const cfg=CHERRIFT_CONFIG.slime, frame=Math.floor((this.t+e.phase)*7)%cfg.columns, row=cfg.rows.move||1, dw=(e.isBoss?142:cfg.displayWidth)*pulse, dh=(e.isBoss?142:cfg.displayHeight)*pulse; c.drawImage(img,frame*cfg.frameWidth,row*cfg.frameHeight,cfg.frameWidth,cfg.frameHeight,e.x-dw/2,e.y-dh/2,dw,dh); c.restore(); return; } } c.fillStyle=e.color||"#ff70b8"; c.beginPath(); c.ellipse(e.x,e.y,e.r*1.15*pulse,e.r*.82*pulse,0,0,Math.PI*2); c.fill(); c.fillStyle="rgba(0,0,0,.78)"; c.beginPath(); c.arc(e.x-e.r*.35,e.y-e.r*.16,Math.max(2,e.r*.09),0,Math.PI*2); c.fill(); c.beginPath(); c.arc(e.x+e.r*.35,e.y-e.r*.16,Math.max(2,e.r*.09),0,Math.PI*2); c.fill(); if(e.hp<e.maxHp){c.fillStyle="rgba(0,0,0,.35)";c.fillRect(e.x-e.r,e.y+e.r+8,e.r*2,4);c.fillStyle="#ff8ccc";c.fillRect(e.x-e.r,e.y+e.r+8,e.r*2*Math.max(0,e.hp/e.maxHp),4);} c.restore(); };
    proto.drawPlayer=function(c,p){ const skin=this.activeSkinConfig(), cfg=CHERRIFT_CONFIG.player, skill=(p.skillCastTimer||0)>0, attack=!skill&&(p.attackCastTimer||0)>0&&skin.states?.attack, dir=skill?(p.skillDir||p.lastDir||"down"):attack?(p.attackDir||p.lastDir||"down"):(p.lastDir||"down"), stateName=skill?"skill":attack?"attack":(p.moving?"walk":"idle"), state=skin.states?.[stateName], img=this.assets.get(`player_${p.skin}_${stateName}_${dir}`); if(!img||!state){c.fillStyle="#ff87c6";c.beginPath();c.arc(p.x,p.y,24,0,Math.PI*2);c.fill();return;} const real=Math.max(1,Math.floor(img.width/cfg.frameWidth)), count=Math.max(1,Math.min(state.frames||real,real)); let frame=0; if(stateName==="skill"){const elapsed=Math.max(0,(p.skillCastDuration||state.duration||.4)-(p.skillCastTimer||0)); frame=Math.min(count-1,Math.floor(elapsed*(state.fps||12)));} else if(stateName==="attack"){const elapsed=Math.max(0,(p.attackCastDuration||state.duration||.34)-(p.attackCastTimer||0)); frame=Math.min(count-1,Math.floor(elapsed*(state.fps||18)));} else frame=Math.floor(this.t*(state.fps||6))%count; const scale=.95,dw=(cfg.displayWidth||116)*scale,dh=(cfg.displayHeight||116)*scale,dx=Math.round(p.x-dw/2),dy=Math.round(p.y+34-dh),flip=p.skin==="fairy_cherry"&&stateName==="walk"&&dir==="right"; c.save(); c.globalAlpha=.22; c.fillStyle="#000"; c.beginPath(); c.ellipse(p.x,p.y+25,27,9,0,0,Math.PI*2); c.fill(); c.restore(); c.save(); if(flip){c.translate(dx+dw/2,0);c.scale(-1,1);c.drawImage(img,frame*cfg.frameWidth,0,cfg.frameWidth,cfg.frameHeight,-dw/2,dy,dw,dh);} else c.drawImage(img,frame*cfg.frameWidth,0,cfg.frameWidth,cfg.frameHeight,dx,dy,dw,dh); c.restore(); };
    proto.drawEffect=function(c,e){ if(e.type==="damageText"){const a=Math.max(0,1-e.t/e.life);c.save();c.globalAlpha=a;c.font=`${e.big?24:18}px system-ui, sans-serif`;c.textAlign="center";c.lineWidth=4;c.strokeStyle="rgba(0,0,0,.65)";c.fillStyle=e.big?"#ffd76c":"#fff4fb";const y=e.y-(1-a)*28;c.strokeText(String(e.value),e.x,y);c.fillText(String(e.value),e.x,y);c.restore();return;} if(e.type==="deathPop"){const a=Math.max(0,1-e.t/e.life);c.save();c.globalAlpha=a;c.strokeStyle="rgba(255,210,233,.85)";c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,(e.r||24)*(1.1+(1-a)*.75),0,Math.PI*2);c.stroke();c.restore();return;} if(e.type==="slash"){const a=Math.max(0,1-e.t/e.life);c.save();c.globalAlpha=a;c.strokeStyle="#fff1f8";c.lineWidth=8;c.beginPath();c.arc(e.x,e.y,e.r*(.52+(1-a)*.20),e.a-.7,e.a+.7);c.stroke();c.strokeStyle="#ff5bac";c.lineWidth=4;c.stroke();c.restore();return;} return baseDrawEffect.call(this,c,e); };
    window.addEventListener("resize",()=>applyViewportClass());
    window.addEventListener("orientationchange",()=>setTimeout(()=>applyViewportClass(),160),{passive:true});
    document.addEventListener("fullscreenchange",()=>setTimeout(()=>applyViewportClass(),160),{passive:true});
  }

  // ---------------------------------------------------------------------------
  // Gear drag v0.4.0b
  // Clean pointer-based drag/drop. Native browser drag/drop is not used.
  // Tap = details. Drag inventory item to matching slot = equip.
  // Drag equipped item to inventory = unequip.
  // ---------------------------------------------------------------------------
  let gearDragV040b = null;

  function cleanGearDragV040b() {
    gearDragV040b = null;
    document.body.classList.remove("gear-dragging-v040b");
    id("inventory")?.classList.remove("drag-target-v040b");
    qa(".gear-slot").forEach(el => el.classList.remove("drag-eligible", "drag-disabled"));
    qa(".drag-ghost-v040b,.drag-ghost").forEach(el => el.remove());
  }

  function gearPayloadFromTargetV040b(target) {
    const item = target.closest?.(".inv-item");
    if (item) {
      const gear = UI.save?.inventory?.find(g => g.id === item.dataset.gearId);
      if (!gear) return null;
      return { source:"inventory", gear, id:gear.id, slot:gear.slot, emoji:UI.gearEmoji?.(gear) || "💠" };
    }
    const slot = target.closest?.(".gear-slot");
    if (slot && slot.dataset.gearId) {
      const gear = UI.save?.equipped?.[slot.dataset.slot];
      if (!gear) return null;
      return { source:"equipped", gear, id:gear.id, slot:gear.slot, emoji:UI.gearEmoji?.(gear) || "💠" };
    }
    return null;
  }

  function createGearGhostV040b(payload, x, y) {
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost-v040b";
    ghost.innerHTML = `<span>${payload.emoji}</span>`;
    document.body.appendChild(ghost);
    moveGearGhostV040b(x, y, ghost);
    return ghost;
  }

  function moveGearGhostV040b(x, y, ghost = gearDragV040b?.ghost) {
    if (!ghost) return;
    ghost.style.transform = `translate(${Math.round(x - 36)}px, ${Math.round(y - 36)}px)`;
  }

  function highlightGearTargetsV040b(payload) {
    if (payload.source === "inventory") {
      qa(".gear-slot").forEach(el => {
        const ok = el.dataset.slot === payload.slot;
        el.classList.toggle("drag-eligible", ok);
        el.classList.toggle("drag-disabled", !ok);
      });
    } else {
      id("inventory")?.classList.add("drag-target-v040b");
    }
  }

  function beginGearDragV040b(e) {
    if (!gearDragV040b || gearDragV040b.active) return;
    gearDragV040b.active = true;
    document.body.classList.add("gear-dragging-v040b");
    gearDragV040b.ghost = createGearGhostV040b(gearDragV040b.payload, e.clientX, e.clientY);
    highlightGearTargetsV040b(gearDragV040b.payload);
  }

  function finishGearDragV040b(e) {
    if (!gearDragV040b || gearDragV040b.pointerId !== e.pointerId) return;
    const payload = gearDragV040b.payload;
    const wasActive = gearDragV040b.active;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    cleanGearDragV040b();

    if (!wasActive) {
      if (payload.source === "inventory") {
        UI.showGearDetails?.(payload.gear, "inventory");
        UI.highlightGear?.(payload.id);
      } else {
        UI.showGearDetails?.(payload.gear, "equipped");
        UI.highlightGear?.(payload.id);
      }
      return;
    }

    const slotBtn = target?.closest?.(".gear-slot");
    const inv = target?.closest?.("#inventory");
    if (payload.source === "inventory" && slotBtn && slotBtn.dataset.slot === payload.slot) {
      UI.equipGear?.(payload.id);
    } else if (payload.source === "equipped" && inv) {
      UI.unequipGear?.(payload.slot);
    } else {
      UI.renderGear?.();
    }
  }

  function installGearDragV040b() {
    if (UI.__v040bGearDragInstalled) return;
    UI.__v040bGearDragInstalled = true;
    document.addEventListener("pointerdown", e => {
      const gearPanel = e.target.closest?.("#gear");
      if (!gearPanel || gearPanel.classList.contains("hidden")) return;
      const payload = gearPayloadFromTargetV040b(e.target);
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      gearDragV040b = { pointerId:e.pointerId, payload, startX:e.clientX, startY:e.clientY, active:false, ghost:null };
      try { e.target.setPointerCapture?.(e.pointerId); } catch (_) {}
    }, { passive:false });
    document.addEventListener("pointermove", e => {
      if (!gearDragV040b || gearDragV040b.pointerId !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - gearDragV040b.startX, e.clientY - gearDragV040b.startY);
      if (moved > 9) beginGearDragV040b(e);
      if (gearDragV040b.active) { e.preventDefault(); e.stopPropagation(); moveGearGhostV040b(e.clientX, e.clientY); }
    }, { passive:false });
    document.addEventListener("pointerup", e => {
      if (!gearDragV040b || gearDragV040b.pointerId !== e.pointerId) return;
      e.preventDefault(); e.stopPropagation(); finishGearDragV040b(e);
    }, { passive:false });
    document.addEventListener("pointercancel", e => { if (gearDragV040b && gearDragV040b.pointerId === e.pointerId) cleanGearDragV040b(); }, { passive:true });
    window.addEventListener("blur", cleanGearDragV040b);
    document.addEventListener("visibilitychange", () => { if (document.hidden) cleanGearDragV040b(); });
  }

  const renderGearBeforeV040b = UI.renderGear?.bind(UI);
  UI.renderGear = function renderGearV040b(...args) {
    const result = renderGearBeforeV040b ? renderGearBeforeV040b(...args) : undefined;
    installGearDragV040b();
    return result;
  };

  const openBeforeV040b = UI.open?.bind(UI);
  UI.open = function openV040b(panel, ...args) {
    cleanGearDragV040b();
    const result = openBeforeV040b ? openBeforeV040b(panel, ...args) : undefined;
    if (panel === "gear") setTimeout(installGearDragV040b, 0);
    return result;
  };

  patchUI();
  patchGame();
  installGearDragV040b();
  window.CHERRIFT_V040 = { version: VERSION, stages: STAGES, enemies: ENEMIES, css:"clean-v040b" };
})();


/* ============================================================
   CHERRIFT v0.4.0c HOTFIX
   - Stronger PC zoom with full drawWorld override
   - Level-up modal visibility fix
   - Gear drag v040c captures old drag listeners and handles empty inventory
   ============================================================ */
(() => {
  "use strict";

  if (!window.UI || !window.CherriftGame) return;

  const id = name => document.getElementById(name);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = "0.4.0c-hotfix";
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = "0.4.0c-hotfix";

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function isMobileLike() {
    const w = window.visualViewport?.width || window.innerWidth || 0;
    const h = window.visualViewport?.height || window.innerHeight || 0;
    return Math.min(w, h) <= 820;
  }

  function zoomV040c(game) {
    const mobile = isMobileLike();
    const w = window.visualViewport?.width || window.innerWidth || game.w || 1280;
    const h = window.visualViewport?.height || window.innerHeight || game.h || 720;
    const portrait = h >= w;
    const setting = +(UI?.save?.settings?.viewZoom || 1);

    if (mobile && portrait && !isFullscreen()) return 0.84 * setting;
    if (mobile && portrait && isFullscreen()) return 0.78 * setting;
    if (mobile && !portrait && !isFullscreen()) return 0.76 * setting;
    if (mobile && !portrait && isFullscreen()) return 0.72 * setting;

    if (isFullscreen()) return 1.34 * setting;
    return 1.42 * setting;
  }

  CherriftGame.prototype.drawWorld = function drawWorldV040c(c) {
    c.fillStyle = "#1f7d45";
    c.fillRect(0, 0, this.w, this.h);
    this.zoom = zoomV040c(this);
    const zoom = this.zoom;

    c.save();
    c.translate(this.w / 2, this.h / 2);
    c.scale(zoom, zoom);
    c.translate(-this.camera.x, -this.camera.y);

    this.drawGround(c, zoom);

    const groundDecor = (this.obstacles || []).filter(o => o.kind === "flowers" || o.kind === "mushroom");
    const solidDecor = (this.obstacles || []).filter(o => !(o.kind === "flowers" || o.kind === "mushroom"));
    for (const o of groundDecor) this.drawObstacle(c, o);

    const drawables = [
      ...solidDecor,
      ...(this.pickups || []),
      ...(this.enemies || []),
      ...(this.player ? [this.player] : []),
      ...(this.bullets || []),
      ...(this.effects || [])
    ];
    drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
    for (const o of drawables) this.drawObj(c, o);

    c.restore();
  };

  const startBeforeV040c = CherriftGame.prototype.start;
  if (!CherriftGame.prototype.__v040cStartPatch) {
    CherriftGame.prototype.start = async function startV040c(...args) {
      const result = await startBeforeV040c.apply(this, args);
      setTimeout(() => {
        this.zoom = zoomV040c(this);
        try { this.resize?.(); this.render?.(); } catch (_) {}
      }, 200);
      return result;
    };
    CherriftGame.prototype.__v040cStartPatch = true;
  }

  ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange"].forEach(ev => {
    window.addEventListener(ev, () => setTimeout(() => {
      if (UI?.game) {
        UI.game.zoom = zoomV040c(UI.game);
        try { UI.game.resize?.(); UI.game.render?.(); } catch (_) {}
      }
    }, 140), { passive: true });
  });

  const showLevelBeforeV040c = UI.showLevelUp?.bind(UI);
  UI.showLevelUp = function showLevelUpV040c(game) {
    document.body.classList.add("is-levelup");
    const result = showLevelBeforeV040c ? showLevelBeforeV040c(game) : undefined;
    id("levelModal")?.classList.remove("hidden");
    return result;
  };

  const hideLevelBeforeV040c = UI.hideLevelUp?.bind(UI);
  UI.hideLevelUp = function hideLevelUpV040c(...args) {
    document.body.classList.remove("is-levelup");
    return hideLevelBeforeV040c ? hideLevelBeforeV040c(...args) : undefined;
  };

  const applyBeforeV040c = CherriftGame.prototype.applyUpgrade;
  CherriftGame.prototype.applyUpgrade = function applyUpgradeV040c(up) {
    const result = applyBeforeV040c.call(this, up);
    document.body.classList.remove("is-levelup");
    this.mode = "playing";
    return result;
  };

  let drag = null;
  let suppressClickUntil = 0;

  function cleanDragV040c() {
    drag = null;
    document.body.classList.remove("gear-dragging-v040a", "gear-dragging-v040b", "gear-dragging-v040c");
    id("inventory")?.classList.remove("drag-target-v040a", "drag-target-v040b", "drag-target-v040c");
    qa(".inventory-panel").forEach(el => el.classList.remove("drag-target-v040c"));
    qa(".gear-slot").forEach(el => {
      el.classList.remove("drag-eligible", "drag-disabled", "drag-eligible-v040c", "drag-disabled-v040c");
    });
    qa(".drag-ghost,.drag-ghost-v040a,.drag-ghost-v040b,.drag-ghost-v040c").forEach(el => el.remove());
  }

  function payloadFromTarget(target) {
    const item = target.closest?.(".inv-item");
    if (item) {
      const gear = UI.save?.inventory?.find(g => g.id === item.dataset.gearId);
      if (!gear) return null;
      return { source: "inventory", gear, id: gear.id, slot: gear.slot, emoji: UI.gearEmoji?.(gear) || "💠" };
    }

    const slot = target.closest?.(".gear-slot");
    if (slot && slot.dataset.gearId) {
      const gear = UI.save?.equipped?.[slot.dataset.slot];
      if (!gear) return null;
      return { source: "equipped", gear, id: gear.id, slot: gear.slot, emoji: UI.gearEmoji?.(gear) || "💠" };
    }

    return null;
  }

  function moveGhost(x, y) {
    if (!drag?.ghost) return;
    drag.ghost.style.transform = `translate(${Math.round(x - 36)}px, ${Math.round(y - 36)}px)`;
  }

  function beginDrag(e) {
    if (!drag || drag.active) return;
    drag.active = true;
    document.body.classList.add("gear-dragging-v040c");

    const ghost = document.createElement("div");
    ghost.className = "drag-ghost-v040c";
    ghost.innerHTML = `<span>${drag.payload.emoji}</span>`;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    moveGhost(e.clientX, e.clientY);

    if (drag.payload.source === "inventory") {
      qa(".gear-slot").forEach(el => {
        const ok = el.dataset.slot === drag.payload.slot;
        el.classList.toggle("drag-eligible-v040c", ok);
        el.classList.toggle("drag-disabled-v040c", !ok);
      });
    } else {
      id("inventory")?.classList.add("drag-target-v040c");
      qa(".inventory-panel").forEach(el => el.classList.add("drag-target-v040c"));
    }
  }

  function finishDrag(e) {
    if (!drag || drag.pointerId !== e.pointerId) return;

    const payload = drag.payload;
    const wasActive = drag.active;
    const target = document.elementFromPoint(e.clientX, e.clientY);

    cleanDragV040c();

    if (!wasActive) {
      if (payload.source === "inventory") {
        UI.showGearDetails?.(payload.gear, "inventory");
        UI.highlightGear?.(payload.id);
      } else {
        UI.showGearDetails?.(payload.gear, "equipped");
        UI.highlightGear?.(payload.id);
      }
      return;
    }

    suppressClickUntil = Date.now() + 350;

    const slotBtn = target?.closest?.(".gear-slot");
    const inventoryDrop = target?.closest?.("#inventory,.inventory-grid,.inventory-panel");

    if (payload.source === "inventory" && slotBtn && slotBtn.dataset.slot === payload.slot) {
      UI.equipGear?.(payload.id);
    } else if (payload.source === "equipped" && inventoryDrop) {
      UI.unequipGear?.(payload.slot);
    } else {
      UI.renderGear?.();
    }
  }

  function installGearDragV040c() {
    if (UI.__v040cGearDragInstalled) return;
    UI.__v040cGearDragInstalled = true;

    document.addEventListener("pointerdown", e => {
      const gearPanel = e.target.closest?.("#gear");
      if (!gearPanel || gearPanel.classList.contains("hidden")) return;

      const payload = payloadFromTarget(e.target);
      if (!payload) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      drag = {
        pointerId: e.pointerId,
        payload,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        ghost: null
      };

      try { e.target.setPointerCapture?.(e.pointerId); } catch (_) {}
    }, true);

    document.addEventListener("pointermove", e => {
      if (!drag || drag.pointerId !== e.pointerId) return;

      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (moved > 9) beginDrag(e);

      if (drag.active) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moveGhost(e.clientX, e.clientY);
      }
    }, true);

    document.addEventListener("pointerup", e => {
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      finishDrag(e);
    }, true);

    document.addEventListener("pointercancel", e => {
      if (drag && drag.pointerId === e.pointerId) cleanDragV040c();
    }, true);

    document.addEventListener("click", e => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    window.addEventListener("blur", cleanDragV040c);
    document.addEventListener("visibilitychange", () => { if (document.hidden) cleanDragV040c(); });
  }

  const renderGearBeforeV040c = UI.renderGear?.bind(UI);
  UI.renderGear = function renderGearV040c(...args) {
    const result = renderGearBeforeV040c ? renderGearBeforeV040c(...args) : undefined;
    installGearDragV040c();
    return result;
  };

  const openBeforeV040c = UI.open?.bind(UI);
  UI.open = function openV040c(panel, ...args) {
    cleanDragV040c();
    const result = openBeforeV040c ? openBeforeV040c(panel, ...args) : undefined;
    if (panel === "gear") setTimeout(installGearDragV040c, 0);
    return result;
  };

  const refreshBeforeV040c = UI.refreshMenu?.bind(UI);
  UI.refreshMenu = function refreshMenuV040c(...args) {
    const result = refreshBeforeV040c ? refreshBeforeV040c(...args) : undefined;
    const build = id("menuBuildVersion");
    if (build) build.textContent = "v0.4.0c HOTFIX";
    return result;
  };

  installGearDragV040c();
})();
