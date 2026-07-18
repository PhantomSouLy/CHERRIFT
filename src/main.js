window.addEventListener("DOMContentLoaded", async () => {
  async function loadScript(src,label){
    try{
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src;
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      });
    }catch(error){
      console.error(`[CHERRIFT] ${label} failed:`,error);
    }
  }

  await loadScript("src/cherrift_v042_completion.js?v=042","v0.4 completion");
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
  await loadScript("src/cherrift_v0557.js?v=0557","v0.5.5.7");
  await loadScript("src/cherrift_v0558.js?v=0558","v0.5.5.8 Base Cherry");
  await loadScript("src/cherrift_v0559.js?v=0559","v0.5.5.9 Dash/UI reset");
  await loadScript("src/cherrift_v0560.js?v=0560","v0.5.6.0 Gear redesign");
  await loadScript("src/cherrift_v0561.js?v=0561","v0.5.6.1 Wuxia Sakura");
  await loadScript("src/cherrift_v0563.js?v=0563","v0.5.6.3 Warrior VFX fix");

  const save = CherriftStorage.load();
  const input = new CherriftInput();
  const game = new CherriftGame(
    document.getElementById("game"),
    input,
    save
  );
  UI.init(save, game);
});