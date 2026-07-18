(() => {
"use strict";

const VERSION = "0.5.6.3-warrior-vfx-visibility-fix";
const SKIN_ID = "warrior_cherry";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;
const ATTACK_FRAMES = 6;
const WHIRLWIND_FRAMES = 8;
const OLD_EFFECT_TYPES = new Set([
  "warrior_slash",
  "whirlwind_start",
  "whirlwind_tick"
]);

if (
  !window.CherriftGame ||
  !window.CHERRIFT_V0561 ||
  !window.CHERRIFT_CONFIG
) {
  console.error("[CHERRIFT v0.5.6.3] v0.5.6.1 is required.");
  return;
}

const config = CHERRIFT_CONFIG.player.skins[SKIN_ID];
if (!config) {
  console.error("[CHERRIFT v0.5.6.3] Warrior Cherry config is missing.");
  return;
}

config.vfx = {
  attackFrames: ATTACK_FRAMES,
  attackSize: 278,
  attackCenterOffset: 52,
  attackVerticalOffset: -27,
  attackAlpha: 1,

  whirlwindFrames: WHIRLWIND_FRAMES,
  whirlwindSize: 356,
  whirlwindVerticalOffset: -23,
  whirlwindBackAlpha: 1,
  whirlwindFrontAlpha: 0.96
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function directionVector(direction) {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function animationFrame(timer, duration, frameCount) {
  const safeDuration = Math.max(0.001, Number(duration) || 0.4);
  const progress = clamp(
    1 - Math.max(0, Number(timer) || 0) / safeDuration,
    0,
    0.999999
  );
  return Math.min(
    frameCount - 1,
    Math.floor(progress * frameCount)
  );
}

function vfxPath(kind, layer, direction) {
  const root = "assets/player/skins/warrior_cherry/vfx";
  if (kind === "attack") {
    return `${root}/attack/warrior_cherry_attack_${direction}.png?v=0563`;
  }
  return `${root}/whirlwind/${layer}/warrior_whirlwind_${layer}_${direction}.png?v=0563`;
}

function assetKey(kind, layer, direction) {
  if (kind === "attack") {
    return `warrior_v0563_attack_${direction}`;
  }
  return `warrior_v0563_whirlwind_${layer}_${direction}`;
}

async function loadWarriorVfx(game) {
  if (!game?.assets || game.__warriorV0563Loaded) return;

  if (game.__warriorV0563Loading) {
    await game.__warriorV0563Loading;
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

    for (const layer of ["back", "front"]) {
      jobs.push(
        game.assets.loadImage(
          assetKey("whirlwind", layer, direction),
          vfxPath("whirlwind", layer, direction)
        )
      );
    }
  }

  game.__warriorV0563Loading = Promise.all(jobs)
    .then(results => {
      game.__warriorV0563Loaded = results.every(Boolean);
      if (!game.__warriorV0563Loaded) {
        console.error(
          "[CHERRIFT v0.5.6.3] Warrior VFX PNG loading failed. " +
          "Check assets/player/skins/warrior_cherry/vfx."
        );
      }
    })
    .finally(() => {
      game.__warriorV0563Loading = null;
    });

  await game.__warriorV0563Loading;
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

  const realFrameCount = Math.max(
    1,
    Math.floor(image.width / FRAME_SIZE)
  );
  const safeFrameCount = Math.max(
    1,
    Math.min(frameCount, realFrameCount)
  );
  const safeFrame = Math.min(
    safeFrameCount - 1,
    Math.max(0, frame)
  );

  context.save();

  // Important: do NOT use "screen" on the bright grass texture.
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = clamp(alpha, 0, 1);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

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
  const direction =
    player.attackDir ||
    player.lastDir ||
    "down";

  const vector = directionVector(direction);
  const duration =
    player.attackCastDuration ||
    config.states?.attack?.duration ||
    0.34;

  const frame = animationFrame(
    player.attackCastTimer,
    duration,
    ATTACK_FRAMES
  );

  const settings = config.vfx;

  return drawSheetFrame(
    game,
    context,
    assetKey("attack", null, direction),
    frame,
    ATTACK_FRAMES,
    player.x + vector.x * settings.attackCenterOffset,
    player.y +
      settings.attackVerticalOffset +
      vector.y * settings.attackCenterOffset * 0.72,
    settings.attackSize,
    settings.attackAlpha
  );
}

function drawWhirlwindLayer(
  game,
  context,
  player,
  layer
) {
  const direction =
    player.skillDir ||
    player.lastDir ||
    "down";

  const duration =
    player.skillCastDuration ||
    config.whirlwindDuration ||
    0.72;

  const frame = animationFrame(
    player.skillCastTimer,
    duration,
    WHIRLWIND_FRAMES
  );

  const settings = config.vfx;

  return drawSheetFrame(
    game,
    context,
    assetKey("whirlwind", layer, direction),
    frame,
    WHIRLWIND_FRAMES,
    player.x,
    player.y + settings.whirlwindVerticalOffset,
    settings.whirlwindSize,
    layer === "back"
      ? settings.whirlwindBackAlpha
      : settings.whirlwindFrontAlpha
  );
}

const prototype = CherriftGame.prototype;

const previousStart = prototype.start;
prototype.start = async function startV0563(...args) {
  const result = await previousStart.apply(this, args);

  if (this.player?.skin === SKIN_ID) {
    await loadWarriorVfx(this);
  }

  return result;
};

// Force-remove the old v0557 Warrior Canvas placeholder objects.
const previousUpdate = prototype.update;
prototype.update = function updateV0563(dt) {
  const result = previousUpdate.call(this, dt);

  if (this.player?.skin === SKIN_ID && Array.isArray(this.effects)) {
    this.effects = this.effects.filter(
      effect => !OLD_EFFECT_TYPES.has(effect?.type)
    );
  }

  return result;
};

const previousDrawPlayer = prototype.drawPlayer;
prototype.drawPlayer = function drawPlayerV0563(
  context,
  player
) {
  if (!player || player.skin !== SKIN_ID) {
    return previousDrawPlayer.call(this, context, player);
  }

  const skillActive =
    (player.skillCastTimer || 0) > 0;
  const attackActive =
    !skillActive &&
    (player.attackCastTimer || 0) > 0;

  // Correct render order:
  // 1. full Whirlwind behind Cherry
  // 2. Cherry's own animation
  // 3. lower foreground slash
  if (skillActive) {
    drawWhirlwindLayer(
      this,
      context,
      player,
      "back"
    );
  }

  const result = previousDrawPlayer.call(
    this,
    context,
    player
  );

  if (skillActive) {
    drawWhirlwindLayer(
      this,
      context,
      player,
      "front"
    );
  } else if (attackActive) {
    drawAttackVfx(
      this,
      context,
      player
    );
  }

  return result;
};

// Extra safety: never draw the obsolete Warrior placeholder arcs.
const previousDrawEffect = prototype.drawEffect;
prototype.drawEffect = function drawEffectV0563(
  context,
  effect
) {
  if (OLD_EFFECT_TYPES.has(effect?.type)) {
    return;
  }

  return previousDrawEffect.call(
    this,
    context,
    effect
  );
};

window.CHERRIFT_V0563 = {
  version: VERSION,
  skin: SKIN_ID,
  sourceOverVfx: true,
  removesOldWarriorPlaceholders: true,
  layeredWhirlwind: true
};

console.info(
  "[CHERRIFT] v0.5.6.3 Warrior VFX visibility fix loaded."
);
})();
