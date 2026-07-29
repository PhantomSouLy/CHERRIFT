(() => {
"use strict";

const VERSION = "0.9.3.4.4-map-object-blend-performance-hotfix";
const CACHE_VERSION = "09344";
const LOGICAL_TILE_SIZE = 256;
const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

if (!window.CherriftGame || !window.UI) {
  console.error("[CHERRIFT v0.9.3.4.4] Required systems are missing.");
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

const BLENDABLE_ASSET = /(?:rock|log|tree|cactus|bones|mushroom|bush)/i;
const STRONG_BLEND_ASSET = /(?:rock|log|bones)/i;
const LIGHT_BLEND_ASSET = /(?:tree|cactus)/i;
const MOBILE_QUERY = "(max-width:820px)";
const proto = CherriftGame.prototype;

function currentStage(game) {
  return game?.stage || game?.getSelectedStage?.() ||
    window.CHERRIFT_V040?.stages?.find?.(stage => stage.id === game?.save?.selectedStageId) || null;
}

function stageForStart(game) {
  return game?.getSelectedStage?.() ||
    window.CHERRIFT_V040?.stages?.find?.(stage => stage.id === game?.save?.selectedStageId) ||
    game?.stage || null;
}

function worldNumber(game) {
  return Number(currentStage(game)?.world);
}

function isGameplayAssetKey(key) {
  return /^w[0-4]_/.test(String(key || ""));
}

function sourceOf(image) {
  return String(image?.currentSrc || image?.src || "");
}

function sanitizeGameplayLoader(game) {
  if (!game?.assets?.loadImage || game.assets.__v0944SafeLoader) return;
  game.assets.__v0944SafeLoader = true;
  const original = game.assets.loadImage.bind(game.assets);
  game.assets.loadImage = function loadImageV0944(key, src) {
    const source = String(src || "");
    if (isGameplayAssetKey(key) && /splashart/i.test(source)) {
      console.warn("[CHERRIFT v0.9.3.4.4] Blocked splash art from gameplay asset:", key, source);
      return Promise.resolve(false);
    }
    if (/^w[0-4]_ground$/.test(String(key)) && !/(?:_ground_1\.png|training_teszt\.png)/i.test(source)) {
      console.warn("[CHERRIFT v0.9.3.4.4] Blocked non-ground image from ground slot:", key, source);
      return Promise.resolve(false);
    }
    return original(key, src);
  };
}

function removeAccidentalSplashAssets(game) {
  const images = game?.assets?.images;
  if (!images) return;
  for (const [key, image] of Object.entries(images)) {
    if (isGameplayAssetKey(key) && /splashart/i.test(sourceOf(image))) images[key] = null;
  }
}

function releaseWorldSplashDom() {
  const elements = document.querySelectorAll(
    '[style*="assets/map"][style*="splashart"], img[src*="assets/map"][src*="splashart"]'
  );
  for (const element of elements) {
    if (element instanceof HTMLImageElement) {
      if (!element.dataset.v0944Source) element.dataset.v0944Source = element.getAttribute("src") || "";
      element.removeAttribute("srcset");
      element.src = EMPTY_PIXEL;
    } else {
      if (!element.dataset.v0944Background) element.dataset.v0944Background = element.style.backgroundImage || "";
      element.style.backgroundImage = "none";
    }
  }
}

function restoreWorldSplashDom() {
  document.querySelectorAll("[data-v0944-source]").forEach(element => {
    if (!(element instanceof HTMLImageElement)) return;
    const source = element.dataset.v0944Source;
    if (source) element.src = source;
    delete element.dataset.v0944Source;
  });
  document.querySelectorAll("[data-v0944-background]").forEach(element => {
    element.style.backgroundImage = element.dataset.v0944Background || "";
    delete element.dataset.v0944Background;
  });
}

function loadImageStrict(path) {
  return new Promise(resolve => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${path}?v=${CACHE_VERSION}`;
  });
}

function validGroundImage(image, expectedPath) {
  if (!image) return false;
  const width = Number(image.naturalWidth || image.width) || 0;
  const height = Number(image.naturalHeight || image.height) || 0;
  const src = sourceOf(image);
  const exactGameTile = width === 512 && height === 512;
  const safeSquareFallback = width >= 480 && height >= 480 && Math.abs(width / height - 1) < .02;
  return (exactGameTile || safeSquareFallback) &&
    !/splashart/i.test(src) &&
    src.includes(expectedPath.split("?")[0]);
}

async function loadGroundOnly(game, world) {
  const path = GROUND_PATHS[world];
  if (!path) return null;
  game.__v0944GroundImages ||= new Map();
  const cached = game.__v0944GroundImages.get(world);
  if (validGroundImage(cached, path)) return cached;

  const image = await loadImageStrict(path);
  if (!validGroundImage(image, path)) {
    console.error(`[CHERRIFT v0.9.3.4.4] Invalid ground rejected for World ${world}. Expected a 512x512 ground tile.`, {
      path,
      width:image?.naturalWidth || 0,
      height:image?.naturalHeight || 0,
      src:sourceOf(image)
    });
    game.__v0944GroundImages.delete(world);
    return null;
  }

  game.__v0944GroundImages.set(world, image);
  game.__v0944GroundPatternCache ||= new Map();
  game.__v0944GroundPatternCache.clear();
  game.__v0944GroundColor = sampleGroundColor(image);
  return image;
}

function sampleGroundColor(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 12;
  canvas.height = 12;
  const context = canvas.getContext("2d", {willReadFrequently:true});
  if (!context) return {r:96,g:96,b:96};
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0, g = 0, b = 0, weight = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha <= .05) continue;
      r += pixels[index] * alpha;
      g += pixels[index + 1] * alpha;
      b += pixels[index + 2] * alpha;
      weight += alpha;
    }
    if (!weight) return {r:96,g:96,b:96};
    return {r:Math.round(r/weight),g:Math.round(g/weight),b:Math.round(b/weight)};
  } catch (_) {
    return {r:96,g:96,b:96};
  }
}

function buildGroundPattern(context, image) {
  const sourceWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 1);
  const sourceHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  let pattern = context.createPattern(image, "repeat");
  if (!pattern) return null;

  const scaleX = LOGICAL_TILE_SIZE / sourceWidth;
  const scaleY = LOGICAL_TILE_SIZE / sourceHeight;
  if (typeof pattern.setTransform === "function") {
    try {
      const matrix = typeof DOMMatrix === "function"
        ? new DOMMatrix([scaleX,0,0,scaleY,0,0])
        : {a:scaleX,b:0,c:0,d:scaleY,e:0,f:0};
      pattern.setTransform(matrix);
      return pattern;
    } catch (_) {}
  }

  const tile = document.createElement("canvas");
  tile.width = LOGICAL_TILE_SIZE;
  tile.height = LOGICAL_TILE_SIZE;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return null;
  tileContext.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in tileContext) tileContext.imageSmoothingQuality = "high";
  tileContext.drawImage(image,0,0,LOGICAL_TILE_SIZE,LOGICAL_TILE_SIZE);
  pattern = context.createPattern(tile,"repeat");
  return pattern || null;
}

const previousDrawGround = proto.drawGround;
proto.drawGround = function drawGroundV0944(context, zoom=1) {
  const world = worldNumber(this);
  if (!(world >= 0 && world <= 4)) return previousDrawGround.call(this, context, zoom);

  const image = this.__v0944GroundImages?.get?.(world) || null;
  const viewWidth = this.w / zoom;
  const viewHeight = this.h / zoom;
  const padding = LOGICAL_TILE_SIZE;
  const x = this.camera.x - viewWidth / 2 - padding;
  const y = this.camera.y - viewHeight / 2 - padding;
  const width = viewWidth + padding * 2;
  const height = viewHeight + padding * 2;

  if (!image || !validGroundImage(image, GROUND_PATHS[world])) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x,y,width,height);
    return;
  }

  this.__v0944GroundPatternCache ||= new Map();
  const cacheKey = `${world}:${image.naturalWidth}x${image.naturalHeight}:${CACHE_VERSION}`;
  let pattern = this.__v0944GroundPatternCache.get(cacheKey);
  if (!pattern) {
    pattern = buildGroundPattern(context,image);
    if (pattern) this.__v0944GroundPatternCache.set(cacheKey,pattern);
  }
  if (!pattern) {
    context.fillStyle = WORLD_FALLBACK[world] || "#263238";
    context.fillRect(x,y,width,height);
    return;
  }

  context.save();
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  context.fillStyle = pattern;
  context.fillRect(x,y,width,height);
  context.restore();
};

function blendProfile(object) {
  const key = String(object?.assetKey || "");
  if (!BLENDABLE_ASSET.test(key)) return null;
  if (STRONG_BLEND_ASSET.test(key)) return {start:.68, opacity:.50, texture:.18, shadow:.19};
  if (LIGHT_BLEND_ASSET.test(key)) return {start:.78, opacity:.30, texture:.10, shadow:.15};
  return {start:.74, opacity:.36, texture:.13, shadow:.14};
}

function rgb(color, alpha) {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`;
}

function darkened(color, factor=.38) {
  return {
    r:Math.max(0,Math.round(color.r*factor)),
    g:Math.max(0,Math.round(color.g*factor)),
    b:Math.max(0,Math.round(color.b*factor))
  };
}

async function resizedBitmap(image, width, height) {
  if (typeof createImageBitmap !== "function") return null;
  try {
    return await createImageBitmap(image, {
      resizeWidth:width,
      resizeHeight:height,
      resizeQuality:"high"
    });
  } catch (_) {
    return null;
  }
}

function drawGroundTextureOverlay(context, ground, width, height, profile) {
  if (!ground || profile.texture <= 0) return;
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const layerContext = layer.getContext("2d");
  if (!layerContext) return;

  const tileSize = Math.max(48,Math.round(width*.62));
  layerContext.globalAlpha = profile.texture;
  for (let x=0; x<width; x+=tileSize) {
    for (let y=Math.floor(height*profile.start); y<height; y+=tileSize) {
      layerContext.drawImage(ground,0,0,ground.naturalWidth,ground.naturalHeight,x,y,tileSize,tileSize);
    }
  }
  layerContext.globalAlpha = 1;
  layerContext.globalCompositeOperation = "destination-in";
  const mask = layerContext.createLinearGradient(0,height*profile.start,0,height);
  mask.addColorStop(0,"rgba(0,0,0,0)");
  mask.addColorStop(.55,"rgba(0,0,0,.28)");
  mask.addColorStop(1,"rgba(0,0,0,.72)");
  layerContext.fillStyle = mask;
  layerContext.fillRect(0,height*profile.start,width,height*(1-profile.start));

  context.save();
  context.globalCompositeOperation = "source-atop";
  context.drawImage(layer,0,0);
  context.restore();
}

async function buildObjectCanvas(game, spec) {
  const image = game.assets?.get?.(spec.assetKey);
  if (!image) return null;
  const mobile = matchMedia(MOBILE_QUERY).matches;
  const qualityScale = mobile ? 1 : 1.2;
  const width = Math.max(1,Math.round(spec.drawW*qualityScale));
  const height = Math.max(1,Math.round(spec.drawH*qualityScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const profile = blendProfile(spec);
  const groundColor = game.__v0944GroundColor || {r:96,g:96,b:96};
  const shadowColor = darkened(groundColor,.28);

  if (profile) {
    context.save();
    context.globalAlpha = profile.shadow;
    context.fillStyle = rgb(shadowColor,1);
    context.beginPath();
    context.ellipse(width*.5,height*.89,width*.31,height*.065,0,0,Math.PI*2);
    context.fill();
    context.restore();
  }

  const bitmap = await resizedBitmap(image,width,height);
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  context.drawImage(bitmap || image,0,0,width,height);
  bitmap?.close?.();

  if (profile) {
    context.save();
    context.globalCompositeOperation = "source-atop";
    const gradient = context.createLinearGradient(0,height*profile.start,0,height);
    gradient.addColorStop(0,rgb(groundColor,0));
    gradient.addColorStop(.48,rgb(groundColor,profile.opacity*.16));
    gradient.addColorStop(1,rgb(groundColor,profile.opacity));
    context.fillStyle = gradient;
    context.fillRect(0,height*profile.start,width,height*(1-profile.start));
    context.restore();
    drawGroundTextureOverlay(context,game.__v0944GroundImages?.get?.(worldNumber(game)),width,height,profile);
  }

  return {canvas,width,height,assetKey:spec.assetKey};
}

function uniqueObjectSpecs(game) {
  const seen = new Set();
  const specs = [];
  const camera = game.camera || {x:0,y:0};
  const sorted = [...(game.obstacles || [])].sort((a,b) =>
    Math.hypot(a.x-camera.x,a.y-camera.y)-Math.hypot(b.x-camera.x,b.y-camera.y)
  );
  for (const object of sorted) {
    if (!object?.v094Map || object.kind === "fireflyV094" || !object.assetKey) continue;
    const key = `${object.assetKey}:${Math.round(object.drawW||64)}x${Math.round(object.drawH||64)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    specs.push({
      assetKey:object.assetKey,
      drawW:object.drawW||64,
      drawH:object.drawH||64,
      anchor:object.anchor,
      kind:object.kind
    });
  }
  return specs;
}

async function prepareObjectCaches(game) {
  game.__v0944ObjectCache ||= new Map();
  const specs = uniqueObjectSpecs(game);
  const rawKeys = new Set(specs.map(spec => spec.assetKey));
  let cursor = 0;
  const workerCount = matchMedia(MOBILE_QUERY).matches ? 1 : 2;

  async function worker() {
    while (cursor < specs.length && game.mode === "playing") {
      const spec = specs[cursor++];
      const key = `${spec.assetKey}:${Math.round(spec.drawW)}x${Math.round(spec.drawH)}:${worldNumber(game)}:${CACHE_VERSION}`;
      if (!game.__v0944ObjectCache.has(key)) {
        const cached = await buildObjectCanvas(game,spec);
        if (cached) game.__v0944ObjectCache.set(key,cached);
      }
      await new Promise(resolve => setTimeout(resolve,0));
    }
  }

  await Promise.all(Array.from({length:workerCount},worker));
  if (game.mode !== "playing") return;

  // Once the display-sized canvases exist, release the huge decoded source PNGs.
  // They will be loaded again automatically on a later world entry if needed.
  for (const key of rawKeys) {
    if (game.assets?.images && cacheHasAsset(game,key)) game.assets.images[key] = null;
  }
}

function cacheHasAsset(game, assetKey) {
  for (const key of game.__v0944ObjectCache?.keys?.() || []) {
    if (key.startsWith(`${assetKey}:`)) return true;
  }
  return false;
}

function optimizeDecorDensity(game) {
  if (!matchMedia(MOBILE_QUERY).matches) return;
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const lowEnd = (memory && memory <= 4) || (cores && cores <= 4);
  const keepRatio = lowEnd ? .68 : .82;
  let decorativeIndex = 0;
  game.obstacles = (game.obstacles || []).filter(object => {
    if (!object?.v094Map || object.solid || object.kind === "fireflyV094") return true;
    const keep = ((decorativeIndex++ * 2654435761) >>> 0) / 4294967295 < keepRatio;
    return keep;
  });
  if (lowEnd) {
    let fireflyIndex = 0;
    game.obstacles = game.obstacles.filter(object => object.kind !== "fireflyV094" || fireflyIndex++ < 6);
  }
}

const previousDrawObstacle = proto.drawObstacle;
proto.drawObstacle = function drawObstacleV0944(context, object) {
  if (!object?.v094Map || object.kind === "fireflyV094") return previousDrawObstacle.call(this,context,object);

  const zoom = this.zoom || 1;
  const halfW = this.w/zoom/2 + (object.drawW||64);
  const halfH = this.h/zoom/2 + (object.drawH||64);
  if (Math.abs(object.x-this.camera.x)>halfW || Math.abs(object.y-this.camera.y)>halfH) return;

  const key = `${object.assetKey}:${Math.round(object.drawW||64)}x${Math.round(object.drawH||64)}:${worldNumber(this)}:${CACHE_VERSION}`;
  const cached = this.__v0944ObjectCache?.get?.(key);
  const image = cached?.canvas || this.assets?.get?.(object.assetKey);
  if (!image) return;

  context.save();
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "medium";
  context.drawImage(
    image,
    object.x-(object.drawW||64)/2,
    object.y-(object.drawH||64)*(object.anchor ?? .72),
    object.drawW||64,
    object.drawH||64
  );
  context.restore();
};

const previousStart = proto.start;
proto.start = async function startV0944(...args) {
  sanitizeGameplayLoader(this);
  const stage = stageForStart(this);
  const world = Number(stage?.world);
  if (world >= 0 && world <= 4) await loadGroundOnly(this,world);
  releaseWorldSplashDom();

  this.__v0944GroundPatternCache = new Map();
  this.__v0944ObjectCache = new Map();
  const result = await previousStart.apply(this,args);
  removeAccidentalSplashAssets(this);
  optimizeDecorDensity(this);
  prepareObjectCaches(this).catch(error => console.warn("[CHERRIFT v0.9.3.4.4] Object cache preparation failed:",error));
  return result;
};

function hookWorldSelectorRestore() {
  const previousOpenWorldSelect = UI.openWorldSelect?.bind(UI);
  if (previousOpenWorldSelect && !UI.__v0944WorldRestore) {
    UI.__v0944WorldRestore = true;
    UI.openWorldSelect = function openWorldSelectV0944(...args) {
      restoreWorldSplashDom();
      return previousOpenWorldSelect(...args);
    };
  }

  const previousOpen = UI.open?.bind(UI);
  if (previousOpen && !UI.__v0944OpenRestore) {
    UI.__v0944OpenRestore = true;
    UI.open = function openV0944(panel,...args) {
      if (panel === "worlds") restoreWorldSplashDom();
      return previousOpen(panel,...args);
    };
  }
}

hookWorldSelectorRestore();
window.CHERRIFT_V0944 = Object.freeze({
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  logicalTileSize:LOGICAL_TILE_SIZE,
  groundPaths:GROUND_PATHS
});
console.info("[CHERRIFT] v0.9.3.4.4 map object blending, strict ground loading and mobile performance hotfix loaded.");
})();
