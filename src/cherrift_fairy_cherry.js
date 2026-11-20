/* Fairy Cherry gameplay sprite controller. */
(() => {
  "use strict";
  const id = "fairy_cherry";
  const gameConfig = window.CHERRIFT_CONFIG?.player;
  const config = gameConfig?.skins?.[id];
  const proto = window.CherriftGame?.prototype;
  if (!proto || !config || window.CHERRIFT_FAIRY_CHERRY) return;

  const size = 192;
  const directions = ["right", "down_right", "down", "down_left", "left", "up_left", "up", "up_right"];
  const timing = {idle:[4,4], walk:[6,9], attack:[6,18], walk_attack:[6,18], skill:[6,12]};
  const assetRoot = "assets/player/cherry_skins/fairy_cherry/sheets192";
  const states = Object.fromEntries(Object.entries(timing).map(([name, [frames, fps]]) => [
    name, {
      frames, fps, duration:frames / fps,
      dirs:Object.fromEntries(directions.map(dir => [dir, assetRoot + "/fairy_cherry_" + name + "_" + dir + ".png?v=fairy-v3-ears"]))
    }
  ]));
  // Use separate loader keys so the existing sprite loader remains a fallback.
  const key = (state, dir) => "fairy_rework_" + state + "_" + dir;
  if (typeof ImageAssets !== "undefined") {
    const loadAll = ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll = function loadFairySprites(...args) {
      const pending = Object.entries(states).flatMap(([state, animation]) =>
        Object.entries(animation.dirs).map(([dir, src]) => this.loadImage(key(state, dir), src)));
      return Promise.all([loadAll.apply(this, args), ...pending]).then(([result]) => result);
    };
  }

  function direction(x, y, fallback = "down") {
    if (Math.hypot(x,y) < .01) return fallback;
    return directions[(Math.round(Math.atan2(y,x) / (Math.PI / 4)) + 8) % 8];
  }

  const move = proto.movePlayer;
  proto.movePlayer = function moveFairy(vector, dt) {
    const player = this.player;
    if (player?.skin !== id) return move.call(this, vector, dt);
    const {x,y} = player;
    const result = move.call(this, vector, dt);
    player.fairyFacing = direction(vector.x, vector.y, player.fairyFacing || player.lastDir);
    const distance = Math.hypot(player.x - x, player.y - y);
    player.fairyStride = (player.fairyStride || 0) + Math.min(dt, distance / Math.max(1, player.speed));
    return result;
  };

  const fire = proto.autoFire;
  proto.autoFire = function fireFairy(...args) {
    const player = this.player;
    if (player?.skin !== id) return fire.apply(this, args);
    if (player.fairyShot?.bullets.length || player.skillCastTimer > 0) return;

    // Retain the existing aim, gear, projectile spread and cadence logic.
    const start = this.bullets.length;
    const result = fire.apply(this, args);
    if (this.bullets.length <= start) return result;
    const bullets = this.bullets.splice(start);
    const middle = bullets[Math.floor((bullets.length - 1) / 2)];
    const aim = direction(middle.vx, middle.vy, player.fairyFacing || player.lastDir);
    player.fairyShot = {elapsed:0, bullets, aim, x:player.x, y:player.y};
    if (!player.moving) player.fairyFacing = aim;
    return result;
  };

  const skill = proto.skill;
  proto.skill = function castFairy(...args) {
    const player = this.player;
    const ready = player?.skin === id && !(player.skillTimer > 0);
    const result = skill.apply(this, args);
    if (ready && player.skillCastTimer > 0) {
      player.fairySkillFacing = player.fairyFacing || player.skillDir || "down";
      player.fairyShot = null;
    }
    return result;
  };

  const update = proto.update;
  proto.update = function updateFairy(dt) {
    const player = this.player;
    const shot = player?.skin === id ? player.fairyShot : null;
    const advances = this.mode === "playing" && !(this.__hitStopV085 > 0);
    const result = update.call(this, dt);
    if (!shot || !advances || this.mode !== "playing" || this.player !== player || player.hp <= 0 || player.fairyShot !== shot) return result;

    shot.elapsed += Math.max(0, dt);
    if (shot.bullets.length && shot.elapsed >= 3 / timing.attack[1]) {
      for (const bullet of shot.bullets) {
        bullet.x += player.x - shot.x;
        bullet.y += player.y - shot.y;
        this.bullets.push(bullet);
      }
      shot.bullets.length = 0;
    }
    if (shot.elapsed >= states.attack.duration) player.fairyShot = null;
    return result;
  };

  const drawPlayer = proto.drawPlayer;
  proto.drawPlayer = function drawFairy(context, player) {
    if (player?.skin !== id) return drawPlayer.call(this, context, player);
    const cast = player.skillCastTimer > 0;
    const shot = player.fairyShot;
    const facing = player.fairyFacing || player.lastDir || "down";
    const state = cast ? "skill" : shot ? (player.moving ? "walk_attack" : "attack") : player.moving ? "walk" : "idle";
    const dir = cast ? player.fairySkillFacing || facing : shot ? shot.aim : facing;
    const sprite = this.assets.get(key(state, dir));
    if (!sprite) return drawPlayer.call(this, context, player);
    const {frames,fps,duration} = states[state];
    const elapsed = cast ? (player.skillCastDuration || duration) - player.skillCastTimer
      : shot ? shot.elapsed : player.moving ? player.fairyStride || 0 : this.t || 0;
    const tick = Math.max(0, Math.floor(elapsed * fps));
    const frame = cast || shot ? Math.min(frames - 1, tick) : tick % frames;
    const dw = (gameConfig.displayWidth || 116) * .95;
    const dh = (gameConfig.displayHeight || 116) * .95;

    context.save();
    context.globalAlpha *= .22;
    context.fillStyle = "#000";
    context.beginPath();
    context.ellipse(player.x, player.y + 25, 26, 8, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.drawImage(sprite, frame * size, 0, size, size,
      player.x - dw / 2, player.y + 30 - 180 * dh / size, dw, dh);
  };

  window.CHERRIFT_FAIRY_CHERRY = Object.freeze({id, states, directions});
})();
