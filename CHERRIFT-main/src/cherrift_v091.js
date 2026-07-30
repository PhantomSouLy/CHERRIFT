(() => {
"use strict";

const VERSION = "0.9.1-common-skins-vfx";
const DISPLAY_VERSION = "v0.9.1";
const CACHE_VERSION = "091";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;
const FRAME_PIVOT = {x:96, y:184};
const COMMON_IDS = new Set([
  "cherry_default",
  "cake_deliver_cherry",
  "kimono_cherry",
  "pajama_cherry",
  "school_uniform_cherry",
  "sport_cherry"
]);
const FIXED_RENDER_IDS = new Set([...COMMON_IDS, "wuxia_sakura_cherry"]);

if (
  !window.CherriftGame ||
  !window.CHERRIFT_CONFIG ||
  !window.CHERRIFT_DATA ||
  !window.CherriftStorage ||
  !window.UI
) {
  console.error("[CHERRIFT v0.9.1] Required runtime systems are missing.");
  return;
}

const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const language = () =>
  window.CHERRIFT_I18N?.language === "en" ||
  UI.save?.settings?.language === "en"
    ? "en"
    : "hu";

function directionFromVector(dx, dy) {
  return Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "left" : "right")
    : (dy < 0 ? "up" : "down");
}

function vectorFromDirection(direction) {
  if (direction === "left") return {x:-1, y:0};
  if (direction === "right") return {x:1, y:0};
  if (direction === "up") return {x:0, y:-1};
  return {x:0, y:1};
}

function directions(folder, state) {
  return Object.fromEntries(
    DIRECTIONS.map(direction => [
      direction,
      `assets/player/skins/${folder}/${folder}_${state}_${direction}.png?v=${CACHE_VERSION}`
    ])
  );
}

function state(folder, name, frames, fps, duration = 0) {
  return {
    frames,
    fps,
    ...(duration > 0 ? {duration} : {}),
    dirs:directions(folder, name)
  };
}

const COMMON = {
  cherry_default:{
    folder:"base_cherry",
    archetype:"offensive",
    passive:{attackBonus:.02},
    skillType:"dash",
    skillName:"Bloom Dash",
    passiveHu:"+2% ATK bónusz",
    passiveEn:"+2% ATK Bonus",
    skillHu:"Dash",
    skillEn:"Dash"
  },
  cake_deliver_cherry:{
    folder:"cake_deliver_cherry",
    name:"Cake Deliver Cherry",
    archetype:"hybrid",
    passive:{attackBonus:.01, hpBonus:.01},
    skillType:"common_pink_burst",
    skillName:"Pink Burst",
    passiveHu:"+1% ATK · +1% HP",
    passiveEn:"+1% ATK · +1% HP",
    skillHu:"Pink Burst · sebzés, hátralökés, +5% mozgás 1 mp-ig",
    skillEn:"Pink Burst · damage, knockback, +5% movement for 1s",
    gradient:["#ffd0df", "#8d335e"]
  },
  kimono_cherry:{
    folder:"kimono_cherry",
    name:"Kimono Cherry",
    archetype:"support",
    passive:{movementBonus:.01, hpRecovery:.01},
    skillType:"common_heal",
    skillName:"Healing",
    passiveHu:"+1% mozgási sebesség · +1% HP regeneráció",
    passiveEn:"+1% Movement Speed · +1% HP Recovery",
    skillHu:"Healing · 40% HP és +5% mozgás 2 mp-ig",
    skillEn:"Healing · restore 40% HP and +5% movement for 2s",
    gradient:["#ffe3ec", "#a44275"]
  },
  pajama_cherry:{
    folder:"pajama_cherry",
    name:"Pajama Cherry",
    archetype:"defensive",
    passive:{hpBonus:.02},
    skillType:"common_shield",
    skillName:"Shield",
    passiveHu:"+2% HP bónusz",
    passiveEn:"+2% HP Bonus",
    skillHu:"Shield · 2 mp védelem és 10% HP gyógyítás",
    skillEn:"Shield · block damage for 2s and restore 10% HP",
    gradient:["#ffc9e4", "#603153"]
  },
  school_uniform_cherry:{
    folder:"school_uniform_cherry",
    name:"School Uniform Cherry",
    archetype:"hybrid",
    passive:{attackBonus:.01, hpBonus:.01},
    skillType:"common_pink_burst",
    skillName:"Pink Burst",
    passiveHu:"+1% ATK · +1% HP",
    passiveEn:"+1% ATK · +1% HP",
    skillHu:"Pink Burst · sebzés, hátralökés, +5% mozgás 1 mp-ig",
    skillEn:"Pink Burst · damage, knockback, +5% movement for 1s",
    gradient:["#ffbad4", "#76304d"]
  },
  sport_cherry:{
    folder:"sport_cherry",
    name:"Sport Cherry",
    archetype:"defensive",
    passive:{hpBonus:.02},
    skillType:"common_shield",
    skillName:"Shield",
    passiveHu:"+2% HP bónusz",
    passiveEn:"+2% HP Bonus",
    skillHu:"Shield · 2 mp védelem és 10% HP gyógyítás",
    skillEn:"Shield · block damage for 2s and restore 10% HP",
    gradient:["#ff9fc8", "#633354"]
  }
};

function configureCommonSkins() {
  const base = CHERRIFT_CONFIG.player.skins.cherry_default;
  if (base) {
    base.attackType = "ranged";
    base.archetype = "offensive";
    base.passive = COMMON.cherry_default.passive;
    base.states.attack = state("base_cherry", "ranged", 6, 18, 6 / 18);
    for (const current of Object.values(base.states)) current.pivot = FRAME_PIVOT;
  }

  for (const [skinId, definition] of Object.entries(COMMON)) {
    if (skinId === "cherry_default") continue;
    CHERRIFT_CONFIG.player.skins[skinId] = {
      id:skinId,
      folder:definition.folder,
      archetype:definition.archetype,
      attackType:"ranged",
      skillType:definition.skillType,
      passive:definition.passive,
      burstRadius:185,
      burstDamageMult:2.4,
      knockbackDistance:112,
      states:{
        idle:{...state(definition.folder, "idle", 4, 3), pivot:FRAME_PIVOT},
        walk:{...state(definition.folder, "walk", 6, 8), pivot:FRAME_PIVOT},
        attack:{...state(definition.folder, "attack", 6, 18, 6 / 18), pivot:FRAME_PIVOT},
        skill:{...state(definition.folder, "skill", 6, 16, 6 / 16), pivot:FRAME_PIVOT}
      }
    };
  }

  const wuxia = CHERRIFT_CONFIG.player.skins.wuxia_sakura_cherry;
  if (wuxia) {
    for (const current of Object.values(wuxia.states || {})) {
      current.pivot = FRAME_PIVOT;
      for (const direction of DIRECTIONS) {
        if (current.dirs?.[direction]) {
          current.dirs[direction] = current.dirs[direction].replace(
            /[?&]v=[^&]+/,
            `?v=${CACHE_VERSION}`
          );
        }
      }
    }
  }
}

function splashPath(folder) {
  return `assets/player/skins/${folder}/${folder}_splashart.png?v=${CACHE_VERSION}`;
}

function configureSkinData() {
  const baseData = CHERRIFT_DATA.skins.find(skin => skin.id === "cherry_default");
  if (baseData) {
    Object.assign(baseData, {
      rarity:"Common",
      archetype:"offensive",
      passive:COMMON.cherry_default.passiveEn,
      skill:"Bloom Dash",
      weapon:"Pink Bloom Orb"
    });
  }

  for (const [skinId, definition] of Object.entries(COMMON)) {
    if (skinId === "cherry_default") continue;
    const splash = splashPath(definition.folder);
    const data = {
      id:skinId,
      name:definition.name,
      rarity:"Common",
      archetype:definition.archetype,
      emoji:"🐰",
      weapon:"Pink Bloom Orb",
      skill:definition.skillName,
      passive:definition.passiveEn,
      passiveHu:definition.passiveHu,
      passiveEn:definition.passiveEn,
      skillHu:definition.skillHu,
      skillEn:definition.skillEn,
      desc:definition.skillEn,
      stats:{damage:0, speed:0},
      gradient:definition.gradient,
      splash,
      icon:splash
    };
    const index = CHERRIFT_DATA.skins.findIndex(skin => skin.id === skinId);
    if (index >= 0) CHERRIFT_DATA.skins[index] = {...CHERRIFT_DATA.skins[index], ...data};
    else CHERRIFT_DATA.skins.push(data);
  }

  if (window.CHERRIFT_V090?.art) {
    for (const [skinId, definition] of Object.entries(COMMON)) {
      if (skinId === "cherry_default") continue;
      const source = splashPath(definition.folder).replace(/\?v=.*/, "");
      window.CHERRIFT_V090.art[skinId] = [source, source];
    }
  }
}

function normalizeSave(save) {
  if (!save || typeof save !== "object") return save;
  save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
  for (const skinId of COMMON_IDS) {
    if (!save.unlockedSkins.includes(skinId)) save.unlockedSkins.push(skinId);
  }
  if (!CHERRIFT_DATA.skins.some(skin => skin.id === save.selectedSkin)) {
    save.selectedSkin = "cherry_default";
  }
  return save;
}

function patchStorage() {
  if (CherriftStorage.__v091CommonSkins) return;
  CherriftStorage.__v091CommonSkins = true;
  const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  const previousLoad = CherriftStorage.load.bind(CherriftStorage);
  const previousSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.defaults = () => normalizeSave(previousDefaults());
  CherriftStorage.load = () => normalizeSave(previousLoad());
  CherriftStorage.save = save => previousSave(normalizeSave(save));
}

const EFFECT_ASSETS = Object.freeze({
  common_attack_offensive:"assets/effects/basic_cherry_attack_offensive.png?v=091",
  common_attack_defensive:"assets/effects/basic_cherry_attack_deffensive.png?v=091",
  common_attack_hybrid:"assets/effects/basic_cherry_attack_hybrid.png?v=091",
  common_attack_support:"assets/effects/basic_cherry_attack_support.png?v=091",
  ninja_shuriken_1:"assets/effects/ninja_cherry/shuriken_1.png?v=091",
  ninja_shuriken_2:"assets/effects/ninja_cherry/shuriken_2.png?v=091",
  ninja_hit:"assets/effects/ninja_cherry/shuriken_hit_effect.png?v=091",
  succubus_claw:"assets/effects/succubus_cherry/succubus_crimson_claw_wave.png?v=091",
  succubus_core:"assets/effects/succubus_cherry/succubus_soul_drain_core.png?v=091",
  succubus_burst:"assets/effects/succubus_cherry/succubus_soul_drain_burst_sheet.png?v=091",
  succubus_release:"assets/effects/succubus_cherry/succubus_soul_drain_release.png?v=091",
  succubus_wisp:"assets/effects/succubus_cherry/succubus_soul_wisp.png?v=091",
  succubus_hit:"assets/effects/succubus_cherry/succubus_soul_hit.png?v=091",
  succubus_siphon:"assets/effects/succubus_cherry/succubus_lifesteal_siphon.png?v=091",
  succubus_shield:"assets/effects/succubus_cherry/succubus_blood_shield.png?v=091",
  wuxia_attack:"assets/effects/wuxia_sakura_cherry/attack_1.png?v=091",
  wuxia_skill:"assets/effects/wuxia_sakura_cherry/skill_effect_1.png?v=091",
  wuxia_skill_sheet:"assets/effects/wuxia_sakura_cherry/skill_effect_1_sheet.png?v=091"
});

function patchAssetLoading() {
  CHERRIFT_CONFIG.effects.v091 = {...EFFECT_ASSETS};
  if (typeof ImageAssets === "undefined") return;
  const prototype = ImageAssets.prototype;
  if (prototype.loadAll.__v091) return;
  const previousLoadAll = prototype.loadAll;
  const loadAll = async function loadAllV091() {
    const result = await previousLoadAll.call(this);
    await Promise.all(
      Object.entries(EFFECT_ASSETS).map(([key, source]) => this.loadImage(key, source))
    );
    return result;
  };
  loadAll.__v091 = true;
  prototype.loadAll = loadAll;
}

function applyCommonPassive(player, definition) {
  const passive = definition.passive || {};
  if (passive.attackBonus) player.damage *= 1 + passive.attackBonus;
  if (passive.hpBonus) {
    const oldMax = player.maxHp;
    player.maxHp = Math.round(oldMax * (1 + passive.hpBonus) * 100) / 100;
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp - oldMax);
  }
  if (passive.movementBonus) player.speed *= 1 + passive.movementBonus;
  if (passive.hpRecovery) player.regen = (player.regen || 0) + player.maxHp * passive.hpRecovery;
}

function drawStripFrame(game, context, player, stateName, direction) {
  const config = game.activeSkinConfig();
  const stateConfig = config?.states?.[stateName];
  const image = game.assets.get(`player_${player.skin}_${stateName}_${direction}`);
  if (!stateConfig || !image) return false;

  const realFrames = Math.max(1, Math.floor((image.naturalWidth || image.width) / FRAME_SIZE));
  const frames = Math.max(1, Math.min(Number(stateConfig.frames) || realFrames, realFrames));
  let frame = 0;
  if (stateName === "skill" || stateName === "attack") {
    const timer = stateName === "skill" ? player.skillCastTimer : player.attackCastTimer;
    const duration = stateName === "skill"
      ? player.skillCastDuration || stateConfig.duration || frames / (stateConfig.fps || 12)
      : player.attackCastDuration || stateConfig.duration || frames / (stateConfig.fps || 18);
    const elapsed = Math.max(0, duration - Math.max(0, Number(timer) || 0));
    frame = Math.min(frames - 1, Math.floor(elapsed * (stateConfig.fps || 12)));
  } else {
    frame = Math.floor(game.t * (stateConfig.fps || 6)) % frames;
  }

  const displayWidth = Math.round((CHERRIFT_CONFIG.player.displayWidth || 116) * .95);
  const displayHeight = Math.round((CHERRIFT_CONFIG.player.displayHeight || 116) * .95);
  const pivot = stateConfig.pivot || FRAME_PIVOT;
  const scaleX = displayWidth / FRAME_SIZE;
  const scaleY = displayHeight / FRAME_SIZE;
  const destinationX = Math.round(player.x - pivot.x * scaleX);
  const destinationY = Math.round(player.y + 30 - pivot.y * scaleY);

  context.save();
  context.globalAlpha = .20;
  context.fillStyle = "#000";
  context.beginPath();
  context.ellipse(player.x, player.y + 25, 26, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    frame * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    destinationX,
    destinationY,
    displayWidth,
    displayHeight
  );
  context.restore();
  return true;
}

function drawPersistentCommonShield(context, player) {
  const timer = Math.max(0, player.commonShieldTimer || 0);
  if (!timer) return;
  const pulse = 1 + Math.sin(timer * 11) * .025;
  context.save();
  context.translate(player.x, player.y - 18);
  context.scale(pulse, pulse);
  context.globalAlpha = .52 + Math.min(.28, timer * .12);
  context.strokeStyle = "#b9dcff";
  context.fillStyle = "rgba(87,151,255,.10)";
  context.shadowColor = "#6aaeff";
  context.shadowBlur = 14;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, 47, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function patchGameplay() {
  const prototype = CherriftGame.prototype;

  const previousStart = prototype.start;
  prototype.start = async function startV091(...args) {
    const result = await previousStart.apply(this, args);
    const player = this.player;
    const definition = COMMON[player?.skin];
    if (!player || !definition) return result;
    player.commonArchetype = definition.archetype;
    player.commonSpeedBuffTimer = 0;
    player.commonSpeedBuffRate = 0;
    player.commonShieldTimer = 0;
    player.attackType = "ranged";
    applyCommonPassive(player, definition);
    return result;
  };

  const previousMovePlayer = prototype.movePlayer;
  prototype.movePlayer = function movePlayerV091(moveVector, dt) {
    const player = this.player;
    if (!player || !(player.commonSpeedBuffTimer > 0)) {
      return previousMovePlayer.call(this, moveVector, dt);
    }
    const originalSpeed = player.speed;
    player.speed = originalSpeed * (1 + (player.commonSpeedBuffRate || .05));
    try {
      return previousMovePlayer.call(this, moveVector, dt);
    } finally {
      player.speed = originalSpeed;
    }
  };

  const previousAutoFire = prototype.autoFire;
  prototype.autoFire = function autoFireV091() {
    const player = this.player;
    const definition = COMMON[player?.skin];
    if (!player || !definition) return previousAutoFire.call(this);
    if (player.fireTimer > 0 || player.skillCastTimer > 0) return;
    const target = this.nearest(760);
    if (!target) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    const config = this.activeSkinConfig();
    player.fireTimer = player.fireInterval * (player.skillBuff > 0 ? .55 : 1);
    player.attackCastDuration = config.states.attack.duration || 6 / 18;
    player.attackCastTimer = player.attackCastDuration;
    player.attackDir = directionFromVector(dx, dy);
    player.lastDir = player.attackDir;
    this.bullets.push({
      x:player.x,
      y:player.y - 10,
      vx:dx / length * player.bulletSpeed,
      vy:dy / length * player.bulletSpeed,
      r:8,
      dmg:player.damage,
      life:1.45,
      style:"common_attack_v091",
      archetype:definition.archetype
    });
  };

  const previousSkill = prototype.skill;
  prototype.skill = function skillV091(...args) {
    const player = this.player;
    const definition = COMMON[player?.skin];
    if (!player || !definition || definition.archetype === "offensive") {
      return previousSkill.apply(this, args);
    }
    if (player.skillTimer > 0) return;

    const config = this.activeSkinConfig();
    const duration = config.states.skill.duration || 6 / 16;
    player.skillTimer = player.skillCooldown;
    player.skillCastDuration = duration;
    player.skillCastTimer = duration;
    player.skillDir = player.lastDir || "down";

    if (definition.archetype === "defensive") {
      const restored = player.maxHp * .10;
      player.hp = Math.min(player.maxHp, player.hp + restored);
      player.commonShieldTimer = 2;
      player.invuln = Math.max(player.invuln || 0, 2);
      this.effects.push({
        type:"commonShieldCastV091",
        x:player.x,
        y:player.y - 18,
        t:0,
        life:.55
      });
    } else if (definition.archetype === "hybrid") {
      const radius = config.burstRadius || 185;
      const half = CHERRIFT_CONFIG.worldSize / 2 - 200;
      for (const enemy of this.enemies || []) {
        if (!enemy || enemy.dead) continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius + (enemy.r || 0)) continue;
        this.damageEnemy(enemy, player.damage * (config.burstDamageMult || 2.4));
        const fallback = vectorFromDirection(player.lastDir);
        const nx = distance > .001 ? dx / distance : fallback.x;
        const ny = distance > .001 ? dy / distance : fallback.y;
        const push = (config.knockbackDistance || 112) * (1 - Math.min(.45, distance / Math.max(1, radius) * .45));
        enemy.x = clamp(enemy.x + nx * push, -half, half);
        enemy.y = clamp(enemy.y + ny * push, -half, half);
      }
      player.commonSpeedBuffRate = .05;
      player.commonSpeedBuffTimer = Math.max(player.commonSpeedBuffTimer || 0, 1);
      this.effects.push({
        type:"commonHybridBurstV091",
        x:player.x,
        y:player.y,
        r:radius,
        t:0,
        life:.48
      });
    } else {
      const restored = player.maxHp * .40;
      player.hp = Math.min(player.maxHp, player.hp + restored);
      player.commonSpeedBuffRate = .05;
      player.commonSpeedBuffTimer = Math.max(player.commonSpeedBuffTimer || 0, 2);
      this.effects.push({
        type:"commonHealV091",
        x:player.x,
        y:player.y - 18,
        amount:restored,
        t:0,
        life:.78
      });
    }

    this.effects.push({
      type:"skillPulseV085",
      x:player.x,
      y:player.y,
      t:0,
      life:.38
    });
    this.__shakeV085 = Math.max(this.__shakeV085 || 0, .22);
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateV091(dt) {
    const player = this.player;
    if (player?.attackCastTimer > 0) {
      // v0.4, v0.5.5.4 and v0.5.5.7 all decrement this timer.
      // Wuxia has one additional legacy decrement in v0.5.6.1.
      player.attackCastTimer += dt * (player.skin === "wuxia_sakura_cherry" ? 3 : 2);
    }
    const result = previousUpdate.call(this, dt);
    if (player) {
      player.commonSpeedBuffTimer = Math.max(0, (player.commonSpeedBuffTimer || 0) - dt);
      player.commonShieldTimer = Math.max(0, (player.commonShieldTimer || 0) - dt);
    }
    return result;
  };

  const previousUpdateBullets = prototype.updateBullets;
  prototype.updateBullets = function updateBulletsV091(dt) {
    const succubus = this.player?.skin === "succubus_cherry";
    const before = succubus
      ? new Map((this.enemies || []).map(enemy => [enemy, Number(enemy.hp) || 0]))
      : null;
    const result = previousUpdateBullets.call(this, dt);
    if (!succubus || !before || !this.player) return result;

    let active = (this.effects || []).filter(effect => effect.type === "succubusSiphonV091").length;
    for (const enemy of this.enemies || []) {
      const oldHp = before.get(enemy);
      if (!(oldHp > (Number(enemy.hp) || 0)) || active >= 18) continue;
      this.effects.push({
        type:"succubusSiphonV091",
        x:enemy.x,
        y:enemy.y,
        targetX:this.player.x,
        targetY:this.player.y - 12,
        t:0,
        life:.34
      });
      active++;
    }
    return result;
  };

  const previousDrawPlayer = prototype.drawPlayer;
  prototype.drawPlayer = function drawPlayerV091(context, player) {
    if (!player) return previousDrawPlayer.call(this, context, player);

    if (FIXED_RENDER_IDS.has(player.skin)) {
      const skillActive = (player.skillCastTimer || 0) > 0;
      const attackActive = !skillActive && (player.attackCastTimer || 0) > 0;
      const stateName = skillActive
        ? "skill"
        : attackActive
          ? "attack"
          : player.moving
            ? "walk"
            : "idle";
      const direction = skillActive
        ? player.skillDir || player.lastDir || "down"
        : attackActive
          ? player.attackDir || player.lastDir || "down"
          : player.lastDir || "down";
      if (!drawStripFrame(this, context, player, stateName, direction)) {
        previousDrawPlayer.call(this, context, player);
      }
      if (COMMON[player.skin]?.archetype === "defensive") {
        drawPersistentCommonShield(context, player);
      }
      return;
    }

    if (player.skin === "succubus_cherry" && player.soulShield > 0) {
      const image = this.assets.get("succubus_shield");
      if (image) {
        const shield = player.soulShield;
        player.soulShield = 0;
        try {
          previousDrawPlayer.call(this, context, player);
        } finally {
          player.soulShield = shield;
        }
        const ratio = clamp(shield / Math.max(1, player.soulShieldMax || shield), 0, 1);
        context.save();
        context.translate(player.x, player.y - 18);
        context.globalAlpha = .46 + ratio * .38;
        context.imageSmoothingEnabled = false;
        context.drawImage(image, -68, -68, 136, 136);
        context.restore();
        return;
      }
    }

    return previousDrawPlayer.call(this, context, player);
  };

  const previousDrawBullet = prototype.drawBullet;
  prototype.drawBullet = function drawBulletV091(context, bullet) {
    let image = null;
    let size = 48;
    let rotation = Math.atan2(bullet?.vy || 0, bullet?.vx || 1);

    if (bullet?.style === "common_attack_v091") {
      const key = `common_attack_${bullet.archetype === "defensive" ? "defensive" : bullet.archetype}`;
      image = this.assets.get(key);
      rotation += Math.PI / 4;
      size = 48;
    } else if (bullet?.style === "ninja_shuriken") {
      const variant = Math.floor(Math.abs(bullet.spin || 0) / (Math.PI * .5)) % 2 + 1;
      image = this.assets.get(`ninja_shuriken_${variant}`);
      rotation = bullet.spin || 0;
      size = 38;
    } else if (bullet?.style === "succubus_claw") {
      image = this.assets.get("succubus_claw");
      rotation = bullet.angle || rotation;
      size = 76;
    } else if (bullet?.style === "succubus_soul") {
      image = this.assets.get("succubus_wisp");
      rotation = Math.atan2(bullet.vy || 0, bullet.vx || 1) + Math.PI / 2;
      size = 43;
    }

    if (!image) return previousDrawBullet.call(this, context, bullet);
    context.save();
    context.translate(bullet.x, bullet.y);
    context.rotate(rotation);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, -size / 2, -size / 2, size, size);
    context.restore();
  };

  const previousDrawEffect = prototype.drawEffect;
  prototype.drawEffect = function drawEffectV091(context, effect) {
    const progress = clamp(
      Number(effect?.t || 0) / Math.max(.001, Number(effect?.life || .4)),
      0,
      .999999
    );
    const alpha = 1 - progress;

    if (effect?.type === "commonHybridBurstV091") {
      const image = this.assets.get("burst");
      if (!image) return previousDrawEffect.call(this, context, effect);
      const size = (effect.r || 185) * 2 * (.68 + progress * .32);
      context.save();
      context.globalAlpha = Math.min(1, alpha * 1.15);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, effect.x - size / 2, effect.y - size / 2, size, size);
      context.restore();
      return;
    }

    if (effect?.type === "commonShieldCastV091") {
      context.save();
      context.globalAlpha = alpha;
      context.translate(effect.x, effect.y);
      context.strokeStyle = "#cce7ff";
      context.shadowColor = "#69aaff";
      context.shadowBlur = 18;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(0, 0, 18 + progress * 38, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      return;
    }

    if (effect?.type === "commonHealV091") {
      context.save();
      context.globalAlpha = alpha;
      context.translate(effect.x, effect.y - progress * 15);
      context.strokeStyle = "#b7ffd5";
      context.fillStyle = "#eefff5";
      context.shadowColor = "#6effac";
      context.shadowBlur = 14;
      context.lineWidth = 4;
      for (let index = 0; index < 3; index++) {
        context.beginPath();
        context.arc(0, 0, 22 + index * 13 + progress * 24, 0, Math.PI * 2);
        context.stroke();
      }
      context.font = "900 19px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("♥", 0, -33 - progress * 18);
      context.restore();
      return;
    }

    if (effect?.type === "soul_drain_cast") {
      const core = this.assets.get("succubus_core");
      const burst = this.assets.get("succubus_burst");
      context.save();
      context.translate(effect.x, effect.y - 18);
      context.imageSmoothingEnabled = false;
      if (core) {
        const pulse = 224 + Math.sin(progress * Math.PI) * 28;
        context.globalAlpha = .54 * alpha + .22;
        context.drawImage(core, -pulse / 2, -pulse / 2, pulse, pulse);
      }
      if (burst) {
        const frames = 14;
        const frame = Math.min(frames - 1, Math.floor(progress * frames));
        const column = frame % 4;
        const row = Math.floor(frame / 4);
        const size = 330;
        context.globalAlpha = Math.min(1, alpha * 1.28);
        context.drawImage(
          burst,
          column * 192,
          row * 192,
          192,
          192,
          -size / 2,
          -size / 2,
          size,
          size
        );
      }
      context.restore();
      return;
    }

    if (effect?.type === "succubusReleaseV091") {
      const image = this.assets.get("succubus_release");
      if (!image) return;
      const size = 205 + progress * 105;
      context.save();
      context.globalAlpha = alpha;
      context.translate(effect.x, effect.y - 18);
      context.rotate(progress * .32);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, -size / 2, -size / 2, size, size);
      context.restore();
      return;
    }

    if (effect?.type === "soul_hit" || effect?.type === "poison_hit") {
      const image = this.assets.get(effect.type === "soul_hit" ? "succubus_hit" : "ninja_hit");
      if (!image) return previousDrawEffect.call(this, context, effect);
      const size = 72 + progress * 34;
      context.save();
      context.globalAlpha = alpha;
      context.imageSmoothingEnabled = false;
      context.drawImage(image, effect.x - size / 2, effect.y - size / 2, size, size);
      context.restore();
      return;
    }

    if (effect?.type === "soul_shield" || effect?.type === "shield_block") {
      const image = this.assets.get("succubus_shield");
      if (!image) return previousDrawEffect.call(this, context, effect);
      const size = 112 + progress * 32;
      context.save();
      context.globalAlpha = alpha;
      context.imageSmoothingEnabled = false;
      context.drawImage(image, effect.x - size / 2, effect.y - 18 - size / 2, size, size);
      context.restore();
      return;
    }

    if (effect?.type === "succubusSiphonV091") {
      const image = this.assets.get("succubus_siphon");
      if (!image) return;
      const dx = (effect.targetX || 0) - effect.x;
      const dy = (effect.targetY || 0) - effect.y;
      const distance = Math.max(18, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      context.save();
      context.globalAlpha = Math.sin(progress * Math.PI) * .82;
      context.translate(effect.x + dx / 2, effect.y + dy / 2);
      context.rotate(angle - Math.PI / 2);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, -43, -distance / 2, 86, distance);
      context.restore();
      return;
    }

    if (effect?.type === "wuxia_attack_arc") {
      const image = this.assets.get("wuxia_attack");
      if (!image) return previousDrawEffect.call(this, context, effect);
      const size = 158;
      context.save();
      context.globalAlpha = alpha;
      context.translate(effect.x, effect.y - 16);
      context.rotate((effect.angle || 0) + Math.PI);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, -size / 2, -size / 2, size, size);
      context.restore();
      return;
    }

    if (effect?.type === "blossom_spin_pulse") {
      const still = this.assets.get("wuxia_skill");
      const sheet = this.assets.get("wuxia_skill_sheet");
      if (!still && !sheet) return previousDrawEffect.call(this, context, effect);
      const size = (effect.radius || 188) * 2;
      context.save();
      context.translate(effect.x, effect.y - 20);
      context.rotate(progress * .18);
      context.imageSmoothingEnabled = false;
      if (still) {
        context.globalAlpha = alpha * .32;
        context.drawImage(still, -size / 2, -size / 2, size, size);
      }
      if (sheet) {
        const frames = 7;
        const frame = Math.min(frames - 1, Math.floor(progress * frames));
        const column = frame % 3;
        const row = Math.floor(frame / 3);
        context.globalAlpha = Math.min(1, alpha * 1.2);
        context.drawImage(
          sheet,
          column * 256,
          row * 256,
          256,
          256,
          -size / 2,
          -size / 2,
          size,
          size
        );
      }
      context.restore();
      return;
    }

    return previousDrawEffect.call(this, context, effect);
  };

  const previousSkillForSuccubus = prototype.skill;
  prototype.skill = function skillEffectsV091(...args) {
    const player = this.player;
    const wasReady = player?.skin === "succubus_cherry" && player.skillTimer <= 0;
    const result = previousSkillForSuccubus.apply(this, args);
    if (wasReady && player?.skillTimer > 0) {
      const cast = [...(this.effects || [])].reverse().find(effect => effect.type === "soul_drain_cast");
      if (cast) cast.y -= .1;
      this.effects.push({
        type:"succubusReleaseV091",
        x:player.x,
        y:player.y + .1,
        t:0,
        life:.62
      });
    }
    return result;
  };

  const previousDrawWorld = prototype.drawWorld;
  const drawWorld = function drawWorldV091(context) {
    const result = previousDrawWorld.call(this, context);
    if (!this.player || !["playing", "level", "paused", "gameover"].includes(this.mode)) {
      return result;
    }

    const zoom = Math.max(1, Number(this.zoom) || 1);
    const boundary = CHERRIFT_CONFIG.worldSize / 2 - 200;
    const depth = 260 * zoom;
    const left = this.w / 2 + (-boundary - this.camera.x) * zoom;
    const right = this.w / 2 + (boundary - this.camera.x) * zoom;
    const top = this.h / 2 + (-boundary - this.camera.y) * zoom;
    const bottom = this.h / 2 + (boundary - this.camera.y) * zoom;

    context.save();
    const fogColor = this.stage?.world === 2 ? "4,2,13" : "9,3,14";

    if (left > 0) {
      const gradient = context.createLinearGradient(left, 0, left - depth, 0);
      gradient.addColorStop(0, `rgba(${fogColor},0)`);
      gradient.addColorStop(1, `rgba(${fogColor},.94)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, Math.min(this.w, left), this.h);
    }
    if (right < this.w) {
      const gradient = context.createLinearGradient(right, 0, right + depth, 0);
      gradient.addColorStop(0, `rgba(${fogColor},0)`);
      gradient.addColorStop(1, `rgba(${fogColor},.94)`);
      context.fillStyle = gradient;
      context.fillRect(Math.max(0, right), 0, this.w - Math.max(0, right), this.h);
    }
    if (top > 0) {
      const gradient = context.createLinearGradient(0, top, 0, top - depth);
      gradient.addColorStop(0, `rgba(${fogColor},0)`);
      gradient.addColorStop(1, `rgba(${fogColor},.94)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, this.w, Math.min(this.h, top));
    }
    if (bottom < this.h) {
      const gradient = context.createLinearGradient(0, bottom, 0, bottom + depth);
      gradient.addColorStop(0, `rgba(${fogColor},0)`);
      gradient.addColorStop(1, `rgba(${fogColor},.94)`);
      context.fillStyle = gradient;
      context.fillRect(0, Math.max(0, bottom), this.w, this.h - Math.max(0, bottom));
    }

    context.strokeStyle = "rgba(255,126,193,.42)";
    context.shadowColor = "rgba(255,66,154,.45)";
    context.shadowBlur = 8;
    context.lineWidth = 2;
    context.beginPath();
    if (left >= 0 && left <= this.w) {
      context.moveTo(left, 0);
      context.lineTo(left, this.h);
    }
    if (right >= 0 && right <= this.w) {
      context.moveTo(right, 0);
      context.lineTo(right, this.h);
    }
    if (top >= 0 && top <= this.h) {
      context.moveTo(0, top);
      context.lineTo(this.w, top);
    }
    if (bottom >= 0 && bottom <= this.h) {
      context.moveTo(0, bottom);
      context.lineTo(this.w, bottom);
    }
    context.stroke();
    context.restore();
    return result;
  };
  drawWorld.__v091BoundaryFog = true;
  prototype.drawWorld = drawWorld;
}

function ensureCss() {
  if (id("v091css")) return;
  const link = document.createElement("link");
  link.id = "v091css";
  link.rel = "stylesheet";
  link.href = `v091.css?v=${CACHE_VERSION}`;
  document.head.appendChild(link);
}

function archetypeLabel(archetype) {
  const labels = {
    offensive:{hu:"Offensive", en:"Offensive"},
    defensive:{hu:"Defensive", en:"Defensive"},
    hybrid:{hu:"Hybrid", en:"Hybrid"},
    support:{hu:"Support", en:"Support"}
  };
  return labels[archetype]?.[language()] || archetype;
}

function decorateCommonSkin() {
  const skin = CHERRIFT_DATA.skins[UI.skinIndex || 0] ||
    CHERRIFT_DATA.skins.find(entry => entry.id === UI.save?.selectedSkin);
  const definition = COMMON[skin?.id];
  if (!skin || !definition) return;

  const splash = id("skinSplash");
  if (splash && skin.splash) {
    splash.dataset.skinId = skin.id;
    splash.style.backgroundImage =
      `linear-gradient(180deg,rgba(8,4,14,.01),rgba(8,4,14,.38)),url("${skin.splash}")`;
    splash.style.backgroundSize = "cover";
    splash.style.backgroundPosition = "center top";
    splash.style.backgroundRepeat = "no-repeat";
  }

  const bonus = id("skinBonusV055");
  if (bonus) {
    const passive = language() === "hu" ? definition.passiveHu : definition.passiveEn;
    const skill = language() === "hu" ? definition.skillHu : definition.skillEn;
    bonus.innerHTML = `
      <div class="common-skin-card-v091 role-${definition.archetype}">
        <small>COMMON · ${archetypeLabel(definition.archetype).toUpperCase()}</small>
        <b>${passive}</b>
        <span>${skill}</span>
      </div>`;
  }
}

function patchVersion() {
  const build = window.CHERRIFT_BUILD || {displayVersion:DISPLAY_VERSION,title:`CHERRIFT ${DISPLAY_VERSION} – TEST BUILD`};
  document.title = build.title;
  const label = `${language() === "hu" ? "TESZTVERZIÓ" : "TEST BUILD"} · ${build.displayVersion}`;
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = label;
  const banner = id("testBuildBannerV063");
  if (banner) {
    const strong = q("strong", banner);
    if (strong) strong.textContent = label;
  }
  qa(".version-badge-v063,[data-v063-version]").forEach(element => {
    element.textContent = label;
  });
  const patch = q("#menu .patch-card");
  if (patch) {
    const badge = q("header span", patch);
    const copy = q(":scope > p", patch);
    if (badge) badge.textContent = build.displayVersion;
    if (copy) {
      copy.textContent = language() === "hu"
        ? "Új Common Cherry skinek és szerepkörök, PNG harci effektek, javított sprite-időzítés és sötétedő map-határ."
        : "New Common Cherry skins and roles, PNG combat effects, corrected sprite timing and a darkened map boundary.";
    }
  }
}

function patchUi() {
  const previousCarousel = UI.renderSkinCarousel?.bind(UI);
  if (previousCarousel && !UI.__v091Carousel) {
    UI.renderSkinCarousel = function renderSkinCarouselV091(...args) {
      const result = previousCarousel(...args);
      decorateCommonSkin();
      return result;
    };
    UI.__v091Carousel = true;
  }

  const previousInit = UI.init?.bind(UI);
  if (previousInit && !UI.__v091Init) {
    UI.init = function initV091(save, game) {
      normalizeSave(save);
      const result = previousInit(save, game);
      patchVersion();
      decorateCommonSkin();
      return result;
    };
    UI.__v091Init = true;
  }

  const previousOpen = UI.open?.bind(UI);
  if (previousOpen && !UI.__v091Open) {
    UI.open = function openV091(...args) {
      const result = previousOpen(...args);
      patchVersion();
      if (args[0] === "skins") decorateCommonSkin();
      return result;
    };
    UI.__v091Open = true;
  }

  window.addEventListener("cherrift:languagechange", () => {
    patchVersion();
    decorateCommonSkin();
  });

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchVersion();
    });
  });
  observer.observe(document.documentElement, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class"]
  });
}

configureCommonSkins();
configureSkinData();
patchStorage();
patchAssetLoading();
patchGameplay();
ensureCss();
patchUi();
patchVersion();

CHERRIFT_CONFIG.version = VERSION;
CHERRIFT_DATA.version = VERSION;

window.CHERRIFT_V091 = {
  version:VERSION,
  displayVersion:DISPLAY_VERSION,
  cacheVersion:CACHE_VERSION,
  commonSkins:[...COMMON_IDS],
  effects:{...EFFECT_ASSETS},
  normalize:normalizeSave,
  boundaryFog:true,
  fixedSpriteTiming:true
};

console.info("[CHERRIFT] v0.9.1 Common Skins, PNG VFX and boundary fog loaded.");
})();
