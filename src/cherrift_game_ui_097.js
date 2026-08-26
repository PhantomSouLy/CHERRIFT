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



  function installUiStyleRound2(){
    if (document.getElementById("cherriftGameUi097Round2Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftGameUi097Round2Css";
    style.textContent = `
      /* Round 2 — obtained system, start prompt, equipment, profile, title panels, skill tree polish. */
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083{
        padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;outline:none!important;
        color:rgba(255,245,250,.68)!important;font:800 14px/1.2 system-ui,sans-serif!important;letter-spacing:.03em!important;text-transform:none!important
      }
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083:hover,
      .reward-overlay-v083 #rewardContinueV083.reward-continue-v083:focus-visible{color:rgba(255,245,250,.86)!important;text-decoration:underline!important}

      .cr-start-prompt-v0972{
        white-space:nowrap!important;text-wrap:nowrap!important;
        font-size:clamp(16px,4vw,22px)!important;letter-spacing:.03em!important;
      }

      .cr-equip-page-v0972 .cr-equip-card-v0972,
      .cr-equip-page-v0972 .cr-equip-card-v0972 *{filter:none!important;opacity:1!important}
      .cr-equip-page-v0972 .cr-equip-card-v0972{mix-blend-mode:normal!important}
      .cr-equip-page-v0972 .cr-equip-card-v0972 img,
      .cr-equip-page-v0972 .cr-equip-card-v0972 canvas,
      .cr-equip-page-v0972 .cr-equip-card-v0972 svg{filter:none!important;opacity:1!important;saturate:1!important}
      .cr-equip-page-v0972 .cr-equip-dim-v0972{display:none!important}

      .cr-profile-header-v0972{display:grid!important;grid-template-columns:92px minmax(0,1fr)!important;gap:14px!important;align-items:start!important}
      .cr-profile-avatar-wrap-v0972{display:grid!important;justify-items:center!important;gap:8px!important}
      .cr-profile-avatar-wrap-v0972 .prebeta-avatar,
      .cr-profile-avatar-wrap-v0972 .cr-profile-avatar-v0972{width:88px!important;height:88px!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:22px!important}
      .cr-profile-avatar-wrap-v0972 img{width:100%!important;height:100%!important;object-fit:cover!important}
      .cr-profile-main-v0972{min-width:0!important;display:grid!important;gap:5px!important}
      .cr-profile-kicker-v0972{margin:0!important;color:var(--cr-muted,#d2afc1)!important;font:900 10px/1 system-ui!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .cr-profile-active-title-v0972{margin:0!important;color:var(--cr-primary,#e45b9b)!important;font:800 22px/1.05 Georgia,"Times New Roman",serif!important}
      .cr-profile-display-row-v0972{display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important}
      .cr-profile-display-row-v0972 h3{margin:0!important;min-width:0!important;overflow-wrap:anywhere!important;color:inherit!important;font:800 clamp(28px,6vw,44px)/1 Georgia,"Times New Roman",serif!important}
      .cr-profile-edit-name-v0972,
      .cr-title-button-v0972,
      .cr-title-filter-v0972,
      .cr-title-footer-v0972 button,
      .cr-title-modal-v0972 button,
      .cr-title-stats-v0972 button{
        border:1px solid rgba(255,203,228,.25)!important;border-radius:12px!important;
        background:rgba(255,255,255,.05)!important;color:var(--cr-text,#fff5fa)!important
      }
      .cr-profile-edit-name-v0972{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;font-size:16px!important}
      .cr-profile-username-v0972{margin:0!important;color:var(--cr-muted,#d2afc1)!important;font:700 13px/1.45 system-ui!important}
      .cr-title-button-v0972{min-width:76px!important;min-height:34px!important;padding:6px 10px!important;font:800 12px/1 system-ui!important}
      .cr-profile-hide-v0972{display:none!important}

      .cr-title-modal-v0972,
      .cr-title-stats-v0972{
        position:fixed!important;z-index:2147483645!important;inset:0!important;
        display:grid!important;place-items:center!important;padding:14px!important;
        background:rgba(8,4,14,.58)!important;backdrop-filter:blur(8px)!important
      }
      .cr-title-modal-v0972[hidden],
      .cr-title-stats-v0972[hidden]{display:none!important}
      .cr-title-shell-v0972{
        width:min(560px,100%)!important;max-height:min(86dvh,760px)!important;display:grid!important;
        grid-template-rows:auto auto minmax(0,1fr) auto!important;overflow:hidden!important;
        border:1px solid rgba(255,203,228,.25)!important;border-radius:20px!important;background:rgba(24,10,22,.96)!important;
        box-shadow:0 26px 72px rgba(0,0,0,.52)!important
      }
      .cr-title-head-v0972{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:16px 16px 10px!important}
      .cr-title-head-v0972 h3{margin:0!important;color:inherit!important;font:800 28px/1.05 Georgia,"Times New Roman",serif!important}
      .cr-title-close-v0972{width:36px!important;height:36px!important;min-width:36px!important;padding:0!important}
      .cr-title-controls-v0972{padding:0 16px 10px!important;display:flex!important;justify-content:space-between!important;align-items:center!important;gap:12px!important}
      .cr-title-filter-v0972{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:8px 10px!important;font:800 12px/1 system-ui!important}
      .cr-title-filter-v0972 input{accent-color:#e45b9b!important}
      .cr-title-list-v0972{overflow:auto!important;padding:0 16px 14px!important;display:grid!important;gap:9px!important;align-content:start!important}
      .cr-title-row-v0972{padding:12px!important;border:1px solid rgba(255,203,228,.16)!important;border-radius:14px!important;background:rgba(255,255,255,.03)!important;color:inherit!important;text-align:left!important}
      .cr-title-row-v0972.active{border-color:color-mix(in srgb,var(--cr-primary,#e45b9b) 68%,rgba(255,255,255,.28))!important;box-shadow:0 0 0 2px rgba(228,91,155,.14)!important}
      .cr-title-row-v0972 small{display:block!important;margin-bottom:5px!important;color:var(--cr-muted,#d2afc1)!important;font:900 10px/1 system-ui!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .cr-title-row-v0972 b{display:block!important;color:inherit!important;font-size:22px!important;line-height:1.08!important}
      .cr-title-row-v0972 p{margin:4px 0 0!important;color:var(--cr-muted,#d2afc1)!important;font:700 12px/1.4 system-ui!important}
      .cr-title-footer-v0972{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;padding:12px 16px 16px!important;border-top:1px solid rgba(255,203,228,.12)!important;background:rgba(9,4,14,.62)!important}
      .cr-title-footer-v0972 button{min-height:42px!important;padding:0 12px!important;font:800 13px/1 system-ui!important}

      .cr-title-stats-body-v0972{overflow:auto!important;padding:0 16px 16px!important;display:grid!important;gap:10px!important}
      .cr-title-stat-card-v0972{padding:12px!important;border:1px solid rgba(255,203,228,.16)!important;border-radius:14px!important;background:rgba(255,255,255,.03)!important}
      .cr-title-stat-card-v0972 small{display:block!important;margin-bottom:5px!important;color:var(--cr-muted,#d2afc1)!important;font:900 10px/1 system-ui!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .cr-title-stat-card-v0972 b{display:block!important;font-size:18px!important;line-height:1.1!important}
      .cr-title-stat-card-v0972 ul{margin:6px 0 0!important;padding-left:18px!important;color:var(--cr-muted,#d2afc1)!important;font:700 12px/1.45 system-ui!important}
      .cr-title-summary-v0972{padding:12px!important;border:1px solid rgba(255,203,228,.2)!important;border-radius:14px!important;background:rgba(255,255,255,.04)!important}
      .cr-title-summary-v0972 h4{margin:0 0 8px!important;font-size:16px!important}
      .cr-title-summary-v0972 p,.cr-title-summary-v0972 li{color:var(--cr-muted,#d2afc1)!important;font:700 12px/1.45 system-ui!important}

      .cr-skill-inline-row-v0972{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
      .cr-skill-inline-row-v0972 > *{min-height:0!important}
      .cr-er-icononly-v0972{display:grid!important;place-items:center!important;min-width:62px!important;min-height:62px!important;padding:8px!important}
      .cr-er-icononly-v0972 img{width:34px!important;height:34px!important;object-fit:contain!important}
      .cr-er-icononly-v0972 .cr-er-text-v0972{display:none!important}
      .cr-player-node-v0972{position:relative!important}
      .cr-player-node-v0972 + .cr-player-node-v0972::before{content:"";position:absolute;left:38px;top:-15px;width:2px;height:16px;background:rgba(255,161,204,.36)!important}
      .cr-player-node-v0972[data-v0972-locked="1"]{opacity:.72!important}
      .cr-player-node-v0972[data-v0972-locked="1"] [data-v0972-upgrade-plus]{filter:grayscale(.15)!important}
      .cr-player-node-v0972 .cr-lock-note-v0972{margin-top:6px!important;color:#efb0cf!important;font:800 10px/1.3 system-ui!important}

      @media(max-width:820px){
        .cr-profile-header-v0972{grid-template-columns:82px minmax(0,1fr)!important;gap:12px!important}
        .cr-profile-avatar-wrap-v0972 .prebeta-avatar,
        .cr-profile-avatar-wrap-v0972 .cr-profile-avatar-v0972{width:78px!important;height:78px!important}
        .cr-profile-active-title-v0972{font-size:18px!important}
        .cr-title-head-v0972 h3{font-size:24px!important}
        .cr-title-row-v0972 b{font-size:19px!important}
        .cr-skill-inline-row-v0972{grid-template-columns:1fr 1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function persistSave(save){
    try { if (window.CherriftStorage?.save) window.CherriftStorage.save(save); } catch (_) {}
    if (window.UI) window.UI.save = save;
    try { window.UI?.refreshMenu?.(); } catch (_) {}
  }

  function sectionByHeading(pattern){
    const matcher = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i');
    const heading = qa('h1,h2,h3,h4,strong,b').find(node => matcher.test(clean(node.textContent)));
    if (!heading) return null;
    return heading.closest('section,article,main,div') || heading.parentElement || null;
  }

  function isLeaf(node){ return !!node && !node.children?.length; }
  function onlyText(node){ return clean(node?.textContent); }
  function slug(value){ return clean(value).toLowerCase().replace(/[^a-z0-9áéíóöőúüű]+/gi,'-').replace(/^-+|-+$/g,'') || 'title'; }

  function armRewardGate(reason){ uiState.rewardGateUntil = Date.now() + 7000; uiState.rewardGateReason = reason || ''; }
  function rewardGateOpen(){ return Number(uiState.rewardGateUntil || 0) > Date.now(); }
  function clearRewardGate(){ uiState.rewardGateUntil = 0; uiState.rewardGateReason = ''; }

  function shouldArmRewardGate(target){
    if (!target) return false;
    const text = lower(`${target.textContent || ''} ${target.getAttribute?.('aria-label') || ''}`);
    const id = lower(`${target.id || ''} ${target.className || ''}`);
    const data = lower(JSON.stringify(target.dataset || {}));
    if (/felszerel|equip|play|játék|start|resume|vissza|back|inventory|tárgylista|gear|bag|mailbox/.test(text + ' ' + id + ' ' + data)) return false;
    return /claim|átvét|collect|redeem|kupon|coupon|vásárl|buy|purchase|shop|reward|jutalom|daily|weekly|heti|napi|login|event|mail|gacha|draw|spin|chest|láda/.test(text + ' ' + id + ' ' + data)
      || target.matches?.('[data-v082-claim-weekly],[data-v080-open-chest],[data-claim],[data-redeem],[data-buy],[data-reward],[data-shop-buy]');
  }

  function suppressOverlay(overlay){
    if (!overlay || overlay.dataset.v0972Suppressed === '1') return;
    overlay.dataset.v0972Suppressed = '1';
    overlay.remove();
  }

  function decorateRewardOverlayRound2(root=document){
    qa('.reward-overlay-v083', root).forEach(overlay => {
      const claim = q('#rewardContinueV083', overlay) || q('.reward-continue-v083', overlay) || qa('button', overlay).find(button => /claim|átvét|érintsd|kattints|continue/i.test(clean(button.textContent)));
      if (claim) {
        claim.textContent = isPhoneUi() ? 'Tap to claim' : 'Click to claim';
        claim.setAttribute('aria-label', claim.textContent);
        claim.classList.add('cr-plain-claim-v0972');
      }
      if (overlay.dataset.v0972Allowed === '1') return;
      if (!rewardGateOpen()) { suppressOverlay(overlay); return; }
      overlay.dataset.v0972Allowed = '1';
      clearRewardGate();
    });
  }

  function reconcileStartPrompt(){
    const desired = isPhoneUi() ? 'Tap here to start' : 'Click here to start';
    qa('body *').filter(isLeaf).forEach(node => {
      const text = onlyText(node);
      if (!text) return;
      if (!/(kattints\s+a\s+kezdéshez|click\s+here\s+to\s+start|tap\s+here\s+to\s+start|click\s+to\s+start|tap\s+to\s+start)/i.test(text)) return;
      node.textContent = desired;
      node.classList.add('cr-start-prompt-v0972');
      const parent = node.parentElement;
      if (parent) {
        qa(':scope > *', parent).forEach(sibling => {
          if (sibling === node) return;
          if (!isLeaf(sibling)) return;
          if (/^[•·.◆◇◈◊⟡✦]+$/.test(clean(sibling.textContent))) sibling.remove();
        });
      }
    });
  }

  function reconcileEquipmentPage(){
    const root = sectionByHeading(/^(felszerelés|equipment)$/i);
    if (!root) return;
    root.classList.add('cr-equip-page-v0972');
    qa('button,article,li,div', root).forEach(card => {
      const text = lower(card.textContent);
      if (!(q('img,canvas,svg', card) || /lv\.?\s*\d/.test(text))) return;
      card.classList.add('cr-equip-card-v0972');
      if (/overlay|shade|dimm|disabled|lock|grey|gray/.test(card.className)) card.classList.add('cr-equip-dim-v0972');
      card.style.filter = 'none';
      card.style.opacity = '1';
    });
    qa('img,canvas,svg', root).forEach(media => { media.style.filter = 'none'; media.style.opacity = '1'; });
  }

  function authAccount(){
    return window.CHERRIFT_AUTH?.getState?.().account || window.UI?.save?.accountInfo || {};
  }

  function profileData(){
    const save = window.UI?.save || {};
    const profile = save.profile || {};
    const account = authAccount();
    const discord = clean(profile.discordUsername || profile.username || account.username || account.global_name || account.display_name || account.name || profile.discordName || '');
    const displayName = clean(profile.displayName || profile.display_name || profile.nickname || save.displayName || discord || profile.name || 'Cherry Player');
    const activeTitleName = clean(profile.activeTitleName || profile.title || profile.equippedTitleName || profile.currentTitle || '');
    const activeTitleId = clean(profile.activeTitleId || profile.titleId || profile.equippedTitleId || '');
    return {save, profile, account, discord, displayName, activeTitleName, activeTitleId};
  }

  function titleStatsFromObject(source){
    const stats = [];
    if (!source || typeof source !== 'object') return stats;
    const maybe = source.stats || source.bonus || source.bonuses || source.effects || source.effect;
    if (Array.isArray(maybe)) {
      maybe.forEach(entry => { const text = clean(typeof entry === 'string' ? entry : `${entry?.name || entry?.stat || ''} ${entry?.value ?? ''}`); if (text) stats.push(text); });
      return stats;
    }
    if (maybe && typeof maybe === 'object') {
      Object.entries(maybe).forEach(([key, value]) => {
        if (value == null || value === '' || Number(value) === 0) return;
        const label = key.replace(/([A-Z])/g,' $1').replace(/[_-]+/g,' ').trim();
        stats.push(`${label}: ${value}`);
      });
    }
    return stats;
  }

  function collectTitles(profileRoot){
    const {save, profile, activeTitleName, activeTitleId} = profileData();
    const map = new Map();
    const add = (entry, defaults={}) => {
      if (!entry) return;
      let item = null;
      if (typeof entry === 'string') item = {id:slug(entry), name:clean(entry), owned:true};
      else if (typeof entry === 'object') {
        const name = clean(entry.name || entry.title || entry.label || entry.id || entry.key || '');
        if (!name) return;
        item = {
          id: clean(entry.id || entry.key || slug(name)),
          name,
          rarity: clean(entry.rarity || entry.tier || defaults.rarity || ''),
          owned: entry.owned != null ? !!entry.owned : defaults.owned != null ? defaults.owned : true,
          stats: titleStatsFromObject(entry),
          raw: entry
        };
      }
      if (!item?.name) return;
      const key = item.id || slug(item.name);
      const prior = map.get(key) || {id:key, name:item.name, rarity:'', owned:false, stats:[]};
      const merged = {
        ...prior,
        ...item,
        rarity: item.rarity || prior.rarity,
        owned: item.owned || prior.owned,
        stats: [...new Set([...(prior.stats || []), ...(item.stats || [])])]
      };
      map.set(key, merged);
    };

    [save.titles, save.titleCollection, save.unlockedTitles, save.ownedTitles, profile.titles, profile.titleCollection, profile.unlockedTitles, profile.ownedTitles].forEach(source => {
      if (Array.isArray(source)) source.forEach(entry => add(entry, {owned:true}));
    });

    const section = qa('h1,h2,h3,h4,strong,b').find(node => /title\s*gyűjtemény|title\s*collection/i.test(clean(node.textContent)))?.closest('section,article,div');
    if (section) {
      qa('button,article,div', section).forEach(row => {
        const text = clean(row.textContent);
        if (!text || /title\s*gyűjtemény|title\s*collection|ikonkeretek|owned|title stats|equip|bezár/i.test(text)) return;
        const rarityMatch = text.match(/(Gyakori|Ritka|Epikus|Legendary|Legendás|Common|Rare|Epic|Uncommon)/i);
        if (!rarityMatch) return;
        const rarity = clean(rarityMatch[1]);
        const name = clean(text.replace(rarityMatch[0], '').split(/\s{2,}/)[0]);
        if (!name || name.length > 60) return;
        add({id:slug(name), name, rarity, owned:true});
      });
    }

    if (activeTitleName) add({id:activeTitleId || slug(activeTitleName), name:activeTitleName, owned:true});
    const list = [...map.values()];
    list.sort((a,b) => a.name.localeCompare(b.name, 'hu'));
    return list;
  }

  function activeTitle(titles){
    const {activeTitleName, activeTitleId} = profileData();
    return titles.find(title => title.id === activeTitleId) || titles.find(title => lower(title.name) === lower(activeTitleName)) || titles[0] || {id:'', name:activeTitleName || '—', owned:true, stats:[]};
  }

  function setDisplayName(nextValue){
    const {save} = profileData();
    save.profile ||= {};
    const value = clean(nextValue).slice(0, 28);
    if (!value) return;
    save.profile.displayName = value;
    save.profile.display_name = value;
    persistSave(save);
    scheduleUiReconcile();
  }

  function setEquippedTitle(title){
    if (!title) return;
    const {save} = profileData();
    save.profile ||= {};
    save.profile.activeTitleId = title.id;
    save.profile.titleId = title.id;
    save.profile.activeTitleName = title.name;
    save.profile.title = title.name;
    persistSave(save);
    scheduleUiReconcile();
  }

  function titlePanelState(){
    uiState.titleState ||= {open:false, ownedOnly:false, selectedId:''};
    return uiState.titleState;
  }

  function closeTitleModal(){ q('#crTitleModalV0972')?.setAttribute('hidden',''); }
  function closeTitleStats(){ q('#crTitleStatsV0972')?.setAttribute('hidden',''); }

  function renderTitleStats(profileRoot){
    const titles = collectTitles(profileRoot);
    let modal = q('#crTitleStatsV0972');
    if (!modal) {
      modal = document.createElement('section');
      modal.id = 'crTitleStatsV0972';
      modal.className = 'cr-title-stats-v0972';
      document.body.appendChild(modal);
    }
    const total = new Map();
    titles.filter(title => title.owned).forEach(title => (title.stats || []).forEach(stat => total.set(stat, (total.get(stat) || 0) + 1)));
    modal.innerHTML = `<div class="cr-title-shell-v0972">
      <div class="cr-title-head-v0972"><h3>${esc(copy('Title statok','Title stats'))}</h3><button type="button" class="cr-title-close-v0972" data-v0972-title-close>×</button></div>
      <div class="cr-title-stats-body-v0972">
        ${titles.map(title => `<article class="cr-title-stat-card-v0972"><small>${esc(title.owned ? copy('Megszerzett','Owned') : copy('Elérhető','Available'))}${title.rarity ? ` · ${esc(title.rarity)}` : ''}</small><b>${esc(title.name)}</b><ul>${(title.stats?.length ? title.stats : [copy('Nincs külön stat bónusz feltüntetve.','No dedicated stat bonus listed.')]).map(stat => `<li>${esc(stat)}</li>`).join('')}</ul></article>`).join('')}
        <section class="cr-title-summary-v0972"><h4>${esc(copy('Összesített title bónuszok','Combined title bonuses'))}</h4>${total.size ? `<ul>${[...total.entries()].map(([stat,count]) => `<li>${esc(stat)}${count > 1 ? ` ×${count}` : ''}</li>`).join('')}</ul>` : `<p>${esc(copy('Még nincs összesíthető title stat.','There are no title stats to summarize yet.'))}</p>`}</section>
      </div>
      <div class="cr-title-footer-v0972" style="grid-template-columns:1fr!important"><button type="button" data-v0972-title-close>${esc(copy('Bezárás','Close'))}</button></div>
    </div>`;
    modal.removeAttribute('hidden');
  }

  function renderTitleModal(profileRoot){
    const titles = collectTitles(profileRoot);
    const state = titlePanelState();
    if (!state.selectedId && titles[0]) state.selectedId = activeTitle(titles).id || titles[0].id;
    const visibleTitles = state.ownedOnly ? titles.filter(title => title.owned) : titles;
    let modal = q('#crTitleModalV0972');
    if (!modal) {
      modal = document.createElement('section');
      modal.id = 'crTitleModalV0972';
      modal.className = 'cr-title-modal-v0972';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="cr-title-shell-v0972">
      <div class="cr-title-head-v0972"><h3>${esc(copy('Title','Title'))}</h3><button type="button" class="cr-title-close-v0972" data-v0972-title-close>×</button></div>
      <div class="cr-title-controls-v0972"><label class="cr-title-filter-v0972"><input type="checkbox" data-v0972-title-owned ${state.ownedOnly ? 'checked' : ''}> ${esc(copy('Owned','Owned'))}</label><span style="color:var(--cr-muted,#d2afc1);font:800 11px/1 system-ui">${visibleTitles.length}/${titles.length}</span></div>
      <div class="cr-title-list-v0972">${visibleTitles.map(title => `<button type="button" class="cr-title-row-v0972 ${title.id === state.selectedId ? 'active' : ''}" data-v0972-title-pick="${esc(title.id)}"><small>${esc(title.rarity || (title.owned ? copy('Megszerzett','Owned') : copy('Elérhető','Available')))}</small><b>${esc(title.name)}</b><p>${esc((title.stats && title.stats[0]) || (title.owned ? copy('Megszerzett title','Owned title') : copy('Még nincs megszerezve','Not owned yet')))}</p></button>`).join('')}</div>
      <div class="cr-title-footer-v0972"><button type="button" data-v0972-title-stats>${esc(copy('Title statok','Title stats'))}</button><button type="button" data-v0972-title-equip>${esc(copy('Felszerel','Equip'))}</button></div>
    </div>`;
    modal.removeAttribute('hidden');
  }

  function reconcileProfilePage(){
    const heading = qa('h1,h2,h3').find(node => /^(profil|profile)$/i.test(clean(node.textContent)));
    if (!heading) return;
    const root = heading.closest('section,article,main,div')?.parentElement || heading.closest('section,article,main,div');
    if (!root) return;
    const {discord, displayName} = profileData();
    const titles = collectTitles(root);
    const active = activeTitle(titles);
    const statButton = qa('button', root).find(button => /stat\s*részletek|stat\s*details/i.test(clean(button.textContent)));
    const card = statButton?.closest('section,article,div') || qa('section,article,div', root).find(node => q('.prebeta-avatar,img', node) && /stat\s*részletek|stat\s*details/i.test(clean(node.textContent)));
    if (card && !card.dataset.v0972ProfileReady) {
      const avatar = q('.prebeta-avatar', card) || q('img', card)?.closest('span,div') || q('img', card);
      const actionButton = statButton?.cloneNode(true) || document.createElement('button');
      if (!statButton) { actionButton.textContent = copy('Stat részletek','Stat details'); }
      actionButton.className = statButton?.className || 'menu-btn primary';
      actionButton.removeAttribute('id');
      card.innerHTML = `
        <div class="cr-profile-header-v0972">
          <div class="cr-profile-avatar-wrap-v0972">
            <div class="cr-profile-avatar-v0972"></div>
            <button type="button" class="cr-title-button-v0972" data-v0972-open-title>${esc(copy('Title','Title'))}</button>
          </div>
          <div class="cr-profile-main-v0972">
            <p class="cr-profile-kicker-v0972">${esc(copy('Aktív Title','Active Title'))}</p>
            <p class="cr-profile-active-title-v0972">${esc(active.name || '—')}</p>
            <div class="cr-profile-display-row-v0972"><h3>${esc(displayName)}</h3><button type="button" class="cr-profile-edit-name-v0972" data-v0972-edit-name aria-label="${esc(copy('Display name szerkesztése','Edit display name'))}">✎</button></div>
            <p class="cr-profile-username-v0972">${esc(copy('Username','Username'))}: ${esc(discord || displayName)}</p>
          </div>
        </div>`;
      q('.cr-profile-avatar-v0972', card)?.appendChild(avatar ? avatar.cloneNode(true) : document.createTextNode(''));
      card.appendChild(actionButton);
      card.dataset.v0972ProfileReady = '1';
    } else if (card) {
      const titleNode = q('.cr-profile-active-title-v0972', card);
      const nameNode = q('.cr-profile-display-row-v0972 h3', card);
      const userNode = q('.cr-profile-username-v0972', card);
      if (titleNode) titleNode.textContent = active.name || '—';
      if (nameNode) nameNode.textContent = displayName;
      if (userNode) userNode.textContent = `${copy('Username','Username')}: ${discord || displayName}`;
    }

    const titleSectionHeading = qa('h1,h2,h3,h4,strong,b', root).find(node => /title\s*gyűjtemény|title\s*collection/i.test(clean(node.textContent)));
    titleSectionHeading?.closest('section,article,div')?.classList.add('cr-profile-hide-v0972');

    qa('p,b,strong,span,div', card || root).forEach(node => {
      if (!isLeaf(node)) return;
      const text = clean(node.textContent);
      if (!text) return;
      if (active.name && lower(text) === lower(active.name) && !node.classList.contains('cr-profile-active-title-v0972')) node.classList.add('cr-profile-hide-v0972');
    });
  }

  function isGm(){
    const save = window.UI?.save || {};
    const profile = save.profile || {};
    const account = save.account || {};
    return !!(save.isGM || save.gm || save.gmMode || profile.isGM || profile.gm || account.isGM || account.gm || save.titles?.includes?.('GM') || save.role === 'GM');
  }

  function scoreProgress(text){
    const match = clean(text).match(/szint\s*(\d+)\s*\/?\s*(\d+)/i);
    if (!match) return null;
    return {current:Number(match[1]), max:Number(match[2])};
  }

  function reconcileSkillTree(){
    const root = sectionByHeading(/skill\s*tree/i);
    if (!root) return;
    const resonanceActive = qa('button,div,p,h1,h2,h3,b,strong', root).some(node => /^(Blaze|Tidecall|Stoneveil|Windborne|Celestial|Abyssal)(\s+Resonance\s+ág)?$/i.test(clean(node.textContent))) || /resonance\s*ág/i.test(clean(root.textContent));
    const playerUpgradeActive = !resonanceActive && /player\s*upgrade/i.test(clean(root.textContent)) && qa('section,article,div', root).some(card => /szint\s*\d+\s*\/\s*\d+/i.test(clean(card.textContent)));

    qa('button,div,article', root).forEach(node => {
      const text = clean(node.textContent);
      if (!text) return;
      if (resonanceActive && /^(támadás|védelem|hasznosság|attack|defense|utility)$/i.test(text)) node.classList.add('cr-profile-hide-v0972');
    });

    if (!isGm()) {
      qa('p,small,div,span', root).forEach(node => {
        if (/ideiglenes\s*gm\s*tesztmód|temporary\s*gm/i.test(clean(node.textContent))) node.classList.add('cr-profile-hide-v0972');
      });
    }

    const pointsCard = qa('div,article,section,button', root).find(node => /gm\s*tesztpont|elérhető\s*skill\s*point|available\s*skill\s*point/i.test(clean(node.textContent)));
    const resetCard = qa('div,article,section,button', root).find(node => /ágak\s*visszaállítása|skill\s*tree\s*reset|reset/i.test(clean(node.textContent)) && node !== pointsCard);
    if (pointsCard && resetCard && pointsCard.parentElement && resetCard.parentElement) {
      let row = q('.cr-skill-inline-row-v0972', root);
      if (!row) {
        row = document.createElement('div');
        row.className = 'cr-skill-inline-row-v0972';
        pointsCard.parentElement.insertBefore(row, pointsCard);
      }
      if (pointsCard.parentElement !== row) row.appendChild(pointsCard);
      if (resetCard.parentElement !== row) row.appendChild(resetCard);
    }

    qa('button,div', root).forEach(button => {
      const text = clean(button.textContent);
      const match = text.match(/^(Blaze|Tidecall|Stoneveil|Windborne|Celestial|Abyssal)\b/i);
      if (!match) return;
      const key = lower(match[1]);
      const element = ELEMENTS[key];
      if (!element) return;
      button.classList.add('cr-er-icononly-v0972');
      button.title = match[1];
      if (!button.dataset.v0972IconOnly) {
        button.dataset.v0972IconOnly = '1';
        button.innerHTML = `<img src="${esc(element.icon)}" alt="${esc(match[1])}"><span class="cr-er-text-v0972">${esc(match[1])}</span>`;
      }
    });

    qa('h1,h2,h3,b,strong,div,p', root).forEach(node => {
      if (!isLeaf(node)) return;
      const text = clean(node.textContent);
      const match = text.match(/^(Blaze|Tidecall|Stoneveil|Windborne|Celestial|Abyssal)\s+Resonance\s+ág$/i);
      if (match) node.textContent = match[1];
    });

    if (playerUpgradeActive) {
      const cards = qa('section,article,div', root).filter(card => scoreProgress(card.textContent) && q('button', card));
      const ordered = [...new Set(cards)].filter(card => q('button', card) && /szint\s*\d+\s*\/\s*\d+/i.test(clean(card.textContent)));
      let firstOpenFound = false;
      ordered.forEach((card, index) => {
        card.classList.add('cr-player-node-v0972');
        const progress = scoreProgress(card.textContent) || {current:0,max:1};
        const plus = qa('button', card).reverse().find(button => /^[+＋]$/.test(clean(button.textContent)) || /add|plus/.test(button.className));
        if (plus) plus.dataset.v0972UpgradePlus = '1';
        const priorComplete = ordered.slice(0, index).every(prev => {
          const p = scoreProgress(prev.textContent); return p ? p.current >= p.max : true;
        });
        const lockedBySequence = !priorComplete;
        const maxed = progress.current >= progress.max;
        const levelGate = /szükséges\s*szint/i.test(clean(card.textContent));
        const shouldLock = lockedBySequence || maxed || levelGate;
        if (plus) {
          plus.disabled = shouldLock;
          plus.setAttribute('aria-disabled', shouldLock ? 'true' : 'false');
          if (!shouldLock && !firstOpenFound) firstOpenFound = true;
        }
        card.dataset.v0972Locked = lockedBySequence ? '1' : '0';
        q('.cr-lock-note-v0972', card)?.remove();
        if (lockedBySequence) {
          const note = document.createElement('div');
          note.className = 'cr-lock-note-v0972';
          note.textContent = copy('Az előző node kimaxolása szükséges.','Finish the previous node first.');
          card.appendChild(note);
        }
      });
    }
  }

  function reconcileUiRound2(){
    installUiStyleRound2();
    decorateRewardOverlayRound2();
    reconcileStartPrompt();
    reconcileEquipmentPage();
    reconcileProfilePage();
    reconcileSkillTree();
  }

  function bindUiRound2(){
    if (uiState.round2Bound) return;
    uiState.round2Bound = true;
    document.addEventListener('click', event => {
      const target = event.target?.closest?.('button,a,label,input');
      if (target && shouldArmRewardGate(target)) armRewardGate(clean(target.textContent) || target.id || 'reward');
      if (target?.matches?.('[data-v0972-open-title]')) {
        event.preventDefault();
        renderTitleModal(sectionByHeading(/^(profil|profile)$/i));
        return;
      }
      if (target?.matches?.('[data-v0972-title-close]')) {
        event.preventDefault();
        closeTitleModal();
        closeTitleStats();
        return;
      }
      if (target?.matches?.('[data-v0972-edit-name]')) {
        event.preventDefault();
        const current = profileData().displayName;
        const next = prompt(copy('Add meg a display name-et','Set display name'), current);
        if (next != null) setDisplayName(next);
        return;
      }
      if (target?.matches?.('[data-v0972-title-pick]')) {
        event.preventDefault();
        titlePanelState().selectedId = target.dataset.v0972TitlePick;
        renderTitleModal(sectionByHeading(/^(profil|profile)$/i));
        return;
      }
      if (target?.matches?.('[data-v0972-title-stats]')) {
        event.preventDefault();
        renderTitleStats(sectionByHeading(/^(profil|profile)$/i));
        return;
      }
      if (target?.matches?.('[data-v0972-title-equip]')) {
        event.preventDefault();
        const titles = collectTitles(sectionByHeading(/^(profil|profile)$/i));
        const picked = titles.find(title => title.id === titlePanelState().selectedId) || titles[0];
        if (picked) setEquippedTitle(picked);
        closeTitleModal();
        return;
      }
      if (target?.matches?.('[data-v0972-title-owned]')) {
        titlePanelState().ownedOnly = !!target.checked;
        renderTitleModal(sectionByHeading(/^(profil|profile)$/i));
        return;
      }
    }, true);


    document.addEventListener('change', event => {
      const owned = event.target?.closest?.('[data-v0972-title-owned]') || (event.target?.matches?.('[data-v0972-title-owned]') ? event.target : null);
      if (owned) {
        titlePanelState().ownedOnly = !!owned.checked;
        renderTitleModal(sectionByHeading(/^(profil|profile)$/i));
      }
    }, true);

    if (typeof MutationObserver === 'function' && document.body) {
      const observer = new MutationObserver(() => scheduleUiReconcile());
      observer.observe(document.body, {subtree:true, childList:true, characterData:true});
      uiState.round2Observer = observer;
    }
  }


  function reconcileUi(){
    installUiStyle();
    decorateRewardOverlay();
    fixLobbyFrame();
    reconcileSkinSelector();
    reconcileUiRound2();
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
    installUiStyleRound2();
    bindUi();
    bindUiRound2();
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
