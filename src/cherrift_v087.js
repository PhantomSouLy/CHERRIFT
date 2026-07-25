(() => {
"use strict";

const VERSION = "0.8.7-skin-identity";
const DISPLAY_VERSION = "v0.8.7";
const SKINS = ["mage_cherry", "archer_cherry"];
const DIRECTIONS = ["down", "up", "left", "right"];

if (!window.CherriftGame || !window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA || !window.CherriftStorage) return;

function ensureCss() {
  if (document.getElementById("v087css")) return;
  const link = document.createElement("link");
  link.id = "v087css";
  link.rel = "stylesheet";
  link.href = "v087.css?v=090";
  document.head.appendChild(link);
}

function state(folder, name, frames, fps, duration) {
  const dirs = {};
  for (const direction of DIRECTIONS) dirs[direction] = `assets/player/skins/${folder}/${folder}_${name}_${direction}.png?v=090`;
  return {frames, fps, ...(duration ? {duration} : {}), dirs};
}

Object.assign(CHERRIFT_CONFIG.player.skins, {
  mage_cherry:{
    id:"mage_cherry",
    folder:"mage_cherry",
    attackType:"ranged",
    skillType:"magical_shot",
    passiveRecovery:.005,
    states:{
      idle:state("mage_cherry","idle",4,3),
      walk:state("mage_cherry","walk",6,8),
      attack:state("mage_cherry","ranged",6,15,.40),
      skill:state("mage_cherry","skill",6,16,.44)
    }
  },
  archer_cherry:{
    id:"archer_cherry",
    folder:"archer_cherry",
    attackType:"ranged",
    skillType:"four_arrow_shot",
    passiveCrit:.10,
    states:{
      idle:state("archer_cherry","idle",4,3),
      walk:state("archer_cherry","walk",6,8),
      attack:state("archer_cherry","ranged",6,15,.40),
      skill:state("archer_cherry","skill",6,16,.40)
    }
  }
});

const skinData = [
  {
    id:"mage_cherry", name:"Mage Cherry", rarity:"Rare", emoji:"🔮",
    weapon:"Bloom Staff", skill:"Magical Shot", passive:"+5% HP recovery",
    desc:"A staff-wielding ranged Cherry. Magical Shot releases five homing magic orbs; all five focus the same target when only one enemy is present.",
    stats:{damage:2,speed:0}, gradient:["#ff9fd6","#4c245f"],
    icon:"assets/player/skins/mage_cherry/mage_cherry_icon.png?v=090",
    splash:"assets/player/skins/mage_cherry/mage_cherry_splashart.png?v=090"
  },
  {
    id:"archer_cherry", name:"Archer Cherry", rarity:"Rare", emoji:"🏹",
    weapon:"Bloom Bow", skill:"Four Arrow Shot", passive:"+10% critical chance",
    desc:"A mobile ranged Cherry. Her skill fires four arrows in a wide cone while her raised bow stays clear during movement.",
    stats:{damage:2,speed:4}, gradient:["#ffb4ce","#5d392a"],
    icon:"assets/player/skins/archer_cherry/archer_cherry_icon.png?v=090",
    splash:"assets/player/skins/archer_cherry/archer_cherry_splashart.png?v=090"
  }
];

for (const skin of skinData) {
  const index = CHERRIFT_DATA.skins.findIndex(item => item.id === skin.id);
  if (index >= 0) CHERRIFT_DATA.skins[index] = skin;
  else CHERRIFT_DATA.skins.push(skin);
}

if (window.CHERRIFT_REMOTE_CONFIG?.skinBonuses) {
  CHERRIFT_REMOTE_CONFIG.skinBonuses.mage_cherry = {hpRecovery:.05};
  CHERRIFT_REMOTE_CONFIG.skinBonuses.archer_cherry = {crit:.10};
}

function normalize(save) {
  if (!save) return save;
  save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
  for (const skin of SKINS) if (!save.unlockedSkins.includes(skin)) save.unlockedSkins.push(skin);
  if (!CHERRIFT_DATA.skins.some(skin => skin.id === save.selectedSkin)) save.selectedSkin = "cherry_default";
  return save;
}

const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
const previousLoad = CherriftStorage.load.bind(CherriftStorage);
const previousSave = CherriftStorage.save.bind(CherriftStorage);
CherriftStorage.defaults = function defaultsV087() { return normalize(previousDefaults()); };
CherriftStorage.load = function loadV087() { return normalize(previousLoad()); };
CherriftStorage.save = function saveV087(save) { return previousSave(normalize(save)); };

const proto = CherriftGame.prototype;
const previousStart = proto.start;
proto.start = async function startV087(...args) {
  const result = await previousStart.apply(this, args);
  if (this.player?.skin === "archer_cherry") this.player.crit = Math.min(.95, (this.player.crit || 0) + .10);
  if (this.player?.skin === "mage_cherry") this.player.regen = (this.player.regen || 0) + this.player.maxHp * .005;
  if (this.player?.skin === "archer_cherry" && !this.__archerVfxV087) {
    this.__archerVfxV087 = true;
    await Promise.all(DIRECTIONS.flatMap(direction => [
      this.assets.loadImage(`archer_vfx_attack_${direction}`, `assets/player/skins/archer_cherry/vfx/attack/archer_arrow_${direction}_sheet.png?v=090`),
      this.assets.loadImage(`archer_vfx_skill_${direction}`, `assets/player/skins/archer_cherry/vfx/skill/archer_four_arrow_shot_${direction}_sheet.png?v=090`)
    ]));
  }
  return result;
};

function direction(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}

function vectorFromDirection(value) {
  if (value === "left") return {x:-1,y:0};
  if (value === "right") return {x:1,y:0};
  if (value === "up") return {x:0,y:-1};
  return {x:0,y:1};
}

function livingTargets(game, range = 900) {
  const player = game.player;
  return (game.enemies || []).filter(enemy => !enemy.dead && Math.hypot(enemy.x-player.x,enemy.y-player.y) <= range)
    .sort((a,b) => Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
}

function spawn(game, data) {
  game.bullets.push({
    customV087:true,
    x:game.player.x,
    y:game.player.y-10,
    r:7,
    life:1.8,
    hitIds:new Set(),
    ...data
  });
}

const previousAutoFire = proto.autoFire;
proto.autoFire = function autoFireV087() {
  const player = this.player;
  if (!player || !SKINS.includes(player.skin)) return previousAutoFire.call(this);
  if (player.fireTimer > 0 || player.skillCastTimer > 0) return;
  const target = livingTargets(this, 760)[0];
  if (!target) return;
  const dx = target.x-player.x, dy = target.y-player.y, length = Math.hypot(dx,dy) || 1;
  const config = this.activeSkinConfig();
  player.fireTimer = player.fireInterval * (player.skillBuff > 0 ? .55 : 1);
  player.attackCastDuration = config.states.attack.duration;
  player.attackCastTimer = player.attackCastDuration;
  player.attackDir = direction(dx,dy);
  player.lastDir = player.attackDir;
  spawn(this,{
    vx:dx/length*player.bulletSpeed,
    vy:dy/length*player.bulletSpeed,
    dmg:player.damage,
    style:player.skin === "archer_cherry" ? "archer_arrow" : "mage_orb",
    target:player.skin === "mage_cherry" ? target : null,
    turnRate:player.skin === "mage_cherry" ? 2.4 : 0,
    phase:Math.random()*Math.PI*2
  });
  if (player.skin === "archer_cherry") this.effects.push({type:"archerShotV087",x:player.x,y:player.y,dir:player.attackDir,t:0,life:.40});
};

const previousSkill = proto.skill;
proto.skill = function skillV087() {
  const player = this.player;
  if (!player || !SKINS.includes(player.skin)) return previousSkill.call(this);
  if (player.skillTimer > 0) return;
  const config = this.activeSkinConfig();
  const targets = livingTargets(this, 980);
  const primary = targets[0];
  const fallback = vectorFromDirection(player.lastDir || "down");
  const base = primary ? Math.atan2(primary.y-player.y,primary.x-player.x) : Math.atan2(fallback.y,fallback.x);
  player.skillTimer = player.skillCooldown;
  player.skillCastDuration = config.states.skill.duration;
  player.skillCastTimer = player.skillCastDuration;
  player.skillDir = primary ? direction(primary.x-player.x,primary.y-player.y) : player.lastDir || "down";
  player.lastDir = player.skillDir;
  if (player.skin === "archer_cherry") {
    const offsets = [-.27,-.09,.09,.27];
    for (const offset of offsets) {
      const angle = base + offset;
      spawn(this,{vx:Math.cos(angle)*player.bulletSpeed*1.08,vy:Math.sin(angle)*player.bulletSpeed*1.08,dmg:player.damage*.92,style:"archer_arrow_skill",life:1.55,phase:offset});
    }
    this.effects.push({type:"archerVolleyV087",x:player.x,y:player.y,a:base,dir:player.skillDir,t:0,life:.46});
  } else {
    const focus = targets.length === 1;
    for (let index=0;index<5;index++) {
      const offset = (index-2)*.12;
      const angle = base+offset;
      const target = focus ? targets[0] : targets[index % Math.max(1,targets.length)] || null;
      spawn(this,{vx:Math.cos(angle)*player.bulletSpeed*.78,vy:Math.sin(angle)*player.bulletSpeed*.78,dmg:player.damage*.72,style:"mage_orb_skill",target,turnRate:6.3,life:2.35,phase:index});
    }
    this.effects.push({type:"mageCastV087",x:player.x,y:player.y,t:0,life:.52});
  }
  this.effects.push({type:"skillPulseV085",x:player.x,y:player.y,t:0,life:.38});
  this.__shakeV085 = Math.max(this.__shakeV085 || 0,.35);
};

const previousUpdateBullets = proto.updateBullets;
proto.updateBullets = function updateBulletsV087(dt) {
  const custom = (this.bullets || []).filter(bullet => bullet.customV087);
  this.bullets = (this.bullets || []).filter(bullet => !bullet.customV087);
  previousUpdateBullets.call(this, dt);
  const standard = this.bullets;
  for (const bullet of custom) {
    if (bullet.target && !bullet.target.dead) {
      const dx=bullet.target.x-bullet.x,dy=bullet.target.y-bullet.y,length=Math.hypot(dx,dy)||1;
      const speed=Math.hypot(bullet.vx,bullet.vy)||420,turn=Math.min(1,dt*(bullet.turnRate||0));
      bullet.vx+=(dx/length*speed-bullet.vx)*turn;
      bullet.vy+=(dy/length*speed-bullet.vy)*turn;
    }
    bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
    bullet.spin=(bullet.spin||0)+dt*8;
    if (bullet.dead || bullet.life<=0) continue;
    for (const enemy of this.enemies || []) {
      if (enemy.dead || bullet.hitIds.has(enemy) || Math.hypot(bullet.x-enemy.x,bullet.y-enemy.y)>=bullet.r+(enemy.r||0)) continue;
      bullet.hitIds.add(enemy);
      let damage=bullet.dmg;
      if (Math.random()<(this.player.crit||0)) {
        damage*=this.player.critDamage||1.5;
        this.effects.push({type:"crit",x:enemy.x,y:enemy.y,t:0,life:.35});
      }
      this.damageEnemy(enemy,damage);
      this.effects.push({type:bullet.style.startsWith("archer")?"arrowImpactV087":"mageImpactV087",x:enemy.x,y:enemy.y,t:0,life:.30});
      bullet.dead=true;
      break;
    }
  }
  this.bullets=standard.concat(custom.filter(bullet=>!bullet.dead&&bullet.life>0));
};

const previousDrawBullet = proto.drawBullet;
proto.drawBullet = function drawBulletV087(context, bullet) {
  if (!bullet?.customV087) return previousDrawBullet.call(this, context, bullet);
  const angle=Math.atan2(bullet.vy||0,bullet.vx||1);
  context.save();
  context.translate(bullet.x,bullet.y);
  context.rotate(angle);
  if (bullet.style.startsWith("archer")) {
    context.shadowColor="#ff6cbb";context.shadowBlur=bullet.style.endsWith("skill")?13:7;
    context.strokeStyle=bullet.style.endsWith("skill")?"#ffd1eb":"#f6e6d6";context.lineWidth=3;context.lineCap="round";
    context.beginPath();context.moveTo(-14,0);context.lineTo(13,0);context.stroke();
    context.fillStyle="#ff76b9";context.beginPath();context.moveTo(16,0);context.lineTo(8,-5);context.lineTo(8,5);context.closePath();context.fill();
    context.beginPath();context.moveTo(-11,0);context.lineTo(-17,-5);context.lineTo(-15,0);context.lineTo(-17,5);context.closePath();context.fill();
  } else {
    const pulse=1+Math.sin(this.t*13+(bullet.phase||0))*.12;
    context.scale(pulse,pulse);context.shadowColor="#ff73d0";context.shadowBlur=16;
    context.fillStyle=bullet.style.endsWith("skill")?"#ff8ce0":"#ffd0f2";
    context.beginPath();context.arc(0,0,bullet.style.endsWith("skill")?9:7,0,Math.PI*2);context.fill();
    context.strokeStyle="rgba(255,226,248,.65)";context.lineWidth=2;context.beginPath();context.moveTo(-6,0);context.lineTo(-22,0);context.stroke();
  }
  context.restore();
};

const previousDrawEffect = proto.drawEffect;
proto.drawEffect = function drawEffectV087(context, effect) {
  if (!["archerShotV087","archerVolleyV087","mageCastV087","arrowImpactV087","mageImpactV087"].includes(effect?.type)) {
    return previousDrawEffect.call(this,context,effect);
  }
  const alpha=Math.max(0,1-effect.t/effect.life);
  context.save();context.globalAlpha=alpha;context.translate(effect.x,effect.y);
  if (effect.type==="archerShotV087"||effect.type==="archerVolleyV087") {
    const skill=effect.type==="archerVolleyV087";
    const frames=skill?8:6;
    const image=this.assets.get(`archer_vfx_${skill?"skill":"attack"}_${effect.dir||"down"}`);
    if(image){
      const frame=Math.min(frames-1,Math.floor(Math.min(.999,effect.t/effect.life)*frames));
      context.imageSmoothingEnabled=false;
      context.drawImage(image,frame*192,0,192,192,-96,-112,192,192);
      context.restore();
      return;
    }
    context.rotate(effect.a||0);context.strokeStyle="#ff9bd0";context.lineWidth=4;
    for(const offset of [-10,-3,3,10]){context.beginPath();context.moveTo(10,offset);context.lineTo(42+(1-alpha)*34,offset*1.5);context.stroke();}
  } else if (effect.type==="mageCastV087") {
    context.strokeStyle="#ff8add";context.shadowColor="#ff5fc5";context.shadowBlur=15;context.lineWidth=4;
    context.beginPath();context.arc(0,0,24+(1-alpha)*58,0,Math.PI*2);context.stroke();
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2+this.t*2;context.beginPath();context.arc(Math.cos(a)*32,Math.sin(a)*20,3,0,Math.PI*2);context.stroke();}
  } else {
    context.strokeStyle=effect.type==="arrowImpactV087"?"#ffd6e9":"#ff7bd3";context.lineWidth=4;
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;context.beginPath();context.moveTo(Math.cos(a)*5,Math.sin(a)*5);context.lineTo(Math.cos(a)*(15+(1-alpha)*24),Math.sin(a)*(15+(1-alpha)*24));context.stroke();}
  }
  context.restore();
};

ensureCss();
window.CHERRIFT_V087={version:VERSION,displayVersion:DISPLAY_VERSION,normalize,skinIds:[...SKINS]};
console.info("[CHERRIFT] v0.8.7 Mage and Archer Cherry loaded.");
})();
