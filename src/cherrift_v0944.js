(() => {
"use strict";

const VERSION = "0.9.3.4.5-crisp-lazy-map-hotfix";
const CACHE_VERSION = "09345";
const MOBILE_QUERY = "(max-width:820px)";
const EMPTY_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

if (!window.CherriftGame || !window.UI) {
  console.error("[CHERRIFT v0.9.3.4.5] Required systems are missing.");
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

const WORLD_GROUND_COLOR = Object.freeze({
  1:"rgb(112,176,49)",
  2:"rgb(31,65,58)",
  3:"rgb(183,139,45)",
  4:"rgb(190,68,28)"
});

const WORLD_SHADOW_COLOR = Object.freeze({
  1:"rgba(25,61,19,.20)",
  2:"rgba(0,9,12,.30)",
  3:"rgba(69,42,9,.22)",
  4:"rgba(75,20,8,.24)"
});

const BASE_PATCH_STRONG = /(?:rock|log|bones)/i;
const BASE_PATCH_MEDIUM = /(?:tree|cactus|bush|mushroom)/i;
const proto = CherriftGame.prototype;

function stageFor(game) {
  return game?.stage || game?.getSelectedStage?.() ||
    window.CHERRIFT_V040?.stages?.find?.(stage => stage.id === game?.save?.selectedStageId) || null;
}

function worldFor(game) {
  return Number(stageFor(game)?.world);
}

function stripQuery(source) {
  return String(source || "").split("?")[0];
}

function isGameplayKey(key) {
  return /^w[0-4]_/.test(String(key || ""));
}

function installDeferredMapLoader() {
  if (typeof ImageAssets === "undefined") {
    console.warn("[CHERRIFT v0.9.3.4.5] ImageAssets is unavailable; map lazy loading disabled.");
    return;
  }
  const assetProto = ImageAssets.prototype;
  if (assetProto.__v0945DeferredLoader) return;
  assetProto.__v0945DeferredLoader = true;
  assetProto.__v0945RawLoadImage = assetProto.loadImage;

  assetProto.loadImage = function loadImageV0945(key, src) {
    const assetKey = String(key || "");
    const source = String(src || "");

    if (isGameplayKey(assetKey) && /splashart/i.test(source)) {
      console.warn("[CHERRIFT v0.9.3.4.5] Splash art blocked from gameplay asset:", assetKey, source);
      return Promise.resolve(false);
    }

    if (/^w[0-4]_ground$/.test(assetKey)) {
      const world = Number(assetKey.charAt(1));
      const expected = GROUND_PATHS[world];
      if (!expected || stripQuery(source) !== expected) {
        console.warn("[CHERRIFT v0.9.3.4.5] Invalid ground source blocked:", assetKey, source);
        return Promise.resolve(false);
      }
      return assetProto.__v0945RawLoadImage.call(this, assetKey, source);
    }

    if (MAP_OBJECT_PATHS[assetKey]) {
      this.__v0945DeferredSources ||= new Map();
      this.__v0945DeferredSources.set(assetKey, MAP_OBJECT_PATHS[assetKey]);
      return Promise.resolve(true);
    }

    return assetProto.__v0945RawLoadImage.call(this, assetKey, source);
  };
}

function requestMapAsset(game, assetKey) {
  if (!game?.assets || !MAP_OBJECT_PATHS[assetKey]) return Promise.resolve(false);
  if (game.assets.get?.(assetKey)) return Promise.resolve(true);

  game.__v0945AssetLoads ||= new Map();
  if (game.__v0945AssetLoads.has(assetKey)) return game.__v0945AssetLoads.get(assetKey);

  const rawLoader = game.assets.__v0945RawLoadImage ||
    (typeof ImageAssets !== "undefined" ? ImageAssets.prototype.__v0945RawLoadImage : null);
  if (typeof rawLoader !== "function") return Promise.resolve(false);

  const path = game.assets.__v0945DeferredSources?.get?.(assetKey) || MAP_OBJECT_PATHS[assetKey];
  const promise = rawLoader.call(game.assets, assetKey, `${stripQuery(path)}?v=${CACHE_VERSION}`)
    .then(ok => {
      if (!ok) game.__v0945AssetLoads.delete(assetKey);
      return ok;
    })
    .catch(error => {
      game.__v0945AssetLoads.delete(assetKey);
      console.warn("[CHERRIFT v0.9.3.4.5] Map asset load failed:", assetKey, error);
      return false;
    });

  game.__v0945AssetLoads.set(assetKey, promise);
  return promise;
}

function releaseMapObjectTextures(game) {
  if (!game?.assets?.images) return;
  for (const key of Object.keys(MAP_OBJECT_PATHS)) {
    const image = game.assets.images[key];
    image?.close?.();
    game.assets.images[key] = null;
  }
  game.__v0945AssetLoads = new Map();
}

function removeAccidentalSplashAssets(game) {
  const images = game?.assets?.images;
  if (!images) return;
  for (const [key, image] of Object.entries(images)) {
    const source = String(image?.currentSrc || image?.src || "");
    if (isGameplayKey(key) && /splashart/i.test(source)) images[key] = null;
  }
}

function releaseWorldSplashDom() {
  document.querySelectorAll('[style*="assets/map"][style*="splashart"],img[src*="assets/map"][src*="splashart"]').forEach(element => {
    if (element instanceof HTMLImageElement) {
      if (!element.dataset.v0945Source) element.dataset.v0945Source = element.getAttribute("src") || "";
      element.removeAttribute("srcset");
      element.src = EMPTY_PIXEL;
    } else {
      if (!element.dataset.v0945Background) element.dataset.v0945Background = element.style.backgroundImage || "";
      element.style.backgroundImage = "none";
    }
  });
}

function restoreWorldSplashDom() {
  document.querySelectorAll("[data-v0945-source]").forEach(element => {
    if (!(element instanceof HTMLImageElement)) return;
    const source = element.dataset.v0945Source;
    if (source) element.src = source;
    delete element.dataset.v0945Source;
  });
  document.querySelectorAll("[data-v0945-background]").forEach(element => {
    element.style.backgroundImage = element.dataset.v0945Background || "";
    delete element.dataset.v0945Background;
  });
}

function lowEndMobile() {
  if (!matchMedia(MOBILE_QUERY).matches) return false;
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  return (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
}

function optimizeDecorDensity(game) {
  if (!matchMedia(MOBILE_QUERY).matches) return;
  const keepRatio = lowEndMobile() ? .52 : .68;
  let decorativeIndex = 0;
  let fireflies = 0;

  game.obstacles = (game.obstacles || []).filter(object => {
    if (!object?.v094Map || object.solid) return true;
    if (object.kind === "fireflyV094") return fireflies++ < (lowEndMobile() ? 5 : 8);
    const hash = Math.imul(++decorativeIndex, 2654435761) >>> 0;
    return hash / 4294967295 < keepRatio;
  });
}

function prefetchNearbyAssets(game) {
  const camera = game.camera || {x:0,y:0};
  const zoom = game.zoom || window.CHERRIFT_CONFIG?.performance?.cameraZoom || 1;
  const halfW = game.w / zoom * .85;
  const halfH = game.h / zoom * .85;
  const keys = new Set();

  for (const object of game.obstacles || []) {
    if (!object?.v094Map || object.kind === "fireflyV094" || !MAP_OBJECT_PATHS[object.assetKey]) continue;
    if (Math.abs(object.x-camera.x) > halfW || Math.abs(object.y-camera.y) > halfH) continue;
    keys.add(object.assetKey);
  }
  for (const key of keys) requestMapAsset(game,key);
}

function basePatchProfile(object) {
  const key = String(object?.assetKey || "");
  if (BASE_PATCH_STRONG.test(key)) return {shadowW:.36,shadowH:.060,coverW:.40,coverH:.050,coverAlpha:.20};
  if (BASE_PATCH_MEDIUM.test(key)) return {shadowW:.27,shadowH:.045,coverW:.30,coverH:.038,coverAlpha:.12};
  return null;
}

const previousDrawObstacle = proto.drawObstacle;
proto.drawObstacle = function drawObstacleV0945(context, object) {
  if (!object?.v094Map || object.kind === "fireflyV094") {
    return previousDrawObstacle.call(this,context,object);
  }

  const zoom = this.zoom || window.CHERRIFT_CONFIG?.performance?.cameraZoom || 1;
  const drawW = Number(object.drawW) || 64;
  const drawH = Number(object.drawH) || 64;
  const visibleHalfW = this.w/zoom/2 + drawW;
  const visibleHalfH = this.h/zoom/2 + drawH;
  const dxCamera = Math.abs(object.x-this.camera.x);
  const dyCamera = Math.abs(object.y-this.camera.y);

  if (dxCamera > visibleHalfW + 220 || dyCamera > visibleHalfH + 220) return;

  const image = this.assets?.get?.(object.assetKey);
  if (!image) {
    requestMapAsset(this,object.assetKey);
    return;
  }
  if (dxCamera > visibleHalfW || dyCamera > visibleHalfH) return;

  const anchor = object.anchor ?? .72;
  const left = Math.round(object.x-drawW/2);
  const top = Math.round(object.y-drawH*anchor);
  const bottom = top + drawH;
  const profile = basePatchProfile(object);
  const world = worldFor(this);

  context.save();
  if (profile) {
    context.fillStyle = WORLD_SHADOW_COLOR[world] || "rgba(0,0,0,.18)";
    context.beginPath();
    context.ellipse(object.x,bottom-drawH*.075,drawW*profile.shadowW,Math.max(2,drawH*profile.shadowH),0,0,Math.PI*2);
    context.fill();
  }

  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
  context.drawImage(image,left,top,Math.round(drawW),Math.round(drawH));

  // Cheap feather over baked-in ground halos. This does not rescale, blur or
  // pre-render the object; it only softens the very bottom edge with the
  // current world's ground colour.
  if (profile && WORLD_GROUND_COLOR[world]) {
    context.globalAlpha = profile.coverAlpha;
    context.fillStyle = WORLD_GROUND_COLOR[world];
    context.beginPath();
    context.ellipse(object.x,bottom-drawH*.055,drawW*profile.coverW,Math.max(2,drawH*profile.coverH),0,0,Math.PI*2);
    context.fill();
  }
  context.restore();
};

const previousStart = proto.start;
proto.start = async function startV0945(...args) {
  releaseMapObjectTextures(this);
  releaseWorldSplashDom();
  const result = await previousStart.apply(this,args);
  removeAccidentalSplashAssets(this);
  optimizeDecorDensity(this);
  prefetchNearbyAssets(this);
  return result;
};

function hookWorldSelectorRestore() {
  const previousOpenWorldSelect = UI.openWorldSelect?.bind(UI);
  if (previousOpenWorldSelect && !UI.__v0945WorldRestore) {
    UI.__v0945WorldRestore = true;
    UI.openWorldSelect = function openWorldSelectV0945(...args) {
      restoreWorldSplashDom();
      return previousOpenWorldSelect(...args);
    };
  }

  const previousOpen = UI.open?.bind(UI);
  if (previousOpen && !UI.__v0945OpenRestore) {
    UI.__v0945OpenRestore = true;
    UI.open = function openV0945(panel,...args) {
      if (panel === "worlds" || panel === "menu") restoreWorldSplashDom();
      return previousOpen(panel,...args);
    };
  }
}

installDeferredMapLoader();
hookWorldSelectorRestore();

window.CHERRIFT_V0944 = Object.freeze({
  version:VERSION,
  cacheVersion:CACHE_VERSION,
  lazyMapAssets:true,
  objectPreResize:false,
  groundPaths:GROUND_PATHS
});
console.info("[CHERRIFT] v0.9.3.4.5 crisp lazy-loaded map objects and splash isolation loaded.");
})();
