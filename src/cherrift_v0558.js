(() => {
"use strict";

const VERSION = "0.5.5.8-base-cherry-remake";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;

if (
  !window.CherriftGame ||
  !window.CHERRIFT_V0557 ||
  !window.CHERRIFT_CONFIG ||
  !window.CHERRIFT_DATA
) {
  console.error("[CHERRIFT v0.5.5.8] v0.5.5.7 is required.");
  return;
}

function makeDirections(stateName) {
  return Object.fromEntries(
    DIRECTIONS.map(direction => [
      direction,
      `assets/player/skins/base_cherry/base_cherry_${stateName}_${direction}.png?v=0558`
    ])
  );
}

const baseCherry = CHERRIFT_CONFIG.player.skins.cherry_default;

Object.assign(baseCherry, {
  id: "cherry_default",
  folder: "base_cherry",
  attackType: "ranged",
  skillType: "dash",
  dashSpeed: 760,
  dashDuration: 0.34,
  dashDamageRadius: 105,
  dashDamageMult: 1.3,
  states: {
    idle: {
      fps: 3,
      frames: 4,
      dirs: makeDirections("idle")
    },
    walk: {
      fps: 8,
      frames: 6,
      dirs: makeDirections("walk")
    },
    attack: {
      fps: 16,
      frames: 6,
      duration: 0.375,
      dirs: makeDirections("ranged")
    },
    skill: {
      fps: 18,
      frames: 6,
      duration: 0.34,
      dirs: makeDirections("dash")
    }
  }
});

const baseData = CHERRIFT_DATA.skins.find(skin => skin.id === "cherry_default");
if (baseData) {
  Object.assign(baseData, {
    name: "Base Cherry",
    weapon: "Pink Bloom Orb",
    skill: "Bloom Dash",
    desc: "Az alap Cherry skin. Ranged Bloom Orb támadás és gyors Bloom Dash skill.",
    splash: "assets/player/skins/base_cherry/base_cherry_splashart.png?v=0558",
    icon: "assets/player/skins/base_cherry/base_cherry_icon.png?v=0558"
  });
}

function directionToTarget(player, target) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;

  return Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "left" : "right")
    : (dy < 0 ? "up" : "down");
}

function drawAttackState(game, context, player) {
  const skin = game.activeSkinConfig();
  const state = skin?.states?.attack;
  const direction = player.attackDir || player.lastDir || "down";
  const image = game.assets.get(
    `player_${player.skin}_attack_${direction}`
  );

  if (!state || !image) return false;

  const realFrameCount = Math.max(
    1,
    Math.floor(image.width / FRAME_SIZE)
  );
  const frameCount = Math.max(
    1,
    Math.min(state.frames || realFrameCount, realFrameCount)
  );

  const elapsed = Math.max(
    0,
    (player.attackCastDuration || state.duration || 0.375) -
      (player.attackCastTimer || 0)
  );

  const frame = Math.min(
    frameCount - 1,
    Math.floor(elapsed * (state.fps || 16))
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

const previousAutoFire = prototype.autoFire;
prototype.autoFire = function autoFireV0558() {
  const player = this.player;

  if (!player || player.skin !== "cherry_default") {
    return previousAutoFire.call(this);
  }

  const previousTimer = player.fireTimer;
  const target = previousTimer <= 0 ? this.nearest() : null;
  const result = previousAutoFire.call(this);

  const fired =
    previousTimer <= 0 &&
    player.fireTimer > 0 &&
    target;

  if (fired) {
    player.attackDir = directionToTarget(player, target);
    player.lastDir = player.attackDir;
    player.attackCastDuration =
      this.activeSkinConfig().states.attack.duration || 0.375;
    player.attackCastTimer = player.attackCastDuration;
  }

  return result;
};

const previousDrawPlayer = prototype.drawPlayer;
prototype.drawPlayer = function drawPlayerV0558(context, player) {
  const baseAttackActive =
    player?.skin === "cherry_default" &&
    (player.attackCastTimer || 0) > 0 &&
    !(player.skillCastTimer > 0);

  if (
    baseAttackActive &&
    drawAttackState(this, context, player)
  ) {
    return;
  }

  return previousDrawPlayer.call(this, context, player);
};

window.CHERRIFT_V0558 = {
  version: VERSION,
  skin: "cherry_default",
  states: {
    idle: "base_cherry_idle_*",
    walk: "base_cherry_walk_*",
    attack: "base_cherry_ranged_*",
    skill: "base_cherry_dash_*"
  }
};

console.info(
  "[CHERRIFT] v0.5.5.8 new Base Cherry sprite set loaded."
);
})();