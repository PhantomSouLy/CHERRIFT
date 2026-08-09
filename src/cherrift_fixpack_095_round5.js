(() => {
  "use strict";

  if (window.__CHERRIFT_FIXPACK_095_ROUND5__) return;
  window.__CHERRIFT_FIXPACK_095_ROUND5__ = true;

  const VERSION = "0.9.5-fixpack-5.1";
  const id = value => document.getElementById(value);
  const q = (selector, root = document) => root?.querySelector?.(selector) || null;
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const state = {
    started: false,
    queued: false,
    observer: null,
    imageCache: new Map(),
    assetResolvePromise: null,
    gameplayPatched: false,
    uiWrapped: false,
    clickBound: false
  };

  const SKIN_FOLDER_ALIASES = Object.freeze({ cherry_default: "base_cherry" });
  const RARITY_COLORS = Object.freeze({
    common: "#f4e8ef",
    uncommon: "#83e39b",
    rare: "#69c9ff",
    epic: "#c276ff",
    legendary: "#f2c454",
    mythical: "#ff5f9e"
  });


  function language() {
    return window.CHERRIFT_LOCALIZATION?.language?.() === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  }

  function copy(hu, en) { return language() === "en" ? en : hu; }

  function skinFolder(skin) {
    if (!skin) return "base_cherry";
    return skin.folder || window.CHERRIFT_CONFIG?.player?.skins?.[skin.id]?.folder || SKIN_FOLDER_ALIASES[skin.id] || skin.id;
  }

  function imageWorks(source) {
    if (!source) return Promise.resolve(false);
    if (state.imageCache.has(source)) return state.imageCache.get(source);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = source;
    });
    state.imageCache.set(source, promise);
    return promise;
  }

  async function firstWorking(candidates) {
    const unique = [...new Set(candidates.filter(Boolean).map(String))];
    for (const source of unique) {
      if (await imageWorks(source)) return source;
    }
    return unique[0] || "";
  }

  async function resolveSkinAssets() {
    if (state.assetResolvePromise) return state.assetResolvePromise;
    state.assetResolvePromise = (async () => {
      const skins = window.CHERRIFT_DATA?.skins || [];
      await Promise.all(skins.map(async skin => {
        const folder = skinFolder(skin);
        const root = `assets/player/skins/${folder}`;
        const icon = await firstWorking([
          `${root}/${folder}_icon.png`,
          `${root}/${folder}_icon.jpg`,
          `${root}/${folder}_icon.jpeg`,
          skin.icon,
          folder === "beastclaw_cherry" ? `${root}/beatclaw_cherry_icon.jpg` : "",
          folder === "cake_deliver_cherry" ? `${root}/cake_delivery_cherry_icon.jpg` : ""
        ]);
        const splash = await firstWorking([
          `${root}/${folder}_splashart.png`,
          `${root}/${folder}_splashart.jpg`,
          `${root}/${folder}_splashart.jpeg`,
          skin.splash
        ]);
        try {
          if (icon) skin.icon = icon;
          if (splash) skin.splash = splash;
        } catch (_) {}
      }));
      return skins;
    })();
    return state.assetResolvePromise;
  }

  function ensureCss() {
    if (id("cherriftFixpack095Round5Css")) return;
    const style = document.createElement("style");
    style.id = "cherriftFixpack095Round5Css";
    style.textContent = `
      /* Canonical 3:4 Cherry splash stage. The UI owns a fixed box; images never resize the layout. */
      #skins .skin-art-v093,
      #skins .theme-full-splash-v5{
        width:100%!important;
        height:clamp(420px,58vh,680px)!important;
        min-height:420px!important;
        max-height:680px!important;
        background-size:contain!important;
        background-position:center center!important;
        background-repeat:no-repeat!important;
        background-color:#0c0710!important;
      }
      #skins .fix-splash-img-v095{display:none!important;visibility:hidden!important;pointer-events:none!important}
      @media(max-width:820px){
        #skins .skin-art-v093,#skins .theme-full-splash-v5{height:clamp(330px,49vh,480px)!important;min-height:330px!important;max-height:480px!important}
      }
      @media(max-width:520px){#skins .skin-art-v093,#skins .theme-full-splash-v5{height:370px!important;min-height:370px!important}}

      /* Desktop Lobby secondary navigation. Mobile keeps these entries inside More. */
      #r5LobbySubnav{height:39px;display:flex;align-items:center;gap:24px;padding:0 max(18px,calc((100vw - 1520px)/2));
        border-bottom:1px solid rgba(212,112,159,.18);background:var(--theme-surface-glass,rgba(255,247,250,.96));position:relative;z-index:8100}
      #r5LobbySubnav button{height:39px;padding:0 11px;border:0;border-bottom:3px solid transparent;background:transparent;color:var(--theme-text,#51313f);font:800 12px/1 system-ui,sans-serif;cursor:pointer}
      #r5LobbySubnav button.active{color:var(--theme-primary-strong,#a93268);border-bottom-color:var(--theme-primary,#c85e8c)}
      @media(max-width:820px){#r5LobbySubnav{display:none!important}}

      /* Desktop Energy stays visually separated from currency. */
      #r5DesktopEnergy{display:inline-flex;align-items:center;gap:6px;min-height:34px;margin-left:8px;padding:0 10px;border:1px solid rgba(238,151,194,.38);border-radius:10px;
        background:linear-gradient(180deg,rgba(63,29,51,.92),rgba(31,16,28,.92));color:var(--theme-text,#f7e5ed);font:850 12px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap}
      #r5DesktopEnergy::before{content:"";width:1px;height:20px;margin-left:-15px;margin-right:7px;background:rgba(231,151,190,.28)}
      #r5DesktopEnergy .bolt{color:#ffd45e;font-size:15px}
      @media(max-width:820px){#r5DesktopEnergy{display:none!important}}

      /* Sakura Essence skin shop: icon and card rarity are obvious at a glance. */
      .r5-skin-shop-card{--r5-rarity:#f4e8ef!important;border:2px solid var(--r5-rarity)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--r5-rarity) 35%,transparent),0 10px 28px rgba(0,0,0,.16)!important}
      .r5-skin-shop-card.rarity-common{--r5-rarity:#f4e8ef!important}.r5-skin-shop-card.rarity-uncommon{--r5-rarity:#83e39b!important}.r5-skin-shop-card.rarity-rare{--r5-rarity:#69c9ff!important}
      .r5-skin-shop-card.rarity-epic{--r5-rarity:#c276ff!important}.r5-skin-shop-card.rarity-legendary{--r5-rarity:#f2c454!important}.r5-skin-shop-card.rarity-mythical{--r5-rarity:#ff5f9e!important}
      .r5-skin-shop-card>img,.r5-skin-shop-card>span>img,.r5-skin-shop-card .fix-skin-icon-v095{width:92px!important;height:92px!important;object-fit:cover!important;border:3px solid var(--r5-rarity)!important;border-radius:14px!important;box-shadow:0 0 18px color-mix(in srgb,var(--r5-rarity) 42%,transparent)!important}

      /* Locked enemy Collection cards reveal no silhouette/colour information. */
      .enemy-card-v084.locked canvas{display:none!important;visibility:hidden!important}
      .r5-locked-enemy-question{width:78px;height:78px;display:grid;place-items:center;margin:4px auto 12px;border-radius:50%;border:1px solid rgba(210,140,176,.25);background:rgba(255,255,255,.035);color:#d9bdca;font:900 44px/1 Georgia,serif;text-shadow:0 0 18px rgba(238,108,170,.24)}

      /* Daily toolbar no longer flashes white in the default theme. */
      #dailyRerollV055,#dailyClaimAllV055{color:var(--theme-text,#f6e3ec)!important;border:1px solid rgba(221,114,166,.35)!important;border-radius:10px!important;background:linear-gradient(180deg,#331728,#21101c)!important;box-shadow:none!important}
      #dailyRerollV055:hover,#dailyClaimAllV055:hover{border-color:#d15c94!important;background:#3b1a2f!important}
      #dailyRerollV055:disabled,#dailyClaimAllV055:disabled{opacity:.55!important;color:#a98d9b!important;background:#21131d!important}

      /* Avatar image and decorative frame are independent layers. */
      .prebeta-avatar{position:relative!important;display:inline-grid!important;place-items:center!important;overflow:visible!important;isolation:isolate}
      .prebeta-avatar>img:not(.prebeta-avatar-frame){position:absolute!important;left:50%!important;top:50%!important;width:var(--r5-avatar-size,72%)!important;height:var(--r5-avatar-size,72%)!important;transform:translate(-50%,-50%)!important;border-radius:50%!important;object-fit:cover!important;object-position:center 38%!important;z-index:1!important}
      .prebeta-avatar>.prebeta-avatar-frame{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;z-index:2!important;pointer-events:none!important;transform:none!important}

      /* Every profile surface uses one coordinate system for the circular
         portrait and its decorative frame. This also resets stale margins or
         transforms left behind by an older profile renderer. */
      .profile-avatar-bf,.profile-avatar-v082{position:relative!important;display:block!important;overflow:visible!important}
      .profile-avatar-bf>.prebeta-avatar,.profile-avatar-v082>.prebeta-avatar{
        position:absolute!important;inset:0!important;left:0!important;top:0!important;
        width:100%!important;height:100%!important;margin:0!important;translate:none!important;
        transform:none!important;box-sizing:border-box!important
      }
      .profile-avatar-bf>.prebeta-avatar>img:not(.prebeta-avatar-frame),
      .profile-avatar-v082>.prebeta-avatar>img:not(.prebeta-avatar-frame){
        left:50%!important;top:50%!important;width:var(--r5-avatar-size,72%)!important;
        height:var(--r5-avatar-size,72%)!important;transform:translate(-50%,-50%)!important
      }
      .profile-avatar-bf>.prebeta-avatar>.prebeta-avatar-frame,
      .profile-avatar-v082>.prebeta-avatar>.prebeta-avatar-frame{inset:0!important;margin:0!important;transform:none!important}
      #railProfileIconV082,#railProfileIconV060{position:relative!important;overflow:visible!important}
      #railProfileIconV082>.prebeta-avatar,#railProfileIconV060>.prebeta-avatar{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important}

      /* The nav always reserves three stable columns. Currency values may
         change, but routing can no longer re-centre or jump the menu. */
      @media(min-width:821px){
        body.v0933-desktop #globalRailV060.topnav-v0933{grid-template-columns:170px minmax(0,1fr) max-content!important;column-gap:12px!important}
        body.v0933-desktop .topnav-v0933 .rail-brand-v060{grid-column:1!important;justify-self:start!important}
        body.v0933-desktop .topnav-v0933 .rail-text-nav-v095{grid-column:2!important;width:max-content!important;max-width:100%!important;justify-self:center!important;overflow:visible!important}
        body.v0933-desktop .topnav-v0933 .rail-bottom-v060{grid-column:3!important;justify-self:end!important;min-width:max-content!important;flex-wrap:nowrap!important;margin-left:8px!important}
        body.v0933-desktop #desktopCurrencyV0943{flex:0 0 auto!important;margin-right:8px!important}
        body.v0933-desktop #r5DesktopEnergy{order:1!important;flex:0 0 auto!important;margin:0 8px 0 0!important}
        body.v0933-desktop .rail-profile-v060{order:2!important;flex:0 0 auto!important}
        body.v0933-desktop .rail-settings-v060{order:3!important;flex:0 0 auto!important}
      }
      @media(min-width:821px) and (max-width:1900px){
        body.v0933-desktop #globalRailV060.topnav-v0933{grid-template-columns:145px minmax(0,1fr) max-content!important;column-gap:6px!important;padding-inline:12px!important}
        body.v0933-desktop .topnav-v0933 .rail-brand-v060{width:140px!important;min-width:0!important}
        body.v0933-desktop .topnav-v0933 .rail-brand-v060 small{display:none!important}
        body.v0933-desktop .topnav-v0933 .rail-text-nav-v095 .rail-text-v095{padding-inline:7px!important}
        body.v0933-desktop .topnav-v0933 .rail-text-nav-v095 .rail-text-v095 b{font-size:12px!important}
        body.v0933-desktop .topnav-v0933 .rail-text-nav-v095 :is(.rail-play-v095,.rail-lobby-v095){margin-inline:2px!important;padding-inline:12px!important}
        body.v0933-desktop #desktopCurrencyV0943{gap:2px!important;margin-right:5px!important}
        body.v0933-desktop #desktopCurrencyV0943 span{min-width:45px!important;height:34px!important;padding-inline:5px!important;gap:3px!important}
        body.v0933-desktop #desktopCurrencyV0943 img{width:16px!important;height:16px!important}
        body.v0933-desktop #r5DesktopEnergy{min-height:34px!important;padding-inline:7px!important;margin-right:5px!important}
        body.v0933-desktop .rail-profile-v060{width:100px!important;padding-inline:5px!important}
        body.v0933-desktop .rail-settings-v060{width:34px!important;height:34px!important}
      }

      /* The bottom-right Lobby shortcuts keep their compact footprint. */
      #menuToolsV082.r5-menu-tools{display:grid!important;grid-template-columns:repeat(4,minmax(42px,1fr))!important;gap:7px!important}
      #menuToolsV082.r5-menu-tools button{min-width:44px!important;min-height:44px!important;display:grid!important;place-items:center!important;position:relative!important}
      #menuToolsV082.r5-menu-tools button svg{width:20px;height:20px;fill:currentColor}
      #menuToolsV082.r5-menu-tools button small{font-size:8px!important;line-height:1!important}
      #menuToolsV082.r5-menu-tools .r5-compat-tool{display:none!important}

      /* Public player profile Add Friend action. */
      .r5-public-profile-actions{display:flex;justify-content:center;gap:10px;margin-top:12px;flex-wrap:wrap}
      .r5-public-profile-actions button{min-width:120px}

      .r5-social-self{opacity:.9}.r5-social-self .r5-self-tag{display:inline-flex;margin-left:6px;padding:2px 7px;border-radius:99px;background:rgba(212,75,139,.18);color:#e779ad;font-size:10px;font-weight:900}
      .r5-skill-rule{display:inline-flex;margin-left:8px;padding:3px 8px;border:1px solid rgba(211,98,151,.28);border-radius:99px;color:#d889ae;font-size:10px;font-weight:900;white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function selectedSkin() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    const active = q("#skins .skin-icon-v093.active[data-v093-skin]");
    const explicit = active?.dataset?.v093Skin;
    if (explicit) return skins.find(skin => skin.id === explicit) || null;
    const index = Number(window.UI?.skinIndex);
    if (Number.isInteger(index) && skins[index]) return skins[index];
    return skins.find(skin => skin.id === window.UI?.save?.selectedSkin) || skins[0] || null;
  }

  function patchSplashStage() {
    const panel = id("skins");
    if (!panel || panel.classList.contains("hidden")) return;
    const art = q(".skin-art-v093", panel);
    const skin = selectedSkin();
    if (!art || !skin?.splash) return;
    art.style.setProperty("background-image", `linear-gradient(180deg,rgba(6,3,12,.015),rgba(6,3,12,.18)),url("${skin.splash}")`, "important");
    art.style.setProperty("background-size", "contain", "important");
    art.style.setProperty("background-position", "center center", "important");
    art.style.setProperty("background-repeat", "no-repeat", "important");
    qa(".fix-splash-img-v095", art).forEach(image => image.remove());
  }

  function skinIdFromImage(image) {
    const src = String(image?.getAttribute?.("src") || "");
    const folder = src.match(/assets\/player\/skins\/([^/]+)\//)?.[1];
    const skins = window.CHERRIFT_DATA?.skins || [];
    if (folder) return skins.find(skin => skinFolder(skin) === folder)?.id || "";
    const holder = image?.closest?.("[data-v093-skin],[data-skin-id],[data-skin]");
    return holder?.dataset?.v093Skin || holder?.dataset?.skinId || holder?.dataset?.skin || "";
  }

  const SELECTOR_CANONICAL_ONLY = new Set(["warrior_cherry", "wuxia_sakura_cherry"]);

  function patchSelectorThumbs() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    qa("#skins .skin-icon-v093[data-v093-skin]").forEach(card => {
      const skin = skins.find(entry => entry.id === card.dataset.v093Skin);
      const image = q("img", card);
      if (!skin || !image) return;
      // The selector keeps the tiny optimized WebP cache. Canonical 512x512
      // icons remain the source of truth everywhere else. Marking the image as
      // a legacy splash host intentionally opts it out of Fixpack 1's generic
      // small-image rewrite, avoiding an observer src ping-pong.
      image.classList.add("r5-optimized-selector-thumb", "fix-splash-host-v095");
      const folder = skinFolder(skin);
      const source = SELECTOR_CANONICAL_ONLY.has(skin.id)
        ? skin.icon
        : `assets/ui/skin_thumbs/${folder}.webp`;
      if (source && image.getAttribute("src") !== source) image.setAttribute("src", source);
    });
  }

  function patchSmallSkinImages() {
    const skins = window.CHERRIFT_DATA?.skins || [];
    qa('img[src*="assets/player/skins/"]').forEach(image => {
      if (image.closest(".skin-icon-v093")) return;
      if (!image.closest(".food-card-v080,.cherry-selector-thumb-v095,.mobile-profile-v0932,.cherry-nav-v0942,.cherry-nav-bf,.r5-skin-shop-card")) return;
      const skinId = skinIdFromImage(image);
      const skin = skins.find(entry => entry.id === skinId);
      if (skin?.icon && image.getAttribute("src") !== skin.icon) image.setAttribute("src", skin.icon);
    });
  }


  function patchWorldSplashes() {
    const stages = window.CHERRIFT_V040?.stages || [];
    for (const stage of stages) {
      const world = Number(stage?.world || String(stage?.id || "").match(/world_(\d+)/)?.[1]);
      const chapter = Number(stage?.index || String(stage?.id || "").match(/_(\d+)$/)?.[1]);
      if (!(world >= 1 && world <= 6) || !(chapter >= 1 && chapter <= 5) || stage.training) continue;
      const variant = chapter <= 2 ? 1 : chapter <= 4 ? 2 : world === 4 ? 2 : 3;
      stage.splash = `assets/map/world${world}/world${world}_splashart_${variant}.png`;
    }
  }

  function visible(element) { return !!element && !element.classList.contains("hidden") && element.getClientRects?.().length !== 0; }

  function lobbyRoute() {
    if (visible(id("socialV082"))) return "socialV082";
    if (visible(id("rankingPrebeta"))) return "rankingPrebeta";
    if (visible(id("buffsV082"))) return "buffsV082";
    if (visible(id("menu"))) return "menu";
    return "";
  }

  function ensureLobbySubnav() {
    const route = lobbyRoute();
    const old = id("fixLobbySubnavV095");
    if (old) old.style.setProperty("display", "none", "important");
    let nav = id("r5LobbySubnav");
    if (!route) {
      nav?.remove();
      return;
    }
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "r5LobbySubnav";
      nav.setAttribute("aria-label", "Lobby navigation");
      nav.innerHTML = `
        <button type="button" data-r5-lobby="socialV082">Social</button>
        <button type="button" data-r5-lobby="rankingPrebeta">Rank</button>
        <button type="button" data-r5-lobby="buffsV082">Buff List</button>`;
      const rail = id("globalRailV060");
      if (rail?.parentNode) rail.insertAdjacentElement("afterend", nav);
      else id("app")?.prepend(nav);
    }
    qa("[data-r5-lobby]", nav).forEach(button => button.classList.toggle("active", button.dataset.r5Lobby === route));
  }

  function selfProfile() {
    const auth = window.CHERRIFT_AUTH?.getState?.() || {};
    const account = auth.account || {};
    const save = window.UI?.save || {};
    const sessionUser = window.CHERRIFT_LIVE_SERVICES?.session?.user;
    const displayName = account.displayName || account.name || account.username || save.profile?.name || sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || "Cherry Player";
    const discordName = account.discordName || account.discord_name || account.username || sessionUser?.user_metadata?.user_name || sessionUser?.user_metadata?.preferred_username || displayName;
    return {
      user_id: sessionUser?.id || account.userId || account.id || "",
      public_code: save.profile?.publicCode || save.profile?.public_code || "",
      display_name: displayName,
      discord_name: discordName,
      avatar_url: account.avatar || account.avatarUrl || account.avatar_url || sessionUser?.user_metadata?.avatar_url || "",
      frame_id: save.profile?.frameId || "frame0lvl",
      level: Math.max(1, Number(save.account?.level) || 1),
      power: Number(save.power) || window.CHERRIFT_PREBETA?.calculatePower?.(save) || 0,
      best_weekly_rank: Number(save.economy?.bestWeeklyRank) || 0,
      _self: true
    };
  }

  function avatarMarkup(profile, size = "") {
    const frames = window.CHERRIFT_BALANCE?.frames || [];
    const frameId = profile?.frame_id || profile?.frameId || "frame0lvl";
    const frame = frames.find(entry => entry.id === frameId) || frames[0];
    const image = profile?.avatar_url || profile?.avatarUrl || "assets/player/skins/base_cherry/base_cherry_icon.png";
    return `<span class="prebeta-avatar ${esc(size)}" data-r5-frame-id="${esc(frameId)}"><img src="${esc(image)}" alt=""><img class="prebeta-avatar-frame" src="${esc(frame?.asset || "assets/player/frames/frame0lvl.png")}" alt=""></span>`;
  }

  function socialRow(profile) {
    const isSelf = !!profile?._self;
    const target = profile?.user_id || profile?.id || "";
    return `<article class="prebeta-player-row prebeta-card ${isSelf ? "r5-social-self" : ""}">
      ${avatarMarkup(profile)}
      <div><h3>${esc(profile?.display_name || profile?.discord_name || "Cherry Player")}${isSelf ? '<span class="r5-self-tag">YOU</span>' : ""}</h3>
      <p>Lv.${Math.max(1, Number(profile?.level) || 1)} · Power ${Math.max(0, Math.floor(Number(profile?.power) || 0))}${profile?.public_code ? ` · ${esc(profile.public_code)}` : ""}</p></div>
      <div class="prebeta-player-actions">
        <button class="prebeta-button" type="button" data-r5-view-player="${esc(target)}" data-r5-self="${isSelf ? "1" : "0"}">Profile</button>
        ${!isSelf && target ? `<button class="prebeta-button primary" type="button" data-r5-add-friend="${esc(target)}">Add Friend</button>` : ""}
      </div></article>`;
  }

  async function runSocialSearch() {
    const input = id("prebetaSocialSearch");
    const root = id("prebetaSocialList");
    if (!input || !root) return;
    const query = String(input.value || "").trim();
    if (query.length < 2) return window.UI?.toast?.(copy("Írj be legalább 2 karaktert.", "Enter at least 2 characters."));
    root.innerHTML = `<p class="prebeta-empty prebeta-card">${copy("Keresés…", "Searching…")}</p>`;
    let players = [];
    try {
      const data = await window.CHERRIFT_LIVE_SERVICES?.invoke?.("social_search", { query });
      players = Array.isArray(data?.players) ? data.players : [];
    } catch (error) {
      console.warn("[CHERRIFT R5] social search failed", error);
      window.UI?.toast?.(`${copy("Keresési hiba", "Search error")}: ${error.message || error}`);
    }
    const self = selfProfile();
    const haystack = `${self.display_name || ""} ${self.discord_name || ""} ${self.public_code || ""}`.toLowerCase();
    if (self.user_id && haystack.includes(query.toLowerCase()) && !players.some(player => player.user_id === self.user_id)) players.unshift(self);
    root.innerHTML = players.length ? players.map(socialRow).join("") : `<p class="prebeta-empty prebeta-card">${copy("Nincs megjeleníthető játékos.", "No matching player found.")}</p>`;
  }

  async function addFriend(targetUserId) {
    if (!targetUserId) return;
    try {
      await window.CHERRIFT_LIVE_SERVICES?.invoke?.("friend_request", { target_user_id: targetUserId });
      window.UI?.toast?.(copy("Barátkérelem elküldve.", "Friend request sent."));
    } catch (error) {
      const message = String(error?.message || error || "friend_request_failed");
      const known = {
        friend_list_full: copy("A barátlista megtelt.", "Friend list is full."),
        friend_blocked: copy("A játékos blokkolva van.", "This player is blocked."),
        invalid_friend_target: copy("Érvénytelen játékos.", "Invalid player."),
        friend_request_failed: copy("Nem sikerült elküldeni a kérelmet.", "Could not send the request.")
      };
      window.UI?.toast?.(known[message] || message);
    }
  }

  function showPlayerProfile(profile) {
    let modal = id("r5PlayerProfileModal");
    if (!modal) {
      modal = document.createElement("section");
      modal.id = "r5PlayerProfileModal";
      modal.className = "prebeta-frame-modal hidden";
      document.body.appendChild(modal);
    }
    const self = selfProfile();
    const isSelf = profile?._self || (!!self.user_id && self.user_id === profile?.user_id);
    modal.innerHTML = `<article class="prebeta-frame-dialog prebeta-card prebeta-public-profile">
      <header><h2>${copy("Játékosprofil", "Player Profile")}</h2><button class="prebeta-button" type="button" data-r5-profile-close>×</button></header>
      ${avatarMarkup(profile, "large")}
      <h3>${esc(profile?.display_name || "Cherry Player")}</h3>
      <p>${esc(profile?.public_code || "")}</p>
      <div><article class="prebeta-card"><small>LEVEL</small><b>${Math.max(1, Number(profile?.level) || 1)}</b></article>
      <article class="prebeta-card"><small>POWER</small><b>${Math.max(0, Math.floor(Number(profile?.power) || 0))}</b></article>
      <article class="prebeta-card"><small>BEST WEEKLY</small><b>${Number(profile?.best_weekly_rank) > 0 ? `#${Math.floor(Number(profile.best_weekly_rank))}` : "—"}</b></article></div>
      <div class="r5-public-profile-actions">
        ${!isSelf && profile?.user_id ? `<button class="prebeta-button primary" type="button" data-r5-add-friend="${esc(profile.user_id)}">Add Friend</button>` : ""}
        <button class="prebeta-button" type="button" data-r5-profile-close>${copy("Vissza", "Back")}</button>
      </div></article>`;
    modal.classList.remove("hidden");
    patchAvatarFrames();
  }

  async function loadPlayerProfile(targetUserId, selfFlag = false) {
    if (selfFlag || !targetUserId || targetUserId === selfProfile().user_id) return showPlayerProfile(selfProfile());
    try {
      const data = await window.CHERRIFT_LIVE_SERVICES?.invoke?.("player_profile", { target_user_id: targetUserId });
      if (data?.profile) showPlayerProfile(data.profile);
    } catch (error) {
      window.UI?.toast?.(`${copy("Profil hiba", "Profile error")}: ${error.message || error}`);
    }
  }

  function ensureEnergyPill() {
    if (matchMedia("(max-width:820px)").matches || !window.UI?.save) return;
    let button = id("r5DesktopEnergy");
    if (!button) {
      button = document.createElement("button");
      button.id = "r5DesktopEnergy";
      button.type = "button";
      button.innerHTML = '<span class="bolt">⚡</span><b></b>';
      button.title = "Energy";
      button.setAttribute("aria-label", "Energy");
    }
    const target = q("#globalRailV060 .rail-bottom-v060") || id("resourceBarV082");
    if (target && button.parentElement !== target) target.appendChild(button);
    const save = window.UI.save;
    window.CHERRIFT_PREBETA?.refreshEnergy?.(save);
    const max = Math.max(1, Number(save.energyState?.max) || 50);
    q("b", button).textContent = `${Math.max(0, Number(save.energy) || 0)}/${max}`;
  }

  function patchShopCards() {
    qa(".bag-section-v080").forEach(section => {
      if (!/Sakura Essence Skin Shop/i.test(q("header h2,h2", section)?.textContent || "")) return;
      qa(".food-card-v080", section).forEach(card => {
        card.classList.add("r5-skin-shop-card");
        const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythical"].find(key => card.classList.contains(`rarity-${key}`)) || "common";
        card.style.setProperty("--r5-rarity", RARITY_COLORS[rarity], "important");
      });
    });
  }

  function patchLockedEnemies() {
    qa(".enemy-card-v084.locked").forEach(card => {
      if (!q(".r5-locked-enemy-question", card)) {
        const mark = document.createElement("span");
        mark.className = "r5-locked-enemy-question";
        mark.textContent = "?";
        card.prepend(mark);
      }
    });
  }

  function spentSkillPoints(save) {
    return Object.values(save?.account?.skillTreeV082?.ranks || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
  }

  function reconcileSkillPoints() {
    const save = window.UI?.save;
    if (!save?.account) return;
    save.account.skillTreeV082 ||= { ranks: {} };
    const earned = Math.max(0, Math.floor(Number(save.account.level) || 1) - 1);
    const availableFromLevels = Math.max(0, earned - spentSkillPoints(save));
    const current = Math.max(0, Math.floor(Number(save.account.skillPoints) || 0));
    if (current < availableFromLevels) {
      save.account.skillPoints = availableFromLevels;
      try { window.CherriftStorage?.save?.(save); } catch (_) {}
    }
    const help = q(".skill-tree-help-v082");
    if (help && !q(".r5-skill-rule", help)) help.insertAdjacentHTML("beforeend", `<span class="r5-skill-rule">+1 Skill Point / Player Level</span>`);
  }

  function patchGameplayBalance() {
    const proto = window.CherriftGame?.prototype;
    if (!proto || proto.__r5BaseCombatBalance) return;
    proto.__r5BaseCombatBalance = true;
    const previousStart = proto.start;
    if (typeof previousStart !== "function") return;
    proto.start = async function startR5(...args) {
      const result = await previousStart.apply(this, args);
      if (this.player && !this.player.__r5BaseCombatBalance) {
        // Previous runtime base: 5% crit / 150% crit damage. New progression base: 3% / 125%.
        this.player.crit = Math.max(0, Number(this.player.crit || 0) - 0.02);
        this.player.critDamage = Math.max(1, Number(this.player.critDamage || 1.5) - 0.25);
        this.player.__r5BaseCombatBalance = true;
      }
      return result;
    };
  }

  function patchStatSummary() {
    const grid = q("#statSummaryV082 .stat-final-grid-v082,.stat-final-grid-v082");
    if (!grid) return;
    qa("article", grid).forEach(article => {
      const label = String(q("small", article)?.textContent || "").trim().toLowerCase();
      const value = q("b", article);
      if (!value) return;
      if (/kritikus esély|critical chance/.test(label) && !article.dataset.r5Crit) {
        const old = parseFloat(value.textContent.replace(",", "."));
        if (Number.isFinite(old)) value.textContent = `${Math.max(0, Math.round((old - 2) * 10) / 10)}%`;
        article.dataset.r5Crit = "1";
      } else if (/kritikus sebzés|critical damage/.test(label) && !article.dataset.r5CritDamage) {
        const old = parseFloat(value.textContent.replace(",", "."));
        if (Number.isFinite(old)) value.textContent = `${Math.max(100, Math.round((old - 25) * 10) / 10)}%`;
        article.dataset.r5CritDamage = "1";
      } else if (/atk speed|támadási sebesség/.test(label)) {
        const raw = parseFloat(value.textContent.replace(/[×x%]/gi, "").replace(",", "."));
        if (Number.isFinite(raw)) value.textContent = `${Math.round(raw * 10) / 10}%`;
      }
    });
  }

  function patchProfileUsername() {
    const roots = [id("profileBugfixV0941"), id("profileV082"), id("profile"), q(".profile-panel-bf")].filter(Boolean);
    for (const root of roots) {
      qa("p,small,span,div", root).forEach(node => {
        if (node.children.length) return;
        const text = String(node.textContent || "").trim();
        if (/^Discord\s*:/i.test(text)) node.textContent = text.replace(/^Discord\s*:/i, "Username:");
      });
    }
  }

  function patchAvatarFrames() {
    qa(".prebeta-avatar").forEach(avatar => {
      const frame = q(".prebeta-avatar-frame", avatar);
      const source = String(frame?.getAttribute("src") || "").toLowerCase();
      let size = "72%";
      if (/frame_rank/.test(source)) size = "76%";
      else if (/frame_(?:beta|event|pre_reg)/.test(source)) size = "74%";
      else if (/frame(?:30|50|80|100|150|200|225|250)lvl/.test(source)) size = "70%";
      avatar.style.setProperty("--r5-avatar-size", size);
    });
  }

  function openSupport(type) {
    const systems = window.CHERRIFT_V063;
    if (systems?.runtime) systems.runtime.supportType = type;
    window.UI?.open?.("supportV063");
    requestAnimationFrame(() => {
      q(`[data-v063-support-type="${type}"]`)?.click?.();
      systems?.renderSupport?.();
    });
  }

  function ensureLobbyTools() {
    const tools = id("menuToolsV082");
    if (!tools) return;
    if (tools.dataset.r5Tools === "1" && q('[data-r5-menu-tool="twitch"]', tools)) return;
    tools.dataset.r5Tools = "1";
    tools.classList.add("r5-menu-tools");
    tools.innerHTML = `
      <button type="button" data-r5-menu-tool="feedback" data-v082-menu-tool="feedback" title="Feedback" aria-label="Feedback">💬<small>Feedback</small></button>
      <button type="button" data-r5-menu-tool="bug" data-v082-menu-tool="bug" title="Bug Report" aria-label="Bug Report">🐞<small>Bug</small></button>
      <button type="button" data-r5-menu-tool="web" title="Cherry Website" aria-label="Cherry Website">🌐<small>Web</small></button>
      <button type="button" data-r5-menu-tool="twitch" title="Cherry Twitch" aria-label="Cherry Twitch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2h17v12l-5 5h-4l-3 3v-3H4V2zm2 2v13h5v2l2-2h4l2-2V4H6zm5 3h2v6h-2V7zm4 0h2v6h-2V7z"/></svg><small>Twitch</small></button>
      <button type="button" class="r5-compat-tool" data-v082-menu-tool="mail" aria-hidden="true" tabindex="-1">✉</button>
      <button type="button" class="r5-compat-tool" data-v082-menu-tool="settings" aria-hidden="true" tabindex="-1">⚙</button>`;
  }

  function ensureLobbyFooterLinks() {
    const news = q("#menu .news-card");
    if (news) {
      news.hidden = true;
      news.setAttribute("aria-hidden", "true");
      news.style.setProperty("display", "none", "important");
    }
    const row = q("#menu .social-row");
    if (!row) return;
    if (row.dataset.r5SupportLinks === "1" && q('[data-r5-menu-tool="twitch"]', row)) return;
    row.dataset.r5SupportLinks = "1";
    row.classList.add("r5-support-links");
    row.innerHTML = `
      <button type="button" data-r5-menu-tool="twitch" title="Twitch" aria-label="Twitch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2h17v12l-5 5h-4l-3 3v-3H4V2zm2 2v13h5v2l2-2h4l2-2V4H6zm5 3h2v6h-2V7zm4 0h2v6h-2V7z"/></svg><small>Twitch</small></button>
      <button type="button" data-r5-menu-tool="web" title="Website" aria-label="Website"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3.1a16 16 0 0 0-1.4-3.2A8.1 8.1 0 0 1 18.9 8ZM12 4c.9 1.1 1.6 2.4 1.9 4h-3.8c.3-1.6 1-2.9 1.9-4ZM4.3 14a8 8 0 0 1 0-4h3.5a18 18 0 0 0 0 4H4.3Zm.8 2h3.1c.3 1.2.8 2.3 1.4 3.2A8.1 8.1 0 0 1 5.1 16Zm3.1-8H5.1a8.1 8.1 0 0 1 4.5-3.2A16 16 0 0 0 8.2 8Zm3.8 12c-.9-1.1-1.6-2.4-1.9-4h3.8c-.3 1.6-1 2.9-1.9 4Zm2.3-6H9.7a16 16 0 0 1 0-4h4.6a16 16 0 0 1 0 4Zm.1 5.2c.6-.9 1.1-2 1.4-3.2h3.1a8.1 8.1 0 0 1-4.5 3.2ZM16.2 14a18 18 0 0 0 0-4h3.5a8 8 0 0 1 0 4h-3.5Z"/></svg><small>Web</small></button>
      <button type="button" data-r5-menu-tool="feedback" title="Feedback" aria-label="Feedback"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5v2h12V8H6Zm0 4v2h8v-2H6Z"/></svg><small>Feedback</small></button>
      <button type="button" data-r5-menu-tool="bug" title="Bug Report" aria-label="Bug Report"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.1 4 1.4-1.4 1.4 1.4-1.4 1.4c.7.7 1.2 1.6 1.4 2.6H20v2h-3v2h3v2h-3c-.2 1-.7 1.9-1.4 2.6L17 18l-1.4 1.4-1.4-1.4c-.7.4-1.4.7-2.2.8V7.2c-.8.1-1.5.4-2.2.8l-1.4-1.4L7 8l1.4 1.4C7.7 10.1 7.2 11 7 12H4v2h3c.2 1 .7 1.9 1.4 2.6L7 18l1.4 1.4 1.4-1.4c.7.4 1.4.7 2.2.8A6 6 0 0 0 18 13V9a6 6 0 0 0-3.9-5ZM12 2a3 3 0 0 1 3 3h-6a3 3 0 0 1 3-3Z"/></svg><small>Bug Report</small></button>`;
  }

  function bindClicks() {
    if (state.clickBound) return;
    state.clickBound = true;
    document.addEventListener("click", event => {
      const target = event.target?.closest?.("button,a");
      if (!target) return;

      if (target.matches("[data-prebeta-search]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        runSocialSearch(); return;
      }
      if (target.matches("[data-r5-add-friend]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        addFriend(target.dataset.r5AddFriend); return;
      }
      if (target.matches("[data-r5-view-player]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        loadPlayerProfile(target.dataset.r5ViewPlayer, target.dataset.r5Self === "1"); return;
      }
      if (target.matches("#prebetaRanking [data-prebeta-view-player]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        loadPlayerProfile(target.dataset.prebetaViewPlayer, false); return;
      }
      if (target.matches("[data-r5-profile-close]")) {
        event.preventDefault(); id("r5PlayerProfileModal")?.classList.add("hidden"); return;
      }
      if (target.matches("[data-r5-lobby]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        const route = target.dataset.r5Lobby;
        if (route === "socialV082" || route === "rankingPrebeta") window.CHERRIFT_PREBETA?.open?.(route) || window.UI?.open?.(route);
        else window.UI?.open?.(route);
        schedulePatch(); return;
      }
      if (target.id === "r5DesktopEnergy") {
        event.preventDefault(); window.CHERRIFT_PREBETA?.showEnergyModal?.(); return;
      }
      if (target.matches('.r5-compat-tool[data-v082-menu-tool="mail"]')) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (window.CHERRIFT_ACCOUNT_MAIL?.showMailList) window.CHERRIFT_ACCOUNT_MAIL.showMailList();
        else window.UI?.open?.("mailV063");
        return;
      }
      if (target.matches('.r5-compat-tool[data-v082-menu-tool="settings"]')) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        window.UI?.open?.("settings");
        return;
      }
      if (target.matches("[data-r5-menu-tool]")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        const action = target.dataset.r5MenuTool;
        if (action === "feedback" || action === "bug") openSupport(action);
        else if (action === "web") window.open("https://www.happycherrychan.hu", "_blank", "noopener,noreferrer");
        else if (action === "twitch") window.open("https://www.twitch.tv/happycherrychan", "_blank", "noopener,noreferrer");
      }
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Enter" && event.target?.id === "prebetaSocialSearch") {
        event.preventDefault(); runSocialSearch();
      }
    }, true);
  }

  function wrapUi() {
    if (state.uiWrapped || !window.UI) return;
    state.uiWrapped = true;
    const open = UI.open?.bind(UI);
    if (open) UI.open = function openR5(...args) {
      const result = open(...args);
      // Selector thumbnails must be corrected synchronously so smoke/UI never
      // observes a transient canonical full-size icon in the tiny carousel.
      if (args[0] === "skins") patchSelectorThumbs();
      schedulePatch();
      return result;
    };
    const refresh = UI.refreshMenu?.bind(UI);
    if (refresh) UI.refreshMenu = function refreshR5(...args) { const result = refresh(...args); schedulePatch(); return result; };
  }

  function applyPatches() {
    if (!window.UI?.save) return;
    patchWorldSplashes();
    patchSplashStage();
    patchSelectorThumbs();
    patchSmallSkinImages();
    ensureLobbySubnav();
    ensureEnergyPill();
    patchShopCards();
    patchLockedEnemies();
    reconcileSkillPoints();
    patchStatSummary();
    patchProfileUsername();
    patchAvatarFrames();
    ensureLobbyTools();
    ensureLobbyFooterLinks();
  }

  function schedulePatch() {
    if (state.queued) return;
    state.queued = true;
    requestAnimationFrame(() => {
      state.queued = false;
      applyPatches();
    });
  }

  async function start() {
    if (state.started) return;
    if (!window.UI?.save || !window.CherriftGame || !window.CHERRIFT_DATA?.skins || !window.CHERRIFT_PREBETA) {
      setTimeout(start, 100);
      return;
    }
    state.started = true;
    ensureCss();
    bindClicks();
    wrapUi();
    patchGameplayBalance();
    patchWorldSplashes();
    await resolveSkinAssets();
    schedulePatch();

    state.observer = new MutationObserver(schedulePatch);
    state.observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class", "src"] });
    window.addEventListener("resize", schedulePatch);
    window.addEventListener("cherrift:savechange", schedulePatch);
    window.addEventListener("cherrift:economychange", schedulePatch);
    window.addEventListener("cherrift:languagechange", schedulePatch);
    window.addEventListener("cherrift:prebeta-ready", schedulePatch);

    window.CHERRIFT_FIXPACK_095_R5 = Object.freeze({
      version: VERSION,
      refresh: schedulePatch,
      resolveSkinAssets,
      socialSearch: runSocialSearch,
      addFriend,
      patchWorldSplashes
    });
    window.__CHERRIFT_FIXPACK_095_R5_READY__ = true;
    window.dispatchEvent(new CustomEvent("cherrift:fixpack-095-r5-ready"));
    console.info(`[CHERRIFT] ${VERSION} loaded: social, splash, progression and UI polish.`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
