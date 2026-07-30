(() => {
"use strict";

const VERSION = "0.5.6.2-warrior-png-vfx";
const SKIN_ID = "warrior_cherry";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;
const ATTACK_FRAMES = 6;
const WHIRLWIND_FRAMES = 8;

if (
  !window.CherriftGame ||
  !window.CHERRIFT_V0561 ||
  !window.CHERRIFT_CONFIG
) {
  console.error("[CHERRIFT v0.5.6.2] v0.5.6.1 is required.");
  return;
}

const config = CHERRIFT_CONFIG.player.skins[SKIN_ID];
if (!config) {
  console.error("[CHERRIFT v0.5.6.2] Warrior Cherry config is missing.");
  return;
}

config.vfx = {
  attackFrames: ATTACK_FRAMES,
  attackSize: 252,
  attackCenterOffset: 52,
  attackVerticalOffset: -22,
  attackAlpha: 0.96,
  whirlwindFrames: WHIRLWIND_FRAMES,
  whirlwindSize: 390,
  whirlwindVerticalOffset: -24,
  whirlwindBackAlpha: 0.93,
  whirlwindFrontAlpha: 0.78
};

function vfxPath(kind, layer, direction) {
  const root = "assets/player/skins/warrior_cherry/vfx";
  if (kind === "attack") {
    return `${root}/attack/warrior_cherry_attack_${direction}.png?v=0562`;
  }
  return `${root}/whirlwind/${layer}/warrior_whirlwind_${layer}_${direction}.png?v=0562`;
}

function assetKey(kind, layer, direction) {
  if (kind === "attack") return `warrior_vfx_attack_${direction}`;
  return `warrior_vfx_whirlwind_${layer}_${direction}`;
}

async function loadWarriorVfx(game) {
  if (!game?.assets || game.__warriorVfxLoaded) return;
  if (game.__warriorVfxLoading) {
    await game.__warriorVfxLoading;
    return;
  }

  const jobs = [];
  for (const direction of DIRECTIONS) {
    jobs.push(
      game.assets.loadImage(
        assetKey("attack", null, direction),
        vfxPath("attack", null, direction)
      )
    );
    jobs.push(
      game.assets.loadImage(
        assetKey("whirlwind", "back", direction),
        vfxPath("whirlwind", "back", direction)
      )
    );
    jobs.push(
      game.assets.loadImage(
        assetKey("whirlwind", "front", direction),
        vfxPath("whirlwind", "front", direction)
      )
    );
  }

  game.__warriorVfxLoading = Promise.all(jobs).then(results => {
    game.__warriorVfxLoaded = results.every(Boolean);
    if (!game.__warriorVfxLoaded) {
      console.warn("[CHERRIFT v0.5.6.2] One or more Warrior VFX images failed to load.");
    }
  }).finally(() => {
    game.__warriorVfxLoading = null;
  });

  await game.__warriorVfxLoading;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function animationFrame(timer, duration, frameCount) {
  const safeDuration = Math.max(0.001, Number(duration) || 0.4);
  const progress = clamp(1 - Math.max(0, Number(timer) || 0) / safeDuration, 0, 0.999999);
  return Math.min(frameCount - 1, Math.floor(progress * frameCount));
}

function directionVector(direction) {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function drawSheetFrame(
  game,
  context,
  key,
  frame,
  frameCount,
  centerX,
  centerY,
  size,
  alpha
) {
  const image = game.assets.get(key);
  if (!image) return false;

  const realFrameCount = Math.max(1, Math.floor(image.width / FRAME_SIZE));
  const safeFrameCount = Math.max(1, Math.min(frameCount, realFrameCount));
  const safeFrame = Math.min(safeFrameCount - 1, Math.max(0, frame));

  context.save();
  context.globalAlpha = clamp(alpha, 0, 1);
  context.globalCompositeOperation = "screen";
  context.drawImage(
    image,
    safeFrame * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    Math.round(centerX - size / 2),
    Math.round(centerY - size / 2),
    size,
    size
  );
  context.restore();
  return true;
}

function drawAttackVfx(game, context, player) {
  const direction = player.attackDir || player.lastDir || "down";
  const vector = directionVector(direction);
  const duration = player.attackCastDuration || config.states?.attack?.duration || 0.34;
  const frame = animationFrame(player.attackCastTimer, duration, ATTACK_FRAMES);
  const vfx = config.vfx;

  const centerX = player.x + vector.x * vfx.attackCenterOffset;
  const centerY =
    player.y + vfx.attackVerticalOffset +
    vector.y * vfx.attackCenterOffset * 0.78;

  return drawSheetFrame(
    game,
    context,
    assetKey("attack", null, direction),
    frame,
    ATTACK_FRAMES,
    centerX,
    centerY,
    vfx.attackSize,
    vfx.attackAlpha
  );
}

function drawWhirlwindLayer(game, context, player, layer) {
  const direction = player.skillDir || player.lastDir || "down";
  const duration = player.skillCastDuration || config.whirlwindDuration || 0.72;
  const frame = animationFrame(player.skillCastTimer, duration, WHIRLWIND_FRAMES);
  const vfx = config.vfx;
  const alpha = layer === "back"
    ? vfx.whirlwindBackAlpha
    : vfx.whirlwindFrontAlpha;

  return drawSheetFrame(
    game,
    context,
    assetKey("whirlwind", layer, direction),
    frame,
    WHIRLWIND_FRAMES,
    player.x,
    player.y + vfx.whirlwindVerticalOffset,
    vfx.whirlwindSize,
    alpha
  );
}

const prototype = CherriftGame.prototype;

const previousStart = prototype.start;
prototype.start = async function startV0562(...args) {
  if (this.save?.selectedSkin === SKIN_ID) {
    await loadWarriorVfx(this);
  }
  return previousStart.apply(this, args);
};

const previousDrawPlayer = prototype.drawPlayer;
prototype.drawPlayer = function drawPlayerV0562(context, player) {
  if (!player || player.skin !== SKIN_ID) {
    return previousDrawPlayer.call(this, context, player);
  }

  const skillActive = (player.skillCastTimer || 0) > 0;
  const attackActive = !skillActive && (player.attackCastTimer || 0) > 0;

  // Correct layer order: back VFX -> Cherry -> front VFX.
  if (skillActive) drawWhirlwindLayer(this, context, player, "back");

  const result = previousDrawPlayer.call(this, context, player);

  if (skillActive) {
    drawWhirlwindLayer(this, context, player, "front");
  } else if (attackActive) {
    drawAttackVfx(this, context, player);
  }

  return result;
};

// Disable the old blue Canvas placeholder arcs from v0.5.5.7.
const previousDrawEffect = prototype.drawEffect;
prototype.drawEffect = function drawEffectV0562(context, effect) {
  if (
    effect?.type === "warrior_slash" ||
    effect?.type === "whirlwind_start" ||
    effect?.type === "whirlwind_tick"
  ) {
    return;
  }
  return previousDrawEffect.call(this, context, effect);
};

window.CHERRIFT_V0562 = {
  version: VERSION,
  skin: SKIN_ID,
  attackVfx: true,
  layeredWhirlwindVfx: true
};

console.info("[CHERRIFT] v0.5.6.2 Warrior layered PNG VFX loaded.");
})();
