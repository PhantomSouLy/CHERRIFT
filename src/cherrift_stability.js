(() => {
  "use strict";

  if (window.__CHERRIFT_BUGFIX_V0943__) return;
  window.__CHERRIFT_BUGFIX_V0943__ = true;

  const VERSION = "0.9.4.6-stability-router";
  const DESKTOP_QUERY = "(min-width:821px)";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const isDesktop = () => !window.CHERRIFT_WORLD_UI?.isMobile?.() && matchMedia(DESKTOP_QUERY).matches;

  const state = {
    upstreamOpen: null,
    observer: null,
    observerTimer: 0,
    skinRequest: 0,
    imagePromises: new Map(),
    mapImages: new Map(),
    clickLayer: null,
    currencyTimer: 0,
    navRoute: "menu",
    navObserver: null,
    navSyncQueued: false
  };

  const MAP_OBJECT_PATHS = Object.freeze({
    w1_bush1:"assets/map/world1/world1_bush_1.png",
    w1_bush2:"assets/map/world1/world1_bush_2.png",
    w1_bush3:"assets/map/world1/world1_bush_3.png",
    w1_flower1:"assets/map/world1/world1_flower_1.png",
    w1_flower2:"assets/map/world1/world1_flower_2.png",
    w1_flower3:"assets/map/world1/world1_flower_3.png",
    w1_log:"assets/map/world1/world1_log_1.png",
    w1_mushroom:"assets/map/world1/world1_mushroom_1.png",
    w1_rock1:"assets/map/world1/world1_rock_1.png",
    w1_rock2:"assets/map/world1/world1_rock_2.png",
    w1_rockSmall:"assets/map/world1/world1_rock_small_1.png",
    w1_tree1:"assets/map/world1/world1_tree_1.png",
    w1_tree2:"assets/map/world1/world1_tree_2.png",

    w2_bush1:"assets/map/world2/world2_bush_1.png",
    w2_bush2:"assets/map/world2/world2_bush_2.png",
    w2_bush3:"assets/map/world2/world2_bush_3.png",
    w2_flower1:"assets/map/world2/world2_flower_1.png",
    w2_flower2:"assets/map/world2/world2_flower_2.png",
    w2_flower3:"assets/map/world2/world2_flower_3.png",
    w2_rock1:"assets/map/world2/world2_rock_1.png",
    w2_rock2:"assets/map/world2/world2_rock_2.png",
    w2_rock3:"assets/map/world2/world2_rock_3.png",
    w2_tree1:"assets/map/world2/world2_tree_1.png",
    w2_tree2:"assets/map/world2/world2_tree_2.png",

    w3_bones:"assets/map/world3/world3_bones.png",
    w3_bush1:"assets/map/world3/world3_bush_1.png",
    w3_bush2:"assets/map/world3/world3_bush_2.png",
    w3_log:"assets/map/world3/world3_log.png",
    w3_rock1:"assets/map/world3/world3_rock_1.png",
    w3_rock2:"assets/map/world3/world3_rock_2.png",
    w3_grass1:"assets/map/world3/world3_tall_grass_1.png",
    w3_grass2:"assets/map/world3/world3_tall_grass_2.png",
    w3_tree1:"assets/map/world3/world3_tree_1.png",
    w3_tree2:"assets/map/world3/world3_tree_2.png",

    w4_bigRock:"assets/map/world4/world4_big_rock_1.png",
    w4_bones:"assets/map/world4/world4_bones_1.png",
    w4_bush:"assets/map/world4/world4_bush_1.png",
    w4_cactus1:"assets/map/world4/world4_cactus_1.png",
    w4_cactus2:"assets/map/world4/world4_cactus_2.png",
    w4_flower:"assets/map/world4/world4_flower_1.png",
    w4_rock1:"assets/map/world4/world4_rock_1.png",
    w4_rock2:"assets/map/world4/world4_rock_2.png",
    w4_rock3:"assets/map/world4/world_rock_3.png",
    w4_rock4:"assets/map/world4/world_rock_4.png",
    w4_veryBig1:"assets/map/world4/world4_rock_very_big_1.png",
    w4_veryBig2:"assets/map/world4/world4_very_big_rock_2.png",
    w4_tree:"assets/map/world4/world4_tree_1.png"
  });

  const SKIN_FOLDER_ALIASES = Object.freeze({
    cherry_default:"base_cherry"
  });

  const PETAL_COLORS = ["#ff74b8", "#ffb6d8", "#f7d96f", "#8ddcff", "#b899ff", "#ffffff"];

  function ensureCss() {
    if (id("cherriftBugfixV0943Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftBugfixV0943Css";
    style.textContent = `
      /* Disable the old pointer-down petal trail. */
      .theme-petal-layer-v5{display:none!important;visibility:hidden!important;pointer-events:none!important}

      #clickPetalBurstV0943{
        position:fixed;inset:0;z-index:2147482000;overflow:hidden;
        pointer-events:none!important;contain:strict
      }
      #clickPetalBurstV0943 i{
        position:absolute;width:9px;height:14px;border-radius:85% 15% 75% 25%;
        transform-origin:50% 75%;will-change:transform,opacity;pointer-events:none
      }

      /* The Gacha must remain the only interactive panel while it is open. */
      #gachaChestOnlyV12:not(.hidden),
      #gachaChestOnlyV12:not(.hidden) *,
      #gcoModal:not(.hidden),
      #gcoModal:not(.hidden) *{pointer-events:auto}
      #gachaChestOnlyV12 .gco-arrow,
      #gachaChestOnlyV12 [data-gco-open],
      #gachaChestOnlyV12 [data-gco-tier],
      #gachaChestOnlyV12 [data-gco-back]{touch-action:manipulation;cursor:pointer}

      /* Keep the More drawer above every normal page and make its open state
         independent from legacy inline display rules. */
      #mobileMenuV082:not(.hidden){
        display:block!important;visibility:visible!important;opacity:1!important;
        pointer-events:auto!important;z-index:100030!important
      }

      /* Desktop global wallet between the navigation and profile block. */
      #desktopCurrencyV0943{display:none}
      @media(min-width:821px) and (min-height:601px){
        body.v0933-desktop #globalRailV060.topnav-v0933{
          grid-template-columns:190px minmax(0,1fr) auto!important
        }
        body.v0933-desktop #globalRailV060 .rail-bottom-v060{
          width:auto!important;min-width:max-content!important;display:flex!important;
          flex-direction:row!important;align-items:center!important;gap:5px!important
        }
        body.v0933-desktop #desktopCurrencyV0943{
          order:0;display:flex;align-items:center;gap:4px;margin-right:3px
        }
        body.v0933-desktop #desktopCurrencyV0943 span{
          min-width:62px;height:38px;display:flex;align-items:center;justify-content:center;
          gap:6px;padding:0 9px;border:1px solid rgba(255,205,231,.13);
          border-radius:9px;background:rgba(255,255,255,.035);color:#fff
        }
        body.v0933-desktop #desktopCurrencyV0943 img{
          width:21px;height:21px;object-fit:contain
        }
        body.v0933-desktop #desktopCurrencyV0943 i{
          width:21px;height:21px;display:grid;place-items:center;font-style:normal;font-size:16px
        }
        body.v0933-desktop #desktopCurrencyV0943 b{
          font:800 10px/1 system-ui,sans-serif;white-space:nowrap
        }
        body.v0933-desktop #globalRailV060 .rail-profile-v060{order:1}
        body.v0933-desktop #globalRailV060 .rail-settings-v060{order:2}
        body.v0933-desktop .resource-bar-v082{display:none!important}
      }

      /* Splash art must always occupy the desktop showcase. */
      @media(min-width:821px) and (min-height:601px){
        #skins .skin-art-v093{
          display:block!important;opacity:1!important;
          background-size:contain!important;background-position:center!important;
          background-repeat:no-repeat!important
        }
        #skins .skin-art-v093.hidden{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function closeMoreDrawer() {
    const drawer = id("mobileMenuV082");
    drawer?.classList.add("hidden");
    drawer?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-menu-open-v082", "more-open", "drawer-open");
  }

  function settleMoreDrawer() {
    const drawer = id("mobileMenuV082");
    if (!drawer) return;
    const open = !drawer.classList.contains("hidden");
    if (open) {
      drawer.classList.remove("force-closed-v0942");
      drawer.style.removeProperty("display");
      drawer.style.removeProperty("visibility");
      drawer.style.removeProperty("pointer-events");
    }
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("mobile-menu-open-v082", open);
    document.body.classList.toggle("more-open", open);
    document.body.classList.toggle("drawer-open", open);
    paintGlobalNav();
  }

  function hideGacha() {
    id("gachaChestOnlyV12")?.classList.add("hidden");
    id("gcoModal")?.classList.add("hidden");
    document.body.classList.remove("gacha-open", "gacha-v11-open", "economy-open");
  }

  function normalizeRoute(route, element) {
    if (element?.classList?.contains("cherry-nav-v0942") || element?.classList?.contains("cherry-nav-bf")) return "skins";
    const value = String(route || "").trim();
    const aliases = {
      home:"menu", lobby:"menu", play:"worlds", cherry:"skins",
      gachaV082:"gacha", chests:"gacha", economyV11:"gacha",
      gachaChestOnlyV12:"gacha"
    };
    return aliases[value] || value || "menu";
  }

  function navBucket(route) {
    const target = normalizeRoute(route);
    if (target === "skins") return "skins";
    if (target === "gear") return "gear";
    if (target === "menu" || target === "worlds") return "menu";
    if (target === "gacha") return "gacha";
    return "more";
  }

  function drawerOpen() {
    const drawer = id("mobileMenuV082");
    return !!drawer && !drawer.classList.contains("hidden");
  }

  function paintGlobalNav() {
    const nav = id("globalMobileNavV052") || q(".mobile-nav-v090");
    if (!nav) return;
    const activeBucket = drawerOpen() ? "more" : navBucket(state.navRoute);
    const buttons = qa(":scope > button", nav);
    const active = buttons.find(button => {
      if (activeBucket === "more") return button.hasAttribute("data-v082-toggle-mobile");
      return navBucket(routeFromButton(button)) === activeBucket;
    });
    for (const button of buttons) {
      const selected = button === active;
      button.classList.toggle("active", selected);
      button.classList.toggle("theme-nav-active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    nav.dataset.active = activeBucket;
  }

  function syncGlobalNav(route) {
    state.navRoute = normalizeRoute(route);
    paintGlobalNav();
  }

  function observeGlobalNav() {
    if (state.navObserver || !document.body) return;
    state.navObserver = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
        return target?.closest?.("#globalMobileNavV052,#mobileMenuV082") || Array.from(mutation.addedNodes || []).some(node => node.nodeType === Node.ELEMENT_NODE && (node.matches?.("#globalMobileNavV052,#mobileMenuV082") || node.querySelector?.("#globalMobileNavV052,#mobileMenuV082")));
      });
      if (!relevant || state.navSyncQueued) return;
      state.navSyncQueued = true;
      queueMicrotask(() => {
        state.navSyncQueued = false;
        paintGlobalNav();
      });
    });
    state.navObserver.observe(document.body, { attributes:true, attributeFilter:["class"], childList:true, subtree:true });
  }

  function safeOpen(route, ...args) {
    const target = normalizeRoute(route);
    closeMoreDrawer();
    document.body.style.overflow = "";

    if (target === "gacha") {
      window.CHERRIFT_ACCOUNT_MAIL?.hide?.();
      window.CHERRIFT_WORLD_UI?.hide?.();
      window.CHERRIFT_ECONOMY_V11?.open?.(args[0]);
      syncGlobalNav("gacha");
      requestAnimationFrame(() => {
        id("gachaChestOnlyV12")?.classList.remove("hidden");
        window.CHERRIFT_ECONOMY_V11?.render?.();
      });
      return;
    }

    hideGacha();
    window.CHERRIFT_ACCOUNT_MAIL?.hide?.();
    if (target === "worlds" && window.CHERRIFT_WORLD_UI?.isMobile?.()) {
      window.CHERRIFT_WORLD_UI.openWorldSelector();
      syncGlobalNav("menu");
      requestAnimationFrame(patchVisibleUi);
      return;
    }
    window.CHERRIFT_WORLD_UI?.hide?.();
    if (target === "mailV063" || target === "mailBugfixV0941") {
      syncGlobalNav("more");
      return window.CHERRIFT_ACCOUNT_MAIL?.openMail?.();
    }
    if (target === "profileV082" || target === "profileBugfixV0941") {
      syncGlobalNav("more");
      return window.CHERRIFT_ACCOUNT_MAIL?.openProfile?.();
    }
    if (!state.upstreamOpen) return;
    const result = state.upstreamOpen(target, ...args);
    syncGlobalNav(target);
    requestAnimationFrame(() => {
      hideGacha();
      window.CHERRIFT_ACCOUNT_MAIL?.patchVisibleRoute?.();
      window.CHERRIFT_WORLD_UI?.patchVisible?.();
      syncDesktopCurrency();
      syncSkinSplash();
      syncWorldSplashArts();
    });
    return result;
  }

  function installStableOpen() {
    if (!window.UI?.open || UI.open.__v0943StableOpen) return;
    state.upstreamOpen = UI.open.bind(UI);
    const stable = function stableOpenV0943(route, ...args) {
      return safeOpen(route, ...args);
    };
    stable.__v0943StableOpen = true;
    UI.open = stable;
  }

  function routeFromButton(button) {
    if (!button) return "";
    if (button.classList.contains("cherry-nav-v0942") || button.classList.contains("cherry-nav-bf")) return "skins";
    return button.dataset.v0933Open ||
      button.dataset.v082Open ||
      button.dataset.open ||
      button.dataset.v082Route ||
      button.dataset.v063Open ||
      "";
  }

  function currentGachaTier() {
    const activeDot = q("#gachaChestOnlyV12 [data-gco-tier].active");
    if (activeDot?.dataset.gcoTier) return activeDot.dataset.gcoTier;
    const card = q("#gachaChestOnlyV12 [data-gco-card]");
    return ["common", "rare", "epic"].find(tier => card?.classList.contains(tier)) || "common";
  }

  function gachaStep(step) {
    const tiers = ["common", "rare", "epic"];
    const current = tiers.indexOf(currentGachaTier());
    const next = tiers[(Math.max(0, current) + step + tiers.length) % tiers.length];
    window.CHERRIFT_ECONOMY_V11?.open?.(next);
  }

  function installClickRouter() {
    if (document.documentElement.dataset.v0943ClickRouter === "true") return;
    document.documentElement.dataset.v0943ClickRouter = "true";

    document.addEventListener("click", event => {
      const gacha = event.target.closest?.("#gachaChestOnlyV12");
      if (gacha) {
        const step = event.target.closest("[data-gco-step]");
        const tier = event.target.closest("[data-gco-tier]");
        const open = event.target.closest("[data-gco-open]");
        const back = event.target.closest("[data-gco-back]");
        if (step || tier || open || back) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (step) gachaStep(Number(step.dataset.gcoStep) || 0);
          else if (tier) window.CHERRIFT_ECONOMY_V11?.open?.(tier.dataset.gcoTier);
          else if (open) window.CHERRIFT_ECONOMY_V11?.openMany?.(Number(open.dataset.gcoOpen));
          else safeOpen("menu");
          return;
        }
      }

      const mobileButton = event.target.closest?.("#globalMobileNavV052 > button,.mobile-nav-v090 > button");
      if (mobileButton && !mobileButton.disabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        // v0.8.2's earlier capture handler has already toggled this drawer.
        // Only normalize its accessibility/body/nav state here to avoid a
        // same-click second toggle that would immediately close it again.
        if (mobileButton.hasAttribute("data-v082-toggle-mobile")) settleMoreDrawer();
        else {
          const route = routeFromButton(mobileButton);
          if (route) safeOpen(route);
        }
        return;
      }

      const button = event.target.closest?.(
        "#globalRailV060 button[data-v082-route]," +
        "#globalRailV060 button[data-v082-open]," +
        "#globalRailV060 button[data-open]," +
        "#globalRailV060 button[data-v063-open]," +
        "#desktopSubnavV0933 button[data-v0933-open]," +
        "#globalMobileNavV052 button[data-v082-open]," +
        "#globalMobileNavV052 button[data-open]," +
        "#mobileMenuV082 button[data-v082-open]," +
        "#mobileMenuV082 button[data-open]," +
        "#mobileMenuV082 button[data-v063-open]," +
        ".mobile-nav-v090 button[data-v082-open]," +
        ".mobile-nav-v090 button[data-open]"
      );
      if (!button || button.disabled) return;
      const route = routeFromButton(button);
      if (!route) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      safeOpen(route);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !id("gachaChestOnlyV12")?.classList.contains("hidden")) {
        event.preventDefault();
        safeOpen("menu");
      }
    });
  }

  function walletValues() {
    const save = window.UI?.save || {};
    return {
      coins:number(save.coins),
      blossom:number(save.blossomGems ?? save.bloomGems ?? save.gems),
      essence:number(save.sakuraEssence ?? save.essence),
      scrap:number(
        save.gearScrap ??
        save.scrap ??
        save.arsenal?.materials?.gearScrap ??
        save.arsenal?.gearScrap
      )
    };
  }

  function sourceWalletImages() {
    const spans = qa(".resource-bar-v082 span");
    const images = spans.map(span => q("img", span)?.getAttribute("src") || "");
    return {
      coins:images[0] || "",
      blossom:images[1] || "",
      essence:images[2] || "",
      scrap:images.at(-1) || ""
    };
  }

  function walletItem(icon, image, value, label) {
    return `<span title="${label}">${image ? `<img src="${image}" alt="">` : `<i>${icon}</i>`}<b>${value}</b></span>`;
  }

  function syncDesktopCurrency() {
    if (!isDesktop()) {
      id("desktopCurrencyV0943")?.remove();
      return;
    }
    const railBottom = q("#globalRailV060 .rail-bottom-v060");
    if (!railBottom) return;
    let bar = id("desktopCurrencyV0943");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "desktopCurrencyV0943";
      bar.setAttribute("aria-label", "Currencies");
      railBottom.prepend(bar);
    }
    const values = walletValues();
    const images = sourceWalletImages();
    const signature = JSON.stringify({ values, images });
    if (bar.dataset.signature === signature) return;
    bar.dataset.signature = signature;
    bar.innerHTML =
      walletItem("🪙", images.coins, values.coins, "Coin") +
      walletItem("♦", images.blossom, values.blossom, "Bloom Gem") +
      walletItem("🌸", images.essence, values.essence, "Sakura Essence") +
      walletItem("⚙", images.scrap, values.scrap, "Scrap");
  }

  function loadImage(source) {
    if (!source) return Promise.resolve(null);
    if (state.imagePromises.has(source)) return state.imagePromises.get(source);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
    state.imagePromises.set(source, promise);
    return promise;
  }

  function selectedSkinId() {
    return q("#skins .skin-icon-v093.active[data-v093-skin]")?.dataset.v093Skin ||
      window.UI?.save?.selectedSkin ||
      "";
  }

  function skinCandidates(skinId) {
    const skin = window.CHERRIFT_DATA?.skins?.find?.(entry => entry.id === skinId);
    const folder = SKIN_FOLDER_ALIASES[skinId] || skinId;
    return [...new Set([
      skin?.splash,
      `assets/player/skins/${folder}/${skinId}_splashart.png`,
      `assets/player/skins/${folder}/${folder}_splashart.png`,
      skin?.icon
    ].filter(Boolean))];
  }

  async function syncSkinSplash() {
    const panel = id("skins");
    const art = q(".skin-art-v093", panel);
    if (!panel || !art || panel.classList.contains("hidden")) return;
    const skinId = selectedSkinId();
    if (!skinId) return;
    const token = ++state.skinRequest;
    for (const source of skinCandidates(skinId)) {
      const image = await loadImage(source);
      if (token !== state.skinRequest) return;
      if (!image?.naturalWidth || !image?.naturalHeight) continue;
      art.style.background = "";
      art.style.backgroundImage = `linear-gradient(180deg,rgba(6,3,12,.02),rgba(6,3,12,.48)),url("${source}")`;
      art.style.backgroundSize = "contain";
      art.style.backgroundPosition = "center";
      art.style.backgroundRepeat = "no-repeat";
      art.dataset.v0943Splash = source;
      return;
    }
  }

  function chapterArt(world, chapter) {
    // World 4 chapter art 3 is not in the repository yet. Art 2 is the
    // deliberate placeholder and is listed in ASSET_PLACEHOLDERS.md.
    const artIndex = chapter <= 2 ? 1 : chapter <= 4 ? 2 : world === 4 ? 2 : 3;
    return `assets/map/world${world}/world${world}_splashart_${artIndex}.png`;
  }

  function worldArt(world) {
    return `assets/map/world${world}/world${world}_splashart_1.png`;
  }

  function parseNumber(text, pattern) {
    return Number(String(text || "").match(pattern)?.[1]) || 0;
  }

  function setCardArt(card, source) {
    if (!card || !source || card.dataset.v0943WorldArt === source) return;
    card.dataset.v0943WorldArt = source;
    card.style.backgroundImage = `linear-gradient(180deg,rgba(5,3,12,.03),rgba(5,3,12,.70)),url("${source}")`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  }

  function syncWorldSplashArts() {
    const worldCard = q("#worldCardV0942 .selector-card-v0942");
    if (worldCard) {
      const text = worldCard.textContent;
      const world = parseNumber(text, /World\s+(\d+)/i);
      if (world > 0) setCardArt(worldCard, worldArt(world));
    }

    const chapterCard = q("#chapterCardV0942 .selector-card-v0942");
    if (chapterCard) {
      const world = parseNumber(id("chapterWorldTitleV0942")?.textContent, /World\s+(\d+)/i);
      const chapter = parseNumber(chapterCard.textContent, /Chapter\s+(\d+)/i);
      if (world > 0 && chapter > 0) setCardArt(chapterCard, chapterArt(world, chapter));
    }

    const roots = [id("worldsV094"), id("worlds"), q(".world-screen-v094")].filter(Boolean);
    for (const root of roots) {
      qa("[data-world],[data-v094-world],[data-v0933-world],[data-stage-id],[data-v0933-stage]", root).forEach(card => {
        const text = card.textContent || "";
        const world = Number(card.dataset.world || card.dataset.v094World || card.dataset.v0933World) ||
          parseNumber(text, /World\s+(\d+)/i);
        if (!(world >= 1 && world <= 4)) return;
        const chapter = parseNumber(
          `${card.dataset.stageId || ""} ${card.dataset.v0933Stage || ""} ${text}`,
          /(?:Chapter\s+|world_\d+_)(\d+)/i
        );
        setCardArt(card, chapter > 0 ? chapterArt(world, chapter) : worldArt(world));
      });
    }
  }

  function worldForGame(game) {
    const stage = game?.stage || game?.getSelectedStage?.() ||
      window.CHERRIFT_V040?.stages?.find?.(entry => entry.id === game?.save?.selectedStageId);
    return Number(stage?.world);
  }

  function displaySize(object, image) {
    const oldW = Math.max(1, Number(object.drawW) || 64);
    const oldH = Math.max(1, Number(object.drawH) || 64);
    const naturalW = Math.max(1, Number(image?.naturalWidth || image?.width) || oldW);
    const naturalH = Math.max(1, Number(image?.naturalHeight || image?.height) || oldH);
    const area = oldW * oldH;
    const aspect = naturalW / naturalH;
    let width = Math.sqrt(area * aspect);
    let height = width / aspect;

    // Avoid an accidental extreme size jump while preserving the trimmed PNG aspect.
    const maximum = Math.max(oldW, oldH) * 1.42;
    const scaleDown = Math.min(1, maximum / Math.max(width, height));
    width *= scaleDown;
    height *= scaleDown;
    return {
      width:Math.max(8, Math.round(width)),
      height:Math.max(8, Math.round(height))
    };
  }

  function collisionProfile(object) {
    const key = String(object.assetKey || object.kind || "").toLowerCase();
    const width = Number(object.drawW) || 64;
    const height = Number(object.drawH) || 64;
    const anchor = Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72;
    const bottom = Number(object.y) + height * (1 - anchor);

    let rx = width * .30;
    let ry = height * .15;
    if (/tree|cactus/.test(key)) { rx = width * .16; ry = height * .085; }
    else if (/verybig|very_big|bigrock|big_rock/.test(key)) { rx = width * .38; ry = height * .17; }
    else if (/rock|log|bones/.test(key)) { rx = width * .35; ry = height * .17; }
    else if (/bush|mushroom/.test(key)) { rx = width * .27; ry = height * .13; }

    rx = Math.max(10, rx);
    ry = Math.max(7, ry);
    return { rx, ry, cx:Number(object.x), cy:bottom - ry * .78 };
  }

  async function normalizeMapObjects(game) {
    const world = worldForGame(game);
    if (!(world >= 1 && world <= 4)) return; // Training remains untouched.
    const objects = (game.obstacles || []).filter(object =>
      object?.v094Map && object.kind !== "fireflyV094" && MAP_OBJECT_PATHS[object.assetKey]
    );
    if (!objects.length) return;

    const uniqueKeys = [...new Set(objects.map(object => object.assetKey))];
    await Promise.all(uniqueKeys.map(async assetKey => {
      const source = `${MAP_OBJECT_PATHS[assetKey]}?v=0943`;
      const image = await loadImage(source);
      if (image) state.mapImages.set(assetKey, image);
    }));

    for (const object of objects) {
      const image = state.mapImages.get(object.assetKey);
      if (!image) continue;
      const size = displaySize(object, image);
      object.drawW = size.width;
      object.drawH = size.height;
      object.__v0943Hitbox = object.solid ? collisionProfile(object) : null;
      object.__v0943NaturalSize = {
        width:image.naturalWidth || image.width,
        height:image.naturalHeight || image.height
      };
    }
  }

  function installGamePatches() {
    const proto = window.CherriftGame?.prototype;
    if (!proto || proto.__v0943MapAndPickupPatch) return;
    proto.__v0943MapAndPickupPatch = true;

    const previousStart = proto.start;
    if (typeof previousStart === "function") {
      proto.start = async function startV0943(...args) {
        const result = await previousStart.apply(this, args);
        try { await normalizeMapObjects(this); }
        catch (error) { console.warn("[CHERRIFT v0.9.4.3] Map normalization failed", error); }
        return result;
      };
    }

    const previousDrawObstacle = proto.drawObstacle;
    if (typeof previousDrawObstacle === "function") {
      proto.drawObstacle = function drawObstacleV0943(context, object) {
        if (!object?.v094Map || object.kind === "fireflyV094" || !MAP_OBJECT_PATHS[object.assetKey]) {
          return previousDrawObstacle.call(this, context, object);
        }
        const image = state.mapImages.get(object.assetKey);
        if (!image) return previousDrawObstacle.call(this, context, object);
        const width = Math.max(1, Number(object.drawW) || image.naturalWidth || 64);
        const height = Math.max(1, Number(object.drawH) || image.naturalHeight || 64);
        const anchor = Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72;
        context.save();
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
        context.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
        if ("filter" in context) context.filter = "none";
        context.drawImage(
          image,
          Math.round(Number(object.x) - width / 2),
          Math.round(Number(object.y) - height * anchor),
          Math.round(width),
          Math.round(height)
        );
        context.restore();
      };
    }

    const previousHitObstacle = proto.hitObstacle;
    proto.hitObstacle = function hitObstacleV0943() {
      const player = this.player;
      if (!player) return typeof previousHitObstacle === "function" ? previousHitObstacle.call(this) : false;
      for (const object of this.obstacles || []) {
        if (!object?.solid || !object.v094Map) continue;
        const hitbox = object.__v0943Hitbox;
        if (hitbox) {
          const dx = (player.x - hitbox.cx) / (hitbox.rx + (player.r || 18));
          const dy = (player.y - hitbox.cy) / (hitbox.ry + (player.r || 18));
          if (dx * dx + dy * dy < 1) return true;
          continue;
        }
        const radius = Number(object.collisionRadius || object.r) || 0;
        if (Math.hypot(player.x - object.x, player.y - object.y) < (player.r || 18) + radius * .62) return true;
      }
      if (typeof previousHitObstacle !== "function") return false;
      const obstacles = this.obstacles;
      this.obstacles = (obstacles || []).filter(object => !object?.v094Map);
      try { return previousHitObstacle.call(this); }
      finally { this.obstacles = obstacles; }
    };

    const previousDrawPickup = proto.drawPickup;
    if (typeof previousDrawPickup === "function") {
      proto.drawPickup = function drawPickupV0943(context, pickup) {
        if (pickup?.type !== "xp") return previousDrawPickup.call(this, context, pickup);
        const large = Number(pickup.value) >= 5;
        const image = this.assets?.get?.(large ? "xpBig" : "xpSmall") ||
          this.assets?.get?.(large ? "xpLarge" : "xpSmall");
        if (!image) return previousDrawPickup.call(this, context, pickup);
        const maximum = large ? 24 : 17;
        const naturalW = Math.max(1, Number(image.naturalWidth || image.width) || maximum);
        const naturalH = Math.max(1, Number(image.naturalHeight || image.height) || maximum);
        const scale = maximum / Math.max(naturalW, naturalH);
        const width = Math.max(8, Math.round(naturalW * scale));
        const height = Math.max(8, Math.round(naturalH * scale));
        context.save();
        context.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in context) context.imageSmoothingQuality = "high";
        context.drawImage(image, Math.round(pickup.x - width / 2), Math.round(pickup.y - height / 2), width, height);
        context.restore();
      };
    }

    const previousResize = proto.resize;
    if (typeof previousResize === "function") {
      proto.resize = function resizeV0943(...args) {
        const result = previousResize.apply(this, args);
        if (this.ctx) {
          this.ctx.imageSmoothingEnabled = true;
          if ("imageSmoothingQuality" in this.ctx) this.ctx.imageSmoothingQuality = "high";
        }
        return result;
      };
    }
  }

  function clickLayer() {
    if (state.clickLayer?.isConnected) return state.clickLayer;
    const layer = document.createElement("div");
    layer.id = "clickPetalBurstV0943";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    state.clickLayer = layer;
    return layer;
  }

  function petalBurst(x, y) {
    if (document.body.classList.contains("is-playing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = clickLayer();
    const amount = isDesktop() ? 12 : 9;
    for (let index = 0; index < amount; index += 1) {
      const petal = document.createElement("i");
      petal.style.left = `${x}px`;
      petal.style.top = `${y}px`;
      petal.style.background = PETAL_COLORS[index % PETAL_COLORS.length];
      layer.appendChild(petal);

      const angle = (Math.PI * 2 * index / amount) + (Math.random() - .5) * .55;
      const distance = 25 + Math.random() * 42;
      const dx = Math.cos(angle) * distance;
      const burstY = Math.sin(angle) * distance - 12 - Math.random() * 16;
      const fallY = burstY + 55 + Math.random() * 55;
      const rotate = (Math.random() * 520 - 260);
      const duration = 680 + Math.random() * 300;

      const animation = petal.animate([
        { transform:"translate(-50%,-50%) scale(.55) rotate(0deg)", opacity:0 },
        { transform:`translate(calc(-50% + ${dx * .65}px),calc(-50% + ${burstY}px)) scale(1) rotate(${rotate * .45}deg)`, opacity:1, offset:.28 },
        { transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${fallY}px)) scale(.72) rotate(${rotate}deg)`, opacity:0 }
      ], {
        duration,
        delay:Math.random() * 45,
        easing:"cubic-bezier(.18,.72,.26,1)",
        fill:"forwards"
      });
      animation.finished.catch(() => {}).finally(() => petal.remove());
    }
  }

  function installPetalBurst() {
    if (document.documentElement.dataset.v0943Petals === "true") return;
    document.documentElement.dataset.v0943Petals = "true";
    document.addEventListener("click", event => {
      if (event.button !== 0) return;
      if (event.target.closest?.("canvas,#gameCanvas,input,textarea,select")) return;
      petalBurst(event.clientX, event.clientY);
    }, false);
  }

  function patchVisibleUi() {
    window.CHERRIFT_ACCOUNT_MAIL?.patchVisibleRoute?.();
    window.CHERRIFT_WORLD_UI?.patchVisible?.();
    syncDesktopCurrency();
    syncSkinSplash();
    syncWorldSplashArts();
    closeMoreDrawer();
  }

  function start() {
    if (!window.UI || !window.CherriftGame || !id("app")) {
      setTimeout(start, 100);
      return;
    }
    ensureCss();
    installStableOpen();
    installClickRouter();
    installGamePatches();
    installPetalBurst();
    patchVisibleUi();
    syncGlobalNav("menu");
    observeGlobalNav();

    window.addEventListener("resize", patchVisibleUi);
    window.addEventListener("cherrift:savechange", syncDesktopCurrency);
    window.addEventListener("cherrift:economychange", syncDesktopCurrency);
    window.addEventListener("cherrift:languagechange", patchVisibleUi);

    window.CHERRIFT_STABILITY = Object.freeze({
      version:VERSION,
      open:safeOpen,
      syncNav:syncGlobalNav,
      refresh:patchVisibleUi,
      normalizeMap:normalizeMapObjects,
      objectPaths:MAP_OBJECT_PATHS
    });
    window.CHERRIFT_BUGFIX_V0943 = window.CHERRIFT_STABILITY;
    console.info(`[CHERRIFT] Bugfix ${VERSION} loaded.`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start();
  }
})();
