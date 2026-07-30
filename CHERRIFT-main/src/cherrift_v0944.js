(() => {
"use strict";

const VERSION = "0.9.3.4.6-crisp-map-stability-hotfix";
const CACHE_VERSION = "09346";
const MOBILE_QUERY = "(max-width:820px)";

if (!window.CherriftGame || !window.UI) {
  console.error("[CHERRIFT v0.9.3.4.6] Required systems are missing.");
  return;
}

const MAP_OBJECT_PATHS = Object.freeze({
  w1_bush1:"assets/map/world1/world1_bush_1.png",
  w1_bush2:"assets/map/world1/world1_bush_2.png",
  w1_bush3:"assets/map/world1/world1_bush_3.png",
  w1_flower1:"assets/map/world1/world1_flower_1.png",
  w1_flower2:"assets/map/world1/world1_flower_2.png",
  w1_flower3:"assets/map/world1/world1_flower_3.png",
  w1_log:"assets/map/world1/world1_log_1.png",
  w1_mushroom:"assets/map/world1/world1_mushroom_1.png",
  w1_rock1:"assets/map/world1/world1_rock_1.png",
  w1_rock2:"assets/map/world1/world1_rock_2.png",
  w1_rockSmall:"assets/map/world1/world1_rock_small_1.png",
  w1_tree1:"assets/map/world1/world1_tree_1.png",
  w1_tree2:"assets/map/world1/world1_tree_2.png",

  w2_bush1:"assets/map/world2/world2_bush_1.png",
  w2_bush2:"assets/map/world2/world2_bush_2.png",
  w2_bush3:"assets/map/world2/world2_bush_3.png",
  w2_flower1:"assets/map/world2/world2_flower_1.png",
  w2_flower2:"assets/map/world2/world2_flower_2.png",
  w2_flower3:"assets/map/world2/world2_flower_3.png",
  w2_rock1:"assets/map/world2/world2_rock_1.png",
  w2_rock2:"assets/map/world2/world2_rock_2.png",
  w2_rock3:"assets/map/world2/world2_rock_3.png",
  w2_tree1:"assets/map/world2/world2_tree_1.png",
  w2_tree2:"assets/map/world2/world2_tree_2.png",

  w3_bones:"assets/map/world3/world3_bones.png",
  w3_bush1:"assets/map/world3/world3_bush_1.png",
  w3_bush2:"assets/map/world3/world3_bush_2.png",
  w3_log:"assets/map/world3/world3_log.png",
  w3_rock1:"assets/map/world3/world3_rock_1.png",
  w3_rock2:"assets/map/world3/world3_rock_2.png",
  w3_grass1:"assets/map/world3/world3_tall_grass_1.png",
  w3_grass2:"assets/map/world3/world3_tall_grass_2.png",
  w3_tree1:"assets/map/world3/world3_tree_1.png",
  w3_tree2:"assets/map/world3/world3_tree_2.png",

  w4_bigRock:"assets/map/world4/world4_big_rock_1.png",
  w4_bones:"assets/map/world4/world4_bones_1.png",
  w4_bush:"assets/map/world4/world4_bush_1.png",
  w4_cactus1:"assets/map/world4/world4_cactus_1.png",
  w4_cactus2:"assets/map/world4/world4_cactus_2.png",
  w4_flower:"assets/map/world4/world4_flower_1.png",
  w4_rock1:"assets/map/world4/world4_rock_1.png",
  w4_rock2:"assets/map/world4/world4_rock_2.png",
  w4_rock3:"assets/map/world4/world_rock_3.png",
  w4_rock4:"assets/map/world4/world_rock_4.png",
  w4_veryBig1:"assets/map/world4/world4_rock_very_big_1.png",
  w4_veryBig2:"assets/map/world4/world4_very_big_rock_2.png",
  w4_tree:"assets/map/world4/world4_tree_1.png"
});

const GROUND_PATHS = Object.freeze({
  0:"assets/map/training_teszt.png",
  1:"assets/map/world1/world1_ground_1.png",
  2:"assets/map/world2/world2_ground_1.png",
  3:"assets/map/world3/world3_ground_1.png",
  4:"assets/map/world4/world4_ground_1.png"
});

const SLIME_COLORS = Object.freeze({
  green_slime:"#62e77b",
  blue_slime:"#55cfff",
  big_slime:"#42d96d",
  slime_king:"#ff58aa"
});

const proto = CherriftGame.prototype;
const isMobile = () => matchMedia(MOBILE_QUERY).matches;

function lowEndMobile() {
  if (!isMobile()) return false;
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  return (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
}

function stripQuery(value) {
  return String(value || "").split("?")[0].split("#")[0];
}

function sourceOf(image) {
  return stripQuery(image?.currentSrc || image?.src || "");
}

function matchesExpectedSource(image, expected) {
  if (!image || !expected) return false;
  const source = sourceOf(image);
  if (!source || /splashart/i.test(source)) return false;
  return source === expected || source.endsWith(`/${expected}`);
}

function worldFor(game) {
  const stage = game?.stage || game?.getSelectedStage?.() ||
    window.CHERRIFT_V040?.stages?.find?.(entry => entry.id === game?.save?.selectedStageId);
  return Number(stage?.world);
}

function ensureCss() {
  if (document.getElementById("v0946css")) return;
  const style = document.createElement("style");
  style.id = "v0946css";
  style.textContent = `
    body.is-playing #menu,
    body.is-playing #worlds,
    body.is-playing #worldsV094,
    body.is-playing .world-screen-v094,
    body.is-playing .mobile-home-v031,
    body.is-playing .menu-dashboard-v060,
    body.is-playing .v082-custom-panel,
    body.is-playing #globalRailV060,
    body.is-playing #globalMobileNavV052 { display:none!important; visibility:hidden!important; }
    body.v0946-preparing-map #stageLoading { display:grid!important; visibility:visible!important; opacity:1!important; }
  `;
  document.head.appendChild(style);
}

function forceGameplayPanelsHidden() {
  ["menu","worlds","worldsV094"].forEach(name => document.getElementById(name)?.classList.add("hidden"));
  document.body.classList.remove("v094-world-open");
}

function installStrictLoader() {
  if (typeof ImageAssets === "undefined") return;
  const assetProto = ImageAssets.prototype;
  if (assetProto.__v0946StrictLoader) return;
  assetProto.__v0946StrictLoader = true;
  const originalLoadImage = assetProto.loadImage;
  assetProto.__v0946OriginalLoadImage = originalLoadImage;

  assetProto.loadImage = function loadImageV0946(key, src) {
    const assetKey = String(key || "");
    let source = String(src || "");
    const objectExpected = MAP_OBJECT_PATHS[assetKey];
    const groundMatch = assetKey.match(/^w([0-4])_ground$/);
    const groundExpected = groundMatch ? GROUND_PATHS[Number(groundMatch[1])] : null;
    const expected = objectExpected || groundExpected;

    if (/^w[0-4]_/.test(assetKey) && /splashart/i.test(source)) {
      console.warn("[CHERRIFT v0.9.3.4.6] Splash art blocked from gameplay:", assetKey, source);
      if (!expected) return Promise.resolve(false);
      source = `${expected}?v=${CACHE_VERSION}`;
    } else if (expected && stripQuery(source) !== expected) {
      source = `${expected}?v=${CACHE_VERSION}`;
    }

    return originalLoadImage.call(this, assetKey, source);
  };
}

async function loadExactAsset(game, key, path) {
  const current = game?.assets?.get?.(key);
  if (matchesExpectedSource(current, path)) return current;
  if (!game?.assets?.loadImage) return null;
  const ok = await game.assets.loadImage(key, `${path}?v=${CACHE_VERSION}`);
  const loaded = ok ? game.assets.get(key) : null;
  return matchesExpectedSource(loaded, path) ? loaded : null;
}

function uniqueObjectSpecs(game) {
  const specs = new Map();
  for (const object of game?.obstacles || []) {
    if (!object?.v094Map || object.kind === "fireflyV094" || !MAP_OBJECT_PATHS[object.assetKey]) continue;
    const drawW = Math.max(1, Math.round(Number(object.drawW) || 64));
    const drawH = Math.max(1, Math.round(Number(object.drawH) || 64));
    const cacheKey = `${object.assetKey}:${drawW}x${drawH}`;
    if (!specs.has(cacheKey)) specs.set(cacheKey, {cacheKey, assetKey:object.assetKey, drawW, drawH});
  }
  return [...specs.values()];
}

function disposeObjectCache(game) {
  for (const entry of game?.__v0946ObjectCache?.values?.() || []) entry?.drawable?.close?.();
  game.__v0946ObjectCache = new Map();
}

async function makeRenderDrawable(image, width, height) {
  if (typeof createImageBitmap === "function") {
    try {
      const drawable = await createImageBitmap(image, {
        resizeWidth:width,
        resizeHeight:height,
        resizeQuality:"high"
      });
      return {drawable, width, height, bitmap:true};
    } catch (_) {}
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", {alpha:true});
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return {drawable:canvas, width, height, bitmap:false};
}

async function prepareObjectCache(game) {
  disposeObjectCache(game);
  const specs = uniqueObjectSpecs(game);
  if (!specs.length) return;

  const qualityScale = lowEndMobile() ? 1.6 : isMobile() ? 1.85 : 2.0;
  const cachedAssetKeys = new Set();

  for (const spec of specs) {
    const expected = MAP_OBJECT_PATHS[spec.assetKey];
    const image = await loadExactAsset(game, spec.assetKey, expected);
    if (!image) continue;

    const targetW = Math.max(spec.drawW, Math.min(1100, Math.round(spec.drawW * qualityScale)));
    const targetH = Math.max(spec.drawH, Math.min(1100, Math.round(spec.drawH * qualityScale)));
    const entry = await makeRenderDrawable(image, targetW, targetH);
    if (!entry) continue;

    game.__v0946ObjectCache.set(spec.cacheKey, entry);
    cachedAssetKeys.add(spec.assetKey);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Once a high-resolution display cache exists, release only that object's
  // oversized decoded source PNG. Ground, enemies and player sprites are untouched.
  for (const assetKey of cachedAssetKeys) {
    if (game.assets?.images) game.assets.images[assetKey] = null;
  }
}

function tintSlimeSheet(source, color) {
  const width = Math.max(1, Number(source?.naturalWidth || source?.width) || 1);
  const height = Math.max(1, Number(source?.naturalHeight || source?.height) || 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", {alpha:true});
  if (!context) return source;
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "color";
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
  return canvas;
}

function buildSlimeVariants(game) {
  const source = game?.assets?.get?.("slime");
  if (!source) return;
  const signature = `${source.naturalWidth || source.width}x${source.naturalHeight || source.height}`;
  if (game.__v0946SlimeSignature === signature && game.__v0946SlimeVariants) return;
  game.__v0946SlimeSignature = signature;
  game.__v0946SlimeVariants = new Map();
  for (const [type, color] of Object.entries(SLIME_COLORS)) {
    game.__v0946SlimeVariants.set(type, tintSlimeSheet(source, color));
  }
}

function removeAccidentalSplashAssets(game) {
  const images = game?.assets?.images;
  if (!images) return;
  for (const [key, image] of Object.entries(images)) {
    if (!/^w[0-4]_/.test(key)) continue;
    const source = sourceOf(image);
    if (/splashart/i.test(source)) images[key] = null;
  }
}

const previousResize = proto.resize;
proto.resize = function resizeV0946(...args) {
  if (isMobile()) {
    const cap = lowEndMobile() ? 1.10 : 1.20;
    this.dpr = Math.min(Number(this.dpr) || cap, cap);
  }
  return previousResize.apply(this, args);
};

const previousDrawObstacle = proto.drawObstacle;
proto.drawObstacle = function drawObstacleV0946(context, object) {
  if (!object?.v094Map || object.kind === "fireflyV094") {
    return previousDrawObstacle.call(this, context, object);
  }

  const drawW = Math.max(1, Math.round(Number(object.drawW) || 64));
  const drawH = Math.max(1, Math.round(Number(object.drawH) || 64));
  const zoom = this.zoom || window.CHERRIFT_CONFIG?.performance?.cameraZoom || 1;
  const halfW = this.w / zoom / 2 + drawW;
  const halfH = this.h / zoom / 2 + drawH;
  if (Math.abs(object.x - this.camera.x) > halfW || Math.abs(object.y - this.camera.y) > halfH) return;

  const expected = MAP_OBJECT_PATHS[object.assetKey];
  if (!expected) return;
  const cacheKey = `${object.assetKey}:${drawW}x${drawH}`;
  const cached = this.__v0946ObjectCache?.get?.(cacheKey);
  let drawable = cached?.drawable || null;

  if (!drawable) {
    const image = this.assets?.get?.(object.assetKey);
    if (!matchesExpectedSource(image, expected)) {
      loadExactAsset(this, object.assetKey, expected).catch(() => {});
      return;
    }
    drawable = image;
  }

  context.save();
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  if ("filter" in context) context.filter = "none";
  context.drawImage(
    drawable,
    Math.round(object.x - drawW / 2),
    Math.round(object.y - drawH * (object.anchor ?? .72)),
    drawW,
    drawH
  );
  context.restore();
};

const previousDrawEnemy = proto.drawEnemy;
proto.drawEnemy = function drawEnemyV0946(context, enemy) {
  if (enemy?.isTrainingDummyV094) return previousDrawEnemy.call(this, context, enemy);
  const type = String(enemy?.enemyType || enemy?.type || "");
  if (!["pink_slime","green_slime","blue_slime","big_slime","slime_king"].includes(type)) {
    return previousDrawEnemy.call(this, context, enemy);
  }

  buildSlimeVariants(this);
  const original = this.assets?.get?.("slime");
  const sheet = type === "pink_slime" ? original : this.__v0946SlimeVariants?.get?.(type) || original;
  const config = window.CHERRIFT_CONFIG?.slime;
  if (!sheet || !config) return previousDrawEnemy.call(this, context, enemy);

  if (enemy.eliteV088 || enemy.isBoss) {
    const pulse = 1 + Math.sin(this.t * 4 + (enemy.phase || 0)) * .08;
    context.save();
    context.globalAlpha = enemy.isBoss ? .30 : .22;
    context.fillStyle = enemy.isBoss ? "#ff4f9e" : "#ffd76d";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 16;
    context.beginPath();
    context.ellipse(enemy.x, enemy.y + 8, (enemy.r || 22) * 1.5 * pulse, (enemy.r || 22) * .72 * pulse, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const frameWidth = Number(config.frameWidth) || 64;
  const frameHeight = Number(config.frameHeight) || 64;
  const columns = Math.max(1, Number(config.columns) || Math.floor((sheet.width || frameWidth) / frameWidth));
  const row = Number(config.rows?.move) || 0;
  const frame = Math.floor((this.t + (enemy.phase || 0)) * 7) % columns;
  const scale = Math.max(.85, (Number(enemy.r) || 20) / 20);
  const drawW = (Number(config.displayWidth) || 72) * scale;
  const drawH = (Number(config.displayHeight) || 72) * scale;

  context.save();
  if (enemy.hit > 0) context.globalAlpha = .68;
  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  context.drawImage(
    sheet,
    frame * frameWidth,
    row * frameHeight,
    frameWidth,
    frameHeight,
    enemy.x - drawW / 2,
    enemy.y - drawH / 2,
    drawW,
    drawH
  );
  context.restore();
};

const previousDrawWorld = proto.drawWorld;
proto.drawWorld = function drawWorldV0946(context) {
  const world = worldFor(this);
  if (!(world >= 0 && world <= 4) || !this.camera) return previousDrawWorld.call(this, context);

  const zoom = this.zoom || window.CHERRIFT_CONFIG?.performance?.cameraZoom || 1;
  const halfW = this.w / zoom / 2 + 340;
  const halfH = this.h / zoom / 2 + 340;
  const visible = object => {
    if (!object) return false;
    if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) return true;
    const marginX = Number(object.drawW || object.r || 32);
    const marginY = Number(object.drawH || object.r || 32);
    return Math.abs(object.x - this.camera.x) <= halfW + marginX &&
      Math.abs(object.y - this.camera.y) <= halfH + marginY;
  };

  const original = {
    obstacles:this.obstacles,
    pickups:this.pickups,
    enemies:this.enemies,
    bullets:this.bullets,
    effects:this.effects
  };

  this.obstacles = (original.obstacles || []).filter(visible);
  this.pickups = (original.pickups || []).filter(visible);
  this.enemies = (original.enemies || []).filter(visible);
  this.bullets = (original.bullets || []).filter(visible);
  this.effects = (original.effects || []).filter(visible);

  try {
    return previousDrawWorld.call(this, context);
  } finally {
    this.obstacles = original.obstacles;
    this.pickups = original.pickups;
    this.enemies = original.enemies;
    this.bullets = original.bullets;
    this.effects = original.effects;
  }
};

const previousStart = proto.start;
proto.start = async function startV0946(...args) {
  forceGameplayPanelsHidden();
  disposeObjectCache(this);
  document.body.classList.add("v0946-preparing-map");
  try {
    const result = await previousStart.apply(this, args);
    forceGameplayPanelsHidden();
    removeAccidentalSplashAssets(this);
    buildSlimeVariants(this);
    await prepareObjectCache(this);
    removeAccidentalSplashAssets(this);
    return result;
  } catch (error) {
    console.error("[CHERRIFT v0.9.3.4.6] Map preparation failed:", error);
    throw error;
  } finally {
    document.body.classList.remove("v0946-preparing-map");
  }
};

ensureCss();
installStrictLoader();

window.CHERRIFT_V0944 = Object.freeze({
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  objectPreScale:"1.6x–2.0x",
  strictGameplayAssets:true,
  slimeSpriteFallback:true
});
console.info("[CHERRIFT] v0.9.3.4.6 crisp map stability, strict splash isolation and slime sprite hotfix loaded.");
})();
