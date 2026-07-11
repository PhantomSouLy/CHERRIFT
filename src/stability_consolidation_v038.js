(() => {
  if (!window.UI || !window.CherriftGame || !window.CherriftStorage) return;

  const VERSION = "0.3.8-stability";
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

  const q = sel => document.querySelector(sel);
  const qa = sel => Array.from(document.querySelectorAll(sel));
  const id = x => document.getElementById(x);

  const SKIN_SPLASH = {
    cherry_default: [
      "assets/player/skins/base_cherry/base_cherry_splash_art.png",
      "assets/player/skins/base_cherry/cherry_splash_art.png"
    ],
    fairy_cherry: [
      "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.jpg",
      "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.png"
    ],
    beastclaw_cherry: [
      "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png"
    ]
  };

  const imageCache = new Map();
  function firstImage(urls, cb) {
    const cached = urls.find(u => imageCache.get(u) === true);
    if (cached) return cb(cached);
    let i = 0;
    const next = () => {
      const url = urls[i++];
      if (!url) return cb(null);
      if (imageCache.get(url) === false) return next();
      const img = new Image();
      img.onload = () => { imageCache.set(url, true); cb(url); };
      img.onerror = () => { imageCache.set(url, false); next(); };
      img.decoding = "async";
      img.src = url;
    };
    next();
  }

  function rewardText(obj) {
    if (!obj) return "-";
    const parts = [];
    if (obj.coins) parts.push(`+${obj.coins} coins`);
    if (obj.keys) parts.push(`+${obj.keys} key`);
    return parts.join(" · ") || "-";
  }

  function ensureSave(save) {
    if (!save) return;
    if (!Array.isArray(save.unlockedStages)) save.unlockedStages = ["world_1_1"];
    if (!save.selectedStageId) save.selectedStageId = "world_1_1";
    if (!save.clearedStages) save.clearedStages = {};
    if (!save.stageStats) save.stageStats = {};
    if (!save.firstClearClaimed) save.firstClearClaimed = {};
  }

  function unlocked(save, stageId) {
    ensureSave(save);
    return save.unlockedStages.includes(stageId);
  }

  function cleared(save, stageId) {
    return !!save?.clearedStages?.[stageId] || !!save?.stageStats?.[stageId]?.clears;
  }

  // ---------- Safe cloning/binding ----------
  function cloneById(nodeId) {
    const old = id(nodeId);
    if (!old) return null;
    const clone = old.cloneNode(true);
    old.replaceWith(clone);
    return clone;
  }

  function safeClick(el, fn) {
    if (!el) return;
    el.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    };
  }

  function bindAllStaticButtons() {
    safeClick(cloneById("playBtn"), () => UI.openWorldSelect());
    safeClick(cloneById("mobilePlayBtn"), () => UI.openWorldSelect());

    safeClick(cloneById("skinPrev"), () => {
      UI.skinIndex = (UI.skinIndex - 1 + (CHERRIFT_DATA.skins?.length || 1)) % (CHERRIFT_DATA.skins?.length || 1);
      UI.renderSkinCarousel();
    });
    safeClick(cloneById("skinNext"), () => {
      UI.skinIndex = (UI.skinIndex + 1) % (CHERRIFT_DATA.skins?.length || 1);
      UI.renderSkinCarousel();
    });
    safeClick(cloneById("skinEquip"), () => {
      const skin = CHERRIFT_DATA.skins[UI.skinIndex];
      if (!skin) return;
      if (!UI.save.unlockedSkins.includes(skin.id)) return UI.toast?.("Skin locked");
      UI.save.selectedSkin = skin.id;
      CherriftStorage.save(UI.save);
      UI.refreshMenu();
      UI.renderSkinCarousel();
      UI.toast?.(`${skin.name} equipped`);
    });

    safeClick(cloneById("worldPrevBtn"), () => UI.moveWorldCarousel(-1));
    safeClick(cloneById("worldNextBtn"), () => UI.moveWorldCarousel(1));
    safeClick(cloneById("worldBackBtn"), () => UI.open("menu"));
    safeClick(cloneById("worldLaunchBtn"), e => UI.launchSelectedWorld ? UI.launchSelectedWorld(e) : UI.game.start());

    safeClick(cloneById("openChest"), () => UI.openChest());
    safeClick(cloneById("pause"), () => UI.pause());
    safeClick(cloneById("resume"), () => UI.resume());
    safeClick(cloneById("quit"), () => UI.quit());
    safeClick(cloneById("retry"), () => UI.game.start());
    safeClick(cloneById("toMenu"), () => UI.quit());
    safeClick(cloneById("fullscreen"), () => UI.fullscreen());
    safeClick(cloneById("pauseFullscreen"), () => UI.fullscreen());
    safeClick(cloneById("pauseSettings"), () => {
      document.body.classList.add("settings-from-pause");
      id("pauseModal")?.classList.add("hidden");
      UI.open("settings");
    });

    safeClick(cloneById("nextStageBtn"), () => { UI.hideStageClear?.(); UI.game.start(); });
    safeClick(cloneById("replayStageBtn"), () => { UI.hideStageClear?.(); UI.game.start(); });
    safeClick(cloneById("stageClearToMenuBtn"), () => { UI.hideStageClear?.(); UI.quit(); });

    qa("[data-open]").forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      safeClick(clone, () => {
        const target = clone.dataset.open;
        if (target === "worlds") UI.openWorldSelect();
        else UI.open(target);
      });
    });

    qa(".back").forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      safeClick(clone, () => {
        if (document.body.classList.contains("settings-from-pause") && id("settings") && !id("settings").classList.contains("hidden")) {
          id("settings").classList.add("hidden");
          id("pauseModal")?.classList.remove("hidden");
          return;
        }
        UI.open("menu");
      });
    });
  }

  // ---------- Skin ----------
  function combatTypeForSkin(skin) {
    const cfg = CHERRIFT_CONFIG.player?.skins?.[skin?.id] || {};
    if (cfg.attackType === "melee" || skin?.id?.includes("beastclaw")) return "Melee";
    if (cfg.skillType === "magic_burst" || skin?.id?.includes("fairy")) return "Magic";
    return "Ranged";
  }

  function skillInfoForSkin(skin) {
    const sid = skin?.id || "";
    if (sid.includes("beastclaw")) return "Rövid előretörés és nagy területű karmolás. Közelharci burst sebzés.";
    if (sid.includes("fairy")) return "Mágikus burst Cherry körül. Több ellenfelet sebez egyszerre.";
    return "Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel.";
  }

  function renderSkinCarouselStable() {
    const skins = CHERRIFT_DATA.skins || [];
    if (!skins.length) return;
    UI.skinIndex = Math.max(0, Math.min(skins.length - 1, UI.skinIndex || 0));
    const skin = skins[UI.skinIndex];
    const unlockedSkin = UI.save.unlockedSkins.includes(skin.id);
    const selected = UI.save.selectedSkin === skin.id;

    const rarity = id("skinRarity");
    const name = id("skinName");
    const desc = id("skinDesc");
    const kit = q("#skins .skin-kit");
    const equip = id("skinEquip");
    const portrait = id("skinPortrait");
    const splash = id("skinSplash");
    const mini = id("skinMini");

    if (rarity) {
      rarity.textContent = skin.rarity + (unlockedSkin ? "" : " · LOCKED");
      rarity.className = `rarity-pill rarity-${String(skin.rarity || "Common").toLowerCase()}`;
    }
    if (name) name.textContent = skin.name;
    if (desc) desc.textContent = "";
    if (mini) mini.textContent = "";

    let row = id("skinMetaRowV038");
    if (!row && rarity) {
      row = document.createElement("div");
      row.id = "skinMetaRowV038";
      row.className = "skin-meta-row-v038";
      rarity.insertAdjacentElement("afterend", row);
    }
    if (row) {
      row.innerHTML = "";
      row.appendChild(rarity);
      const combat = document.createElement("span");
      combat.className = "combat-pill-v038";
      combat.textContent = combatTypeForSkin(skin);
      row.appendChild(combat);
    }

    if (kit) {
      kit.className = "skin-kit skin-kit-v038";
      kit.innerHTML = `
        <div id="skillLineV038" class="skill-line-v038 glass">
          <span>Skill</span>
          <b><i class="skill-icon-v038">✦</i><span>${skin.skill || "Skill"}</span></b>
          <p id="skillBubbleV038" class="skill-bubble-v038 hidden">${skillInfoForSkin(skin)}</p>
        </div>`;
      const line = id("skillLineV038");
      const bubble = id("skillBubbleV038");
      safeClick(line, () => bubble?.classList.toggle("hidden"));
    }

    if (equip) {
      equip.disabled = !unlockedSkin;
      equip.textContent = selected ? "EQUIPPED" : unlockedSkin ? "EQUIP" : "LOCKED";
    }

    if (splash) {
      const urls = SKIN_SPLASH[skin.id] || [`assets/player/skins/${skin.id}/${skin.id}_splash_art.png`, `assets/player/skins/${skin.id}/${skin.id}_splash_art.jpg`];
      splash.classList.add("splash-loading");
      const token = `${skin.id}-${Date.now()}`;
      splash.dataset.token = token;
      firstImage(urls, url => {
        if (splash.dataset.token !== token) return;
        splash.classList.remove("splash-loading");
        if (url) {
          splash.classList.add("has-splash-art");
          splash.classList.remove("no-splash-art");
          splash.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.02), rgba(5,3,12,.24)), url("${url}")`;
          if (portrait) portrait.textContent = "";
        } else {
          splash.classList.remove("has-splash-art");
          splash.classList.add("no-splash-art");
          splash.style.backgroundImage = `radial-gradient(circle at 50% 40%, rgba(255,255,255,.16), transparent 26%), linear-gradient(135deg, ${skin.gradient?.[0] || "#ff73b9"}, ${skin.gradient?.[1] || "#281226"})`;
          if (portrait) portrait.textContent = skin.emoji || "🐰";
        }
      });
    }
  }

  // ---------- World Select ----------
  function renderWorldPanelStable() {
    ensureSave(UI.save);
    if (UI.worldCarouselIndex == null) {
      const idx = STAGES.findIndex(s => s.id === UI.save.selectedStageId);
      UI.worldCarouselIndex = idx >= 0 ? idx : 0;
    }
    UI.worldCarouselIndex = Math.max(0, Math.min(STAGES.length - 1, UI.worldCarouselIndex));
    const stage = STAGES[UI.worldCarouselIndex];

    const set = (nodeId, text) => { const el = id(nodeId); if (el) el.textContent = text; };
    set("carouselWorldLabel", `World ${stage.world}`);
    set("carouselStageName", stage.name);
    set("carouselStageTitle", stage.title);
    set("carouselStageDesc", stage.desc);
    set("carouselStageObjective", `${stage.goalKills} enemies`);
    set("carouselStageReward", rewardText(stage.repeatReward));
    set("carouselStageFirstReward", UI.save.firstClearClaimed?.[stage.id] ? "Claimed" : rewardText(stage.firstClearReward));
    set("worldSelectedInfo", `${stage.name} · ${stage.title} · ${stage.goalKills} enemies`);

    const isUnlocked = unlocked(UI.save, stage.id);
    const isCleared = cleared(UI.save, stage.id);
    const state = id("carouselStageState");
    if (state) {
      state.className = `world-state-pill ${isCleared ? "cleared" : isUnlocked ? "unlocked" : "locked"}`;
      state.textContent = isCleared ? "Cleared" : isUnlocked ? "Unlocked" : "Locked";
    }

    const img = id("carouselStageImage");
    if (img) {
      img.classList.toggle("night", stage.theme === "forest_night");
      img.classList.add("has-world-art");
      const src = stage.world === 2 ? "assets/map/world2.png" : "assets/map/world1.png";
      img.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.04), rgba(5,3,12,.36)), url("${src}")`;
    }

    const prev = id("worldPrevBtn");
    const next = id("worldNextBtn");
    const launch = id("worldLaunchBtn");
    if (prev) prev.disabled = UI.worldCarouselIndex <= 0;
    if (next) next.disabled = UI.worldCarouselIndex >= STAGES.length - 1;
    if (launch) {
      launch.disabled = !isUnlocked;
      launch.textContent = isUnlocked ? "PLAY" : "LOCKED";
    }

    let dots = id("worldStageDotsV038");
    if (!dots) {
      dots = document.createElement("div");
      dots.id = "worldStageDotsV038";
      dots.className = "world-stage-dots-v038";
      id("carouselStageImage")?.insertAdjacentElement("afterend", dots);
    }
    if (dots) {
      dots.innerHTML = STAGES.map((s, i) => `<button type="button" class="${i === UI.worldCarouselIndex ? "active" : ""} ${unlocked(UI.save, s.id) ? "" : "locked"}" data-i="${i}" title="${s.name}"></button>`).join("");
      qa("#worldStageDotsV038 button").forEach(btn => safeClick(btn, () => {
        UI.worldCarouselIndex = Number(btn.dataset.i || 0);
        renderWorldPanelStable();
        bindAllStaticButtons();
      }));
    }

    bindAllStaticButtons();
  }

  // ---------- Gear ----------
  function renderGearStable() {
    const inv = id("inventory");
    if (!inv) return;

    qa(".gear-slot").forEach(btn => {
      const slot = btn.dataset.slot;
      const g = UI.save.equipped?.[slot];
      btn.draggable = false;
      btn.className = `gear-slot ${slot.toLowerCase()} ${g ? "" : "empty"} ${UI.selectedGear && UI.selectedGear.id === g?.id ? "selected" : ""}`;
      btn.dataset.short = slot.slice(0, 3).toUpperCase();
      btn.dataset.gearId = g?.id || "";
      btn.innerHTML = g ? `<span>${UI.gearEmoji(g)}</span>` : "";
      safeClick(btn, () => { if (g) UI.showGearDetails(g, "equipped"); else UI.showEmptySlot(slot); UI.highlightGear(g?.id); });
    });

    inv.innerHTML = "";
    UI.save.inventory.forEach(g => {
      const el = document.createElement("button");
      el.type = "button";
      el.draggable = false;
      el.className = `inv-item rarity-${g.rarity.toLowerCase()} ${UI.selectedGear && UI.selectedGear.id === g.id ? "selected" : ""}`;
      el.dataset.gearId = g.id;
      el.dataset.slot = g.slot;
      el.innerHTML = `<span>${UI.gearEmoji(g)}</span><small>${g.slot}</small>`;
      safeClick(el, () => { UI.showGearDetails(g, "inventory"); UI.highlightGear(g.id); });
      inv.appendChild(el);
    });

    const count = id("inventoryCount");
    if (count) count.textContent = `${UI.save.inventory.length} items`;
    const totalStats = id("totalStats");
    if (totalStats) {
      const stats = UI.totalGearStats(UI.save);
      totalStats.innerHTML = "<h3>Total Stats</h3>" + (Object.keys(stats).length ? Object.entries(stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${Math.round(v*10)/10}</b></div>`).join("") : "<p>No gear equipped.</p>");
    }
    if (!UI.selectedGear) UI.showEmptySlot("Select item");
    installGearPointerDrag();
  }

  function clearGearDrag() {
    UI.__gearCandidate = null;
    UI.__gearDragging = null;
    UI.__dragGhost?.remove();
    UI.__dragGhost = null;
    document.body.classList.remove("gear-dragging-v038");
    qa(".gear-slot").forEach(el => el.classList.remove("drag-eligible", "drag-disabled"));
    id("inventory")?.classList.remove("drag-target");
  }

  function createGhost(payload, x, y) {
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost v038";
    ghost.innerHTML = `<span>${payload.emoji}</span>`;
    document.body.appendChild(ghost);
    UI.__dragGhost = ghost;
    moveGhost(x, y);
  }

  function moveGhost(x, y) {
    if (UI.__dragGhost) UI.__dragGhost.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function highlightSlots(payload) {
    qa(".gear-slot").forEach(el => {
      const ok = payload.source === "inventory" && el.dataset.slot === payload.slot;
      const bad = payload.source === "inventory" && el.dataset.slot !== payload.slot;
      el.classList.toggle("drag-eligible", ok);
      el.classList.toggle("drag-disabled", bad);
    });
    id("inventory")?.classList.add("drag-target");
  }

  function installGearPointerDrag() {
    if (UI.__gearDragInstalledV038) return;
    UI.__gearDragInstalledV038 = true;

    document.addEventListener("pointerdown", e => {
      const gearPanel = e.target.closest?.("#gear");
      if (!gearPanel) return;

      const item = e.target.closest?.(".inv-item");
      const slot = e.target.closest?.(".gear-slot");
      let payload = null;

      if (item) {
        const g = UI.save.inventory.find(x => x.id === item.dataset.gearId);
        if (g) payload = { source:"inventory", id:g.id, slot:g.slot, emoji:UI.gearEmoji(g), detail:g };
      } else if (slot && slot.dataset.gearId) {
        const g = UI.save.equipped[slot.dataset.slot];
        if (g) payload = { source:"equipped", id:g.id, slot:g.slot, emoji:UI.gearEmoji(g), detail:g };
      }

      if (!payload) return;
      e.preventDefault();
      UI.__gearCandidate = { payload, pointerId:e.pointerId, startX:e.clientX, startY:e.clientY, x:e.clientX, y:e.clientY };
      document.body.classList.add("gear-dragging-v038");
      try { e.target.setPointerCapture?.(e.pointerId); } catch (_) {}
    }, { passive:false });

    document.addEventListener("pointermove", e => {
      const cand = UI.__gearCandidate;
      if (!cand || cand.pointerId !== e.pointerId) return;
      e.preventDefault();
      cand.x = e.clientX;
      cand.y = e.clientY;
      const moved = Math.hypot(e.clientX - cand.startX, e.clientY - cand.startY);

      if (!UI.__gearDragging && moved > 8) {
        UI.__gearDragging = cand.payload;
        createGhost(cand.payload, e.clientX, e.clientY);
        highlightSlots(cand.payload);
      }
      moveGhost(e.clientX, e.clientY);
    }, { passive:false });

    document.addEventListener("pointerup", e => {
      const cand = UI.__gearCandidate;
      if (!cand || cand.pointerId !== e.pointerId) return;
      e.preventDefault();

      const payload = UI.__gearDragging || cand.payload;
      const wasDragging = !!UI.__gearDragging;

      if (wasDragging) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const slotBtn = target?.closest?.(".gear-slot");
        const inv = target?.closest?.("#inventory");
        if (payload.source === "inventory" && slotBtn && slotBtn.dataset.slot === payload.slot) UI.equipGear(payload.id);
        else if (payload.source === "equipped" && inv) UI.unequipGear(payload.slot);
      } else {
        if (payload.source === "inventory") UI.showGearDetails(payload.detail, "inventory");
        else UI.showGearDetails(payload.detail, "equipped");
      }
      clearGearDrag();
    }, { passive:false });

    document.addEventListener("pointercancel", clearGearDrag, { passive:true });
    window.addEventListener("blur", clearGearDrag);
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearGearDrag(); });
  }

  // ---------- Main patch install ----------
  function install() {
    ensureSave(UI.save);

    UI.renderSkinCarousel = renderSkinCarouselStable;
    UI.renderWorldPanel = renderWorldPanelStable;
    UI.moveWorldCarousel = function(dir) {
      this.worldCarouselIndex = Math.max(0, Math.min(STAGES.length - 1, (this.worldCarouselIndex || 0) + dir));
      renderWorldPanelStable();
    };
    UI.openWorldSelect = function() {
      ensureSave(this.save);
      const selected = this.save.selectedStageId || "world_1_1";
      const idx = STAGES.findIndex(s => s.id === selected);
      this.worldCarouselIndex = idx >= 0 ? idx : 0;
      this.open("worlds");
      renderWorldPanelStable();
    };
    UI.renderGear = renderGearStable;
    UI.clearGearDragV038 = clearGearDrag;

    const build = id("menuBuildVersion");
    if (build) build.textContent = "v0.3.8 STABILITY";

    bindAllStaticButtons();
    renderSkinCarouselStable();
    renderWorldPanelStable();
    installGearPointerDrag();
  }

  const originalInit = UI.init?.bind(UI);
  UI.init = function initV038(save, game) {
    const result = originalInit(save, game);
    install();
    setTimeout(install, 0);
    setTimeout(install, 250);
    return result;
  };

  const originalOpen = UI.open?.bind(UI);
  UI.open = function openV038(panel, ...rest) {
    const result = originalOpen(panel, ...rest);
    setTimeout(() => {
      bindAllStaticButtons();
      if (panel === "skins") renderSkinCarouselStable();
      if (panel === "worlds") renderWorldPanelStable();
      if (panel === "gear") renderGearStable();
    }, 0);
    return result;
  };

  const originalRefresh = UI.refreshMenu?.bind(UI);
  UI.refreshMenu = function refreshV038(...args) {
    const result = originalRefresh(...args);
    const build = id("menuBuildVersion");
    if (build) build.textContent = "v0.3.8 STABILITY";
    return result;
  };

  if (document.readyState !== "loading") setTimeout(install, 0);
})();