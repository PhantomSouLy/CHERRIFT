(() => {
"use strict";

const VERSION = "0.8.5-combat-feel";
const DISPLAY_VERSION = "v0.8.5";
const id = value => document.getElementById(value);
const isMobile = () => Math.min(window.innerWidth || 1280, window.innerHeight || 720) <= 860;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

if (!window.CherriftGame || !window.UI || !window.CHERRIFT_CONFIG) return;

function ensureCss() {
  if (id("v085css")) return;
  const link = document.createElement("link");
  link.id = "v085css";
  link.rel = "stylesheet";
  link.href = "v085.css?v=090";
  document.head.appendChild(link);
}

function normalizeSettings(save) {
  if (!save) return save;
  save.settings ||= {};
  if (!["low", "medium", "high"].includes(save.settings.effectQuality)) {
    save.settings.effectQuality = isMobile() ? "medium" : "high";
  }
  if (!["off", "low", "full"].includes(save.settings.cameraMotion)) save.settings.cameraMotion = "full";
  if (!["off", "low", "full"].includes(save.settings.screenShake)) save.settings.screenShake = "low";
  save.settings.combatSounds ??= true;
  return save;
}

function addSetting(page, key, label, help, options) {
  if (!page || id(`${key}V085`)) return;
  const line = document.createElement("label");
  line.className = "setting-line-v060 setting-line-v085";
  line.innerHTML = `<span><b>${label}</b><small>${help}</small></span><select id="${key}V085">${options.map(option => `<option value="${option[0]}">${option[1]}</option>`).join("")}</select>`;
  page.appendChild(line);
}

function ensureSettings() {
  normalizeSettings(UI.save);
  const display = document.querySelector('[data-v060-settings-page="display"]');
  const gameplay = document.querySelector('[data-v060-settings-page="gameplay"]');
  addSetting(display, "effectQuality", "Effect quality", "Particle density and glow cost", [["low", "Low"], ["medium", "Medium"], ["high", "High"]]);
  addSetting(display, "cameraMotion", "Camera motion", "Speed zoom, dash kick and look-ahead", [["off", "Off"], ["low", "Low"], ["full", "Full"]]);
  addSetting(gameplay, "screenShake", "Screen shake", "Impact feedback without moving the HUD", [["off", "Off"], ["low", "Low"], ["full", "Full"]]);
  const sound = id("combatSoundsV085") || document.createElement("label");
  if (!id("combatSoundsV085") && gameplay) {
    sound.className = "setting-line-v060 setting-line-v085";
    sound.innerHTML = '<span><b>Combat sounds</b><small>Procedural attack, hit, skill and pickup cues</small></span><input id="combatSoundsV085" type="checkbox">';
    gameplay.appendChild(sound);
  }
  const settings = UI.save?.settings || {};
  if (id("effectQualityV085")) id("effectQualityV085").value = settings.effectQuality;
  if (id("cameraMotionV085")) id("cameraMotionV085").value = settings.cameraMotion;
  if (id("screenShakeV085")) id("screenShakeV085").value = settings.screenShake;
  if (id("combatSoundsV085")) id("combatSoundsV085").checked = settings.combatSounds !== false;
}

function saveSetting(key, value) {
  if (!UI.save) return;
  normalizeSettings(UI.save);
  UI.save.settings[key] = value;
  window.CherriftStorage?.save?.(UI.save);
}

function bindSettings() {
  if (document.documentElement.dataset.v085Settings) return;
  document.documentElement.dataset.v085Settings = "1";
  document.addEventListener("change", event => {
    if (event.target.id === "effectQualityV085") saveSetting("effectQuality", event.target.value);
    if (event.target.id === "cameraMotionV085") saveSetting("cameraMotion", event.target.value);
    if (event.target.id === "screenShakeV085") saveSetting("screenShake", event.target.value);
    if (event.target.id === "combatSoundsV085") saveSetting("combatSounds", event.target.checked);
  });
}

const previousInit = UI.init?.bind(UI);
if (previousInit && !UI.__v085Init) {
  UI.init = function initV085(save, game) {
    normalizeSettings(save);
    const result = previousInit(save, game);
    ensureSettings();
    return result;
  };
  UI.__v085Init = true;
}

const proto = CherriftGame.prototype;

function motionLevel(game, key) {
  const value = normalizeSettings(game.save)?.settings?.[key] || "low";
  if (normalizeSettings(game.save)?.settings?.reducedMotion) return 0;
  return value === "full" ? 1 : value === "low" ? .45 : 0;
}

function quality(game) {
  const value = normalizeSettings(game.save)?.settings?.effectQuality;
  return value === "high" ? 1 : value === "medium" ? .62 : .32;
}

function playCue(game, type) {
  const settings = normalizeSettings(game.save)?.settings || {};
  if (settings.combatSounds === false || Number(settings.volume ?? 60) <= 0) return;
  const now = performance.now();
  if (now - (game.__lastCueV085 || 0) < 32) return;
  game.__lastCueV085 = now;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    const audio = game.__audioV085 ||= new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const values = { hit:[170,.026], crit:[260,.045], skill:[390,.07], pickup:[620,.035], death:[115,.06] }[type] || [220,.025];
    oscillator.type = type === "skill" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(values[0], audio.currentTime);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(.003, Number(settings.volume || 60) / 100 * .035), audio.currentTime + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + values[1]);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + values[1] + .01);
  } catch (_) {}
}

const previousStart = proto.start;
proto.start = async function startV085(...args) {
  const result = await previousStart.apply(this, args);
  normalizeSettings(this.save);
  this.__cameraZoomV085 = null;
  this.__introZoomV085 = 1;
  this.__shakeV085 = 0;
  this.__hitStopV085 = 0;
  this.__trailTimerV085 = 0;
  this.__lastPlayerPosV085 = this.player ? {x:this.player.x, y:this.player.y} : null;
  return result;
};

const previousUpdate = proto.update;
proto.update = function updateV085(dt) {
  if (this.__hitStopV085 > 0) {
    this.__hitStopV085 = Math.max(0, this.__hitStopV085 - dt);
    this.__shakeV085 = Math.max(0, (this.__shakeV085 || 0) - dt * 20);
    UI.updateHUD?.(this);
    return;
  }
  const before = this.player ? {x:this.player.x, y:this.player.y} : null;
  const result = previousUpdate.call(this, dt);
  const player = this.player;
  if (!player || this.mode !== "playing") return result;
  const dx = before ? player.x - before.x : 0;
  const dy = before ? player.y - before.y : 0;
  const speed = Math.hypot(dx, dy) / Math.max(.001, dt);
  player.__renderSpeedV085 = speed;
  player.__renderLeanV085 = clamp(dx / Math.max(.001, dt) / Math.max(1, player.speed), -1, 1);
  this.__introZoomV085 = Math.max(0, (this.__introZoomV085 || 0) - dt / 2.2);
  const base = isMobile() ? (innerHeight >= innerWidth ? 1.39 : 1.32) : 1.34;
  const viewZoom = [1, 1.1, 1.2].includes(Number(this.save?.settings?.viewZoom)) ? Number(this.save.settings.viewZoom) : 1;
  const motion = motionLevel(this, "cameraMotion");
  const speedFactor = clamp(speed / Math.max(1, player.speed * 1.8), 0, 1);
  const dashFactor = player.dashTimer > 0 ? 1 : 0;
  const mobileScale = isMobile() ? .72 : 1;
  const target = base * viewZoom + (this.__introZoomV085 || 0) * .08 - motion * mobileScale * (speedFactor * .10 + dashFactor * .12);
  this.__cameraZoomV085 = this.__cameraZoomV085 == null ? target : this.__cameraZoomV085 + (target - this.__cameraZoomV085) * Math.min(1, dt * (dashFactor ? 12 : 4.5));
  if (motion > 0 && this.camera) {
    const look = isMobile() ? .055 : .09;
    this.camera.x += dx / Math.max(.001, dt) * look * motion * dt;
    this.camera.y += dy / Math.max(.001, dt) * look * motion * dt;
  }
  this.__shakeV085 = Math.max(0, (this.__shakeV085 || 0) - dt * 18);
  this.__trailTimerV085 = Math.max(0, (this.__trailTimerV085 || 0) - dt);
  if ((speed > player.speed * .75 || player.dashTimer > 0) && this.__trailTimerV085 <= 0) {
    this.__trailTimerV085 = .075 / Math.max(.35, quality(this));
    this.effects.push({type:"motionTrailV085", x:player.x-dx*2, y:player.y-dy*2, t:0, life:.28, dash:player.dashTimer>0});
  }
  const cap = Math.round(58 + quality(this) * 72);
  if (this.effects.length > cap) this.effects.splice(0, this.effects.length - cap);
  if (this.bullets.length > 180) this.bullets = this.bullets.slice(-180);
  return result;
};

const previousDamageEnemy = proto.damageEnemy;
proto.damageEnemy = function damageEnemyV085(enemy, damage) {
  const beforeEffects = this.effects?.length || 0;
  const wasDead = !!enemy?.dead;
  const result = previousDamageEnemy.call(this, enemy, damage);
  const recent = (this.effects || []).slice(beforeEffects);
  const text = recent.find(effect => effect.type === "damageText");
  const critical = recent.some(effect => effect.type === "crit") || damage > (this.player?.damage || 20) * 1.42;
  if (text) text.kindV085 = enemy?.poisonTimeV0553 > 0 ? "poison" : critical ? "crit" : "damage";
  const meaningful = damage >= (this.player?.damage || 20) * .28 && !(enemy?.poisonTimeV0553 > 0);
  if (meaningful) {
    const force = critical ? 1 : .58;
    this.__shakeV085 = Math.max(this.__shakeV085 || 0, force * motionLevel(this, "screenShake"));
    if ((this.__hitStopCooldownV085 || 0) <= performance.now()) {
      this.__hitStopV085 = Math.max(this.__hitStopV085 || 0, critical ? .032 : .016);
      this.__hitStopCooldownV085 = performance.now() + 48;
    }
    playCue(this, critical ? "crit" : "hit");
  }
  if (!wasDead && enemy?.dead) {
    this.__shakeV085 = Math.max(this.__shakeV085 || 0, .82 * motionLevel(this, "screenShake"));
    playCue(this, "death");
  }
  return result;
};

const previousSkill = proto.skill;
proto.skill = function skillV085(...args) {
  const ready = !!this.player && this.player.skillTimer <= 0;
  const result = previousSkill.apply(this, args);
  if (ready && this.player?.skillTimer > 0) {
    this.effects.push({type:"skillPulseV085", x:this.player.x, y:this.player.y, t:0, life:.38});
    this.__shakeV085 = Math.max(this.__shakeV085 || 0, .55 * motionLevel(this, "screenShake"));
    playCue(this, "skill");
    document.body.classList.remove("skill-cast-v085");
    void document.body.offsetWidth;
    document.body.classList.add("skill-cast-v085");
    setTimeout(() => document.body.classList.remove("skill-cast-v085"), 260);
  }
  return result;
};

const previousUpdatePickups = proto.updatePickups;
proto.updatePickups = function updatePickupsV085(dt) {
  const before = this.pickups?.length || 0;
  const result = previousUpdatePickups.call(this, dt);
  if ((this.pickups?.length || 0) < before && this.player) {
    this.effects.push({type:"pickupBurstV085", x:this.player.x, y:this.player.y-12, t:0, life:.34});
    playCue(this, "pickup");
  }
  return result;
};

const previousDrawPlayer = proto.drawPlayer;
proto.drawPlayer = function drawPlayerV085(context, player) {
  const reduce = this.save?.settings?.reducedMotion;
  if (reduce || !player) return previousDrawPlayer.call(this, context, player);
  const moving = player.moving || player.dashTimer > 0;
  const bob = moving ? Math.sin(this.t * 13) * 1.7 : Math.sin(this.t * 3.4) * .8;
  const lean = clamp(player.__renderLeanV085 || 0, -1, 1) * (player.dashTimer > 0 ? .075 : .035);
  const squash = player.dashTimer > 0 ? 1.035 : 1 + Math.sin(this.t * 6) * .006;
  context.save();
  context.translate(player.x, player.y + 28);
  context.rotate(lean);
  context.scale(squash, 2 - squash);
  context.translate(-player.x, -player.y - 28 + bob);
  const result = previousDrawPlayer.call(this, context, player);
  context.restore();
  return result;
};

const previousDrawBullet = proto.drawBullet;
proto.drawBullet = function drawBulletV085(context, bullet) {
  if (!["orb", "petal"].includes(bullet?.style)) return previousDrawBullet.call(this, context, bullet);
  const speed = Math.hypot(bullet.vx || 0, bullet.vy || 0) || 1;
  const alpha = clamp((bullet.life || 0) / .18, 0, 1);
  context.save();
  context.globalAlpha = alpha * .35;
  context.strokeStyle = bullet.style === "petal" ? "#ffd3ed" : "#ff8ed1";
  context.shadowColor = "#ff66bd";
  context.shadowBlur = 12 * quality(this);
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(bullet.x, bullet.y);
  context.lineTo(bullet.x - bullet.vx / speed * 22, bullet.y - bullet.vy / speed * 22);
  context.stroke();
  context.restore();
  return previousDrawBullet.call(this, context, bullet);
};

const previousDrawEffect = proto.drawEffect;
proto.drawEffect = function drawEffectV085(context, effect) {
  if (effect?.type === "damageText" && effect.kindV085) {
    const alpha = clamp(1 - effect.t / effect.life, 0, 1);
    const colors = {crit:"#ffe47d", poison:"#94ff89", heal:"#8dffbd", damage:"#fff5fb"};
    context.save();
    context.globalAlpha = alpha;
    context.textAlign = "center";
    context.font = `800 ${effect.kindV085 === "crit" ? 25 : 18}px system-ui,sans-serif`;
    context.lineWidth = 4;
    context.strokeStyle = "rgba(18,5,22,.78)";
    context.fillStyle = colors[effect.kindV085] || colors.damage;
    const label = `${effect.kindV085 === "crit" ? "✦ " : ""}${effect.value}`;
    const y = effect.y - (1 - alpha) * 30;
    context.strokeText(label, effect.x, y);
    context.fillText(label, effect.x, y);
    context.restore();
    return;
  }
  if (!["motionTrailV085", "pickupBurstV085", "skillPulseV085"].includes(effect?.type)) {
    return previousDrawEffect.call(this, context, effect);
  }
  const alpha = clamp(1 - effect.t / effect.life, 0, 1);
  context.save();
  context.globalAlpha = alpha * (effect.type === "motionTrailV085" ? .28 : .8);
  context.translate(effect.x, effect.y);
  if (effect.type === "motionTrailV085") {
    context.fillStyle = effect.dash ? "#ffe3f5" : "#ff91c9";
    context.shadowColor = "#ff5ab0";
    context.shadowBlur = 12;
    context.beginPath();
    context.ellipse(0, 0, 12 + (1-alpha)*9, 5 + (1-alpha)*4, 0, 0, Math.PI*2);
    context.fill();
  } else {
    context.strokeStyle = effect.type === "skillPulseV085" ? "#ff7dc5" : "#fff1a6";
    context.lineWidth = effect.type === "skillPulseV085" ? 5 : 3;
    context.beginPath();
    context.arc(0, 0, 10 + (1-alpha) * (effect.type === "skillPulseV085" ? 62 : 28), 0, Math.PI*2);
    context.stroke();
  }
  context.restore();
};

function visible(object, minX, maxX, minY, maxY, margin) {
  const x = object?.x || 0, y = object?.y || 0, radius = object?.r || 40;
  return x + radius + margin >= minX && x - radius - margin <= maxX && y + radius + margin >= minY && y - radius - margin <= maxY;
}

proto.drawWorld = function drawWorldV085(context) {
  const night = this.stage?.world === 2 || this.stage?.theme === "forest_night";
  context.fillStyle = night ? "#101c2d" : "#1f7d45";
  context.fillRect(0, 0, this.w, this.h);
  const zoom = clamp(this.__cameraZoomV085 || (isMobile() ? 1.39 : 1.34), 1.05, 1.72);
  this.zoom = zoom;
  const viewWidth = this.w / zoom, viewHeight = this.h / zoom;
  const shake = (this.__shakeV085 || 0) * (isMobile() ? 4 : 6);
  const shakeX = shake ? (Math.random() - .5) * shake : 0;
  const shakeY = shake ? (Math.random() - .5) * shake : 0;
  const minX = this.camera.x - viewWidth / 2, maxX = this.camera.x + viewWidth / 2;
  const minY = this.camera.y - viewHeight / 2, maxY = this.camera.y + viewHeight / 2;
  context.save();
  context.translate(this.w / 2 + shakeX, this.h / 2 + shakeY);
  context.scale(zoom, zoom);
  context.translate(-this.camera.x, -this.camera.y);
  this.drawGround(context, zoom);
  const drawables = [];
  for (const item of this.obstacles || []) if (visible(item,minX,maxX,minY,maxY,night?90:150)) drawables.push(item);
  for (const item of this.pickups || []) if (visible(item,minX,maxX,minY,maxY,70)) drawables.push(item);
  for (const item of this.enemies || []) if (visible(item,minX,maxX,minY,maxY,150)) drawables.push(item);
  if (this.player) drawables.push(this.player);
  for (const item of this.bullets || []) if (visible(item,minX,maxX,minY,maxY,100)) drawables.push(item);
  for (const item of this.effects || []) if (visible(item,minX,maxX,minY,maxY,210)) drawables.push(item);
  drawables.sort((a,b) => (a.y || 0) - (b.y || 0));
  for (const item of drawables) this.drawObj(context, item);
  context.restore();
};

ensureCss();
bindSettings();
window.CHERRIFT_V085 = {version:VERSION, displayVersion:DISPLAY_VERSION, normalizeSettings, ensureSettings};
console.info("[CHERRIFT] v0.8.5 Combat Feel loaded.");
})();
