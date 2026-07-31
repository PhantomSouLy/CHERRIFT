(() => {
  "use strict";
  if (window.__CHERRIFT_BUGFIX_V0942__) return;
  window.__CHERRIFT_BUGFIX_V0942__ = true;

  const VERSION = "0.9.4.4-consolidated-world-ui";
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
    navCherryIntentUntil: 0,
    worldIndex: 0,
    chapterIndex: 0,
    selectedWorld: 1,
    drag: null
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
      #gear .gear-stage-rune-v0560,#gear [class*="pedestal"],#gear [class*="stage-base"],#gear [class*="ground-shadow"],#gear .gear-stage-v0560::after,#gear .gear-stage-v0560::before{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;background:none!important;box-shadow:none!important}
      #gear #gearCherryCanvasV0560,#gear #gearCherryStableV060{position:absolute!important;left:50%!important;right:auto!important;top:50%!important;transform:translate(-50%,-46%)!important;margin:0!important;z-index:4!important}
      #gear .gear-equipment-tools-v0942{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;margin-left:auto!important;justify-self:end!important}
      #gear .gear-equipment-tools-v0942 button{margin:0!important;min-width:92px!important}

      /* Shared mobile World / Chapter carousel. */
      .selector-v0942{overflow:hidden!important;height:100dvh!important;min-height:100dvh!important;color:#fff}
      .selector-shell-v0942{width:min(760px,100%);height:100%;margin:auto;display:flex;flex-direction:column;padding:106px 12px calc(82px + env(safe-area-inset-bottom));overflow:hidden}
      .selector-head-v0942{flex:0 0 auto;display:flex;align-items:center;gap:13px;margin-bottom:7px}.selector-head-v0942 h2{margin:0;font:700 clamp(35px,10vw,53px)/1 Georgia,serif}.selector-back-v0942{width:58px;height:58px;border:1px solid #ffffff26;border-radius:19px;color:#fff;background:#ffffff08;font-size:25px}
      .selector-carousel-v0942{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:7px;touch-action:pan-y}
      .selector-arrow-v0942{height:66px;border:1px solid #ffffff22;border-radius:17px;color:#fff;background:#ffffff08;font-size:40px}.selector-arrow-v0942:disabled{opacity:.25}
      .selector-card-v0942{position:relative;height:100%;min-height:0;overflow:hidden;border:1px solid #ffffff28;border-radius:28px;background:#16091d center/cover no-repeat;box-shadow:0 18px 60px #0008;isolation:isolate}
      .selector-card-v0942::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#06030b19 10%,#09040d16 40%,#08030dde 100%)}
      .selector-card-v0942.locked{filter:grayscale(.75) brightness(.55)}
      .selector-stars-v0942{position:absolute;left:50%;top:16px;translate:-50% 0;display:flex;align-items:center;justify-content:center;gap:3px;padding:7px 13px;border-radius:999px;background:#08040dbd;color:#ffd467;font:900 clamp(20px,6vw,31px)/1 Georgia,serif;white-space:nowrap;text-shadow:0 0 15px #ffc44a88}
      .selector-copy-v0942{position:absolute;left:20px;right:20px;bottom:20px}.selector-copy-v0942 small{display:block;color:#ff93c6;font-size:11px;font-weight:1000;letter-spacing:2px;text-transform:uppercase}.selector-copy-v0942 h3{margin:5px 0 0;font:700 clamp(42px,11vw,62px)/.95 Georgia,serif}.selector-copy-v0942 p{margin:9px 0 0;color:#ead6e1;font-weight:800}.selector-dummy-v0942{display:inline-flex;margin-top:10px;padding:7px 11px;border:1px solid #ffffff24;border-radius:12px;background:#09040db5;font-weight:900}
      .selector-rewards-v0942{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.selector-rewards-v0942 span{min-width:0;padding:8px;border-radius:12px;background:#08040dbd;text-align:center}.selector-rewards-v0942 small{color:#dda9c3;font-size:8px;letter-spacing:.8px}.selector-rewards-v0942 b{display:block;margin-top:3px;font-size:12px}
      .selector-dots-v0942{flex:0 0 auto;display:flex;justify-content:center;gap:8px;padding:7px}.selector-dots-v0942 i{width:9px;height:9px;border-radius:50%;background:#ffffff2d}.selector-dots-v0942 i.active{width:24px;border-radius:99px;background:#ec4f9b}
      .selector-actions-v0942{flex:0 0 auto;display:grid;gap:9px}.selector-actions-v0942.two{grid-template-columns:1fr 1.35fr}.selector-actions-v0942 button{min-height:58px;border:1px solid #ffffff2b;border-radius:17px;color:#fff;background:#ffffff09;font-size:20px;font-weight:1000}.selector-actions-v0942 button.primary{background:linear-gradient(115deg,#dc3281,#ed72ac)}.selector-actions-v0942 button:disabled{opacity:.38;filter:grayscale(1)}

      @media(max-width:820px){
        /* Bottom navigation: Cherry really opens Cherry Selector. */
        .mobile-nav-v090 .cherry-nav-v0942 span img{width:30px!important;height:30px!important;border-radius:8px!important;object-fit:cover!important}.mobile-nav-v090 .cherry-nav-v0942 b{font-size:8px!important}

        /* Main menu layout. */
        #menu .mobile-floating-actions-v051.left{position:absolute!important;left:10px!important;top:410px!important;z-index:9!important;display:grid!important;align-content:start!important;gap:7px!important;margin:0!important}
        #menu .mobile-floating-actions-v051.left [data-bf-removed="true"],#menu .mobile-floating-actions-v051.left .removed-v0942{display:none!important}
        #menu .mobile-floating-actions-v051.right{position:absolute!important;right:10px!important;top:205px!important;z-index:10!important;display:grid!important;align-content:start!important;gap:7px!important;margin:0!important;padding:0!important}
        #menu .mobile-character-stage-v051{margin-top:76px!important}
        #menu .mobile-character-display-v051{margin-top:0!important}
        #menu .mobile-character-display-v051 .mobile-chapter-stars-v0932{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:-58px!important;translate:-50% 0!important;width:max-content!important;margin:0!important;z-index:12!important}
        #menu .mobile-character-display-v051 .mobile-chapter-stars-v0932 span{font-size:34px!important}
        #menu .mobile-stage-copy-v051{display:none!important}
        #menu .mobile-stage-panel-v051{margin-top:68px!important}

        /* More drawer must never remain over the selected page. */
        .mobile-menu-v082.force-closed-v0942{display:none!important;pointer-events:none!important;visibility:hidden!important}

        /* Equipment toolbar. */
        #gear .gear-equipment-tools-v0942{position:absolute!important;right:14px!important;top:12px!important;z-index:7!important}
      }

      @media(orientation:landscape) and (max-height:600px) and (pointer:coarse){
        html,body,#app{width:100%;height:100dvh;min-height:100dvh;overscroll-behavior:none}body{overflow:hidden!important}
        body.v090-mobile #globalRailV060{display:none!important}
        body.v090-mobile #globalMobileNavV052.mobile-nav-v090{position:fixed!important;left:max(6px,env(safe-area-inset-left))!important;right:auto!important;top:50%!important;bottom:auto!important;width:68px!important;z-index:20000!important;display:grid!important;grid-template-columns:1fr!important;gap:3px!important;padding:5px!important;transform:translateY(-50%)!important}
        body.v090-mobile .mobile-nav-v090>button{min-height:48px!important}
        body.v090-mobile .mobile-menu-v082{inset:7px 7px 7px 82px!important;max-height:none!important}
        body.v090-mobile:not(.is-playing):not(.is-loading-stage) #app>.panel:not(.hidden),body.v090-mobile:not(.is-playing):not(.is-loading-stage) .v082-custom-panel:not(.hidden){position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;padding:45px 8px 8px 82px!important;overflow:auto!important}
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
    qa('.gear-stage-rune-v0560,[class*="pedestal"],[class*="stage-base"],[class*="ground-shadow"]', gear).forEach(element => element.remove());
    const cherry = id("gearCherryStableV060") || id("gearCherryCanvasV0560");
    if (cherry) {
      cherry.style.left = "50%";
      cherry.style.right = "auto";
      cherry.style.top = "50%";
      cherry.style.transform = "translate(-50%,-46%)";
    }
    const power = qa("button", gear).find(button => /^power(?:\s|$)/i.test(button.textContent.trim()));
    const select = qa("button", gear).find(button => /^select$/i.test(button.textContent.trim()));
    if (power && select) {
      let host = power.parentElement;
      if (host !== select.parentElement) {
        host = document.createElement("div");
        power.parentElement?.insertBefore(host, power);
        host.append(power, select);
      }
      host.classList.add("gear-equipment-tools-v0942");
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

  function patchMobileNav() {
    if (!isMobile()) return;
    const nav = q(".mobile-nav-v090");
    if (!nav) return;
    const buttons = qa(":scope > button", nav);
    const button = buttons.find(item => item.classList.contains("cherry-nav-bf") || item.classList.contains("cherry-nav-v0942")) || buttons[0];
    if (!button) return;
    button.classList.add("cherry-nav-v0942");
    button.classList.remove("home");
    button.dataset.v082Route = "skins";
    button.dataset.open = "skins";
    const skin = selectedSkin();
    const image = skin.icon || skin.splash || "";
    button.innerHTML = `<span>${image ? `<img src="${esc(image)}" alt="">` : "🐰"}</span><b>Cherry</b>`;
  }

  function normalizeLabel(button) { return button.textContent.replace(/\s+/g, " ").trim().toLowerCase(); }
  function patchHome() {
    const menu = id("menu");
    if (!isMobile() || !menu || menu.classList.contains("hidden")) return;
    qa("button", menu).forEach(button => {
      if (button.closest(".mobile-nav-v090")) return;
      const label = normalizeLabel(button);
      if (["chest", "gear", "cherry"].includes(label) || /^chest\b/.test(label) || /^gear\b/.test(label) || /^cherry\b/.test(label)) {
        button.classList.add("removed-v0942");
        button.remove();
      }
    });
    const display = q(".mobile-character-display-v051", menu);
    const stars = q(".mobile-chapter-stars-v0932", menu);
    if (display && stars && stars.parentElement !== display) display.appendChild(stars);
    const right = q(".mobile-floating-actions-v051.right", menu);
    if (right) {
      const order = ["daily", "weekly", "login"];
      qa("button", right).forEach(button => {
        const label = normalizeLabel(button);
        const index = order.findIndex(item => label.includes(item));
        if (index >= 0) button.style.order = String(index);
      });
    }
    patchMobileNav();
  }

  function stages() {
    return window.CHERRIFT_V040?.stages || window.CHERRIFT_DATA?.stages || [];
  }
  function stageWorld(stage) { return number(stage?.world) || number(String(stage?.id || "").match(/world[_-]?(\d+)/i)?.[1]) || 1; }
  function stageIndex(stage, fallback = 1) { return number(stage?.index || stage?.stage || String(stage?.id || "").match(/(?:_|-)(\d+)$/)?.[1]) || fallback; }
  function stageStars(stage) { return Math.min(3, number(UI.save?.stageStars?.[stage.id] || UI.save?.stageStats?.[stage.id]?.stars)); }
  function stageCleared(stage) { return !!(UI.save?.clearedStages?.[stage.id] || UI.save?.stageStats?.[stage.id]?.clears); }
  function stageUnlocked(stage) {
    return stage?.training === true || /train|test/i.test(String(stage?.id || "")) || UI.save?.unlockedStages?.includes(stage.id) || stageCleared(stage) || stageIndex(stage) === 1;
  }
  function trainingStage() { return stages().find(stage => stage.training === true || /train|test/i.test(`${stage.id || ""} ${stage.name || ""}`)); }
  function worldStages(world) { return stages().filter(stage => stageWorld(stage) === Number(world) && stage !== trainingStage()).sort((a,b) => stageIndex(a)-stageIndex(b)); }
  function worldCount() {
    const fromStages = Math.max(1, ...stages().map(stageWorld));
    // Only worlds with real, installed stages belong in the test selector.
    // The legacy UI advertised seven preview worlds, producing empty cards.
    return Math.min(4, fromStages);
  }
  function worldUnlocked(world) {
    if (world === 1 || isTestBuild()) return true;
    const previous = worldStages(world - 1);
    return previous.length > 0 && previous.every(stageCleared);
  }
  function worldArt(world) {
    if (world === 1) return "assets/map/world1/world1_splashart_1.png";
    if (world === 2) return "assets/map/world2/world2_splashart_1.png";
    if (world === 3) return "assets/map/world3/world3_splashart_1.png";
    if (world === 4) return "assets/map/world4/world4_splashart_1.png";
    return "assets/map/world1/world1_splashart_1.png";
  }
  function chapterArt(stage) {
    const world = stageWorld(stage);
    const index = stageIndex(stage);
    if (world === 1) {
      const artIndex = index <= 2 ? 1 : index <= 4 ? 2 : 3;
      return `assets/map/world1/world1_splashart_${artIndex}.png`;
    }
    if (world === 4) {
      // Chapter 5's final artwork has not been delivered yet. Chapter art 2 is an
      // intentional, documented placeholder and can be replaced in one place.
      const artIndex = index <= 2 ? 1 : 2;
      return stage.splash || stage.splashArt || stage.art || stage.image || `assets/map/world4/world4_splashart_${artIndex}.png`;
    }
    const artIndex = index <= 2 ? 1 : index <= 4 ? 2 : 3;
    return stage.splash || stage.splashArt || stage.art || stage.image || `assets/map/world${world}/world${world}_splashart_${artIndex}.png`;
  }
  function rewardText(reward) {
    if (!reward || typeof reward !== "object") return "—";
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} Coin`);
    if (reward.keys) parts.push(`${reward.keys} ${copy("láda", "Chest")}`);
    if (reward.chests?.common) parts.push(`${reward.chests.common} ${copy("Common láda", "Common Chest")}`);
    if (reward.gems) parts.push(`${reward.gems} Gem`);
    return parts.join(" · ") || "—";
  }

  function ensureWorldPanel() {
    let panel = id("worldSelectorV0942");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "worldSelectorV0942";
    panel.className = "panel selector-v0942 hidden";
    panel.innerHTML = `<div class="selector-shell-v0942"><header class="selector-head-v0942"><h2 data-world-title></h2></header><div class="selector-carousel-v0942" data-selector-drag><button class="selector-arrow-v0942" data-world-step="-1" aria-label="Previous world">‹</button><div id="worldCardV0942"></div><button class="selector-arrow-v0942" data-world-step="1" aria-label="Next world">›</button></div><div id="worldDotsV0942" class="selector-dots-v0942"></div><div class="selector-actions-v0942"><button class="primary" data-world-start></button></div></div>`;
    id("app")?.appendChild(panel);
    panel.addEventListener("click", event => {
      const step = event.target.closest("[data-world-step]");
      if (step) { state.worldIndex += Number(step.dataset.worldStep); renderWorldSelector(); }
      if (event.target.closest("[data-world-start]")) startSelectedWorld();
    });
    bindDrag(q("[data-selector-drag]", panel), delta => { state.worldIndex += delta; renderWorldSelector(); });
    return panel;
  }

  function worldEntries() {
    const entries = [];
    const training = trainingStage();
    if (training) entries.push({ type:"training", world:0, stage:training, name:"Test Training", art:training.splash || training.art || "assets/map/world3/world3_ground_1.png", unlocked:true });
    for (let world = 1; world <= worldCount(); world += 1) entries.push({ type:"world", world, name:`World ${world}`, art:worldArt(world), unlocked:worldUnlocked(world) });
    return entries;
  }
  function renderWorldSelector() {
    const entries = worldEntries();
    if (!entries.length) return;
    state.worldIndex = (state.worldIndex % entries.length + entries.length) % entries.length;
    const entry = entries[state.worldIndex];
    state.selectedWorld = entry.world;
    const card = id("worldCardV0942");
    const start = q("[data-world-start]", id("worldSelectorV0942"));
    q("[data-world-title]", id("worldSelectorV0942")).textContent = copy("Világválasztás", "World Selection");
    start.textContent = copy("Kiválasztás", "Select");
    if (entry.type === "training") {
      card.innerHTML = `<article class="selector-card-v0942" style="background-image:url('${esc(entry.art)}')"><div class="selector-stars-v0942">${copy("TESZT", "TEST")}</div><div class="selector-copy-v0942"><small>${copy("Gyakorlópálya", "Training Ground")}</small><h3>${copy("Teszt Training", "Test Training")}</h3><span class="selector-dummy-v0942">∞ HP Dummy</span></div></article>`;
    } else {
      const list = worldStages(entry.world);
      const earned = list.reduce((sum, stage) => sum + stageStars(stage), 0);
      const max = list.length * 3;
      card.innerHTML = `<article class="selector-card-v0942 ${entry.unlocked ? "" : "locked"}" style="background-image:url('${esc(entry.art)}')"><div class="selector-stars-v0942">★ ${earned} / ${max || 15}</div><div class="selector-copy-v0942"><small>World ${entry.world}</small><h3>World ${entry.world}</h3>${entry.unlocked ? "" : `<p>${copy("Zárolva", "Locked")}</p>`}</div></article>`;
    }
    start.disabled = !entry.unlocked;
    id("worldDotsV0942").innerHTML = entries.map((_, index) => `<i class="${index === state.worldIndex ? "active" : ""}"></i>`).join("");
  }

  function ensureChapterPanel() {
    let panel = id("chapterSelectorV0942");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "chapterSelectorV0942";
    panel.className = "panel selector-v0942 hidden";
    panel.innerHTML = `<div class="selector-shell-v0942"><header class="selector-head-v0942"><h2 id="chapterWorldTitleV0942">World</h2></header><div class="selector-carousel-v0942" data-chapter-drag><button class="selector-arrow-v0942" data-chapter-step="-1" aria-label="Previous chapter">‹</button><div id="chapterCardV0942"></div><button class="selector-arrow-v0942" data-chapter-step="1" aria-label="Next chapter">›</button></div><div id="chapterDotsV0942" class="selector-dots-v0942"></div><div class="selector-actions-v0942 two"><button data-chapter-back></button><button class="primary" data-chapter-play></button></div></div>`;
    id("app")?.appendChild(panel);
    panel.addEventListener("click", event => {
      const step = event.target.closest("[data-chapter-step]");
      if (step) { state.chapterIndex += Number(step.dataset.chapterStep); renderChapterSelector(); }
      if (event.target.closest("[data-chapter-back]")) openWorldSelector();
      if (event.target.closest("[data-chapter-play]")) playSelectedChapter();
    });
    bindDrag(q("[data-chapter-drag]", panel), delta => { state.chapterIndex += delta; renderChapterSelector(); });
    return panel;
  }
  function renderChapterSelector() {
    const list = worldStages(state.selectedWorld);
    if (!list.length) return openWorldSelector();
    state.chapterIndex = (state.chapterIndex % list.length + list.length) % list.length;
    const stage = list[state.chapterIndex];
    const index = stageIndex(stage, state.chapterIndex + 1);
    const stars = stageStars(stage);
    const unlocked = stageUnlocked(stage);
    id("chapterWorldTitleV0942").textContent = `World ${state.selectedWorld}`;
    const chapterLabel = `${copy("Fejezet", "Chapter")} ${index}`;
    id("chapterCardV0942").innerHTML = `<article class="selector-card-v0942 ${unlocked ? "" : "locked"}" style="background-image:url('${esc(chapterArt(stage))}')"><div class="selector-stars-v0942">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div><div class="selector-copy-v0942"><small>${chapterLabel}</small><h3>${chapterLabel}</h3><div class="selector-rewards-v0942"><span><small>${copy("JUTALOM", "REWARD")}</small><b>${esc(rewardText(stage.reward || stage.repeatReward))}</b></span><span><small>${copy("ELSŐ TELJESÍTÉS", "FIRST CLEAR")}</small><b>${esc(rewardText(stage.firstClearReward || stage.firstClear))}</b></span></div></div></article>`;
    const play = q("[data-chapter-play]", id("chapterSelectorV0942"));
    const back = q("[data-chapter-back]", id("chapterSelectorV0942"));
    play.textContent = copy("Játék", "Play");
    back.textContent = copy("Vissza", "Back");
    play.disabled = !unlocked;
    id("chapterDotsV0942").innerHTML = list.map((_, itemIndex) => `<i class="${itemIndex === state.chapterIndex ? "active" : ""}"></i>`).join("");
  }

  function bindDrag(element, callback) {
    if (!element || element.__dragV0942) return;
    element.__dragV0942 = true;
    element.addEventListener("pointerdown", event => {
      state.drag = { x:event.clientX, y:event.clientY, pointerId:event.pointerId };
      element.setPointerCapture?.(event.pointerId);
    });
    element.addEventListener("pointerup", event => {
      if (!state.drag) return;
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      state.drag = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) callback(dx < 0 ? 1 : -1);
    });
    const cancel = () => { state.drag = null; };
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("lostpointercapture", cancel);
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

  function patchVisible() {
    document.body.classList.toggle("v090-mobile", isMobile());
    document.body.classList.toggle("v090-landscape", isMobile() && innerWidth > innerHeight);
    document.body.classList.toggle("v0933-desktop", !isMobile() && matchMedia("(min-width:821px)").matches);
    patchDesktopZoom();
    patchGear();
    patchHome();
    patchMobileNav();
  }

  function bindEvents() {
    document.addEventListener("pointerdown", event => {
      const button = event.target.closest?.(".mobile-nav-v090 > button");
      if (!button) return;
      if (button.classList.contains("cherry-nav-v0942") || button.classList.contains("cherry-nav-bf") || button === q(".mobile-nav-v090 > button")) {
        state.navCherryIntentUntil = Date.now() + 800;
      }
    }, true);
    document.addEventListener("click", event => {
      const navButton = event.target.closest?.(".mobile-nav-v090 .cherry-nav-v0942,.mobile-nav-v090 .cherry-nav-bf");
      if (navButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.navCherryIntentUntil = Date.now() + 800;
        state.originalOpen?.("skins");
        closeMoreDrawer();
        return;
      }
      if (event.target.closest?.(".mobile-menu-v082 button,.mobile-menu-grid-v082 button")) setTimeout(closeMoreDrawer, 0);
    }, true);
    window.addEventListener("resize", patchVisible);
    window.addEventListener("cherrift:savechange", patchVisible);
  }

  function start() {
    if (!window.UI || !window.CherriftStorage || !id("app")) return setTimeout(start, 120);
    ensureCss();
    patchDesktopZoom();
    state.originalOpen = UI.open?.bind(UI);
    ensureWorldPanel();
    ensureChapterPanel();
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
