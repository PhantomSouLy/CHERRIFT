(() => {
  "use strict";
  if (window.__CHERRIFT_BUGFIX_V0941__) return;
  window.__CHERRIFT_BUGFIX_V0941__ = true;

  const VERSION = "0.9.4.7-account-mail";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const num = value => Math.max(0, Math.floor(Number(value) || 0));
  const isMobile = () => window.CHERRIFT_WORLD_UI?.isMobile?.() || matchMedia("(max-width:820px)").matches;
  const state = {
    previousOpen: null,
    mailView: "list",
    selectedMailId: "",
    titleOwnedOnly: false,
    settingsRedeemBusy: false,
    observer: null,
    observerTimer: 0,
    stageArtToken: 0
  };

  const COPY = {
    hu: {
      mail: "Mail", inbox: "Beérkezett levelek", unread: "olvasatlan", claimAll: "Összes átvétele", delete: "Törlés", deleteAll: "Összes törlése",
      noMail: "Nincs megjeleníthető levél.", back: "Vissza", claim: "Átvétel", claimed: "Átvéve",
      deleteConfirm: "Biztosan törlöd ezt a levelet?", deleteAllConfirm: "Biztosan törlöd az összes törölhető levelet?", deleteBlocked: "Előbb vedd át a levél jutalmát.", deleted: "Levél törölve", protectedMail: "jutalmas levél megtartva",
      reward: "Jutalom", redeemCode: "Redeem Code", redeemHint: "Írd be a beváltókódot.",
      confirm: "Confirm", cancel: "Back", invalidCode: "Adj meg egy érvényes kódot.", redeemSuccess: "A kupon jutalma megérkezett.",
      account: "Fiók", displayName: "Megjelenített név", discord: "Discord", level: "Szint", cherrySkin: "Cherry skin",
      statDetails: "Részletes statok", achievements: "Teljesítmények", kills: "Ölések", stageClears: "Pályateljesítések",
      totalXp: "Összes XP", gear: "Felszerelés", gacha: "Gacha", arsenalAvg: "Arsenal átlag", power: "Erő",
      titles: "Cím választása", titleCollection:"Címgyűjtemény", noTitle:"[Nincs Title]", owned: "Megszerezve", equip: "Felszerelés", equipped: "Aktív", locked: "Nincs megszerezve",
      editName: "Megjelenített név szerkesztése", save: "Mentés", nameRule: "3–24 karakter használható.",
      currentSkin: "Jelenlegi skin", gearEquipments: "Felszerelések", titleStats: "Title Stats", titleStatsEmpty: "Title stat bónuszok még nem érhetők el.", totalTitleStats: "Összesített title statok",
      activeTitleStats:"Aktív Title", ownedTitleBonuses:"Megszerezett Title bónuszok"
    },
    en: {
      mail: "Mail", inbox: "Inbox", unread: "unread", claimAll: "Claim All", delete: "Delete", deleteAll: "Delete All",
      noMail: "There are no messages to show.", back: "Back", claim: "Claim", claimed: "Claimed",
      deleteConfirm: "Delete this mail?", deleteAllConfirm: "Delete every eligible mail?", deleteBlocked: "Claim this mail's reward first.", deleted: "Mail deleted", protectedMail: "reward mail kept",
      reward: "Reward", redeemCode: "Redeem Code", redeemHint: "Enter your redeem code.",
      confirm: "Confirm", cancel: "Back", invalidCode: "Enter a valid code.", redeemSuccess: "The redeem reward has been added.",
      account: "Account", displayName: "Display Name", discord: "Discord", level: "Level", cherrySkin: "Cherry Skin",
      statDetails: "Stat Details", achievements: "Achievements", kills: "Kills", stageClears: "Stage Clears",
      totalXp: "Total XP", gear: "Gear", gacha: "Gacha", arsenalAvg: "Arsenal Avg", power: "Power",
      titles: "Select Title", noTitle:"[No Title]", owned: "Owned", equip: "Equip", equipped: "Equipped", locked: "Not owned",
      editName: "Edit Display Name", save: "Save", nameRule: "Use 3–24 characters.",
      currentSkin: "Current Skin", gearEquipments: "Gear Equipments", titleCollection:"Title Collection", titleStats: "Title Stats", titleStatsEmpty: "Title stat bonuses are not available yet.", totalTitleStats: "Total title stats",
      activeTitleStats:"Active Title", ownedTitleBonuses:"Owned Title bonuses"
    }
  };

  function language() {
    return window.CHERRIFT_I18N?.language === "en" || window.CHERRIFT_LOCALIZATION?.language?.() === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }
  function t(key) { return COPY[language()][key] || COPY.en[key] || key; }
  function localize(value) {
    const raw = String(value ?? "");
    if (!raw) return "";
    for (const api of [window.CHERRIFT_LOCALIZATION, window.CHERRIFT_I18N]) {
      try {
        const translated = api?.t?.(raw);
        if (translated && translated !== raw) return translated;
      } catch (_) {}
    }
    return raw;
  }
  function saveLocal() {
    if (!window.UI?.save) return;
    try { window.CherriftStorage?.save?.(UI.save); } catch (error) { console.warn("[CHERRIFT Bugfix] save failed", error); }
    UI.refreshMenu?.();
    window.dispatchEvent(new CustomEvent("cherrift:savechange", { detail: { source: "bugfix-ui" } }));
  }
  function toast(message) { window.UI?.toast?.(message); }
  function openRoute(panel) {
    if (window.CHERRIFT_STABILITY?.open) return window.CHERRIFT_STABILITY.open(panel);
    return state.previousOpen?.(panel);
  }

  function ensureCss() {
    if (id("cherriftBugfixV0941Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftBugfixV0941Css";
    style.textContent = `
      #economyV11Floating,#economyV11DesktopBtn,.economy-nav-v11,#redeemLiveV1{display:none!important;pointer-events:none!important}
      [data-resource="keys"],[data-resource-id^="key."],[data-currency="keys"],.resource-key,.currency-key{display:none!important;pointer-events:none!important}
      [data-tier="legendary"],[data-chest="legendary"],[data-v082-chest="legendary"],[data-v084-bag-item="chest:legendary"],.legendary-chest{display:none!important;pointer-events:none!important}
      .bf-panel{overflow-y:auto!important;overflow-x:hidden!important;min-height:100dvh;padding-bottom:130px;color:#fff;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}
      .bf-shell{width:min(980px,100%);margin:0 auto;padding:18px 18px 140px}.bf-head{display:flex;align-items:center;gap:16px;margin-bottom:18px}.bf-head h2{margin:0;font:700 clamp(42px,8vw,64px)/1 Georgia,serif}.bf-back{width:72px;height:72px;border:1px solid #ffffff26;border-radius:22px;color:#fff;background:#ffffff08;font-size:28px}
      .bf-card{border:1px solid #ffffff22;border-radius:25px;background:linear-gradient(145deg,#2a102fdd,#100715ed);box-shadow:0 20px 70px #0005}.bf-button{min-height:52px;padding:0 18px;border:0;border-radius:15px;color:#fff;background:linear-gradient(115deg,#d52f7d,#ec70aa);font-weight:1000}.bf-button:disabled{opacity:.42}.bf-button.secondary{border:1px solid #ffffff25;background:#ffffff08}.bf-button.danger{border:1px solid #ff8b9f55;background:linear-gradient(115deg,#8f2948,#c44163)}
      .mail-toolbar-bf{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 20px;border-bottom:1px solid #ffffff18}.mail-toolbar-bf h3{margin:0;font:700 30px Georgia,serif}.mail-toolbar-actions-bf{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.mail-toolbar-actions-bf .bf-button{min-height:46px;padding:0 13px}.mail-list-bf{display:grid}.mail-row-bf{width:100%;min-height:92px;display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;gap:14px;padding:15px 20px;border:0;border-bottom:1px solid #ffffff12;color:#fff;background:transparent;text-align:left}.mail-row-bf:hover{background:#ffffff05}.mail-row-bf.unread{background:linear-gradient(90deg,#dc3c8612,transparent)}.mail-dot-bf{width:9px;height:9px;border-radius:50%;background:transparent}.mail-row-bf.unread .mail-dot-bf{background:#f05aa5;box-shadow:0 0 14px #f05aa5}.mail-row-bf b,.mail-row-bf small{display:block}.mail-row-bf small{margin-top:5px;color:#c7aebd}.mail-reward-mark-bf{color:#ff9acb;font-size:21px}.mail-empty-bf{padding:50px 20px;text-align:center;color:#c7aebd}.mail-detail-bf{padding:23px}.mail-detail-bf header{border-bottom:1px solid #ffffff18;padding-bottom:18px}.mail-detail-bf h3{margin:7px 0;font:700 clamp(34px,7vw,52px) Georgia,serif}.mail-detail-bf .meta{color:#c9aebe}.mail-body-bf{min-height:160px;padding:24px 0;white-space:pre-wrap;line-height:1.65}.mail-reward-bf{padding:16px;border:1px solid #ff9bc84a;border-radius:17px;background:#e2448710}.mail-actions-bf{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
      .bf-modal{position:fixed;inset:0;z-index:100100;display:grid;place-items:center;padding:17px;background:#07030ce9;backdrop-filter:blur(9px)}.bf-modal.hidden{display:none!important}.bf-modal-card{position:relative;width:min(620px,100%);max-height:90dvh;overflow:auto;padding:24px;border:1px solid #ffffff28;border-radius:27px;background:linear-gradient(150deg,#32123bea,#100716);box-shadow:0 28px 90px #0009}.bf-modal-card h3{margin:0 44px 8px 0;font:700 34px Georgia,serif}.bf-x{position:absolute;right:15px;top:15px;width:42px;height:42px;border:1px solid #ffffff22;border-radius:13px;color:#fff;background:#ffffff08;font-size:20px}.bf-form{display:grid;gap:12px;margin-top:18px}.bf-form input{width:100%;min-height:55px;padding:0 15px;border:1px solid #ffffff28;border-radius:15px;color:#fff;background:#09040dc7;font-size:17px;outline:none}.bf-form-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bf-status{min-height:20px;margin:0;color:#f2afd0}
      .settings-account-bf{margin-top:14px;padding:18px}.settings-account-bf h3{margin:0 0 5px}.settings-account-bf p{color:#cbb2c1}.settings-account-bf .bf-button{width:100%}
      .profile-hero-bf{display:grid;grid-template-columns:128px minmax(0,1fr);gap:24px;padding:24px;border-left:5px solid #ee5da7}.profile-avatar-column-bf{display:grid;align-content:start;gap:10px}.profile-avatar-bf{width:128px;height:128px;overflow:hidden;border:2px solid #ffb3d5;border-radius:28px;background:#ffffff0b}.profile-avatar-bf img{width:100%;height:100%;object-fit:cover}.profile-title-stats-button-bf{width:100%;min-height:42px;padding:0 8px;border:1px solid #ff9dcc55;border-radius:12px;color:#fff;background:#ffffff08;font-size:12px;font-weight:1000;white-space:nowrap}.profile-name-row-bf,.profile-title-row-bf{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.profile-name-row-bf h3{margin:0;color:#ffd17b;font:700 clamp(36px,7vw,58px) Georgia,serif;overflow-wrap:anywhere}.profile-title-row-bf{margin-top:7px;color:#ff8fc6;font-size:22px;font-weight:900}.profile-mini-edit-bf{width:35px;height:35px;border:1px solid #ffffff20;border-radius:10px;color:#fff;background:#ffffff08}.profile-lines-bf{display:grid;gap:4px;margin-top:13px;color:#d5bdca}.profile-discord-bf{margin-top:10px;color:#9f8996;font-size:12px}.profile-stat-button-bf{grid-column:1/-1;margin-top:8px}.profile-stats-bf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:18px 0}.profile-stat-bf{min-height:125px;display:grid;place-items:center;padding:16px;text-align:center}.profile-stat-bf small{color:#d3a7bd;font-weight:900;letter-spacing:1.2px;text-transform:uppercase}.profile-stat-bf b{display:block;margin-top:7px;font:700 45px Georgia,serif}.title-stats-list-bf{display:grid;gap:9px;margin-top:16px}.title-stats-row-bf,.title-stats-total-bf{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:13px;border-radius:14px;background:#ffffff07}.title-stats-total-bf{margin-top:14px;border:1px solid #ff9dcc55;background:#e04b9012}.title-stats-empty-bf{padding:26px 12px;color:#cfb4c2;text-align:center}
      .title-toolbar-bf{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0}.title-toggle-bf{display:flex;align-items:center;gap:9px}.title-list-bf{display:grid;gap:9px;max-height:60dvh;overflow-y:auto;padding-right:4px}.title-row-bf{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px;border:1px solid #ffffff1d;border-radius:15px;background:#ffffff06}.title-row-bf.locked{opacity:.48;filter:grayscale(1)}.title-row-bf strong,.title-row-bf small{display:block}.title-row-bf small{margin-top:4px;color:#c6abb9}.title-row-bf button{min-width:100px;min-height:42px;border:0;border-radius:12px;color:#fff;background:#cf367b;font-weight:900}.title-row-bf button:disabled{background:#ffffff12}.rarity-common{color:#f5ebf1}.rarity-uncommon{color:#86ed9d}.rarity-rare{color:#77c8ff}.rarity-epic{color:#d591ff}.rarity-legendary{color:#ffd36e}
      #arsenalV070:not(.hidden){position:fixed!important;inset:0!important;display:block!important;height:100dvh!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;padding-bottom:160px!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
      #arsenalV070:not(.hidden)>*{touch-action:pan-y}#arsenalV070 button,#arsenalV070 input{touch-action:manipulation}
      #gear [class*="pedestal"],#gear [class*="stage-base"],#gear [class*="ground-shadow"]{display:none!important}#gear .gear-stage-rune-v0560::after{display:none!important}
      #gear #gearCherryCanvasV0560,#gear #gearCherryStableV060{transform:scale(1.12);transform-origin:center center;max-width:42vw!important;max-height:42vw!important}
      #gear .gear-stats-v0560,#gear [class*="stat-strip"]{font-size:1.12em}#gear [class*="stat"] small,#gear [class*="stat"] span{font-size:10px!important}#gear [class*="stat"] b,#gear [class*="stat"] strong{font-size:24px!important}.gear-stat-emphasis-bf small{font-size:10px!important}.gear-stat-emphasis-bf b{font-size:24px!important}
      .mobile-chapter-stars-v0932 small{display:none!important}.mobile-chapter-stars-v0932 span{font-size:34px!important;letter-spacing:7px!important}.mobile-chapter-stars-v0932{justify-content:center!important}
      #menu .mobile-stage-copy-v051{display:none!important}.world-badge-on-gate-bf{position:absolute!important;z-index:8!important;top:8px!important;left:50%!important;transform:translateX(-50%)!important;margin:0!important}
      #menu .mobile-character-display-v051 .mobile-stage-art{background-position:center!important;background-size:cover!important;background-repeat:no-repeat!important}
      @media(max-width:820px){.bf-shell{padding:12px 12px 120px}.bf-head h2{font-size:48px}.bf-back{width:64px;height:64px}.mail-toolbar-bf{padding:14px;align-items:flex-start}.mail-toolbar-bf h3{font-size:27px}.mail-toolbar-actions-bf{max-width:56%}.mail-toolbar-actions-bf .bf-button{min-height:40px;padding:0 9px;font-size:11px}.mail-row-bf{padding:13px 14px}.profile-hero-bf{grid-template-columns:96px minmax(0,1fr);gap:15px;padding:18px}.profile-avatar-bf{width:96px;height:96px;border-radius:23px}.profile-title-stats-button-bf{min-height:38px;font-size:10px}.profile-stat-bf{min-height:105px}.profile-stat-bf b{font-size:37px}.bf-form-actions,.mail-actions-bf{grid-template-columns:1fr}#menu .mobile-floating-actions-v051.left{display:none!important}#menu .mobile-floating-actions-v051.right{display:grid!important;align-content:start!important;padding-top:0!important}.mobile-floating-actions-v051{align-content:start!important}.mobile-floating-actions-v051 button[data-bf-removed="true"]{display:none!important}.mobile-nav-v090 .cherry-nav-bf img{width:28px;height:28px;border-radius:8px;object-fit:cover}.mobile-nav-v090 .cherry-nav-bf span{overflow:hidden!important}}
      @media(min-width:821px){.profile-stats-bf{grid-template-columns:repeat(4,minmax(0,1fr))}.profile-stat-bf{min-height:140px}.bf-shell{padding-bottom:70px}}
    `;
    document.head.appendChild(style);
  }

  function hideAppPanels(target) {
    qa("#app > section").forEach(section => {
      if (section === target) section.classList.remove("hidden");
      else if (!["hud", "stageHud"].includes(section.id)) section.classList.add("hidden");
    });
    document.body.classList.remove("is-playing", "reward-open-v083");
    document.body.style.overflow = "";
  }

  // -----------------------------------------------------------------------
  // Mail
  // -----------------------------------------------------------------------
  function mailboxState(mailId) {
    const save = window.UI?.save;
    if (!save) return { read: false, claimed: false, deleted: false };
    save.mailbox = save.mailbox && typeof save.mailbox === "object" ? save.mailbox : {};
    save.mailbox.states = save.mailbox.states && typeof save.mailbox.states === "object" ? save.mailbox.states : {};
    save.mailbox.states[mailId] = save.mailbox.states[mailId] && typeof save.mailbox.states[mailId] === "object" ? save.mailbox.states[mailId] : { read: false, claimed: false, deleted: false };
    return save.mailbox.states[mailId];
  }

  function localMails() {
    const catalog = Array.isArray(window.CHERRIFT_V063?.mailCatalog) ? window.CHERRIFT_V063.mailCatalog : [];
    const hiddenLegacy = new Set(["mailwelcometitle", "mailgifttitle", "welcome_mail", "gift_mail"]);
    return catalog.filter(entry => {
      if (!entry || entry.__gmLive === true) return false;
      const markers = [entry.id, entry.titleKey, entry.title].map(value => String(value || "").trim().toLowerCase());
      return !markers.some(value => hiddenLegacy.has(value));
    }).map((entry, index) => {
      const mailId = String(entry.id || `local:${index}`);
      const status = mailboxState(mailId);
      return {
        id: mailId,
        type: "local",
        title: localize(entry.titleKey || entry.title || "System Mail"),
        body: localize(entry.bodyKey || entry.body || ""),
        sender: entry.sender || "CHERRIFT System",
        date: entry.created_at || entry.date || entry.version || "",
        attachments: entry.attachments || null,
        read: status.read === true,
        claimed: status.claimed === true,
        deleted: status.deleted === true
      };
    });
  }

  function liveMails() {
    return (window.CHERRIFT_LIVE_SERVICES?.messages || []).map(message => {
      const mailId = String(message.id);
      const status = mailboxState(mailId);
      return {
        id: mailId,
        type: "live",
        title: language() === "en" ? message.title_en || message.title_hu : message.title_hu || message.title_en,
        body: language() === "en" ? message.body_en || message.body_hu : message.body_hu || message.body_en,
        sender: "CHERRIFT System · GM Mail",
        date: message.created_at || "",
        attachments: message.attachments || null,
        read: message.read === true || status.read === true,
        claimed: message.claimed === true || status.claimed === true,
        deleted: status.deleted === true
      };
    });
  }

  function allMails() {
    return [...liveMails(), ...localMails()].filter(mail => !mail.deleted);
  }

  function rewardParts(reward) {
    if (!reward || typeof reward !== "object") return [];
    const parts = [];
    const catalog = new Map((window.CHERRIFT_LIVE_SERVICES?.catalog || []).map(row => [row.id, row]));
    const aliases = { "key.common": "chest.common", "key.rare": "chest.rare", "key.epic": "chest.epic", "key.legendary": "chest.legendary" };
    const resources = { ...(reward.resources || {}) };
    if (reward.coins) resources["currency.coins"] = num(resources["currency.coins"]) + num(reward.coins);
    if (reward.keys) resources["chest.common"] = num(resources["chest.common"]) + num(reward.keys);
    for (const [rawId, amount] of Object.entries(resources)) {
      const resourceId = aliases[rawId] || rawId;
      if (resourceId === "chest.legendary") continue;
      const row = catalog.get(resourceId);
      const fallback = {
        "currency.coins": ["🪙", "Coin"], "currency.blossom_gems": ["💎", "Blossom Gem"], "currency.sakura_essence": ["🌸", "Sakura Essence"],
        "chest.common": ["📦", "Common Chest"], "chest.rare": ["🧰", "Rare Chest"], "chest.epic": ["🎁", "Epic Chest"]
      }[resourceId] || ["•", resourceId];
      parts.push(`${row?.metadata?.icon || fallback[0]} ${num(amount)} ${language() === "en" ? row?.label_en || fallback[1] : row?.label_hu || fallback[1]}`);
    }
    if (Array.isArray(reward.skins)) for (const skin of reward.skins) parts.push(`🐰 ${skin}`);
    return parts;
  }

  function ensureMailPanel() {
    let panel = id("mailBugfixV0941");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "mailBugfixV0941";
    panel.className = "panel bf-panel hidden";
    panel.innerHTML = `<div class="bf-shell"><header class="bf-head"><button type="button" class="bf-back" data-mail-home>←</button><div><h2>${t("mail")}</h2></div></header><div id="mailBugfixBody" class="bf-card"></div></div>`;
    id("app")?.appendChild(panel);
    panel.addEventListener("click", async event => {
      if (event.target.closest("[data-mail-home]")) return state.mailView === "detail" ? showMailList() : openRoute("menu");
      const row = event.target.closest("[data-mail-id]");
      if (row) return showMailDetail(row.dataset.mailId);
      if (event.target.closest("[data-mail-detail-back]")) return showMailList();
      if (event.target.closest("[data-mail-claim]")) return claimSelectedMail(event.target.closest("[data-mail-claim]"));
      if (event.target.closest("[data-mail-claim-all]")) return claimAllMail(event.target.closest("[data-mail-claim-all]"));
      if (event.target.closest("[data-mail-delete]")) return deleteSelectedMail(event.target.closest("[data-mail-delete]"));
      if (event.target.closest("[data-mail-delete-all]")) return deleteAllMail(event.target.closest("[data-mail-delete-all]"));
    });
    return panel;
  }

  function showMailList() {
    state.mailView = "list";
    state.selectedMailId = "";
    const body = id("mailBugfixBody");
    if (!body) return;
    const mails = allMails();
    const unread = mails.filter(mail => !mail.read).length;
    const claimable = mails.filter(mail => rewardParts(mail.attachments).length && !mail.claimed).length;
    const deletable = mails.filter(mail => !rewardParts(mail.attachments).length || mail.claimed).length;
    body.innerHTML = `<header class="mail-toolbar-bf"><div><h3>${t("inbox")}</h3><small>${unread} ${t("unread")}</small></div><div class="mail-toolbar-actions-bf"><button type="button" class="bf-button" data-mail-claim-all ${claimable ? "" : "disabled"}>${t("claimAll")}</button><button type="button" class="bf-button danger" data-mail-delete-all ${deletable ? "" : "disabled"}>${t("deleteAll")}</button></div></header><div class="mail-list-bf">${mails.length ? mails.map(mail => `<button type="button" class="mail-row-bf ${mail.read ? "" : "unread"}" data-mail-id="${esc(mail.id)}"><span class="mail-dot-bf"></span><span><b>${esc(mail.title)}</b><small>${esc(mail.sender)}${mail.date ? ` · ${esc(formatDate(mail.date))}` : ""}</small></span><span class="mail-reward-mark-bf">${rewardParts(mail.attachments).length ? (mail.claimed ? "✓" : "✦") : "›"}</span></button>`).join("") : `<div class="mail-empty-bf">${t("noMail")}</div>`}</div>`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString(language() === "hu" ? "hu-HU" : "en-US") : String(value || "");
  }

  async function showMailDetail(mailId) {
    const mail = allMails().find(item => item.id === mailId);
    if (!mail) return showMailList();
    state.mailView = "detail";
    state.selectedMailId = mailId;
    if (mail.type === "live" && !mail.read) {
      try { await window.CHERRIFT_LIVE_SERVICES?.markRead?.(mail.id); } catch (_) {}
    } else if (mail.type === "local" && !mail.read) {
      mailboxState(mail.id).read = true;
      saveLocal();
    }
    const rewards = rewardParts(mail.attachments);
    const canDelete = !rewards.length || mail.claimed;
    const body = id("mailBugfixBody");
    body.innerHTML = `<article class="mail-detail-bf"><header><small>${esc(mail.sender)}${mail.date ? ` · ${esc(formatDate(mail.date))}` : ""}</small><h3>${esc(mail.title)}</h3></header><div class="mail-body-bf">${esc(mail.body)}</div>${rewards.length ? `<section class="mail-reward-bf"><b>${t("reward")}</b><p>${esc(rewards.join(" · "))}</p></section>` : ""}<div class="mail-actions-bf"><button type="button" class="bf-button secondary" data-mail-detail-back>${t("back")}</button>${rewards.length ? `<button type="button" class="bf-button" data-mail-claim ${mail.claimed ? "disabled" : ""}>${mail.claimed ? t("claimed") : t("claim")}</button>` : ""}<button type="button" class="bf-button danger" data-mail-delete ${canDelete ? "" : "disabled"} title="${canDelete ? "" : esc(t("deleteBlocked"))}">${t("delete")}</button></div></article>`;
  }

  async function claimOne(mail) {
    if (!mail || mail.claimed || !rewardParts(mail.attachments).length) return;
    if (mail.type === "live") {
      await window.CHERRIFT_LIVE_SERVICES?.claimMail?.(mail.id);
      return;
    }
    window.CHERRIFT_ECONOMY_V11?.applyReward?.(UI.save, mail.attachments);
    const status = mailboxState(mail.id);
    status.read = true;
    status.claimed = true;
    saveLocal();
  }

  async function claimSelectedMail(button) {
    const mail = allMails().find(item => item.id === state.selectedMailId);
    if (!mail || button.disabled) return;
    button.disabled = true;
    const before = button.textContent;
    button.textContent = "…";
    try {
      await claimOne(mail);
      toast(t("claimed"));
      await showMailDetail(mail.id);
    } catch (error) {
      toast(String(error.message || error));
      button.disabled = false;
      button.textContent = before;
    }
  }

  async function claimAllMail(button) {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "…";
    const mails = allMails().filter(mail => !mail.claimed && rewardParts(mail.attachments).length);
    let claimed = 0;
    for (const mail of mails) {
      try { await claimOne(mail); claimed += 1; } catch (error) { console.warn("[CHERRIFT Mail] claim all item failed", error); }
    }
    toast(`${claimed} ${t("claimed")}`);
    showMailList();
  }

  function confirmAction(message) {
    try { return typeof window.confirm !== "function" || window.confirm(message); }
    catch (_) { return true; }
  }

  function mailCanDelete(mail) {
    return !!mail && (!rewardParts(mail.attachments).length || mail.claimed === true);
  }

  function markMailDeleted(mail) {
    const status = mailboxState(mail.id);
    status.read = true;
    status.deleted = true;
  }

  function deleteSelectedMail(button) {
    const mail = allMails().find(item => item.id === state.selectedMailId);
    if (!mail || button?.disabled) return;
    if (!mailCanDelete(mail)) {
      toast(t("deleteBlocked"));
      return;
    }
    if (!confirmAction(t("deleteConfirm"))) return;
    markMailDeleted(mail);
    saveLocal();
    toast(t("deleted"));
    showMailList();
  }

  function deleteAllMail(button) {
    if (button?.disabled) return;
    const mails = allMails();
    const deletable = mails.filter(mailCanDelete);
    const protectedCount = mails.length - deletable.length;
    if (!deletable.length || !confirmAction(t("deleteAllConfirm"))) return;
    for (const mail of deletable) markMailDeleted(mail);
    saveLocal();
    toast(`${deletable.length} ${t("deleted")}${protectedCount ? ` · ${protectedCount} ${t("protectedMail")}` : ""}`);
    showMailList();
  }

  async function openMail() {
    const panel = ensureMailPanel();
    hideAppPanels(panel);
    window.CHERRIFT_STABILITY?.syncNav?.("more");
    showMailList();
    panel.scrollTop = 0;
    window.CHERRIFT_LIVE_SERVICES?.refreshMail?.({ silent: true });
  }

  // -----------------------------------------------------------------------
  // Settings / Redeem
  // -----------------------------------------------------------------------
  function ensureRedeemModal() {
    let modal = id("redeemBugfixModalV0941");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "redeemBugfixModalV0941";
    modal.className = "bf-modal hidden";
    modal.innerHTML = `<div class="bf-modal-card"><button type="button" class="bf-x" data-redeem-close>×</button><h3>${t("redeemCode")}</h3><p>${t("redeemHint")}</p><form class="bf-form" id="redeemBugfixForm"><input id="redeemBugfixInput" maxlength="64" autocomplete="off" autocapitalize="characters" placeholder="SUMMER2026"><p id="redeemBugfixStatus" class="bf-status"></p><div class="bf-form-actions"><button type="button" class="bf-button secondary" data-redeem-close>${t("cancel")}</button><button type="submit" class="bf-button" id="redeemBugfixConfirm">${t("confirm")}</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => { if (event.target === modal || event.target.closest("[data-redeem-close]")) modal.classList.add("hidden"); });
    q("form", modal).addEventListener("submit", async event => {
      event.preventDefault();
      if (state.settingsRedeemBusy) return;
      const input = id("redeemBugfixInput");
      const status = id("redeemBugfixStatus");
      const button = id("redeemBugfixConfirm");
      const code = input.value.trim();
      if (code.length < 8) { status.textContent = t("invalidCode"); return; }
      state.settingsRedeemBusy = true;
      button.disabled = true;
      status.textContent = "…";
      try {
        await window.CHERRIFT_LIVE_SERVICES?.redeem?.(code);
        input.value = "";
        status.textContent = t("redeemSuccess");
        toast(t("redeemSuccess"));
      } catch (error) {
        status.textContent = String(error.message || error);
      } finally {
        state.settingsRedeemBusy = false;
        button.disabled = false;
      }
    });
    return modal;
  }

  function patchSettings() {
    const settings = id("settings");
    if (!settings || settings.classList.contains("hidden") || id("settingsAccountBugfixV0941")) return;
    const tabs = q(".settings-tabs-v060", settings);
    const content = q(".settings-content-v060", settings);
    let accountPage = qa(".settings-page-v060", settings).find(page => {
      const marker = `${page.id} ${page.dataset.settingsPage || ""} ${q("h3", page)?.textContent || ""}`.toLowerCase();
      return marker.includes("account") || marker.includes("fiók");
    });
    let accountTab = tabs ? qa("button", tabs).find(button => {
      const marker = `${button.dataset.settingsTab || ""} ${button.textContent}`.toLowerCase();
      return marker.includes("account") || marker.includes("fiók");
    }) : null;

    if (!accountPage && tabs && content) {
      accountPage = document.createElement("section");
      accountPage.id = "settingsAccountPageBugfixV0941";
      accountPage.className = "settings-page-v060";
      accountPage.dataset.settingsPage = "account-bugfix";
      accountPage.innerHTML = `<header><small>CHERRIFT ACCOUNT</small><h3>${t("account")}</h3><p>${t("redeemHint")}</p></header>`;
      content.appendChild(accountPage);
      accountTab = document.createElement("button");
      accountTab.type = "button";
      accountTab.dataset.settingsTab = "account-bugfix";
      accountTab.innerHTML = `<i>◉</i><b>${t("account")}</b>`;
      tabs.appendChild(accountTab);
      accountTab.addEventListener("click", () => {
        qa("button", tabs).forEach(button => button.classList.remove("active"));
        qa(".settings-page-v060", content).forEach(page => page.classList.remove("active"));
        accountTab.classList.add("active");
        accountPage.classList.add("active");
      });
    }

    const host = accountPage || content || settings;
    const card = document.createElement("section");
    card.id = "settingsAccountBugfixV0941";
    card.className = "bf-card settings-account-bf";
    card.innerHTML = `<h3>${t("account")}</h3><p>${t("displayName")}: <strong>${esc(displayName())}</strong></p><div class="bf-form-actions"><button type="button" class="bf-button secondary" data-settings-display-name>${t("editName")}</button><button type="button" class="bf-button" data-settings-redeem>${t("redeemCode")}</button></div>`;
    q("[data-settings-display-name]", card).onclick = () => openNameModal();
    q("[data-settings-redeem]", card).onclick = () => ensureRedeemModal().classList.remove("hidden");
    host.appendChild(card);
  }


  // -----------------------------------------------------------------------
  // Profile / titles
  // -----------------------------------------------------------------------
  function authAccount() {
    try { return window.CHERRIFT_AUTH?.getState?.().account || {}; } catch (_) { return {}; }
  }
  function selectedSkin() {
    const skinId = UI.save?.selectedSkin || "base_cherry";
    return (window.CHERRIFT_DATA?.skins || []).find(skin => skin.id === skinId) || { id: skinId, name: skinId, icon: "" };
  }
  function displayName() {
    const save = UI.save;
    save.profile = save.profile && typeof save.profile === "object" ? save.profile : {};
    return save.profile.displayName || authAccount().displayName || authAccount().name || authAccount().username || "Cherry Player";
  }
  function activeTitle() {
    return UI.save?.profile?.activeTitle || UI.save?.activeTitle || UI.save?.selectedTitle || (language() === "hu" ? "Nincs Title" : "No Title");
  }
  function prettyTitle(value) {
    const raw = String(value || "").trim();
    if (!raw) return language() === "hu" ? "Nincs Title" : "No Title";
    const localized = localize(raw);
    const source = localized && localized !== raw ? localized : raw;
    return source.replace(/[_-]+/g, " ").replace(/\b\p{L}/gu, letter => letter.toUpperCase());
  }
  function activeTitleName() {
    const current = activeTitle();
    const match = titleCatalog().find(title => title.id === current || title.name === current);
    return prettyTitle(match?.name || current);
  }
  function titleSources() {
    if (Array.isArray(window.CHERRIFT_TITLES)) return [window.CHERRIFT_TITLES];
    return [window.CHERRIFT_DATA?.titles, window.CHERRIFT_V082?.titles, window.CHERRIFT_V082?.titleCatalog, window.CHERRIFT_V084?.titles, window.UI?.titleCatalog];
  }
  function titleCatalog() {
    const found = new Map();
    const add = (entry, key = "") => {
      if (typeof entry === "string") entry = { id: entry, name: entry };
      if (!entry || typeof entry !== "object") return;
      const titleId = String(entry.id || entry.key || key || entry.name || entry.title || "").trim();
      if (!titleId) return;
      found.set(titleId, {
        id: titleId,
        name: prettyTitle(localize(entry.nameKey || entry.name || entry.title || titleId)),
        rarity: String(entry.rarity || "Common"),
        bonus: localize(entry.bonusKey || entry.bonus || entry.description || ""),
        stats: entry.stats || entry.statBonuses || entry.bonuses || null,
        owned: entry.owned === true || entry.unlocked === true
      });
    };
    for (const source of titleSources()) {
      if (Array.isArray(source)) source.forEach(entry => add(entry));
      else if (source && typeof source === "object") Object.entries(source).forEach(([key, entry]) => add(entry, key));
    }
    const owned = ownedTitleIds();
    for (const titleId of owned) if (![...found.values()].some(item => item.id === titleId || item.name === titleId)) add(titleId);
    add(activeTitle());
    return [...found.values()];
  }
  function ownedTitleIds() {
    const values = [UI.save?.unlockedTitles, UI.save?.ownedTitles, UI.save?.titles, UI.save?.profile?.ownedTitles];
    const set = new Set();
    for (const value of values) if (Array.isArray(value)) value.forEach(title => set.add(String(typeof title === "string" ? title : title?.id || title?.name || "")));
    set.add(String(activeTitle()));
    return set;
  }
  function titleOwned(title) {
    const owned = ownedTitleIds();
    return title.owned === true || owned.has(title.id) || owned.has(title.name);
  }
  function lifetimeStat(...paths) {
    for (const path of paths) {
      let value = UI.save;
      for (const key of path.split(".")) value = value?.[key];
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.floor(parsed);
    }
    return 0;
  }
  function achievementCount() {
    const value = UI.save?.achievements;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.values(value).filter(Boolean).length;
    return lifetimeStat("stats.achievements");
  }
  function stageClearCount() {
    const stages = UI.save?.stageStats;
    if (stages && typeof stages === "object") return Object.values(stages).reduce((sum, value) => sum + num(value?.clears), 0);
    return lifetimeStat("stageClears", "stats.stageClears");
  }
  function gearCount() { return (UI.save?.inventory?.length || 0) + Object.values(UI.save?.equipped || {}).filter(Boolean).length; }
  function gachaCount() { return lifetimeStat("economy.totalChestOpens", "gacha.totalOpens", "stats.gacha"); }
  function powerValue() { return lifetimeStat("power", "stats.power") || num(UI.game?.player?.power) || num(q("#gear [data-stat='power']")?.textContent); }
  function arsenalAverage() {
    const levels = Object.values(UI.save?.arsenal?.slots || UI.save?.arsenal?.levels || {}).map(value => Number(value?.level || value)).filter(Number.isFinite);
    return levels.length ? (levels.reduce((sum, value) => sum + value, 0) / levels.length).toFixed(1) : "0.0";
  }

  function ensureProfilePanel() {
    let panel = id("profileBugfixV0941");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "profileBugfixV0941";
    panel.className = "panel bf-panel hidden";
    id("app")?.appendChild(panel);
    panel.addEventListener("click", event => {
      if (event.target.closest("[data-profile-back]")) openRoute("menu");
      if (event.target.closest("[data-profile-title-edit]")) openTitleModal();
      if (event.target.closest("[data-profile-title-stats]")) openTitleStatsModal();
      if (event.target.closest("[data-profile-stats]")) openRoute("statSummaryV082");
    });
    return panel;
  }

  function renderProfile() {
    const panel = ensureProfilePanel();
    if (!panel || !UI.save) return;
    const account = authAccount();
    const skin = selectedSkin();
    const avatar = account.avatar || account.avatarUrl || account.avatar_url || skin.icon || skin.splash || "";
    const discordName = account.username || account.name || account.discordUsername || account.discord_id || account.discordId || "—";
    const level = lifetimeStat("account.level", "playerLevel", "level", "profile.level") || 1;
    const stats = [
      [t("achievements"), achievementCount()], [t("kills"), lifetimeStat("totalKills", "stats.kills", "lifetimeStats.kills")],
      [t("stageClears"), stageClearCount()], [t("totalXp"), lifetimeStat("totalXp", "xp", "stats.totalXp")],
      [t("gear"), gearCount()], [t("gacha"), gachaCount()], [t("arsenalAvg"), arsenalAverage()], [t("power"), powerValue()]
    ];
    panel.innerHTML = `<div class="bf-shell"><header class="bf-head"><button type="button" class="bf-back" data-profile-back>←</button><h2>${t("account")}</h2></header><section class="bf-card profile-hero-bf"><div class="profile-avatar-column-bf"><div class="profile-avatar-bf">${avatar ? `<img src="${esc(avatar)}" alt="">` : ""}</div><button type="button" class="profile-title-stats-button-bf" data-profile-title-stats>${esc(t("titleStats"))}</button></div><div><div class="profile-name-row-bf"><h3>${esc(displayName())}</h3></div><div class="profile-title-row-bf"><span>${esc(activeTitleName())}</span><button type="button" class="profile-mini-edit-bf" data-profile-title-edit aria-label="${esc(t("titles"))}">✎</button></div><div class="profile-lines-bf"><span>${t("level")}: ${level}</span><span>${t("cherrySkin")}: ${esc(skin.name || skin.id)}</span></div><div class="profile-discord-bf">${t("discord")}: ${esc(discordName)}</div></div><button type="button" class="bf-button profile-stat-button-bf" data-profile-stats>${t("statDetails")}</button></section><div class="profile-stats-bf">${stats.map(([label, value]) => `<article class="bf-card profile-stat-bf"><div><small>${esc(label)}</small><b>${esc(value)}</b></div></article>`).join("")}</div></div>`;
  }

  function openProfile() {
    const panel = ensureProfilePanel();
    hideAppPanels(panel);
    window.CHERRIFT_STABILITY?.syncNav?.("more");
    renderProfile();
    panel.scrollTop = 0;
  }

  function ensureNameModal() {
    let modal = id("profileNameModalV0941");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "profileNameModalV0941";
    modal.className = "bf-modal hidden";
    modal.innerHTML = `<div class="bf-modal-card"><button type="button" class="bf-x" data-name-close>×</button><h3>${t("editName")}</h3><p>${t("nameRule")}</p><form class="bf-form"><input id="profileDisplayNameInput" maxlength="24"><p class="bf-status" id="profileNameStatus"></p><div class="bf-form-actions"><button type="button" class="bf-button secondary" data-name-close>${t("cancel")}</button><button type="submit" class="bf-button">${t("save")}</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => { if (event.target === modal || event.target.closest("[data-name-close]")) modal.classList.add("hidden"); });
    q("form", modal).addEventListener("submit", event => {
      event.preventDefault();
      const input = id("profileDisplayNameInput");
      const status = id("profileNameStatus");
      const value = input.value.trim().replace(/\s+/g, " ");
      if (value.length < 3 || value.length > 24 || !/^[\p{L}\p{N} _.'-]+$/u.test(value)) { status.textContent = t("nameRule"); return; }
      UI.save.profile = UI.save.profile && typeof UI.save.profile === "object" ? UI.save.profile : {};
      UI.save.profile.displayName = value;
      saveLocal();
      modal.classList.add("hidden");
      renderProfile();
    });
    return modal;
  }
  function openNameModal() {
    const modal = ensureNameModal();
    id("profileDisplayNameInput").value = displayName();
    id("profileNameStatus").textContent = "";
    modal.classList.remove("hidden");
    id("profileDisplayNameInput").focus();
  }

  function titleStatEntries(title) {
    const source = title?.stats || title?.statBonuses || title?.bonuses;
    if (!source) return [];
    if (Array.isArray(source)) return source.map((entry, index) => ({
      key:String(entry?.key || entry?.stat || entry?.id || index),
      label:String(entry?.label || entry?.name || entry?.stat || entry?.key || index),
      value:entry?.value ?? entry?.amount ?? 0,
      unit:String(entry?.unit || "")
    })).filter(entry => entry.label && (Number(entry.value) || String(entry.value).trim()));
    if (typeof source === "object") {
      const labels={maxHp:"HP",damage:"ATK",allStats:language()==="hu"?"Minden stat":"All stats",coinGain:language()==="hu"?"Bónusz Coin":"Bonus Coin",chestLuck:language()==="hu"?"Láda szerencse":"Chest luck"};
      return Object.entries(source).map(([key, raw]) => {
        const percentage=key==="coinGain"||key==="chestLuck";
        return {key,label:labels[key]||key,value:percentage?Number(raw||0)*100:raw,unit:percentage?"%":""};
      }).filter(entry => Number(entry.value) || String(entry.value).trim());
    }
    return [];
  }

  function formatTitleStat(entry) {
    const numeric = Number(entry.value);
    if (Number.isFinite(numeric)) return `${numeric >= 0 ? "+" : ""}${numeric}${entry.unit}`;
    return String(entry.value || "");
  }

  function ensureTitleStatsModal() {
    let modal = id("profileTitleStatsModalV0945");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "profileTitleStatsModalV0945";
    modal.className = "bf-modal hidden";
    modal.innerHTML = `<div class="bf-modal-card"><button type="button" class="bf-x" data-title-stats-close>×</button><h3>${t("titleStats")}</h3><div id="profileTitleStatsBody"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("[data-title-stats-close]")) modal.classList.add("hidden");
    });
    return modal;
  }

  function openTitleStatsModal() {
    const modal = ensureTitleStatsModal();
    const root = id("profileTitleStatsBody");
    const titles = titleCatalog().filter(titleOwned).map(title => ({ title, stats:titleStatEntries(title) })).filter(entry => entry.stats.length);
    if (!titles.length) {
      root.innerHTML = `<p class="title-stats-empty-bf">${esc(t("titleStatsEmpty"))}</p>`;
    } else {
      const totals = new Map();
      for (const entry of titles) for (const stat of entry.stats) {
        const numeric = Number(stat.value);
        if (!Number.isFinite(numeric)) continue;
        const key = `${stat.key}:${stat.unit}`;
        const current = totals.get(key) || { ...stat, value:0 };
        current.value += numeric;
        totals.set(key, current);
      }
      const currentId=activeTitle();
      const active=titles.find(entry=>entry.title.id===currentId||entry.title.name===currentId);
      const totalValues=[...totals.values()];
      root.innerHTML = `<section class="title-stats-active-v096"><small>${esc(t("activeTitleStats"))}</small><h4>${esc(activeTitleName())}</h4><div class="title-stat-chips-v096">${active?.stats?.length?active.stats.map(stat=>`<span><b>${esc(stat.label)}</b><em>${esc(formatTitleStat(stat))}</em></span>`).join(""):`<span class="empty">${esc(t("titleStatsEmpty"))}</span>`}</div></section>
        <section class="title-stats-total-bf"><small>${esc(t("totalTitleStats"))}</small><div class="title-stat-chips-v096">${totalValues.length?totalValues.map(stat=>`<span><b>${esc(stat.label)}</b><em>${esc(formatTitleStat(stat))}</em></span>`).join(""):`<span class="empty">—</span>`}</div></section>
        <details class="title-stats-owned-v096"><summary>${esc(t("ownedTitleBonuses"))} <b>${titles.length}</b></summary><div class="title-stats-list-bf">${titles.map(entry => `<article class="title-stats-row-bf"><strong>${esc(entry.title.name)}</strong><span>${entry.stats.map(stat => `${esc(stat.label)} ${esc(formatTitleStat(stat))}`).join(" · ")}</span></article>`).join("")}</div></details>`;
    }
    modal.classList.remove("hidden");
  }

  function ensureTitleModal() {
    let modal = id("profileTitleModalV0941");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "profileTitleModalV0941";
    modal.className = "bf-modal hidden";
    modal.innerHTML = `<div class="bf-modal-card"><button type="button" class="bf-x" data-title-close>×</button><h3>${t("titles")}</h3><div class="title-toolbar-bf"><label class="title-toggle-bf"><input type="checkbox" id="profileTitleOwnedOnly"><span>${t("owned")}</span></label></div><div id="profileTitleList" class="title-list-bf"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("[data-title-close]")) modal.classList.add("hidden");
      const equip = event.target.closest("[data-title-equip]");
      if (equip) equipTitle(equip.dataset.titleEquip);
    });
    id("profileTitleOwnedOnly").addEventListener("change", event => { state.titleOwnedOnly = event.target.checked; renderTitleList(); });
    return modal;
  }
  function renderTitleList() {
    const root = id("profileTitleList");
    if (!root) return;
    const current = activeTitle();
    const titles = titleCatalog().filter(title => !state.titleOwnedOnly || titleOwned(title));
    const noTitle = `<article class="title-row-bf"><div><strong>${esc(t("noTitle") || "No Title")}</strong><small>${language()==="hu"?"A cím levétele":"Unequip the active title"}</small></div><button type="button" data-title-equip="" ${current ? "" : "disabled"}>${current ? (language()==="hu"?"Levétel":"Unequip") : t("equipped")}</button></article>`;
    root.innerHTML = noTitle + (titles.length ? titles.map(title => {
      const owned = titleOwned(title);
      const equipped = title.id === current || title.name === current;
      return `<article class="title-row-bf ${owned ? "" : "locked"}"><div><strong class="rarity-${esc(title.rarity.toLowerCase())}">[${esc(title.name)}]</strong>${title.bonus ? `<small>${esc(title.bonus)}</small>` : ""}</div><button type="button" data-title-equip="${esc(title.id)}" ${!owned || equipped ? "disabled" : ""}>${equipped ? t("equipped") : owned ? t("equip") : t("locked")}</button></article>`;
    }).join("") : `<p>${t("noMail")}</p>`);
  }
  function openTitleModal() {
    const modal = ensureTitleModal();
    id("profileTitleOwnedOnly").checked = state.titleOwnedOnly;
    renderTitleList();
    modal.classList.remove("hidden");
  }
  function equipTitle(titleId) {
    if (!titleId) {
      UI.save.profile = UI.save.profile && typeof UI.save.profile === "object" ? UI.save.profile : {};
      UI.save.profile.activeTitle = "";
      UI.save.activeTitle = "";
      UI.save.selectedTitle = "";
      window.CHERRIFT_PREBETA?.syncGmAccess?.(UI.save);
      saveLocal();
      renderTitleList();
      renderProfile();
      return;
    }
    const title = titleCatalog().find(item => item.id === titleId);
    if (!title || !titleOwned(title)) return;
    UI.save.profile = UI.save.profile && typeof UI.save.profile === "object" ? UI.save.profile : {};
    UI.save.profile.activeTitle = title.id;
    UI.save.activeTitle = title.id;
    UI.save.selectedTitle = title.id;
    window.CHERRIFT_PREBETA?.syncGmAccess?.(UI.save);
    saveLocal();
    renderTitleList();
    renderProfile();
  }

  // -----------------------------------------------------------------------
  // Existing UI layout patches
  // -----------------------------------------------------------------------
  function replaceExactText(root, from, to) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) if (node.nodeValue.trim().toLowerCase() === from.toLowerCase()) node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), to);
  }

  function patchGear() {
    const gear = id("gear");
    if (!gear || gear.classList.contains("hidden")) return;
    replaceExactText(gear, "Current Loadout", t("currentSkin"));
    replaceExactText(gear, "Inventory", t("gearEquipments"));
    const tabs = qa("button", gear).filter(button => ["loadout", "inventory", "gear equipments"].includes(button.textContent.trim().toLowerCase())).map(button => button.parentElement).find(Boolean);
    const statLabels = qa("*", gear).filter(element => ["power", "hp", "atk"].includes(element.textContent.trim().toLowerCase()) && element.children.length === 0);
    const statContainer = statLabels[0]?.parentElement?.parentElement || statLabels[0]?.parentElement;
    if (tabs && statContainer && tabs.parentElement === statContainer.parentElement && tabs.compareDocumentPosition(statContainer) & Node.DOCUMENT_POSITION_PRECEDING) statContainer.before(tabs);
    statLabels.forEach(label => label.parentElement?.classList.add("gear-stat-emphasis-bf"));
  }

  function patchArsenal() {
    const panel = id("arsenalV070");
    if (!panel || panel.classList.contains("hidden")) return;
    panel.style.overflowY = "auto";
    panel.style.height = "100dvh";
    panel.style.maxHeight = "none";
    document.body.style.overflow = "hidden";
    if (!panel.__bugfixScrollV0941) {
      panel.__bugfixScrollV0941 = true;
      panel.addEventListener("touchmove", event => event.stopPropagation(), { passive: true, capture: true });
      panel.addEventListener("wheel", event => event.stopPropagation(), { passive: true, capture: true });
    }
  }

  function selectedStage() {
    const stages = window.CHERRIFT_V040?.stages || window.CHERRIFT_DATA?.stages || [];
    return stages.find(stage => stage.id === UI.save?.selectedStageId) || stages.find(stage => stage.id === UI.save?.stageId) || stages[0] || null;
  }
  function stageArtCandidates(stage) {
    if (!stage) return [];
    const world = num(stage.world) || 1;
    const index = num(stage.index || stage.stage) || 1;
    const artIndex = index <= 2 ? 1 : index <= 4 ? 2 : world === 4 ? 2 : 3;
    return [...new Set([
      stage.splash, stage.splashArt, stage.art, stage.image, stage.preview, stage.thumbnail,
      `assets/map/world${world}/world${world}_splashart_${artIndex}.png`,
      "assets/map/world1/world1_splashart_1.png"
    ].filter(Boolean))];
  }
  function applyFirstWorkingBackground(element, candidates) {
    const token = ++state.stageArtToken;
    const tryIndex = index => {
      if (token !== state.stageArtToken || !element || index >= candidates.length) return;
      const image = new Image();
      image.onload = () => {
        if (token !== state.stageArtToken) return;
        element.style.backgroundImage = `linear-gradient(180deg,rgba(6,3,12,.04),rgba(8,3,14,.56)),url("${candidates[index]}")`;
      };
      image.onerror = () => tryIndex(index + 1);
      image.src = candidates[index];
    };
    tryIndex(0);
  }

  function patchHome() {
    const menu = id("menu");
    if (!menu || menu.classList.contains("hidden")) return;
    const stage = selectedStage();
    const art = q(".mobile-character-display-v051 .mobile-stage-art", menu) || id("mobileStageArt");
    if (art && stage) applyFirstWorkingBackground(art, stageArtCandidates(stage));
    const worldBadge = q(".mobile-world-label-v051,.stage-chip", menu);
    const gate = q(".mobile-character-display-v051,.mobile-character-stage-v051", menu);
    if (worldBadge && gate && !gate.contains(worldBadge)) { worldBadge.classList.add("world-badge-on-gate-bf"); gate.appendChild(worldBadge); }
    if (!isMobile()) return;
    qa("button", menu).forEach(button => {
      const label = button.textContent.trim().toLowerCase();
      if ((label.includes("chest") || label === "gear" || label.endsWith("gear")) && !button.closest(".mobile-nav-v090")) { button.dataset.bfRemoved = "true"; button.style.display = "none"; }
      if (label.includes("cherry") && !button.closest(".mobile-nav-v090")) { button.dataset.bfRemoved = "true"; button.style.display = "none"; }
    });
    const actionOrder = ["daily", "weekly", "login"];
    const actions = qa("button", menu).filter(button => actionOrder.some(word => button.textContent.trim().toLowerCase().includes(word)));
    actions.forEach(button => {
      const label = button.textContent.trim().toLowerCase();
      button.style.order = actionOrder.findIndex(word => label.includes(word));
    });
    const nav = q(".mobile-nav-v090");
    if (nav) {
      const buttons = qa(":scope > button", nav);
      const play = buttons.find(button => button.textContent.trim().toLowerCase() === "play") || buttons[0];
      if (play && !play.classList.contains("cherry-nav-bf")) {
        play.className = `${play.className} cherry-nav-bf`.trim();
        play.removeAttribute("data-v082-route");
        play.removeAttribute("data-open");
        play.onclick = event => { event.preventDefault(); event.stopPropagation(); UI.open?.("skins"); };
      }
      if (play) {
        const skin = selectedSkin();
        const source = skin.icon || skin.splash || "";
        let holder = q(":scope > span", play);
        if (!holder) {
          holder = document.createElement("span");
          play.prepend(holder);
        }
        let image = q(":scope > img", holder);
        if (source && !image) {
          holder.textContent = "";
          image = document.createElement("img");
          image.alt = "";
          holder.appendChild(image);
        }
        if (image && image.getAttribute("src") !== source) image.setAttribute("src", source);
        if (!source && !image && holder.textContent !== "🐰") holder.textContent = "🐰";
        let label = q(":scope > b", play);
        if (!label) {
          label = document.createElement("b");
          play.appendChild(label);
        }
        if (label.textContent !== "Cherry") label.textContent = "Cherry";
      }
    }
  }

  function removeLegacyKeyUi() {
    const roots = qa(".resource-bar-v082,.mobile-currencies-v0932,#resourceBarV082,.global-resource-bar");
    for (const root of roots) {
      qa("img", root).forEach(image => {
        const source = `${image.getAttribute("src") || ""} ${image.getAttribute("alt") || ""}`.toLowerCase();
        if (!/(^|[\/_-])keys?([\/_.-]|$)/.test(source)) return;
        const item = image.closest("button,b,li,[data-resource],.resource-item,.currency-item") || image.parentElement;
        if (item) item.style.display = "none";
      });
      qa("[data-resource='keys'],[data-resource-id^='key.'],[data-currency='keys']", root).forEach(element => element.style.display = "none");
    }
  }

  function removeBadUi() {
    removeLegacyKeyUi();
    id("economyV11Floating")?.remove();
    id("economyV11DesktopBtn")?.remove();
    id("redeemLiveV1")?.remove();
    qa(".economy-nav-v11").forEach(element => element.remove());
    qa('[data-tier="legendary"],[data-chest="legendary"],[data-v082-chest="legendary"],[data-v084-bag-item="chest:legendary"],.legendary-chest').forEach(element => element.remove());
  }

  function hideCustomPanels() {
    id("mailBugfixV0941")?.classList.add("hidden");
    id("profileBugfixV0941")?.classList.add("hidden");
    qa("#redeemBugfixModalV0941,#profileNameModalV0941,#profileTitleModalV0941,#profileTitleStatsModalV0945").forEach(modal => modal.classList.add("hidden"));
    document.body.style.overflow = "";
  }

  function patchVisibleRoute() {
    removeBadUi();
    patchSettings();
    patchGear();
    patchArsenal();
    patchHome();
  }

  function bindGlobalEvents() {
    document.addEventListener("click", event => {
      const target = event.target.closest?.("button,a,[role='button']");
      if (!target) return;
      const route = target.dataset?.v082Route || target.dataset?.open || target.dataset?.v063Open || "";
      const title = String(target.getAttribute?.("title") || "").trim().toLowerCase();
      if (route === "mailV063" || title === "mail") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const drawer = id("mobileMenuV082");
        drawer?.classList.add("hidden");
        drawer?.setAttribute("aria-hidden", "true");
        document.body.classList.remove("mobile-menu-open-v082", "more-open", "drawer-open");
        openMail();
        return;
      }
      if (route === "profileV082") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openProfile();
        return;
      }
      if (target.classList?.contains("cherry-nav-bf")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        UI.open?.("skins");
      }
    }, true);
    window.CHERRIFT_LIVE_SERVICES?.onChange?.(event => {
      if (event.type === "mail" && !id("mailBugfixV0941")?.classList.contains("hidden")) {
        if (state.mailView === "detail" && state.selectedMailId) showMailDetail(state.selectedMailId);
        else showMailList();
      }
    });
    window.addEventListener("cherrift:languagechange", () => {
      if (!id("profileBugfixV0941")?.classList.contains("hidden")) renderProfile();
      if (!id("mailBugfixV0941")?.classList.contains("hidden")) showMailList();
    });
  }

  function start() {
    if (!window.UI || !window.CherriftStorage || !id("app")) return setTimeout(start, 120);
    ensureCss();
    state.previousOpen = UI.open?.bind(UI) || null;
    ensureMailPanel();
    ensureProfilePanel();
    ensureRedeemModal();
    bindGlobalEvents();
    patchVisibleRoute();
    console.info(`[CHERRIFT] Bugfix ${VERSION} loaded: Mail, Profile, Gear, Home and Arsenal fixes.`);
  }

  window.CHERRIFT_ACCOUNT_MAIL = Object.freeze({
    version: VERSION,
    openMail,
    openProfile,
    patchVisibleRoute,
    renderProfile,
    showMailList,
    hide:hideCustomPanels
  });
  window.CHERRIFT_BUGFIX_V0941 = window.CHERRIFT_ACCOUNT_MAIL;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
