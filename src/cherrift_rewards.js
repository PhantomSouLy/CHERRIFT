(() => {
  "use strict";

  if (window.__CHERRIFT_REWARDS_UI__) return;
  window.__CHERRIFT_REWARDS_UI__ = true;

  const isPhoneUi = () => (
    matchMedia("(max-width:820px)").matches ||
    ((navigator.maxTouchPoints || 0) > 0 && Math.min(innerWidth || 9999, innerHeight || 9999) <= 820)
  );

  function decorate(root = document) {
    root.querySelectorAll?.(".reward-overlay-v083").forEach(overlay => {
      const claim =
        overlay.querySelector(".reward-continue-v083") ||
        Array.from(overlay.querySelectorAll("button")).find(button =>
          /claim|átvét|érintsd|kattints|continue/i.test(String(button.textContent || "").trim())
        );
      if (!claim) return;
      claim.textContent = isPhoneUi() ? "Tap to claim" : "Click to claim";
      claim.setAttribute("aria-label", claim.textContent);
    });
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  }

  function start() {
    decorate();
    addEventListener("resize", schedule, {passive:true});
    addEventListener("orientationchange", schedule, {passive:true});

    if (typeof MutationObserver === "function" && document.body) {
      new MutationObserver(records => {
        if (records.some(record => Array.from(record.addedNodes || []).some(node =>
          node instanceof Element && (
            node.matches?.(".reward-overlay-v083") ||
            node.querySelector?.(".reward-overlay-v083")
          )
        ))) schedule();
      }).observe(document.body, {subtree:true, childList:true});
    }
  }

  window.CHERRIFT_REWARDS_UI = Object.freeze({
    version:"0.9.8.2",
    refresh:schedule
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
