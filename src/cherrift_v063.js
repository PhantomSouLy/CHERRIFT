(() => {
"use strict";

const VERSION = "0.6.3-test-build";
const DISPLAY_VERSION = "v0.6.3";
const SAVE_SCHEMA = 6;
const ISSUE_BASE = "https://github.com/PhantomSouLy/CHERRIFT/issues/new";
const CUSTOM_PANELS = new Set(["mailV063", "supportV063"]);
const BASE_EFFECTS = [
  "assets/effects/base_effects/purple_slash.png?v=063",
  "assets/effects/base_effects/purple_slash2.png?v=063",
  "assets/effects/base_effects/purple_slash3.png?v=063",
  "assets/effects/base_effects/purple_slash4.png?v=063"
];

const COPY = {
  hu: {
    testBuild: "TESZTVERZIÓ",
    testNotice: "Fejlesztés alatt · a mentés és az egyensúly még változhat",
    mail: "Levelek",
    inbox: "Postafiók",
    mailIntro: "Rendszerüzenetek, frissítési hírek és átvehető jutalmak.",
    unread: "olvasatlan",
    read: "Olvasva",
    system: "CHERRIFT rendszer",
    attachment: "Melléklet",
    noAttachment: "Nincs melléklet",
    claim: "Jutalom átvétele",
    claimed: "Átvéve",
    mailEmpty: "Nincs levél.",
    feedback: "Visszajelzés",
    bugReport: "Hibajelentés",
    support: "Visszajelzés és hibajelentés",
    supportIntro: "Készíts strukturált jelentést, majd másold ki vagy nyisd meg GitHubon.",
    feedbackIntro: "Írd le, mi tetszik, min változtatnál, vagy milyen új ötleted van.",
    bugIntro: "A pontos lépések és a várt eredmény segítik a hiba gyors javítását.",
    title: "Rövid cím",
    category: "Kategória",
    message: "Üzenet",
    area: "Érintett terület",
    severity: "Súlyosság",
    steps: "Hiba reprodukálásának lépései",
    expected: "Várt működés",
    actual: "Tényleges működés",
    diagnostics: "Automatikus technikai adatok",
    copyReport: "Jelentés másolása",
    openIssue: "Megnyitás GitHubon",
    copied: "A jelentés a vágólapra került",
    fillRequired: "Adj meg címet és részletes leírást",
    privacy: "A teljes mentésed nem kerül a jelentésbe. Csak verzió-, kijelző- és kiválasztási adatok láthatók.",
    gameplay: "Játékmenet",
    interface: "Felület",
    balance: "Egyensúly",
    translation: "Fordítás",
    performance: "Teljesítmény",
    crash: "Fagyás / indulási hiba",
    other: "Egyéb",
    low: "Alacsony",
    medium: "Közepes",
    high: "Magas",
    blocker: "Blokkoló",
    power: "ERŐ",
    hp: "HP",
    atk: "ATK",
    mailWelcomeTitle: "Üdv a CHERRIFT tesztverziójában!",
    mailWelcomeBody: "Ez még fejlesztés alatt álló tesztverzió. A Mail, a visszajelzés, az új felszerelésikonok és a javított közelharci effektek mostantól kipróbálhatók.",
    mailGiftTitle: "Tesztelői ellátmány",
    mailGiftBody: "Köszönjük a tesztelést! A mellékelt érmével és kulccsal könnyebben kipróbálhatod a Gear és Gacha rendszert.",
    rewardClaimed: "A levél jutalmát átvetted",
    backToLibrary: "Vissza a Gyűjteménybe"
  },
  en: {
    testBuild: "TEST BUILD",
    testNotice: "Work in progress · saves and balance may still change",
    mail: "Mail",
    inbox: "Inbox",
    mailIntro: "System messages, update news and claimable rewards.",
    unread: "unread",
    read: "Read",
    system: "CHERRIFT System",
    attachment: "Attachment",
    noAttachment: "No attachment",
    claim: "Claim reward",
    claimed: "Claimed",
    mailEmpty: "There is no mail.",
    feedback: "Feedback",
    bugReport: "Bug report",
    support: "Feedback & bug report",
    supportIntro: "Create a structured report, then copy it or open it on GitHub.",
    feedbackIntro: "Tell us what works, what should change, or what you would like to see next.",
    bugIntro: "Exact reproduction steps and the expected result help us fix problems faster.",
    title: "Short title",
    category: "Category",
    message: "Message",
    area: "Affected area",
    severity: "Severity",
    steps: "Steps to reproduce",
    expected: "Expected result",
    actual: "Actual result",
    diagnostics: "Automatic technical details",
    copyReport: "Copy report",
    openIssue: "Open on GitHub",
    copied: "Report copied to the clipboard",
    fillRequired: "Add a title and a detailed description",
    privacy: "Your complete save is never included. Only version, display and selection details are shown.",
    gameplay: "Gameplay",
    interface: "Interface",
    balance: "Balance",
    translation: "Translation",
    performance: "Performance",
    crash: "Freeze / startup",
    other: "Other",
    low: "Low",
    medium: "Medium",
    high: "High",
    blocker: "Blocker",
    power: "POWER",
    hp: "HP",
    atk: "ATK",
    mailWelcomeTitle: "Welcome to the CHERRIFT test build!",
    mailWelcomeBody: "This is still a work-in-progress test version. Mail, feedback, new equipment icons and corrected melee effects are now ready to try.",
    mailGiftTitle: "Tester supplies",
    mailGiftBody: "Thank you for testing! Use the attached coins and key to try the Gear and Gacha systems more easily.",
    rewardClaimed: "Mail reward claimed",
    backToLibrary: "Back to Library"
  }
};

const MAIL_CATALOG = [
  {
    id: "v063_welcome",
    version: window.CHERRIFT_BUILD?.displayVersion || "v0.9.0",
    titleKey: "mailWelcomeTitle",
    bodyKey: "mailWelcomeBody",
    attachments: null
  },
  {
    id: "v063_tester_supply",
    version: window.CHERRIFT_BUILD?.displayVersion || "v0.9.0",
    titleKey: "mailGiftTitle",
    bodyKey: "mailGiftBody",
    attachments: { coins: 30, keys: 1 }
  }
];

const runtime = {
  currentPanel: "menu",
  libraryChild: null,
  libraryTab: "profile",
  customOrigin: new Map(),
  selectedMail: null,
  supportType: "feedback",
  drafts: {
    feedback: { title: "", category: "gameplay", message: "" },
    bug: { title: "", area: "gameplay", severity: "medium", steps: "", expected: "", actual: "" }
  }
};

const id = name => document.getElementById(name);
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function language() {
  return window.CHERRIFT_I18N?.language === "en" ? "en" : "hu";
}

function c(key) {
  return COPY[language()][key] || COPY.en[key] || key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMailbox(save) {
  const out = save && typeof save === "object" ? save : {};
  out.schemaVersion = Math.max(SAVE_SCHEMA, Number(out.schemaVersion) || 0);
  out.mailbox = out.mailbox && typeof out.mailbox === "object" ? out.mailbox : {};
  out.mailbox.states = out.mailbox.states && typeof out.mailbox.states === "object"
    ? out.mailbox.states
    : {};
  for (const message of MAIL_CATALOG) {
    const state = out.mailbox.states[message.id];
    out.mailbox.states[message.id] = {
      read: state?.read === true,
      claimed: state?.claimed === true
    };
  }
  return out;
}

function patchStorage() {
  if (!window.CherriftStorage || CherriftStorage.__v063Mailbox) return;
  const previousDefaults = CherriftStorage.defaults.bind(CherriftStorage);
  const previousLoad = CherriftStorage.load.bind(CherriftStorage);
  const previousSave = CherriftStorage.save.bind(CherriftStorage);

  CherriftStorage.defaults = () => normalizeMailbox(previousDefaults());
  CherriftStorage.load = () => normalizeMailbox(previousLoad());
  CherriftStorage.save = save => previousSave(normalizeMailbox(save));
  CherriftStorage.__v063Mailbox = true;
}

function saveProgress() {
  if (!UI.save) return;
  normalizeMailbox(UI.save);
  CherriftStorage.save(UI.save);
}

function mailState(messageId) {
  normalizeMailbox(UI.save || {});
  return UI.save?.mailbox?.states?.[messageId] || { read: false, claimed: false };
}

function unreadCount() {
  if (!UI.save) return MAIL_CATALOG.length;
  return MAIL_CATALOG.filter(message => !mailState(message.id).read).length;
}

function markMailRead(messageId) {
  const state = mailState(messageId);
  if (state.read) return;
  state.read = true;
  saveProgress();
}

function computedStats(save = UI.save) {
  const gearStats = UI.totalGearStats?.(save) || {};
  const power = 100 + Object.values(save?.equipped || {})
    .filter(Boolean)
    .reduce((sum, item) => sum + (CHERRIFT_V050?.itemPower?.(item) || 0), 0);
  return {
    power: Math.round(power),
    hp: Math.round(100 + Number(gearStats.maxHp || 0)),
    atk: Math.round(20 + Number(gearStats.damage || 0))
  };
}

function gearIconPath(item) {
  if (!item) return null;
  const rarity = String(item.rarity || "Common");
  const slot = String(item.slot || "");
  const accessory = slot === "Ring" || slot === "Necklace";
  const fileSlot = slot === "Necklace" ? "necklance" : slot.toLowerCase();

  if (accessory) {
    const material = rarity === "Common"
      ? "copper"
      : rarity === "Uncommon"
        ? "silver"
        : rarity === "Rare"
          ? "emerald_silver"
          : "royal";
    return `assets/items/equipments/accessories/${material}_${fileSlot}.png`;
  }

  if (slot === "Weapon") {
    const weapon = rarity === "Common"
      ? "steel_sword"
      : rarity === "Uncommon"
        ? "sword_sword"
        : rarity === "Rare"
          ? "iron_sword"
          : "royal_sword";
    return `assets/items/equipments/weapons/${weapon}.png`;
  }

  const armorSlot = {
    Helmet: "helmet",
    Armor: "chestplate",
    Gloves: "gloves",
    Boots: "leg_armor"
  }[slot];
  if (!armorSlot) return null;
  const material = rarity === "Common"
    ? "leather"
    : rarity === "Uncommon"
      ? "reinforced_leather"
      : rarity === "Rare"
        ? "iron"
        : "royal";
  return `assets/items/equipments/armors/${material}_${armorSlot}.png`;
}

function patchGearIcons() {
  if (!window.UI || UI.__v063GearIcons) return;
  const previousGearEmoji = UI.gearEmoji?.bind(UI);
  UI.gearEmoji = function gearIconV063(item) {
    const source = gearIconPath(item);
    if (!source) return previousGearEmoji?.(item) || "⚙";
    const label = `${item?.rarity || ""} ${item?.slot || "Equipment"}`.trim();
    return `<img class="gear-icon-v063" src="${escapeHtml(source)}" alt="${escapeHtml(label)}" draggable="false">`;
  };
  UI.__v063GearIcons = true;
}

function ensureCss() {
  if (id("v063css")) return;
  const link = document.createElement("link");
  link.id = "v063css";
  link.rel = "stylesheet";
  link.href = "v063.css?v=063";
  document.head.appendChild(link);
}

function ensurePanels() {
  const app = id("app");
  if (!app) return;

  if (!id("mailV063")) {
    const panel = document.createElement("section");
    panel.id = "mailV063";
    panel.className = "panel hidden utility-panel-v063 mail-panel-v063";
    panel.innerHTML = `
      <header class="panel-head panel-head-v063">
        <button class="back" type="button" data-v063-back>←</button>
        <div><h2>${c("mail")}</h2><p>${c("mailIntro")}</p></div>
      </header>
      <div id="mailBodyV063" class="mail-shell-v063"></div>`;
    app.appendChild(panel);
  }

  if (!id("supportV063")) {
    const panel = document.createElement("section");
    panel.id = "supportV063";
    panel.className = "panel hidden utility-panel-v063 support-panel-v063";
    panel.innerHTML = `
      <header class="panel-head panel-head-v063">
        <button class="back" type="button" data-v063-back>←</button>
        <div><h2>${c("support")}</h2><p>${c("supportIntro")}</p></div>
      </header>
      <div id="supportBodyV063" class="support-shell-v063"></div>`;
    app.appendChild(panel);
  }
}

function statMarkup(prefix) {
  return `
    <div class="power"><small>${c("power")}</small><b id="${prefix}PowerV063">100</b></div>
    <div><small>${c("hp")}</small><b id="${prefix}HpV063">100</b></div>
    <div><small>${c("atk")}</small><b id="${prefix}AtkV063">20</b></div>`;
}

function updateLocalizedStaticUi() {
  const banner = id("testBuildBannerV063");
  if (banner) {
    const strong = q("strong", banner);
    const note = q("span", banner);
    if (strong) strong.textContent = `${c("testBuild")} · ${window.CHERRIFT_BUILD?.displayVersion || "v0.9.0"}`;
    if (note) note.textContent = c("testNotice");
  }

  for (const prefix of ["main", "mobile", "loadout"]) {
    const labels = qa(`#${prefix === "main" ? "mainStatsV063" : prefix === "mobile" ? "mobilePowerV051" : "loadoutStatsV063"} small`);
    if (labels[0]) labels[0].textContent = c("power");
    if (labels[1]) labels[1].textContent = c("hp");
    if (labels[2]) labels[2].textContent = c("atk");
  }

  const mailButtons = qa('[data-v063-open="mailV063"]');
  for (const button of mailButtons) {
    const label = q("b", button);
    const detail = q("small", button);
    if (label) label.textContent = c("mail");
    if (detail) detail.textContent = c("inbox");
  }
  const supportButtons = qa('[data-v063-open="supportV063"]');
  for (const button of supportButtons) {
    const label = q("b", button);
    const detail = q("small", button);
    if (label) label.textContent = c("feedback");
    if (detail) detail.textContent = c("bugReport");
  }

  const mobileBuild = q(".mobile-profile-copy-v051 > small");
  if (mobileBuild) mobileBuild.textContent = c("testBuild");
  const mobileMail = q('.mobile-header-tool-v063[data-open="mailV063"]');
  const mobileSupport = q('.mobile-header-tool-v063[data-open="supportV063"]');
  if (mobileMail) mobileMail.setAttribute("aria-label", c("mail"));
  if (mobileSupport) mobileSupport.setAttribute("aria-label", c("support"));

  const mailHeader = q("#mailV063 .panel-head-v063");
  if (mailHeader) {
    q("h2", mailHeader).textContent = c("mail");
    q("p", mailHeader).textContent = c("mailIntro");
  }
  const supportHeader = q("#supportV063 .panel-head-v063");
  if (supportHeader) {
    q("h2", supportHeader).textContent = c("support");
    q("p", supportHeader).textContent = c("supportIntro");
  }
}

function ensureMainMenuEnhancements() {
  const dashboard = id("menuDashboardV060");
  if (dashboard && !id("testBuildBannerV063")) {
    dashboard.insertAdjacentHTML("afterbegin", `
      <div id="testBuildBannerV063" class="test-build-banner-v063">
        <strong>${c("testBuild")} · ${window.CHERRIFT_BUILD?.displayVersion || "v0.9.0"}</strong><span>${c("testNotice")}</span>
      </div>`);
  }

  const runCard = q(".dashboard-run-v060", dashboard);
  if (runCard && !id("mainStatsV063")) {
    runCard.insertAdjacentHTML("afterend", `<section id="mainStatsV063" class="main-stats-v063">${statMarkup("main")}</section>`);
  }

  const shortcuts = q(".dashboard-shortcuts-v060", dashboard);
  if (shortcuts && !q('[data-v063-open="mailV063"]', shortcuts)) {
    shortcuts.insertAdjacentHTML("beforeend", `
      <button type="button" data-v063-open="mailV063"><i>✉</i><span><b>${c("mail")}</b><small>${c("inbox")}</small></span><em class="mail-badge-v063" data-v063-mail-count></em></button>
      <button type="button" data-v063-open="supportV063"><i>!</i><span><b>${c("feedback")}</b><small>${c("bugReport")}</small></span></button>`);
  }

  const legacyVersion = id("menuBuildVersion");
  if (legacyVersion) legacyVersion.textContent = `${c("testBuild")} · ${window.CHERRIFT_BUILD?.displayVersion || "v0.9.0"}`;

  const topMail = q('#menu .top-icons button[title="Mail"], #menu .top-icons button[title="Levelek"]');
  if (topMail) {
    topMail.disabled = false;
    topMail.removeAttribute("aria-disabled");
    topMail.dataset.open = "mailV063";
    topMail.classList.add("mail-button-v063");
    if (!q("[data-v063-mail-count]", topMail)) topMail.insertAdjacentHTML("beforeend", '<em class="mail-badge-v063" data-v063-mail-count></em>');
  }

  const mobileHeader = q(".mobile-game-header-v051");
  const settings = q(".mobile-header-settings-v051", mobileHeader);
  if (mobileHeader && settings && !q(".mobile-header-actions-v063", mobileHeader)) {
    const actions = document.createElement("div");
    actions.className = "mobile-header-actions-v063";
    actions.innerHTML = `
      <button type="button" class="mobile-header-tool-v063 mail-button-v063" data-open="mailV063" aria-label="${c("mail")}">✉<em class="mail-badge-v063" data-v063-mail-count></em></button>
      <button type="button" class="mobile-header-tool-v063" data-open="supportV063" aria-label="${c("support")}">!</button>`;
    mobileHeader.insertBefore(actions, settings);
    actions.appendChild(settings);
  }
  const mobilePower = q(".mobile-power-v051");
  if (mobilePower && !id("mobileHpV063")) {
    mobilePower.classList.add("mobile-stats-v063");
    mobilePower.innerHTML = statMarkup("mobile");
  }

  const services = id("libraryServicesV062");
  if (services && !q('[data-v063-open="mailV063"]', services)) {
    services.insertAdjacentHTML("beforeend", `
      <button type="button" data-v063-open="mailV063"><span>✉</span><b>${c("mail")}</b><em class="mail-badge-v063" data-v063-mail-count></em></button>
      <button type="button" data-v063-open="supportV063"><span>!</span><b>${c("feedback")}</b></button>`);
  }

  const stage = id("gearStageV0560");
  if (stage && !id("loadoutStatsV063")) {
    stage.insertAdjacentHTML("beforeend", `<section id="loadoutStatsV063" class="loadout-stats-v063">${statMarkup("loadout")}</section>`);
  }
  updateLocalizedStaticUi();
}

function updateVersionLabels() {
  CHERRIFT_CONFIG.version = VERSION;
  CHERRIFT_DATA.version = VERSION;
  document.title = window.CHERRIFT_BUILD?.title || "CHERRIFT v0.9.0 – TEST BUILD";
  const boot = q(".boot-sub-v060");
  if (boot) boot.textContent = `${c("testBuild")} · ${window.CHERRIFT_BUILD?.displayVersion || "v0.9.0"}`;
  const kicker = q("#menuDashboardV060 .dashboard-kicker-v060");
  if (kicker) kicker.hidden = true;
  const patchCard = q("#menu .patch-card");
  if (patchCard) {
    const version = q("header span", patchCard);
    const description = q("p", patchCard);
    if (version) version.textContent = window.CHERRIFT_BUILD?.displayVersion || "v0.9.0";
    if (description) description.textContent = language() === "hu"
      ? "Mail, visszajelzés, új felszerelésikonok és javított melee effektek."
      : "Mail, feedback, new equipment icons and corrected melee effects.";
  }
}

function updateStats() {
  if (!UI.save) return;
  const stats = computedStats();
  for (const prefix of ["main", "mobile", "loadout"]) {
    const power = id(`${prefix}PowerV063`);
    const hp = id(`${prefix}HpV063`);
    const atk = id(`${prefix}AtkV063`);
    if (power) power.textContent = stats.power;
    if (hp) hp.textContent = stats.hp;
    if (atk) atk.textContent = stats.atk;
  }
  if (id("gearPowerV0560")) id("gearPowerV0560").textContent = stats.power;
  if (id("gearHpV0560")) id("gearHpV0560").textContent = stats.hp;
  if (id("gearAtkV0560")) id("gearAtkV0560").textContent = stats.atk;
  const legacyMobilePower = id("mobilePowerV051");
  if (legacyMobilePower) legacyMobilePower.textContent = stats.power;
}

function updateMailBadges() {
  const count = unreadCount();
  qa("[data-v063-mail-count]").forEach(badge => {
    badge.textContent = count > 9 ? "9+" : String(count);
    badge.classList.toggle("hidden", count < 1);
    badge.setAttribute("aria-label", `${count} ${c("unread")}`);
  });
}

function renderMail() {
  const body = id("mailBodyV063");
  if (!body || !UI.save) return;
  normalizeMailbox(UI.save);
  if (!runtime.selectedMail || !MAIL_CATALOG.some(message => message.id === runtime.selectedMail)) {
    runtime.selectedMail = MAIL_CATALOG.find(message => !mailState(message.id).read)?.id || MAIL_CATALOG[0]?.id || null;
  }
  const selected = MAIL_CATALOG.find(message => message.id === runtime.selectedMail);
  if (selected) markMailRead(selected.id);

  const selectedState = selected ? mailState(selected.id) : null;
  const attachments = selected?.attachments;
  const attachmentMarkup = attachments
    ? `<div class="mail-attachments-v063"><span>${c("attachment")}</span><b>${attachments.coins ? `🪙 ${attachments.coins}` : ""}${attachments.keys ? ` · 🗝 ${attachments.keys}` : ""}</b></div>`
    : `<div class="mail-attachments-v063 empty"><span>${c("noAttachment")}</span></div>`;

  body.innerHTML = `
    <aside class="mail-list-v063">
      <header><span>${c("inbox")}</span><b>${unreadCount()} ${c("unread")}</b></header>
      ${MAIL_CATALOG.length ? MAIL_CATALOG.map(message => {
        const state = mailState(message.id);
        return `<button type="button" data-v063-mail-id="${message.id}" class="${message.id === runtime.selectedMail ? "active" : ""} ${state.read ? "read" : "unread"}">
          <i>${state.read ? "✓" : "•"}</i><span><b>${escapeHtml(c(message.titleKey))}</b><small>${escapeHtml(c("system"))} · ${message.version}</small></span>
        </button>`;
      }).join("") : `<p>${c("mailEmpty")}</p>`}
    </aside>
    <article class="mail-reader-v063">
      ${selected ? `
        <header><small>${c("system")} · ${selected.version}</small><h2>${escapeHtml(c(selected.titleKey))}</h2></header>
        <p>${escapeHtml(c(selected.bodyKey))}</p>
        ${attachmentMarkup}
        ${attachments ? `<button type="button" class="mail-claim-v063" data-v063-claim-mail="${selected.id}" ${selectedState.claimed ? "disabled" : ""}>${selectedState.claimed ? c("claimed") : c("claim")}</button>` : ""}`
        : `<p>${c("mailEmpty")}</p>`}
    </article>`;
  updateMailBadges();
}

function claimMail(messageId) {
  const message = MAIL_CATALOG.find(entry => entry.id === messageId);
  const state = message ? mailState(message.id) : null;
  if (!message?.attachments || !state || state.claimed) return false;
  state.read = true;
  state.claimed = true;
  UI.save.coins = Math.max(0, Number(UI.save.coins) || 0) + Number(message.attachments.coins || 0);
  UI.save.keys = Math.max(0, Number(UI.save.keys) || 0) + Number(message.attachments.keys || 0);
  saveProgress();
  UI.refreshMenu?.();
  UI.toast?.(c("rewardClaimed"));
  renderMail();
  return true;
}

function diagnosticData() {
  return {
    version: window.CHERRIFT_BUILD?.displayVersion || "v0.9.0",
    build: VERSION,
    language: language(),
    viewport: `${window.innerWidth || 0}×${window.innerHeight || 0} @${window.devicePixelRatio || 1}x`,
    selectedStage: UI.save?.selectedStageId || "unknown",
    selectedSkin: UI.save?.selectedSkin || "unknown",
    saveSchema: UI.save?.schemaVersion || 0,
    panel: runtime.currentPanel,
    userAgent: navigator.userAgent
  };
}

function diagnosticMarkdown() {
  return Object.entries(diagnosticData()).map(([key, value]) => `- **${key}:** ${value}`).join("\n");
}

function categoryOptions(keys, selected) {
  return keys.map(key => `<option value="${key}" ${key === selected ? "selected" : ""}>${c(key)}</option>`).join("");
}

function renderSupport() {
  const body = id("supportBodyV063");
  if (!body) return;
  const feedback = runtime.supportType === "feedback";
  const draft = runtime.drafts[feedback ? "feedback" : "bug"];
  const form = feedback ? `
    <label><span>${c("title")}</span><input data-v063-field="title" value="${escapeHtml(draft.title)}" maxlength="120"></label>
    <label><span>${c("category")}</span><select data-v063-field="category">${categoryOptions(["gameplay", "interface", "balance", "translation", "other"], draft.category)}</select></label>
    <label class="wide"><span>${c("message")}</span><textarea data-v063-field="message" rows="9">${escapeHtml(draft.message)}</textarea></label>` : `
    <label><span>${c("title")}</span><input data-v063-field="title" value="${escapeHtml(draft.title)}" maxlength="120"></label>
    <label><span>${c("area")}</span><select data-v063-field="area">${categoryOptions(["gameplay", "interface", "performance", "crash", "translation", "other"], draft.area)}</select></label>
    <label><span>${c("severity")}</span><select data-v063-field="severity">${categoryOptions(["low", "medium", "high", "blocker"], draft.severity)}</select></label>
    <label class="wide"><span>${c("steps")}</span><textarea data-v063-field="steps" rows="5">${escapeHtml(draft.steps)}</textarea></label>
    <label class="wide"><span>${c("expected")}</span><textarea data-v063-field="expected" rows="3">${escapeHtml(draft.expected)}</textarea></label>
    <label class="wide"><span>${c("actual")}</span><textarea data-v063-field="actual" rows="3">${escapeHtml(draft.actual)}</textarea></label>`;

  body.innerHTML = `
    <nav class="support-tabs-v063">
      <button type="button" data-v063-support-type="feedback" class="${feedback ? "active" : ""}">${c("feedback")}</button>
      <button type="button" data-v063-support-type="bug" class="${feedback ? "" : "active"}">${c("bugReport")}</button>
    </nav>
    <section class="support-card-v063">
      <header><h2>${feedback ? c("feedback") : c("bugReport")}</h2><p>${feedback ? c("feedbackIntro") : c("bugIntro")}</p></header>
      <div class="support-form-v063">${form}</div>
      <details class="support-diagnostics-v063"><summary>${c("diagnostics")}</summary><pre>${escapeHtml(diagnosticMarkdown())}</pre></details>
      <p class="support-privacy-v063">${c("privacy")}</p>
      <footer><button type="button" data-v063-copy-report>${c("copyReport")}</button><button type="button" class="primary" data-v063-open-issue>${c("openIssue")}</button></footer>
    </section>`;

  qa("[data-v063-field]", body).forEach(field => {
    field.addEventListener("input", () => {
      draft[field.dataset.v063Field] = field.value;
    });
    field.addEventListener("change", () => {
      draft[field.dataset.v063Field] = field.value;
    });
  });
}

function buildReport() {
  const bug = runtime.supportType === "bug";
  const draft = runtime.drafts[bug ? "bug" : "feedback"];
  const title = String(draft.title || "").trim();
  const details = bug
    ? String(draft.steps || draft.actual || "").trim()
    : String(draft.message || "").trim();
  if (!title || !details) return null;

  const body = bug
    ? `## Bug report\n\n**Area:** ${c(draft.area)}\n**Severity:** ${c(draft.severity)}\n\n### Steps to reproduce\n${draft.steps || "—"}\n\n### Expected result\n${draft.expected || "—"}\n\n### Actual result\n${draft.actual || "—"}\n\n### Diagnostics\n${diagnosticMarkdown()}`
    : `## Feedback\n\n**Category:** ${c(draft.category)}\n\n${draft.message}\n\n### Diagnostics\n${diagnosticMarkdown()}`;
  return {
    title: `${bug ? "[Bug]" : "[Feedback]"} ${title}`,
    body,
    labels: bug ? "bug" : "feedback"
  };
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand?.("copy");
  area.remove();
}

async function submitSupport(openIssue) {
  const report = buildReport();
  if (!report) {
    UI.toast?.(c("fillRequired"));
    return false;
  }
  if (openIssue) {
    const url = `${ISSUE_BASE}?title=${encodeURIComponent(report.title)}&body=${encodeURIComponent(report.body)}&labels=${encodeURIComponent(report.labels)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    await copyText(`${report.title}\n\n${report.body}`);
    UI.toast?.(c("copied"));
  }
  return true;
}

function activeLibraryTab() {
  return q("[data-library-tab].active")?.dataset.libraryTab || "profile";
}

function patchNavigation() {
  if (UI.__v063Navigation) return;
  const previousOpen = UI.open.bind(UI);
  UI.open = function openV063(panel, ...args) {
    const before = runtime.currentPanel || "menu";
    if (before === "libraryV0551" && panel !== "libraryV0551" && panel !== "menu") {
      runtime.libraryTab = activeLibraryTab();
      runtime.libraryChild = panel;
    }
    if (CUSTOM_PANELS.has(panel)) runtime.customOrigin.set(panel, before || "menu");
    if (panel === "menu") runtime.libraryChild = null;

    const result = previousOpen(panel, ...args);
    for (const custom of CUSTOM_PANELS) id(custom)?.classList.toggle("hidden", custom !== panel);
    if (CUSTOM_PANELS.has(panel)) {
      id(panel)?.classList.remove("hidden");
      document.body.classList.remove("is-playing", "is-levelup", "is-loading-stage");
    }
    runtime.currentPanel = panel;

    if (panel === "libraryV0551") {
      runtime.libraryChild = null;
      window.setTimeout(() => CHERRIFT_V0551?.renderLibrary?.(runtime.libraryTab || "profile"), 0);
    }
    if (panel === "mailV063") renderMail();
    if (panel === "supportV063") renderSupport();
    updateStats();
    updateMailBadges();
    return result;
  };
  UI.__v063Navigation = true;
}

function returnFromPanel(event) {
  const panel = runtime.currentPanel;
  let target = null;
  if (CUSTOM_PANELS.has(panel)) target = runtime.customOrigin.get(panel) || "menu";
  else if (runtime.libraryChild && panel === runtime.libraryChild) target = "libraryV0551";
  if (!target) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  UI.open(target);
  return true;
}

function bindEvents() {
  if (document.documentElement.dataset.v063Events === "1") return;
  document.documentElement.dataset.v063Events = "1";

  document.addEventListener("click", event => {
    const back = event.target.closest?.(".back,[data-v063-back]");
    if (back && returnFromPanel(event)) return;

    const opener = event.target.closest?.("[data-v063-open]");
    if (opener) {
      event.preventDefault();
      event.stopImmediatePropagation();
      UI.open(opener.dataset.v063Open);
      return;
    }

    const mail = event.target.closest?.("[data-v063-mail-id]");
    if (mail) {
      runtime.selectedMail = mail.dataset.v063MailId;
      markMailRead(runtime.selectedMail);
      renderMail();
      return;
    }

    const claim = event.target.closest?.("[data-v063-claim-mail]");
    if (claim) {
      event.preventDefault();
      claimMail(claim.dataset.v063ClaimMail);
      return;
    }

    const supportType = event.target.closest?.("[data-v063-support-type]");
    if (supportType) {
      runtime.supportType = supportType.dataset.v063SupportType;
      renderSupport();
      return;
    }

    if (event.target.closest?.("[data-v063-copy-report]")) {
      event.preventDefault();
      submitSupport(false).catch(error => console.warn("Report copy failed:", error));
      return;
    }

    if (event.target.closest?.("[data-v063-open-issue]")) {
      event.preventDefault();
      submitSupport(true).catch(error => console.warn("Issue opening failed:", error));
    }
  }, true);
}

function isBaseMeleeSkin(game) {
  const skinId = game?.player?.skin || game?.save?.selectedSkin;
  const data = CHERRIFT_DATA.skins.find(skin => skin.id === skinId);
  const config = CHERRIFT_CONFIG.player.skins?.[skinId];
  return skinId !== "warrior_cherry" &&
    config?.attackType === "melee" &&
    ["Common", "Rare"].includes(data?.rarity);
}

async function loadBaseMeleeEffects(game) {
  if (!game?.assets || game.__baseMeleeV063Loaded) return;
  if (game.__baseMeleeV063Loading) return game.__baseMeleeV063Loading;
  game.__baseMeleeV063Loading = Promise.all(BASE_EFFECTS.map((source, index) =>
    game.assets.loadImage(`base_melee_v063_${index}`, source)
  )).then(results => {
    game.__baseMeleeV063Loaded = results.every(Boolean);
  }).finally(() => {
    game.__baseMeleeV063Loading = null;
  });
  return game.__baseMeleeV063Loading;
}

function patchBaseMeleeEffects() {
  const prototype = CherriftGame.prototype;
  if (prototype.__v063BaseMelee) return;
  prototype.__v063BaseMelee = true;

  const previousStart = prototype.start;
  prototype.start = async function startV063(...args) {
    const result = await previousStart.apply(this, args);
    if (isBaseMeleeSkin(this)) await loadBaseMeleeEffects(this);
    return result;
  };

  const previousDrawEffect = prototype.drawEffect;
  prototype.drawEffect = function drawEffectV063(context, effect) {
    if (effect?.type !== "slash" || !isBaseMeleeSkin(this)) {
      return previousDrawEffect.call(this, context, effect);
    }
    const progress = Math.max(0, Math.min(0.999, Number(effect.t || 0) / Math.max(0.001, Number(effect.life || 0.22))));
    const frame = Math.min(BASE_EFFECTS.length - 1, Math.floor(progress * BASE_EFFECTS.length));
    const image = this.assets.get(`base_melee_v063_${frame}`);
    if (!image) return previousDrawEffect.call(this, context, effect);

    const angle = Number(effect.a || 0);
    const range = Math.max(90, Number(effect.r || 124));
    const size = range * 1.72;
    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = Math.min(1, (1 - progress) * 1.35);
    context.translate(
      Number(effect.x || 0) + Math.cos(angle) * range * 0.48,
      Number(effect.y || 0) + Math.sin(angle) * range * 0.48 - 12
    );
    context.rotate(angle + 0.30);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, -size / 2, -size / 2, size, size);
    context.restore();
  };
}

function patchUiRefresh() {
  const previousInit = UI.init?.bind(UI);
  if (previousInit) {
    UI.init = function initV063(save, game) {
      const result = previousInit(save, game);
      normalizeMailbox(save);
      ensureMainMenuEnhancements();
      updateVersionLabels();
      updateStats();
      updateMailBadges();
      return result;
    };
  }

  const previousRefresh = UI.refreshMenu?.bind(UI);
  if (previousRefresh) {
    UI.refreshMenu = function refreshMenuV063(...args) {
      const result = previousRefresh(...args);
      ensureMainMenuEnhancements();
      updateStats();
      updateMailBadges();
      return result;
    };
  }

  const previousRenderGear = UI.renderGear?.bind(UI);
  if (previousRenderGear) {
    UI.renderGear = function renderGearV063(...args) {
      const result = previousRenderGear(...args);
      ensureMainMenuEnhancements();
      updateStats();
      return result;
    };
  }
}

function refreshLocalizedUi() {
  ensureMainMenuEnhancements();
  updateLocalizedStaticUi();
  updateVersionLabels();
  if (runtime.currentPanel === "mailV063") renderMail();
  if (runtime.currentPanel === "supportV063") renderSupport();
  updateStats();
  updateMailBadges();
}

ensureCss();
patchStorage();
patchGearIcons();
ensurePanels();
ensureMainMenuEnhancements();
patchNavigation();
patchBaseMeleeEffects();
patchUiRefresh();
bindEvents();
updateVersionLabels();

window.addEventListener("cherrift:languagechange", refreshLocalizedUi);
window.addEventListener("resize", () => {
  ensureMainMenuEnhancements();
  updateStats();
});

window.CHERRIFT_V063 = {
  version: VERSION,
  displayVersion: DISPLAY_VERSION,
  mailCatalog: MAIL_CATALOG,
  normalizeMailbox,
  unreadCount,
  claimMail,
  computedStats,
  gearIconPath,
  isBaseMeleeSkin,
  renderMail,
  renderSupport,
  buildReport,
  diagnostics: diagnosticData,
  runtime
};

console.info("[CHERRIFT] v0.6.3 test-build systems loaded.");
})();
