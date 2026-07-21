(() => {
"use strict";

const VERSION = "0.8.0-gacha-economy-buffs";
const DISPLAY_VERSION = "v0.8.0";
const SAVE_SCHEMA = 8;
const MAX_INVENTORY = 80;
const RARITY_INDEX = { Common:0, Uncommon:1, Rare:2, Epic:3, Legendary:4 };
const SKIN_ESSENCE = { Common:5, Rare:15, Epic:40, Legendary:100 };
const CHEST_DEFS = {
  common:{ name:"Common Chest", color:"green", pity:10, asset:"assets/items/chests/common_chest.png" },
  rare:{ name:"Rare Chest", color:"blue", pity:15, asset:"assets/items/chests/rare_chest.png" },
  epic:{ name:"Epic Chest", color:"purple", pity:25, asset:"assets/items/chests/epic_chest.png" }
};
const FOOD_CATALOG = {
  coin_cookie:{ name:"Coin Cookie", rarity:"Common", effect:"coin", value:0.05, runs:2, icon:"🍪", asset:"assets/items/food/coin_cookie.png", price:{ coins:220 } },
  lucky_sakura_tea:{ name:"Lucky Sakura Tea", rarity:"Common", effect:"chestDrop", value:0.05, runs:2, icon:"🍵", asset:"assets/items/food/lucky_sakura_tea.png", price:{ coins:260 } },
  treasure_bento:{ name:"Treasure Bento", rarity:"Rare", effect:"itemDrop", value:0.10, runs:3, icon:"🍱", asset:"assets/items/food/treasure_bento.png", price:{ gems:35 } },
  warrior_steak:{ name:"Warrior Steak", rarity:"Rare", effect:"damage", value:0.08, runs:3, icon:"🥩", asset:"assets/items/food/warrior_steak.png", price:{ coins:520 } },
  spicy_noodles:{ name:"Spicy Noodles", rarity:"Rare", effect:"attackSpeed", value:0.08, runs:3, icon:"🍜", asset:"assets/items/food/spicy_noodles.png", price:{ coins:540 } },
  cherry_cake:{ name:"Cherry Cake", rarity:"Epic", effect:"crit", value:0.06, runs:4, icon:"🍰", asset:"assets/items/food/cherry_cake.png", price:{ gems:70 } },
  carrot_soup:{ name:"Bunny Carrot Soup", rarity:"Common", effect:"moveSpeed", value:0.05, runs:2, icon:"🥕", asset:"assets/items/food/carrot_soup.png", price:{ coins:260 } },
  healing_mochi:{ name:"Healing Mochi", rarity:"Rare", effect:"maxHp", value:0.10, runs:3, icon:"🍡", asset:"assets/items/food/healing_mochi.png", price:{ coins:500 } },
  magic_macaron:{ name:"Magic Macaron", rarity:"Epic", effect:"cooldown", value:0.10, runs:4, icon:"🧁", asset:"assets/items/food/magic_macaron.png", price:{ gems:80 } },
  golden_dumpling:{ name:"Golden Dumpling", rarity:"Legendary", effect:"bundle", value:0.12, runs:5, icon:"🥟", asset:"assets/items/food/golden_dumpling.png", price:{ gems:150 } }
};
const EFFECT_LABELS = {
  coin:"Coin earned", chestDrop:"Chest drop chance", itemDrop:"Item drop chance", damage:"Damage",
  attackSpeed:"Attack Speed", crit:"Critical Chance", moveSpeed:"Movement Speed", maxHp:"Max HP",
  cooldown:"Skill cooldown", bundle:"Coin / Chest / Item luck"
};

const COPY = {
  hu:{
    economy:"Gacha & BAG", gacha:"Gacha", bag:"BAG", buffs:"Buffok", shop:"Shop",
    subtitle:"Ládák, alapanyagok, kajabuffok és account bónuszok.", common:"Common", rare:"Rare", epic:"Epic",
    open:"NYITÁS", noChest:"Nincs ilyen ládád.", pity:"Garancia", reward:"Jutalom", duplicate:"Duplicate skin",
    essence:"Sakura Essence", inventoryFull:"Az inventory megtelt; a gear Coinná alakult.", newSkin:"Új Cherry skin",
    gear:"Gear", chestDrop:"Láda jutalom", firstClear:"First Clear", obtained:"Megszerezve",
    active:"Aktív", runs:"kör", use:"HASZNÁLAT", owned:"db", activeLimit:"Maximum 3 különböző kajabuff lehet aktív.",
    replaced:"A buff frissítve és meghosszabbítva.", activated:"Buff aktiválva", permanent:"Permanent Account Buffok",
    supporter:"Cherry Supporter", supporterPending:"Discord Sub role ellenőrzése későbbi szerveroldali integrációval aktiválódik.",
    shopIntro:"A Coin az alapfejlesztésekhez, a Blossom Gem a ritkább shop itemekhez kell.", buy:"VÁSÁRLÁS",
    bought:"Megvásárolva", notEnough:"Nincs elég fizetőeszköz.", gems:"Blossom Gem", coins:"Coin",
    commonDesc:"Főleg Common Gear és Common skin. Nagyon kis Rare esély. 10. nyitás: Common skin.",
    rareDesc:"Common és Rare Gear, jobb kék esély. 15. nyitás: Rare Cherry skin.",
    epicDesc:"Főleg Rare Gear, esély Epic gearre és nagyon ritka Epic skinre. 25. nyitás: Epic reward, főleg Gear.",
    noItems:"Ebben a kategóriában még nincs tárgyad.", materials:"Materialok", food:"Food Buffok", chests:"Ládák",
    temporary:"Ideiglenes", completed:"Feloldva", locked:"Zárolva", accountBonus:"Összes Account Buff",
    chestQuality:"Chest content luck", title:"v0.8 Economy Update", testNote:"A droprate-ek tesztértékek, a World 4–5 és új skinek később kerülnek hozzá.",
    openHub:"GACHA / BAG", hubHint:"Chestek, kaják és Blossom Gem"
  },
  en:{
    economy:"Gacha & BAG", gacha:"Gacha", bag:"BAG", buffs:"Buffs", shop:"Shop",
    subtitle:"Chests, materials, food buffs and account bonuses.", common:"Common", rare:"Rare", epic:"Epic",
    open:"OPEN", noChest:"You do not own this chest.", pity:"Guarantee", reward:"Reward", duplicate:"Duplicate skin",
    essence:"Sakura Essence", inventoryFull:"Inventory full; the gear was converted to Coins.", newSkin:"New Cherry skin",
    gear:"Gear", chestDrop:"Chest reward", firstClear:"First Clear", obtained:"Obtained",
    active:"Active", runs:"runs", use:"USE", owned:"owned", activeLimit:"A maximum of 3 different food buffs can be active.",
    replaced:"Buff refreshed and extended.", activated:"Buff activated", permanent:"Permanent Account Buffs",
    supporter:"Cherry Supporter", supporterPending:"Discord Sub role verification will activate through a later server-side integration.",
    shopIntro:"Coins power regular progression; Blossom Gems buy rarer shop items.", buy:"BUY",
    bought:"Purchased", notEnough:"Not enough currency.", gems:"Blossom Gem", coins:"Coin",
    commonDesc:"Mostly Common Gear and Common skins. Tiny Rare chance. 10th opening: Common skin.",
    rareDesc:"Common and Rare Gear with better blue odds. 15th opening: Rare Cherry skin.",
    epicDesc:"Mostly Rare Gear, a chance for Epic gear and a very rare Epic skin. 25th opening: Epic reward, usually Gear.",
    noItems:"You do not own items in this category yet.", materials:"Materials", food:"Food Buffs", chests:"Chests",
    temporary:"Temporary", completed:"Unlocked", locked:"Locked", accountBonus:"Total Account Buff",
    chestQuality:"Chest content luck", title:"v0.8 Economy Update", testNote:"Drop rates are test values; Worlds 4–5 and new skins will be added later.",
    openHub:"GACHA / BAG", hubHint:"Chests, food and Blossom Gems"
  }
};

const id = name => document.getElementById(name);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

if (!window.CherriftStorage || !window.UI || !window.CHERRIFT_V050 || !window.CHERRIFT_V070) {
  console.error("[CHERRIFT v0.8] v0.7 Arsenal update is required.");
  return;
}

const view = { tab:"gacha", selectedChest:"common", reward:null };
function language(){ return window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu"; }
function t(key){ return COPY[language()][key] || COPY.en[key] || key; }
function escapeHtml(value){ return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"); }
function round1(value){ return Math.round(Number(value || 0) * 10) / 10; }
function unique(list){ return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))]; }
function normalizeCountMap(value){
  const out = {};
  if (value && typeof value === "object") for (const [key,count] of Object.entries(value)) out[key] = Math.max(0, Math.floor(Number(count)||0));
  return out;
}
function normalize(save){
  const out = window.CHERRIFT_V070.normalize(save && typeof save === "object" ? save : {});
  out.schemaVersion = Math.max(SAVE_SCHEMA, Number(out.schemaVersion)||0);
  out.blossomGems = Math.max(0, Math.floor(Number(out.blossomGems)||0));
  out.sakuraEssence = Math.max(0, Math.floor(Number(out.sakuraEssence)||0));
  out.chests = { common:Math.max(0,Math.floor(Number(out.chests?.common)||0)), rare:Math.max(0,Math.floor(Number(out.chests?.rare)||0)), epic:Math.max(0,Math.floor(Number(out.chests?.epic)||0)) };
  out.gacha = out.gacha && typeof out.gacha === "object" ? out.gacha : {};
  out.gacha.pity = { common:Math.max(0,Math.floor(Number(out.gacha.pity?.common)||0)), rare:Math.max(0,Math.floor(Number(out.gacha.pity?.rare)||0)), epic:Math.max(0,Math.floor(Number(out.gacha.pity?.epic)||0)) };
  out.gacha.history = Array.isArray(out.gacha.history) ? out.gacha.history.slice(0,50) : [];
  out.bag ||= {};
  out.bag.items = normalizeCountMap(out.bag.items);
  out.buffs = out.buffs && typeof out.buffs === "object" ? out.buffs : {};
  out.buffs.active = Array.isArray(out.buffs.active) ? out.buffs.active.filter(entry => FOOD_CATALOG[entry?.id] && Number(entry.runs)>0).map(entry => ({ id:entry.id, runs:Math.max(1,Math.floor(Number(entry.runs)||1)), value:Number(entry.value)||FOOD_CATALOG[entry.id].value })) : [];
  out.buffs.permanent = out.buffs.permanent && typeof out.buffs.permanent === "object" ? out.buffs.permanent : {};
  out.buffs.external = out.buffs.external && typeof out.buffs.external === "object" ? out.buffs.external : {};
  out.buffs.external.supporter = out.buffs.external.supporter && typeof out.buffs.external.supporter === "object" ? out.buffs.external.supporter : { verified:false, verifiedAt:"" };
  out.economy = out.economy && typeof out.economy === "object" ? out.economy : {};
  out.economy.stageChestDrops = Math.max(0,Math.floor(Number(out.economy.stageChestDrops)||0));
  out.economy.totalChestOpens = Math.max(0,Math.floor(Number(out.economy.totalChestOpens)||0));
  out.economy.totalFoodUsed = Math.max(0,Math.floor(Number(out.economy.totalFoodUsed)||0));
  out.unlockedSkins = unique(out.unlockedSkins);
  updatePermanentBuffs(out);
  return out;
}
function patchStorage(){
  if (CherriftStorage.__v080Economy) return;
  const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  const previousLoad = CherriftStorage.load.bind(CherriftStorage);
  const previousSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.defaults = () => normalize(previousDefaults());
  CherriftStorage.load = () => normalize(previousLoad());
  CherriftStorage.save = save => previousSave(normalize(save));
  CherriftStorage.__v080Economy = true;
}
function completedAchievementCount(save){
  const source = save.achievements?.completed || save.achievements || {};
  if (Array.isArray(source)) return source.length;
  if (source && typeof source === "object") return Object.values(source).filter(value => value === true || value?.completed === true || value?.claimed === true).length;
  return 0;
}
function clearedStageCount(save){ return Object.values(save.clearedStages || {}).filter(Boolean).length; }
function updatePermanentBuffs(save){
  const achievementCount = completedAchievementCount(save);
  const clearCount = clearedStageCount(save);
  const accountLevel = Math.max(1,Number(save.account?.level)||1);
  save.buffs.permanent.coinBloom = achievementCount >= 5;
  save.buffs.permanent.treasureTrail = clearCount >= 10;
  save.buffs.permanent.veteranFocus = accountLevel >= 25;
}
function aggregateBuffs(save = UI.save){
  const normalized = normalize(save);
  const totals = { coin:0,chestDrop:0,itemDrop:0,damage:0,attackSpeed:0,crit:0,moveSpeed:0,maxHp:0,cooldown:0,xp:0 };
  for (const active of normalized.buffs.active){
    const food = FOOD_CATALOG[active.id];
    if (!food) continue;
    const value = Number(active.value)||food.value;
    if (food.effect === "bundle") { totals.coin += value; totals.chestDrop += value; totals.itemDrop += value; }
    else totals[food.effect] = (totals[food.effect]||0) + value;
  }
  if (normalized.buffs.permanent.coinBloom) totals.coin += 0.03;
  if (normalized.buffs.permanent.treasureTrail) totals.itemDrop += 0.02;
  if (normalized.buffs.permanent.veteranFocus) totals.crit += 0.01;
  if (normalized.buffs.external.supporter?.verified){ totals.coin += 0.05; totals.xp += 0.03; totals.chestDrop += 0.03; }
  return totals;
}
function saveProgress(message){ normalize(UI.save); CherriftStorage.save(UI.save); UI.refreshMenu?.(); renderHub(); if(message) UI.toast?.(message); }
function chestCount(save,type){ return type === "common" ? (save.chests.common + Math.max(0,Number(save.keys)||0)) : save.chests[type]; }
function consumeChest(save,type){
  if(type === "common"){
    if(save.chests.common>0) save.chests.common--; else if(save.keys>0) save.keys--; else return false;
    return true;
  }
  if(save.chests[type]<=0) return false;
  save.chests[type]--; return true;
}
function randomSkin(rarity){
  const pool = (CHERRIFT_DATA.skins||[]).filter(skin => skin.rarity === rarity);
  return pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;
}
function grantSkin(save,rarity){
  const skin = randomSkin(rarity);
  if(!skin){
    const essence = SKIN_ESSENCE[rarity]||5;
    save.sakuraEssence += essence;
    return { kind:"essence", rarity, amount:essence, label:`${rarity} ${t("essence")}` };
  }
  if(save.unlockedSkins.includes(skin.id)){
    const essence = SKIN_ESSENCE[rarity]||5;
    save.sakuraEssence += essence;
    return { kind:"duplicateSkin", rarity, amount:essence, skinId:skin.id, label:skin.name, icon:skin.icon||skin.emoji };
  }
  save.unlockedSkins.push(skin.id);
  return { kind:"skin", rarity, skinId:skin.id, label:skin.name, icon:skin.icon||skin.emoji };
}
function grantGear(save,rarity,world=1){
  const item = CHERRIFT_V050.createGear(Math.max(1,world),rarity);
  window.CHERRIFT_V070.syncItemToArsenal(item,save);
  if(save.inventory.length >= MAX_INVENTORY){
    const coins = CHERRIFT_V050.sellValue?.(item)||4;
    save.coins += coins;
    return { kind:"coins", rarity, amount:coins, label:t("inventoryFull"), item };
  }
  save.inventory.push(item);
  save.lootStats ||= {};
  save.lootStats.totalDrops = (save.lootStats.totalDrops||0)+1;
  return { kind:"gear", rarity, item, label:`${rarity} ${item.type} ${item.slot}`, icon:UI.gearEmoji?.(item) };
}
function rollChestReward(save,type){
  const count = ++save.gacha.pity[type];
  const guarantee = count % CHEST_DEFS[type].pity === 0;
  const world = Math.max(1,Math.max(...Object.keys(save.clearedStages||{}).map(key => Number(key.match(/world_(\d+)/)?.[1])||1),1));
  if(type === "common"){
    if(guarantee) return grantSkin(save,"Common");
    const roll=Math.random();
    if(roll<0.88) return grantGear(save,"Common",world);
    if(roll<0.99) return grantSkin(save,"Common");
    if(roll<0.998) return grantGear(save,"Rare",world);
    return grantSkin(save,"Rare");
  }
  if(type === "rare"){
    if(guarantee) return grantSkin(save,"Rare");
    const roll=Math.random();
    if(roll<0.48) return grantGear(save,"Common",world);
    if(roll<0.91) return grantGear(save,"Rare",world);
    if(roll<0.96) return grantSkin(save,"Common");
    return grantSkin(save,"Rare");
  }
  if(guarantee) return Math.random()<0.88 ? grantGear(save,"Epic",world) : grantSkin(save,"Epic");
  const roll=Math.random();
  if(roll<0.58) return grantGear(save,"Rare",world);
  if(roll<0.81) return grantGear(save,"Epic",world);
  if(roll<0.91) return grantSkin(save,"Common");
  if(roll<0.98) return grantSkin(save,"Rare");
  return grantSkin(save,"Epic");
}
function openChest(type){
  const save=normalize(UI.save);
  if(!consumeChest(save,type)){ UI.toast?.(t("noChest")); return null; }
  const reward=rollChestReward(save,type);
  save.economy.totalChestOpens++;
  save.gacha.history.unshift({ type,reward:{kind:reward.kind,rarity:reward.rarity,label:reward.label,amount:reward.amount||0},at:Date.now() });
  save.gacha.history=save.gacha.history.slice(0,50);
  view.reward={...reward,chestType:type};
  saveProgress(`${t("obtained")}: ${reward.label}`);
  return reward;
}
function addBagItem(save,idValue,count=1){ save.bag.items[idValue]=Math.max(0,(save.bag.items[idValue]||0)+count); }
function activateFood(foodId){
  const save=normalize(UI.save); const food=FOOD_CATALOG[foodId];
  if(!food || (save.bag.items[foodId]||0)<=0) return false;
  const existing=save.buffs.active.find(entry => FOOD_CATALOG[entry.id]?.effect === food.effect);
  if(!existing && save.buffs.active.length>=3){ UI.toast?.(t("activeLimit")); return false; }
  save.bag.items[foodId]--;
  if(existing){ existing.id=foodId; existing.value=Math.max(existing.value||0,food.value); existing.runs+=food.runs; }
  else save.buffs.active.push({id:foodId,runs:food.runs,value:food.value});
  save.economy.totalFoodUsed++;
  saveProgress(existing?t("replaced"):t("activated"));
  return true;
}
function priceText(price){ return price.gems ? `💎 ${price.gems}` : `🪙 ${price.coins}`; }
function canAfford(save,price){ return price.gems ? save.blossomGems>=price.gems : save.coins>=price.coins; }
function pay(save,price){ if(price.gems) save.blossomGems-=price.gems; else save.coins-=price.coins; }
function buyShopItem(kind,key){
  const save=normalize(UI.save);
  let price;
  if(kind==="chest") price={ common:{coins:480},rare:{gems:80},epic:{gems:260} }[key];
  else price=FOOD_CATALOG[key]?.price;
  if(!price || !canAfford(save,price)){ UI.toast?.(t("notEnough")); return false; }
  pay(save,price);
  if(kind==="chest") save.chests[key]++;
  else addBagItem(save,key,1);
  saveProgress(t("bought")); return true;
}
function decrementRunBuffs(save){
  save.buffs.active=save.buffs.active.map(entry=>({...entry,runs:entry.runs-1})).filter(entry=>entry.runs>0);
}
function patchGameplayBuffs(){
  const proto=window.CherriftGame?.prototype; if(!proto||proto.__v080Buffs) return;
  const previousStart=proto.start;
  proto.start=async function startV080(...args){
    const result=await previousStart.apply(this,args);
    if(!this.player) return result;
    const buffs=aggregateBuffs(this.save);
    this.player.damage*=1+buffs.damage;
    this.player.fireInterval/=1+buffs.attackSpeed;
    this.player.crit=(Number(this.player.crit)||0)+buffs.crit;
    this.player.speed*=1+buffs.moveSpeed;
    this.player.maxHp*=1+buffs.maxHp;
    this.player.hp=Math.min(this.player.maxHp,this.player.hp*(1+buffs.maxHp));
    if(buffs.cooldown && Number(this.player.skillCooldown)>0) this.player.skillCooldown*=1-buffs.cooldown;
    this.__v080BuffSnapshot=buffs;
    this.__v080BuffAppliedRun=Date.now();
    decrementRunBuffs(this.save);
    CherriftStorage.save(this.save);
    return result;
  };

  const previousStageClear=proto.stageClear;
  proto.stageClear=function stageClearV080(...args){
    const stage=this.stage; const already=!!this.stageState?.cleared; const save=normalize(this.save);
    const wasFirst=stage ? !save.firstClearClaimed?.[stage.id] : false;
    const coinsBefore=Number(save.coins)||0;
    const xpBefore=Number(save.account?.totalXp)||0;
    const result=previousStageClear.apply(this,args);
    if(already || !this.stageState?.cleared || !stage) return result;
    const buffs=this.__v080BuffSnapshot||aggregateBuffs(save);
    const baseGain=Math.max(0,(Number(save.coins)||0)-coinsBefore);
    const bonusCoins=Math.floor(baseGain*buffs.coin);
    if(bonusCoins>0) save.coins+=bonusCoins;
    const baseXp=Math.max(0,(Number(save.account?.totalXp)||0)-xpBefore);
    const bonusXp=Math.floor(baseXp*(buffs.xp||0));
    if(bonusXp>0) grantBonusAccountXp(save,bonusXp);
    const reward=grantStageChests(save,stage,buffs,wasFirst);
    reward.bonusXp=bonusXp;
    if(Math.random()<clamp(0.02+buffs.itemDrop,0,0.45)){
      const rarity=stage.world>=4&&Math.random()<0.18?"Epic":stage.world>=2?"Rare":"Common";
      const extra=grantGear(save,rarity,stage.world);
      reward.extraGear=extra.label;
    }
    this.__v080StageReward={...reward,bonusCoins};
    CherriftStorage.save(save);
    return result;
  };
  proto.__v080Buffs=true;

  const previousShow=UI.showStageClear?.bind(UI);
  if(previousShow){
    UI.showStageClear=function showStageClearV080(game,info){
      const result=previousShow(game,info); const reward=game.__v080StageReward;
      if(reward){
        let box=id("v080StageRewards");
        if(!box){box=document.createElement("div");box.id="v080StageRewards";box.className="v080-stage-rewards glass";q("#stageClearModal .stage-clear-summary")?.insertAdjacentElement("afterend",box);}
        const parts=[];
        for(const type of ["common","rare","epic"]) if(reward[type]) parts.push(`${type} Chest ×${reward[type]}`);
        if(reward.gems) parts.push(`Blossom Gem +${reward.gems}`);
        if(reward.bonusCoins) parts.push(`Buff Coin +${reward.bonusCoins}`);
        if(reward.bonusXp) parts.push(`Buff XP +${reward.bonusXp}`);
        if(reward.extraGear) parts.push(reward.extraGear);
        box.innerHTML=`<span>${escapeHtml(t("chestDrop"))}</span><b>${escapeHtml(parts.join(" · ")||"—")}</b>`;
      }
      return result;
    };
  }
}

function grantBonusAccountXp(save,amount){
  if(!save.account||amount<=0)return;
  save.account.xp=Math.max(0,Number(save.account.xp)||0)+amount;
  save.account.totalXp=Math.max(0,Number(save.account.totalXp)||0)+amount;
  let guard=0;
  while(save.account.xp>=Math.max(1,Number(save.account.xpNext)||CHERRIFT_V050.xpForLevel?.(save.account.level)||999999)&&guard++<100){
    const need=Math.max(1,Number(save.account.xpNext)||CHERRIFT_V050.xpForLevel?.(save.account.level)||999999);
    save.account.xp-=need;
    save.account.level=Math.max(1,Number(save.account.level)||1)+1;
    save.account.xpNext=CHERRIFT_V050.xpForLevel?.(save.account.level)||need;
  }
}
function grantStageChests(save,stage,buffs,wasFirst){
  const world=Math.max(1,Number(stage.world)||1); const out={common:0,rare:0,epic:0,gems:0};
  const modifier=1+(buffs.chestDrop||0);
  const commonChance=clamp((0.42+world*0.055)*modifier,0,0.88);
  const rareChance=world>=2?clamp((0.018+world*0.018)*modifier,0,0.25):0;
  const epicChance=world>=4?clamp((world===4?0.006:0.012)*modifier,0,0.05):0;
  if(Math.random()<commonChance){out.common++;save.chests.common++;if(Math.random()<0.10+world*0.02){out.common++;save.chests.common++;}}
  if(Math.random()<rareChance){out.rare++;save.chests.rare++;}
  if(Math.random()<epicChance){out.epic++;save.chests.epic++;}
  if(wasFirst){
    if(world===1){out.common++;save.chests.common++;}
    else if(world<=3){out.rare++;save.chests.rare++;}
    else {out.epic++;save.chests.epic++;}
    out.gems=5+world*3; save.blossomGems+=out.gems;
  }
  save.economy.stageChestDrops+=out.common+out.rare+out.epic;
  return out;
}
function patchCoinSelling(){
  if(UI.__v080SellBuff) return;
  const previous=UI.sellGear?.bind(UI);
  if(previous){
    UI.sellGear=function sellGearV080(itemId){
      const item=this.save?.inventory?.find(entry=>entry.id===itemId);
      const before=Number(this.save?.coins)||0;
      const result=previous(itemId);
      if(item){
        const gained=Math.max(0,(Number(this.save.coins)||0)-before);
        const extra=Math.floor(gained*aggregateBuffs(this.save).coin);
        if(extra>0){this.save.coins+=extra;CherriftStorage.save(this.save);this.refreshMenu?.();this.toast?.(`Coin Buff +${extra}`);}
      }
      return result;
    };
  }
  UI.__v080SellBuff=true;
}
function ensureCss(){if(id("v080css"))return;const link=document.createElement("link");link.id="v080css";link.rel="stylesheet";link.href="v080.css?v=080";document.head.appendChild(link);}
function imageOrFallback(asset,icon,label){return `<span class="v080-art"><img src="${escapeHtml(asset||"")}" alt="${escapeHtml(label)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><i hidden>${icon||"✦"}</i></span>`;}
function ensureHub(){
  const panel=id("chests"); if(!panel||panel.dataset.v080Ready)return;
  panel.dataset.v080Ready="true";panel.classList.add("economy-v080");panel.setAttribute("data-i18n-ignore","true");
  panel.innerHTML=`<header class="economy-head-v080"><button class="back" type="button" data-v080-back>←</button><div><small>CHERRIFT · ${DISPLAY_VERSION}</small><h1>${t("economy")}</h1><p>${t("subtitle")}</p></div><div class="economy-wallet-v080"><span>🪙 <b id="v080Coins">0</b></span><span>💎 <b id="v080Gems">0</b></span><span>🌸 <b id="v080Essence">0</b></span></div></header><nav class="economy-tabs-v080"><button data-v080-tab="gacha">${t("gacha")}</button><button data-v080-tab="bag">${t("bag")}</button><button data-v080-tab="buffs">${t("buffs")}</button><button data-v080-tab="shop">${t("shop")}</button></nav><div id="economyBodyV080" class="economy-body-v080"></div>`;
}
function ensureNavigation(){
  const mainNav=q("#menu .main-nav");
  const chestButton=q("[data-open='chests']",mainNav);
  if(chestButton){chestButton.classList.add("economy-menu-v080");const i=q("i",chestButton),em=q("em",chestButton);if(i)i.textContent=t("openHub");if(em)em.textContent=t("hubHint");}
  const mobile=q("#menu .mobile-bottom-nav [data-open='chests']");if(mobile){const b=q("b",mobile);if(b)b.textContent=t("bag");}
  if(mainNav&&!q("[data-v080-open-bag]",mainNav)){
    const btn=document.createElement("button");btn.type="button";btn.className="menu-btn";btn.dataset.v080OpenBag="true";btn.innerHTML=`<span>🎒</span><i>${t("bag")}</i><em>FOOD & MATERIALS</em><b>›</b>`;chestButton?.insertAdjacentElement("afterend",btn);
  }
}
function renderHub(){
  ensureHub();ensureNavigation();if(!UI.save)return;const save=normalize(UI.save);
  if(id("v080Coins"))id("v080Coins").textContent=Math.floor(save.coins||0);if(id("v080Gems"))id("v080Gems").textContent=save.blossomGems;if(id("v080Essence"))id("v080Essence").textContent=save.sakuraEssence;
  qa("[data-v080-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.v080Tab===view.tab));
  const body=id("economyBodyV080");if(!body)return;
  body.innerHTML=view.tab==="gacha"?renderGacha(save):view.tab==="bag"?renderBag(save):view.tab==="buffs"?renderBuffs(save):renderShop(save);
}
function renderGacha(save){
  const reward=view.reward?renderReward(view.reward):"";
  return `<div class="v080-test-note">${escapeHtml(t("testNote"))}</div><section class="chest-grid-v080">${Object.entries(CHEST_DEFS).map(([type,def])=>{const count=chestCount(save,type);const pity=save.gacha.pity[type]%def.pity;return `<article class="chest-card-v080 chest-${def.color}-v080">${imageOrFallback(def.asset,type==="common"?"📦":type==="rare"?"🧰":"🎁",def.name)}<small>${type.toUpperCase()}</small><h2>${escapeHtml(def.name)}</h2><p>${escapeHtml(t(`${type}Desc`))}</p><div class="chest-count-v080"><span>${t("owned")}</span><b>${count}</b></div><div class="pity-v080"><span>${escapeHtml(t("pity"))}</span><b>${pity} / ${def.pity}</b><i><em style="width:${pity/def.pity*100}%"></em></i></div><button type="button" data-v080-open-chest="${type}" ${count<=0?"disabled":""}>${t("open")}</button></article>`;}).join("")}</section>${reward}<section class="history-v080"><h3>Recent</h3>${save.gacha.history.slice(0,6).map(entry=>`<div><span>${escapeHtml(entry.type)} Chest</span><b class="rarity-${String(entry.reward?.rarity||"Common").toLowerCase()}">${escapeHtml(entry.reward?.label||"")}</b></div>`).join("")||`<p>${escapeHtml(t("noItems"))}</p>`}</section>`;
}
function renderReward(reward){
  const detail=reward.kind==="duplicateSkin"?`${t("duplicate")} · +${reward.amount} ${t("essence")}`:reward.kind==="skin"?t("newSkin"):reward.kind==="gear"?t("gear"):reward.label;
  const icon=reward.icon||reward.item&&UI.gearEmoji?.(reward.item)||"✦";
  return `<section class="reward-card-v080 rarity-${String(reward.rarity||"Common").toLowerCase()}"><small>${escapeHtml(t("reward"))}</small><div>${typeof icon==="string"&&icon.includes("<")?icon:`<span>${icon}</span>`}</div><h2>${escapeHtml(reward.label)}</h2><p>${escapeHtml(detail)}</p></section>`;
}
function renderBag(save){
  const material=save.bag.materials;
  const materials=[["Gear Scrap",material.gearScrap,"⚙"],[t("essence"),save.sakuraEssence,"🌸"],...["copper","iron","steel","silver","royal"].map(key=>[`${key} Stone`,material.stones[key],"◆"]),...Object.entries(material.slotCores).map(([slot,count])=>[`${slot} Core`,count,"✥"])];
  const foods=Object.entries(FOOD_CATALOG).filter(([key])=>(save.bag.items[key]||0)>0);
  return `<section class="bag-section-v080"><header><h2>${escapeHtml(t("materials"))}</h2></header><div class="material-grid-v080">${materials.map(([name,count,icon])=>`<article><span>${icon}</span><div><small>${escapeHtml(name)}</small><b>${count}</b></div></article>`).join("")}</div></section><section class="bag-section-v080"><header><h2>${escapeHtml(t("food"))}</h2><p>${escapeHtml(t("activeLimit"))}</p></header><div class="food-grid-v080">${foods.length?foods.map(([key,food])=>foodCard(key,food,save,true)).join(""):`<p class="empty-v080">${escapeHtml(t("noItems"))}</p>`}</div></section><section class="bag-section-v080"><header><h2>${escapeHtml(t("chests"))}</h2></header><div class="mini-chests-v080">${Object.keys(CHEST_DEFS).map(type=>`<button type="button" data-v080-goto-gacha="${type}"><span>${type==="common"?"📦":type==="rare"?"🧰":"🎁"}</span><b>${type} Chest</b><small>${chestCount(save,type)}</small></button>`).join("")}</div></section>`;
}
function foodCard(key,food,save,usable){
  const count=save.bag.items[key]||0;const percent=Math.round(food.value*100);
  return `<article class="food-card-v080 rarity-${food.rarity.toLowerCase()}">${imageOrFallback(food.asset,food.icon,food.name)}<small>${escapeHtml(food.rarity)}</small><h3>${escapeHtml(food.name)}</h3><p>+${percent}% ${escapeHtml(EFFECT_LABELS[food.effect]||food.effect)} · ${food.runs} ${escapeHtml(t("runs"))}</p><b>${count} ${escapeHtml(t("owned"))}</b>${usable?`<button type="button" data-v080-use-food="${key}" ${count<=0?"disabled":""}>${escapeHtml(t("use"))}</button>`:""}</article>`;
}
function renderBuffs(save){
  const totals=aggregateBuffs(save);const permanent=[{id:"coinBloom",name:"Treasure Hunter I",effect:"+3% Coin",condition:"5 Achievements"},{id:"treasureTrail",name:"World Explorer",effect:"+2% Item Drop",condition:"10 Stage Clears"},{id:"veteranFocus",name:"Veteran Focus",effect:"+1% Crit",condition:"Player Lv.25"}];
  return `<section class="buff-summary-v080"><h2>${escapeHtml(t("accountBonus"))}</h2><div>${Object.entries(totals).filter(([,value])=>value>0).map(([key,value])=>`<span>${escapeHtml(EFFECT_LABELS[key]||key)} <b>+${Math.round(value*100)}%</b></span>`).join("")||"—"}</div></section><section class="bag-section-v080"><header><h2>${escapeHtml(t("temporary"))}</h2></header><div class="active-buffs-v080">${save.buffs.active.length?save.buffs.active.map(entry=>{const food=FOOD_CATALOG[entry.id];return `<article>${imageOrFallback(food.asset,food.icon,food.name)}<div><small>${escapeHtml(t("active"))}</small><h3>${escapeHtml(food.name)}</h3><p>+${Math.round((entry.value||food.value)*100)}% ${escapeHtml(EFFECT_LABELS[food.effect])} · ${entry.runs} ${escapeHtml(t("runs"))}</p></div></article>`;}).join(""):`<p class="empty-v080">${escapeHtml(t("noItems"))}</p>`}</div></section><section class="bag-section-v080"><header><h2>${escapeHtml(t("permanent"))}</h2></header><div class="permanent-grid-v080">${permanent.map(buff=>{const unlocked=!!save.buffs.permanent[buff.id];return `<article class="${unlocked?"unlocked":"locked"}"><span>${unlocked?"✓":"🔒"}</span><div><h3>${escapeHtml(buff.name)}</h3><p>${escapeHtml(buff.effect)}</p><small>${escapeHtml(buff.condition)} · ${escapeHtml(unlocked?t("completed"):t("locked"))}</small></div></article>`;}).join("")}<article class="supporter-v080 ${save.buffs.external.supporter?.verified?"unlocked":"locked"}"><span>💜</span><div><h3>${escapeHtml(t("supporter"))}</h3><p>+5% Coin · +3% XP · +3% Chest Drop</p><small>${escapeHtml(save.buffs.external.supporter?.verified?t("completed"):t("supporterPending"))}</small></div></article></div></section>`;
}
function renderShop(save){
  const chestPrices={common:{coins:480},rare:{gems:80},epic:{gems:260}};
  return `<section class="shop-intro-v080"><h2>${escapeHtml(t("shop"))}</h2><p>${escapeHtml(t("shopIntro"))}</p></section><section class="shop-grid-v080">${Object.entries(chestPrices).map(([type,price])=>`<article class="shop-card-v080"><span>${type==="common"?"📦":type==="rare"?"🧰":"🎁"}</span><h3>${escapeHtml(CHEST_DEFS[type].name)}</h3><b>${priceText(price)}</b><button type="button" data-v080-buy-chest="${type}" ${!canAfford(save,price)?"disabled":""}>${escapeHtml(t("buy"))}</button></article>`).join("")}</section><section class="bag-section-v080"><header><h2>${escapeHtml(t("food"))}</h2></header><div class="food-grid-v080">${Object.entries(FOOD_CATALOG).map(([key,food])=>`<article class="food-card-v080 rarity-${food.rarity.toLowerCase()}">${imageOrFallback(food.asset,food.icon,food.name)}<small>${escapeHtml(food.rarity)}</small><h3>${escapeHtml(food.name)}</h3><p>+${Math.round(food.value*100)}% ${escapeHtml(EFFECT_LABELS[food.effect])} · ${food.runs} ${escapeHtml(t("runs"))}</p><b>${priceText(food.price)}</b><button type="button" data-v080-buy-food="${key}" ${!canAfford(save,food.price)?"disabled":""}>${escapeHtml(t("buy"))}</button></article>`).join("")}</div></section>`;
}
function patchNavigation(){
  if(UI.__v080Navigation)return;
  const previousOpen=UI.open.bind(UI);
  UI.open=function openV080(panel,...args){
    const result=previousOpen(panel,...args);
    if(panel==="chests"){ensureHub();renderHub();}
    return result;
  };
  UI.__v080Navigation=true;
  document.addEventListener("click",event=>{
    const back=event.target.closest?.("[data-v080-back]");if(back){event.preventDefault();UI.open("menu");return;}
    const tab=event.target.closest?.("[data-v080-tab]");if(tab){event.preventDefault();view.tab=tab.dataset.v080Tab;view.reward=null;renderHub();return;}
    const open=event.target.closest?.("[data-v080-open-chest]");if(open){event.preventDefault();openChest(open.dataset.v080OpenChest);return;}
    const use=event.target.closest?.("[data-v080-use-food]");if(use){event.preventDefault();activateFood(use.dataset.v080UseFood);return;}
    const buyChest=event.target.closest?.("[data-v080-buy-chest]");if(buyChest){event.preventDefault();buyShopItem("chest",buyChest.dataset.v080BuyChest);return;}
    const buyFood=event.target.closest?.("[data-v080-buy-food]");if(buyFood){event.preventDefault();buyShopItem("food",buyFood.dataset.v080BuyFood);return;}
    const goto=event.target.closest?.("[data-v080-goto-gacha]");if(goto){event.preventDefault();view.selectedChest=goto.dataset.v080GotoGacha;view.tab="gacha";renderHub();return;}
    const openBag=event.target.closest?.("[data-v080-open-bag]");if(openBag){event.preventDefault();view.tab="bag";UI.open("chests");}
  },true);
}
function ensureCurrencyDisplays(){
  const save=UI.save&&normalize(UI.save);if(!save)return;
  let gem=id("menuGemsV080");
  if(!gem){const target=id("menuKeys")?.parentElement;if(target){gem=document.createElement("p");gem.id="menuGemsV080";gem.className="menu-gems-v080";target.parentElement?.appendChild(gem);}}
  if(gem)gem.innerHTML=`💎 <b>${save.blossomGems}</b> Blossom Gem`;
  const top=q(".mobile-topbar");
  if(top&&!id("mobileGemsV080")){const pill=document.createElement("div");pill.className="mobile-pill";pill.innerHTML=`<span>Gems</span><b id="mobileGemsV080">0</b>`;top.appendChild(pill);}
  if(id("mobileGemsV080"))id("mobileGemsV080").textContent=save.blossomGems;
}
function patchUi(){
  if(UI.__v080Ui)return;
  const previousInit=UI.init?.bind(UI);
  if(previousInit){UI.init=function initV080(save,game){normalize(save);const result=previousInit(save,game);ensureHub();ensureNavigation();ensureCurrencyDisplays();updateVersion();return result;};}
  const previousRefresh=UI.refreshMenu?.bind(UI);
  if(previousRefresh){UI.refreshMenu=function refreshMenuV080(...args){if(this.save)normalize(this.save);const result=previousRefresh(...args);ensureNavigation();ensureCurrencyDisplays();updateVersion();if(!id("chests")?.classList.contains("hidden"))renderHub();return result;};}
  UI.__v080Ui=true;
}
function updateVersion(){
  document.title=`CHERRIFT ${DISPLAY_VERSION} – GACHA & BUFF UPDATE`;
  const boot=q(".boot-sub-v060");if(boot)boot.textContent=`${DISPLAY_VERSION} · GACHA & BUFF UPDATE`;
  if(id("menuBuildVersion"))id("menuBuildVersion").textContent=`${DISPLAY_VERSION} · ECONOMY UPDATE`;
  qa(".version-badge-v063,[data-v063-version]").forEach(label=>label.textContent=`${DISPLAY_VERSION} · TEST BUILD`);
}
function setServerEntitlements(entitlements={}){
  const save=normalize(UI.save);
  if(typeof entitlements.supporter==="boolean") save.buffs.external.supporter={verified:entitlements.supporter,verifiedAt:entitlements.verifiedAt||new Date().toISOString()};
  saveProgress();
}

ensureCss();patchStorage();patchNavigation();patchGameplayBuffs();patchCoinSelling();patchUi();updateVersion();
window.addEventListener("cherrift:languagechange",()=>{const panel=id("chests");if(panel){panel.dataset.v080Ready="";ensureHub();}ensureNavigation();renderHub();ensureCurrencyDisplays();updateVersion();});
window.CHERRIFT_V080={version:VERSION,displayVersion:DISPLAY_VERSION,normalize,aggregateBuffs,openChest,activateFood,buyShopItem,grantStageChests,render:renderHub,setServerEntitlements,foodCatalog:FOOD_CATALOG,chestDefs:CHEST_DEFS};
console.info("[CHERRIFT] v0.8.0 Gacha, Economy, BAG & Account Buffs loaded.");
})();
