(() => {
"use strict";

const VERSION = "0.9.1-warrior-split-vfx";
const SKIN_ID = "warrior_cherry";
const OLD_EFFECT_TYPES = new Set([
  "warrior_slash",
  "whirlwind_start",
  "whirlwind_tick"
]);
const SHEETS = {
  slash: {
    key: "warrior_v063_slash",
    source: "assets/effects/warrior_cherry/attack_1.png?v=091",
    columns: 1,
    rows: 1,
    frames: 1
  },
  whirlwind: {
    key: "warrior_v063_whirlwind_back",
    source: "assets/effects/warrior_cherry/skill_effect_1.png?v=091",
    columns: 1,
    rows: 1,
    frames: 1
  },
  whirlwindFront: {
    key: "warrior_v063_whirlwind_front",
    source: "assets/effects/warrior_cherry/skill_effect_2.png?v=091",
    columns: 1,
    rows: 1,
    frames: 1
  }
};

if (!window.CherriftGame || !window.CHERRIFT_V0561 || !window.CHERRIFT_CONFIG) {
  console.error("[CHERRIFT v0.6.3] v0.5.6.1 is required for Warrior VFX.");
  return;
}

const config = CHERRIFT_CONFIG.player.skins[SKIN_ID];
if (!config) {
  console.error("[CHERRIFT v0.6.3] Warrior Cherry config is missing.");
  return;
}

config.vfx = {
  source: "split-rgba",
  attackFrames: SHEETS.slash.frames,
  attackWidth: 190,
  attackForwardOffset: 48,
  attackVerticalOffset: -20,
  whirlwindFrames: SHEETS.whirlwind.frames,
  whirlwindWidth: 258,
  whirlwindVerticalOffset: -22
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function animationFrame(timer, duration, frameCount) {
  const safeDuration = Math.max(0.001, Number(duration) || 0.4);
  const progress = clamp(
    1 - Math.max(0, Number(timer) || 0) / safeDuration,
    0,
    0.999999
  );
  return Math.min(frameCount - 1, Math.floor(progress * frameCount));
}

function directionAngle(direction) {
  if (direction === "left") return Math.PI;
  if (direction === "up") return -Math.PI / 2;
  if (direction === "down") return Math.PI / 2;
  return 0;
}

async function loadWarriorVfx(game) {
  if (!game?.assets || game.__warriorV063Loaded) return;
  if (game.__warriorV063Loading) return game.__warriorV063Loading;

  game.__warriorV063Loading = Promise.all(
    Object.values(SHEETS).map(sheet =>
      game.assets.loadImage(sheet.key, sheet.source)
    )
  ).then(results => {
    game.__warriorV063Loaded = results.every(Boolean);
    if (!game.__warriorV063Loaded) {
      console.error("[CHERRIFT v0.6.3] Warrior RGBA effect sheets could not be loaded.");
    }
  }).finally(() => {
    game.__warriorV063Loading = null;
  });

  return game.__warriorV063Loading;
}

function drawGridFrame(game, context, sheet, options) {
  const image = game.assets.get(sheet.key);
  if (!image) return false;

  const sourceWidth = (image.naturalWidth || image.width) / sheet.columns;
  const sourceHeight = (image.naturalHeight || image.height) / sheet.rows;
  const frame = clamp(Math.floor(options.frame || 0), 0, sheet.frames - 1);
  const column = frame % sheet.columns;
  const row = Math.floor(frame / sheet.columns);
  const drawWidth = Math.max(1, options.width);
  const drawHeight = drawWidth * sourceHeight / sourceWidth;

  context.save();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = clamp(options.alpha ?? 1, 0, 1);
  context.imageSmoothingEnabled = false;
  context.translate(options.x, options.y);
  context.rotate(options.rotation || 0);

  if (options.clipFront) {
    context.beginPath();
    context.rect(-drawWidth * 0.62, 0, drawWidth * 1.24, drawHeight * 0.62);
    context.clip();
  }

  context.drawImage(
    image,
    column * sourceWidth,
    row * sourceHeight,
    sourceWidth,
    sourceHeight,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  context.restore();
  return true;
}

function drawAttack(game, context, player) {
  const duration = player.attackCastDuration || config.states?.attack?.duration || 0.34;
  const angle = Number.isFinite(player.warriorAttackAngle)
    ? player.warriorAttackAngle
    : directionAngle(player.attackDir || player.lastDir || "right");
  const frame = animationFrame(player.attackCastTimer, duration, SHEETS.slash.frames);
  const forward = config.vfx.attackForwardOffset;

  return drawGridFrame(game, context, SHEETS.slash, {
    frame,
    x: player.x + Math.cos(angle) * forward,
    y: player.y + Math.sin(angle) * forward * 0.64 + config.vfx.attackVerticalOffset,
    width: config.vfx.attackWidth,
    rotation: angle,
    alpha: 1
  });
}

function whirlwindFrame(player) {
  const duration = player.skillCastDuration || config.whirlwindDuration || 0.72;
  return animationFrame(player.skillCastTimer, duration, SHEETS.whirlwind.frames);
}

function drawWhirlwind(game, context, player, front) {
  const duration = Math.max(0.001, player.skillCastDuration || config.whirlwindDuration || 0.72);
  const progress = clamp(1 - (player.skillCastTimer || 0) / duration, 0, 1);
  const sheet = front ? SHEETS.whirlwindFront : SHEETS.whirlwind;
  return drawGridFrame(game, context, sheet, {
    frame: whirlwindFrame(player),
    x: player.x,
    y: player.y + config.vfx.whirlwindVerticalOffset,
    width: config.vfx.whirlwindWidth,
    rotation: progress * (front ? -0.72 : 0.72),
    alpha: front ? 0.98 : 0.72,
    clipFront: front
  });
}

const prototype = CherriftGame.prototype;

const previousStart = prototype.start;
prototype.start = async function startV0563(...args) {
  const result = await previousStart.apply(this, args);
  if (this.player?.skin === SKIN_ID) await loadWarriorVfx(this);
  return result;
};

const previousUpdate = prototype.update;
prototype.update = function updateV0563(dt) {
  const result = previousUpdate.call(this, dt);
  if (this.player?.skin !== SKIN_ID || !Array.isArray(this.effects)) return result;

  for (const effect of this.effects) {
    if (effect?.type === "warrior_slash" && Number.isFinite(effect.angle)) {
      this.player.warriorAttackAngle = effect.angle;
    }
  }
  this.effects = this.effects.filter(effect => !OLD_EFFECT_TYPES.has(effect?.type));
  return result;
};

const previousDrawPlayer = prototype.drawPlayer;
prototype.drawPlayer = function drawPlayerV0563(context, player) {
  if (!player || player.skin !== SKIN_ID) {
    return previousDrawPlayer.call(this, context, player);
  }

  const skillActive = (player.skillCastTimer || 0) > 0;
  const attackActive = !skillActive && (player.attackCastTimer || 0) > 0;

  if (skillActive) drawWhirlwind(this, context, player, false);
  const result = previousDrawPlayer.call(this, context, player);
  if (skillActive) drawWhirlwind(this, context, player, true);
  else if (attackActive) drawAttack(this, context, player);
  return result;
};

const previousDrawEffect = prototype.drawEffect;
prototype.drawEffect = function drawEffectV0563(context, effect) {
  if (OLD_EFFECT_TYPES.has(effect?.type)) return;
  return previousDrawEffect.call(this, context, effect);
};

window.CHERRIFT_V0563 = {
  version: VERSION,
  skin: SKIN_ID,
  sheets: SHEETS,
  sourceOverVfx: true,
  compositeGridFixed: true,
  splitRgbaVfx: true,
  removesOldWarriorPlaceholders: true,
  loadWarriorVfx
};

console.info("[CHERRIFT] v0.6.3 Warrior composite VFX loaded.");
})();
