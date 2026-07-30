(() => {
"use strict";
const VERSION="0.5.2-progression-achievements-mobile-panels";
const id=n=>document.getElementById(n);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
if(!window.UI||!window.CherriftStorage||!window.CherriftGame||!window.CHERRIFT_V040){console.error("[CHERRIFT v0.5.2] Dependencies missing");return;}
function ensureCss(){if(id("v052css"))return;const l=document.createElement("link");l.id="v052css";l.rel="stylesheet";l.href="v052.css?v=052";document.head.appendChild(l);}
function levelCost(level){return Math.floor(500+Math.pow(Math.max(1,level),1.72)*260);}
const TREE={
 power:{name:"Bloom Power",icon:"⚔️",desc:"+3% base damage per rank",max:10},
 vitality:{name:"Soft Vitality",icon:"❤️",desc:"+8 maximum HP per rank",max:10},
 haste:{name:"Bunny Haste",icon:"💨",desc:"+1.5% movement and attack speed per rank",max:10},
 fortune:{name:"Lucky Petals",icon:"🍀",desc:"+1% crit per rank",max:10}
};
const ACH=[
 {id:"first_clear",name:"First Bloom",desc:"Clear your first stage.",icon:"🌸",reward:{coins:50},test:s=>Object.keys(s.clearedStages||{}).length>=1},
 {id:"ten_clears",name:"Pathfinder",desc:"Complete 10 stage clears.",icon:"🗺️",reward:{coins:150,keys:1},test:s=>Object.values(s.stageStats||{}).reduce((a,x)=>a+(x?.clears||0),0)>=10},
 {id:"world1",name:"Meadow Guardian",desc:"Clear World 1-5.",icon:"👑",reward:{coins:250,keys:1},test:s=>!!s.clearedStages?.world_1_5},
 {id:"world2",name:"Night Survivor",desc:"Clear World 2-5.",icon:"🌙",reward:{coins:350,keys:2},test:s=>!!s.clearedStages?.world_2_5},
 {id:"level5",name:"Growing Bunny",desc:"Reach Player Level 5.",icon:"⭐",reward:{coins:200},test:s=>(s.account?.level||1)>=5},
 {id:"level10",name:"Bloom Veteran",desc:"Reach Player Level 10.",icon:"✨",reward:{coins:500,keys:2},test:s=>(s.account?.level||1)>=10},
 {id:"rare",name:"Rare Find",desc:"Obtain a Rare item.",icon:"💎",reward:{coins:100},test:s=>(s.lootStats?.rareDrops||0)>=1},
 {id:"epic",name:"Epic Treasure",desc:"Obtain an Epic item.",icon:"🔮",reward:{coins:250,keys:1},test:s=>(s.lootStats?.epicDrops||0)>=1},
 {id:"legendary",name:"Golden Miracle",desc:"Obtain a Legendary item.",icon:"🏆",reward:{coins:600,keys:3},test:s=>(s.lootStats?.legendaryDrops||0)>=1},
 {id:"collector",name:"Collector",desc:"Own 20 equipment items.",icon:"🎒",reward:{coins:180},test:s=>(s.inventory?.length||0)>=20}
];
function normalize(s){
 s.account=s.account||{};
 if(!s.account.manualV052){
   const total=Math.max(0,Number(s.account.totalXp)||Number(s.account.xp)||0);
   s.account.level=1;s.account.xp=total;s.account.totalXp=total;s.account.skillPoints=0;
   s.account.tree={power:0,vitality:0,haste:0,fortune:0};s.account.manualV052=true;
 }
 s.account.level=Math.max(1,Math.floor(+s.account.level||1));
 s.account.xp=Math.max(0,+s.account.xp||0);
 s.account.totalXp=Math.max(s.account.xp,+s.account.totalXp||0);
 s.account.skillPoints=Math.max(0,Math.floor(+s.account.skillPoints||0));
 s.account.tree={power:0,vitality:0,haste:0,fortune:0,...(s.account.tree||{})};
 s.account.xpNext=levelCost(s.account.level);
 s.achievements=s.achievements||{};s.achievementClaims=s.achievementClaims||{};
 return s;
}
const baseLoad=CherriftStorage.load.bind(CherriftStorage);
const baseSave=CherriftStorage.save.bind(CherriftStorage);
CherriftStorage.load=function(){const s=normalize(baseLoad());baseSave(s);return s;};
CherriftStorage.save=function(s){return baseSave(normalize(s));};
function rewardText(r){return [r.coins?`${r.coins} coins`:"",r.keys?`${r.keys} keys`:""].filter(Boolean).join(" · ");}
function updateAchievements(s){
 normalize(s);let changed=false;
 for(const a of ACH)if(!s.achievements[a.id]&&a.test(s)){s.achievements[a.id]=Date.now();changed=true;UI.toast?.(`Achievement unlocked: ${a.name}`);}
 if(changed)baseSave(s);
}
function claimAchievement(a){
 const s=UI.save;if(!s.achievements[a.id]||s.achievementClaims[a.id])return;
 s.coins+=(a.reward.coins||0);s.keys+=(a.reward.keys||0);s.achievementClaims[a.id]=true;
 CherriftStorage.save(s);UI.toast(`Claimed: ${rewardText(a.reward)}`);renderAchievements();UI.refreshMenu();
}
function ensurePanels(){
 if(id("playerUpgrade"))return;
 id("app").insertAdjacentHTML("beforeend",`
 <section id="playerUpgrade" class="panel hidden v052-panel"><header class="panel-head"><button class="back">←</button><div><h2>Player Upgrade</h2><p>Collect XP, level up manually, then spend skill points.</p></div></header><div class="v052-upgrade-layout"><section class="glass v052-level-card"><div class="v052-level-orb"><small>PLAYER LEVEL</small><b id="v052Level">1</b></div><div class="v052-xp"><i id="v052XpFill"></i></div><p id="v052XpText"></p><button id="v052LevelUp" class="menu-btn primary center">LEVEL UP</button><small id="v052PointText"></small></section><section class="glass v052-tree"><h3>Bloom Skill Tree</h3><div id="v052Tree"></div></section></div></section>
 <section id="achievements" class="panel hidden v052-panel"><header class="panel-head"><button class="back">←</button><div><h2>Achievements</h2><p>Permanent milestones and rewards.</p></div></header><div id="v052Achievements" class="v052-achievements"></div></section>`);
}
function ensureDesktopButtons(){
 const nav=q(".menu-left .main-nav");if(!nav||id("desktopUpgradeV052"))return;
 const settings=q('[data-open="settings"]',nav);
 const b1=document.createElement("button");b1.id="desktopUpgradeV052";b1.className="menu-btn";b1.dataset.open="playerUpgrade";b1.innerHTML="<span>🌟</span><i>PLAYER</i><em>UPGRADES</em><b>›</b>";
 const b2=document.createElement("button");b2.id="desktopAchievementsV052";b2.className="menu-btn";b2.dataset.open="achievements";b2.innerHTML="<span>🏆</span><i>ACHIEVEMENTS</i><em>REWARDS</em><b>›</b>";
 nav.insertBefore(b1,settings);nav.insertBefore(b2,settings);
}
function fixedMobileNav(){
 let nav=id("globalMobileNavV052");
 if(!nav){nav=document.createElement("nav");nav.id="globalMobileNavV052";nav.className="global-mobile-nav-v052";nav.innerHTML=`
 <button data-v052-open="gear"><span>🛡️</span><b>Gear</b></button>
 <button data-v052-open="playerUpgrade"><span>🌟</span><b>Upgrade</b></button>
 <button data-v052-open="menu" class="home"><span>🏠</span><b>Home</b></button>
 <button data-v052-open="achievements"><span>🏆</span><b>Goals</b></button>
 <button data-v052-open="skins"><span>🐇</span><b>Cherry</b></button>`;document.body.appendChild(nav);qa("[data-v052-open]",nav).forEach(b=>b.onclick=()=>UI.open(b.dataset.v052Open));}
 return nav;
}
function renderUpgrade(){
 const s=normalize(UI.save),a=s.account,cost=levelCost(a.level);
 id("v052Level").textContent=a.level;id("v052XpFill").style.width=`${Math.min(100,a.xp/cost*100)}%`;
 id("v052XpText").textContent=`${Math.floor(a.xp)} / ${cost} XP`;id("v052PointText").textContent=`${a.skillPoints} skill point${a.skillPoints===1?"":"s"} available`;
 const btn=id("v052LevelUp");btn.disabled=a.xp<cost;btn.textContent=a.xp>=cost?"LEVEL UP":"MORE XP NEEDED";
 id("v052Tree").innerHTML=Object.entries(TREE).map(([k,n])=>{const rank=a.tree[k]||0,disabled=a.skillPoints<1||rank>=n.max;return `<article class="v052-node ${rank>=n.max?"max":""}"><span>${n.icon}</span><div><h4>${n.name}</h4><p>${n.desc}</p><small>Rank ${rank}/${n.max}</small></div><button data-node="${k}" ${disabled?"disabled":""}>+</button></article>`;}).join("");
 qa("[data-node]",id("v052Tree")).forEach(b=>b.onclick=()=>{const k=b.dataset.node;if(a.skillPoints<1||a.tree[k]>=TREE[k].max)return;a.skillPoints--;a.tree[k]++;CherriftStorage.save(s);renderUpgrade();UI.refreshMenu();});
}
function renderAchievements(){
 const s=normalize(UI.save);updateAchievements(s);
 id("v052Achievements").innerHTML=ACH.map(a=>{const unlocked=!!s.achievements[a.id],claimed=!!s.achievementClaims[a.id];return `<article class="glass v052-achievement ${unlocked?"unlocked":"locked"}"><span>${a.icon}</span><div><h3>${a.name}</h3><p>${a.desc}</p><small>${rewardText(a.reward)}</small></div><button data-ach="${a.id}" ${!unlocked||claimed?"disabled":""}>${claimed?"CLAIMED":unlocked?"CLAIM":"LOCKED"}</button></article>`;}).join("");
 qa("[data-ach]",id("v052Achievements")).forEach(b=>b.onclick=()=>claimAchievement(ACH.find(a=>a.id===b.dataset.ach)));
}
function levelUp(){
 const a=normalize(UI.save).account,cost=levelCost(a.level);if(a.xp<cost)return;
 a.xp-=cost;a.level++;a.skillPoints++;a.xpNext=levelCost(a.level);
 CherriftStorage.save(UI.save);updateAchievements(UI.save);renderUpgrade();UI.refreshMenu();UI.toast(`Player Level ${a.level}! +1 skill point`);
}
function applyTree(game){
 const t=normalize(game.save).account.tree,p=game.player;if(!p)return;
 p.damage*=1+(t.power||0)*.03;p.maxHp+=(t.vitality||0)*8;p.hp+=(t.vitality||0)*8;
 p.speed*=1+(t.haste||0)*.015;p.fireInterval/=1+(t.haste||0)*.015;p.crit+=(t.fortune||0)*.01;
}
ensureCss();ensurePanels();ensureDesktopButtons();fixedMobileNav();id("v052LevelUp").onclick=levelUp;
const oldInit=UI.init.bind(UI);
UI.init=function(s,g){normalize(s);const r=oldInit(s,g);ensurePanels();ensureDesktopButtons();fixedMobileNav();updateAchievements(s);return r;};
const oldOpen=UI.open.bind(UI);
UI.open=function(panel,...args){
 const custom=panel==="playerUpgrade"||panel==="achievements";
 if(custom){document.body.classList.remove("is-playing");["menu","skins","gear","chests","settings","worlds","playerUpgrade","achievements"].forEach(n=>id(n)?.classList.toggle("hidden",n!==panel));["hud","skill","stageHud"].forEach(n=>id(n)?.classList.add("hidden"));}
 else oldOpen(panel,...args);
 if(panel==="playerUpgrade")renderUpgrade();if(panel==="achievements")renderAchievements();fixedMobileNav().dataset.active=panel;
};
const oldRefresh=UI.refreshMenu.bind(UI);
UI.refreshMenu=function(...args){const r=oldRefresh(...args);normalize(this.save);updateAchievements(this.save);const a=this.save.account,cost=levelCost(a.level);if(id("mobilePlayerLevelV051"))id("mobilePlayerLevelV051").textContent=`Level ${a.level}`;if(id("mobileProfileXpFillV051"))id("mobileProfileXpFillV051").style.width=`${Math.min(100,a.xp/cost*100)}%`;return r;};
const oldStart=CherriftGame.prototype.start;
CherriftGame.prototype.start=async function(...args){const r=await oldStart.apply(this,args);applyTree(this);return r;};
const oldStageClear=CherriftGame.prototype.stageClear;
CherriftGame.prototype.stageClear=function(...args){
 const a=normalize(this.save).account,before={level:a.level,xp:a.xp,total:a.totalXp};
 const r=oldStageClear.apply(this,args),after=this.save.account,gained=Math.max(0,(after.totalXp||0)-before.total);
 after.level=before.level;after.xp=before.xp+gained;after.totalXp=before.total+gained;after.xpNext=levelCost(after.level);
 updateAchievements(this.save);CherriftStorage.save(this.save);return r;
};
for(const s of CHERRIFT_V040.stages)if(s.world===3){s.theme="savannah";s.title=s.title.replace("Emberfall Path","Golden Grasslands").replace("Cinder Garden","Acacia Trail").replace("Broken Furnace","Sunstone Valley").replace("Ashen Crown","Lionwind Ridge").replace("Heart of Cinders","Savannah Heart");s.desc="A warm savannah stage with golden grass, acacia trees and placeholder creatures.";}
const oldWorld=UI.renderWorldPanel?.bind(UI);
if(oldWorld)UI.renderWorldPanel=function(...a){const r=oldWorld(...a),s=CHERRIFT_V040.stages[this.worldCarouselIndex||0],img=id("carouselStageImage");if(s?.world===3&&img){img.classList.add("savannah-v052");img.style.backgroundImage="radial-gradient(circle at 70% 18%,rgba(255,232,130,.48),transparent 25%),linear-gradient(180deg,#88bddd 0 44%,#d3b34f 45%,#786b2d 100%)";}return r;};
window.CHERRIFT_V052={version:VERSION,levelCost,TREE,ACH};
console.info("[CHERRIFT v0.5.2] Manual progression, achievements and fixed mobile panels loaded.");
})();