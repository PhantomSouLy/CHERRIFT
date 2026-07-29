(() => {
"use strict";

const VERSION = "0.9.3.4.3-native-512-ground-hotfix";
const CACHE_VERSION = "09343";
const LOGICAL_TILE_SIZE = 256;

if (!window.CherriftGame) {
  console.error("[CHERRIFT v0.9.3.4.3] CherriftGame is missing.");
  return;
}

const GROUND_PATHS = Object.freeze({
  0:"assets/map/training_teszt.png",
  1:"assets/map/world1/world1_ground_1.png",
  2:"assets/map/world2/world2_ground_1.png",
  3:"assets/map/world3/world3_ground_1.png",
  4:"assets/map/world4/world4_ground_1.png"
});

const WORLD_FALLBACK = Object.freeze({
  0:"#342640",
  1:"#4c9b50",
  2:"#14222a",
  3:"#b38b42",
  4:"#a33e2d"
});

const proto = CherriftGame.prototype;

function selectedStage(game) {
  return game.stage || game.getSelectedStage?.() ||
    window.CHERRIFT_V040?.stages?.find?.(stage => stage.id === game.save?.selectedStageId) || null;
}

async function reloadGroundAsset(game, world) {
  const path = GROUND_PATHS[world];
  if (!path || !game?.assets?.loadImage) return false;
  try {
    // The query is intentionally new: the PNG files were replaced in-place
    // with 512x512 game-ready versions, so old browser/CDN copies must not win.
    return await game.assets.loadImage(`w${world}_ground`, `${path}?v=${CACHE_VERSION}`);
  } catch (error) {
    console.warn(`[CHERRIFT v0.9.3.4.3] Ground reload failed for World ${world}:`, error);
    return false;
  }
}

const previousStart = proto.start;
proto.start = async function startV0943(...args) {
  const stage = selectedStage(this);
  const world = Number(stage?.world);
  if (world >= 0 && world <= 4) await reloadGroundAsset(this, world);

  this.__v094PatternCache?.clear?.();
  this.__v0942GroundPatternCache?.clear?.();
  this.__v0943GroundPatternCache = new Map();
  return previousStart.apply(this, args);
};

const previousDrawGround = proto.drawGround;

function buildNativePattern(context, image) {
  const sourceWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 1);
  const sourceHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  const pattern = context.createPattern(image, "repeat");
  if (!pattern) return null;

  // The new files are 512x512. Rendering them as 256 world pixels keeps
  // roughly two source pixels per world/CSS pixel, which stays crisp on
  // high-DPI phones while preserving the corrected ground-detail scale.
  const scaleX = LOGICAL_TILE_SIZE / sourceWidth;
  const scaleY = LOGICAL_TILE_SIZE / sourceHeight;

  if (typeof pattern.setTransform === "function") {
    try {
      const matrix = typeof DOMMatrix === "function"
        ? new DOMMatrix([scaleX, 0, 0, scaleY, 0, 0])
        : {a:scaleX, b:0, c:0, d:scaleY, e:0, f:0};
      pattern.setTransform(matrix);
      return {pattern, sourceWidth, sourceHeight, scaleX, scaleY, direct:true};
    } catch (error) {
      console.warn("[CHERRIFT v0.9.3.4.3] Pattern transform fallback:", error);
    }
  }

  // Older browser fallback: one moderate 512 -> 256 resize only.
  const tile = document.createElement("canvas");
  tile.width = LOGICAL_TILE_SIZE;
  tile.height = LOGICAL_TILE_SIZE;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return null;
  tileContext.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in tileContext) tileContext.imageSmoothingQuality = "high";
  tileContext.drawImage(image, 0, 0, LOGICAL_TILE_SIZE, LOGICAL_TILE_SIZE);
  const fallbackPattern = context.createPattern(tile, "repeat");
  return fallbackPattern
    ? {pattern:fallbackPattern, sourceWidth, sourceHeight, scaleX, scaleY, direct:false}
    : null;
}

proto.drawGround = function drawGroundV0943(context, zoom=1) {
  const stage = selectedStage(this);
  const world = Number(stage?.world);
  if (!(world >= 0 && world <= 4)) return previousDrawGround.call(this, context, zoom);

  const key = `w${world}_ground`;
  const image = this.assets?.get?.(key);
  const viewWidth = this.w / zoom;
  const viewHeight = this.h / zoom;
  const padding = LOGICAL_TILE_SIZE;
  const x = this.camera.x - viewWidth / 2 - padding;
  const y = this.camera.y - viewHeight / 2 - padding;
  const width = viewWidth + padding * 2;
  const height = viewHeight + padding * 2;

  if (!image) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x, y, width, height);
    return;
  }

  this.__v0943GroundPatternCache ||= new Map();
  const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const cacheKey = `${key}:${sourceWidth}x${sourceHeight}:${CACHE_VERSION}`;
  let cached = this.__v0943GroundPatternCache.get(cacheKey);
  if (!cached) {
    cached = buildNativePattern(context, image);
    if (cached) this.__v0943GroundPatternCache.set(cacheKey, cached);
  }

  if (!cached?.pattern) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x, y, width, height);
    return;
  }

  context.save();
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  if ("filter" in context) context.filter = "none";
  context.fillStyle = cached.pattern;
  context.fillRect(x, y, width, height);
  context.restore();
};

window.CHERRIFT_V0943 = Object.freeze({
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  logicalTileSize:LOGICAL_TILE_SIZE,
  groundPaths:GROUND_PATHS
});
console.info("[CHERRIFT] v0.9.3.4.3 native 512 ground tile hotfix loaded.");
})();
