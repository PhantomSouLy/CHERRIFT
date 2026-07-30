(() => {
"use strict";

const VERSION = "6.0.0-mobile-performance-bootstrap";
const SAVE_KEY = "cherrift_save_v025_polish";
const MOBILE_BREAKPOINT = 900;
const html = document.documentElement;

function readSavedPreference() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return typeof save?.settings?.mobilePerformanceMode === "boolean"
      ? save.settings.mobilePerformanceMode
      : null;
  } catch (_) {
    return null;
  }
}

function isLikelyMobile() {
  const viewportWidth = Math.max(1, Number(window.innerWidth) || Number(screen.width) || MOBILE_BREAKPOINT);
  const narrow = Math.min(Number(screen.width) || viewportWidth, viewportWidth) <= MOBILE_BREAKPOINT;
  const coarse = matchMedia?.("(pointer:coarse)")?.matches === true;
  const android = /Android/i.test(navigator.userAgent || "");
  const memory = Number(navigator.deviceMemory || 0);
  return narrow || coarse || android || (memory > 0 && memory <= 6);
}

const saved = readSavedPreference();
const defaultEnabled = saved ?? isLikelyMobile();
let enabled = defaultEnabled;

function apply(value = enabled) {
  enabled = !!value;
  html.classList.toggle("mobile-performance-mode", enabled);
  html.dataset.mobilePerformance = enabled ? "on" : "off";
  document.body?.classList.toggle("mobile-performance-mode", enabled);
  return enabled;
}

apply(enabled);
if (!document.body) {
  document.addEventListener("DOMContentLoaded", () => apply(enabled), { once: true });
}

/* Android Chrome changes viewport height while its address bar hides/shows.
   The old UI listened to every resize and rebuilt large parts of the menu.
   Wrap resize listeners registered after this bootstrap so height-only changes
   do not trigger expensive rerenders. Width/orientation changes still work. */
const nativeAdd = window.addEventListener.bind(window);
const nativeRemove = window.removeEventListener.bind(window);
const wrappedResizeListeners = new WeakMap();

function wrapResizeListener(listener) {
  if (!listener || wrappedResizeListeners.has(listener)) return wrappedResizeListeners.get(listener) || listener;
  let queued = false;
  let latestEvent = null;
  let lastWidth = Math.round(window.innerWidth || 0);
  let lastOrientation = screen.orientation?.type || "";
  const wrapped = function performanceResizeGate(event) {
    latestEvent = event;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const width = Math.round(window.innerWidth || 0);
      const orientation = screen.orientation?.type || "";
      const meaningful = Math.abs(width - lastWidth) >= 2 || orientation !== lastOrientation;
      if (!meaningful && enabled) return;
      lastWidth = width;
      lastOrientation = orientation;
      if (typeof listener === "function") listener.call(window, latestEvent);
      else listener?.handleEvent?.call(listener, latestEvent);
    });
  };
  wrappedResizeListeners.set(listener, wrapped);
  return wrapped;
}

window.addEventListener = function patchedWindowAddEventListener(type, listener, options) {
  if (type === "resize" && listener) return nativeAdd(type, wrapResizeListener(listener), options);
  return nativeAdd(type, listener, options);
};

window.removeEventListener = function patchedWindowRemoveEventListener(type, listener, options) {
  if (type === "resize" && listener) return nativeRemove(type, wrappedResizeListeners.get(listener) || listener, options);
  return nativeRemove(type, listener, options);
};

window.CHERRIFT_MOBILE_PERFORMANCE = Object.freeze({
  version: VERSION,
  defaultEnabled,
  get enabled() { return enabled; },
  apply,
  isLikelyMobile
});

console.info(`[CHERRIFT] ${VERSION} loaded. Mode: ${enabled ? "ON" : "OFF"}`);
})();
