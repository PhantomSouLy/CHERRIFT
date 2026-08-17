/* CHERRIFT v0.9.7 — lightweight reactive foliage.
   Decorative plants are indexed once in coarse spatial cells. Only the cells
   beside Cherry are queried, and active motion is an analytical keyframe — no
   body, constraint or per-object physics simulation is created. */
(function cherriftGameUiV097(){
  "use strict";

  if (window.__CHERRIFT_GAME_UI_097__) return;
  window.__CHERRIFT_GAME_UI_097__ = true;
  document.documentElement.classList.add("cherrift-game-ui-v097");

  if (typeof CherriftGame === "undefined") return;

  const VERSION = "0.9.7";
  const CELL_SIZE = 220;
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");
  const REACTIVE_ASSET = /(flower|bush|grass|mushroom|plant|reed|shrub)/i;
  const proto = CherriftGame.prototype;

  function seconds(game){
    const value = Number(game?.t);
    return Number.isFinite(value) ? value : performance.now() / 1000;
  }

  function profileFor(object){
    if (!object?.v094Map || object.solid || object.kind === "fireflyV094") return null;
    const key = String(object.assetKey || "");
    if (!REACTIVE_ASSET.test(key)) return null;

    const drawW = Math.max(24, Number(object.drawW) || 64);
    const drawH = Math.max(24, Number(object.drawH) || 64);
    const isBush = /bush|shrub/i.test(key);
    const isGrass = /grass|reed/i.test(key);
    const isFlower = /flower|mushroom|plant/i.test(key);

    return Object.freeze({
      radius:Math.max(36, Math.min(86, drawW * (isBush ? .56 : .48))),
      amplitude:(isBush ? 8.5 : isGrass ? 11 : isFlower ? 9.5 : 8) * Math.PI / 180,
      compression:isBush ? .055 : isGrass ? .075 : .065,
      duration:isBush ? .56 : isGrass ? .46 : .50,
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

    const old = game.__v097Foliage;
    game.__v097Foliage = {
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
    return game.__v097Foliage;
  }

  function controllerFor(game){
    const current = game.__v097Foliage;
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

  function updateFoliage(game){
    if (REDUCED_MOTION.matches || game.mode !== "playing" || !game.player) return;
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
    const dx = playerX - controller.lastX;
    const dy = playerY - controller.lastY;
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
    const cellX = Math.floor(playerX / CELL_SIZE);
    const cellY = Math.floor(playerY / CELL_SIZE);

    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        const bucket = controller.grid.get(`${cellX + offsetX}:${cellY + offsetY}`);
        if (!bucket) continue;
        for (const entry of bucket) {
          const object = entry.object;
          const reach = entry.profile.radius + playerRadius;
          const ox = playerX - Number(object.x || 0);
          const oy = playerY - Number(object.y || 0);
          if (ox * ox + oy * oy > reach * reach) continue;
          nextInside.add(object);

          if (distanceMoved < .8 || controller.inside.has(object)) continue;
          if (now < (controller.cooldown.get(object) || -Infinity)) continue;

          const intensity = Math.max(.55, Math.min(1, distanceMoved / 10));
          const duration = entry.profile.duration * (.96 + ((Number(object.phase) || 0) % 1) * .08);
          controller.active.set(object, {
            startedAt:now,
            duration,
            amplitude:entry.profile.amplitude * intensity,
            compression:entry.profile.compression * intensity,
            direction:leanDirection(object, dx, playerX),
            profile:entry.profile
          });
          controller.cooldown.set(object, now + duration + .22);
        }
      }
    }

    controller.inside = nextInside;
  }

  const previousUpdate = proto.update;
  proto.update = function updateV097(dt){
    const result = previousUpdate.call(this, dt);
    updateFoliage(this);
    return result;
  };

  const previousDrawObstacle = proto.drawObstacle;
  proto.drawObstacle = function drawObstacleV097(context, object){
    const controller = this.__v097Foliage;
    const state = controller?.active?.get(object);
    if (!state || REDUCED_MOTION.matches) return previousDrawObstacle.call(this, context, object);

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
    refresh(game){
      if (!game) return false;
      buildController(game);
      return true;
    }
  });

  console.info(`[CHERRIFT v${VERSION}] Shared game UI and spatially indexed reactive foliage loaded.`);
})();
