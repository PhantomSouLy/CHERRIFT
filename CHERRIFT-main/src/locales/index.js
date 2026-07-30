(() => {
"use strict";

const dictionaries = window.CHERRIFT_LOCALES || {};
const legacy = window.CHERRIFT_I18N;
const warned = new Set();

function language() {
  const value = legacy?.language || window.UI?.save?.settings?.language || document.documentElement.lang;
  return value === "en" ? "en" : "hu";
}

function resolve(locale, key) {
  return String(key).split(".").reduce((value, part) => value?.[part], dictionaries[locale]);
}

function interpolate(value, params = {}) {
  return String(value).replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  );
}

function t(key, params = {}) {
  const selected = language();
  const translated = resolve(selected, key);
  const fallback = resolve("en", key);
  const value = typeof translated === "string" ? translated : fallback;
  if (typeof value !== "string") {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[CHERRIFT i18n] Missing key: ${key}`);
    }
    return key;
  }
  if (typeof translated !== "string" && !warned.has(`${selected}:${key}`)) {
    warned.add(`${selected}:${key}`);
    console.warn(`[CHERRIFT i18n] Missing ${selected} key, using English fallback: ${key}`);
  }
  return interpolate(value, params);
}

function setLanguage(next, persist = true) {
  const chosen = next === "en" ? "en" : "hu";
  if (legacy?.setLanguage) legacy.setLanguage(chosen, persist);
  else {
    document.documentElement.lang = chosen;
    if (window.UI?.save?.settings) {
      UI.save.settings.language = chosen;
      if (persist) window.CherriftStorage?.save?.(UI.save);
    }
    window.dispatchEvent(new CustomEvent("cherrift:languagechange", {detail:{language:chosen}}));
  }
  return chosen;
}

function validateKeys(keys = []) {
  return keys.filter(key => typeof resolve("en", key) !== "string");
}

window.CHERRIFT_LOCALIZATION = Object.freeze({
  t,
  has:key => typeof resolve(language(), key) === "string" || typeof resolve("en", key) === "string",
  language,
  setLanguage,
  validateKeys,
  interpolate,
  dictionaries
});
window.cherriftT = t;
})();
