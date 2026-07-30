(() => {
  "use strict";

  // This is a public browser key, not a service-role secret.
  window.CHERRIFT_SUPABASE_CONFIG = Object.freeze({
    url: "https://qkukvltevryegjbnwcgg.supabase.co",
    publishableKey: "sb_publishable_sBra9HOTgsFmmNgDxpcvGQ_PdpvSYQL",
    authStorageKey: "cherrift-supabase-auth-v063",
    cloudSaveTable: "game_saves"
  });

  // The GM page loads its own app. The game gets the live Mail/Redeem bridge
  // after the consolidated runtime has finished registering its systems.
  const isGmPage = /\/gm(?:\/|$)/i.test(window.location.pathname);
  if (isGmPage) return;

  const loadLiveServices = () => {
    if (document.getElementById("cherriftLiveServicesScript")) return;
    const script = document.createElement("script");
    script.id = "cherriftLiveServicesScript";
    script.src = "src/cherrift_live_services.js?v=gm-tool-1";
    script.async = true;
    document.body.appendChild(script);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(loadLiveServices, 0), { once: true });
  } else {
    window.setTimeout(loadLiveServices, 0);
  }
})();
