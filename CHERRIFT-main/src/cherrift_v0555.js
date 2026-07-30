(() => {
"use strict";

const VERSION = "0.5.5.5-ninja-left-walk-mirror";
const FRAME_W = 192;
const FRAME_H = 192;
const alphaCache = new WeakMap();

if (!window.CherriftGame || !window.CHERRIFT_V0554) {
  console.error("[CHERRIFT v0.5.5.5] v0.5.5.4 is required.");
  return;
}

function frameBounds(image, frameCount) {
  const cached = alphaCache.get(image);
  if (cached && cached.frameCount === frameCount) return cached.bounds;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const sourceWidth = image.width / frameCount;
  const bounds = [];

  for (let frame = 0; frame < frameCount; frame++) {
    const startX = Math.floor(frame * sourceWidth);
    const endX = Math.floor((frame + 1) * sourceWidth);

    let minX = sourceWidth;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < image.height; y++) {
      for (let x = startX; x < endX; x++) {
        const alpha = pixels[(y * image.width + x) * 4 + 3];
        if (alpha < 8) continue;

        const localX = x - startX;
        minX = Math.min(minX, localX);
        maxX = Math.max(maxX, localX);
        maxY = Math.max(maxY, y);
      }
    }

    bounds.push(maxX < 0
      ? { centerX: sourceWidth / 2, bottom: image.height - 8 }
      : { centerX: (minX + maxX) / 2, bottom: maxY }
    );
  }

  alphaCache.set(image, { frameCount, bounds });
  return bounds;
}

function drawMirroredRightWalk(game, context, player, image, state) {
  const frameCount = Math.max(
    1,
    Math.min(
      state.frames || 6,
      Math.floor(image.width / FRAME_W) || 1
    )
  );

  const sourceWidth = image.width / frameCount;
  const sourceHeight = image.height;
  const frame = Math.floor(game.t * (state.fps || 8)) % frameCount;
  const bounds = frameBounds(image, frameCount)[frame];

  const playerConfig = CHERRIFT_CONFIG.player;
  const displayWidth = playerConfig.displayWidth || 116;
  const displayHeight = playerConfig.displayHeight || 116;

  const scaleX = displayWidth / sourceWidth;
  const scaleY = displayHeight / sourceHeight;

  /*
   * Because the source is mirrored, its visual center offset must also be
   * mirrored. The feet remain anchored to the same world-space point.
   */
  const sourceCenterOffset = bounds.centerX - sourceWidth / 2;
  const mirroredCenterOffset = -sourceCenterOffset * scaleX;
  const bottomOffset = (sourceHeight - bounds.bottom) * scaleY;

  const drawX = Math.round(player.x - displayWidth / 2 - mirroredCenterOffset);
  const drawY = Math.round(player.y - displayHeight + 34 + bottomOffset);

  context.save();
  context.translate(drawX + displayWidth, 0);
  context.scale(-1, 1);

  context.drawImage(
    image,
    frame * sourceWidth,
    0,
    sourceWidth,
    sourceHeight,
    0,
    drawY,
    displayWidth,
    displayHeight
  );

  context.restore();
}

const previousDrawPlayer = CherriftGame.prototype.drawPlayer;

CherriftGame.prototype.drawPlayer = function drawPlayerV0555(context, player) {
  const shouldMirror =
    player?.skin === "ninja_cherry" &&
    player.moving &&
    (player.lastDir || "down") === "left" &&
    !(player.skillCastTimer > 0) &&
    !(player.attackCastTimer > 0);

  if (!shouldMirror) {
    return previousDrawPlayer.call(this, context, player);
  }

  const skin = this.activeSkinConfig();
  const state = skin?.states?.walk;
  const rightWalkImage = this.assets.get("player_ninja_cherry_walk_right");

  if (!state || !rightWalkImage) {
    return previousDrawPlayer.call(this, context, player);
  }

  drawMirroredRightWalk(this, context, player, rightWalkImage, state);
};

window.CHERRIFT_V0555 = {
  version: VERSION,
  mirroredState: "ninja_cherry walk left",
  sourceState: "ninja_cherry walk right"
};

console.info("[CHERRIFT] v0.5.5.5 Ninja left walk mirror loaded.");
})();