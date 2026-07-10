(() => {
  if (!window.UI) return;

  const VERSION = "0.3.5-texture-splash";
  if (window.CHERRIFT_CONFIG) CHERRIFT_CONFIG.version = VERSION;
  if (window.CHERRIFT_DATA) CHERRIFT_DATA.version = VERSION;

  const SKIN_SPLASH = {
    cherry_default: "assets/player/skins/base_cherry/cherry_splash_art.png",
    base_cherry: "assets/player/skins/base_cherry/cherry_splash_art.png",
    fairy_cherry: "assets/player/skins/fairy_cherry/fairy_cherry_splash_art.png",
    beastclaw_cherry: "assets/player/skins/beastclaw_cherry/beastclaw_cherry_splash_art.png"
  };

  const WORLD_SPLASH = {
    1: "assets/map/world1.png",
    2: "assets/map/world2.png"
  };

  function setSkinSplash() {
    const skin = CHERRIFT_DATA?.skins?.[UI.skinIndex] || CHERRIFT_DATA?.skins?.find(s => s.id === UI.save?.selectedSkin);
    const splash = document.getElementById("skinSplash");
    const portrait = document.getElementById("skinPortrait");
    if (!splash || !skin) return;

    const src = SKIN_SPLASH[skin.id] || `assets/player/skins/${skin.id}/${skin.id}_splash_art.png`;

    const img = new Image();
    img.onload = () => {
      splash.classList.add("has-splash-art");
      splash.classList.remove("no-splash-art");
      splash.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.06), rgba(5,3,12,.36)), url("${src}")`;
      if (portrait) {
        portrait.innerHTML = "";
        portrait.textContent = skin.emoji || "";
      }
    };
    img.onerror = () => {
      splash.classList.remove("has-splash-art");
      splash.classList.add("no-splash-art");
      splash.style.backgroundImage = "";
      if (portrait) {
        portrait.innerHTML = "";
        portrait.textContent = skin.emoji || "🐰";
      }
    };
    img.src = src;
  }

  function selectedCarouselWorld() {
    const label = document.getElementById("carouselWorldLabel")?.textContent || "";
    const m = label.match(/World\s+(\d+)/i);
    if (m) return Number(m[1]);

    const stageName = document.getElementById("carouselStageName")?.textContent || "";
    const n = stageName.match(/World\s+(\d+)/i);
    if (n) return Number(n[1]);

    return 1;
  }

  function setWorldSplash(world) {
    const img = document.getElementById("carouselStageImage");
    if (!img) return;

    const src = WORLD_SPLASH[world] || WORLD_SPLASH[1];

    const pre = new Image();
    pre.onload = () => {
      img.classList.add("has-world-art");
      img.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.04), rgba(5,3,12,.36)), url("${src}")`;
    };
    pre.onerror = () => {
      img.classList.remove("has-world-art");
      img.style.backgroundImage = "";
    };
    pre.src = src;
  }

  function setMobileWorldSplash() {
    const art = document.getElementById("mobileStageArt");
    const chip = document.getElementById("mobileStageChip")?.textContent || "World 1-1";
    if (!art) return;

    const m = chip.match(/World\s+(\d+)/i);
    const world = m ? Number(m[1]) : 1;
    const src = WORLD_SPLASH[world] || WORLD_SPLASH[1];

    const pre = new Image();
    pre.onload = () => {
      art.classList.add("has-world-art");
      art.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.05), rgba(5,3,12,.35)), url("${src}")`;
    };
    pre.onerror = () => {
      art.classList.remove("has-world-art");
      art.style.backgroundImage = "";
    };
    pre.src = src;
  }

  const oldRenderSkinCarousel = UI.renderSkinCarousel?.bind(UI);
  if (oldRenderSkinCarousel && !UI.__textureSkinSplashPatched) {
    UI.renderSkinCarousel = function textureRenderSkinCarousel(...args) {
      const result = oldRenderSkinCarousel(...args);
      setSkinSplash();
      return result;
    };
    UI.__textureSkinSplashPatched = true;
  }

  const oldRenderWorldPanel = UI.renderWorldPanel?.bind(UI);
  if (oldRenderWorldPanel && !UI.__textureWorldSplashPatched) {
    UI.renderWorldPanel = function textureRenderWorldPanel(...args) {
      const result = oldRenderWorldPanel(...args);
      setWorldSplash(selectedCarouselWorld());
      return result;
    };
    UI.__textureWorldSplashPatched = true;
  }

  const oldMoveWorldCarousel = UI.moveWorldCarousel?.bind(UI);
  if (oldMoveWorldCarousel && !UI.__textureWorldMovePatched) {
    UI.moveWorldCarousel = function textureMoveWorldCarousel(...args) {
      const result = oldMoveWorldCarousel(...args);
      setWorldSplash(selectedCarouselWorld());
      return result;
    };
    UI.__textureWorldMovePatched = true;
  }

  const oldRefreshMenu = UI.refreshMenu?.bind(UI);
  if (oldRefreshMenu && !UI.__textureMobileSplashPatched) {
    UI.refreshMenu = function textureRefreshMenu(...args) {
      const result = oldRefreshMenu(...args);
      setMobileWorldSplash();
      const build = document.getElementById("menuBuildVersion");
      if (build) build.textContent = "v0.3.5 EARLY BUILD";
      return result;
    };
    UI.__textureMobileSplashPatched = true;
  }

  const oldRenderMobileStagePreview = UI.renderMobileStagePreview?.bind(UI);
  if (oldRenderMobileStagePreview && !UI.__textureMobileStagePreviewPatched) {
    UI.renderMobileStagePreview = function textureMobileStagePreview(stage, ...rest) {
      const result = oldRenderMobileStagePreview(stage, ...rest);
      const world = stage?.world || 1;
      const art = document.getElementById("mobileStageArt");
      const src = WORLD_SPLASH[world] || WORLD_SPLASH[1];
      if (art) {
        const pre = new Image();
        pre.onload = () => {
          art.classList.add("has-world-art");
          art.style.backgroundImage = `linear-gradient(180deg, rgba(5,3,12,.05), rgba(5,3,12,.35)), url("${src}")`;
        };
        pre.onerror = () => {
          art.classList.remove("has-world-art");
          art.style.backgroundImage = "";
        };
        pre.src = src;
      }
      return result;
    };
    UI.__textureMobileStagePreviewPatched = true;
  }

  setTimeout(() => {
    setSkinSplash();
    setWorldSplash(selectedCarouselWorld());
    setMobileWorldSplash();
  }, 0);
})();