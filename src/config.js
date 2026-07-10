window.CHERRIFT_CONFIG = {
  version: "0.2.5-polish",
  worldSize: 4200,

  performance: {
    defaultFpsLimit: 60,
    allowedFpsLimits: [30, 60],
    renderScaleMax: 1.5,
    cameraZoom: 1.14
  },

  player: {
    frameWidth: 192,
    frameHeight: 192,
    displayWidth: 116,
    displayHeight: 116,
    defaultSkin: "cherry_default",
    skins: {
      cherry_default: {
        id: "cherry_default",
        folder: "base_cherry",
        skillType: "dash",
        dashSpeed: 760,
        dashDuration: 0.34,
        dashDamageRadius: 105,
        dashDamageMult: 1.3,
        states: {
          // Fontos: a Base Cherry idle sheet 4 frame-es, nem 6. Ez okozta a villódzást.
          idle: { fps: 3, frames: 4, dirs: {
            down: "assets/player/skins/base_cherry/base_cherry_idle_down.png?v=025",
            up: "assets/player/skins/base_cherry/base_cherry_idle_up.png?v=025",
            left: "assets/player/skins/base_cherry/base_cherry_idle_left.png?v=025",
            right: "assets/player/skins/base_cherry/base_cherry_idle_right.png?v=025" } },
          walk: { fps: 8, frames: 6, dirs: {
            down: "assets/player/skins/base_cherry/base_cherry_walk_down.png?v=025",
            up: "assets/player/skins/base_cherry/base_cherry_walk_up.png?v=025",
            left: "assets/player/skins/base_cherry/base_cherry_walk_left.png?v=025",
            right: "assets/player/skins/base_cherry/base_cherry_walk_right.png?v=025" } },
          skill: { fps: 18, frames: 6, duration: 0.34, dirs: {
            down: "assets/player/skins/base_cherry/base_cherry_skill_dash_down.png?v=025",
            up: "assets/player/skins/base_cherry/base_cherry_skill_dash_up.png?v=025",
            left: "assets/player/skins/base_cherry/base_cherry_skill_dash_left.png?v=025",
            right: "assets/player/skins/base_cherry/base_cherry_skill_dash_right.png?v=025" } }
        }
      },
      fairy_cherry: {
        id: "fairy_cherry",
        folder: "fairy_cherry",
        skillType: "magic_burst",
        burstRadius: 185,
        states: {
          idle: { fps: 3, frames: 4, dirs: {
            down: "assets/player/skins/fairy_cherry/fairy_cherry_idle_down.png?v=025",
            up: "assets/player/skins/fairy_cherry/fairy_cherry_idle_up.png?v=025",
            left: "assets/player/skins/fairy_cherry/fairy_cherry_idle_left.png?v=025",
            right: "assets/player/skins/fairy_cherry/fairy_cherry_idle_right.png?v=025" } },
          walk: { fps: 8, frames: 6, dirs: {
            down: "assets/player/skins/fairy_cherry/fairy_cherry_walk_down.png?v=025",
            up: "assets/player/skins/fairy_cherry/fairy_cherry_walk_up.png?v=025",
            left: "assets/player/skins/fairy_cherry/fairy_cherry_walk_left.png?v=025",
            right: "assets/player/skins/fairy_cherry/fairy_cherry_walk_right.png?v=025" } },
          skill: { fps: 12, frames: 6, duration: 0.50, dirs: {
            down: "assets/player/skins/fairy_cherry/fairy_cherry_skill_down.png?v=025",
            up: "assets/player/skins/fairy_cherry/fairy_cherry_skill_up.png?v=025",
            left: "assets/player/skins/fairy_cherry/fairy_cherry_skill_left.png?v=025",
            right: "assets/player/skins/fairy_cherry/fairy_cherry_skill_right.png?v=025" } }
        }
      }
    }
  },

  slime: {
    src: "assets/enemies/slime_sprite_sheet.png",
    frameWidth: 384,
    frameHeight: 384,
    columns: 4,
    rows: { idle: 0, move: 1, death: 2 },
    displayWidth: 76,
    displayHeight: 76
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
    burst: "assets/effects/pink_burst.png",
    baseHit: [
      "assets/effects/base_hit_effect_01.png?v=025",
      "assets/effects/base_hit_effect_02.png?v=025",
      "assets/effects/base_hit_effect_03.png?v=025"
    ]
  }
};
