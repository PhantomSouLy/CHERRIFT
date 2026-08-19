window.CHERRIFT_BUILD = Object.freeze({
  version: "0.9.5-prebeta.1",
  displayVersion: "v0.9.5-prebeta.1",
  title: "CHERRIFT v0.9.5 – PRE-BETA",
  label: "PRE-BETA · v0.9.5",
  // Elemental Resonance reads this explicit release channel. Change only
  // this value to "live" for the Level 30 production unlock threshold.
  channel: "beta"
});

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
            down: "assets/player/skins/base_cherry/base_cherry_dash_down.png?v=062",
            up: "assets/player/skins/base_cherry/base_cherry_dash_up.png?v=062",
            left: "assets/player/skins/base_cherry/base_cherry_dash_left.png?v=062",
            right: "assets/player/skins/base_cherry/base_cherry_dash_right.png?v=062" } }
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
    // Enemy assets are now grouped by the World where the enemy first appears.
    src: "assets/enemies/world_1/slime_sprite_sheet.png",
    frameWidth: 384,
    frameHeight: 384,
    columns: 4,
    rows: { idle: 0, move: 1, death: 2 },
    displayWidth: 76,
    displayHeight: 76
  },

  map: {
    grass: "assets/map/world1/world1_ground_1.png",
    rockSmall: "assets/map/world1/world1_rock_small_1.png",
    rockBig: "assets/map/world1/world1_rock_1.png",
    bush1: "assets/map/world1/world1_bush_1.png",
    bush2: "assets/map/world1/world1_bush_2.png",
    log: "assets/map/world1/world1_log_1.png",
    treeSmall: "assets/map/world1/world1_tree_1.png",
    treeBig: "assets/map/world1/world1_tree_2.png"
  },

  pickups: {
    xpSmall: "assets/pickups/xp_small.png",
    xpBig: "assets/pickups/xp_big.png"
  },

  effects: {
    burst: "assets/effects/pink_burst.png",
    baseHit: [
      "assets/effects/base_hit_effect_1.png?v=091",
      "assets/effects/base_hit_effect_2.png?v=091",
      "assets/effects/base_hit_effect_3.png?v=091"
    ]
  }
};
