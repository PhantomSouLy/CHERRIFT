(() => {
  "use strict";
  if (window.__CHERRIFT_ECONOMY_CHEST_ONLY__) return;
  window.__CHERRIFT_ECONOMY_CHEST_ONLY__ = true;

  const VERSION = "1.2.0-chest-only";
  const TIERS = ["common", "rare", "epic"];
  const DEF = {
    common: { name: "Common Chest", itemText: "Common Items", pity: 10, rarity: "Common", asset: "assets/items/chests/common_chest.png" },
    rare: { name: "Rare Chest", itemText: "Common / Rare Items", pity: 15, rarity: "Rare", asset: "assets/items/chests/rare_chest.png" },
    epic: { name: "Epic Chest", itemText: "Rare / Epic Items", pity: 25, rarity: "Epic", asset: "assets/items/chests/epic_chest.png" }
  };
  const state = { tier: "common", busy: false, dragStart: null, originalOpen: null };
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  function normalize(save) {
    if (!save || typeof save !== "object") save = {};
    save.coins = number(save.coins);
    save.blossomGems = number(save.blossomGems);
    save.sakuraEssence = number(save.sakuraEssence);
    save.chests = save.chests && typeof save.chests === "object" ? save.chests : {};
    for (const tier of ["common", "rare", "epic", "legendary"]) save.chests[tier] = number(save.chests[tier]);
    save.gacha = save.gacha && typeof save.gacha === "object" ? save.gacha : {};
    save.gacha.pity = save.gacha.pity && typeof save.gacha.pity === "object" ? save.gacha.pity : {};
    for (const tier of ["common", "rare", "epic", "legendary"]) save.gacha.pity[tier] = number(save.gacha.pity[tier]);
    save.economy = save.economy && typeof save.economy === "object" ? save.economy : {};
    save.economy.totalChestOpens = number(save.economy.totalChestOpens);
    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
    save.resourceWallet = save.resourceWallet && typeof save.resourceWallet === "object" ? save.resourceWallet : {};
    save.resourceWallet.keys = save.resourceWallet.keys && typeof save.resourceWallet.keys === "object" ? save.resourceWallet.keys : {};

    if (!save.economy.chestOnlyMigrationV1) {
      save.chests.common += number(save.keys);
      save.chests.rare += number(save.resourceWallet.keys.rare);
      save.chests.epic += number(save.resourceWallet.keys.epic);
      save.chests.legendary += number(save.resourceWallet.keys.legendary);
      save.keys = 0;
      save.resourceWallet.keys.common = 0;
      save.resourceWallet.keys.rare = 0;
      save.resourceWallet.keys.epic = 0;
      save.resourceWallet.keys.legendary = 0;
      save.economy.chestOnlyMigrationV1 = true;
    }
    return save;
  }

  function saveProgress(save) {
    normalize(save);
    try { window.CherriftStorage?.save?.(save); } catch (error) { console.warn("[CHERRIFT Gacha] save failed", error); }
    window.UI?.refreshMenu?.();
    render();
    window.dispatchEvent(new CustomEvent("cherrift:economychange"));
  }

  function currentWorld(save) {
    return Math.max(1, ...Object.keys(save.clearedStages || {}).map(key => Number(key.match(/world_(\d+)/)?.[1]) || 1));
  }

  function skinPool(rarity) {
    const source = Array.isArray(window.CHERRIFT_DATA?.skins) ? window.CHERRIFT_DATA.skins : [];
    return source.filter(skin => String(skin.rarity || "Common").toLowerCase() === String(rarity).toLowerCase());
  }

  function grantSkin(save, rarity) {
    const exactPool = skinPool(rarity);
    const allSkins = Array.isArray(window.CHERRIFT_DATA?.skins) ? window.CHERRIFT_DATA.skins : [];
    const pool = exactPool.length ? exactPool : allSkins;
    const skin = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    if (!skin) {
      const amount = { Common: 5, Rare: 15, Epic: 40 }[rarity] || 5;
      save.sakuraEssence += amount;
      return { kind: "essence", rarity, amount, label: `${amount} Sakura Essence`, icon: "🌸" };
    }
    const duplicate = save.unlockedSkins.includes(skin.id);
    if (!duplicate) save.unlockedSkins.push(skin.id);
    if (duplicate) {
      const amount = { Common: 5, Rare: 15, Epic: 40 }[rarity] || 5;
      save.sakuraEssence += amount;
      return { kind: "skin", duplicate: true, rarity, amount, skinId: skin.id, label: `${skin.name} · Duplicate +${amount} Essence`, icon: skin.icon || skin.emoji || "🐰", asset: skin.splash || skin.icon || "" };
    }
    return { kind: "skin", duplicate: false, rarity, skinId: skin.id, label: skin.name || skin.id, icon: skin.icon || skin.emoji || "🐰", asset: skin.splash || skin.icon || "" };
  }

  function grantGear(save, rarity) {
    const create = window.CHERRIFT_V050?.createGear;
    if (typeof create !== "function") {
      const amount = { Common: 30, Rare: 90, Epic: 240 }[rarity] || 30;
      save.coins += amount;
      return { kind: "coins", rarity, amount, label: `${amount} Coin`, icon: "🪙" };
    }
    const item = create(currentWorld(save), rarity);
    window.CHERRIFT_V070?.syncItemToArsenal?.(item, save);
    if (save.inventory.length >= 80) {
      const amount = window.CHERRIFT_V050?.sellValue?.(item) || { Common: 20, Rare: 60, Epic: 180 }[rarity] || 20;
      save.coins += amount;
      return { kind: "coins", rarity, amount, label: `Inventory full · ${amount} Coin`, icon: "🪙" };
    }
    save.inventory.push(item);
    return { kind: "gear", rarity, item, amount: 1, label: `${rarity} ${item.type || ""} ${item.slot || "Gear"}`.trim(), icon: window.UI?.gearEmoji?.(item) || "⚔️", asset: item.asset || "" };
  }

  function roll(save, tier) {
    const def = DEF[tier];
    save.gacha.pity[tier] = number(save.gacha.pity[tier]) + 1;
    const guaranteed = save.gacha.pity[tier] >= def.pity;
    if (guaranteed) {
      save.gacha.pity[tier] = 0;
      return grantSkin(save, def.rarity);
    }
    const random = Math.random();
    if (tier === "common") {
      if (random < .87) return grantGear(save, "Common");
      if (random < .975) return grantSkin(save, "Common");
      if (random < .995) return grantGear(save, "Rare");
      return grantSkin(save, "Rare");
    }
    if (tier === "rare") {
      if (random < .32) return grantGear(save, "Common");
      if (random < .81) return grantGear(save, "Rare");
      if (random < .91) return grantSkin(save, "Common");
      if (random < .985) return grantSkin(save, "Rare");
      return grantGear(save, "Epic");
    }
    if (random < .45) return grantGear(save, "Rare");
    if (random < .79) return grantGear(save, "Epic");
    if (random < .90) return grantSkin(save, "Rare");
    return grantSkin(save, "Epic");
  }

  function resourcePath(resourceId) {
    const aliases = {
      "key.common": "chest.common", "key.rare": "chest.rare", "key.epic": "chest.epic", "key.legendary": "chest.legendary"
    };
    const id = aliases[resourceId] || resourceId;
    const paths = {
      "currency.coins": ["coins"],
      "currency.blossom_gems": ["blossomGems"],
      "currency.sakura_essence": ["sakuraEssence"],
      "chest.common": ["chests", "common"],
      "chest.rare": ["chests", "rare"],
      "chest.epic": ["chests", "epic"],
      "chest.legendary": ["chests", "legendary"],
      "material.copper": ["arsenal", "materials", "copper"],
      "material.iron": ["arsenal", "materials", "iron"],
      "material.steel": ["arsenal", "materials", "steel"],
      "material.silver": ["arsenal", "materials", "silver"],
      "material.royal": ["arsenal", "materials", "royal"],
      "material.magical": ["arsenal", "materials", "magical"]
    };
    if (paths[id]) return paths[id];
    if (id.startsWith("bag.")) return ["bag", "items", id.slice(4)];
    return null;
  }

  function addAtPath(save, path, amount) {
    let target = save;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    }
    const key = path[path.length - 1];
    target[key] = number(target[key]) + number(amount);
  }

  function applyReward(save, reward) {
    save = normalize(save);
    if (!reward || typeof reward !== "object") return save;
    const resources = { ...(reward.resources || {}) };
    if (reward.coins) resources["currency.coins"] = number(resources["currency.coins"]) + number(reward.coins);
    if (reward.keys) resources["chest.common"] = number(resources["chest.common"]) + number(reward.keys);
    for (const [resourceId, amount] of Object.entries(resources)) {
      const path = resourcePath(resourceId);
      if (path && number(amount) > 0) addAtPath(save, path, amount);
    }
    if (Array.isArray(reward.skins)) for (const skinId of reward.skins) if (skinId && !save.unlockedSkins.includes(skinId)) save.unlockedSkins.push(skinId);
    return save;
  }

  function aggregate(rewards) {
    const groups = new Map();
    for (const reward of rewards.filter(item => item.kind !== "skin")) {
      const key = reward.kind === "gear" ? `${reward.label}:${reward.item?.id || Math.random()}` : reward.label;
      if (!groups.has(key)) groups.set(key, { ...reward, amount: 0 });
      groups.get(key).amount += number(reward.amount || 1);
    }
    return [...groups.values()];
  }

  function ensureCss() {
    if (id("cherriftChestOnlyCss")) return;
    const style = document.createElement("style");
    style.id = "cherriftChestOnlyCss";
    style.textContent = `
      #economyV11Floating,#economyV11DesktopBtn,.economy-nav-v11{display:none!important;pointer-events:none!important}
      #gachaChestOnlyV12{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain;touch-action:pan-y;min-height:100dvh;padding-bottom:140px;color:#fff}
      .gco-shell{width:min(920px,100%);margin:0 auto;padding:18px 18px 150px}
      .gco-head{display:flex;align-items:center;gap:16px;margin-bottom:14px}.gco-head h2{margin:0;font:700 clamp(42px,8vw,64px)/1 Georgia,serif}.gco-back{width:72px;height:72px;border:1px solid #ffffff25;border-radius:22px;color:#fff;background:#ffffff08;font-size:28px}
      .gco-wallet,.gco-chests{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}.gco-wallet{margin:8px 0 12px}.gco-wallet b,.gco-chests b{display:flex;align-items:center;gap:8px;min-height:50px;padding:8px 14px;border:1px solid #ffffff1f;border-radius:15px;background:#ffffff08}.gco-chests{margin:0 0 18px}.gco-chests img{width:38px;height:38px;object-fit:contain}
      .gco-carousel{position:relative;display:grid;grid-template-columns:54px minmax(0,1fr) 54px;align-items:center;gap:10px;user-select:none}.gco-arrow{height:64px;border:1px solid #ffffff22;border-radius:18px;color:#fff;background:#ffffff08;font-size:36px}.gco-card{min-height:650px;padding:22px;border:1px solid #ffffff24;border-radius:30px;background:linear-gradient(160deg,#2a102fdd,#120817f2);box-shadow:0 24px 80px #0007;touch-action:pan-y}
      .gco-card.common{border-top:7px solid #63dd8a}.gco-card.rare{border-top:7px solid #58adff}.gco-card.epic{border-top:7px solid #c060ff}.gco-art{height:260px;display:grid;place-items:center;border-radius:24px;background:#ffffff05}.gco-art img{max-width:230px;max-height:220px;object-fit:contain;filter:drop-shadow(0 18px 25px #0008)}
      .gco-rarity{margin:20px 0 3px;font-weight:1000;letter-spacing:4px;text-transform:uppercase}.gco-card h3{margin:0;font:700 clamp(38px,7vw,58px)/1.05 Georgia,serif}.gco-copy{margin:18px 0 8px;color:#e7c9db;font-size:18px}.gco-empty-note{margin:0 0 14px;padding:9px 12px;border:1px solid #ffb4d13d;border-radius:12px;color:#ffb4d1;background:#b9276414;font-weight:850}.gco-pity{padding:15px 18px;border-radius:18px;background:#ffffff07}.gco-pity header{display:flex;justify-content:space-between;font-size:19px}.gco-track{height:10px;margin-top:10px;border-radius:99px;background:#ffffff0d;overflow:hidden}.gco-track i{display:block;height:100%;background:linear-gradient(90deg,#e34b98,#b65cff)}
      .gco-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.gco-actions button{min-height:70px;border:0;border-radius:18px;color:#fff;background:linear-gradient(115deg,#d72f7d,#ea70ac);font-size:19px;font-weight:1000}.gco-actions button:disabled{color:#ffffff55;background:#64718a55;box-shadow:none}
      .gco-dots{display:flex;justify-content:center;gap:9px;margin-top:16px}.gco-dots button{width:11px;height:11px;padding:0;border:0;border-radius:50%;background:#ffffff30}.gco-dots button.active{background:#f15aa3;transform:scale(1.3)}
      .gco-modal{position:fixed;inset:0;z-index:100050;display:grid;place-items:center;padding:18px;background:#07030ce8;backdrop-filter:blur(8px)}.gco-modal.hidden{display:none!important}.gco-modal-card{width:min(600px,100%);max-height:min(780px,90dvh);overflow:auto;padding:24px;border:1px solid #ffffff25;border-radius:28px;background:linear-gradient(155deg,#34133deb,#120817);text-align:center}.gco-opening img{width:min(280px,65vw);height:240px;object-fit:contain;animation:gcoOpen .85s ease both}.gco-skin-art{width:100%;height:330px;object-fit:contain;border-radius:20px;background:#ffffff06}.gco-modal h3{font:700 38px Georgia,serif;margin:12px 0}.gco-next,.gco-close{width:100%;min-height:58px;border:0;border-radius:16px;color:#fff;background:linear-gradient(115deg,#d72f7d,#ea70ac);font-weight:1000}.gco-summary{display:grid;gap:9px;text-align:left}.gco-summary-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#ffffff07}.gco-summary-row img{width:48px;height:48px;object-fit:contain}.gco-summary-row span{font-size:28px}.gco-summary-row b{margin-left:auto}.gco-toast{position:fixed;z-index:100080;top:max(14px,env(safe-area-inset-top));left:50%;translate:-50% -120%;max-width:min(520px,90vw);padding:12px 18px;border:1px solid #ffbad8aa;border-radius:14px;background:#2f1029ed;color:#fff;font-weight:900;transition:translate .22s}.gco-toast.show{translate:-50% 0}
      @keyframes gcoOpen{0%{transform:scale(.65) rotate(-5deg);filter:brightness(.5)}60%{transform:scale(1.13) rotate(2deg);filter:brightness(1.7) drop-shadow(0 0 35px #ff77bd)}100%{transform:scale(1);filter:brightness(1)}}
      @media(max-width:700px){.gco-shell{padding:12px 12px 130px}.gco-head h2{font-size:48px}.gco-back{width:64px;height:64px}.gco-carousel{grid-template-columns:38px minmax(0,1fr) 38px;gap:6px}.gco-arrow{height:58px;border-radius:14px}.gco-card{min-height:570px;padding:16px;border-radius:25px}.gco-art{height:210px}.gco-art img{max-height:190px;max-width:200px}.gco-actions button{min-height:64px}.gco-wallet b{padding:7px 10px}.gco-chests b{padding:5px 8px;font-size:13px}.gco-chests img{width:32px;height:32px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = id("gachaChestOnlyV12");
    if (panel) return panel;
    const app = id("app");
    if (!app) return null;
    panel = document.createElement("section");
    panel.id = "gachaChestOnlyV12";
    panel.className = "panel hidden";
    panel.innerHTML = `<div class="gco-shell"><header class="gco-head"><button class="gco-back" type="button" data-gco-back>←</button><h2>Gacha</h2></header><div id="gcoWallet" class="gco-wallet"></div><div id="gcoChestWallet" class="gco-chests"></div><div class="gco-carousel" id="gcoCarousel"><button class="gco-arrow" type="button" data-gco-step="-1">‹</button><div id="gcoCard"></div><button class="gco-arrow" type="button" data-gco-step="1">›</button></div><div id="gcoDots" class="gco-dots"></div></div><div id="gcoModal" class="gco-modal hidden"></div><div id="gcoToast" class="gco-toast"></div>`;
    app.appendChild(panel);
    panel.addEventListener("click", event => {
      const step = event.target.closest("[data-gco-step]");
      if (step) changeTier(Number(step.dataset.gcoStep));
      if (event.target.closest("[data-gco-back]")) closePanel();
      const open = event.target.closest("[data-gco-open]");
      if (open) openMany(Number(open.dataset.gcoOpen));
      const dot = event.target.closest("[data-gco-tier]");
      if (dot) { state.tier = dot.dataset.gcoTier; render(); }
    });
    const carousel = id("gcoCarousel");
    carousel.addEventListener("pointerdown", event => { state.dragStart = { x: event.clientX, y: event.clientY, id: event.pointerId }; carousel.setPointerCapture?.(event.pointerId); });
    carousel.addEventListener("pointerup", event => {
      if (!state.dragStart) return;
      const dx = event.clientX - state.dragStart.x;
      const dy = event.clientY - state.dragStart.y;
      state.dragStart = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) changeTier(dx < 0 ? 1 : -1);
    });
    return panel;
  }

  function toast(message) {
    const element = id("gcoToast");
    if (!element) return window.UI?.toast?.(message);
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 2800);
  }

  function render() {
    const panel = ensurePanel();
    if (!panel || !window.UI?.save) return;
    const save = normalize(UI.save);
    const def = DEF[state.tier];
    const count = number(save.chests[state.tier]);
    const pity = number(save.gacha.pity[state.tier]);
    id("gcoWallet").innerHTML = `<b>🪙 ${save.coins}</b><b>💎 ${save.blossomGems}</b><b>🌸 ${save.sakuraEssence}</b>`;
    id("gcoChestWallet").innerHTML = TIERS.map(tier => `<b><img src="${DEF[tier].asset}" alt=""><span>${number(save.chests[tier])}</span></b>`).join("");
    id("gcoCard").innerHTML = `<article class="gco-card ${state.tier}" data-gco-card><div class="gco-art"><img src="${def.asset}" alt="${esc(def.name)}"></div><div class="gco-rarity">${state.tier}</div><h3>${esc(def.name)}</h3><p class="gco-copy">${esc(def.itemText)}</p>${count < 1 ? `<p class="gco-empty-note">You don't have any ${esc(def.name)}s.</p>` : ""}<section class="gco-pity"><header><span>Guaranteed Skin</span><b>${pity} / ${def.pity}</b></header><div class="gco-track"><i style="width:${Math.min(100, pity / def.pity * 100)}%"></i></div></section><div class="gco-actions"><button type="button" data-gco-open="1" ${count < 1 || state.busy ? "disabled" : ""}>Open 1×</button><button type="button" data-gco-open="10" ${count < 10 || state.busy ? "disabled" : ""}>Open 10×</button></div></article>`;
    id("gcoDots").innerHTML = TIERS.map(tier => `<button type="button" class="${tier === state.tier ? "active" : ""}" data-gco-tier="${tier}" aria-label="${DEF[tier].name}"></button>`).join("");
  }

  function changeTier(step) {
    const current = TIERS.indexOf(state.tier);
    state.tier = TIERS[(current + step + TIERS.length) % TIERS.length];
    render();
  }

  function hideGamePanels(target) {
    qa("#app > section").forEach(section => {
      if (section === target) section.classList.remove("hidden");
      else if (section.id !== "hud" && section.id !== "stageHud") section.classList.add("hidden");
    });
    document.body.classList.remove("is-playing");
  }

  function openPanel(tier) {
    if (TIERS.includes(tier)) state.tier = tier;
    ensureCss();
    const panel = ensurePanel();
    if (!panel) return;
    if (window.UI?.save) {
      const before = JSON.stringify({ keys: UI.save.keys, wallet: UI.save.resourceWallet?.keys, migrated: UI.save.economy?.chestOnlyMigrationV1 });
      normalize(UI.save);
      const after = JSON.stringify({ keys: UI.save.keys, wallet: UI.save.resourceWallet?.keys, migrated: UI.save.economy?.chestOnlyMigrationV1 });
      if (before !== after) saveProgress(UI.save);
    }
    hideGamePanels(panel);
    render();
    panel.scrollTop = 0;
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }

  function closePanel() {
    if (state.originalOpen) state.originalOpen("menu");
    else window.UI?.open?.("menu");
  }

  function summaryMarkup(rewards) {
    const rows = aggregate(rewards);
    if (!rows.length) return `<p>All rewards were shown above.</p>`;
    return `<div class="gco-summary">${rows.map(reward => `<div class="gco-summary-row">${reward.asset ? `<img src="${esc(reward.asset)}" alt="">` : `<span>${reward.icon || "•"}</span>`}<strong>${esc(reward.label)}</strong><b>×${number(reward.amount || 1)}</b></div>`).join("")}</div>`;
  }

  function showResultSequence(tier, rewards) {
    const modal = id("gcoModal");
    const skins = rewards.filter(reward => reward.kind === "skin");
    const queue = [...skins];
    const renderSummary = () => {
      modal.innerHTML = `<div class="gco-modal-card"><small>${esc(DEF[tier].name)}</small><h3>Rewards</h3>${summaryMarkup(rewards)}<button class="gco-close" type="button">Close</button></div>`;
      q(".gco-close", modal).onclick = () => modal.classList.add("hidden");
    };
    const nextSkin = () => {
      const reward = queue.shift();
      if (!reward) return renderSummary();
      modal.innerHTML = `<div class="gco-modal-card"><small>${esc(reward.rarity)} Skin</small>${reward.asset ? `<img class="gco-skin-art" src="${esc(reward.asset)}" alt="">` : `<div style="font-size:90px">${reward.icon || "🐰"}</div>`}<h3>${esc(reward.label)}</h3>${reward.duplicate ? `<p>Duplicate skin converted to Sakura Essence.</p>` : `<p>New Cherry skin unlocked!</p>`}<button class="gco-next" type="button">${queue.length ? "Next Skin" : "Reward Summary"}</button></div>`;
      q(".gco-next", modal).onclick = nextSkin;
    };
    modal.classList.remove("hidden");
    modal.innerHTML = `<div class="gco-modal-card gco-opening"><small>${rewards.length}× opening</small><img src="${DEF[tier].asset}" alt=""><h3>Opening…</h3></div>`;
    setTimeout(() => skins.length ? nextSkin() : renderSummary(), 850);
  }

  function openMany(amount) {
    if (state.busy || !window.UI?.save || ![1, 10].includes(amount)) return;
    const save = normalize(UI.save);
    const available = number(save.chests[state.tier]);
    if (available < amount) {
      toast(amount === 10 ? `You need 10 ${DEF[state.tier].name}s.` : `You don't have any ${DEF[state.tier].name}s.`);
      return;
    }
    state.busy = true;
    save.chests[state.tier] -= amount;
    const rewards = [];
    for (let index = 0; index < amount; index += 1) rewards.push(roll(save, state.tier));
    save.economy.totalChestOpens += amount;
    saveProgress(save);
    state.busy = false;
    render();
    showResultSequence(state.tier, rewards);
  }

  function patchStorage() {
    if (!window.CherriftStorage || CherriftStorage.__chestOnlyV12) return;
    const defaults = CherriftStorage.defaults?.bind(CherriftStorage);
    const load = CherriftStorage.load?.bind(CherriftStorage);
    const save = CherriftStorage.save?.bind(CherriftStorage);
    if (defaults) CherriftStorage.defaults = () => normalize(defaults());
    if (load) CherriftStorage.load = () => normalize(load());
    if (save) CherriftStorage.save = value => save(normalize(value));
    CherriftStorage.__chestOnlyV12 = true;
  }

  function patchOpen() {
    if (!window.UI || UI.__chestOnlyOpenV12) return;
    state.originalOpen = UI.open?.bind(UI) || null;
    if (state.originalOpen) UI.open = function chestOnlyOpen(panel, ...args) {
      if (["gachaV082", "chests", "economyV11", "gachaChestOnlyV12"].includes(panel)) return openPanel(args[0]);
      return state.originalOpen(panel, ...args);
    };
    UI.__chestOnlyOpenV12 = true;
  }

  function removeLegacyUi() {
    id("economyV11Floating")?.remove();
    id("economyV11DesktopBtn")?.remove();
    const oldPanel = id("economyV11");
    if (oldPanel) oldPanel.remove();
    qa('[data-tier="legendary"],[data-chest="legendary"],[data-v082-chest="legendary"],.legendary-chest').forEach(element => element.remove());
  }

  function start() {
    if (!window.UI || !window.CherriftStorage || !window.CHERRIFT_DATA) return setTimeout(start, 120);
    ensureCss();
    patchStorage();
    patchOpen();
    if (UI.save) normalize(UI.save);
    ensurePanel();
    removeLegacyUi();
    new MutationObserver(removeLegacyUi).observe(document.body, { childList: true, subtree: true });
    console.info(`[CHERRIFT] Economy ${VERSION} loaded: chest-only Common/Rare/Epic carousel.`);
  }

  window.CHERRIFT_ECONOMY_V11 = Object.freeze({
    version: VERSION,
    tiers: TIERS,
    normalize,
    applyReward,
    open: openPanel,
    render,
    openMany,
    chestCount: (save, tier) => number(normalize(save).chests[tier])
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
