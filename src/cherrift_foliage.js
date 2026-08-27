/* CHERRIFT reactive foliage
 * Canonical owner: lightweight map decoration reactions only.
 * No menu, profile, reward, selector or skill-tree behavior lives here.
 */
(() => {
  "use strict";

  if (window.__CHERRIFT_FOLIAGE__) return;
  window.__CHERRIFT_FOLIAGE__ = true;

  const VERSION = "0.9.8.2-foliage";
  const CELL_SIZE = 220;
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");
  const REACTIVE_ASSET = /(flower|bush|grass|mushroom|plant|reed|shrub)/i;

  if (typeof CherriftGame === "undefined") {
    console.warn("[CHERRIFT Foliage] CherriftGame is unavailable; foliage hook skipped.");
    return;
  }

  const proto = CherriftGame.prototype;

  function seconds(game){
    const value = Number(game?.t);
    return Number.isFinite(value) ? value : performance.now() / 1000;
  }

  function profileFor(object){
    const currentMapObject = object?.cherriftMapObject || object?.__cherriftCleanWorld ||
      (!!object && Number.isFinite(Number(object.x)) && Number.isFinite(Number(object.y)) && !!(object.assetKey || object.kind));
    if (!currentMapObject || object.solid || object.glow || /firefly/i.test(String(object.kind || object.objectKey || ""))) return null;
    const key = `${String(object.assetKey || "")} ${String(object.objectKey || "")} ${String(object.kind || "")}`;
    if (!REACTIVE_ASSET.test(key)) return null;

    const drawW = Math.max(24, Number(object.drawW) || 64);
    const drawH = Math.max(24, Number(object.drawH) || 64);
    const isBush = /bush|shrub/i.test(key);
    const isGrass = /grass|reed/i.test(key);
    const isFlower = /flower|mushroom|plant/i.test(key);

    return Object.freeze({
      radius:Math.max(48, Math.min(108, drawW * (isBush ? .72 : .64))),
      amplitude:(isBush ? 12 : isGrass ? 16 : isFlower ? 14 : 12) * Math.PI / 180,
      compression:isBush ? .07 : isGrass ? .10 : .085,
      duration:isBush ? .60 : isGrass ? .49 : .54,
      drawW,
      drawH,
      anchor:Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72
    });
  }

  function cellKey(x, y){
    return `${Math.floor(x / CELL_SIZE)}:${Math.floor(y / CELL_SIZE)}`;
  }

  function buildController(game){
    const grid = new Map();
    for (const object of game.obstacles || []) {
      const profile = profileFor(object);
      if (!profile) continue;
      const key = cellKey(object.x, object.y);
      const bucket = grid.get(key) || [];
      bucket.push({object, profile});
      grid.set(key, bucket);
    }

    const old = game.__cherriftFoliage;
    game.__cherriftFoliage = {
      source:game.obstacles,
      sourceLength:game.obstacles?.length || 0,
      grid,
      active:new Map(),
      inside:new Set(),
      cooldown:new WeakMap(),
      lastScanAt:-Infinity,
      lastX:Number(game.player?.x) || 0,
      lastY:Number(game.player?.y) || 0,
      initialized:false,
      revision:(old?.revision || 0) + 1
    };
    return game.__cherriftFoliage;
  }

  function controllerFor(game){
    const current = game.__cherriftFoliage;
    if (!current || current.source !== game.obstacles || current.sourceLength !== (game.obstacles?.length || 0)) {
      return buildController(game);
    }
    return current;
  }

  function motionValue(progress){
    const p = Math.max(0, Math.min(1, progress));
    if (p < .18) return p / .18;
    if (p < .44) return 1 + (-.38 - 1) * ((p - .18) / .26);
    if (p < .70) return -.38 + (.17 + .38) * ((p - .44) / .26);
    return .17 * (1 - (p - .70) / .30);
  }

  function leanDirection(object, dx, playerX){
    if (Math.abs(dx) > .5) return Math.sign(dx);
    const side = playerX - Number(object.x || 0);
    if (Math.abs(side) > 1) return Math.sign(side);
    return Math.sin(Number(object.phase) || 0) >= 0 ? 1 : -1;
  }

  function distanceSqToSegment(pointX, pointY, startX, startY, endX, endY){
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSq = segmentX * segmentX + segmentY * segmentY;
    if (lengthSq <= .0001) {
      const dx = pointX - endX;
      const dy = pointY - endY;
      return dx * dx + dy * dy;
    }
    const projection = Math.max(0, Math.min(1,
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / lengthSq
    ));
    const closestX = startX + segmentX * projection;
    const closestY = startY + segmentY * projection;
    const dx = pointX - closestX;
    const dy = pointY - closestY;
    return dx * dx + dy * dy;
  }

  function updateFoliage(game){
    if ((game.mode !== "playing" && !document.body.classList.contains("is-playing")) || !game.player) return;
    const controller = controllerFor(game);
    const now = seconds(game);

    for (const [object, state] of controller.active) {
      if (now - state.startedAt >= state.duration) controller.active.delete(object);
    }

    const lowQuality = game.save?.settings?.effectQuality === "low";
    const scanInterval = lowQuality ? .075 : .045;
    if (now - controller.lastScanAt < scanInterval) return;

    const playerX = Number(game.player.x) || 0;
    const playerY = Number(game.player.y) || 0;
    const previousX = controller.lastX;
    const previousY = controller.lastY;
    const dx = playerX - previousX;
    const dy = playerY - previousY;
    const distanceMoved = Math.hypot(dx, dy);
    controller.lastScanAt = now;
    controller.lastX = playerX;
    controller.lastY = playerY;

    if (!controller.initialized) {
      controller.initialized = true;
      return;
    }

    const nextInside = new Set();
    const playerRadius = Math.max(8, Number(game.player.r) || 18);
    const nearbyCells = new Set();
    for (const [sampleX, sampleY] of [[previousX, previousY], [playerX, playerY]]) {
      const cellX = Math.floor(sampleX / CELL_SIZE);
      const cellY = Math.floor(sampleY / CELL_SIZE);
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) nearbyCells.add(`${cellX + offsetX}:${cellY + offsetY}`);
      }
    }

    const visited = new Set();
    for (const key of nearbyCells) {
      const bucket = controller.grid.get(key);
      if (!bucket) continue;
      for (const entry of bucket) {
        const object = entry.object;
        if (visited.has(object)) continue;
        visited.add(object);
        const reach = entry.profile.radius + playerRadius;
        const ox = playerX - Number(object.x || 0);
        const oy = playerY - Number(object.y || 0);
        const currentDistanceSq = ox * ox + oy * oy;
        if (currentDistanceSq <= reach * reach) nextInside.add(object);

        const sweptDistanceSq = distanceSqToSegment(
          Number(object.x || 0), Number(object.y || 0), previousX, previousY, playerX, playerY
        );
        if (sweptDistanceSq > reach * reach) continue;

        if (distanceMoved < .45 || controller.inside.has(object)) continue;
        if (now < (controller.cooldown.get(object) || -Infinity)) continue;

        const intensity = Math.max(.72, Math.min(1, distanceMoved / 9));
        const motionScale = REDUCED_MOTION.matches ? .35 : 1;
        const duration = entry.profile.duration * (.96 + ((Number(object.phase) || 0) % 1) * .08);
        controller.active.set(object, {
          startedAt:now,
          duration,
          amplitude:entry.profile.amplitude * intensity * motionScale,
          compression:entry.profile.compression * intensity * motionScale,
          direction:leanDirection(object, dx, playerX),
          profile:entry.profile
        });
        controller.cooldown.set(object, now + duration + .22);
      }
    }

    controller.inside = nextInside;
  }

  const previousUpdate = proto.update;
  proto.update = function updateReactiveFoliage(dt){
    const result = previousUpdate.call(this, dt);
    updateFoliage(this);
    return result;
  };

  const previousDrawObstacle = proto.drawObstacle;
  proto.drawObstacle = function drawReactiveFoliage(context, object){
    const controller = this.__cherriftFoliage;
    const state = controller?.active?.get(object);
    if (!state) return previousDrawObstacle.call(this, context, object);

    const progress = (seconds(this) - state.startedAt) / state.duration;
    if (progress >= 1 || progress < 0) {
      controller.active.delete(object);
      return previousDrawObstacle.call(this, context, object);
    }

    const value = motionValue(progress);
    const settle = Math.sin(Math.PI * Math.min(1, progress / .78)) * (1 - progress * .45);
    const angle = state.direction * state.amplitude * value;
    const scaleY = 1 - state.compression * settle;
    const scaleX = 1 + state.compression * .32 * settle;
    const pivotY = Number(object.y || 0) + state.profile.drawH * (1 - state.profile.anchor);

    context.save();
    context.translate(Number(object.x) || 0, pivotY);
    context.rotate(angle);
    context.scale(scaleX, scaleY);
    context.translate(-(Number(object.x) || 0), -pivotY);
    try {
      return previousDrawObstacle.call(this, context, object);
    } finally {
      context.restore();
    }
  };

  window.CHERRIFT_REACTIVE_FOLIAGE = Object.freeze({
    version:VERSION,
    cellSize:CELL_SIZE,
    isReactive:object => !!profileFor(object),
    inspect(game){
      const controller = game ? controllerFor(game) : null;
      return controller ? {indexed:[...controller.grid.values()].reduce((sum,bucket)=>sum+bucket.length,0),active:controller.active.size,revision:controller.revision} : null;
    },
    refresh(game){
      if (!game) return false;
      buildController(game);
      return true;
    }
  });

  console.info(`[CHERRIFT] Reactive foliage ${VERSION} loaded.`);
})();
