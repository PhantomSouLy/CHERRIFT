(() => {
"use strict";

const VERSION = "0.8.2-systems-navigation-skilltree";
const DISPLAY_VERSION = "v0.8.2";
const SAVE_SCHEMA = 9;
const SLOT_ORDER = ["Weapon","Helmet","Armor","Gloves","Boots","Ring","Necklace"];
const SLOT_ICONS = {Weapon:"⚔",Helmet:"⛑",Armor:"🛡",Gloves:"🧤",Boots:"🥾",Ring:"◉",Necklace:"◇"};
const RARITY_SCRAP = {Common:2,Uncommon:4,Rare:8,Epic:18,Legendary:40};

const MATERIAL_SOURCES = {
  copper:["World 1–2","Common Chest","Shop","Gear dismantle"],
  iron:["World 2–3","Rare Chest","Shop","Gear dismantle"],
  steel:["World 3–4","Rare / Epic Chest","Weekly Reward","Gear dismantle"],
  silver:["World 4–5","Epic Chest","Achievement","Shop"],
  royal:["World 5+ boss reward","Epic Chest","High-tier Achievement","Shop"],
  magical:["Future high-level Worlds","Events","Legendary content"],
  gearScrap:["Gear dismantle","Bulk Dismantle","Weekly Reward"],
  slotCore:["Dismantle 3 items of the same slot","Merge materials","Weekly Reward"],
  sakuraEssence:["Duplicate Cherry skins","Achievements","Shop"],
  blossomGem:["First Clear rewards","Weekly Reward","Achievements","Events"]
};

const SKILL_TIERS = [
  {level:0,nodes:[
    {id:"damage",icon:"⚔",nameHu:"Sebzés",nameEn:"Damage",max:5,value:.03,unit:"%",descHu:"+3% sebzés rangonként.",descEn:"+3% damage per rank."},
    {id:"maxHp",icon:"♥",nameHu:"Max HP",nameEn:"Max HP",max:5,value:.05,unit:"%",descHu:"+5% maximális HP rangonként.",descEn:"+5% maximum HP per rank."},
    {id:"orbXp",icon:"✦",nameHu:"Orb XP",nameEn:"Orb XP Gain",max:5,value:.04,unit:"%",descHu:"+4% XP az orbokból rangonként.",descEn:"+4% orb XP per rank."}
  ]},
  {level:5,nodes:[
    {id:"movementSpeed",icon:"➤",nameHu:"Mozgási sebesség",nameEn:"Movement Speed",max:4,value:.02,unit:"%",descHu:"+2% mozgási sebesség rangonként.",descEn:"+2% movement speed per rank."},
    {id:"critChance",icon:"◎",nameHu:"Kritikus esély",nameEn:"Critical Chance",max:5,value:.015,unit:"%",descHu:"+1,5% kritikus esély rangonként.",descEn:"+1.5% critical chance per rank."},
    {id:"luckChance",icon:"♧",nameHu:"Szerencse",nameEn:"Luck Chance",max:3,value:.02,unit:"%",descHu:"+2% általános drop-szerencse rangonként.",descEn:"+2% general drop luck per rank."}
  ]},
  {level:10,nodes:[
    {id:"attackSpeed",icon:"⚡",nameHu:"Támadási sebesség",nameEn:"Attack Speed",max:4,value:.025,unit:"%",descHu:"+2,5% támadási sebesség rangonként.",descEn:"+2.5% attack speed per rank."},
    {id:"critDamage",icon:"✹",nameHu:"Kritikus sebzés",nameEn:"Critical Damage",max:5,value:.08,unit:"%",descHu:"+8% kritikus sebzés rangonként.",descEn:"+8% critical damage per rank."},
    {id:"damageReduction",icon:"⬡",nameHu:"Sebzéscsökkentés",nameEn:"Damage Reduction",max:4,value:.02,unit:"%",descHu:"+2% bejövő sebzéscsökkentés rangonként.",descEn:"+2% incoming damage reduction per rank."}
  ]},
  {level:15,nodes:[
    {id:"pickupRange",icon:"⌁",nameHu:"Felvételi távolság",nameEn:"Pickup Range",max:5,value:8,unit:"flat",descHu:"+8 felvételi távolság rangonként.",descEn:"+8 pickup range per rank."},
    {id:"hpRegen",icon:"✚",nameHu:"HP regeneráció",nameEn:"HP Regeneration",max:5,value:.35,unit:"flat",descHu:"+0,35 HP/mp regeneráció rangonként.",descEn:"+0.35 HP/sec regeneration per rank."},
    {id:"cooldownReduction",icon:"◷",nameHu:"Skill cooldown",nameEn:"Skill Cooldown Reduction",max:2,value:.04,unit:"%",descHu:"-4% skill cooldown rangonként.",descEn:"-4% skill cooldown per rank."}
  ]},
  {level:20,nodes:[
    {id:"skillDamage",icon:"✧",nameHu:"Skill sebzés",nameEn:"Skill Damage",max:3,value:.05,unit:"%",descHu:"+5% skill sebzés rangonként.",descEn:"+5% skill damage per rank."},
    {id:"bossDamage",icon:"♛",nameHu:"Boss sebzés",nameEn:"Boss Damage",max:3,value:.04,unit:"%",descHu:"+4% boss sebzés rangonként.",descEn:"+4% boss damage per rank."},
    {id:"eliteDamage",icon:"◆",nameHu:"Elite sebzés",nameEn:"Elite Damage",max:3,value:.04,unit:"%",descHu:"+4% elite sebzés rangonként.",descEn:"+4% elite damage per rank."}
  ]},
  {level:25,nodes:[
    {id:"coinGain",icon:"●",nameHu:"Coin bevétel",nameEn:"Coin Gain",max:3,value:.02,unit:"%",descHu:"+2% Coin bevétel rangonként.",descEn:"+2% Coin gain per rank."},
    {id:"itemDrop",icon:"▣",nameHu:"Item drop",nameEn:"Item Drop",max:2,value:.015,unit:"%",descHu:"+1,5% extra item drop rangonként.",descEn:"+1.5% extra item drop per rank."},
    {id:"chestDrop",icon:"◇",nameHu:"Chest drop",nameEn:"Chest Drop",max:2,value:.015,unit:"%",descHu:"+1,5% extra ládaesély rangonként.",descEn:"+1.5% extra chest chance per rank."}
  ]}
];
const SKILL_NODES = Object.fromEntries(SKILL_TIERS.flatMap(tier => tier.nodes.map(node => [node.id,{...node,unlock:tier.level}])));

const TITLES = [
  {id:"new_bloom",nameHu:"Új Virágzás",nameEn:"New Bloom",rarity:"Common",test:()=>true},
  {id:"beta_tester",nameHu:"Béta Tesztelő",nameEn:"Beta Tester",rarity:"Rare",test:()=>true},
  {id:"slime_hunter",nameHu:"Slime Vadász",nameEn:"Slime Hunter",rarity:"Rare",test:s=>(s.stats?.kills||0)>=500},
  {id:"world_walker",nameHu:"Világjáró",nameEn:"World Walker",rarity:"Epic",test:s=>(s.stats?.clears||0)>=10},
  {id:"cherry_collector",nameHu:"Cherry Gyűjtő",nameEn:"Cherry Collector",rarity:"Epic",test:s=>(s.unlockedSkins?.length||0)>=5},
  {id:"arsenal_adept",nameHu:"Arsenal Mester",nameEn:"Arsenal Adept",rarity:"Epic",test:s=>averageArsenalLevel(s)>=5},
  {id:"treasure_hunter",nameHu:"Kincsvadász",nameEn:"Treasure Hunter",rarity:"Legendary",test:s=>(s.economy?.totalChestOpens||0)>=25}
];

const COPY = {
  hu:{
    play:"Játék",skins:"Cherry",gear:"Felszerelés",arsenal:"Arsenal",upgrade:"Player Upgrade",bag:"BAG",
    gacha:"Gacha",shop:"Bolt",collection:"Gyűjtemény",achievements:"Eredmények",settings:"Beállítások",
    profile:"Profil",daily:"Napi jutalom",weekly:"Heti jutalom",login:"Belépési jutalom",mail:"Levelek",
    social:"Social",buffs:"Buff lista",feedback:"Visszajelzés",bug:"Hibajelentés",more:"Továbbiak",
    skillTree:"Skill Tree",skillIntro:"Szintkapus, account-szintű fejlesztések minden Cherry számára.",
    skillPoints:"Elérhető Skill Point",reset:"Skill Tree reset",freeReset:"Első reset ingyenes",
    unlockLevel:"Feloldás szintje",rank:"Rang",current:"Jelenlegi",next:"Következő",max:"MAX",
    levelNeeded:"Szükséges játékosszint",notEnoughPoints:"Nincs elég Skill Point.",nodeMax:"Ez a fejlesztés már maximális.",
    resetConfirm:"Biztosan visszaállítod a teljes Skill Tree-t?",resetDone:"A Skill Tree visszaállítva.",
    arsenalCompact:"A slotot fejleszted; minden azonos típusú gear ezt a szintet használja.",
    levelUp:"LEVEL UP",starUp:"STAR UP",requirements:"Követelmények",materialSources:"Beszerzési források",
    select:"Kijelölés",cancel:"Mégse",selectCommon:"Common kijelölése",sellSelected:"Eladás",dismantleSelected:"Betörés",
    selected:"kijelölve",bulkConfirm:"Ritka gear is ki van jelölve. Biztosan folytatod?",bulkSold:"Gear eladva",
    bulkDismantled:"Gear betörve",noSelection:"Nincs kijelölt gear.",statSummary:"Stat részletek",
    profileIntro:"A játékosprofilod, címeid és hosszú távú statisztikáid.",activeTitle:"Aktív Title",
    titles:"Title gyűjtemény",profileStats:"Profil statisztikák",friendsSoon:"Friends List előkészítve",
    friendsDesc:"Profilnézegetés és barátlista később érkezik; multiplayer még nem szükséges hozzá.",
    weeklyIntro:"Teljesítsd mindhárom heti célt a nagy jutalomért.",claim:"ÁTVÉTEL",claimed:"ÁTVÉVE",
    runs:"Körök",clears:"Pályateljesítések",kills:"Killek",weeklyReward:"Heti főjutalom",
    collectionIntro:"Skinek, gearek, ellenfelek és Worldök gyűjteménye.",menuSubtitle:"Felszerelés és összeállítás",
    resource:"Erőforrások",comingSoon:"HAMAROSAN",close:"Bezárás",sourceHint:"Kattints egy materialra a forrásokhoz.",
    estimated:"Menüben számolt érték",base:"Alap",skill:"Skill Tree",accountBuff:"Account Buff",skin:"Skin",final:"Végleges",
    power:"Erő",hp:"HP",attack:"ATK",crit:"Krit",critDmg:"Krit sebzés",move:"Mozgás",cooldown:"Cooldown",
    profileFrame:"Profilkeret",frameSoon:"Az ikonkeretek későbbi contentként érkeznek."
  },
  en:{
    play:"Play",skins:"Cherry",gear:"Gear",arsenal:"Arsenal",upgrade:"Player Upgrade",bag:"BAG",
    gacha:"Gacha",shop:"Shop",collection:"Collection",achievements:"Achievements",settings:"Settings",
    profile:"Profile",daily:"Daily Reward",weekly:"Weekly Reward",login:"Login Reward",mail:"Mail",
    social:"Social",buffs:"Buff List",feedback:"Feedback",bug:"Bug Report",more:"More",
    skillTree:"Skill Tree",skillIntro:"Level-gated account upgrades shared by every Cherry.",
    skillPoints:"Available Skill Points",reset:"Reset Skill Tree",freeReset:"First reset is free",
    unlockLevel:"Unlock level",rank:"Rank",current:"Current",next:"Next",max:"MAX",
    levelNeeded:"Required player level",notEnoughPoints:"Not enough Skill Points.",nodeMax:"This upgrade is already maxed.",
    resetConfirm:"Reset the entire Skill Tree?",resetDone:"Skill Tree reset.",
    arsenalCompact:"Upgrade the slot; every matching gear item uses this level.",
    levelUp:"LEVEL UP",starUp:"STAR UP",requirements:"Requirements",materialSources:"Material sources",
    select:"Select",cancel:"Cancel",selectCommon:"Select Common",sellSelected:"Sell",dismantleSelected:"Dismantle",
    selected:"selected",bulkConfirm:"Rare gear is selected too. Continue?",bulkSold:"Gear sold",
    bulkDismantled:"Gear dismantled",noSelection:"No gear selected.",statSummary:"Stat Details",
    profileIntro:"Your player profile, titles and long-term statistics.",activeTitle:"Active Title",
    titles:"Title Collection",profileStats:"Profile Statistics",friendsSoon:"Friends List prepared",
    friendsDesc:"Profile viewing and friends arrive later; multiplayer is not required for them.",
    weeklyIntro:"Complete all three weekly goals for the main reward.",claim:"CLAIM",claimed:"CLAIMED",
    runs:"Runs",clears:"Stage Clears",kills:"Kills",weeklyReward:"Weekly Main Reward",
    collectionIntro:"Your skins, gear, enemies and Worlds.",menuSubtitle:"Equipment & Loadout",
    resource:"Resources",comingSoon:"COMING SOON",close:"Close",sourceHint:"Tap a material to see its sources.",
    estimated:"Menu estimate",base:"Base",skill:"Skill Tree",accountBuff:"Account Buff",skin:"Skin",final:"Final",
    power:"Power",hp:"HP",attack:"ATK",crit:"Crit",critDmg:"Crit Damage",move:"Move",cooldown:"Cooldown",
    profileFrame:"Profile Frame",frameSoon:"Icon frames will arrive as later content."
  }
};

const id = name => document.getElementById(name);
const q = (selector,root=document) => root?.querySelector?.(selector)||null;
const qa = (selector,root=document) => Array.from(root?.querySelectorAll?.(selector)||[]);
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const dayKey = (date=new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const escapeHtml = value => String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

if(!window.UI||!window.CherriftStorage||!window.CHERRIFT_V070||!window.CHERRIFT_V080){
  console.error("[CHERRIFT v0.8.2] v0.7 and v0.8 systems are required.");
  return;
}

const runtime = {
  route:"menu",selectionMode:false,selectedGear:new Set(),draggingTree:false,treeStartX:0,
  treeStartScroll:0,treeMoved:false,economyRoute:"gacha",observers:[]
};

function language(){return window.CHERRIFT_I18N?.language==="en"||UI.save?.settings?.language==="en"?"en":"hu";}
function t(key){return COPY[language()][key]||COPY.en[key]||key;}
function nodeName(node){return language()==="hu"?node.nameHu:node.nameEn;}
function nodeDesc(node){return language()==="hu"?node.descHu:node.descEn;}
function titleName(title){return language()==="hu"?title.nameHu:title.nameEn;}
function formatPercent(value){return `${Math.round(Number(value||0)*1000)/10}%`;}
function totalAchievementCount(save){
  const source=save?.achievements?.completed||save?.achievements||{};
  if(Array.isArray(source))return source.length;
  return Object.values(source||{}).filter(Boolean).length;
}
function unclaimedAchievementCount(save){
  const achievements=save?.achievements||{},claims=save?.achievementClaims||{};
  return Object.keys(achievements).filter(key=>achievements[key]&&!claims[key]).length;
}
function averageArsenalLevel(save){
  const slots=save?.arsenal?.slots||{};
  return Math.round(SLOT_ORDER.reduce((sum,slot)=>sum+(Number(slots[slot]?.level)||1),0)/SLOT_ORDER.length*10)/10;
}
function emptySkillRanks(){return Object.fromEntries(Object.keys(SKILL_NODES).map(key=>[key,0]));}
function normalizeWeekly(save){
  const now=new Date(),first=new Date(now.getFullYear(),0,1);
  const week=Math.ceil((((now-first)/86400000)+first.getDay()+1)/7);
  const key=`${now.getFullYear()}-W${String(week).padStart(2,"0")}`;
  save.weeklyV082=save.weeklyV082&&typeof save.weeklyV082==="object"?save.weeklyV082:{};
  if(save.weeklyV082.key!==key){
    save.weeklyV082={key,claimed:false,start:{
      runs:Number(save.stats?.runs)||0,clears:Number(save.stats?.clears)||0,kills:Number(save.stats?.kills)||0
    }};
  }
  return save.weeklyV082;
}
function migrateOldTree(save){
  const account=save.account;
  if(account.skillTreeV082Migrated)return;
  const old={power:0,vitality:0,haste:0,fortune:0,...(account.tree||{})},ranks=account.skillTreeV082.ranks;
  ranks.damage=Math.max(ranks.damage,Math.min(5,Number(old.power)||0));
  ranks.maxHp=Math.max(ranks.maxHp,Math.min(5,Number(old.vitality)||0));
  ranks.movementSpeed=Math.max(ranks.movementSpeed,Math.min(4,Number(old.haste)||0));
  ranks.attackSpeed=Math.max(ranks.attackSpeed,Math.min(4,Number(old.haste)||0));
  ranks.critChance=Math.max(ranks.critChance,Math.min(5,Number(old.fortune)||0));
  const refund=Math.max(0,(Number(old.power)||0)-5)+Math.max(0,(Number(old.vitality)||0)-5)+
    Math.max(0,(Number(old.haste)||0)-4)+Math.max(0,(Number(old.fortune)||0)-5);
  account.skillPoints=Math.max(0,Math.floor(Number(account.skillPoints)||0))+refund;
  account.tree={power:0,vitality:0,haste:0,fortune:0};
  account.skillTreeV082Migrated=true;
}
function normalize(save){
  const out=window.CHERRIFT_V080.normalize(save&&typeof save==="object"?save:{});
  out.schemaVersion=Math.max(SAVE_SCHEMA,Number(out.schemaVersion)||0);
  out.account=out.account&&typeof out.account==="object"?out.account:{};
  out.account.level=Math.max(1,Math.floor(Number(out.account.level)||1));
  out.account.skillPoints=Math.max(0,Math.floor(Number(out.account.skillPoints)||0));
  out.account.skillTreeV082=out.account.skillTreeV082&&typeof out.account.skillTreeV082==="object"?out.account.skillTreeV082:{};
  out.account.skillTreeV082.ranks={...emptySkillRanks(),...(out.account.skillTreeV082.ranks||{})};
  for(const [key,node] of Object.entries(SKILL_NODES)){
    out.account.skillTreeV082.ranks[key]=clamp(Math.floor(Number(out.account.skillTreeV082.ranks[key])||0),0,node.max);
  }
  out.account.skillTreeV082.resetCount=Math.max(0,Math.floor(Number(out.account.skillTreeV082.resetCount)||0));
  migrateOldTree(out);
  out.account.tree={power:0,vitality:0,haste:0,fortune:0};
  out.profile=out.profile&&typeof out.profile==="object"?out.profile:{};
  out.profile.activeTitle=String(out.profile.activeTitle||"new_bloom");
  if(!TITLES.some(title=>title.id===out.profile.activeTitle&&title.test(out)))out.profile.activeTitle="new_bloom";
  out.uiV082=out.uiV082&&typeof out.uiV082==="object"?out.uiV082:{};
  out.uiV082.seenGearCount=Math.max(0,Number(out.uiV082.seenGearCount)||0);
  out.uiV082.seenBagCount=Math.max(0,Number(out.uiV082.seenBagCount)||0);
  out.uiV082.seenShopDay=String(out.uiV082.seenShopDay||"");
  normalizeWeekly(out);
  return out;
}
function patchStorage(){
  if(CherriftStorage.__v082Systems)return;
  const defaults=CherriftStorage.defaults.bind(CherriftStorage);
  const load=CherriftStorage.load.bind(CherriftStorage);
  const save=CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.defaults=()=>normalize(defaults());
  CherriftStorage.load=()=>normalize(load());
  CherriftStorage.save=value=>save(normalize(value));
  CherriftStorage.__v082Systems=true;
}
function saveProgress(message){
  normalize(UI.save);CherriftStorage.save(UI.save);UI.refreshMenu?.();
  if(message)UI.toast?.(message);refreshAll();
}
function skillBonuses(save=UI.save){
  const normalized=normalize(save),ranks=normalized.account.skillTreeV082.ranks,total={};
  for(const [key,node] of Object.entries(SKILL_NODES))total[key]=(Number(ranks[key])||0)*node.value;
  return total;
}
function spentSkillPoints(save=UI.save){
  return Object.values(normalize(save).account.skillTreeV082.ranks).reduce((sum,value)=>sum+Number(value||0),0);
}

function upgradeSkill(nodeId){
  const save=normalize(UI.save),node=SKILL_NODES[nodeId];
  if(!node)return;
  const rank=save.account.skillTreeV082.ranks[nodeId];
  if(save.account.level<node.unlock){UI.toast?.(`${t("levelNeeded")}: ${node.unlock}`);return;}
  if(rank>=node.max){UI.toast?.(t("nodeMax"));return;}
  if(save.account.skillPoints<1){UI.toast?.(t("notEnoughPoints"));return;}
  save.account.skillPoints--;
  save.account.skillTreeV082.ranks[nodeId]++;
  saveProgress(`${nodeName(node)} ${save.account.skillTreeV082.ranks[nodeId]}/${node.max}`);
}
function resetSkillTree(){
  const save=normalize(UI.save),spent=spentSkillPoints(save);
  if(!spent)return;
  const count=save.account.skillTreeV082.resetCount,cost=count===0?0:500+count*500;
  if(save.coins<cost){UI.toast?.(`${t("notEnoughPoints")} 🪙 ${cost}`);return;}
  showConfirm(`${t("resetConfirm")}${cost?` · 🪙 ${cost}`:` · ${t("freeReset")}`}`,()=>{
    save.coins-=cost;save.account.skillPoints+=spent;
    save.account.skillTreeV082.ranks=emptySkillRanks();
    save.account.skillTreeV082.resetCount++;
    saveProgress(t("resetDone"));
  });
}

function ensureCss(){
  if(id("v082css"))return;
  const link=document.createElement("link");
  link.id="v082css";link.rel="stylesheet";link.href="v082.css?v=082";
  document.head.appendChild(link);
}
function ensureModal(){
  if(id("v082Modal"))return;
  const modal=document.createElement("section");
  modal.id="v082Modal";modal.className="v082-modal hidden";
  modal.innerHTML='<button type="button" class="v082-modal-backdrop" data-v082-modal-close></button><article><button type="button" class="v082-modal-x" data-v082-modal-close>×</button><div id="v082ModalBody"></div></article>';
  document.body.appendChild(modal);
}
function showModal(html){
  ensureModal();id("v082ModalBody").innerHTML=html;id("v082Modal").classList.remove("hidden");
}
function closeModal(){id("v082Modal")?.classList.add("hidden");}
function showConfirm(message,onConfirm){
  showModal(`<div class="v082-confirm"><span>!</span><h2>${escapeHtml(message)}</h2><div><button type="button" data-v082-modal-close>${escapeHtml(t("cancel"))}</button><button type="button" class="primary" id="v082ConfirmYes">OK</button></div></div>`);
  id("v082ConfirmYes").onclick=()=>{closeModal();onConfirm();};
}

function ensureCustomPanels(){
  const app=id("app");if(!app)return;
  const panels=[
    ["profileV082","profile-shell-v082"],
    ["weeklyV082","weekly-shell-v082"],
    ["socialV082","social-shell-v082"],
    ["statSummaryV082","stat-shell-v082"]
  ];
  for(const [panelId,className] of panels){
    if(id(panelId))continue;
    const panel=document.createElement("section");
    panel.id=panelId;panel.className=`panel hidden v082-custom-panel ${className}`;
    panel.innerHTML='<div class="v082-panel-body"></div>';
    app.appendChild(panel);
  }
}
function panelHeader(title,subtitle,back="menu"){
  return `<header class="panel-head v082-panel-head"><button class="back" type="button" data-v082-open="${back}">←</button><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></header>`;
}
function ensureResourceBar(){
  if(id("resourceBarV082"))return;
  const bar=document.createElement("aside");
  bar.id="resourceBarV082";bar.className="resource-bar-v082";
  document.body.appendChild(bar);
}
function updateResourceBar(){
  ensureResourceBar();if(!UI.save)return;
  const save=normalize(UI.save),material=save.bag?.materials||{};
  id("resourceBarV082").innerHTML=`
    <span title="Coin">🪙 <b>${Math.floor(save.coins||0)}</b></span>
    <span title="Blossom Gem">💎 <b>${save.blossomGems||0}</b></span>
    <span title="Sakura Essence">🌸 <b>${save.sakuraEssence||0}</b></span>
    <span title="Gear Scrap">⚙ <b>${material.gearScrap||0}</b></span>`;
  id("resourceBarV082").classList.toggle("hidden",
    runtime.route==="arsenalV070"||document.body.classList.contains("is-playing")||document.body.classList.contains("arsenal-open-v081"));
}

function railButton(route,icon,label,notice=""){
  return `<button type="button" data-v082-open="${route}" data-v082-route="${route}"><i>${icon}</i><b>${escapeHtml(label)}</b>${notice?`<em class="notice-dot-v082" data-v082-notice="${notice}"></em>`:""}</button>`;
}
function rebuildRail(){
  const rail=id("globalRailV060");if(!rail)return;
  rail.classList.add("rail-v082");
  rail.innerHTML=`
    <button type="button" class="rail-brand-v060" data-v082-open="menu"><strong>CHERRIFT</strong><small>${escapeHtml(t("menuSubtitle"))}</small></button>
    <nav class="rail-nav-v060 rail-nav-v082">
      ${railButton("worlds","▶",t("play"))}
      ${railButton("skins","🐰",t("skins"),"skin")}
      ${railButton("gear","⚔",t("gear"),"gear")}
      ${railButton("arsenalV070","✥",t("arsenal"),"arsenal")}
      ${railButton("playerUpgrade","✦",t("upgrade"),"upgrade")}
      ${railButton("bagV082","🎒",t("bag"),"bag")}
      ${railButton("gachaV082","◇",t("gacha"),"gacha")}
      ${railButton("shopV082","▤",t("shop"),"shop")}
      ${railButton("collectionV082","▣",t("collection"))}
      ${railButton("achievements","♛",t("achievements"),"achievements")}
    </nav>
    <div class="rail-bottom-v060">
      <button type="button" class="rail-settings-v060" data-v082-open="settings" data-v082-route="settings"><i>⚙</i><b>${escapeHtml(t("settings"))}</b></button>
      <button type="button" class="rail-profile-v060" data-v082-open="profileV082" data-v082-route="profileV082">
        <span id="railProfileIconV082"></span><span><b id="railProfileNameV082">Cherry Player</b><small id="railProfileTitleV082">${escapeHtml(t("profile"))}</small></span>
      </button>
    </div>`;
  updateRailProfile();
}
function updateRailProfile(){
  if(!UI.save)return;
  const save=normalize(UI.save),skin=CHERRIFT_DATA.skins.find(entry=>entry.id===save.selectedSkin);
  const icon=id("railProfileIconV082");
  if(icon)icon.innerHTML=skin?.icon?`<img src="${escapeHtml(skin.icon)}" alt="">`:`<span>${skin?.emoji||"🐰"}</span>`;
  if(id("railProfileNameV082"))id("railProfileNameV082").textContent=save.profile?.name||"Cherry Player";
  const title=TITLES.find(entry=>entry.id===save.profile.activeTitle)||TITLES[0];
  if(id("railProfileTitleV082"))id("railProfileTitleV082").textContent=titleName(title);
}

function ensureMobileDrawer(){
  const nav=id("globalMobileNavV052");
  if(nav&&(!nav.dataset.v082Ready||!q("[data-v082-toggle-mobile]",nav))){
    nav.dataset.v082Ready="1";nav.classList.add("mobile-nav-v082");
    nav.innerHTML=`
      <button type="button" data-v082-open="worlds"><span>▶</span><b>${escapeHtml(t("play"))}</b></button>
      <button type="button" data-v082-open="gear"><span>⚔</span><b>${escapeHtml(t("gear"))}</b><em class="notice-dot-v082" data-v082-notice="gear"></em></button>
      <button type="button" data-v082-open="menu" class="home"><span>⌂</span><b>Home</b></button>
      <button type="button" data-v082-open="gachaV082"><span>◇</span><b>${escapeHtml(t("gacha"))}</b><em class="notice-dot-v082" data-v082-notice="gacha"></em></button>
      <button type="button" data-v082-toggle-mobile><span>☰</span><b>${escapeHtml(t("more"))}</b></button>`;
  }
  if(!id("mobileMenuV082")){
    const drawer=document.createElement("section");
    drawer.id="mobileMenuV082";drawer.className="mobile-menu-v082 hidden";
    document.body.appendChild(drawer);
  }
  renderMobileDrawer();
}
function renderMobileDrawer(){
  const drawer=id("mobileMenuV082");if(!drawer)return;
  drawer.innerHTML=`
    <button type="button" class="mobile-menu-close-v082" data-v082-toggle-mobile>×</button>
    <h2>CHERRIFT</h2>
    <div class="mobile-menu-grid-v082">
      ${railButton("skins","🐰",t("skins"))}${railButton("arsenalV070","✥",t("arsenal"))}
      ${railButton("playerUpgrade","✦",t("upgrade"))}${railButton("bagV082","🎒",t("bag"))}
      ${railButton("shopV082","▤",t("shop"))}${railButton("collectionV082","▣",t("collection"))}
      ${railButton("achievements","♛",t("achievements"))}${railButton("profileV082","👤",t("profile"))}
      ${railButton("settings","⚙",t("settings"))}${railButton("buffsV082","♥",t("buffs"))}
    </div>`;
}
function closeMobileDrawer(){id("mobileMenuV082")?.classList.add("hidden");}

function openMenuTool(action){
  if(action==="settings"){
    UI.open("settings");
    return;
  }
  if(action==="mail"){
    UI.open("mailV063");
    window.CHERRIFT_V063?.renderMail?.();
    return;
  }
  const systems=window.CHERRIFT_V063;
  if(systems?.runtime)systems.runtime.supportType=action==="bug"?"bug":"feedback";
  UI.open("supportV063");
  systems?.renderSupport?.();
}

function bindMenuTools(){
  const tools=id("menuToolsV082");if(!tools)return;
  qa("[data-v082-menu-tool]",tools).forEach(button=>{
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      openMenuTool(button.dataset.v082MenuTool);
    };
  });
}

function rebuildHome(){
  const dashboard=id("menuDashboardV060");if(!dashboard)return;
  const shortcuts=q(".dashboard-shortcuts-v060",dashboard);
  if(shortcuts){
    shortcuts.innerHTML=`
      <button type="button" data-v082-open="dailyQuests"><i>✓</i><span><b>${escapeHtml(t("daily"))}</b><small>Daily quests & rewards</small></span></button>
      <button type="button" data-v082-open="weeklyV082"><i>♛</i><span><b>${escapeHtml(t("weekly"))}</b><small>Weekly progress</small></span><em class="notice-dot-v082" data-v082-notice="weekly"></em></button>
      <button type="button" data-v082-open="loginRewards"><i>🎁</i><span><b>${escapeHtml(t("login"))}</b><small>Login streak</small></span></button>
      <button type="button" data-v082-open="mailV063"><i>✉</i><span><b>${escapeHtml(t("mail"))}</b><small>Inbox</small></span><em class="mail-badge-v063" data-v063-mail-count></em></button>
      <button type="button" data-v082-open="socialV082"><i>♧</i><span><b>${escapeHtml(t("social"))}</b><small>Friends & profile</small></span></button>
      <button type="button" data-v082-open="buffsV082"><i>♥</i><span><b>${escapeHtml(t("buffs"))}</b><small>Temporary & permanent</small></span></button>`;
  }
  if(!id("menuToolsV082")){
    const tools=document.createElement("nav");
    tools.id="menuToolsV082";tools.className="menu-tools-v082";
    id("menu")?.appendChild(tools);
  }
  id("menuToolsV082").innerHTML=`
    <button type="button" data-v082-menu-tool="feedback" title="${escapeHtml(t("feedback"))}" aria-label="${escapeHtml(t("feedback"))}">💬<small>${escapeHtml(t("feedback"))}</small></button>
    <button type="button" data-v082-menu-tool="bug" title="${escapeHtml(t("bug"))}" aria-label="${escapeHtml(t("bug"))}">⚠<small>${escapeHtml(t("bug"))}</small></button>
    <button type="button" data-v082-menu-tool="mail" title="${escapeHtml(t("mail"))}" aria-label="${escapeHtml(t("mail"))}">✉<em class="mail-badge-v063" data-v063-mail-count></em></button>
    <button type="button" data-v082-menu-tool="settings" title="${escapeHtml(t("settings"))}" aria-label="${escapeHtml(t("settings"))}">⚙</button>`;
  bindMenuTools();
}

function ensurePlayerUpgrade(){
  const panel=id("playerUpgrade");if(!panel)return;
  if(panel.dataset.v082Ready==="1")return;
  panel.dataset.v082Ready="1";panel.classList.add("player-upgrade-v082");panel.setAttribute("data-i18n-ignore","true");
  panel.innerHTML=`
    ${panelHeader(t("skillTree"),t("skillIntro"))}
    <section class="skill-toolbar-v082">
      <div><small>PLAYER LEVEL</small><b id="skillPlayerLevelV082">1</b></div>
      <div><small>${escapeHtml(t("skillPoints"))}</small><b id="skillPointsV082">0</b></div>
      <button type="button" data-v082-open="statSummaryV082">≡ ${escapeHtml(t("statSummary"))}</button>
      <button type="button" data-v082-reset-tree>↺ ${escapeHtml(t("reset"))}</button>
    </section>
    <div id="skillTreeScrollV082" class="skill-tree-scroll-v082">
      <div id="skillTreeTrackV082" class="skill-tree-track-v082"></div>
    </div>
    <p class="skill-tree-help-v082">↔ ${language()==="hu"?"Kattints/tapints és húzd oldalra. PC-n az egérgörgő is mozgatja.":"Click/tap and drag sideways. The mouse wheel also scrolls on PC."}</p>`;
  bindTreeScroller();
}
function renderSkillTree(){
  ensurePlayerUpgrade();if(!UI.save)return;
  const save=normalize(UI.save),ranks=save.account.skillTreeV082.ranks,level=save.account.level;
  if(id("skillPlayerLevelV082"))id("skillPlayerLevelV082").textContent=level;
  if(id("skillPointsV082"))id("skillPointsV082").textContent=save.account.skillPoints;
  const track=id("skillTreeTrackV082");if(!track)return;
  track.innerHTML=SKILL_TIERS.map((tier,index)=>`
    <section class="skill-tier-v082 ${level<tier.level?"locked":""}" data-tier="${tier.level}">
      <header><span>LEVEL ${tier.level}</span><b>${level>=tier.level?"UNLOCKED":`${t("levelNeeded")} ${tier.level}`}</b></header>
      <div class="skill-tier-nodes-v082">
        ${tier.nodes.map(node=>{
          const rank=ranks[node.id]||0,locked=level<node.unlock,maxed=rank>=node.max;
          const current=node.unit==="%"?formatPercent(rank*node.value):Math.round(rank*node.value*100)/100;
          const next=node.unit==="%"?formatPercent(Math.min(node.max,rank+1)*node.value):Math.round(Math.min(node.max,rank+1)*node.value*100)/100;
          return `<article class="skill-node-v082 ${locked?"locked":""} ${maxed?"maxed":""}">
            <span class="skill-node-icon-v082">${node.icon}</span>
            <div><small>${escapeHtml(nodeName(node))}</small><h3>${escapeHtml(t("rank"))} ${rank}/${node.max}</h3><p>${escapeHtml(nodeDesc(node))}</p>
              <em>${escapeHtml(t("current"))}: ${current}${maxed?"":` · ${escapeHtml(t("next"))}: ${next}`}</em></div>
            <button type="button" data-v082-skill="${node.id}" ${locked||maxed||save.account.skillPoints<1?"disabled":""}>${maxed?t("max"):"+"}</button>
          </article>`;
        }).join("")}
      </div>
    </section>${index<SKILL_TIERS.length-1?'<i class="skill-connector-v082">›</i>':""}`).join("");
}
function bindTreeScroller(){
  const scroller=id("skillTreeScrollV082");if(!scroller||scroller.dataset.bound)return;
  scroller.dataset.bound="1";
  scroller.addEventListener("wheel",event=>{
    if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
    event.preventDefault();scroller.scrollLeft+=event.deltaY;
  },{passive:false});
  scroller.addEventListener("pointerdown",event=>{
    if(event.target.closest("button"))return;
    runtime.draggingTree=true;runtime.treeMoved=false;runtime.treeStartX=event.clientX;runtime.treeStartScroll=scroller.scrollLeft;
    scroller.setPointerCapture?.(event.pointerId);scroller.classList.add("dragging");
  });
  scroller.addEventListener("pointermove",event=>{
    if(!runtime.draggingTree)return;
    const dx=event.clientX-runtime.treeStartX;if(Math.abs(dx)>4)runtime.treeMoved=true;
    scroller.scrollLeft=runtime.treeStartScroll-dx;
  });
  const end=()=>{runtime.draggingTree=false;scroller.classList.remove("dragging");};
  scroller.addEventListener("pointerup",end);scroller.addEventListener("pointercancel",end);
}

function compactArsenal(){
  const grid=id("arsenalGridV070");if(!grid||!UI.save)return;
  const save=normalize(UI.save),note=q(".arsenal-note-v070");
  if(note){
    const m=save.bag.materials;
    note.innerHTML=`<strong>${escapeHtml(t("resource"))}:</strong>
      ${["copper","iron","steel","silver","royal"].map(key=>`<button type="button" data-v082-material="${key}"><i class="stone-${key}-v070"></i>${key} <b>${m.stones[key]||0}</b></button>`).join("")}
      <button type="button" data-v082-material="gearScrap">⚙ Gear Scrap <b>${m.gearScrap||0}</b></button>
      <small>${escapeHtml(t("sourceHint"))}</small>`;
  }
  grid.innerHTML=SLOT_ORDER.map(slot=>{
    const state=save.arsenal.slots[slot],cap=state.stars===1?10:state.stars===2?25:100;
    const multiplier=window.CHERRIFT_V070.arsenalMultiplier(state);
    const levelCost=window.CHERRIFT_V070.levelCost(state),starCost=window.CHERRIFT_V070.starCost(state,slot);
    const atLevelCap=state.level>=cap,atStarCap=state.stars>=2;
    const action=atLevelCap&&!atStarCap?{kind:"star",label:t("starUp"),cost:starCost}:atLevelCap?{kind:"max",label:t("max"),cost:null}:{kind:"level",label:t("levelUp"),cost:levelCost};
    const cost=action.cost;
    const costHtml=!cost?"—":[
      `<span>🪙 ${cost.coins}</span>`,
      cost.stone?`<button type="button" data-v082-material="${cost.stone}">${escapeHtml(cost.stone)} ×${cost.stones}</button>`:"",
      cost.scrap?`<button type="button" data-v082-material="gearScrap">Gear Scrap ×${cost.scrap}</button>`:"",
      cost.cores?`<button type="button" data-v082-material="slotCore">${escapeHtml(slot)} Core ×${cost.cores}</button>`:""
    ].filter(Boolean).join("");
    return `<article class="arsenal-card-v070 arsenal-compact-v082" data-v070-slot-card="${slot}">
      <header><span>${SLOT_ICONS[slot]}</span><div><small>${escapeHtml(slot)} Arsenal</small><h2>Lv.${state.level} · ${"★".repeat(state.stars)}${"☆".repeat(5-state.stars)}</h2></div><b>×${multiplier.toFixed(3)}</b></header>
      <div class="arsenal-level-track-v070"><i style="width:${Math.min(100,state.level/cap*100)}%"></i></div>
      <div class="arsenal-compact-cost-v082"><small>${escapeHtml(t("requirements"))}</small><div>${costHtml}</div></div>
      <button type="button" class="arsenal-main-action-v082" ${action.kind==="level"?`data-v070-level="${slot}"`:action.kind==="star"?`data-v070-star="${slot}"`:"disabled"}>${escapeHtml(action.label)}</button>
    </article>`;
  }).join("");
}
function observeArsenal(){
  const grid=id("arsenalGridV070");if(!grid||grid.dataset.v082Observed)return;
  grid.dataset.v082Observed="1";let busy=false;
  const observer=new MutationObserver(()=>{
    if(busy||!q(".arsenal-card-v070:not(.arsenal-compact-v082)",grid))return;
    busy=true;
    requestAnimationFrame(()=>{compactArsenal();busy=false;});
  });
  observer.observe(grid,{childList:true});runtime.observers.push(observer);
}

function installGearTools(){
  const header=q("#gear .gear-inventory-head-v0560");if(!header)return;
  if(!id("gearBulkToolsV082")){
    const tools=document.createElement("div");
    tools.id="gearBulkToolsV082";tools.className="gear-bulk-tools-v082";
    tools.innerHTML=`
      <button type="button" data-v082-select-mode>${escapeHtml(t("select"))}</button>
      <button type="button" data-v082-select-common class="hidden">${escapeHtml(t("selectCommon"))}</button>
      <span id="gearSelectedCountV082" class="hidden">0 ${escapeHtml(t("selected"))}</span>
      <button type="button" data-v082-bulk-sell class="hidden">${escapeHtml(t("sellSelected"))}</button>
      <button type="button" data-v082-bulk-dismantle class="hidden">${escapeHtml(t("dismantleSelected"))}</button>`;
    header.appendChild(tools);
  }
  decorateGearSelection();
}
function decorateGearSelection(){
  const grid=id("gearInventoryGridV0560");if(!grid)return;
  qa("[data-v0560-item-id]",grid).forEach(card=>{
    const selected=runtime.selectedGear.has(card.dataset.v0560ItemId);
    card.classList.toggle("selected-v082",selected);
    card.classList.toggle("selection-mode-v082",runtime.selectionMode);
    if(!q(".gear-select-mark-v082",card))card.insertAdjacentHTML("beforeend",'<i class="gear-select-mark-v082">✓</i>');
  });
  const tools=id("gearBulkToolsV082");
  if(tools){
    qa("button,span",tools).forEach((element,index)=>{
      if(index===0)return;element.classList.toggle("hidden",!runtime.selectionMode);
    });
    const first=q("[data-v082-select-mode]",tools);if(first)first.textContent=runtime.selectionMode?t("cancel"):t("select");
  }
  if(id("gearSelectedCountV082"))id("gearSelectedCountV082").textContent=`${runtime.selectedGear.size} ${t("selected")}`;
}
function toggleSelectionMode(){
  runtime.selectionMode=!runtime.selectionMode;
  if(!runtime.selectionMode)runtime.selectedGear.clear();
  decorateGearSelection();
}
function inventoryItem(itemId){return UI.save?.inventory?.find(item=>item?.id===itemId);}
function selectCommon(){
  const save=normalize(UI.save);runtime.selectedGear.clear();
  for(const item of save.inventory)if(!item.locked&&["Common","Uncommon"].includes(item.rarity))runtime.selectedGear.add(item.id);
  decorateGearSelection();
}
function selectedItems(){
  const save=normalize(UI.save);
  return save.inventory.filter(item=>runtime.selectedGear.has(item.id)&&!item.locked);
}
function stoneForItem(item){
  const level=Math.max(1,Number(item?.rollLevel)||Number(item?.itemLevel)||1);
  return level<=10?"copper":level<=25?"iron":level<=50?"steel":level<=75?"silver":"royal";
}

function bulkSell(){
  const save=normalize(UI.save),items=selectedItems();
  if(!items.length){UI.toast?.(t("noSelection"));return;}
  const execute=()=>{
    const ids=new Set(items.map(item=>item.id));let coins=0;
    for(const item of items)coins+=window.CHERRIFT_V050?.sellValue?.(item)||Math.max(2,Math.round(Object.values(item.stats||{}).reduce((a,b)=>a+Number(b||0),0)));
    const buff=window.CHERRIFT_V080.aggregateBuffs(save),tree=skillBonuses(save);
    coins+=Math.floor(coins*((buff.coin||0)+(tree.coinGain||0)));
    save.inventory=save.inventory.filter(item=>!ids.has(item.id));save.coins+=coins;
    runtime.selectedGear.clear();runtime.selectionMode=false;
    saveProgress(`${t("bulkSold")}: ${items.length} · 🪙 ${coins}`);UI.renderGear?.();
  };
  if(items.some(item=>["Epic","Legendary"].includes(item.rarity)))showConfirm(t("bulkConfirm"),execute);else execute();
}
function bulkDismantle(){
  const save=normalize(UI.save),items=selectedItems();
  if(!items.length){UI.toast?.(t("noSelection"));return;}
  const execute=()=>{
    const ids=new Set(items.map(item=>item.id)),material=save.bag.materials;let scrap=0,cores=0;
    for(const item of items){
      const gain=RARITY_SCRAP[item.rarity]||2;scrap+=gain;material.gearScrap+=gain;
      const stone=stoneForItem(item);
      material.stones[stone]=(material.stones[stone]||0)+Math.max(1,Math.floor((["Common","Uncommon","Rare","Epic","Legendary"].indexOf(item.rarity)+1)/2));
      const state=save.arsenal.slots[item.slot];state.salvageCount=(state.salvageCount||0)+1;
      while(state.salvageCount>=3){
        state.salvageCount-=3;material.slotCores[item.slot]=(material.slotCores[item.slot]||0)+1;cores++;
      }
    }
    save.inventory=save.inventory.filter(item=>!ids.has(item.id));
    runtime.selectedGear.clear();runtime.selectionMode=false;
    saveProgress(`${t("bulkDismantled")}: ${items.length} · ⚙ ${scrap}${cores?` · ✥ ${cores}`:""}`);UI.renderGear?.();
  };
  if(items.some(item=>["Epic","Legendary"].includes(item.rarity)))showConfirm(t("bulkConfirm"),execute);else execute();
}
function materialInfo(key){
  const sources=MATERIAL_SOURCES[key]||MATERIAL_SOURCES.slotCore;
  showModal(`<div class="material-info-v082"><span>◆</span><h2>${escapeHtml(key)}</h2><p>${escapeHtml(t("materialSources"))}</p><ul>${sources.map(source=>`<li>${escapeHtml(source)}</li>`).join("")}</ul><button type="button" data-v082-modal-close>${escapeHtml(t("close"))}</button></div>`);
}

function renderWeekly(){
  ensureCustomPanels();
  const panel=id("weeklyV082"),body=q(".v082-panel-body",panel);if(!body||!UI.save)return;
  const save=normalize(UI.save),weekly=normalizeWeekly(save),stats=save.stats||{};
  const goals=[
    {key:"runs",label:t("runs"),value:Math.max(0,(stats.runs||0)-weekly.start.runs),target:5,icon:"▶"},
    {key:"clears",label:t("clears"),value:Math.max(0,(stats.clears||0)-weekly.start.clears),target:3,icon:"▣"},
    {key:"kills",label:t("kills"),value:Math.max(0,(stats.kills||0)-weekly.start.kills),target:300,icon:"⚔"}
  ];
  const ready=goals.every(goal=>goal.value>=goal.target);
  body.innerHTML=`${panelHeader(t("weekly"),t("weeklyIntro"))}
    <main class="weekly-main-v082">
      <div class="weekly-goals-v082">${goals.map(goal=>`<article><span>${goal.icon}</span><div><small>${escapeHtml(goal.label)}</small><b>${Math.min(goal.target,goal.value)} / ${goal.target}</b><i><em style="width:${Math.min(100,goal.value/goal.target*100)}%"></em></i></div></article>`).join("")}</div>
      <section class="weekly-reward-v082"><small>${escapeHtml(t("weeklyReward"))}</small><h2>🪙 800 · 💎 25 · 🔵 Rare Chest ×1</h2><button type="button" data-v082-claim-weekly ${!ready||weekly.claimed?"disabled":""}>${weekly.claimed?t("claimed"):t("claim")}</button></section>
    </main>`;
}
function claimWeekly(){
  const save=normalize(UI.save),weekly=normalizeWeekly(save),stats=save.stats||{};
  const ready=(stats.runs||0)-weekly.start.runs>=5&&(stats.clears||0)-weekly.start.clears>=3&&(stats.kills||0)-weekly.start.kills>=300;
  if(!ready||weekly.claimed)return;
  weekly.claimed=true;save.coins+=800;save.blossomGems+=25;save.chests.rare+=1;
  saveProgress(t("claimed"));
}

function unlockedTitles(save){return TITLES.filter(title=>title.test(save));}
function renderProfile(){
  ensureCustomPanels();
  const panel=id("profileV082"),body=q(".v082-panel-body",panel);if(!body||!UI.save)return;
  const save=normalize(UI.save),skin=CHERRIFT_DATA.skins.find(entry=>entry.id===save.selectedSkin),titles=unlockedTitles(save);
  const active=titles.find(title=>title.id===save.profile.activeTitle)||titles[0];
  const gearOwned=(save.inventory?.length||0)+Object.values(save.equipped||{}).filter(Boolean).length;
  body.innerHTML=`${panelHeader(t("profile"),t("profileIntro"))}
    <main class="profile-main-v082">
      <section class="profile-hero-v082 rarity-${active.rarity.toLowerCase()}">
        <div class="profile-avatar-v082">${skin?.icon?`<img src="${escapeHtml(skin.icon)}" alt="">`:`<span>${skin?.emoji||"🐰"}</span>`}</div>
        <div><small>${escapeHtml(t("activeTitle"))}</small><h2>${escapeHtml(save.profile?.name||"Cherry Player")}</h2><strong>${escapeHtml(titleName(active))}</strong><p>Player Level ${save.account.level} · ${escapeHtml(skin?.name||"Cherry")}</p></div>
        <button type="button" data-v082-open="statSummaryV082">${escapeHtml(t("statSummary"))}</button>
      </section>
      <section class="profile-stat-grid-v082">
        <article><small>${escapeHtml(t("achievements"))}</small><b>${totalAchievementCount(save)}</b></article>
        <article><small>${escapeHtml(t("kills"))}</small><b>${save.stats?.kills||0}</b></article>
        <article><small>${escapeHtml(t("clears"))}</small><b>${save.stats?.clears||0}</b></article>
        <article><small>TOTAL XP</small><b>${Math.floor(save.account?.totalXp||0)}</b></article>
        <article><small>GEAR</small><b>${gearOwned}</b></article>
        <article><small>GACHA</small><b>${save.economy?.totalChestOpens||0}</b></article>
        <article><small>ARSENAL AVG</small><b>${averageArsenalLevel(save)}</b></article>
        <article><small>POWER</small><b>${estimateStats(save).power}</b></article>
      </section>
      <section class="profile-titles-v082"><header><h2>${escapeHtml(t("titles"))}</h2><p>${escapeHtml(t("frameSoon"))}</p></header>
        <div>${titles.map(title=>`<button type="button" class="rarity-${title.rarity.toLowerCase()} ${title.id===active.id?"active":""}" data-v082-title="${title.id}"><small>${escapeHtml(title.rarity)}</small><b>${escapeHtml(titleName(title))}</b></button>`).join("")}</div>
      </section>
    </main>`;
}
function selectTitle(titleId){
  const save=normalize(UI.save),title=TITLES.find(entry=>entry.id===titleId);
  if(!title||!title.test(save))return;
  save.profile.activeTitle=titleId;saveProgress(titleName(title));renderProfile();
}
function renderSocial(){
  ensureCustomPanels();
  const panel=id("socialV082"),body=q(".v082-panel-body",panel);if(!body||!UI.save)return;
  const save=normalize(UI.save),auth=window.CHERRIFT_AUTH?.getState?.()||{},mode=auth.mode||"guest";
  body.innerHTML=`${panelHeader(t("social"),t("friendsDesc"))}<main class="social-main-v082">
    <section><span>♧</span><h2>${escapeHtml(t("friendsSoon"))}</h2><p>${escapeHtml(t("friendsDesc"))}</p><button type="button" disabled>${escapeHtml(t("comingSoon"))}</button></section>
    <aside><small>ACCOUNT</small><b>${mode==="discord"?"Discord Cloud":"Guest"}</b><p>${escapeHtml(save.profile?.name||"Cherry Player")}</p><button type="button" data-v082-open="profileV082">${escapeHtml(t("profile"))}</button></aside>
  </main>`;
}

function estimateStats(save=UI.save){
  const normalized=normalize(save),tree=skillBonuses(normalized),buff=window.CHERRIFT_V080.aggregateBuffs(normalized);
  const gear=UI.totalGearStats?.(normalized)||{};
  const skin=CHERRIFT_DATA.skins.find(entry=>entry.id===normalized.selectedSkin)||CHERRIFT_DATA.skins[0]||{stats:{}};
  const baseDamage=20+Number(skin.stats?.damage||0)+Number(gear.damage||0),baseHp=100+Number(gear.maxHp||0);
  const damage=baseDamage*(1+(tree.damage||0)+(buff.damage||0)),hp=baseHp*(1+(tree.maxHp||0)+(buff.maxHp||0));
  const move=(235+Number(skin.stats?.speed||0)+Number(gear.moveSpeed||0))*(1+(tree.movementSpeed||0)+(buff.moveSpeed||0));
  const crit=.05+Number(gear.crit||0)/100+(tree.critChance||0)+(buff.crit||0);
  const critDamage=1.5+Number(gear.critDamage||0)/100+(tree.critDamage||0);
  const attackSpeed=1+(tree.attackSpeed||0)+(buff.attackSpeed||0)+Number(gear.attackSpeed||0)/100;
  const power=Math.round(100+Object.values(normalized.equipped||{}).filter(Boolean).reduce((sum,item)=>sum+(window.CHERRIFT_V050?.itemPower?.(item)||0),0));
  return {
    power,damage:Math.round(damage*10)/10,hp:Math.round(hp),move:Math.round(move),crit:Math.round(crit*1000)/10,
    critDamage:Math.round(critDamage*1000)/10,attackSpeed:Math.round(attackSpeed*1000)/10,
    cooldown:Math.round((tree.cooldownReduction||0)*1000)/10,reduction:Math.round((tree.damageReduction||0)*1000)/10,
    pickup:110+Number(gear.pickup||0)+(tree.pickupRange||0),regen:Number(gear.regen||0)+(tree.hpRegen||0)
  };
}
function renderStatSummary(){
  ensureCustomPanels();
  const panel=id("statSummaryV082"),body=q(".v082-panel-body",panel);if(!body||!UI.save)return;
  const save=normalize(UI.save),stats=estimateStats(save),tree=skillBonuses(save),buff=window.CHERRIFT_V080.aggregateBuffs(save),gear=UI.totalGearStats?.(save)||{};
  body.innerHTML=`${panelHeader(t("statSummary"),t("estimated"),runtime.route==="profileV082"?"profileV082":"playerUpgrade")}
    <main class="stat-summary-v082">
      <section class="stat-final-grid-v082">
        <article><small>${escapeHtml(t("power"))}</small><b>${stats.power}</b></article>
        <article><small>${escapeHtml(t("attack"))}</small><b>${stats.damage}</b></article>
        <article><small>${escapeHtml(t("hp"))}</small><b>${stats.hp}</b></article>
        <article><small>${escapeHtml(t("move"))}</small><b>${stats.move}</b></article>
        <article><small>${escapeHtml(t("crit"))}</small><b>${stats.crit}%</b></article>
        <article><small>${escapeHtml(t("critDmg"))}</small><b>${stats.critDamage}%</b></article>
        <article><small>ATK SPEED</small><b>×${stats.attackSpeed}</b></article>
        <article><small>DMG RED.</small><b>${stats.reduction}%</b></article>
      </section>
      <section class="stat-breakdown-v082">
        <article><h3>${escapeHtml(t("skill"))}</h3>${Object.entries(tree).filter(([,value])=>value>0).map(([key,value])=>`<p><span>${escapeHtml(nodeName(SKILL_NODES[key]))}</span><b>${SKILL_NODES[key].unit==="%"?formatPercent(value):Math.round(value*100)/100}</b></p>`).join("")||"—"}</article>
        <article><h3>${escapeHtml(t("accountBuff"))}</h3>${Object.entries(buff).filter(([,value])=>value>0).map(([key,value])=>`<p><span>${escapeHtml(key)}</span><b>${formatPercent(value)}</b></p>`).join("")||"—"}</article>
        <article><h3>GEAR</h3>${Object.entries(gear).filter(([,value])=>Number(value)!==0).map(([key,value])=>`<p><span>${escapeHtml(key)}</span><b>+${Math.round(Number(value)*10)/10}</b></p>`).join("")||"—"}</article>
      </section>
    </main>`;
}

function prepareCollection(){
  const panel=id("libraryV0551");if(!panel)return;
  const h=q(".panel-head h2",panel),p=q(".panel-head p",panel);
  if(h)h.textContent=t("collection");if(p)p.textContent=t("collectionIntro");
  qa('[data-library-tab="profile"],[data-library-tab="stats"]',panel).forEach(button=>button.classList.add("hidden"));
  window.CHERRIFT_V0551?.renderLibrary?.("skins");
}
function setEconomyRoute(route){
  runtime.economyRoute=route;
  const tab=route==="gacha"?"gacha":route==="bag"?"bag":route==="shop"?"shop":"buffs";
  q(`[data-v080-tab="${tab}"]`)?.click();
  requestAnimationFrame(()=>{
    const head=id("chests")&&q(".economy-head-v080",id("chests"));
    if(head){
      const title=q("h1",head),desc=q("p",head);
      if(title)title.textContent=route==="gacha"?t("gacha"):route==="bag"?t("bag"):route==="shop"?t("shop"):t("buffs");
      if(desc)desc.textContent=route==="gacha"?"Common, Rare és Epic Chest pity rendszer.":route==="bag"?"Food, materialok, ládák és consumable itemek.":route==="shop"?"Coin és Blossom Gem ajánlatok.":"Ideiglenes, permanent és Supporter account buffok.";
    }
  });
}
function showCustom(panelId){
  ensureCustomPanels();
  id("menu")?.classList.add("hidden");
  qa("#app > .panel").forEach(panel=>panel.classList.add("hidden"));
  id(panelId)?.classList.remove("hidden");
  document.body.classList.remove("is-playing","is-levelup","is-loading-stage");
  if(panelId==="profileV082")renderProfile();
  if(panelId==="weeklyV082")renderWeekly();
  if(panelId==="socialV082")renderSocial();
  if(panelId==="statSummaryV082")renderStatSummary();
}
function markSeen(route){
  if(!UI.save)return;
  const save=normalize(UI.save);
  if(route==="gear")save.uiV082.seenGearCount=save.inventory.length;
  if(route==="bagV082")save.uiV082.seenBagCount=Object.values(save.bag.items||{}).reduce((a,b)=>a+Number(b||0),0);
  if(route==="shopV082")save.uiV082.seenShopDay=dayKey();
  CherriftStorage.save(save);
}
function updateActiveRoute(route){
  runtime.route=route;
  qa("[data-v082-route]").forEach(button=>button.classList.toggle("active",button.dataset.v082Route===route));
  document.body.classList.toggle("v082-home",route==="menu");
  updateResourceBar();updateNotices();
}
function patchNavigation(){
  if(UI.__v082Navigation)return;
  const previousOpen=UI.open.bind(UI);
  UI.open=function openV082(panel,...args){
    closeMobileDrawer();
    let result;
    if(panel==="chests"||panel==="gachaV082"||panel==="bagV082"||panel==="shopV082"||panel==="buffsV082"){
      result=previousOpen("chests",...args);
      setEconomyRoute(panel==="bagV082"?"bag":panel==="shopV082"?"shop":panel==="buffsV082"?"buffs":"gacha");
    }else if(panel==="collectionV082"){
      result=previousOpen("libraryV0551",...args);
      requestAnimationFrame(prepareCollection);
    }else if(["profileV082","weeklyV082","socialV082","statSummaryV082"].includes(panel)){
      previousOpen("menu");showCustom(panel);result=undefined;
    }else{
      result=previousOpen(panel,...args);
      if(panel==="playerUpgrade")requestAnimationFrame(renderSkillTree);
      if(panel==="arsenalV070")requestAnimationFrame(()=>{compactArsenal();observeArsenal();});
      if(panel==="gear")requestAnimationFrame(()=>{installGearTools();decorateGearSelection();});
    }
    markSeen(panel);updateActiveRoute(panel);return result;
  };
  UI.__v082Navigation=true;
}

function patchGameplay(){
  const proto=window.CherriftGame?.prototype;if(!proto||proto.__v082SkillTree)return;
  const start=proto.start;
  proto.start=async function startV082(...args){
    const result=await start.apply(this,args);if(!this.player)return result;
    const b=skillBonuses(this.save),p=this.player;
    p.damage*=1+(b.damage||0);p.maxHp*=1+(b.maxHp||0);p.hp=Math.min(p.maxHp,p.hp*(1+(b.maxHp||0)));
    p.speed*=1+(b.movementSpeed||0);p.fireInterval/=1+(b.attackSpeed||0);
    p.crit=(Number(p.crit)||0)+(b.critChance||0);p.critDamage=(Number(p.critDamage)||1.5)+(b.critDamage||0);
    p.pickup=(Number(p.pickup)||110)+(b.pickupRange||0);p.regen=(Number(p.regen)||0)+(b.hpRegen||0);
    p.skillCooldown*=1-(b.cooldownReduction||0);
    const reduction=clamp(b.damageReduction||0,0,.75),armor=Number(p.armor)||0;
    if(reduction>0)p.armor=((100+4*armor)/(1-reduction)-100)/4;
    this.__v082Bonuses=b;return result;
  };
  const gainXp=proto.gainXp;
  proto.gainXp=function gainXpV082(value){return gainXp.call(this,Number(value||0)*(1+(skillBonuses(this.save).orbXp||0)));};
  const skill=proto.skill;
  proto.skill=function skillV082(...args){
    if(!this.player)return skill.apply(this,args);
    const old=this.player.damage,b=skillBonuses(this.save);this.player.damage=old*(1+(b.skillDamage||0));
    try{return skill.apply(this,args);}finally{this.player.damage=old;}
  };
  const damageEnemy=proto.damageEnemy;
  proto.damageEnemy=function damageEnemyV082(enemy,damage,...args){
    const b=this.__v082Bonuses||skillBonuses(this.save);let amount=Number(damage||0);
    if(enemy?.isBoss)amount*=1+(b.bossDamage||0);
    else if(enemy?.isElite||enemy?.elite)amount*=1+(b.eliteDamage||0);
    return damageEnemy.call(this,enemy,amount,...args);
  };
  const stageClear=proto.stageClear;
  proto.stageClear=function stageClearV082(...args){
    const already=!!this.stageState?.cleared,save=normalize(this.save),coinsBefore=Number(save.coins)||0;
    const result=stageClear.apply(this,args);
    if(already||!this.stageState?.cleared)return result;
    const b=skillBonuses(save),baseCoin=Math.max(0,(Number(save.coins)||0)-coinsBefore);
    const bonusCoin=Math.floor(baseCoin*(b.coinGain||0));if(bonusCoin)save.coins+=bonusCoin;
    const luck=b.luckChance||0,world=Math.max(1,Number(this.stage?.world)||1);
    if(Math.random()<clamp((b.chestDrop||0)+luck*.25,0,.18)){
      save.chests[world>=3&&Math.random()<.18?"rare":"common"]++;
    }
    if(Math.random()<clamp((b.itemDrop||0)+luck*.25,0,.18)){
      const rarity=world>=3&&Math.random()<.22?"Rare":"Common";
      const item=window.CHERRIFT_V050.createGear(world,rarity);
      window.CHERRIFT_V070.syncItemToArsenal(item,save);
      if(save.inventory.length<80)save.inventory.push(item);else save.coins+=window.CHERRIFT_V050.sellValue?.(item)||4;
    }
    CherriftStorage.save(save);return result;
  };
  proto.__v082SkillTree=true;
  const sell=UI.sellGear?.bind(UI);
  if(sell){
    UI.sellGear=function sellGearV082(itemId){
      const before=Number(this.save?.coins)||0,result=sell(itemId),gained=Math.max(0,(Number(this.save?.coins)||0)-before);
      const extra=Math.floor(gained*(skillBonuses(this.save).coinGain||0));
      if(extra){this.save.coins+=extra;CherriftStorage.save(this.save);this.refreshMenu?.();}
      return result;
    };
  }
}
function arsenalAffordable(save){
  return SLOT_ORDER.some(slot=>{
    const state=save.arsenal.slots[slot],cap=state.stars===1?10:state.stars===2?25:100;
    if(state.level>=cap)return false;
    const cost=window.CHERRIFT_V070.levelCost(state),m=save.bag.materials;
    return save.coins>=cost.coins&&(m.stones[cost.stone]||0)>=cost.stones&&(m.gearScrap||0)>=(cost.scrap||0);
  });
}
function weeklyReady(save){
  const weekly=normalizeWeekly(save),stats=save.stats||{};
  return !weekly.claimed&&(stats.runs||0)-weekly.start.runs>=5&&(stats.clears||0)-weekly.start.clears>=3&&(stats.kills||0)-weekly.start.kills>=300;
}
function updateNotices(){
  if(!UI.save)return;
  const save=normalize(UI.save),bagCount=Object.values(save.bag.items||{}).reduce((a,b)=>a+Number(b||0),0);
  const notices={
    gear:save.inventory.length>save.uiV082.seenGearCount,
    arsenal:arsenalAffordable(save),
    upgrade:save.account.skillPoints>0,
    bag:bagCount>save.uiV082.seenBagCount,
    gacha:(save.chests.common||0)+(save.chests.rare||0)+(save.chests.epic||0)+(save.keys||0)>0,
    shop:save.uiV082.seenShopDay!==dayKey(),
    achievements:unclaimedAchievementCount(save)>0,
    weekly:weeklyReady(save),
    skin:false
  };
  qa("[data-v082-notice]").forEach(dot=>dot.classList.toggle("show",!!notices[dot.dataset.v082Notice]));
}
function updateVersion(){
  document.title=window.CHERRIFT_BUILD?.title||"CHERRIFT v0.9.0 – TEST BUILD";
  const label=window.CHERRIFT_BUILD?.label||"TESZTVERZIÓ · v0.9.0";
  const boot=q(".boot-sub-v060");if(boot)boot.textContent=label;
  if(id("menuBuildVersion"))id("menuBuildVersion").textContent=label;
  qa(".version-badge-v063,[data-v063-version]").forEach(element=>element.textContent=label);
  const kicker=q("#menuDashboardV060 .dashboard-kicker-v060");
  if(kicker)kicker.hidden=true;
}
function refreshAll(){
  document.body.classList.toggle("v082-home",runtime.route==="menu");
  rebuildRail();rebuildHome();ensureMobileDrawer();updateRailProfile();updateResourceBar();updateNotices();
  qa("[data-v082-route]").forEach(button=>button.classList.toggle("active",button.dataset.v082Route===runtime.route));
  if(runtime.route==="playerUpgrade")renderSkillTree();
  if(runtime.route==="profileV082")renderProfile();
  if(runtime.route==="weeklyV082")renderWeekly();
  if(runtime.route==="statSummaryV082")renderStatSummary();
  if(runtime.route==="arsenalV070")compactArsenal();
  if(runtime.route==="gear"){installGearTools();decorateGearSelection();}
}

function bindEvents(){
  if(document.documentElement.dataset.v082Events)return;
  document.documentElement.dataset.v082Events="1";
  document.addEventListener("click",event=>{
    const close=event.target.closest("[data-v082-modal-close]");
    if(close){event.preventDefault();closeModal();return;}
    const mobile=event.target.closest("[data-v082-toggle-mobile]");
    if(mobile){event.preventDefault();id("mobileMenuV082")?.classList.toggle("hidden");return;}
    const opener=event.target.closest("[data-v082-open]");
    if(opener){event.preventDefault();event.stopImmediatePropagation();UI.open(opener.dataset.v082Open);return;}
    const support=event.target.closest("[data-v082-support]");
    if(support){
      event.preventDefault();UI.open("supportV063");
      requestAnimationFrame(()=>q(`[data-v063-support-type="${support.dataset.v082Support}"]`)?.click());
      return;
    }
    const skillButton=event.target.closest("[data-v082-skill]");
    if(skillButton){event.preventDefault();upgradeSkill(skillButton.dataset.v082Skill);return;}
    if(event.target.closest("[data-v082-reset-tree]")){event.preventDefault();resetSkillTree();return;}
    const material=event.target.closest("[data-v082-material]");
    if(material){event.preventDefault();event.stopPropagation();materialInfo(material.dataset.v082Material);return;}
    if(event.target.closest("[data-v082-select-mode]")){event.preventDefault();toggleSelectionMode();return;}
    if(event.target.closest("[data-v082-select-common]")){event.preventDefault();selectCommon();return;}
    if(event.target.closest("[data-v082-bulk-sell]")){event.preventDefault();bulkSell();return;}
    if(event.target.closest("[data-v082-bulk-dismantle]")){event.preventDefault();bulkDismantle();return;}
    if(event.target.closest("[data-v082-claim-weekly]")){event.preventDefault();claimWeekly();return;}
    const title=event.target.closest("[data-v082-title]");
    if(title){event.preventDefault();selectTitle(title.dataset.v082Title);return;}
    const card=event.target.closest("#gearInventoryGridV0560 [data-v0560-item-id]");
    if(card&&runtime.selectionMode){
      event.preventDefault();event.stopImmediatePropagation();
      const item=inventoryItem(card.dataset.v0560ItemId);if(!item||item.locked)return;
      if(runtime.selectedGear.has(item.id))runtime.selectedGear.delete(item.id);
      else runtime.selectedGear.add(item.id);
      decorateGearSelection();return;
    }
  },true);
  window.addEventListener("resize",refreshAll);
  window.addEventListener("cherrift:languagechange",()=>{
    requestAnimationFrame(()=>{
      const panel=id("playerUpgrade");
      if(panel){panel.dataset.v082Ready="";ensurePlayerUpgrade();}
      rebuildRail();rebuildHome();renderMobileDrawer();renderSkillTree();refreshAll();
    });
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshAll();});
}
function patchUi(){
  if(UI.__v082Ui)return;
  const init=UI.init?.bind(UI);
  if(init)UI.init=function initV082(save,game){
    normalize(save);
    const result=init(save,game);
    ensureCustomPanels();ensurePlayerUpgrade();rebuildRail();rebuildHome();ensureMobileDrawer();ensureModal();
    installGearTools();compactArsenal();observeArsenal();updateVersion();refreshAll();
    window.setTimeout(refreshAll,0);
    return result;
  };
  const refresh=UI.refreshMenu?.bind(UI);
  if(refresh)UI.refreshMenu=function refreshMenuV082(...args){
    if(this.save)normalize(this.save);
    const result=refresh(...args);
    requestAnimationFrame(refreshAll);
    return result;
  };
  const renderGear=UI.renderGear?.bind(UI);
  if(renderGear)UI.renderGear=function renderGearV082(...args){
    const result=renderGear(...args);
    requestAnimationFrame(()=>{installGearTools();decorateGearSelection();});
    return result;
  };
  const showGame=UI.showGame?.bind(UI);
  if(showGame)UI.showGame=function showGameV082(...args){
    closeMobileDrawer();id("resourceBarV082")?.classList.add("hidden");
    return showGame(...args);
  };
  UI.__v082Ui=true;
}

ensureCss();
patchStorage();
ensureCustomPanels();
ensureResourceBar();
ensureModal();
patchNavigation();
patchGameplay();
patchUi();
bindEvents();
updateVersion();

window.CHERRIFT_V082={
  version:VERSION,displayVersion:DISPLAY_VERSION,normalize,skillBonuses,renderSkillTree,
  compactArsenal,renderProfile,renderWeekly,renderStatSummary,refresh:refreshAll,
  bindMenuTools,openMenuTool
};
console.info("[CHERRIFT] v0.8.2 Systems, navigation, Arsenal, Gear and Skill Tree rework loaded.");
})();
