(() => {
  const CACHE = "026";
  const SKIN_ID = "beastclaw_cherry";
  const DIRS = ["down", "up", "left", "right"];
  const skinPath = (state, dir) => `assets/player/skins/${SKIN_ID}/${SKIN_ID}_${state}_${dir}.png?v=${CACHE}`;

  if (!window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA || !window.CherriftGame) return;

  CHERRIFT_CONFIG.version = "0.2.6-beastclaw";
  CHERRIFT_DATA.version = "0.2.6-beastclaw";

  CHERRIFT_CONFIG.player.skins[SKIN_ID] = {
    id: SKIN_ID,
    folder: SKIN_ID,
    attackType: "melee",
    meleeRange: 112,
    meleeConeDeg: 118,
    meleeDamageMult: 1.18,
    meleeIntervalMult: 0.82,
    skillType: "beastclaw_rend",
    rendDashSpeed: 690,
    rendDashDuration: 0.30,
    rendRadius: 168,
    rendDamageMult: 3.15,
    rendBuffDuration: 3.2,
    states: {
      idle: { fps: 3, frames: 4, dirs: Object.fromEntries(DIRS.map(dir => [dir, skinPath("idle", dir)])) },
      walk: { fps: 8, frames: 6, dirs: Object.fromEntries(DIRS.map(dir => [dir, skinPath("walk", dir)])) },
      attack: { fps: 18, frames: 6, duration: 0.34, dirs: Object.fromEntries(DIRS.map(dir => [dir, skinPath("attack", dir)])) },
      skill: { fps: 16, frames: 6, duration: 0.48, dirs: Object.fromEntries(DIRS.map(dir => [dir, skinPath("skill", dir)])) }
    }
  };

  if (!CHERRIFT_DATA.skins.some(s => s.id === SKIN_ID)) {
    CHERRIFT_DATA.skins.push({
      id: SKIN_ID,
      name: "Beastclaw Cherry",
      rarity: "Rare",
      emoji: "🐺",
      weapon: "Beast Claws",
      skill: "Savage Rend",
      desc: "Rare melee Cherry skin. Közelharci karmolás, rövid előretörés és nagy területű Savage Rend skill.",
      stats: { damage: 5, speed: 10 },
      gradient: ["#ff6aa9", "#20101f"]
    });
  }

  if (window.CherriftStorage && !CherriftStorage.__beastclawDefaultsPatched) {
    const originalDefaults = CherriftStorage.defaults.bind(CherriftStorage);
    CherriftStorage.defaults = function patchedDefaults() {
      const data = originalDefaults();
      if (!data.unlockedSkins.includes(SKIN_ID)) data.unlockedSkins.push(SKIN_ID);
      return data;
    };
    CherriftStorage.__beastclawDefaultsPatched = true;
  }

  const proto = CherriftGame.prototype;
  const originalUpdate = proto.update;
  const originalAutoFire = proto.autoFire;
  const originalSkill = proto.skill;
  const originalDrawEffect = proto.drawEffect;

  proto.update = function beastclawUpdate(dt) {
    if (this.player) {
      this.player.attackCastTimer = Math.max(0, (this.player.attackCastTimer || 0) - dt);
    }
    return originalUpdate.call(this, dt);
  };

  proto.dirFromVector = function dirFromVector(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
    return dy < 0 ? "up" : "down";
  };

  proto.meleeHit = function meleeHit(angle, range, coneDeg, damage) {
    const p = this.player;
    if (!p) return 0;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const cone = Math.cos((coneDeg * Math.PI / 180) / 2);
    let hits = 0;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const facing = (dx / dist) * ux + (dy / dist) * uy;
      if (dist <= range + e.r && facing >= cone) {
        this.damageEnemy(e, damage);
        hits++;
      }
    }

    this.effects.push({ type: "claw", x: p.x + ux * range * 0.54, y: p.y + uy * range * 0.54, angle, range, t: 0, life: .24 });
    return hits;
  };

  proto.autoFire = function beastclawAutoFire() {
    const skin = this.activeSkinConfig();
    if (skin.attackType !== "melee") return originalAutoFire.call(this);

    const p = this.player;
    if (!p) return;
    const interval = p.fireInterval * (p.skillBuff > 0 ? .52 : 1) * (skin.meleeIntervalMult || 1);
    if (p.fireTimer > 0) return;

    const target = this.nearest((skin.meleeRange || 108) + 38);
    if (!target) return;

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const angle = Math.atan2(dy, dx);
    p.fireTimer = interval;
    p.attackCastDuration = skin.states.attack?.duration || .34;
    p.attackCastTimer = p.attackCastDuration;
    p.attackDir = this.dirFromVector(dx, dy);
    p.lastDir = p.attackDir;

    this.meleeHit(angle, skin.meleeRange || 108, skin.meleeConeDeg || 110, p.damage * (skin.meleeDamageMult || 1));
  };

  proto.skill = function beastclawSkill() {
    const p = this.player;
    if (!p) return;
    const skin = this.activeSkinConfig();
    if (skin.skillType !== "beastclaw_rend") return originalSkill.call(this);
    if (p.skillTimer > 0) return;

    const state = skin.states.skill;
    const duration = state.duration || .48;
    const mv = this.input.getMoveVector();
    const v = Math.hypot(mv.x, mv.y) > .08 ? mv : this.dirVector(p.lastDir || "down");
    const angle = Math.atan2(v.y, v.x);

    p.skillTimer = p.skillCooldown;
    p.skillCastTimer = duration;
    p.skillCastDuration = duration;
    p.skillDir = this.dirFromVector(v.x, v.y);
    p.lastDir = p.skillDir;
    p.dashDir = v;
    p.dashTimer = skin.rendDashDuration || .28;
    p.dashSpeed = skin.rendDashSpeed || 680;
    p.invuln = Math.max(p.invuln || 0, p.dashTimer + .08);
    p.skillBuff = Math.max(p.skillBuff || 0, skin.rendBuffDuration || 3.0);

    const radius = skin.rendRadius || 160;
    this.effects.push({ type: "clawBurst", x: p.x, y: p.y, angle, r: radius, t: 0, life: .48 });
    for (const e of this.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.r) this.damageEnemy(e, p.damage * (skin.rendDamageMult || 3));
    }
  };

  proto.drawPlayer = function beastclawDrawPlayer(c, p) {
    const skin = this.activeSkinConfig();
    const skillActive = (p.skillCastTimer || 0) > 0;
    const attackActive = !skillActive && (p.attackCastTimer || 0) > 0 && skin.states.attack;
    const dir = skillActive ? (p.skillDir || p.lastDir || "down") : attackActive ? (p.attackDir || p.lastDir || "down") : (p.lastDir || "down");
    const stateName = skillActive ? "skill" : attackActive ? "attack" : (p.moving ? "walk" : "idle");
    const state = skin.states[stateName];
    const img = this.assets.get(`player_${p.skin}_${stateName}_${dir}`);

    if (img && state) {
      const cfg = CHERRIFT_CONFIG.player;
      const realFrames = Math.max(1, Math.floor(img.width / cfg.frameWidth));
      const frameCount = Math.max(1, Math.min(state.frames || realFrames, realFrames));
      let frame = 0;

      if (stateName === "skill") {
        const elapsed = Math.max(0, (p.skillCastDuration || state.duration || .4) - (p.skillCastTimer || 0));
        frame = Math.min(frameCount - 1, Math.floor(elapsed * (state.fps || 12)));
      } else if (stateName === "attack") {
        const elapsed = Math.max(0, (p.attackCastDuration || state.duration || .34) - (p.attackCastTimer || 0));
        frame = Math.min(frameCount - 1, Math.floor(elapsed * (state.fps || 18)));
      } else {
        frame = Math.floor(this.t * (state.fps || 6)) % frameCount;
      }

      const dw = cfg.displayWidth || 116;
      const dh = cfg.displayHeight || 116;
      c.drawImage(
        img,
        frame * cfg.frameWidth, 0,
        cfg.frameWidth, cfg.frameHeight,
        Math.round(p.x - dw / 2),
        Math.round(p.y - dh + 34),
        dw, dh
      );
      return;
    }

    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(p.x, p.y + 24, 28, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.skin === "fairy_cherry" ? "#caffdf" : p.skin === SKIN_ID ? "#ff8fba" : "#ffc1dc";
    c.beginPath(); c.arc(p.x, p.y, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ff77b9"; c.beginPath(); c.ellipse(p.x - 11, p.y - 28, 8, 24, -.35, 0, Math.PI * 2); c.ellipse(p.x + 11, p.y - 28, 8, 24, .35, 0, Math.PI * 2); c.fill();
  };

  proto.drawEffect = function beastclawDrawEffect(c, e) {
    const a = 1 - e.t / e.life;

    if (e.type === "claw") {
      c.save();
      c.globalAlpha = Math.max(0, a);
      c.translate(e.x, e.y);
      c.rotate(e.angle);
      c.strokeStyle = "#ffd2e9";
      c.shadowColor = "#ff4fa3";
      c.shadowBlur = 18;
      c.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        c.lineWidth = 5 - Math.abs(i);
        c.beginPath();
        c.arc(0, i * 13, 38 + i * 4, -.72, .72);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (e.type === "clawBurst") {
      c.save();
      c.globalAlpha = Math.max(0, a);
      c.translate(e.x, e.y);
      c.rotate(e.angle);
      c.strokeStyle = "#ff8ccc";
      c.shadowColor = "#ff2f96";
      c.shadowBlur = 22;
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        c.lineWidth = 6;
        c.beginPath();
        c.arc(0, 0, (e.r || 160) * (0.36 + (1 - a) * .58), -.36, .36);
        c.stroke();
      }
      c.restore();
      return;
    }

    return originalDrawEffect.call(this, c, e);
  };
})();
