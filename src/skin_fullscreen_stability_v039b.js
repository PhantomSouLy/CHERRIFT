(() => {
  if (!window.UI || !window.CherriftGame) return;

  const VERSION = "0.3.9b-skin-fullscreen-stability";
  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const SKIN_META = {
    cherry_default: {
      splash: "assets/player/skins/base_cherry/base_cherry_splash_art.png",
      combat: "Ranged",
      skill: "Bloom Dash",
      info: "Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel."
    },
    base_cherry: {
      splash: "assets/player/skins/base_cherry/base_cherry_splash_art.png",
      combat: "Ranged",
      skill: "Bloom Dash",
      info: "Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel."
    },
    fairy_cherry: {
      splash: "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.jpg",
      combat: "Magic",
      skill: "Magic Burst",
      info: "Mágikus burst Cherry körül. Több ellenfelet sebez egyszerre."
    },
    beastclaw_cherry: {
      splash: "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png",
      combat: "Melee",
      skill: "Savage Rend",
      info: "Rövid előretörés és nagy területű karmolás. Közelharci burst sebzés."
    }
  };

  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  const byId = id => document.getElementById(id);

  function skinAtIndex() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    if (!skins.length) return null;
    UI.skinIndex = Math.max(0, Math.min(skins.length - 1, UI.skinIndex || 0));
    return skins[UI.skinIndex];
  }

  function exactMeta(skin) {
    if (!skin) return {};
    return SKIN_META[skin.id] || {
      splash: `assets/player/skins/${skin.id}/${skin.id}_splash_art.png`,
      combat: "Ranged",
      skill: skin.skill || "Skill",
      info: skin.desc || "Aktív skill."
    };
  }

  function safeSetText(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }

  function bindClick(el, fn) {
    if (!el) return;
    el.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    };
  }

  function renderSkinHard() {
    const skin = skinAtIndex();
    if (!skin || !UI.save) return;

    const meta = exactMeta(skin);
    const unlocked = (UI.save.unlockedSkins || []).includes(skin.id);
    const selected = UI.save.selectedSkin === skin.id;

    // Remove older patch rows so they cannot show stale Magic/Melee values from another skin.
    qa(".skin-meta-row-v036a, .skin-meta-row-v036b, .skin-meta-row-v038").forEach(el => el.remove());

    const rarity = byId("skinRarity");
    if (rarity) {
      rarity.textContent = `${skin.rarity}${unlocked ? "" : " · LOCKED"}`;
      rarity.className = `rarity-pill rarity-${String(skin.rarity || "Common").toLowerCase()}`;
    }

    let row = byId("skinMetaRowV039b");
    if (!row && rarity) {
      row = document.createElement("div");
      row.id = "skinMetaRowV039b";
      row.className = "skin-meta-row-v039b";
      rarity.insertAdjacentElement("afterend", row);
    }
    if (row && rarity) {
      row.innerHTML = "";
      row.appendChild(rarity);
      const combat = document.createElement("span");
      combat.className = "combat-pill-v039b";
      combat.textContent = meta.combat;
      row.appendChild(combat);
    }

    safeSetText("skinName", skin.name);
    safeSetText("skinDesc", "");
    safeSetText("skinMini", "");
    safeSetText("skinWeapon", "");
    safeSetText("skinSkill", meta.skill);

    const kit = q("#skins .skin-kit");
    if (kit) {
      kit.className = "skin-kit skin-kit-v039b";
      kit.innerHTML = `
        <div id="skillLineV039b" class="skill-line-v039b glass">
          <span>Skill</span>
          <b><i class="skill-icon-v039b">✦</i><span>${meta.skill}</span></b>
          <p id="skillBubbleV039b" class="skill-bubble-v039b hidden">${meta.info}</p>
        </div>`;
      bindClick(byId("skillLineV039b"), () => byId("skillBubbleV039b")?.classList.toggle("hidden"));
    }

    const equip = byId("skinEquip");
    if (equip) {
      equip.disabled = !unlocked;
      equip.textContent = selected ? "EQUIPPED" : unlocked ? "EQUIP" : "LOCKED";
      bindClick(equip, () => {
        const current = skinAtIndex();
        if (!current) return;
        if (!(UI.save.unlockedSkins || []).includes(current.id)) {
          UI.toast?.("Skin locked");
          return;
        }
        UI.save.selectedSkin = current.id;
        try { CherriftStorage.save(UI.save); } catch (_) {}
        UI.refreshMenu?.();
        renderSkinHard();
        UI.toast?.(`${current.name} equipped`);
      });
    }

    const splash = byId("skinSplash");
    const portrait = byId("skinPortrait");
    if (splash) {
      splash.classList.add("has-splash-art", "force-current-skin");
      splash.classList.remove("no-splash-art", "splash-loading");
      // Synchronous CSS assignment prevents old async image callbacks from showing the wrong skin image later.
      splash.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.03), rgba(5,3,12,.22)), url("${meta.splash}")`;
      splash.dataset.currentSkin = skin.id;
    }
    if (portrait) portrait.textContent = "";
  }

  function rebindSkinArrows() {
    const prev = byId("skinPrev");
    const next = byId("skinNext");

    bindClick(prev, () => {
      const skins = CHERRIFT_DATA.skins || [];
      UI.skinIndex = (UI.skinIndex - 1 + skins.length) % skins.length;
      renderSkinHard();
      requestAnimationFrame(renderSkinHard);
    });

    bindClick(next, () => {
      const skins = CHERRIFT_DATA.skins || [];
      UI.skinIndex = (UI.skinIndex + 1) % skins.length;
      renderSkinHard();
      requestAnimationFrame(renderSkinHard);
    });
  }

  // Keep mobile browser mode readable after exiting fullscreen.
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function isMobileLike() {
    const w = window.visualViewport?.width || window.innerWidth || 0;
    const h = window.visualViewport?.height || window.innerHeight || 0;
    return Math.min(w, h) <= 820;
  }

  function applyViewportScale() {
    const mobileBrowser = isMobileLike() && !isFullscreen();
    document.body.classList.toggle("mobile-browser-v039b", mobileBrowser);

    const game = UI.game;
    if (!game || game.mode !== "playing") return;

    const w = window.visualViewport?.width || window.innerWidth || game.w || 720;
    const h = window.visualViewport?.height || window.innerHeight || game.h || 1280;
    const portrait = h >= w;

    // Larger zoom value = less map visible / Cherry and UI feel bigger.
    if (mobileBrowser && portrait) game.zoom = 1.08;
    else if (mobileBrowser) game.zoom = 0.92;
    else if (isFullscreen() && isMobileLike() && portrait) game.zoom = 0.86;

    try { game.resize?.(); } catch (_) {}
    if (mobileBrowser && portrait) game.zoom = 1.08;
    else if (mobileBrowser) game.zoom = 0.92;
    else if (isFullscreen() && isMobileLike() && portrait) game.zoom = 0.86;
    try { game.render?.(); } catch (_) {}
  }

  const oldRenderSkin = UI.renderSkinCarousel?.bind(UI);
  UI.renderSkinCarousel = function v039bRenderSkin(...args) {
    try { oldRenderSkin?.(...args); } catch (_) {}
    renderSkinHard();
    rebindSkinArrows();
    setTimeout(renderSkinHard, 40);
  };

  const oldOpen = UI.open?.bind(UI);
  UI.open = function v039bOpen(id, ...args) {
    const result = oldOpen ? oldOpen(id, ...args) : undefined;
    if (id === "skins") {
      setTimeout(() => {
        renderSkinHard();
        rebindSkinArrows();
      }, 0);
    }
    return result;
  };

  const oldInit = UI.init?.bind(UI);
  UI.init = function v039bInit(save, game) {
    const result = oldInit(save, game);
    renderSkinHard();
    rebindSkinArrows();
    applyViewportScale();
    return result;
  };

  const oldRefresh = UI.refreshMenu?.bind(UI);
  UI.refreshMenu = function v039bRefresh(...args) {
    const result = oldRefresh ? oldRefresh(...args) : undefined;
    const build = byId("menuBuildVersion");
    if (build) build.textContent = "v0.3.9b SKIN/FULLSCREEN FIX";
    return result;
  };

  const oldStart = CherriftGame.prototype.start;
  if (!CherriftGame.prototype.__v039bViewportStartPatched) {
    CherriftGame.prototype.start = async function v039bStart(...args) {
      const result = await oldStart.apply(this, args);
      setTimeout(applyViewportScale, 40);
      setTimeout(applyViewportScale, 220);
      return result;
    };
    CherriftGame.prototype.__v039bViewportStartPatched = true;
  }

  ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange", "pageshow"].forEach(ev => {
    window.addEventListener(ev, () => setTimeout(applyViewportScale, 120), { passive:true });
    document.addEventListener(ev, () => setTimeout(applyViewportScale, 120), { passive:true });
  });

  setTimeout(() => {
    renderSkinHard();
    rebindSkinArrows();
    applyViewportScale();
  }, 0);
})();