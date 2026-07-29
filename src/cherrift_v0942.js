(() => {
"use strict";

const VERSION = "0.9.3.4.2-sharp-ground-texture-hotfix";
const CACHE_VERSION = "09342";

if (!window.CherriftGame) {
  console.error("[CHERRIFT v0.9.3.4.2] CherriftGame is missing.");
  return;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const proto = CherriftGame.prototype;
const previousDrawGround = proto.drawGround;

/*
 * Keep the corrected logical texture size from v0.9.3.4.1, but do not bake
 * the large source PNG into a tiny blurry canvas first. Modern browsers can
 * scale a CanvasPattern directly from the original full-resolution image,
 * producing one resampling pass instead of two.
 */
const GROUND_SCALE = Object.freeze({
  0:.23,
  1:.22,
  2:.22,
  3:.23,
  4:.23
});
const GROUND_TILE_MIN = 112;
const GROUND_TILE_MAX = 240;
const WORLD_FALLBACK = Object.freeze({
  0:"#342640",
  1:"#4c9b50",
  2:"#14222a",
  3:"#b38b42",
  4:"#a33e2d"
});

function targetMetrics(image, world) {
  const sourceWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 1);
  const sourceHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  const longestSide = Math.max(sourceWidth, sourceHeight);
  const requestedLongest = Math.round(longestSide * (GROUND_SCALE[world] || .22));
  const targetLongest = clamp(requestedLongest, GROUND_TILE_MIN, GROUND_TILE_MAX);
  const scale = targetLongest / longestSide;
  return {
    sourceWidth,
    sourceHeight,
    scale,
    width:Math.max(1, Math.round(sourceWidth * scale)),
    height:Math.max(1, Math.round(sourceHeight * scale))
  };
}

function sharpenCanvas(canvas, amount=.58) {
  const context = canvas.getContext("2d", {willReadFrequently:true});
  if (!context || canvas.width < 3 || canvas.height < 3) return canvas;
  try {
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const source = new Uint8ClampedArray(image.data);
    const data = image.data;
    const width = canvas.width;
    const height = canvas.height;
    const stride = width * 4;

    for (let y=1; y<height-1; y++) {
      for (let x=1; x<width-1; x++) {
        const index = y * stride + x * 4;
        for (let channel=0; channel<3; channel++) {
          const center = source[index + channel];
          const blur = (
            center * 4 +
            source[index - 4 + channel] +
            source[index + 4 + channel] +
            source[index - stride + channel] +
            source[index + stride + channel]
          ) / 8;
          const sharpened = center + (center - blur) * amount;
          data[index + channel] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
    }
    context.putImageData(image, 0, 0);
  } catch (error) {
    console.warn("[CHERRIFT v0.9.3.4.2] Ground sharpening fallback skipped:", error);
  }
  return canvas;
}

/* Fallback for old browsers without CanvasPattern.setTransform(). */
function buildFallbackTile(image, metrics) {
  let source = image;
  let width = metrics.sourceWidth;
  let height = metrics.sourceHeight;

  while (Math.max(width, height) > Math.max(metrics.width, metrics.height) * 1.9) {
    const nextWidth = Math.max(metrics.width, Math.round(width * .5));
    const nextHeight = Math.max(metrics.height, Math.round(height * .5));
    const step = document.createElement("canvas");
    step.width = nextWidth;
    step.height = nextHeight;
    const stepContext = step.getContext("2d");
    if (!stepContext) break;
    stepContext.imageSmoothingEnabled = true;
    stepContext.imageSmoothingQuality = "high";
    stepContext.drawImage(source, 0, 0, nextWidth, nextHeight);
    source = step;
    width = nextWidth;
    height = nextHeight;
  }

  const tile = document.createElement("canvas");
  tile.width = metrics.width;
  tile.height = metrics.height;
  const context = tile.getContext("2d");
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, metrics.width, metrics.height);
  return sharpenCanvas(tile);
}

function buildPattern(context, image, world) {
  const metrics = targetMetrics(image, world);
  let pattern = context.createPattern(image, "repeat");

  if (pattern && typeof pattern.setTransform === "function") {
    try {
      const matrix = typeof DOMMatrix === "function"
        ? new DOMMatrix([metrics.scale, 0, 0, metrics.scale, 0, 0])
        : {a:metrics.scale, b:0, c:0, d:metrics.scale, e:0, f:0};
      pattern.setTransform(matrix);
      return {...metrics, pattern, direct:true};
    } catch (error) {
      console.warn("[CHERRIFT v0.9.3.4.2] Direct pattern scaling unavailable; using sharpened fallback.", error);
    }
  }

  const tile = buildFallbackTile(image, metrics);
  pattern = tile ? context.createPattern(tile, "repeat") : null;
  return pattern ? {...metrics, pattern, direct:false} : null;
}

proto.drawGround = function drawGroundV0942(context, zoom=1) {
  const stage = this.stage || this.getSelectedStage?.();
  const world = Number(stage?.world);
  if (!(world >= 0 && world <= 4)) return previousDrawGround.call(this, context, zoom);

  const key = `w${world}_ground`;
  const image = this.assets?.get?.(key);
  const viewWidth = this.w / zoom;
  const viewHeight = this.h / zoom;
  const padding = 256;
  const x = this.camera.x - viewWidth / 2 - padding;
  const y = this.camera.y - viewHeight / 2 - padding;
  const width = viewWidth + padding * 2;
  const height = viewHeight + padding * 2;

  if (!image) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x, y, width, height);
    return;
  }

  this.__v0942GroundPatternCache ||= new Map();
  const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const cacheKey = `${key}:${sourceWidth}x${sourceHeight}:${CACHE_VERSION}`;
  let cached = this.__v0942GroundPatternCache.get(cacheKey);
  if (!cached) {
    cached = buildPattern(context, image, world);
    if (cached) this.__v0942GroundPatternCache.set(cacheKey, cached);
  }

  if (!cached?.pattern) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x, y, width, height);
    return;
  }

  context.save();
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  if ("filter" in context) context.filter = "contrast(1.07) saturate(1.025)";
  context.fillStyle = cached.pattern;
  context.fillRect(x, y, width, height);
  context.restore();
};

window.CHERRIFT_V0942 = Object.freeze({
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  groundScale:GROUND_SCALE
});
console.info("[CHERRIFT] v0.9.3.4.2 sharp full-resolution ground textures loaded.");
})();
