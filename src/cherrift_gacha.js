(() => {
  "use strict";
  if (window.__CHERRIFT_ECONOMY_CHEST_ONLY__) return;
  window.__CHERRIFT_ECONOMY_CHEST_ONLY__ = true;

  const VERSION = "2.1.0-routed-equipment-chests";
  const TIERS = ["common", "rare", "epic"];
  const DEF = {
    common: { name: "Common Chest", names:{hu:"Common láda",en:"Common Chest"}, itemText:{hu:"Common tárgyak",en:"Common Items"}, pity: 10, rarity: "Common", asset: "assets/items/chests/common_chest.png" },
    rare: { name: "Rare Chest", names:{hu:"Rare láda",en:"Rare Chest"}, itemText:{hu:"Common / Rare tárgyak",en:"Common / Rare Items"}, pity: 15, rarity: "Rare", asset: "assets/items/chests/rare_chest.png" },
    epic: { name: "Epic Chest", names:{hu:"Epic láda",en:"Epic Chest"}, itemText:{hu:"Rare / Epic tárgyak",en:"Rare / Epic Items"}, pity: 25, rarity: "Epic", asset: "assets/items/chests/epic_chest.png" }
  };
  const state = { tier: "common", busy: false, dragStart: null, originalOpen: null, openingTimer: 0 };
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  const COPY = Object.freeze({
    hu: {
      title:"Felszerelés ládák", back:"Vissza", guaranteed:"Skin garancia", opened:"Kinyitva", remaining:"A garanciáig", empty:name => `Nincs ${name}.`,
      need:name => `10 ${name} szükséges.`, openOne:"Nyitás 1×", openTen:"Nyitás 10×",
      opening:"Láda nyitása…", rewards:"Jutalmak", close:"Bezárás", continue:"Tovább",
      duplicate:"Duplikált skin Sakura Essence-re váltva.", unlocked:"Új Cherry skin feloldva!",
      inventoryFull:amount => `Megtelt az inventory · ${amount} Coin`, noChest:name => `Nincs ${name}.`,
      previous:"Előző láda", next:"Következő láda"
    },
    en: {
      title:"Equipment Chests", back:"Back", guaranteed:"Skin Guarantee", opened:"Opened", remaining:"Until Guarantee", empty:name => `You don't have any ${name}s.`,
      need:name => `You need 10 ${name}s.`, openOne:"Open 1×", openTen:"Open 10×",
      opening:"Opening chest…", rewards:"Rewards", close:"Close", continue:"Continue",
      duplicate:"Duplicate skin converted to Sakura Essence.", unlocked:"New Cherry skin unlocked!",
      inventoryFull:amount => `Inventory full · ${amount} Coin`, noChest:name => `You don't have any ${name}s.`,
      previous:"Previous chest", next:"Next chest"
    }
  });

  function language() {
    return window.CHERRIFT_LOCALIZATION?.language?.() === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }
  function text(key, value) {
    const entry = COPY[language()]?.[key] ?? COPY.en[key] ?? key;
    return typeof entry === "function" ? entry(value) : entry;
  }
  function chestName(tier) { return DEF[tier]?.names?.[language()] || DEF[tier]?.name || tier; }
  function chestItems(tier) { return DEF[tier]?.itemText?.[language()] || DEF[tier]?.itemText?.en || ""; }

  function normalize(save) {
    if (!save || typeof save !== "object") save = {};
    save.coins = number(save.coins);
    save.blossomGems = number(save.blossomGems);
    save.sakuraEssence = number(save.sakuraEssence);
    save.chests = save.chests && typeof save.chests === "object" ? save.chests : {};
    for (const tier of TIERS) save.chests[tier] = number(save.chests[tier]);
    save.gacha = save.gacha && typeof save.gacha === "object" ? save.gacha : {};
    save.gacha.pity = save.gacha.pity && typeof save.gacha.pity === "object" ? save.gacha.pity : {};
    save.gacha.opened = save.gacha.opened && typeof save.gacha.opened === "object" ? save.gacha.opened : {};
    save.gacha.history = Array.isArray(save.gacha.history) ? save.gacha.history.slice(0, 50) : [];
    for (const tier of TIERS) {
      const value = number(save.gacha.pity[tier]);
      save.gacha.pity[tier] = DEF[tier]?.pity ? value % DEF[tier].pity : value;
      save.gacha.opened[tier] = number(save.gacha.opened[tier]);
    }
    save.economy = save.economy && typeof save.economy === "object" ? save.economy : {};
    save.economy.totalChestOpens = number(save.economy.totalChestOpens);
    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.unlockedSkins = Array.isArray(save.unlockedSkins) ? save.unlockedSkins : [];
    save.resourceWallet = save.resourceWallet && typeof save.resourceWallet === "object" ? save.resourceWallet : {};
    save.resourceWallet.keys = save.resourceWallet.keys && typeof save.resourceWallet.keys === "object" ? save.resourceWallet.keys : {};

    // Legacy reward producers still award `keys`. Convert on every normalization,
    // not only on the first save migration. Zeroing the source makes this idempotent.
    save.chests.common += number(save.keys) + number(save.resourceWallet.keys.common);
    save.chests.rare += number(save.resourceWallet.keys.rare);
    // Legendary was removed from the public Gacha. Preserve old rewards by
    // converting them to Epic chests instead of leaving an unusable balance.
    save.chests.epic += number(save.resourceWallet.keys.epic) + number(save.resourceWallet.keys.legendary) + number(save.chests.legendary);
    delete save.chests.legendary;
    delete save.gacha.pity.legendary;
    save.keys = 0;
    save.resourceWallet.keys.common = 0;
    save.resourceWallet.keys.rare = 0;
    save.resourceWallet.keys.epic = 0;
    save.resourceWallet.keys.legendary = 0;
    save.economy.chestOnlyMigrationV1 = true;
    save.economy.chestOnlyMigrationV2 = true;
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
      const amount = window.CHERRIFT_BALANCE?.gacha?.duplicateEssence?.[rarity] || 5;
      save.sakuraEssence += amount;
      return { kind: "essence", rarity, amount, label: `${amount} Sakura Essence`, asset: "assets/items/sakura_potion.png" };
    }
    const duplicate = save.unlockedSkins.includes(skin.id);
    if (!duplicate) save.unlockedSkins.push(skin.id);
    if (duplicate) {
      const amount = window.CHERRIFT_BALANCE?.gacha?.duplicateEssence?.[rarity] || 5;
      save.sakuraEssence += amount;
      return { kind: "skin", duplicate: true, rarity, amount, skinId: skin.id, label: skin.name, icon: skin.icon || skin.emoji || "🐰", asset: skin.splash || skin.icon || "" };
    }
    return { kind: "skin", duplicate: false, rarity, skinId: skin.id, label: skin.name || skin.id, icon: skin.icon || skin.emoji || "🐰", asset: skin.splash || skin.icon || "" };
  }

  function grantGear(save, rarity) {
    const create = window.CHERRIFT_V050?.createGear;
    if (typeof create !== "function") {
      const amount = { Common: 30, Uncommon: 50, Rare: 90, Epic: 240 }[rarity] || 30;
      save.coins += amount;
      return { kind: "coins", rarity, amount, label: `${amount} Coin`, asset: "assets/items/coin.png" };
    }
    const item = create(currentWorld(save), rarity);
    window.CHERRIFT_V070?.syncItemToArsenal?.(item, save);
    if (save.inventory.length >= 80) {
      const amount = window.CHERRIFT_V050?.sellValue?.(item) || { Common: 20, Uncommon: 35, Rare: 60, Epic: 180 }[rarity] || 20;
      save.coins += amount;
      return { kind: "coins", rarity, amount, label: text("inventoryFull", amount), asset: "assets/items/coin.png" };
    }
    save.inventory.push(item);
    return { kind: "gear", rarity, item, amount: 1, label: `${rarity} ${item.type || ""} ${item.slot || "Gear"}`.trim(), asset: item.asset || "assets/items/equipments/weapons/sword_sword.png" };
  }

  function roll(save, tier) {
    const def = DEF[tier];
    const currentPity = Math.min(Math.max(0, def.pity - 1), number(save.gacha.pity[tier]));
    save.gacha.pity[tier] = currentPity + 1;
    const guaranteed = save.gacha.pity[tier] >= def.pity;
    if (guaranteed) {
      save.gacha.pity[tier] = 0;
      return grantSkin(save, def.rarity);
    }
    const luck = Math.max(0,Math.min(.15,Number(window.CHERRIFT_PREBETA?.titleStats?.(save)?.chestLuck)||0));
    const random = Math.min(.999999,Math.random()+luck);
    if (tier === "common") {
      if (random < .66) return grantGear(save, "Common");
      if (random < .88) return grantGear(save, "Uncommon");
      if (random < .96) return grantSkin(save, "Common");
      if (random < .995) return grantGear(save, "Rare");
      return grantSkin(save, "Rare");
    }
    if (tier === "rare") {
      if (random < .25) return grantGear(save, "Uncommon");
      if (random < .80) return grantGear(save, "Rare");
      if (random < .88) return grantSkin(save, "Common");
      if (random < .98) return grantSkin(save, "Rare");
      return grantGear(save, "Epic");
    }
    if (random < .48) return grantGear(save, "Rare");
    if (random < .85) return grantGear(save, "Epic");
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
      "currency.blossom_gems": ["bloomGems"],
      "currency.sakura_essence": ["sakuraEssence"],
      "chest.common": ["chests", "common"],
      "chest.rare": ["chests", "rare"],
      "chest.epic": ["chests", "epic"],
      "chest.legendary": ["chests", "legendary"],
      "material.copper": ["bag", "materials", "stones", "copper"],
      "material.iron": ["arsenal", "materials", "iron"],
      "material.steel": ["arsenal", "materials", "steel"],
      "material.silver": ["bag", "materials", "stones", "silver"],
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
      body.gacha-open .resource-bar-v082,body.gacha-open #resourceBarV082{display:none!important;visibility:hidden!important;pointer-events:none!important}
      #gachaChestOnlyV12{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain;touch-action:pan-y;min-height:var(--cherrift-viewport-height,100dvh);color:#fff}
      .gco-shell{width:min(920px,100%);min-height:var(--cherrift-viewport-height,100dvh);margin:0 auto;padding:18px 18px 64px}
      .gco-head{display:flex;align-items:center;gap:16px;margin-bottom:14px}.gco-head h2{margin:0;font:700 clamp(42px,8vw,64px)/1 Georgia,serif}.gco-back{width:72px;height:72px;border:1px solid #ffffff25;border-radius:22px;color:#fff;background:#ffffff08;font-size:28px}
      .gco-wallet,.gco-chests{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}.gco-wallet{margin:8px 0 12px}.gco-wallet b,.gco-chests b{display:flex;align-items:center;gap:8px;min-height:50px;padding:8px 14px;border:1px solid #ffffff1f;border-radius:15px;background:#ffffff08}.gco-wallet img{width:28px;height:28px;object-fit:contain}.gco-chests{margin:0 0 18px}.gco-chests img{width:38px;height:38px;object-fit:contain}
      .gco-carousel{position:relative;display:grid;grid-template-columns:54px minmax(0,1fr) 54px;align-items:center;gap:10px;user-select:none}.gco-arrow{height:64px;border:1px solid #ffffff22;border-radius:18px;color:#fff;background:#ffffff08;font-size:36px}.gco-arrow:disabled{opacity:.22;cursor:not-allowed}.gco-card{min-height:clamp(480px,calc(100dvh - 250px),650px);padding:22px;border:1px solid #ffffff24;border-radius:30px;background:linear-gradient(160deg,#2a102fdd,#120817f2);box-shadow:0 24px 80px #0007;touch-action:pan-y}
      .gco-card.common{border-top:7px solid #63dd8a}.gco-card.rare{border-top:7px solid #58adff}.gco-card.epic{border-top:7px solid #c060ff}.gco-art{height:clamp(180px,28dvh,260px);display:grid;place-items:center;border-radius:24px;background:#ffffff05}.gco-art img{max-width:230px;max-height:220px;object-fit:contain;filter:drop-shadow(0 18px 25px #0008)}.gco-art-fallback{display:none;font-size:72px}.gco-art img[hidden]+.gco-art-fallback{display:block}
      .gco-rarity{margin:20px 0 3px;font-weight:1000;letter-spacing:4px;text-transform:uppercase}.gco-card h3{margin:0;font:700 clamp(38px,7vw,58px)/1.05 Georgia,serif}.gco-copy{margin:18px 0 8px;color:#e7c9db;font-size:18px}.gco-empty-note{margin:0 0 14px;padding:9px 12px;border:1px solid #ffb4d13d;border-radius:12px;color:#ffb4d1;background:#b9276414;font-weight:850}.gco-pity{padding:15px 18px;border-radius:18px;background:#ffffff07}.gco-pity header{display:flex;justify-content:space-between;font-size:19px}.gco-pity-meta{display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:#d9b8ce;font-size:12px;font-weight:850}.gco-track{height:10px;margin-top:10px;border-radius:99px;background:#ffffff0d;overflow:hidden}.gco-track i{display:block;height:100%;background:linear-gradient(90deg,#e34b98,#b65cff)}
      .gco-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.gco-actions button{min-height:70px;border:0;border-radius:18px;color:#fff;background:linear-gradient(115deg,#d72f7d,#ea70ac);font-size:19px;font-weight:1000}.gco-actions button:disabled{color:#ffffff55;background:#64718a55;box-shadow:none}
      .gco-dots{display:flex;justify-content:center;gap:9px;margin-top:16px}.gco-dots button{width:11px;height:11px;padding:0;border:0;border-radius:50%;background:#ffffff30}.gco-dots button.active{background:#f15aa3;transform:scale(1.3)}
      .gco-modal{position:fixed;inset:0;z-index:100050;display:grid;place-items:center;padding:18px;background:#07030ce8;backdrop-filter:blur(8px)}.gco-modal.hidden{display:none!important}.gco-modal-card{width:min(600px,100%);max-height:min(780px,90dvh);overflow:auto;padding:24px;border:1px solid #ffffff25;border-radius:28px;background:linear-gradient(155deg,#34133deb,#120817);text-align:center}.gco-opening::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;animation:gcoFlash 2.2s ease-in-out both}.gco-opening.common::before{background:radial-gradient(circle,#63dd8a 0,transparent 62%)}.gco-opening.rare::before{background:radial-gradient(circle,#58adff 0,transparent 62%)}.gco-opening.epic::before{background:radial-gradient(circle,#c060ff 0,transparent 62%)}.gco-opening img{position:relative;width:min(280px,65vw);height:240px;object-fit:contain;animation:gcoOpen 2.05s cubic-bezier(.2,.72,.2,1) both}.gco-opening-fallback{display:none;height:240px;place-items:center;font-size:92px;animation:gcoOpen 2.05s cubic-bezier(.2,.72,.2,1) both}.gco-opening img[hidden]+.gco-opening-fallback{display:grid}.gco-skin-art{width:100%;height:330px;object-fit:contain;border-radius:20px;background:#ffffff06}.gco-skin-reveal.duplicate .gco-skin-art{animation:gcoDuplicate 1s .15s ease both}.gco-duplicate-conversion{font-weight:950;color:#f6afd4}.gco-modal h3{font:700 38px Georgia,serif;margin:12px 0}.gco-next,.gco-close{width:100%;min-height:58px;border:0;border-radius:16px;color:#fff;background:linear-gradient(115deg,#d72f7d,#ea70ac);font-weight:1000}.gco-summary{display:grid;gap:9px;text-align:left}.gco-summary-row{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid color-mix(in srgb,var(--reward-rarity,#ffffff) 62%,transparent);border-radius:14px;background:#ffffff07}.gco-summary-row img{width:48px;height:48px;object-fit:contain}.gco-summary-row span{font-size:28px}.gco-summary-row b{margin-left:auto}.gco-toast{position:fixed;z-index:100080;top:max(14px,env(safe-area-inset-top));left:50%;translate:-50% -120%;max-width:min(520px,90vw);padding:12px 18px;border:1px solid #ffbad8aa;border-radius:14px;background:#2f1029ed;color:#fff;font-weight:900;transition:translate .22s}.gco-toast.show{translate:-50% 0}
      @keyframes gcoOpen{0%{transform:scale(.58) translateY(20px) rotate(-6deg);filter:brightness(.42)}32%{transform:scale(.92) translateY(0) rotate(3deg);filter:brightness(.9)}68%{transform:scale(1.16) rotate(-1deg);filter:brightness(1.8) drop-shadow(0 0 42px #ff77bd)}100%{transform:scale(1);filter:brightness(1.12) drop-shadow(0 0 24px #ff77bd88)}}
      @keyframes gcoFlash{0%,35%{opacity:0}60%{opacity:.95}100%{opacity:0}}
      @keyframes gcoDuplicate{0%{transform:scale(1);filter:none}25%{transform:scale(1.06);filter:brightness(1.5)}55%{transform:scale(.96);filter:grayscale(.25)}100%{transform:scale(1);filter:grayscale(1) brightness(.48)}}
      @media(max-width:700px){.gco-shell{padding:12px 12px 130px}.gco-head h2{font-size:48px}.gco-back{width:64px;height:64px}.gco-carousel{grid-template-columns:38px minmax(0,1fr) 38px;gap:6px}.gco-arrow{height:58px;border-radius:14px}.gco-card{min-height:570px;padding:16px;border-radius:25px}.gco-art{height:210px}.gco-art img{max-height:190px;max-width:200px}.gco-actions button{min-height:64px}.gco-wallet b{padding:7px 10px}.gco-chests b{padding:5px 8px;font-size:13px}.gco-chests img{width:32px;height:32px}}
      @media(max-width:820px){
        #gachaChestOnlyV12{height:var(--cherrift-viewport-height,100dvh)!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important}
        #gachaChestOnlyV12 .gco-shell{height:100%;min-height:0;display:flex;flex-direction:column;padding:max(8px,env(safe-area-inset-top)) 10px calc(78px + env(safe-area-inset-bottom))!important;overflow:hidden!important}
        #gachaChestOnlyV12 .gco-head{flex:0 0 auto;margin:0 0 4px;min-height:52px}.gco-head h2{font-size:42px!important}.gco-back{width:52px!important;height:52px!important;border-radius:17px!important}
        #gachaChestOnlyV12 .gco-wallet{flex:0 0 auto;margin:0 0 4px!important;gap:5px!important;flex-wrap:nowrap!important}.gco-wallet b{min-width:0!important;min-height:31px!important;padding:3px 8px!important;font-size:12px!important}
        #gachaChestOnlyV12 .gco-chests{flex:0 0 auto;margin:0 auto 5px;gap:6px}.gco-chests b{padding:3px 8px!important}.gco-chests img{width:28px!important;height:28px!important}
        #gachaChestOnlyV12 .gco-carousel{flex:1 1 auto;min-height:0;grid-template-columns:36px minmax(0,1fr) 36px;gap:5px;align-items:stretch;overflow:hidden!important}
        #gachaChestOnlyV12 .gco-arrow{align-self:center}
        #gachaChestOnlyV12 #gcoCard{height:100%;min-height:0;overflow:hidden}.gco-card{height:100%;min-height:0!important;display:flex;flex-direction:column;padding:10px 14px!important;border-radius:23px!important;overflow:hidden!important}
        .gco-art{flex:1 1 auto;min-height:110px;height:auto!important;margin-bottom:2px}.gco-art img{max-height:min(25dvh,175px)!important;max-width:180px!important}
        .gco-rarity{font-size:10px;margin-top:0}.gco-card h3{margin:0!important;font-size:clamp(32px,8vw,45px)!important;line-height:.95}.gco-copy{margin:5px 0!important;font-size:15px}.gco-empty-note{margin:2px 0!important;font-size:10px}
        .gco-pity{margin-top:auto!important;padding:9px 11px!important}.gco-pity header{font-size:14px}.gco-actions{gap:8px;margin-top:8px!important}.gco-actions button{min-height:50px!important;font-size:17px!important}
        .gco-dots{flex:0 0 auto;margin:5px 0 0!important}.gco-arrow{height:54px!important}
      }
      @media(orientation:landscape) and (max-height:600px) and (pointer:coarse){
        #gachaChestOnlyV12{height:var(--cherrift-viewport-height,100dvh)!important;min-height:0!important;overflow:hidden!important}
        #gachaChestOnlyV12 .gco-shell{width:min(900px,100%);height:100%;min-height:0;padding:max(6px,env(safe-area-inset-top)) 46px calc(58px + env(safe-area-inset-bottom))!important}
        #gachaChestOnlyV12 .gco-head{min-height:36px!important;margin:0 0 2px!important}.gco-head h2{font-size:30px!important}.gco-back{width:38px!important;height:38px!important;border-radius:12px!important;font-size:20px!important}
        #gachaChestOnlyV12 .gco-chests{margin:0 auto 3px!important}.gco-chests b{min-height:28px!important;padding:2px 7px!important;font-size:11px}.gco-chests img{width:24px!important;height:24px!important}
        #gachaChestOnlyV12 .gco-carousel{min-height:210px!important;grid-template-columns:34px minmax(0,1fr) 34px!important}
        #gachaChestOnlyV12 #gcoCard{height:auto!important}.gco-card{min-height:205px!important;height:auto!important;display:grid!important;grid-template-columns:minmax(130px,30%) minmax(0,1fr);grid-template-rows:auto auto auto 1fr auto;column-gap:14px;padding:8px 12px!important}
        .gco-art{grid-column:1;grid-row:1/6;height:100%!important;min-height:170px!important}.gco-art img{max-width:130px!important;max-height:150px!important}.gco-rarity,.gco-card h3,.gco-copy,.gco-empty-note,.gco-pity,.gco-actions{grid-column:2}.gco-rarity{grid-row:1;margin:0!important}.gco-card h3{grid-row:2;font-size:27px!important}.gco-copy,.gco-empty-note{grid-row:3;margin:2px 0!important}.gco-pity{grid-row:4;align-self:end;margin:2px 0!important;padding:5px 8px!important}.gco-actions{grid-row:5;margin:4px 0 0!important}.gco-actions button{min-height:38px!important;font-size:14px!important}.gco-dots{margin:2px 0 0!important}
        .gco-modal-card{max-height:94dvh;padding:14px}.gco-skin-art{height:52dvh}.gco-modal h3{font-size:27px;margin:6px 0}
      }
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
    panel.innerHTML = `<div class="gco-shell"><header class="gco-head"><button class="gco-back" type="button" data-gco-back aria-label="${esc(text("back"))}">←</button><h2 data-gco-title>${esc(text("title"))}</h2></header><div id="gcoWallet" class="gco-wallet" aria-label="Currencies"></div><div id="gcoChestWallet" class="gco-chests" aria-label="Chests"></div><div class="gco-carousel" id="gcoCarousel"><button class="gco-arrow" type="button" data-gco-step="-1" aria-label="${esc(text("previous"))}">‹</button><div id="gcoCard"></div><button class="gco-arrow" type="button" data-gco-step="1" aria-label="${esc(text("next"))}">›</button></div><div id="gcoDots" class="gco-dots"></div></div><div id="gcoModal" class="gco-modal hidden" role="dialog" aria-modal="true"></div><div id="gcoToast" class="gco-toast" role="status" aria-live="polite"></div>`;
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
    carousel.addEventListener("pointerdown", event => {
      // Pointer capture retargets the following click to the carousel in real
      // Chromium browsers. Never capture a press that started on an action;
      // otherwise the visible Open button receives no click at all.
      if (event.button != null && event.button !== 0) return;
      if (event.target.closest("button,a,input,select,textarea,[role='button']")) return;
      state.dragStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      carousel.setPointerCapture?.(event.pointerId);
    });
    carousel.addEventListener("pointerup", event => {
      if (!state.dragStart) return;
      const dx = event.clientX - state.dragStart.x;
      const dy = event.clientY - state.dragStart.y;
      state.dragStart = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) changeTier(dx < 0 ? 1 : -1);
    });
    const cancelDrag = () => { state.dragStart = null; };
    carousel.addEventListener("pointercancel", cancelDrag);
    carousel.addEventListener("lostpointercapture", cancelDrag);
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
    const opened = number(save.gacha.opened[state.tier]);
    const remaining = Math.max(0, def.pity - pity);
    const title = q("[data-gco-title]", panel);
    if (title) title.textContent = text("title");
    const back = q("[data-gco-back]", panel);
    if (back) back.setAttribute("aria-label", text("back"));
    const scrap = number(save.gearScrap ?? save.scrap ?? save.bag?.materials?.gearScrap ?? save.arsenal?.materials?.gearScrap);
    id("gcoWallet").innerHTML = `<b title="Coin"><img src="assets/items/coin.png" alt=""><span>${number(save.coins)}</span></b><b title="Bloom Gem"><img src="assets/items/blossom_gem.png" alt=""><span>${number(save.bloomGems ?? save.blossomGems)}</span></b><b title="Sakura Essence"><img src="assets/items/sakura_potion.png" alt=""><span>${number(save.sakuraEssence)}</span></b><b title="Scrap"><img src="assets/items/scraps.png" alt=""><span>${scrap}</span></b>`;
    id("gcoChestWallet").innerHTML = TIERS.map(tier => `<b><img src="${DEF[tier].asset}" alt=""><span>${number(save.chests[tier])}</span></b>`).join("");
    id("gcoCard").innerHTML = `<article class="gco-card ${state.tier}" data-gco-card><div class="gco-art"><img src="${def.asset}" alt="${esc(chestName(state.tier))}" onerror="this.hidden=true"><span class="gco-art-fallback" aria-hidden="true">CHEST</span></div><div class="gco-rarity">${state.tier}</div><h3>${esc(chestName(state.tier))}</h3><p class="gco-copy">${esc(chestItems(state.tier))}</p>${count < 1 ? `<p class="gco-empty-note">${esc(text("empty", chestName(state.tier)))}</p>` : ""}<section class="gco-pity"><header><span>${esc(text("guaranteed"))}</span><b>${pity} / ${def.pity}</b></header><div class="gco-track"><i style="width:${Math.min(100, pity / def.pity * 100)}%"></i></div><div class="gco-pity-meta"><span>${esc(text("opened"))}: ${opened}</span><span>${esc(text("remaining"))}: ${remaining}</span></div></section><div class="gco-actions"><button type="button" data-gco-open="1" ${count < 1 || state.busy ? "disabled" : ""}>${esc(text("openOne"))}</button><button type="button" data-gco-open="10" ${count < 10 || state.busy ? "disabled" : ""}>${esc(text("openTen"))}</button></div></article>`;
    id("gcoDots").innerHTML = TIERS.map(tier => `<button type="button" class="${tier === state.tier ? "active" : ""}" data-gco-tier="${tier}" aria-label="${esc(chestName(tier))}"></button>`).join("");
    const tierIndex = TIERS.indexOf(state.tier);
    const previous = q('[data-gco-step="-1"]', panel);
    const next = q('[data-gco-step="1"]', panel);
    if (previous) previous.disabled = tierIndex <= 0;
    if (next) next.disabled = tierIndex >= TIERS.length - 1;
  }

  function changeTier(step) {
    const current = TIERS.indexOf(state.tier);
    state.tier = TIERS[Math.max(0, Math.min(TIERS.length - 1, current + step))];
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
    document.body.classList.add("gacha-open");
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
    if (window.CHERRIFT_STABILITY?.open) window.CHERRIFT_STABILITY.open("menu");
    else if (state.originalOpen) state.originalOpen("menu");
    else window.UI?.open?.("menu");
  }

  function summaryMarkup(rewards) {
    const rows = aggregate(rewards);
    if (!rows.length) return `<p>All rewards were shown above.</p>`;
    return `<div class="gco-summary">${rows.map(reward => `<div class="gco-summary-row" tabindex="0" data-cr-item-key="${esc(reward.item?.id || reward.label)}" data-cr-item-name="${esc(reward.label)}" data-cr-item-rarity="${esc(reward.rarity || "Common")}" data-cr-item-description="${esc(reward.item?.description || reward.label)}" style="--reward-rarity:${({common:"#63dd8a",uncommon:"#79d85c",rare:"#58adff",epic:"#c060ff",legendary:"#ffb341"})[String(reward.rarity || "common").toLowerCase()] || "#ffffff"}">${reward.asset ? `<img src="${esc(reward.asset)}" alt="">` : `<span>${reward.icon || "•"}</span>`}<strong>${esc(reward.label)}</strong><b>×${number(reward.amount || 1)}</b></div>`).join("")}</div>`;
  }

  function showGlobalSummary(rewards) {
    const modal = id("gcoModal");
    if (!modal || !rewards.length) return;
    // Keep the complete opening sequence inside the Gacha modal. Sending the
    // last step through the generic reward queue could reopen it later on top
    // of Gear or the main menu.
    modal.classList.remove("hidden");
    modal.innerHTML = `<div class="gco-modal-card"><h3>${esc(text("rewards"))}</h3>${summaryMarkup(rewards)}<button class="gco-close" type="button">${esc(text("close"))}</button></div>`;
    window.CHERRIFT_REWARDS?.playSound?.();
    q(".gco-close", modal).onclick = () => modal.classList.add("hidden");
  }

  function showResultSequence(tier, rewards) {
    const modal = id("gcoModal");
    const queue = rewards.filter(reward => reward.kind === "skin");
    const normalRewards = rewards.filter(reward => reward.kind !== "skin");
    const nextSkin = () => {
      const reward = queue.shift();
      if (!reward) return showGlobalSummary(normalRewards);
      modal.classList.remove("hidden");
      modal.innerHTML = `<div class="gco-modal-card gco-skin-reveal ${reward.duplicate ? "duplicate" : ""}"><small>${esc(reward.rarity)} Skin</small>${reward.asset ? `<img class="gco-skin-art" src="${esc(reward.asset)}" alt="" onerror="this.hidden=true">` : `<div class="gco-skin-fallback">${reward.icon || "🐰"}</div>`}<h3>${esc(reward.label)}</h3><p class="${reward.duplicate ? "gco-duplicate-conversion" : ""}">${esc(reward.duplicate ? `${text("duplicate")} +${number(reward.amount)} Sakura Essence` : text("unlocked"))}</p><button class="gco-next" type="button">${esc(queue.length || normalRewards.length ? text("continue") : text("close"))}</button></div>`;
      window.CHERRIFT_REWARDS?.playSound?.();
      q(".gco-next", modal).onclick = () => {
        if (queue.length) nextSkin();
        else if (normalRewards.length) showGlobalSummary(normalRewards);
        else modal.classList.add("hidden");
      };
    };
    if (queue.length) nextSkin();
    else showGlobalSummary(normalRewards);
  }

  function showOpening(tier, rewards) {
    const modal = id("gcoModal");
    if (!modal) {
      state.busy = false;
      render();
      showResultSequence(tier, rewards);
      return;
    }
    clearTimeout(state.openingTimer);
    modal.classList.remove("hidden");
    modal.innerHTML = `<div class="gco-modal-card gco-opening ${tier}" role="status" aria-live="polite"><img src="${esc(DEF[tier].asset)}" alt="${esc(chestName(tier))}" onerror="this.hidden=true"><span class="gco-opening-fallback" aria-hidden="true">CHEST</span><h3>${esc(text("opening"))}</h3></div>`;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const testDuration = Number(window.__CHERRIFT_GACHA_OPENING_MS__);
    const openingDuration = Number.isFinite(testDuration) && testDuration >= 100 ? testDuration : reducedMotion ? 700 : 2300;
    state.openingTimer = setTimeout(() => {
      state.openingTimer = 0;
      state.busy = false;
      render();
      showResultSequence(tier, rewards);
    }, openingDuration);
  }

  function openMany(amount) {
    if (state.busy || !window.UI?.save || ![1, 10].includes(amount)) return;
    const save = normalize(UI.save);
    const available = number(save.chests[state.tier]);
    if (available < amount) {
      toast(text(amount === 10 ? "need" : "noChest", chestName(state.tier)));
      return;
    }
    // The Gacha modal owns the entire chest-opening sequence. Clear any
    // delayed generic reward batch before starting so a previously queued
    // overlay cannot reopen above a skin reveal or the final Gacha summary.
    window.CHERRIFT_REWARDS?.reset?.();
    state.busy = true;
    save.chests[state.tier] -= amount;
    const rewards = [];
    for (let index = 0; index < amount; index += 1) rewards.push(roll(save, state.tier));
    save.economy.totalChestOpens += amount;
    save.gacha.opened[state.tier] += amount;
    save.gacha.history = Array.isArray(save.gacha.history) ? save.gacha.history : [];
    const openedAt = Date.now();
    for (const reward of rewards) {
      save.gacha.history.unshift({
        type:state.tier,
        reward:{kind:reward.kind,rarity:reward.rarity,label:reward.label,amount:number(reward.amount || 1)},
        at:openedAt
      });
    }
    save.gacha.history = save.gacha.history.slice(0, 50);
    // The Gacha owns its reveal sequence. Suppress the generic save-diff
    // detector here so the same reward is not queued a second time.
    if (window.CHERRIFT_REWARDS?.withSuppressed) CHERRIFT_REWARDS.withSuppressed(() => saveProgress(save));
    else saveProgress(save);
    render();
    showOpening(state.tier, rewards);
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

  function removeLegacyUi() {
    id("economyV11Floating")?.remove();
    id("economyV11DesktopBtn")?.remove();
    const oldPanel = id("economyV11");
    if (oldPanel) oldPanel.remove();
    qa('[data-tier="legendary"],[data-chest="legendary"],[data-v082-chest="legendary"],.legendary-chest').forEach(element => element.remove());
  }

  function installRouting() {
    if (!window.UI?.open || UI.__cherriftEquipmentChestRoute) return;
    const previousOpen = UI.open.bind(UI);
    state.originalOpen = previousOpen;
    UI.open = function openEquipmentChests(route, ...args) {
      if (route === "gachaV082") {
        openPanel(args[0]?.tier || state.tier);
        return;
      }
      const result = previousOpen(route, ...args);
      id("gachaChestOnlyV12")?.classList.add("hidden");
      document.body.classList.remove("gacha-open");
      return result;
    };
    UI.__cherriftEquipmentChestRoute = true;
  }

  function start() {
    if (!window.UI || !window.CherriftStorage || !window.CHERRIFT_DATA) return setTimeout(start, 120);
    ensureCss();
    patchStorage();
    installRouting();
    if (UI.save) normalize(UI.save);
    ensurePanel();
    removeLegacyUi();
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
