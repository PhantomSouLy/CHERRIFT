window.GC_CONFIG = {
  version: "0.1.0",
  assetSpec: {
    player: {
      src: "assets/player/cherry_sprite_sheet.png",
      frameWidth: 128,
      frameHeight: 128,
      rows: { down: 0, left: 1, right: 2, up: 3 },
      columns: 4
    },
    slime: {
      src: "assets/enemies/slime_sprite_sheet.png",
      frameWidth: 96,
      frameHeight: 96,
      rows: { idle: 0, move: 1, death: 2 },
      columns: 4
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
