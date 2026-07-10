(() => {
  if (!window.UI || !window.CherriftStorage) return;

  const STAGES = [
    { id:"world_1_1", world:1, index:1, name:"World 1-1", title:"Blooming Meadow", theme:"forest_day", goalKills:120, energy:5, repeatReward:{coins:28}, firstClearReward:{coins:55,keys:1}, desc:"Az első pálya már igazi progression: több mob, több raid, hosszabb clear." },
    { id:"world_1_2", world:1, index:2, name:"World 1-2", title:"Petal Trail", theme:"forest_day", goalKills:135, energy:5, repeatReward:{coins:32}, firstClearReward:{coins:62}, desc:"Gyorsabb spawn, több slime típus és erősebb raid hullámok." },
    { id:"world_1_3", world:1, index:3, name:"World 1-3", title:"Clover Crossing", theme:"forest_day", goalKills:155, energy:5, repeatReward:{coins:36}, firstClearReward:{coins:70}, desc:"Blue slime és mixed raid hullámok erősebben jelennek meg." },
    { id:"world_1_4", world:1, index:4, name:"World 1-4", title:"Rooted Hollow", theme:"forest_day", goalKills:175, energy:5, repeatReward:{coins:42}, firstClearReward:{coins:82,keys:1}, desc:"Tankosabb slimeok, nagyobb raid nyomás." },
    { id:"world_1_5", world:1, index:5, name:"World 1-5", title:"Slime Nest", theme:"forest_day", goalKills:210, energy:5, repeatReward:{coins:52}, firstClearReward:{coins:110,keys:1}, desc:"World 1 záró pálya mini boss-szal és nagy raid hullámokkal." },
    { id:"world_2_1", world:2, index:1, name:"World 2-1", title:"Night Bloom", theme:"forest_night", goalKills:145, energy:5, repeatReward:{coins:38}, firstClearReward:{coins:72}, desc:"Az első sötét pálya. Új rovar/pók enemy pool." },
    { id:"world_2_2", world:2, index:2, name:"World 2-2", title:"Moonlit Grove", theme:"forest_night", goalKills:165, energy:5, repeatReward:{coins:44}, firstClearReward:{coins:84}, desc:"Éjszakai raid hullámok, gyorsabb mozgású ellenfelekkel." },
    { id:"world_2_3", world:2, index:3, name:"World 2-3", title:"Shadow Thicket", theme:"forest_night", goalKills:185, energy:5, repeatReward:{coins:50}, firstClearReward:{coins:96}, desc:"Sűrűbb spawn, agresszívebb rovarok." },
    { id:"world_2_4", world:2, index:4, name:"World 2-4", title:"Echo Burrow", theme:"forest_night", goalKills:205, energy:5, repeatReward:{coins:58}, firstClearReward:{coins:110,keys:1}, desc:"Erős éjszakai raid pálya." },
    { id:"world_2_5", world:2, index:5, name:"World 2-5", title:"Midnight Den", theme:"forest_night", goalKills:240, energy:5, repeatReward:{coins:68}, firstClearReward:{coins:135,keys:1}, desc:"World 2 záró pálya mini boss-szal." }
  ];

  const byId = Object.fromEntries(STAGES.map((stage, index) => [stage.id, { ...stage, carouselIndex:index }]));

  function ensureSave(save) {
    save.selectedStageId ||= "world_1_1";
    save.unlockedStages = Array.isArray(save.unlockedStages) && save.unlockedStages.length ? save.unlockedStages : ["world_1_1"];
    if (!save.unlockedStages.includes("world_1_1")) save.unlockedStages.unshift("world_1_1");
    save.clearedStages ||= {};
    save.firstClearClaimed ||= {};
    if (!byId[save.selectedStageId]) save.selectedStageId = "world_1_1";
  }

  function unlocked(save, id) { ensureSave(save); return save.unlockedStages.includes(id); }
  function cleared(save, id) { ensureSave(save); return !!save.clearedStages[id]; }
  function rewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`+${reward.coins} coins`);
    if (reward.keys) parts.push(`+${reward.keys} key`);
    return parts.join(" · ") || "-";
  }

  function cleanButton(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const clone = el.cloneNode(true);
    el.replaceWith(clone);
    return clone;
  }

  function forceGameViewport(game) {
    const canvas = game?.canvas || document.getElementById("game");
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
      app.style.background = "transparent";
    }

    try { game?.resize?.(); } catch (_) {}
    try { game?.render?.(); } catch (_) {}
  }

  function hideAllGamePanels() {
    ["worlds", "menu", "skins", "gear", "chests", "settings", "stageClearModal", "gameOver", "pauseModal", "levelModal"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
  }

  function showOnlyGameUI(game) {
    hideAllGamePanels();
    document.body.classList.add("is-playing");
    document.getElementById("hud")?.classList.remove("hidden");
    document.getElementById("skill")?.classList.remove("hidden");
    if (game?.stage) document.getElementById("stageHud")?.classList.remove("hidden");
    forceGameViewport(game);
    requestAnimationFrame(() => forceGameViewport(game));
    setTimeout(() => forceGameViewport(game), 80);
    setTimeout(() => forceGameViewport(game), 220);
    setTimeout(() => forceGameViewport(game), 520);
  }

  const oldInit = UI.init.bind(UI);
  UI.init = function patchedCarouselInit(save, game) {
    ensureSave(save);
    this.worldCarouselIndex = 0;
    oldInit(save, game);
    this.installWorldCarouselSwipe();
  };

  const oldBind = UI.bind.bind(UI);
  UI.bind = function patchedCarouselBind() {
    oldBind();

    const playBtn = cleanButton("playBtn");
    const mobilePlayBtn = cleanButton("mobilePlayBtn");
    const worldPrevBtn = cleanButton("worldPrevBtn");
    const worldNextBtn = cleanButton("worldNextBtn");
    const worldLaunchBtn = cleanButton("worldLaunchBtn");
    const worldBackBtn = cleanButton("worldBackBtn");

    const openWorld = e => {
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      this.openWorldSelect();
    };
    const launch = e => {
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      this.launchSelectedWorld();
    };

    playBtn?.addEventListener("click", openWorld);
    mobilePlayBtn?.addEventListener("click", openWorld, { capture:true });

    // A külön World gombok nem kellenek, de ha marad régi cache-ben ilyen gomb, ugyanoda nyisson.
    document.querySelectorAll('[data-open="worlds"]').forEach(btn => {
      btn.onclick = openWorld;
      btn.addEventListener("click", openWorld, { capture:true });
    });

    worldPrevBtn?.addEventListener("click", () => this.moveWorldCarousel(-1));
    worldNextBtn?.addEventListener("click", () => this.moveWorldCarousel(1));
    worldLaunchBtn?.addEventListener("click", launch, { capture:true });
    worldBackBtn?.addEventListener("click", e => { e?.preventDefault?.(); this.open("menu"); });
  };

  UI.openWorldSelect = function openWorldSelect() {
    ensureSave(this.save);
    this.worldCarouselIndex = 0;
    document.body.classList.remove("is-playing");
    ["hud", "skill", "stageHud", "pauseModal", "gameOver", "levelModal", "stageClearModal"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    this.open("worlds");
    this.renderWorldPanel();
  };

  UI.launchSelectedWorld = async function launchSelectedWorld() {
    if (this.__launchingStage) return;
    ensureSave(this.save);
    const stage = STAGES[this.worldCarouselIndex || 0] || STAGES[0];
    if (!unlocked(this.save, stage.id)) {
      this.toast?.("Ez a pálya még locked");
      return;
    }

    this.__launchingStage = true;
    try {
      this.save.selectedStageId = stage.id;
      CherriftStorage.save(this.save);
      hideAllGamePanels();
      document.body.classList.add("is-playing");
      forceGameViewport(this.game);
      await this.game.start();
      showOnlyGameUI(this.game);
    } catch (err) {
      console.error("Stage launch failed", err);
      this.toast?.("Stage start hiba");
    } finally {
      this.__launchingStage = false;
    }
  };

  UI.moveWorldCarousel = function moveWorldCarousel(dir) {
    const next = Math.max(0, Math.min(STAGES.length - 1, (this.worldCarouselIndex || 0) + dir));
    if (next === this.worldCarouselIndex) return;
    this.worldCarouselIndex = next;
    this.renderWorldPanel();
  };

  UI.installWorldCarouselSwipe = function installWorldCarouselSwipe() {
    if (this.__worldSwipeBound) return;
    this.__worldSwipeBound = true;

    const card = document.getElementById("carouselStageImage") || document.querySelector(".world-carousel-card");
    if (!card) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    card.addEventListener("pointerdown", e => {
      active = true;
      startX = e.clientX;
      startY = e.clientY;
    }, { passive:true });

    card.addEventListener("pointerup", e => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        this.moveWorldCarousel(dx < 0 ? 1 : -1);
      }
    }, { passive:true });

    card.addEventListener("pointercancel", () => { active = false; }, { passive:true });
  };

  UI.renderWorldPanel = function renderWorldCarouselPanel() {
    ensureSave(this.save);
    const stage = STAGES[this.worldCarouselIndex || 0] || STAGES[0];
    const isUnlocked = unlocked(this.save, stage.id);
    const isCleared = cleared(this.save, stage.id);
    const firstClaimed = !!this.save.firstClearClaimed?.[stage.id];

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    set("carouselWorldLabel", `World ${stage.world}`);
    set("carouselStageName", stage.name);
    set("carouselStageTitle", stage.title);
    set("carouselStageDesc", stage.desc);
    set("carouselStageObjective", `${stage.goalKills} enemies`);
    set("carouselStageReward", rewardText(stage.repeatReward));
    set("carouselStageFirstReward", firstClaimed ? "Claimed" : rewardText(stage.firstClearReward));
    set("worldSelectedInfo", `${stage.name} · ${stage.title} · ${stage.goalKills} enemies`);

    const state = document.getElementById("carouselStageState");
    if (state) {
      state.className = `world-state-pill ${isCleared ? "cleared" : isUnlocked ? "unlocked" : "locked"}`;
      state.textContent = isCleared ? "Cleared" : isUnlocked ? "Unlocked" : "Locked";
    }

    const img = document.getElementById("carouselStageImage");
    if (img) img.classList.toggle("night", stage.theme === "forest_night");

    const prev = document.getElementById("worldPrevBtn");
    const next = document.getElementById("worldNextBtn");
    const launch = document.getElementById("worldLaunchBtn");
    if (prev) prev.disabled = (this.worldCarouselIndex || 0) <= 0;
    if (next) next.disabled = (this.worldCarouselIndex || 0) >= STAGES.length - 1;
    if (launch) {
      launch.disabled = !isUnlocked;
      launch.textContent = isUnlocked ? "PLAY" : "LOCKED";
    }
  };
})();
