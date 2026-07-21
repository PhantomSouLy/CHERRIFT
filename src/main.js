window.addEventListener("DOMContentLoaded", async () => {
  document.title = "CHERRIFT v0.7.0 – TEST BUILD";
  const bootSub = document.querySelector(".boot-sub-v060");
  if (bootSub) bootSub.textContent = "v0.7.0 · TEST BUILD";
  const patchCount = 26;
  let loadedPatches = 0;
  const failedPatches = [];

  function preferredBootLanguage() {
    try {
      const save = JSON.parse(localStorage.getItem("cherrift_save_v025_polish") || "null");
      if (["hu", "en"].includes(save?.settings?.language)) return save.settings.language;
    } catch (_) {}
    return document.documentElement.lang === "en" ? "en" : "hu";
  }

  function localizedBootMessage(message) {
    const translated = window.CHERRIFT_I18N?.translate?.(message);
    if (translated && translated !== message) return translated;
    if (preferredBootLanguage() !== "hu") return message;
    const copy = {
      "Loading game systems…": "Játékrendszerek betöltése…",
      "Checking account and save…": "Fiók és mentés ellenőrzése…",
      "Loading cloud save…": "Felhőmentés betöltése…",
      "Reading local progress…": "Helyi mentés beolvasása…",
      "Preparing the menu…": "Menü előkészítése…",
      "Finalizing interface…": "Felület véglegesítése…",
      "Loading failed": "A betöltés sikertelen"
    };
    if (copy[message]) return copy[message];
    if (/^Loading .+…$/.test(message)) return "Játékrendszerek betöltése…";
    return message;
  }

  function updateBoot(percent, message) {
    const value = Math.max(3, Math.min(100, Math.round(percent)));
    const fill = document.getElementById("bootFillV060");
    const text = document.getElementById("bootTextV060");
    const label = document.getElementById("bootPercentV060");
    if (fill) fill.style.width = `${value}%`;
    if (text && message) text.textContent = localizedBootMessage(message);
    if (label) label.textContent = `${value}%`;
  }

  function showBootFailure(error) {
    const boot = document.getElementById("bootV060");
    const card = boot?.querySelector(".boot-card-v060");
    const translate = value => {
      const translated = window.CHERRIFT_I18N?.translate?.(value);
      if (translated && translated !== value) return translated;
      if (preferredBootLanguage() !== "hu") return value;
      return {
        "Loading failed": "A betöltés sikertelen",
        "Some game files could not be loaded.": "Néhány játékfájl nem tölthető be.",
        "Reload game": "Játék újratöltése"
      }[value] || value;
    };
    updateBoot(100, translate("Loading failed"));
    document.body.classList.add("v060-booting", "v062-startup-failed");
    boot?.classList.remove("done");
    if (card && !document.getElementById("bootErrorV062")) {
      const details = document.createElement("div");
      details.id = "bootErrorV062";
      details.className = "boot-error-v062";
      details.innerHTML = `<strong>${translate("Loading failed")}</strong><p>${translate("Some game files could not be loaded.")}</p>`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "boot-retry-v062";
      retry.textContent = translate("Reload game");
      retry.addEventListener("click", () => window.location.reload());
      details.appendChild(retry);
      card.appendChild(details);
    }
    console.error("[CHERRIFT] Startup blocked to avoid a partially initialized game:", error);
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
      failedPatches.push(label);
    }finally{
      loadedPatches++;
      updateBoot(5 + loadedPatches / patchCount * 40, `Loading ${label}…`);
    }
  }

  updateBoot(5, "Loading game systems…");
  await loadScript("src/cherrift_v042_completion.js?v=063","v0.4 completion");
  await loadScript("src/cherrift_v050.js?v=050","v0.5");
  await loadScript("src/cherrift_mobile_v051.js?v=051","v0.5.1");
  await loadScript("src/cherrift_v052.js?v=052","v0.5.2");
  await loadScript("src/cherrift_v053.js?v=053","v0.5.3");
  await loadScript("src/cherrift_v055a.js?v=062","v0.5.5a");
  await loadScript("src/cherrift_v055b.js?v=055b","v0.5.5b");
  await loadScript("src/cherrift_v055c.js?v=055c","v0.5.5c");
  await loadScript("src/cherrift_v0551.js?v=0551","v0.5.5.1");
  await loadScript("src/cherrift_v0552.js?v=0552","v0.5.5.2");
  await loadScript("src/cherrift_v0553.js?v=062","v0.5.5.3");
  await loadScript("src/cherrift_v0554.js?v=0554","v0.5.5.4");
  await loadScript("src/cherrift_v0555.js?v=0555","v0.5.5.5");
  await loadScript("src/cherrift_v0556.js?v=0556","v0.5.5.6");
  await loadScript("src/cherrift_v0557.js?v=0611","v0.5.5.7 Library freeze hotfix");
  await loadScript("src/cherrift_v0558.js?v=0558","v0.5.5.8 Base Cherry");
  await loadScript("src/cherrift_v0559.js?v=0559","v0.5.5.9 Dash/UI reset");
  await loadScript("src/cherrift_v0560.js?v=0560","v0.5.6.0 Gear redesign");
  await loadScript("src/cherrift_v0561.js?v=0561","v0.5.6.1 Wuxia Sakura");
  await loadScript("src/cherrift_v0563.js?v=063","v0.6.3 Warrior VFX grid fix");
  await loadScript("src/cherrift_v060.js?v=062","v0.6.1 Bloom UI + click audio");
  await loadScript("src/cherrift_i18n_v062.js?v=062","v0.6.2 Hungarian/English localization");
  await loadScript("src/cherrift_v062.js?v=062","v0.6.2 quality update");
  await loadScript("src/cherrift_v063.js?v=063","v0.6.3 mail, reports, equipment and effects");
  await loadScript("src/cherrift_v064_auth.js?v=065","v0.6.3 Supabase Discord cloud save");
  await loadScript("src/cherrift_v070.js?v=070","v0.7.0 Arsenal & Enhancement");

  try {
    if (failedPatches.length) {
      throw new Error(`Update files failed: ${failedPatches.join(", ")}`);
    }
    updateBoot(44, "Checking account and save…");
    const loadGuestSave = () => CherriftStorage.load();
    const save = window.CHERRIFT_AUTH?.bootstrapSave
      ? await window.CHERRIFT_AUTH.bootstrapSave(loadGuestSave)
      : loadGuestSave();
    updateBoot(46, window.CHERRIFT_AUTH?.getState?.().mode === "discord" ? "Loading cloud save…" : "Reading local progress…");

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
    showBootFailure(error);
  }
});
