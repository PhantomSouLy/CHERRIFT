/* Moonlit World2 uses the shared meadow geometry with its own night art cache. */
(() => {
  'use strict';
  if(window.CHERRIFT_WORLD2)return;
  window.CHERRIFT_WORLD2=window.CHERRIFT_CREATE_MEADOW(2,'assets/map/world2/moonlit/');
})();
