(() => {
"use strict";

const VERSION = "0.5.6.1-wuxia-sakura";
const SKIN_ID = "wuxia_sakura_cherry";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;

const id = name => document.getElementById(name);

if (
  !window.CherriftGame ||
  !window.CHERRIFT_V0560 ||
  !window.CHERRIFT_CONFIG ||
  !window.CHERRIFT_DATA ||
  !window.CherriftStorage ||
  !window.UI
) {
  console.error("[CHERRIFT v0.5.6.1] v0.5.6.0 is required.");
  return;
}

function ensureCss() {
  if (id("v0561css")) return;
  const link = document.createElement("link");
  link.id = "v0561css";
  link.rel = "stylesheet";
  link.href = "v0561.css?v=0561";
  document.head.appendChild(link);
}

function makeDirections(state) {
  return Object.fromEntries(
    DIRECTIONS.map(direction => [
      direction,
      `assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_${state}_${direction}.png?v=090-hf1`
    ])
  );
}

CHERRIFT_CONFIG.player.skins[SKIN_ID] = {
  id: SKIN_ID,
  folder: "wuxia_sakura_cherry",
  attackType: "melee",
  skillType: "blossom_spin",
  movementSpeedBonus: 0.05,
  attackSpeedBonus: 0.05,
  meleeRange: 154,
  meleeCone: 112,
  meleeDamageMult: 1.18,
  blossomRadius: 188,
  blossomDamageMult: 2.85,
  blossomSpeedBonus: 0.02,
  blossomSpeedDuration: 1,
  killThreshold: 10,
  cooldownReduction: 0.30,
  states: {
    idle: { fps: 3, frames: 4, dirs: makeDirections("idle") },
    walk: { fps: 8, frames: 6, dirs: makeDirections("walk") },
    attack: {
      fps: 18,
      frames: 6,
      duration: 6 / 18,
      dirs: makeDirections("attack")
    },
    skill: {
      fps: 16,
      frames: 6,
      duration: 6 / 16,
      dirs: makeDirections("skill")
    }
  }
};

const wuxiaData = {
  id: SKIN_ID,
  name: "Wuxia Sakura Cherry",
  rarity: "Legendary",
  emoji: "🌸",
  weapon: "Twin Sakura Jian",
  skill: "Blossom Spin",
  passive: "Every 10 kills: -30% remaining Skill CD",
  uniquePassive: "+5% Movement Speed · +5% Attack Speed · Sakura petal trail",
  desc:
    "Legendary dual-sword melee skin. Every 10 defeated enemies reduces the remaining Blossom Spin cooldown by 30%. " +
    "Wuxia Sakura Cherry moves 5% faster, attacks 5% faster, and leaves small fading sakura petals while walking. " +
    "Blossom Spin cuts a medium area and grants a 2% movement-speed burst that fades to zero over one second.",
  stats: { damage: 0, speed: 0 },
  gradient: ["#ffb2d3", "#5b1839"],
  splash:
    "assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_splashart.jpg?v=090-hf1",
  icon:
    "assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.png?v=090-hf1"
};

const existingSkinIndex = CHERRIFT_DATA.skins.findIndex(
  skin => skin.id === SKIN_ID
);

if (existingSkinIndex >= 0) {
  CHERRIFT_DATA.skins[existingSkinIndex] = {
    ...CHERRIFT_DATA.skins[existingSkinIndex],
    ...wuxiaData
  };
} else {
  CHERRIFT_DATA.skins.push(wuxiaData);
}

function normalizeSave(save) {
  save = save && typeof save === "object" ? save : {};
  save.unlockedSkins = Array.isArray(save.unlockedSkins)
    ? save.unlockedSkins
    : [];

  if (!save.unlockedSkins.includes(SKIN_ID)) {
    save.unlockedSkins.push(SKIN_ID);
  }
  return save;
}

const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
const previousLoad = CherriftStorage.load.bind(CherriftStorage);
const previousSave = CherriftStorage.save.bind(CherriftStorage);

CherriftStorage.defaults = function defaultsV0561() {
  return normalizeSave(previousDefaults());
};

CherriftStorage.load = function loadV0561() {
  const save = normalizeSave(previousLoad());
  previousSave(save);
  return save;
};

CherriftStorage.save = function saveV0561(save) {
  return previousSave(normalizeSave(save));
};

function directionFromVector(dx, dy) {
  return Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "left" : "right")
    : (dy < 0 ? "up" : "down");
}

function directionVector(direction) {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function nearestLivingEnemy(game, range) {
  let best = null;
  let bestDistance = Math.max(0, range || 0);

  for (const enemy of game.enemies || []) {
    if (!enemy || enemy.dead) continue;
    const distance = Math.hypot(
      enemy.x - game.player.x,
      enemy.y - game.player.y
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }
  return best;
}

function spawnPetal(game, options = {}) {
  if (!game?.effects) return;

  const particleCount = game.effects.reduce(
    (count, effect) => count + (effect?.wuxiaParticle ? 1 : 0),
    0
  );
  if (particleCount >= 42) return;

  game.effects.push({
    type: "wuxia_petal",
    wuxiaParticle: true,
    x: options.x ?? game.player.x,
    y: options.y ?? game.player.y,
    vx: options.vx ?? ((Math.random() - 0.5) * 45),
    vy: options.vy ?? (-18 - Math.random() * 28),
    rotation: options.rotation ?? (Math.random() * Math.PI * 2),
    rotationSpeed:
      options.rotationSpeed ?? ((Math.random() - 0.5) * 7),
    size: options.size ?? (2.4 + Math.random() * 2.4),
    t: 0,
    life: options.life ?? (0.55 + Math.random() * 0.35)
  });
}

function spawnPetalBurst(game, x, y, count, force = 1) {
  const cappedCount = Math.min(18, Math.max(0, count || 0));
  for (let index = 0; index < cappedCount; index++) {
    const angle =
      index / Math.max(1, cappedCount) * Math.PI * 2 +
      (Math.random() - 0.5) * 0.35;
    const speed = (45 + Math.random() * 80) * force;

    spawnPetal(game, {
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 22,
      life: 0.48 + Math.random() * 0.42,
      size: 2.6 + Math.random() * 2.8
    });
  }
}

function drawStateFrame(
  game,
  context,
  player,
  stateName,
  direction,
  timer,
  duration
) {
  const config = game.activeSkinConfig();
  const state = config?.states?.[stateName];
  const image = game.assets.get(
    `player_${player.skin}_${stateName}_${direction}`
  );
  if (!state || !image) return false;

  const realFrames = Math.max(1, Math.floor(image.width / FRAME_SIZE));
  const frameCount = Math.max(
    1,
    Math.min(Number(state.frames) || realFrames, realFrames)
  );
  const fullDuration =
    Number(duration) ||
    Number(state.duration) ||
    frameCount / Math.max(1, Number(state.fps) || 12);
  const elapsed = Math.max(
    0,
    fullDuration - Math.max(0, Number(timer) || 0)
  );
  const frame = Math.min(
    frameCount - 1,
    Math.floor(elapsed * (Number(state.fps) || 12))
  );

  const displayWidth = CHERRIFT_CONFIG.player.displayWidth || 116;
  const displayHeight = CHERRIFT_CONFIG.player.displayHeight || 116;

  context.drawImage(
    image,
    frame * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    Math.round(player.x - displayWidth / 2),
    Math.round(player.y - displayHeight + 34),
    displayWidth,
    displayHeight
  );
  return true;
}

const prototype = CherriftGame.prototype;

const previousStart = prototype.start;
prototype.start = async function startV0561(...args) {
  const result = await previousStart.apply(this, args);
  const player = this.player;
  if (!player || player.skin !== SKIN_ID) return result;

  const config = this.activeSkinConfig();
  player.speed *= 1 + (config.movementSpeedBonus || 0.05);
  player.fireInterval /= 1 + (config.attackSpeedBonus || 0.05);
  player.attackType = "melee";
  player.attackCastTimer = 0;
  player.attackCastDuration = config.states.attack.duration || 6 / 18;
  player.wuxiaKillProgress = 0;
  player.wuxiaNextCastDiscount = false;
  player.blossomSpeedTimer = 0;
  player.blossomSpeedDuration = config.blossomSpeedDuration || 1;
  player.wuxiaPetalTimer = 0;
  return result;
};

const previousMovePlayer = prototype.movePlayer;
prototype.movePlayer = function movePlayerV0561(moveVector, dt) {
  const player = this.player;

  if (
    !player ||
    player.skin !== SKIN_ID ||
    !(player.blossomSpeedTimer > 0)
  ) {
    return previousMovePlayer.call(this, moveVector, dt);
  }

  const duration = Math.max(
    0.001,
    player.blossomSpeedDuration || 1
  );
  const remainingRatio = Math.max(
    0,
    Math.min(1, player.blossomSpeedTimer / duration)
  );
  const temporaryBonus =
    (this.activeSkinConfig().blossomSpeedBonus || 0.02) *
    remainingRatio;

  const originalSpeed = player.speed;
  player.speed = originalSpeed * (1 + temporaryBonus);
  try {
    return previousMovePlayer.call(this, moveVector, dt);
  } finally {
    player.speed = originalSpeed;
  }
};

const previousUpdate = prototype.update;
prototype.update = function updateV0561(dt) {
  const player = this.player;

  if (player?.skin === SKIN_ID) {
    player.attackCastTimer = Math.max(
      0,
      (player.attackCastTimer || 0) - dt
    );
    player.blossomSpeedTimer = Math.max(
      0,
      (player.blossomSpeedTimer || 0) - dt
    );
  }

  const result = previousUpdate.call(this, dt);
  if (player?.skin !== SKIN_ID) return result;

  for (const effect of this.effects || []) {
    if (!effect?.wuxiaParticle) continue;
    effect.x += (effect.vx || 0) * dt;
    effect.y += (effect.vy || 0) * dt;
    effect.vy += 14 * dt;
    effect.rotation =
      (effect.rotation || 0) +
      (effect.rotationSpeed || 0) * dt;
  }

  if (
    this.mode === "playing" &&
    player.moving &&
    !(player.skillCastTimer > 0)
  ) {
    player.wuxiaPetalTimer = (player.wuxiaPetalTimer || 0) - dt;

    if (player.wuxiaPetalTimer <= 0) {
      player.wuxiaPetalTimer = 0.085;
      const facing = directionVector(player.lastDir || "down");

      spawnPetal(this, {
        x:
          player.x -
          facing.x * 17 +
          (Math.random() - 0.5) * 18,
        y:
          player.y -
          facing.y * 17 +
          8 +
          (Math.random() - 0.5) * 12,
        vx:
          -facing.x * (22 + Math.random() * 24) +
          (Math.random() - 0.5) * 25,
        vy:
          -facing.y * (22 + Math.random() * 24) -
          22 -
          Math.random() * 16,
        life: 0.48 + Math.random() * 0.30,
        size: 2.3 + Math.random() * 1.9
      });
    }
  }
  return result;
};

const previousAutoFire = prototype.autoFire;
prototype.autoFire = function autoFireV0561() {
  const player = this.player;

  if (!player || player.skin !== SKIN_ID) {
    return previousAutoFire.call(this);
  }

  if (player.fireTimer > 0 || player.skillCastTimer > 0) return;

  const config = this.activeSkinConfig();
  const target = nearestLivingEnemy(
    this,
    (config.meleeRange || 154) + 30
  );
  if (!target) return;

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = dx / length;
  const normalY = dy / length;

  player.lastDir = directionFromVector(dx, dy);
  player.attackDir = player.lastDir;
  player.attackCastDuration =
    config.states.attack.duration || 6 / 18;
  player.attackCastTimer = player.attackCastDuration;
  player.fireTimer = Math.max(
    player.fireInterval,
    player.attackCastDuration * 0.82
  );

  const coneDot = Math.cos(
    ((config.meleeCone || 112) / 2) * Math.PI / 180
  );

  for (const enemy of this.enemies) {
    if (!enemy || enemy.dead) continue;

    const enemyX = enemy.x - player.x;
    const enemyY = enemy.y - player.y;
    const distance = Math.hypot(enemyX, enemyY) || 1;

    if (
      distance >
      (config.meleeRange || 154) +
      (enemy.r || 0)
    ) {
      continue;
    }

    const dot =
      enemyX / distance * normalX +
      enemyY / distance * normalY;

    if (dot < coneDot) continue;

    this.damageEnemy(
      enemy,
      player.damage * (config.meleeDamageMult || 1.18)
    );
  }

  this.effects.push({
    type: "wuxia_attack_arc",
    x: player.x,
    y: player.y,
    angle: Math.atan2(normalY, normalX),
    t: 0,
    life: 0.24
  });

  spawnPetalBurst(
    this,
    player.x + normalX * 54,
    player.y + normalY * 54,
    6,
    0.75
  );
};

const previousSkill = prototype.skill;
prototype.skill = function skillV0561() {
  const player = this.player;

  if (!player || player.skin !== SKIN_ID) {
    return previousSkill.call(this);
  }
  if (player.skillTimer > 0) return;

  const config = this.activeSkinConfig();
  const state = config.states.skill;
  const duration = state.duration || 6 / 16;
  const cooldownMultiplier =
    player.wuxiaNextCastDiscount
      ? 1 - (config.cooldownReduction || 0.30)
      : 1;

  player.wuxiaNextCastDiscount = false;
  player.skillTimer = player.skillCooldown * cooldownMultiplier;
  player.skillCastTimer = duration;
  player.skillCastDuration = duration;
  player.skillDir = player.lastDir || "down";
  player.blossomSpeedDuration = config.blossomSpeedDuration || 1;
  player.blossomSpeedTimer = player.blossomSpeedDuration;

  const radius = config.blossomRadius || 188;

  for (const enemy of this.enemies) {
    if (!enemy || enemy.dead) continue;

    if (
      Math.hypot(enemy.x - player.x, enemy.y - player.y) <
      radius + (enemy.r || 0)
    ) {
      this.damageEnemy(
        enemy,
        player.damage * (config.blossomDamageMult || 2.85)
      );
    }
  }

  this.effects.push({
    type: "blossom_spin_pulse",
    x: player.x,
    y: player.y,
    radius,
    t: 0,
    life: duration + 0.16
  });

  spawnPetalBurst(this, player.x, player.y, 15, 1.15);
};

const previousDamageEnemy = prototype.damageEnemy;
prototype.damageEnemy = function damageEnemyV0561(enemy, damage) {
  const wasDead = Boolean(enemy?.dead);
  const result = previousDamageEnemy.call(this, enemy, damage);

  const player = this.player;
  if (
    !player ||
    player.skin !== SKIN_ID ||
    wasDead ||
    !enemy?.dead
  ) {
    return result;
  }

  const config = this.activeSkinConfig();
  const threshold = config.killThreshold || 10;
  player.wuxiaKillProgress = (player.wuxiaKillProgress || 0) + 1;

  if (player.wuxiaKillProgress < threshold) return result;
  player.wuxiaKillProgress -= threshold;

  const reduction = config.cooldownReduction || 0.30;

  if (player.skillTimer > 0.001) {
    player.skillTimer *= 1 - reduction;

    this.effects.push({
      type: "wuxia_cdr",
      x: player.x,
      y: player.y - 42,
      text: "-30% SKILL CD",
      t: 0,
      life: 0.80
    });

    UI.toast?.(
      `Wuxia passive: Blossom Spin CD -${Math.round(reduction * 100)}%`
    );
  } else {
    player.wuxiaNextCastDiscount = true;

    this.effects.push({
      type: "wuxia_cdr",
      x: player.x,
      y: player.y - 42,
      text: "NEXT CD -30%",
      t: 0,
      life: 0.80
    });

    UI.toast?.(
      "Wuxia passive ready: next Blossom Spin cooldown -30%"
    );
  }

  return result;
};

const previousDrawPlayer = prototype.drawPlayer;
prototype.drawPlayer = function drawPlayerV0561(
  context,
  player
) {
  if (
    player?.skin === SKIN_ID &&
    (player.attackCastTimer || 0) > 0 &&
    !(player.skillCastTimer > 0)
  ) {
    const direction =
      player.attackDir ||
      player.lastDir ||
      "down";

    if (
      drawStateFrame(
        this,
        context,
        player,
        "attack",
        direction,
        player.attackCastTimer,
        player.attackCastDuration
      )
    ) {
      return;
    }
  }

  return previousDrawPlayer.call(this, context, player);
};

const previousDrawEffect = prototype.drawEffect;
prototype.drawEffect = function drawEffectV0561(
  context,
  effect
) {
  if (
    ![
      "wuxia_petal",
      "wuxia_attack_arc",
      "blossom_spin_pulse",
      "wuxia_cdr"
    ].includes(effect?.type)
  ) {
    return previousDrawEffect.call(this, context, effect);
  }

  const progress = Math.max(
    0,
    Math.min(1, effect.t / effect.life)
  );
  const alpha = 1 - progress;

  context.save();
  context.globalAlpha = alpha;

  if (effect.type === "wuxia_petal") {
    context.translate(effect.x, effect.y);
    context.rotate(effect.rotation || 0);
    context.fillStyle =
      progress < 0.55 ? "#ff91c4" : "#ffd0e5";
    context.beginPath();
    context.ellipse(
      0,
      0,
      effect.size || 3,
      (effect.size || 3) * 0.52,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
    context.restore();
    return;
  }

  if (effect.type === "wuxia_attack_arc") {
    context.translate(effect.x, effect.y);
    context.rotate(effect.angle || 0);
    context.strokeStyle = "#ff8ec2";
    context.shadowColor = "#ff4fa1";
    context.shadowBlur = 13;
    context.lineWidth = 6;
    context.lineCap = "round";
    context.beginPath();
    context.arc(0, 0, 73 + progress * 13, -0.78, 0.78);
    context.stroke();
    context.restore();
    return;
  }

  if (effect.type === "blossom_spin_pulse") {
    context.translate(effect.x, effect.y);
    context.rotate(progress * Math.PI * 1.4);
    context.strokeStyle =
      `rgba(255,126,188,${0.66 * alpha})`;
    context.shadowColor = "#ff5eac";
    context.shadowBlur = 15;
    context.lineWidth = 4;
    context.setLineDash([18, 12]);
    context.beginPath();
    context.arc(
      0,
      0,
      (effect.radius || 188) * (0.72 + progress * 0.28),
      0,
      Math.PI * 2
    );
    context.stroke();
    context.restore();
    return;
  }

  if (effect.type === "wuxia_cdr") {
    context.translate(effect.x, effect.y - progress * 27);
    context.fillStyle = "#ffd2e8";
    context.shadowColor = "#ff4fa1";
    context.shadowBlur = 10;
    context.font = "900 13px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(effect.text || "-30% CD", 0, 0);
    context.restore();
    return;
  }

  context.restore();
};

const previousRenderSkinCarousel =
  UI.renderSkinCarousel?.bind(UI);

if (previousRenderSkinCarousel) {
  UI.renderSkinCarousel =
    function renderSkinCarouselV0561(...args) {
      const result = previousRenderSkinCarousel(...args);
      const skin =
        CHERRIFT_DATA.skins[UI.skinIndex || 0] ||
        CHERRIFT_DATA.skins[0];

      if (skin?.id !== SKIN_ID) return result;

      const bonus = id("skinBonusV055");
      if (bonus) {
        bonus.innerHTML = `
          <div class="wuxia-passive-v0561">
            <small>PASSIVE</small>
            <b>Every 10 kills: remaining Skill CD -30%</b>
          </div>
          <div class="wuxia-passive-v0561 unique">
            <small>UNIQUE PASSIVE</small>
            <b>+5% Movement · +5% Attack Speed · Sakura walking trail</b>
          </div>`;
      }

      const description = id("skinDesc");
      if (description) description.textContent = skin.desc;
      return result;
    };
}

ensureCss();

window.CHERRIFT_V0561 = {
  version: VERSION,
  skinId: SKIN_ID,
  unlocked: true
};

console.info(
  "[CHERRIFT] v0.5.6.1 Wuxia Sakura Cherry loaded."
);
})();
