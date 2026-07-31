(() => {
  "use strict";

  // Public browser configuration. Never place a service-role/secret key here.
  window.CHERRIFT_SUPABASE_CONFIG = Object.freeze({
    url: "https://qkukvltevryegjbnwcgg.supabase.co",
    publishableKey: "sb_publishable_sBra9HOTgsFmmNgDxpcvGQ_PdpvSYQL",
    authStorageKey: "cherrift-supabase-auth-v063",
    cloudSaveTable: "game_saves"
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
      await loadScript("cherriftEconomyV11Script", "src/cherrift_economy_v11.js?v=gm-tool-11");
      await loadScript("cherriftLiveServicesScript", "src/cherrift_live_services.js?v=gm-tool-11");
    } catch (error) {
      console.error("[CHERRIFT] External v1.1 systems failed to load:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(loadExternalSystems, 0), { once:true });
  } else {
    window.setTimeout(loadExternalSystems, 0);
  }
})();
