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

  // Canonical UI art for every shipped Cherry skin except Mage Cherry.
  // Mage intentionally keeps its existing data untouched.
  const SKIN_ASSETS = Object.freeze({
    cherry_default:Object.freeze({
      icon:"assets/player/skins/base_cherry/base_cherry_icon.png",
      splash:"assets/player/skins/base_cherry/base_cherry_splashart.png"
    }),
    archer_cherry:Object.freeze({
      icon:"assets/player/skins/archer_cherry/archer_cherry_icon.jpg",
      splash:"assets/player/skins/archer_cherry/archer_cherry_splashart.png"
    }),
    beastclaw_cherry:Object.freeze({
      icon:"assets/player/skins/beastclaw_cherry/beatclaw_cherry_icon.jpg",
      splash:"assets/player/skins/beastclaw_cherry/beastclaw_cherry_splashart.png"
    }),
    cake_deliver_cherry:Object.freeze({
      icon:"assets/player/skins/cake_deliver_cherry/cake_delivery_cherry_icon.jpg",
      splash:"assets/player/skins/cake_deliver_cherry/cake_deliver_cherry_splashart.png"
    }),
    fairy_cherry:Object.freeze({
      icon:"assets/player/skins/fairy_cherry/fairy_cherry_icon.jpg",
      splash:"assets/player/skins/fairy_cherry/fairy_cherry_splashart.jpg"
    }),
    kimono_cherry:Object.freeze({
      icon:"assets/player/skins/kimono_cherry/kimono_cherry_icon.jpg",
      splash:"assets/player/skins/kimono_cherry/kimono_cherry_splashart.png"
    }),
    ninja_cherry:Object.freeze({
      icon:"assets/player/skins/ninja_cherry/ninja_cherry_icon.jpg",
      splash:"assets/player/skins/ninja_cherry/ninja_cherry_splashart.png"
    }),
    pajama_cherry:Object.freeze({
      icon:"assets/player/skins/pajama_cherry/pajama_cherry_icon.jpg",
      splash:"assets/player/skins/pajama_cherry/pajama_cherry_splashart.png"
    }),
    school_uniform_cherry:Object.freeze({
      icon:"assets/player/skins/school_uniform_cherry/school_uniform_cherry_icon.jpg",
      splash:"assets/player/skins/school_uniform_cherry/school_uniform_cherry_splashart.png"
    }),
    sport_cherry:Object.freeze({
      icon:"assets/player/skins/sport_cherry/sport_cherry_icon.jpg",
      splash:"assets/player/skins/sport_cherry/sport_cherry_splashart.png"
    }),
    succubus_cherry:Object.freeze({
      icon:"assets/player/skins/succubus_cherry/succubus_cherry_icon.jpg",
      splash:"assets/player/skins/succubus_cherry/succubus_cherry_splashart.png"
    }),
    warrior_cherry:Object.freeze({
      icon:"assets/player/skins/warrior_cherry/warrior_cherry_icon.jpg",
      splash:"assets/player/skins/warrior_cherry/warrior_cherry_splashart.png"
    }),
    wuxia_sakura_cherry:Object.freeze({
      icon:"assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.jpg",
      splash:"assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_splashart.jpg"
    })
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

  const desktopMode = () => document.body?.classList?.contains("v0933-desktop") === true;

  function canonicalAssets(skin) {
    const skinId = typeof skin === "string" ? skin : skin?.id;
    if (!skinId || skinId === "mage_cherry") return null;
    return SKIN_ASSETS[skinId] || null;
  }

  function syncCanonicalSkinAssets() {
    const skins = window.CHERRIFT_DATA?.skins;
    if (!Array.isArray(skins)) return;
    for (const skin of skins) {
      const assets = canonicalAssets(skin);
      if (!assets) continue;
      try {
        skin.icon = assets.icon;
        skin.splash = assets.splash;
        if ("splashArt" in skin) skin.splashArt = assets.splash;
        if ("splashart" in skin) skin.splashart = assets.splash;
      } catch (error) {
        console.warn("[CHERRIFT skin UI] Could not sync canonical skin assets", skin?.id, error);
      }
    }
  }

  function syncCanonicalSkinIcons(root) {
    if (!root) return;
    qa(".skin-icon-v093[data-v093-skin]", root).forEach(button => {
      const assets = canonicalAssets(button.dataset.v093Skin);
      if (!assets) return;
      const image = q("img", button);
      if (image && image.getAttribute("src") !== assets.icon) image.src = assets.icon;
    });
  }

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

  function desktopSplashSource(root, skin, art) {
    if (!desktopMode() || !skin) return "";
    const canonical = canonicalAssets(skin);
    if (canonical?.splash) return canonical.splash;
    const legacyImage = q(".fix-splash-img-v095", art);
    return clean(
      skin?.splash ||
      skin?.splashArt ||
      skin?.splashart ||
      legacyImage?.getAttribute?.("src") ||
      ""
    );
  }

  function restorePhoneDetails(root) {
    const details = q(".skin-details-v093", root);
    if (!details || details.dataset.crDesktopLayout !== "1") return;
    const row = q(".cr-desktop-skin-name-row", details);
    const heading = q("h3", row) || q("h3", details);
    const title = q(".skin-title-v093", details);
    if (row && heading) title?.insertAdjacentElement?.("afterend", heading);
    row?.remove();
    q(".cr-desktop-skin-info", details)?.remove();
    const description = q(":scope > p", details);
    description?.removeAttribute?.("aria-hidden");

    for (const node of [
      q(".skin-title-v093 small", details),
      q(":scope > p", details),
      q(".skin-stats-v093", details),
      q(".skill-card-v093", details),
      q(".cr-skin-tools", details)
    ]) node?.style?.removeProperty?.("display");

    for (const property of ["display","flex-direction","min-height","height","gap"]) {
      details.style.removeProperty(property);
    }
    if (heading) {
      for (const property of ["display","margin","font-size","line-height","min-width"]) heading.style.removeProperty(property);
    }
    const actionRow = q(".cr-skin-action-row", details);
    if (actionRow) {
      for (const property of ["margin-top","display","width"]) actionRow.style.removeProperty(property);
    }
    const equip = q(".skin-equip-v093", details);
    if (equip) {
      for (const property of ["width","min-height","margin","font-size"]) equip.style.removeProperty(property);
    }
    delete details.dataset.crDesktopLayout;
  }

  function ensureDesktopDetails(root, skin) {
    if (!desktopMode()) {
      restorePhoneDetails(root);
      return;
    }
    const details = q(".skin-details-v093", root);
    if (!details || !skin) return;
    details.dataset.crDesktopLayout = "1";

    details.style.display = "flex";
    details.style.flexDirection = "column";
    details.style.minHeight = "0";
    details.style.height = "100%";
    details.style.gap = "0";

    const title = q(".skin-title-v093", details);
    const movement = q(".skin-title-v093 small", details);
    if (movement) movement.style.display = "none";

    const description = q(":scope > p", details);
    if (description) {
      description.style.display = "none";
      description.setAttribute("aria-hidden", "true");
    }

    const heading = q("h3", details);
    let nameRow = q(".cr-desktop-skin-name-row", details);
    if (!nameRow && heading) {
      nameRow = document.createElement("div");
      nameRow.className = "cr-desktop-skin-name-row";
      (title || details.firstElementChild)?.insertAdjacentElement?.("afterend", nameRow) || details.prepend(nameRow);
      nameRow.appendChild(heading);
    }
    if (nameRow && heading) {
      nameRow.style.display = "flex";
      nameRow.style.alignItems = "center";
      nameRow.style.gap = "10px";
      nameRow.style.margin = "10px 0 16px";
      nameRow.style.minWidth = "0";

      const element = skinElement(skin);
      let icon = q(".cr-desktop-element-icon", nameRow);
      if (!icon) {
        icon = document.createElement("img");
        icon.className = "cr-desktop-element-icon";
        icon.alt = "";
        nameRow.prepend(icon);
      }
      if (icon.getAttribute("src") !== element.icon) icon.src = element.icon;
      icon.title = element.name;
      icon.style.width = "36px";
      icon.style.height = "36px";
      icon.style.flex = "0 0 36px";
      icon.style.objectFit = "contain";
      icon.style.padding = "4px";
      icon.style.border = "1px solid rgba(255,255,255,.14)";
      icon.style.borderRadius = "10px";
      icon.style.background = "rgba(255,255,255,.045)";
      icon.style.boxShadow = "0 0 18px color-mix(in srgb,var(--cr-rarity,#f09ac3) 18%,transparent)";

      heading.style.display = "block";
      heading.style.margin = "0";
      heading.style.fontSize = "clamp(27px,2.45vw,39px)";
      heading.style.lineHeight = "1.02";
      heading.style.minWidth = "0";
    }

    const stats = q(".skin-stats-v093", details);
    const legacySkill = q(".skill-card-v093", details);
    if (stats) stats.style.display = "none";
    if (legacySkill) legacySkill.style.display = "none";

    const passive = passiveText(skin, root);
    const skill = skillInfo(skin, root);
    const skillDescription = clean(skill.description) === clean(skin?.desc) ? "—" : skill.description;
    const skillIcon = window.CHERRIFT_SKILL_ICONS?.forSkin?.(skin.id) || skin?.skillIcon || "";
    const contentKey = [skin.id, language(), passive, skill.name, skillDescription, skillIcon].join("|");

    let info = q(".cr-desktop-skin-info", details);
    if (!info) {
      info = document.createElement("section");
      info.className = "cr-desktop-skin-info";
      const actionRow = q(".cr-skin-action-row", details);
      if (actionRow) actionRow.insertAdjacentElement("beforebegin", info);
      else details.appendChild(info);
    }
    if (info.dataset.contentKey !== contentKey) {
      info.dataset.contentKey = contentKey;
      info.innerHTML = `
        <article class="cr-desktop-passive-card">
          <small>${esc(copy("Passzív", "Passive"))}</small>
          <p>${esc(passive || "—")}</p>
        </article>
        <article class="cr-desktop-skill-card">
          <small>Skill</small>
          <div class="cr-desktop-skill-title">
            ${skillIcon ? `<span><img src="${esc(skillIcon)}" alt="" draggable="false"></span>` : ""}
            <b>${esc(skill.name || "Skill")}</b>
          </div>
          <p>${esc(skillDescription || "—")}</p>
        </article>`;
    }
    info.style.display = "grid";
    info.style.gap = "10px";
    info.style.margin = "4px 0 14px";
    info.querySelectorAll("article").forEach(card => {
      card.style.padding = "12px 13px";
      card.style.border = "1px solid rgba(255,255,255,.11)";
      card.style.borderRadius = "12px";
      card.style.background = "linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))";
      card.style.boxShadow = "inset 0 1px rgba(255,255,255,.035)";
    });
    info.querySelectorAll("article>small").forEach(label => {
      label.style.display = "block";
      label.style.marginBottom = "6px";
      label.style.color = "#e991bd";
      label.style.fontSize = "8px";
      label.style.fontWeight = "950";
      label.style.letterSpacing = "1.35px";
      label.style.textTransform = "uppercase";
    });
    info.querySelectorAll("article>p").forEach(text => {
      text.style.margin = "0";
      text.style.color = "rgba(255,235,245,.78)";
      text.style.fontSize = "11px";
      text.style.lineHeight = "1.45";
    });
    const skillTitle = q(".cr-desktop-skill-title", info);
    if (skillTitle) {
      skillTitle.style.display = "flex";
      skillTitle.style.alignItems = "center";
      skillTitle.style.gap = "9px";
      skillTitle.style.marginBottom = "7px";
    }
    const skillIconHost = q(".cr-desktop-skill-title span", info);
    if (skillIconHost) {
      skillIconHost.style.width = "38px";
      skillIconHost.style.height = "38px";
      skillIconHost.style.flex = "0 0 38px";
      skillIconHost.style.display = "grid";
      skillIconHost.style.placeItems = "center";
      skillIconHost.style.overflow = "hidden";
      skillIconHost.style.borderRadius = "50%";
      skillIconHost.style.background = "rgba(255,255,255,.06)";
    }
    const skillImage = q(".cr-desktop-skill-title img", info);
    if (skillImage) {
      skillImage.style.width = "100%";
      skillImage.style.height = "100%";
      skillImage.style.objectFit = "cover";
      skillImage.style.borderRadius = "inherit";
    }
    const skillName = q(".cr-desktop-skill-title b", info);
    if (skillName) {
      skillName.style.fontSize = "14px";
      skillName.style.lineHeight = "1.15";
    }

    const tools = q(".cr-skin-tools", details);
    if (tools) tools.style.display = "none";
    const actionRow = q(".cr-skin-action-row", details);
    const equip = q(".skin-equip-v093", details);
    if (actionRow) {
      actionRow.style.marginTop = "auto";
      actionRow.style.display = "block";
      actionRow.style.width = "100%";
    }
    if (equip) {
      equip.style.width = "100%";
      equip.style.minHeight = "54px";
      equip.style.margin = "0";
      equip.style.fontSize = "15px";
    }
  }

  function markDesktopSkinsSeen(root) {
    if (!desktopMode() || !root || root.classList.contains("hidden")) return;
    const save = window.UI?.save;
    if (!save) return;

    const unlocked = [...new Set((save.unlockedSkins || []).filter(Boolean).map(String))];
    const same = (value) => Array.isArray(value) && value.length === unlocked.length && unlocked.every(id => value.includes(id));
    save.noticesSeenV090 ||= {};
    save.uiV093 ||= {};
    let changed = false;
    if (!same(save.noticesSeenV090.skins)) {
      save.noticesSeenV090.skins = [...unlocked];
      changed = true;
    }
    if (!same(save.uiV093.seenSkins)) {
      save.uiV093.seenSkins = [...unlocked];
      changed = true;
    }

    qa('[data-v090-notice="skins"],[data-v060-badge="skin"]').forEach(dot => {
      dot.classList.remove("show", "active", "has-new", "is-new");
      dot.removeAttribute("data-active");
      dot.setAttribute("aria-hidden", "true");
    });
    qa("#skins .skin-new-v093").forEach(badge => badge.remove());

    if (changed) {
      try { window.CherriftStorage?.save?.(save); }
      catch (error) { console.warn("[CHERRIFT skin UI] Failed to persist seen skins", error); }
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
      const canonical = canonicalAssets(skin);
      const splash = canonical?.splash || skin?.splash || skin?.splashArt || skin?.splashart || "";
      if (splash) {
        art.style.backgroundImage = `linear-gradient(180deg,rgba(6,3,12,.01),rgba(6,3,12,.16)),url("${splash}")`;
      }
      if (desktopMode()) {
        // Legacy full-splash styling forces position:relative !important and
        // collapses the desktop background-only art element. The desktop
        // selector owns its own absolute/contain layout, so keep that legacy
        // mobile presentation class off the PC showcase.
        art.classList.remove("theme-full-splash-v5");
        // The legacy theme polisher can re-add theme-full-splash-v5 on the
        // next animation frame. Its position:relative !important used to
        // collapse this background-only desktop art layer. Keep the desktop
        // geometry authoritative even if that legacy class comes back.
        art.style.setProperty("position", "absolute", "important");
        const desktopSplash = desktopSplashSource(root, skin, art);
        if (desktopSplash) {
          art.dataset.crDesktopSplash = desktopSplash;
          art.style.backgroundImage = `linear-gradient(180deg,rgba(6,3,12,.01),rgba(6,3,12,.16)),url("${desktopSplash}")`;
          art.style.backgroundSize = "contain";
          art.style.backgroundPosition = "center center";
          art.style.backgroundRepeat = "no-repeat";
        }
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

  function applySkillIcon(root, skin) {
    const host = q(".skill-card-v093 > .skin-skill-icon-v099,.skill-card-v093 > span", root);
    if (!host || !skin) return;
    const source = window.CHERRIFT_SKILL_ICONS?.forSkin?.(skin.id) || skin.skillIcon;
    if (!source) return;
    host.classList.add("skin-skill-icon-v099");
    const image = q("img", host);
    if (!image || image.getAttribute("src") !== source) host.innerHTML = `<img src="${esc(source)}" alt="" draggable="false">`;
    window.CHERRIFT_SKILL_ICONS?.syncHud?.();
  }

  function reconcile() {
    syncCanonicalSkinAssets();
    const root = document.getElementById("skins");
    if (!root) return;

    syncCanonicalSkinIcons(root);
    const skin = selectedSkin();
    applyRarityAndArt(root, skin);
    applySkillIcon(root, skin);
    normalizeViewTabs(root);
    hideDeprecatedStats(root);
    ensureActionRow(root, skin);
    patchDialog(skin);
    ensureDesktopDetails(root, skin);
    markDesktopSkinsSeen(root);

    q("#skinElementBadgeV095", root)?.setAttribute("aria-hidden", "true");
    q(".cr-skin-view-button", root)?.remove();

    const current = skin?.id || "";
    if (state.lastSkinId && current && current !== state.lastSkinId) closePopover();
    state.lastSkinId = current;
  }

  function schedule() {
    if (state.queued) return;
    state.queued = true;
    // Skin selection rebuilds the legacy base markup synchronously. Reconcile
    // in the same microtask checkpoint so the browser never paints that
    // intermediate DOM as a visible frame before the canonical skin UI is
    // restored. requestAnimationFrame here caused the one-frame old-UI flash.
    queueMicrotask(() => {
      state.queued = false;
      reconcile();
    });
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
    syncCanonicalSkinAssets();
    bind();
    reconcile();
    requestAnimationFrame(reconcile);
  }

  window.CHERRIFT_SKIN_UI = Object.freeze({
    version:"0.9.9.3-pc-splash-stable",
    refresh:schedule,
    selectedSkin,
    skinElement,
    assetsForSkin:canonicalAssets
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
