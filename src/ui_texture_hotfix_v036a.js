(() => {
  if (!window.UI || !window.CherriftGame) return;

  const VERSION = "0.3.6a-ui-texture-hotfix";
  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const SKIN_SPLASH = {
    cherry_default: "assets/player/skins/base_cherry/cherry_splash_art.png",
    base_cherry: "assets/player/skins/base_cherry/cherry_splash_art.png",
    fairy_cherry: "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.png",
    beastclaw_cherry: "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png"
  };

  const splashCache = {};
  const splashState = {};
  let splashToken = 0;

  function preloadSplashArt() {
    Object.entries(SKIN_SPLASH).forEach(([id, src]) => {
      if (splashState[id]) return;
      splashState[id] = "loading";
      const img = new Image();
      img.onload = () => { splashCache[id] = src; splashState[id] = "ready"; };
      img.onerror = () => { splashState[id] = "error"; };
      img.decoding = "async";
      img.src = src;
    });
  }

  function currentSkin() {
    return CHERRIFT_DATA?.skins?.[UI.skinIndex] || CHERRIFT_DATA?.skins?.find(s => s.id === UI.save?.selectedSkin);
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

  function applySplashCached() {
    const skin = currentSkin();
    const splash = document.getElementById("skinSplash");
    const portrait = document.getElementById("skinPortrait");
    if (!skin || !splash) return;

    const token = ++splashToken;
    const src = SKIN_SPLASH[skin.id] || `assets/player/skins/${skin.id}/${skin.id}_splash_art.png`;

    const finish = ok => {
      if (token !== splashToken) return;
      splash.classList.remove("splash-loading");
      if (ok) {
        splash.classList.add("has-splash-art");
        splash.classList.remove("no-splash-art");
        splash.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.04), rgba(5,3,12,.28)), url("${src}")`;
        if (portrait) {
          portrait.innerHTML = "";
          portrait.textContent = "";
        }
      } else {
        splash.classList.remove("has-splash-art");
        splash.classList.add("no-splash-art");
        splash.style.backgroundImage = "";
        if (portrait) portrait.textContent = skin.emoji || "🐰";
      }
    };

    if (splashCache[skin.id] || splashCache[src]) return finish(true);

    splash.classList.add("splash-loading");
    const img = new Image();
    img.onload = () => {
      splashCache[skin.id] = src;
      splashCache[src] = src;
      finish(true);
    };
    img.onerror = () => finish(false);
    img.decoding = "async";
    img.src = src;
  }

  function cleanupSkinPanel() {
    const skin = currentSkin();
    if (!skin) return;

    const info = document.querySelector("#skins .skin-info");
    const rarity = document.getElementById("skinRarity");
    const kit = document.querySelector("#skins .skin-kit");
    const weapon = document.getElementById("skinWeapon");
    const skill = document.getElementById("skinSkill");

    if (rarity && !document.getElementById("skinCombatPillV036a")) {
      const row = document.createElement("div");
      row.className = "skin-meta-row-v036a";
      row.id = "skinMetaRowV036a";
      const combat = document.createElement("span");
      combat.id = "skinCombatPillV036a";
      combat.className = "combat-pill-v036a";
      combat.textContent = combatTypeForSkin(skin);
      rarity.insertAdjacentElement("afterend", row);
      row.appendChild(rarity);
      row.appendChild(combat);
    }

    const combat = document.getElementById("skinCombatPillV036a");
    if (combat) combat.textContent = combatTypeForSkin(skin);

    if (kit) {
      kit.classList.add("skin-kit-clean");
      const skillName = skin.skill || skill?.textContent || "Skill";
      kit.innerHTML = `
        <div id="skillLineV036a" class="skill-line-v036a">
          <span>Skill</span>
          <b><i class="skill-icon-v036a">✦</i><span id="skinSkill">${skillName}</span></b>
          <p id="skillBubbleV036a" class="skill-bubble-v036a hidden">${skillInfoForSkin(skin)}</p>
        </div>`;
      const line = document.getElementById("skillLineV036a");
      const bubble = document.getElementById("skillBubbleV036a");
      line?.addEventListener("click", () => bubble?.classList.toggle("hidden"));
    }

    const desc = document.getElementById("skinDesc");
    if (desc) desc.textContent = "";
    if (weapon) weapon.textContent = skin.weapon || "";
  }

  const oldRenderSkinCarousel = UI.renderSkinCarousel?.bind(UI);
  if (oldRenderSkinCarousel && !UI.__v036aSkinPatched) {
    UI.renderSkinCarousel = function v036aRenderSkinCarousel(...args) {
      const result = oldRenderSkinCarousel(...args);
      cleanupSkinPanel();
      applySplashCached();
      return result;
    };
    UI.__v036aSkinPatched = true;
  }

  function isGroundDecor(o) {
    return !!o && (o.kind === "flowers" || o.kind === "mushroom");
  }

  const proto = CherriftGame.prototype;

  // Fix draw order: enemies have a "style" too, so hp must be checked before bullet style.
  if (!proto.__v036aDrawObjPatched) {
    proto.drawObj = function v036aDrawObj(c, o) {
      if (o === this.player) return this.drawPlayer(c, o);
      if (o?.kind) return this.drawObstacle(c, o);
      if (o?.type === "xp" || o?.type === "coin" || o?.type === "key") return this.drawPickup(c, o);
      if (o?.hp !== undefined) return this.drawEnemy(c, o);
      if (o?.style) return this.drawBullet(c, o);
      if (o?.type) return this.drawEffect(c, o);
    };
    proto.__v036aDrawObjPatched = true;
  }

  // Draw ground decor under Cherry/enemies, not above them.
  if (!proto.__v036aDrawWorldPatched) {
    proto.drawWorld = function v036aDrawWorld(c) {
      c.fillStyle = "#1f7d45";
      c.fillRect(0, 0, this.w, this.h);

      const zoom = this.zoom || CHERRIFT_CONFIG.performance?.cameraZoom || 1;

      c.save();
      c.translate(this.w / 2, this.h / 2);
      c.scale(zoom, zoom);
      c.translate(-this.camera.x, -this.camera.y);

      this.drawGround(c, zoom);

      const obstacles = this.obstacles || [];
      const groundDecor = obstacles.filter(isGroundDecor);
      const upperObstacles = obstacles.filter(o => !isGroundDecor(o));

      for (const o of groundDecor) this.drawObstacle(c, o);

      const drawables = [
        ...upperObstacles,
        ...(this.pickups || []),
        ...(this.enemies || []),
        ...(this.player ? [this.player] : []),
        ...(this.bullets || []),
        ...(this.effects || [])
      ];

      drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
      for (const o of drawables) this.drawObj(c, o);

      c.restore();
    };
    proto.__v036aDrawWorldPatched = true;
  }

  // Bigger visible small rock so collision feels fair.
  const oldDrawObstacle = proto.drawObstacle;
  if (oldDrawObstacle && !proto.__v036aRockPatched) {
    proto.drawObstacle = function v036aDrawObstacle(c, o) {
      if (o?.kind === "rockSmall") {
        const img = this.assets?.get?.("rockSmall");
        if (img) {
          c.drawImage(img, Math.round(o.x - 48), Math.round(o.y - 38), 96, 76);
          return;
        }
      }
      return oldDrawObstacle.call(this, c, o);
    };
    proto.__v036aRockPatched = true;
  }

  // Pink slime: now that drawObj is fixed, use the real slime sprite sheet. Fallback stays procedural.
  const oldDrawEnemy = proto.drawEnemy;
  if (oldDrawEnemy && !proto.__v036aPinkSlimePatched) {
    proto.drawEnemy = function v036aDrawEnemy(c, e) {
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
    proto.__v036aPinkSlimePatched = true;
  }

  // Fairy right-walk fix: flip the right walk sprite horizontally.
  const oldDrawPlayer = proto.drawPlayer;
  if (oldDrawPlayer && !proto.__v036aFairyRightPatched) {
    proto.drawPlayer = function v036aDrawPlayer(c, p) {
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
          c.drawImage(
            img,
            frame * cfg.frameWidth, 0,
            cfg.frameWidth, cfg.frameHeight,
            -dw / 2,
            dy,
            dw, dh
          );
          c.restore();
          return;
        }
      }

      return oldDrawPlayer.call(this, c, p);
    };
    proto.__v036aFairyRightPatched = true;
  }

  // Button press feedback for most interactive buttons.
  function installButtonFeedback(root = document) {
    root.querySelectorAll("button, .menu-btn, .carousel-arrow, .world-arrow, .fullscreen-btn, .upgrade-card, .inv-item, .gear-slot").forEach(btn => {
      if (btn.__v036aFeedback) return;
      btn.__v036aFeedback = true;

      const on = () => {
        btn.classList.add("btn-press-v036a");
        clearTimeout(btn.__v036aFeedbackTimer);
      };
      const off = () => {
        clearTimeout(btn.__v036aFeedbackTimer);
        btn.__v036aFeedbackTimer = setTimeout(() => btn.classList.remove("btn-press-v036a"), 90);
      };

      btn.addEventListener("pointerdown", on, { passive:true });
      btn.addEventListener("pointerup", off, { passive:true });
      btn.addEventListener("pointercancel", off, { passive:true });
      btn.addEventListener("pointerleave", off, { passive:true });
      btn.addEventListener("click", off, { passive:true });
    });
  }

  const oldBind = UI.bind?.bind(UI);
  if (oldBind && !UI.__v036aBindPatched) {
    UI.bind = function v036aBind(...args) {
      const result = oldBind(...args);
      preloadSplashArt();
      cleanupSkinPanel();
      applySplashCached();
      installButtonFeedback();
      return result;
    };
    UI.__v036aBindPatched = true;
  }

  const oldRefreshMenu = UI.refreshMenu?.bind(UI);
  if (oldRefreshMenu && !UI.__v036aRefreshPatched) {
    UI.refreshMenu = function v036aRefresh(...args) {
      const result = oldRefreshMenu(...args);
      const build = document.getElementById("menuBuildVersion");
      if (build) build.textContent = "v0.3.6a HOTFIX";
      installButtonFeedback();
      return result;
    };
    UI.__v036aRefreshPatched = true;
  }

  const mo = new MutationObserver(() => installButtonFeedback());
  mo.observe(document.documentElement, { childList:true, subtree:true });

  preloadSplashArt();
  setTimeout(() => {
    cleanupSkinPanel();
    applySplashCached();
    installButtonFeedback();
  }, 0);
})();