window.CherriftStorage = {
  key: "cherrift_save_v025_polish",
  defaults() {
    return {
      coins: 0,
      keys: 3,
      selectedSkin: "cherry_default",
      unlockedSkins: ["cherry_default", "fairy_cherry"],
      inventory: [],
      equipped: {},
      best: { time:0, kills:0 },
      settings: { volume:60, touchMode:true, fpsLimit:60 }
    };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      const data = raw ? JSON.parse(raw) : {};
      const d = this.defaults();
      const save = { ...d, ...data };
      save.best = { ...d.best, ...(data.best || {}) };
      save.settings = { ...d.settings, ...(data.settings || {}) };
      save.settings.fpsLimit = [30, 60].includes(+save.settings.fpsLimit) ? +save.settings.fpsLimit : 60;
      save.equipped = data.equipped || {};
      save.inventory = Array.isArray(data.inventory) ? data.inventory : [];
      save.unlockedSkins = Array.isArray(data.unlockedSkins) ? data.unlockedSkins : [...d.unlockedSkins];
      for (const id of d.unlockedSkins) if (!save.unlockedSkins.includes(id)) save.unlockedSkins.push(id);
      if (!CHERRIFT_DATA.skins.some(s => s.id === save.selectedSkin)) save.selectedSkin = "cherry_default";
      return save;
    } catch(e) {
      return this.defaults();
    }
  },
  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
};
