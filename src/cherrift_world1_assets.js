/* Compatibility entry point for World1 consumers; all art is the new meadow pack. */
(() => {
  'use strict';
  const map=window.CHERRIFT_WORLD1;
  if (!map) throw new Error('World1 map module must load before its asset catalogue.');
  window.CHERRIFT_WORLD1_ASSETS=Object.freeze({
    ...map.spec,version:'world1-meadow-20261025',
    splashArts:Object.freeze([map.splash,map.splash,map.splash])
  });
})();
