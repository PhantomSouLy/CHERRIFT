(() => {
  if (!window.UI || !window.CherriftGame) return;

  const VERSION = "0.3.6c-splash-path-fix";
  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const SKIN_SPLASH_CANDIDATES = {
    cherry_default: [
      "assets/player/skins/base_cherry/base_cherry_splash_art.png",
      "assets/player/skins/base_cherry/cherry_splash_art.png",
      "assets/player/skins/base_cherry/splash_art.png"
    ],
    base_cherry: [
      "assets/player/skins/base_cherry/base_cherry_splash_art.png",
      "assets/player/skins/base_cherry/cherry_splash_art.png",
      "assets/player/skins/base_cherry/splash_art.png"
    ],
    fairy_cherry: [
      "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.jpg",
      "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.png",
      "assets/player/skins/fairy_cherry/splash_art.jpg",
      "assets/player/skins/fairy_cherry/splash_art.png"
    ],
    beastclaw_cherry: [
      "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png",
      "assets/player/skins/beastclaw_cherry/splash_art.png"
    ]
  };

  const splashCache = {};
  const splashBad = {};
  let splashToken = 0;

  const q = sel => document.querySelector(sel);
  const byId = id => document.getElementById(id);

  function candidatesForSkin(skin) {
    if (!skin) return [];
    const fromMap = SKIN_SPLASH_CANDIDATES[skin.id] || [];
    const folder = CHERRIFT_CONFIG?.player?.skins?.[skin.id]?.folder || skin.id;
    return [
      ...fromMap,
      `assets/player/skins/${folder}/${skin.id}_splash_art.png`,
      `assets/player/skins/${folder}/${skin.id}_splash_art.jpg`,
      `assets/player/skins/${folder}/splash_art.png`,
      `assets/player/skins/${folder}/splash_art.jpg`
    ].filter((v, i, a) => v && a.indexOf(v) === i);
  }

  function loadFirstWorking(urls, skinId, done) {
    if (splashCache[skinId]) return done(splashCache[skinId]);
    const list = urls.filter(u => !splashBad[u]);
    let i = 0;

    const next = () => {
      const url = list[i++];
      if (!url) return done(null);

      const img = new Image();
      img.onload = () => {
        splashCache[skinId] = url;
        done(url);
      };
      img.onerror = () => {
        splashBad[url] = true;
        next();
      };
      img.decoding = "async";
      img.src = url;
    };

    next();
  }

  function preloadSplashArt() {
    (CHERRIFT_DATA?.skins || []).forEach(skin => {
      loadFirstWorking(candidatesForSkin(skin), skin.id, () => {});
    });
  }

  function currentSkin() {
    const skins = CHERRIFT_DATA?.skins || [];
    if (!skins.length) return null;
    if (UI.skinIndex < 0 || UI.skinIndex >= skins.length) UI.skinIndex = 0;
    return skins[UI.skinIndex] || skins.find(s => s.id === UI.save?.selectedSkin) || skins[0];
  }

  function combatTypeForSkin(skin) {
    const cfg = CHERRIFT_CONFIG?.player?.skins?.[skin?.id] || {};
    if (cfg.attackType === "melee" || skin?.id?.includes("beastclaw")) return "Melee";
    if (cfg.skillType === "magic_burst" || skin?.id?.includes("fairy")) return "Magic";
    return "Ranged";
  }

  function skillInfoForSkin(skin) {
    const id = skin?.id || "";
    if (id.includes("beastclaw")) return "Rövid előretörés és nagy területű karmolás. Közelharci burst sebzés.";
    if (id.includes("fairy")) return "Mágikus burst Cherry körül. Több ellenfelet sebez egyszerre.";
    return "Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel.";
  }

  function applySkinSplash(skin) {
    const splash = byId("skinSplash");
    const portrait = byId("skinPortrait");
    if (!splash || !skin) return;

    const token = ++splashToken;
    splash.classList.add("splash-loading");

    loadFirstWorking(candidatesForSkin(skin), skin.id, url => {
      if (token !== splashToken) return;
      splash.classList.remove("splash-loading");

      if (url) {
        splash.classList.add("has-splash-art");
        splash.classList.remove("no-splash-art");
        splash.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.02), rgba(5,3,12,.24)), url("${url}")`;
        if (portrait) portrait.textContent = "";
      } else {
        splash.classList.remove("has-splash-art");
        splash.classList.add("no-splash-art");
        splash.style.backgroundImage = "";
        if (portrait) portrait.textContent = skin.emoji || "🐰";
      }
    });
  }

  function renderSkinPanel() {
    const skins = CHERRIFT_DATA?.skins || [];
    const skin = currentSkin();
    if (!skin) return;

    const unlocked = (UI.save?.unlockedSkins || []).includes(skin.id);
    const selected = UI.save?.selectedSkin === skin.id;

    const rarity = byId("skinRarity");
    const name = byId("skinName");
    const desc = byId("skinDesc");
    const mini = byId("skinMini");
    const kit = q("#skins .skin-kit");
    const equip = byId("skinEquip");

    if (rarity) {
      rarity.textContent = skin.rarity + (unlocked ? "" : " · LOCKED");
      rarity.className = `rarity-pill rarity-${String(skin.rarity || "Common").toLowerCase()}`;
    }
    if (name) name.textContent = skin.name || skin.id;
    if (desc) desc.textContent = "";
    if (mini) mini.textContent = "";

    let meta = byId("skinMetaRowV036b");
    if (!meta && rarity) {
      meta = document.createElement("div");
      meta.id = "skinMetaRowV036b";
      meta.className = "skin-meta-row-v036b";
      rarity.insertAdjacentElement("afterend", meta);
      meta.appendChild(rarity);
      const combat = document.createElement("span");
      combat.id = "skinCombatPillV036b";
      combat.className = "combat-pill-v036b";
      meta.appendChild(combat);
    }
    const combat = byId("skinCombatPillV036b");
    if (combat) combat.textContent = combatTypeForSkin(skin);

    if (kit) {
      kit.className = "skin-kit skin-kit-v036b";
      kit.innerHTML = `
        <div class="skill-line-v036b" id="skillLineV036b">
          <span>Skill</span>
          <b><i class="skill-icon-v036b">✦</i><span id="skinSkill">${skin.skill || "Skill"}</span></b>
          <p id="skillBubbleV036b" class="skill-bubble-v036b hidden">${skillInfoForSkin(skin)}</p>
        </div>`;
      const line = byId("skillLineV036b");
      const bubble = byId("skillBubbleV036b");
      line?.addEventListener("click", e => {
        e.preventDefault();
        bubble?.classList.toggle("hidden");
      });
    }

    if (equip) {
      equip.disabled = !unlocked;
      equip.textContent = selected ? "EQUIPPED" : unlocked ? "EQUIP" : "LOCKED";
    }

    applySkinSplash(skin);
  }

  function openWorldSelect(e) {
    e?.preventDefault?.();
    document.body.classList.remove("is-playing", "is-loading-stage");
    byId("stageLoading")?.classList.add("hidden");
    ["hud", "skill", "stageHud", "pauseModal", "gameOver", "levelModal", "stageClearModal"].forEach(id => byId(id)?.classList.add("hidden"));
    if (typeof UI.openWorldSelect === "function") UI.openWorldSelect();
    else UI.open?.("worlds");
  }

  function repairStaticButtons() {
    const bindId = (id, fn) => {
      const el = byId(id);
      if (!el) return;
      el.onclick = null;
      el.addEventListener("click", fn, { once:false });
    };

    bindId("playBtn", openWorldSelect);
    bindId("mobilePlayBtn", openWorldSelect);

    bindId("skinPrev", e => {
      e.preventDefault();
      const skins = CHERRIFT_DATA?.skins || [];
      if (!skins.length) return;
      UI.skinIndex = (UI.skinIndex - 1 + skins.length) % skins.length;
      renderSkinPanel();
    });

    bindId("skinNext", e => {
      e.preventDefault();
      const skins = CHERRIFT_DATA?.skins || [];
      if (!skins.length) return;
      UI.skinIndex = (UI.skinIndex + 1) % skins.length;
      renderSkinPanel();
    });

    bindId("skinEquip", e => {
      e.preventDefault();
      const skin = currentSkin();
      if (!skin) return;
      if (!(UI.save?.unlockedSkins || []).includes(skin.id)) {
        UI.toast?.("Skin locked");
        return;
      }
      UI.save.selectedSkin = skin.id;
      try { CherriftStorage.save(UI.save); } catch (_) {}
      UI.refreshMenu?.();
      renderSkinPanel();
      UI.toast?.(`${skin.name} equipped`);
    });

    bindId("openChest", e => { e.preventDefault(); UI.openChest?.(); });
    bindId("pause", e => { e.preventDefault(); UI.pause?.(); });
    bindId("resume", e => { e.preventDefault(); UI.resume?.(); });
    bindId("quit", e => { e.preventDefault(); UI.quit?.(); });
    bindId("retry", e => { e.preventDefault(); UI.game?.start?.(); });
    bindId("toMenu", e => { e.preventDefault(); UI.quit?.(); });
    bindId("fullscreen", e => { e.preventDefault(); UI.fullscreen?.(); });
    bindId("pauseFullscreen", e => { e.preventDefault(); UI.fullscreen?.(); });
    bindId("pauseSettings", e => {
      e.preventDefault();
      document.body.classList.add("settings-from-pause");
      byId("pauseModal")?.classList.add("hidden");
      UI.open?.("settings");
    });

    bindId("worldPrevBtn", e => { e.preventDefault(); UI.moveWorldCarousel?.(-1); });
    bindId("worldNextBtn", e => { e.preventDefault(); UI.moveWorldCarousel?.(1); });
    bindId("worldBackBtn", e => { e.preventDefault(); UI.open?.("menu"); });
    bindId("worldLaunchBtn", e => {
      e.preventDefault();
      if (typeof UI.launchSelectedWorld === "function") UI.launchSelectedWorld(e);
      else UI.game?.start?.();
    });

    bindId("nextStageBtn", e => {
      e.preventDefault();
      UI.hideStageClear?.();
      UI.game?.start?.();
    });
    bindId("replayStageBtn", e => {
      e.preventDefault();
      UI.hideStageClear?.();
      UI.game?.start?.();
    });
    bindId("stageClearToMenuBtn", e => {
      e.preventDefault();
      UI.hideStageClear?.();
      UI.quit?.();
    });

    document.querySelectorAll("[data-open]").forEach(btn => {
      if (btn.__v036bOpenBound) return;
      btn.__v036bOpenBound = true;
      btn.addEventListener("click", e => {
        e.preventDefault();
        const id = btn.dataset.open;
        if (id === "worlds") openWorldSelect(e);
        else UI.open?.(id);
      });
    });

    document.querySelectorAll(".back").forEach(btn => {
      if (btn.__v036bBackBound) return;
      btn.__v036bBackBound = true;
      btn.addEventListener("click", e => {
        e.preventDefault();
        if (document.body.classList.contains("settings-from-pause") && byId("settings") && !byId("settings").classList.contains("hidden")) {
          byId("settings").classList.add("hidden");
          byId("pauseModal")?.classList.remove("hidden");
          return;
        }
        UI.open?.("menu");
      });
    });
  }

  function installButtonPressCssOnly() {
    // intentionally no event listener here; CSS :active handles feedback safely
  }

  // rendering and draw fixes that must remain from 0.3.6a
  const proto = CherriftGame.prototype;

  if (!proto.__v036bDrawObjPatched) {
    proto.drawObj = function v036bDrawObj(c, o) {
      if (o === this.player) return this.drawPlayer(c, o);
      if (o?.kind) return this.drawObstacle(c, o);
      if (o?.type === "xp" || o?.type === "coin" || o?.type === "key") return this.drawPickup(c, o);
      if (o?.hp !== undefined) return this.drawEnemy(c, o);
      if (o?.style) return this.drawBullet(c, o);
      if (o?.type) return this.drawEffect(c, o);
    };
    proto.__v036bDrawObjPatched = true;
  }

  function isGroundDecor(o) {
    return !!o && (o.kind === "flowers" || o.kind === "mushroom");
  }

  if (!proto.__v036bDrawWorldPatched) {
    proto.drawWorld = function v036bDrawWorld(c) {
      c.fillStyle = "#1f7d45";
      c.fillRect(0, 0, this.w, this.h);
      const zoom = this.zoom || CHERRIFT_CONFIG.performance?.cameraZoom || 1;
      c.save();
      c.translate(this.w / 2, this.h / 2);
      c.scale(zoom, zoom);
      c.translate(-this.camera.x, -this.camera.y);
      this.drawGround(c, zoom);

      const obstacles = this.obstacles || [];
      obstacles.filter(isGroundDecor).forEach(o => this.drawObstacle(c, o));

      const drawables = [
        ...obstacles.filter(o => !isGroundDecor(o)),
        ...(this.pickups || []),
        ...(this.enemies || []),
        ...(this.player ? [this.player] : []),
        ...(this.bullets || []),
        ...(this.effects || [])
      ];

      drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
      drawables.forEach(o => this.drawObj(c, o));
      c.restore();
    };
    proto.__v036bDrawWorldPatched = true;
  }

  const oldDrawObstacle = proto.drawObstacle;
  if (oldDrawObstacle && !proto.__v036bRockPatched) {
    proto.drawObstacle = function v036bDrawObstacle(c, o) {
      if (o?.kind === "rockSmall") {
        const img = this.assets?.get?.("rockSmall");
        if (img) {
          c.drawImage(img, Math.round(o.x - 48), Math.round(o.y - 38), 96, 76);
          return;
        }
      }
      return oldDrawObstacle.call(this, c, o);
    };
    proto.__v036bRockPatched = true;
  }

  const oldDrawEnemy = proto.drawEnemy;
  if (oldDrawEnemy && !proto.__v036bPinkPatched) {
    proto.drawEnemy = function v036bDrawEnemy(c, e) {
      if (e?.enemyType === "pink_slime") {
        const img = this.assets?.get?.("slime");
        if (img) {
          const cfg = CHERRIFT_CONFIG.slime || {};
          const fw = cfg.frameWidth || 384;
          const fh = cfg.frameHeight || 384;
          const columns = cfg.columns || 4;
          const row = cfg.rows?.move ?? 1;
          const frame = Math.floor((this.t + (e.phase || 0)) * 7) % columns;
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
    proto.__v036bPinkPatched = true;
  }

  const oldDrawPlayer = proto.drawPlayer;
  if (oldDrawPlayer && !proto.__v036bFairyRightPatched) {
    proto.drawPlayer = function v036bDrawPlayer(c, p) {
      const skin = this.activeSkinConfig?.();
      const skillActive = (p.skillCastTimer || 0) > 0;
      const dir = skillActive ? (p.skillDir || p.lastDir || "down") : (p.lastDir || "down");
      const stateName = skillActive ? "skill" : (p.moving ? "walk" : "idle");

      if (p.skin === "fairy_cherry" && stateName === "walk" && dir === "right") {
        const state = skin?.states?.[stateName];
        const img = this.assets?.get?.(`player_${p.skin}_${stateName}_${dir}`);
        if (img && state) {
          const cfg = CHERRIFT_CONFIG.player;
          const realFrames = Math.max(1, Math.floor(img.width / cfg.frameWidth));
          const frameCount = Math.max(1, Math.min(state.frames || realFrames, realFrames));
          const frame = Math.floor(this.t * (state.fps || 6)) % frameCount;
          const dw = cfg.displayWidth || 116;
          const dh = cfg.displayHeight || 116;
          const dx = Math.round(p.x - dw / 2);
          const dy = Math.round(p.y - dh + 34);
          c.save();
          c.translate(dx + dw / 2, 0);
          c.scale(-1, 1);
          c.drawImage(img, frame * cfg.frameWidth, 0, cfg.frameWidth, cfg.frameHeight, -dw / 2, dy, dw, dh);
          c.restore();
          return;
        }
      }
      return oldDrawPlayer.call(this, c, p);
    };
    proto.__v036bFairyRightPatched = true;
  }

  const oldRenderSkinCarousel = UI.renderSkinCarousel?.bind(UI);
  UI.renderSkinCarousel = function v036bRenderSkinCarousel(...args) {
    if (oldRenderSkinCarousel) oldRenderSkinCarousel(...args);
    renderSkinPanel();
  };

  const oldRefreshMenu = UI.refreshMenu?.bind(UI);
  if (oldRefreshMenu) {
    UI.refreshMenu = function v036bRefreshMenu(...args) {
      const result = oldRefreshMenu(...args);
      const build = byId("menuBuildVersion");
      if (build) build.textContent = "v0.3.6c HOTFIX";
      setTimeout(repairStaticButtons, 0);
      return result;
    };
  }

  const oldBind = UI.bind?.bind(UI);
  UI.bind = function v036bBind(...args) {
    const result = oldBind ? oldBind(...args) : undefined;
    preloadSplashArt();
    renderSkinPanel();
    repairStaticButtons();
    installButtonPressCssOnly();
    setTimeout(repairStaticButtons, 0);
    setTimeout(renderSkinPanel, 80);
    return result;
  };

  const oldOpen = UI.open?.bind(UI);
  if (oldOpen) {
    UI.open = function v036bOpen(id, ...args) {
      const result = oldOpen(id, ...args);
      setTimeout(() => {
        repairStaticButtons();
        if (id === "skins") renderSkinPanel();
      }, 0);
      return result;
    };
  }

  preloadSplashArt();
  setTimeout(() => {
    repairStaticButtons();
    renderSkinPanel();
  }, 0);
})();