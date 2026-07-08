window.ProfileService = {
  createDefault() {
    return {
      id: "guest",
      authProvider: "guest",
      username: "Guest",
      avatar: "assets/ui/avatar_guest.png",
      createdAt: Date.now(),
      totalRuns: 0,
      bestRunTime: 0,
      bestKills: 0,
      coins: 0,
      unlockedSkins: ["default_cherry"],
      selectedSkin: "default_cherry",
      achievements: {},
      futureDiscord: {
        ready: true,
        note: "Később ide kerülhet a Discord ID, username és avatar."
      }
    };
  },
  load() {
    const loaded = StorageService.load();
    return loaded || this.createDefault();
  },
  save(profile) {
    StorageService.save(profile);
  },
  finishRun(profile, stats) {
    profile.totalRuns = (profile.totalRuns || 0) + 1;
    profile.bestRunTime = Math.max(profile.bestRunTime || 0, stats.time || 0);
    profile.bestKills = Math.max(profile.bestKills || 0, stats.kills || 0);
    profile.coins = (profile.coins || 0) + Math.floor((stats.kills || 0) / 5);
    this.save(profile);
  }
};
