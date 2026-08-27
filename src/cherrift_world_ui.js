(() => {
  "use strict";
  if (window.__CHERRIFT_BUGFIX_V0942__) return;
  window.__CHERRIFT_BUGFIX_V0942__ = true;

  const VERSION = "0.9.8.3-carousel-route";
  const MOBILE_QUERY = "(max-width:820px)";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const isTouchLike = () => Number(navigator.maxTouchPoints || 0) > 0 || matchMedia("(pointer:coarse)").matches;
  const isMobile = () => matchMedia(MOBILE_QUERY).matches || (isTouchLike() && innerHeight <= 600);
  const isTestBuild = () => /TEST|TESZT/i.test(`${window.CHERRIFT_BUILD?.title || ""} ${window.CHERRIFT_BUILD?.label || ""}`);
  const state = {
    originalOpen: null,
    observer: null,
    timer: 0,
    worldIndex: 0,
    chapterIndex: 0,
    selectedWorld: 1,
    drag: null,
    transitionTimer: 0
  };

  function language() {
    return window.CHERRIFT_LOCALIZATION?.language?.() === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }
  function copy(hu, en) { return language() === "en" ? en : hu; }
  function saveProgress() {
    try { window.CherriftStorage?.save?.(UI.save); } catch (error) { console.warn("[CHERRIFT v0.9.4.2] Save failed", error); }
    UI.refreshMenu?.();
  }

  function ensureCss() {
    if (id("cherriftBugfixV0942Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftBugfixV0942Css";
    style.textContent = `
      /* Gear centering and platform removal. */
      #gear .gear-stage-rune-v0560,#gear .gear-character-floor-v0560,#gear [class*="pedestal"],#gear [class*="stage-base"],#gear [class*="ground-shadow"],#gear .gear-stage-v0560::after,#gear .gear-stage-v0560::before{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;background:none!important;box-shadow:none!important}
      #gear #gearCherryCanvasV0560,#gear #gearCherryStableV060{position:absolute!important;left:50%!important;right:auto!important;top:50%!important;width:min(210px,48vw)!important;height:min(210px,48vw)!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-46%) scale(1.32)!important;transform-origin:center!important;margin:0!important;z-index:4!important}
      #gear .gear-equipment-tools-v0942{display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:wrap!important;gap:8px!important;margin-left:auto!important;justify-self:end!important}
      #gear .gear-equipment-tools-v0942>.gear-bulk-tools-v082{display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:wrap!important;gap:8px!important;margin:0!important}
      #gear .gear-equipment-tools-v0942 button{margin:0!important;min-width:82px!important;white-space:nowrap!important}

      /* Shared responsive World / Chapter carousel. */
      .selector-v0942{overflow:hidden!important;height:var(--cherrift-viewport-height,100dvh)!important;min-height:0!important;color:#fff}
      .selector-shell-v0942{width:min(920px,100%);height:100%;min-height:0;margin:auto;display:flex;flex-direction:column;padding:max(74px,calc(env(safe-area-inset-top) + 70px)) 12px calc(82px + env(safe-area-inset-bottom));overflow:hidden}
      .selector-head-v0942{flex:0 0 auto;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px;margin-bottom:7px}.selector-head-v0942 h2{margin:0;font:700 clamp(35px,10vw,53px)/1 Georgia,serif}.selector-back-v0942{width:58px;height:58px;border:1px solid #ffffff26;border-radius:19px;color:#fff;background:#ffffff08;font-size:25px}.selector-total-v0942{display:grid;justify-items:end;gap:2px;padding:8px 12px;border:1px solid #ffffff26;border-radius:14px;background:#100817c9}.selector-total-v0942 small{color:#dda9c3;font-size:8px;font-weight:1000;letter-spacing:1px}.selector-total-v0942 b{color:#ffd467;font:900 15px/1 system-ui,sans-serif}
      .selector-carousel-v0942{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:stretch;gap:7px;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
      .selector-carousel-v0942.dragging{cursor:grabbing}.selector-carousel-v0942 *{user-select:none;-webkit-user-select:none;-webkit-user-drag:none}.selector-carousel-v0942 img{pointer-events:none}
      .selector-arrow-v0942{align-self:center;height:66px;border:1px solid #ffffff22;border-radius:17px;color:#fff;background:#ffffff08;font-size:40px;touch-action:manipulation;cursor:pointer}.selector-arrow-v0942:disabled{opacity:.25}
      #worldCardV0942,#chapterCardV0942{align-self:stretch;min-width:0;min-height:280px;height:100%;display:block}
      .selector-card-v0942{position:relative;height:100%;min-height:0;overflow:hidden;border:1px solid #ffffff28;border-radius:28px;background:#16091d center/cover no-repeat;box-shadow:0 18px 60px #0008;isolation:isolate}
      .selector-card-v0942::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#06030b19 10%,#09040d16 40%,#08030dde 100%)}
      .selector-card-v0942.locked{filter:grayscale(.75) brightness(.55)}
      .selector-stars-v0942{position:absolute;left:50%;top:16px;translate:-50% 0;display:flex;align-items:center;justify-content:center;gap:3px;padding:7px 13px;border-radius:999px;background:#08040dbd;color:#ffd467;font:900 clamp(20px,6vw,31px)/1 Georgia,serif;white-space:nowrap;text-shadow:0 0 15px #ffc44a88}
      .selector-copy-v0942{position:absolute;left:20px;right:20px;bottom:20px}.selector-copy-v0942 small{display:block;color:#ff93c6;font-size:11px;font-weight:1000;letter-spacing:2px;text-transform:uppercase}.selector-copy-v0942 h3{margin:5px 0 0;font:700 clamp(42px,11vw,62px)/.95 Georgia,serif}.selector-copy-v0942 p{margin:9px 0 0;color:#ead6e1;font-weight:800}.selector-dummy-v0942{display:inline-flex;margin-top:10px;padding:7px 11px;border:1px solid #ffffff24;border-radius:12px;background:#09040db5;font-weight:900}
      .selector-rewards-v0942{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.selector-rewards-v0942 span{min-width:0;padding:8px;border-radius:12px;background:#08040dbd;text-align:center}.selector-rewards-v0942 small{color:#dda9c3;font-size:8px;letter-spacing:.8px}.selector-rewards-v0942 b{display:block;margin-top:3px;font-size:12px}
      .selector-dots-v0942{flex:0 0 auto;display:flex;justify-content:center;gap:8px;padding:7px}.selector-dots-v0942 button{display:grid;place-items:center;min-width:25px;height:25px;padding:0 7px;border:1px solid #ffffff25;border-radius:99px;color:#d9b8ce;background:#ffffff0b;font:900 11px/1 system-ui,sans-serif}.selector-dots-v0942 button.active{border-color:#ffacd2;color:#fff;background:#ec4f9b;box-shadow:0 0 18px #ec4f9b66}.selector-dots-v0942 button.locked{opacity:.42}.selector-card-host-v0942.switching{animation:selectorCardInV096 .24s ease both}
      .chapter-summary-v0942{flex:0 0 auto;display:grid;grid-template-columns:1.5fr repeat(5,minmax(0,1fr));gap:7px;margin:0 0 8px;padding:9px;border:1px solid #ffffff22;border-radius:17px;background:#120819e8}.chapter-summary-v0942>div{min-width:0;padding:7px 9px;border-radius:11px;background:#ffffff08}.chapter-summary-v0942 small{display:block;color:#dda9c3;font-size:7px;font-weight:1000;letter-spacing:.8px;text-transform:uppercase}.chapter-summary-v0942 b{display:block;margin-top:4px;overflow:hidden;color:#fff;font:900 11px/1.25 system-ui,sans-serif;text-overflow:ellipsis;white-space:nowrap}.chapter-summary-v0942 .chapter-summary-title-v0942 b{font-size:14px}
      .selector-actions-v0942{flex:0 0 auto;display:grid;gap:9px}.selector-actions-v0942.two{grid-template-columns:1fr 1.35fr}.selector-actions-v0942 button{min-height:58px;border:1px solid #ffffff2b;border-radius:17px;color:#fff;background:#ffffff09;font-size:20px;font-weight:1000}.selector-actions-v0942 button.primary{background:linear-gradient(115deg,#dc3281,#ed72ac)}.selector-actions-v0942 button:disabled{opacity:.38;filter:grayscale(1)}
      @keyframes selectorCardInV096{from{opacity:.35;transform:translateX(18px) scale(.985)}to{opacity:1;transform:none}}

      @media(min-width:821px){
        .selector-shell-v0942{padding:calc(var(--v0933-top,60px) + var(--v0933-sub,38px) + 16px) 24px 24px}
        .selector-head-v0942 h2{font-size:42px}.selector-back-v0942{width:52px;height:52px;border-radius:15px}
        #worldCardV0942,#chapterCardV0942{min-height:370px;max-height:520px}.selector-carousel-v0942{grid-template-columns:58px minmax(0,1fr) 58px;gap:14px}.selector-arrow-v0942{height:84px}
        .selector-copy-v0942 h3{font-size:54px}.selector-actions-v0942{width:min(620px,100%);margin:0 auto}
      }

      @media(max-width:820px){
        /* Main menu layout. */
        #menu .mobile-side-actions-v0932.right{top:38dvh!important;gap:7px!important}
        #menu .mobile-home-v031.mobile-archero-v051{height:var(--cherrift-viewport-height,100dvh)!important;min-height:0!important;display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;padding-top:max(100px,calc(env(safe-area-inset-top) + 94px))!important;overflow:hidden!important}
        #menu .mobile-hero-area-v051{min-height:0!important;height:auto!important;overflow:hidden!important}
        #menu .mobile-character-stage-v051{min-height:0!important;height:100%!important;margin-top:0!important}
        #menu .mobile-character-display-v051{margin-top:0!important}
        #menu .mobile-character-display-v051 .mobile-chapter-stars-v0932{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:-58px!important;translate:-50% 0!important;width:max-content!important;margin:0!important;z-index:12!important}
        #menu .mobile-character-display-v051 .mobile-chapter-stars-v0932 span{font-size:34px!important}
        #menu .mobile-stage-copy-v051{display:none!important}
        #menu .mobile-stage-panel-v051{position:relative!important;z-index:20!important;flex:0 0 auto!important;margin-top:46px!important;overflow:visible!important}
        #menu #mobilePlayBtn{display:grid!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:2!important}

        /* More drawer must never remain over the selected page. */
        .mobile-menu-v082.force-closed-v0942{display:none!important;pointer-events:none!important;visibility:hidden!important}

        /* Equipment toolbar. */
        #gear .gear-inventory-head-v0560{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:8px!important;padding-right:12px!important}
        #gear .gear-equipment-tools-v0942{position:static!important;display:grid!important;grid-template-columns:auto auto!important;align-items:start!important;justify-content:end!important;gap:7px!important;max-width:none!important;margin:0!important;z-index:7!important}
        #gear .gear-equipment-tools-v0942 button{min-width:74px!important;min-height:38px!important;padding:0 10px!important;font-size:11px!important}
        #gear .gear-equipment-tools-v0942>#gearSortV0560,#gear .gear-equipment-tools-v0942>.gear-bulk-tools-v082>[data-v082-select-mode]{min-width:86px!important;min-height:42px!important;border-radius:12px!important}
        #gear .gear-equipment-tools-v0942>.gear-bulk-tools-v082{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"cancel picks" "cancel actions"!important;align-items:stretch!important;gap:7px!important;max-width:244px!important;margin:0!important}
        #gear .gear-bulk-tools-v082>[data-v082-select-mode]{grid-area:cancel!important}
        #gear .gear-selection-picks-v096{grid-area:picks!important;display:grid!important;grid-template-columns:1fr 1fr auto!important;align-items:center!important;gap:6px!important}
        #gear .gear-selection-actions-v096{grid-area:actions!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
        #gear .gear-selection-picks-v096.hidden,#gear .gear-selection-actions-v096.hidden{display:none!important}
        #gear .gear-selection-picks-v096 button,#gear .gear-selection-actions-v096 button{min-width:0!important;min-height:38px!important;padding:0 9px!important}
        #gear #gearSelectedCountV082{min-width:auto!important;min-height:0!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:var(--theme-muted,var(--gear-muted,#8b6a72))!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important}
        #gear.theme-selection-mode-v5 #gearSortV0560{display:none!important}
        #gear.theme-selection-mode-v5 .gear-equipment-tools-v0942{grid-template-columns:auto!important}
        #gear #gearCherryCanvasV0560,#gear #gearCherryStableV060{width:min(230px,52vw)!important;height:min(230px,52vw)!important;transform:translate(-50%,-46%) scale(1.38)!important}

        .selector-head-v0942 h2{font-size:clamp(32px,8vw,44px)}
        #worldCardV0942,#chapterCardV0942{min-height:clamp(300px,48dvh,520px)}
        .chapter-summary-v0942{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:7px}.chapter-summary-v0942 .chapter-summary-title-v0942{grid-column:1/-1}.chapter-summary-v0942>div{padding:6px 7px}
      }

      @media(max-width:820px) and (max-height:700px){
        #menu .mobile-home-v031.mobile-archero-v051{padding-top:max(82px,calc(env(safe-area-inset-top) + 76px))!important}
        #menu .mobile-character-display-v051{height:min(29dvh,225px)!important}
        #menu .mobile-stage-panel-v051{margin-top:34px!important;padding:6px 8px!important}
        #menu #mobilePlayBtn{min-height:48px!important}
        .selector-shell-v0942{padding-top:max(56px,calc(env(safe-area-inset-top) + 52px))}
        #worldCardV0942,#chapterCardV0942{min-height:230px}
        .chapter-summary-v0942{margin-bottom:5px}.chapter-summary-v0942>div{padding:4px 6px}.chapter-summary-v0942 b{font-size:9px;margin-top:2px}.chapter-summary-v0942 small{font-size:6px}
      }

      @media(orientation:landscape) and (max-height:600px) and (pointer:coarse){
        html,body,#app{width:100%;height:var(--cherrift-viewport-height,100dvh);min-height:0;overscroll-behavior:none}body{overflow:hidden!important}
        body.v090-mobile #globalRailV060{display:none!important}
        body.v090-mobile .mobile-menu-v082{inset:7px 7px 7px 82px!important;max-height:none!important}
        body.v090-mobile:not(.is-playing):not(.is-loading-stage) #app>.panel:not(.hidden),body.v090-mobile:not(.is-playing):not(.is-loading-stage) .v082-custom-panel:not(.hidden){position:fixed!important;inset:0!important;width:100%!important;height:var(--cherrift-viewport-height,100dvh)!important;padding:45px 8px 8px 82px!important;overflow:auto!important}
        .selector-shell-v0942{width:min(900px,100%);padding:max(6px,env(safe-area-inset-top)) 48px calc(58px + env(safe-area-inset-bottom))}
        .selector-head-v0942{min-height:38px;margin-bottom:2px}.selector-head-v0942 h2{font-size:30px}.selector-back-v0942{width:40px;height:40px;border-radius:13px;font-size:20px}
        .selector-carousel-v0942{grid-template-columns:34px minmax(0,1fr) 34px;gap:5px}.selector-arrow-v0942{height:48px;font-size:30px}.selector-card-v0942{min-height:205px;border-radius:20px}
        .selector-stars-v0942{top:8px;padding:4px 9px;font-size:18px}.selector-copy-v0942{left:14px;right:14px;bottom:10px}.selector-copy-v0942 h3{font-size:30px}.selector-copy-v0942 p{margin-top:4px}.selector-rewards-v0942{margin-top:5px}.selector-rewards-v0942 span{padding:5px}.selector-actions-v0942{gap:6px}.selector-actions-v0942 button{min-height:40px;font-size:16px}.selector-dots-v0942{padding:3px}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedSkin() {
    const skinId = UI.save?.selectedSkin || "base_cherry";
    return (window.CHERRIFT_DATA?.skins || []).find(skin => skin.id === skinId) || { id: skinId, name: skinId, icon: "" };
  }

  function patchDesktopZoom() {
    if (!window.CHERRIFT_CONFIG?.performance) return;
    if (!isMobile()) CHERRIFT_CONFIG.performance.cameraZoom = 1.06;
  }

  function patchGear() {
    const gear = id("gear");
    if (!gear || gear.classList.contains("hidden")) return;
    qa('.gear-stage-rune-v0560,.gear-character-floor-v0560,[class*="pedestal"],[class*="stage-base"],[class*="ground-shadow"]', gear).forEach(element => element.remove());
    const cherry = id("gearCherryStableV060") || id("gearCherryCanvasV0560");
    if (cherry) {
      cherry.style.left = "50%";
      cherry.style.right = "auto";
      cherry.style.top = "50%";
      cherry.style.transform = "";
    }
    const header = q(".gear-inventory-head-v0560", gear);
    const sort = id("gearSortV0560") || qa("button", gear).find(button => /^(?:level|power)(?:\s|$)/i.test(button.textContent.trim()));
    const bulkTools = id("gearBulkToolsV082");
    const select = q("[data-v082-select-mode]", bulkTools);
    if (header && sort && bulkTools && select) {
      let host = q(".gear-equipment-tools-v0942", header);
      if (!host) {
        host = document.createElement("div");
        host.className = "gear-equipment-tools-v0942";
        header.appendChild(host);
      }
      if (sort.parentElement !== host) host.appendChild(sort);
      if (bulkTools.parentElement !== host) host.appendChild(bulkTools);
    }
  }

  function closeMoreDrawer() {
    const drawer = id("mobileMenuV082") || q(".mobile-menu-v082");
    if (drawer) {
      drawer.classList.add("hidden", "force-closed-v0942");
      drawer.setAttribute("aria-hidden", "true");
      drawer.style.display = "none";
    }
    qa(".mobile-menu-backdrop-v082,.mobile-menu-overlay-v082,[data-mobile-menu-backdrop]").forEach(element => {
      element.classList.add("hidden");
      element.style.display = "none";
      element.style.pointerEvents = "none";
    });
    document.body.classList.remove("mobile-menu-open-v082", "menu-open");
    setTimeout(() => {
      drawer?.classList.remove("force-closed-v0942");
      if (drawer) drawer.style.display = "";
      qa(".mobile-menu-backdrop-v082,.mobile-menu-overlay-v082,[data-mobile-menu-backdrop]").forEach(element => {
        element.style.display = "";
        element.style.pointerEvents = "";
      });
    }, 80);
  }

  function normalizeLabel(button) { return button.textContent.replace(/\s+/g, " ").trim().toLowerCase(); }
  function patchHome() {
    const menu = id("menu");
    if (!isMobile() || !menu || menu.classList.contains("hidden")) return;
    const display = q(".mobile-character-display-v051", menu);
    const stars = q(".mobile-chapter-stars-v0932", menu);
    if (display && stars && stars.parentElement !== display) display.appendChild(stars);
    const rightGroups = [q(".mobile-side-actions-v0932.right", menu)].filter(Boolean);
    for (const right of rightGroups) {
      const order = ["quest", "daily", "weekly", "login"];
      qa("button", right).forEach(button => {
        const label = normalizeLabel(button);
        const index = order.findIndex(item => label.includes(item));
        button.style.order = String(index >= 0 ? index : order.length);
      });
    }
  }

  function updateViewportMetrics() {
    const viewport = window.visualViewport;
    const height = Math.max(320, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
    document.documentElement.style.setProperty("--cherrift-viewport-height", `${height}px`);
  }

  function stages() {
    return window.CHERRIFT_V040?.stages || window.CHERRIFT_DATA?.stages || [];
  }
  function stageWorld(stage) { return number(stage?.world) || number(String(stage?.id || "").match(/world[_-]?(\d+)/i)?.[1]) || 1; }
  function stageIndex(stage, fallback = 1) { return number(stage?.index || stage?.stage || String(stage?.id || "").match(/(?:_|-)(\d+)$/)?.[1]) || fallback; }
  function stageStars(stage) { return Math.min(3, number(UI.save?.stageStars?.[stage.id] || UI.save?.stageStats?.[stage.id]?.stars)); }
  function stageCleared(stage) { return !!(UI.save?.clearedStages?.[stage.id] || UI.save?.stageStats?.[stage.id]?.clears); }
  function stageUnlocked(stage) {
    if (window.CHERRIFT_PREBETA?.isStageUnlocked) return CHERRIFT_PREBETA.isStageUnlocked(stage, UI.save);
    return UI.save?.unlockedStages?.includes(stage.id) || stageCleared(stage) || (stageWorld(stage) === 1 && stageIndex(stage) === 1);
  }
  function trainingStage() { return stages().find(stage => stage.training === true || /train|test/i.test(`${stage.id || ""} ${stage.name || ""}`)); }
  function worldStages(world) { return stages().filter(stage => stageWorld(stage) === Number(world) && stage !== trainingStage()).sort((a,b) => stageIndex(a)-stageIndex(b)); }
  function worldCount() {
    // The selector is the permanent World 1–6 carousel. Worlds without an
    // installed chapter set remain visible as locked previews and cannot open
    // the chapter screen, so there are no empty playable cards.
    return 6;
  }
  function worldUnlocked(world) {
    if (window.CHERRIFT_PREBETA?.isWorldUnlocked) return CHERRIFT_PREBETA.isWorldUnlocked(world, UI.save);
    if (world === 1) return true;
    const previous = worldStages(world - 1);
    return previous.length > 0 && previous.every(stageCleared);
  }
  function worldArt(world) {
    if (world === 1) return "assets/map/world1/world1_splashart_1.png";
    if (world === 2) return "assets/map/world2/world2_splashart_1.png";
    if (world === 3) return "assets/map/world3/world3_splashart_1.png";
    if (world === 4) return "assets/map/world4/world4_splashart_1.png";
    if (world === 5) return "assets/map/world5/world5_splashart_1.png";
    if (world === 6) return "assets/map/world6/world6_splashart_1.png";
    return "assets/map/world1/world1_splashart_1.png";
  }
  function chapterArt(stage) {
    const world = stageWorld(stage);
    const index = stageIndex(stage);
    if (world === 1) {
      const artIndex = index <= 2 ? 1 : index <= 4 ? 2 : 3;
      return `assets/map/world1/world1_splashart_${artIndex}.png`;
    }
    if (world === 4) return stage.splash || stage.splashArt || stage.art || stage.image || `assets/map/world4/world4_splashart_${index <= 2 ? 1 : 2}.png`;
    if (world === 5) return `assets/map/world5/world5_splashart_${index <= 2 ? 1 : index <= 4 ? 2 : 3}.png`;
    if (world === 6) return `assets/map/world6/world6_splashart_${index <= 2 ? 1 : index <= 4 ? 2 : 3}.png`;
    const artIndex = index <= 2 ? 1 : index <= 4 ? 2 : 3;
    return stage.splash || stage.splashArt || stage.art || stage.image || `assets/map/world${world}/world${world}_splashart_${artIndex}.png`;
  }
  function rewardText(reward) {
    if (!reward || typeof reward !== "object") return "—";
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} Coin`);
    if (reward.keys) parts.push(`${reward.keys} ${copy("Common láda", "Common Chest")}`);
    if (reward.chests?.common) parts.push(`${reward.chests.common} ${copy("Common láda", "Common Chest")}`);
    if (reward.chests?.rare) parts.push(`${reward.chests.rare} ${copy("Rare láda", "Rare Chest")}`);
    if (reward.chests?.epic) parts.push(`${reward.chests.epic} ${copy("Epic láda", "Epic Chest")}`);
    if (reward.gems) parts.push(`${reward.gems} Gem`);
    return parts.join(" · ") || "—";
  }

  function ensureWorldPanel() {
    let panel = id("worldSelectorV0942");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "worldSelectorV0942";
    panel.className = "panel selector-v0942 hidden";
    panel.innerHTML = `<div class="selector-shell-v0942"><header class="selector-head-v0942"><button class="selector-back-v0942" type="button" data-world-back aria-label="Back">←</button><h2 data-world-title></h2><span class="selector-total-v0942"><small data-world-total-label></small><b id="worldTotalStarsV0942"></b></span></header><div class="selector-carousel-v0942" data-selector-drag><button type="button" class="selector-arrow-v0942" data-world-step="-1" aria-label="Previous world">‹</button><div id="worldCardV0942" class="selector-card-host-v0942"></div><button type="button" class="selector-arrow-v0942" data-world-step="1" aria-label="Next world">›</button></div><div id="worldDotsV0942" class="selector-dots-v0942"></div><div class="selector-actions-v0942"><button type="button" class="primary" data-world-start></button></div></div>`;
    id("app")?.appendChild(panel);
    panel.addEventListener("click", event => {
      const step = event.target.closest("[data-world-step]");
      if (step) { event.preventDefault(); moveWorld(Number(step.dataset.worldStep)); }
      const dot = event.target.closest("[data-world-index]");
      if (dot) { event.preventDefault(); setWorldIndex(Number(dot.dataset.worldIndex)); }
      if (event.target.closest("[data-world-back]")) {
        if (window.CHERRIFT_STABILITY?.open) window.CHERRIFT_STABILITY.open("menu");
        else UI.open?.("menu");
      }
      if (event.target.closest("[data-world-start]")) startSelectedWorld();
    });
    bindDrag(q("[data-selector-drag]", panel), moveWorld);
    return panel;
  }

  function worldEntries() {
    const entries = [];
    const training = trainingStage();
    if (training && window.CHERRIFT_PREBETA?.hasActiveGmAccess?.(UI.save)) entries.push({ type:"training", world:0, stage:training, name:"Training", art:training.splash || training.art || "assets/map/world3/world3_ground_1.png", unlocked:true });
    for (let world = 1; world <= worldCount(); world += 1) entries.push({ type:"world", world, name:`World ${world}`, art:worldArt(world), unlocked:worldUnlocked(world) });
    return entries;
  }
  function worldName(world) {
    return ({1:"Blooming Meadow",2:"Night Bloom",3:"Sunlit Savanna",4:"Red Desert",5:"Sand Desert",6:"Dark Ruins"})[world] || `World ${world}`;
  }
  function allWorldStars() {
    const list = stages().filter(stage => !stage.training && stageWorld(stage) >= 1 && stageWorld(stage) <= worldCount());
    return { earned:list.reduce((sum, stage) => sum + stageStars(stage), 0), max:list.length * 3 };
  }
  function renderWorldSelector() {
    const entries = worldEntries();
    if (!entries.length) return;
    state.worldIndex = Math.max(0, Math.min(entries.length - 1, state.worldIndex));
    const entry = entries[state.worldIndex];
    state.selectedWorld = entry.world;
    const card = id("worldCardV0942");
    const start = q("[data-world-start]", id("worldSelectorV0942"));
    q("[data-world-title]", id("worldSelectorV0942")).textContent = copy("Világválasztás", "World Selection");
    q("[data-world-total-label]", id("worldSelectorV0942")).textContent = copy("ÖSSZES CSILLAG", "TOTAL STARS");
    const total = allWorldStars();
    id("worldTotalStarsV0942").textContent = `★ ${total.earned} / ${total.max}`;
    start.textContent = copy("Kiválasztás", "Select");
    if (entry.type === "training") {
      card.innerHTML = `<article class="selector-card-v0942" style="background-image:url('${esc(entry.art)}')"><div class="selector-stars-v0942">${copy("TESZT", "TEST")}</div><div class="selector-copy-v0942"><small>${copy("Gyakorlópálya", "Training Ground")}</small><h3>${copy("Teszt Training", "Test Training")}</h3><span class="selector-dummy-v0942">∞ HP Dummy</span></div></article>`;
    } else {
      const list = worldStages(entry.world);
      const earned = list.reduce((sum, stage) => sum + stageStars(stage), 0);
      const max = list.length * 3;
      card.innerHTML = `<article class="selector-card-v0942 ${entry.unlocked ? "" : "locked"}" style="background-image:url('${esc(entry.art)}')"><div class="selector-stars-v0942">★ ${earned} / ${max || 15}</div><div class="selector-copy-v0942"><small>World ${entry.world}</small><h3>${esc(worldName(entry.world))}</h3>${entry.unlocked ? "" : `<p>${copy("Zárolva", "Locked")}</p>`}</div></article>`;
    }
    start.disabled = !entry.unlocked;
    id("worldDotsV0942").innerHTML = entries.map((item, index) => `<button type="button" class="${index === state.worldIndex ? "active" : ""} ${item.unlocked ? "" : "locked"}" data-world-index="${index}" aria-label="${esc(item.type === "training" ? "Training" : `World ${item.world}`)}">${item.type === "training" ? "T" : item.world}</button>`).join("");
    const previous = q('[data-world-step="-1"]', id("worldSelectorV0942"));
    const next = q('[data-world-step="1"]', id("worldSelectorV0942"));
    if (previous) previous.disabled = state.worldIndex <= 0;
    if (next) next.disabled = state.worldIndex >= entries.length - 1;
    card.classList.remove("switching");
    requestAnimationFrame(() => card.classList.add("switching"));
  }

  function setWorldIndex(index) {
    const entries = worldEntries();
    const next = Math.max(0, Math.min(entries.length - 1, number(index)));
    if (next === state.worldIndex) return;
    state.worldIndex = next;
    renderWorldSelector();
  }
  function moveWorld(step) { setWorldIndex(state.worldIndex + Number(step || 0)); }

  function ensureChapterPanel() {
    let panel = id("chapterSelectorV0942");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "chapterSelectorV0942";
    panel.className = "panel selector-v0942 hidden";
    panel.innerHTML = `<div class="selector-shell-v0942"><header class="selector-head-v0942"><button class="selector-back-v0942" type="button" data-chapter-back aria-label="Back">←</button><h2 id="chapterWorldTitleV0942">World</h2><span class="selector-total-v0942"><small data-chapter-count-label></small><b id="chapterCountV0942"></b></span></header><div class="selector-carousel-v0942" data-chapter-drag><button type="button" class="selector-arrow-v0942" data-chapter-step="-1" aria-label="Previous chapter">‹</button><div id="chapterCardV0942" class="selector-card-host-v0942"></div><button type="button" class="selector-arrow-v0942" data-chapter-step="1" aria-label="Next chapter">›</button></div><div id="chapterDotsV0942" class="selector-dots-v0942"></div><section id="chapterSummaryV0942" class="chapter-summary-v0942"></section><div class="selector-actions-v0942 two"><button type="button" data-chapter-back></button><button type="button" class="primary" data-chapter-play></button></div></div>`;
    id("app")?.appendChild(panel);
    panel.addEventListener("click", event => {
      const step = event.target.closest("[data-chapter-step]");
      if (step) { event.preventDefault(); moveChapter(Number(step.dataset.chapterStep)); }
      const dot = event.target.closest("[data-chapter-index]");
      if (dot) { event.preventDefault(); setChapterIndex(Number(dot.dataset.chapterIndex)); }
      if (event.target.closest("[data-chapter-back]")) openWorldSelector();
      if (event.target.closest("[data-chapter-play]")) playSelectedChapter();
    });
    bindDrag(q("[data-chapter-drag]", panel), moveChapter);
    return panel;
  }
  function renderChapterSelector() {
    const list = worldStages(state.selectedWorld);
    if (!list.length) return openWorldSelector();
    state.chapterIndex = Math.max(0, Math.min(list.length - 1, state.chapterIndex));
    const stage = list[state.chapterIndex];
    const index = stageIndex(stage, state.chapterIndex + 1);
    const stars = stageStars(stage);
    const unlocked = stageUnlocked(stage);
    id("chapterWorldTitleV0942").textContent = worldName(state.selectedWorld);
    q("[data-chapter-count-label]", id("chapterSelectorV0942")).textContent = copy("FEJEZET", "CHAPTER");
    id("chapterCountV0942").textContent = `${index} / ${list.length}`;
    const chapterLabel = `${copy("Fejezet", "Chapter")} ${index}`;
    id("chapterCardV0942").innerHTML = `<article class="selector-card-v0942 ${unlocked ? "" : "locked"}" style="background-image:url('${esc(chapterArt(stage))}')"><div class="selector-stars-v0942" aria-label="${stars}/3 stars">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div><div class="selector-copy-v0942"><small>${chapterLabel}</small><h3>${esc(stage.title || chapterLabel)}</h3>${unlocked ? "" : `<p>${copy("Zárolva – megtekinthető, de még nem indítható.", "Locked – viewable, but not playable yet.")}</p>`}</div></article>`;
    const balance = window.CHERRIFT_BALANCE?.worlds?.[state.selectedWorld];
    const recommendedLevel = balance ? Math.min(balance.completionLevel, balance.unlockLevel + index - 1) : Math.max(1,(state.selectedWorld - 1) * 5 + index);
    const powerRange = balance?.recommendedPower || [100,100];
    const recommendedPower = Math.round(powerRange[0] + (powerRange[1] - powerRange[0]) * ((index - 1) / Math.max(1,list.length - 1)));
    const energy = stage.training ? 0 : number(window.CHERRIFT_BALANCE?.energy?.stageCost || 5);
    const firstReward = UI.save?.firstClearClaimed?.[stage.id] ? copy("Begyűjtve", "Claimed") : rewardText(stage.firstClearReward || stage.firstClear);
    id("chapterSummaryV0942").innerHTML = `<div class="chapter-summary-title-v0942"><small>${copy("KIVÁLASZTOTT PÁLYA", "SELECTED STAGE")}</small><b>${esc(stage.name || chapterLabel)} · ${esc(stage.title || chapterLabel)}</b></div><div><small>${copy("CÉL", "OBJECTIVE")}</small><b>${number(stage.goalKills)} ${copy("ellenfél", "enemies")}</b></div><div><small>${copy("JUTALOM", "REWARD")}</small><b>${esc(rewardText(stage.repeatReward || stage.reward))}</b></div><div><small>${copy("ELSŐ JUTALOM", "FIRST REWARD")}</small><b>${esc(firstReward)}</b></div><div><small>ENERGY</small><b>⚡ ${energy}</b></div><div><small>${copy("AJÁNLOTT", "RECOMMENDED")}</small><b>Lv.${recommendedLevel} · ${recommendedPower} Power</b></div>`;
    const play = q("[data-chapter-play]", id("chapterSelectorV0942"));
    play.textContent = copy("Játék", "Play");
    play.disabled = !unlocked;
    qa("[data-chapter-back]", id("chapterSelectorV0942")).forEach(button => { if (!button.textContent.trim() || button.closest(".selector-actions-v0942")) button.textContent = button.closest(".selector-actions-v0942") ? copy("Vissza", "Back") : "←"; });
    id("chapterDotsV0942").innerHTML = list.map((item, itemIndex) => `<button type="button" class="${itemIndex === state.chapterIndex ? "active" : ""} ${stageUnlocked(item) ? "" : "locked"}" data-chapter-index="${itemIndex}" aria-label="${copy("Fejezet", "Chapter")} ${itemIndex + 1}">${itemIndex + 1}</button>`).join("");
    const previous = q('[data-chapter-step="-1"]', id("chapterSelectorV0942"));
    const next = q('[data-chapter-step="1"]', id("chapterSelectorV0942"));
    if (previous) previous.disabled = state.chapterIndex <= 0;
    if (next) next.disabled = state.chapterIndex >= list.length - 1;
    const host = id("chapterCardV0942");
    host?.classList.remove("switching");
    requestAnimationFrame(() => host?.classList.add("switching"));
  }

  function setChapterIndex(index) {
    const list = worldStages(state.selectedWorld);
    const next = Math.max(0, Math.min(list.length - 1, number(index)));
    if (next === state.chapterIndex) return;
    state.chapterIndex = next;
    renderChapterSelector();
  }
  function moveChapter(step) { setChapterIndex(state.chapterIndex + Number(step || 0)); }

  function bindDrag(element, callback) {
    if (!element || element.__dragV0942) return;
    element.__dragV0942 = true;
    let drag = null;
    let suppressClick = false;
    element.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest?.("button")) return;
      drag = { x:event.clientX, y:event.clientY, lastX:event.clientX, lastY:event.clientY, pointerId:event.pointerId, moved:false };
      state.drag = drag;
      element.setPointerCapture?.(event.pointerId);
    });
    element.addEventListener("pointermove", event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      if (Math.abs(drag.lastX - drag.x) > 7) {
        drag.moved = true;
        element.classList.add("dragging");
        event.preventDefault();
      }
    }, {passive:false});
    element.addEventListener("pointerup", event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      suppressClick = drag.moved;
      if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
      drag = null; state.drag = null;
      element.classList.remove("dragging");
      element.releasePointerCapture?.(event.pointerId);
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) callback(dx < 0 ? 1 : -1);
    });
    element.addEventListener("click", event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
    const cancel = () => { drag = null; state.drag = null; element.classList.remove("dragging"); };
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("dragstart", event => event.preventDefault());
  }

  function showOnly(panel) {
    qa("#app > section").forEach(section => {
      if (section === panel) section.classList.remove("hidden");
      else if (!["hud","stageHud"].includes(section.id)) section.classList.add("hidden");
    });
    document.body.classList.remove("is-playing", "reward-open-v083");
    closeMoreDrawer();
  }
  function openWorldSelector() {
    const panel = ensureWorldPanel();
    const selectedId = UI.save?.selectedStageId;
    const entries = worldEntries();
    const selectedStage = stages().find(stage => stage.id === selectedId);
    const selectedIndex = selectedStage
      ? entries.findIndex(entry => entry.stage?.id === selectedId || (entry.type === "world" && entry.world === stageWorld(selectedStage)))
      : -1;
    if (selectedIndex >= 0) state.worldIndex = selectedIndex;
    showOnly(panel);
    renderWorldSelector();
  }
  function openChapterSelector(world) {
    state.selectedWorld = world;
    const selectedId = UI.save?.selectedStageId;
    state.chapterIndex = Math.max(0, worldStages(world).findIndex(stage => stage.id === selectedId));
    const panel = ensureChapterPanel();
    showOnly(panel);
    renderChapterSelector();
  }
  function startSelectedWorld() {
    const entry = worldEntries()[state.worldIndex];
    if (!entry?.unlocked) return;
    if (entry.type === "training") return launchStage(entry.stage);
    openChapterSelector(entry.world);
  }
  function playSelectedChapter() {
    const stage = worldStages(state.selectedWorld)[state.chapterIndex];
    if (stage && stageUnlocked(stage)) launchStage(stage);
  }
  function launchStage(stage) {
    if (!stage) return;
    UI.save.selectedStageId = stage.id;
    saveProgress();
    // Reuse the game's native stage-loading path instead of simulating clicks on
    // whichever legacy selector happens to be visible.
    try {
      if (window.CHERRIFT_V093?.state) {
        CHERRIFT_V093.state.world = stageWorld(stage);
        CHERRIFT_V093.state.chapterId = stage.id;
        CHERRIFT_V093.renderWorldSelect?.();
      }
      if (typeof UI.game?.start === "function") return UI.game.start();
      if (typeof UI.startStage === "function") return UI.startStage(stage.id);
      if (typeof UI.playStage === "function") return UI.playStage(stage.id);
      throw new Error("No stage launch function is available.");
    } catch (error) {
      console.error("[CHERRIFT v0.9.4.2] Stage launch failed", error);
      UI.toast?.(copy("A pálya nem indítható el.", "Stage launch failed."));
    }
  }

  function installRouting() {
    if (!window.UI?.open || UI.__cherriftCarouselWorldRoute) return;
    const previousOpen = UI.open.bind(UI);
    state.originalOpen = previousOpen;
    UI.open = function openCarouselRoute(route, ...args) {
      const result = previousOpen(route, ...args);
      if (route === "worlds") openWorldSelector();
      else {
        id("worldSelectorV0942")?.classList.add("hidden");
        id("chapterSelectorV0942")?.classList.add("hidden");
      }
      return result;
    };
    UI.openWorldSelect = function openCarouselWorldSelector() {
      const result = previousOpen("worlds");
      openWorldSelector();
      return result;
    };
    UI.renderWorldPanel = function renderCarouselWorldPanel() {
      if (!id("worldSelectorV0942")?.classList.contains("hidden")) renderWorldSelector();
      if (!id("chapterSelectorV0942")?.classList.contains("hidden")) renderChapterSelector();
    };
    UI.__cherriftCarouselWorldRoute = true;
  }

  function patchVisible() {
    updateViewportMetrics();
    document.body.classList.toggle("v090-mobile", isMobile());
    document.body.classList.toggle("v090-landscape", isMobile() && innerWidth > innerHeight);
    document.body.classList.toggle("v0933-desktop", !isMobile() && matchMedia("(min-width:821px)").matches);
    patchDesktopZoom();
    patchGear();
    patchHome();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      if (event.target.closest?.(".mobile-menu-v082 button,.mobile-menu-grid-v082 button")) setTimeout(closeMoreDrawer, 0);
    }, true);
    window.addEventListener("resize", patchVisible);
    window.addEventListener("orientationchange", () => setTimeout(patchVisible, 80));
    document.addEventListener("fullscreenchange", () => setTimeout(patchVisible, 80));
    document.addEventListener("webkitfullscreenchange", () => setTimeout(patchVisible, 80));
    window.visualViewport?.addEventListener("resize", patchVisible);
    window.addEventListener("cherrift:savechange", patchVisible);
  }

  function start() {
    if (!window.UI || !window.CherriftStorage || !id("app")) return setTimeout(start, 120);
    ensureCss();
    patchDesktopZoom();
    ensureWorldPanel();
    ensureChapterPanel();
    installRouting();
    bindEvents();
    patchVisible();
    console.info(`[CHERRIFT] Bugfix ${VERSION} loaded.`);
  }

  window.CHERRIFT_WORLD_UI = Object.freeze({ version:VERSION, isMobile, patchVisible, openWorldSelector, openChapterSelector, hide:() => {
    id("worldSelectorV0942")?.classList.add("hidden");
    id("chapterSelectorV0942")?.classList.add("hidden");
  } });
  window.CHERRIFT_BUGFIX_V0942 = window.CHERRIFT_WORLD_UI;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
