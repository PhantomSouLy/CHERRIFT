(() => {
"use strict";

const VERSION = "0.9.3-ui-world-localization";
const DIRECTIONS = ["down", "up", "left", "right"];
const ANIMATIONS = ["idle", "walk", "attack", "skill"];
const THUMB_FOLDERS = {
  cherry_default:"base_cherry",
  fairy_cherry:"fairy_cherry",
  beastclaw_cherry:"beastclaw_cherry",
  ninja_cherry:"ninja_cherry",
  succubus_cherry:"succubus_cherry",
  warrior_cherry:"warrior_cherry",
  wuxia_sakura_cherry:"wuxia_sakura_cherry",
  mage_cherry:"mage_cherry",
  archer_cherry:"archer_cherry",
  cake_deliver_cherry:"cake_deliver_cherry",
  kimono_cherry:"kimono_cherry",
  pajama_cherry:"pajama_cherry",
  school_uniform_cherry:"school_uniform_cherry",
  sport_cherry:"sport_cherry"
};
const WORLD_ART = {
  1:'linear-gradient(180deg,rgba(5,3,12,.02),rgba(5,3,12,.48)),url("assets/map/world1/world1.png")',
  2:'linear-gradient(180deg,rgba(5,3,12,.05),rgba(5,3,12,.58)),url("assets/map/world2.png")',
  3:"radial-gradient(circle at 55% 20%,rgba(255,145,66,.36),transparent 32%),linear-gradient(160deg,#4a2920,#1a0b10 68%,#08050c)",
  4:"radial-gradient(circle at 20% 20%,rgba(116,211,255,.22),transparent 30%),linear-gradient(150deg,#163547,#0b1928 60%,#060810)",
  5:"radial-gradient(circle at 75% 22%,rgba(193,132,255,.23),transparent 28%),linear-gradient(150deg,#34204c,#130d27 62%,#080611)",
  6:"radial-gradient(circle at 50% 18%,rgba(255,207,104,.22),transparent 30%),linear-gradient(155deg,#4a3821,#20140e 62%,#09070a)",
  7:"radial-gradient(circle at 50% 18%,rgba(255,119,182,.18),transparent 30%),linear-gradient(155deg,#3d1834,#160b1d 62%,#07050b)"
};

const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const localization = window.CHERRIFT_LOCALIZATION;
const t = (key, params) => localization?.t?.(key, params) || key;

if (!window.UI || !window.CHERRIFT_DATA || !window.CHERRIFT_CONFIG || !window.CherriftStorage) {
  console.error("[CHERRIFT v0.9.3] Required runtime systems are missing.");
  return;
}

const state = {
  selectedSkinId:null,
  skinView:"splash",
  previewDirection:"down",
  previewAnimation:"idle",
  previewCache:new Map(),
  previewRequest:0,
  world:1,
  chapterId:null,
  skillDialogOpen:false
};

function ensureCss() {
  if (id("v093css")) return;
  const link = document.createElement("link");
  link.id = "v093css";
  link.rel = "stylesheet";
  link.href = "v093.css?v=093";
  document.head.appendChild(link);
}

function ensureSave(save = UI.save) {
  if (!save || typeof save !== "object") return save;
  save.uiV093 = save.uiV093 && typeof save.uiV093 === "object" ? save.uiV093 : {};
  save.uiV093.seenSkins = Array.isArray(save.uiV093.seenSkins) ? save.uiV093.seenSkins : [save.selectedSkin || "cherry_default"];
  save.eventsV093 = save.eventsV093 && typeof save.eventsV093 === "object" ? save.eventsV093 : {};
  save.clearedStages = save.clearedStages && typeof save.clearedStages === "object" ? save.clearedStages : {};
  save.firstClearClaimed = save.firstClearClaimed && typeof save.firstClearClaimed === "object" ? save.firstClearClaimed : {};
  save.stageStats = save.stageStats && typeof save.stageStats === "object" ? save.stageStats : {};
  save.stageStars = save.stageStars && typeof save.stageStars === "object" ? save.stageStars : {};
  save.unlockedStages = Array.isArray(save.unlockedStages) ? save.unlockedStages : ["world_1_1"];
  return save;
}

function configureLocalizedData() {
  for (const skin of CHERRIFT_DATA.skins || []) {
    const folder = THUMB_FOLDERS[skin.id];
    if (folder) skin.icon = `assets/ui/skin_thumbs/${folder}.webp`;
    skin.nameKey = `skins.${skin.id}.name`;
    skin.descriptionKey = `skins.${skin.id}.desc`;
    skin.passiveKey = `skins.${skin.id}.passive`;
    skin.skillNameKey = `skins.${skin.id}.skill`;
    skin.skillDescriptionKey = `skins.${skin.id}.skillDesc`;
  }
}

function skinById(skinId) {
  return CHERRIFT_DATA.skins.find(skin => skin.id === skinId) || CHERRIFT_DATA.skins[0];
}

function selectedSkin() {
  const fallback = UI.save?.selectedSkin || CHERRIFT_DATA.skins[0]?.id;
  return skinById(state.selectedSkinId || fallback);
}

function skinName(skin) {
  return t(skin.nameKey || `skins.${skin.id}.name`) || skin.name;
}

function localizedSkinValue(skin, suffix, fallback) {
  const key = `skins.${skin.id}.${suffix}`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function isSkinUnlocked(skinId) {
  return ensureSave()?.unlockedSkins?.includes(skinId) === true;
}

function roleFor(skin) {
  if (skin.archetype) return skin.archetype;
  if (/succubus/i.test(skin.id)) return "support";
  if (/warrior|pajama/i.test(skin.id)) return "defensive";
  if (/cake|fairy/i.test(skin.id)) return "hybrid";
  return "offensive";
}

function skillMeta(skin) {
  const config = CHERRIFT_CONFIG.player.skins[skin.id] || {};
  const melee = config.attackType === "melee";
  return {
    cooldown:Number(config.skillCooldown || 8),
    amount:melee ? "100–240%" : skin.id === "kimono_cherry" ? "40% Max HP" : "100–250%",
    range:melee ? `${Math.round(config.whirlwindRadius || config.meleeRange || 150)} px` : skin.id === "cherry_default" ? "Dash" : "185–980 px",
    type:roleFor(skin)
  };
}

function renderSkinSelector() {
  const panel = id("skins");
  if (!panel) return;
  ensureSave();
  const skin = selectedSkin();
  state.selectedSkinId = skin.id;
  UI.skinIndex = Math.max(0, CHERRIFT_DATA.skins.findIndex(entry => entry.id === skin.id));
  const unlocked = isSkinUnlocked(skin.id);
  const equipped = UI.save.selectedSkin === skin.id;
  const seen = new Set(UI.save.uiV093.seenSkins);
  const config = CHERRIFT_CONFIG.player.skins[skin.id] || {};
  const movementKey = config.attackMovementMode === "mobile" ? "skin.mobile" : "skin.stationary";
  const role = roleFor(skin);
  const meta = skillMeta(skin);
  const splashStyle = skin.splash
    ? `background-image:linear-gradient(180deg,rgba(6,3,12,.02),rgba(6,3,12,.48)),url("${escapeHtml(skin.splash)}")`
    : `background:${skin.gradient ? `linear-gradient(135deg,${skin.gradient[0]},${skin.gradient[1]})` : "#251126"}`;

  panel.dataset.i18nIgnore = "true";
  panel.innerHTML = `
    <header class="panel-head skin-head-v093">
      <button type="button" class="back" data-v093-back>←</button>
      <div><h2>${escapeHtml(t("skin.title"))}</h2><p>${escapeHtml(t("skin.subtitle"))}</p></div>
    </header>
    <section class="skin-selector-v093 glass">
      <nav class="skin-list-v093" aria-label="${escapeHtml(t("skin.title"))}">
        ${(CHERRIFT_DATA.skins || []).map(entry => {
          const entryUnlocked = isSkinUnlocked(entry.id);
          const isEquipped = UI.save.selectedSkin === entry.id;
          const isNew = entryUnlocked && !seen.has(entry.id);
          return `<button type="button" class="skin-icon-v093 rarity-${String(entry.rarity || "Common").toLowerCase()} ${entry.id === skin.id ? "active" : ""} ${entryUnlocked ? "" : "locked"}" data-v093-skin="${escapeHtml(entry.id)}" aria-label="${escapeHtml(skinName(entry))}">
            <img src="${escapeHtml(entry.icon || entry.splash || "")}" alt="" loading="lazy" decoding="async" draggable="false">
            ${entryUnlocked ? "" : `<i class="skin-lock-v093">🔒</i>`}
            ${isEquipped ? `<em class="skin-equipped-v093">${escapeHtml(t("common.equipped"))}</em>` : ""}
            ${isNew ? `<b class="skin-new-v093">${escapeHtml(t("common.new"))}</b>` : ""}
          </button>`;
        }).join("")}
      </nav>
      <article class="skin-showcase-v093 rarity-${String(skin.rarity || "Common").toLowerCase()}">
        <div class="skin-view-tabs-v093" role="tablist">
          <button type="button" data-v093-skin-view="splash" class="${state.skinView === "splash" ? "active" : ""}">${escapeHtml(t("skin.splashArt"))}</button>
          <button type="button" data-v093-skin-view="game" class="${state.skinView === "game" ? "active" : ""}">${escapeHtml(t("skin.gameView"))}</button>
        </div>
        <div class="skin-art-v093 ${state.skinView === "splash" ? "" : "hidden"}" style='${splashStyle}' role="img" aria-label="${escapeHtml(skinName(skin))}"></div>
        <div class="skin-game-view-v093 ${state.skinView === "game" ? "" : "hidden"}">
          <canvas id="skinPreviewCanvasV093" aria-label="${escapeHtml(t("skin.gameView"))}"></canvas>
          <div class="skin-preview-controls-v093">
            <div><small>${escapeHtml(t("skin.direction"))}</small>${DIRECTIONS.map(direction => `<button type="button" data-v093-preview-direction="${direction}" class="${state.previewDirection === direction ? "active" : ""}">${{down:"↓",up:"↑",left:"←",right:"→"}[direction]}</button>`).join("")}</div>
            <div><small>${escapeHtml(t("skin.animation"))}</small>${ANIMATIONS.map(animation => `<button type="button" data-v093-preview-animation="${animation}" class="${state.previewAnimation === animation ? "active" : ""}">${escapeHtml(t(animation === "skill" ? "skin.skillAnimation" : `skin.${animation}`))}</button>`).join("")}</div>
          </div>
        </div>
      </article>
      <aside class="skin-details-v093">
        <div class="skin-title-v093"><span class="rarity-pill">${escapeHtml(skin.rarity || "Common")}</span><small>${escapeHtml(t(movementKey))}</small></div>
        <h3>${escapeHtml(skinName(skin))}</h3>
        <p>${escapeHtml(localizedSkinValue(skin, "desc", skin.desc || ""))}</p>
        <dl class="skin-stats-v093">
          <div><dt>${escapeHtml(t("skin.combatType"))}</dt><dd class="role-${escapeHtml(role)}">${escapeHtml(role[0].toUpperCase() + role.slice(1))}</dd></div>
          <div><dt>${escapeHtml(t("skin.passive"))}</dt><dd>${escapeHtml(localizedSkinValue(skin, "passive", skin.passive || "—"))}</dd></div>
        </dl>
        <button type="button" class="skill-card-v093" data-v093-skill-info>
          <span>✦</span><div><small>${escapeHtml(t("skin.skill"))}</small><b>${escapeHtml(localizedSkinValue(skin, "skill", skin.skill || "Skill"))}</b></div><i>ⓘ</i>
        </button>
        <button type="button" class="menu-btn primary skin-equip-v093" data-v093-equip ${unlocked && !equipped ? "" : "disabled"}>
          ${escapeHtml(equipped ? t("common.equipped") : unlocked ? t("common.equip") : t("common.locked"))}
        </button>
        ${unlocked ? "" : `<p class="skin-locked-hint-v093">🔒 ${escapeHtml(t("skin.lockedHint"))}</p>`}
      </aside>
    </section>
    <div id="skinSkillDialogV093" class="skin-skill-dialog-v093 ${state.skillDialogOpen ? "" : "hidden"}" role="dialog" aria-modal="true">
      <div class="glass"><button type="button" data-v093-skill-close aria-label="${escapeHtml(t("common.close"))}">×</button>
        <small>${escapeHtml(t("skin.skillDetails"))}</small><h3>${escapeHtml(localizedSkinValue(skin, "skill", skin.skill || "Skill"))}</h3>
        <p>${escapeHtml(localizedSkinValue(skin, "skillDesc", skin.desc || ""))}</p>
        <dl>
          <div><dt>${escapeHtml(t("skin.cooldown"))}</dt><dd>${meta.cooldown}s</dd></div>
          <div><dt>${escapeHtml(t("skin.damage"))}</dt><dd>${escapeHtml(meta.amount)}</dd></div>
          <div><dt>${escapeHtml(t("skin.range"))}</dt><dd>${escapeHtml(meta.range)}</dd></div>
          <div><dt>${escapeHtml(t("skin.type"))}</dt><dd>${escapeHtml(meta.type)}</dd></div>
        </dl>
      </div>
    </div>`;
  startPreviewLoop();
}

function previewEntry(source) {
  if (!source) return null;
  if (state.previewCache.has(source)) return state.previewCache.get(source);
  const entry = {image:new Image(), ready:false};
  entry.image.decoding = "async";
  entry.image.onload = () => { entry.ready = true; };
  entry.image.src = source;
  state.previewCache.set(source, entry);
  return entry;
}

function drawSkinPreview(timestamp) {
  const canvas = id("skinPreviewCanvasV093");
  if (!canvas || id("skins")?.classList.contains("hidden") || state.skinView !== "game") return;
  const skin = selectedSkin();
  const config = CHERRIFT_CONFIG.player.skins[skin.id] || {};
  let animation = state.previewAnimation;
  let spriteState = config.states?.[animation];
  if (!spriteState) {
    animation = animation === "attack" && config.states?.walk ? "walk" : "idle";
    spriteState = config.states?.[animation] || config.states?.idle;
  }
  const direction = spriteState?.dirs?.[state.previewDirection] ? state.previewDirection : "down";
  const entry = previewEntry(spriteState?.dirs?.[direction]);
  if (!entry?.ready) return;
  const cssWidth = Math.max(1, canvas.clientWidth || 460);
  const cssHeight = Math.max(1, canvas.clientHeight || 460);
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.imageSmoothingEnabled = true;
  const frames = Math.max(1, Number(spriteState.frames) || Math.floor(entry.image.naturalWidth / 192) || 1);
  const frameWidth = entry.image.naturalWidth / frames;
  const frameHeight = entry.image.naturalHeight || 192;
  const frame = Math.floor(timestamp / 1000 * Math.max(1, Number(spriteState.fps) || 3)) % frames;
  const pivot = spriteState.pivot || {x:96,y:184};
  const scale = Math.min(cssWidth * .84 / frameWidth, cssHeight * .86 / frameHeight);
  const ground = cssHeight * .91;
  context.save();
  context.globalAlpha = .24;
  context.fillStyle = "#020106";
  context.beginPath();
  context.ellipse(cssWidth / 2, ground + 3, 48 * scale, 13 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.drawImage(
    entry.image,
    frame * frameWidth, 0, frameWidth, frameHeight,
    cssWidth / 2 - (Number(pivot.x) || 96) * scale,
    ground - (Number(pivot.y) || 184) * scale,
    frameWidth * scale, frameHeight * scale
  );
}

function startPreviewLoop() {
  if (state.previewRequest) return;
  const loop = timestamp => {
    state.previewRequest = requestAnimationFrame(loop);
    drawSkinPreview(timestamp);
  };
  state.previewRequest = requestAnimationFrame(loop);
}

function equipSelectedSkin() {
  const skin = selectedSkin();
  if (!isSkinUnlocked(skin.id)) return UI.toast?.(t("error.lockedSkin"));
  UI.save.selectedSkin = skin.id;
  if (!UI.save.uiV093.seenSkins.includes(skin.id)) UI.save.uiV093.seenSkins.push(skin.id);
  CherriftStorage.save(UI.save);
  UI.refreshMenu?.();
  UI.toast?.(t("skin.equippedToast", {name:skinName(skin)}));
  renderSkinSelector();
}

function stages() {
  return window.CHERRIFT_V040?.stages || [];
}

function worldStages(world) {
  return stages().filter(stage => Number(stage.world) === Number(world));
}

function worldUnlocked(world) {
  if (world === 1) return true;
  const previous = worldStages(world - 1);
  return previous.length > 0 && previous.every(stage => UI.save.clearedStages?.[stage.id] || UI.save.stageStats?.[stage.id]?.clears);
}

function stageUnlocked(stage) {
  return UI.save.unlockedStages?.includes(stage.id) || worldUnlocked(stage.world) && stage.index === 1;
}

function stageCompleted(stage) {
  return !!UI.save.clearedStages?.[stage.id] || !!UI.save.stageStats?.[stage.id]?.clears;
}

function stageStatus(stage) {
  const stars = Number(UI.save.stageStars?.[stage.id] || UI.save.stageStats?.[stage.id]?.stars || 0);
  if (!stageUnlocked(stage)) return {key:"common.locked", className:"locked"};
  if (stars >= 3) return {key:"world.perfect", className:"perfect"};
  if (stageCompleted(stage)) return {key:"world.completed", className:"completed"};
  return {key:"world.available", className:"available"};
}

function rewardText(reward) {
  const parts = [];
  if (reward?.coins) parts.push(`${reward.coins} Coin`);
  if (reward?.keys) parts.push(`${reward.keys} Key`);
  if (reward?.gems) parts.push(`${reward.gems} Gem`);
  return parts.join(" · ") || "—";
}

function bestTime(stage) {
  const seconds = Number(UI.save.stageStats?.[stage.id]?.bestTime || 0);
  if (!(seconds > 0)) return "—";
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function recommendedLevel(stage) {
  return Math.max(1, (Number(stage.world) - 1) * 10 + Number(stage.index) * 2 - 1);
}

function difficulty(stage) {
  const score = Number(stage.world) + Number(stage.index) / 2;
  return score < 3 ? "Easy" : score < 5 ? "Normal" : score < 8 ? "Hard" : "Expert";
}

function currentChapter() {
  const list = worldStages(state.world);
  return list.find(stage => stage.id === state.chapterId) ||
    list.find(stage => stage.id === UI.save.selectedStageId) ||
    list[0] || null;
}

function renderWorldSelect() {
  const panel = id("worlds");
  if (!panel) return;
  ensureSave();
  const chapter = currentChapter();
  state.chapterId = chapter?.id || null;
  const worldReady = worldUnlocked(state.world);
  const status = chapter ? stageStatus(chapter) : null;
  const playable = chapter && stageUnlocked(chapter);
  const selected = skinById(UI.save.selectedSkin);
  const previousStage = chapter ? stages()[Math.max(0, stages().findIndex(stage => stage.id === chapter.id) - 1)] : null;
  const requirement = chapter && !playable
    ? t("world.unlockRequirement", {chapter:previousStage?.name || `World ${Math.max(1, state.world - 1)}-5`})
    : !worldReady ? t("world.worldRequirement") : t("world.unavailable");
  const art = WORLD_ART[state.world];
  const worldKey = `worlds.w${state.world}`;

  panel.dataset.i18nIgnore = "true";
  panel.innerHTML = `
    <header class="panel-head world-head-v093">
      <button type="button" class="back" data-v093-back>←</button>
      <div><h2>${escapeHtml(t("world.title"))}</h2><p>${escapeHtml(t("world.subtitle"))}</p></div>
    </header>
    <section class="world-selector-v093 glass">
      <header class="world-switch-v093">
        <button type="button" data-v093-world-step="-1" aria-label="Previous World">‹</button>
        <div><small>WORLD</small><b>${state.world}</b></div>
        <button type="button" data-v093-world-step="1" aria-label="Next World">›</button>
      </header>
      <div class="world-hero-v093" style='background-image:${art}'>
        <div><small>WORLD ${state.world}</small><h3>${escapeHtml(t(`${worldKey}.name`))}</h3><p>${escapeHtml(t(`${worldKey}.desc`))}</p></div>
        ${worldReady ? "" : `<span class="world-lock-v093">🔒 ${escapeHtml(state.world === 7 ? t("common.comingSoon") : t("common.locked"))}</span>`}
      </div>
      <nav class="chapter-list-v093" aria-label="Chapters">
        ${worldStages(state.world).map(stage => {
          const current = stage.id === chapter?.id;
          const stageState = stageStatus(stage);
          return `<button type="button" data-v093-chapter="${escapeHtml(stage.id)}" class="${current ? "active" : ""} ${stageState.className}">
            <small>${stage.boss ? "BOSS" : `CHAPTER ${stage.index}`}</small><b>${stage.world}-${stage.index}</b><span>${escapeHtml(t(stageState.key))}</span>
          </button>`;
        }).join("") || `<div class="chapter-empty-v093">🔒 ${escapeHtml(t("world.unavailable"))}</div>`}
      </nav>
      <article class="chapter-detail-v093 ${chapter ? "" : "empty"}">
        ${chapter ? `
          <div class="chapter-map-v093" style='background-image:${art}'><span>${chapter.boss ? "BOSS" : `WORLD ${chapter.world}`}</span></div>
          <div class="chapter-copy-v093">
            <div class="chapter-title-v093"><span class="${status.className}">${escapeHtml(t(status.key))}</span>${chapter.boss ? "<em>♛ BOSS</em>" : ""}</div>
            <h3>${escapeHtml(chapter.name)} · ${escapeHtml(chapter.title)}</h3>
            <p>${escapeHtml(chapter.desc || "")}</p>
            <div class="chapter-meta-v093">
              <div><small>${escapeHtml(t("world.recommendedLevel", {level:recommendedLevel(chapter)}))}</small><b>Lv.${recommendedLevel(chapter)}</b></div>
              <div><small>${escapeHtml(t("world.difficulty"))}</small><b>${difficulty(chapter)}</b></div>
              <div><small>${escapeHtml(t("world.objective"))}</small><b>${escapeHtml(t("world.enemies", {amount:chapter.goalKills}))}</b></div>
              <div><small>${escapeHtml(t("world.bestTime"))}</small><b>${bestTime(chapter)}</b></div>
            </div>
            <div class="chapter-rewards-v093">
              <div><small>${escapeHtml(t("world.firstClearReward"))}</small><b>${UI.save.firstClearClaimed?.[chapter.id] ? `✓ ${escapeHtml(t("common.claimed"))}` : escapeHtml(rewardText(chapter.firstClearReward))}</b></div>
              <div><small>${escapeHtml(t("world.repeatReward"))}</small><b>${escapeHtml(rewardText(chapter.repeatReward))}</b></div>
            </div>
          </div>` : `<div class="chapter-placeholder-v093"><b>WORLD ${state.world}</b><p>${escapeHtml(requirement)}</p></div>`}
      </article>
      <footer class="world-actions-v093">
        <span>${escapeHtml(t("world.selectedLoadout", {name:skinName(selected)}))}</span>
        <button type="button" class="menu-btn primary" data-v093-world-play ${playable ? "" : "disabled"}>${escapeHtml(playable ? t("common.play") : requirement)}</button>
      </footer>
    </section>`;
}

function launchSelectedChapter() {
  const chapter = currentChapter();
  if (!chapter || !stageUnlocked(chapter)) return UI.toast?.(t("error.lockedStage"));
  UI.save.selectedStageId = chapter.id;
  UI.worldCarouselIndex = Math.max(0, stages().findIndex(stage => stage.id === chapter.id));
  CherriftStorage.save(UI.save);
  UI.game?.start?.();
}

function ensureEventPanel() {
  let panel = id("eventV093");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "eventV093";
    panel.className = "panel hidden";
    id("app")?.appendChild(panel);
  }
  const eventCard = q("#menu .event-card");
  if (eventCard) {
    eventCard.classList.add("event-card-v093");
    eventCard.dataset.v093OpenEvent = "1";
    eventCard.setAttribute("role", "button");
    eventCard.setAttribute("tabindex", "0");
    const status = q("header span", eventCard);
    if (status) status.textContent = "BETA";
    const title = q("h3", eventCard);
    if (title) title.textContent = t("event.welcomeName");
    const copy = q(":scope > p", eventCard);
    if (copy) copy.textContent = t("event.welcomeDescription");
  }
  const mobileGrid = q(".mobile-menu-grid-v082");
  if (mobileGrid && !q("[data-v093-open-event]", mobileGrid)) {
    mobileGrid.insertAdjacentHTML("beforeend", `<button type="button" data-v093-open-event><i>✦</i><span>${escapeHtml(t("menu.event"))}</span></button>`);
  }
}

function renderEvent() {
  ensureEventPanel();
  const panel = id("eventV093");
  const claimed = ensureSave().eventsV093.welcomeClaimed === true;
  panel.dataset.i18nIgnore = "true";
  panel.innerHTML = `
    <header class="panel-head event-head-v093"><button type="button" class="back" data-v093-back>←</button>
      <div><h2>${escapeHtml(t("event.title"))}</h2><p>${escapeHtml(t("event.subtitle"))}</p></div>
    </header>
    <section class="event-v093 glass">
      <div class="event-banner-v093"><small>CLOSED BETA</small><h3>${escapeHtml(t("event.welcomeName"))}</h3><p>${escapeHtml(t("event.welcomeDescription"))}</p></div>
      <div class="event-progress-v093"><div><small>${escapeHtml(t("event.loginTask"))}</small><b>1 / 1</b></div><i><span style="width:100%"></span></i></div>
      <article class="event-reward-v093 ${claimed ? "claimed" : ""}">
        <div><span>🎁</span><p><small>${escapeHtml(t("event.reward"))}</small><b>${escapeHtml(t("event.rewardContents"))}</b></p></div>
        <button type="button" class="menu-btn primary" data-v093-event-claim ${claimed ? "disabled" : ""}>${escapeHtml(claimed ? t("common.claimed") : t("common.claim"))}</button>
      </article>
    </section>`;
}

function claimWelcomeEvent() {
  const save = ensureSave();
  if (save.eventsV093.welcomeClaimed) return UI.toast?.(t("event.alreadyClaimed"));
  const grant = () => {
    save.coins = Math.max(0, Number(save.coins) || 0) + 250;
    save.chests = save.chests && typeof save.chests === "object" ? save.chests : {};
    save.chests.common = Math.max(0, Number(save.chests.common) || 0) + 1;
    save.eventsV093.welcomeClaimed = true;
    CherriftStorage.save(save);
  };
  if (window.CHERRIFT_REWARD_CONTEXT) {
    CHERRIFT_REWARD_CONTEXT.run({source:"event_reward", showReward:false}, grant);
  } else if (window.CHERRIFT_REWARDS?.withSuppressed) {
    CHERRIFT_REWARDS.withSuppressed(grant);
  } else grant();
  const assets = window.CHERRIFT_ITEM_ASSETS;
  window.CHERRIFT_REWARDS?.show?.([
    {key:"currency:coin",name:"Coin",amount:250,asset:assets?.currency?.coins,rarity:"Common",kind:"currency"},
    {key:"chest:common",name:"Common Chest",amount:1,asset:assets?.chests?.common,rarity:"Common",kind:"chest"}
  ]);
  UI.refreshMenu?.();
  UI.toast?.(t("event.claimedToast"));
  renderEvent();
}

function patchUi() {
  UI.renderSkinCarousel = renderSkinSelector;
  UI.renderWorldPanel = renderWorldSelect;
  UI.openWorldSelect = function openWorldSelectV093() {
    const selectedStage = stages().find(stage => stage.id === this.save.selectedStageId);
    state.world = selectedStage?.world || state.world || 1;
    state.chapterId = selectedStage?.id || null;
    this.open("worlds");
    renderWorldSelect();
  };
  UI.moveWorldCarousel = function moveWorldV093(step) {
    state.world = clamp(state.world + Number(step || 0), 1, 7);
    state.chapterId = worldStages(state.world)[0]?.id || null;
    renderWorldSelect();
  };
  UI.launchSelectedWorld = launchSelectedChapter;

  const previousInit = UI.init?.bind(UI);
  UI.init = function initV093(save, game) {
    ensureSave(save);
    const result = previousInit(save, game);
    configureLocalizedData();
    ensureEventPanel();
    requestAnimationFrame(ensureEventPanel);
    window.setTimeout(ensureEventPanel, 120);
    state.selectedSkinId = save.selectedSkin;
    const selectedStage = stages().find(stage => stage.id === save.selectedStageId);
    state.world = selectedStage?.world || 1;
    state.chapterId = selectedStage?.id || null;
    renderSkinSelector();
    renderWorldSelect();
    return result;
  };

  const previousOpen = UI.open?.bind(UI);
  UI.open = function openV093(panel, ...args) {
    const result = previousOpen(panel, ...args);
    if (panel === "menu") ensureEventPanel();
    if (panel === "skins") renderSkinSelector();
    if (panel === "worlds") renderWorldSelect();
    if (panel === "eventV093") renderEvent();
    return result;
  };
}

function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target;
    const skin = target?.closest?.("[data-v093-skin]");
    if (skin) {
      event.preventDefault();
      state.selectedSkinId = skin.dataset.v093Skin;
      ensureSave();
      if (isSkinUnlocked(state.selectedSkinId) && !UI.save.uiV093.seenSkins.includes(state.selectedSkinId)) {
        UI.save.uiV093.seenSkins.push(state.selectedSkinId);
        CherriftStorage.save(UI.save);
      }
      renderSkinSelector();
      return;
    }
    const skinView = target?.closest?.("[data-v093-skin-view]");
    if (skinView) {
      event.preventDefault();
      state.skinView = skinView.dataset.v093SkinView;
      renderSkinSelector();
      return;
    }
    const previewDirection = target?.closest?.("[data-v093-preview-direction]");
    if (previewDirection) {
      event.preventDefault();
      state.previewDirection = previewDirection.dataset.v093PreviewDirection;
      renderSkinSelector();
      return;
    }
    const previewAnimation = target?.closest?.("[data-v093-preview-animation]");
    if (previewAnimation) {
      event.preventDefault();
      state.previewAnimation = previewAnimation.dataset.v093PreviewAnimation;
      renderSkinSelector();
      return;
    }
    if (target?.closest?.("[data-v093-equip]")) {
      event.preventDefault();
      equipSelectedSkin();
      return;
    }
    if (target?.closest?.("[data-v093-skill-info]")) {
      event.preventDefault();
      state.skillDialogOpen = true;
      q("#skinSkillDialogV093")?.classList.remove("hidden");
      return;
    }
    if (target?.closest?.("[data-v093-skill-close]")) {
      event.preventDefault();
      state.skillDialogOpen = false;
      q("#skinSkillDialogV093")?.classList.add("hidden");
      return;
    }
    const worldStep = target?.closest?.("[data-v093-world-step]");
    if (worldStep) {
      event.preventDefault();
      state.world = clamp(state.world + Number(worldStep.dataset.v093WorldStep), 1, 7);
      state.chapterId = worldStages(state.world)[0]?.id || null;
      renderWorldSelect();
      return;
    }
    const chapter = target?.closest?.("[data-v093-chapter]");
    if (chapter) {
      event.preventDefault();
      state.chapterId = chapter.dataset.v093Chapter;
      renderWorldSelect();
      return;
    }
    if (target?.closest?.("[data-v093-world-play]")) {
      event.preventDefault();
      launchSelectedChapter();
      return;
    }
    if (target?.closest?.("[data-v093-open-event],.event-card-v093")) {
      event.preventDefault();
      UI.open("eventV093");
      renderEvent();
      return;
    }
    if (target?.closest?.("[data-v093-event-claim]")) {
      event.preventDefault();
      claimWelcomeEvent();
      return;
    }
    if (target?.closest?.("[data-v093-back]")) {
      event.preventDefault();
      UI.open("menu");
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (!event.target?.matches?.(".event-card-v093") || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    UI.open("eventV093");
  });

  window.addEventListener("cherrift:languagechange", () => {
    ensureEventPanel();
    if (!id("skins")?.classList.contains("hidden")) renderSkinSelector();
    if (!id("worlds")?.classList.contains("hidden")) renderWorldSelect();
    if (!id("eventV093")?.classList.contains("hidden")) renderEvent();
  });
}

function watchEventNavigation() {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const grid = q(".mobile-menu-grid-v082");
      if (grid && !q("[data-v093-open-event]", grid)) ensureEventPanel();
    });
  });
  observer.observe(id("app") || document.body, {childList:true, subtree:true});
}

ensureCss();
ensureSave();
configureLocalizedData();
ensureEventPanel();
patchUi();
bindEvents();
watchEventNavigation();
startPreviewLoop();

const requiredKeys = [
  "common.play", "common.equip", "skin.title", "skin.skillDetails",
  "world.title", "world.firstClearReward", "event.welcomeName"
];
const missingKeys = localization?.validateKeys?.(requiredKeys) || [];
if (missingKeys.length) console.error("[CHERRIFT v0.9.3] Missing localization keys:", missingKeys);

window.CHERRIFT_V093 = Object.freeze({
  version:VERSION,
  state,
  renderSkinSelector,
  renderWorldSelect,
  renderEvent,
  claimWelcomeEvent,
  worldCount:7,
  localizationKeys:requiredKeys
});
console.info("[CHERRIFT] v0.9.3 UI, World and Localization update loaded.");
})();
