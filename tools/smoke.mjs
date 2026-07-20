import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".wav": "audio/wav"
};

function safeFile(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const requested = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  return requested === root || requested.startsWith(`${root}${path.sep}`) ? requested : null;
}

const server = createServer(async (request, response) => {
  const file = safeFile(request.url || "/");
  if (!file) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, "index.html") : file;
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(body);
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;

function canvasContext() {
  const gradient = { addColorStop() {} };
  const values = {
    canvas: null,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({ setTransform() {} }),
    getImageData: (_x, _y, width = 1, height = 1) => ({
      data: new Uint8ClampedArray(Math.max(4, width * height * 4)),
      width,
      height
    }),
    createImageData: (width = 1, height = 1) => ({
      data: new Uint8ClampedArray(Math.max(4, width * height * 4)),
      width,
      height
    }),
    measureText: text => ({ width: String(text).length * 8 }),
    isPointInPath: () => false,
    isPointInStroke: () => false
  };
  return new Proxy(values, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

function installBrowserStubs(window, width, height) {
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
    devicePixelRatio: { configurable: true, value: 1 },
    visualViewport: {
      configurable: true,
      value: { width, height, addEventListener() {}, removeEventListener() {} }
    }
  });

  window.matchMedia = query => {
    const max = query.match(/max-width\s*:\s*(\d+)px/i);
    const min = query.match(/min-width\s*:\s*(\d+)px/i);
    const matches = (!max || width <= Number(max[1])) &&
      (!min || width >= Number(min[1])) &&
      !query.includes("prefers-reduced-motion") &&
      !(query.includes("hover:hover") && width <= 820);
    return {
      matches,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true
    };
  };

  class FakeImage extends window.EventTarget {
    constructor() {
      super();
      this.width = 192;
      this.height = 192;
      this.naturalWidth = 192;
      this.naturalHeight = 192;
      this.complete = false;
      this.onload = null;
      this.onerror = null;
      this.decoding = "async";
      this._src = "";
    }
    set src(value) {
      this._src = String(value);
      if (this._src.includes("assets/effects/warrior_cherry/")) {
        this.width = this.naturalWidth = 1448;
        this.height = this.naturalHeight = 1086;
      } else if (this._src.includes("assets/effects/base_effects/") || this._src.includes("assets/items/equipments/")) {
        this.width = this.naturalWidth = 128;
        this.height = this.naturalHeight = 128;
      }
      window.setTimeout(() => {
        this.complete = true;
        this.onload?.(new window.Event("load"));
        this.dispatchEvent(new window.Event("load"));
      }, 0);
    }
    get src() { return this._src; }
    decode() { return Promise.resolve(); }
  }
  window.Image = FakeImage;

  class FakeAudio {
    constructor(source = "") { this.src = source; this.volume = 1; this.currentTime = 0; this.preload = "auto"; }
    load() {}
    play() { return Promise.resolve(); }
    pause() {}
    cloneNode() { return new FakeAudio(this.src); }
  }
  window.Audio = FakeAudio;

  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    const context = canvasContext();
    context.canvas = this;
    return context;
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height,
    toJSON() { return this; }
  });

  window.Element.prototype.scrollIntoView ||= () => {};
  window.Element.prototype.animate ||= () => ({ cancel() {}, finished: Promise.resolve() });
  window.HTMLElement.prototype.requestFullscreen ||= () => Promise.resolve();
  window.document.exitFullscreen ||= () => Promise.resolve();
  window.navigator.vibrate ||= () => true;
  window.requestIdleCallback ||= callback => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 20 }), 0);
  window.cancelIdleCallback ||= handle => window.clearTimeout(handle);
  window.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  window.__openedUrls = [];
  window.__clipboardText = "";
  window.open = url => {
    window.__openedUrls.push(String(url));
    return { closed: false, close() {} };
  };
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async value => { window.__clipboardText = String(value); } }
  });

  const returningSession = new URL(window.location.href).searchParams.get("smoke") === "returning-session";
  window.__authSession = returningSession ? {
    user: {
      id: "returning-supabase-user",
      user_metadata: { full_name: "Returning Cherry", user_name: "returningcherry" },
      identities: [{ provider: "discord", identity_data: { provider_id: "987654321" } }]
    }
  } : null;
  window.__authOAuthRequests = [];
  window.__authClientConfig = null;
  window.__authStateCallback = null;
  window.__CHERRIFT_SUPABASE_FACTORY__ = (url, publishableKey, options) => {
    window.__authClientConfig = { url, publishableKey, options };
    return {
      auth: {
        async getSession() {
          return { data: { session: window.__authSession }, error: null };
        },
        async signInWithOAuth(request) {
          window.__authOAuthRequests.push(request);
          return { data: { provider: request.provider, url: "https://discord.test/oauth" }, error: null };
        },
        onAuthStateChange(callback) {
          window.__authStateCallback = callback;
          window.setTimeout(() => callback("INITIAL_SESSION", window.__authSession), 0);
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async signOut() {
          window.__authSession = null;
          window.__authStateCallback?.("SIGNED_OUT", null);
          return { error: null };
        }
      }
    };
  };
}

async function waitFor(check, message, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out: ${message}`);
}

async function loadApp(name, width, height) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(`jsdom: ${error.message}`));
  virtualConsole.on("error", (...values) => errors.push(values.map(String).join(" ")));

  const dom = await JSDOM.fromURL(`${baseUrl}?smoke=${name}`, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) { installBrowserStubs(window, width, height); }
  });

  await waitFor(
    () => dom.window.CHERRIFT_V063 && dom.window.CHERRIFT_AUTH && dom.window.UI?.save && dom.window.UI?.game,
    `${name} startup`
  );
  assert.equal(dom.window.document.body.classList.contains("v062-startup-failed"), false, `${name}: startup failure screen`);
  return { dom, window: dom.window, errors };
}

function click(window, element, label) {
  assert.ok(element, `${label}: control exists`);
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

async function exercise(name, width, height) {
  const { dom, window, errors } = await loadApp(name, width, height);
  const { document, UI } = window;
  try {
    await waitFor(() => window.CHERRIFT_AUTH.getState().gateVisible, `${name} authentication gate`);
    assert.equal(document.getElementById("authGateV064")?.hidden, false, `${name}: login appears after loading`);
    assert.equal(document.body.classList.contains("auth-gated-v064"), true, `${name}: menu input is gated before choosing a login mode`);
    assert.match(document.getElementById("authWarningV064")?.textContent || "", /böngészőben/, `${name}: Guest shows its local-save warning`);
    assert.equal(window.__authClientConfig?.url, "https://qkukvltevryegjbnwcgg.supabase.co", `${name}: configured Supabase project is used`);
    assert.equal(window.__authClientConfig?.options?.auth?.flowType, "pkce", `${name}: browser OAuth uses PKCE`);
    assert.equal(window.__authClientConfig?.options?.auth?.persistSession, true, `${name}: Discord session persists`);
    click(window, document.getElementById("authGuestV064"), `${name}: Continue as Guest`);
    await waitFor(() => window.CHERRIFT_AUTH.getState().mode === "guest", `${name} Guest mode`);
    assert.equal(document.getElementById("authGateV064")?.hidden, true, `${name}: Guest enters the menu`);
    assert.equal(UI.save.profile?.authProvider, "guest", `${name}: Guest mode is represented in the local profile`);

    assert.deepEqual([...window.CHERRIFT_V060.diagnostics().missingElements], [], `${name}: v0.6 UI is complete`);
    assert.deepEqual([...window.CHERRIFT_V062.diagnostics().duplicateIds], [], `${name}: no duplicate IDs`);
    assert.equal(window.CHERRIFT_V062.diagnostics().libraryServices, true, `${name}: Library services are present`);
    assert.equal(window.CHERRIFT_V063.displayVersion, "v0.6.3", `${name}: v0.6.3 patch is active`);
    assert.match(document.title, /0\.6\.3/, `${name}: document title shows the current build`);
    assert.match(document.getElementById("testBuildBannerV063")?.textContent || "", /TESZTVERZIÓ/, `${name}: home clearly identifies the test build`);
    assert.equal(document.querySelectorAll("#mainStatsV063 > div").length, 3, `${name}: home has Power, HP and ATK cards`);
    assert.equal(document.querySelectorAll("#loadoutStatsV063 > div").length, 3, `${name}: loadout has large stats in its stage`);

    const expectedIcons = {
      Common: {
        Weapon: "steel_sword.png",
        Armor: "leather_chestplate.png",
        Ring: "copper_ring.png"
      },
      Uncommon: {
        Weapon: "sword_sword.png",
        Helmet: "reinforced_leather_helmet.png",
        Necklace: "silver_necklance.png"
      },
      Rare: {
        Weapon: "iron_sword.png",
        Gloves: "iron_gloves.png",
        Ring: "emerald_silver_ring.png"
      },
      Legendary: {
        Weapon: "royal_sword.png",
        Boots: "royal_leg_armor.png",
        Necklace: "royal_necklance.png"
      }
    };
    for (const [rarity, slots] of Object.entries(expectedIcons)) {
      for (const [slot, filename] of Object.entries(slots)) {
        const item = { rarity, slot, type: "Crimson", stats: {} };
        assert.ok(window.CHERRIFT_V063.gearIconPath(item).endsWith(filename), `${name}: ${rarity} ${slot} maps to ${filename}`);
        assert.match(UI.gearEmoji(item), /<img class="gear-icon-v063"/, `${name}: equipment uses image markup`);
      }
    }
    assert.deepEqual(
      { columns: window.CHERRIFT_V0563.sheets.slash.columns, rows: window.CHERRIFT_V0563.sheets.slash.rows, frames: window.CHERRIFT_V0563.sheets.slash.frames },
      { columns: 3, rows: 2, frames: 6 },
      `${name}: Warrior slash uses its real 3×2 grid`
    );
    assert.deepEqual(
      { columns: window.CHERRIFT_V0563.sheets.whirlwind.columns, rows: window.CHERRIFT_V0563.sheets.whirlwind.rows, frames: window.CHERRIFT_V0563.sheets.whirlwind.frames },
      { columns: 4, rows: 2, frames: 8 },
      `${name}: Warrior Whirlwind uses its real 4×2 grid`
    );
    assert.equal(window.CHERRIFT_V063.isBaseMeleeSkin({ player: { skin: "beastclaw_cherry" } }), true, `${name}: Rare generic melee skin receives the base slash`);
    assert.equal(window.CHERRIFT_V063.isBaseMeleeSkin({ player: { skin: "warrior_cherry" } }), false, `${name}: Warrior keeps its dedicated effect`);

    click(window, document.querySelector("#menu .discord-login"), `${name}: open Discord login from the menu account card`);
    await waitFor(() => window.CHERRIFT_AUTH.getState().gateVisible, `${name} reopened login gate`);
    click(window, document.getElementById("authDiscordV064"), `${name}: Discord OAuth choice`);
    await waitFor(() => window.__authOAuthRequests.length === 1, `${name} Discord OAuth request`);
    assert.equal(window.__authOAuthRequests[0].provider, "discord", `${name}: Supabase receives the Discord provider`);
    assert.equal(window.__authOAuthRequests[0].options.redirectTo, baseUrl, `${name}: OAuth returns to the exact game path`);
    window.CHERRIFT_AUTH.continueAsGuest();

    click(window, document.getElementById("dashboardPlayV060"), `${name}: dashboard Play`);
    await waitFor(() => !document.getElementById("worlds")?.classList.contains("hidden"), `${name} World Select`);
    assert.match(document.getElementById("worldLaunchBtn")?.textContent || "", /PLAY|JÁTÉK/i, `${name}: stage launch is enabled`);

    const startsBefore = Number(UI.save.stats?.runsStarted || 0);
    const launchButton = document.getElementById("worldLaunchBtn");
    click(window, launchButton, `${name}: World Select PLAY`);
    click(window, launchButton, `${name}: guarded second PLAY click`);
    await waitFor(() => UI.game.mode === "playing", `${name} game start`);
    assert.equal(UI.game.mode, "playing", `${name}: game starts`);
    assert.equal(document.body.classList.contains("is-playing"), true, `${name}: playing state is visible`);
    assert.ok(Number(UI.save.stats?.runsStarted || 0) <= startsBefore + 1, `${name}: double-click does not create two runs`);

    UI.game.input.keys.add("w");
    UI.game.input.skillQueued = true;
    UI.game.input.pointerActive = true;
    window.dispatchEvent(new window.Event("blur"));
    assert.equal(UI.game.input.keys.size, 0, `${name}: blur clears movement keys`);
    assert.equal(UI.game.input.skillQueued, false, `${name}: blur clears queued skill`);
    assert.equal(UI.game.input.pointerActive, false, `${name}: blur clears touch movement`);

    document.getElementById("raidWarningV040")?.classList.add("show");
    document.getElementById("bossHudV040")?.classList.add("show");
    UI.quit();
    assert.equal(document.getElementById("raidWarningV040")?.classList.contains("show"), false, `${name}: raid overlay clears on exit`);
    assert.equal(document.getElementById("bossHudV040")?.classList.contains("show"), false, `${name}: boss overlay clears on exit`);

    UI.open("libraryV0551");
    const skinsTab = document.querySelector('[data-library-tab="skins"]');
    click(window, skinsTab, `${name}: Library Skins`);
    await waitFor(() => skinsTab.classList.contains("active"), `${name} Library Skins rendering`);
    assert.ok(document.querySelectorAll("#libraryBodyV0551 .v0551-collect").length > 0, `${name}: Library Skins has visual cards`);
    assert.equal(window.getComputedStyle(document.getElementById("raidWarningV040")).pointerEvents, "none", `${name}: raid overlay cannot intercept menu clicks`);

    const dailyFromLibrary = document.querySelector('#libraryServicesV062 [data-v062-open="dailyQuests"]');
    click(window, dailyFromLibrary, `${name}: Library Daily service`);
    await waitFor(() => !document.getElementById("dailyQuests")?.classList.contains("hidden"), `${name} Library child opens`);
    click(window, document.querySelector("#dailyQuests .back"), `${name}: Back from Library child`);
    await waitFor(() => !document.getElementById("libraryV0551")?.classList.contains("hidden"), `${name} return to Library`);
    await waitFor(() => document.querySelector('[data-library-tab="skins"]')?.classList.contains("active"), `${name} Library active tab restore`);
    assert.equal(document.querySelector('[data-library-tab="skins"]')?.classList.contains("active"), true, `${name}: Library restores its active tab`);

    const unreadBeforeMail = window.CHERRIFT_V063.unreadCount();
    click(window, document.querySelector('#libraryServicesV062 [data-v063-open="mailV063"]'), `${name}: Library Mail service`);
    await waitFor(() => !document.getElementById("mailV063")?.classList.contains("hidden"), `${name} Mail opens`);
    assert.equal(document.querySelectorAll("[data-v063-mail-id]").length, 2, `${name}: Mail contains the version messages`);
    assert.equal(window.CHERRIFT_V063.unreadCount(), unreadBeforeMail - 1, `${name}: reading a message updates unread state`);
    click(window, document.querySelector('[data-v063-mail-id="v063_tester_supply"]'), `${name}: tester supply mail`);
    const coinsBeforeMail = UI.save.coins;
    const keysBeforeMail = UI.save.keys;
    click(window, document.querySelector('[data-v063-claim-mail="v063_tester_supply"]'), `${name}: claim mail reward`);
    assert.equal(UI.save.coins, coinsBeforeMail + 30, `${name}: Mail coins are credited`);
    assert.equal(UI.save.keys, keysBeforeMail + 1, `${name}: Mail key is credited`);
    assert.equal(window.CHERRIFT_V063.claimMail("v063_tester_supply"), false, `${name}: Mail reward cannot be claimed twice`);
    click(window, document.querySelector("#mailV063 .back"), `${name}: Back from Mail`);
    await waitFor(() => !document.getElementById("libraryV0551")?.classList.contains("hidden"), `${name} Mail returns to Library`);
    await waitFor(() => document.querySelector('[data-library-tab="skins"]')?.classList.contains("active"), `${name} Mail Library tab restore`);
    assert.equal(document.querySelector('[data-library-tab="skins"]')?.classList.contains("active"), true, `${name}: Mail return preserves Library tab`);

    UI.open("supportV063");
    const feedbackTitle = document.querySelector('#supportV063 [data-v063-field="title"]');
    const feedbackMessage = document.querySelector('#supportV063 [data-v063-field="message"]');
    feedbackTitle.value = "Great equipment update";
    feedbackTitle.dispatchEvent(new window.Event("input", { bubbles: true }));
    feedbackMessage.value = "The new item icons are much clearer.";
    feedbackMessage.dispatchEvent(new window.Event("input", { bubbles: true }));
    click(window, document.querySelector("#supportV063 [data-v063-copy-report]"), `${name}: copy feedback report`);
    await waitFor(() => window.__clipboardText.includes("[Feedback] Great equipment update"), `${name} feedback clipboard`);
    click(window, document.querySelector('#supportV063 [data-v063-support-type="bug"]'), `${name}: Bug Report tab`);
    const bugValues = {
      title: "Example freeze",
      steps: "Open the Library and choose Skins.",
      expected: "The cards appear.",
      actual: "The screen stops responding."
    };
    for (const [fieldName, value] of Object.entries(bugValues)) {
      const field = document.querySelector(`#supportV063 [data-v063-field="${fieldName}"]`);
      field.value = value;
      field.dispatchEvent(new window.Event("input", { bubbles: true }));
    }
    click(window, document.querySelector("#supportV063 [data-v063-open-issue]"), `${name}: open bug issue`);
    assert.match(window.__openedUrls.at(-1) || "", /github\.com\/PhantomSouLy\/CHERRIFT\/issues\/new/, `${name}: Bug Report opens the project Issue form`);
    assert.match(decodeURIComponent(window.__openedUrls.at(-1) || ""), /v0\.6\.3/, `${name}: report includes build diagnostics`);

    UI.open("chests");
    UI.save.settings.reducedMotion = true;
    const keysBeforeGacha = UI.save.keys;
    click(window, document.getElementById("openChest"), `${name}: Bloom Chest open`);
    await waitFor(() => UI.save.keys === keysBeforeGacha - 1, `${name} Gacha reward`);
    assert.ok(document.querySelector("#chestResult .gacha-reward-card-v061"), `${name}: Gacha result is a visual reward card`);
    assert.ok(document.querySelector("#chestResult .gacha-reward-icon-v061"), `${name}: Gacha result includes reward art`);

    UI.open("dailyQuests");
    await waitFor(() => document.querySelector("#dailyQuests h2")?.textContent.trim() === "Napi küldetések", `${name} Hungarian Daily Quests`);
    const englishQuestNames = new Set(["Slime Cleanup", "Keep Moving", "Stage Hunter", "Treasure Trail", "Open Sesame", "Gear Collector", "Boss Breaker"]);
    assert.equal(englishQuestNames.has(document.querySelector("#dailyListV055 h3")?.textContent.trim()), false, `${name}: dynamic quest title is Hungarian`);

    UI.open("shopV055");
    await waitFor(() => document.querySelector("#shopListV055 article p")?.textContent.trim() === "100 érme", `${name} Hungarian Shop rewards`);
    const shopRewards = [...document.querySelectorAll("#shopListV055 article p")].map(element => element.textContent.trim());
    assert.deepEqual(shopRewards, ["100 érme", "1 kulcs", "3 kulcs", "300 érme"], `${name}: Shop rewards have no dangling zero values`);

    UI.open("achievements");
    await waitFor(() => document.querySelector("#v052Achievements h3")?.textContent.trim() === "Első Virágzás", `${name} Hungarian achievement rendering`);

    UI.open("settings");
    assert.equal(document.getElementById("settingsResumeAction")?.classList.contains("hidden"), true, `${name}: Resume run stays hidden outside a paused run`);
    assert.equal(document.querySelector(".discord-login")?.disabled, false, `${name}: Discord login is enabled`);
    const language = document.getElementById("languageV060");
    language.value = "en";
    language.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(document.documentElement.lang, "en", `${name}: English language applies`);
    assert.equal(document.querySelector("#settings h2")?.textContent.trim(), "Settings", `${name}: English Settings title`);
    window.CHERRIFT_AUTH.openGate();
    assert.equal(document.getElementById("authTitleV064")?.textContent.trim(), "How would you like to continue?", `${name}: auth gate translates to English`);
    window.CHERRIFT_AUTH.continueAsGuest();
    assert.match(document.getElementById("testBuildBannerV063")?.textContent || "", /TEST BUILD/, `${name}: test-build banner translates to English`);
    UI.open("mailV063");
    assert.equal(document.querySelector("#mailV063 .panel-head-v063 h2")?.textContent.trim(), "Mail", `${name}: Mail header translates to English`);
    UI.open("supportV063");
    assert.equal(document.querySelector("#supportV063 .panel-head-v063 h2")?.textContent.trim(), "Feedback & bug report", `${name}: Support header translates to English`);
    assert.equal(window.CHERRIFT_I18N.translate("World 1-1 · Blooming Meadow"), "World 1-1 · Blooming Meadow", `${name}: English compound stage title`);
    assert.equal(window.CHERRIFT_I18N.translate("Válassz pályát lapozással, majd lent nyomj Play-t."), "Browse the stages, then press Play below.", `${name}: legacy Hungarian copy translates to English`);
    UI.open("dailyQuests");
    await waitFor(() => document.querySelector("#dailyQuests h2")?.textContent.trim() === "Daily Quests", `${name} English Daily Quests`);
    assert.equal(englishQuestNames.has(document.querySelector("#dailyListV055 h3")?.textContent.trim()), true, `${name}: dynamic quest title is English`);
    UI.openWorldSelect();
    await waitFor(() => document.getElementById("carouselStageDesc")?.textContent.includes("opening stage"), `${name} dynamic English stage description`);
    language.value = "hu";
    language.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(document.documentElement.lang, "hu", `${name}: Hungarian language applies`);
    assert.equal(document.querySelector("#settings h2")?.textContent.trim(), "Beállítások", `${name}: Hungarian Settings title`);
    assert.equal(window.CHERRIFT_I18N.translate("World 1-1 · Blooming Meadow"), "Világ 1-1 · Virágzó Rét", `${name}: Hungarian compound stage title`);
    assert.equal(window.CHERRIFT_I18N.translate("Clear your first stage."), "Teljesítsd az első pályádat.", `${name}: achievement copy translates to Hungarian`);

    const discordSession = {
      user: {
        id: "supabase-user-1",
        user_metadata: {
          full_name: "Cherry Discord",
          user_name: "cherrytester",
          avatar_url: "https://cdn.discord.test/avatar.png"
        },
        identities: [{ provider: "discord", identity_data: { provider_id: "123456789" } }]
      }
    };
    window.__authSession = discordSession;
    assert.equal(window.CHERRIFT_AUTH.applySessionForTesting(discordSession), true, `${name}: Discord session is accepted`);
    assert.equal(window.CHERRIFT_AUTH.getState().account?.discordId, "123456789", `${name}: Discord identity is normalized`);
    assert.equal(document.querySelector("#menu .login-copy strong")?.textContent, "Cherry Discord", `${name}: Discord profile appears on the main menu`);
    UI.open("settings");
    document.querySelector('[data-v060-settings="account"]')?.click();
    assert.match(document.querySelector('[data-v060-settings-page="account"]')?.textContent || "", /Cherry Discord/, `${name}: Settings Account shows the connected user`);
    await window.CHERRIFT_AUTH.signOut();
    await waitFor(() => window.CHERRIFT_AUTH.getState().gateVisible, `${name} sign-out gate`);
    assert.equal(UI.save.profile?.authProvider, "guest", `${name}: sign-out returns the local profile to Guest`);
    window.CHERRIFT_AUTH.continueAsGuest();

    UI.save.settings.viewZoom = 1;
    const balancedZoom = window.CHERRIFT_V062.fairCameraZoom();
    UI.save.settings.viewZoom = 1.2;
    const closeZoom = window.CHERRIFT_V062.fairCameraZoom();
    assert.ok(closeZoom > balancedZoom && closeZoom <= 1.72, `${name}: camera setting changes a fair capped zoom`);

    window.localStorage.setItem(window.CherriftStorage.key, "{broken");
    window.localStorage.setItem("cherrift_save_backup_v04", JSON.stringify({ coins: 777, selectedSkin: "cherry_default" }));
    const recovered = window.CherriftStorage.load();
    assert.equal(recovered.coins, 777, `${name}: corrupt save recovers from backup`);
    assert.equal(recovered.schemaVersion, 6, `${name}: save migrates to schema 6`);
    assert.ok(recovered.mailbox?.states?.v063_welcome, `${name}: Mail state survives save migration`);

    if (width <= 820) {
      assert.equal(document.querySelectorAll("#globalMobileNavV052 [data-v060-open]").length, 6, `${name}: mobile nav includes all six destinations`);
      assert.ok(document.getElementById("upgradeTabsV061"), `${name}: Player Upgrade uses compact tabs`);
      assert.ok(document.getElementById("gearTabsV061"), `${name}: Gear uses compact tabs`);
      assert.ok(document.getElementById("libraryServicesV062"), `${name}: mobile Library exposes services`);
      assert.equal(document.querySelectorAll(".mobile-power-v051 > div").length, 3, `${name}: mobile home shows Power, HP and ATK without a separate page`);
      assert.ok(document.querySelector('.mobile-header-tool-v063[data-open="mailV063"]'), `${name}: mobile home exposes Mail`);
      assert.ok(document.querySelector('.mobile-header-tool-v063[data-open="supportV063"]'), `${name}: mobile home exposes Feedback`);
    }

    const meaningfulErrors = errors.filter(error => !/Not implemented: HTMLCanvasElement|Could not load link/i.test(error));
    assert.deepEqual(meaningfulErrors, [], `${name}: no runtime console errors`);
    return {
      name,
      viewport: `${width}x${height}`,
      camera: `${balancedZoom.toFixed(2)}–${closeZoom.toFixed(2)}`,
      libraryCards: document.querySelectorAll("#libraryBodyV0551 .v0551-collect").length
    };
  } finally {
    dom.window.close();
  }
}

async function exerciseReturningSession() {
  const { dom, window, errors } = await loadApp("returning-session", 1280, 760);
  try {
    await waitFor(() => window.CHERRIFT_AUTH.getState().mode === "discord", "returning Discord session restoration");
    assert.equal(window.CHERRIFT_AUTH.getState().gateVisible, false, "returning session: login gate is skipped");
    assert.equal(window.CHERRIFT_AUTH.getState().account?.discordId, "987654321", "returning session: Discord identity is restored");
    assert.equal(window.document.querySelector("#menu .login-copy strong")?.textContent, "Returning Cherry", "returning session: account card is restored");
    const meaningfulErrors = errors.filter(error => !/Not implemented: HTMLCanvasElement|Could not load link/i.test(error));
    assert.deepEqual(meaningfulErrors, [], "returning session: no runtime console errors");
    return { name: "returning Discord session", viewport: "1280x760" };
  } finally {
    dom.window.close();
  }
}

try {
  const results = [];
  results.push(await exercise("desktop", 1440, 900));
  results.push(await exercise("mobile", 390, 844));
  const returningSession = await exerciseReturningSession();
  for (const result of results) {
    console.log(`PASS ${result.name} ${result.viewport} · camera ${result.camera} · ${result.libraryCards} Library skin cards`);
  }
  console.log(`PASS ${returningSession.name} ${returningSession.viewport}`);
  console.log("CHERRIFT smoke tests passed.");
} finally {
  await new Promise(resolve => server.close(resolve));
}
