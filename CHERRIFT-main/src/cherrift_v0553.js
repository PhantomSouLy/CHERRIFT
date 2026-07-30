(() => {
"use strict";

const VERSION = "0.5.5.3-ninja-succubus-skins";
const id = n => document.getElementById(n);
const q = (s,r=document) => r.querySelector(s);
const qa = (s,r=document) => Array.from(r.querySelectorAll(s));

if (!window.UI || !window.CherriftGame || !window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA) {
  console.error("[CHERRIFT v0.5.5.3] Required systems missing.");
  return;
}

const SKINS = {
  ninja_cherry: {
    id:"ninja_cherry",
    folder:"ninja_cherry",
    attackType:"ranged",
    skillType:"shuriken_storm",
    projectileCount:2,
    poisonDamageRate:.05,
    skillShurikenCount:12,
    skillSpeedMult:1.35,
    skillSpeedDuration:3,
    states:{
      idle:{fps:3,frames:4,dirs:{
        down:"assets/player/skins/ninja_cherry/ninja_cherry_idle_down.png?v=0553",
        up:"assets/player/skins/ninja_cherry/ninja_cherry_idle_up.png?v=0553",
        left:"assets/player/skins/ninja_cherry/ninja_cherry_idle_left.png?v=0553",
        right:"assets/player/skins/ninja_cherry/ninja_cherry_idle_right.png?v=0553"
      }},
      walk:{fps:8,frames:6,dirs:{
        down:"assets/player/skins/ninja_cherry/ninja_cherry_walk_down.png?v=0553",
        up:"assets/player/skins/ninja_cherry/ninja_cherry_walk_up.png?v=0553",
        left:"assets/player/skins/ninja_cherry/ninja_cherry_walk_left.png?v=0553",
        right:"assets/player/skins/ninja_cherry/ninja_cherry_walk_right.png?v=0553"
      }},
      skill:{fps:16,frames:6,duration:.42,dirs:{
        down:"assets/player/skins/ninja_cherry/ninja_cherry_skill_down.png?v=0553",
        up:"assets/player/skins/ninja_cherry/ninja_cherry_skill_up.png?v=0553",
        left:"assets/player/skins/ninja_cherry/ninja_cherry_skill_left.png?v=0553",
        right:"assets/player/skins/ninja_cherry/ninja_cherry_skill_right.png?v=0553"
      }}
    }
  },

  succubus_cherry: {
    id:"succubus_cherry",
    folder:"succubus_cherry",
    attackType:"ranged",
    skillType:"soul_drain",
    hpDrainRate:.05,
    skillDrainRate:.10,
    shieldRate:.15,
    states:{
      idle:{fps:3,frames:4,dynamicFrameSize:true,dirs:{
        down:"assets/player/skins/succubus_cherry/succubus_cherry_idle_down.png?v=0553",
        up:"assets/player/skins/succubus_cherry/succubus_cherry_idle_up.png?v=0553",
        left:"assets/player/skins/succubus_cherry/succubus_cherry_idle_left.png?v=0553",
        right:"assets/player/skins/succubus_cherry/succubus_cherry_idle_right.png?v=0553"
      }},
      walk:{fps:8,frames:6,dirs:{
        down:"assets/player/skins/succubus_cherry/succubus_cherry_walk_down.png?v=0553",
        up:"assets/player/skins/succubus_cherry/succubus_cherry_walk_up.png?v=0553",
        left:"assets/player/skins/succubus_cherry/succubus_cherry_walk_left.png?v=0553",
        right:"assets/player/skins/succubus_cherry/succubus_cherry_walk_right.png?v=0553"
      }},
      skill:{fps:15,frames:6,duration:.55,dirs:{
        down:"assets/player/skins/succubus_cherry/succubus_cherry_ranged_down.png?v=062",
        up:"assets/player/skins/succubus_cherry/succubus_cherry_ranged_up.png?v=062",
        left:"assets/player/skins/succubus_cherry/succubus_cherry_ranged_left.png?v=062",
        right:"assets/player/skins/succubus_cherry/succubus_cherry_ranged_right.png?v=062"
      }}
    }
  }
};

Object.assign(CHERRIFT_CONFIG.player.skins, SKINS);

const skinData = [
  {
    id:"ninja_cherry",
    name:"Ninja Cherry",
    rarity:"Epic",
    emoji:"🥷",
    weapon:"Twin Shuriken",
    skill:"Shuriken Shots",
    passive:"5% Poison Damage",
    desc:"Két shurikent dobó ranged skin. A skill 360°-ban shurikeneket lő ki és ideiglenesen megnöveli a movement speedet.",
    stats:{damage:3,speed:8},
    gradient:["#9a62ff","#25143d"],
    splash:"assets/player/skins/ninja_cherry/ninja_cherry_splashart.png?v=0553"
  },
  {
    id:"succubus_cherry",
    name:"Succubus Cherry",
    rarity:"Legendary",
    emoji:"😈",
    weapon:"Crimson Claws",
    skill:"Soul Drain",
    passive:"5% HP Drain",
    desc:"Területi vörös karmolásokkal támad. A Soul Drain vörös lelkeket küld az ellenfelekre, gyógyít és teljes HP-n shieldet készít.",
    stats:{damage:5,speed:2},
    gradient:["#ff9a3f","#4b1028"],
    splash:"assets/player/skins/succubus_cherry/succubus_cherry_splashart.png?v=0553"
  }
];

for (const skin of skinData) {
  const index = CHERRIFT_DATA.skins.findIndex(entry => entry.id === skin.id);
  if (index >= 0) CHERRIFT_DATA.skins[index] = skin;
  else CHERRIFT_DATA.skins.push(skin);
}

if (window.CHERRIFT_REMOTE_CONFIG?.skinBonuses) {
  CHERRIFT_REMOTE_CONFIG.skinBonuses.ninja_cherry = { poison:.05 };
  CHERRIFT_REMOTE_CONFIG.skinBonuses.succubus_cherry = { drain:.05 };
}

function normalizeSave(save) {
  save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
  for (const skinId of ["ninja_cherry","succubus_cherry"]) {
    if (!save.unlockedSkins.includes(skinId)) save.unlockedSkins.push(skinId);
  }
  return save;
}

const baseDefaults = CherriftStorage.defaults.bind(CherriftStorage);
const baseLoad = CherriftStorage.load.bind(CherriftStorage);
const baseSave = CherriftStorage.save.bind(CherriftStorage);

CherriftStorage.defaults = function defaultsV0553() {
  return normalizeSave(baseDefaults());
};
CherriftStorage.load = function loadV0553() {
  const save = normalizeSave(baseLoad());
  baseSave(save);
  return save;
};
CherriftStorage.save = function saveV0553(save) {
  return baseSave(normalizeSave(save));
};

const proto = CherriftGame.prototype;

function rotate(x,y,angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {x:x*c-y*s,y:x*s+y*c};
}

function spawnCustomBullet(game, bullet) {
  game.bullets.push({
    customV0553:true,
    x:game.player.x,
    y:game.player.y - 8,
    life:1,
    hitIds:new Set(),
    ...bullet
  });
}

function healFromDamage(game, damage, rate, shieldOnFull=false) {
  const p = game.player;
  if (!p || damage <= 0 || rate <= 0) return;

  const heal = damage * rate;
  const wasFull = p.hp >= p.maxHp - .01;

  if (!wasFull) {
    p.hp = Math.min(p.maxHp, p.hp + heal);
    game.effects.push({type:"succubus_heal",x:p.x,y:p.y-24,t:0,life:.45,amount:heal});
    return;
  }

  if (shieldOnFull) {
    const cap = Math.max(1, p.hp * .15);
    p.soulShield = Math.max(p.soulShield || 0, cap);
    p.soulShieldMax = cap;
    game.effects.push({type:"soul_shield",x:p.x,y:p.y,t:0,life:.6});
  }
}

const oldStart = proto.start;
proto.start = async function startV0553(...args) {
  const result = await oldStart.apply(this,args);
  if (!this.player) return result;

  const cfg = this.activeSkinConfig();
  if (this.player.skin === "ninja_cherry") {
    this.player.attackType = "ranged";
    this.player.projectileCount = 2;
    this.player.poisonDamageRate = cfg.poisonDamageRate || .05;
  }

  if (this.player.skin === "succubus_cherry") {
    this.player.attackType = "ranged";
    this.player.hpDrainRate = cfg.hpDrainRate || .05;
    this.player.soulShield = 0;
    this.player.soulShieldMax = 0;
  }

  return result;
};

const oldAutoFire = proto.autoFire;
proto.autoFire = function autoFireV0553() {
  const p = this.player;
  if (!p || !["ninja_cherry","succubus_cherry"].includes(p.skin)) {
    return oldAutoFire.call(this);
  }

  const interval = p.fireInterval * (p.skillBuff > 0 ? .55 : 1);
  if (p.fireTimer > 0) return;

  const enemy = this.nearest();
  if (!enemy) return;
  p.fireTimer = interval;

  const dx = enemy.x - p.x;
  const dy = enemy.y - p.y;
  const length = Math.hypot(dx,dy) || 1;
  const nx = dx / length, ny = dy / length;

  if (p.skin === "ninja_cherry") {
    const spread = .11;
    [-spread,spread].forEach(angle => {
      const dir = rotate(nx,ny,angle);
      spawnCustomBullet(this,{
        vx:dir.x * 610,
        vy:dir.y * 610,
        r:9,
        dmg:p.damage * .82,
        life:1.35,
        style:"ninja_shuriken",
        poisonRate:.05,
        spin:Math.random()*Math.PI*2
      });
    });
    return;
  }

  [-.16,0,.16].forEach(angle => {
    const dir = rotate(nx,ny,angle);
    spawnCustomBullet(this,{
      vx:dir.x * 390,
      vy:dir.y * 390,
      r:19,
      dmg:p.damage * .62,
      life:.50,
      style:"succubus_claw",
      drainRate:.05,
      pierce:2,
      angle:Math.atan2(dir.y,dir.x)
    });
  });
};

const oldSkill = proto.skill;
proto.skill = function skillV0553() {
  const p = this.player;
  if (!p || !["ninja_cherry","succubus_cherry"].includes(p.skin)) {
    return oldSkill.call(this);
  }
  if (p.skillTimer > 0) return;

  const skin = this.activeSkinConfig();
  const state = skin.states.skill;
  const duration = state.duration || .5;

  p.skillTimer = p.skillCooldown;
  p.skillCastTimer = duration;
  p.skillCastDuration = duration;
  p.skillDir = p.lastDir || "down";

  if (p.skin === "ninja_cherry") {
    p.ninjaSpeedBuff = skin.skillSpeedDuration || 3;
    p.skillBuff = Math.max(p.skillBuff || 0, skin.skillSpeedDuration || 3);

    const count = skin.skillShurikenCount || 12;
    for (let i=0;i<count;i++) {
      const angle = i / count * Math.PI * 2;
      spawnCustomBullet(this,{
        vx:Math.cos(angle)*650,
        vy:Math.sin(angle)*650,
        r:10,
        dmg:p.damage*1.05,
        life:1.25,
        style:"ninja_shuriken",
        poisonRate:.05,
        spin:angle
      });
    }
    this.effects.push({type:"shuriken_storm",x:p.x,y:p.y,t:0,life:.55});
    return;
  }

  const living = this.enemies.filter(enemy => !enemy.dead);
  const count = 20;
  for (let i=0;i<count;i++) {
    const angle = i / count * Math.PI * 2 + Math.random()*.12;
    const target = living.length ? living[i % living.length] : null;
    spawnCustomBullet(this,{
      vx:Math.cos(angle)*260,
      vy:Math.sin(angle)*260,
      r:10,
      dmg:p.damage*.72,
      life:2.2,
      style:"succubus_soul",
      drainRate:.10,
      shieldOnFull:true,
      target,
      turnRate:5.5,
      phase:Math.random()*Math.PI*2
    });
  }
  this.effects.push({type:"soul_drain_cast",x:p.x,y:p.y,t:0,life:.75});
};

const oldUpdate = proto.update;
proto.update = function updateV0553(dt) {
  const p = this.player;
  if (p?.skin === "ninja_cherry" && p.ninjaSpeedBuff > 0) {
    const originalSpeed = p.speed;
    p.speed = originalSpeed * 1.35;
    p.ninjaSpeedBuff = Math.max(0,p.ninjaSpeedBuff-dt);
    const result = oldUpdate.call(this,dt);
    p.speed = originalSpeed;
    return result;
  }
  return oldUpdate.call(this,dt);
};

const oldUpdateBullets = proto.updateBullets;
proto.updateBullets = function updateBulletsV0553(dt) {
  const custom = this.bullets.filter(b => b.customV0553);
  this.bullets = this.bullets.filter(b => !b.customV0553);
  oldUpdateBullets.call(this,dt);
  const standard = this.bullets;

  for (const bullet of custom) {
    if (bullet.style === "succubus_soul" && bullet.target && !bullet.target.dead) {
      const dx = bullet.target.x - bullet.x;
      const dy = bullet.target.y - bullet.y;
      const len = Math.hypot(dx,dy) || 1;
      const speed = Math.hypot(bullet.vx,bullet.vy) || 300;
      const desiredX = dx/len*speed;
      const desiredY = dy/len*speed;
      const turn = Math.min(1,dt*(bullet.turnRate||5));
      bullet.vx += (desiredX-bullet.vx)*turn;
      bullet.vy += (desiredY-bullet.vy)*turn;
    }

    bullet.x += bullet.vx*dt;
    bullet.y += bullet.vy*dt;
    bullet.life -= dt;
    bullet.spin = (bullet.spin || 0) + dt*12;

    if (bullet.dead || bullet.life <= 0) continue;

    for (const enemy of this.enemies) {
      if (enemy.dead || bullet.hitIds.has(enemy)) continue;
      if (Math.hypot(bullet.x-enemy.x,bullet.y-enemy.y) >= bullet.r+enemy.r) continue;

      bullet.hitIds.add(enemy);
      let damage = bullet.dmg;
      if (Math.random() < this.player.crit) {
        damage *= this.player.critDamage;
        this.effects.push({type:"crit",x:enemy.x,y:enemy.y,t:0,life:.35});
      }

      this.damageEnemy(enemy,damage);

      if (bullet.poisonRate) {
        enemy.poisonDamageV0553 = (enemy.poisonDamageV0553 || 0) + damage*bullet.poisonRate;
        enemy.poisonTimeV0553 = Math.max(enemy.poisonTimeV0553 || 0,2);
      }

      if (bullet.drainRate) {
        healFromDamage(this,damage,bullet.drainRate,!!bullet.shieldOnFull);
      }

      this.effects.push({
        type:bullet.style === "ninja_shuriken" ? "poison_hit" : "soul_hit",
        x:enemy.x,y:enemy.y,t:0,life:.32
      });

      bullet.pierce = (bullet.pierce || 1)-1;
      if (bullet.pierce <= 0) {
        bullet.dead = true;
        break;
      }
    }
  }

  this.bullets = standard.concat(custom.filter(b => !b.dead && b.life > 0));
};

const oldUpdateEnemies = proto.updateEnemies;
proto.updateEnemies = function updateEnemiesV0553(dt) {
  for (const enemy of this.enemies) {
    if (enemy.dead || !(enemy.poisonTimeV0553 > 0)) continue;
    enemy.poisonTimeV0553 = Math.max(0,enemy.poisonTimeV0553-dt);
    const total = enemy.poisonDamageV0553 || 0;
    this.damageEnemy(enemy,total/2*dt);
    if (enemy.poisonTimeV0553 <= 0) enemy.poisonDamageV0553 = 0;
  }

  const p = this.player;
  const hpBefore = p?.hp || 0;
  oldUpdateEnemies.call(this,dt);

  if (p && p.soulShield > 0 && p.hp < hpBefore) {
    const incoming = hpBefore-p.hp;
    const absorbed = Math.min(incoming,p.soulShield);
    p.hp += absorbed;
    p.soulShield -= absorbed;
    if (absorbed > 0) this.effects.push({type:"shield_block",x:p.x,y:p.y,t:0,life:.25});
  }
};

const oldDrawBullet = proto.drawBullet;
proto.drawBullet = function drawBulletV0553(ctx,bullet) {
  if (!bullet.customV0553) return oldDrawBullet.call(this,ctx,bullet);

  ctx.save();
  ctx.translate(bullet.x,bullet.y);

  if (bullet.style === "ninja_shuriken") {
    ctx.rotate(bullet.spin || 0);
    ctx.shadowColor = "#9d70ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#c7b0ff";
    for (let i=0;i<4;i++) {
      ctx.rotate(Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0,-12);
      ctx.lineTo(5,-3);
      ctx.lineTo(0,0);
      ctx.lineTo(-5,-3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle="#3e285d";
    ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
  }

  if (bullet.style === "succubus_claw") {
    ctx.rotate(bullet.angle || 0);
    ctx.strokeStyle="#ff496f";
    ctx.shadowColor="#ff234f";
    ctx.shadowBlur=14;
    ctx.lineWidth=5;
    ctx.lineCap="round";
    for (let i=-1;i<=1;i++) {
      ctx.beginPath();
      ctx.moveTo(-16,i*7-7);
      ctx.quadraticCurveTo(0,i*7-13,18,i*7+5);
      ctx.stroke();
    }
  }

  if (bullet.style === "succubus_soul") {
    const pulse = 1+Math.sin(this.t*10+(bullet.phase||0))*.15;
    ctx.scale(pulse,pulse);
    ctx.shadowColor="#ff244f";
    ctx.shadowBlur=16;
    ctx.fillStyle="#ff5574";
    ctx.beginPath();
    ctx.arc(0,0,7,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="rgba(255,205,214,.85)";
    ctx.beginPath();
    ctx.arc(-2,-2,2,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle="rgba(255,66,103,.65)";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(-7,2);
    ctx.quadraticCurveTo(-17,8,-20,0);
    ctx.stroke();
  }

  ctx.restore();
};

const oldDrawEffect = proto.drawEffect;
proto.drawEffect = function drawEffectV0553(ctx,effect) {
  const customTypes = [
    "shuriken_storm","poison_hit","soul_drain_cast","soul_hit",
    "succubus_heal","soul_shield","shield_block"
  ];
  if (!customTypes.includes(effect.type)) return oldDrawEffect.call(this,ctx,effect);

  const alpha = Math.max(0,1-effect.t/effect.life);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(effect.x,effect.y);

  if (effect.type === "shuriken_storm") {
    ctx.strokeStyle="#b68cff";
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.arc(0,0,28+(1-alpha)*105,0,Math.PI*2);
    ctx.stroke();
  }

  if (effect.type === "poison_hit") {
    ctx.fillStyle="rgba(105,255,104,.55)";
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2;
      ctx.beginPath();ctx.arc(Math.cos(a)*18*alpha,Math.sin(a)*18*alpha,4,0,Math.PI*2);ctx.fill();
    }
  }

  if (effect.type === "soul_drain_cast") {
    ctx.strokeStyle="#ff456a";
    ctx.lineWidth=7;
    ctx.beginPath();
    ctx.arc(0,0,35+(1-alpha)*120,0,Math.PI*2);
    ctx.stroke();
  }

  if (effect.type === "soul_hit") {
    ctx.strokeStyle="#ff6681";
    ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(0,0,8+(1-alpha)*38,0,Math.PI*2);ctx.stroke();
  }

  if (effect.type === "succubus_heal") {
    ctx.fillStyle="#ff7891";
    ctx.font="bold 16px system-ui";
    ctx.fillText("♥", -6,-(1-alpha)*26);
  }

  if (effect.type === "soul_shield" || effect.type === "shield_block") {
    ctx.strokeStyle=effect.type === "soul_shield" ? "#ff708d" : "#ffd0dc";
    ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,0,32+(1-alpha)*18,0,Math.PI*2);ctx.stroke();
  }

  ctx.restore();
};

const oldDrawPlayer = proto.drawPlayer;
proto.drawPlayer = function drawPlayerV0553(ctx,player) {
  const skin = this.activeSkinConfig();
  const skillActive = (player.skillCastTimer || 0) > 0;
  const stateName = skillActive ? "skill" : (player.moving ? "walk" : "idle");

  if (player.skin === "succubus_cherry" && stateName === "idle") {
    const dir = player.lastDir || "down";
    const state = skin.states.idle;
    const image = this.assets.get(`player_${player.skin}_idle_${dir}`);

    if (image) {
      const frameCount = state.frames || 4;
      const frameWidth = image.width / frameCount;
      const frameHeight = image.height;
      const frame = Math.floor(this.t*(state.fps || 3)) % frameCount;
      const cfg = CHERRIFT_CONFIG.player;
      const dw = cfg.displayWidth || 116;
      const dh = cfg.displayHeight || 116;

      ctx.drawImage(
        image,
        frame*frameWidth,0,frameWidth,frameHeight,
        Math.round(player.x-dw/2),
        Math.round(player.y-dh+34),
        dw,dh
      );
    } else {
      oldDrawPlayer.call(this,ctx,player);
    }
  } else {
    oldDrawPlayer.call(this,ctx,player);
  }

  if (player.soulShield > 0) {
    const ratio = Math.max(0,Math.min(1,player.soulShield/(player.soulShieldMax || 1)));
    ctx.save();
    ctx.globalAlpha=.32+.35*ratio;
    ctx.strokeStyle="#ff6688";
    ctx.shadowColor="#ff315d";
    ctx.shadowBlur=14;
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(player.x,player.y-13,43,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
};

const oldRenderSkinCarousel = UI.renderSkinCarousel?.bind(UI);
if (oldRenderSkinCarousel) {
  UI.renderSkinCarousel = function renderSkinCarouselV0553(...args) {
    const result = oldRenderSkinCarousel(...args);
    const skin = CHERRIFT_DATA.skins[this.skinIndex || 0];
    if (!skin) return result;

    if (["ninja_cherry","succubus_cherry"].includes(skin.id)) {
      const splash = id("skinSplash");
      const portrait = id("skinPortrait");
      if (splash) {
        splash.style.backgroundImage =
          `linear-gradient(180deg,rgba(10,5,18,.02),rgba(10,5,18,.54)),url("${skin.splash}")`;
        splash.style.backgroundSize="cover";
        splash.style.backgroundPosition="center";
      }
      if (portrait) portrait.textContent="";
      if (id("skinMini")) id("skinMini").textContent=skin.emoji;
      if (id("skinRarity")) id("skinRarity").className =
        `rarity-pill rarity-${skin.rarity.toLowerCase()} rarity-v0553`;
    }

    const bonus = id("skinBonusV055");
    if (bonus) {
      if (skin.id === "ninja_cherry")
        bonus.innerHTML="<small>PASSIVE BONUS</small><b>+5% Poison Damage</b>";
      if (skin.id === "succubus_cherry")
        bonus.innerHTML="<small>PASSIVE BONUS</small><b>+5% HP Drain</b>";
    }

    return result;
  };
}

const oldRefreshMenu = UI.refreshMenu?.bind(UI);
if (oldRefreshMenu) {
  UI.refreshMenu = function refreshMenuV0553(...args) {
    normalizeSave(this.save);
    return oldRefreshMenu(...args);
  };
}

window.CHERRIFT_V0553 = {
  version:VERSION,
  skins:SKINS
};

console.info("[CHERRIFT] v0.5.5.3 Ninja and Succubus Cherry loaded.");
})();
