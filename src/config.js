window.GC_CONFIG = {
  version: "0.1.1",
  assetSpec: {
    player: {
      src: "assets/player/cherry_sprite_sheet.png",
      frameWidth: 192,
      frameHeight: 192,
      columns: 6,
      idleFps: 3,
      walkFps: 8,
      displayWidth: 96,
      displayHeight: 96,
      animations: {
        idle: { down: 0, up: 2, left: 4, right: 6 },
        walk: { down: 1, up: 3, left: 5, right: 7 }
      }
    },
    slime: {
      src: "assets/enemies/slime_sprite_sheet.png",
      frameWidth: 384,
      frameHeight: 384,
      rows: { idle: 0, move: 1, death: 2 },
      columns: 4,
      fps: 7,
      displayWidth: 76,
      displayHeight: 76
    }
  },
  baseStats: {
    playerSpeed: 235,
    playerRadius: 18,
    maxHp: 100,
    bulletDamage: 20,
    bulletSpeed: 560,
    fireInterval: 0.42,
    pickupRadius: 24,
    magnetRadius: 110,
    skillCooldown: 8.0
  },
  balance: {
    worldSize: 4200,
    enemyBaseHp: 42,
    enemyBaseSpeed: 66,
    enemyDamagePerSecond: 15,
    enemySpawnEvery: 1.35,
    maxEnemiesBase: 18,
    xpToNextBase: 18
  }
};
