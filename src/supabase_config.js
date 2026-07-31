(() => {
  "use strict";

  // Public browser configuration. Never place a service-role/secret key here.
  window.CHERRIFT_SUPABASE_CONFIG = Object.freeze({
    url: "https://qkukvltevryegjbnwcgg.supabase.co",
    publishableKey: "sb_publishable_sBra9HOTgsFmmNgDxpcvGQ_PdpvSYQL",
    authStorageKey: "cherrift-supabase-auth-v063",
    cloudSaveTable: "game_saves",
    gmFunctionName: "gm-api",
    playerFunctionName: "player-api"
  });

  if (/\/gm(?:\/|$)/i.test(window.location.pathname)) return;

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) { resolve(); return; }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadExternalSystems() {
    try {
      await loadScript("cherriftEconomyV12Script", "src/cherrift_economy_v11.js?v=0941-chest-only-1");
      await loadScript("cherriftLiveServicesV12Script", "src/cherrift_live_services.js?v=0941-mail-api-1");
      await loadScript("cherriftBugfixV0941Script", "src/cherrift_bugfix_v0941.js?v=0941-ui-1");
    } catch (error) {
      console.error("[CHERRIFT] v0.9.4.1 bugfix systems failed to load:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(loadExternalSystems, 0), { once: true });
  } else {
    window.setTimeout(loadExternalSystems, 0);
  }
})();
