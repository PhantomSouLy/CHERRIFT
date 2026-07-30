(() => {
"use strict";

const VERSION = "0.9.2-stability-combat";
const COMMON_SKINS = new Set(window.CHERRIFT_V091?.commonSkins || []);
const MOBILE_SKINS = new Set(["ninja_cherry", "archer_cherry", "wuxia_sakura_cherry"]);
const INTERNAL_REWARD_SOURCES = new Set([
  "equip", "unequip", "equipment_swap", "inventory_move", "inventory_sort",
  "stack_merge", "save_load", "load"
]);
const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;

if (!window.CherriftGame || !window.CHERRIFT_CONFIG || !window.UI || !window.CherriftStorage) {
  console.error("[CHERRIFT v0.9.2] Required runtime systems are missing.");
  return;
}

function ensureCss() {
  if (id("v092css")) return;
  const link = document.createElement("link");
  link.id = "v092css";
  link.rel = "stylesheet";
  link.href = "v092.css?v=092";
  document.head.appendChild(link);
}

function language() {
  return window.CHERRIFT_LOCALIZATION?.language?.() || "hu";
}

function t(key, params) {
  return window.CHERRIFT_LOCALIZATION?.t?.(key, params) || key;
}

function direction(dx, dy) {
  return Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "left" : "right")
    : (dy < 0 ? "up" : "down");
}

function configureAttackMovement() {
  for (const [skinId, config] of Object.entries(CHERRIFT_CONFIG.player.skins || {})) {
    const mobile = MOBILE_SKINS.has(skinId);
    config.attackMovementMode = mobile ? "mobile" : "stationary";
    config.attackMoveSpeedMultiplier = mobile ? .68 : 1;
    config.attackCancelDeadzone = .08;
    if (COMMON_SKINS.has(skinId)) {
      const frames = Math.max(1, Number(config.states?.attack?.frames) || 6);
      config.attackFireFrame = Math.min(frames - 1, 2);
    }
  }
}

function rewardContext() {
  let current = null;
  const run = (options, callback) => {
    const previous = current;
    current = {
      source:String(options?.source || "unknown"),
      showReward:options?.showReward === true
    };
    const execute = () => callback(current);
    try {
      if (current.showReward || !window.CHERRIFT_REWARDS?.withSuppressed) return execute();
      return CHERRIFT_REWARDS.withSuppressed(execute);
    } finally {
      current = previous;
    }
  };
  return Object.freeze({
    run,
    current:() => current,
    isInternal:source => INTERNAL_REWARD_SOURCES.has(String(source || ""))
  });
}

const rewardApi = rewardContext();
window.CHERRIFT_REWARD_CONTEXT = rewardApi;

function suppressInventoryOperations() {
  for (const [method, source] of [["equipGear", "equipment_swap"], ["unequipGear", "unequip"]]) {
    const previous = UI[method]?.bind(UI);
    if (!previous || previous.__v092RewardSafe) continue;
    const wrapped = function rewardSafeInventoryOperation(...args) {
      return rewardApi.run({source, showReward:false}, () => previous(...args));
    };
    wrapped.__v092RewardSafe = true;
    UI[method] = wrapped;
  }
}

function spawnCommonProjectile(game, attack) {
  const player = game.player;
  if (!player || !attack?.target || attack.target.dead) return false;
  const dx = attack.target.x - player.x;
  const dy = attack.target.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  game.bullets.push({
    x:player.x,
    y:player.y - 10,
    vx:dx / length * player.bulletSpeed,
    vy:dy / length * player.bulletSpeed,
    r:8,
    dmg:player.damage,
    life:1.45,
    style:"common_attack_v091",
    archetype:player.commonArchetype || "offensive",
    firedByV092:true
  });
  return true;
}

function patchCombat() {
  const prototype = CherriftGame.prototype;
  if (prototype.__v092Combat) return;
  prototype.__v092Combat = true;

  const previousAutoFire = prototype.autoFire;
  prototype.autoFire = function autoFireV092() {
    const player = this.player;
    const config = player ? CHERRIFT_CONFIG.player.skins[player.skin] : null;
    if (!player || !COMMON_SKINS.has(player.skin)) {
      return previousAutoFire.call(this);
    }
    if (player.__attackV092 || player.fireTimer > 0 || player.skillCastTimer > 0 || player.moving) return;
    const target = this.nearest(760);
    if (!target || target.dead) return;

    const state = config?.states?.attack || {};
    const frames = Math.max(1, Number(state.frames) || 6);
    const fps = Math.max(1, Number(state.fps) || 18);
    const duration = Math.max(.12, Number(state.duration) || frames / fps);
    const fireFrame = Math.max(0, Math.min(frames - 1, Number(config.attackFireFrame) || 2));
    const dx = target.x - player.x;
    const dy = target.y - player.y;

    player.fireTimer = player.fireInterval * (player.skillBuff > 0 ? .55 : 1);
    player.attackCastDuration = duration;
    player.attackCastTimer = duration;
    player.attackDir = direction(dx, dy);
    player.lastDir = player.attackDir;
    player.__attackV092 = {
      elapsed:0,
      duration,
      fireAt:Math.min(duration, (fireFrame + .5) / fps),
      target,
      fired:false,
      canceled:false
    };
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateV092(dt) {
    const result = previousUpdate.call(this, dt);
    const player = this.player;
    const attack = player?.__attackV092;
    if (!player || !attack) return result;

    attack.elapsed = Math.min(attack.duration, attack.elapsed + Math.max(0, dt));
    if (player.moving && !attack.fired) {
      attack.canceled = true;
      player.__attackV092 = null;
      player.attackCastTimer = 0;
      return result;
    }
    if (!attack.fired && attack.elapsed >= attack.fireAt) {
      attack.fired = spawnCommonProjectile(this, attack);
    }
    if ((player.moving && attack.fired) || attack.elapsed >= attack.duration) {
      player.__attackV092 = null;
      player.attackCastTimer = 0;
      return result;
    }
    player.attackCastDuration = attack.duration;
    player.attackCastTimer = Math.max(0, attack.duration - attack.elapsed);
    return result;
  };

  const previousMovePlayer = prototype.movePlayer;
  prototype.movePlayer = function movePlayerV092(vector, dt) {
    const player = this.player;
    const config = player ? CHERRIFT_CONFIG.player.skins[player.skin] : null;
    if (!player || config?.attackMovementMode !== "mobile" || !(player.attackCastTimer > 0)) {
      return previousMovePlayer.call(this, vector, dt);
    }
    const speed = player.speed;
    player.speed = speed * Math.max(.2, Math.min(1, Number(config.attackMoveSpeedMultiplier) || .68));
    try {
      return previousMovePlayer.call(this, vector, dt);
    } finally {
      player.speed = speed;
    }
  };

  const previousDrawPlayer = prototype.drawPlayer;
  prototype.drawPlayer = function drawPlayerV092(context, player) {
    const config = player ? CHERRIFT_CONFIG.player.skins[player.skin] : null;
    const mobileFallback = player?.moving &&
      config?.attackMovementMode === "mobile" &&
      player.attackCastTimer > 0 &&
      !config.states?.attackMove;
    if (!mobileFallback) return previousDrawPlayer.call(this, context, player);
    const timer = player.attackCastTimer;
    try {
      player.attackCastTimer = 0;
      return previousDrawPlayer.call(this, context, player);
    } finally {
      player.attackCastTimer = timer;
    }
  };
}

function openMenuTool(action) {
  if (action === "settings") {
    UI.open("settings");
    return;
  }
  if (action === "mail") {
    UI.open("mailV063");
    window.CHERRIFT_V063?.renderMail?.();
    return;
  }
  const systems = window.CHERRIFT_V063;
  if (systems?.runtime) systems.runtime.supportType = action === "bug" ? "bug" : "feedback";
  UI.open("supportV063");
  systems?.renderSupport?.();
}

function patchMenuTools() {
  document.addEventListener("click", event => {
    const control = event.target?.closest?.("[data-v082-menu-tool],[data-v092-menu-tool]");
    if (!control) return;
    const action = control.dataset.v082MenuTool || control.dataset.v092MenuTool;
    if (!["feedback", "bug", "mail", "settings"].includes(action)) return;
    event.preventDefault();
    event.stopPropagation();
    openMenuTool(action);
  }, true);

  const mapLegacyTools = () => {
    const tools = q("#menuToolsV082");
    if (tools) return;
    const legacy = Array.from(document.querySelectorAll("#menu .top-icons button"));
    const actions = ["feedback", "bug", "mail", "settings"];
    const candidates = legacy.filter(button => /Discord|News|Mail|Settings/i.test(button.title || ""));
    candidates.slice(0, 4).forEach((button, index) => {
      button.dataset.v092MenuTool = actions[index];
      button.type = "button";
    });
  };
  mapLegacyTools();
}

function patchVersion() {
  const build = window.CHERRIFT_BUILD;
  if (!build) return;
  document.title = build.title;
  const label = language() === "hu"
    ? `TESZTVERZIÓ · ${build.displayVersion}`
    : `TEST BUILD · ${build.displayVersion}`;
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = label;
  const menu = id("menuBuildVersion");
  if (menu) menu.textContent = label;
  const patch = q("#menu .patch-card");
  if (patch) {
    const badge = q("header span", patch);
    const copy = q(":scope > p", patch);
    if (badge) badge.textContent = build.displayVersion;
    if (copy) copy.textContent = language() === "hu"
      ? "Stability & Combat Fix, új Cherry- és World-választó, központi lokalizáció és első működő Event."
      : "Stability & Combat Fix, new Cherry and World selectors, central localization and the first working Event.";
  }
}

ensureCss();
configureAttackMovement();
patchCombat();
patchMenuTools();
patchVersion();

const previousInit = UI.init?.bind(UI);
if (previousInit) {
  UI.init = function initV092(save, game) {
    const result = previousInit(save, game);
    suppressInventoryOperations();
    patchVersion();
    return result;
  };
}

window.addEventListener("cherrift:languagechange", patchVersion);
window.CHERRIFT_V092 = Object.freeze({
  version:VERSION,
  commonSkins:[...COMMON_SKINS],
  mobileSkins:[...MOBILE_SKINS],
  rewardContext:rewardApi,
  patchVersion,
  openMenuTool
});
console.info("[CHERRIFT] v0.9.2 Stability & Combat Fix loaded.");
})();
