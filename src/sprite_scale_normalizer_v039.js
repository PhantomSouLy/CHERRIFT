(() => {
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG) return;

  const VERSION = "0.3.9-sprite-scale-normalizer";
  CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const proto = CherriftGame.prototype;

  // One place to normalize how large each animation state is drawn.
  // Reason: the PNG sheets are not visually scaled/aligned the same way.
  // Idle frames often have more empty space, while walk/skill frames fill more of the 192x192 cell.
  const STATE_SCALE = {
    idle: 1.00,
    walk: 0.90,
    attack: 0.94,
    skill: 0.94
  };

  const SKIN_STATE_SCALE = {
    cherry_default: { idle:1.00, walk:0.90, attack:0.94, skill:0.94 },
    base_cherry: { idle:1.00, walk:0.90, attack:0.94, skill:0.94 },
    fairy_cherry: { idle:1.00, walk:0.90, attack:0.94, skill:0.94 },
    beastclaw_cherry: { idle:1.00, walk:0.89, attack:0.94, skill:0.94 }
  };

  function getStateScale(skinId, stateName) {
    return SKIN_STATE_SCALE[skinId]?.[stateName] ?? STATE_SCALE[stateName] ?? 1;
  }

  function getCurrentState(game, p, skin) {
    const skillActive = (p.skillCastTimer || 0) > 0;
    const attackActive = !skillActive && (p.attackCastTimer || 0) > 0 && skin?.states?.attack;
    const dir = skillActive
      ? (p.skillDir || p.lastDir || "down")
      : attackActive
        ? (p.attackDir || p.lastDir || "down")
        : (p.lastDir || "down");
    const stateName = skillActive ? "skill" : attackActive ? "attack" : (p.moving ? "walk" : "idle");
    return { stateName, dir, skillActive, attackActive };
  }

  function getFrame(game, p, stateName, state, frameCount) {
    if (stateName === "skill") {
      const elapsed = Math.max(0, (p.skillCastDuration || state.duration || .4) - (p.skillCastTimer || 0));
      return Math.min(frameCount - 1, Math.floor(elapsed * (state.fps || 12)));
    }

    if (stateName === "attack") {
      const elapsed = Math.max(0, (p.attackCastDuration || state.duration || .34) - (p.attackCastTimer || 0));
      return Math.min(frameCount - 1, Math.floor(elapsed * (state.fps || 18)));
    }

    return Math.floor(game.t * (state.fps || 6)) % frameCount;
  }

  const fallbackDrawPlayer = proto.drawPlayer;

  proto.drawPlayer = function spriteScaleNormalizedDrawPlayer(c, p) {
    const skin = this.activeSkinConfig?.();
    const cfg = CHERRIFT_CONFIG.player;
    if (!skin || !cfg) return fallbackDrawPlayer.call(this, c, p);

    const { stateName, dir } = getCurrentState(this, p, skin);
    const state = skin.states?.[stateName];
    const img = this.assets?.get?.(`player_${p.skin}_${stateName}_${dir}`);

    if (!img || !state) return fallbackDrawPlayer.call(this, c, p);

    const realFrames = Math.max(1, Math.floor(img.width / cfg.frameWidth));
    const frameCount = Math.max(1, Math.min(state.frames || realFrames, realFrames));
    const frame = getFrame(this, p, stateName, state, frameCount);

    const baseW = cfg.displayWidth || 116;
    const baseH = cfg.displayHeight || 116;
    const scale = getStateScale(p.skin, stateName);

    const dw = baseW * scale;
    const dh = baseH * scale;

    // Keep the feet/ground anchor stable while scaling the visual.
    // This prevents the character from popping up/down when changing idle -> walk.
    const footX = p.x;
    const footY = p.y + 34;
    const dx = Math.round(footX - dw / 2);
    const dy = Math.round(footY - dh);

    // Fairy's right walk sheet is visually facing the wrong way, so keep the previous fix.
    const flipX = p.skin === "fairy_cherry" && stateName === "walk" && dir === "right";

    c.save();

    // Tiny shadow kept at stable base size so the character feels grounded.
    if (stateName !== "skill") {
      c.save();
      c.globalAlpha = .22;
      c.fillStyle = "#000";
      c.beginPath();
      c.ellipse(p.x, p.y + 25, 28, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    if (flipX) {
      c.translate(dx + dw / 2, 0);
      c.scale(-1, 1);
      c.drawImage(
        img,
        frame * cfg.frameWidth, 0,
        cfg.frameWidth, cfg.frameHeight,
        -dw / 2,
        dy,
        dw,
        dh
      );
    } else {
      c.drawImage(
        img,
        frame * cfg.frameWidth, 0,
        cfg.frameWidth, cfg.frameHeight,
        dx,
        dy,
        dw,
        dh
      );
    }

    c.restore();
  };

  if (window.UI?.refreshMenu) {
    const oldRefresh = UI.refreshMenu.bind(UI);
    UI.refreshMenu = function refreshV039(...args) {
      const result = oldRefresh(...args);
      const build = document.getElementById("menuBuildVersion");
      if (build) build.textContent = "v0.3.9 SPRITE NORMALIZER";
      return result;
    };
  }
})();