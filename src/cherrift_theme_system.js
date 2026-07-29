(() => {
"use strict";

const VERSION = "1.1.0";
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
  link.href = "assets/ui/themes/theme_system.css?v=2";
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
  document.documentElement.dataset.cherriftTheme = normalized;
  document.body?.setAttribute("data-cherrift-theme", normalized);
  updateBrowserThemeColor(normalized);

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
    requestAnimationFrame(renderSettingsCard);
    window.setTimeout(renderSettingsCard, 160);
    return result;
  };
  patchedInit.__themeSystemPatched = true;
  window.UI.init = patchedInit;

  const previousOpen = window.UI.open?.bind(window.UI);
  if (previousOpen && !window.UI.open?.__themeSystemPatched) {
    const patchedOpen = function themeAwareOpen(panel, ...args) {
      const result = previousOpen(panel, ...args);
      if (panel === "settings") {
        renderSettingsCard();
        requestAnimationFrame(renderSettingsCard);
      }
      return result;
    };
    patchedOpen.__themeSystemPatched = true;
    window.UI.open = patchedOpen;
  }
}

ensureCss();
applyTheme(migrateLocalSaveEarly(), { silent: true });
patchStorageLoad();
ensureV060SettingsPage();
patchV060SettingsLifecycle();
patchUi();
watchSettingsLayout();

window.addEventListener("cherrift:languagechange", () => {
  ensureV060SettingsPage(window.UI?.save);
  renderSettingsCard();
});
window.addEventListener("DOMContentLoaded", () => {
  patchStorageLoad();
  ensureV060SettingsPage(window.UI?.save);
  patchV060SettingsLifecycle();
  patchUi();
  watchSettingsLayout();
  renderSettingsCard();
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
  ensureSave
});

console.info("[CHERRIFT] Theme System loaded: Default, Cozy Cherry and Summer Splash.");
})();
