/* CHERRIFT v0.9.7 — shared Cute Sakura Fantasy UI + lightweight reactive foliage.
   The UI section keeps phone-specific polish in the existing shared game UI layer,
   while the foliage section preserves the spatially indexed in-run animation. */
(function cherriftGameUiV097(){
  "use strict";

  if (window.__CHERRIFT_GAME_UI_097__) return;
  window.__CHERRIFT_GAME_UI_097__ = true;
  document.documentElement.classList.add("cherrift-game-ui-v097");

  const VERSION = "0.9.7.1";
  const CELL_SIZE = 220;
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");
  const REACTIVE_ASSET = /(flower|bush|grass|mushroom|plant|reed|shrub)/i;

  const SKIN_ELEMENTS = Object.freeze({
    cherry_default:"cute",
    archer_cherry:"windborne",
    beastclaw_cherry:"stoneveil",
    cake_deliver_cherry:"blaze",
    fairy_cherry:"windborne",
    kimono_cherry:"tidecall",
    mage_cherry:"blaze",
    ninja_cherry:"windborne",
    pajama_cherry:"tidecall",
    school_uniform_cherry:"blaze",
    sport_cherry:"stoneveil",
    succubus_cherry:"abyssal",
    warrior_cherry:"stoneveil",
    wuxia_sakura_cherry:"celestial"
  });

  const ELEMENTS = Object.freeze({
    blaze:Object.freeze({name:"Blaze",icon:"assets/ui/elemental_resonance/elements/blaze.png"}),
    tidecall:Object.freeze({name:"Tidecall",icon:"assets/ui/elemental_resonance/elements/tidecall.png"}),
    stoneveil:Object.freeze({name:"Stoneveil",icon:"assets/ui/elemental_resonance/elements/stoneveil.png"}),
    windborne:Object.freeze({name:"Windborne",icon:"assets/ui/elemental_resonance/elements/windborne.png"}),
    celestial:Object.freeze({name:"Celestial",icon:"assets/ui/elemental_resonance/elements/celestial.png"}),
    abyssal:Object.freeze({name:"Abyssal",icon:"assets/ui/elemental_resonance/elements/abyssal.png"}),
    cute:Object.freeze({name:"Cute",icon:"assets/ui/elemental_resonance/common/cute_affinity.png"})
  });

  const uiState = {
    observer:null,
    queued:false,
    bound:false,
    popover:null,
    lastSkinId:""
  };

  const q = (selector, root=document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root=document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const clean = value => String(value ?? "").replace(/\s+/g," ").trim();
  const lower = value => clean(value).toLocaleLowerCase("hu");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const language = () => window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  const copy = (hu,en) => language() === "en" ? en : hu;
  const isPhoneUi = () => matchMedia("(max-width:820px)").matches || ((navigator.maxTouchPoints || 0) > 0 && Math.min(innerWidth || 9999, innerHeight || 9999) <= 820);

  function installUiStyle(){
    if (document.getElementById("cherriftGameUi097PolishCss")) return;
    const style = document.createElement("style");
    style.id = "cherriftGameUi097PolishCss";
    style.textContent = `
      /* Obtained: compact cards and a plain claim affordance. */
      .reward-overlay-v083 #rewardItemsV083 .reward-item-v083{width:138px!important;min-height:184px!important;padding:10px 9px!important;border-radius:14px!important}
      .reward-overlay-v083 #rewardItemsV083 .reward-art-v083{height:94px!important;padding:9px 8px 2px!important}
      .reward-overlay-v083 .reward-item-v083 img,
      .reward-overlay-v083 .reward-item-v083 canvas,
      .reward-overlay-v083 .reward-item-art-v083 img,
      .reward-overlay-v083 [class*="reward-art"] img{
        width:min(86px,18vw)!important;height:min(86px,18vw)!important;
        max-width:86px!important;max-height:86px!important;object-fit:contain!important
      }
      .reward-overlay-v083 .reward-art-v083>span{font-size:50px!important}
      .reward-overlay-v083 .reward-copy-v083 h3{font-size:clamp(15px,3.8vw,20px)!important}
      .reward-overlay-v083 .reward-copy-v083 p{font-size:clamp(10px,2.7vw,13px)!important}
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083{
        width:auto!important;min-width:0!important;min-height:0!important;
        margin:12px auto 0!important;padding:8px 14px!important;
        border:0!important;border-radius:0!important;color:#fff!important;
        background:transparent!important;box-shadow:none!important;
        font:850 14px/1.2 system-ui,sans-serif!important;
        letter-spacing:.04em!important;text-transform:none!important
      }
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083::before,
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083::after{content:none!important;display:none!important}

      /* The temporary runtime frame may exist before Pre-beta replaces the avatar image.
         Never render that direct child over the profile text. */
      #menu .mobile-profile-v0932 > .prebeta-avatar-frame,
      .mobile-profile-v0932 > .prebeta-avatar-frame{display:none!important}

      /* Cherry selector: use the native Splash/In-game tabs again, not the right-side orb. */
      #skins .cr-skin-view-button{display:none!important}
      #skins .skin-view-tabs-v093{
        position:absolute!important;z-index:15!important;
        top:10px!important;left:50%!important;right:auto!important;
        width:auto!important;max-width:calc(100% - 28px)!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        gap:3px!important;padding:3px!important;
        transform:translateX(-50%)!important;
        border:1px solid rgba(255,255,255,.26)!important;border-radius:11px!important;
        background:rgba(24,10,22,.78)!important;box-shadow:0 7px 18px rgba(0,0,0,.26)!important;
        backdrop-filter:blur(9px)!important
      }
      #skins .skin-view-tabs-v093 button{
        min-width:82px!important;min-height:30px!important;margin:0!important;padding:5px 10px!important;
        border:0!important;border-radius:8px!important;color:rgba(255,255,255,.72)!important;
        background:transparent!important;box-shadow:none!important;
        font:850 10px/1 system-ui,sans-serif!important;white-space:nowrap!important
      }
      #skins .skin-view-tabs-v093 button.active{
        color:#fff!important;background:color-mix(in srgb,var(--cr-primary,#e45b9b) 72%,rgba(37,21,33,.9))!important
      }

      /* Element affinity is represented by the small action button, not an extra selector badge. */
      #skins #skinElementBadgeV095{display:none!important}
      #skins .cr-skin-action-row-v0971{
        display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;
        min-width:0!important
      }
      #skins .cr-skin-action-row-v0971 .cr-skin-tools{
        display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;
        margin:0!important;padding:0!important
      }
      #skins .cr-skin-action-row-v0971 :is(.cr-info-button,.cr-element-button){
        width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;
        margin:0!important;padding:0!important;border-radius:11px!important
      }
      #skins .cr-element-button img{width:24px!important;height:24px!important;display:block!important;object-fit:contain!important}
      #skins .cr-skin-action-row-v0971 .skin-equip-v093{margin:0!important;min-width:92px!important}
      #skins .skill-card-v093{display:none!important}
      #skins .cr-passive:not(.skin-skill-dialog-v093 .cr-passive){display:none!important}
      #skins .ui-v0971-hide{display:none!important}

      .cr-skin-popover-v0971{
        position:fixed!important;z-index:2147483646!important;
        left:50%!important;top:50%!important;width:min(360px,calc(100vw - 28px))!important;
        max-height:min(430px,72dvh)!important;overflow:auto!important;
        padding:15px!important;transform:translate(-50%,-50%)!important;
        border:1px solid color-mix(in srgb,var(--cr-primary,#e45b9b) 62%,rgba(255,255,255,.25))!important;
        border-radius:18px!important;color:var(--cr-text,#fff5fa)!important;
        background:color-mix(in srgb,var(--cr-surface,#241522) 97%,transparent)!important;
        box-shadow:0 24px 70px rgba(0,0,0,.58)!important;backdrop-filter:blur(16px)!important
      }
      .cr-skin-popover-v0971>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:11px!important}
      .cr-skin-popover-v0971>header h3{margin:0!important;color:inherit!important;font:800 22px/1.05 Georgia,"Times New Roman",serif!important}
      .cr-skin-popover-v0971>header button{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;border:1px solid var(--cr-line,rgba(255,203,228,.25))!important;border-radius:10px!important;color:inherit!important;background:var(--cr-surface-2,#321c2e)!important;font-size:19px!important}
      .cr-skin-popover-v0971 article{padding:11px!important;border:1px solid var(--cr-line,rgba(255,203,228,.25))!important;border-radius:12px!important;background:rgba(255,255,255,.035)!important}
      .cr-skin-popover-v0971 article+article{margin-top:8px!important}
      .cr-skin-popover-v0971 small{display:block!important;margin-bottom:5px!important;color:var(--cr-primary,#e45b9b)!important;font:900 10px/1 system-ui!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .cr-skin-popover-v0971 b{display:block!important;margin:0 0 5px!important;color:inherit!important;font-size:15px!important}
      .cr-skin-popover-v0971 p{margin:0!important;color:var(--cr-muted,#d2afc1)!important;font:700 12px/1.45 system-ui!important}
      .cr-skin-popover-v0971 .cr-element-popover-icon{width:42px!important;height:42px!important;float:left!important;margin:0 10px 5px 0!important;object-fit:contain!important}

      @media(max-width:820px){
        .reward-overlay-v083 #rewardItemsV083 .reward-item-v083{width:122px!important;min-height:168px!important;padding:8px 7px!important}
        .reward-overlay-v083 #rewardItemsV083 .reward-art-v083{height:78px!important;padding:7px 6px 1px!important}
        .reward-overlay-v083 .reward-item-v083 img,
        .reward-overlay-v083 .reward-item-v083 canvas,
        .reward-overlay-v083 .reward-item-art-v083 img,
        .reward-overlay-v083 [class*="reward-art"] img{
          width:68px!important;height:68px!important;max-width:68px!important;max-height:68px!important
        }
        .reward-overlay-v083 .reward-art-v083>span{font-size:42px!important}
        .reward-overlay-v083 #rewardContinueV083.reward-continue-v083{margin-top:9px!important;padding:7px 10px!important;font-size:13px!important}

        #skins .skin-details-v093{
          grid-template-columns:minmax(0,1fr) auto!important;
          grid-template-rows:auto auto 1fr!important
        }
        #skins .cr-skin-action-row-v0971{
          grid-column:2!important;grid-row:1/4!important;align-self:center!important;
          display:flex!important;flex-wrap:nowrap!important
        }
        #skins .cr-skin-action-row-v0971 .skin-equip-v093{
          min-width:82px!important;min-height:38px!important;padding:4px 7px!important;font-size:9px!important
        }
        #skins .cr-skin-action-row-v0971 :is(.cr-info-button,.cr-element-button){
          width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important
        }
        #skins .cr-element-button img{width:22px!important;height:22px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedSkin(){
    const skins = window.CHERRIFT_DATA?.skins || [];
    const active = q("#skins .skin-icon-v093.active[data-v093-skin]");
    if (active?.dataset?.v093Skin) {
      const visibleSkin = skins.find(skin => skin?.id === active.dataset.v093Skin);
      if (visibleSkin) return visibleSkin;
    }
    const index = Number(window.UI?.skinIndex);
    if (Number.isInteger(index) && skins[index]) return skins[index];
    const save = window.UI?.save || {};
    const ids = [save.selectedSkin,save.skin,save.skinId,save.player?.skinId,save.profile?.skinId].filter(Boolean).map(String);
    return skins.find(skin => ids.includes(String(skin?.id))) || skins[0] || null;
  }

  function passiveText(skin, root){
    const dialog = q(".skin-skill-dialog-v093",document);
    const dialogPassive = clean(q(".cr-passive p",dialog)?.textContent);
    const raw = skin?.passiveDescription ?? skin?.passiveText ?? skin?.passive?.description ?? skin?.passive?.text ?? skin?.passive;
    const primary = dialogPassive || (typeof raw === "string" ? clean(raw) : "");
    const unique = clean(skin?.uniquePassiveDescription ?? skin?.uniquePassiveText ?? skin?.uniquePassive);
    if (primary && unique && lower(primary) !== lower(unique)) return `${primary} · ${unique}`;
    if (primary || unique) return primary || unique;
    const label = qa("small,b,strong,span,dt",root).find(node => /^(passzív|passive)$/i.test(clean(node.textContent)));
    const card = label?.closest("article,div");
    return clean(q("p",card)?.textContent) || "—";
  }

  function skillInfo(skin, root){
    const dialog = q(".skin-skill-dialog-v093",document);
    const skillObject = skin?.skill && typeof skin.skill === "object" ? skin.skill : null;
    const name = clean(
      q("h3",dialog)?.textContent ??
      skin?.skillName ?? skin?.abilityName ?? (typeof skin?.skill === "string" ? skin.skill : null) ?? skillObject?.name ??
      q(".skill-card-v093 b,.skin-skill-v093 b,.skin-ability-v093 b,[data-skin-skill] b",root)?.textContent ??
      q(".skill-card-v093,.skin-skill-v093,.skin-ability-v093,[data-skin-skill]",root)?.textContent
    ) || "Skill";
    const dialogDescription = qa("p",dialog).filter(node => !node.closest(".cr-passive")).map(node => clean(node.textContent)).find(Boolean);
    const rawDescription = skin?.skillDescription ?? skin?.skillDesc ?? skin?.abilityDescription ?? skillObject?.description ?? skillObject?.desc;
    const description = dialogDescription || (typeof rawDescription === "string" ? clean(rawDescription) : "") || clean(skin?.desc);
    return {name,description:description || "—"};
  }

  function skinElement(skin){
    const raw = skin?.elementalAffinity ?? skin?.element?.id ?? skin?.element?.name ?? skin?.elementName ?? skin?.element ?? skin?.affinity ?? skin?.elementType ?? SKIN_ELEMENTS[skin?.id] ?? "cute";
    const key = lower(typeof raw === "string" ? raw : raw?.name || raw?.id || "cute").replace(/\s+/g,"_");
    const aliases = {fire:"blaze",water:"tidecall",earth:"stoneveil",air:"windborne",light:"celestial",dark:"abyssal"};
    const id = ELEMENTS[key] ? key : aliases[key] || SKIN_ELEMENTS[skin?.id] || "cute";
    return {id,...(ELEMENTS[id] || ELEMENTS.cute)};
  }

  function closeSkinPopover(){
    uiState.popover?.remove();
    uiState.popover = null;
  }

  function openSkinPopover(kind){
    closeSkinPopover();
    const root = document.getElementById("skins");
    const skin = selectedSkin();
    if (!root || !skin) return;
    const panel = document.createElement("section");
    panel.className = "cr-skin-popover-v0971";
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-modal","false");

    if (kind === "element") {
      const element = skinElement(skin);
      panel.innerHTML = `
        <header><h3>${esc(copy("Skin típusa","Skin type"))}</h3><button type="button" data-v0971-popover-close aria-label="Close">×</button></header>
        <article>
          <img class="cr-element-popover-icon" src="${esc(element.icon)}" alt="">
          <small>${esc(copy("Elemental Resonance","Elemental Resonance"))}</small>
          <b>${esc(element.name)}</b>
          <p>${esc(copy("Ez a skin Elemental Resonance elem típusa.","This is the skin's Elemental Resonance affinity."))}</p>
        </article>`;
    } else {
      const skill = skillInfo(skin,root);
      panel.innerHTML = `
        <header><h3>${esc(skin?.name || "Cherry")}</h3><button type="button" data-v0971-popover-close aria-label="Close">×</button></header>
        <article><small>${esc(copy("Passzív","Passive"))}</small><p>${esc(passiveText(skin,root))}</p></article>
        <article><small>${esc(copy("Skill","Skill"))}</small><b>${esc(skill.name)}</b><p>${esc(skill.description)}</p></article>`;
    }

    document.body.appendChild(panel);
    uiState.popover = panel;
  }

  function decorateRewardOverlay(root=document){
    qa(".reward-overlay-v083",root).forEach(overlay => {
      const claim = q(".reward-continue-v083",overlay) || qa("button",overlay).find(button => /claim|átvét|érintsd|kattints|continue/i.test(clean(button.textContent)));
      if (claim) {
        claim.textContent = isPhoneUi() ? "Tap to claim" : "Click to claim";
        claim.setAttribute("aria-label",claim.textContent);
      }
    });
  }

  function fixLobbyFrame(){
    qa("#menu .mobile-profile-v0932,.mobile-profile-v0932").forEach(host => {
      const avatar = q(":scope > .prebeta-avatar",host) || q(".prebeta-avatar",host);
      if (!avatar) return;
      host.classList.remove("cr-avatar-host","prebeta-avatar");
      qa(":scope > .prebeta-avatar-frame",host).forEach(frame => frame.remove());
    });
  }

  function hideMovingAttack(root){
    qa("dt,small,span,b,strong,em,p,div",root).forEach(node => {
      if (node.children.length) return;
      if (!/^(mozgó támadás|moving attack)$/i.test(clean(node.textContent))) return;
      const card = node.closest(".skin-stats-v093>div,[class*=skin-stat]");
      (card || node).classList.add("ui-v0971-hide");
    });
  }

  function normalizeViewTabs(root){
    const tabs = q(".skin-view-tabs-v093",root);
    if (!tabs) return;
    const splash = q('[data-v093-skin-view="splash"]',tabs) || qa("button",tabs)[0];
    const game = q('[data-v093-skin-view="game"]',tabs) || qa("button",tabs)[1];
    if (splash) splash.textContent = "Splash art";
    if (game) game.textContent = "In-game";
  }

  function ensureSkinActionRow(root){
    const equip = q(".skin-equip-v093",root) || qa("button",root).find(button => /felszerel|equip/i.test(clean(button.textContent)));
    const tools = q(".cr-skin-tools",root);
    if (!equip || !tools) return;

    let row = q(".cr-skin-action-row-v0971",root);
    if (!row) {
      row = document.createElement("div");
      row.className = "cr-skin-action-row-v0971";
      equip.insertAdjacentElement("beforebegin",row);
    }
    if (tools.parentElement !== row) row.appendChild(tools);
    if (equip.parentElement !== row) row.appendChild(equip);

    const info = q(".cr-info-button",tools);
    if (info) {
      info.removeAttribute("data-cr-skin-info");
      info.dataset.v0971SkinInfo = "1";
      info.textContent = "i";
      info.title = copy("Passzív és skill","Passive and skill");
      info.setAttribute("aria-label",info.title);
    }

    const elementButton = q(".cr-element-button",tools);
    if (elementButton) {
      elementButton.removeAttribute("data-cr-skin-element");
      elementButton.dataset.v0971SkinElement = "1";
      const element = skinElement(selectedSkin());
      if (elementButton.dataset.v0971Element !== element.id || !q("img",elementButton)) {
        elementButton.dataset.v0971Element = element.id;
        elementButton.innerHTML = `<img src="${esc(element.icon)}" alt="">`;
      }
      elementButton.title = `${copy("Elemental Resonance elem","Elemental Resonance affinity")}: ${element.name}`;
      elementButton.setAttribute("aria-label",elementButton.title);
    }
  }

  function reconcileSkinSelector(){
    const root = document.getElementById("skins");
    if (!root) return;
    normalizeViewTabs(root);
    hideMovingAttack(root);
    ensureSkinActionRow(root);
    q("#skinElementBadgeV095",root)?.setAttribute("aria-hidden","true");
    const current = selectedSkin()?.id || "";
    if (uiState.lastSkinId && current && current !== uiState.lastSkinId) closeSkinPopover();
    uiState.lastSkinId = current;
  }

  function reconcileUi(){
    installUiStyle();
    decorateRewardOverlay();
    fixLobbyFrame();
    reconcileSkinSelector();
  }

  function scheduleUiReconcile(){
    if (uiState.queued) return;
    uiState.queued = true;
    requestAnimationFrame(() => {
      uiState.queued = false;
      reconcileUi();
    });
  }

  function mutationTouchesUi(record){
    for (const node of record.addedNodes || []) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.(".reward-overlay-v083,.mobile-profile-v0932,.prebeta-avatar,#skins,.skin-selector-v093,.cr-skin-tools,#skinElementBadgeV095") ||
          node.closest?.("#skins,.mobile-profile-v0932,.reward-overlay-v083") ||
          node.querySelector?.(".reward-overlay-v083,.mobile-profile-v0932,.prebeta-avatar,#skins,.cr-skin-tools,#skinElementBadgeV095")) return true;
    }
    return false;
  }

  function bindUi(){
    if (uiState.bound) return;
    uiState.bound = true;

    document.addEventListener("click", event => {
      const info = event.target?.closest?.("[data-v0971-skin-info]");
      if (info) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSkinPopover("info");
        return;
      }
      const element = event.target?.closest?.("[data-v0971-skin-element]");
      if (element) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSkinPopover("element");
        return;
      }
      if (event.target?.closest?.("[data-v0971-popover-close]")) {
        event.preventDefault();
        closeSkinPopover();
        return;
      }
      if (uiState.popover && !event.target?.closest?.(".cr-skin-popover-v0971")) closeSkinPopover();
      if (event.target?.closest?.("#skins .skin-icon-v093,#skins [data-v093-skin-view]")) queueMicrotask(scheduleUiReconcile);
    },true);

    addEventListener("resize",scheduleUiReconcile,{passive:true});
    addEventListener("orientationchange",scheduleUiReconcile,{passive:true});

    if (typeof MutationObserver === "function" && document.body) {
      uiState.observer = new MutationObserver(records => {
        if (records.some(mutationTouchesUi)) scheduleUiReconcile();
      });
      uiState.observer.observe(document.body,{subtree:true,childList:true});
    }
  }

  function startUi(){
    installUiStyle();
    bindUi();
    reconcileUi();
    requestAnimationFrame(reconcileUi);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",startUi,{once:true});
  else startUi();

  /* ---------- Reactive foliage ---------- */
  if (typeof CherriftGame === "undefined") {
    console.info(`[CHERRIFT v${VERSION}] Shared game UI loaded; foliage hook waiting for game runtime.`);
    return;
  }

  const proto = CherriftGame.prototype;

  function seconds(game){
    const value = Number(game?.t);
    return Number.isFinite(value) ? value : performance.now() / 1000;
  }

  function profileFor(object){
    const currentMapObject = object?.v094Map || object?.__fixWorldObjectV095 || object?.__fixStrictWorldV0952;
    if (!currentMapObject || object.solid || object.kind === "fireflyV094" || object.glow) return null;
    const key = `${String(object.assetKey || "")} ${String(object.fixKey || "")} ${String(object.kind || "")}`;
    if (!REACTIVE_ASSET.test(key)) return null;

    const drawW = Math.max(24, Number(object.drawW) || 64);
    const drawH = Math.max(24, Number(object.drawH) || 64);
    const isBush = /bush|shrub/i.test(key);
    const isGrass = /grass|reed/i.test(key);
    const isFlower = /flower|mushroom|plant/i.test(key);

    return Object.freeze({
      radius:Math.max(48, Math.min(108, drawW * (isBush ? .72 : .64))),
      amplitude:(isBush ? 12 : isGrass ? 16 : isFlower ? 14 : 12) * Math.PI / 180,
      compression:isBush ? .07 : isGrass ? .10 : .085,
      duration:isBush ? .60 : isGrass ? .49 : .54,
      drawW,
      drawH,
      anchor:Number.isFinite(Number(object.anchor)) ? Number(object.anchor) : .72
    });
  }

  function cellKey(x, y){
    return `${Math.floor(x / CELL_SIZE)}:${Math.floor(y / CELL_SIZE)}`;
  }

  function buildController(game){
    const grid = new Map();
    for (const object of game.obstacles || []) {
      const profile = profileFor(object);
      if (!profile) continue;
      const key = cellKey(object.x, object.y);
      const bucket = grid.get(key) || [];
      bucket.push({object, profile});
      grid.set(key, bucket);
    }

    const old = game.__v097Foliage;
    game.__v097Foliage = {
      source:game.obstacles,
      sourceLength:game.obstacles?.length || 0,
      grid,
      active:new Map(),
      inside:new Set(),
      cooldown:new WeakMap(),
      lastScanAt:-Infinity,
      lastX:Number(game.player?.x) || 0,
      lastY:Number(game.player?.y) || 0,
      initialized:false,
      revision:(old?.revision || 0) + 1
    };
    return game.__v097Foliage;
  }

  function controllerFor(game){
    const current = game.__v097Foliage;
    if (!current || current.source !== game.obstacles || current.sourceLength !== (game.obstacles?.length || 0)) {
      return buildController(game);
    }
    return current;
  }

  function motionValue(progress){
    const p = Math.max(0, Math.min(1, progress));
    if (p < .18) return p / .18;
    if (p < .44) return 1 + (-.38 - 1) * ((p - .18) / .26);
    if (p < .70) return -.38 + (.17 + .38) * ((p - .44) / .26);
    return .17 * (1 - (p - .70) / .30);
  }

  function leanDirection(object, dx, playerX){
    if (Math.abs(dx) > .5) return Math.sign(dx);
    const side = playerX - Number(object.x || 0);
    if (Math.abs(side) > 1) return Math.sign(side);
    return Math.sin(Number(object.phase) || 0) >= 0 ? 1 : -1;
  }

  function distanceSqToSegment(pointX, pointY, startX, startY, endX, endY){
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSq = segmentX * segmentX + segmentY * segmentY;
    if (lengthSq <= .0001) {
      const dx = pointX - endX;
      const dy = pointY - endY;
      return dx * dx + dy * dy;
    }
    const projection = Math.max(0, Math.min(1,
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / lengthSq
    ));
    const closestX = startX + segmentX * projection;
    const closestY = startY + segmentY * projection;
    const dx = pointX - closestX;
    const dy = pointY - closestY;
    return dx * dx + dy * dy;
  }

  function updateFoliage(game){
    if ((game.mode !== "playing" && !document.body.classList.contains("is-playing")) || !game.player) return;
    const controller = controllerFor(game);
    const now = seconds(game);

    for (const [object, state] of controller.active) {
      if (now - state.startedAt >= state.duration) controller.active.delete(object);
    }

    const lowQuality = game.save?.settings?.effectQuality === "low";
    const scanInterval = lowQuality ? .075 : .045;
    if (now - controller.lastScanAt < scanInterval) return;

    const playerX = Number(game.player.x) || 0;
    const playerY = Number(game.player.y) || 0;
    const previousX = controller.lastX;
    const previousY = controller.lastY;
    const dx = playerX - previousX;
    const dy = playerY - previousY;
    const distanceMoved = Math.hypot(dx, dy);
    controller.lastScanAt = now;
    controller.lastX = playerX;
    controller.lastY = playerY;

    if (!controller.initialized) {
      controller.initialized = true;
      return;
    }

    const nextInside = new Set();
    const playerRadius = Math.max(8, Number(game.player.r) || 18);
    const nearbyCells = new Set();
    for (const [sampleX, sampleY] of [[previousX, previousY], [playerX, playerY]]) {
      const cellX = Math.floor(sampleX / CELL_SIZE);
      const cellY = Math.floor(sampleY / CELL_SIZE);
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) nearbyCells.add(`${cellX + offsetX}:${cellY + offsetY}`);
      }
    }

    const visited = new Set();
    for (const key of nearbyCells) {
      const bucket = controller.grid.get(key);
      if (!bucket) continue;
      for (const entry of bucket) {
        const object = entry.object;
        if (visited.has(object)) continue;
        visited.add(object);
        const reach = entry.profile.radius + playerRadius;
        const ox = playerX - Number(object.x || 0);
        const oy = playerY - Number(object.y || 0);
        const currentDistanceSq = ox * ox + oy * oy;
        if (currentDistanceSq <= reach * reach) nextInside.add(object);

        const sweptDistanceSq = distanceSqToSegment(
          Number(object.x || 0), Number(object.y || 0), previousX, previousY, playerX, playerY
        );
        if (sweptDistanceSq > reach * reach) continue;

        if (distanceMoved < .45 || controller.inside.has(object)) continue;
        if (now < (controller.cooldown.get(object) || -Infinity)) continue;

        const intensity = Math.max(.72, Math.min(1, distanceMoved / 9));
        const motionScale = REDUCED_MOTION.matches ? .35 : 1;
        const duration = entry.profile.duration * (.96 + ((Number(object.phase) || 0) % 1) * .08);
        controller.active.set(object, {
          startedAt:now,
          duration,
          amplitude:entry.profile.amplitude * intensity * motionScale,
          compression:entry.profile.compression * intensity * motionScale,
          direction:leanDirection(object, dx, playerX),
          profile:entry.profile
        });
        controller.cooldown.set(object, now + duration + .22);
      }
    }

    controller.inside = nextInside;
  }

  const previousUpdate = proto.update;
  proto.update = function updateV097(dt){
    const result = previousUpdate.call(this, dt);
    updateFoliage(this);
    return result;
  };

  const previousDrawObstacle = proto.drawObstacle;
  proto.drawObstacle = function drawObstacleV097(context, object){
    const controller = this.__v097Foliage;
    const state = controller?.active?.get(object);
    if (!state) return previousDrawObstacle.call(this, context, object);

    const progress = (seconds(this) - state.startedAt) / state.duration;
    if (progress >= 1 || progress < 0) {
      controller.active.delete(object);
      return previousDrawObstacle.call(this, context, object);
    }

    const value = motionValue(progress);
    const settle = Math.sin(Math.PI * Math.min(1, progress / .78)) * (1 - progress * .45);
    const angle = state.direction * state.amplitude * value;
    const scaleY = 1 - state.compression * settle;
    const scaleX = 1 + state.compression * .32 * settle;
    const pivotY = Number(object.y || 0) + state.profile.drawH * (1 - state.profile.anchor);

    context.save();
    context.translate(Number(object.x) || 0, pivotY);
    context.rotate(angle);
    context.scale(scaleX, scaleY);
    context.translate(-(Number(object.x) || 0), -pivotY);
    try {
      return previousDrawObstacle.call(this, context, object);
    } finally {
      context.restore();
    }
  };

  window.CHERRIFT_REACTIVE_FOLIAGE = Object.freeze({
    version:VERSION,
    cellSize:CELL_SIZE,
    isReactive:object => !!profileFor(object),
    inspect(game){
      const controller = game ? controllerFor(game) : null;
      return controller ? {indexed:[...controller.grid.values()].reduce((sum,bucket)=>sum+bucket.length,0),active:controller.active.size,revision:controller.revision} : null;
    },
    refresh(game){
      if (!game) return false;
      buildController(game);
      return true;
    }
  });

  console.info(`[CHERRIFT v${VERSION}] Shared game UI and spatially indexed reactive foliage loaded.`);
})();
