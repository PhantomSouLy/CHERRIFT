(() => {
  const VERSION = "0.3.1-early";
  if (!window.CHERRIFT_CONFIG || !window.CHERRIFT_DATA || !window.CherriftGame || !window.UI || !window.CherriftStorage) return;

  CHERRIFT_CONFIG.version = VERSION;
  CHERRIFT_DATA.version = VERSION;

  const STAGES = [
    { id:"world_1_1", world:1, index:1, name:"World 1-1", title:"Blooming Meadow", theme:"forest_day", goalKills:120, maxAlive:14, energy:5, pool:["green_slime","pink_slime"], raids:[{atKills:20,count:18,pool:["green_slime","pink_slime"]},{atKills:55,count:26,pool:["green_slime","blue_slime","pink_slime"]},{atKills:92,count:34,pool:["blue_slime","pink_slime"]}], repeatReward:{coins:28}, firstClearReward:{coins:55,keys:1}, next:"world_1_2" },
    { id:"world_1_2", world:1, index:2, name:"World 1-2", title:"Petal Trail", theme:"forest_day", goalKills:135, maxAlive:15, energy:5, pool:["green_slime","pink_slime","blue_slime"], raids:[{atKills:25,count:22,pool:["green_slime","pink_slime"]},{atKills:70,count:30,pool:["blue_slime","pink_slime"]},{atKills:108,count:38,pool:["green_slime","blue_slime","pink_slime"]}], repeatReward:{coins:32}, firstClearReward:{coins:62}, next:"world_1_3" },
    { id:"world_1_3", world:1, index:3, name:"World 1-3", title:"Clover Crossing", theme:"forest_day", goalKills:155, maxAlive:16, energy:5, pool:["green_slime","blue_slime","pink_slime"], raids:[{atKills:30,count:26,pool:["blue_slime","pink_slime"]},{atKills:82,count:36,pool:["green_slime","blue_slime","pink_slime"]},{atKills:125,count:44,pool:["blue_slime","big_slime","pink_slime"]}], repeatReward:{coins:36}, firstClearReward:{coins:70}, next:"world_1_4" },
    { id:"world_1_4", world:1, index:4, name:"World 1-4", title:"Rooted Hollow", theme:"forest_day", goalKills:175, maxAlive:17, energy:5, pool:["green_slime","blue_slime","big_slime","pink_slime"], raids:[{atKills:35,count:30,pool:["blue_slime","pink_slime"]},{atKills:92,count:42,pool:["big_slime","blue_slime"]},{atKills:142,count:50,pool:["big_slime","blue_slime","pink_slime"]}], repeatReward:{coins:42}, firstClearReward:{coins:82,keys:1}, next:"world_1_5" },
    { id:"world_1_5", world:1, index:5, name:"World 1-5", title:"Slime Nest", theme:"forest_day", goalKills:210, maxAlive:18, energy:5, pool:["green_slime","blue_slime","big_slime","pink_slime"], raids:[{atKills:40,count:36,pool:["pink_slime","blue_slime"]},{atKills:105,count:50,pool:["big_slime","blue_slime"]},{atKills:168,count:62,pool:["big_slime","blue_slime","pink_slime"]}], boss:"slime_king", repeatReward:{coins:52}, firstClearReward:{coins:110,keys:1}, next:"world_2_1" },
    { id:"world_2_1", world:2, index:1, name:"World 2-1", title:"Night Bloom", theme:"forest_night", goalKills:145, maxAlive:15, energy:5, pool:["spider","beetle"], raids:[{atKills:28,count:24,pool:["spider"]},{atKills:76,count:34,pool:["spider","beetle"]},{atKills:116,count:42,pool:["spider","beetle"]}], repeatReward:{coins:38}, firstClearReward:{coins:72}, next:"world_2_2" },
    { id:"world_2_2", world:2, index:2, name:"World 2-2", title:"Moonlit Grove", theme:"forest_night", goalKills:165, maxAlive:16, energy:5, pool:["spider","beetle","moth"], raids:[{atKills:34,count:30,pool:["spider","moth"]},{atKills:88,count:42,pool:["beetle","moth"]},{atKills:132,count:52,pool:["spider","beetle","moth"]}], repeatReward:{coins:44}, firstClearReward:{coins:84}, next:"world_2_3" },
    { id:"world_2_3", world:2, index:3, name:"World 2-3", title:"Shadow Thicket", theme:"forest_night", goalKills:185, maxAlive:17, energy:5, pool:["spider","beetle","moth","crawler"], raids:[{atKills:38,count:34,pool:["moth","crawler"]},{atKills:98,count:48,pool:["spider","beetle","crawler"]},{atKills:148,count:58,pool:["spider","moth","crawler"]}], repeatReward:{coins:50}, firstClearReward:{coins:96}, next:"world_2_4" },
    { id:"world_2_4", world:2, index:4, name:"World 2-4", title:"Echo Burrow", theme:"forest_night", goalKills:205, maxAlive:18, energy:5, pool:["spider","beetle","crawler"], raids:[{atKills:42,count:38,pool:["spider","crawler"]},{atKills:108,count:54,pool:["beetle","crawler"]},{atKills:165,count:66,pool:["spider","beetle","crawler"]}], repeatReward:{coins:58}, firstClearReward:{coins:110,keys:1}, next:"world_2_5" },
    { id:"world_2_5", world:2, index:5, name:"World 2-5", title:"Midnight Den", theme:"forest_night", goalKills:240, maxAlive:19, energy:5, pool:["spider","beetle","moth","crawler"], raids:[{atKills:50,count:46,pool:["spider","crawler"]},{atKills:124,count:64,pool:["beetle","moth","crawler"]},{atKills:192,count:78,pool:["spider","beetle","moth","crawler"]}], boss:"night_queen", repeatReward:{coins:68}, firstClearReward:{coins:135,keys:1}, next:null }
  ];

  const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));
  const groupedWorlds = STAGES.reduce((acc, s) => { (acc[s.world] ||= []).push(s); return acc; }, {});

  const ENEMIES = {
    green_slime: { name:"Green Slime", hp:40, speed:72, r:22, xp:3, color:"#7ee65e", glow:"rgba(126,230,94,.32)", style:"slime" },
    blue_slime: { name:"Blue Slime", hp:64, speed:58, r:26, xp:5, color:"#62d9ff", glow:"rgba(98,217,255,.32)", style:"slime" },
    big_slime: { name:"Big Slime", hp:120, speed:42, r:34, xp:8, color:"#53c684", glow:"rgba(83,198,132,.28)", style:"slime" },
    pink_slime: { name:"Pink Slime", hp:36, speed:102, r:18, xp:4, color:"#ff79bf", glow:"rgba(255,121,191,.28)", style:"slime" },
    spider: { name:"Shadow Spider", hp:52, speed:96, r:22, xp:4, color:"#9a8cff", glow:"rgba(154,140,255,.24)", style:"spider" },
    beetle: { name:"Night Beetle", hp:82, speed:66, r:24, xp:5, color:"#63c7ff", glow:"rgba(99,199,255,.24)", style:"beetle" },
    moth: { name:"Luna Moth", hp:46, speed:90, r:20, xp:5, color:"#dcb7ff", glow:"rgba(220,183,255,.26)", style:"moth" },
    crawler: { name:"Dark Crawler", hp:66, speed:108, r:20, xp:5, color:"#ff8f78", glow:"rgba(255,143,120,.24)", style:"crawler" },
    slime_king: { name:"Slime King", hp:310, speed:42, r:48, xp:18, color:"#85f37f", glow:"rgba(133,243,127,.38)", style:"boss" },
    night_queen: { name:"Night Queen", hp:360, speed:48, r:44, xp:20, color:"#c39dff", glow:"rgba(195,157,255,.34)", style:"boss" }
  };

  function stageById(id) { return STAGE_MAP[id] || STAGES[0]; }
  function isStageUnlocked(save, id) { return (save.unlockedStages || []).includes(id); }
  function isStageCleared(save, id) { return !!(save.clearedStages || {})[id]; }
  function ensureStageSave(save) {
    save.selectedStageId ||= STAGES[0].id;
    save.unlockedStages = Array.isArray(save.unlockedStages) && save.unlockedStages.length ? save.unlockedStages : [STAGES[0].id];
    if (!save.unlockedStages.includes(STAGES[0].id)) save.unlockedStages.unshift(STAGES[0].id);
    save.clearedStages ||= {};
    save.firstClearClaimed ||= {};
    save.stageStats ||= {};
    if (!STAGE_MAP[save.selectedStageId]) save.selectedStageId = STAGES[0].id;
  }

  const originalDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  CherriftStorage.defaults = function patchedDefaults() {
    const d = originalDefaults();
    d.selectedStageId = STAGES[0].id;
    d.unlockedStages = [STAGES[0].id];
    d.clearedStages = {};
    d.firstClearClaimed = {};
    d.stageStats = {};
    return d;
  };

  const originalLoad = CherriftStorage.load.bind(CherriftStorage);
  CherriftStorage.load = function patchedLoad() {
    const save = originalLoad();
    ensureStageSave(save);
    return save;
  };

  const originalSave = CherriftStorage.save.bind(CherriftStorage);
  CherriftStorage.save = function patchedSave(data) {
    ensureStageSave(data);
    return originalSave(data);
  };

  const proto = CherriftGame.prototype;
  const prevStart = proto.start;
  const prevUpdate = proto.update;
  const prevGenerateMap = proto.generateMap;
  const prevDrawGround = proto.drawGround;
  const prevDrawEnemy = proto.drawEnemy;
  const prevGameOver = proto.gameOver;

  proto.getSelectedStage = function() { return stageById(this.save?.selectedStageId); };

  proto.start = async function patchedStart() {
    await prevStart.call(this);
    const stage = this.getSelectedStage();
    this.stage = {
      ...stage,
      spawned: 0,
      bossSpawned: false,
      winTriggered: false,
      raidsTriggered: {},
      raidQueue: [],
      raidBanner: "",
      raidBannerTimer: 0,
      objectiveReached: false,
      currentTheme: stage.theme,
      totalTarget: stage.goalKills
    };
    UI.showStageHUD(this);
    UI.renderWorldPanel?.();
    UI.refreshMenu?.();
  };

  proto.generateMap = function patchedGenerateMap() {
    const stage = this.getSelectedStage();
    const obs = prevGenerateMap.call(this);
    if (stage.theme === "forest_night") {
      obs.forEach((o, i) => { if (!o.phase) o.phase = Math.random() * 9; if (o.kind === "flowers") o.kind = i % 2 ? "bush1" : "bush2"; });
    }
    return obs;
  };

  proto.spawnEnemyOfType = function spawnEnemyOfType(typeKey) {
    const spec = ENEMIES[typeKey] || ENEMIES.green_slime;
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(this.w || 720, this.h || 560) * .68 + 120;
    this.enemies.push({
      enemyType: typeKey,
      type: typeKey.includes("blue") ? "blue" : typeKey.includes("pink") ? "pink" : "green",
      x: this.player.x + Math.cos(a) * d,
      y: this.player.y + Math.sin(a) * d,
      r: spec.r,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      xp: spec.xp,
      hit: 0,
      phase: Math.random() * 9,
      style: spec.style,
      tint: spec.color,
      glow: spec.glow,
      name: spec.name,
      isBoss: spec.style === "boss"
    });
    this.stage.spawned++;
  };

  proto.pickEnemyPool = function pickEnemyPool(pool) {
    if (!pool?.length) return "green_slime";
    return pool[Math.floor(Math.random() * pool.length)];
  };

  proto.spawn = function stageSpawn(dt) {
    const s = this.stage;
    if (!this.player || !s || this.mode !== "playing") return;

    if (s.raidBannerTimer > 0) {
      s.raidBannerTimer = Math.max(0, s.raidBannerTimer - dt);
      if (s.raidBannerTimer <= 0) s.raidBanner = "";
    }

    for (const raid of s.raids || []) {
      if (!s.raidsTriggered[raid.atKills] && this.kills >= raid.atKills) {
        s.raidsTriggered[raid.atKills] = true;
        s.raidQueue.push({ ...raid, spawned: 0, timer: 0 });
        s.raidBanner = `RAID INCOMING · ${raid.count} mobs`;
        s.raidBannerTimer = 2.4;
      }
    }

    const remainingGoal = s.goalKills - this.kills;
    if (remainingGoal <= 0) s.objectiveReached = true;

    let activeRaid = s.raidQueue[0] || null;
    if (activeRaid && activeRaid.spawned >= activeRaid.count) {
      s.raidQueue.shift();
      activeRaid = s.raidQueue[0] || null;
    }

    const activeLimit = (activeRaid ? Math.max(s.maxAlive + 8, 18) : s.maxAlive);
    if (this.enemies.length >= activeLimit) return;

    if (s.boss && !s.bossSpawned && remainingGoal <= 1 && this.enemies.length === 0) {
      this.spawnEnemyOfType(s.boss);
      s.bossSpawned = true;
      s.raidBanner = `MINI BOSS · ${ENEMIES[s.boss].name}`;
      s.raidBannerTimer = 2.8;
      return;
    }

    if (s.objectiveReached) return;

    if (activeRaid) {
      activeRaid.timer -= dt;
      if (activeRaid.timer <= 0 && activeRaid.spawned < activeRaid.count && s.spawned < s.goalKills) {
        activeRaid.timer = .11;
        this.spawnEnemyOfType(this.pickEnemyPool(activeRaid.pool));
        activeRaid.spawned++;
      }
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && s.spawned < s.goalKills) {
      this.spawnTimer = Math.max(.14, 0.62 - this.kills * .0018);
      this.spawnEnemyOfType(this.pickEnemyPool(s.pool));
    }
  };

  proto.update = function patchedUpdate(dt) {
    prevUpdate.call(this, dt);
    if (!this.player || !this.stage || this.mode !== "playing") return;
    if (!this.stage.winTriggered && this.kills >= this.stage.goalKills && this.enemies.length === 0) {
      this.stage.winTriggered = true;
      this.stageClear();
      return;
    }
    UI.updateStageHUD?.(this);
  };

  proto.stageClear = function stageClear() {
    const s = this.stage;
    if (!s) return;
    this.mode = "stageclear";
    document.body.classList.remove("is-playing");

    const save = this.save;
    ensureStageSave(save);
    save.clearedStages[s.id] = true;
    save.stageStats[s.id] ||= { clears: 0, bestTime: 0, bestKills: 0 };
    save.stageStats[s.id].clears += 1;
    if (!save.stageStats[s.id].bestTime || this.time > save.stageStats[s.id].bestTime) save.stageStats[s.id].bestTime = this.time;
    if (!save.stageStats[s.id].bestKills || this.kills > save.stageStats[s.id].bestKills) save.stageStats[s.id].bestKills = this.kills;

    const rewards = [];
    const rep = s.repeatReward || {};
    if (rep.coins) { save.coins += rep.coins; rewards.push(`🪙 +${rep.coins} coins`); }
    if (rep.keys) { save.keys += rep.keys; rewards.push(`📦 +${rep.keys} keys`); }

    const first = !save.firstClearClaimed[s.id];
    const firstRewards = [];
    if (first) {
      save.firstClearClaimed[s.id] = true;
      const frc = s.firstClearReward || {};
      if (frc.coins) { save.coins += frc.coins; firstRewards.push(`🪙 +${frc.coins} coins`); }
      if (frc.keys) { save.keys += frc.keys; firstRewards.push(`📦 +${frc.keys} keys`); }
    }

    if (s.next && !save.unlockedStages.includes(s.next)) save.unlockedStages.push(s.next);
    if (s.next) save.selectedStageId = s.next;

    if (this.time > save.best.time) save.best.time = this.time;
    if (this.kills > save.best.kills) save.best.kills = this.kills;
    CherriftStorage.save(save);
    UI.showStageClear?.(this, { rewards, firstRewards, unlocked: s.next, firstClear: first });
  };

  proto.gameOver = function patchedGameOver() {
    UI.hideStageHUD?.();
    return prevGameOver.call(this);
  };

  proto.drawGround = function patchedDrawGround(c, zoom = 1) {
    const stage = this.stage || this.getSelectedStage();
    if (!stage || stage.theme === "forest_day") return prevDrawGround.call(this, c, zoom);

    const size = 128;
    const viewW = this.w / zoom;
    const viewH = this.h / zoom;
    const startX = Math.floor((this.camera.x - viewW / 2) / size) - 1;
    const endX = Math.floor((this.camera.x + viewW / 2) / size) + 1;
    const startY = Math.floor((this.camera.y - viewH / 2) / size) - 1;
    const endY = Math.floor((this.camera.y + viewH / 2) / size) + 1;
    for (let gx = startX; gx <= endX; gx++) for (let gy = startY; gy <= endY; gy++) {
      const x = gx * size, y = gy * size;
      c.fillStyle = (gx + gy) % 2 === 0 ? "#16334a" : "#132b3f";
      c.fillRect(x, y, size, size);
      c.fillStyle = "rgba(101,159,255,.04)";
      for (let i = 0; i < 4; i++) c.fillRect(x + 16 + i * 24, y + ((gx * 17 + gy * 11 + i * 29) % 96), 2, 2);
      c.fillStyle = "rgba(122,255,175,.05)";
      c.beginPath(); c.arc(x + 20 + (gx * 7 % 76), y + 18 + (gy * 9 % 76), 6, 0, Math.PI * 2); c.fill();
    }
  };

  proto.drawEnemy = function patchedDrawEnemy(c, e) {
    if (!e.enemyType) return prevDrawEnemy.call(this, c, e);

    const a = e.hit > 0 ? .75 : 1;
    c.save();
    c.globalAlpha = a;
    c.translate(e.x, e.y);

    if (e.glow) {
      c.save();
      c.globalAlpha = .55;
      c.fillStyle = e.glow;
      c.beginPath(); c.ellipse(0, e.r * .18, e.r * 1.45, e.r * .9, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    if (e.style === "slime") {
      c.fillStyle = e.tint;
      c.beginPath(); c.ellipse(0, 0, e.r * 1.12, e.r * .85, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.26)";
      c.beginPath(); c.ellipse(-e.r * .22, -e.r * .16, e.r * .24, e.r * .16, -.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#17222b";
      c.beginPath(); c.arc(-e.r * .24, -e.r * .04, 2.3, 0, Math.PI * 2); c.arc(e.r * .22, -e.r * .04, 2.3, 0, Math.PI * 2); c.fill();
    } else if (e.style === "spider") {
      c.strokeStyle = e.tint; c.lineWidth = 4;
      for (let i = -1; i <= 1; i += 2) {
        for (let j = -1; j <= 1; j += 2) {
          c.beginPath(); c.moveTo(i * 6, j * 2); c.lineTo(i * e.r * .7, j * e.r * .42); c.stroke();
          c.beginPath(); c.moveTo(i * 2, j * 7); c.lineTo(i * e.r * .62, j * e.r * .72); c.stroke();
        }
      }
      c.fillStyle = e.tint; c.beginPath(); c.arc(0, 0, e.r * .62, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#111"; c.beginPath(); c.arc(-4, -2, 2, 0, Math.PI * 2); c.arc(4, -2, 2, 0, Math.PI * 2); c.fill();
    } else if (e.style === "beetle") {
      c.fillStyle = e.tint; c.beginPath(); c.ellipse(0, 0, e.r * .95, e.r * .72, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.24)"; c.fillRect(-2, -e.r * .58, 4, e.r * 1.16);
      c.strokeStyle = e.tint; c.lineWidth = 3;
      [-1,1].forEach(s => { c.beginPath(); c.moveTo(s*6, 0); c.lineTo(s*e.r*.9, -e.r*.26); c.stroke(); c.beginPath(); c.moveTo(s*4, 6); c.lineTo(s*e.r*.86, e.r*.34); c.stroke(); });
    } else if (e.style === "moth") {
      c.fillStyle = e.tint;
      c.beginPath(); c.ellipse(-e.r*.26, 0, e.r*.42, e.r*.68, -.35, 0, Math.PI*2); c.ellipse(e.r*.26, 0, e.r*.42, e.r*.68, .35, 0, Math.PI*2); c.fill();
      c.fillStyle = "#eee"; c.fillRect(-2, -e.r*.5, 4, e.r);
    } else if (e.style === "crawler") {
      c.fillStyle = e.tint; c.beginPath(); c.roundRect(-e.r*.95, -e.r*.46, e.r*1.9, e.r*.92, e.r*.32); c.fill();
      c.fillStyle = "#221"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i*6, 0, 2, 0, Math.PI*2); c.fill(); }
    } else if (e.style === "boss") {
      c.fillStyle = e.tint; c.beginPath(); c.ellipse(0, 0, e.r * 1.08, e.r * .86, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(-e.r*.22, -e.r*.18, e.r*.18, 0, Math.PI*2); c.fill();
      c.fillStyle = "#111"; c.beginPath(); c.arc(-e.r * .24, -4, 3, 0, Math.PI * 2); c.arc(e.r * .24, -4, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.86)"; c.font = "bold 12px system-ui"; c.textAlign = "center"; c.fillText("BOSS", 0, e.r + 18);
    }

    if (e.isBoss) {
      c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 4; c.strokeRect(-e.r, -e.r - 24, e.r * 2, 8);
      c.fillStyle = "#ff78b9"; c.fillRect(-e.r, -e.r - 24, Math.max(0, (e.hp / e.maxHp) * e.r * 2), 8);
    }

    c.restore();
  };

  // -------- UI patching --------
  const originalBind = UI.bind.bind(UI);
  UI.bind = function patchedBind() {
    originalBind();
    document.querySelectorAll('[data-open="worlds"]').forEach(b => b.onclick = () => this.open("worlds"));
    document.getElementById("mobilePlayBtn")?.addEventListener("click", () => this.game.start());
    document.getElementById("mobileModeBtn")?.addEventListener("click", () => this.open("worlds"));
    document.getElementById("worldPlaySelectedBtn")?.addEventListener("click", () => this.game.start());
    document.getElementById("nextStageBtn")?.addEventListener("click", () => {
      CherriftStorage.save(this.save);
      this.hideStageClear();
      this.refreshMenu();
      this.renderWorldPanel();
      this.game.start();
    });
    document.getElementById("replayStageBtn")?.addEventListener("click", () => { this.hideStageClear(); this.game.start(); });
    document.getElementById("stageClearToMenuBtn")?.addEventListener("click", () => { this.hideStageClear(); this.quit(); });
  };

  UI.open = function patchedOpen(id) {
    document.body.classList.remove("is-playing");
    ["hud", "skill", "pauseModal", "gameOver", "levelModal", "stageClearModal"].forEach(x => document.getElementById(x)?.classList.add("hidden"));
    this.hideStageHUD?.();
    ["menu", "skins", "gear", "chests", "settings", "worlds"].forEach(x => document.getElementById(x)?.classList.toggle("hidden", x !== id));
    if (id === "menu") this.refreshMenu();
    if (id === "skins") this.renderSkinCarousel();
    if (id === "gear") this.renderGear();
    if (id === "worlds") this.renderWorldPanel();
  };

  const originalShowGame = UI.showGame.bind(UI);
  UI.showGame = function patchedShowGame() {
    originalShowGame();

    // Original v0.2.x showGame did not know about the new Worlds panel.
    // Without this, mobile could show only the skill button while the Worlds panel stayed on top.
    ["worlds", "stageClearModal"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    ["menu", "skins", "gear", "chests", "settings", "gameOver", "pauseModal", "levelModal"].forEach(id => document.getElementById(id)?.classList.add("hidden"));

    document.getElementById("hud")?.classList.remove("hidden");
    document.getElementById("skill")?.classList.remove("hidden");
    document.body.classList.add("is-playing");

    this.showStageHUD(this.game);
  };

  UI.showStageHUD = function(game) {
    if (!game?.stage && game?.mode !== "playing") return;
    document.getElementById("stageHud")?.classList.remove("hidden");
    this.updateStageHUD(game);
  };

  UI.hideStageHUD = function() {
    document.getElementById("stageHud")?.classList.add("hidden");
    document.getElementById("raidBox")?.classList.add("hidden");
  };

  UI.updateStageHUD = function(game) {
    const stage = game.stage || game.getSelectedStage?.();
    if (!stage) return;
    const stageName = document.getElementById("stageHudName");
    const stageGoal = document.getElementById("stageHudGoal");
    const raidBox = document.getElementById("raidBox");
    const raidTitle = document.getElementById("raidTitle");
    const raidText = document.getElementById("raidText");
    if (stageName) stageName.textContent = `${stage.name} · ${stage.title}`;
    if (stageGoal) stageGoal.textContent = `${Math.min(game.kills, stage.goalKills)} / ${stage.goalKills} defeated`;
    if (raidBox && raidTitle && raidText) {
      if (stage.raidBanner) {
        raidBox.classList.remove("hidden");
        raidTitle.textContent = stage.raidBanner.includes("BOSS") ? "Mini Boss" : "Raid";
        raidText.textContent = stage.raidBanner;
      } else {
        raidBox.classList.add("hidden");
      }
    }
  };

  const originalRefreshMenu = UI.refreshMenu.bind(UI);
  UI.refreshMenu = function patchedRefreshMenu() {
    originalRefreshMenu();
    ensureStageSave(this.save);
    const stage = stageById(this.save.selectedStageId);
    const cleared = isStageCleared(this.save, stage.id);
    const objective = `${stage.goalKills} enemies · ${stage.theme === "forest_night" ? "Night" : "Day"}`;
    const reward = `Repeat: +${stage.repeatReward?.coins || 0} coins`;
    const first = this.save.firstClearClaimed[stage.id] ? "First clear claimed" : `First: +${stage.firstClearReward?.coins || 0} coins${stage.firstClearReward?.keys ? ` · +${stage.firstClearReward.keys} key` : ""}`;

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set("mobileEnergyValue", `${stage.energy}`);
    set("mobileCoinsValue", `${this.save.coins}`);
    set("mobileKeysValue", `${this.save.keys}`);
    set("mobileStageChip", stage.name);
    set("mobileStageTitle", stage.title);
    set("mobileStageSub", cleared ? "Chapter Cleared" : "Ready to clear");
    set("mobileObjectiveValue", objective);
    set("mobileRewardValue", reward);
    set("mobileFirstRewardValue", first);
    set("mobilePlayCost", `⚡ x${stage.energy}`);
    set("selectedStageDesktop", `${stage.name} · ${stage.title}`);
    set("menuBuildVersion", `v${VERSION}`);
    this.renderMobileStagePreview(stage);
  };

  UI.renderMobileStagePreview = function(stage) {
    const root = document.getElementById("mobileStageArt");
    if (!root) return;
    root.innerHTML = `
      <div class="block" style="left:8%;top:32%;width:18%;height:44%;"></div>
      <div class="block" style="left:24%;top:26%;width:16%;height:50%;"></div>
      <div class="block" style="left:42%;top:20%;width:18%;height:56%;"></div>
      <div class="block" style="left:62%;top:29%;width:16%;height:47%;"></div>
      <div class="block" style="left:20%;bottom:16%;width:56%;height:18%;background:linear-gradient(180deg,rgba(78,88,120,.96),rgba(25,30,40,.96));"></div>
      <div class="glow" style="background:${stage.theme === "forest_night" ? "radial-gradient(circle, rgba(130,255,190,.95), rgba(25,154,103,.55) 40%, rgba(0,0,0,0) 72%)" : "radial-gradient(circle, rgba(255,205,106,.95), rgba(255,143,74,.55) 40%, rgba(0,0,0,0) 72%)"};"></div>`;
  };

  UI.renderWorldPanel = function renderWorldPanel() {
    const wrap = document.getElementById("worldGroups");
    if (!wrap) return;
    wrap.innerHTML = "";
    const ov1 = document.getElementById("worldUnlockedCount");
    const ov2 = document.getElementById("worldClearCount");
    const ov3 = document.getElementById("worldCurrentStage");
    if (ov1) ov1.textContent = `${(this.save.unlockedStages || []).length} unlocked`;
    if (ov2) ov2.textContent = `${Object.keys(this.save.clearedStages || {}).length} cleared`;
    const selectedStage = stageById(this.save.selectedStageId);
    if (ov3) ov3.textContent = selectedStage.name;
    const selectedInfo = document.getElementById("worldSelectedInfo");
    if (selectedInfo) selectedInfo.textContent = `${selectedStage.name} · ${selectedStage.title} · ${selectedStage.goalKills} enemies`;

    Object.entries(groupedWorlds).forEach(([world, list]) => {
      const group = document.createElement("section");
      group.className = "world-group glass";
      const night = +world === 2;
      group.innerHTML = `<h3>World ${world}</h3><p>${night ? "Dark / night version. New enemy pool and mood." : "Base forest route. Difficulty ramps by stage number."}</p><div class="stage-grid"></div>`;
      const grid = group.querySelector(".stage-grid");
      list.forEach(stage => {
        const unlocked = isStageUnlocked(this.save, stage.id);
        const cleared = isStageCleared(this.save, stage.id);
        const btn = document.createElement("button");
        btn.className = `stage-card ${this.save.selectedStageId === stage.id ? "selected" : ""} ${unlocked ? "" : "locked"}`;
        btn.disabled = !unlocked;
        btn.innerHTML = `
          <span class="name">${stage.name}</span>
          <span class="stage-theme">${stage.title}</span>
          <span class="goal">Objective: ${stage.goalKills} defeats</span>
          <span class="reward">Reward: +${stage.repeatReward?.coins || 0} coins</span>
          <span class="state-pill ${cleared ? "cleared" : unlocked ? "unlocked" : "locked"}">${cleared ? "CLEARED" : unlocked ? "UNLOCKED" : "LOCKED"}</span>`;
        btn.onclick = () => {
          this.save.selectedStageId = stage.id;
          CherriftStorage.save(this.save);
          this.refreshMenu();
          this.renderWorldPanel();
        };
        grid.appendChild(btn);
      });
      wrap.appendChild(group);
    });
  };

  UI.showStageClear = function(game, info) {
    this.hideStageHUD();
    const stage = game.stage;
    const modal = document.getElementById("stageClearModal");
    if (!modal) return;
    document.getElementById("stageClearTitle").textContent = `${stage.name} Clear!`;
    document.getElementById("stageClearSubtitle").textContent = `${stage.title} completed in ${this.fmt(game.time)} · ${game.kills} kills.`;
    document.getElementById("stageRewardsRepeat").innerHTML = (info.rewards.length ? info.rewards : ["No repeat rewards"]).map(x => `<div>• ${x}</div>`).join("");
    document.getElementById("stageRewardsFirst").innerHTML = (info.firstRewards.length ? info.firstRewards : [info.firstClear ? "No first-clear bonus" : "Already claimed earlier"]).map(x => `<div>• ${x}</div>`).join("");
    const unlock = document.getElementById("stageUnlockText");
    unlock.textContent = info.unlocked ? `${stageById(info.unlocked).name} unlocked` : "No further stage unlocked";
    document.getElementById("nextStageBtn").disabled = !stage.next;
    modal.classList.remove("hidden");
  };

  UI.hideStageClear = function() { document.getElementById("stageClearModal")?.classList.add("hidden"); };

  const originalQuit = UI.quit.bind(UI);
  UI.quit = function patchedQuit() {
    this.hideStageHUD();
    this.hideStageClear();
    return originalQuit();
  };

  const originalUpdateHUD = UI.updateHUD.bind(UI);
  UI.updateHUD = function patchedUpdateHUD(game) {
    originalUpdateHUD(game);
    this.updateStageHUD(game);
  };

  // -------- Gear drag & drop PC/mobile --------
  UI.renderGear = function patchedRenderGear() {
    const inv = document.getElementById("inventory");
    if (inv) inv.classList.remove("drag-target");

    document.querySelectorAll(".gear-slot").forEach(btn => {
      const slot = btn.dataset.slot;
      const g = this.save.equipped[slot];
      btn.className = `gear-slot ${slot.toLowerCase()} ${g ? "" : "empty"} ${this.selectedGear && this.selectedGear.id === g?.id ? "selected" : ""}`;
      btn.dataset.short = slot.slice(0, 3).toUpperCase();
      btn.dataset.gearId = g?.id || "";
      btn.innerHTML = g ? `<span>${this.gearEmoji(g)}</span>` : "";
      btn.onclick = () => { if (g) this.showGearDetails(g, "equipped"); else this.showEmptySlot(slot); this.highlightGear(g?.id); };
    });

    inv.innerHTML = "";
    this.save.inventory.forEach(g => {
      const el = document.createElement("button");
      el.className = `inv-item rarity-${g.rarity.toLowerCase()} ${this.selectedGear && this.selectedGear.id === g.id ? "selected" : ""}`;
      el.dataset.gearId = g.id;
      el.dataset.slot = g.slot;
      el.innerHTML = `<span>${this.gearEmoji(g)}</span><small>${g.slot}</small>`;
      el.onclick = () => { this.showGearDetails(g, "inventory"); this.highlightGear(g.id); };
      inv.appendChild(el);
    });

    document.getElementById("inventoryCount").textContent = `${this.save.inventory.length} items`;
    const stats = this.totalGearStats(this.save);
    document.getElementById("totalStats").innerHTML = "<h3>Total Stats</h3>" + (Object.keys(stats).length ? Object.entries(stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${Math.round(v*10)/10}</b></div>`).join("") : "<p>No gear equipped.</p>");
    if (!this.selectedGear) this.showEmptySlot("Select item");
    this.installPointerGearDrag();
  };

  UI.installPointerGearDrag = function installPointerGearDrag() {
    if (this.__dragBound) return;
    this.__dragBound = true;
    const startDrag = (payload, x, y) => {
      this.__dragPayload = payload;
      const ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      ghost.innerHTML = `<span>${payload.emoji}</span>`;
      document.body.appendChild(ghost);
      this.__dragGhost = ghost;
      this.moveDragGhost(x, y);
      this.highlightSlots(payload);
      document.getElementById("inventory")?.classList.add("drag-target");
    };

    const clearDrag = () => {
      this.__dragPayload = null;
      this.__dragGhost?.remove();
      this.__dragGhost = null;
      document.querySelectorAll('.gear-slot').forEach(el => el.classList.remove('drag-eligible', 'drag-disabled'));
      document.getElementById("inventory")?.classList.remove("drag-target");
    };

    document.addEventListener("pointermove", e => {
      if (!this.__dragGhost) return;
      this.moveDragGhost(e.clientX, e.clientY);
    }, { passive:true });

    document.addEventListener("pointerup", e => {
      if (!this.__dragPayload) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const slotBtn = target?.closest?.('.gear-slot');
      const inv = target?.closest?.('#inventory');
      const payload = this.__dragPayload;
      if (payload.source === "inventory" && slotBtn && slotBtn.dataset.slot === payload.slot) {
        this.equipGear(payload.id);
      } else if (payload.source === "equipped" && inv) {
        this.unequipGear(payload.slot);
      }
      clearDrag();
    });

    document.addEventListener("pointerdown", e => {
      const item = e.target.closest?.('.inv-item');
      const slot = e.target.closest?.('.gear-slot');
      if (item) {
        const gear = this.save.inventory.find(g => g.id === item.dataset.gearId);
        if (!gear) return;
        startDrag({ source:"inventory", id:gear.id, slot:gear.slot, emoji:this.gearEmoji(gear) }, e.clientX, e.clientY);
      } else if (slot && slot.dataset.gearId) {
        const g = this.save.equipped[slot.dataset.slot];
        if (!g) return;
        startDrag({ source:"equipped", id:g.id, slot:g.slot, emoji:this.gearEmoji(g) }, e.clientX, e.clientY);
      }
    });
  };

  UI.highlightSlots = function highlightSlots(payload) {
    document.querySelectorAll('.gear-slot').forEach(el => {
      const ok = payload.source === "inventory" && el.dataset.slot === payload.slot;
      const bad = payload.source === "inventory" && el.dataset.slot !== payload.slot;
      el.classList.toggle('drag-eligible', ok);
      el.classList.toggle('drag-disabled', bad);
    });
  };

  UI.moveDragGhost = function moveDragGhost(x, y) { if (this.__dragGhost) this.__dragGhost.style.transform = `translate(${x}px, ${y}px)`; };
})();