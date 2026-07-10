class ImageAssets {
  constructor() {
    this.images = {};
    this.ready = false;
  }

  loadImage(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(true); };
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async loadAll() {
    const c = CHERRIFT_CONFIG;
    const items = [
      ["player", c.player.src],
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
    ];
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
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.w = 0;
    this.h = 0;
    this.last = performance.now();
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
  }

  async start() {
    await this.assetReady;
    const skin = CHERRIFT_DATA.skins.find(s => s.id === this.save.selectedSkin) || CHERRIFT_DATA.skins[0];
    const gear = UI.totalGearStats(this.save);

    this.mode = "playing";
    this.runCoins = 0;
    this.time = 0;
    this.kills = 0;

    this.player = {
      x:0, y:0, r:18,
      hp:100 + (gear.maxHp || 0),
      maxHp:100 + (gear.maxHp || 0),
      speed:235 + (skin.stats.speed || 0) + (gear.moveSpeed || 0),
      damage:20 + (skin.stats.damage || 0) + (gear.damage || 0),
      fireInterval: Math.max(.18, .42 / (1 + (gear.attackSpeed || 0) / 100)),
      fireTimer:0,
      bulletSpeed:560,
      pickup:110 + (gear.pickup || 0),
      crit:.05 + (gear.crit || 0) / 100,
      critDamage:1.5 + (gear.critDamage || 0) / 100,
      armor: gear.armor || 0,
      regen: gear.regen || 0,
      level:1,
      xp:0,
      xpNext:18,
      skillTimer:0,
      skillCooldown:8,
      skin: skin.id,
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
      for (let i=0;i<count;i++) {
        let x, y, ok = false;
        for (let t=0;t<90 && !ok;t++) {
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
    const dt = Math.min(.033, (now - this.last) / 1000 || 0);
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
    if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    const mv = this.input.getMoveVector();
    p.moving = !!(mv.x || mv.y);
    this.movePlayer(mv, dt);

    if (mv.x || mv.y) {
      p.lastDir = Math.abs(mv.x) > Math.abs(mv.y)
        ? (mv.x < 0 ? "left" : "right")
        : (mv.y < 0 ? "up" : "down");
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

  movePlayer(mv, dt) {
    const p = this.player;
    const half = 1900;

    const tryMove = (dx, dy) => {
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
      for (let i=0;i<count;i++) this.spawnEnemy();
    }
  }

  spawnEnemy() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(this.w, this.h) * .68 + 120;
    const roll = Math.random();
    const type = roll < .62 ? "green" : roll < .86 ? "blue" : "pink";
    const spec = type === "green"
      ? { hp:40, speed:70, r:22, xp:3 }
      : type === "blue"
        ? { hp:65, speed:58, r:26, xp:5 }
        : { hp:34, speed:105, r:20, xp:4 };

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
      if (d < bd) {
        bd = d;
        best = e;
      }
    }

    return best;
  }

  autoFire() {
    const p = this.player;
    let interval = p.fireInterval * (p.skillBuff > 0 ? .55 : 1);
    if (p.fireTimer > 0) return;

    const e = this.nearest();
    if (!e) return;

    p.fireTimer = interval;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    const style = p.skin === "sakura_cherry" ? "petal" : p.skin === "bunny_rare" ? "bolt" : "orb";

    this.bullets.push({
      x:p.x,
      y:p.y - 10,
      vx:dx/l * p.bulletSpeed,
      vy:dy/l * p.bulletSpeed,
      r:style === "bolt" ? 5 : style === "petal" ? 8 : 7,
      dmg:p.damage,
      life:1.45,
      style
    });
  }

  updateBullets(dt) {
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
          let dmg = b.dmg;

          if (Math.random() < this.player.crit) {
            dmg *= this.player.critDamage;
            this.effects.push({ type:"crit", x:e.x, y:e.y, t:0, life:.35 });
          }

          this.damageEnemy(e, dmg);
          this.effects.push({ type:"hit", x:b.x, y:b.y, t:0, life:.18, style:b.style });
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

      if (Math.random() < .18) {
        this.pickups.push({
          type:"coin",
          x:e.x + (Math.random() - .5) * 24,
          y:e.y + (Math.random() - .5) * 24,
          value:1,
          r:8
        });
      }

      if (Math.random() < .018) {
        this.pickups.push({ type:"key", x:e.x, y:e.y, value:1, r:11 });
      }

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

      if (l < e.r + p.r) {
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
        if (o.type === "coin") {
          this.runCoins += o.value;
          this.save.coins += o.value;
          UI.toast("+1 coin");
        }
        if (o.type === "key") {
          this.save.keys += 1;
          UI.toast("+1 chest key");
        }
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
    if (p.skillTimer > 0) return;

    p.skillTimer = p.skillCooldown;

    if (p.skin === "sakura_cherry") {
      for (let i=0;i<18;i++) {
        const a = i / 18 * Math.PI * 2;
        this.bullets.push({
          x:p.x,
          y:p.y,
          vx:Math.cos(a) * 520,
          vy:Math.sin(a) * 520,
          r:8,
          dmg:p.damage * .72,
          life:.7,
          style:"petal"
        });
      }
      this.effects.push({ type:"burst", x:p.x, y:p.y, t:0, life:.45 });
    } else if (p.skin === "bunny_rare") {
      p.skillBuff = 5.2;
      this.effects.push({ type:"haste", x:p.x, y:p.y, t:0, life:5.2 });
      UI.toast("Haste Bloom!");
    } else {
      const mv = this.input.getMoveVector();
      const dx = mv.x || (p.lastDir === "left" ? -1 : p.lastDir === "right" ? 1 : 0);
      const dy = mv.y || (p.lastDir === "up" ? -1 : p.lastDir === "down" ? 1 : 0);
      p.x += dx * 165;
      p.y += dy * 165;
      this.effects.push({ type:"dash", x:p.x, y:p.y, t:0, life:.32 });

      for (const e of this.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 105) this.damageEnemy(e, p.damage * 1.3);
      }
    }
  }

  gameOver() {
    this.mode = "gameover";
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

    if (this.mode === "playing" || this.mode === "level" || this.mode === "paused" || this.mode === "gameover") {
      this.drawWorld(c);
    }
  }

  drawMenuCanvas(c) {
    const g = c.createLinearGradient(0, 0, this.w, this.h);
    g.addColorStop(0, "#13071a");
    g.addColorStop(.42, "#24103b");
    g.addColorStop(1, "#05030b");
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);

    c.save();
    for (let i=0;i<90;i++) {
      const x = (i * 137.5 + this.t * 12) % (this.w + 50) - 25;
      const y = (i * 83.1 + Math.sin(this.t * .4 + i) * 12) % this.h;
      c.globalAlpha = .18 + (i % 5) * .05;
      c.fillStyle = i % 3 ? "#ff7fbd" : "#ffffff";
      c.beginPath();
      c.arc(x, y, i % 3 === 0 ? 1.6 : 1.05, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  drawWorld(c) {
    c.fillStyle = "#1f7d45";
    c.fillRect(0, 0, this.w, this.h);

    c.save();
    c.translate(-this.camera.x + this.w / 2, -this.camera.y + this.h / 2);

    this.drawGround(c);

    const drawables = [
      ...this.obstacles,
      ...this.pickups,
      ...this.enemies,
      ...(this.player ? [this.player] : []),
      ...this.bullets,
      ...this.effects
    ];

    drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
    for (const o of drawables) this.drawObj(c, o);

    c.restore();
  }

  drawGround(c) {
    const tile = this.assets.get("grass");
    const size = 128;
    const startX = Math.floor((this.camera.x - this.w / 2) / size) - 1;
    const endX = Math.floor((this.camera.x + this.w / 2) / size) + 1;
    const startY = Math.floor((this.camera.y - this.h / 2) / size) - 1;
    const endY = Math.floor((this.camera.y + this.h / 2) / size) + 1;

    for (let gx=startX; gx<=endX; gx++) {
      for (let gy=startY; gy<=endY; gy++) {
        const x = gx * size;
        const y = gy * size;

        if (tile) {
          c.drawImage(tile, x, y, size, size);
        } else {
          c.fillStyle = (gx + gy) % 2 === 0 ? "#2f9d55" : "#2a934f";
          c.fillRect(x, y, size, size);
          c.fillStyle = "rgba(255,255,255,.05)";
          for (let i=0;i<3;i++) c.fillRect(x+15+i*35, y+20+((gx*gy+i*13)%70), 14, 3);
        }
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
    const x = o.x;
    const y = o.y;

    if (o.kind === "treeBig" && this.drawImageCentered(c, "treeBig", x, y-16, 190, 190)) return;
    if (o.kind === "treeSmall" && this.drawImageCentered(c, "treeSmall", x, y-12, 150, 150)) return;
    if (o.kind === "bush1" && this.drawImageCentered(c, "bush1", x, y, 116, 98)) return;
    if (o.kind === "bush2" && this.drawImageCentered(c, "bush2", x, y, 118, 100)) return;
    if (o.kind === "log" && this.drawImageCentered(c, "log", x, y, 132, 82)) return;
    if (o.kind === "rockBig" && this.drawImageCentered(c, "rockBig", x, y, 88, 70)) return;
    if (o.kind === "rockSmall" && this.drawImageCentered(c, "rockSmall", x, y, 70, 54)) return;

    if (o.kind === "treeBig" || o.kind === "treeSmall") {
      const s = o.kind === "treeBig" ? 1.25 : .86;
      c.fillStyle = "#8a542a";
      c.beginPath();
      c.roundRect(x-18*s, y-12*s, 36*s, 86*s, 10*s);
      c.fill();
      c.fillStyle = "#5b341d";
      c.fillRect(x-4*s, y+2*s, 8*s, 62*s);
      this.leafBlob(c, x, y-30*s, 62*s);
      this.leafBlob(c, x-38*s, y-4*s, 38*s);
      this.leafBlob(c, x+40*s, y-3*s, 38*s);
    } else if (o.kind === "bush1" || o.kind === "bush2") {
      this.leafBlob(c, x, y, 42);
    } else if (o.kind === "log") {
      c.save();
      c.translate(x, y);
      c.rotate(.08);
      c.fillStyle = "#9f602f";
      c.beginPath();
      c.roundRect(-58, -18, 116, 36, 17);
      c.fill();
      c.strokeStyle = "#62361e";
      c.lineWidth = 5;
      c.strokeRect(-48, -16, 86, 32);
      c.fillStyle = "#f1c27c";
      c.beginPath();
      c.arc(-55, 0, 19, 0, Math.PI*2);
      c.fill();
      c.restore();
    } else if (o.kind === "rockBig" || o.kind === "rockSmall") {
      c.fillStyle = "#8792a2";
      c.beginPath();
      c.ellipse(x, y, o.kind==="rockBig"?34:26, o.kind==="rockBig"?25:19, .2, 0, Math.PI*2);
      c.fill();
    } else if (o.kind === "flowers") {
      c.fillStyle = "#ff9cc8";
      for (let i=0;i<5;i++) {
        const a = i / 5 * Math.PI * 2;
        c.beginPath();
        c.ellipse(x + Math.cos(a)*8, y + Math.sin(a)*8, 6, 10, a, 0, Math.PI*2);
        c.fill();
      }
      c.fillStyle = "#ffe28a";
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI*2);
      c.fill();
    }
  }

  leafBlob(c, x, y, r) {
    c.fillStyle = "#184f37";
    c.beginPath();
    c.arc(x, y+8, r*.86, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#55b747";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#9ee957";
    for (let i=0;i<11;i++) {
      const a = i / 11 * Math.PI*2 + this.t*.06;
      c.beginPath();
      c.ellipse(x + Math.cos(a)*r*.45, y + Math.sin(a)*r*.32, r*.18, r*.11, a, 0, Math.PI*2);
      c.fill();
    }
  }

  drawPlayer(c, p) {
    const img = this.assets.get("player");
    if (img) {
      const cfg = CHERRIFT_CONFIG.player;
      const dir = p.lastDir || "down";
      const moving = p.moving;
      const row = dir === "down"
        ? (moving ? cfg.rows.walkDown : cfg.rows.idleDown)
        : dir === "up"
          ? (moving ? cfg.rows.walkUp : cfg.rows.idleUp)
          : dir === "left"
            ? (moving ? cfg.rows.walkLeft : cfg.rows.idleLeft)
            : (moving ? cfg.rows.walkRight : cfg.rows.idleRight);

      const frame = Math.floor(this.t * (moving ? 8 : 3)) % cfg.columns;
      c.drawImage(
        img,
        frame * cfg.frameWidth,
        row * cfg.frameHeight,
        cfg.frameWidth,
        cfg.frameHeight,
        p.x - cfg.displayWidth/2,
        p.y - cfg.displayHeight + 34,
        cfg.displayWidth,
        cfg.displayHeight
      );
      return;
    }

    const x = p.x;
    const y = p.y;
    const skin = CHERRIFT_DATA.skins.find(s => s.id === p.skin);

    c.fillStyle = "rgba(0,0,0,.25)";
    c.beginPath();
    c.ellipse(x, y+24, 28, 10, 0, 0, Math.PI*2);
    c.fill();

    c.fillStyle = p.skin === "bunny_rare" ? "#fff2fb" : p.skin === "sakura_cherry" ? "#ffd6eb" : "#ffc1dc";
    c.beginPath();
    c.arc(x, y, 24, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#ff77b9";
    c.beginPath();
    c.ellipse(x-11, y-28, 8, 24, -.35, 0, Math.PI*2);
    c.ellipse(x+11, y-28, 8, 24, .35, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#2c2033";
    c.beginPath();
    c.arc(x-8, y-2, 3, 0, Math.PI*2);
    c.arc(x+8, y-2, 3, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#fff";
    c.font = "18px system-ui";
    c.textAlign = "center";
    c.fillText(skin?.emoji || "🐰", x, y+42);
  }

  drawEnemy(c, e) {
    const img = this.assets.get("slime");
    if (img) {
      const cfg = CHERRIFT_CONFIG.slime;
      const frame = Math.floor((this.t + e.phase) * 7) % cfg.columns;
      const row = cfg.rows.move;
      c.save();
      if (e.hit > 0) c.globalAlpha = .65;
      c.drawImage(
        img,
        frame * cfg.frameWidth,
        row * cfg.frameHeight,
        cfg.frameWidth,
        cfg.frameHeight,
        e.x - cfg.displayWidth/2,
        e.y - cfg.displayHeight/2,
        cfg.displayWidth,
        cfg.displayHeight
      );
      c.restore();

      if (e.type !== "green") {
        c.save();
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha = e.type === "blue" ? .22 : .25;
        c.fillStyle = e.type === "blue" ? "#4ee4ff" : "#ff66b7";
        c.fillRect(e.x-cfg.displayWidth/2, e.y-cfg.displayHeight/2, cfg.displayWidth, cfg.displayHeight);
        c.restore();
      }
      return;
    }

    const x = e.x;
    const y = e.y;

    c.fillStyle = "rgba(0,0,0,.25)";
    c.beginPath();
    c.ellipse(x, y+18, e.r, 8, 0, 0, Math.PI*2);
    c.fill();

    c.fillStyle = e.type === "green" ? "#7ee65e" : e.type === "blue" ? "#62d9ff" : "#ff79bf";
    if (e.hit > 0) c.fillStyle = "#fff";

    c.beginPath();
    c.ellipse(x, y, e.r*1.1, e.r*.82, 0, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "rgba(255,255,255,.42)";
    c.beginPath();
    c.ellipse(x-e.r*.3, y-e.r*.26, e.r*.28, e.r*.16, -.4, 0, Math.PI*2);
    c.fill();

    c.fillStyle = "#1f2530";
    c.beginPath();
    c.arc(x-7, y, 2.5, 0, Math.PI*2);
    c.arc(x+7, y, 2.5, 0, Math.PI*2);
    c.fill();
  }

  drawBullet(c, b) {
    c.save();
    c.translate(b.x, b.y);

    if (b.style === "petal") {
      c.fillStyle = "#ff8fc7";
      c.rotate(Math.atan2(b.vy, b.vx));
      c.beginPath();
      c.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2);
      c.fill();
    } else if (b.style === "bolt") {
      c.fillStyle = "#fef9ff";
      c.shadowColor = "#ff5db3";
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI*2);
      c.fill();
    } else {
      c.fillStyle = "#ff65b4";
      c.shadowColor = "#ff65b4";
      c.shadowBlur = 16;
      c.beginPath();
      c.arc(0, 0, 8, 0, Math.PI*2);
      c.fill();
    }

    c.restore();
  }

  drawPickup(c, o) {
    if (o.type === "xp") {
      const key = o.value >= 5 ? "xpBig" : "xpSmall";
      if (this.drawImageCentered(c, key, o.x, o.y, o.value >= 5 ? 34 : 26, o.value >= 5 ? 34 : 26)) return;
    }

    c.save();
    c.translate(o.x, o.y);

    if (o.type === "xp") {
      c.fillStyle = "#ff90d0";
      c.shadowColor = "#ff90d0";
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(0, 0, o.r, 0, Math.PI*2);
      c.fill();
    }

    if (o.type === "coin") {
      c.fillStyle = "#ffd65c";
      c.beginPath();
      c.arc(0, 0, 9, 0, Math.PI*2);
      c.fill();
      c.fillStyle = "#9b6a00";
      c.fillText("c", -3, 4);
    }

    if (o.type === "key") {
      c.fillStyle = "#d19b65";
      c.font = "20px system-ui";
      c.fillText("📦", -10, 7);
    }

    c.restore();
  }

  drawEffect(c, e) {
    const a = 1 - e.t / e.life;
    const x = e.x;
    const y = e.y;

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

    if (["hit","death","crit","burst","dash"].includes(e.type)) {
      c.strokeStyle = e.type === "crit" ? "#fff176" : "#ff8ccc";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(x, y, (1-a) * 55 + 8, 0, Math.PI*2);
      c.stroke();
    }

    if (e.type === "haste") {
      c.strokeStyle = "#8fffd2";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, 52 + Math.sin(this.t*8)*5, 0, Math.PI*2);
      c.stroke();
    }

    c.restore();
  }
}
window.CherriftGame = CherriftGame;