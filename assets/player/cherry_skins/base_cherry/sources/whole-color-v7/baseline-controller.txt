/* Base Cherry: original complete sheet poses, distance-driven walking.
   No limb extraction, replacement, mesh, or temporal warping. */
(() => {
  "use strict";
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_BASE_CHERRY) return;

  const ID = "cherry_default";
  const ROOT = "assets/player/cherry_skins/base_cherry/sheets192";
  const DIRECTIONS = ["right", "down_right", "down", "down_left", "left", "up_left", "up", "up_right"];
  const PIVOT = {x:96, y:184};
  // Match the existing 6/18s cast and projectile event; preserve attack cadence.
  const FPS = {idle:3, idle2:3, walk:8, attack:18, walk_attack:8, skill:14};
  // Match the original Idle palette without repainting the approved gait.
  // Each mirrored pair uses one fixed grade across the complete six-frame loop.
  const WALK_COLOR = Object.freeze({
    right:"saturate(0.97128) hue-rotate(1.96086deg) contrast(0.94000) brightness(1.03000)",
    left:"saturate(0.97128) hue-rotate(1.96086deg) contrast(0.94000) brightness(1.03000)",
    down_right:"saturate(0.89914) hue-rotate(5.29766deg) contrast(0.99908) brightness(1.03000)",
    down_left:"saturate(0.89914) hue-rotate(5.29766deg) contrast(0.99908) brightness(1.03000)"
  });
  const walkColorCache = new WeakMap();
  const primedAssets = new WeakSet();
  function colorMatchedWalk(image, facing, ctx) {
    const filter = WALK_COLOR[facing];
    if (!filter) return image;
    const cached = walkColorCache.get(image)?.get(filter);
    if (cached) return cached.image;
    const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    const owner = ctx.canvas?.ownerDocument || (typeof document === "undefined" ? null : document);
    const canvas = owner?.createElement("canvas") || (typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(width, height) : null);
    if (!canvas) return image;
    canvas.width = width; canvas.height = height;
    const color = canvas.getContext("2d");
    if (!color || !("filter" in color)) return image;
    // Grade at 1:1 once, before pose scaling. This preserves the source alpha
    // and avoids filtered-layer resampling changing the character's outline.
    color.filter = filter;
    color.drawImage(image, 0, 0);
    // Match the two replacement source atlases to the retained first half.
    // Every operation covers a complete authored cell, before pose sampling.
    if (facing === "down_right" || facing === "down_left") {
      for (const [frame, match] of [[3,"saturate(0.95) brightness(1.015)"],
        [4,"saturate(0.95) brightness(1.015)"], [5,"saturate(1.04) brightness(0.996)"]]) {
        color.save();
        color.beginPath(); color.rect(frame * 192, 0, 192, height); color.clip();
        color.clearRect(frame * 192, 0, 192, height);
        color.filter = match + " " + filter;
        color.drawImage(image, 0, 0);
        color.restore();
      }
    }
    color.filter = "none";
    if (!walkColorCache.has(image)) walkColorCache.set(image, new Map());
    const entry = {image};
    walkColorCache.get(image).set(filter, entry);
    // Keep the same decoded-image sampling path as the original PNG. Drawing
    // a canvas directly can otherwise change edge sampling on some renderers.
    if (typeof Image === "function" && typeof canvas.toDataURL === "function") {
      const decoded = new Image();
      decoded.onload = () => { entry.image = decoded; };
      decoded.src = canvas.toDataURL("image/png");
    }
    return entry.image;
  }
  const config = CHERRIFT_CONFIG.player.skins[ID];
  if (!config) return;

  config.states = Object.fromEntries(Object.entries(FPS).map(([name, fps]) => [name, {
    frames:6, fps, duration:6 / fps, loop:["idle", "walk", "walk_attack"].includes(name), pivot:PIVOT,
    dirs:Object.fromEntries(DIRECTIONS.map(dir => [dir, `${ROOT}/base_cherry_${name}_${dir}.png?v=1111-base6-forward-step`]))
  }]));
  config.attackMovementMode = "mobile";
  config.attackMoveSpeedMultiplier = 1;
  config.skillType = "dash";
  // Preserve dash travel, damage and cooldown; only the sprite cast lasts 6/14s.

  function direction(x, y, fallback = "down") {
    if (Math.hypot(x, y) < .04) return fallback;
    return DIRECTIONS[(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8];
  }
  function vector(dir) {
    const angle = Math.max(0, DIRECTIONS.indexOf(dir)) * Math.PI / 4;
    return {x:Math.cos(angle), y:Math.sin(angle)};
  }
  function key(state, dir) { return `player_${ID}_${state}_${dir}`; }
  const proto = CherriftGame.prototype;

  // The shared loader enumerates config.states and all eight dirs before boot.
  const move = proto.movePlayer;
  proto.movePlayer = function moveBaseCherry(v, dt) {
    const before = this.player, x = before?.x, y = before?.y;
    const result = move.call(this, v, dt);
    const p = this.player;
    if (p === before && p?.skin === ID && dt > 0 && !(p.dashTimer > 0)) {
      const distance = Math.hypot(p.x - x, p.y - y);
      p.baseStride = (p.baseStride || 0) + Math.min(dt, distance / Math.max(1, p.speed || 235));
    }
    if (p?.skin === ID && !(p.dashTimer > 0) && Math.hypot(v.x, v.y) > .04) {
      p.baseFacing = direction(v.x, v.y);
    }
    return result;
  };

  const autoFire = proto.autoFire;
  proto.autoFire = function autoFireBaseCherry(...args) {
    const p = this.player;
    if (p?.skin !== ID) return autoFire.apply(this, args);
    if (p.baseAttack || p.fireTimer > 0 || p.skillCastTimer > 0 || p.dashTimer > 0) return;
    const target = this.nearest(760);
    if (!target || target.dead) return;
    const duration = config.states.attack.duration;
    p.fireTimer = p.fireInterval * (p.skillBuff > 0 ? .55 : 1);
    p.attackDir = direction(target.x - p.x, target.y - p.y, p.baseFacing);
    if (!p.moving) p.baseFacing = p.attackDir;
    p.baseAttack = {elapsed:0, duration, target, fired:false};
    p.attackCastDuration = duration;
    p.attackCastTimer = duration;
    p.baseIdleTime = 0;
  };

  const skill = proto.skill;
  proto.skill = function skillBaseCherry(...args) {
    const p = this.player;
    if (p?.skin !== ID) return skill.apply(this, args);
    if (p.skillTimer > 0 || p.skillCastTimer > 0) return;
    const input = this.input.getMoveVector();
    const v = Math.hypot(input.x, input.y) > .08 ? input : vector(p.baseFacing || p.lastDir || "down");
    // Older dash effects accept cardinal names. Keep that call compatible, then
    // provide the real normalized eight-direction vector to collision movement.
    const oldDir = p.lastDir;
    p.lastDir = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? "left" : "right") : (v.y < 0 ? "up" : "down");
    let result;
    try { result = skill.apply(this, args); } finally { p.lastDir = oldDir; }
    if (p.skillCastTimer > 0) {
      const length = Math.hypot(v.x, v.y) || 1;
      p.dashDir = {x:v.x / length, y:v.y / length};
      p.skillDir = direction(v.x, v.y);
      p.baseFacing = p.skillDir;
      p.baseAttack = null;
      p.attackCastTimer = 0;
      p.baseIdleTime = 0;
    }
    return result;
  };

  const update = proto.update;
  proto.update = function updateBaseCherry(dt) {
    const result = update.call(this, dt);
    const p = this.player;
    if (p?.skin !== ID || this.mode !== "playing") return result;
    const attack = p.baseAttack;
    if (attack) {
      attack.elapsed = Math.min(attack.duration, attack.elapsed + Math.max(0, dt));
      // Use one shared attack clock while switching standing/moving artwork.
      // Petal Trace replaces the old common artwork; combat semantics stay intact.
      if (!attack.fired && attack.elapsed >= 2.5 / FPS.attack) {
        attack.fired = true;
        const target = attack.target;
        if (target && !target.dead) {
          const dx = target.x - p.x, dy = target.y - p.y;
          const length = Math.hypot(dx, dy) || 1;
          this.bullets.push({x:p.x, y:p.y - 10, vx:dx / length * p.bulletSpeed,
            vy:dy / length * p.bulletSpeed, r:8, dmg:p.damage, life:1.45,
            style:"base_petal_trace", archetype:p.commonArchetype || "offensive"});
          window.CHERRIFT_BASE_PETAL_VFX?.shot(this, this.bullets[this.bullets.length - 1]);
        }
      }
      p.attackCastTimer = Math.max(0, attack.duration - attack.elapsed);
      if (attack.elapsed >= attack.duration) p.baseAttack = null;
    }
    if (p.moving || p.baseAttack || p.skillCastTimer > 0 || p.dashTimer > 0) p.baseIdleTime = 0;
    else p.baseIdleTime = (p.baseIdleTime || 0) + Math.max(0, dt);
    return result;
  };

  const draw = proto.drawPlayer;
  proto.drawPlayer = function drawBaseCherry(ctx, p) {
    if (p?.skin !== ID) return draw.call(this, ctx, p);
    // Start all four small decodes during Idle, before the first walking step.
    if (!primedAssets.has(this.assets)) {
      let ready = true;
      for (const facing of Object.keys(WALK_COLOR)) {
        const sheet = this.assets.get(key("walk", facing));
        if (sheet) colorMatchedWalk(sheet, facing, ctx); else ready = false;
      }
      if (ready) primedAssets.add(this.assets);
    }
    const casting = p.skillCastTimer > 0 || p.dashTimer > 0;
    const attack = !casting && p.baseAttack;
    const idleTime = p.baseIdleTime || 0;
    const stateName = casting ? "skill" : attack ? (p.moving ? "walk_attack" : "attack")
      : p.moving ? "walk" : idleTime % 8 >= 6 ? "idle2" : "idle";
    const dir = casting ? p.skillDir : attack ? p.attackDir : p.baseFacing || p.lastDir;
    const facing = DIRECTIONS.includes(dir) ? dir : "down";
    const requestedImage = this.assets.get(key(stateName, facing));
    let image = requestedImage || this.assets.get(key("idle", facing))
      || this.assets.get(key("idle", "down"));
    // Never fall through to the legacy dash renderer with its old hardcoded art.
    if (!image) return;
    if (stateName === "walk" && requestedImage) image = colorMatchedWalk(image, facing, ctx);
    const count = Math.min(6, Math.floor((image.naturalWidth || image.width) / 192));
    if (count < 1) return;
    const state = config.states[stateName];
    const elapsed = casting ? Math.max(0, (p.skillCastDuration || state.duration) - (p.skillCastTimer || 0))
      : attack ? attack.elapsed : stateName === "idle2" ? idleTime % 8 - 6 : this.t || 0;
    // The six moving poses follow travel, including while firing. The projectile
    // keeps its independent cast clock above; starting a shot cannot reset a step.
    const walking = stateName === "walk" || stateName === "walk_attack";
    const phase = walking ? ((p.baseStride || 0) * FPS.walk) % count
      : attack ? Math.min(count - 1, attack.elapsed / attack.duration * count)
      : casting || stateName === "idle2" ? Math.min(count - 1, elapsed * state.fps)
      : (elapsed * state.fps) % count;
    const frame = Math.floor(phase);
    const width = (CHERRIFT_CONFIG.player.displayWidth || 116) * .95;
    const height = (CHERRIFT_CONFIG.player.displayHeight || 116) * .95;
    ctx.save();
    ctx.globalAlpha *= .2;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 25, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = p === this.player ? 1 : ctx.globalAlpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Registration only translates/scales the complete authored cell. Bypass
    // both the old Base leg rig and optical-flow interpolation in every state.
    if (window.CHERRIFT_CHERRY_MOTION?.renderPose) window.CHERRIFT_CHERRY_MOTION.renderPose(ctx,image,ID,stateName,facing,frame,p,width,height);
    else ctx.drawImage(image, frame * 192, 0, 192, 192,
      p.x - PIVOT.x * width / 192, p.y + 30 - PIVOT.y * height / 192, width, height);
    ctx.restore();
  };

  window.CHERRIFT_BASE_CHERRY = Object.freeze({version:"1111-base6-forward-step", directions:[...DIRECTIONS]});
})();



