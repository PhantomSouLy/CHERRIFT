(() => {
  if (!window.UI) return;

  const fitViewport = game => {
    const g = game || window.UI?.game;
    const canvas = g?.canvas || document.getElementById("game");
    const app = document.getElementById("app");
    const vv = window.visualViewport;
    const w = Math.max(320, Math.floor(vv?.width || window.innerWidth || document.documentElement.clientWidth || screen.width || 360));
    const h = Math.max(240, Math.floor(vv?.height || window.innerHeight || document.documentElement.clientHeight || screen.height || 640));

    if (canvas) {
      canvas.style.position = "fixed";
      canvas.style.inset = "0";
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.style.display = "block";
      canvas.style.visibility = "visible";
      canvas.style.opacity = "1";
    }
    if (app) {
      app.style.position = "fixed";
      app.style.inset = "0";
      app.style.width = `${w}px`;
      app.style.height = `${h}px`;
    }
    try { g?.resize?.(); } catch (_) {}
    try { if (g?.mode === "playing") g.render?.(); } catch (_) {}
  };

  const queueFit = () => {
    requestAnimationFrame(() => fitViewport(window.UI?.game));
    setTimeout(() => fitViewport(window.UI?.game), 80);
    setTimeout(() => fitViewport(window.UI?.game), 220);
    setTimeout(() => fitViewport(window.UI?.game), 520);
  };

  if (!UI.__fullscreenButtonViewportFix && typeof UI.fullscreen === "function") {
    const originalFullscreen = UI.fullscreen.bind(UI);
    UI.fullscreen = function fullscreenButtonViewportFix(...args) {
      const result = originalFullscreen(...args);
      queueFit();
      return result;
    };
    UI.__fullscreenButtonViewportFix = true;
  }

  ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange", "pageshow"].forEach(eventName => {
    window.addEventListener(eventName, queueFit, { passive: true });
    document.addEventListener(eventName, queueFit, { passive: true });
  });
})();
