(() => {
  const VERSION = "0.3.7-preload-gear-worldselect";
  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const STAGES = [
    { id:"world_1_1", world:1, index:1, name:"World 1-1", title:"Blooming Meadow", theme:"forest_day", goalKills:120, energy:5, repeatReward:{coins:28}, firstClearReward:{coins:55,keys:1}, desc:"Az első pálya már igazi progression: több mob, több raid, hosszabb clear." },
    { id:"world_1_2", world:1, index:2, name:"World 1-2", title:"Petal Trail", theme:"forest_day", goalKills:135, energy:5, repeatReward:{coins:32}, firstClearReward:{coins:62}, desc:"Gyorsabb spawn, több slime típus és erősebb raid hullámok." },
    { id:"world_1_3", world:1, index:3, name:"World 1-3", title:"Clover Crossing", theme:"forest_day", goalKills:155, energy:5, repeatReward:{coins:36}, firstClearReward:{coins:70}, desc:"Blue slime és mixed raid hullámok erősebben jelennek meg." },
    { id:"world_1_4", world:1, index:4, name:"World 1-4", title:"Rooted Hollow", theme:"forest_day", goalKills:175, energy:5, repeatReward:{coins:42}, firstClearReward:{coins:82,keys:1}, desc:"Tankosabb slimeok, nagyobb raid nyomás." },
    { id:"world_1_5", world:1, index:5, name:"World 1-5", title:"Slime Nest", theme:"forest_day", goalKills:210, energy:5, repeatReward:{coins:52}, firstClearReward:{coins:110,keys:1}, desc:"World 1 záró pálya mini boss-szal és nagy raid hullámokkal." },
    { id:"world_2_1", world:2, index:1, name:"World 2-1", title:"Night Bloom", theme:"forest_night", goalKills:145, energy:5, repeatReward:{coins:38}, firstClearReward:{coins:72}, desc:"Az első sötét pálya. Új rovar/pók enemy pool." },
    { id:"world_2_2", world:2, index:2, name:"World 2-2", title:"Moonlit Grove", theme:"forest_night", goalKills:165, energy:5, repeatReward:{coins:44}, firstClearReward:{coins:84}, desc:"Éjszakai raid hullámok, gyorsabb mozgású ellenfelekkel." },
    { id:"world_2_3", world:2, index:3, name:"World 2-3", title:"Shadow Thicket", theme:"forest_night", goalKills:185, energy:5, repeatReward:{coins:50}, firstClearReward:{coins:96}, desc:"Sűrűbb spawn, agresszívebb rovarok." },
    { id:"world_2_4", world:2, index:4, name:"World 2-4", title:"Echo Burrow", theme:"forest_night", goalKills:205, energy:5, repeatReward:{coins:58}, firstClearReward:{coins:110,keys:1}, desc:"Erős éjszakai raid pálya." },
    { id:"world_2_5", world:2, index:5, name:"World 2-5", title:"Midnight Den", theme:"forest_night", goalKills:240, energy:5, repeatReward:{coins:68}, firstClearReward:{coins:135,keys:1}, desc:"World 2 záró pálya mini boss-szal." }
  ];

  const ASSETS_TO_PRELOAD = [
    "assets/player/skins/base_cherry/base_cherry_splash_art.png",
    "assets/player/skins/base_cherry/cherry_splash_art.png",
    "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.jpg",
    "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.png",
    "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png",
    "assets/map/world1.png",
    "assets/map/world2.png",
    "assets/map/grass_tile.png",
    "assets/map/grass_tile02.png",
    "assets/map/bush_01.png",
    "assets/map/bush_02.png",
    "assets/map/flower1.png",
    "assets/map/flower2.png",
    "assets/map/log.png",
    "assets/map/mushroom.png",
    "assets/map/rock_big.png",
    "assets/map/rock_small.png",
    "assets/map/tree_big.png",
    "assets/map/tree_small.png",
    "assets/pickups/xp_small.png",
    "assets/pickups/xp_big.png",
    "assets/effects/base_hit_effect_01.png",
    "assets/effects/base_hit_effect_02.png",
    "assets/effects/base_hit_effect_03.png",
    "assets/enemies/slime_sprite_sheet.png"
  ];

  const cache = new Map();
  const byId = id => document.getElementById(id);

  function createPreloader() {
    if (byId("bootPreloaderV037")) return byId("bootPreloaderV037");
    const el = document.createElement("section");
    el.id = "bootPreloaderV037";
    el.className = "boot-preloader-v037";
    el.innerHTML = `
      <div class="boot-preloader-card-v037">
        <h1>CHERRIFT</h1>
        <div class="boot-bar-v037"><i id="bootFillV037"></i></div>
        <div id="bootTextV037" class="boot-text-v037">Preparing assets...</div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function setPreloadProgress(done, total, text) {
    const fill = byId("bootFillV037");
    const label = byId("bootTextV037");
    if (fill) fill.style.width = `${Math.max(5, Math.round(done / Math.max(1, total) * 100))}%`;
    if (label) label.textContent = text || `Loading assets ${done}/${total}`;
  }

  function loadImage(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ src, ok:true, img });
      img.onerror = () => resolve({ src, ok:false, img:null });
      img.decoding = "async";
      img.src = src;
    });
    cache.set(src, p);
    return p;
  }

  async function preloadAll() {
    document.body.classList.add("preloading-v037");
    const pre = createPreloader();
    const total = ASSETS_TO_PRELOAD.length;
    let done = 0;
    setPreloadProgress(0, total, "Preparing assets...");

    const jobs = ASSETS_TO_PRELOAD.map(src => loadImage(src).then(res => {
      done++;
      setPreloadProgress(done, total, `Loading assets ${done}/${total}`);
      return res;
    }));

    const results = await Promise.all(jobs);
    const failed = results.filter(r => !r.ok).length;
    setPreloadProgress(total, total, failed ? `Ready · ${failed} optional missing` : "Ready!");
    await new Promise(r => setTimeout(r, 180));
    pre.classList.add("hidden");
    document.body.classList.remove("preloading-v037");
  }

  function rewardText(obj) {
    if (!obj) return "-";
    const parts = [];
    if (obj.coins) parts.push(`+${obj.coins} coins`);
    if (obj.keys) parts.push(`+${obj.keys} key`);
    return parts.join(" · ") || "-";
  }

  function ensureWorldDots() {
    const card = byId("carouselStageImage")?.parentElement || document.querySelector(".world-carousel-card");
    if (!card) return null;
    let dots = byId("worldStageDotsV037");
    if (!dots) {
      dots = document.createElement("div");
      dots.id = "worldStageDotsV037";
      dots.className = "world-stage-dots-v037";
      const img = byId("carouselStageImage");
      (img || card).insertAdjacentElement("afterend", dots);
    }
    return dots;
  }

  function ensureStageSave(save) {
    if (!save) return;
    if (!Array.isArray(save.unlockedStages)) save.unlockedStages = ["world_1_1"];
    if (!save.selectedStageId) save.selectedStageId = "world_1_1";
  }

  function unlocked(save, id) {
    ensureStageSave(save);
    return save.unlockedStages.includes(id);
  }

  function cleared(save, id) {
    return !!save?.clearedStages?.[id] || !!save?.stageStats?.[id]?.clears;
  }

  function renderWorldPanelV037() {
    if (!window.UI) return;
    ensureStageSave(UI.save);
    if (UI.worldCarouselIndex == null) {
      const selected = UI.save?.selectedStageId || "world_1_1";
      UI.worldCarouselIndex = Math.max(0, STAGES.findIndex(s => s.id === selected));
    }
    UI.worldCarouselIndex = Math.max(0, Math.min(STAGES.length - 1, UI.worldCarouselIndex || 0));
    const stage = STAGES[UI.worldCarouselIndex] || STAGES[0];

    const set = (id, text) => { const el = byId(id); if (el) el.textContent = text; };
    set("carouselWorldLabel", `World ${stage.world}`);
    set("carouselStageName", stage.name);
    set("carouselStageTitle", stage.title);
    set("carouselStageDesc", stage.desc);
    set("carouselStageObjective", `${stage.goalKills} enemies`);
    set("carouselStageReward", rewardText(stage.repeatReward));
    set("carouselStageFirstReward", UI.save?.firstClearClaimed?.[stage.id] ? "Claimed" : rewardText(stage.firstClearReward));
    set("worldSelectedInfo", `${stage.name} · ${stage.title} · ${stage.goalKills} enemies`);

    const state = byId("carouselStageState");
    const isUnlocked = unlocked(UI.save, stage.id);
    const isCleared = cleared(UI.save, stage.id);
    if (state) {
      state.className = `world-state-pill ${isCleared ? "cleared" : isUnlocked ? "unlocked" : "locked"}`;
      state.textContent = isCleared ? "Cleared" : isUnlocked ? "Unlocked" : "Locked";
    }

    const img = byId("carouselStageImage");
    if (img) {
      img.classList.toggle("night", stage.theme === "forest_night");
      img.classList.add("has-world-art");
      const src = stage.world === 2 ? "assets/map/world2.png" : "assets/map/world1.png";
      img.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.04), rgba(5,3,12,.36)), url("${src}")`;
    }

    const prev = byId("worldPrevBtn");
    const next = byId("worldNextBtn");
    const launch = byId("worldLaunchBtn");
    if (prev) prev.disabled = UI.worldCarouselIndex <= 0;
    if (next) next.disabled = UI.worldCarouselIndex >= STAGES.length - 1;
    if (launch) {
      launch.disabled = !isUnlocked;
      launch.textContent = isUnlocked ? "PLAY" : "LOCKED";
    }

    const dots = ensureWorldDots();
    if (dots) {
      dots.innerHTML = STAGES.map((s, i) => `<button type="button" class="${i === UI.worldCarouselIndex ? "active" : ""} ${unlocked(UI.save, s.id) ? "" : "locked"}" data-stage-index="${i}" title="${s.name}"></button>`).join("");
      dots.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", e => {
          e.preventDefault();
          UI.worldCarouselIndex = Number(btn.dataset.stageIndex || 0);
          renderWorldPanelV037();
        });
      });
    }
  }

  function patchWorldSelect() {
    if (!window.UI || UI.__v037WorldPatched) return;
    UI.__v037WorldPatched = true;

    UI.renderWorldPanel = renderWorldPanelV037;
    UI.moveWorldCarousel = function moveWorldCarouselV037(dir) {
      this.worldCarouselIndex = Math.max(0, Math.min(STAGES.length - 1, (this.worldCarouselIndex || 0) + dir));
      renderWorldPanelV037();
    };
    UI.openWorldSelect = function openWorldSelectV037() {
      ensureStageSave(this.save);
      const selected = this.save.selectedStageId || "world_1_1";
      const idx = STAGES.findIndex(s => s.id === selected);
      this.worldCarouselIndex = idx >= 0 ? idx : 0;
      this.open?.("worlds");
      renderWorldPanelV037();
    };
  }

  function patchGearDrag() {
    if (!window.UI || UI.__v037GearPatched) return;
    UI.__v037GearPatched = true;

    UI.__dragPointerId = null;

    UI.clearGearDragV037 = function clearGearDragV037() {
      this.__dragPayload = null;
      this.__dragPointerId = null;
      this.__dragGhost?.remove();
      this.__dragGhost = null;
      document.body.classList.remove("gear-dragging-v037");
      document.querySelectorAll(".gear-slot").forEach(el => el.classList.remove("drag-eligible", "drag-disabled"));
      byId("inventory")?.classList.remove("drag-target");
    };

    UI.installPointerGearDrag = function installPointerGearDragV037() {
      if (this.__dragBoundV037) return;
      this.__dragBoundV037 = true;

      const startDrag = (payload, e) => {
        if (!payload || this.__dragPayload) return;
        e.preventDefault?.();
        e.stopPropagation?.();

        this.__dragPayload = payload;
        this.__dragPointerId = e.pointerId;
        document.body.classList.add("gear-dragging-v037");

        const ghost = document.createElement("div");
        ghost.className = "drag-ghost";
        ghost.innerHTML = `<span>${payload.emoji}</span>`;
        document.body.appendChild(ghost);
        this.__dragGhost = ghost;
        this.moveDragGhost(e.clientX, e.clientY);
        this.highlightSlots(payload);
        byId("inventory")?.classList.add("drag-target");

        try { e.target.setPointerCapture?.(e.pointerId); } catch (_) {}
      };

      const endDrag = e => {
        if (!this.__dragPayload) return;
        e.preventDefault?.();
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const slotBtn = target?.closest?.(".gear-slot");
        const inv = target?.closest?.("#inventory");
        const payload = this.__dragPayload;

        if (payload.source === "inventory" && slotBtn && slotBtn.dataset.slot === payload.slot) {
          this.equipGear(payload.id);
        } else if (payload.source === "equipped" && inv) {
          this.unequipGear(payload.slot);
        }

        this.clearGearDragV037();
      };

      document.addEventListener("pointermove", e => {
        if (!this.__dragGhost) return;
        e.preventDefault?.();
        this.moveDragGhost(e.clientX, e.clientY);
      }, { passive:false });

      document.addEventListener("pointerup", endDrag, { passive:false });
      document.addEventListener("pointercancel", e => {
        e.preventDefault?.();
        this.clearGearDragV037();
      }, { passive:false });

      window.addEventListener("blur", () => this.clearGearDragV037());
      document.addEventListener("visibilitychange", () => { if (document.hidden) this.clearGearDragV037(); });

      document.addEventListener("pointerdown", e => {
        const gearPanel = e.target.closest?.("#gear");
        if (!gearPanel) return;
        const item = e.target.closest?.(".inv-item");
        const slot = e.target.closest?.(".gear-slot");

        if (item) {
          const gear = this.save?.inventory?.find(g => g.id === item.dataset.gearId);
          if (!gear) return;
          startDrag({ source:"inventory", id:gear.id, slot:gear.slot, emoji:this.gearEmoji(gear) }, e);
        } else if (slot && slot.dataset.gearId) {
          const g = this.save?.equipped?.[slot.dataset.slot];
          if (!g) return;
          startDrag({ source:"equipped", id:g.id, slot:g.slot, emoji:this.gearEmoji(g) }, e);
        }
      }, { passive:false });
    };
  }

  function patchBootAndBind() {
    patchWorldSelect();
    patchGearDrag();

    const oldBind = UI.bind?.bind(UI);
    if (oldBind && !UI.__v037BindPatched) {
      UI.bind = function bindV037(...args) {
        const result = oldBind(...args);
        patchWorldSelect();
        patchGearDrag();
        this.renderWorldPanel?.();
        this.installPointerGearDrag?.();
        return result;
      };
      UI.__v037BindPatched = true;
    }

    const oldOpen = UI.open?.bind(UI);
    if (oldOpen && !UI.__v037OpenPatched) {
      UI.open = function openV037(id, ...args) {
        const result = oldOpen(id, ...args);
        if (id === "worlds") setTimeout(renderWorldPanelV037, 0);
        if (id === "gear") setTimeout(() => this.installPointerGearDrag?.(), 0);
        return result;
      };
      UI.__v037OpenPatched = true;
    }

    const oldRefresh = UI.refreshMenu?.bind(UI);
    if (oldRefresh && !UI.__v037RefreshPatched) {
      UI.refreshMenu = function refreshV037(...args) {
        const result = oldRefresh(...args);
        const build = byId("menuBuildVersion");
        if (build) build.textContent = "v0.3.7 OPTIMIZE HOTFIX";
        return result;
      };
      UI.__v037RefreshPatched = true;
    }
  }

  function boot() {
    patchBootAndBind();
    preloadAll().then(() => {
      patchBootAndBind();
      UI?.refreshMenu?.();
      UI?.renderWorldPanel?.();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();