(() => {
"use strict";

const VERSION = "0.5.5.9-base-dash-ui-revert";
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 192;

if (!window.CherriftGame || !window.CHERRIFT_V0558) {
  console.error("[CHERRIFT v0.5.5.9] v0.5.5.8 is required.");
  return;
}

/*
 * Force the replacement v0557.css to load instead of a cached copy of the
 * removed image-based UI theme.
 */
function restoreClassicUi() {
  document.body.classList.remove("ui-assets-v0557");

  const stylesheet = document.getElementById("v0557css");
  if (stylesheet) {
    stylesheet.href = "v0557.css?v=0559-classic-reset";
  }

  /*
   * These backgrounds were supplied only by the removed stylesheet.
   * Clearing inline remnants keeps the old CSS UI authoritative.
   * The main menu background and skin artwork are intentionally untouched.
   */
  document.documentElement.classList.add("classic-ui-v0559");
}

restoreClassicUi();

/* ---------- Reliable Base Cherry dash rendering ---------- */

const dashImages = {};
const idleImages = {};

function preloadImage(path) {
  const image = new Image();
  image.decoding = "async";
  image.src = path;
  return image;
}

for (const direction of DIRECTIONS) {
  dashImages[direction] = preloadImage(
    `assets/player/skins/base_cherry/base_cherry_dash_${direction}.png?v=0559`
  );
  idleImages[direction] = preloadImage(
    `assets/player/skins/base_cherry/base_cherry_idle_${direction}.png?v=0559`
  );
}

/* Keep config and asset loader keys synchronized with the new canonical files. */
const baseCherry = CHERRIFT_CONFIG.player.skins.cherry_default;
if (baseCherry?.states?.skill) {
  baseCherry.states.skill.frames = 6;
  baseCherry.states.skill.fps = 18;
  baseCherry.states.skill.duration = 0.34;
  baseCherry.states.skill.dirs = Object.fromEntries(
    DIRECTIONS.map(direction => [
      direction,
      `assets/player/skins/base_cherry/base_cherry_dash_${direction}.png?v=0559`
    ])
  );
}

function canDraw(image) {
  return Boolean(
    image &&
    image.complete &&
    image.naturalWidth >= FRAME_SIZE &&
    image.naturalHeight >= FRAME_SIZE
  );
}

function drawSheetFrame(context, player, image, frame, frameCount) {
  const sourceWidth = image.naturalWidth / frameCount;
  const sourceHeight = image.naturalHeight;

  const displayWidth = CHERRIFT_CONFIG.player.displayWidth || 116;
  const displayHeight = CHERRIFT_CONFIG.player.displayHeight || 116;

  context.drawImage(
    image,
    frame * sourceWidth,
    0,
    sourceWidth,
    sourceHeight,
    Math.round(player.x - displayWidth / 2),
    Math.round(player.y - displayHeight + 34),
    displayWidth,
    displayHeight
  );
}

function drawBaseDash(game, context, player) {
  const direction = player.skillDir || player.lastDir || "down";
  const image = dashImages[direction];

  if (!canDraw(image)) return false;

  const state = game.activeSkinConfig()?.states?.skill;
  const frameCount = 6;
  const duration =
    player.skillCastDuration ||
    state?.duration ||
    game.activeSkinConfig()?.dashDuration ||
    0.34;

  /*
   * skillCastTimer is the main animation clock. dashTimer is used as a
   * secondary clock so the character cannot fall back while still dashing.
   */
  const remaining = Math.max(
    player.skillCastTimer || 0,
    player.dashTimer || 0
  );
  const elapsed = Math.max(0, duration - Math.min(duration, remaining));
  const frame = Math.min(
    frameCount - 1,
    Math.floor(elapsed * (state?.fps || 18))
  );

  drawSheetFrame(context, player, image, frame, frameCount);
  return true;
}

function drawSafeBaseIdle(game, context, player) {
  const direction = player.lastDir || "down";
  const image = idleImages[direction];

  if (!canDraw(image)) return false;

  const frameCount = 4;
  const frame = Math.floor((game.t || 0) * 3) % frameCount;
  drawSheetFrame(context, player, image, frame, frameCount);
  return true;
}

const prototype = CherriftGame.prototype;
const previousDrawPlayer = prototype.drawPlayer;

prototype.drawPlayer = function drawPlayerV0559(context, player) {
  const baseDashActive =
    player?.skin === "cherry_default" &&
    (
      (player.skillCastTimer || 0) > 0 ||
      (player.dashTimer || 0) > 0
    );

  if (!baseDashActive) {
    return previousDrawPlayer.call(this, context, player);
  }

  /*
   * Never allow the original pink fallback orb during the Base Cherry dash.
   * Use the real dash sheet, or the real idle sheet while it finishes loading.
   */
  if (drawBaseDash(this, context, player)) return;
  if (drawSafeBaseIdle(this, context, player)) return;

  /*
   * On an extremely early frame where neither image has decoded yet, skip the
   * character for that frame rather than drawing the old fallback orb.
   */
};

window.CHERRIFT_V0559 = {
  version: VERSION,
  classicUiRestored: true,
  assetsUiEnabled: false,
  baseDashFallbackOrbDisabled: true
};

console.info(
  "[CHERRIFT] v0.5.5.9 Base Cherry dash fix + classic UI restored."
);
})();