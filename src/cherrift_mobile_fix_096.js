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
    const skin = window.CHERRIFT_DATA?.skins?.[window.UI?.skinIndex || 0] || window.CHERRIFT_DATA?.skins?.find?.(entry => entry.id === window.UI?.save?.selectedSkin);
    const signature = `${skin?.id || "skin"}:${skin?.rarity || "Common"}`;
    if (art.dataset.v096Card === signature && q(".v096-art-card-ui", art)) return;
    art.dataset.v096Card = signature;
    q(".v096-art-card-ui", art)?.remove();
    const badges = document.createElement("div");
    badges.className = "v096-art-card-ui";
    badges.innerHTML = `<span>${skin?.rarity || "Common"}</span><span>${skin?.name || "Cherry"}</span>`;
    art.appendChild(badges);
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
    // Earlier modules create runtime <style> nodes during DOMContentLoaded.
    // Re-appending this already loaded sheet makes the focused fix layer the
    // final cascade without another request or a desktop-specific override.
    const css = id("cherriftMobileFix096Css");
    if (css && css.parentElement === document.head) document.head.appendChild(css);
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
