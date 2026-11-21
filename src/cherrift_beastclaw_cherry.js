/* Beastclaw Cherry sprite rework. Combat and Savage Rend stay in the existing runtime. */
(() => {
  "use strict";

  const id = "beastclaw_cherry";
  const playerConfig = window.CHERRIFT_CONFIG?.player;
  const config = playerConfig?.skins?.[id];
  const proto = window.CherriftGame?.prototype;
  if (!config || !proto || window.CHERRIFT_BEASTCLAW_CHERRY) return;

  const size = 192;
  const pivot = {x:96, y:182};
  const directions = ["right", "down_right", "down", "down_left", "left", "up_left", "up", "up_right"];
  const root = "assets/player/cherry_skins/beastclaw_cherry/sheets192";
  const legacyStates = config.states;
  const animation = {
    idle:{...legacyStates.idle, loop:true},
    walk:{...legacyStates.walk, loop:true},
    attack:{...legacyStates.attack, loop:false},
    walk_attack:{...legacyStates.attack, loop:false},
    skill:{...legacyStates.skill, loop:false}
  };

  config.states = Object.fromEntries(Object.entries(animation).map(([name, state]) => [
    name, {
      ...state,
      pivot,
      dirs:Object.fromEntries(directions.map(dir => [dir, `${root}/${id}_${name}_${dir}.png?v=beastclaw-v2`]))
    }
  ]));

  function directionForAngle(angle) {
    return directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
  }

  const move = proto.movePlayer;
  proto.movePlayer = function moveBeastclaw(vector, dt) {
    const player = this.player;
    if (player?.skin !== id) return move.call(this, vector, dt);
    const {x, y} = player;
    const result = move.call(this, vector, dt);
    if (player.skillCastTimer > 0 || Math.hypot(vector.x, vector.y) <= .04) return result;
    player.beastclawFacing = directionForAngle(Math.atan2(vector.y, vector.x));
    const travel = Math.hypot(player.x - x, player.y - y);
    player.beastclawStride = (player.beastclawStride || 0) + Math.min(dt, travel / Math.max(1, player.speed));
    return result;
  };

  const meleeHit = proto.meleeHit;
  proto.meleeHit = function aimBeastclawArt(angle, ...args) {
    const player = this.player;
    if (player?.skin === id && !(player.skillCastTimer > 0)) {
      player.beastclawAttackFacing = directionForAngle(angle);
      if (!player.moving) player.beastclawFacing = player.beastclawAttackFacing;
    }
    return meleeHit.call(this, angle, ...args);
  };

  const draw = proto.drawPlayer;
  proto.drawPlayer = function drawBeastclaw(context, player) {
    if (player?.skin !== id) return draw.call(this, context, player);
    const skill = player.skillCastTimer > 0;
    const attack = player.attackCastTimer > 0;
    const facing = player.beastclawFacing || player.lastDir || "down";
    const stateName = skill ? "skill" : attack ? (player.moving ? "walk_attack" : "attack") : player.moving ? "walk" : "idle";
    const requestedDir = skill ? player.skillDir || facing
      : attack && !player.moving ? player.beastclawAttackFacing || player.attackDir || facing : facing;
    const dir = directions.includes(requestedDir) ? requestedDir : "down";
    const state = config.states[stateName];
    const sprite = this.assets.get(`player_${id}_${stateName}_${dir}`);
    if (!sprite) return draw.call(this, context, player);

    const elapsed = skill ? (player.skillCastDuration || state.duration) - player.skillCastTimer
      : attack ? (player.attackCastDuration || state.duration) - player.attackCastTimer
      : player.moving ? player.beastclawStride || 0 : this.t || 0;
    const tick = Math.max(0, Math.floor(elapsed * state.fps));
    const frame = state.loop ? tick % state.frames : Math.min(state.frames - 1, tick);
    const width = (playerConfig.displayWidth || 116) * .95;
    const height = (playerConfig.displayHeight || 116) * .95;

    context.save();
    context.globalAlpha *= .22;
    context.fillStyle = "#000";
    context.beginPath();
    context.ellipse(player.x, player.y + 25, 26, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.drawImage(sprite, frame * size, 0, size, size,
      player.x - pivot.x * width / size, player.y + 30 - pivot.y * height / size, width, height);
  };

  window.CHERRIFT_BEASTCLAW_CHERRY = Object.freeze({id, directions});
})();
