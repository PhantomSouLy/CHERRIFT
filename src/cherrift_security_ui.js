(() => {
  "use strict";
  if (window.__CHERRIFT_SECURITY_UI_V095__) return;
  window.__CHERRIFT_SECURITY_UI_V095__ = true;

  const VERSION = "0.9.5-security-ui.1";
  const GUEST_ALLOWED_STAGES = new Set(["world_1_1", "world_1_2"]);
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const isHungarian = () => !(window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en");
  const copy = (hu, en) => isHungarian() ? hu : en;
  const authState = () => {
    try { return window.CHERRIFT_AUTH?.getState?.() || { mode:"guest" }; }
    catch (_) { return { mode:"guest" }; }
  };

  function chapterTwoCompleted(save = window.UI?.save) {
    if (!save || typeof save !== "object") return false;
    return !!(
      save.guestProgress?.loginRequired ||
      save.clearedStages?.world_1_2 ||
      Number(save.stageStars?.world_1_2 || save.stageStats?.world_1_2?.stars || 0) > 0 ||
      Number(save.stageStats?.world_1_2?.clears || 0) > 0
    );
  }

  function normalizeGuestGate(save) {
    if (!save || authState().mode !== "guest" || !chapterTwoCompleted(save)) return false;
    save.guestProgress = save.guestProgress && typeof save.guestProgress === "object" ? save.guestProgress : {};
    save.guestProgress.loginRequired = true;
    save.guestProgress.requiredAfterStage = "world_1_2";
    save.guestProgress.requiredAt ||= new Date().toISOString();
    save.unlockedStages = [...new Set((Array.isArray(save.unlockedStages) ? save.unlockedStages : []).filter(stage => GUEST_ALLOWED_STAGES.has(stage)))];
    if (!save.unlockedStages.includes("world_1_1")) save.unlockedStages.unshift("world_1_1");
    if (!save.unlockedStages.includes("world_1_2")) save.unlockedStages.push("world_1_2");
    if (!GUEST_ALLOWED_STAGES.has(save.selectedStageId)) save.selectedStageId = "world_1_2";
    return true;
  }

  function guestLocked() {
    return authState().mode === "guest" && chapterTwoCompleted(window.UI?.save);
  }

  function ensureLoginModal() {
    let modal = id("guestDiscordRequiredV095");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "guestDiscordRequiredV095";
    modal.className = "guest-login-required-v095 hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `<article><span class="guest-login-mark-v095">✦</span><h2></h2><p></p><div><button type="button" class="secondary" data-guest-login-lobby></button><button type="button" class="primary" data-guest-login-discord></button></div></article>`;
    document.body.appendChild(modal);
    q("[data-guest-login-discord]", modal).addEventListener("click", () => {
      modal.classList.add("hidden");
      window.CHERRIFT_AUTH?.openGate?.();
    });
    q("[data-guest-login-lobby]", modal).addEventListener("click", () => {
      modal.classList.add("hidden");
      window.UI?.open?.("menu");
    });
    return modal;
  }

  function renderLoginPrompt() {
    const modal = ensureLoginModal();
    q("h2", modal).textContent = copy("Mentsd el a haladásodat", "Save your progress");
    q("p", modal).textContent = copy(
      "Teljesítetted a World 1 második Chapterét. A további játékhoz jelentkezz be Discorddal, különben a vendégmentés a böngésző adatainak törlésekor elveszhet.",
      "You completed World 1 Chapter 2. Sign in with Discord to continue, otherwise this temporary guest save can be lost when browser data is cleared."
    );
    q("[data-guest-login-lobby]", modal).textContent = copy("Vissza a Lobbyba", "Back to Lobby");
    q("[data-guest-login-discord]", modal).textContent = copy("Discord bejelentkezés", "Sign in with Discord");
    return modal;
  }

  function showLoginPrompt() {
    if (!guestLocked()) return;
    renderLoginPrompt().classList.remove("hidden");
  }

  function syncLoginCta() {
    let button = id("guestDiscordCtaV095");
    const locked = guestLocked();
    if (!locked) {
      button?.remove();
      id("guestDiscordRequiredV095")?.classList.add("hidden");
      return;
    }
    if (!button) {
      button = document.createElement("button");
      button.id = "guestDiscordCtaV095";
      button.type = "button";
      button.addEventListener("click", event => {
        event.preventDefault();
        showLoginPrompt();
      });
      document.body.appendChild(button);
    }
    const label = copy("A további játékhoz jelentkezz be Discorddal", "Sign in with Discord to continue");
    if (button.textContent !== label) button.textContent = label;
  }

  function cleanBackButton(button) {
    if (!button || button.dataset.arrowOnlyV095 === "1") return;
    const text = String(button.textContent || "").trim();
    if (!/^[←‹↩]\s+\S/.test(text)) return;
    const label = text.replace(/^[←‹↩]\s*/, "").trim();
    button.textContent = "←";
    button.dataset.arrowOnlyV095 = "1";
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }

  function cleanBackButtons(root = document) {
    qa("button", root).forEach(cleanBackButton);
  }

  function patchStorage() {
    const storage = window.CherriftStorage;
    if (!storage?.save || storage.save.__guestGateV095) return;
    const previousSave = storage.save.bind(storage);
    function saveWithGuestGate(value) {
      const newlyLocked = authState().mode === "guest" && !value?.guestProgress?.loginRequired && chapterTwoCompleted(value);
      normalizeGuestGate(value);
      const result = previousSave(value);
      window.setTimeout(() => {
        syncLoginCta();
        if (newlyLocked) showLoginPrompt();
      }, newlyLocked ? 300 : 0);
      return result;
    }
    saveWithGuestGate.__guestGateV095 = true;
    storage.save = saveWithGuestGate;
  }

  function patchGameplay() {
    const proto = window.CherriftGame?.prototype;
    if (!proto?.start || proto.start.__guestGateV095) return;
    const previousStart = proto.start;
    async function startWithGuestGate(...args) {
      if (guestLocked()) {
        showLoginPrompt();
        return false;
      }
      return previousStart.apply(this, args);
    }
    startWithGuestGate.__guestGateV095 = true;
    proto.start = startWithGuestGate;
  }

  function patchNavigation() {
    if (!window.UI?.open || window.UI.open.__securityRoutesV095) return;
    const previousOpen = window.UI.open.bind(window.UI);
    function secureOpen(panel, ...args) {
      if (panel === "rankingPrebeta") return window.CHERRIFT_PREBETA?.open?.("rankingPrebeta");
      if (panel === "socialV082") return window.CHERRIFT_PREBETA?.open?.("socialV082");
      if (panel === "eventHubPrebeta" || panel === "eventV093") return window.CHERRIFT_PREBETA_EVENT?.open?.();
      const result = previousOpen(panel, ...args);
      requestAnimationFrame(() => {
        cleanBackButtons();
        syncLoginCta();
      });
      return result;
    }
    secureOpen.__securityRoutesV095 = true;
    window.UI.open = secureOpen;
  }

  function bind() {
    document.addEventListener("click", event => {
      const ranking = event.target.closest?.('[data-v082-open="rankingPrebeta"],[data-prebeta-open="rankingPrebeta"]');
      if (ranking) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.CHERRIFT_PREBETA?.open?.("rankingPrebeta");
        return;
      }
      const events = event.target.closest?.("[data-prebeta-event-open]");
      if (events) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.CHERRIFT_PREBETA_EVENT?.open?.();
      }
    }, true);
    window.addEventListener("cherrift:authgate", syncLoginCta);
    window.addEventListener("cherrift:server-save-applied", () => {
      syncLoginCta();
      cleanBackButtons();
    });
    window.addEventListener("cherrift:languagechange", () => {
      syncLoginCta();
      if (!id("guestDiscordRequiredV095")?.classList.contains("hidden")) renderLoginPrompt();
    });
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.("button")) cleanBackButton(node);
        cleanBackButtons(node);
      }
      syncLoginCta();
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function start() {
    if (!window.UI?.save || !window.CherriftStorage || !window.CherriftGame) return window.setTimeout(start, 80);
    patchStorage();
    patchGameplay();
    patchNavigation();
    if (normalizeGuestGate(window.UI.save)) window.CherriftStorage.save(window.UI.save);
    cleanBackButtons();
    syncLoginCta();
    bind();
    window.CHERRIFT_SECURITY_UI = Object.freeze({ version:VERSION, guestLocked, showLoginPrompt });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
