(() => {
  "use strict";

  if (window.__CHERRIFT_SKIN_UI__) return;
  window.__CHERRIFT_SKIN_UI__ = true;

  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const lower = value => clean(value).toLocaleLowerCase("hu");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[character]);
  const language = () => (
    window.CHERRIFT_I18N?.language === "en" ||
    window.UI?.save?.settings?.language === "en"
  ) ? "en" : "hu";
  const copy = (hu, en) => language() === "en" ? en : hu;

  const RARITY_COLORS = Object.freeze({
    common:"#f4e8ef",
    uncommon:"#83e39b",
    rare:"#69c9ff",
    epic:"#c276ff",
    legendary:"#f2c454",
    mythical:"#ff5f9e"
  });

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
    blaze:Object.freeze({name:"Blaze", icon:"assets/ui/elemental_resonance/elements/blaze.png"}),
    tidecall:Object.freeze({name:"Tidecall", icon:"assets/ui/elemental_resonance/elements/tidecall.png"}),
    stoneveil:Object.freeze({name:"Stoneveil", icon:"assets/ui/elemental_resonance/elements/stoneveil.png"}),
    windborne:Object.freeze({name:"Windborne", icon:"assets/ui/elemental_resonance/elements/windborne.png"}),
    celestial:Object.freeze({name:"Celestial", icon:"assets/ui/elemental_resonance/elements/celestial.png"}),
    abyssal:Object.freeze({name:"Abyssal", icon:"assets/ui/elemental_resonance/elements/abyssal.png"}),
    cute:Object.freeze({name:"Cute", icon:"assets/ui/elemental_resonance/common/cute_affinity.png"})
  });

  const state = {
    queued:false,
    observer:null,
    popover:null,
    lastSkinId:"",
    tiltBound:false
  };

  function rarityKey(value) {
    const key = lower(value).replace(/[^a-z]/g, "");
    if (key.includes("myth")) return "mythical";
    if (key.includes("legend")) return "legendary";
    if (key.includes("epic")) return "epic";
    if (key.includes("rare")) return "rare";
    if (key.includes("uncommon")) return "uncommon";
    return "common";
  }

  function selectedSkin() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    const active = q("#skins .skin-icon-v093.active[data-v093-skin]");
    if (active?.dataset?.v093Skin) {
      const visibleSkin = skins.find(skin => skin?.id === active.dataset.v093Skin);
      if (visibleSkin) return visibleSkin;
    }

    const index = Number(window.UI?.skinIndex);
    if (Number.isInteger(index) && skins[index]) return skins[index];

    const save = window.UI?.save || {};
    const ids = [
      save.selectedSkin,
      save.skin,
      save.skinId,
      save.player?.skinId,
      save.profile?.skinId
    ].filter(Boolean).map(String);

    return skins.find(skin => ids.includes(String(skin?.id))) || skins[0] || null;
  }

  function skinElement(skin) {
    const raw =
      skin?.elementalAffinity ??
      skin?.element?.id ??
      skin?.element?.name ??
      skin?.elementName ??
      skin?.element ??
      skin?.affinity ??
      skin?.elementType ??
      SKIN_ELEMENTS[skin?.id] ??
      "cute";

    const key = lower(
      typeof raw === "string" ? raw : raw?.name || raw?.id || "cute"
    ).replace(/\s+/g, "_");

    const aliases = {
      fire:"blaze", water:"tidecall", earth:"stoneveil",
      air:"windborne", light:"celestial", dark:"abyssal"
    };
    const id = ELEMENTS[key] ? key : aliases[key] || SKIN_ELEMENTS[skin?.id] || "cute";
    return { id, ...(ELEMENTS[id] || ELEMENTS.cute) };
  }

  function passiveText(skin, root) {
    const dialog = q(".skin-skill-dialog-v093");
    const dialogPassive = clean(q(".cr-passive p", dialog)?.textContent);
    const raw =
      skin?.passiveDescription ??
      skin?.passiveText ??
      skin?.passive?.description ??
      skin?.passive?.text ??
      skin?.passive;
    const primary = dialogPassive || (typeof raw === "string" ? clean(raw) : "");
    const unique = clean(
      skin?.uniquePassiveDescription ??
      skin?.uniquePassiveText ??
      skin?.uniquePassive
    );
    if (primary && unique && lower(primary) !== lower(unique)) return `${primary} · ${unique}`;
    if (primary || unique) return primary || unique;

    const label = qa("small,b,strong,span,dt", root).find(node =>
      /^(passzív|passive)$/i.test(clean(node.textContent))
    );
    const card = label?.closest("article,div");
    return clean(q("p", card)?.textContent) || "—";
  }

  function skillInfo(skin, root) {
    const dialog = q(".skin-skill-dialog-v093");
    const skillObject = skin?.skill && typeof skin.skill === "object" ? skin.skill : null;
    const name = clean(
      q("h3", dialog)?.textContent ??
      skin?.skillName ??
      skin?.abilityName ??
      (typeof skin?.skill === "string" ? skin.skill : null) ??
      skillObject?.name ??
      q(".skill-card-v093 b,.skin-skill-v093 b,.skin-ability-v093 b,[data-skin-skill] b", root)?.textContent ??
      q(".skill-card-v093,.skin-skill-v093,.skin-ability-v093,[data-skin-skill]", root)?.textContent
    ) || "Skill";

    const dialogDescription = qa("p", dialog)
      .filter(node => !node.closest(".cr-passive"))
      .map(node => clean(node.textContent))
      .find(Boolean);
    const rawDescription =
      skin?.skillDescription ??
      skin?.skillDesc ??
      skin?.abilityDescription ??
      skillObject?.description ??
      skillObject?.desc;
    const description =
      dialogDescription ||
      (typeof rawDescription === "string" ? clean(rawDescription) : "") ||
      clean(skin?.desc);

    return { name, description:description || "—" };
  }

  function closePopover() {
    state.popover?.remove();
    state.popover = null;
  }

  function openPopover(kind) {
    closePopover();
    const root = document.getElementById("skins");
    const skin = selectedSkin();
    if (!root || !skin) return;

    const panel = document.createElement("section");
    panel.className = "cr-skin-popover";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");

    if (kind === "element") {
      const element = skinElement(skin);
      panel.innerHTML = `
        <header>
          <h3>${esc(copy("Skin típusa", "Skin type"))}</h3>
          <button type="button" data-cr-popover-close aria-label="Close">×</button>
        </header>
        <article>
          <img class="cr-element-popover-icon" src="${esc(element.icon)}" alt="">
          <small>Elemental Resonance</small>
          <b>${esc(element.name)}</b>
          <p>${esc(copy(
            "Ez a skin Elemental Resonance elem típusa.",
            "This is the skin's Elemental Resonance affinity."
          ))}</p>
        </article>`;
    } else {
      const skill = skillInfo(skin, root);
      panel.innerHTML = `
        <header>
          <h3>${esc(skin?.name || "Cherry")}</h3>
          <button type="button" data-cr-popover-close aria-label="Close">×</button>
        </header>
        <article>
          <small>${esc(copy("Passzív", "Passive"))}</small>
          <p>${esc(passiveText(skin, root))}</p>
        </article>
        <article>
          <small>Skill</small>
          <b>${esc(skill.name)}</b>
          <p>${esc(skill.description)}</p>
        </article>`;
    }

    document.body.appendChild(panel);
    state.popover = panel;
  }

  function patchDialog(skin) {
    const dialog = q(".skin-skill-dialog-v093");
    if (!dialog) return;
    const head = q("h2,h3", dialog);
    if (head && /képesség|ability|skill/i.test(head.textContent)) head.textContent = "Skills";

    if (!q(".cr-passive", dialog)) {
      const raw =
        skin?.passiveDescription ||
        skin?.passiveText ||
        skin?.passive?.description ||
        skin?.passive;
      const passive = typeof raw === "string" ? raw : raw?.text || raw?.description || "";
      if (passive) {
        const block = document.createElement("div");
        block.className = "cr-passive";
        block.innerHTML = `<small>Passive</small><p>${esc(passive)}</p>`;
        (head || dialog.firstElementChild)?.insertAdjacentElement?.("afterend", block) || dialog.prepend(block);
      }
    }

    qa("dt", dialog).forEach(dt => {
      const text = lower(dt.textContent);
      if (/újratölt|cooldown/.test(text)) dt.textContent = "CD";
      else if (/hatótáv|range/.test(text)) dt.textContent = "Range";
      else if (/sebzés\s*\/\s*gyógyítás|damage\s*\/\s*heal/.test(text)) {
        const context = lower(`${dt.parentElement?.textContent || ""} ${q("p", dialog)?.textContent || ""}`);
        const heals = /heal|gyógy/.test(context);
        const damages = /damage|dmg|sebz|támad/.test(context) || !heals;
        dt.textContent = heals && !damages ? "HEAL" : damages && !heals ? "DMG" : "DMG + HEAL";
      } else if (/^típus$|^type$/.test(text)) {
        const context = lower(dialog.textContent);
        if (/heal|gyógy/.test(context) && /damage|dmg|sebz/.test(context)) dt.textContent = "DMG + HEAL";
        else dt.parentElement?.classList.add("cr-ui-hide");
      }
    });
  }

  function normalizeViewTabs(root) {
    const tabs = q(".skin-view-tabs-v093", root);
    if (!tabs) return;
    const splash = q('[data-v093-skin-view="splash"]', tabs) || qa("button", tabs)[0];
    const game = q('[data-v093-skin-view="game"]', tabs) || qa("button", tabs)[1];
    if (splash) splash.textContent = "Splash art";
    if (game) game.textContent = "In-game";
  }

  function hideDeprecatedStats(root) {
    qa("dt,small,span,b,strong,em,p,div", root).forEach(node => {
      if (node.children.length) return;
      if (/^(álló támadás|standing attack|mozgó támadás|moving attack)$/i.test(clean(node.textContent))) {
        const card = node.closest(".skin-stats-v093>div,[class*=skin-stat]");
        (card || node).classList.add("cr-ui-hide");
      }
    });

    qa("small,b,strong,span,dt", root).forEach(node => {
      if (!/^(passzív|passive)$/i.test(clean(node.textContent))) return;
      if (node.closest(".skin-skill-dialog-v093")) return;
      const card = node.closest("article,div");
      if (card && card.querySelectorAll("p,small,b,span").length < 12) card.classList.add("cr-ui-hide");
    });
  }

  function ensureActionRow(root, skin) {
    const equip = q(".skin-equip-v093", root) || qa("button", root).find(button =>
      /felszerel|equip/i.test(clean(button.textContent))
    );
    if (!equip) return;

    let tools = q(".cr-skin-tools", root);
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "cr-skin-tools";

      const info = document.createElement("button");
      info.type = "button";
      info.className = "cr-info-button";
      info.textContent = "i";
      info.dataset.crSkinInfo = "1";

      const element = document.createElement("button");
      element.type = "button";
      element.className = "cr-element-button";
      element.dataset.crSkinElement = "1";

      tools.append(info, element);
    }

    let row = q(".cr-skin-action-row", root);
    if (!row) {
      row = document.createElement("div");
      row.className = "cr-skin-action-row";
      equip.insertAdjacentElement("beforebegin", row);
    }
    if (tools.parentElement !== row) row.appendChild(tools);
    if (equip.parentElement !== row) row.appendChild(equip);

    const info = q(".cr-info-button", tools);
    if (info) {
      info.dataset.crSkinInfo = "1";
      info.textContent = "i";
      info.title = copy("Passzív és skill", "Passive and skill");
      info.setAttribute("aria-label", info.title);
    }

    const elementButton = q(".cr-element-button", tools);
    if (elementButton) {
      const element = skinElement(skin);
      elementButton.dataset.crSkinElement = "1";
      if (elementButton.dataset.crElement !== element.id || !q("img", elementButton)) {
        elementButton.dataset.crElement = element.id;
        elementButton.innerHTML = `<img src="${esc(element.icon)}" alt="">`;
      }
      elementButton.title = `${copy("Elemental Resonance elem", "Elemental Resonance affinity")}: ${element.name}`;
      elementButton.setAttribute("aria-label", elementButton.title);
    }
  }

  function applyRarityAndArt(root, skin) {
    if (!skin) return;
    const art = q(".skin-art-v093", root);
    const rarity = rarityKey(skin?.rarity || q(".rarity-pill,.skin-rarity-v093", root)?.textContent || "common");
    const rarityClass = `cr-rarity-${rarity}`;

    if (art) {
      [...art.classList]
        .filter(name => name.startsWith("cr-rarity-"))
        .forEach(name => art.classList.remove(name));
      art.classList.add(rarityClass);
      art.style.setProperty("--cr-rarity", RARITY_COLORS[rarity]);
      if (skin?.splash) {
        art.style.backgroundImage = `linear-gradient(180deg,rgba(6,3,12,.01),rgba(6,3,12,.16)),url("${skin.splash}")`;
      }
      qa(".fix-splash-img-v095", art).forEach(image => image.remove());
    }

    const rarityNode = q(".rarity-pill,.skin-rarity-v093", root);
    if (rarityNode) {
      [...rarityNode.classList]
        .filter(name => name.startsWith("cr-rarity-"))
        .forEach(name => rarityNode.classList.remove(name));
      rarityNode.classList.add(rarityClass);
      rarityNode.style.setProperty("--cr-rarity", RARITY_COLORS[rarity]);
    }
  }

  function reconcile() {
    state.queued = false;
    const root = document.getElementById("skins");
    if (!root) return;

    const skin = selectedSkin();
    applyRarityAndArt(root, skin);
    normalizeViewTabs(root);
    hideDeprecatedStats(root);
    ensureActionRow(root, skin);
    patchDialog(skin);

    q("#skinElementBadgeV095", root)?.setAttribute("aria-hidden", "true");
    q(".cr-skin-view-button", root)?.remove();

    const current = skin?.id || "";
    if (state.lastSkinId && current && current !== state.lastSkinId) closePopover();
    state.lastSkinId = current;
  }

  function schedule() {
    if (state.queued) return;
    state.queued = true;
    requestAnimationFrame(reconcile);
  }

  function touchesSkin(record) {
    for (const node of record.addedNodes || []) {
      if (!(node instanceof Element)) continue;
      if (
        node.id === "skins" ||
        node.matches?.(".skin-selector-v093,.skin-skill-dialog-v093,.cr-skin-tools") ||
        node.closest?.("#skins") ||
        node.querySelector?.("#skins,.skin-selector-v093,.skin-skill-dialog-v093,.cr-skin-tools")
      ) return true;
    }
    return false;
  }

  function bindTilt() {
    if (state.tiltBound) return;
    state.tiltBound = true;

    document.addEventListener("pointermove", event => {
      const phone = matchMedia("(max-width:820px)").matches;
      if (!phone || event.pointerType === "mouse") return;
      const art = event.target?.closest?.("#skins .skin-art-v093");
      if (!art || !(event.buttons || event.pressure > 0)) return;
      const rect = art.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      art.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translate3d(${(x * 6).toFixed(1)}px,${(y * 6).toFixed(1)}px,0)`;
    }, {passive:true});

    const reset = event => {
      const art = event.target?.closest?.("#skins .skin-art-v093");
      if (art) art.style.transform = "";
    };
    document.addEventListener("pointerup", reset, {passive:true});
    document.addEventListener("pointercancel", reset, {passive:true});
  }

  function bind() {
    document.addEventListener("click", event => {
      const info = event.target?.closest?.("[data-cr-skin-info]");
      if (info) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPopover("info");
        return;
      }

      const element = event.target?.closest?.("[data-cr-skin-element]");
      if (element) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPopover("element");
        return;
      }

      if (event.target?.closest?.("[data-cr-popover-close]")) {
        event.preventDefault();
        closePopover();
        return;
      }

      if (state.popover && !event.target?.closest?.(".cr-skin-popover")) closePopover();
      if (event.target?.closest?.("#skins .skin-icon-v093,#skins [data-v093-skin-view]")) queueMicrotask(schedule);
    }, true);

    addEventListener("resize", schedule, {passive:true});
    addEventListener("orientationchange", schedule, {passive:true});
    bindTilt();

    if (typeof MutationObserver === "function" && document.body) {
      state.observer = new MutationObserver(records => {
        if (records.some(touchesSkin)) schedule();
      });
      state.observer.observe(document.body, {subtree:true, childList:true});
    }
  }

  function start() {
    bind();
    reconcile();
    requestAnimationFrame(reconcile);
  }

  window.CHERRIFT_SKIN_UI = Object.freeze({
    version:"0.9.8.2",
    refresh:schedule,
    selectedSkin,
    skinElement
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
