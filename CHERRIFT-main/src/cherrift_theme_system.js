(() => {
"use strict";

const VERSION = "6.0.0-ui-hotfix-batch";
const STYLE_ID = "cherriftThemeSystemCss";
const SAVE_KEY = "cherrift_save_v025_polish";

const THEMES = Object.freeze({
  default: Object.freeze({
    id: "default",
    icon: "✦",
    rarity: "Default",
    className: "theme-default",
    names: { hu: "Default", en: "Default" },
    descriptions: {
      hu: "A klasszikus fekete–pink, neon CHERRIFT megjelenés.",
      en: "The classic black and pink neon CHERRIFT appearance."
    }
  }),
  cozy_cherry: Object.freeze({
    id: "cozy_cherry",
    icon: "♡",
    rarity: "Rare",
    className: "theme-cozy-cherry",
    names: { hu: "Cozy Cherry", en: "Cozy Cherry" },
    descriptions: {
      hu: "Cherry hajából és ruhájából épített puha, pasztelles, vastag körvonalú stílus.",
      en: "A soft pastel style with thick outlines, built from Cherry's hair and outfit colours."
    }
  }),
  summer_splash: Object.freeze({
    id: "summer_splash",
    icon: "☀",
    rarity: "Seasonal",
    className: "theme-summer-splash",
    names: { hu: "Summer Splash", en: "Summer Splash" },
    descriptions: {
      hu: "Víz, türkizkék, homokpart és korallos Cherry-pink nyári hangulat.",
      en: "A summery mix of water blue, turquoise, beach sand and Cherry coral pink."
    }
  })
});

// A mostani teszt buildben mindhárom téma fel van oldva.
// Később a Cozy és Summer ID egyszerűen kivehető innen, és rewardból oldható fel.
const STARTER_UNLOCKS = Object.freeze(["default", "cozy_cherry", "summer_splash"]);

const uiText = Object.freeze({
  hu: {
    title: "Menütéma",
    subtitle: "A kiválasztott téma a menük, panelek, gombok, HUD és felugró ablakok kinézetét módosítja.",
    active: "AKTÍV",
    unlocked: "FELOLDVA",
    locked: "ZÁROLVA",
    use: "HASZNÁLAT",
    defaultBadge: "ALAP",
    equippedToast: "Téma beállítva:",
    lockedToast: "Ez a téma még nincs feloldva.",
    testHint: "A Cozy Cherry és a Summer Splash jelenleg feloldva érkezik teszteléshez."
  },
  en: {
    title: "Menu Theme",
    subtitle: "The selected theme changes the appearance of menus, panels, buttons, HUD and pop-ups.",
    active: "ACTIVE",
    unlocked: "UNLOCKED",
    locked: "LOCKED",
    use: "USE",
    defaultBadge: "DEFAULT",
    equippedToast: "Theme selected:",
    lockedToast: "This theme has not been unlocked yet.",
    testHint: "Cozy Cherry and Summer Splash are currently unlocked for testing."
  }
});

function normalizeThemeId(value) {
  return Object.prototype.hasOwnProperty.call(THEMES, value) ? value : "default";
}

function preferredLanguage(save = window.UI?.save) {
  const language = save?.settings?.language;
  if (language === "en" || language === "hu") return language;
  return document.documentElement.lang === "en" ? "en" : "hu";
}

function copy(save = window.UI?.save) {
  return uiText[preferredLanguage(save)] || uiText.hu;
}

function ensureSave(save) {
  if (!save || typeof save !== "object") return save;

  save.settings = save.settings && typeof save.settings === "object" ? save.settings : {};
  if (typeof save.settings.mobilePerformanceMode !== "boolean") {
    save.settings.mobilePerformanceMode = window.CHERRIFT_MOBILE_PERFORMANCE?.defaultEnabled ?? false;
  }
  save.unlockedThemes = Array.isArray(save.unlockedThemes) ? save.unlockedThemes : [];

  for (const themeId of STARTER_UNLOCKS) {
    if (!save.unlockedThemes.includes(themeId)) save.unlockedThemes.push(themeId);
  }

  const migratedTheme = save.settings.uiTheme || save.selectedTheme || "default";
  save.settings.uiTheme = normalizeThemeId(migratedTheme);
  save.selectedTheme = save.settings.uiTheme;

  if (!save.unlockedThemes.includes(save.settings.uiTheme)) {
    save.settings.uiTheme = "default";
    save.selectedTheme = "default";
  }

  return save;
}

function isUnlocked(themeId, save = window.UI?.save) {
  ensureSave(save);
  return save?.unlockedThemes?.includes(normalizeThemeId(themeId)) === true;
}

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = "assets/ui/themes/theme_system.css?v=6";
  link.onload = () => document.documentElement.classList.add("cherrift-theme-css-ready");
  document.head.appendChild(link);
}

function updateBrowserThemeColor(themeId) {
  const colors = {
    default: "#09050f",
    cozy_cherry: "#f7dad2",
    summer_splash: "#8eddeb"
  };
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = colors[themeId] || colors.default;
}

function applyTheme(themeId, options = {}) {
  const normalized = normalizeThemeId(themeId);
  document.documentElement.classList.add("cherrift-theme-system-v3");
  document.documentElement.dataset.cherriftTheme = normalized;
  document.body?.setAttribute("data-cherrift-theme", normalized);
  document.body?.classList.remove("theme-default", "theme-cozy-cherry", "theme-summer-splash");
  document.body?.classList.add(THEMES[normalized].className);
  updateBrowserThemeColor(normalized);

  requestAnimationFrame(() => {
    document.body?.setAttribute("data-cherrift-theme", normalized);
    window.CHERRIFT_MOBILE_PERFORMANCE?.apply?.(
      window.UI?.save?.settings?.mobilePerformanceMode ?? window.CHERRIFT_MOBILE_PERFORMANCE?.enabled
    );
    if (typeof scheduleDynamicPolish === "function") scheduleDynamicPolish();
  });

  if (!options.silent) {
    window.dispatchEvent(new CustomEvent("cherrift:themechange", {
      detail: { themeId: normalized, theme: THEMES[normalized] }
    }));
  }
  return normalized;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function themeName(theme, save) {
  const language = preferredLanguage(save);
  return theme.names[language] || theme.names.en;
}

function themeDescription(theme, save) {
  const language = preferredLanguage(save);
  return theme.descriptions[language] || theme.descriptions.en;
}

function toast(message) {
  if (typeof window.UI?.toast === "function") window.UI.toast(message);
}

function persist(save) {
  try {
    window.CherriftStorage?.save?.(save);
  } catch (error) {
    console.warn("[CHERRIFT Theme System] Theme save failed:", error);
  }
}

function setTheme(themeId, save = window.UI?.save, options = {}) {
  const normalized = normalizeThemeId(themeId);
  ensureSave(save);
  const text = copy(save);

  if (!isUnlocked(normalized, save)) {
    if (!options.silent) toast(text.lockedToast);
    return false;
  }

  save.settings.uiTheme = normalized;
  save.selectedTheme = normalized;
  applyTheme(normalized, options);
  persist(save);
  renderSettingsCard();

  if (!options.silent) toast(`${text.equippedToast} ${themeName(THEMES[normalized], save)}`);
  return true;
}

function unlockTheme(themeId, save = window.UI?.save, options = {}) {
  const normalized = normalizeThemeId(themeId);
  ensureSave(save);
  if (!save) return false;

  if (!save.unlockedThemes.includes(normalized)) {
    save.unlockedThemes.push(normalized);
    persist(save);
  }

  renderSettingsCard();
  if (options.select === true) setTheme(normalized, save, { silent: options.silent === true });
  return true;
}

function lockTheme(themeId, save = window.UI?.save) {
  const normalized = normalizeThemeId(themeId);
  ensureSave(save);
  if (!save || normalized === "default") return false;

  save.unlockedThemes = save.unlockedThemes.filter(id => id !== normalized);
  if (save.settings.uiTheme === normalized) {
    save.settings.uiTheme = "default";
    save.selectedTheme = "default";
    applyTheme("default");
  }
  persist(save);
  renderSettingsCard();
  return true;
}

function themeCardMarkup(theme, save) {
  const text = copy(save);
  const selected = save.settings.uiTheme === theme.id;
  const unlocked = isUnlocked(theme.id, save);
  const badge = selected
    ? text.active
    : theme.id === "default"
      ? text.defaultBadge
      : unlocked ? text.unlocked : text.locked;

  return `
    <article class="theme-option-v1 ${selected ? "active" : ""} ${unlocked ? "unlocked" : "locked"}" data-theme-option="${escapeHtml(theme.id)}">
      <div class="theme-preview-v1 ${escapeHtml(theme.className)}" aria-hidden="true">
        <span class="theme-preview-window-v1"><i></i><i></i><i></i></span>
        <b>${escapeHtml(theme.icon)}</b>
      </div>
      <div class="theme-option-copy-v1">
        <div class="theme-option-title-v1">
          <h4>${escapeHtml(themeName(theme, save))}</h4>
          <span>${escapeHtml(badge)}</span>
        </div>
        <p>${escapeHtml(themeDescription(theme, save))}</p>
        <small>${escapeHtml(theme.rarity)}</small>
      </div>
      <button type="button" data-theme-select="${escapeHtml(theme.id)}" aria-pressed="${selected ? "true" : "false"}" ${unlocked && !selected ? "" : "disabled"}>
        ${escapeHtml(selected ? text.active : unlocked ? text.use : `🔒 ${text.locked}`)}
      </button>
    </article>`;
}

function selectV060SettingsTab(tabName) {
  const settings = document.getElementById("settings");
  if (!settings) return;
  settings.querySelectorAll("[data-v060-settings]").forEach(button => {
    button.classList.toggle("active", button.dataset.v060Settings === tabName);
  });
  settings.querySelectorAll("[data-v060-settings-page]").forEach(page => {
    page.classList.toggle("active", page.dataset.v060SettingsPage === tabName);
  });
}

function ensureV060SettingsPage(save = window.UI?.save) {
  const settings = document.getElementById("settings");
  const tabs = settings?.querySelector?.(".settings-tabs-v060");
  const content = settings?.querySelector?.(".settings-content-v060");
  if (!settings || !tabs || !content) return null;

  const language = preferredLanguage(save);
  const tabLabel = language === "hu" ? "Téma" : "Theme";
  let tab = document.getElementById("themeSettingsTabV2");
  if (!tab) {
    tab = document.createElement("button");
    tab.id = "themeSettingsTabV2";
    tab.type = "button";
    tab.dataset.v060Settings = "theme";
    tab.innerHTML = `<i>✿</i><b>${escapeHtml(tabLabel)}</b>`;
    const accountTab = tabs.querySelector('[data-v060-settings="account"]');
    tabs.insertBefore(tab, accountTab || null);
  } else {
    const label = tab.querySelector("b");
    if (label) label.textContent = tabLabel;
  }

  if (!tab.dataset.themeSystemBound) {
    tab.dataset.themeSystemBound = "true";
    tab.addEventListener("click", () => selectV060SettingsTab("theme"));
  }

  let page = document.getElementById("themeSettingsPageV2");
  if (!page) {
    page = document.createElement("section");
    page.id = "themeSettingsPageV2";
    page.className = "settings-page-v060 theme-settings-page-v2";
    page.dataset.v060SettingsPage = "theme";
    page.dataset.i18nIgnore = "true";
    const accountPage = content.querySelector('[data-v060-settings-page="account"]');
    content.insertBefore(page, accountPage || null);
  }
  return page;
}

function themePickerMarkup(save) {
  const text = copy(save);
  return `
    <div class="theme-settings-head-v1">
      <div><h3>${escapeHtml(text.title)}</h3><p>${escapeHtml(text.subtitle)}</p></div>
      <span class="theme-current-chip-v1">${escapeHtml(themeName(THEMES[save.settings.uiTheme], save))}</span>
    </div>
    <div class="theme-options-v1">
      ${Object.values(THEMES).map(theme => themeCardMarkup(theme, save)).join("")}
    </div>
    <p class="theme-test-hint-v1">${escapeHtml(text.testHint)}</p>`;
}

function bindThemeButtons(root, save) {
  root?.querySelectorAll?.("[data-theme-select]").forEach(button => {
    button.addEventListener("click", () => setTheme(button.dataset.themeSelect, save));
  });
}

function renderSettingsCard() {
  const save = ensureSave(window.UI?.save);
  if (!save) return;

  // Current CHERRIFT v0.9.3.x Settings layout: add a real Theme tab/page.
  const v060Page = ensureV060SettingsPage(save);
  if (v060Page) {
    const language = preferredLanguage(save);
    v060Page.innerHTML = `
      <header>
        <small>${language === "hu" ? "MEGJELENÉS" : "APPEARANCE"}</small>
        <h3>${language === "hu" ? "Menütéma" : "Menu theme"}</h3>
        <p>${language === "hu" ? "Válaszd ki, hogyan nézzen ki a CHERRIFT teljes kezelőfelülete." : "Choose how the complete CHERRIFT interface should look."}</p>
      </header>
      <div class="theme-settings-card-v1 theme-settings-embedded-v2">
        ${themePickerMarkup(save)}
      </div>`;
    bindThemeButtons(v060Page, save);
    return;
  }

  // Fallback for the old Settings grid used by earlier builds.
  const settingsGrid = document.querySelector("#settings .settings-grid");
  if (!settingsGrid) return;

  let card = document.getElementById("themeSettingsCardV1");
  if (!card) {
    card = document.createElement("section");
    card.id = "themeSettingsCardV1";
    card.className = "settings-card glass theme-settings-card-v1";
    card.dataset.i18nIgnore = "true";
    settingsGrid.appendChild(card);
  }
  card.innerHTML = themePickerMarkup(save);
  bindThemeButtons(card, save);
}

function patchV060SettingsLifecycle() {
  const layer = window.CHERRIFT_V060;
  if (!layer?.initAfterUI || layer.initAfterUI.__themeSystemPatched) return;

  const previousInitAfterUI = layer.initAfterUI.bind(layer);
  const patchedInitAfterUI = function themeAwareV060Init(...args) {
    const result = previousInitAfterUI(...args);
    ensureV060SettingsPage(window.UI?.save);
    renderSettingsCard();
    requestAnimationFrame(renderSettingsCard);
    window.setTimeout(renderSettingsCard, 180);
    return result;
  };
  patchedInitAfterUI.__themeSystemPatched = true;
  layer.initAfterUI = patchedInitAfterUI;
}

function watchSettingsLayout() {
  const settings = document.getElementById("settings");
  if (!settings || settings.dataset.themeSystemObserved) return;
  settings.dataset.themeSystemObserved = "true";
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!document.getElementById("themeSettingsTabV2") || !document.getElementById("themeSettingsPageV2")) {
        ensureV060SettingsPage(window.UI?.save);
        renderSettingsCard();
      }
    });
  });
  observer.observe(settings, { childList: true, subtree: true });
}


const uiPolishState = {
  route: "menu",
  queued: false,
  observer: null,
  interactionBound: false,
  splashBound: false,
  startupInstalled: false,
  startupTimer: 0,
  petalLayer: null
};

function localizedText(hu, en) {
  return preferredLanguage() === "hu" ? hu : en;
}


function currentRouteBucket(route = uiPolishState.route) {
  if (["worlds", "worldsV094"].includes(route)) return "play";
  if (route === "gear") return "gear";
  if (["menu", "home"].includes(route)) return "home";
  if (["chests", "gachaV082"].includes(route)) return "gacha";
  return "more";
}

function setMobileNavigationState(route = uiPolishState.route) {
  uiPolishState.route = route || "menu";
  const drawer = document.getElementById("mobileMenuV082");
  const drawerOpen = !!drawer && !drawer.classList.contains("hidden");
  const activeBucket = drawerOpen ? "more" : currentRouteBucket(uiPolishState.route);

  const navs = [
    document.getElementById("globalMobileNavV052"),
    document.querySelector("#menu .mobile-bottom-nav-v051")
  ].filter(Boolean);

  for (const nav of navs) {
    nav.querySelectorAll("button").forEach(button => {
      let bucket = "";
      if (button.matches("[data-v082-toggle-mobile]")) bucket = "more";
      else {
        const target = button.dataset.v082Open || button.dataset.open || "";
        bucket = currentRouteBucket(target);
      }
      const active = bucket === activeBucket;
      button.classList.toggle("active", active);
      button.classList.toggle("theme-nav-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
}

function polishMobileDrawer() {
  const drawer = document.getElementById("mobileMenuV082");
  if (!drawer) return;
  drawer.classList.add("theme-readable-drawer");
  drawer.querySelectorAll(".mobile-menu-grid-v082 button").forEach(button => {
    button.classList.add("theme-drawer-button");
    const icon = button.querySelector(":scope > i");
    if (icon) icon.setAttribute("aria-hidden", "true");
  });
}

function polishArsenal() {
  const panel = document.getElementById("arsenalV070");
  if (!panel) return;
  panel.classList.add("theme-arsenal-polished");

  // Coin and Gear Scrap are already visible in the header wallet. Keep only
  // upgrade stones in the secondary material strip to avoid duplicate data.
  panel.querySelectorAll('.arsenal-note-v070 [data-v082-material="gearScrap"]').forEach(button => button.remove());

  panel.querySelectorAll(".arsenal-compact-v082").forEach(card => {
    card.classList.add("theme-arsenal-card");
    const multiplier = card.querySelector("header > b");
    if (multiplier) {
      multiplier.classList.add("theme-arsenal-multiplier");
      multiplier.setAttribute("title", preferredLanguage() === "hu" ? "Aktuális szorzó" : "Current multiplier");
    }
    card.querySelector(".arsenal-main-action-v082")?.classList.add("theme-arsenal-level-button");
    card.querySelectorAll('.arsenal-compact-cost-v082, .arsenal-requirements-v070').forEach(costBox => {
      costBox.classList.add('theme-readable-requirements-v6');
    });
  });

  const scrollRoot = panel.querySelector('.arsenal-grid-v070') || panel;
  if (scrollRoot) {
    scrollRoot.style.minHeight = 'max-content';
    scrollRoot.style.paddingBottom = '28px';
  }
}

function polishGear() {
  const gear = document.getElementById("gear");
  if (!gear) return;
  gear.classList.add("theme-gear-polished");
  gear.querySelectorAll(".gear-open-arsenal-v070").forEach(button => button.classList.add("theme-hide-gear-arsenal-shortcut"));

  gear.querySelectorAll("[data-v0560-slot]").forEach(slotCard => {
    const slot = slotCard.dataset.v0560Slot;
    const level = Number(window.UI?.save?.arsenal?.slots?.[slot]?.level) || 1;
    slotCard.classList.add("theme-equipped-slot");
    const badge = slotCard.querySelector(".arsenal-badge-v070");
    if (badge) {
      const label = `LVL ${level}`;
      if (badge.textContent !== label) badge.textContent = label;
      badge.classList.add("theme-gear-level-badge");
    }
    slotCard.querySelectorAll('small, span, em, b').forEach(node => {
      const value = (node.textContent || '').trim();
      if (/^[A-Z]\d+$/.test(value)) node.classList.add('theme-slot-rank-badge');
    });
    slotCard.querySelector(".gear-slot-icon-v0560")?.classList.add("theme-equipped-icon");
  });
}

function detectEconomyRoute() {
  const panel = document.getElementById("chests");
  if (!panel) return;
  const active = panel.querySelector("[data-v080-tab].active")?.dataset.v080Tab;
  const heading = panel.querySelector(".economy-head-v080 h1")?.textContent?.trim().toLowerCase() || "";
  const route = active || (/\bbag\b|inventory|táska/.test(heading) ? "bag" : /shop|bolt/.test(heading) ? "shop" : /buff/.test(heading) ? "buffs" : "gacha");
  panel.dataset.themeEconomyRoute = route;
}

function findFoodIdForReward(card) {
  const catalog = window.CHERRIFT_V080?.foodCatalog || {};
  const name = card.querySelector(".reward-copy-v083 h3")?.textContent?.trim().toLowerCase() || "";
  const imageSrc = card.querySelector(".reward-image-v083")?.getAttribute("src") || "";
  return Object.entries(catalog).find(([, food]) => {
    const foodName = String(food?.name || "").trim().toLowerCase();
    const asset = String(food?.asset || "");
    return (foodName && foodName === name) || (asset && imageSrc && (imageSrc === asset || imageSrc.endsWith(asset)));
  })?.[0] || "";
}

function polishRewardOverlay() {
  const overlay = document.getElementById("rewardOverlayV083");
  if (!overlay) return;
  overlay.classList.add("theme-reward-polished");
  overlay.querySelectorAll(".reward-item-v083").forEach(card => {
    const subtitle = card.querySelector(".reward-copy-v083 p");
    if (!subtitle) return;
    if (/maximum(?:\s+stack)?\s*99|maximum\s+99\s+db/i.test(subtitle.textContent || "")) {
      const itemId = findFoodIdForReward(card);
      if (!itemId) return;
      const current = Math.max(0, Math.floor(Number(window.UI?.save?.bag?.items?.[itemId]) || 0));
      subtitle.textContent = `${current} / 99`;
      subtitle.classList.add("theme-stack-count");
    }
  });
}


function saveUiSettings() {
  try { window.CherriftStorage?.save?.(window.UI?.save); }
  catch (error) { console.warn("[CHERRIFT Theme System] UI setting save failed:", error); }
}

function applyPerformancePreference(value) {
  const enabled = !!value;
  if (window.UI?.save) {
    ensureSave(window.UI.save);
    window.UI.save.settings.mobilePerformanceMode = enabled;
    saveUiSettings();
  }
  window.CHERRIFT_MOBILE_PERFORMANCE?.apply?.(enabled);
  document.documentElement.classList.toggle("mobile-performance-mode", enabled);
  document.body?.classList.toggle("mobile-performance-mode", enabled);
  const button = document.querySelector("[data-theme-mobile-performance]");
  if (button) {
    const hu = preferredLanguage() === "hu";
    button.textContent = enabled ? (hu ? "BE" : "ON") : (hu ? "KI" : "OFF");
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
  }
  scheduleDynamicPolish();
  return enabled;
}

function ensurePerformanceSetting() {
  const page = document.querySelector('[data-v060-settings-page="display"]') ||
    document.querySelector('[data-v060-settings-page="gameplay"]');
  if (!page || document.getElementById("mobilePerformanceSettingV5")) return;
  const hu = preferredLanguage() === "hu";
  const row = document.createElement("div");
  row.id = "mobilePerformanceSettingV5";
  row.className = "setting-line-v060 mobile-performance-setting-v5";
  row.dataset.i18nIgnore = "true";
  row.innerHTML = `<span><b>${hu ? "Mobil teljesítmény mód" : "Mobile Performance Mode"}</b><small>${hu ? "Csökkenti a blur, árnyék és felesleges újrarenderelés terhelését. Telefonon ajánlott." : "Reduces blur, shadows and unnecessary rerenders. Recommended on phones."}</small></span><button type="button" class="setting-action-v060" data-theme-mobile-performance></button>`;
  page.appendChild(row);
  const enabled = window.UI?.save?.settings?.mobilePerformanceMode ?? window.CHERRIFT_MOBILE_PERFORMANCE?.enabled ?? false;
  const button = row.querySelector("[data-theme-mobile-performance]");
  button?.addEventListener("click", () => applyPerformancePreference(!button.classList.contains("active")));
  applyPerformancePreference(enabled);
}

function removeHeaderExplanations() {
  const selectors = [
    "#skins > .panel-head p",
    "#gear .gear-heading-v0560 p",
    "#chests .economy-head-v080 p",
    "#arsenalV070 .arsenal-head-v070 p",
    ".world-header-v094 p",
    ".shop-intro-v080 p",
    "#playerUpgrade > .panel-head p",
    ".v082-custom-panel > .panel-head p"
  ];
  document.querySelectorAll(selectors.join(",")).forEach(element => {
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
  });
}

function polishGearInventory() {
  const gear = document.getElementById("gear");
  if (!gear) return;
  gear.querySelectorAll(".gear-change-skin-v0560").forEach(button => button.remove());

  const count = document.getElementById("gearInventoryCountV0560");
  const heading = gear.querySelector(".gear-inventory-head-v0560 > div:first-child");
  if (count && heading && count.parentElement !== heading) {
    count.classList.add("theme-inventory-capacity-v5");
    heading.appendChild(count);
  }

  const tools = document.getElementById("gearBulkToolsV082");
  const selectCommon = tools?.querySelector("[data-v082-select-common]");
  const selectionMode = !!selectCommon && !selectCommon.classList.contains("hidden");
  const grid = document.getElementById("gearInventoryGridV0560");
  grid?.classList.toggle("theme-selection-mode-v5", selectionMode);
  gear.classList.toggle("theme-selection-mode-v5", selectionMode);
  grid?.querySelectorAll("[data-v0560-item-id]").forEach(card => {
    const selected = card.classList.contains("selected-v082");
    card.classList.toggle("theme-selected-item-v5", selected);
    card.classList.toggle("theme-unselected-item-v5", selectionMode && !selected);
    const mark = card.querySelector(".gear-select-mark-v082");
    if (mark) mark.hidden = !selected;
  });
}

function polishProfilePanel() {
  const panel = document.getElementById("profile") || document.querySelector('.profile-panel-v082, .utility-panel-v063[data-panel="profile"]');
  if (!panel) return;
  panel.querySelectorAll('.panel-head p, .profile-head-v082 p').forEach(el => {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  });
  panel.querySelectorAll('small, p, span, b, strong').forEach(node => {
    const value = (node.textContent || '').trim().toLowerCase();
    if (value === 'active title' || value === 'aktív cím') node.classList.add('theme-profile-hide-v6');
  });
}

function ensureSplashOverlay() {
  let overlay = document.getElementById("skinSplashFullscreenV5");
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "skinSplashFullscreenV5";
  overlay.className = "skin-splash-fullscreen-v5 hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = '<button type="button" class="skin-splash-backdrop-v5" data-splash-close aria-label="Close"></button><div class="skin-splash-shell-v5"><button type="button" class="skin-splash-close-v5" data-splash-close aria-label="Close">×</button><img alt="Cherry Splash Art" draggable="false"></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener("click", event => {
    if (event.target.closest?.("[data-splash-close]")) {
      overlay.classList.add("hidden");
      document.body.classList.remove("skin-splash-open-v5");
    }
  });
  return overlay;
}

function splashUrlFromArt(art) {
  const raw = art?.style?.backgroundImage || getComputedStyle(art || document.body).backgroundImage || "";
  return raw.match(/url\((['"]?)(.*?)\1\)/)?.[2] || "";
}

function polishSkinSelector() {
  const panel = document.getElementById("skins");
  if (!panel) return;
  panel.querySelectorAll(".skin-stats-v093 > div").forEach(row => {
    if (row.querySelector('dd[class*="role-"]')) row.remove();
  });
  const art = panel.querySelector(".skin-art-v093");
  if (!art) return;
  art.classList.add("theme-full-splash-v5");
  let button = art.querySelector(".skin-splash-expand-v5");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "skin-splash-expand-v5";
    button.setAttribute("aria-label", preferredLanguage() === "hu" ? "Teljes Splash Art" : "Full Splash Art");
    button.textContent = "⛶";
    art.appendChild(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const source = splashUrlFromArt(art);
      if (!source) return;
      const overlay = ensureSplashOverlay();
      overlay.querySelector("img").src = source;
      overlay.classList.remove("hidden");
      document.body.classList.add("skin-splash-open-v5");
    });
  }
}

function ensurePetalLayer() {
  if (uiPolishState.petalLayer?.isConnected) return uiPolishState.petalLayer;
  const layer = document.createElement("div");
  layer.className = "theme-petal-layer-v5";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  uiPolishState.petalLayer = layer;
  return layer;
}

function createPetalRipple(layer, x, y) {
  const ripple = document.createElement('span');
  ripple.className = 'theme-petal-ripple-v5';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  layer.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 430);
}

function createPetalBurst(x, y, options = {}) {
  if (document.body.classList.contains("is-playing")) return;
  if (matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const layer = ensurePetalLayer();
  const lightweight = document.documentElement.classList.contains("mobile-performance-mode");
  const amount = Number(options.amount) || (lightweight ? 6 : 10);
  const fragment = document.createDocumentFragment();
  createPetalRipple(layer, x, y);
  for (let index = 0; index < amount; index++) {
    const petal = document.createElement("i");
    const angle = (Math.PI * 2 * index / amount) + (Math.random() - .5) * .8;
    const distance = (lightweight ? 26 : 34) + Math.random() * (lightweight ? 22 : 34);
    petal.style.left = `${x}px`;
    petal.style.top = `${y}px`;
    petal.style.setProperty("--petal-x", `${Math.cos(angle) * distance}px`);
    petal.style.setProperty("--petal-y", `${Math.sin(angle) * distance + 18 + Math.random() * 18}px`);
    petal.style.setProperty("--petal-r", `${(Math.random() * 260 - 130).toFixed(0)}deg`);
    petal.style.setProperty("--petal-delay", `${Math.random() * 45}ms`);
    fragment.appendChild(petal);
    window.setTimeout(() => petal.remove(), 820);
  }
  layer.appendChild(fragment);
}

function buildLabel() {
  return window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.3";
}

function ensureStartupOverlay() {
  let overlay = document.getElementById("cherriftStartupV5");
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "cherriftStartupV5";
  overlay.className = "cherrift-startup-v5";
  overlay.dataset.i18nIgnore = "true";
  overlay.innerHTML = `<div class="startup-tools-v5"><button type="button" data-startup-tool="discord" aria-label="Discord"><span class="startup-discord-mark-v5">●●</span></button><button type="button" data-startup-tool="feedback" aria-label="Feedback">!</button><button type="button" data-startup-tool="settings" aria-label="Settings">⚙</button></div><main><div class="startup-mark-v5">✦</div><h1>CHERRIFT</h1><p class="startup-version-v5"></p><button type="button" class="startup-continue-v5" disabled></button><div class="startup-track-v5"><i></i></div><small class="startup-status-v5"></small></main>`;
  document.body.appendChild(overlay);
  const continueButton = overlay.querySelector(".startup-continue-v5");
  continueButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (!overlay.classList.contains('ready')) return;
    finishStartupExperience();
  });
  overlay.addEventListener("click", event => {
    const toolButton = event.target.closest?.("[data-startup-tool]");
    const tool = toolButton?.dataset.startupTool;
    if (!tool) return;
    event.preventDefault();
    event.stopPropagation();
    if (tool === "discord") {
      window.CHERRIFT_AUTH?.openGate?.();
      return;
    }
    const panel = tool === 'settings' ? 'settings' : 'supportV063';
    if (tool === "feedback" && window.CHERRIFT_V063?.runtime) {
      window.CHERRIFT_V063.runtime.supportType = "feedback";
    }
    window.UI?.open?.(panel);
  });
  return overlay;
}

function setTextIfChanged(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

function syncStartupExperience() {
  const overlay = ensureStartupOverlay();
  const state = window.CHERRIFT_AUTH?.getState?.() || { mode: "guest", gateVisible: false };
  const ready = ["guest", "discord"].includes(state.mode) && !state.gateVisible;
  const coarse = matchMedia?.("(pointer:coarse)")?.matches === true;
  setTextIfChanged(overlay.querySelector(".startup-version-v5"), buildLabel());
  const button = overlay.querySelector(".startup-continue-v5");
  setTextIfChanged(button, coarse ? "Tap to Continue" : "Click to Continue");
  button.disabled = !ready;
  overlay.classList.toggle("ready", ready);
  overlay.classList.toggle("waiting-auth", !ready);
  const statusText = ready
    ? ""
    : localizedText('Jelentkezz be Discorddal, vagy lépj be vendégként.', 'Sign in with Discord, or continue as a guest.');
  setTextIfChanged(overlay.querySelector(".startup-status-v5"), statusText);
  overlay.querySelector(".startup-tools-v5").hidden = !ready;
  if (ready && uiPolishState.startupTimer) {
    window.clearInterval(uiPolishState.startupTimer);
    uiPolishState.startupTimer = 0;
  }
}

function finishStartupExperience(openPanel = "") {
  const overlay = document.getElementById("cherriftStartupV5");
  if (!overlay || overlay.classList.contains("finishing")) return;
  overlay.classList.add("finishing");
  const fill = overlay.querySelector(".startup-track-v5 i");
  const status = overlay.querySelector(".startup-status-v5");
  if (status) status.textContent = preferredLanguage() === "hu" ? "Menü előkészítése…" : "Preparing menu…";
  if (fill) fill.style.width = "100%";
  window.clearInterval(uiPolishState.startupTimer);
  window.setTimeout(() => {
    overlay.classList.add("done");
    window.setTimeout(() => overlay.remove(), 360);
    if (openPanel) window.UI?.open?.(openPanel);
  }, 300);
}

function installStartupExperience() {
  if (uiPolishState.startupInstalled || !window.CHERRIFT_V060?.finishBoot) return;
  uiPolishState.startupInstalled = true;
  const previousFinish = window.CHERRIFT_V060.finishBoot.bind(window.CHERRIFT_V060);
  window.CHERRIFT_V060.finishBoot = function finishBootV5(...args) {
    ensureStartupOverlay();
    const result = previousFinish(...args);
    syncStartupExperience();
    window.clearInterval(uiPolishState.startupTimer);
    uiPolishState.startupTimer = window.setInterval(syncStartupExperience, 250);
    return result;
  };
  window.addEventListener("cherrift:authgate", syncStartupExperience);
}

function addInteractionFeedback() {
  if (uiPolishState.interactionBound) return;
  uiPolishState.interactionBound = true;
  const pointers = new Map();
  const trailTimers = new Map();

  function stopTrail(pointerId) {
    const timer = trailTimers.get(pointerId);
    if (timer) window.clearInterval(timer);
    trailTimers.delete(pointerId);
  }

  document.addEventListener("pointerdown", event => {
    if (!event.isPrimary) return;
    const point = { x:event.clientX, y:event.clientY };
    pointers.set(event.pointerId, point);
    createPetalBurst(point.x, point.y);
    const cadence = document.documentElement.classList.contains('mobile-performance-mode') ? 140 : 95;
    trailTimers.set(event.pointerId, window.setInterval(() => {
      const active = pointers.get(event.pointerId);
      if (!active) return;
      createPetalBurst(active.x, active.y, { amount: document.documentElement.classList.contains('mobile-performance-mode') ? 4 : 7 });
    }, cadence));
    const button = event.target.closest?.("button, [role='button']");
    if (!button || button.disabled) return;
    button.classList.add("theme-click-pop");
    window.setTimeout(() => button.classList.remove("theme-click-pop"), 220);
  }, true);

  document.addEventListener('pointermove', event => {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;
  }, true);

  document.addEventListener("pointerup", event => {
    pointers.delete(event.pointerId);
    stopTrail(event.pointerId);
    requestAnimationFrame(scheduleDynamicPolish);
  }, true);
  document.addEventListener("pointercancel", event => { pointers.delete(event.pointerId); stopTrail(event.pointerId); }, true);

  document.addEventListener("click", event => {
    const mobileToggle = event.target.closest?.("[data-v082-toggle-mobile]");
    if (mobileToggle) requestAnimationFrame(() => setMobileNavigationState(uiPolishState.route));

    const opener = event.target.closest?.("[data-v082-open], [data-open]");
    if (opener) {
      const route = opener.dataset.v082Open || opener.dataset.open || "menu";
      uiPolishState.route = route;
      requestAnimationFrame(() => setMobileNavigationState(route));
    }
    requestAnimationFrame(scheduleDynamicPolish);
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.getElementById("skinSplashFullscreenV5")?.classList.add("hidden");
      document.body.classList.remove("skin-splash-open-v5");
    }
  });
}

function polishDynamicUi() {
  polishMobileDrawer();
  polishArsenal();
  polishGear();
  polishGearInventory();
  polishProfilePanel();
  polishSkinSelector();
  removeHeaderExplanations();
  ensurePerformanceSetting();
  detectEconomyRoute();
  polishRewardOverlay();
  setMobileNavigationState(uiPolishState.route);
}

function scheduleDynamicPolish() {
  if (uiPolishState.queued) return;
  uiPolishState.queued = true;
  requestAnimationFrame(() => {
    uiPolishState.queued = false;
    polishDynamicUi();
  });
}

function observeDynamicUi() {
  if (uiPolishState.observer || !document.body) return;
  uiPolishState.observer = new MutationObserver(mutations => {
    const meaningful = mutations.some(mutation => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
      return !target?.closest?.(".theme-petal-layer-v5, .cherrift-startup-v5, .auth-gate-v064");
    });
    if (meaningful) scheduleDynamicPolish();
  });
  uiPolishState.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  addInteractionFeedback();
  scheduleDynamicPolish();
}

function migrateLocalSaveEarly() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return "default";
    const parsed = JSON.parse(raw);
    return normalizeThemeId(parsed?.settings?.uiTheme || parsed?.selectedTheme || "default");
  } catch (_) {
    return "default";
  }
}

function patchStorageLoad() {
  const storage = window.CherriftStorage;
  if (!storage?.load || storage.load.__themeSystemPatched) return;

  const previousLoad = storage.load.bind(storage);
  const patchedLoad = function themeAwareLoad() {
    return ensureSave(previousLoad());
  };
  patchedLoad.__themeSystemPatched = true;
  storage.load = patchedLoad;
}

function patchUi() {
  if (!window.UI || window.UI.init?.__themeSystemPatched) return;

  const previousInit = window.UI.init.bind(window.UI);
  const patchedInit = function themeAwareInit(save, game) {
    ensureSave(save);
    applyTheme(save.settings.uiTheme, { silent: true });
    const result = previousInit(save, game);
    renderSettingsCard();
    ensurePerformanceSetting();
    applyPerformancePreference(save.settings.mobilePerformanceMode);
    requestAnimationFrame(() => { renderSettingsCard(); scheduleDynamicPolish(); });
    window.setTimeout(() => { renderSettingsCard(); scheduleDynamicPolish(); }, 160);
    return result;
  };
  patchedInit.__themeSystemPatched = true;
  window.UI.init = patchedInit;

  const previousOpen = window.UI.open?.bind(window.UI);
  if (previousOpen && !window.UI.open?.__themeSystemPatched) {
    const patchedOpen = function themeAwareOpen(panel, ...args) {
      const result = previousOpen(panel, ...args);
      uiPolishState.route = panel || "menu";
      if (panel === "settings") {
        renderSettingsCard();
        ensurePerformanceSetting();
        requestAnimationFrame(renderSettingsCard);
      }
      requestAnimationFrame(scheduleDynamicPolish);
      return result;
    };
    patchedOpen.__themeSystemPatched = true;
    window.UI.open = patchedOpen;
  }
}

ensureCss();
installStartupExperience();
applyTheme(migrateLocalSaveEarly(), { silent: true });
patchStorageLoad();
ensureV060SettingsPage();
patchV060SettingsLifecycle();
patchUi();
watchSettingsLayout();
observeDynamicUi();

window.addEventListener("cherrift:languagechange", () => {
  ensureV060SettingsPage(window.UI?.save);
  renderSettingsCard();
  document.getElementById("mobilePerformanceSettingV5")?.remove();
  ensurePerformanceSetting();
  scheduleDynamicPolish();
});
window.addEventListener("DOMContentLoaded", () => {
  patchStorageLoad();
  ensureV060SettingsPage(window.UI?.save);
  patchV060SettingsLifecycle();
  patchUi();
  installStartupExperience();
  watchSettingsLayout();
  renderSettingsCard();
  ensurePerformanceSetting();
  observeDynamicUi();
  scheduleDynamicPolish();
});

window.CHERRIFT_THEMES = Object.freeze({
  version: VERSION,
  themes: THEMES,
  starterUnlocks: STARTER_UNLOCKS,
  apply: applyTheme,
  select: setTheme,
  unlock: unlockTheme,
  lock: lockTheme,
  isUnlocked,
  renderSettings: renderSettingsCard,
  ensureSave,
  polish: scheduleDynamicPolish
});

console.info("[CHERRIFT] Theme System v6 loaded: UI hotfix batch, startup cleanup and improved tap petals.");
})();
