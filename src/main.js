window.addEventListener("DOMContentLoaded", async () => {
  const patchCount = 21;
  let loadedPatches = 0;

  function updateBoot(percent, message) {
    const value = Math.max(3, Math.min(100, Math.round(percent)));
    const fill = document.getElementById("bootFillV060");
    const text = document.getElementById("bootTextV060");
    const label = document.getElementById("bootPercentV060");
    if (fill) fill.style.width = `${value}%`;
    if (text && message) text.textContent = message;
    if (label) label.textContent = `${value}%`;
  }

  async function loadScript(src,label){
    try{
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src;
        const timeout=window.setTimeout(()=>{
          script.onload=null;
          script.onerror=null;
          script.remove();
          reject(new Error(`${label} timed out`));
        },10000);
        script.onload=()=>{window.clearTimeout(timeout);resolve();};
        script.onerror=error=>{window.clearTimeout(timeout);reject(error);};
        document.head.appendChild(script);
      });
    }catch(error){
      console.error(`[CHERRIFT] ${label} failed:`,error);
    }finally{
      loadedPatches++;
      updateBoot(5 + loadedPatches / patchCount * 40, `Loading ${label}…`);
    }
  }

  updateBoot(5, "Loading game systems…");
  await loadScript("src/cherrift_v042_completion.js?v=061","v0.4 completion");
  await loadScript("src/cherrift_v050.js?v=050","v0.5");
  await loadScript("src/cherrift_mobile_v051.js?v=051","v0.5.1");
  await loadScript("src/cherrift_v052.js?v=052","v0.5.2");
  await loadScript("src/cherrift_v053.js?v=053","v0.5.3");
  await loadScript("src/cherrift_v055a.js?v=055a","v0.5.5a");
  await loadScript("src/cherrift_v055b.js?v=055b","v0.5.5b");
  await loadScript("src/cherrift_v055c.js?v=055c","v0.5.5c");
  await loadScript("src/cherrift_v0551.js?v=0551","v0.5.5.1");
  await loadScript("src/cherrift_v0552.js?v=0552","v0.5.5.2");
  await loadScript("src/cherrift_v0553.js?v=0553","v0.5.5.3");
  await loadScript("src/cherrift_v0554.js?v=0554","v0.5.5.4");
  await loadScript("src/cherrift_v0555.js?v=0555","v0.5.5.5");
  await loadScript("src/cherrift_v0556.js?v=0556","v0.5.5.6");
  await loadScript("src/cherrift_v0557.js?v=0611","v0.5.5.7 Library freeze hotfix");
  await loadScript("src/cherrift_v0558.js?v=0558","v0.5.5.8 Base Cherry");
  await loadScript("src/cherrift_v0559.js?v=0559","v0.5.5.9 Dash/UI reset");
  await loadScript("src/cherrift_v0560.js?v=0560","v0.5.6.0 Gear redesign");
  await loadScript("src/cherrift_v0561.js?v=0561","v0.5.6.1 Wuxia Sakura");
  await loadScript("src/cherrift_v0563.js?v=0563","v0.5.6.3 Warrior VFX fix");
  await loadScript("src/cherrift_v060.js?v=061","v0.6.1 Bloom UI hotfix");

  try {
    const save = CherriftStorage.load();
    updateBoot(46, "Reading local progress…");

    if (window.CHERRIFT_V060?.preload) {
      const preloadResult = await window.CHERRIFT_V060.preload(save, (done, total, message) => {
        const ratio = total ? done / total : 0;
        updateBoot(46 + ratio * 47, message);
      });
      if (preloadResult.failures.length) {
        console.warn("[CHERRIFT] Some optional artwork could not be preloaded:", preloadResult.failures);
      }
    }

    updateBoot(95, "Preparing the menu…");
    const input = new CherriftInput();
    const game = new CherriftGame(
      document.getElementById("game"),
      input,
      save
    );
    UI.init(save, game);
    window.CHERRIFT_V060?.initAfterUI?.(save, game);
    updateBoot(99, "Finalizing interface…");
    window.CHERRIFT_V060?.finishBoot?.();
  } catch (error) {
    console.error("[CHERRIFT] Startup failed:", error);
    updateBoot(100, "Loading completed with a fallback");
    document.body.classList.remove("v060-booting");
    document.getElementById("bootV060")?.classList.add("done");
  }
});
