/*
 * CHERRIFT Test Map Skill Builder
 * Equipped-GM-only, run-local combat loadout editor for the Training map.
 */
(() => {
  "use strict";

  if (window.CHERRIFT_SKILL_BUILDER) return;
  if (!window.CherriftGame || !window.UI || !window.CHERRIFT_ELEMENTAL) {
    console.error("[CHERRIFT Skill Builder] Runtime dependencies are missing.");
    return;
  }

  const VERSION = "0.9.5-skill-builder.1";
  const FALLBACK_STAGE = "world_1_1";
  const ELEMENT_ORDER = Object.freeze(["blaze", "tidecall", "stoneveil", "windborne", "celestial", "abyssal"]);
  const GENERAL_LIMITS = Object.freeze({
    damage_core:5,
    quick_core:5,
    swift_core:5,
    hp_core:5,
    pickup_core:5,
    crit_core:5,
    skill_flow:5,
    multi_strike:4,
    combat_arc:5,
    thorn_aura:5
  });
  const GENERAL_BADGES = Object.freeze({
    damage_core:"ATK", quick_core:"AS", swift_core:"MOV", hp_core:"HP", pickup_core:"MAG",
    crit_core:"CRIT", skill_flow:"CD", multi_strike:"+1", combat_arc:"ARC", thorn_aura:"AOE"
  });
  const BASELINE_KEYS = Object.freeze([
    "damage", "fireInterval", "speed", "maxHp", "pickup", "crit", "skillCooldown",
    "projectileCount", "projectileSpread", "meleeRangeMult", "meleeConeBonus", "auraDps"
  ]);

  const id = value => document.getElementById(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const integer = (value, max=Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const language = () => window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  const copy = (hu, en) => language() === "hu" ? hu : en;

  function stages() {
    return window.CHERRIFT_V040?.stages || window.CHERRIFT_DATA?.stages || [];
  }

  function selectedStage(game=window.UI?.game) {
    return game?.getSelectedStage?.() || stages().find(stage => stage.id === game?.save?.selectedStageId) || null;
  }

  function hasActiveGm(save=window.UI?.save) {
    if (window.CHERRIFT_PREBETA?.hasActiveGmAccess) return !!window.CHERRIFT_PREBETA.hasActiveGmAccess(save);
    const active = String(save?.profile?.activeTitle || save?.activeTitle || save?.selectedTitle || "");
    return ["gm", "senior_gm", "head_gm"].includes(active) && (save?.ownedTitles || []).includes(active);
  }

  function isTestRun(game=window.UI?.game) {
    return !!(game?.stage?.training && game.player && hasActiveGm(game.save));
  }

  function emptyGeneralRanks() {
    return Object.fromEntries(Object.keys(GENERAL_LIMITS).map(skillId => [skillId, 0]));
  }

  function captureBaseline(player) {
    return Object.fromEntries(BASELINE_KEYS.map(key => [key, Number(player?.[key]) || 0]));
  }

  function initializeRun(game) {
    if (!isTestRun(game)) return null;
    const state = {
      open:false,
      previousMode:"playing",
      generalRanks:emptyGeneralRanks(),
      baseline:captureBaseline(game.player),
      createdAt:performance.now()
    };
    game.__skillBuilderV095 = state;
    syncButton(game);
    return state;
  }

  function stateFor(game=window.UI?.game, create=true) {
    if (!game || !isTestRun(game)) return null;
    const current = Object.prototype.hasOwnProperty.call(game, "__skillBuilderV095") && typeof game.__skillBuilderV095 === "object" ? game.__skillBuilderV095 : null;
    return current || (create ? initializeRun(game) : null);
  }

  function generalUpgrade(skillId) {
    return (window.CHERRIFT_DATA?.upgrades || []).find(upgrade => upgrade.id === skillId) || null;
  }

  function applyGeneralRanks(game) {
    const state = stateFor(game, false);
    const player = game?.player;
    if (!state?.baseline || !player) return false;

    // Keep damage already taken while rebuilding reversible max-HP changes.
    const missingHp = Math.max(0, (Number(player.maxHp) || 0) - (Number(player.hp) || 0));
    for (const key of BASELINE_KEYS) player[key] = state.baseline[key];

    const rank = skillId => integer(state.generalRanks[skillId], GENERAL_LIMITS[skillId] || 0);
    player.damage = state.baseline.damage * Math.pow(1.15, rank("damage_core"));
    player.fireInterval = state.baseline.fireInterval * Math.pow(.88, rank("quick_core"));
    player.speed = state.baseline.speed * Math.pow(1.10, rank("swift_core"));
    player.maxHp = state.baseline.maxHp + rank("hp_core") * 24;
    player.pickup = state.baseline.pickup + rank("pickup_core") * 32;
    player.crit = Math.min(.95, state.baseline.crit + rank("crit_core") * .08);
    player.skillCooldown = Math.max(2.5, state.baseline.skillCooldown * Math.pow(.85, rank("skill_flow")));

    if (player.attackType === "melee") {
      player.meleeRangeMult = state.baseline.meleeRangeMult * Math.pow(1.18, rank("multi_strike"));
      player.meleeConeBonus = state.baseline.meleeConeBonus + rank("combat_arc") * 14;
    } else {
      player.projectileCount = Math.min(5, state.baseline.projectileCount + rank("multi_strike"));
      player.projectileSpread = Math.min(.34, state.baseline.projectileSpread + rank("combat_arc") * .04);
    }
    player.auraDps = state.baseline.auraDps + rank("thorn_aura") * 5;
    player.hp = clamp(player.maxHp - missingHp, 0, player.maxHp);
    window.UI?.updateHUD?.(game);
    return true;
  }

  function getLevel(game, skillId) {
    const state = stateFor(game, false);
    if (!state) return 0;
    if (GENERAL_LIMITS[skillId]) return integer(state.generalRanks[skillId], GENERAL_LIMITS[skillId]);
    return window.CHERRIFT_ELEMENTAL.getRunSkillLevel?.(game, skillId) || 0;
  }

  function maxLevel(skillId) {
    return GENERAL_LIMITS[skillId] || window.CHERRIFT_ELEMENTAL.skills?.[skillId]?.max || 0;
  }

  function setLevel(game, skillId, value) {
    const state = stateFor(game);
    const max = maxLevel(skillId);
    if (!state || !max) return false;
    const next = integer(value, max);
    if (GENERAL_LIMITS[skillId]) {
      state.generalRanks[skillId] = next;
      applyGeneralRanks(game);
    } else {
      const result = window.CHERRIFT_ELEMENTAL.setRunSkillLevel?.(game, skillId, next);
      if (result === false) return false;
    }
    render(game);
    return next;
  }

  function resetAll(game=window.UI?.game) {
    const state = stateFor(game, false);
    if (!state) return false;
    state.generalRanks = emptyGeneralRanks();
    applyGeneralRanks(game);
    window.CHERRIFT_ELEMENTAL.resetRunSkills?.(game);
    render(game);
    return true;
  }

  function ensureUi() {
    let launch = id("skillBuilderButtonV095");
    if (!launch) {
      launch = document.createElement("button");
      launch.id = "skillBuilderButtonV095";
      launch.className = "skill-builder-launch-v095 hidden";
      launch.type = "button";
      launch.innerHTML = `<span>✦</span><b>${copy("SKILL BUILDER", "SKILL BUILDER")}</b>`;
      launch.addEventListener("click", () => open());
      document.body.appendChild(launch);
    }

    let overlay = id("skillBuilderV095");
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.id = "skillBuilderV095";
      overlay.className = "skill-builder-overlay-v095 hidden";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "skillBuilderTitleV095");
      overlay.innerHTML = `<button type="button" class="skill-builder-backdrop-v095" data-builder-close aria-label="Close"></button><article class="skill-builder-shell-v095"><header><div><small>GM TEST MAP</small><h2 id="skillBuilderTitleV095">Skill Builder</h2><p>${copy("Azonnali, csak erre a futamra érvényes képességteszt.", "Immediate skill testing for this run only.")}</p></div><div><button type="button" data-builder-reset>${copy("MINDENT NULLÁZ", "RESET ALL")}</button><button type="button" class="skill-builder-close-v095" data-builder-close aria-label="Close">×</button></div></header><main id="skillBuilderContentV095"></main><footer><span>⚗ ${copy("Nincs pontköltség", "No point cost")}</span><span>⌁ ${copy("Nem kerül mentésre", "Never saved")}</span><span>Ⅱ ${copy("A játék szünetel", "Game paused")}</span></footer></article>`;
      overlay.addEventListener("click", event => {
        if (event.target.closest?.("[data-builder-close]")) return close();
        if (event.target.closest?.("[data-builder-reset]")) return resetAll();
        const control = event.target.closest?.("[data-builder-skill][data-builder-delta]");
        if (!control || control.disabled) return;
        const game = window.UI?.game;
        const skillId = control.dataset.builderSkill;
        setLevel(game, skillId, getLevel(game, skillId) + Number(control.dataset.builderDelta || 0));
      });
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function skillCard(game, skill, options={}) {
    const skillId = skill.id;
    const level = getLevel(game, skillId);
    const max = maxLevel(skillId);
    const active = level > 0;
    const element = options.element ? window.CHERRIFT_ELEMENTAL.elements?.[options.element] : null;
    const name = options.name || skill.name || skillId;
    const description = options.description || skill.desc || "";
    const icon = element
      ? `<img src="${escapeHtml(element.icon)}" alt="">`
      : `<span>${escapeHtml(GENERAL_BADGES[skillId] || "UP")}</span>`;
    return `<article class="skill-builder-card-v095 ${active ? "active" : "inactive"}" data-builder-card="${escapeHtml(skillId)}" style="--skill-color:${element?.color || "#ef72a9"};--skill-glow:${element?.glow || "#ffd0e5"}"><div class="skill-builder-icon-v095">${icon}</div><div class="skill-builder-copy-v095"><small>${escapeHtml(options.group || "GENERAL")}</small><h4>${escapeHtml(name)}</h4><p>${escapeHtml(description)}</p></div><div class="skill-builder-rank-v095"><button type="button" data-builder-skill="${escapeHtml(skillId)}" data-builder-delta="-1" ${level <= 0 ? "disabled" : ""} aria-label="Decrease ${escapeHtml(name)}">−</button><b>${level}/${max}</b><button type="button" data-builder-skill="${escapeHtml(skillId)}" data-builder-delta="1" ${level >= max ? "disabled" : ""} aria-label="Increase ${escapeHtml(name)}">${level >= max ? "MAX" : "+"}</button></div></article>`;
  }

  function render(game=window.UI?.game) {
    const root = id("skillBuilderContentV095");
    const state = stateFor(game, false);
    if (!root || !state) return false;

    const general = Object.keys(GENERAL_LIMITS).map(generalUpgrade).filter(Boolean);
    const sections = [{
      id:"general",
      name:copy("Általános skillek", "General Skills"),
      color:"#ef72a9",
      cards:general.map(skill => skillCard(game, skill, {group:"GENERAL"})).join("")
    }];

    for (const elementId of ELEMENT_ORDER) {
      const definition = window.CHERRIFT_ELEMENTAL.elements?.[elementId];
      const skills = Object.values(window.CHERRIFT_ELEMENTAL.skills || {}).filter(skill => skill.element === elementId);
      if (!definition || !skills.length) continue;
      sections.push({
        id:elementId,
        name:definition.name,
        color:definition.color,
        cards:skills.map(skill => {
          const details = window.CHERRIFT_ELEMENTAL.skillCopy?.(skill.id) || {};
          return skillCard(game, skill, {element:elementId, group:definition.name.toUpperCase(), name:details.name, description:details.description});
        }).join("")
      });
    }

    root.innerHTML = sections.map(section => `<section class="skill-builder-group-v095" data-builder-group="${section.id}" style="--group-color:${section.color}"><header><i></i><h3>${escapeHtml(section.name)}</h3><span>${section.id === "general" ? general.length : Object.values(window.CHERRIFT_ELEMENTAL.skills || {}).filter(skill => skill.element === section.id).length} ${copy("skill", "skills")}</span></header><div>${section.cards}</div></section>`).join("");
    return true;
  }

  function hideGameMenus() {
    for (const panelId of ["menu", "worlds", "worldsV094", "worldSelectorV0942", "chapterSelectorV0942", "skins", "gear", "chests", "settings", "playerUpgrade", "pauseModal", "levelModal", "gameOver", "stageClearModal"]) {
      id(panelId)?.classList.add("hidden");
    }
    id("mobileMenuV082")?.classList.add("hidden");
  }

  function open(game=window.UI?.game) {
    if (!isTestRun(game)) {
      window.UI?.toast?.(copy("A Skill Builder csak a GM Test Mapon érhető el.", "Skill Builder is available only on the GM Test Map."));
      return false;
    }
    const state = stateFor(game);
    const overlay = ensureUi();
    hideGameMenus();
    state.previousMode = game.mode === "playing" ? "playing" : "paused";
    game.mode = "paused";
    state.open = true;
    document.body.classList.add("is-playing", "skill-builder-open-v095");
    overlay.classList.remove("hidden");
    render(game);
    overlay.querySelector("[data-builder-close]")?.focus?.();
    return true;
  }

  function close(options={}) {
    const game = options.game || window.UI?.game;
    const state = Object.prototype.hasOwnProperty.call(game || {}, "__skillBuilderV095") && typeof game.__skillBuilderV095 === "object" ? game.__skillBuilderV095 : null;
    id("skillBuilderV095")?.classList.add("hidden");
    document.body.classList.remove("skill-builder-open-v095");
    if (state) state.open = false;
    if (options.restore !== false && isTestRun(game) && game.mode === "paused") {
      game.mode = state?.previousMode === "paused" ? "paused" : "playing";
      if (game.mode === "playing") document.body.classList.add("is-playing");
    }
    return true;
  }

  function clearRun(game=window.UI?.game) {
    close({game, restore:false});
    if (game?.player) window.CHERRIFT_ELEMENTAL.resetRunSkills?.(game);
    if (game) delete game.__skillBuilderV095;
    id("skillBuilderButtonV095")?.classList.add("hidden");
    id("skillBuilderButtonV095")?.setAttribute("aria-hidden", "true");
  }

  function syncButton(game=window.UI?.game) {
    ensureUi();
    if (game?.stage?.training && game.player && !hasActiveGm(game.save)) {
      clearRun(game);
      fallbackFromBlockedTest(game);
      game.mode = "menu";
      document.body.classList.remove("is-playing");
      queueMicrotask(() => window.UI?.open?.("menu"));
      window.UI?.toast?.(copy("A GM title már nincs viselve; a Test Map bezárult.", "The GM title is no longer equipped; Test Map closed."));
      return false;
    }
    const button = id("skillBuilderButtonV095");
    const visible = isTestRun(game) && ["playing", "paused"].includes(game.mode) && document.body.classList.contains("is-playing");
    button?.classList.toggle("hidden", !visible);
    button?.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible && id("skillBuilderV095") && !id("skillBuilderV095").classList.contains("hidden")) close({game, restore:false});
    return visible;
  }

  function fallbackFromBlockedTest(game) {
    if (!game?.save) return;
    const fallback = stages().find(stage => stage.id === FALLBACK_STAGE && !stage.training) || stages().find(stage => !stage.training);
    game.save.selectedStageId = fallback?.id || FALLBACK_STAGE;
    if (game.stage?.training) game.stage = fallback || null;
  }

  function patchGame() {
    const prototype = window.CherriftGame.prototype;
    if (prototype.__skillBuilderPatchedV095) return;
    prototype.__skillBuilderPatchedV095 = true;

    const previousStart = prototype.start;
    prototype.start = async function startSkillBuilder(...args) {
      const stage = selectedStage(this);
      if (stage?.training && !hasActiveGm(this.save)) {
        clearRun(this);
        fallbackFromBlockedTest(this);
        window.UI?.toast?.(copy("A Test Maphoz viselt GM title szükséges.", "An equipped GM title is required for the Test Map."));
        return false;
      }
      clearRun(this);
      const result = await previousStart.apply(this, args);
      if (result === false || !this.player) return result;
      if (this.stage?.training && hasActiveGm(this.save)) initializeRun(this);
      else syncButton(this);
      return result;
    };

    const previousUpdate = prototype.update;
    prototype.update = function updateSkillBuilder(dt) {
      const result = previousUpdate.call(this, dt);
      this.__skillBuilderAccessTimerV095 = (this.__skillBuilderAccessTimerV095 || 0) - (Number(dt) || 0);
      if (this.__skillBuilderAccessTimerV095 <= 0) {
        this.__skillBuilderAccessTimerV095 = .35;
        syncButton(this);
      }
      return result;
    };
  }

  function patchUi() {
    const previousOpen = window.UI.open?.bind(window.UI);
    if (previousOpen) window.UI.open = function openSkillBuilder(panel, ...args) {
      if (id("skillBuilderV095") && !id("skillBuilderV095").classList.contains("hidden")) close({restore:false});
      const result = previousOpen(panel, ...args);
      queueMicrotask(() => syncButton(this.game));
      return result;
    };

    const previousQuit = window.UI.quit?.bind(window.UI);
    if (previousQuit) window.UI.quit = function quitSkillBuilder(...args) {
      clearRun(this.game);
      return previousQuit(...args);
    };

    const previousGameOver = window.UI.showGameOver?.bind(window.UI);
    if (previousGameOver) window.UI.showGameOver = function showGameOverSkillBuilder(...args) {
      clearRun(this.game);
      return previousGameOver(...args);
    };
  }

  function bindGlobal() {
    ensureUi();
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !id("skillBuilderV095")?.classList.contains("hidden")) {
        event.preventDefault();
        close();
      }
    });
    window.addEventListener("cherrift:savechange", () => syncButton());
    window.addEventListener("resize", () => syncButton());
  }

  patchGame();
  patchUi();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindGlobal, {once:true});
  else bindGlobal();

  window.CHERRIFT_SKILL_BUILDER = Object.freeze({
    version:VERSION,
    generalLimits:GENERAL_LIMITS,
    hasActiveGm,
    isTestRun,
    getLevel,
    setLevel,
    resetAll,
    open,
    close,
    clearRun,
    render,
    sync:syncButton,
    mobileCamera:Object.freeze({portrait:1.12, landscape:1.08, desktop:1.34})
  });
  console.info("[CHERRIFT] Equipped-GM Test Map Skill Builder loaded.");
})();
