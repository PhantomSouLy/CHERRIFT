(() => {
  if (!window.CHERRIFT_CONFIG || !window.CherriftGame) return;

  const VERSION = "0.3.6-real-texture-assets";
  CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  // Use real asset paths that already exist in the repo.
  CHERRIFT_CONFIG.map = {
    ...(CHERRIFT_CONFIG.map || {}),
    grass: "assets/map/grass_tile.png",
    grassNight: "assets/map/grass_tile02.png",
    rockSmall: "assets/map/rock_small.png",
    rockBig: "assets/map/rock_big.png",
    bush1: "assets/map/bush_01.png",
    bush2: "assets/map/bush_02.png",
    log: "assets/map/log.png",
    treeSmall: "assets/map/tree_small.png",
    treeBig: "assets/map/tree_big.png",
    flower1: "assets/map/flower1.png",
    flower2: "assets/map/flower2.png",
    mushroom: "assets/map/mushroom.png",
    world1: "assets/map/world1.png",
    world2: "assets/map/world2.png"
  };

  CHERRIFT_CONFIG.pickups = {
    ...(CHERRIFT_CONFIG.pickups || {}),
    xpSmall: "assets/pickups/xp_small.png",
    xpBig: "assets/pickups/xp_big.png"
  };

  CHERRIFT_CONFIG.effects = {
    ...(CHERRIFT_CONFIG.effects || {}),
    baseHit: [
      "assets/effects/base_hit_effect_01.png",
      "assets/effects/base_hit_effect_02.png",
      "assets/effects/base_hit_effect_03.png"
    ]
  };

  const EXTRA_ASSET_PATHS = {
    grassNight: CHERRIFT_CONFIG.map.grassNight,
    flower1: CHERRIFT_CONFIG.map.flower1,
    flower2: CHERRIFT_CONFIG.map.flower2,
    mushroom: CHERRIFT_CONFIG.map.mushroom
  };

  const extraImages = {};
  const loadExtraImage = (key, src) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { extraImages[key] = img; resolve(true); };
    img.onerror = () => { console.warn("Missing optional texture:", key, src); resolve(false); };
    img.src = src;
  });

  const extraReady = Promise.all(Object.entries(EXTRA_ASSET_PATHS).map(([key, src]) => loadExtraImage(key, src)));

  function image(game, key) {
    return game?.assets?.get?.(key) || extraImages[key] || null;
  }

  function drawCentered(c, img, x, y, w, h) {
    if (!img) return false;
    c.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
    return true;
  }

  const proto = CherriftGame.prototype;

  // Ensure extra images are ready when a run starts, but do not hard-fail if any optional image is missing.
  const oldStart = proto.start;
  if (!proto.__v036StartPatched) {
    proto.start = async function v036Start(...args) {
      await extraReady.catch(() => {});
      const result = await oldStart.apply(this, args);
      if (document.getElementById("menuBuildVersion")) {
        document.getElementById("menuBuildVersion").textContent = "v0.3.6 EARLY BUILD";
      }
      return result;
    };
    proto.__v036StartPatched = true;
  }

  // Add mushrooms into maps as real decorative assets.
  const oldGenerateMap = proto.generateMap;
  if (!proto.__v036GenerateMapPatched) {
    proto.generateMap = function v036GenerateMap(...args) {
      const obs = oldGenerateMap.apply(this, args) || [];
      const stage = this.getSelectedStage?.() || this.stage;
      const mushroomCount = stage?.theme === "forest_night" ? 22 : 14;

      for (let i = 0; i < mushroomCount; i++) {
        let x = 0, y = 0, ok = false;
        for (let t = 0; t < 70 && !ok; t++) {
          x = (Math.random() - .5) * 3500;
          y = (Math.random() - .5) * 3500;
          ok = Math.hypot(x, y) > 260 && obs.every(o => Math.hypot(o.x - x, o.y - y) > (o.r || 28) + 38);
        }
        if (ok) obs.push({ kind:"mushroom", x, y, r:24, solid:false, phase:Math.random() * 9 });
      }

      obs.forEach((o, i) => {
        if (o.kind === "flowers" && !o.variant) o.variant = i % 2 ? "flower2" : "flower1";
      });

      return obs;
    };
    proto.__v036GenerateMapPatched = true;
  }

  // Use grass_tile02 for night stages instead of procedural placeholder tiles.
  const oldDrawGround = proto.drawGround;
  if (!proto.__v036GroundPatched) {
    proto.drawGround = function v036DrawGround(c, zoom = 1) {
      const stage = this.stage || this.getSelectedStage?.();
      const isNight = stage?.theme === "forest_night";
      const tile = isNight ? extraImages.grassNight : this.assets?.get?.("grass");

      if (!tile) return oldDrawGround.call(this, c, zoom);

      const size = 128;
      const viewW = this.w / zoom;
      const viewH = this.h / zoom;
      const startX = Math.floor((this.camera.x - viewW / 2) / size) - 1;
      const endX = Math.floor((this.camera.x + viewW / 2) / size) + 1;
      const startY = Math.floor((this.camera.y - viewH / 2) / size) - 1;
      const endY = Math.floor((this.camera.y + viewH / 2) / size) + 1;

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const x = gx * size;
          const y = gy * size;
          c.drawImage(tile, x, y, size, size);

          if (isNight) {
            c.save();
            c.globalAlpha = .18;
            c.fillStyle = "#07122d";
            c.fillRect(x, y, size, size);
            c.restore();
          }
        }
      }
    };
    proto.__v036GroundPatched = true;
  }

  const oldDrawObstacle = proto.drawObstacle;
  if (!proto.__v036ObstaclePatched) {
    proto.drawObstacle = function v036DrawObstacle(c, o) {
      const x = o.x, y = o.y;

      if (o.kind === "mushroom" && drawCentered(c, extraImages.mushroom, x, y, 72, 62)) return;

      if (o.kind === "flowers") {
        const key = o.variant || ((Math.floor((o.x + o.y) / 64) % 2) ? "flower2" : "flower1");
        if (drawCentered(c, extraImages[key], x, y, 54, 54)) return;
      }

      // Make sure map props use the real texture assets if they are loaded by config.
      if (o.kind === "treeBig" && drawCentered(c, image(this, "treeBig"), x, y - 16, 190, 190)) return;
      if (o.kind === "treeSmall" && drawCentered(c, image(this, "treeSmall"), x, y - 12, 150, 150)) return;
      if (o.kind === "bush1" && drawCentered(c, image(this, "bush1"), x, y, 116, 98)) return;
      if (o.kind === "bush2" && drawCentered(c, image(this, "bush2"), x, y, 118, 100)) return;
      if (o.kind === "log" && drawCentered(c, image(this, "log"), x, y, 132, 82)) return;
      if (o.kind === "rockBig" && drawCentered(c, image(this, "rockBig"), x, y, 88, 70)) return;
      if (o.kind === "rockSmall" && drawCentered(c, image(this, "rockSmall"), x, y, 70, 54)) return;

      return oldDrawObstacle.call(this, c, o);
    };
    proto.__v036ObstaclePatched = true;
  }

  // Pink slime should use the actual slime sprite sheet, not the procedural slime placeholder.
  // Other new enemies can stay procedural until their real textures exist.
  const oldDrawEnemy = proto.drawEnemy;
  if (!proto.__v036EnemyPatched) {
    proto.drawEnemy = function v036DrawEnemy(c, e) {
      if (e?.enemyType === "pink_slime") {
        const img = this.assets?.get?.("slime");
        if (img) {
          const cfg = CHERRIFT_CONFIG.slime || {};
          const fw = cfg.frameWidth || 384;
          const fh = cfg.frameHeight || 384;
          const columns = cfg.columns || 4;
          const rows = cfg.rows || { move:1 };
          const frame = Math.floor((this.t + (e.phase || 0)) * 7) % columns;
          const row = rows.move || 1;
          const dw = cfg.displayWidth || 76;
          const dh = cfg.displayHeight || 76;

          c.save();
          if (e.hit > 0) c.globalAlpha = .65;
          c.drawImage(img, frame * fw, row * fh, fw, fh, e.x - dw / 2, e.y - dh / 2, dw, dh);
          c.restore();
          return;
        }
      }

      return oldDrawEnemy.call(this, c, e);
    };
    proto.__v036EnemyPatched = true;
  }

  // Keep XP orb textures and hit effect textures preferred. Base game already supports these keys,
  // but this patch makes the paths explicit and current.
  if (window.UI?.refreshMenu) {
    const oldRefresh = UI.refreshMenu.bind(UI);
    if (!UI.__v036RefreshPatched) {
      UI.refreshMenu = function v036Refresh(...args) {
        const result = oldRefresh(...args);
        const build = document.getElementById("menuBuildVersion");
        if (build) build.textContent = "v0.3.6 EARLY BUILD";
        return result;
      };
      UI.__v036RefreshPatched = true;
    }
  }
})();