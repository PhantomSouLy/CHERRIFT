class AssetLoader {
  constructor() { this.images = {}; }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(true); };
      img.onerror = () => { console.warn("Asset missing:", src); resolve(false); };
      img.src = src;
    });
  }

  async loadAll(onProgress) {
    const items = [
      ["player", GC_CONFIG.assetSpec.player.src],
      ["slime", GC_CONFIG.assetSpec.slime.src],
      ["grass", "assets/map/grass_tile.png"],
      ["rockSmall", "assets/map/rock_small.png"],
      ["rockBig", "assets/map/rock_big.png"],
      ["bush1", "assets/map/bush_01.png"],
      ["bush2", "assets/map/bush_02.png"],
      ["log", "assets/map/log.png"],
      ["treeSmall", "assets/map/tree_small.png"],
      ["treeBig", "assets/map/tree_big.png"],
      ["xpSmall", "assets/pickups/xp_small.png"],
      ["xpBig", "assets/pickups/xp_big.png"],
      ["burst", "assets/effects/pink_burst.png"]
    ];

    let done = 0;
    for (const [key, src] of items) {
      await this.loadImage(key, src);
      done++;
      onProgress?.(done / items.length);
    }
  }
}

class GaCherryGame {
  constructor(canvas, input, profile) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.profile = profile;
    this.assets = new AssetLoader();
    this.mode = "loading";
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.width = 0;
    this.height = 0;
    this.camera = { x: 0, y: 0 };
    this.last = performance.now();
    this.animTime = 0;
    this.menuPetals = [];
    this._resize();
    window.addEventListener("resize", () => this._resize());
    document.addEventListener("visibilitychange", () => { this.last = performance.now(); });
  }

  async init() {
    await this.assets.loadAll((p) => {
      document.getElementById("loadingFill").style.width = `${Math.floor(p * 100)}%`;
    });
    this._initMenuPetals();
    this.mode = "menu";
    this.loop(performance.now());
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(320, rect.width || window.innerWidth);
    this.height = Math.max(240, rect.height || window.innerHeight);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _initMenuPetals() {
    this.menuPetals = Array.from({ length: 42 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      s: 0.6 + Math.random() * 1.8,
      vx: -18 - Math.random() * 20,
      vy: 14 + Math.random() * 22,
      rot: Math.random() * 6.28
    }));
  }

  newRun() {
    const s = GC_CONFIG.baseStats;
    this.mode = "playing";
    this.time = 0;
    this.kills = 0;
    this.stats = { time: 0, kills: 0, level: 1, xp: 0 };
    this.player = {
      x: 0, y: 0, r: s.playerRadius,
      hp: s.maxHp, maxHp: s.maxHp,
      speed: s.playerSpeed,
      level: 1, xp: 0, xpNext: GC_CONFIG.balance.xpToNextBase,
      damage: s.bulletDamage,
      bulletSpeed: s.bulletSpeed,
      fireInterval: s.fireInterval,
      fireTimer: 0,
      skillCooldown: s.skillCooldown,
      skillTimer: 0,
      lastDir: "down",
      invuln: 0
    };
    this.enemies = [];
    this.bullets = [];
    this.xpOrbs = [];
    this.effects = [];
    this.obstacles = this._generateObstacles();
    this.spawnTimer = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.last = performance.now();
    UI.showGame();
  }

  _generateObstacles() {
    const types = [
      { key: "rockSmall", r: 34, count: 18 },
      { key: "rockBig", r: 48, count: 10 },
      { key: "bush1", r: 38, count: 18 },
      { key: "bush2", r: 42, count: 14 },
      { key: "log", r: 48, count: 12 },
      { key: "treeSmall", r: 42, count: 14 },
      { key: "treeBig", r: 58, count: 8 }
    ];

    const obs = [];
    const world = GC_CONFIG.balance.worldSize;
    for (const t of types) {
      for (let i = 0; i < t.count; i++) {
        let x, y, ok = false;
        for (let tries = 0; tries < 60 && !ok; tries++) {
          x = (Math.random() - 0.5) * world;
          y = (Math.random() - 0.5) * world;
          ok = Math.hypot(x, y) > 260 && obs.every(o => Math.hypot(o.x - x, o.y - y) > o.r + t.r + 30);
        }
        if (ok) obs.push({ ...t, x, y });
      }
    }
    return obs;
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.last) / 1000 || 0);
    this.last = now;
    this.animTime += dt;
    if (this.mode === "playing") this.update(dt);
    this.render(dt);
    requestAnimationFrame((n) => this.loop(n));
  }

  update(dt) {
    this.time += dt;
    this.player.fireTimer -= dt;
    this.player.skillTimer = Math.max(0, this.player.skillTimer - dt);
    this.player.invuln = Math.max(0, this.player.invuln - dt);

    const mv = this.input.getMoveVector();
    this._movePlayer(mv, dt);
    if (mv.x || mv.y) {
      this.player.lastDir = Math.abs(mv.x) > Math.abs(mv.y)
        ? (mv.x < 0 ? "left" : "right")
        : (mv.y < 0 ? "up" : "down");
    }

    if (this.input.consumeSkill()) this.useSkill();
    this._spawnUpdate(dt);
    this._autoFire();
    this._updateBullets(dt);
    this._updateEnemies(dt);
    this._updatePickups(dt);
    this._updateEffects(dt);
    this.camera.x += (this.player.x - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (this.player.y - this.camera.y) * Math.min(1, dt * 8);
    UI.updateHUD(this);
    if (this.player.hp <= 0) this.gameOver();
  }

  _movePlayer(mv, dt) {
    const p = this.player;
    const world = GC_CONFIG.balance.worldSize / 2;

    const tryMove = (dx, dy) => {
      p.x += dx;
      p.y += dy;
      p.x = Math.max(-world, Math.min(world, p.x));
      p.y = Math.max(-world, Math.min(world, p.y));
      if (this._playerHitsObstacle()) { p.x -= dx; p.y -= dy; }
    };

    tryMove(mv.x * p.speed * dt, 0);
    tryMove(0, mv.y * p.speed * dt);
  }

  _playerHitsObstacle() {
    const p = this.player;
    return this.obstacles.some(o => Math.hypot(p.x - o.x, p.y - o.y) < p.r + o.r * 0.72);
  }

  _spawnUpdate(dt) {
    const b = GC_CONFIG.balance;
    const difficulty = 1 + this.time / 70;
    const maxEnemies = b.maxEnemiesBase + Math.floor(this.time / 9);
    this.spawnTimer -= dt;
    const spawnEvery = Math.max(0.22, b.enemySpawnEvery / difficulty);

    if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
      this.spawnTimer = spawnEvery;
      const count = 1 + Math.floor(this.time / 55);
      for (let i = 0; i < count; i++) this._spawnEnemy(difficulty);
    }
  }

  _spawnEnemy(difficulty) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.width, this.height) * 0.65 + 90 + Math.random() * 180;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    const hp = GC_CONFIG.balance.enemyBaseHp * (1 + this.time / 120);
    this.enemies.push({
      x, y, r: 24, hp, maxHp: hp,
      speed: GC_CONFIG.balance.enemyBaseSpeed * (0.9 + Math.random() * 0.35) * Math.min(2.1, difficulty),
      hitFlash: 0,
      animOff: Math.random() * 10
    });
  }

  _nearestEnemy(maxRange = 999999) {
    let best = null, bd = maxRange;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  _autoFire() {
    const p = this.player;
    if (p.fireTimer > 0) return;
    const target = this._nearestEnemy(720);
    if (!target) return;
    p.fireTimer = p.fireInterval;
    const dx = target.x - p.x, dy = target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    this.bullets.push({
      x: p.x, y: p.y - 8,
      vx: dx / len * p.bulletSpeed,
      vy: dy / len * p.bulletSpeed,
      r: 7,
      damage: p.damage,
      life: 1.35
    });
  }

  _updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.dead = true;
          this._damageEnemy(e, b.damage);
          this.effects.push({ type: "hit", x: b.x, y: b.y, t: 0, life: 0.18 });
          break;
        }
      }
    }

    this.bullets = this.bullets.filter(b => !b.dead && b.life > 0);
  }

  _damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.hitFlash = 0.08;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.kills++;
      const val = Math.random() < 0.12 ? 5 : 3;
      this.xpOrbs.push({ x: e.x, y: e.y, r: val > 3 ? 14 : 10, value: val });
      this.effects.push({ type: "death", x: e.x, y: e.y, t: 0, life: 0.35 });
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const dx = p.x - e.x, dy = p.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      e.x += dx / len * e.speed * dt;
      e.y += dy / len * e.speed * dt;
      if (len < e.r + p.r) {
        p.hp -= GC_CONFIG.balance.enemyDamagePerSecond * dt;
        p.invuln = 0.08;
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  _updatePickups(dt) {
    const p = this.player;
    for (const orb of this.xpOrbs) {
      const d = Math.hypot(orb.x - p.x, orb.y - p.y);
      if (d < GC_CONFIG.baseStats.magnetRadius) {
        const speed = 260 + (1 - d / GC_CONFIG.baseStats.magnetRadius) * 420;
        orb.x += (p.x - orb.x) / (d || 1) * speed * dt;
        orb.y += (p.y - orb.y) / (d || 1) * speed * dt;
      }
      if (d < p.r + GC_CONFIG.baseStats.pickupRadius) {
        orb.picked = true;
        this._gainXp(orb.value);
      }
    }
    this.xpOrbs = this.xpOrbs.filter(o => !o.picked);
  }

  _gainXp(value) {
    const p = this.player;
    p.xp += value;
    this.stats.xp += value;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(GC_CONFIG.balance.xpToNextBase * Math.pow(1.28, p.level - 1));
      this.mode = "levelup";
      UI.showLevelUp(this._rollUpgrades());
      break;
    }
  }

  _rollUpgrades() {
    const pool = [
      { id: "damage", title: "Pink Bullet +Damage", desc: "+20% lövés sebzés", apply: () => this.player.damage *= 1.20 },
      { id: "rate", title: "Faster Bloom", desc: "+16% gyorsabb automata lövés", apply: () => this.player.fireInterval *= 0.84 },
      { id: "speed", title: "Bunny Steps", desc: "+12% mozgási sebesség", apply: () => this.player.speed *= 1.12 },
      { id: "hp", title: "Sweet Heart", desc: "+25 max HP és gyógyítás", apply: () => { this.player.maxHp += 25; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35); } },
      { id: "bulletSpeed", title: "Swift Petals", desc: "+18% lövedék sebesség", apply: () => this.player.bulletSpeed *= 1.18 },
      { id: "skill", title: "Cherry Burst Cooldown", desc: "Special skill cooldown -15%", apply: () => this.player.skillCooldown *= 0.85 }
    ];

    const choices = [];
    while (choices.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    return choices;
  }

  chooseUpgrade(upgrade) {
    upgrade.apply();
    this.mode = "playing";
    UI.hideLevelUp();
    this.last = performance.now();
  }

  useSkill() {
    const p = this.player;
    if (p.skillTimer > 0 || this.mode !== "playing") return;
    p.skillTimer = p.skillCooldown;
    const radius = 185;
    this.effects.push({ type: "burst", x: p.x, y: p.y, r: radius, t: 0, life: 0.45 });
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < radius + e.r) this._damageEnemy(e, p.damage * 3.2);
    }
  }

  _updateEffects(dt) {
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter(fx => fx.t < fx.life);
  }

  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      UI.showPause();
    }
  }

  resume() {
    if (this.mode === "paused") {
      this.mode = "playing";
      UI.hidePause();
      this.last = performance.now();
    }
  }

  backToMenu() {
    this.mode = "menu";
    UI.showMenu(this.profile);
  }

  gameOver() {
    this.mode = "gameover";
    this.stats.time = this.time;
    this.stats.kills = this.kills;
    this.stats.level = this.player.level;
    ProfileService.finishRun(this.profile, this.stats);
    UI.showGameOver(this.stats, this.profile);
  }

  worldToScreen(x, y) {
    return { x: x - this.camera.x + this.width / 2, y: y - this.camera.y + this.height / 2 };
  }

  render(dt) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.mode === "menu" || this.mode === "loading") this._renderMenuBackdrop(dt);
    else this._renderGame();
  }

  _renderMenuBackdrop(dt) {
    const c = this.ctx;
    const g = c.createRadialGradient(this.width * .55, this.height * .45, 20, this.width * .55, this.height * .45, Math.max(this.width, this.height));
    g.addColorStop(0, "#362047");
    g.addColorStop(.42, "#171025");
    g.addColorStop(1, "#05030b");
    c.fillStyle = g;
    c.fillRect(0, 0, this.width, this.height);

    c.fillStyle = "rgba(255,120,185,.75)";
    for (const p of this.menuPetals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt;
      if (p.x < -20 || p.y > this.height + 20) {
        p.x = this.width + Math.random() * 80;
        p.y = -20 + Math.random() * this.height * .4;
      }
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.beginPath();
      c.ellipse(0, 0, 4 * p.s, 9 * p.s, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.fillStyle = "rgba(0,0,0,.35)";
    c.fillRect(0, this.height * .78, this.width, this.height * .22);
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * this.width;
      c.fillRect(x, this.height * .62 - (i % 5) * 22, 32 + (i % 4) * 12, this.height * .2 + (i % 5) * 22);
    }
  }

  _renderGame() {
    const c = this.ctx;
    this._drawGrass(c);

    const drawables = [];
    for (const o of this.obstacles) drawables.push({ y: o.y, type: "ob", obj: o });
    for (const e of this.enemies) drawables.push({ y: e.y + 20, type: "enemy", obj: e });
    drawables.push({ y: this.player.y + 30, type: "player", obj: this.player });
    drawables.sort((a, b) => a.y - b.y);

    this._drawPickups(c);
    this._drawBullets(c);
    for (const d of drawables) {
      if (d.type === "ob") this._drawObstacle(c, d.obj);
      if (d.type === "enemy") this._drawEnemy(c, d.obj);
      if (d.type === "player") this._drawPlayer(c);
    }
    this._drawEffects(c);
    this._drawWorldBorder(c);
  }

  _drawGrass(c) {
    const img = this.assets.images.grass;
    const tile = 128;
    const startX = Math.floor((this.camera.x - this.width / 2) / tile) * tile;
    const startY = Math.floor((this.camera.y - this.height / 2) / tile) * tile;

    for (let x = startX; x < this.camera.x + this.width / 2 + tile; x += tile) {
      for (let y = startY; y < this.camera.y + this.height / 2 + tile; y += tile) {
        const s = this.worldToScreen(x, y);
        if (img) c.drawImage(img, s.x, s.y, tile, tile);
        else {
          c.fillStyle = "#4d8f4b";
          c.fillRect(s.x, s.y, tile, tile);
        }
      }
    }
  }

  _drawWorldBorder(c) {
    const half = GC_CONFIG.balance.worldSize / 2;
    const tl = this.worldToScreen(-half, -half);
    c.strokeStyle = "rgba(255,255,255,.2)";
    c.lineWidth = 4;
    c.strokeRect(tl.x, tl.y, GC_CONFIG.balance.worldSize, GC_CONFIG.balance.worldSize);
  }

  _drawObstacle(c, o) {
    const img = this.assets.images[o.key];
    const s = this.worldToScreen(o.x, o.y);
    if (img) {
      const scale = o.key.includes("Big") ? 1.18 : 1;
      const w = img.width * scale, h = img.height * scale;
      c.drawImage(img, s.x - w / 2, s.y - h * 0.72, w, h);
    } else {
      c.fillStyle = "#477744";
      c.beginPath();
      c.arc(s.x, s.y, o.r, 0, Math.PI * 2);
      c.fill();
    }
  }

  _drawPlayer(c) {
    const p = this.player;
    const img = this.assets.images.player;
    const spec = GC_CONFIG.assetSpec.player;
    const mv = this.input.getMoveVector();
    const moving = Math.hypot(mv.x, mv.y) > 0.08;
    const dir = p.lastDir || "down";
    const anim = spec.animations || { idle: spec.rows || {}, walk: spec.rows || {} };
    const row = moving ? (anim.walk?.[dir] ?? 0) : (anim.idle?.[dir] ?? 0);

    // FIX: idle-ben nem valt frame-et, mindig az elso frame-et hasznalja.
    // Igy Cherry nem fog allas kozben jobbra-balra ugralni.
    const fps = spec.walkFps || 8;
    const frame = moving ? Math.floor(this.animTime * fps) % spec.columns : 0;

    const crop = spec.crop || {};
    const cropLeft = crop.left || 0;
    const cropTop = crop.top || 0;
    const cropRight = crop.right || 0;
    const cropBottom = crop.bottom || 0;

    const sx = frame * spec.frameWidth + cropLeft;
    const sy = row * spec.frameHeight + cropTop;
    const sw = spec.frameWidth - cropLeft - cropRight;
    const sh = spec.frameHeight - cropTop - cropBottom;

    const dw = spec.displayWidth || 84;
    const dh = spec.displayHeight || 84;
    const s = this.worldToScreen(p.x, p.y);

    c.save();
    if (p.invuln > 0) c.globalAlpha = 0.65;

    if (img) {
      c.drawImage(
        img,
        sx, sy, sw, sh,
        s.x - dw / 2,
        s.y - dh * 0.86,
        dw,
        dh
      );
    } else {
      c.fillStyle = "#ff77b9";
      c.beginPath();
      c.arc(s.x, s.y, 22, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }

  _drawEnemy(c, e) {
    const img = this.assets.images.slime;
    const spec = GC_CONFIG.assetSpec.slime;
    const frame = Math.floor((this.animTime + e.animOff) * (spec.fps || 7)) % spec.columns;
    const row = spec.rows.move ?? 0;
    const dw = spec.displayWidth || 76;
    const dh = spec.displayHeight || 76;
    const s = this.worldToScreen(e.x, e.y);

    c.save();
    if (e.hitFlash > 0) c.filter = "brightness(1.8)";
    if (img) c.drawImage(img, frame * spec.frameWidth, row * spec.frameHeight, spec.frameWidth, spec.frameHeight, s.x - dw / 2, s.y - dh * 0.68, dw, dh);
    else {
      c.fillStyle = "#ff75b5";
      c.beginPath();
      c.arc(s.x, s.y, 22, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    if (e.hp < e.maxHp) {
      c.fillStyle = "rgba(0,0,0,.45)";
      c.fillRect(s.x - 24, s.y - 44, 48, 5);
      c.fillStyle = "#ff4e8d";
      c.fillRect(s.x - 24, s.y - 44, 48 * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  _drawBullets(c) {
    for (const b of this.bullets) {
      const s = this.worldToScreen(b.x, b.y);
      const grd = c.createRadialGradient(s.x, s.y, 1, s.x, s.y, 12);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(.35, "#ffd0ea");
      grd.addColorStop(1, "rgba(255,76,166,0)");
      c.fillStyle = grd;
      c.beginPath();
      c.arc(s.x, s.y, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ff57aa";
      c.beginPath();
      c.arc(s.x, s.y, 5, 0, Math.PI * 2);
      c.fill();
    }
  }

  _drawPickups(c) {
    for (const o of this.xpOrbs) {
      const img = this.assets.images[o.value > 3 ? "xpBig" : "xpSmall"];
      const s = this.worldToScreen(o.x, o.y);
      const size = o.value > 3 ? 30 : 22;
      if (img) c.drawImage(img, s.x - size / 2, s.y - size / 2, size, size);
      else {
        c.fillStyle = "#67dfff";
        c.beginPath();
        c.arc(s.x, s.y, o.r, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  _drawEffects(c) {
    for (const fx of this.effects) {
      const s = this.worldToScreen(fx.x, fx.y);
      const t = fx.t / fx.life;

      if (fx.type === "burst") {
        c.save();
        c.globalAlpha = 1 - t;
        c.strokeStyle = "#ff73bb";
        c.lineWidth = 5;
        c.beginPath();
        c.arc(s.x, s.y, fx.r * t, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = "rgba(255,95,175,.12)";
        c.beginPath();
        c.arc(s.x, s.y, fx.r * t, 0, Math.PI * 2);
        c.fill();
        c.restore();
      } else if (fx.type === "hit") {
        c.fillStyle = `rgba(255,255,255,${1 - t})`;
        c.beginPath();
        c.arc(s.x, s.y, 18 * t, 0, Math.PI * 2);
        c.fill();
      } else if (fx.type === "death") {
        c.fillStyle = `rgba(255,100,180,${1 - t})`;
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.arc(s.x + Math.cos(i) * 28 * t, s.y + Math.sin(i) * 20 * t, 4, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  }
}

window.GaCherryGame = GaCherryGame;
