window.GC_CONFIG = {
  version: "0.2.4-skin-selector",

  assetSpec: {
    player: {
      frameWidth: 192,
      frameHeight: 192,
      displayWidth: 84,
      displayHeight: 84,
      crop: { top: 0, right: 0, bottom: 0, left: 0 },

      skinStorageKey: "gc_selected_skin_v1",
      defaultSkin: "base_cherry",

      skins: {
        base_cherry: {
          id: "base_cherry",
          name: "Base Cherry",
          description: "Alap Cherry skin + dash skill",
          skillType: "dash",
          dashSpeed: 760,
          dashDuration: 0.34,
          dashInvuln: 0.34,
          states: {
            idle: {
              fps: 3,
              frames: 4,
              loop: true,
              dirs: {
                down: "assets/player/skins/base_cherry/base_cherry_idle_down.png?v=024",
                up: "assets/player/skins/base_cherry/base_cherry_idle_up.png?v=024",
                left: "assets/player/skins/base_cherry/base_cherry_idle_left.png?v=024",
                right: "assets/player/skins/base_cherry/base_cherry_idle_right.png?v=024"
              }
            },
            walk: {
              fps: 8,
              frames: 6,
              loop: true,
              dirs: {
                down: "assets/player/skins/base_cherry/base_cherry_walk_down.png?v=024",
                up: "assets/player/skins/base_cherry/base_cherry_walk_up.png?v=024",
                left: "assets/player/skins/base_cherry/base_cherry_walk_left.png?v=024",
                right: "assets/player/skins/base_cherry/base_cherry_walk_right.png?v=024"
              }
            },
            skill: {
              fps: 18,
              frames: 6,
              loop: false,
              duration: 0.34,
              dirs: {
                down: "assets/player/skins/base_cherry/base_cherry_skill_dash_down.png?v=024",
                up: "assets/player/skins/base_cherry/base_cherry_skill_dash_up.png?v=024",
                left: "assets/player/skins/base_cherry/base_cherry_skill_dash_left.png?v=024",
                right: "assets/player/skins/base_cherry/base_cherry_skill_dash_right.png?v=024"
              }
            }
          }
        },

        fairy_cherry: {
          id: "fairy_cherry",
          name: "Fairy Cherry",
          description: "Tündér Cherry skin + magic burst skill",
          skillType: "magic_burst",
          burstRadius: 185,
          states: {
            idle: {
              fps: 3,
              frames: 4,
              loop: true,
              dirs: {
                down: "assets/player/skins/fairy_cherry/fairy_cherry_idle_down.png?v=024",
                up: "assets/player/skins/fairy_cherry/fairy_cherry_idle_up.png?v=024",
                left: "assets/player/skins/fairy_cherry/fairy_cherry_idle_left.png?v=024",
                right: "assets/player/skins/fairy_cherry/fairy_cherry_idle_right.png?v=024"
              }
            },
            walk: {
              fps: 8,
              frames: 6,
              loop: true,
              dirs: {
                down: "assets/player/skins/fairy_cherry/fairy_cherry_walk_down.png?v=024",
                up: "assets/player/skins/fairy_cherry/fairy_cherry_walk_up.png?v=024",
                left: "assets/player/skins/fairy_cherry/fairy_cherry_walk_left.png?v=024",
                right: "assets/player/skins/fairy_cherry/fairy_cherry_walk_right.png?v=024"
              }
            },
            skill: {
              fps: 12,
              frames: 6,
              loop: false,
              duration: 0.50,
              dirs: {
                down: "assets/player/skins/fairy_cherry/fairy_cherry_skill_down.png?v=024",
                up: "assets/player/skins/fairy_cherry/fairy_cherry_skill_up.png?v=024",
                left: "assets/player/skins/fairy_cherry/fairy_cherry_skill_left.png?v=024",
                right: "assets/player/skins/fairy_cherry/fairy_cherry_skill_right.png?v=024"
              }
            }
          }
        }
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
