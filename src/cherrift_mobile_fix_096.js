(() => {
  "use strict";
  if (window.__CHERRIFT_MOBILE_FIX_096__) return;
  window.__CHERRIFT_MOBILE_FIX_096__ = true;

  const VERSION = "0.9.6-mobile-fix-1";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const state = { queued:false, observer:null, shopDrag:null, orientationTried:false };

  function isPhone() {
    const touch = Number(navigator.maxTouchPoints) > 0 || matchMedia("(pointer:coarse)").matches;
    const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight, innerWidth, innerHeight);
    return touch && shortSide <= 820;
  }

  function ensurePortraitGuard() {
    let guard = id("portraitOnlyV096");
    if (!guard) {
      guard = document.createElement("section");
      guard.id = "portraitOnlyV096";
      guard.setAttribute("role", "alert");
      guard.setAttribute("aria-live", "assertive");
      guard.innerHTML = '<article><i aria-hidden="true">▯</i><h2>Fordítsd álló helyzetbe</h2><p>A CHERRIFT telefonon álló nézetre készült. A játék folytatásához fordítsd vissza a készüléket.</p></article>';
      document.body.appendChild(guard);
    }
    const blocked = isPhone() && innerWidth > innerHeight;
    document.body.classList.toggle("v096-phone-landscape", blocked);
    guard.setAttribute("aria-hidden", blocked ? "false" : "true");
  }

  function tryPortraitLock() {
    if (state.orientationTried || !isPhone()) return;
    state.orientationTried = true;
    try {
      const result = screen.orientation?.lock?.("portrait-primary");
      result?.catch?.(() => {});
    } catch (_) {}
  }

  function closeDrawer() {
    const drawer = id("mobileMenuV082");
    drawer?.classList.add("hidden");
    drawer?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-menu-open-v082", "more-open", "drawer-open");
  }

  function bindEnergyTap(event) {
    const pill = event.target?.closest?.(".mobile-energy-v0932,.prebeta-energy-pill,[data-v096-energy]");
    if (!pill || !isPhone()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeDrawer();
    window.CHERRIFT_PREBETA?.showEnergyModal?.();
  }

  function normalizeWalletIcons() {
    const assets = {
      "Coin":"assets/items/coin.png",
      "Bloom Gem":"assets/items/blossom_gem.png",
      "Blossom Gem":"assets/items/blossom_gem.png",
      "Sakura Essence":"assets/items/sakura_potion.png",
      "Gear Scrap":"assets/items/scraps.png",
      "Scrap":"assets/items/scraps.png"
    };
    const pills = qa("#resourceBarV082>span,.economy-wallet-v080>span,#desktopCurrencyV0943>span,.mobile-currencies-v0932>span");
    for (const pill of pills) {
      const counter = q(":scope>b", pill);
      if (!counter) continue;
      const knownLabel = pill.getAttribute("title") || ({v080Coins:"Coin",v080Gems:"Bloom Gem",v080Essence:"Sakura Essence"})[counter.id] || "";
      const source = assets[knownLabel];
      const images = qa(":scope>img", pill);
      let keep = images.shift();
      for (const duplicate of images) duplicate.remove();
      if (!keep && source) {
        keep = document.createElement("img");
        pill.insertBefore(keep, pill.firstChild);
      }
      if (keep && source) {
        if (keep.getAttribute("src") !== source) keep.src = source;
        keep.alt = knownLabel;
        keep.draggable = false;
      }
    }
  }

  function enhanceSkinSelector() {
    const art = q("#skins .skin-art-v093");
    if (!art) return;
    q(".v096-art-card-ui", art)?.remove();
    art.removeAttribute("data-v096-card");
  }

  function normalizeDrawer() {
    const drawer = id("mobileMenuV082");
    if (!drawer) return;
    const open = !drawer.classList.contains("hidden");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function patchAll() {
    state.queued = false;
    ensurePortraitGuard();
    normalizeWalletIcons();
    enhanceSkinSelector();
    normalizeDrawer();
  }

  function queuePatch() {
    if (state.queued) return;
    state.queued = true;
    requestAnimationFrame(patchAll);
  }

  function bindShopCategoryPan() {
    document.addEventListener("wheel", event => {
      const nav = event.target?.closest?.(".shop-categories-v096");
      if (!nav || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      nav.scrollLeft += event.deltaY;
    }, {passive:false});
    document.addEventListener("pointerdown", event => {
      const nav = event.target?.closest?.(".shop-categories-v096");
      if (!nav || event.target.closest("button") || event.pointerType === "touch") return;
      state.shopDrag = {nav,x:event.clientX,left:nav.scrollLeft,id:event.pointerId};
      nav.setPointerCapture?.(event.pointerId);
    });
    document.addEventListener("pointermove", event => {
      const drag = state.shopDrag;
      if (!drag || drag.id !== event.pointerId) return;
      drag.nav.scrollLeft = drag.left - (event.clientX - drag.x);
    });
    const end = event => { if (state.shopDrag?.id === event.pointerId) state.shopDrag = null; };
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  }

  function start() {
    const css = id("cherriftMobileFix096Css");
    if (css && css.parentElement === document.head) document.head.appendChild(css);
    const gameUiCss = id("cherriftGameUi097Css");
    if (gameUiCss && gameUiCss.parentElement === document.head) document.head.appendChild(gameUiCss);
    ensurePortraitGuard();
    document.addEventListener("click", bindEnergyTap, true);
    document.addEventListener("pointerup", tryPortraitLock, {once:true,passive:true});
    addEventListener("resize", queuePatch, {passive:true});
    addEventListener("orientationchange", queuePatch, {passive:true});
    addEventListener("cherrift:savechange", queuePatch);
    addEventListener("cherrift:themechange", queuePatch);
    bindShopCategoryPan();
    state.observer = new MutationObserver(queuePatch);
    state.observer.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:["class","src","data-cherrift-theme"]});
    patchAll();
    window.CHERRIFT_MOBILE_FIX_096 = Object.freeze({version:VERSION,refresh:queuePatch,isPhone});
    console.info(`[CHERRIFT] ${VERSION} loaded.`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();

/* CHERRIFT v0.9.7 mobile polish patch.
   Intentionally appended to the existing mobile-fix runtime so desktop stays untouched. */
(() => {
  "use strict";
  if (window.__CHERRIFT_MOBILE_POLISH_097__) return;
  window.__CHERRIFT_MOBILE_POLISH_097__ = true;

  const VERSION = "0.9.7-mobile-polish-1";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const lower = value => clean(value).toLocaleLowerCase("hu");
  const state = { queued:false, observer:null, info:null, pinches:new WeakMap(), tiltBound:false, clickBound:false };

  function isPhone() {
    const touch = Number(navigator.maxTouchPoints) > 0 || matchMedia("(pointer:coarse)").matches;
    return touch && Math.min(innerWidth || 9999, innerHeight || 9999, screen.width || 9999, screen.height || 9999) <= 820;
  }

  function leafNodes(root = document) {
    return qa("h1,h2,h3,h4,h5,p,small,span,b,strong,em,div,button", root).filter(node => !node.children.length);
  }

  function leaves(text, root = document) {
    const wanted = lower(text);
    return leafNodes(root).filter(node => lower(node.textContent) === wanted);
  }

  function hideExact(text, root = document) {
    leaves(text, root).forEach(node => node.classList.add("m097-hide"));
  }

  function replaceExact(from, to, root = document) {
    leaves(from, root).forEach(node => { if (clean(node.textContent) !== to) node.textContent = to; });
  }

  function sectionForHeading(text) {
    const heading = qa("h1,h2,h3", document).find(node => lower(node.textContent) === lower(text));
    if (!heading) return null;
    return heading.closest("section[id],.panel[id],.screen[id],section,.panel,.screen") || heading.parentElement;
  }

  function ensureCss() {
    if (id("cherriftMobilePolish097Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftMobilePolish097Css";
    style.textContent = `
      .m097-hide{display:none!important}
      .m097-info-bubble{position:fixed;z-index:2147483646;max-width:min(310px,calc(100vw - 28px));padding:10px 12px;border:1px solid rgba(255,151,204,.5);border-radius:12px;color:var(--theme-text,#fff);background:rgba(35,17,31,.98);box-shadow:0 14px 36px rgba(0,0,0,.45);font:700 12px/1.4 system-ui,sans-serif;pointer-events:none}
      .m097-info-button,.m097-element-button{display:inline-grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;border:1px solid color-mix(in srgb,var(--theme-primary,#e45b9b) 65%,#fff 10%)!important;border-radius:13px!important;color:var(--theme-text,#fff)!important;background:var(--theme-surface-2,#321c2e)!important;font:900 17px/1 system-ui!important}
      .m097-element-button{font-size:20px!important}
      .m097-skin-tools{display:flex!important;gap:8px!important;align-items:center!important;justify-content:flex-end!important;margin-top:8px!important}
      .m097-passive{margin:10px 0 14px;padding:11px 12px;border:1px solid rgba(231,117,173,.24);border-radius:12px;background:rgba(255,255,255,.035)}
      .m097-passive small{display:block;margin-bottom:4px;color:var(--theme-primary,#e45b9b);font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .m097-passive p{margin:0!important}
      .m097-stat-list{display:grid;gap:14px;padding:16px;border:1px solid var(--theme-outline-soft,rgba(255,180,219,.24));border-radius:18px;background:var(--theme-surface-glass,rgba(34,17,31,.88))}
      .m097-stat-group{display:grid;gap:4px}.m097-stat-group h3{margin:0 0 5px!important;color:var(--theme-primary,#e45b9b)!important;font:900 13px/1.2 system-ui!important;letter-spacing:.08em;text-transform:uppercase}
      .m097-stat-row{display:grid;grid-template-columns:max-content 1fr max-content;align-items:center;gap:8px;min-height:28px;color:var(--theme-text,#fff);font:700 13px/1.2 system-ui}
      .m097-stat-row i{height:1px;border-top:1px dashed rgba(255,190,222,.22)}.m097-stat-row b{font-size:14px}
      .m097-rarity-common{--m097-rarity:#f4e8ef}.m097-rarity-uncommon{--m097-rarity:#83e39b}.m097-rarity-rare{--m097-rarity:#69c9ff}.m097-rarity-epic{--m097-rarity:#c276ff}.m097-rarity-legendary{--m097-rarity:#f2c454}.m097-rarity-mythical{--m097-rarity:#ff5f9e}
      @media(max-width:820px){
        /* First-paint boot alignment + simplified login. */
        #bootV060 .boot-stage-v096{left:50%!important;right:auto!important;width:min(430px,84vw)!important;max-width:84vw!important;margin:0!important;box-sizing:border-box!important;transform:translate3d(-50%,0,0)!important}
        #bootV060 .boot-panel-v096,#bootV060 .boot-track-v060,#bootV060 .boot-status-v060{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}
        #bootAuthV096>p{display:none!important}#bootAuthStatusV096{white-space:normal!important;line-height:1.45!important}

        /* Shared compact page treatment. */
        .m097-simple-header{background:transparent!important;box-shadow:none!important;border:0!important;padding-top:0!important;padding-bottom:8px!important}
        .m097-simple-header .economy-wallet-v080,.m097-simple-header .mobile-currencies-v0932,.m097-simple-header [class*=currency]{display:none!important}
        .m097-dup-wallet{display:none!important}

        /* Cherry selector: real card feel, rarity border and less clutter. */
        #skins .skin-art-v093{position:relative!important;overflow:hidden!important;border:3px solid var(--m097-rarity,var(--theme-primary,#e45b9b))!important;border-radius:28px!important;box-shadow:0 14px 0 color-mix(in srgb,var(--m097-rarity,var(--theme-primary,#e45b9b)) 55%,#521c3a),0 18px 42px rgba(0,0,0,.38)!important;transform-style:preserve-3d;will-change:transform;transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s!important;touch-action:pan-y}
        #skins .skin-art-v093::before,#skins .skin-art-v093::after{display:none!important;content:none!important}
        #skins .skin-title-v093 .rarity-pill{color:var(--m097-rarity,var(--theme-primary,#e45b9b))!important;border-color:color-mix(in srgb,var(--m097-rarity,var(--theme-primary,#e45b9b)) 55%,transparent)!important}
        #skins .m097-skin-tools{align-self:flex-end}

        /* Equipment. */
        .m097-power-value{font-size:clamp(31px,9vw,46px)!important;line-height:1!important;font-family:Georgia,"Times New Roman",serif!important}
        .m097-sort-button{color:var(--theme-text,#fff)!important;border-color:var(--theme-outline-soft,rgba(255,180,219,.25))!important;background:var(--theme-surface-2,#321c2e)!important;opacity:1!important;filter:none!important}

        /* Gacha: centered title, no stray cap/pill, More always wins the layer stack. */
        #gachaChestOnlyV12 .gco-head{position:relative!important;display:grid!important;grid-template-columns:52px 1fr 52px!important;align-items:center!important}
        #gachaChestOnlyV12 .gco-head h2{grid-column:2!important;justify-self:center!important;text-align:center!important;margin-inline:auto!important}
        #gachaChestOnlyV12 .gco-shell::before,#gachaChestOnlyV12 .gco-shell::after{display:none!important;content:none!important}
        #mobileMenuV082:not(.hidden){z-index:2147483000!important;pointer-events:auto!important;isolation:isolate!important}
        body.mobile-menu-open-v082 #gachaChestOnlyV12,body.more-open #gachaChestOnlyV12{pointer-events:none!important}
        body.mobile-menu-open-v082 #mobileMenuV082,body.more-open #mobileMenuV082{pointer-events:auto!important}
        #gachaChestOnlyV12 .m097-rarity-label{color:var(--m097-rarity,#f4e8ef)!important}

        /* Pinch zoom containers. */
        .m097-pinch-host{overflow:hidden!important;touch-action:none!important}.m097-pinch-target{transform-origin:50% 65%;will-change:transform}
        #playerUpgrade .skill-tree-track-v082{padding-bottom:72px!important}
        #playerUpgrade .skill-tier-v082{min-height:158px!important;padding-block:10px 14px!important}
        #playerUpgrade .skill-tier-v082>header{margin-bottom:10px!important}.m097-tree-arrow{display:none!important}

        /* Bag / Shop / Buff duplicate box headers. */
        .m097-top-box-remove{display:none!important}.m097-bag-kicker{display:none!important}

        /* Collection / Achievements headers. */
        .m097-collection-tabs{display:flex!important;gap:8px!important;overflow-x:auto!important;scrollbar-width:none!important}.m097-collection-tabs::-webkit-scrollbar{display:none}
        .m097-collection-tabs>button{flex:0 0 auto!important}.m097-all-tab{order:-1!important}

        /* Stats: one compact list instead of a grid of giant cards. */
        #statSummaryV082 .stat-final-grid-v082{display:none!important}#statSummaryV082 .m097-stat-list{margin:8px 14px 14px!important}
        #statSummaryV082 [class*=skill]{margin-top:8px!important}.m097-stat-compact{padding-block:8px!important;margin-block:6px!important}

        /* More: remove redundant shortcuts, lock Discord-only guest actions. */
        #mobileMenuV082 .m097-more-remove{display:none!important}.m097-guest-locked{opacity:.5!important;filter:saturate(.45)!important}
        #mobileMenuV082 .m097-guest-locked::after{content:"🔒";margin-left:auto;font-size:12px}

        /* Lobby profile frame, play CTA and icon-only main bottom nav. */
        .mobile-profile-v0932 .prebeta-avatar,.mobile-profile-v0932.m097-avatar-host{position:relative!important;overflow:visible!important}
        .mobile-profile-v0932 .prebeta-avatar-frame,.mobile-profile-v0932.m097-avatar-host>.prebeta-avatar-frame{position:absolute!important;inset:-4px!important;width:calc(100% + 8px)!important;height:calc(100% + 8px)!important;object-fit:contain!important;pointer-events:none!important;z-index:3!important}
        .m097-nav-label{display:none!important}.m097-icon-nav button{min-width:0!important}.m097-icon-nav button>span,.m097-icon-nav button>i,.m097-icon-nav button>svg{font-size:24px!important}
        .m097-play-only small,.m097-play-only em,.m097-play-only .sub,.m097-play-only [class*=sub]{display:none!important}.m097-play-only{font-size:0!important}.m097-play-only::after{content:"PLAY";font:900 clamp(22px,6vw,31px)/1 system-ui;color:inherit}

        /* Buff information buttons. */
        .m097-buff-card{position:relative!important;padding-right:58px!important}.m097-buff-info{position:absolute!important;right:12px!important;top:50%!important;translate:0 -50%!important}
      }
    `;
    document.head.appendChild(style);
  }

  function patchBoot() {
    const title = id("bootAuthTitleV096");
    if (title && clean(title.textContent) !== "Jelentkezz be.") title.textContent = "Jelentkezz be.";
    const status = id("bootAuthStatusV096");
    if (status && status.dataset.m097 !== "1") {
      status.dataset.m097 = "1";
      status.innerHTML = "Vendég módban a mentéseid elvesznek!<br>Bizonyos funkciók nem elérhetőek ebben a módban.";
    }
  }

  function rarityKey(value) {
    const text = lower(value);
    return ["mythical","legendary","epic","rare","uncommon","common"].find(key => text.includes(key)) ||
      (text.includes("mitikus") ? "mythical" : text.includes("legendás") ? "legendary" : text.includes("epikus") ? "epic" : text.includes("ritka") ? "rare" : text.includes("gyakori") ? "common" : "common");
  }

  function selectedSkin() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    const save = window.UI?.save || {};
    const ids = [save.skin,save.skinId,save.selectedSkin,save.player?.skin,save.player?.skinId,save.profile?.skinId].filter(Boolean).map(String);
    let found = skins.find(skin => ids.includes(String(skin.id)));
    if (found) return found;
    const name = clean(q("#skins .skin-title-v093 h2,#skins .skin-title-v093 h3,#skins h2")?.textContent).replace(/^Base\s+/i, "");
    if (name) found = skins.find(skin => lower(skin.name).replace(/^base\s+/i, "") === lower(name));
    return found || skins[0] || null;
  }

  function patchSkinDialog() {
    const dialog = q(".skin-skill-dialog-v093");
    if (!dialog) return;
    const head = q("h2,h3", dialog);
    if (head && /képesség|ability|skill/i.test(head.textContent) && clean(head.textContent) !== "Skills") head.textContent = "Skills";
    const skin = selectedSkin();
    if (!q(".m097-passive", dialog)) {
      const passiveRaw = skin?.passiveDescription || skin?.passiveText || skin?.passive?.description || skin?.passive;
      const passive = typeof passiveRaw === "string" ? passiveRaw : (passiveRaw?.text || passiveRaw?.description || "");
      if (passive) {
        const block = document.createElement("div");
        block.className = "m097-passive";
        block.innerHTML = `<small>Passive</small><p>${String(passive)}</p>`;
        (head || dialog.firstElementChild)?.insertAdjacentElement?.("afterend", block) || dialog.prepend(block);
      }
    }
    qa("dt", dialog).forEach(dt => {
      const text = lower(dt.textContent);
      if (/újratölt|cooldown/.test(text)) dt.textContent = "CD";
      else if (/hatótáv|range/.test(text)) dt.textContent = "Range";
      else if (/sebzés\s*\/\s*gyógyítás|damage\s*\/\s*heal/.test(text)) {
        const context = lower(dt.parentElement?.textContent);
        const desc = lower(q("p", dialog)?.textContent);
        const heals = /heal|gyógy/.test(`${context} ${desc}`);
        const damages = /damage|dmg|sebz|támad/.test(`${context} ${desc}`) || !heals;
        dt.textContent = heals && !damages ? "HEAL" : damages && !heals ? "DMG" : "DMG + HEAL";
      } else if (/^típus$|^type$/.test(text)) {
        const context = lower(dialog.textContent);
        if (/heal|gyógy/.test(context) && /damage|dmg|sebz/.test(context)) dt.textContent = "DMG + HEAL";
        else dt.parentElement?.classList.add("m097-hide");
      }
    });
  }

  function patchSkin() {
    const root = id("skins");
    if (!root) return;
    replaceExact("Base Cherry", "Cherry", root);
    hideExact("Álló támadás", root);
    hideExact("Standing attack", root);
    leafNodes(root).forEach(node => {
      const text = lower(node.textContent);
      if (text === "passzív" || text === "passive") {
        const card = node.closest("article,div");
        if (card && !card.classList.contains("skin-skill-dialog-v093") && card.querySelectorAll("p,small,b,span").length < 12) card.classList.add("m097-hide");
      }
    });
    const art = q(".skin-art-v093", root);
    const rarityText = clean(q(".rarity-pill,.skin-rarity-v093,[class*=rarity]", root)?.textContent || selectedSkin()?.rarity || "common");
    const rarityClass = `m097-rarity-${rarityKey(rarityText)}`;
    if (art && !art.classList.contains(rarityClass)) {
      [...art.classList].filter(c => c.startsWith("m097-rarity-")).forEach(c => art.classList.remove(c));
      art.classList.add(rarityClass);
    }
    const rarity = q(".rarity-pill,.skin-rarity-v093", root);
    if (rarity && !rarity.classList.contains(rarityClass)) {
      [...rarity.classList].filter(c => c.startsWith("m097-rarity-")).forEach(c => rarity.classList.remove(c));
      rarity.classList.add(rarityClass);
    }

    if (!q(".m097-skin-tools", root)) {
      const equip = q(".skin-equip-v093", root) || qa("button", root).find(b => /felszerel|equip/i.test(clean(b.textContent)));
      if (equip) {
        const tools = document.createElement("div"); tools.className = "m097-skin-tools";
        const info = document.createElement("button"); info.type="button"; info.className="m097-info-button"; info.textContent="i"; info.setAttribute("aria-label","Skills"); info.dataset.m097SkinInfo="1";
        const element = document.createElement("button"); element.type="button"; element.className="m097-element-button"; element.textContent="✦"; element.setAttribute("aria-label","Element"); element.dataset.m097SkinElement="1";
        tools.append(info,element);
        (equip.parentElement || equip).insertAdjacentElement("afterend",tools);
      }
    }
    patchSkinDialog();
  }

  function bindSkinTilt() {
    if (state.tiltBound) return; state.tiltBound=true;
    document.addEventListener("pointermove", event => {
      if (!isPhone() || event.pointerType === "mouse") return;
      const art = event.target?.closest?.("#skins .skin-art-v093");
      if (!art || !(event.buttons || event.pressure > 0)) return;
      const rect=art.getBoundingClientRect(); const x=(event.clientX-rect.left)/rect.width-.5; const y=(event.clientY-rect.top)/rect.height-.5;
      art.style.transform=`perspective(900px) rotateX(${(-y*8).toFixed(2)}deg) rotateY(${(x*9).toFixed(2)}deg) translate3d(${(x*6).toFixed(1)}px,${(y*6).toFixed(1)}px,0)`;
    }, {passive:true});
    const reset = event => { const art=event.target?.closest?.("#skins .skin-art-v093"); if(art) art.style.transform=""; };
    document.addEventListener("pointerup",reset,{passive:true}); document.addEventListener("pointercancel",reset,{passive:true});
  }

  function patchEquipment() {
    const root = sectionForHeading("Felszerelés"); if (!root) return;
    leafNodes(root).forEach(node => {
      if (lower(node.textContent)==="erő") {
        const box=node.parentElement; const value=box && qa("b,strong,span,div",box).find(v=>!v.children.length && /^\d+(?:[.,]\d+)?$/.test(clean(v.textContent)));
        value?.classList.add("m097-power-value");
      }
    });
    qa("button",root).forEach(button=>{ if(/^erő(?:\s|$)/i.test(clean(button.textContent)) && !button.closest(".stat")) button.classList.add("m097-sort-button"); });
  }

  function patchArsenal() { const root=sectionForHeading("Arsenal"); if(!root)return; hideExact("Erőforrások:",root); hideExact("Kattints egy materialra a forrásokhoz.",root); }

  function patchGacha() {
    const root=id("gachaChestOnlyV12") || sectionForHeading("Gacha"); if(!root)return;
    leafNodes(root).forEach(node=>{
      const t=clean(node.textContent); const l=lower(t);
      if (/^(common|uncommon|rare|epic|legendary|mythical)(\s*\/\s*(common|rare|epic|legendary|mythical))?\s+tárgyak$/i.test(t) || /^nincs\s+.+\s+láda[.!]?$/i.test(t)) node.classList.add("m097-hide");
      if (["common","uncommon","rare","epic","legendary","mythical","gyakori","ritka","epikus","legendás","mitikus"].includes(l)) { node.classList.add("m097-rarity-label",`m097-rarity-${rarityKey(l)}`); }
    });
  }

  function bindPinch(host,target) {
    if (!host || !target || state.pinches.has(host)) return;
    const pinch={scale:1,startDist:0,startScale:1}; state.pinches.set(host,pinch); host.classList.add("m097-pinch-host"); target.classList.add("m097-pinch-target");
    host.addEventListener("touchstart",event=>{ if(event.touches.length===2){ const [a,b]=event.touches; pinch.startDist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1; pinch.startScale=pinch.scale; } },{passive:true});
    host.addEventListener("touchmove",event=>{ if(event.touches.length!==2)return; event.preventDefault(); const [a,b]=event.touches; const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||pinch.startDist; pinch.scale=Math.max(.65,Math.min(1.75,pinch.startScale*d/pinch.startDist)); target.style.transform=`scale(${pinch.scale.toFixed(3)})`; },{passive:false});
  }

  function patchSkillTree() {
    const root=id("playerUpgrade"); if(!root)return;
    const host=q(".skill-tree-scroll-v082",root); const target=q(".skill-tree-track-v082",root); bindPinch(host,target);
    qa("button",root).forEach(button=>{ if(/^[←→‹›❮❯]$/.test(clean(button.textContent)) && !button.closest(".panel-head,[class*=head]")){ button.classList.add("m097-tree-arrow"); } });
    hideExact("A viselt GM title ideiglenesen feloldja és 20 tesztpontot ad.",root);
    const resonanceHeading=qa("h2,h3,h4",root).find(h=>/elemental resonance/i.test(clean(h.textContent)));
    if(resonanceHeading){ const resonance=resonanceHeading.closest("article,section,div") || root; const large=q("[class*=resonance],[class*=locked]",resonance) || resonance; bindPinch(large,large.firstElementChild||large); qa("button",resonance).forEach(button=>{ if(/^[←→‹›❮❯]$/.test(clean(button.textContent))) button.classList.add("m097-tree-arrow"); }); }
  }

  function findBoxedHeader(root,title) {
    const heading=qa("h1,h2,h3",root).find(h=>lower(h.textContent)===lower(title)); if(!heading)return null;
    let node=heading.parentElement;
    for(let i=0;i<4 && node && node!==root;i++,node=node.parentElement){ const hasBack=qa("button",node).some(b=>/^[←‹]$/.test(clean(b.textContent))); const hasWallet=!!q(".economy-wallet-v080,.mobile-currencies-v0932,[class*=currency]",node); if(hasBack||hasWallet) return node; }
    return heading.parentElement;
  }

  function patchBagShop() {
    const invHeading=qa("h1,h2,h3",document).find(h=>lower(h.textContent)==="inventory");
    if(invHeading){ const root=invHeading.closest("section[id],.panel[id],section,.panel")||invHeading.parentElement; const box=findBoxedHeader(root,"BAG"); box?.classList.add("m097-top-box-remove"); hideExact("CHERRIFT BAG",root); }
    const shopHeading=qa("h1,h2,h3",document).find(h=>lower(h.textContent)==="shop");
    if(shopHeading){ const root=shopHeading.closest("section[id],.panel[id],section,.panel")||shopHeading.parentElement; const box=findBoxedHeader(root,"Bolt"); if(box && box!==shopHeading.parentElement) box.classList.add("m097-top-box-remove"); }
  }

  function patchCollection() {
    const root=sectionForHeading("Gyűjtemény"); if(!root)return;
    hideExact("Skinek, gearek, ellenfelek és Worldök gyűjteménye.",root);
    replaceExact("Játékosszint","Szint",root); replaceExact("Base Cherry","Cherry",root);
    hideExact("Győzd le a felfedezéshez",root);
    qa("article,div",root).forEach(card=>{
      const locked=leafNodes(card).filter(n=>lower(n.textContent)==="még nincs feloldva");
      if(locked.length>1) locked.slice(1).forEach(n=>n.classList.add("m097-hide"));
    });
    const labels=["felszerelés","ellenfelek","kinézetek","világok"];
    const buttons=qa("button",root).filter(b=>labels.includes(lower(b.textContent)));
    if(buttons.length>=3){ const nav=buttons[0].parentElement; nav?.classList.add("m097-collection-tabs"); if(nav && !q(".m097-all-tab",nav)){ const all=document.createElement("button"); all.type="button"; all.className=buttons[0].className+" m097-all-tab"; all.textContent="All"; all.dataset.m097CollectionAll="1"; all.dataset.m097Route=root.id||""; nav.prepend(all); } }
  }

  function patchAchievements() { const root=sectionForHeading("Eredmények"); if(!root)return; hideExact("Állandó mérföldkövek és jutalmak.",root); }

  function statRows() {
    const grid=q("#statSummaryV082 .stat-final-grid-v082,.stat-final-grid-v082"); if(!grid)return [];
    return qa("article",grid).map(article=>({label:clean(q("small,span",article)?.textContent),value:clean(q("b,strong",article)?.textContent)})).filter(x=>x.label&&x.value);
  }

  function patchStats() {
    const root=id("statSummaryV082") || sectionForHeading("Stat részletek"); if(!root)return;
    hideExact("Menüben számolt érték",root); hideExact("Menüben számolt értékek",root);
    if(!q(".m097-stat-list",root)){
      const rows=statRows(); if(rows.length){ const panel=document.createElement("section"); panel.className="m097-stat-list";
        const elemental=rows.filter(x=>/blaze|aqua|abyss|verdant|radiant|void|element|tűz|víz|föld|fény|sötét/i.test(x.label));
        const general=rows.filter(x=>!elemental.includes(x));
        const group=(title,list)=>list.length?`<div class="m097-stat-group"><h3>${title}</h3>${list.map(x=>`<div class="m097-stat-row"><span>${/^(sebzés|atk)$/i.test(x.label)?"Base DMG":x.label}</span><i></i><b>${x.value}</b></div>`).join("")}</div>`:"";
        panel.innerHTML=group("General Stats",general)+group("Elemental Stats",elemental);
        const grid=q(".stat-final-grid-v082",root); grid?.insertAdjacentElement("beforebegin",panel);
      }
    }
    qa("section,article",root).forEach(node=>{ if(node!==root && /képességfa|skill tree/i.test(clean(q("h2,h3",node)?.textContent))) node.classList.add("m097-stat-compact"); });
  }

  function patchBuffs() {
    const root=id("buffsV082") || sectionForHeading("Buff lista"); if(!root)return;
    const heading=qa("h1,h2,h3",root).find(h=>lower(h.textContent)==="buff lista"); if(heading){ let box=heading.parentElement; for(let i=0;i<4&&box&&box!==root;i++,box=box.parentElement){ if(q(".economy-wallet-v080,.mobile-currencies-v0932,[class*=currency]",box)){ box.classList.add("m097-simple-header"); break; } } }
    qa(".economy-wallet-v080,.mobile-currencies-v0932,[class*=currency]",root).forEach(wallet=>{ if(!wallet.closest("#resourceBarV082,#globalRailV060")) wallet.classList.add("m097-dup-wallet"); });
    replaceExact("Ebben a kategóriában még nincs tárgyad.","-",root);
    const defs=[
      {name:"Veteran Focus",info:"Szint 25 szükséges." ,match:/player\s*lv\.?\s*25|szint\s*25/i},
      {name:"Cherry Supporter",info:"Twitch Subscribe Tier. (Need Discord role to activate)",match:/discord\s*sub|serveroldali|role|twitch/i}
    ];
    defs.forEach(def=>{
      const title=qa("h2,h3,h4,strong,b",root).find(n=>lower(n.textContent)===lower(def.name)); if(!title)return;
      const card=title.closest("article,[class*=card],li,div"); if(!card)return; card.classList.add("m097-buff-card");
      leafNodes(card).forEach(n=>{ if(n!==title && def.match.test(clean(n.textContent))) n.classList.add("m097-hide"); });
      if(!q(".m097-buff-info",card)){ const b=document.createElement("button");b.type="button";b.className="m097-info-button m097-buff-info";b.textContent="i";b.dataset.m097Info=def.info;b.setAttribute("aria-label",`${def.name} info`);card.appendChild(b); }
    });
  }

  function isGuest() { return !window.CHERRIFT_LIVE_SERVICES?.session?.user?.id; }

  function patchMore() {
    const drawer=id("mobileMenuV082"); if(!drawer)return;
    qa("button,a",drawer).forEach(button=>{
      const leafLabel = leafNodes(button).map(n=>lower(n.textContent)).find(t=>["mail","settings","beállítások","cherry","profil","profile","rank","ranking","event","social"].includes(t));
      const label = leafLabel || lower(button.textContent).replace(/^[^a-záéíóöőúüű]+/i, "");
      const remove = ["mail","settings","beállítások","cherry","profil","profile"].some(x=>label===x || label.endsWith(` ${x}`));
      if(remove) button.classList.add("m097-more-remove");
      const discordOnly=["rank","ranking","mail","event","social"].some(x=>label===x || label.endsWith(` ${x}`));
      button.classList.toggle("m097-guest-locked",isGuest()&&discordOnly);
      if(discordOnly) button.dataset.m097DiscordOnly="1";
    });
  }

  function patchLobbyAvatar() {
    const host=q("#menu .mobile-profile-v0932,.mobile-profile-v0932"); if(!host)return;
    let avatar=q(".prebeta-avatar",host); if(!avatar){ avatar=host; host.classList.add("m097-avatar-host"); }
    if(q(".prebeta-avatar-frame",avatar))return;
    const frames=window.CHERRIFT_BALANCE?.frames||[]; const frameId=window.UI?.save?.profile?.frameId||"frame0lvl"; const frame=frames.find(x=>x.id===frameId)||frames[0];
    if(frame?.asset){ const img=document.createElement("img");img.className="prebeta-avatar-frame";img.src=frame.asset;img.alt="";img.setAttribute("aria-hidden","true");avatar.appendChild(img); }
  }

  function patchCoinText() {
    const roots=[id("menu"),sectionForHeading("Chapter"),sectionForHeading("Világ"),...qa('section[id*="world" i],section[id*="stage" i],section[id*="chapter" i],.world-select-v040,.chapter-select-v040')].filter(Boolean);
    roots.forEach(root=>leafNodes(root).forEach(node=>{
      const text=clean(node.textContent); if(!/(?:érme|coins?)/i.test(text))return;
      let next=text.replace(/([+]?\s*\d[\d .]*)\s*(?:érme|coins?)/gi,(_,n)=>`🪙 ${String(n).replace(/^\+\s*/,"").trim()}`);
      next=next.replace(/(?:érme|coin)\s*([+]?\s*\d[\d .]*)/gi,(_,n)=>`🪙 ${String(n).replace(/^\+\s*/,"").trim()}`);
      if(next!==text)node.textContent=next;
    }));
  }

  function patchBottomNavAndPlay() {
    const candidates=qa("nav,div",document).filter(node=>{
      const texts=qa("button",node).map(b=>lower(b.textContent)); return ["cherry","felszerelés","főmenü","gacha","továbbiak"].filter(x=>texts.some(t=>t.includes(x))).length>=4;
    });
    candidates.forEach(nav=>{ nav.classList.add("m097-icon-nav"); qa("button",nav).forEach(button=>leafNodes(button).forEach(node=>{ if(["cherry","felszerelés","főmenü","gacha","továbbiak","gear","home","more"].includes(lower(node.textContent)))node.classList.add("m097-nav-label"); })); });
    const menu=id("menu"); if(menu)qa("button",menu).forEach(button=>{ const text=lower(button.textContent); if((text.includes("játék")||text.includes("play"))&&(text.includes("pálya indítása")||text.includes("launch")||q("small",button))) button.classList.add("m097-play-only"); });
  }

  function showInfo(button,text) {
    state.info?.remove(); const bubble=document.createElement("div"); bubble.className="m097-info-bubble"; bubble.textContent=text; document.body.appendChild(bubble); const r=button.getBoundingClientRect(); const b=bubble.getBoundingClientRect(); const left=Math.max(14,Math.min(innerWidth-b.width-14,r.right-b.width)); const top=Math.max(14,r.top-b.height-10); bubble.style.left=`${left}px`;bubble.style.top=`${top}px`;state.info=bubble; setTimeout(()=>{if(state.info===bubble){bubble.remove();state.info=null;}},3200);
  }

  function openMoreDirect() {
    const drawer=id("mobileMenuV082"); if(!drawer)return false; drawer.classList.remove("hidden");drawer.setAttribute("aria-hidden","false");document.body.classList.add("mobile-menu-open-v082","more-open");patchMore();return true;
  }

  function bindClicks() {
    if(state.clickBound)return;state.clickBound=true;
    document.addEventListener("click",event=>{
      if(!isPhone())return;
      const target=event.target?.closest?.("button,a"); if(!target)return;
      if(target.dataset.m097Info){ event.preventDefault();event.stopImmediatePropagation();showInfo(target,target.dataset.m097Info);return; }
      if(target.dataset.m097SkinElement){ event.preventDefault();event.stopImmediatePropagation();const skin=selectedSkin();const element=skin?.element?.name||skin?.elementName||skin?.element||skin?.affinity||skin?.elementType||"Unknown";showInfo(target,String(element));return; }
      if(target.dataset.m097SkinInfo){ event.preventDefault();event.stopImmediatePropagation(); const root=id("skins"); const skill=q(".skin-skill-v093,.skin-ability-v093,[data-skin-skill]",root)||qa("button",root).find(b=>b!==target&&!/felszerel|equip|←|back/i.test(clean(b.textContent))&&/dash|skill|strike|bloom|heal|shot|slash|burst|ability/i.test(lower(b.textContent))); skill?.click(); setTimeout(patchSkinDialog,0);return; }
      if(target.dataset.m097CollectionAll){ event.preventDefault();event.stopImmediatePropagation(); const route=target.dataset.m097Route; if(route) window.UI?.open?.(route); else window.UI?.open?.("collectionV084"); setTimeout(patchCollection,0);return; }
      if(target.dataset.m097DiscordOnly==="1"&&isGuest()){ event.preventDefault();event.stopImmediatePropagation(); window.UI?.toast?.("Ehhez Discord bejelentkezés szükséges."); if(!window.UI?.toast) showInfo(target,"Ehhez Discord bejelentkezés szükséges.");return; }
      if(target.closest("#statSummaryV082")&&/^[←‹]$/.test(clean(target.textContent))){ event.preventDefault();event.stopImmediatePropagation(); const route=id("profileBugfixV0941")?"profileBugfixV0941":id("profileV082")?"profileV082":"profile"; window.UI?.open?.(route);return; }
      const label=lower(target.textContent); if((label.includes("továbbiak")||label.includes("more")||target.getAttribute("aria-label")?.toLowerCase()==="more")&&id("gachaChestOnlyV12")&&!id("gachaChestOnlyV12").classList.contains("hidden")){ event.preventDefault();event.stopImmediatePropagation();openMoreDirect();return; }
    },true);
  }

  function patchMiscText() {
    replaceExact("Base Cherry","Cherry");
    patchBagShop(); patchAchievements(); patchArsenal();
  }

  function patchAll() {
    state.queued=false; if(!isPhone()){ state.info?.remove();state.info=null;return; }
    patchBoot(); patchSkin(); patchEquipment(); patchArsenal(); patchGacha(); patchSkillTree(); patchBagShop(); patchCollection(); patchAchievements(); patchStats(); patchBuffs(); patchMore(); patchLobbyAvatar(); patchCoinText(); patchBottomNavAndPlay(); patchMiscText();
  }

  function queue(){ if(state.queued)return;state.queued=true;requestAnimationFrame(patchAll); }

  function start(){ ensureCss();bindClicks();bindSkinTilt();patchAll();state.observer=new MutationObserver(queue);state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden","aria-hidden"]});addEventListener("resize",queue,{passive:true});addEventListener("orientationchange",queue,{passive:true});addEventListener("cherrift:savechange",queue);window.CHERRIFT_MOBILE_POLISH_097=Object.freeze({version:VERSION,refresh:queue});console.info(`[CHERRIFT] ${VERSION} loaded.`); }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
