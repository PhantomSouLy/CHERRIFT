(() => {
  "use strict";

  const VERSION = "0.5.1-mobile-archero-menu";
  const MOBILE_QUERY = "(max-width: 820px)";
  const id = name => document.getElementById(name);

  if (!window.UI || !window.CHERRIFT_DATA || !window.CHERRIFT_V040) {
    console.error("[CHERRIFT v0.5.1 Mobile] Required systems missing.");
    return;
  }

  function ensureStyles() {
    if (document.getElementById("mobileV051Styles")) return;
    const link = document.createElement("link");
    link.id = "mobileV051Styles";
    link.rel = "stylesheet";
    link.href = "mobile_v051.css?v=051";
    document.head.appendChild(link);
  }

  function isPhoneMode() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function stageFor(save) {
    const stages = window.CHERRIFT_V040?.stages || [];
    return stages.find(stage => stage.id === save?.selectedStageId) || stages[0] || null;
  }

  function rewardText(reward) {
    if (!reward) return "—";
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins} coins`);
    if (reward.keys) parts.push(`${reward.keys} key${reward.keys === 1 ? "" : "s"}`);
    return parts.join(" · ") || "—";
  }

  function ensureMobileMenu() {
    const home = document.querySelector(".mobile-home-v031");
    if (!home || home.dataset.v051Ready === "1") return;

    home.dataset.v051Ready = "1";
    home.classList.add("mobile-archero-v051");
    home.innerHTML = `
      <header class="mobile-game-header-v051">
        <div class="mobile-profile-v051">
          <div class="mobile-avatar-v051" id="mobileAvatarV051">🐰</div>
          <div class="mobile-profile-copy-v051">
            <small>CHERRIFT PLAYER</small>
            <b id="mobilePlayerLevelV051">Level 1</b>
            <div class="mobile-profile-xp-v051"><i id="mobileProfileXpFillV051"></i></div>
          </div>
        </div>

        <button class="mobile-header-settings-v051" data-open="settings" aria-label="Settings">⚙</button>
      </header>

      <section class="mobile-resources-v051" aria-label="Resources">
        <button class="mobile-resource-v051 energy">
          <span>⚡</span>
          <div><small>ENERGY</small><b id="mobileEnergyValue">5</b></div>
          <i>+</i>
        </button>
        <button class="mobile-resource-v051 coins">
          <span>🪙</span>
          <div><small>COINS</small><b id="mobileCoinsValue">0</b></div>
          <i>+</i>
        </button>
        <button class="mobile-resource-v051 keys" data-open="chests">
          <span>🗝️</span>
          <div><small>KEYS</small><b id="mobileKeysValue">0</b></div>
          <i>+</i>
        </button>
      </section>

      <main class="mobile-hero-area-v051">
        <div class="mobile-floating-actions-v051 left">
          <button data-open="chests"><span>🎁</span><b>Chest</b><em id="mobileChestBadgeV051">!</em></button>
          <button data-open="gear"><span>⚔️</span><b>Gear</b></button>
          <button data-open="skins"><span>🐰</span><b>Skins</b></button>
        </div>

        <section class="mobile-character-stage-v051">
          <div class="mobile-world-label-v051">
            <small id="mobileWorldLabelV051">WORLD 1</small>
            <b id="mobileStageChip">World 1-1</b>
          </div>

          <div class="mobile-character-display-v051">
            <div class="mobile-stage-art" id="mobileStageArt"></div>
            <div class="mobile-character-glow-v051"></div>
            <div class="mobile-character-icon-v051" id="mobileCharacterIconV051">🐰</div>
            <div class="mobile-power-v051">
              <small>POWER</small>
              <b id="mobilePowerV051">0</b>
            </div>
          </div>

          <div class="mobile-stage-copy-v051">
            <h2 id="mobileStageTitle">Blooming Meadow</h2>
            <p id="mobileStageSub">Ready to clear</p>
          </div>
        </section>

        <div class="mobile-floating-actions-v051 right">
          <button class="locked-feature-v051"><span>📋</span><b>Quests</b><em>SOON</em></button>
          <button class="locked-feature-v051"><span>🏆</span><b>Goals</b><em>SOON</em></button>
          <button class="locked-feature-v051"><span>🛒</span><b>Shop</b><em>SOON</em></button>
        </div>
      </main>

      <section class="mobile-stage-panel-v051">
        <button class="mobile-stage-select-v051" id="mobileStageSelectV051">
          <div>
            <small>SELECTED STAGE</small>
            <b id="mobileSelectedStageV051">World 1-1 · Blooming Meadow</b>
          </div>
          <span>›</span>
        </button>

        <div class="mobile-stage-stats-v051">
          <div><small>OBJECTIVE</small><b id="mobileObjectiveValue">120 enemies</b></div>
          <div><small>REWARD</small><b id="mobileRewardValue">28 coins</b></div>
          <div><small>FIRST CLEAR</small><b id="mobileFirstRewardValue">55 coins</b></div>
        </div>

        <button id="mobilePlayBtn" class="mobile-play-v051">
          <span class="mobile-play-icon-v051">▶</span>
          <strong>PLAY</strong>
          <small id="mobilePlayCost">START STAGE</small>
        </button>
      </section>

      <nav class="mobile-bottom-nav mobile-bottom-nav-v051" aria-label="Mobile navigation">
        <button data-open="menu" class="active"><span>🏠</span><b>Home</b></button>
        <button data-open="gear"><span>🛡️</span><b>Gear</b></button>
        <button data-open="chests"><span>📦</span><b>Chest</b></button>
        <button data-open="skins"><span>🐇</span><b>Cherry</b></button>
        <button data-open="settings"><span>☰</span><b>More</b></button>
      </nav>
    `;

    const stageSelect = id("mobileStageSelectV051");
    if (stageSelect) {
      stageSelect.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        window.UI?.openWorldSelect?.();
      };
    }
  }

  function totalPower(save) {
    const weights = {
      damage: 6,
      crit: 8,
      critDamage: 2.5,
      attackSpeed: 3,
      maxHp: 0.32,
      armor: 4,
      regen: 18,
      moveSpeed: 2.5,
      pickup: 0.8
    };

    let power = 100 + Math.max(0, (save?.account?.level || 1) - 1) * 14;
    for (const gear of Object.values(save?.equipped || {})) {
      if (!gear) continue;
      for (const [stat, value] of Object.entries(gear.stats || {})) {
        power += Number(value || 0) * (weights[stat] || 1);
      }
    }
    return Math.round(power);
  }

  function refreshPhoneMenu(save) {
    if (!save || !isPhoneMode()) return;
    ensureMobileMenu();

    const stage = stageFor(save);
    const skin = CHERRIFT_DATA.skins.find(entry => entry.id === save.selectedSkin) || CHERRIFT_DATA.skins[0];
    const level = Math.max(1, Number(save.account?.level) || 1);
    const xp = Math.max(0, Number(save.account?.xp) || 0);
    const xpNext = Math.max(1, Number(save.account?.xpNext) || 1);
    const cleared = !!save.clearedStages?.[stage?.id];

    if (id("mobilePlayerLevelV051")) id("mobilePlayerLevelV051").textContent = `Level ${level}`;
    if (id("mobileProfileXpFillV051")) id("mobileProfileXpFillV051").style.width = `${Math.min(100, xp / xpNext * 100)}%`;
    if (id("mobileAvatarV051")) id("mobileAvatarV051").textContent = skin?.emoji || "🐰";
    if (id("mobileCharacterIconV051")) id("mobileCharacterIconV051").textContent = skin?.emoji || "🐰";

    if (id("mobileEnergyValue")) id("mobileEnergyValue").textContent = save.energy ?? 5;
    if (id("mobileCoinsValue")) id("mobileCoinsValue").textContent = Math.floor(save.coins || 0);
    if (id("mobileKeysValue")) id("mobileKeysValue").textContent = Math.floor(save.keys || 0);
    if (id("mobileChestBadgeV051")) id("mobileChestBadgeV051").classList.toggle("hidden", !(save.keys > 0));
    if (id("mobilePowerV051")) id("mobilePowerV051").textContent = totalPower(save);

    if (!stage) return;
    if (id("mobileWorldLabelV051")) id("mobileWorldLabelV051").textContent = `WORLD ${stage.world}`;
    if (id("mobileStageChip")) id("mobileStageChip").textContent = stage.name;
    if (id("mobileStageTitle")) id("mobileStageTitle").textContent = stage.title;
    if (id("mobileStageSub")) id("mobileStageSub").textContent = cleared ? "Cleared · Replay available" : "Ready to clear";
    if (id("mobileSelectedStageV051")) id("mobileSelectedStageV051").textContent = `${stage.name} · ${stage.title}`;
    if (id("mobileObjectiveValue")) id("mobileObjectiveValue").textContent = `${stage.goalKills} enemies`;
    if (id("mobileRewardValue")) id("mobileRewardValue").textContent = rewardText(stage.repeatReward);
    if (id("mobileFirstRewardValue")) {
      id("mobileFirstRewardValue").textContent = save.firstClearClaimed?.[stage.id] ? "Claimed" : rewardText(stage.firstClearReward);
    }

    const art = id("mobileStageArt");
    if (art) {
      art.classList.toggle("night", stage.world === 2 || stage.theme === "forest_night");
      art.classList.toggle("world3-v051", stage.world === 3);
      if (stage.world === 3) {
        art.style.backgroundImage =
          "radial-gradient(circle at 50% 30%,rgba(255,157,78,.30),transparent 36%),linear-gradient(180deg,#643423,#160d13)";
      } else {
        const source = stage.world === 2 ? CHERRIFT_CONFIG.map.world2 : CHERRIFT_CONFIG.map.world1;
        art.style.backgroundImage =
          `linear-gradient(180deg,rgba(5,3,12,.03),rgba(5,3,12,.50)),url("${source}")`;
      }
    }
  }

  ensureStyles();
  ensureMobileMenu();

  const oldInit = UI.init.bind(UI);
  UI.init = function initMobileV051(save, game) {
    ensureMobileMenu();
    const result = oldInit(save, game);
    refreshPhoneMenu(save);
    return result;
  };

  const oldRefresh = UI.refreshMenu.bind(UI);
  UI.refreshMenu = function refreshMobileV051(...args) {
    const result = oldRefresh(...args);
    refreshPhoneMenu(this.save);
    return result;
  };

  const oldOpen = UI.open.bind(UI);
  UI.open = function openMobileV051(panel, ...args) {
    const result = oldOpen(panel, ...args);
    if (panel === "menu") refreshPhoneMenu(this.save);
    return result;
  };

  window.addEventListener("resize", () => {
    if (isPhoneMode()) refreshPhoneMenu(UI.save);
  });

  window.matchMedia(MOBILE_QUERY).addEventListener?.("change", event => {
    if (event.matches) refreshPhoneMenu(UI.save);
  });

  window.CHERRIFT_MOBILE_V051 = {
    version: VERSION,
    refresh: refreshPhoneMenu
  };

  console.info("[CHERRIFT v0.5.1] Phone-only Archero menu loaded.");
})();