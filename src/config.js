window.CHERRIFT_CONFIG = {
  player: {
    src: "assets/player/cherry_sprite_sheet.png",
    frameWidth: 192,
    frameHeight: 192,
    columns: 6,
    displayWidth: 96,
    displayHeight: 96,
    rows: {
      idleDown: 0, walkDown: 1,
      idleUp: 2, walkUp: 3,
      idleLeft: 4, walkLeft: 5,
      idleRight: 6, walkRight: 7
    }
  },
  slime: {
    src: "assets/enemies/slime_sprite_sheet.png",
    frameWidth: 384,
    frameHeight: 384,
    columns: 4,
    displayWidth: 76,
    displayHeight: 76,
    rows: { idle: 0, move: 1, death: 2 }
  },
  map: {
    grass: "assets/map/grass_tile.png",
    rockSmall: "assets/map/rock_small.png",
    rockBig: "assets/map/rock_big.png",
    bush1: "assets/map/bush_01.png",
    bush2: "assets/map/bush_02.png",
    log: "assets/map/log.png",
    treeSmall: "assets/map/tree_small.png",
    treeBig: "assets/map/tree_big.png"
  },
  pickups: {
    xpSmall: "assets/pickups/xp_small.png",
    xpBig: "assets/pickups/xp_big.png"
  },
  effects: {
    burst: "assets/effects/pink_burst.png"
  }
};