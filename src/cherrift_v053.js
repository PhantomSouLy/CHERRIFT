(() => {
  "use strict";

  const VERSION = "0.5.3-mobile-navigation-gear-fix";
  const id = name => document.getElementById(name);
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isMobile = () => matchMedia("(max-width:820px)").matches;

  if (!window.UI || !window.CherriftStorage || !window.CHERRIFT_V052) {
    console.error("[CHERRIFT v0.5.3] v0.5.2 is required.");
    return;
  }

  const TREE = CHERRIFT_V052.TREE;
  const ACH = CHERRIFT_V052.ACH;
  const levelCost = CHERRIFT_V052.levelCost;

  function ensureCss() {
    if (id("v053css")) return;
    const link = document.createElement("link");
    link.id = "v053css";
    link.rel = "stylesheet";
    link.href = "v053.css?v=053";
    document.head.appendChild(link);
  }

  function normalize(save) {
    save.account = save.account || {};
    save.account.level = Math.max(1, Number(save.account.level) || 1);
    save.account.xp = Math.max(0, Number(save.account.xp) || 0);
    save.account.skillPoints = Math.max(0, Number(save.account.skillPoints) || 0);
    save.account.tree = { power:0, vitality:0, haste:0, fortune:0, ...(save.account.tree || {}) };
    save.account.xpNext = levelCost(save.account.level);
    save.achievements = save.achievements || {};
    save.achievementClaims = save.achievementClaims || {};
    return save;
  }

  function rewardText(reward) {
    return [reward?.coins ? `${reward.coins} coins` : "", reward?.keys ? `${reward.keys} keys` : ""].filter(Boolean).join(" · ");
  }

  function refreshUpgradePanel() {
    const save = normalize(UI.save);
    const account = save.account;
    const cost = levelCost(account.level);
    if (id("v052Level")) id("v052Level").textContent = account.level;
    if (id("v052XpFill")) id("v052XpFill").style.width = `${Math.min(100, account.xp / cost * 100)}%`;
    if (id("v052XpText")) id("v052XpText").textContent = `${Math.floor(account.xp)} / ${cost} XP`;
    if (id("v052PointText")) id("v052PointText").textContent = `${account.skillPoints} skill point${account.skillPoints === 1 ? "" : "s"} available`;
    const levelButton = id("v052LevelUp");
    if (levelButton) {
      levelButton.disabled = account.xp < cost;
      levelButton.textContent = account.xp >= cost ? "LEVEL UP" : "MORE XP NEEDED";
    }
    const tree = id("v052Tree");
    if (!tree) return;
    tree.innerHTML = Object.entries(TREE).map(([key, node]) => {
      const rank = Number(account.tree[key]) || 0;
      const disabled = account.skillPoints < 1 || rank >= node.max;
      return `<article class="v052-node ${rank >= node.max ? "max" : ""}"><span>${node.icon}</span><div><h4>${node.name}</h4><p>${node.desc}</p><small>Rank ${rank}/${node.max}</small></div><button type="button" data-v053-node="${key}" ${disabled ? "disabled" : ""}>+</button></article>`;
    }).join("");
  }

  function refreshAchievementPanel() {
    const save = normalize(UI.save);
    const container = id("v052Achievements");
    if (!container) return;
    container.innerHTML = ACH.map(achievement => {
      const unlocked = !!save.achievements[achievement.id];
      const claimed = !!save.achievementClaims[achievement.id];
      return `<article class="glass v052-achievement ${unlocked ? "unlocked" : "locked"}"><span>${achievement.icon}</span><div><h3>${achievement.name}</h3><p>${achievement.desc}</p><small>${rewardText(achievement.reward)}</small></div><button type="button" data-v053-achievement="${achievement.id}" ${!unlocked || claimed ? "disabled" : ""}>${claimed ? "CLAIMED" : unlocked ? "CLAIM" : "LOCKED"}</button></article>`;
    }).join("");
  }

  function manualLevelUp() {
    const save = normalize(UI.save);
    const account = save.account;
    const cost = levelCost(account.level);
    if (account.xp < cost) return;
    account.xp -= cost;
    account.level += 1;
    account.skillPoints += 1;
    account.xpNext = levelCost(account.level);
    CherriftStorage.save(save);
    refreshUpgradePanel();
    UI.refreshMenu?.();
    UI.toast?.(`Player Level ${account.level}! +1 skill point`);
  }

  function spendSkillPoint(key) {
    const save = normalize(UI.save);
    const account = save.account;
    const node = TREE[key];
    if (!node || account.skillPoints < 1 || (account.tree[key] || 0) >= node.max) return;
    account.skillPoints -= 1;
    account.tree[key] = (account.tree[key] || 0) + 1;
    CherriftStorage.save(save);
    refreshUpgradePanel();
    UI.refreshMenu?.();
    UI.toast?.(`${node.name} Rank ${account.tree[key]}`);
  }

  function claimAchievement(achievementId) {
    const save = normalize(UI.save);
    const achievement = ACH.find(entry => entry.id === achievementId);
    if (!achievement || !save.achievements[achievementId] || save.achievementClaims[achievementId]) return;
    save.coins += achievement.reward?.coins || 0;
    save.keys += achievement.reward?.keys || 0;
    save.achievementClaims[achievementId] = true;
    CherriftStorage.save(save);
    refreshAchievementPanel();
    UI.refreshMenu?.();
    UI.toast?.(`Claimed: ${rewardText(achievement.reward)}`);
  }

  function closeEveryPanel() {
    ["menu","skins","gear","chests","settings","worlds","playerUpgrade","achievements"].forEach(name => id(name)?.classList.add("hidden"));
  }

  const previousOpen = UI.open.bind(UI);
  UI.open = function openV053(panel, ...args) {
    closeEveryPanel();
    if (panel === "playerUpgrade" || panel === "achievements") {
      document.body.classList.remove("is-playing", "is-levelup", "is-loading-stage");
      id(panel)?.classList.remove("hidden");
      ["hud","skill","stageHud","levelModal","pauseModal","stageClearModal"].forEach(name => id(name)?.classList.add("hidden"));
      if (panel === "playerUpgrade") refreshUpgradePanel();
      if (panel === "achievements") refreshAchievementPanel();
    } else {
      previousOpen(panel, ...args);
      id("playerUpgrade")?.classList.add("hidden");
      id("achievements")?.classList.add("hidden");
    }
    const nav = id("globalMobileNavV052");
    if (nav) nav.dataset.active = panel;
    if (panel === "gear") renderMobileGear();
  };

  document.addEventListener("click", event => {
    const navButton = event.target.closest("[data-v052-open]");
    if (navButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      UI.open(navButton.dataset.v052Open);
      return;
    }
    const levelButton = event.target.closest("#v052LevelUp");
    if (levelButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      manualLevelUp();
      return;
    }
    const nodeButton = event.target.closest("[data-v053-node], [data-node]");
    if (nodeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      spendSkillPoint(nodeButton.dataset.v053Node || nodeButton.dataset.node);
      return;
    }
    const achievementButton = event.target.closest("[data-v053-achievement], [data-ach]");
    if (achievementButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      claimAchievement(achievementButton.dataset.v053Achievement || achievementButton.dataset.ach);
    }
  }, true);

  function gearEmoji(item) { return item ? UI.gearEmoji?.(item) || "⚙️" : "＋"; }
  function itemPower(item) { return window.CHERRIFT_V050?.itemPower ? CHERRIFT_V050.itemPower(item) : Math.round(Object.values(item?.stats || {}).reduce((sum, value) => sum + Number(value || 0), 0)); }
  function rarityClass(item) { return `rarity-${String(item?.rarity || "Common").toLowerCase()}`; }

  function ensureMobileGear() {
    const panel = id("gear");
    if (!panel || id("mobileGearV053")) return;
    const mobileGear = document.createElement("div");
    mobileGear.id = "mobileGearV053";
    mobileGear.className = "mobile-gear-v053";
    mobileGear.innerHTML = `<section class="mobile-gear-top-v053"><div class="mobile-gear-profile-v053"><div><small>PLAYER LEVEL</small><b id="mobileGearLevelV053">1</b></div><div><small>TOTAL POWER</small><b id="mobileGearPowerV053">0</b></div></div><div class="mobile-loadout-v053"><div class="mobile-slot-column-v053 left"><button data-mobile-slot="Weapon"></button><button data-mobile-slot="Gloves"></button><button data-mobile-slot="Ring"></button></div><div class="mobile-hero-v053"><div class="mobile-hero-glow-v053"></div><div id="mobileGearHeroV053" class="mobile-hero-icon-v053">🐰</div><button type="button" data-v052-open="skins">CHANGE CHERRY</button></div><div class="mobile-slot-column-v053 right"><button data-mobile-slot="Armor"></button><button data-mobile-slot="Helmet"></button><button data-mobile-slot="Boots"></button></div><button class="mobile-necklace-slot-v053" data-mobile-slot="Necklace"></button></div><div class="mobile-combat-stats-v053"><div><span>⚔️ ATK</span><b id="mobileGearAtkV053">0</b></div><div><span>❤️ HP</span><b id="mobileGearHpV053">0</b></div></div></section><section class="mobile-collection-v053"><header><button type="button" id="mobileGearSortV053">BY POWER</button><h3>MY COLLECTION</h3><span id="mobileGearCountV053">0/80</span></header><div id="mobileGearInventoryV053" class="mobile-gear-grid-v053"></div></section><section id="mobileGearSheetV053" class="mobile-gear-sheet-v053 hidden"><button type="button" class="mobile-sheet-close-v053">×</button><div id="mobileGearSheetContentV053"></div></section>`;
    panel.appendChild(mobileGear);
    q(".mobile-sheet-close-v053", mobileGear).onclick = () => id("mobileGearSheetV053")?.classList.add("hidden");
    id("mobileGearSortV053").onclick = () => {
      const button = id("mobileGearSortV053");
      button.dataset.sort = button.dataset.sort === "rarity" ? "power" : "rarity";
      button.textContent = button.dataset.sort === "rarity" ? "BY QUALITY" : "BY POWER";
      renderMobileGear();
    };
  }

  function showMobileGearDetails(item, source) {
    const sheet = id("mobileGearSheetV053");
    const content = id("mobileGearSheetContentV053");
    if (!sheet || !content || !item) return;
    const equipped = UI.save.equipped?.[item.slot];
    const stats = Object.entries(item.stats || {}).map(([key, value]) => `<div class="mobile-sheet-stat-v053"><span>${key}</span><b>+${value}</b></div>`).join("");
    const compare = source === "inventory" && equipped && equipped.id !== item.id ? Object.keys({ ...(item.stats || {}), ...(equipped.stats || {}) }).map(key => { const delta = (item.stats?.[key] || 0) - (equipped.stats?.[key] || 0); return `<div class="mobile-sheet-stat-v053"><span>${key}</span><b class="${delta > 0 ? "good" : delta < 0 ? "bad" : ""}">${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}</b></div>`; }).join("") : "";
    content.innerHTML = `<div class="mobile-sheet-title-v053"><div class="${rarityClass(item)}">${gearEmoji(item)}</div><div><h3>${item.rarity} ${item.type} ${item.slot}</h3><p>Lv.${item.itemLevel || 1} · Power ${itemPower(item)}</p></div></div><div class="mobile-sheet-stats-v053">${stats}</div>${compare ? `<h4>Compared to equipped</h4><div class="mobile-sheet-stats-v053">${compare}</div>` : ""}<div class="mobile-sheet-actions-v053">${source === "inventory" ? `<button type="button" data-mobile-action="equip">EQUIP</button>` : `<button type="button" data-mobile-action="unequip">UNEQUIP</button>`}${source === "inventory" ? `<button type="button" data-mobile-action="sell" ${item.locked ? "disabled" : ""}>SELL</button>` : ""}<button type="button" data-mobile-action="lock">${item.locked ? "UNLOCK" : "LOCK"}</button></div>`;
    qa("[data-mobile-action]", content).forEach(button => {
      button.onclick = () => {
        const action = button.dataset.mobileAction;
        if (action === "equip") UI.equipGear(item.id);
        if (action === "unequip") UI.unequipGear(item.slot);
        if (action === "sell") UI.sellGear(item.id);
        if (action === "lock") UI.toggleGearLockV050?.(item.id);
        sheet.classList.add("hidden");
        setTimeout(renderMobileGear, 0);
      };
    });
    sheet.classList.remove("hidden");
  }

  function renderMobileGear() {
    if (!isMobile()) return;
    ensureMobileGear();
    const save = UI.save;
    if (!save) return;
    const skin = CHERRIFT_DATA.skins.find(entry => entry.id === save.selectedSkin) || CHERRIFT_DATA.skins[0];
    const stats = UI.totalGearStats(save);
    const power = Object.values(save.equipped || {}).reduce((sum, item) => sum + itemPower(item), 100);
    if (id("mobileGearHeroV053")) id("mobileGearHeroV053").textContent = skin?.emoji || "🐰";
    if (id("mobileGearLevelV053")) id("mobileGearLevelV053").textContent = save.account?.level || 1;
    if (id("mobileGearPowerV053")) id("mobileGearPowerV053").textContent = Math.round(power);
    if (id("mobileGearAtkV053")) id("mobileGearAtkV053").textContent = Math.round(20 + (stats.damage || 0));
    if (id("mobileGearHpV053")) id("mobileGearHpV053").textContent = Math.round(100 + (stats.maxHp || 0));
    qa("[data-mobile-slot]").forEach(button => {
      const slot = button.dataset.mobileSlot;
      const item = save.equipped?.[slot];
      button.className = `mobile-gear-slot-v053 ${item ? rarityClass(item) : "empty"}`;
      button.innerHTML = item ? `<span>${gearEmoji(item)}</span><small>Lv.${item.itemLevel || 1}</small>` : `<span>＋</span><small>${slot}</small>`;
      button.onclick = () => { if (item) showMobileGearDetails(item, "equipped"); };
    });
    let inventory = [...(save.inventory || [])];
    const sort = id("mobileGearSortV053")?.dataset.sort || "power";
    const rarityOrder = { Common:0, Uncommon:1, Rare:2, Epic:3, Legendary:4 };
    inventory.sort((a, b) => sort === "rarity" ? (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0) || itemPower(b) - itemPower(a) : itemPower(b) - itemPower(a));
    if (id("mobileGearCountV053")) id("mobileGearCountV053").textContent = `${inventory.length}/80`;
    const grid = id("mobileGearInventoryV053");
    if (grid) {
      grid.innerHTML = inventory.map(item => `<button type="button" data-mobile-item="${item.id}" class="mobile-gear-item-v053 ${rarityClass(item)}">${item.locked ? '<i>🔒</i>' : ""}<span>${gearEmoji(item)}</span><b>Lv.${item.itemLevel || 1}</b><small>${itemPower(item)}</small></button>`).join("");
      qa("[data-mobile-item]", grid).forEach(button => button.onclick = () => { const item = save.inventory.find(entry => entry.id === button.dataset.mobileItem); if (item) showMobileGearDetails(item, "inventory"); });
    }
  }

  ensureCss();
  ensureMobileGear();
  const previousRenderGear = UI.renderGear.bind(UI);
  UI.renderGear = function renderGearV053(...args) { const result = previousRenderGear(...args); renderMobileGear(); return result; };
  const previousShowGame = UI.showGame?.bind(UI);
  if (previousShowGame) UI.showGame = function showGameV053(...args) { id("globalMobileNavV052")?.classList.add("force-hidden-v053"); return previousShowGame(...args); };
  const previousQuit = UI.quit?.bind(UI);
  if (previousQuit) UI.quit = function quitV053(...args) { id("globalMobileNavV052")?.classList.remove("force-hidden-v053"); return previousQuit(...args); };
  const observer = new MutationObserver(() => {
    const nav = id("globalMobileNavV052");
    if (!nav) return;
    const shouldHide = document.body.classList.contains("is-playing") || document.body.classList.contains("is-levelup") || document.body.classList.contains("is-loading-stage") || !id("levelModal")?.classList.contains("hidden") || !id("stageClearModal")?.classList.contains("hidden");
    nav.classList.toggle("force-hidden-v053", shouldHide);
  });
  observer.observe(document.body, { attributes:true, attributeFilter:["class"] });
  window.addEventListener("resize", () => { if (isMobile() && !id("gear")?.classList.contains("hidden")) renderMobileGear(); });
  window.CHERRIFT_V053 = { version:VERSION, renderMobileGear };
  console.info("[CHERRIFT v0.5.3] Mobile navigation and Archero gear fixes loaded.");
})();
