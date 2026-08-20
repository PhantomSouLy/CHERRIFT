(() => {
  "use strict";

  if (window.__CHERRIFT_BOOT_INPUT_FIX_V0976__) return;
  window.__CHERRIFT_BOOT_INPUT_FIX_V0976__ = true;

  const VERSION = "0.9.7.6-auth-input";
  const id = name => document.getElementById(name);
  let lastPointerActivation = 0;
  let busy = false;

  function language() {
    return window.CHERRIFT_I18N?.language === "en" ||
      window.UI?.save?.settings?.language === "en"
      ? "en"
      : "hu";
  }

  function copy(hu, en) {
    return language() === "en" ? en : hu;
  }

  function installHitTestCss() {
    if (id("cherriftBootInputFix0976Css")) return;

    const style = document.createElement("style");
    style.id = "cherriftBootInputFix0976Css";
    style.textContent = `
      #bootV060.boot-v060{
        pointer-events:auto!important;
      }
      #bootV060 .boot-shade-v096,
      #bootV060 .boot-brand-v096{
        pointer-events:none!important;
      }
      #bootV060 .boot-stage-v096{
        z-index:20!important;
        pointer-events:auto!important;
      }
      #bootV060 #bootAuthV096{
        position:relative!important;
        z-index:21!important;
        pointer-events:auto!important;
      }
      #bootV060 .boot-auth-actions-v096{
        position:relative!important;
        z-index:22!important;
        pointer-events:auto!important;
      }
      #bootV060 [data-boot-auth]{
        position:relative!important;
        z-index:23!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
        -webkit-tap-highlight-color:transparent!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function setStatus(message = "") {
    const label = id("bootAuthStatusV096");
    if (label && message) label.textContent = message;
  }

  function setBusy(value, message = "") {
    busy = !!value;
    const discord = id("bootDiscordV096");
    const guest = id("bootGuestV096");

    if (discord) discord.disabled = busy;
    if (guest) guest.disabled = busy;

    if (message) setStatus(message);
  }

  async function activate(action) {
    if (busy) return;

    const api = window.CHERRIFT_AUTH;
    if (!api) {
      setBusy(false, copy(
        "A bejelentkezési modul még nem érhető el.",
        "The sign-in module is not ready yet."
      ));
      return;
    }

    try {
      if (action === "discord") {
        setBusy(true, copy(
          "Átirányítás Discordra…",
          "Redirecting to Discord…"
        ));

        const ok = await api.signInWithDiscord?.();

        if (!ok) {
          setBusy(false, copy(
            "A Discord bejelentkezés nem indult el. Próbáld újra.",
            "Discord sign-in did not start. Please try again."
          ));
        }
        return;
      }

      setBusy(true, copy(
        "Vendégmentés előkészítése…",
        "Preparing guest save…"
      ));

      const ok = await api.continueAsGuest?.();

      if (ok === false) {
        setBusy(false, copy(
          "A vendég mód nem indítható.",
          "Guest mode could not start."
        ));
        return;
      }

      // closeGate("guest") dispatches cherrift:authgate. The normal boot
      // controller receives it and continues its own loading/start sequence.
    } catch (error) {
      console.error("[CHERRIFT Boot Input] Auth action failed:", error);
      setBusy(false, copy(
        `Hiba: ${error?.message || "ismeretlen hiba"}`,
        `Error: ${error?.message || "unknown error"}`
      ));
    }
  }

  function pointInside(button, event) {
    const rect = button.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function bindButton(button, action) {
    if (!button || button.dataset.bootInput0976 === "1") return;
    button.dataset.bootInput0976 = "1";

    // Android/touch path. This intentionally does not rely on the document
    // "click" delegation used by the original boot controller.
    button.addEventListener("pointerup", event => {
      if (button.disabled || !pointInside(button, event)) return;

      lastPointerActivation = performance.now();
      event.preventDefault();
      event.stopPropagation();
      activate(action);
    }, { passive:false });

    // Mouse/keyboard fallback. Suppress the synthetic click that usually
    // follows a touch pointerup so the action runs exactly once.
    button.addEventListener("click", event => {
      if (button.disabled) return;

      if (performance.now() - lastPointerActivation < 700) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activate(action);
    });

    // Legacy fallback for browsers without PointerEvent.
    if (!("PointerEvent" in window)) {
      button.addEventListener("touchend", event => {
        if (button.disabled) return;
        lastPointerActivation = performance.now();
        event.preventDefault();
        event.stopPropagation();
        activate(action);
      }, { passive:false });
    }
  }

  function bind() {
    installHitTestCss();

    bindButton(id("bootDiscordV096"), "discord");
    bindButton(id("bootGuestV096"), "guest");

    // If another module rewrites the boot card, re-bind the real nodes.
    const root = id("bootV060");
    if (root) {
      const observer = new MutationObserver(() => {
        bindButton(id("bootDiscordV096"), "discord");
        bindButton(id("bootGuestV096"), "guest");
      });
      observer.observe(root, { childList:true, subtree:true });
    }

    console.info(`[CHERRIFT] Boot input bridge ${VERSION} active.`);
  }

  // This file is defer-loaded immediately after cherrift_boot.js. By the time
  // defer scripts execute the body scripts have already created CHERRIFT_AUTH.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once:true });
  } else {
    bind();
  }
})();
