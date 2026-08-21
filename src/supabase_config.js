(() => {
  "use strict";

  // Public browser configuration. Never place a service-role/secret key here.
  window.CHERRIFT_SUPABASE_CONFIG = Object.freeze({
    url: "https://qkukvltevryegjbnwcgg.supabase.co",
    publishableKey: "sb_publishable_sBra9HOTgsFmmNgDxpcvGQ_PdpvSYQL",
    authStorageKey: "cherrift-supabase-auth-v063",
    cloudSaveTable: "game_saves",
    gmFunctionName: "gm-api",
    playerFunctionName: "player-api",
    guestEnabled: true
  });

  // cherrift_app.js still contains the historical bundled auth source for
  // archive/debug purposes. The maintained implementation is the standalone
  // cherrift_auth.js module loaded immediately after the clean runtime.
  window.__CHERRIFT_EXTERNAL_AUTH__ = true;

  // Runtime modules are loaded explicitly by index.html in a deterministic
  // order. Keeping configuration free of hidden script injection prevents
  // timing-dependent patches and makes failed assets visible to diagnostics.
})();
