window.CherriftStorage = {
  key: "cherrift_save_v022",
  defaults() {
    return {
      coins: 0,
      keys: 3,
      selectedSkin: "cherry_default",
      unlockedSkins: ["cherry_default"],
      inventory: [],
      equipped: {},
      best: { time:0, kills:0 },
      settings: { volume:60, touchMode:true }
    };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      const data = raw ? JSON.parse(raw) : {};
      const save = { ...this.defaults(), ...data };
      save.best = { ...this.defaults().best, ...(data.best || {}) };
      save.settings = { ...this.defaults().settings, ...(data.settings || {}) };
      save.equipped = data.equipped || {};
      save.inventory = Array.isArray(data.inventory) ? data.inventory : [];
      save.unlockedSkins = Array.isArray(data.unlockedSkins) ? data.unlockedSkins : ["cherry_default"];
      return save;
    } catch(e) {
      return this.defaults();
    }
  },
  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
};