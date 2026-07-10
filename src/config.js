window.GC_CONFIG = {
  version: "0.1.2",
  assetSpec: {
    player: {
      src: "assets/player/cherry_sprite_sheet.png?v=4x8-idlefix",
      frameWidth: 192,
      frameHeight: 192,
      columns: 4,

      // Idle kozben mindig az elso frame-et rajzoljuk, igy nem fog ugralni.
      idleFps: 0,
      walkFps: 8,

      // Kicsit kisebb megjelenites, hogy ne logjon ki.
      displayWidth: 84,
      displayHeight: 84,

      // Alul par pixelt levagunk a forras frame-bol, ha a sheetben lent maradna apro szemet / atlogas.
      crop: { top: 0, right: 0, bottom: 14, left: 0 },

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
