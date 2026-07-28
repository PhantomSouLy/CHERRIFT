(() => {
"use strict";

const VERSION = "0.9.3.2-layout-combat-polish";
const CACHE_VERSION = "0932";
const id = value => document.getElementById(value);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

if (!window.UI || !window.CherriftGame || !window.CherriftStorage) {
  console.error("[CHERRIFT v0.9.3.2] Required systems are missing.");
  return;
}

const runtime = {
  observer:null,
  refreshQueued:false,
  skinScroll:{top:0,left:0,valid:false},
  bagPopoverItem:null,
  pendingGearId:null,
  imageCache:new Map()
};

function language() {
  return window.CHERRIFT_I18N?.language === "en" || UI.save?.settings?.language === "en" ? "en" : "hu";
}
function copy(hu, en) { return language() === "en" ? en : hu; }
function isPhone() { return matchMedia("(max-width:820px)").matches; }
function count(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function deepClone(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch (_) {}
  }
  return JSON.parse(JSON.stringify(value ?? null));
}
function ensureCss() {
  if (id("v0932css")) return;
  const link = document.createElement("link");
  link.id = "v0932css";
  link.rel = "stylesheet";
  link.href = `v0932.css?v=${CACHE_VERSION}`;
  document.head.appendChild(link);
}
function cachedImage(source) {
  if (!source) return null;
  if (runtime.imageCache.has(source)) return runtime.imageCache.get(source);
  const image = new Image();
  image.decoding = "async";
  image.src = source;
  runtime.imageCache.set(source, image);
  return image;
}
function imageMarkup(source, alt, className = "") {
  return source ? `<img class="${escapeHtml(className)}" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" draggable="false">` : "";
}

/* -------------------------------------------------------------------------
 * Succubus basic claw: tail at Cherry, claw edge toward the target
 * ---------------------------------------------------------------------- */
function patchSuccubusClaw() {
  const proto = CherriftGame.prototype;
  if (proto.__v0932SuccubusClaw) return;
  proto.__v0932SuccubusClaw = true;

  const source = `assets/effects/succubus_cherry/succubus_crimson_claw_wave.png?v=${CACHE_VERSION}`;
  const previousDrawBullet = proto.drawBullet;
  proto.drawBullet = function drawBulletV0932(context, bullet) {
    if (bullet?.style !== "succubus_claw") return previousDrawBullet.call(this, context, bullet);
    const image = cachedImage(source);
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) {
      return previousDrawBullet.call(this, context, bullet);
    }

    const naturalAngle = -Math.PI / 4; // source art points from lower-left to upper-right
    const targetAngle = Number.isFinite(bullet.angle)
      ? bullet.angle
      : Math.atan2(Number(bullet.vy) || 0, Number(bullet.vx) || 1);
    const width = 128;
    const height = width * image.naturalHeight / image.naturalWidth;
    const lifeProgress = clamp((Number(bullet.life) || 0) / .62, 0, 1);
    const fade = Math.min(clamp((1 - lifeProgress) / .08, 0, 1), clamp(lifeProgress / .26, 0, 1));

    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = .20 + fade * .80;
    context.translate(bullet.x, bullet.y);
    context.rotate(targetAngle - naturalAngle);
    context.imageSmoothingEnabled = false;
    context.shadowColor = "rgba(255,35,82,.72)";
    context.shadowBlur = 12;
    // The source's narrow pointed root is around the lower-left edge.
    context.drawImage(image, -width * .08, -height * .82, width, height);
    context.restore();
  };
}

/* -------------------------------------------------------------------------
 * Warrior attack / clockwise two-layer skill animation
 * ---------------------------------------------------------------------- */
function animationProgress(timer, duration) {
  return clamp(1 - Math.max(0, Number(timer) || 0) / Math.max(.001, Number(duration) || .4), 0, 1);
}
function drawPivotImage(context, image, options = {}) {
  if (!image?.naturalWidth || !image?.naturalHeight) return false;
  const width = Math.max(1, Number(options.width) || 180);
  const height = width * image.naturalHeight / image.naturalWidth;
  context.save();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = clamp(options.alpha ?? 1, 0, 1);
  context.translate(options.x || 0, options.y || 0);
  context.rotate(options.rotation || 0);
  context.imageSmoothingEnabled = false;
  if (Number.isFinite(options.reveal) && options.reveal < .999) {
    const radius = Math.hypot(width, height);
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(options.reveal, 0, 1), false);
    context.closePath();
    context.clip();
  }
  context.drawImage(
    image,
    -width * (options.pivotX ?? .5),
    -height * (options.pivotY ?? .5),
    width,
    height
  );
  context.restore();
  return true;
}
function patchWarriorVfx() {
  const proto = CherriftGame.prototype;
  if (proto.__v0932WarriorVfx) return;
  proto.__v0932WarriorVfx = true;

  const previousDrawPlayer = proto.drawPlayer;
  proto.drawPlayer = function drawPlayerWarriorV0932(context, player) {
    if (!player || player.skin !== "warrior_cherry") return previousDrawPlayer.call(this, context, player);

    const assets = this.assets;
    const slash = assets?.get?.("warrior_v063_slash") || cachedImage(`assets/effects/warrior_cherry/attack_1.png?v=${CACHE_VERSION}`);
    const back = assets?.get?.("warrior_v063_whirlwind_back") || cachedImage(`assets/effects/warrior_cherry/skill_effect_1.png?v=${CACHE_VERSION}`);
    const front = assets?.get?.("warrior_v063_whirlwind_front") || cachedImage(`assets/effects/warrior_cherry/skill_effect_2.png?v=${CACHE_VERSION}`);
    const skillActive = (player.skillCastTimer || 0) > 0;
    const attackActive = !skillActive && (player.attackCastTimer || 0) > 0;

    const skillDuration = player.skillCastDuration || .72;
    const skillProgress = animationProgress(player.skillCastTimer, skillDuration);
    const skillFade = skillProgress < .72 ? 1 : clamp((1 - skillProgress) / .28, 0, 1);
    const revealBack = clamp(skillProgress / .34, 0, 1);
    const revealFront = clamp((skillProgress - .18) / .34, 0, 1);

    if (skillActive) {
      drawPivotImage(context, back, {
        x:player.x, y:player.y - 20, width:250,
        rotation:skillProgress * Math.PI * 2 * 1.18,
        alpha:.76 * skillFade,
        reveal:revealBack
      });
    }

    // Suppress only the old v0563 overlay images while preserving Warrior's sprite animation.
    const originalGet = assets?.get;
    if (assets && typeof originalGet === "function") {
      assets.get = function getWithoutOldWarriorOverlay(key) {
        if (["warrior_v063_slash", "warrior_v063_whirlwind_back", "warrior_v063_whirlwind_front"].includes(key)) return null;
        return originalGet.call(this, key);
      };
    }
    let result;
    try { result = previousDrawPlayer.call(this, context, player); }
    finally { if (assets && originalGet) assets.get = originalGet; }

    if (skillActive) {
      drawPivotImage(context, front, {
        x:player.x, y:player.y - 20, width:246,
        rotation:skillProgress * Math.PI * 2 * 1.42 + .32,
        alpha:.96 * skillFade,
        reveal:revealFront
      });
    } else if (attackActive) {
      const duration = player.attackCastDuration || .34;
      const progress = animationProgress(player.attackCastTimer, duration);
      const fade = progress < .12 ? progress / .12 : Math.pow(clamp(1 - progress, 0, 1), .52);
      const angle = Number.isFinite(player.warriorAttackAngle)
        ? player.warriorAttackAngle
        : ({right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[player.attackDir || player.lastDir] || 0);
      drawPivotImage(context, slash, {
        x:player.x + Math.cos(angle) * 10,
        y:player.y + Math.sin(angle) * 10 - 12,
        width:184,
        rotation:angle + Math.PI / 4,
        pivotX:.08,
        pivotY:.84,
        alpha:fade
      });
    }
    return result;
  };
}

/* -------------------------------------------------------------------------
 * Reward overlay: use the real Gear inventory art
 * ---------------------------------------------------------------------- */
function findGearByRewardKey(key) {
  const itemId = String(key || "").startsWith("gear:") ? String(key).slice(5) : "";
  const all = [...(UI.save?.inventory || []), ...Object.values(UI.save?.equipped || {})].filter(Boolean);
  return all.find(item => String(item.id) === itemId) || null;
}
function patchRewardGearArt() {
  const rewards = window.CHERRIFT_REWARDS;
  if (!rewards?.show || rewards.show.__v0932GearArt) return;
  const previous = rewards.show.bind(rewards);
  const show = function showRewardsV0932(items, options) {
    const patched = (Array.isArray(items) ? items : []).map(entry => {
      if (!entry || entry.kind !== "gear") return entry;
      const item = findGearByRewardKey(entry.key);
      if (!item) return entry;
      const rendered = UI.gearEmoji?.(item);
      if (typeof rendered === "string" && rendered.includes("<")) return {...entry, html:rendered, glyph:""};
      return {...entry, glyph:typeof rendered === "string" ? rendered : (entry.glyph || "⚙")};
    });
    return previous(patched, options);
  };
  show.__v0932GearArt = true;
  rewards.show = show;
}

/* -------------------------------------------------------------------------
 * Skin list scroll retention
 * ---------------------------------------------------------------------- */
function rememberSkinScroll() {
  const list = q("#skins .skin-list-v093");
  if (!list) return;
  runtime.skinScroll = {top:list.scrollTop, left:list.scrollLeft, valid:true};
}
function restoreSkinScroll() {
  if (!runtime.skinScroll.valid) return;
  const list = q("#skins .skin-list-v093");
  if (!list) return;
  list.scrollTop = runtime.skinScroll.top;
  list.scrollLeft = runtime.skinScroll.left;
}
function patchSkinScroll() {
  window.addEventListener("pointerdown", event => {
    if (event.target?.closest?.("#skins [data-v093-skin],#skins [data-v093-skin-view],#skins [data-v093-preview-direction],#skins [data-v093-preview-animation],#skins [data-v093-equip]")) rememberSkinScroll();
  }, true);
  document.addEventListener("click", event => {
    if (event.target?.closest?.("#skins [data-v093-skin],#skins [data-v093-skin-view],#skins [data-v093-preview-direction],#skins [data-v093-preview-animation],#skins [data-v093-equip]")) {
      requestAnimationFrame(() => { restoreSkinScroll(); requestAnimationFrame(restoreSkinScroll); });
    }
  }, true);
}

/* -------------------------------------------------------------------------
 * Gear selection, layout, upgrade recommendations and stat comparison
 * ---------------------------------------------------------------------- */
function removeWrongRarityFilter() {
  id("gearRarityFiltersV0931")?.remove();
  qa(".rarity-hidden-v0931").forEach(card => card.classList.remove("rarity-hidden-v0931"));
}
function ensureRareSelectionButton() {
  const tools = id("gearBulkToolsV082");
  if (!tools || q("[data-v0932-select-rare]", tools)) return;
  const common = q("[data-v082-select-common]", tools);
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.v0932SelectRare = "1";
  button.className = common?.className || "hidden";
  button.textContent = copy("Rare kijelölése", "Select Rare");
  common?.insertAdjacentElement("afterend", button) || tools.appendChild(button);
}
function selectVisibleRarity(rarities) {
  const grid = id("gearInventoryGridV0560");
  if (!grid) return;
  qa("[data-v0560-item-id].selected-v082", grid).forEach(card => card.click());
  qa("[data-v0560-item-id]", grid).forEach(card => {
    const item = UI.save?.inventory?.find(entry => String(entry?.id) === card.dataset.v0560ItemId);
    if (!item || item.locked || !rarities.includes(item.rarity)) return;
    if (!card.classList.contains("selected-v082")) card.click();
  });
}
function gearScore(item) {
  if (!item) return -Infinity;
  const apiScore = window.CHERRIFT_V050?.itemPower?.(item);
  if (Number.isFinite(apiScore)) return Number(apiScore);
  const weights = {damage:6,crit:8,critDamage:2.5,attackSpeed:3,maxHp:.32,armor:4,regen:18,moveSpeed:2.5,pickup:.8};
  return Object.entries(item.stats || {}).reduce((sum,[key,value]) => sum + Number(value || 0) * (weights[key] || 1), 0);
}
function itemById(itemId) { return UI.save?.inventory?.find(item => String(item?.id) === String(itemId)) || null; }
function formatNumber(value) {
  const number = Number(value) || 0;
  const abs = Math.abs(number);
  const digits = abs > 0 && abs < .01 ? 3 : abs < 1 ? 2 : 1;
  return number.toLocaleString(language() === "hu" ? "hu-HU" : "en-US", {minimumFractionDigits:0, maximumFractionDigits:digits});
}
function arsenalContribution(item, key) {
  const finalValue = Number(item?.stats?.[key]) || 0;
  const baseValue = Number(item?.baseStats?.[key]);
  return Number.isFinite(baseValue) ? finalValue - baseValue : 0;
}
function decorateGearRecommendations() {
  const grid = id("gearInventoryGridV0560");
  if (!grid || !UI.save) return;
  const cards = qa("[data-v0560-item-id]", grid);
  const ranked = [];
  for (const card of cards) {
    const item = itemById(card.dataset.v0560ItemId);
    if (!item) continue;
    const equipped = UI.save.equipped?.[item.slot];
    const delta = equipped?.id === item.id ? 0 : gearScore(item) - (equipped ? gearScore(equipped) : 0);
    const better = !equipped || delta > .001;
    let arrow = q(".gear-upgrade-arrow-v0932", card);
    if (better) {
      if (!arrow) {
        arrow = document.createElement("i");
        arrow.className = "gear-upgrade-arrow-v0932";
        arrow.textContent = "↑";
        card.appendChild(arrow);
      }
      arrow.title = copy(`Erősebb: +${formatNumber(delta)}`, `Upgrade: +${formatNumber(delta)}`);
    } else arrow?.remove();
    ranked.push({card, item, better, delta, score:gearScore(item)});
  }
  ranked.sort((a,b) => Number(b.better)-Number(a.better) || b.delta-a.delta || b.score-a.score);
  const currentOrder = qa("[data-v0560-item-id]", grid);
  if (ranked.some((entry,index) => currentOrder[index] !== entry.card)) {
    for (const entry of ranked) grid.appendChild(entry.card);
  }
}
function decorateLoadoutSlots() {
  if (!UI.save) return;
  qa("#gear [data-v0560-slot]").forEach(button => {
    const slot = button.dataset.v0560Slot;
    const item = UI.save.equipped?.[slot];
    const arsenalLevel = Math.max(1, Number(UI.save.arsenal?.slots?.[slot]?.level) || 1);
    const art = item ? (UI.gearEmoji?.(item) || "⚙") : ({Weapon:"⚔",Helmet:"⛑",Armor:"🛡",Gloves:"🧤",Boots:"🥾",Ring:"◉",Necklace:"◇"}[slot] || "＋");
    const signature = `${item?.id || "empty"}|${arsenalLevel}`;
    if (button.dataset.v0932Slot !== signature || !q(".gear-slot-icon-v0932", button) || !q(".gear-arsenal-level-v0932", button)) {
      button.dataset.v0932Slot = signature;
      button.innerHTML = `<span class="gear-slot-icon-v0932">${art}</span><i class="gear-arsenal-level-v0932">A${arsenalLevel}</i>`;
    }
    button.setAttribute("aria-label", `${slot} · Arsenal Lv.${arsenalLevel}`);
  });
}
function comparisonRows(item) {
  const equipped = UI.save?.equipped?.[item.slot];
  const keys = [...new Set([...Object.keys(item.stats || {}), ...Object.keys(equipped?.stats || {})])];
  return keys.map(key => {
    const value = Number(item.stats?.[key]) || 0;
    const oldValue = Number(equipped?.stats?.[key]) || 0;
    const delta = equipped?.id === item.id ? 0 : value - oldValue;
    const contribution = arsenalContribution(item, key);
    const className = delta > .0001 ? "good" : delta < -.0001 ? "bad" : "same";
    const arrow = delta > .0001 ? "↑" : delta < -.0001 ? "↓" : "•";
    const stat = String(key).replace(/([A-Z])/g," $1").replace(/^./,char=>char.toUpperCase());
    const percent = ["crit","critDamage","attackSpeed","moveSpeed"].includes(key) ? "%" : "";
    return `<div class="gear-compare-row-v0932 ${className}"><span>${escapeHtml(stat)}</span><b>${formatNumber(value)}${percent}</b><em>${arrow} ${delta > 0 ? "+" : ""}${formatNumber(delta)}${percent}</em><small>(${copy("Arsenal", "Arsenal")} ${contribution >= 0 ? "+" : ""}${formatNumber(contribution)}${percent})</small></div>`;
  }).join("");
}
function decorateGearModal(itemId = runtime.pendingGearId) {
  const item = itemById(itemId) || Object.values(UI.save?.equipped || {}).find(entry => String(entry?.id) === String(itemId));
  const body = id("gearModalBodyV0560");
  if (!item || !body || id("gearModalV0560")?.classList.contains("hidden")) return;
  q(".gear-detail-stats-v0560", body)?.remove();
  q(".gear-compare-v0560", body)?.remove();
  let comparison = q(".gear-comparison-v0932", body);
  if (!comparison) {
    comparison = document.createElement("section");
    comparison.className = "gear-comparison-v0932";
    q(".gear-detail-head-v0560", body)?.insertAdjacentElement("afterend", comparison);
  }
  const markup = `<header><h4>${copy("Stat összehasonlítás", "Stat comparison")}</h4><small>${copy("Zöld: nyereség · Piros: veszteség", "Green: gain · Red: loss")}</small></header>${comparisonRows(item)}`;
  if (comparison.dataset.v0932Signature !== markup) {
    comparison.dataset.v0932Signature = markup;
    comparison.innerHTML = markup;
  }
}
function decorateGearUi() {
  removeWrongRarityFilter();
  ensureRareSelectionButton();
  decorateLoadoutSlots();
  decorateGearRecommendations();
  if (runtime.pendingGearId) decorateGearModal(runtime.pendingGearId);
}

/* -------------------------------------------------------------------------
 * BAG popover instead of a long detail panel below the grid
 * ---------------------------------------------------------------------- */
function bagItem(itemId) {
  const save = UI.save || {};
  const assets = window.CHERRIFT_ITEM_ASSETS || {};
  const material = save.bag?.materials || {};
  if (itemId === "gearScrap") return {id:itemId,name:"Gear Scrap",rarity:"Common",count:count(material.gearScrap),asset:assets.currency?.gearScrap,desc:copy("Arsenal fejlesztéshez.","For Arsenal upgrades.")};
  if (itemId === "sakuraEssence") return {id:itemId,name:"Sakura Essence",rarity:"Epic",count:count(save.sakuraEssence),asset:assets.currency?.sakuraEssence,desc:copy("Skinekhez és különleges fejlesztésekhez.","For skins and special upgrades.")};
  if (itemId.startsWith("stone:")) {
    const key=itemId.slice(6); const rarity={copper:"Common",iron:"Uncommon",steel:"Rare",silver:"Epic",royal:"Legendary",magical:"Legendary"}[key]||"Common";
    return {id:itemId,name:`${key[0].toUpperCase()}${key.slice(1)} Stone`,rarity,count:count(material.stones?.[key]),asset:assets.stones?.[key],desc:copy("Arsenal szintlépéshez.","For Arsenal level-ups.")};
  }
  if (itemId.startsWith("core:")) {
    const slot=itemId.slice(5); return {id:itemId,name:`${slot} Core`,rarity:"Rare",count:count(material.slotCores?.[slot]),asset:assets.cores?.[slot],desc:copy("Az Arsenal slot csillagozásához.","Stars up this Arsenal slot.")};
  }
  if (itemId.startsWith("buff:")) {
    const key=itemId.slice(5), food=window.CHERRIFT_V080?.foodCatalog?.[key];
    if (!food) return null;
    return {id:itemId,itemId:key,name:food.name,rarity:food.rarity||"Common",count:count(save.bag?.items?.[key]),asset:food.asset,desc:`+${Math.round(Number(food.value||0)*100)}% · ${food.runs||0} ${copy("kör","runs")}`,action:"use"};
  }
  if (itemId.startsWith("chest:")) {
    const type=itemId.slice(6); return {id:itemId,chestType:type,name:`${type[0].toUpperCase()}${type.slice(1)} Chest`,rarity:type==="common"?"Common":type==="rare"?"Rare":type==="epic"?"Epic":"Legendary",count:count(save.chests?.[type]),asset:assets.chests?.[type],desc:copy("Nyisd ki a Gachában.","Open it in Gacha."),action:"gacha"};
  }
  return null;
}
function ensureBagPopover() {
  let overlay = id("bagPopoverV0932");
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "bagPopoverV0932";
  overlay.className = "bag-popover-v0932 hidden";
  overlay.innerHTML = '<button type="button" class="bag-popover-backdrop-v0932" data-v0932-bag-close aria-label="Close"></button><article id="bagPopoverCardV0932"></article>';
  document.body.appendChild(overlay);
  return overlay;
}
function openBagPopover(itemId) {
  const item = bagItem(itemId);
  if (!item) return;
  const overlay = ensureBagPopover();
  const card = id("bagPopoverCardV0932");
  runtime.bagPopoverItem = itemId;
  const action = item.action === "use"
    ? `<button type="button" data-v0932-bag-use="${escapeHtml(item.itemId)}">${copy("HASZNÁLAT","USE")}</button>`
    : item.action === "gacha"
      ? `<button type="button" data-v0932-bag-gacha="${escapeHtml(item.chestType)}">GACHA</button>` : "";
  card.className = `rarity-${String(item.rarity).toLowerCase()}`;
  card.innerHTML = `<button type="button" class="bag-popover-close-v0932" data-v0932-bag-close>×</button><div class="bag-popover-art-v0932">${imageMarkup(item.asset,item.name)}</div><small>${escapeHtml(item.rarity)}</small><h2>${escapeHtml(item.name)}</h2><strong>${copy("Birtokolt","Owned")}: ${item.count}</strong><p>${escapeHtml(item.desc)}</p>${action}`;
  overlay.classList.remove("hidden");
  qa(".bag-item-v084.active").forEach(cardNode => cardNode.classList.remove("active"));
}
function closeBagPopover() {
  id("bagPopoverV0932")?.classList.add("hidden");
  runtime.bagPopoverItem = null;
}
function cleanBagLayout() {
  qa(".bag-detail-v084").forEach(detail => detail.remove());
  qa(".bag-item-v084.active").forEach(card => card.classList.remove("active"));
}

/* -------------------------------------------------------------------------
 * Main menu: compact currencies, balanced side actions and chapter stars
 * ---------------------------------------------------------------------- */
function currentStage() {
  const stages = window.CHERRIFT_V040?.stages || [];
  return stages.find(stage => stage.id === UI.save?.selectedStageId) || stages[0] || null;
}
function resourceIcon(source, fallback, label) {
  return source ? imageMarkup(source,label,"mobile-resource-icon-v0932") : `<span>${fallback}</span>`;
}
function ensureMobileHomePolish() {
  const menu = id("menu");
  if (!menu) return;
  let hud = id("mobileHeaderV0932");
  if (!hud) {
    hud = document.createElement("section");
    hud.id = "mobileHeaderV0932";
    hud.className = "mobile-header-v0932";
    menu.appendChild(hud);
  }
  let left = id("mobileLeftActionsV0932");
  if (!left) { left=document.createElement("nav"); left.id="mobileLeftActionsV0932"; left.className="mobile-side-actions-v0932 left"; menu.appendChild(left); }
  let right = id("mobileRightActionsV0932");
  if (!right) { right=document.createElement("nav"); right.id="mobileRightActionsV0932"; right.className="mobile-side-actions-v0932 right"; menu.appendChild(right); }
  let stars = id("mobileChapterStarsV0932");
  if (!stars) {
    stars=document.createElement("div"); stars.id="mobileChapterStarsV0932"; stars.className="mobile-chapter-stars-v0932";
    const preview=q("#menu .mobile-character-display-v051") || q("#menu .mobile-stage-preview") || q("#menu .dashboard-run-v060");
    preview?.insertAdjacentElement("afterend",stars);
  }

  const save=UI.save||{}, assets=window.CHERRIFT_ITEM_ASSETS||{}, skin=(CHERRIFT_DATA.skins||[]).find(entry=>entry.id===save.selectedSkin)||CHERRIFT_DATA.skins?.[0];
  const hudMarkup = `<div class="mobile-currencies-v0932">
    <span title="Coin">${resourceIcon(assets.currency?.coins,"🪙","Coin")}<b>${count(save.coins)}</b></span>
    <span title="Blossom Gem">${resourceIcon(assets.currency?.blossomGems,"💎","Gem")}<b>${count(save.blossomGems)}</b></span>
    <span title="Sakura Essence">${resourceIcon(assets.currency?.sakuraEssence,"🌸","Essence")}<b>${count(save.sakuraEssence)}</b></span>
    <span title="Keys"><span>🗝</span><b>${count(save.keys)}</b></span>
    <span title="Gear Scrap">${resourceIcon(assets.currency?.gearScrap,"⚙","Scrap")}<b>${count(save.bag?.materials?.gearScrap)}</b></span>
  </div><div class="mobile-profile-row-v0932">
    <button type="button" data-v082-open="profileV082" class="mobile-profile-v0932">${imageMarkup(skin?.icon,skin?.name||"Cherry")}<span><small>${copy("TESZTVERZIÓ","TEST BUILD")}</small><b>${copy("Szint","Level")} ${count(save.account?.level)||1}</b></span></button>
    <span class="mobile-energy-v0932">⚡ <b>${save.energy == null ? 5 : count(save.energy)}</b></span>
    <nav><button type="button" data-v082-open="mailV063" aria-label="Mail">✉</button><button type="button" data-v0932-support="feedback" aria-label="Feedback">!</button><button type="button" data-v082-open="settings" aria-label="Settings">⚙</button></nav>
  </div>`;
  if (hud.innerHTML !== hudMarkup) hud.innerHTML = hudMarkup;
  const leftMarkup = `<button type="button" data-v082-open="gachaV082"><i>🎁</i><b>${copy("Chest","Chest")}</b></button><button type="button" data-v082-open="gear"><i>⚔</i><b>${copy("Felszerelés","Gear")}</b></button><button type="button" data-v082-open="skins">${imageMarkup(skin?.icon,skin?.name||"Cherry")}<b>${copy("Kinézetek","Cherry")}</b></button>`;
  const rightMarkup = `<button type="button" data-v082-open="dailyQuests"><i>✓</i><b>${copy("Napi","Daily")}</b></button><button type="button" data-v082-open="weeklyV082"><i>♛</i><b>${copy("Heti","Weekly")}</b></button><button type="button" data-v082-open="loginRewards"><i>🎁</i><b>${copy("Belépés","Login")}</b></button>`;
  if (left.innerHTML !== leftMarkup) left.innerHTML = leftMarkup;
  if (right.innerHTML !== rightMarkup) right.innerHTML = rightMarkup;

  const starTarget=q("#menu .mobile-character-display-v051") || q("#menu .mobile-stage-preview") || q("#menu .dashboard-run-v060");
  if (stars && starTarget && stars.previousElementSibling !== starTarget) starTarget.insertAdjacentElement("afterend", stars);
  const stage=currentStage();
  const amount=clamp(count(save.stageStars?.[stage?.id]||save.stageStats?.[stage?.id]?.stars),0,3);
  const starMarkup=`<span>${"★".repeat(amount)}${"☆".repeat(3-amount)}</span><small>${amount}/3</small>`;
  if(stars && stars.innerHTML !== starMarkup) stars.innerHTML=starMarkup;

  // The map preview is for the chapter only; no skin badge belongs in its center.
  qa("#mobileStageArt > *,#menu .mobile-stage-preview .skin-nav-icon-v090,#menu .mobile-stage-preview .dashboard-skin-v060,#mobileCharacterIconV051").forEach(node=>node.remove());
  const art=id("mobileStageArt"); if(art) art.textContent="";

  // Bring missing mobile destinations into More as well.
  const drawer=q("#mobileMenuV082 .mobile-menu-grid-v082");
  if(drawer) {
    const entries=[
      ["dailyQuests","✓",copy("Napi jutalom","Daily")],
      ["weeklyV082","♛",copy("Heti jutalom","Weekly")],
      ["loginRewards","🎁",copy("Belépési jutalom","Login")],
      ["mailV063","✉",copy("Levelek","Mail")]
    ];
    for(const [route,icon,label] of entries) if(!q(`[data-v082-open="${route}"]`,drawer)) drawer.insertAdjacentHTML("beforeend",`<button type="button" data-v082-open="${route}"><i>${icon}</i><b>${escapeHtml(label)}</b></button>`);
  }

  const patch=q("#menu .patch-card > p");
  if(patch) patch.textContent=copy("UI-rendrakás, combat effektek és kényelmesebb mobilnézet.","UI polish, combat effects and a cleaner mobile layout.");
  qa("#menuDashboardV060 .dashboard-shortcuts-v060 button small").forEach(node=>node.textContent="");
}
function shortenEconomyText() {
  qa(".chest-card-v080").forEach(card=>{
    const button=q("[data-v080-open-chest]",card); const paragraph=q(":scope > p",card); if(!button||!paragraph)return;
    const type=button.dataset.v080OpenChest;
    paragraph.textContent=type==="common"?copy("Common gear/skin · 10. nyitás: skin","Common gear/skin · 10th: skin"):
      type==="rare"?copy("Common–Rare gear · 15. nyitás: Rare skin","Common–Rare gear · 15th: Rare skin"):
      copy("Rare–Epic gear · 25. nyitás: Epic reward","Rare–Epic gear · 25th: Epic reward");
  });
}

/* -------------------------------------------------------------------------
 * Lifecycle, events and observer
 * ---------------------------------------------------------------------- */
function refreshAll() {
  removeWrongRarityFilter();
  ensureRareSelectionButton();
  cleanBagLayout();
  decorateGearUi();
  ensureMobileHomePolish();
  shortenEconomyText();
  restoreSkinScroll();
}
function observeRuntime() {
  if (!runtime.observer || !document.body) return;
  runtime.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
}
function scheduleRefresh() {
  if (runtime.refreshQueued) return;
  runtime.refreshQueued=true;
  requestAnimationFrame(()=>{
    runtime.refreshQueued=false;
    runtime.observer?.disconnect();
    try { refreshAll(); } finally { observeRuntime(); }
  });
}
function patchUiLifecycle() {
  const previousInit=UI.init?.bind(UI);
  if(previousInit&&!UI.__v0932Init){
    UI.init=function initV0932(save,game){const result=previousInit(save,game);scheduleRefresh();setTimeout(refreshAll,0);return result;};
    UI.__v0932Init=true;
  }
  const previousRefresh=UI.refreshMenu?.bind(UI);
  if(previousRefresh&&!UI.__v0932Refresh){
    UI.refreshMenu=function refreshV0932(...args){const result=previousRefresh(...args);scheduleRefresh();return result;};
    UI.__v0932Refresh=true;
  }
  const previousRenderGear=UI.renderGear?.bind(UI);
  if(previousRenderGear&&!UI.__v0932RenderGear){
    UI.renderGear=function renderGearV0932(...args){const result=previousRenderGear(...args);requestAnimationFrame(decorateGearUi);return result;};
    UI.__v0932RenderGear=true;
  }
  const previousOpen=UI.open?.bind(UI);
  if(previousOpen&&!UI.__v0932Open){
    UI.open=function openV0932(panel,...args){
      if(panel!=="chests"&&panel!=="bagV082")closeBagPopover();
      const result=previousOpen(panel,...args);scheduleRefresh();return result;
    };
    UI.__v0932Open=true;
  }
}
function bindEvents() {
  if(document.documentElement.dataset.v0932Events)return;
  document.documentElement.dataset.v0932Events="1";

  window.addEventListener("click",event=>{
    const target=event.target;
    if(!target?.closest)return;

    const bagCard=target.closest("[data-v084-bag-item]");
    if(bagCard){event.preventDefault();event.stopImmediatePropagation();openBagPopover(bagCard.dataset.v084BagItem);return;}
    const bagClose=target.closest("[data-v0932-bag-close]");
    if(bagClose){event.preventDefault();event.stopImmediatePropagation();closeBagPopover();return;}
    const bagUse=target.closest("[data-v0932-bag-use]");
    if(bagUse){event.preventDefault();event.stopImmediatePropagation();window.CHERRIFT_V080?.activateFood?.(bagUse.dataset.v0932BagUse);closeBagPopover();scheduleRefresh();return;}
    const bagGacha=target.closest("[data-v0932-bag-gacha]");
    if(bagGacha){event.preventDefault();event.stopImmediatePropagation();closeBagPopover();UI.open("gachaV082");return;}

    if(target.closest("[data-v082-select-common]")){
      event.preventDefault();event.stopImmediatePropagation();selectVisibleRarity(["Common","Uncommon"]);return;
    }
    if(target.closest("[data-v0932-select-rare]")){
      event.preventDefault();event.stopImmediatePropagation();selectVisibleRarity(["Rare"]);return;
    }

    const support=target.closest("[data-v0932-support]");
    if(support){
      event.preventDefault();event.stopImmediatePropagation();
      const systems=window.CHERRIFT_V063;if(systems?.runtime)systems.runtime.supportType=support.dataset.v0932Support;
      UI.open("supportV063");systems?.renderSupport?.();return;
    }

    const gearCard=target.closest("#gearInventoryGridV0560 [data-v0560-item-id]");
    if(gearCard&&!gearCard.classList.contains("selection-mode-v082")){
      runtime.pendingGearId=gearCard.dataset.v0560ItemId;
      setTimeout(()=>decorateGearModal(runtime.pendingGearId),0);
    }
  },true);

  document.addEventListener("click",event=>{
    const overlay=id("bagPopoverV0932");
    if(overlay&&!overlay.classList.contains("hidden")&&!event.target.closest?.("#bagPopoverCardV0932,[data-v084-bag-item]"))closeBagPopover();
  });
  window.addEventListener("resize",scheduleRefresh);
  window.addEventListener("cherrift:languagechange",()=>setTimeout(refreshAll,0));
}
function installObserver(){
  if(runtime.observer||!document.body)return;
  runtime.observer=new MutationObserver(scheduleRefresh);
  observeRuntime();
}
function patchVersion(){
  const patch=q("#menu .patch-card");
  if(patch){const badge=q("header span",patch);if(badge)badge.textContent="v0.9.3.2";}
}

ensureCss();
patchSuccubusClaw();
patchWarriorVfx();
patchRewardGearArt();
patchSkinScroll();
patchUiLifecycle();
bindEvents();
installObserver();
patchVersion();
scheduleRefresh();

window.CHERRIFT_V0932=Object.freeze({version:VERSION,refresh:refreshAll,closeBagPopover});
console.info("[CHERRIFT] v0.9.3.2 layout and combat polish loaded.");
})();
