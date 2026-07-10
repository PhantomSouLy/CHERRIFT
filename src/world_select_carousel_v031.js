(() => {
  if (!window.UI || !window.CherriftStorage) return;

  const STAGES = [
    { id:"world_1_1", world:1, index:1, name:"World 1-1", title:"Blooming Meadow", theme:"forest_day", goalKills:28, energy:5, repeatReward:{coins:14}, firstClearReward:{coins:28,keys:1}, desc:"Az első pálya. Slimeok, könnyű raid hullámok, alap progression." },
    { id:"world_1_2", world:1, index:2, name:"World 1-2", title:"Petal Trail", theme:"forest_day", goalKills:34, energy:5, repeatReward:{coins:16}, firstClearReward:{coins:30}, desc:"Kicsit több ellenfél és gyorsabb ritmus." },
    { id:"world_1_3", world:1, index:3, name:"World 1-3", title:"Clover Crossing", theme:"forest_day", goalKills:40, energy:5, repeatReward:{coins:18}, firstClearReward:{coins:34}, desc:"Belépnek az erősebb slime típusok." },
    { id:"world_1_4", world:1, index:4, name:"World 1-4", title:"Rooted Hollow", theme:"forest_day", goalKills:46, energy:5, repeatReward:{coins:22}, firstClearReward:{coins:40,keys:1}, desc:"Nagyobb raid hullámok és tankosabb ellenfelek." },
    { id:"world_1_5", world:1, index:5, name:"World 1-5", title:"Slime Nest", theme:"forest_day", goalKills:54, energy:5, repeatReward:{coins:28}, firstClearReward:{coins:55,keys:1}, desc:"World 1 záró pálya mini boss-szal." },
    { id:"world_2_1", world:2, index:1, name:"World 2-1", title:"Night Bloom", theme:"forest_night", goalKills:34, energy:5, repeatReward:{coins:20}, firstClearReward:{coins:36}, desc:"Az első sötét pálya. Új rovar/pók enemy pool." },
    { id:"world_2_2", world:2, index:2, name:"World 2-2", title:"Moonlit Grove", theme:"forest_night", goalKills:40, energy:5, repeatReward:{coins:22}, firstClearReward:{coins:40}, desc:"Éjszakai raid hullámok, gyorsabb mozgású ellenfelekkel." },
    { id:"world_2_3", world:2, index:3, name:"World 2-3", title:"Shadow Thicket", theme:"forest_night", goalKills:46, energy:5, repeatReward:{coins:24}, firstClearReward:{coins:44}, desc:"Sűrűbb spawn, agresszívebb rovarok." },
    { id:"world_2_4", world:2, index:4, name:"World 2-4", title:"Echo Burrow", theme:"forest_night", goalKills:52, energy:5, repeatReward:{coins:28}, firstClearReward:{coins:48,keys:1}, desc:"Erős éjszakai raid pálya." },
    { id:"world_2_5", world:2, index:5, name:"World 2-5", title:"Midnight Den", theme:"forest_night", goalKills:58, energy:5, repeatReward:{coins:32}, firstClearReward:{coins:58,keys:1}, desc:"World 2 záró pálya mini boss-szal." }
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

  const oldInit = UI.init.bind(UI);
  UI.init = function patchedCarouselInit(save, game) {
    ensureSave(save);
    this.worldCarouselIndex = 0; // mindig az 1. pályáról indul a World Select
    oldInit(save, game);
    this.installWorldCarouselSwipe();
  };

  const oldBind = UI.bind.bind(UI);
  UI.bind = function patchedCarouselBind() {
    oldBind();

    const openWorld = () => this.openWorldSelect();
    const launch = () => this.launchSelectedWorld();

    const playBtn = document.getElementById("playBtn");
    if (playBtn) playBtn.onclick = openWorld;

    const mobilePlayBtn = document.getElementById("mobilePlayBtn");
    if (mobilePlayBtn) mobilePlayBtn.onclick = openWorld;

    const mobileModeBtn = document.getElementById("mobileModeBtn");
    if (mobileModeBtn) mobileModeBtn.onclick = openWorld;

    document.querySelectorAll('[data-open="worlds"]').forEach(btn => btn.onclick = openWorld);

    document.getElementById("worldPrevBtn")?.addEventListener("click", () => this.moveWorldCarousel(-1));
    document.getElementById("worldNextBtn")?.addEventListener("click", () => this.moveWorldCarousel(1));
    document.getElementById("worldLaunchBtn")?.addEventListener("click", launch);
    document.getElementById("worldBackBtn")?.addEventListener("click", () => this.open("menu"));

    const oldWorldPlay = document.getElementById("worldPlaySelectedBtn");
    if (oldWorldPlay) oldWorldPlay.onclick = launch;
  };

  UI.openWorldSelect = function openWorldSelect() {
    ensureSave(this.save);
    this.worldCarouselIndex = 0;
    this.open("worlds");
    this.renderWorldPanel();
  };

  UI.launchSelectedWorld = function launchSelectedWorld() {
    ensureSave(this.save);
    const stage = STAGES[this.worldCarouselIndex] || STAGES[0];
    if (!unlocked(this.save, stage.id)) {
      this.toast?.("Ez a pálya még locked");
      return;
    }

    this.save.selectedStageId = stage.id;
    CherriftStorage.save(this.save);
    ["worlds", "menu", "skins", "gear", "chests", "settings", "stageClearModal"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    this.game.start();
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