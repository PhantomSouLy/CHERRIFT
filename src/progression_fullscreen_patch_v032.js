(() => {
  if (!window.UI) return;

  const bindPauseFullscreen = () => {
    const btn = document.getElementById("pauseFullscreen");
    if (!btn || btn.__cherriftBound) return;
    btn.__cherriftBound = true;
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      UI.fullscreen?.();
      setTimeout(() => {
        try { UI.game?.resize?.(); } catch (_) {}
      }, 120);
    });
  };

  const oldBind = UI.bind.bind(UI);
  UI.bind = function progressionFullscreenBind(...args) {
    const result = oldBind.apply(this, args);
    bindPauseFullscreen();
    setTimeout(bindPauseFullscreen, 0);
    return result;
  };

  const oldPause = UI.pause?.bind(UI);
  if (oldPause) {
    UI.pause = function pauseWithFullscreenButton(...args) {
      const result = oldPause(...args);
      bindPauseFullscreen();
      return result;
    };
  }
})();