window.StorageService = {
  key: "gacherry_profile_v001",
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "null");
    } catch (err) {
      console.warn("Storage load failed", err);
      return null;
    }
  },
  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (err) {
      console.warn("Storage save failed", err);
    }
  },
  reset() {
    localStorage.removeItem(this.key);
  }
};
