(() => {
"use strict";

const VERSION = "0.5.5.7-warrior-succubus-ui-assets";
const id = n => document.getElementById(n);
const q = (s,r=document) => r.querySelector(s);
const qa = (s,r=document) => Array.from(r.querySelectorAll(s));

if (!window.CherriftGame || !window.CHERRIFT_V0556 || !window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA) {
  console.error("[CHERRIFT v0.5.5.7] v0.5.5.6 is required.");
  return;
}

function addCss() {
  if (id("v0557css")) return;
  const link = document.createElement("link");
  link.id = "v0557css";
  link.rel = "stylesheet";
  link.href = "v0557.css?v=0557";
  document.head.appendChild(link);
  document.body.classList.add("ui-assets-v0557");
}

const PATHS = {
  base: {
    splash:"assets/player/skins/base_cherry/base_cherry_splashart.png",
    icon:"assets/player/skins/base_cherry/base_cherry_icon.png"
  },
  fairy: {
    splash:"assets/player/skins/fairy_cherry/fairy_cherry_splashart.jpg",
    icon:"assets/player/skins/fairy_cherry/fairy_cherry_icon.png"
  },
  beast: {
    splash:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_splashart.png",
    icon:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_icon.png"
  },
  ninja: {
    splash:"assets/player/skins/ninja_cherry/ninja_cherry_splashart.png",
    icon:"assets/player/skins/ninja_cherry/ninja_cherry_icon.png"
  },
  succubus: {
    splash:"assets/player/skins/succubus_cherry/succubus_cherry_splashart.png",
    icon:"assets/player/skins/succubus_cherry/succubus_cherry_icon.png"
  },
  warrior: {
    splash:"assets/player/skins/warrior_cherry/warrior_cherry_splashart.png",
    icon:"assets/player/skins/warrior_cherry/warrior_cherry_icon.png"
  }
};

const DIRS = ["down","up","left","right"];
const makeDirs = (folder,prefix,state) =>
  Object.fromEntries(DIRS.map(dir => [
    dir,
    `assets/player/skins/${folder}/${prefix}_${state}_${dir}.png?v=0557`
  ]));

const succubusConfig = CHERRIFT_CONFIG.player.skins.succubus_cherry || {};
Object.assign(succubusConfig,{
  id:"succubus_cherry",
  folder:"succubus_cherry",
  attackType:"ranged",
  skillType:"soul_drain",
  hpDrainRate:.05,
  skillDrainRate:.10,
  shieldRate:.15,
  states:{
    idle:{fps:3,frames:4,dirs:makeDirs("succubus_cherry","succubus_cherry","idle")},
    walk:{fps:8,frames:6,dirs:makeDirs("succubus_cherry","succubus_cherry","walk")},
    attack:{fps:18,frames:6,duration:.34,dirs:makeDirs("succubus_cherry","succubus_cherry","melee")},
    skill:{fps:16,frames:6,duration:.55,dirs:makeDirs("succubus_cherry","succubus_cherry","ranged")}
  }
});
CHERRIFT_CONFIG.player.skins.succubus_cherry = succubusConfig;

CHERRIFT_CONFIG.player.skins.warrior_cherry = {
  id:"warrior_cherry",
  folder:"warrior_cherry",
  attackType:"melee",
  skillType:"whirlwind",
  meleeRange:150,
  meleeCone:105,
  meleeDamageMult:1.18,
  whirlwindRadius:185,
  whirlwindDuration:.72,
  whirlwindTicks:5,
  whirlwindDamagePerTick:.72,
  hpBonus:.05,
  states:{
    idle:{fps:3,frames:4,dirs:makeDirs("warrior_cherry","warrior_cherry","idle")},
    walk:{fps:8,frames:6,dirs:makeDirs("warrior_cherry","warrior_cherry","walk")},
    attack:{fps:18,frames:6,duration:.34,dirs:makeDirs("warrior_cherry","warrior_cherry","melee")},
    skill:{fps:16,frames:6,duration:.72,dirs:makeDirs("warrior_cherry","warrior_cherry","ranged")}
  }
};

const skinInfo = {
  cherry_default:{
    splash:PATHS.base.splash,icon:PATHS.base.icon
  },
  fairy_cherry:{
    splash:PATHS.fairy.splash,icon:PATHS.fairy.icon
  },
  beastclaw_cherry:{
    splash:PATHS.beast.splash,icon:PATHS.beast.icon
  },
  ninja_cherry:{
    splash:PATHS.ninja.splash,icon:PATHS.ninja.icon
  },
  succubus_cherry:{
    splash:PATHS.succubus.splash,icon:PATHS.succubus.icon,
    name:"Succubus Cherry",rarity:"Legendary",
    weapon:"Crimson Claws",skill:"Soul Drain",
    passive:"5% HP Drain",
    desc:"Vörös karmolásokkal támad. A Soul Drain célkövető lelkekkel sebez, gyógyít, teljes HP-n pedig shieldet készít."
  },
  warrior_cherry:{
    splash:PATHS.warrior.splash,icon:PATHS.warrior.icon,
    name:"Warrior Cherry",rarity:"Rare",emoji:"⚔️",
    weapon:"Warrior Sword",skill:"Whirlwind",
    passive:"+5% HP Bonus",
    desc:"Közelharci kardforgató Cherry. A Whirlwind körbeforduló területi kardcsapásokkal sebzi a körülötte lévő ellenfeleket.",
    stats:{damage:4,speed:0},
    gradient:["#5fb8ff","#173b70"]
  }
};

for (const skin of CHERRIFT_DATA.skins) {
  const extra = skinInfo[skin.id];
  if (extra) Object.assign(skin,extra);
}
if (!CHERRIFT_DATA.skins.some(s => s.id === "warrior_cherry")) {
  CHERRIFT_DATA.skins.push({id:"warrior_cherry",...skinInfo.warrior_cherry});
}

function normalizeSave(save) {
  save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
  for (const skin of ["ninja_cherry","succubus_cherry","warrior_cherry"]) {
    if (!save.unlockedSkins.includes(skin)) save.unlockedSkins.push(skin);
  }
  return save;
}

const oldDefaults = CherriftStorage.defaults.bind(CherriftStorage);
const oldLoad = CherriftStorage.load.bind(CherriftStorage);
const oldSave = CherriftStorage.save.bind(CherriftStorage);
CherriftStorage.defaults = () => normalizeSave(oldDefaults());
CherriftStorage.load = () => {
  const save = normalizeSave(oldLoad());
  oldSave(save);
  return save;
};
CherriftStorage.save = save => oldSave(normalizeSave(save));

const proto = CherriftGame.prototype;

function direction(dx,dy) {
  return Math.abs(dx)>Math.abs(dy)
    ? (dx<0?"left":"right")
    : (dy<0?"up":"down");
}

function drawExactState(game,ctx,p,stateName,dir,timer,duration) {
  const cfg = game.activeSkinConfig();
  const state = cfg?.states?.[stateName];
  const image = game.assets.get(`player_${p.skin}_${stateName}_${dir}`);
  if (!state || !image) return false;

  const frameCount = Math.max(1,Math.min(state.frames || 1,Math.floor(image.width/192)||1));
  const elapsed = Math.max(0,(duration || state.duration || .4)-(timer || 0));
  const frame = Math.min(frameCount-1,Math.floor(elapsed*(state.fps || 12)));
  const displayW = CHERRIFT_CONFIG.player.displayWidth || 116;
  const displayH = CHERRIFT_CONFIG.player.displayHeight || 116;

  ctx.drawImage(
    image,
    frame*192,0,192,192,
    Math.round(p.x-displayW/2),
    Math.round(p.y-displayH+34),
    displayW,displayH
  );
  return true;
}

function swordAttack(game,target) {
  const p=game.player,cfg=game.activeSkinConfig();
  const dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy)||1;
  const nx=dx/len,ny=dy/len;
  p.lastDir=direction(dx,dy);
  p.attackDir=p.lastDir;
  p.attackCastDuration=cfg.states.attack.duration || .34;
  p.attackCastTimer=p.attackCastDuration;
  p.fireTimer=Math.max(p.fireInterval,p.attackCastDuration*.8);

  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const ex=enemy.x-p.x,ey=enemy.y-p.y,d=Math.hypot(ex,ey)||1;
    if (d>(cfg.meleeRange || 150)+enemy.r) continue;
    const dot=(ex/d)*nx+(ey/d)*ny;
    const cone=Math.cos(((cfg.meleeCone || 105)/2)*Math.PI/180);
    if (dot<cone) continue;
    game.damageEnemy(enemy,p.damage*(cfg.meleeDamageMult || 1.18));
  }

  game.effects.push({
    type:"warrior_slash",x:p.x,y:p.y,
    angle:Math.atan2(ny,nx),t:0,life:.25
  });
}

const previousStart=proto.start;
proto.start=async function(...args){
  const result=await previousStart.apply(this,args);
  if (!this.player) return result;

  this.player.attackCastTimer=0;
  this.player.attackCastDuration=0;

  if (this.player.skin==="warrior_cherry") {
    const bonus=this.activeSkinConfig().hpBonus || .05;
    this.player.maxHp=Math.round(this.player.maxHp*(1+bonus));
    this.player.hp=this.player.maxHp;
    this.player.attackType="melee";
    this.player.whirlwindTimer=0;
    this.player.whirlwindTickTimer=0;
    this.player.whirlwindTick=0;
  }
  return result;
};

const previousAutoFire=proto.autoFire;
proto.autoFire=function(){
  const p=this.player;
  if (!p) return;
  p.attackCastTimer=Math.max(0,p.attackCastTimer || 0);

  if (p.skin==="warrior_cherry") {
    if (p.fireTimer>0 || p.whirlwindTimer>0) return;
    const target=this.nearest(this.activeSkinConfig().meleeRange+35);
    if (!target) return;
    swordAttack(this,target);
    return;
  }

  const before=p.fireTimer;
  const result=previousAutoFire.call(this);
  if (p.skin==="succubus_cherry" && before<=0 && p.fireTimer>0) {
    const target=this.nearest();
    if (target) {
      p.attackDir=direction(target.x-p.x,target.y-p.y);
      p.lastDir=p.attackDir;
    }
    p.attackCastDuration=.34;
    p.attackCastTimer=.34;
  }
  return result;
};

const previousSkill=proto.skill;
proto.skill=function(){
  const p=this.player;
  if (!p || p.skin!=="warrior_cherry") return previousSkill.call(this);
  if (p.skillTimer>0) return;

  const cfg=this.activeSkinConfig();
  p.skillTimer=p.skillCooldown;
  p.skillCastDuration=cfg.whirlwindDuration || .72;
  p.skillCastTimer=p.skillCastDuration;
  p.skillDir=p.lastDir || "down";
  p.whirlwindTimer=p.skillCastDuration;
  p.whirlwindTickTimer=0;
  p.whirlwindTick=0;
  p.invuln=Math.max(p.invuln || 0,.28);

  this.effects.push({
    type:"whirlwind_start",x:p.x,y:p.y,t:0,life:.72
  });
};

const previousUpdate=proto.update;
proto.update=function(dt){
  const p=this.player;
  if (p) p.attackCastTimer=Math.max(0,(p.attackCastTimer || 0)-dt);

  if (p?.skin==="warrior_cherry" && p.whirlwindTimer>0) {
    p.whirlwindTimer=Math.max(0,p.whirlwindTimer-dt);
    p.whirlwindTickTimer-=dt;

    const cfg=this.activeSkinConfig();
    if (p.whirlwindTickTimer<=0 && p.whirlwindTick<(cfg.whirlwindTicks || 5)) {
      p.whirlwindTick++;
      p.whirlwindTickTimer=(cfg.whirlwindDuration || .72)/(cfg.whirlwindTicks || 5);

      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        if (Math.hypot(enemy.x-p.x,enemy.y-p.y)<(cfg.whirlwindRadius || 185)+enemy.r) {
          this.damageEnemy(enemy,p.damage*(cfg.whirlwindDamagePerTick || .72));
        }
      }

      this.effects.push({
        type:"whirlwind_tick",x:p.x,y:p.y,
        rotation:p.whirlwindTick*1.1,t:0,life:.23
      });
    }
  }

  return previousUpdate.call(this,dt);
};

const previousDrawPlayer=proto.drawPlayer;
proto.drawPlayer=function(ctx,p){
  if (["warrior_cherry","succubus_cherry"].includes(p?.skin)) {
    if ((p.attackCastTimer || 0)>0) {
      const dir=p.attackDir || p.lastDir || "down";
      if (drawExactState(this,ctx,p,"attack",dir,p.attackCastTimer,p.attackCastDuration)) return;
    }
    if (p.skin==="warrior_cherry" && (p.skillCastTimer || 0)>0) {
      const dir=p.skillDir || p.lastDir || "down";
      if (drawExactState(this,ctx,p,"skill",dir,p.skillCastTimer,p.skillCastDuration)) return;
    }
  }
  return previousDrawPlayer.call(this,ctx,p);
};

const previousDrawEffect=proto.drawEffect;
proto.drawEffect=function(ctx,e){
  if (!["warrior_slash","whirlwind_start","whirlwind_tick"].includes(e.type)) {
    return previousDrawEffect.call(this,ctx,e);
  }

  const alpha=Math.max(0,1-e.t/e.life);
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.globalAlpha=alpha;
  ctx.lineCap="round";

  if (e.type==="warrior_slash") {
    ctx.rotate(e.angle || 0);
    ctx.strokeStyle="#a9ddff";
    ctx.shadowColor="#4aa8ff";
    ctx.shadowBlur=16;
    ctx.lineWidth=8;
    ctx.beginPath();
    ctx.arc(0,0,78,-.72,.72);
    ctx.stroke();
  } else {
    ctx.rotate((e.rotation || 0)+(1-alpha)*2.4);
    ctx.strokeStyle=e.type==="whirlwind_start"?"rgba(120,205,255,.72)":"#d4efff";
    ctx.shadowColor="#4aa8ff";
    ctx.shadowBlur=18;
    ctx.lineWidth=e.type==="whirlwind_start"?7:9;
    ctx.beginPath();
    ctx.arc(0,0,e.type==="whirlwind_start"?70+(1-alpha)*115:135,-1.2,1.2);
    ctx.stroke();
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.arc(0,0,e.type==="whirlwind_start"?70+(1-alpha)*115:135,-1.2,1.2);
    ctx.stroke();
  }
  ctx.restore();
};

function currentSkin() {
  return CHERRIFT_DATA.skins[UI.skinIndex || 0] || CHERRIFT_DATA.skins[0];
}

function skinImage(path,alt="") {
  const img=document.createElement("img");
  img.src=path;
  img.alt=alt;
  img.loading="eager";
  img.draggable=false;
  return img;
}

const previousSkinCarousel=UI.renderSkinCarousel?.bind(UI);
if (previousSkinCarousel) {
  UI.renderSkinCarousel=function(...args){
    const result=previousSkinCarousel(...args);
    const skin=currentSkin();
    const splash=id("skinSplash");
    const portrait=id("skinPortrait");
    const mini=id("skinMini");

    if (splash && skin?.splash) {
      splash.style.backgroundImage=
        `linear-gradient(180deg,rgba(8,4,14,.02),rgba(8,4,14,.46)),url("${skin.splash}")`;
      splash.style.backgroundSize="cover";
      splash.style.backgroundPosition="center top";
    }

    if (portrait) {
      portrait.textContent="";
      portrait.classList.add("skin-image-holder-v0557");
      if (skin?.icon) portrait.appendChild(skinImage(skin.icon,skin.name));
    }

    if (mini) {
      mini.textContent="";
      mini.classList.add("skin-image-holder-v0557","mini-v0557");
      if (skin?.icon) mini.appendChild(skinImage(skin.icon,skin.name));
    }

    const bonus=id("skinBonusV055");
    if (bonus && skin?.passive) {
      bonus.innerHTML=`<small>PASSIVE BONUS</small><b>${skin.passive}</b>`;
    }
    return result;
  };
}

function decorateSkinCollection() {
  const body=id("libraryBodyV0551");
  if (!body) return false;
  const cards=qa(".v0551-collect",body);
  if (cards.length!==CHERRIFT_DATA.skins.length) return false;

  let changed=false;

  cards.forEach((card,index)=>{
    const skin=CHERRIFT_DATA.skins[index];
    const holder=q("span",card);
    if (!holder || !skin?.icon || card.classList.contains("unknown")) return;
    holder.classList.add("skin-collection-icon-v0557");

    const image=holder.firstElementChild;
    const alreadyDecorated=
      holder.childNodes.length===1 &&
      image?.tagName==="IMG" &&
      image.getAttribute("src")===skin.icon &&
      image.getAttribute("alt")===(skin.name || "") &&
      image.getAttribute("draggable")==="false";

    if (alreadyDecorated) return;
    holder.replaceChildren(skinImage(skin.icon,skin.name));
    changed=true;
  });

  return changed;
}

document.addEventListener("click",event=>{
  const tab=event.target.closest('[data-library-tab="skins"]');
  if (tab) setTimeout(decorateSkinCollection,0);
},true);

const libraryBody=id("libraryBodyV0551");
if (libraryBody) {
  const options={subtree:true,childList:true};
  const observer=new MutationObserver(mutations=>{
    if (
      id("libraryV0551")?.classList.contains("hidden") ||
      !mutations.some(mutation=>mutation.type==="childList")
    ) return;

    observer.disconnect();
    try {
      decorateSkinCollection();
    } finally {
      if (libraryBody.isConnected) observer.observe(libraryBody,options);
    }
  });
  observer.observe(libraryBody,options);
}

addCss();

window.CHERRIFT_V0557={
  version:VERSION,
  warrior:true,
  succubusRemake:true,
  uiAssetTheme:true
};

console.info("[CHERRIFT] v0.5.5.7 Warrior + Succubus remake + UI assets loaded.");
})();
