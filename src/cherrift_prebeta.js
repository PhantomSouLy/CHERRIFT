(() => {
  "use strict";
  if (window.__CHERRIFT_PREBETA_095__) return;
  window.__CHERRIFT_PREBETA_095__ = true;

  const VERSION = "0.9.5-prebeta.1";
  const B = window.CHERRIFT_BALANCE;
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => [...(root?.querySelectorAll?.(selector) || [])];
  const n = value => Math.max(0, Math.floor(Number(value) || 0));
  const clone = value => { try { return structuredClone(value); } catch (_) { return JSON.parse(JSON.stringify(value)); } };
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const state = { entitlements:{}, socialTab:"friends", socialRows:[], ranking:[], frameSelection:null, patched:false, ready:false };
  const GM_TITLE_IDS = new Set(["gm","senior_gm","head_gm"]);

  function dayKey(date = new Date()) { return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`; }
  function stages() { return window.CHERRIFT_V040?.stages || []; }
  function stageWorld(stage) { return n(stage?.world) || n(String(stage?.id || "").match(/world_(\d+)/)?.[1]) || 1; }
  function stageIndex(stage) { return n(stage?.index) || n(String(stage?.id || "").match(/_(\d+)$/)?.[1]) || 1; }
  function worldStages(world) { return stages().filter(stage => stageWorld(stage) === Number(world) && !stage.training).sort((a,b)=>stageIndex(a)-stageIndex(b)); }
  function stars(save, stageId) { return Math.min(3, n(save?.stageStars?.[stageId] || save?.stageStats?.[stageId]?.stars)); }
  function cleared(save, stageId) { return !!(save?.clearedStages?.[stageId] || save?.stageStats?.[stageId]?.clears || stars(save,stageId)); }
  function convertLegacyChestReward(reward = {}) {
    const converted={...reward,chests:{...(reward.chests||{})}};
    if(n(reward.keys))converted.chests.common=n(converted.chests.common)+n(reward.keys);
    delete converted.keys;
    if(!Object.values(converted.chests).some(n))delete converted.chests;
    return converted;
  }

  function entitlementMap(save) { return {...(save?.prebeta?.entitlements || {}), ...state.entitlements}; }
  function hasEntitlement(name, save = window.UI?.save) {
    const rights = entitlementMap(save);
    return !!(rights.owner || rights.allContent || rights[name]);
  }

  function activeTitleId(save) {
    return String(save?.profile?.activeTitle || save?.activeTitle || save?.selectedTitle || "");
  }

  function hasActiveGmAccess(save = window.UI?.save) {
    return !!save && GM_TITLE_IDS.has(activeTitleId(save)) && (save.ownedTitles || []).includes(activeTitleId(save));
  }

  function syncGmAccess(save) {
    if (!save || typeof save !== "object") return false;
    save.prebeta ||= {};
    const active = hasActiveGmAccess(save);
    if (active) {
      if (!save.prebeta.gmAccessActive) {
        save.prebeta.gmAccessBackup = {
          unlockedSkins:[...(save.unlockedSkins || [])],
          unlockedStages:[...(save.unlockedStages || [])],
          selectedSkin:save.selectedSkin || "cherry_default",
          selectedStageId:save.selectedStageId || "world_1_1"
        };
      }
      save.prebeta.gmAccessActive = true;
      const skinIds = (window.CHERRIFT_DATA?.skins || []).map(skin=>skin.id).filter(Boolean);
      const stageIds = stages().map(stage=>stage.id).filter(Boolean);
      save.unlockedSkins = [...new Set([...(save.unlockedSkins || []),...skinIds])];
      save.unlockedStages = [...new Set([...(save.unlockedStages || []),...stageIds])];
      return true;
    }
    if (save.prebeta.gmAccessActive && save.prebeta.gmAccessBackup) {
      const backup = save.prebeta.gmAccessBackup;
      save.unlockedSkins = [...new Set(backup.unlockedSkins || ["cherry_default"])];
      save.unlockedStages = [...new Set(backup.unlockedStages || ["world_1_1"])];
      save.selectedSkin = save.unlockedSkins.includes(backup.selectedSkin) ? backup.selectedSkin : "cherry_default";
      save.selectedStageId = save.unlockedStages.includes(backup.selectedStageId) ? backup.selectedStageId : "world_1_1";
      delete save.prebeta.gmAccessBackup;
    }
    save.prebeta.gmAccessActive = false;
    return false;
  }

  function normalizeMaterials(save) {
    save.bag ||= {};
    save.bag.materials ||= {};
    const material = save.bag.materials;
    material.stones ||= {};
    material.slotCores ||= {};
    material.gearScrap = n(material.gearScrap);
    for (const key of ["copper","silver","iron","steel","royal","magical"]) material.stones[key] = n(material.stones[key]);
    if (!save.prebeta.materialsMigrated) {
      const legacy = save.arsenal?.materials || {};
      material.stones.copper = Math.max(material.stones.copper, n(legacy.copper));
      material.stones.silver = Math.max(material.stones.silver, n(legacy.silver));
      material.gearScrap = Math.max(material.gearScrap, n(legacy.scrap || legacy.gearScrap));
      save.prebeta.materialsMigrated = true;
    }
  }

  function starterSave(save) {
    save.coins = B?.currencies.coins.starter ?? 500;
    save.blossomGems = 0; save.bloomGems = 0; save.sakuraEssence = 0; save.heartTokens = 0;
    save.keys = 0; save.chests = {common:3,rare:0,epic:0};
    save.selectedSkin = "cherry_default"; save.unlockedSkins = ["cherry_default"];
    save.inventory = []; save.equipped = {};
    save.unlockedStages = ["world_1_1"]; save.clearedStages = {}; save.stageStars = {}; save.stageStats = {}; save.firstClearClaimed = {};
    save.selectedStageId = "world_1_1";
    // A level-1 account has already earned the point that belongs to level 1.
    // This is deliberately applied only while creating a starter save, so an
    // existing tester/GM save is never reset or granted duplicate points.
    save.account ||= {}; Object.assign(save.account,{
      level:1,xp:0,totalXp:0,skillPoints:1,manualV052:true,
      tree:{power:0,vitality:0,haste:0,fortune:0},skillTreeV082Migrated:true
    });
    save.account.skillTreeV082 = {ranks:{}};
    save.stats = {...(save.stats || {}),kills:0,clears:0,runs:0,coinsEarned:0,loginDays:0};
    save.profile ||= {}; save.profile.activeTitle = ""; save.profile.frameId = "frame0lvl";
    save.ownedTitles = []; save.energy = B?.energy.starterMax || 50;
    save.energyState = {max:B?.energy.starterMax||50,lastTick:Date.now(),refills:{day:dayKey(),coins:0,bloomGems:0,ad:0},drinks:{small:0,standard:0,large:0}};
    normalizeMaterials(save); save.bag.materials.gearScrap = 0; save.bag.materials.stones.copper = 0; save.bag.materials.stones.silver = 0;
    if (save.arsenal?.slots) for (const slot of Object.values(save.arsenal.slots)) Object.assign(slot,{level:1,stars:1,salvageCount:0});
    save.prebeta.isStarter = true;
    return save;
  }

  function normalizeSave(save, options = {}) {
    if (!save || typeof save !== "object") save = {};
    save.prebeta ||= {};
    save.prebeta.schema = B?.saveSchema || "prebeta-1";
    save.prebeta.version = VERSION;
    if (options.starter && !save.prebeta.starterCreated) {
      starterSave(save);
      save.prebeta.starterCreated = true;
    }
    save.account ||= {level:1,xp:0,totalXp:0,skillPoints:0};
    save.account.level = Math.max(1,n(save.account.level));
    save.unlockedSkins = Array.isArray(save.unlockedSkins) ? [...new Set(save.unlockedSkins)] : ["cherry_default"];
    if (!save.unlockedSkins.includes("cherry_default")) save.unlockedSkins.unshift("cherry_default");
    save.unlockedStages = Array.isArray(save.unlockedStages) ? [...new Set(save.unlockedStages)] : ["world_1_1"];
    save.clearedStages ||= {}; save.stageStars ||= {}; save.stageStats ||= {}; save.firstClearClaimed ||= {};
    save.chests = {...{common:0,rare:0,epic:0},...(save.chests || {})};
    save.bloomGems = Math.max(n(save.bloomGems), n(save.blossomGems));
    save.blossomGems = save.bloomGems;
    save.sakuraEssence = n(save.sakuraEssence); save.heartTokens = n(save.heartTokens);
    save.profile ||= {}; save.profile.frameId ||= "frame0lvl";
    save.energyState ||= {max:B?.energy.starterMax||50,lastTick:Date.now(),refills:{day:dayKey(),coins:0,bloomGems:0,ad:0},drinks:{small:0,standard:0,large:0}};
    save.energyState.max = Math.max(B?.energy.starterMax||50,n(save.energyState.max));
    save.energyState.lastTick ||= Date.now(); save.energyState.drinks ||= {small:0,standard:0,large:0};
    save.energyState.refills ||= {day:dayKey(),coins:0,bloomGems:0,ad:0};
    save.energy = Number.isFinite(Number(save.energy)) ? n(save.energy) : save.energyState.max;
    save.economy ||= {}; save.economy.lifetimeCoinsEarned = Math.max(n(save.economy.lifetimeCoinsEarned),n(save.stats?.coinsEarned));
    save.economy.bestWeeklyRank = n(save.economy.bestWeeklyRank); save.economy.activePlayers = n(save.economy.activePlayers);
    normalizeMaterials(save);
    save.ownedTitles = Array.isArray(save.ownedTitles) ? [...new Set(save.ownedTitles)] : [];
    syncGmAccess(save);
    save.titleRewardsClaimed = Array.isArray(save.titleRewardsClaimed) ? save.titleRewardsClaimed : [];
    if (save.arsenal?.slots) for (const slot of Object.values(save.arsenal.slots)) {
      slot.level = Math.min(B?.arsenal.maxLevel||30,Math.max(1,n(slot.level)));
      slot.stars = slot.level <= 10 ? 1 : slot.level <= 20 ? 2 : 3;
    }
    refreshEnergy(save); evaluateTitles(save);
    save.power=calculatePower(save);
    return save;
  }

  function patchStorage() {
    const storage = window.CherriftStorage;
    if (!storage || storage.__prebeta095) return;
    const baseDefaults = storage.defaults.bind(storage), baseLoad = storage.load.bind(storage), baseSave = storage.save.bind(storage);
    let lastCoins = null;
    storage.defaults = () => {
      const value=normalizeSave(baseDefaults(), {starter:true});
      lastCoins=n(value.coins);
      return value;
    };
    storage.load = () => {
      let existing = false;
      try { existing = !!localStorage.getItem(storage.key); } catch (_) {}
      const loaded=normalizeSave(baseLoad());
      if (!existing) { starterSave(loaded); loaded.prebeta.starterCreated=true; }
      const value=normalizeSave(loaded);
      lastCoins=n(value.coins);
      return value;
    };
    storage.save = value => {
      value=normalizeSave(value);
      const current=n(value.coins);
      if(lastCoins!==null&&current>lastCoins){
        const rawGain=current-lastCoins;
        // Storage cannot know whether a reward came from a stage, login,
        // mail, event or chest. Track lifetime earnings here, but apply title
        // Coin bonuses only in the two explicitly eligible gameplay paths.
        value.economy.lifetimeCoinsEarned=n(value.economy.lifetimeCoinsEarned)+rawGain;
      }
      lastCoins=n(value.coins);
      return baseSave(value);
    };
    storage.__prebeta095 = true;
  }

  function refreshEnergy(save = window.UI?.save, now = Date.now()) {
    if (!save?.energyState) return save;
    const energy = B?.energy || {naturalPerHour:5};
    const max = n(save.energyState.max); const current = n(save.energy);
    if (current < max) {
      const steps = Math.floor((now - Number(save.energyState.lastTick || now)) / 3600000);
      if (steps > 0) {
        save.energy = Math.min(max,current + steps * energy.naturalPerHour);
        save.energyState.lastTick += steps * 3600000;
      }
    } else save.energyState.lastTick = now;
    if (save.energyState.refills.day !== dayKey(new Date(now))) {
      save.energy=Math.max(n(save.energy),max);
      save.energyState.refills = {day:dayKey(new Date(now)),coins:0,bloomGems:0,ad:0};
      save.energyState.lastTick=now;
    }
    return save;
  }

  function isWorldUnlocked(world, save = window.UI?.save) {
    save = normalizeSave(save || {});
    const number = Number(world);
    if (hasActiveGmAccess(save)) return number >= 0;
    if (hasEntitlement("allContent",save)) return number >= 0 && number <= 6;
    // The Test Map is an active staff tool, not an account entitlement.
    // Owning a GM title is not enough: it has to be equipped.
    if (number === 0) return hasActiveGmAccess(save);
    if (number === 1) return true;
    const config = B?.worlds?.[number];
    if (!config || save.account.level < config.unlockLevel) return false;
    const previous = worldStages(number - 1);
    return previous.length === 5 && previous.every(stage => stars(save,stage.id) >= 1);
  }

  function isStageUnlocked(stage, save = window.UI?.save) {
    if (!stage) return false;
    save = normalizeSave(save || {});
    if (hasActiveGmAccess(save)) return true;
    if (stage.training) return hasActiveGmAccess(save);
    if (hasEntitlement("allContent",save)) return true;
    if (!isWorldUnlocked(stageWorld(stage),save)) return false;
    const index = stageIndex(stage);
    if (index <= 1) return true;
    const previous = worldStages(stageWorld(stage)).find(entry => stageIndex(entry) === index - 1);
    return !!previous && stars(save,previous.id) >= 1;
  }

  function installPlaceholderStages() {
    const list = stages();
    if (!list.length) return;
    const xpWeights = [0.13,0.16,0.19,0.23,0.29];
    const stageXp = (world,index) => {
      const config=B.worlds?.[world];
      if(!config) return 0;
      let budget=0;
      for(let level=config.unlockLevel;level<config.completionLevel;level++) budget+=B.xpToNext(level);
      return Math.round(budget*xpWeights[index-1]);
    };
    for (const stage of list) {
      const world=stageWorld(stage),index=stageIndex(stage),rewards=B.stageRewards?.[world];
      if (!stage.training && rewards && index>=1 && index<=5) {
        stage.repeatReward=convertLegacyChestReward({...(stage.repeatReward||{}),coins:rewards.repeat[index-1]});
        stage.firstClearReward=convertLegacyChestReward({...(stage.firstClearReward||{}),coins:rewards.first[index-1]});
        stage.accountXp=stageXp(world,index);
      }
    }
    const titles = {5:["Dune Gate","Glass Sands","Sunken Temple","Heat Mirage","Desert Crown"],6:["Broken Causeway","Echo Hall","Ancient Garden","Moon Ruins","Last Reliquary"]};
    for (const world of [5,6]) for (let index=1;index<=5;index++) {
      const rewards = B.stageRewards[world];
      const killTargets={5:[260,285,310,340,370],6:[300,330,360,390,430]};
      const stage = {id:`world_${world}_${index}`,world,index,name:`World ${world}-${index}`,title:titles[world][index-1],
        theme:world===5?"red_desert":"savanna",goalKills:killTargets[world][index-1],maxEnemies:48+index*4,
        raidEvery:44+index*3,raidCount:20+index*3,enemyPool:["pink_slime","green_slime","blue_slime","big_slime","spider","beetle","crawler","moth"],
        repeatReward:{coins:rewards.repeat[index-1]},firstClearReward:{coins:rewards.first[index-1]},accountXp:stageXp(world,index),
        splash:world===5?`assets/map/world4/world4_splashart_${index<=2?1:2}.png`:`assets/map/world3/world3_splashart_${index<=2?1:index<=4?2:3}.png`,
        placeholder:true,desc:"Pre-beta placeholder chapter; artwork can be replaced without changing progression."};
      const current = list.find(entry => entry.id === stage.id); if (current) Object.assign(current,stage); else list.push(stage);
    }
    list.sort((a,b)=>Number(a.world)-Number(b.world)||Number(a.index)-Number(b.index));
  }

  function titleRequirement(save, title) {
    const r = title.requirement || {};
    if (title.postBeta || title.hidden || (title.gatedByActivePlayers && n(save.economy?.activePlayers) < title.gatedByActivePlayers)) return false;
    if (r.type === "level") return save.account.level >= r.value;
    if (r.type === "worldStars") { const list=worldStages(r.world); return list.length===5 && list.every(stage=>stars(save,stage.id)>=3); }
    if (r.type === "lifetimeCoins") return Math.max(n(save.economy?.lifetimeCoinsEarned),n(save.coins)) >= r.value;
    if (r.type === "allArsenal") return B.slotOrder.every(slot=>n(save.arsenal?.slots?.[slot]?.level)>=r.value);
    if (r.type === "fullGearRarity") return B.slotOrder.every(slot=>save.equipped?.[slot]?.rarity===r.value);
    if (r.type === "skins") return save.unlockedSkins.length >= r.value;
    if (r.type === "skinRarity") return save.unlockedSkins.filter(skinId=>window.CHERRIFT_DATA?.skins?.find(s=>s.id===skinId)?.rarity===r.rarity).length >= r.value;
    if (r.type === "kills") return n(save.stats?.kills) >= r.value;
    if (r.type === "loginDays") return n(save.stats?.loginDays || save.login?.days) >= r.value;
    if (r.type === "bestWeeklyRank") return n(save.economy?.bestWeeklyRank)>0 && n(save.economy.bestWeeklyRank)<=r.value;
    return false;
  }

  function evaluateTitles(save = window.UI?.save) {
    if (!save || !B) return [];
    save.ownedTitles ||= [];
    for (const title of B.titles) if (titleRequirement(save,title) && !save.ownedTitles.includes(title.id)) {
      save.ownedTitles.push(title.id);
      if (title.reward && !save.titleRewardsClaimed.includes(title.id)) {
        if (title.reward.bloomGems) { save.bloomGems=n(save.bloomGems)+title.reward.bloomGems; save.blossomGems=save.bloomGems; }
        save.titleRewardsClaimed.push(title.id);
      }
    }
    return save.ownedTitles;
  }

  function titleStats(save = window.UI?.save) {
    const total = {maxHp:0,damage:0,allStats:0,coinGain:0,chestLuck:0};
    for (const title of B.titles.filter(entry=>save?.ownedTitles?.includes(entry.id))) for (const [key,value] of Object.entries(title.stats||{})) total[key]=(total[key]||0)+Number(value||0);
    return total;
  }

  function calculatePower(save = window.UI?.save) {
    if (!save) return 0;
    const items=Object.values(save.equipped||{}).filter(Boolean);
    const gearPower=items.reduce((sum,item)=>sum+(window.CHERRIFT_V050?.itemPower?.(item)||Object.values(item.stats||{}).reduce((a,b)=>a+Number(b||0),0)),0);
    const arsenal=items.reduce((sum,item)=>{const level=n(save.arsenal?.slots?.[item.slot]?.level)||1;return sum+gearPower/items.length*Math.max(0,level-1)*(B.arsenal.levelMultiplier||.025);},0);
    const title=titleStats(save);
    return Math.max(100,Math.round(100+gearPower+arsenal+(n(save.account?.level)-1)*12+title.damage*4+title.maxHp*.6+title.allStats*12));
  }

  function ownedFrames(save = window.UI?.save) {
    const level=n(save?.account?.level); const best=n(save?.economy?.bestWeeklyRank); const active=n(save?.economy?.activePlayers); const rights=entitlementMap(save);
    return B.frames.filter(frame=>{ const r=frame.requirement||{}; return r.type==="default"||(r.type==="level"&&level>=r.value)||(r.type==="bestWeeklyRank"&&active>=100&&best>0&&best<=r.value)||(r.type==="entitlement"&&!!rights[r.value])||rights.allFrames; }).map(frame=>frame.id);
  }

  function startRunAllowed(game) {
    const stage = game.getSelectedStage?.() || stages().find(entry=>entry.id===game.save?.selectedStageId);
    if (!isStageUnlocked(stage,game.save)) { window.UI?.toast?.("Ez a pálya még nincs feloldva."); return false; }
    refreshEnergy(game.save);
    const cost = stage?.training ? 0 : B.energy.stageCost;
    if (n(game.save.energy) < cost) { window.UI?.toast?.("Nincs elég Energy. A pálya indításához 5 kell."); showEnergyModal(); return false; }
    game.__prebetaEnergy = {stageId:stage?.id,cost,committed:false};
    return true;
  }

  function commitStageEnergy(game) {
    const run=game?.__prebetaEnergy; if (!run || run.committed || run.cost<=0) return false;
    game.save.energy=Math.max(0,n(game.save.energy)-run.cost); run.committed=true;
    game.save.energyState.lastTick=Date.now();
    return true;
  }

  function patchGame() {
    const proto=window.CherriftGame?.prototype; if(!proto||proto.__prebeta095)return; proto.__prebeta095=true;
    const start=proto.start; proto.start=async function(...args){ if(!startRunAllowed(this))return false; const result=await start.apply(this,args);if(this.player){const bonus=titleStats(this.save),hpBonus=bonus.maxHp+bonus.allStats;this.player.damage+=bonus.damage+bonus.allStats;this.player.maxHp+=hpBonus;this.player.hp+=hpBonus;this.player.speed+=bonus.allStats;if(this.player.skin==="mage_cherry"&&Number.isFinite(Number(this.player.regen)))this.player.regen+=hpBonus*.005;if(Number.isFinite(Number(this.player.armor)))this.player.armor+=bonus.allStats;}return result; };
    const generate=proto.generateMap; if(generate) proto.generateMap=function(...args){ const stage=this.stage||this.getSelectedStage?.(); if(!stage||stage.world<5)return generate.apply(this,args); const world=stage.world; stage.world=world===5?4:3; try{return generate.apply(this,args);}finally{stage.world=world;} };
    const spawn=proto.spawnEnemy; if(spawn) proto.spawnEnemy=function(...args){ const before=this.enemies?.length||0,result=spawn.apply(this,args),world=B.worlds?.[stageWorld(this.stage)]||B.worlds?.[1]; for(const enemy of (this.enemies||[]).slice(before)){ const chapter=1+(stageIndex(this.stage)-1)*.09; const elite=enemy.eliteV088?1.65:1; enemy.hp*=world.hp*chapter*elite; enemy.maxHp*=world.hp*chapter*elite; enemy.speed*=world.speed; } return result; };
    const updateEnemies=proto.updateEnemies; if(updateEnemies) proto.updateEnemies=function(dt){ const hp=Number(this.player?.hp); const result=updateEnemies.call(this,dt); const lost=hp-Number(this.player?.hp); const mult=B.worlds?.[stageWorld(this.stage)]?.damage||1; if(lost>0&&this.player)this.player.hp=Math.max(0,this.player.hp-lost*(mult-1)); return result; };
    const stageClear=proto.stageClear; if(stageClear) proto.stageClear=function(...args){
      const stage=this.stage||this.getSelectedStage?.();
      const already=!!this.stageState?.cleared;
      const first=!this.save?.firstClearClaimed?.[stage?.id];
      const result=stageClear.apply(this,args);
      if(!already&&this.stageState?.cleared&&stage){
        const repeatCoins=n(stage.repeatReward?.coins);
        const titleCoinBonus=Math.floor(repeatCoins*Math.max(0,Number(titleStats(this.save).coinGain)||0));
        if(titleCoinBonus>0){
          this.save.coins=n(this.save.coins)+titleCoinBonus;
          this.runCoins=n(this.runCoins)+titleCoinBonus;
          this.__prebetaTitleStageBonus=titleCoinBonus;
        }
        this.save.chests||={common:0,rare:0,epic:0};
        const grants=[stage.repeatReward?.chests,first?stage.firstClearReward?.chests:null].filter(Boolean);
        for(const reward of grants)for(const tier of ["common","rare","epic"])this.save.chests[tier]=n(this.save.chests[tier])+n(reward[tier]);
        CherriftStorage.save(this.save);
      }
      return result;
    };
  }

  function dismantleReward(rarity) { return B.gear.dismantle[rarity] || B.gear.dismantle.Common; }
  function dismantleSelected(ids) {
    const save=normalizeSave(window.UI.save),selected=new Set(ids),items=(save.inventory||[]).filter(item=>selected.has(String(item.id))&&!item.locked);
    if(!items.length)return false;
    let scrap=0,copper=0,silver=0;
    for(const item of items){const reward=dismantleReward(item.rarity);scrap+=reward.scrap;copper+=reward.copper||0;silver+=reward.silver||0;if(reward.silverChance&&Math.random()<reward.silverChance)silver++;}
    save.inventory=save.inventory.filter(item=>!selected.has(String(item.id))||item.locked);
    save.bag.materials.gearScrap+=scrap;save.bag.materials.stones.copper+=copper;save.bag.materials.stones.silver+=silver;
    window.CherriftStorage.save(save);window.UI.renderGear?.();window.UI.refreshMenu?.();window.UI.toast?.(`Betörve: +${scrap} Scrap${copper?` · +${copper} Copper`:""}${silver?` · +${silver} Silver`:""}`);return true;
  }

  function showEnergyModal(){
    let modal=id("prebetaEnergyModal"); if(!modal){modal=document.createElement("section");modal.id="prebetaEnergyModal";modal.className="prebeta-frame-modal hidden";document.body.appendChild(modal);}
    const save=normalizeSave(window.UI.save); modal.innerHTML=`<article class="prebeta-frame-dialog prebeta-card"><header><h2>Energy</h2><button class="prebeta-button" data-prebeta-close>×</button></header><p><b>${save.energy}/${save.energyState.max}</b> · óránként +${B.energy.naturalPerHour}</p><div class="prebeta-energy-refill"><article class="prebeta-card"><h3>Coin refill</h3><p>+${B.energy.refills.coins.amount} Energy · ${B.energy.refills.coins.cost} Coin</p><button class="prebeta-button primary" data-prebeta-refill="coins">Refill</button></article><article class="prebeta-card"><h3>Bloom Gem refill</h3><p>+${B.energy.refills.bloomGems.amount} Energy · ${B.energy.refills.bloomGems.cost} Gem</p><button class="prebeta-button primary" data-prebeta-refill="bloomGems">Refill</button></article>${Object.entries(B.energy.drinks).map(([key,amount])=>`<article class="prebeta-card"><h3>${key} Energy Drink</h3><p>+${amount} Energy · Owned ${n(save.energyState.drinks[key])}</p><button class="prebeta-button" data-prebeta-drink="${key}" ${n(save.energyState.drinks[key])<1?"disabled":""}>Use</button></article>`).join("")}</div></article>`;modal.classList.remove("hidden");
  }

  function refillEnergy(type){const save=normalizeSave(window.UI.save),def=B.energy.refills[type],used=n(save.energyState.refills[type]);if(!def||used>=def.dailyLimit)return UI.toast?.("A napi refill limit elfogyott.");if(type==="coins"&&save.coins<def.cost)return UI.toast?.("Nincs elég Coin.");if(type==="bloomGems"&&save.bloomGems<def.cost)return UI.toast?.("Nincs elég Bloom Gem.");if(type==="coins")save.coins-=def.cost;else{save.bloomGems-=def.cost;save.blossomGems=save.bloomGems;}save.energy=Math.min(B.energy.manualOvercap,save.energy+def.amount);save.energyState.refills[type]=used+1;CherriftStorage.save(save);UI.refreshMenu?.();showEnergyModal();}
  function useEnergyDrink(type){const save=normalizeSave(window.UI.save),amount=B.energy.drinks[type];if(!amount||n(save.energyState.drinks[type])<1)return;save.energyState.drinks[type]--;save.energy=Math.min(B.energy.manualOvercap,save.energy+amount);CherriftStorage.save(save);UI.refreshMenu?.();showEnergyModal();}

  function avatarMarkup(profile,size="") { const frame=B.frames.find(entry=>entry.id===(profile?.frame_id||profile?.frameId||"frame0lvl"))||B.frames[0]; const image=profile?.avatar_url||profile?.avatarUrl||"assets/player/skins/base_cherry/base_cherry_splashart.png"; return `<span class="prebeta-avatar ${size}"><img src="${escapeHtml(image)}" alt=""><img class="prebeta-avatar-frame" src="${escapeHtml(frame.asset)}" alt=""></span>`; }
  function accountAvatar(fallback=""){const account=window.CHERRIFT_AUTH?.getState?.().account||{};return account.avatar||account.avatarUrl||account.avatar_url||fallback;}

  function showFrameModal(selection=null){const save=normalizeSave(UI.save),owned=new Set(ownedFrames(save));state.frameSelection=selection||save.profile.frameId;let modal=id("prebetaFrameModal");if(!modal){modal=document.createElement("section");modal.id="prebetaFrameModal";modal.className="prebeta-frame-modal hidden";document.body.appendChild(modal);}modal.innerHTML=`<article class="prebeta-frame-dialog prebeta-card"><header><h2>Profile Frames</h2><button class="prebeta-button" data-prebeta-close>×</button></header><div class="prebeta-frame-grid">${B.frames.map(frame=>`<button class="prebeta-frame-option ${owned.has(frame.id)?"":"locked"} ${frame.id===state.frameSelection?"active":""}" ${owned.has(frame.id)?`data-prebeta-frame="${frame.id}"`:"disabled"}><img src="${frame.asset}" alt=""><span><b>${escapeHtml(frame.name)}</b><small>${owned.has(frame.id)?"Owned":"Locked"}</small></span></button>`).join("")}</div><div class="prebeta-frame-actions"><button class="prebeta-button" data-prebeta-close>Back</button><button class="prebeta-button primary" data-prebeta-frame-equip>Equip</button></div></article>`;modal.classList.remove("hidden");}
  function refreshFrameImages(){if(!window.UI?.save?.profile)return;const asset=B.frames.find(frame=>frame.id===UI.save.profile.frameId)?.asset||B.frames[0].asset;qa(".prebeta-avatar-frame").forEach(image=>{image.src=asset;});}
  function showPlayerProfile(profile){let modal=id("prebetaPlayerProfileModal");if(!modal){modal=document.createElement("section");modal.id="prebetaPlayerProfileModal";modal.className="prebeta-frame-modal hidden";document.body.appendChild(modal);}modal.innerHTML=`<article class="prebeta-frame-dialog prebeta-card prebeta-public-profile"><header><h2>Player Profile</h2><button class="prebeta-button" data-prebeta-close>×</button></header>${avatarMarkup(profile,"large")}<h3>${escapeHtml(profile?.display_name||"Cherry Player")}</h3><p>${escapeHtml(profile?.public_code||"")}</p><div><article class="prebeta-card"><small>LEVEL</small><b>${n(profile?.level)||1}</b></article><article class="prebeta-card"><small>POWER</small><b>${n(profile?.power)}</b></article><article class="prebeta-card"><small>BEST WEEKLY</small><b>${n(profile?.best_weekly_rank)?`#${n(profile.best_weekly_rank)}`:"—"}</b></article></div><button class="prebeta-button primary" data-prebeta-close>Back</button></article>`;modal.classList.remove("hidden");}

  function decorateProfile(){if(!window.UI?.save?.profile)return;const avatar=q(".profile-avatar-bf");if(avatar&&!avatar.dataset.prebeta){avatar.dataset.prebeta="1";avatar.innerHTML=avatarMarkup({avatarUrl:accountAvatar(q("img",avatar)?.src),frameId:UI.save.profile.frameId},"large");avatar.style.cursor="pointer";avatar.onclick=()=>showFrameModal();}qa(".profile-avatar-v082").forEach(node=>{if(!node.dataset.prebeta){node.dataset.prebeta="1";node.innerHTML=avatarMarkup({avatarUrl:accountAvatar(q("img",node)?.src),frameId:UI.save.profile.frameId},"large");}node.style.cursor="pointer";node.onclick=()=>showFrameModal();});qa(".mobile-profile-v0932").forEach(node=>{if(node.dataset.prebeta)return;const image=q(":scope > img",node);if(!image)return;node.dataset.prebeta="1";image.insertAdjacentHTML("beforebegin",avatarMarkup({avatarUrl:accountAvatar(image.src),frameId:UI.save.profile.frameId},"menu"));image.remove();});qa("#railProfileIconV082,#railProfileIconV060").forEach(node=>{if(q(".prebeta-avatar",node))return;node.innerHTML=avatarMarkup({avatarUrl:accountAvatar(q("img",node)?.src),frameId:UI.save.profile.frameId},"rail");});}

  function ensurePanel(panelId){let panel=id(panelId);if(!panel){panel=document.createElement("section");panel.id=panelId;panel.className="panel hidden prebeta-panel";id("app")?.appendChild(panel);}return panel;}
  function showCustom(panelId){qa("#app > section,.screen,.panel").forEach(panel=>panel.classList.toggle("hidden",panel.id!==panelId));document.body.classList.remove("is-playing");}
  function head(title){return `<div class="prebeta-shell"><header class="prebeta-head"><button class="prebeta-back" data-prebeta-open="menu" aria-label="Lobby" title="Lobby">←</button><h2>${escapeHtml(title)}</h2></header>`;}

  async function api(action,payload={}){try{return await window.CHERRIFT_LIVE_SERVICES?.invoke?.(action,payload)||{};}catch(error){UI.toast?.(`Online hiba: ${error.message}`);return {error:error.message};}}
  async function renderSocial(tab=state.socialTab){state.socialTab=tab;const panel=ensurePanel("socialV082");showCustom("socialV082");panel.innerHTML=`${head("Social")}<nav class="prebeta-social-tabs prebeta-card">${[["friends","Friends"],["requests","Requests"],["search","Search"],["blocked","Blocked"]].map(([key,label])=>`<button class="prebeta-button ${tab===key?"primary":""}" data-prebeta-social-tab="${key}">${label}</button>`).join("")}</nav><section class="prebeta-social-toolbar prebeta-card"><input id="prebetaSocialSearch" placeholder="Discord name or UUID" maxlength="80"><button class="prebeta-button primary" data-prebeta-search>Search</button></section><div id="prebetaSocialList" class="prebeta-social-list"><p class="prebeta-empty prebeta-card">Loading…</p></div></div>`;
    const action=tab==="search"?null:"friend_list";if(action){const data=await api(action,{view:tab});state.socialRows=data.players||data.friends||data.requests||data.blocked||[];renderSocialRows();}else renderSocialRows();}
  function renderSocialRows(){const root=id("prebetaSocialList");if(!root)return;root.innerHTML=state.socialRows.length?state.socialRows.map(player=>`<article class="prebeta-player-row prebeta-card">${avatarMarkup(player)}<div><h3>${escapeHtml(player.display_name||player.discord_name||"Cherry Player")}</h3><p>Lv.${n(player.level)||1} · Power ${n(player.power)} · ${escapeHtml(player.public_code||"")}</p></div><div class="prebeta-player-actions"><button class="prebeta-button" data-prebeta-view-player="${escapeHtml(player.user_id||player.id)}">Profile</button>${state.socialTab==="search"?`<button class="prebeta-button primary" data-prebeta-friend-add="${escapeHtml(player.user_id||player.id)}">Add</button>`:""}${state.socialTab==="requests"?`<button class="prebeta-button primary" data-prebeta-friend-accept="${escapeHtml(player.request_id)}">Accept</button>`:""}${state.socialTab==="friends"?`<button class="prebeta-button danger" data-prebeta-friend-delete="${escapeHtml(player.user_id||player.id)}">Delete</button>`:""}${state.socialTab==="blocked"?`<button class="prebeta-button" data-prebeta-unblock="${escapeHtml(player.user_id||player.id)}">Unblock</button>`:`<button class="prebeta-button" data-prebeta-block="${escapeHtml(player.user_id||player.id)}">Block</button>`}</div></article>`).join(""):`<p class="prebeta-empty prebeta-card">Nincs megjeleníthető játékos.</p>`;}

  async function renderRanking(){const panel=ensurePanel("rankingPrebeta");showCustom("rankingPrebeta");panel.innerHTML=`${head("Weekly Power Rank")}<p class="prebeta-ranking-note prebeta-card">A címjutalmak 100 aktív játékostól nyílnak meg. A lista hetente újraindul.</p><div id="prebetaRanking" class="prebeta-ranking-table"><p class="prebeta-empty prebeta-card">Loading…</p></div></div>`;const data=await api("ranking_list",{limit:50});state.ranking=data.ranking||[];const active=n(data.active_players);if(UI.save?.economy){UI.save.economy.activePlayers=active;evaluateTitles(UI.save);CherriftStorage.save(UI.save);}const note=q(".prebeta-ranking-note",panel);if(note)note.textContent=`Heti aktív játékosok: ${active}/100 · A ranking title-ok 100 játékostól nyílnak meg.`;const root=id("prebetaRanking");root.innerHTML=state.ranking.length?state.ranking.map((row,index)=>`<button class="prebeta-ranking-row prebeta-card" data-prebeta-view-player="${escapeHtml(row.user_id)}"><strong>#${index+1}</strong><span>${escapeHtml(row.display_name||"Cherry Player")}</span><em>${n(row.power)} POWER</em></button>`).join(""):`<p class="prebeta-empty prebeta-card">A heti ranglista még üres.</p>`;}
  function openPrebetaPanel(panel){if(panel==="socialV082"){renderSocial();return true;}if(panel==="rankingPrebeta"){renderRanking();return true;}return false;}

  function addNavigation(){const drawer=q("#mobileMenuV082 .mobile-menu-grid-v082");if(drawer&&!q('[data-prebeta-open="rankingPrebeta"]',drawer))drawer.insertAdjacentHTML("beforeend",'<button type="button" data-prebeta-open="rankingPrebeta"><i><img src="assets/player/frames/frame_rank1.png" alt=""></i><b>Ranking</b></button>');}
  function updateEnergyUi(){const save=window.UI?.save;if(!save)return;refreshEnergy(save);qa(".mobile-energy-v0932").forEach(node=>{node.classList.add("prebeta-energy-pill");node.innerHTML=`<i>⚡</i><b>${save.energy}/${save.energyState.max}</b>`;node.onclick=showEnergyModal;});const mobile=id("mobileEnergyValue");if(mobile)mobile.textContent=`${save.energy}/${save.energyState.max}`;}

  function patchUi(){if(!window.UI||state.patched)return;state.patched=true;window.CHERRIFT_TITLES=B.titles;const open=UI.open?.bind(UI);UI.open=function(panel,...args){if(panel==="socialV082"){renderSocial();return;}if(panel==="rankingPrebeta"){renderRanking();return;}const result=open?.(panel,...args);setTimeout(()=>{decorateProfile();addNavigation();updateEnergyUi();},0);return result;};const refresh=UI.refreshMenu?.bind(UI);if(refresh)UI.refreshMenu=function(...args){normalizeSave(this.save);const result=refresh(...args);setTimeout(()=>{updateEnergyUi();addNavigation();decorateProfile();},0);return result;};}

  async function bootstrapOnline(){if(!window.CHERRIFT_LIVE_SERVICES?.session?.user)return;const data=await api("bootstrap_profile",{version:VERSION});if(data.entitlements){state.entitlements=data.entitlements;UI.save.prebeta.entitlements={...data.entitlements};}if(data.profile){UI.save.profile.publicCode=data.profile.public_code;UI.save.profile.frameId=data.profile.frame_id||UI.save.profile.frameId;UI.save.economy.bestWeeklyRank=n(data.profile.best_weekly_rank);}normalizeSave(UI.save);UI.save.power=calculatePower(UI.save);CherriftStorage.save(UI.save);installPlaceholderStages();UI.refreshMenu?.();const rank=await api("ranking_submit",{power:UI.save.power,level:UI.save.account.level,frame_id:UI.save.profile.frameId});if(rank.best_weekly_rank)UI.save.economy.bestWeeklyRank=n(rank.best_weekly_rank);UI.save.economy.activePlayers=n(rank.active_players);evaluateTitles(UI.save);CherriftStorage.save(UI.save);}

  function bindCapture(){window.addEventListener("click",async event=>{const target=event.target?.closest?.("[data-prebeta-open],[data-prebeta-close],[data-prebeta-refill],[data-prebeta-drink],[data-prebeta-frame],[data-prebeta-frame-equip],[data-prebeta-social-tab],[data-prebeta-search],[data-prebeta-friend-add],[data-prebeta-friend-accept],[data-prebeta-friend-delete],[data-prebeta-block],[data-prebeta-unblock],[data-prebeta-view-player]");if(!target)return;event.preventDefault();event.stopImmediatePropagation();if(target.dataset.prebetaOpen){id("mobileMenuV082")?.classList.add("hidden");return UI.open(target.dataset.prebetaOpen);}if(target.dataset.prebetaClose!==undefined)return target.closest(".prebeta-frame-modal")?.classList.add("hidden");if(target.dataset.prebetaRefill)return refillEnergy(target.dataset.prebetaRefill);if(target.dataset.prebetaDrink)return useEnergyDrink(target.dataset.prebetaDrink);if(target.dataset.prebetaFrame)return showFrameModal(target.dataset.prebetaFrame);if(target.dataset.prebetaFrameEquip!==undefined){if(ownedFrames(UI.save).includes(state.frameSelection)){UI.save.profile.frameId=state.frameSelection;CherriftStorage.save(UI.save);await api("sync_profile",{frame_id:state.frameSelection});q("#prebetaFrameModal")?.classList.add("hidden");decorateProfile();refreshFrameImages();}return;}if(target.dataset.prebetaSocialTab)return renderSocial(target.dataset.prebetaSocialTab);if(target.dataset.prebetaSearch!==undefined){const query=String(id("prebetaSocialSearch")?.value||"").trim();if(query.length<2)return UI.toast?.("Írj be legalább 2 karaktert.");const data=await api("social_search",{query});state.socialTab="search";state.socialRows=data.players||[];return renderSocialRows();}const actions=[["prebetaFriendAdd","friend_request","target_user_id"],["prebetaFriendAccept","friend_accept","request_id"],["prebetaFriendDelete","friend_delete","target_user_id"],["prebetaBlock","block_player","target_user_id"],["prebetaUnblock","unblock_player","target_user_id"]];for(const [key,action,param]of actions)if(target.dataset[key]){await api(action,{[param]:target.dataset[key]});return renderSocial(state.socialTab);}if(target.dataset.prebetaViewPlayer){const data=await api("player_profile",{target_user_id:target.dataset.prebetaViewPlayer});if(data.profile)showPlayerProfile(data.profile);else UI.toast?.("Profil nem érhető el.");}},true);
    window.addEventListener("click",event=>{const button=event.target?.closest?.("[data-v082-bulk-sell],[data-v070-salvage]");if(!button)return;const ids=qa("[data-v0560-item-id].selected,[data-v0560-item-id][aria-selected=true]").map(card=>card.dataset.v0560ItemId);if(ids.length&&dismantleSelected(ids)){event.preventDefault();event.stopImmediatePropagation();}},true);
  }

  function start(){if(!window.UI?.save||!window.CherriftStorage)return setTimeout(start,100);patchUi();installPlaceholderStages();normalizeSave(UI.save);bindCapture();addNavigation();updateEnergyUi();decorateProfile();setInterval(()=>{if(UI.save){refreshEnergy(UI.save);updateEnergyUi();}},60000);window.CHERRIFT_LIVE_SERVICES?.onChange?.(event=>{if(event.type==="session"||event.type==="ready")bootstrapOnline();});state.ready=true;window.__CHERRIFT_PREBETA_READY__=true;window.dispatchEvent(new CustomEvent("cherrift:prebeta-ready"));bootstrapOnline();console.info(`[CHERRIFT] ${VERSION} progression, balance, energy, titles, frames, social and ranking loaded.`);}

  window.CHERRIFT_PREBETA = Object.freeze({version:VERSION,normalizeSave,refreshEnergy,isWorldUnlocked,isStageUnlocked,hasEntitlement,hasActiveGmAccess,syncGmAccess,commitStageEnergy,evaluateTitles,titleStats,calculatePower,ownedFrames,dismantleReward,showEnergyModal,open:openPrebetaPanel});
  patchStorage(); patchGame();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
