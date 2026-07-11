(() => {
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG) return;

  const VERSION = "0.3.9a-world1-ground-mix";
  CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const WORLD1_GROUND_PATHS = {
    basic: "assets/map/world1_grass_basic.png",
    flowersRocks: "assets/map/world1_grass_flowers_rocks.png",
    dirtClearing: "assets/map/world1_dirt_clearing.png",
    grassDirtMix: "assets/map/world1_grass_dirt_mix.png",
    cloverFlowers: "assets/map/world1_grass_clover_flowers.png"
  };

  const loaded = {};
  const loadPromises = Object.entries(WORLD1_GROUND_PATHS).map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { loaded[key] = img; resolve(true); };
    img.onerror = () => { console.warn('Missing world1 ground tile:', src); resolve(false); };
    img.decoding = 'async';
    img.src = src;
  }));

  const proto = CherriftGame.prototype;
  const oldStart = proto.start;
  if (!proto.__v039aWorldGroundStartPatched) {
    proto.start = async function v039aStart(...args) {
      await Promise.all(loadPromises).catch(() => {});
      return await oldStart.apply(this, args);
    };
    proto.__v039aWorldGroundStartPatched = true;
  }

  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = (h ^ (h >> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  function pickWorld1Tile(gx, gy) {
    const r = hash2(gx, gy);
    // weighted selection: mostly grass, sometimes mixed accent tiles.
    if (r < 0.36) return loaded.basic;
    if (r < 0.58) return loaded.grassDirtMix || loaded.basic;
    if (r < 0.77) return loaded.cloverFlowers || loaded.basic;
    if (r < 0.92) return loaded.flowersRocks || loaded.grassDirtMix || loaded.basic;
    return loaded.dirtClearing || loaded.grassDirtMix || loaded.basic;
  }

  const oldDrawGround = proto.drawGround;
  if (!proto.__v039aWorldGroundPatched) {
    proto.drawGround = function v039aDrawGround(c, zoom = 1) {
      const stage = this.stage || this.getSelectedStage?.();
      const isNight = stage?.theme === 'forest_night';
      const isWorld1Like = !isNight && (stage?.world === 1 || stage?.theme === 'forest_day' || /^world_1_/i.test(stage?.id || ''));

      if (!isWorld1Like) return oldDrawGround.call(this, c, zoom);

      const fallback = this.assets?.get?.('grass');
      const primaryLoaded = loaded.basic || loaded.grassDirtMix || loaded.cloverFlowers || loaded.flowersRocks || loaded.dirtClearing;
      if (!primaryLoaded && !fallback) return oldDrawGround.call(this, c, zoom);

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
          const img = pickWorld1Tile(gx, gy) || fallback;
          if (img) c.drawImage(img, x, y, size, size);
          else c.fillRect(x, y, size, size);

          // ultra-light tint variance so adjacent repeated tiles feel softer.
          const r = hash2(gx + 91, gy - 37);
          if (r > 0.7) {
            c.save();
            c.globalAlpha = 0.03 + (r - 0.7) * 0.05;
            c.fillStyle = r > 0.86 ? '#fff6de' : '#7ecb5c';
            c.fillRect(x, y, size, size);
            c.restore();
          }
        }
      }
    };
    proto.__v039aWorldGroundPatched = true;
  }

  if (window.UI?.refreshMenu) {
    const oldRefresh = UI.refreshMenu.bind(UI);
    if (!UI.__v039aWorldGroundRefreshPatched) {
      UI.refreshMenu = function v039aRefresh(...args) {
        const result = oldRefresh(...args);
        const build = document.getElementById('menuBuildVersion');
        if (build) build.textContent = 'v0.3.9a WORLD1 GROUND MIX';
        return result;
      };
      UI.__v039aWorldGroundRefreshPatched = true;
    }
  }
})();
