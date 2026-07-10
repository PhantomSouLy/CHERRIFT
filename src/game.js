class ImageAssets {
  constructor() {
    this.images = {};
    this.ready = false;
  }

  loadImage(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(true); };
      img.onerror = () => { console.warn("Missing image:", key, src); resolve(false); };
      img.src = src;
    });
  }

  async loadAll() {
    const c = CHERRIFT_CONFIG;
    const items = [];

    for (const [skinId, skin] of Object.entries(c.player.skins || {})) {
      for (const [stateName, state] of Object.entries(skin.states || {})) {
        for (const [dirName, src] of Object.entries(state.dirs || {})) {
          items.push([`player_${skinId}_${stateName}_${dirName}`, src]);
        }
      }
    }

    items.push(
      ["slime", c.slime.src],
      ["grass", c.map.grass],
      ["rockSmall", c.map.rockSmall],
      ["rockBig", c.map.rockBig],
      ["bush1", c.map.bush1],
      ["bush2", c.map.bush2],
      ["log", c.map.log],
      ["treeSmall", c.map.treeSmall],
      ["treeBig", c.map.treeBig],
      ["xpSmall", c.pickups.xpSmall],
      ["xpBig", c.pickups.xpBig],
      ["burst", c.effects.burst]
    );

    (c.effects.baseHit || []).forEach((src, i) => items.push([`baseHit${i + 1}`, src]));

    await Promise.all(items.map(([key, src]) => this.loadImage(key, src)));
    this.ready = true;
  }

  get(key) { return this.images[key] || null; }
}

class CherriftGame {
  constructor(canvas, input, save) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.save = save;
    this.mode = "menu";
    this.dpr = Math.max(1, Math.min(CHERRIFT_CONFIG.performance?.renderScaleMax || 1.5, window.devicePixelRatio || 1));
    this.w = 0;
    this.h = 0;
    this.last = performance.now();
    this.hitFx = 0;
    this.fpsLimit = this.save?.settings?.fpsLimit || CHERRIFT_CONFIG.performance?.defaultFpsLimit || 60;
    this.camera = { x:0, y:0 };
    this.t = 0;
    this.assets = new ImageAssets();
    this.assetReady = this.assets.loadAll();
    this.player = null;
    this.obstacles = [];
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.effects = [];
    this.runCoins = 0;
    this.time = 0;
    this.kills = 0;
    this.spawnTimer = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame(n => this.loop(n));
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(320, r.width || innerWidth);
    this.h = Math.max(240, r.height || innerHeight);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "medium";
  }

  activeSkinData() {
    return CHERRIFT_DATA.skins.find(s => s.id === this.save.selectedSkin) || CHERRIFT_DATA.skins[0];
  }

  activeSkinConfig() {
    return CHERRIFT_CONFIG.player.skins[this.save.selectedSkin] || CHERRIFT_CONFIG.player.skins[CHERRIFT_CONFIG.player.defaultSkin];
  }

  async start() {
    await this.assetReady;
    const skin = this.activeSkinData();
    const gear = UI.totalGearStats(this.save);
    this.mode = "playing";
    document.body.classList.add("is-playing");
    this.runCoins = 0;
    this.time = 0;
    this.kills = 0;
    this.player = {
      x:0, y:0, r:18,
      hp:100 + (gear.maxHp || 0),
      maxHp:100 + (gear.maxHp || 0),
      speed:235 + (skin.stats.speed || 0) + (gear.moveSpeed || 0),
      damage:20 + (skin.stats.damage || 0) + (gear.damage || 0),
      fireInterval:Math.max(.18, .42 / (1 + (gear.attackSpeed || 0) / 100)),
      fireTimer:0,
      bulletSpeed:560,
      pickup:110 + (gear.pickup || 0),
      crit:.05 + (gear.crit || 0) / 100,
      critDamage:1.5 + (gear.critDamage || 0) / 100,
      armor:gear.armor || 0,
      regen:gear.regen || 0,
      level:1,
      xp:0,
      xpNext:18,
      skillTimer:0,
      skillCooldown:8,
      skillCastTimer:0,
      skillCastDuration:0,
      dashTimer:0,
      skin:skin.id,
      skillBuff:0,
      lastDir:"down",
      moving:false
    };
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.effects = [];
    this.obstacles = this.generateMap();
    this.spawnTimer = 0;
    this.camera = { x:this.player.x, y:this.player.y };
    this.last = performance.now();
    UI.showGame();
  }

  generateMap() {
    const obs = [];
    const add = (kind, count, r, solid=true) => {
      for (let i=0; i<count; i++) {
        let x = 0, y = 0, ok = false;
        for (let t=0; t<90 && !ok; t++) {
          x = (Math.random() - .5) * 3600;
          y = (Math.random() - .5) * 3600;
          ok = Math.hypot(x, y) > 260 && obs.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 38);
        }
        if (ok) obs.push({ kind, x, y, r, solid, phase:Math.random()*9 });
      }
    };
    add("treeBig", 8, 74, true);
    add("treeSmall", 12, 54, true);
    add("log", 14, 48, true);
    add("bush1", 14, 42, true);
    add("bush2", 13, 42, true);
    add("rockBig", 9, 38, true);
    add("rockSmall", 16, 30, true);
    add("flowers", 48, 18, false);
    return obs;
  }

  loop(now) {
    const fps = Math.max(30, Math.min(60, +(this.save?.settings?.fpsLimit || CHERRIFT_CONFIG.performance?.defaultFpsLimit || 60)));
    const minFrameMs = 1000 / fps;
    if (now - this.last < minFrameMs - 0.5) {
      requestAnimationFrame(n => this.loop(n));
      return;
    }

    const dt = Math.min(.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.t += dt;
    if (this.mode === "playing") this.update(dt);
    this.render();
    requestAnimationFrame(n => this.loop(n));
  }

  update(dt) {
    const p = this.player;
    if (!p) return;
    this.time += dt;
    p.fireTimer -= dt;
    p.skillTimer = Math.max(0, p.skillTimer - dt);
    p.skillBuff = Math.max(0, (p.skillBuff || 0) - dt);
    p.skillCastTimer = Math.max(0, (p.skillCastTimer || 0) - dt);
    p.invuln = Math.max(0, (p.invuln || 0) - dt);
    if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    const mv = this.input.getMoveVector();
    p.moving = !!(Math.abs(mv.x) > .04 || Math.abs(mv.y) > .04);
    if (p.moving) {
      p.lastDir = Math.abs(mv.x) > Math.abs(mv.y) ? (mv.x < 0 ? "left" : "right") : (mv.y < 0 ? "up" : "down");
    }
    this.movePlayer(mv, dt);

    if ((p.dashTimer || 0) > 0) {
      const old = p.speed;
      p.speed = p.dashSpeed || 760;
      this.movePlayer(p.dashDir || this.dirVector(p.lastDir), dt);
      p.speed = old;
      p.dashTimer = Math.max(0, p.dashTimer - dt);
    }

    if (this.input.consumeSkill()) this.skill();
    this.spawn(dt);
    this.autoFire();
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.effects.forEach(e => e.t += dt);
    this.effects = this.effects.filter(e => e.t < e.life);
    this.camera.x += (p.x - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (p.y - this.camera.y) * Math.min(1, dt * 8);
    UI.updateHUD(this);
    if (p.hp <= 0) this.gameOver();
  }

  dirVector(dir) {
    if (dir === "left") return { x:-1, y:0 };
    if (dir === "right") return { x:1, y:0 };
    if (dir === "up") return { x:0, y:-1 };
    return { x:0, y:1 };
  }

  movePlayer(mv, dt) {
    const p = this.player;
    const half = CHERRIFT_CONFIG.worldSize / 2 - 200;
    const tryMove = (dx, dy) => {
      if (!dx && !dy) return;
      p.x = Math.max(-half, Math.min(half, p.x + dx));
      p.y = Math.max(-half, Math.min(half, p.y + dy));
      if (this.hitObstacle()) {
        p.x -= dx;
        p.y -= dy;
      }
    };
    tryMove(mv.x * p.speed * dt, 0);
    tryMove(0, mv.y * p.speed * dt);
  }

  hitObstacle() {
    const p = this.player;
    return this.obstacles.some(o => o.solid && Math.hypot(p.x - o.x, p.y - o.y) < p.r + o.r * .62);
  }

  spawn(dt) {
    this.spawnTimer -= dt;
    const max = 22 + Math.floor(this.time / 10);
    if (this.spawnTimer <= 0 && this.enemies.length < max) {
      this.spawnTimer = Math.max(.24, 1.18 / (1 + this.time / 80));
      const count = 1 + Math.floor(this.time / 45);
      for (let i=0; i<count; i++) this.spawnEnemy();
    }
  }

  spawnEnemy() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(this.w, this.h) * .68 + 120;
    const roll = Math.random();
    const type = roll < .62 ? "green" : roll < .86 ? "blue" : "pink";
    const spec = type === "green" ? { hp:40, speed:70, r:22, xp:3 } : type === "blue" ? { hp:65, speed:58, r:26, xp:5 } : { hp:34, speed:105, r:20, xp:4 };
    const scale = 1 + this.time / 120;
    this.enemies.push({
      type,
      x:this.player.x + Math.cos(a) * d,
      y:this.player.y + Math.sin(a) * d,
      r:spec.r,
      hp:spec.hp * scale,
      maxHp:spec.hp * scale,
      speed:spec.speed * (1 + this.time / 240),
      xp:spec.xp,
      hit:0,
      phase:Math.random()*9
    });
  }

  nearest(range=720) {
    let best = null;
    let bd = range;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  autoFire() {
    const p = this.player;
    const interval = p.fireInterval * (p.skillBuff > 0 ? .55 : 1);
    if (p.fireTimer > 0) return;
    const e = this.nearest();
    if (!e) return;
    p.fireTimer = interval;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    const style = p.skin === "fairy_cherry" ? "petal" : "orb";
    this.bullets.push({ x:p.x, y:p.y - 10, vx:dx/l * p.bulletSpeed, vy:dy/l * p.bulletSpeed, r:style === "petal" ? 8 : 7, dmg:p.damage, life:1.45, style });
  }

  updateBullets(dt) {
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.dead = true;
          let dmg = b.dmg;
          if (Math.random() < this.player.crit) { dmg *= this.player.critDamage; this.effects.push({ type:"crit", x:e.x, y:e.y, t:0, life:.35 }); }
          this.damageEnemy(e, dmg);
          this.hitFx = (this.hitFx % 3) + 1;
          this.effects.push({ type:"hit", x:b.x, y:b.y, t:0, life:.22, style:b.style, imgKey:`baseHit${this.hitFx}` });
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead && b.life > 0);
  }

  damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.hit = .08;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.kills++;
      this.pickups.push({ type:"xp", x:e.x, y:e.y, value:e.xp, r:e.xp >= 5 ? 13 : 10 });
      if (Math.random() < .18) this.pickups.push({ type:"coin", x:e.x + (Math.random() - .5) * 24, y:e.y + (Math.random() - .5) * 24, value:1, r:8 });
      if (Math.random() < .018) this.pickups.push({ type:"key", x:e.x, y:e.y, value:1, r:11 });
      this.effects.push({ type:"death", x:e.x, y:e.y, t:0, life:.34 });
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hit = Math.max(0, e.hit - dt);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const l = Math.hypot(dx, dy) || 1;
      e.x += dx/l * e.speed * dt;
      e.y += dy/l * e.speed * dt;
      if (l < e.r + p.r && !(p.invuln > 0)) {
        const raw = 16 * dt;
        p.hp -= Math.max(2 * dt, raw * (100 / (100 + p.armor * 4)));
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  updatePickups(dt) {
    const p = this.player;
    for (const o of this.pickups) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < p.pickup) {
        const sp = 260 + (1 - d / p.pickup) * 520;
        o.x += (p.x - o.x) / (d || 1) * sp * dt;
        o.y += (p.y - o.y) / (d || 1) * sp * dt;
      }
      if (d < p.r + o.r + 6) {
        o.dead = true;
        if (o.type === "xp") this.gainXp(o.value);
        if (o.type === "coin") { this.runCoins += o.value; this.save.coins += o.value; UI.toast("+1 coin"); }
        if (o.type === "key") { this.save.keys += 1; UI.toast("+1 chest key"); }
      }
    }
    this.pickups = this.pickups.filter(o => !o.dead);
  }

  gainXp(v) {
    const p = this.player;
    p.xp += v;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(p.xpNext * 1.22 + 9);
      this.mode = "level";
      UI.showLevelUp(this);
    }
  }

  applyUpgrade(up) {
    up.apply(this.player);
    this.mode = "playing";
    UI.hideLevelUp();
  }

  skill() {
    const p = this.player;
    if (!p || p.skillTimer > 0) return;
    const skin = this.activeSkinConfig();
    const state = skin.states.skill;
    const duration = state.duration || .4;
    const dir = p.lastDir || "down";
    p.skillTimer = p.skillCooldown;
    p.skillCastTimer = duration;
    p.skillCastDuration = duration;
    p.skillDir = dir;

    if (skin.skillType === "dash") {
      const mv = this.input.getMoveVector();
      const v = Math.hypot(mv.x, mv.y) > .08 ? mv : this.dirVector(dir);
      p.dashDir = v;
      p.dashTimer = skin.dashDuration || duration;
      p.dashSpeed = skin.dashSpeed || 760;
      p.invuln = Math.max(p.invuln || 0, p.dashTimer);
      this.effects.push({ type:"dash", x:p.x, y:p.y, vx:v.x, vy:v.y, t:0, life:.32 });
      for (const e of this.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < skin.dashDamageRadius) this.damageEnemy(e, p.damage * skin.dashDamageMult);
      return;
    }

    const radius = skin.burstRadius || 185;
    this.effects.push({ type:"burst", x:p.x, y:p.y, r:radius, t:0, life:.45 });
    for (const e of this.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.r) this.damageEnemy(e, p.damage * 3.2);
  }

  gameOver() {
    this.mode = "gameover";
    document.body.classList.remove("is-playing");
    if (this.time > this.save.best.time) this.save.best.time = this.time;
    if (this.kills > this.save.best.kills) this.save.best.kills = this.kills;
    CherriftStorage.save(this.save);
    UI.showGameOver(this);
  }

  render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    if (this.mode === "menu") {
      this.drawMenuCanvas(c);
      return;
    }
    if (["playing", "level", "paused", "gameover"].includes(this.mode)) this.drawWorld(c);
  }

  drawMenuCanvas(c) {
    const g = c.createLinearGradient(0, 0, this.w, this.h);
    g.addColorStop(0, "#07030d");
    g.addColorStop(.45, "#1c0b2b");
    g.addColorStop(1, "#06020a");
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
  }

  drawWorld(c) {
    c.fillStyle = "#1f7d45";
    c.fillRect(0, 0, this.w, this.h);
    const zoom = CHERRIFT_CONFIG.performance?.cameraZoom || 1;
    c.save();
    c.translate(this.w / 2, this.h / 2);
    c.scale(zoom, zoom);
    c.translate(-this.camera.x, -this.camera.y);
    this.drawGround(c, zoom);
    const drawables = [...this.obstacles, ...this.pickups, ...this.enemies, ...(this.player ? [this.player] : []), ...this.bullets, ...this.effects];
    drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
    for (const o of drawables) this.drawObj(c, o);
    c.restore();
  }

  drawGround(c, zoom = 1) {
    const tile = this.assets.get("grass");
    const size = 128;
    const viewW = this.w / zoom;
    const viewH = this.h / zoom;
    const startX = Math.floor((this.camera.x - viewW / 2) / size) - 1;
    const endX = Math.floor((this.camera.x + viewW / 2) / size) + 1;
    const startY = Math.floor((this.camera.y - viewH / 2) / size) - 1;
    const endY = Math.floor((this.camera.y + viewH / 2) / size) + 1;
    for (let gx=startX; gx<=endX; gx++) for (let gy=startY; gy<=endY; gy++) {
      const x = gx * size, y = gy * size;
      if (tile) c.drawImage(tile, x, y, size, size);
      else {
        c.fillStyle = (gx + gy) % 2 === 0 ? "#2f9d55" : "#2a934f";
        c.fillRect(x, y, size, size);
      }
    }
  }

  drawObj(c, o) {
    if (o === this.player) return this.drawPlayer(c, o);
    if (o.kind) return this.drawObstacle(c, o);
    if (o.type === "xp" || o.type === "coin" || o.type === "key") return this.drawPickup(c, o);
    if (o.style) return this.drawBullet(c, o);
    if (o.hp !== undefined) return this.drawEnemy(c, o);
    if (o.type) return this.drawEffect(c, o);
  }

  drawImageCentered(c, key, x, y, w, h) {
    const img = this.assets.get(key);
    if (!img) return false;
    c.drawImage(img, x - w/2, y - h/2, w, h);
    return true;
  }

  drawObstacle(c, o) {
    const x = o.x, y = o.y;
    if (o.kind === "treeBig" && this.drawImageCentered(c, "treeBig", x, y-16, 190, 190)) return;
    if (o.kind === "treeSmall" && this.drawImageCentered(c, "treeSmall", x, y-12, 150, 150)) return;
    if (o.kind === "bush1" && this.drawImageCentered(c, "bush1", x, y, 116, 98)) return;
    if (o.kind === "bush2" && this.drawImageCentered(c, "bush2", x, y, 118, 100)) return;
    if (o.kind === "log" && this.drawImageCentered(c, "log", x, y, 132, 82)) return;
    if (o.kind === "rockBig" && this.drawImageCentered(c, "rockBig", x, y, 88, 70)) return;
    if (o.kind === "rockSmall" && this.drawImageCentered(c, "rockSmall", x, y, 70, 54)) return;
    if (o.kind === "flowers") {
      c.fillStyle = "#ff9cc8";
      for (let i=0; i<5; i++) { const a = i / 5 * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a)*8, y + Math.sin(a)*8, 6, 10, a, 0, Math.PI*2); c.fill(); }
      c.fillStyle = "#ffe28a"; c.beginPath(); c.arc(x, y, 5, 0, Math.PI*2); c.fill();
    }
  }

  drawPlayer(c, p) {
    const skin = this.activeSkinConfig();
    const skillActive = (p.skillCastTimer || 0) > 0;
    const dir = skillActive ? (p.skillDir || p.lastDir || "down") : (p.lastDir || "down");
    const stateName = skillActive ? "skill" : (p.moving ? "walk" : "idle");
    const state = skin.states[stateName];
    const img = this.assets.get(`player_${p.skin}_${stateName}_${dir}`);
    if (img) {
      const cfg = CHERRIFT_CONFIG.player;
      const realFrames = Math.max(1, Math.floor(img.width / cfg.frameWidth));
      const frameCount = Math.max(1, Math.min(state.frames || realFrames, realFrames));
      let frame = 0;
      if (stateName === "skill") {
        const elapsed = Math.max(0, (p.skillCastDuration || state.duration || .4) - (p.skillCastTimer || 0));
        frame = Math.min(frameCount - 1, Math.floor(elapsed * (state.fps || 12)));
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
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(p.x, p.y+24, 28, 10, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = p.skin === "fairy_cherry" ? "#caffdf" : "#ffc1dc"; c.beginPath(); c.arc(p.x, p.y, 24, 0, Math.PI*2); c.fill();
    c.fillStyle = "#ff77b9"; c.beginPath(); c.ellipse(p.x-11, p.y-28, 8, 24, -.35, 0, Math.PI*2); c.ellipse(p.x+11, p.y-28, 8, 24, .35, 0, Math.PI*2); c.fill();
  }

  drawEnemy(c, e) {
    const img = this.assets.get("slime");
    if (img) {
      const cfg = CHERRIFT_CONFIG.slime;
      const frame = Math.floor((this.t + e.phase) * 7) % cfg.columns;
      const row = cfg.rows.move;
      c.save();
      if (e.hit > 0) c.globalAlpha = .65;
      c.drawImage(img, frame * cfg.frameWidth, row * cfg.frameHeight, cfg.frameWidth, cfg.frameHeight, e.x - cfg.displayWidth/2, e.y - cfg.displayHeight/2, cfg.displayWidth, cfg.displayHeight);
      c.restore();
      if (e.type !== "green") {
        c.save();
        c.globalAlpha = e.type === "blue" ? .22 : .25;
        c.fillStyle = e.type === "blue" ? "#4ee4ff" : "#ff66b7";
        c.beginPath(); c.ellipse(e.x, e.y, e.r*1.15, e.r*.82, 0, 0, Math.PI*2); c.fill();
        c.restore();
      }
      return;
    }
    c.fillStyle = e.type === "green" ? "#7ee65e" : e.type === "blue" ? "#62d9ff" : "#ff79bf";
    if (e.hit > 0) c.fillStyle = "#fff";
    c.beginPath(); c.ellipse(e.x, e.y, e.r*1.1, e.r*.82, 0, 0, Math.PI*2); c.fill();
  }

  drawBullet(c, b) {
    c.save(); c.translate(b.x, b.y);
    if (b.style === "petal") { c.fillStyle = "#ff8fc7"; c.rotate(Math.atan2(b.vy, b.vx)); c.beginPath(); c.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); c.fill(); }
    else { c.fillStyle = "#ff65b4"; c.shadowColor = "#ff65b4"; c.shadowBlur = 16; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI*2); c.fill(); }
    c.restore();
  }

  drawPickup(c, o) {
    if (o.type === "xp") { const key = o.value >= 5 ? "xpBig" : "xpSmall"; if (this.drawImageCentered(c, key, o.x, o.y, o.value >= 5 ? 34 : 26, o.value >= 5 ? 34 : 26)) return; }
    c.save(); c.translate(o.x, o.y);
    if (o.type === "xp") { c.fillStyle = "#ff90d0"; c.shadowColor = "#ff90d0"; c.shadowBlur = 14; c.beginPath(); c.arc(0, 0, o.r, 0, Math.PI*2); c.fill(); }
    if (o.type === "coin") { c.fillStyle = "#ffd65c"; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI*2); c.fill(); c.fillStyle = "#9b6a00"; c.fillText("c", -3, 4); }
    if (o.type === "key") { c.fillStyle = "#d19b65"; c.font = "20px system-ui"; c.fillText("📦", -10, 7); }
    c.restore();
  }

  drawEffect(c, e) {
    const a = 1 - e.t / e.life;
    const x = e.x, y = e.y;

    if (e.type === "hit") {
      const img = e.imgKey ? this.assets.get(e.imgKey) : null;
      if (img) {
        c.save();
        c.globalAlpha = Math.max(0, a);
        const size = 74 * (1 + (1 - a) * .18);
        c.drawImage(img, x - size / 2, y - size / 2, size, size);
        c.restore();
        return;
      }
    }

    if (e.type === "burst") {
      const img = this.assets.get("burst");
      if (img) {
        c.save();
        c.globalAlpha = Math.max(0, a);
        const size = 170 * (1.15 - a * .15);
        c.drawImage(img, x - size/2, y - size/2, size, size);
        c.restore();
        return;
      }
    }

    c.save();
    c.globalAlpha = Math.max(0, a);
    if (["hit", "death", "crit", "burst", "dash"].includes(e.type)) {
      c.strokeStyle = e.type === "crit" ? "#fff176" : "#ff8ccc";
      c.lineWidth = e.type === "dash" ? 6 : 4;
      c.beginPath();
      c.arc(x, y, (1-a) * (e.type === "dash" ? 80 : 55) + 8, 0, Math.PI*2);
      c.stroke();
    }
    c.restore();
  }
}
window.CherriftGame = CherriftGame;
