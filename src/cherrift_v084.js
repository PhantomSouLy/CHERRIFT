(() => {
"use strict";

const VERSION = "0.8.4-ui-polish";
const DISPLAY_VERSION = "v0.8.4";
const DESKTOP_BREAKPOINT = 820;
const id = name => document.getElementById(name);
const q = (selector, root = document) => root?.querySelector?.(selector) || null;
const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const isMobile = () => matchMedia(`(max-width:${DESKTOP_BREAKPOINT}px)`).matches;
const assets = window.CHERRIFT_ITEM_ASSETS || window.CHERRIFT_V083?.assets || {};

const state = {
  bagCategory: "all",
  bagSelected: "gearScrap",
  collectionTab: "skins",
  collectionSelected: null,
  reportFiles: [],
  decorateQueued: false,
  observer: null
};

const COPY = {
  hu: {
    all: "Összes", enhancement: "Fejlesztés", stones: "Kövek", cores: "Core-ok", buffs: "Buffok", chests: "Ládák",
    inventory: "Inventory", inventoryHint: "Válassz kategóriát, majd kattints egy tárgyra a részletekért.", owned: "Birtokolt",
    use: "HASZNÁLAT", openGacha: "GACHA MEGNYITÁSA", noItems: "Ebben a kategóriában még nincs tárgyad.",
    obtainedFrom: "Beszerzés", effect: "Hatás", noAction: "Ez egy fejlesztési alapanyag.",
    collectionLocked: "Még nincs feloldva", discovered: "Felfedezve", defeatToDiscover: "Győzd le a felfedezéshez",
    splash: "Splash art", idlePreview: "In-game idle", close: "Bezárás", stats: "Statisztikák",
    bugDescription: "Hiba leírása", bugDescriptionHint: "Írd le egyszerűen, mit csináltál, és mi történt.",
    attachments: "Képek csatolása", attachmentHint: "Legfeljebb 3 kép, képenként maximum 6 MB.",
    sendBug: "Hibajelentés elküldése", sendFeedback: "Visszajelzés elküldése", sending: "Küldés…",
    reportSent: "A jelentés megérkezett Discordra.", reportCopied: "A küldés nem sikerült; a jelentést a vágólapra másoltuk.",
    reportMissing: "Adj meg címet és leírást.", reportSetup: "A Discord beküldés még nincs beállítva a Supabase-ben.",
    low: "Apró kellemetlenség", medium: "Zavaró", high: "Komoly hiba", blocker: "Nem tudok tovább játszani",
    skillEmpty: "Még nincs aktív Skill Tree bónusz.", buffEmpty: "Még nincs aktív account buff.", gearEmpty: "Nincs felszerelésből származó bónusz.",
    power: "Erő", damage: "Sebzés", hp: "HP", move: "Mozgás", crit: "Kritikus esély", critDamage: "Kritikus sebzés",
    attackSpeed: "Támadási sebesség", reduction: "Sebzéscsökkentés", skillTree: "Képességfa", accountBuff: "Account buff", gear: "Felszerelés"
  },
  en: {
    all: "All", enhancement: "Enhancement", stones: "Stones", cores: "Cores", buffs: "Buffs", chests: "Chests",
    inventory: "Inventory", inventoryHint: "Choose a category, then select an item for details.", owned: "Owned",
    use: "USE", openGacha: "OPEN GACHA", noItems: "You do not own items in this category yet.",
    obtainedFrom: "Sources", effect: "Effect", noAction: "This is an enhancement material.",
    collectionLocked: "Not unlocked yet", discovered: "Discovered", defeatToDiscover: "Defeat it to discover",
    splash: "Splash art", idlePreview: "In-game idle", close: "Close", stats: "Statistics",
    bugDescription: "Bug description", bugDescriptionHint: "Simply describe what you did and what happened.",
    attachments: "Attach images", attachmentHint: "Up to 3 images, maximum 6 MB each.",
    sendBug: "Send bug report", sendFeedback: "Send feedback", sending: "Sending…",
    reportSent: "The report was delivered to Discord.", reportCopied: "Sending failed; the report was copied to your clipboard.",
    reportMissing: "Add a title and description.", reportSetup: "Discord reporting is not configured in Supabase yet.",
    low: "Minor inconvenience", medium: "Disruptive", high: "Serious bug", blocker: "I cannot continue playing",
    skillEmpty: "No active Skill Tree bonus yet.", buffEmpty: "No active account buff yet.", gearEmpty: "No equipment bonus yet.",
    power: "Power", damage: "Damage", hp: "HP", move: "Movement", crit: "Critical chance", critDamage: "Critical damage",
    attackSpeed: "Attack speed", reduction: "Damage reduction", skillTree: "Skill Tree", accountBuff: "Account Buff", gear: "Equipment"
  }
};

function language() {
  return window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
}
function t(key) { return COPY[language()][key] || COPY.en[key] || key; }
function image(source, alt, className = "v084-icon") {
  return source ? `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" draggable="false">` : "";
}
function safeCount(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function visible(element) { return !!element && !element.classList.contains("hidden") && getComputedStyle(element).display !== "none"; }

function ensureCss() {
  if (id("v084css")) return;
  const link = document.createElement("link");
  link.id = "v084css";
  link.rel = "stylesheet";
  link.href = "v084.css?v=084";
  document.head.appendChild(link);
}

function hideCustomPanelsExcept(panelId = "") {
  qa(".v082-custom-panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== panelId));
}

function forcePanel(panelId) {
  const panel = id(panelId);
  if (!panel) return;
  id("menu")?.classList.add("hidden");
  qa("#app > .panel").forEach(entry => entry.classList.toggle("hidden", entry !== panel));
  panel.classList.remove("hidden");
  document.body.classList.remove("is-playing", "is-levelup", "is-loading-stage", "arsenal-open-v081");
}

function patchNavigation() {
  if (!window.UI || UI.__v084Navigation) return;
  const previousOpen = UI.open.bind(UI);
  UI.open = function openV084(panel, ...args) {
    const result = previousOpen(panel, ...args);
    requestAnimationFrame(() => {
      if (panel === "menu") {
        hideCustomPanelsExcept();
        id("menu")?.classList.remove("hidden");
      } else if (["profileV082", "weeklyV082", "socialV082", "statSummaryV082"].includes(panel)) {
        hideCustomPanelsExcept(panel);
      } else {
        hideCustomPanelsExcept();
      }
      if (panel === "settings") forcePanel("settings");
      refreshAll(panel);
    });
    return result;
  };
  UI.__v084Navigation = true;
}

function patchVersion() {
  document.title = window.CHERRIFT_BUILD?.title || "CHERRIFT v0.9.0 – TEST BUILD";
  const label = window.CHERRIFT_BUILD?.label || "TESZTVERZIÓ · v0.9.0";
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = label;
  const menu = id("menuBuildVersion");
  if (menu) menu.textContent = label;
  qa(".version-badge-v063,[data-v063-version]").forEach(element => { element.textContent = label; });
}

function decorateWalletCounter(counterId, asset, label) {
  const counter = id(counterId);
  const pill = counter?.parentElement;
  if (!pill || pill.dataset.v084Wallet === label) return;
  pill.dataset.v084Wallet = label;
  qa("img.v084-wallet-icon", pill).forEach(node => node.remove());
  Array.from(pill.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent = " ";
  });
  pill.insertAdjacentHTML("afterbegin", image(asset, label, "v084-wallet-icon"));
}

function decorateArsenal() {
  const panel = id("arsenalV070");
  if (!panel) return;
  decorateWalletCounter("arsenalCoinsV070", assets.currency?.coins, "Coin");
  decorateWalletCounter("arsenalScrapV070", assets.currency?.gearScrap, "Gear Scrap");

  const note = q(".arsenal-note-v070", panel);
  const scrap = q('[data-v082-material="gearScrap"]', note);
  const strong = q(":scope > strong", note);
  if (note && scrap && strong && scrap.previousElementSibling !== strong) strong.insertAdjacentElement("afterend", scrap);
  scrap?.classList.add("gear-scrap-primary-v084");
  qa('[data-v082-material] i[class*="stone-"]', panel).forEach(dot => dot.remove());

  qa(".arsenal-card-v070 h2", panel).forEach(heading => {
    if (q(".arsenal-stars-v084", heading)) return;
    const text = heading.textContent || "";
    const match = text.match(/^(.*?)\s*·\s*([★☆]+)$/);
    if (!match) return;
    const stars = [...match[2]].map(char => `<i class="${char === "★" ? "filled" : "empty"}">${char}</i>`).join("");
    heading.innerHTML = `<span>${escapeHtml(match[1].trim())}</span><span class="arsenal-stars-v084" aria-label="${escapeHtml(match[2])}">${stars}</span>`;
  });
}

function ensureSkillArrows() {
  const scroll = id("skillTreeScrollV082");
  if (!scroll || id("skillScrollControlsV084")) return;
  const controls = document.createElement("div");
  controls.id = "skillScrollControlsV084";
  controls.className = "skill-scroll-controls-v084";
  controls.innerHTML = '<button type="button" data-v084-skill-scroll="-1" aria-label="Scroll left">‹</button><button type="button" data-v084-skill-scroll="1" aria-label="Scroll right">›</button>';
  scroll.insertAdjacentElement("afterend", controls);
}

function decorateSkillTree() {
  const panel = id("playerUpgrade");
  if (!panel) return;
  q(".skill-tree-help-v082", panel)?.remove();
  ensureSkillArrows();
  q(".skill-toolbar-v082", panel)?.classList.add("skill-toolbar-v084");
}

const STAT_LABEL_MAP_HU = {
  coin: "Coin bevétel", chestDrop: "Láda drop", itemDrop: "Item drop", damage: "Sebzés", attackSpeed: "Támadási sebesség",
  crit: "Kritikus esély", moveSpeed: "Mozgási sebesség", maxHp: "Max HP", cooldown: "Skill cooldown", bundle: "Coin / Láda / Item luck",
  armor: "Páncél", regen: "Regeneráció", pickup: "Felvételi távolság", critDamage: "Kritikus sebzés"
};
function prettyKey(key) {
  if (language() === "hu" && STAT_LABEL_MAP_HU[key]) return STAT_LABEL_MAP_HU[key];
  return String(key).replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
}

function decorateStatSummary() {
  const panel = id("statSummaryV082");
  if (!panel || !visible(panel)) return;
  const cards = qa(".stat-final-grid-v082 article", panel);
  const labels = [t("power"), t("damage"), t("hp"), t("move"), t("crit"), t("critDamage"), t("attackSpeed"), t("reduction")];
  cards.forEach((card, index) => {
    const small = q("small", card);
    if (small && labels[index]) small.textContent = labels[index];
    card.dataset.stat = ["power","damage","hp","move","crit","critDamage","attackSpeed","reduction"][index] || "";
  });
  const blocks = qa(".stat-breakdown-v082 > article", panel);
  const titles = [t("skillTree"), t("accountBuff"), t("gear")];
  const empties = [t("skillEmpty"), t("buffEmpty"), t("gearEmpty")];
  blocks.forEach((block, index) => {
    const h3 = q("h3", block);
    if (h3) h3.textContent = titles[index];
    qa("p span", block).forEach(span => { span.textContent = prettyKey(span.textContent.trim()); });
    const hasRows = !!q("p", block);
    if (!hasRows) block.innerHTML = `<h3>${escapeHtml(titles[index])}</h3><div class="stat-empty-v084">${escapeHtml(empties[index])}</div>`;
  });
}

function bagItems() {
  const save = UI.save || {};
  const material = save.bag?.materials || {};
  const items = [];
  const push = item => items.push(item);
  push({id:"gearScrap",category:"enhancement",name:"Gear Scrap",count:safeCount(material.gearScrap),asset:assets.currency?.gearScrap,rarity:"Common",description:t("noAction"),source:"Gear dismantle · Weekly Reward"});
  push({id:"sakuraEssence",category:"enhancement",name:"Sakura Essence",count:safeCount(save.sakuraEssence),asset:assets.currency?.sakuraEssence,rarity:"Epic",description:language()==="hu"?"Skinek és különleges fejlesztések alapanyaga.":"A material for skins and special upgrades.",source:"Duplicate skins · Achievements · Shop"});
  const stoneRarity = {copper:"Common",iron:"Uncommon",steel:"Rare",silver:"Epic",royal:"Legendary",magical:"Legendary"};
  for (const key of ["copper","iron","steel","silver","royal","magical"]) push({id:`stone:${key}`,category:"stones",name:`${key[0].toUpperCase()}${key.slice(1)} Enhancement Stone`,count:safeCount(material.stones?.[key]),asset:assets.stones?.[key],rarity:stoneRarity[key],description:language()==="hu"?"Arsenal szintek fejlesztéséhez használható.":"Used to upgrade Arsenal levels.",source:"Worlds · Chests · Shop · Dismantle"});
  for (const slot of ["Weapon","Helmet","Armor","Gloves","Boots","Ring","Necklace"]) push({id:`core:${slot}`,category:"cores",name:`${slot} Core`,count:safeCount(material.slotCores?.[slot]),asset:assets.cores?.[slot],rarity:"Rare",description:language()==="hu"?"Az adott Arsenal slot csillagozásához kell.":"Used to star up the matching Arsenal slot.",source:"Dismantle · Merge · Weekly Reward"});
  const catalog = window.CHERRIFT_V080?.foodCatalog || {};
  for (const [itemId, food] of Object.entries(catalog)) push({id:`buff:${itemId}`,itemId,category:"buffs",name:food.name,count:safeCount(save.bag?.items?.[itemId]),asset:food.asset,rarity:food.rarity||"Common",description:`+${Math.round(Number(food.value||0)*100)}% ${prettyKey(food.effect)} · ${food.runs||0} ${language()==="hu"?"kör":"runs"}`,source:"Shop · Rewards",action:"use"});
  for (const type of ["common","rare","epic","legendary"]) push({id:`chest:${type}`,chestType:type,category:"chests",name:`${type[0].toUpperCase()}${type.slice(1)} Chest`,count:safeCount(save.chests?.[type]),asset:assets.chests?.[type],rarity:type==="common"?"Common":type==="rare"?"Rare":type==="epic"?"Epic":"Legendary",description:language()==="hu"?"Nyisd ki a Gacha oldalon jutalmakért.":"Open it on the Gacha page for rewards.",source:"Stage Clear · Weekly Reward · Shop",action:"gacha"});
  return items;
}

function bagSignature() {
  const save = UI.save || {};
  return JSON.stringify({category:state.bagCategory,selected:state.bagSelected,lang:language(),items:save.bag,essence:save.sakuraEssence,chests:save.chests});
}

function renderBagInventory() {
  const body = id("economyBodyV080");
  if (!body || !q('[data-v080-tab="bag"].active')) return;
  const signature = bagSignature();
  if (body.dataset.v084BagSignature === signature && q(".bag-inventory-v084", body)) return;
  body.dataset.v084BagSignature = signature;
  const all = bagItems();
  const filtered = state.bagCategory === "all" ? all : all.filter(item => item.category === state.bagCategory);
  let selected = all.find(item => item.id === state.bagSelected) || filtered[0] || all[0];
  if (selected && !filtered.some(item => item.id === selected.id)) selected = filtered[0] || selected;
  if (selected) state.bagSelected = selected.id;
  const categories = [["all",t("all")],["enhancement",t("enhancement")],["stones",t("stones")],["cores",t("cores")],["buffs",t("buffs")],["chests",t("chests")]];
  const cards = filtered.length ? filtered.map(item => `<button type="button" class="bag-item-v084 rarity-${String(item.rarity).toLowerCase()} ${item.id===selected?.id?"active":""}" data-v084-bag-item="${escapeHtml(item.id)}">
    <span class="bag-item-art-v084">${image(item.asset,item.name)}</span><small>${escapeHtml(item.rarity)}</small><b>${escapeHtml(item.name)}</b><em>×${item.count}</em>
  </button>`).join("") : `<div class="bag-empty-v084">${escapeHtml(t("noItems"))}</div>`;
  const action = !selected ? "" : selected.action === "use" ? `<button type="button" class="primary" data-v084-bag-use="${escapeHtml(selected.itemId)}" ${selected.count<1?"disabled":""}>${escapeHtml(t("use"))}</button>` : selected.action === "gacha" ? `<button type="button" class="primary" data-v084-bag-gacha="${escapeHtml(selected.chestType)}">${escapeHtml(t("openGacha"))}</button>` : "";
  body.innerHTML = `<section class="bag-inventory-v084">
    <header class="bag-inventory-head-v084"><div><small>CHERRIFT BAG</small><h2>${escapeHtml(t("inventory"))}</h2><p>${escapeHtml(t("inventoryHint"))}</p></div></header>
    <nav class="bag-tabs-v084">${categories.map(([key,label])=>`<button type="button" data-v084-bag-category="${key}" class="${state.bagCategory===key?"active":""}">${escapeHtml(label)}</button>`).join("")}</nav>
    <div class="bag-layout-v084"><div class="bag-grid-v084">${cards}</div>${selected?`<aside class="bag-detail-v084 rarity-${String(selected.rarity).toLowerCase()}">
      <div class="bag-detail-art-v084">${image(selected.asset,selected.name)}</div><small>${escapeHtml(selected.rarity)}</small><h2>${escapeHtml(selected.name)}</h2><strong>${escapeHtml(t("owned"))}: ${selected.count}</strong><p>${escapeHtml(selected.description)}</p>
      <dl><div><dt>${escapeHtml(t("obtainedFrom"))}</dt><dd>${escapeHtml(selected.source)}</dd></div></dl>${action}
    </aside>`:""}</div>
  </section>`;
}

function replacePriceIcon(holder, currency, amount) {
  if (!holder) return;
  const asset = currency === "gem" ? assets.currency?.blossomGems : assets.currency?.coins;
  holder.classList.add("shop-price-v084");
  holder.innerHTML = `${image(asset,currency === "gem" ? "Blossom Gem" : "Coin","shop-price-icon-v084")}<span>${safeCount(amount)}</span>`;
}

function decorateShop() {
  if (!q('[data-v080-tab="shop"].active')) return;
  qa(".shop-card-v080").forEach(card => {
    const type = q("[data-v080-buy-chest]", card)?.dataset.v080BuyChest;
    if (type) card.classList.add(`rarity-${type === "common" ? "common" : type === "rare" ? "rare" : "epic"}`, "shop-rarity-card-v084");
    const price = q(":scope > b", card);
    const text = price?.textContent || "";
    replacePriceIcon(price, /💎/.test(text) ? "gem" : "coin", text.match(/\d+/)?.[0] || 0);
  });
  qa(".food-grid-v080 .food-card-v080").forEach(card => {
    card.classList.add("shop-rarity-card-v084");
    const price = Array.from(card.children).find(child => child.tagName === "B" && /\d/.test(child.textContent || ""));
    const text = price?.textContent || "";
    if (/💎|🪙/.test(text)) replacePriceIcon(price, /💎/.test(text) ? "gem" : "coin", text.match(/\d+/)?.[0] || 0);
  });
}

function ensureCollectionModal() {
  if (id("collectionModalV084")) return;
  const modal = document.createElement("section");
  modal.id = "collectionModalV084";
  modal.className = "collection-modal-v084 hidden";
  modal.innerHTML = '<button type="button" class="collection-modal-backdrop-v084" data-v084-collection-close aria-label="Close"></button><article><button type="button" class="collection-modal-close-v084" data-v084-collection-close>×</button><div id="collectionModalBodyV084"></div></article>';
  document.body.appendChild(modal);
}

function drawSpriteFrame(canvas, source, frames = 4) {
  if (!canvas || !source) return;
  const img = new Image();
  img.onload = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = canvas.clientWidth || 220, height = canvas.clientHeight || 220;
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height); ctx.imageSmoothingEnabled = true;
    const sw = img.naturalWidth / Math.max(1,frames), sh = img.naturalHeight;
    const scale = Math.min(width/sw,height/sh)*.92;
    const dw=sw*scale, dh=sh*scale;
    ctx.drawImage(img,0,0,sw,sh,(width-dw)/2,(height-dh)/2,dw,dh);
  };
  img.src = source;
}

function drawEnemy(canvas, enemy = {}) {
  if (!canvas) return;
  const paintFallback = () => {
    const dpr = Math.min(2, devicePixelRatio || 1), width = canvas.clientWidth || 120, height = canvas.clientHeight || 120;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const color = enemy.color || "#f178a9", cx = width / 2, cy = height * .54;
    const sourceRadius = Math.max(18, Number(enemy.r) || 24);
    const radius = Math.min(width, height) * (enemy.boss ? .31 : .25);
    const scale = radius / sourceRadius;
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(cx, cy, sourceRadius * 1.15 * scale, sourceRadius * .82 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,.78)";
    const eyeRadius = Math.max(2, sourceRadius * .09 * scale);
    ctx.beginPath(); ctx.arc(cx - sourceRadius * .35 * scale, cy - sourceRadius * .16 * scale, eyeRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sourceRadius * .35 * scale, cy - sourceRadius * .16 * scale, eyeRadius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  if (enemy.visualStyle === "slimeSprite" || enemy.visualStyle === "bossSlime") {
    const sprite = new Image();
    sprite.onload = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), width = canvas.clientWidth || 120, height = canvas.clientHeight || 120;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.imageSmoothingEnabled = true;
      const frameWidth = Number(window.CHERRIFT_CONFIG?.slime?.frameWidth) || 384;
      const frameHeight = Number(window.CHERRIFT_CONFIG?.slime?.frameHeight) || 384;
      const size = Math.min(width, height) * (enemy.boss ? .92 : .76);
      ctx.drawImage(sprite, 0, 0, frameWidth, frameHeight, (width - size) / 2, (height - size) / 2, size, size);
    };
    sprite.onerror = paintFallback;
    sprite.src = window.CHERRIFT_CONFIG?.slime?.src || "assets/enemies/slime_sprite_sheet.png";
    return;
  }
  paintFallback();
}

function collectionSignature(tab) {
  const save=UI.save||{};
  return JSON.stringify({tab,lang:language(),skins:save.unlockedSkins,enemies:save.discoveredEnemies,stages:save.clearedStages,stars:save.stageStars,inventory:save.inventory?.length});
}

function renderCollection() {
  const panel=id("libraryV0551"),body=id("libraryBodyV0551");
  if(!panel||!body||!visible(panel))return;
  const tab=q("[data-library-tab].active",panel)?.dataset.libraryTab||state.collectionTab||"skins";
  if(!["skins","enemies","worlds","gear"].includes(tab))return;
  state.collectionTab=tab;
  const signature=collectionSignature(tab);
  if(body.dataset.v084CollectionSignature===signature&&q(".collection-grid-v084",body))return;
  body.dataset.v084CollectionSignature=signature;
  const save=UI.save||{};
  if(tab==="skins"){
    body.innerHTML=`<div class="collection-grid-v084 skins-v084">${(CHERRIFT_DATA.skins||[]).map(skin=>{const unlocked=(save.unlockedSkins||[]).includes(skin.id);return `<button type="button" class="collection-card-v084 rarity-${String(skin.rarity||"Common").toLowerCase()} ${unlocked?"":"locked"}" ${unlocked?`data-v084-skin="${escapeHtml(skin.id)}"`:"disabled"}><span>${unlocked?image(skin.icon,skin.name):"?"}</span><b>${escapeHtml(unlocked?skin.name:t("collectionLocked"))}</b><small>${escapeHtml(unlocked?skin.rarity:t("collectionLocked"))}</small></button>`}).join("")}</div>`;
  }else if(tab==="enemies"){
    const enemies=window.CHERRIFT_V040?.enemies||{};
    body.innerHTML=`<div class="collection-grid-v084 enemies-v084">${Object.entries(enemies).map(([key,enemy])=>{const seen=!!save.discoveredEnemies?.[key];return `<button type="button" class="collection-card-v084 enemy-card-v084 ${seen?"":"locked"}" ${seen?`data-v084-enemy="${escapeHtml(key)}"`:"disabled"}><canvas data-v084-enemy-canvas="${escapeHtml(key)}"></canvas><b>${escapeHtml(seen?enemy.name:t("collectionLocked"))}</b><small>${escapeHtml(seen?`HP ${enemy.hp} · ${t("discovered")}`:t("defeatToDiscover"))}</small></button>`}).join("")}</div>`;
    qa("[data-v084-enemy-canvas]",body).forEach(canvas=>drawEnemy(canvas,enemies[canvas.dataset.v084EnemyCanvas]));
  }else if(tab==="worlds"){
    const worlds=[...new Set((CHERRIFT_V040?.stages||[]).map(stage=>stage.world))];
    body.innerHTML=`<div class="collection-grid-v084 worlds-v084">${worlds.map(world=>{const stages=CHERRIFT_V040.stages.filter(s=>s.world===world),done=stages.filter(s=>save.clearedStages?.[s.id]).length,stars=stages.reduce((sum,s)=>sum+(save.stageStars?.[s.id]||0),0);return `<article class="collection-card-v084 world-card-v084"><span>W${world}</span><b>World ${world}</b><small>${done}/${stages.length} · ${stars}/${stages.length*3} ★</small></article>`}).join("")}</div>`;
  }else{
    const owned=[...(save.inventory||[]),...Object.values(save.equipped||{}).filter(Boolean)];
    body.innerHTML=`<div class="collection-grid-v084 gear-v084">${owned.map(item=>`<article class="collection-card-v084 rarity-${String(item.rarity||"Common").toLowerCase()}"><span>${UI.gearEmoji?.(item)||""}</span><b>${escapeHtml(`${item.rarity} ${item.slot}`)}</b><small>Lv.${item.itemLevel||1}</small></article>`).join("")||`<div class="bag-empty-v084">${escapeHtml(t("noItems"))}</div>`}</div>`;
  }
}

function openSkinDetail(skinId) {
  const skin=CHERRIFT_DATA.skins.find(entry=>entry.id===skinId);if(!skin)return;
  ensureCollectionModal();
  const config=CHERRIFT_CONFIG.player.skins?.[skinId];
  const idle=config?.states?.idle?.dirs?.down;const frames=config?.states?.idle?.frames||4;
  id("collectionModalBodyV084").innerHTML=`<section class="collection-detail-v084 rarity-${String(skin.rarity||"Common").toLowerCase()}"><header><small>${escapeHtml(skin.rarity||"Common")}</small><h2>${escapeHtml(skin.name)}</h2></header><div class="skin-detail-grid-v084"><figure><figcaption>${escapeHtml(t("splash"))}</figcaption>${image(skin.splash,skin.name,"skin-splash-v084")}</figure><figure><figcaption>${escapeHtml(t("idlePreview"))}</figcaption><canvas id="skinIdleCanvasV084"></canvas></figure></div></section>`;
  id("collectionModalV084").classList.remove("hidden");drawSpriteFrame(id("skinIdleCanvasV084"),idle,frames);
}

function openEnemyDetail(enemyId) {
  const enemy=window.CHERRIFT_V040?.enemies?.[enemyId];if(!enemy)return;
  ensureCollectionModal();
  const attack=enemy.damage??enemy.atk??enemy.contactDamage??"—";
  id("collectionModalBodyV084").innerHTML=`<section class="collection-detail-v084 enemy-detail-v084"><header><small>${escapeHtml(t("discovered"))}</small><h2>${escapeHtml(enemy.name)}</h2></header><div class="enemy-detail-grid-v084"><canvas id="enemyDetailCanvasV084"></canvas><div><h3>${escapeHtml(t("stats"))}</h3><dl><div><dt>HP</dt><dd>${escapeHtml(enemy.hp)}</dd></div><div><dt>ATK</dt><dd>${escapeHtml(attack)}</dd></div><div><dt>Speed</dt><dd>${escapeHtml(enemy.speed)}</dd></div><div><dt>XP</dt><dd>${escapeHtml(enemy.xp||0)}</dd></div></dl></div></div></section>`;
  id("collectionModalV084").classList.remove("hidden");drawEnemy(id("enemyDetailCanvasV084"),enemy);
}

function closeCollectionModal(){id("collectionModalV084")?.classList.add("hidden");}

function mountResourceBar() {
  const bar=id("resourceBarV082"),tools=id("menuToolsV082");if(!bar)return;
  if(isMobile()){
    if(bar.parentElement!==document.body)document.body.appendChild(bar);
    if(tools&&tools.parentElement!==id("menu"))id("menu")?.appendChild(tools);
    bar.classList.remove("resource-inline-v084","resource-hidden-v084");return;
  }
  const menu=id("menu");
  if(visible(menu)){
    const right=q(".menu-right",menu);if(!right)return;
    let dock=id("menuDockV084");if(!dock){dock=document.createElement("div");dock.id="menuDockV084";dock.className="menu-dock-v084";right.prepend(dock);}
    if(tools)dock.appendChild(tools);dock.appendChild(bar);bar.classList.add("resource-inline-v084");bar.classList.remove("resource-hidden-v084");return;
  }
  if(visible(id("arsenalV070"))){bar.classList.add("resource-hidden-v084");return;}
  bar.classList.remove("resource-hidden-v084");
  const panels=[...qa("#app > .panel"),id("chests"),id("libraryV0551")].filter(visible);
  const panel=panels[0];const header=panel&&q(".panel-head,.economy-head-v080,.gear-header-v0560",panel);
  if(header){header.appendChild(bar);header.classList.add("header-resources-v084");bar.classList.add("resource-inline-v084");}
  q(".economy-wallet-v080",panel)?.classList.add("economy-wallet-hidden-v084");
}

function decorateSupport() {
  const panel=id("supportV063"),body=id("supportBodyV063");if(!panel||!body||!visible(panel))return;
  const bug=!!q('[data-v063-support-type="bug"].active',body);
  const primary=q("footer .primary",body);
  if(primary){primary.removeAttribute("data-v063-open-issue");primary.dataset.v084SubmitReport=bug?"bug":"feedback";primary.textContent=bug?t("sendBug"):t("sendFeedback");}
  if(!bug)return;
  const steps=q('[data-v063-field="steps"]',body),expected=q('[data-v063-field="expected"]',body)?.closest("label"),actual=q('[data-v063-field="actual"]',body)?.closest("label");
  if(steps){const label=steps.closest("label");const span=q("span",label);if(span)span.textContent=t("bugDescription");steps.rows=8;steps.placeholder=t("bugDescriptionHint");}
  if(expected)expected.hidden=true;if(actual)actual.hidden=true;
  const severity=q('[data-v063-field="severity"]',body);if(severity)Array.from(severity.options).forEach(option=>{if(COPY[language()][option.value])option.textContent=t(option.value);});
  if(!id("reportAttachmentsV084")){
    const details=q(".support-diagnostics-v063",body);const block=document.createElement("section");block.id="reportAttachmentsV084";block.className="report-attachments-v084";
    block.innerHTML=`<label><span>${escapeHtml(t("attachments"))}</span><small>${escapeHtml(t("attachmentHint"))}</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple data-v084-report-files></label><div id="reportFilePreviewV084"></div>`;
    details?.insertAdjacentElement("beforebegin",block);
  }
}

function renderReportFiles() {
  const holder=id("reportFilePreviewV084");if(!holder)return;
  holder.innerHTML=state.reportFiles.map((file,index)=>`<div><span>${escapeHtml(file.name)}</span><small>${Math.ceil(file.size/1024)} KB</small><button type="button" data-v084-remove-report-file="${index}">×</button></div>`).join("");
}

async function copyText(text){try{await navigator.clipboard.writeText(text);}catch(_){const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}}

async function submitReport(type,button) {
  const body=id("supportBodyV063");if(!body)return;
  const title=q('[data-v063-field="title"]',body)?.value.trim()||"";
  const message=(type==="bug"?q('[data-v063-field="steps"]',body):q('[data-v063-field="message"]',body))?.value.trim()||"";
  if(!title||!message){UI.toast?.(t("reportMissing"));return;}
  const area=(type==="bug"?q('[data-v063-field="area"]',body):q('[data-v063-field="category"]',body))?.value||"other";
  const severity=q('[data-v063-field="severity"]',body)?.value||"medium";
  const auth=window.CHERRIFT_AUTH?.getState?.()||{};
  const diagnostics={version:DISPLAY_VERSION,build:VERSION,language:language(),viewport:`${innerWidth}×${innerHeight} @${devicePixelRatio||1}x`,selectedStage:UI.save?.selectedStageId||"unknown",selectedSkin:UI.save?.selectedSkin||"unknown",saveSchema:UI.save?.schemaVersion||0,userAgent:navigator.userAgent};
  const plain=`[${type.toUpperCase()}] ${title}\n\n${message}\n\nArea: ${area}\nSeverity: ${severity}\nDiagnostics: ${JSON.stringify(diagnostics,null,2)}`;
  const config=window.CHERRIFT_SUPABASE_CONFIG||{};
  if(!config.url||!config.publishableKey){await copyText(plain);UI.toast?.(t("reportSetup"));return;}
  const original=button.textContent;button.disabled=true;button.textContent=t("sending");
  try{
    const form=new FormData();form.append("type",type);form.append("title",title);form.append("message",message);form.append("area",area);form.append("severity",severity);form.append("diagnostics",JSON.stringify(diagnostics));form.append("reporter",JSON.stringify(auth.account||{mode:auth.mode||"guest"}));
    state.reportFiles.forEach((file,index)=>form.append(`file${index}`,file,file.name));
    const response=await fetch(`${config.url.replace(/\/$/,"")}/functions/v1/submit-report`,{method:"POST",headers:{apikey:config.publishableKey,Authorization:`Bearer ${config.publishableKey}`},body:form});
    if(!response.ok)throw new Error((await response.text())||`HTTP ${response.status}`);
    state.reportFiles=[];renderReportFiles();UI.toast?.(t("reportSent"));
  }catch(error){console.warn("[CHERRIFT v0.8.4] Discord report failed:",error);await copyText(plain);UI.toast?.(t("reportCopied"));}
  finally{button.disabled=false;button.textContent=original;}
}

function refreshAll() {
  decorateArsenal();decorateSkillTree();decorateStatSummary();renderBagInventory();decorateShop();renderCollection();mountResourceBar();decorateSupport();patchVersion();
}
function scheduleRefresh(){if(state.decorateQueued)return;state.decorateQueued=true;requestAnimationFrame(()=>{state.decorateQueued=false;refreshAll();});}
function installObserver(){if(state.observer||!document.body)return;state.observer=new MutationObserver(scheduleRefresh);state.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});}

function bindEvents() {
  if(document.documentElement.dataset.v084Events)return;document.documentElement.dataset.v084Events="1";
  document.addEventListener("click",event=>{
    const settings=event.target.closest?.('[data-v082-open="settings"],.rail-settings-v060,[data-v060-open="settings"]');
    if(settings){event.preventDefault();UI.open("settings");requestAnimationFrame(()=>forcePanel("settings"));return;}
    const weeklyBack=event.target.closest?.('#weeklyV082 [data-v082-open="menu"],#weeklyV082 .back');
    if(weeklyBack){event.preventDefault();hideCustomPanelsExcept();UI.open("menu");requestAnimationFrame(()=>id("menu")?.classList.remove("hidden"));return;}
    const scroll=event.target.closest?.("[data-v084-skill-scroll]");if(scroll){id("skillTreeScrollV082")?.scrollBy({left:Number(scroll.dataset.v084SkillScroll)*520,behavior:"smooth"});return;}
    const category=event.target.closest?.("[data-v084-bag-category]");if(category){state.bagCategory=category.dataset.v084BagCategory;renderBagInventory();return;}
    const item=event.target.closest?.("[data-v084-bag-item]");if(item){state.bagSelected=item.dataset.v084BagItem;renderBagInventory();return;}
    const use=event.target.closest?.("[data-v084-bag-use]");if(use){window.CHERRIFT_V080?.activateFood?.(use.dataset.v084BagUse);requestAnimationFrame(renderBagInventory);return;}
    const gacha=event.target.closest?.("[data-v084-bag-gacha]");if(gacha){UI.open("gachaV082");return;}
    const skin=event.target.closest?.("[data-v084-skin]");if(skin){openSkinDetail(skin.dataset.v084Skin);return;}
    const enemy=event.target.closest?.("[data-v084-enemy]");if(enemy){openEnemyDetail(enemy.dataset.v084Enemy);return;}
    if(event.target.closest?.("[data-v084-collection-close]")){closeCollectionModal();return;}
    const remove=event.target.closest?.("[data-v084-remove-report-file]");if(remove){state.reportFiles.splice(Number(remove.dataset.v084RemoveReportFile),1);renderReportFiles();return;}
    const submit=event.target.closest?.("[data-v084-submit-report]");if(submit){event.preventDefault();submitReport(submit.dataset.v084SubmitReport,submit);return;}
    if(event.target.closest?.("[data-library-tab]"))setTimeout(renderCollection,0);
  },true);
  document.addEventListener("change",event=>{
    const input=event.target.closest?.("[data-v084-report-files]");if(!input)return;
    const files=Array.from(input.files||[]).filter(file=>/^image\/(png|jpeg|webp)$/.test(file.type)&&file.size<=6*1024*1024).slice(0,3);
    state.reportFiles=files;renderReportFiles();input.value="";
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!id("collectionModalV084")?.classList.contains("hidden"))closeCollectionModal();});
  window.addEventListener("resize",scheduleRefresh);
  window.addEventListener("cherrift:languagechange",scheduleRefresh);
}

ensureCss();patchNavigation();bindEvents();installObserver();ensureCollectionModal();patchVersion();scheduleRefresh();
window.CHERRIFT_V084={version:VERSION,displayVersion:DISPLAY_VERSION,refresh:refreshAll,renderBag:renderBagInventory,renderCollection,submitReport};
console.info("[CHERRIFT] v0.8.4 UI polish, inventory, collection and navigation fixes loaded.");
})();
