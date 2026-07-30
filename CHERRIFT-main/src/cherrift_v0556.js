(() => {
"use strict";

const VERSION = "0.5.5.6-succubus-idle-skill-fix";
const FRAME_W = 192;
const alphaCache = new WeakMap();

if (!window.CherriftGame || !window.CHERRIFT_V0555) {
  console.error("[CHERRIFT v0.5.5.6] v0.5.5.5 is required.");
  return;
}

const proto = CherriftGame.prototype;

function getBounds(image, frameCount) {
  const cached = alphaCache.get(image);
  if (cached && cached.frameCount === frameCount) return cached.bounds;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  const frameWidth = image.width / frameCount;
  const bounds = [];

  for (let frame = 0; frame < frameCount; frame++) {
    const sx0 = Math.floor(frame * frameWidth);
    const sx1 = Math.floor((frame + 1) * frameWidth);

    let minX = frameWidth;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < image.height; y++) {
      for (let x = sx0; x < sx1; x++) {
        const alpha = pixels[(y * image.width + x) * 4 + 3];
        if (alpha < 8) continue;
        const lx = x - sx0;
        if (lx < minX) minX = lx;
        if (lx > maxX) maxX = lx;
        if (y > maxY) maxY = y;
      }
    }

    bounds.push(
      maxX < 0
        ? { centerX: frameWidth / 2, bottom: image.height - 8 }
        : { centerX: (minX + maxX) / 2, bottom: maxY }
    );
  }

  alphaCache.set(image, { frameCount, bounds });
  return bounds;
}

function drawAlignedDynamic(game, ctx, player, state, image, frame) {
  const frameCount = Math.max(1, state.frames || 4);
  const sourceWidth = image.width / frameCount;
  const sourceHeight = image.height;
  const bounds = getBounds(image, frameCount)[frame];

  const cfg = CHERRIFT_CONFIG.player;
  const drawWidth = cfg.displayWidth || 116;
  const drawHeight = cfg.displayHeight || 116;
  const scaleX = drawWidth / sourceWidth;
  const scaleY = drawHeight / sourceHeight;

  const centerOffset = (bounds.centerX - sourceWidth / 2) * scaleX;
  const bottomOffset = (sourceHeight - bounds.bottom) * scaleY;

  const dx = Math.round(player.x - drawWidth / 2 - centerOffset);
  const dy = Math.round(player.y - drawHeight + 34 + bottomOffset);

  ctx.drawImage(
    image,
    frame * sourceWidth,
    0,
    sourceWidth,
    sourceHeight,
    dx,
    dy,
    drawWidth,
    drawHeight
  );
}

function nearestLivingEnemy(game, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function applyDrain(game, damage, drainRate, shieldOnFull) {
  const player = game.player;
  if (!player || damage <= 0 || drainRate <= 0) return;

  const heal = damage * drainRate;
  if (player.hp < player.maxHp - 0.01) {
    player.hp = Math.min(player.maxHp, player.hp + heal);
    game.effects.push({
      type: "succubus_heal",
      x: player.x,
      y: player.y - 24,
      t: 0,
      life: 0.42
    });
    return;
  }

  if (shieldOnFull) {
    const cap = Math.max(1, player.hp * 0.15);
    player.soulShield = Math.max(player.soulShield || 0, cap);
    player.soulShieldMax = cap;
    game.effects.push({
      type: "soul_shield",
      x: player.x,
      y: player.y,
      t: 0,
      life: 0.52
    });
  }
}

function spawnSoul(game, angle, target) {
  const speed = 390;
  game.bullets.push({
    customV0556: true,
    x: game.player.x,
    y: game.player.y - 10,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
    life: 1.45,
    r: 12,
    dmg: game.player.damage * 0.88,
    target,
    retargetTimer: 0,
    t: 0,
    hitIds: new Set(),
    pulseSeed: Math.random() * Math.PI * 2
  });
}

const previousSkill = proto.skill;
proto.skill = function skillV0556() {
  const player = this.player;
  if (!player || player.skin !== "succubus_cherry") {
    return previousSkill.call(this);
  }
  if (player.skillTimer > 0) return;

  const skin = this.activeSkinConfig();
  const state = skin?.states?.skill || { duration: 0.5 };
  const duration = state.duration || 0.5;

  player.skillTimer = player.skillCooldown;
  player.skillCastTimer = duration;
  player.skillCastDuration = duration;
  player.skillDir = player.lastDir || "down";

  const living = this.enemies.filter(enemy => !enemy.dead);
  const count = Math.min(12, Math.max(8, living.length ? living.length * 2 : 8));

  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    const target = living.length ? living[i % living.length] : null;
    spawnSoul(this, angle, target);
  }

  this.effects.push({
    type: "soul_drain_cast",
    x: player.x,
    y: player.y,
    t: 0,
    life: 0.48
  });
};

const previousUpdateBullets = proto.updateBullets;
proto.updateBullets = function updateBulletsV0556(dt) {
  const succubusSouls = this.bullets.filter(b => b.customV0556);
  this.bullets = this.bullets.filter(b => !b.customV0556);

  previousUpdateBullets.call(this, dt);
  const others = this.bullets;

  for (const bullet of succubusSouls) {
    bullet.t += dt;
    bullet.life -= dt;
    bullet.retargetTimer = (bullet.retargetTimer || 0) - dt;

    if (bullet.life <= 0 || bullet.dead) continue;

    if (!bullet.target || bullet.target.dead || bullet.retargetTimer <= 0) {
      bullet.target = nearestLivingEnemy(this, bullet.x, bullet.y);
      bullet.retargetTimer = 0.08;
    }

    if (bullet.target) {
      const dx = bullet.target.x - bullet.x;
      const dy = bullet.target.y - bullet.y;
      const len = Math.hypot(dx, dy) || 1;
      const desiredX = dx / len * bullet.speed;
      const desiredY = dy / len * bullet.speed;
      const turn = Math.min(1, dt * 10);
      bullet.vx += (desiredX - bullet.vx) * turn;
      bullet.vy += (desiredY - bullet.vy) * turn;
    } else {
      bullet.life = Math.min(bullet.life, 0.22);
      const len = Math.hypot(bullet.vx, bullet.vy) || 1;
      bullet.vx = bullet.vx / len * bullet.speed * 0.8;
      bullet.vy = bullet.vy / len * bullet.speed * 0.8;
    }

    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    for (const enemy of this.enemies) {
      if (enemy.dead || bullet.hitIds.has(enemy)) continue;
      if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) >= bullet.r + enemy.r) continue;

      bullet.hitIds.add(enemy);

      let damage = bullet.dmg;
      if (Math.random() < this.player.crit) {
        damage *= this.player.critDamage;
        this.effects.push({
          type: "crit",
          x: enemy.x,
          y: enemy.y,
          t: 0,
          life: 0.35
        });
      }

      this.damageEnemy(enemy, damage);
      applyDrain(this, damage, 0.10, true);

      this.effects.push({
        type: "soul_hit",
        x: enemy.x,
        y: enemy.y,
        t: 0,
        life: 0.22
      });

      bullet.dead = true;
      break;
    }
  }

  this.bullets = others.concat(
    succubusSouls.filter(b => !b.dead && b.life > 0)
  );
};

const previousDrawBullet = proto.drawBullet;
proto.drawBullet = function drawBulletV0556(ctx, bullet) {
  if (!bullet.customV0556) {
    return previousDrawBullet.call(this, ctx, bullet);
  }

  const pulse = 1 + Math.sin((this.t || 0) * 9 + (bullet.pulseSeed || 0)) * 0.12;

  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = "#ff3358";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ff5f7d";
  ctx.beginPath();
  ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,210,220,.85)";
  ctx.beginPath();
  ctx.arc(-1.5, -1.5, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,80,112,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.quadraticCurveTo(-12, 7, -16, 0);
  ctx.stroke();

  ctx.restore();
};

const previousDrawPlayer = proto.drawPlayer;
proto.drawPlayer = function drawPlayerV0556(ctx, player) {
  if (player?.skin !== "succubus_cherry") {
    return previousDrawPlayer.call(this, ctx, player);
  }

  const skin = this.activeSkinConfig();
  const skillActive = (player.skillCastTimer || 0) > 0;
  const meleeActive = (player.attackCastTimer || 0) > 0;
  const moving = !!player.moving;

  if (skillActive || meleeActive || moving) {
    return previousDrawPlayer.call(this, ctx, player);
  }

  const dir = player.lastDir || "down";
  const state = skin?.states?.idle;
  const image = this.assets.get(`player_${player.skin}_idle_${dir}`);

  if (!state || !image) {
    return previousDrawPlayer.call(this, ctx, player);
  }

  const frameCount = Math.max(1, state.frames || 4);
  const frame = Math.floor((this.t || 0) * (state.fps || 3)) % frameCount;

  drawAlignedDynamic(this, ctx, player, state, image, frame);

  if (player.soulShield > 0) {
    const ratio = Math.max(0, Math.min(1, player.soulShield / (player.soulShieldMax || 1)));
    ctx.save();
    ctx.globalAlpha = 0.32 + 0.35 * ratio;
    ctx.strokeStyle = "#ff6688";
    ctx.shadowColor = "#ff315d";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 13, 43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

window.CHERRIFT_V0556 = {
  version: VERSION,
  succubusSoulCount: "8-12 dynamic",
  succubusSoulLife: 1.45
};

console.info("[CHERRIFT] v0.5.5.6 Succubus idle + skill fix loaded.");
})();