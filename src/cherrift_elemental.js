/*
 * CHERRIFT Elemental Resonance
 * Isolated progression, affinity and in-run elemental combat module.
 */
(() => {
  "use strict";

  if (window.CHERRIFT_ELEMENTAL) return;
  if (!window.CherriftStorage || !window.CherriftGame || !window.UI || !window.CHERRIFT_DATA) {
    console.error("[CHERRIFT Elemental] Runtime dependencies are missing.");
    return;
  }

  const VERSION = "0.9.5-elemental.1";
  const ELEMENT_IDS = Object.freeze(["blaze", "tidecall", "stoneveil", "windborne", "celestial", "abyssal"]);
  const NODE_ORDER = Object.freeze(["power", "skillDamage", "skinAttackSpeed", "calling", "ring", "passive", "skin", "capstone"]);
  const NODE_MAX = Object.freeze({power:5, skillDamage:3, skinAttackSpeed:1, calling:1, ring:3, passive:3, skin:3, capstone:1});
  const EMPTY_RANKS = Object.freeze({power:0, skillDamage:0, skinAttackSpeed:0, calling:0, ring:0, passive:0, skin:0, capstone:0});

  const ELEMENTS = Object.freeze({
    blaze:Object.freeze({id:"blaze", name:"Blaze", color:"#ff6b35", glow:"#ffb04d", icon:"assets/ui/elemental_resonance/elements/blaze.png"}),
    tidecall:Object.freeze({id:"tidecall", name:"Tidecall", color:"#45c8ff", glow:"#b9f4ff", icon:"assets/ui/elemental_resonance/elements/tidecall.png"}),
    stoneveil:Object.freeze({id:"stoneveil", name:"Stoneveil", color:"#c39458", glow:"#f2d69f", icon:"assets/ui/elemental_resonance/elements/stoneveil.png"}),
    windborne:Object.freeze({id:"windborne", name:"Windborne", color:"#8be7c4", glow:"#e4fff3", icon:"assets/ui/elemental_resonance/elements/windborne.png"}),
    celestial:Object.freeze({id:"celestial", name:"Celestial", color:"#ffe48a", glow:"#fff9d7", icon:"assets/ui/elemental_resonance/elements/celestial.png"}),
    abyssal:Object.freeze({id:"abyssal", name:"Abyssal", color:"#a36bff", glow:"#e0c3ff", icon:"assets/ui/elemental_resonance/elements/abyssal.png"}),
    cute:Object.freeze({id:"cute", name:"Cute", color:"#ff8fca", glow:"#ffd9ed", icon:"assets/ui/elemental_resonance/common/cute_affinity.png", cosmetic:true})
  });

  const SKIN_ELEMENTS = Object.freeze({
    cherry_default:"cute",
    archer_cherry:"windborne",
    beastclaw_cherry:"stoneveil",
    cake_deliver_cherry:"blaze",
    fairy_cherry:"windborne",
    kimono_cherry:"tidecall",
    mage_cherry:"blaze",
    ninja_cherry:"windborne",
    pajama_cherry:"tidecall",
    school_uniform_cherry:"blaze",
    sport_cherry:"stoneveil",
    succubus_cherry:"abyssal",
    warrior_cherry:"stoneveil",
    wuxia_sakura_cherry:"celestial"
  });

  const UI_ASSETS = Object.freeze({
    point:"assets/ui/elemental_resonance/common/resonance_point.png",
    locked:"assets/ui/elemental_resonance/common/resonance_locked.png",
    nodeLocked:"assets/ui/elemental_resonance/nodes/node_locked.png",
    nodeAvailable:"assets/ui/elemental_resonance/nodes/node_available.png",
    nodeInvested:"assets/ui/elemental_resonance/nodes/node_invested.png",
    nodeMaxed:"assets/ui/elemental_resonance/nodes/node_maxed.png"
  });

  const EFFECT_ASSETS = Object.freeze({
    blazeMeteor:"assets/effects/elemental/blaze/fire_meteor.png",
    blazeMeteorImpact:"assets/effects/elemental/blaze/fire_meteor_impact.png",
    blazeFireball:"assets/effects/elemental/blaze/fireball_projectile.png",
    blazeExplosion:"assets/effects/elemental/blaze/fireball_explosion.png",
    blazeRange:"assets/effects/elemental/blaze/fire_damage_range_ring.png",
    tidecallWave:"assets/effects/elemental/tidecall/water_wave.png",
    tidecallBomb:"assets/effects/elemental/tidecall/water_bomb.png",
    tidecallExplosion:"assets/effects/elemental/tidecall/water_bomb_explosion.png",
    tidecallHit:"assets/effects/elemental/tidecall/water_hit.png",
    stoneveilHit:"assets/effects/elemental/stoneveil/earth_hit.png",
    stoneveilWave:"assets/effects/elemental/stoneveil/earth_seismic_wave.png",
    stoneveilSpikes:"assets/effects/elemental/stoneveil/earth_spikes.png",
    windborneHit:"assets/effects/elemental/windborne/air_hit.png",
    windborneTornado:"assets/effects/elemental/windborne/air_tornado.png",
    windborneBlade:"assets/effects/elemental/windborne/air_wind_blade.png",
    celestialProjectile:"assets/effects/elemental/celestial/holy_projectile.png",
    celestialImpact:"assets/effects/elemental/celestial/holy_impact.png",
    celestialMark:"assets/effects/elemental/celestial/holy_mark.png",
    celestialBurst:"assets/effects/elemental/celestial/celestial_aoe_burst.png",
    abyssalProjectile:"assets/effects/elemental/abyssal/whisper_soul_projectile.png",
    abyssalImpact:"assets/effects/elemental/abyssal/whisper_soul_impact.png",
    abyssalStatus:"assets/effects/elemental/abyssal/whisper_soul_status.png",
    abyssalBurst:"assets/effects/elemental/abyssal/abyssal_aoe_burst.png",
    ringBlaze:"assets/effects/elemental/rings/ring_fire.png",
    ringTidecall:"assets/effects/elemental/rings/ring_water.png",
    ringStoneveil:"assets/effects/elemental/rings/ring_earth.png",
    ringWindborne:"assets/effects/elemental/rings/ring_air.png",
    ringCelestial:"assets/effects/elemental/rings/ring_light.png",
    ringAbyssal:"assets/effects/elemental/rings/ring_dark.png"
  });

  const SKILLS = Object.freeze({
    blaze_meteor:Object.freeze({id:"blaze_meteor", element:"blaze", max:5, kind:"meteor", cooldown:[8,7.5,7,6.5,5.5]}),
    blaze_fireball:Object.freeze({id:"blaze_fireball", element:"blaze", max:5, kind:"projectile", cooldown:[5,4.7,4.4,4.1,3.7]}),
    blaze_ring:Object.freeze({id:"blaze_ring", element:"blaze", max:4, kind:"ring"}),
    tidecall_wave:Object.freeze({id:"tidecall_wave", element:"tidecall", max:5, kind:"wave", cooldown:[7,6.5,6,5.5,5]}),
    tidecall_bomb:Object.freeze({id:"tidecall_bomb", element:"tidecall", max:5, kind:"bomb", cooldown:[6.2,5.8,5.4,5,4.5]}),
    tidecall_ring:Object.freeze({id:"tidecall_ring", element:"tidecall", max:4, kind:"ring"}),
    stoneveil_ring:Object.freeze({id:"stoneveil_ring", element:"stoneveil", max:4, kind:"ring"}),
    windborne_tornado:Object.freeze({id:"windborne_tornado", element:"windborne", max:5, kind:"tornado", cooldown:[8,7.7,7.4,7.1,6.6]}),
    windborne_ring:Object.freeze({id:"windborne_ring", element:"windborne", max:4, kind:"ring"})
  });

  const COPY = Object.freeze({
    hu:Object.freeze({
      player:"Player Upgrade", resonance:"Elemental Resonance", locked:"Az Elemental Resonance még zárolva van", unlockAt:"Feloldás játékosszinten", gmHint:"A viselt GM title ideiglenesen feloldja és 20 tesztpontot ad.", points:"Resonance Point", testPoints:"GM tesztpont", reset:"Ágak visszaállítása", freeReset:"INGYENES", resetConfirm:"Biztosan visszaállítod mind a hat Resonance ágat?", resetDone:"Az Elemental Resonance ágak visszaállítva.", notEnoughGems:"Nincs elég Bloom Gem.", branch:"Resonance ág", rank:"Szint", max:"MAX", requires:"Előbb maxold ki az előző node-ot.", noPoints:"Nincs elkölthető Resonance Point.", gmTemporary:"Ideiglenes GM tesztmód · a kiosztás nem kerül mentésre", cute:"A Cute csak egy kozmetikai jelző. Nem ad element sebzést vagy passzívat.",
      nodeNames:{power:"Elemental Power",skillDamage:"Skill Resonance",skinAttackSpeed:"Affinity Tempo",calling:"Elemental Calling",ring:"Ring Resonance",passive:"Passive Mastery",skin:"Skin Resonance",capstone:"Capstone"},
      skills:{
        blaze_meteor:["Meteor","Időnként meteor csapódik az ellenfelek közé. Max szinten meteorzápor."],
        blaze_fireball:["Fireball","Tűzgolyót lő a célpontra. Max szinten AOE robbanást okoz."],
        blaze_ring:["Ring of Blaze","Forgó Blaze gömbök Cherry körül. Szintenként +1 gömb."],
        tidecall_wave:["Water Wave","Áthatoló vízhullám, amely Soaked stacket ad. Max szinten szélesebb és lassít."],
        tidecall_bomb:["Water Bomb","Vízi bomba, amely becsapódáskor területi Tidecall sebzést okoz."],
        tidecall_ring:["Tidecall Ring","Forgó Tidecall gömbök Cherry körül. Szintenként +1 gömb."],
        stoneveil_ring:["Stoneveil Ring","Forgó Stoneveil gömbök Cherry körül. Szintenként +1 gömb."],
        windborne_tornado:["Tornado","Áthatoló tornádókat lő ki. Szintenként +1 tornádó."],
        windborne_ring:["Windborne Ring","Forgó Windborne gömbök Cherry körül. Szintenként +1 gömb."]
      }
    }),
    en:Object.freeze({
      player:"Player Upgrade", resonance:"Elemental Resonance", locked:"Elemental Resonance is still locked", unlockAt:"Unlocks at Player Level", gmHint:"An equipped GM title temporarily unlocks it and grants 20 test points.", points:"Resonance Point", testPoints:"GM test points", reset:"Reset branches", freeReset:"FREE", resetConfirm:"Reset all six Elemental Resonance branches?", resetDone:"Elemental Resonance branches reset.", notEnoughGems:"Not enough Bloom Gem.", branch:"Resonance branch", rank:"Rank", max:"MAX", requires:"Max the previous node first.", noPoints:"No Resonance Points available.", gmTemporary:"Temporary GM test mode · allocations are not saved", cute:"Cute is a cosmetic affinity tag. It grants no elemental damage or passive.",
      nodeNames:{power:"Elemental Power",skillDamage:"Skill Resonance",skinAttackSpeed:"Affinity Tempo",calling:"Elemental Calling",ring:"Ring Resonance",passive:"Passive Mastery",skin:"Skin Resonance",capstone:"Capstone"},
      skills:{
        blaze_meteor:["Meteor","Periodically drops a meteor into the enemy pack. Becomes a meteor rain at max rank."],
        blaze_fireball:["Fireball","Fires a flame projectile. It gains an AOE explosion at max rank."],
        blaze_ring:["Ring of Blaze","Blaze orbs orbit Cherry. Adds one orb per rank."],
        tidecall_wave:["Water Wave","A piercing wave that applies Soaked. Wider and slowing at max rank."],
        tidecall_bomb:["Water Bomb","A water bomb that deals area Tidecall damage on impact."],
        tidecall_ring:["Tidecall Ring","Tidecall orbs orbit Cherry. Adds one orb per rank."],
        stoneveil_ring:["Stoneveil Ring","Stoneveil orbs orbit Cherry. Adds one orb per rank."],
        windborne_tornado:["Tornado","Launches piercing tornadoes. Adds one tornado per rank."],
        windborne_ring:["Windborne Ring","Windborne orbs orbit Cherry. Adds one orb per rank."]
      }
    })
  });

  const runtime = {
    view:"player",
    selectedElement:"blaze",
    gmActive:false,
    gmPoints:20,
    gmRanks:null,
    uiBound:false
  };

  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const integer = (value, max=Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  const language = () => window.CHERRIFT_I18N?.language === "en" || window.UI?.save?.settings?.language === "en" ? "en" : "hu";
  const text = key => COPY[language()][key];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const currentChannel = () => String(window.CHERRIFT_BUILD?.channel || (/beta/i.test(window.CHERRIFT_BUILD?.version || "") ? "beta" : "live")).toLowerCase() === "live" ? "live" : "beta";
  const unlockLevel = () => currentChannel() === "live" ? 30 : 15;
  const accountLevel = save => Math.max(1, integer(save?.account?.level || 1));

  function emptyBranches() {
    return Object.fromEntries(ELEMENT_IDS.map(element => [element, {...EMPTY_RANKS}]));
  }

  function normalizedRanks(value) {
    const ranks = {};
    for (const node of NODE_ORDER) ranks[node] = integer(value?.[node], NODE_MAX[node]);
    return ranks;
  }

  function createResonanceState(level=1) {
    return {
      schema:1,
      channel:currentChannel(),
      points:0,
      totalEarned:0,
      lastRewardedLevel:Math.max(1, integer(level)),
      resetsUsed:0,
      branches:emptyBranches()
    };
  }

  function normalizeSave(save, options={}) {
    if (!isObject(save)) return save;
    const level = accountLevel(save);
    const channel = currentChannel();
    const existed = isObject(save.elementalResonance);
    const state = existed ? save.elementalResonance : createResonanceState(level);

    state.schema = 1;
    state.points = integer(state.points, 9999);
    state.totalEarned = integer(state.totalEarned, 9999);
    state.resetsUsed = integer(state.resetsUsed, 9999);
    state.branches = isObject(state.branches) ? state.branches : {};
    for (const element of ELEMENT_IDS) state.branches[element] = normalizedRanks(state.branches[element]);

    if (!existed) {
      const retroactive = Math.max(0, level - unlockLevel() + 1);
      state.points = retroactive;
      state.totalEarned = retroactive;
      state.lastRewardedLevel = level;
      state.channel = channel;
    } else if (String(state.channel || channel) !== channel) {
      // Changing Beta to Live never grants the skipped release-channel levels
      // and never turns the Beta threshold into a permanent unlock.
      state.channel = channel;
      state.lastRewardedLevel = level;
    } else {
      state.channel = channel;
      const previousLevel = Math.max(1, integer(state.lastRewardedLevel || 1));
      if (level > previousLevel && options.award !== false) {
        const firstRewarded = Math.max(previousLevel + 1, unlockLevel());
        const gained = Math.max(0, level - firstRewarded + 1);
        if (gained) {
          state.points = integer(state.points + gained, 9999);
          state.totalEarned = integer(state.totalEarned + gained, 9999);
          options.onAward?.(gained);
        }
        state.lastRewardedLevel = level;
      } else if (!Number.isFinite(Number(state.lastRewardedLevel))) {
        state.lastRewardedLevel = level;
      }
    }

    save.elementalResonance = state;
    return save;
  }

  function hasActiveGm(save) {
    if (window.CHERRIFT_PREBETA?.hasActiveGmAccess) return !!window.CHERRIFT_PREBETA.hasActiveGmAccess(save);
    const active = String(save?.profile?.activeTitle || save?.activeTitle || save?.selectedTitle || "");
    return ["gm", "senior_gm", "head_gm"].includes(active) && (save?.ownedTitles || []).includes(active);
  }

  function syncGm(save) {
    const active = hasActiveGm(save);
    if (active && !runtime.gmActive) {
      runtime.gmActive = true;
      runtime.gmPoints = 20;
      runtime.gmRanks = emptyBranches();
    } else if (!active && runtime.gmActive) {
      runtime.gmActive = false;
      runtime.gmPoints = 20;
      runtime.gmRanks = null;
    }
    return active;
  }

  function isUnlocked(save=window.UI?.save) {
    return syncGm(save) || accountLevel(save) >= unlockLevel();
  }

  function permanentRank(save, element, node) {
    normalizeSave(save, {award:false});
    return integer(save?.elementalResonance?.branches?.[element]?.[node], NODE_MAX[node]);
  }

  function effectiveRank(save, element, node) {
    if (!isUnlocked(save) || !ELEMENTS[element] || !NODE_MAX[node]) return 0;
    const permanent = permanentRank(save, element, node);
    const temporary = runtime.gmActive ? integer(runtime.gmRanks?.[element]?.[node], NODE_MAX[node]) : 0;
    return Math.min(NODE_MAX[node], permanent + temporary);
  }

  function availablePoints(save) {
    normalizeSave(save, {award:false});
    return runtime.gmActive ? runtime.gmPoints : integer(save?.elementalResonance?.points, 9999);
  }

  function branchSpent(save, element) {
    return NODE_ORDER.reduce((sum, node) => sum + effectiveRank(save, element, node), 0);
  }

  function canSpend(save, element, node) {
    const index = NODE_ORDER.indexOf(node);
    if (!isUnlocked(save) || index < 0 || !ELEMENT_IDS.includes(element)) return false;
    if (availablePoints(save) < 1 || effectiveRank(save, element, node) >= NODE_MAX[node]) return false;
    if (index > 0) {
      const previous = NODE_ORDER[index - 1];
      if (effectiveRank(save, element, previous) < NODE_MAX[previous]) return false;
    }
    return true;
  }

  function persist(save) {
    window.CherriftStorage.save(save);
    window.UI?.refreshMenu?.();
  }

  function spendPoint(element, node) {
    const save = normalizeSave(window.UI?.save || {}, {award:false});
    if (!canSpend(save, element, node)) {
      const previousIndex = NODE_ORDER.indexOf(node) - 1;
      window.UI?.toast?.(availablePoints(save) < 1 ? text("noPoints") : previousIndex >= 0 ? text("requires") : text("noPoints"));
      return false;
    }
    if (runtime.gmActive) {
      runtime.gmRanks[element][node] = integer(runtime.gmRanks[element][node] + 1, NODE_MAX[node]);
      runtime.gmPoints--;
    } else {
      save.elementalResonance.branches[element][node]++;
      save.elementalResonance.points--;
      persist(save);
    }
    renderResonance();
    return true;
  }

  function permanentSpent(save) {
    normalizeSave(save, {award:false});
    return ELEMENT_IDS.reduce((total, element) => total + NODE_ORDER.reduce((sum, node) => sum + permanentRank(save, element, node), 0), 0);
  }

  function resetCost(save) {
    const state = normalizeSave(save, {award:false}).elementalResonance;
    if (state.resetsUsed < 2) return 0;
    const raw = 10 + permanentSpent(save) * 2;
    return Math.min(100, Math.ceil(raw / 5) * 5);
  }

  function applyReset() {
    const save = normalizeSave(window.UI?.save || {}, {award:false});
    if (runtime.gmActive) {
      runtime.gmRanks = emptyBranches();
      runtime.gmPoints = 20;
      renderResonance();
      return true;
    }
    const spent = permanentSpent(save);
    if (!spent) return false;
    const cost = resetCost(save);
    const gems = Math.max(0, Number(save.bloomGems ?? save.blossomGems) || 0);
    if (gems < cost) {
      window.UI?.toast?.(text("notEnoughGems"));
      return false;
    }
    save.bloomGems = gems - cost;
    save.blossomGems = save.bloomGems;
    save.elementalResonance.points += spent;
    save.elementalResonance.branches = emptyBranches();
    save.elementalResonance.resetsUsed++;
    persist(save);
    window.UI?.toast?.(text("resetDone"));
    renderResonance();
    return true;
  }

  function nodeDescription(element, node) {
    const lang = language();
    const name = ELEMENTS[element].name;
    const unique = {
      hu:{
        blaze:{passive:"A Burn DOT +5% Base ATK sebzést kap szintenként.",skin:"A Blaze skinek Base ATK-ja +1% szintenként.",capstone:"Minden 4. találat gyújt fel az 5. helyett."},
        tidecall:{passive:"A Soaked aktiválás +10% Base ATK sebzést kap szintenként.",skin:"A Tidecall skinek Max HP-ja +1% szintenként.",capstone:"Aktiválás után 1 Soaked stack megmarad."},
        stoneveil:{passive:"A lassítás időtartama +0,5 mp szintenként.",skin:"A Stoneveil skinek Max HP-ja +2% szintenként.",capstone:"A lassítás 5%-ról 7%-ra nő."},
        windborne:{passive:"A Wind Blow +5% Base ATK sebzést kap szintenként.",skin:"A Windborne skinek Movement Speedje +1% szintenként.",capstone:"A Wind Blow egy közeli második célpontot is eltalál 60%-os erővel."},
        celestial:{passive:"A Holy támadás sebzése +5% szintenként.",skin:"A Celestial skinek Crit DMG-je +1% szintenként.",capstone:"A Holy támadás egyszer továbbpattan 50%-os erővel."},
        abyssal:{passive:"A Whisper Soul +5% Base ATK sebzést kap szintenként.",skin:"Az Abyssal skinek Base ATK-ja +1% szintenként.",capstone:"A Whisper Soul 4 helyett 5 célpont között pattog."}
      },
      en:{
        blaze:{passive:"Burn DOT gains +5% Base ATK damage per rank.",skin:"Blaze skins gain +1% Base ATK per rank.",capstone:"Every 4th hit ignites instead of every 5th."},
        tidecall:{passive:"Soaked activation gains +10% Base ATK damage per rank.",skin:"Tidecall skins gain +1% Max HP per rank.",capstone:"One Soaked stack remains after activation."},
        stoneveil:{passive:"Slow duration gains +0.5 seconds per rank.",skin:"Stoneveil skins gain +2% Max HP per rank.",capstone:"The slow grows from 5% to 7%."},
        windborne:{passive:"Wind Blow gains +5% Base ATK damage per rank.",skin:"Windborne skins gain +1% Movement Speed per rank.",capstone:"Wind Blow hits a second nearby target for 60%."},
        celestial:{passive:"Holy attack damage gains +5% per rank.",skin:"Celestial skins gain +1% Crit DMG per rank.",capstone:"Holy attack jumps once more for 50%."},
        abyssal:{passive:"Whisper Soul gains +5% Base ATK damage per rank.",skin:"Abyssal skins gain +1% Base ATK per rank.",capstone:"Whisper Soul ricochets across 5 targets instead of 4."}
      }
    };
    if (unique[lang][element]?.[node]) return unique[lang][element][node];
    const generic = lang === "hu" ? {
      power:`+1% ${name} DMG szintenként.`,
      skillDamage:`+1% ${name} aktív skill sebzés szintenként.`,
      skinAttackSpeed:`A ${name} skinek +2% Attack Speedet kapnak.`,
      calling:`+5 százalékpont esély ${name} skill megjelenésére.`,
      ring:`Szintenként +2% Ring sebzés és +1% keringési sebesség.`
    } : {
      power:`+1% ${name} DMG per rank.`,
      skillDamage:`+1% ${name} active skill damage per rank.`,
      skinAttackSpeed:`${name} skins gain +2% Attack Speed.`,
      calling:`+5 percentage points to ${name} skill appearance chance.`,
      ring:`+2% Ring damage and +1% orbit speed per rank.`
    };
    return generic[node] || "";
  }

  function ensureUi() {
    const panel = document.getElementById("playerUpgrade");
    if (!panel || document.getElementById("elementalUpgradeTabsV095")) return;
    const header = panel.querySelector(":scope > .panel-head");
    const tabs = document.createElement("nav");
    tabs.id = "elementalUpgradeTabsV095";
    tabs.className = "elemental-upgrade-tabs-v095";
    tabs.innerHTML = `<button type="button" data-elemental-mode="player">${escapeHtml(text("player"))}</button><button type="button" data-elemental-mode="resonance"><img src="${UI_ASSETS.point}" alt="">${escapeHtml(text("resonance"))}<i data-elemental-tab-lock></i></button>`;
    if (header) header.insertAdjacentElement("afterend", tabs);
    else panel.prepend(tabs);

    const root = document.createElement("section");
    root.id = "elementalResonanceV095";
    root.className = "elemental-resonance-v095";
    root.hidden = true;
    panel.appendChild(root);
    updateUpgradeMode();
  }

  function updateUpgradeMode() {
    const panel = document.getElementById("playerUpgrade");
    const root = document.getElementById("elementalResonanceV095");
    if (!panel || !root) return;
    const resonance = runtime.view === "resonance";
    panel.classList.toggle("resonance-mode-v095", resonance);
    root.hidden = !resonance;
    panel.querySelectorAll("[data-elemental-mode]").forEach(button => button.classList.toggle("active", button.dataset.elementalMode === runtime.view));
    const lock = panel.querySelector("[data-elemental-tab-lock]");
    if (lock) lock.textContent = isUnlocked(window.UI?.save) ? "" : `🔒 ${accountLevel(window.UI?.save)}/${unlockLevel()}`;
    if (resonance) renderResonance();
  }

  function nodeState(save, element, node) {
    const rank = effectiveRank(save, element, node);
    if (rank >= NODE_MAX[node]) return {name:"maxed", asset:UI_ASSETS.nodeMaxed};
    const index = NODE_ORDER.indexOf(node);
    const gated = index > 0 && effectiveRank(save, element, NODE_ORDER[index - 1]) < NODE_MAX[NODE_ORDER[index - 1]];
    if (gated) return {name:"locked", asset:UI_ASSETS.nodeLocked};
    if (rank > 0) return {name:"invested", asset:UI_ASSETS.nodeInvested};
    return {name:"available", asset:UI_ASSETS.nodeAvailable};
  }

  function renderResonance() {
    ensureUi();
    const root = document.getElementById("elementalResonanceV095");
    const save = normalizeSave(window.UI?.save || {}, {award:false});
    if (!root || runtime.view !== "resonance") return;
    const unlocked = isUnlocked(save);
    if (!unlocked) {
      root.innerHTML = `<article class="elemental-locked-v095"><img src="${UI_ASSETS.locked}" alt=""><small>${escapeHtml(text("resonance"))}</small><h2>${escapeHtml(text("locked"))}</h2><p>${escapeHtml(text("unlockAt"))} <b>${unlockLevel()}</b></p><div><i style="width:${clamp(accountLevel(save) / unlockLevel() * 100,0,100)}%"></i></div><em>${accountLevel(save)} / ${unlockLevel()}</em><p class="gm-hint-v095">${escapeHtml(text("gmHint"))}</p></article>`;
      return;
    }

    if (!ELEMENT_IDS.includes(runtime.selectedElement)) runtime.selectedElement = "blaze";
    const element = runtime.selectedElement;
    const definition = ELEMENTS[element];
    const cost = resetCost(save);
    const resets = save.elementalResonance.resetsUsed;
    root.innerHTML = `
      <header class="elemental-resonance-head-v095">
        <div><small>${escapeHtml(text("resonance"))}</small><h2>${escapeHtml(definition.name)} ${escapeHtml(text("branch"))}</h2>${runtime.gmActive ? `<em>${escapeHtml(text("gmTemporary"))}</em>` : ""}</div>
        <aside><span><img src="${UI_ASSETS.point}" alt=""><small>${escapeHtml(runtime.gmActive ? text("testPoints") : text("points"))}</small><b>${availablePoints(save)}</b></span><button type="button" data-elemental-reset>↺ ${escapeHtml(text("reset"))}<small>${runtime.gmActive || cost === 0 ? text("freeReset") : `${cost} Bloom Gem`} · ${Math.min(2,resets)}/2</small></button></aside>
      </header>
      <nav class="elemental-affinity-tabs-v095">${ELEMENT_IDS.map(id => `<button type="button" data-elemental-branch="${id}" class="${id === element ? "active" : ""}" style="--element:${ELEMENTS[id].color}"><img src="${ELEMENTS[id].icon}" alt=""><span>${ELEMENTS[id].name}<small>${branchSpent(save,id)}/20</small></span></button>`).join("")}</nav>
      <div class="elemental-branch-v095" style="--element:${definition.color};--element-glow:${definition.glow}">
        <header><img src="${definition.icon}" alt=""><div><small>${escapeHtml(definition.name)}</small><h3>${branchSpent(save,element)} / 20</h3></div></header>
        <div class="elemental-node-chain-v095">${NODE_ORDER.map((node,index) => {
          const state = nodeState(save, element, node);
          const rank = effectiveRank(save, element, node);
          const maxed = rank >= NODE_MAX[node];
          return `${index ? '<i class="elemental-connector-v095">↓</i>' : ""}<article class="elemental-node-v095 ${state.name}"><button type="button" data-elemental-node="${node}" ${canSpend(save,element,node) ? "" : "disabled"}><img src="${state.asset}" alt=""><b>${escapeHtml(COPY[language()].nodeNames[node])}</b><span>${maxed ? text("max") : "+"}</span></button><div><h4>${escapeHtml(COPY[language()].nodeNames[node])}</h4><p>${escapeHtml(nodeDescription(element,node))}</p><small>${escapeHtml(text("rank"))} ${rank}/${NODE_MAX[node]}</small></div></article>`;
        }).join("")}</div>
      </div>`;
  }

  function showResetDialog() {
    const save = normalizeSave(window.UI?.save || {}, {award:false});
    if (runtime.gmActive) return applyReset();
    if (!permanentSpent(save)) return;
    const cost = resetCost(save);
    let modal = document.getElementById("elementalResetModalV095");
    if (!modal) {
      modal = document.createElement("section");
      modal.id = "elementalResetModalV095";
      modal.className = "elemental-reset-modal-v095 hidden";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `<button type="button" class="backdrop" data-elemental-reset-close></button><article><img src="${UI_ASSETS.point}" alt=""><h2>${escapeHtml(text("reset"))}</h2><p>${escapeHtml(text("resetConfirm"))}</p><strong>${cost ? `${cost} Bloom Gem` : text("freeReset")}</strong><div><button type="button" data-elemental-reset-close>Cancel</button><button type="button" class="primary" data-elemental-reset-confirm>OK</button></div></article>`;
    modal.classList.remove("hidden");
  }

  function closeResetDialog() {
    document.getElementById("elementalResetModalV095")?.classList.add("hidden");
  }

  function decorateSkins() {
    for (const skin of window.CHERRIFT_DATA.skins || []) {
      skin.elementalAffinity = SKIN_ELEMENTS[skin.id] || "cute";
      const config = window.CHERRIFT_CONFIG?.player?.skins?.[skin.id];
      if (config) config.elementalAffinity = skin.elementalAffinity;
    }
    const skin = window.CHERRIFT_DATA.skins?.[window.UI?.skinIndex || 0];
    const target = document.getElementById("skinRarity")?.parentElement || document.getElementById("skinName")?.parentElement;
    if (!skin || !target) return;
    const element = ELEMENTS[SKIN_ELEMENTS[skin.id] || "cute"];
    let badge = document.getElementById("skinElementBadgeV095");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "skinElementBadgeV095";
      badge.className = "skin-element-badge-v095";
      document.getElementById("skinRarity")?.insertAdjacentElement("afterend", badge);
    }
    badge.style.setProperty("--element", element.color);
    badge.innerHTML = `<img src="${element.icon}" alt=""><span>${escapeHtml(element.name)}<small>${element.cosmetic ? escapeHtml(text("cute")) : "ELEMENTAL AFFINITY"}</small></span>`;
  }

  function bindUi() {
    if (runtime.uiBound) return;
    runtime.uiBound = true;
    document.addEventListener("click", event => {
      const mode = event.target.closest("[data-elemental-mode]");
      if (mode) {
        event.preventDefault();
        runtime.view = mode.dataset.elementalMode === "resonance" ? "resonance" : "player";
        updateUpgradeMode();
        return;
      }
      const branch = event.target.closest("[data-elemental-branch]");
      if (branch) {
        runtime.selectedElement = branch.dataset.elementalBranch;
        renderResonance();
        return;
      }
      const node = event.target.closest("[data-elemental-node]");
      if (node) {
        event.preventDefault();
        spendPoint(runtime.selectedElement, node.dataset.elementalNode);
        return;
      }
      if (event.target.closest("[data-elemental-reset]")) {
        event.preventDefault();
        showResetDialog();
        return;
      }
      if (event.target.closest("[data-elemental-reset-close]")) {
        event.preventDefault();
        closeResetDialog();
        return;
      }
      if (event.target.closest("[data-elemental-reset-confirm]")) {
        event.preventDefault();
        closeResetDialog();
        applyReset();
      }
    });
  }

  function patchStorage() {
    const previousLoad = window.CherriftStorage.load.bind(window.CherriftStorage);
    const previousSave = window.CherriftStorage.save.bind(window.CherriftStorage);
    window.CherriftStorage.load = function loadElementalSave() {
      return normalizeSave(previousLoad());
    };
    window.CherriftStorage.save = function saveElementalProgress(save) {
      const before = Number(save?.elementalResonance?.points) || 0;
      normalizeSave(save, {
        onAward:amount => queueMicrotask(() => {
          if (window.UI?.save === save && amount > 0 && (Number(save.elementalResonance?.points) || 0) > before) {
            window.UI.toast?.(`+${amount} ${text("points")}`);
          }
        })
      });
      return previousSave(save);
    };
  }

  function patchUi() {
    const previousInit = window.UI.init?.bind(window.UI);
    if (previousInit) window.UI.init = function initElemental(save, game) {
      normalizeSave(save);
      const result = previousInit(save, game);
      ensureUi();
      decorateSkins();
      return result;
    };

    const previousOpen = window.UI.open?.bind(window.UI);
    if (previousOpen) window.UI.open = function openElemental(panel, ...args) {
      const result = previousOpen(panel, ...args);
      if (panel === "playerUpgrade") {
        ensureUi();
        updateUpgradeMode();
      }
      return result;
    };

    const previousRefresh = window.UI.refreshMenu?.bind(window.UI);
    if (previousRefresh) window.UI.refreshMenu = function refreshElemental(...args) {
      normalizeSave(this.save);
      syncGm(this.save);
      const result = previousRefresh(...args);
      if (document.getElementById("playerUpgrade") && !document.getElementById("playerUpgrade").classList.contains("hidden")) updateUpgradeMode();
      decorateSkins();
      return result;
    };

    const previousSkin = window.UI.renderSkinCarousel?.bind(window.UI);
    if (previousSkin) window.UI.renderSkinCarousel = function renderElementalSkin(...args) {
      const result = previousSkin(...args);
      decorateSkins();
      return result;
    };
  }

  function gearElementBonus(game, element) {
    const aliases = {
      blaze:["blazeDamage","fireDamage","fireDmg"],
      tidecall:["tidecallDamage","waterDamage","waterDmg"],
      stoneveil:["stoneveilDamage","earthDamage","earthDmg"],
      windborne:["windborneDamage","airDamage","airDmg"],
      celestial:["celestialDamage","lightDamage","lightDmg"],
      abyssal:["abyssalDamage","darkDamage","darkDmg"]
    }[element] || [];
    let total = 0;
    for (const item of Object.values(game?.save?.equipped || {})) {
      for (const key of aliases) total += Number(item?.stats?.[key]) || 0;
    }
    return Math.max(0, total > 0 && total <= 1 ? total : total / 100);
  }

  function elementalMultiplier(game, element, flags={}) {
    const save = game.save;
    let bonus = gearElementBonus(game, element) + effectiveRank(save, element, "power") * .01;
    if (flags.skill) bonus += effectiveRank(save, element, "skillDamage") * .01;
    if (flags.ring) bonus += effectiveRank(save, element, "ring") * .02;
    return 1 + bonus;
  }

  function dealElementalDamage(game, enemy, baseDamage, element, flags={}) {
    if (!enemy || enemy.dead || !(baseDamage > 0)) return 0;
    const amount = baseDamage * elementalMultiplier(game, element, flags);
    game.__elementalProcDepth = (game.__elementalProcDepth || 0) + 1;
    try {
      game.damageEnemy(enemy, amount);
    } finally {
      game.__elementalProcDepth--;
    }
    return amount;
  }

  function addEffect(game, type, data={}) {
    game.effects ||= [];
    if (game.effects.length > 220) game.effects.splice(0, game.effects.length - 180);
    game.effects.push({type, t:0, life:.4, ...data});
  }

  function livingEnemies(game) {
    return (game.enemies || []).filter(enemy => enemy && !enemy.dead);
  }

  function nearestFrom(game, x, y, range=1000, exclude=null) {
    let selected = null;
    let distance = range;
    for (const enemy of livingEnemies(game)) {
      if (enemy === exclude) continue;
      const current = Math.hypot(enemy.x - x, enemy.y - y);
      if (current < distance) {
        selected = enemy;
        distance = current;
      }
    }
    return selected;
  }

  function status(enemy) {
    return enemy.__elementalStatusV095 || (enemy.__elementalStatusV095 = {});
  }

  function applySoaked(enemy, stacks=1) {
    if (!enemy || enemy.dead) return;
    const state = status(enemy);
    state.soaked = Math.min(3, integer(state.soaked) + stacks);
    state.soakedTimer = 8;
  }

  function travelEffect(game, element, from, to, assetKey, impactKey) {
    addEffect(game, "elemental_travel_v095", {element, assetKey, impactKey, x:from.x, y:from.y, x2:to.x, y2:to.y, life:.34});
  }

  function triggerPassive(game, enemy) {
    const player = game.player;
    if (!player || !isUnlocked(game.save)) return;
    const element = SKIN_ELEMENTS[player.skin] || "cute";
    if (element === "cute") return;
    player.__elementalHitCounters ||= {};
    const count = player.__elementalHitCounters[element] = integer(player.__elementalHitCounters[element]) + 1;
    const passive = effectiveRank(game.save, element, "passive");
    const capstone = effectiveRank(game.save, element, "capstone") > 0;

    if (element === "blaze") {
      const every = capstone ? 4 : 5;
      if (count % every || !enemy || enemy.dead) return;
      const state = status(enemy);
      state.burn = {remaining:5, tick:1, damage:player.damage * (.20 + passive * .05)};
      addEffect(game, "elemental_sprite_v095", {element, assetKey:"blazeExplosion", x:enemy.x, y:enemy.y, size:76, endSize:98, life:.42});
      return;
    }

    if (element === "tidecall") {
      if (!enemy || enemy.dead) return;
      const state = status(enemy);
      if (integer(state.soaked) >= 3) {
        dealElementalDamage(game, enemy, player.damage * (1 + passive * .10), element, {passive:true});
        state.soaked = capstone ? 1 : 0;
        state.soakedTimer = capstone ? 8 : 0;
        addEffect(game, "elemental_sprite_v095", {element, assetKey:"tidecallHit", x:enemy.x, y:enemy.y, size:82, endSize:108, life:.38});
      } else applySoaked(enemy, 1);
      return;
    }

    if (element === "stoneveil") {
      if (count % 2 || !enemy || enemy.dead) return;
      const state = status(enemy);
      state.slowTimer = 2 + passive * .5;
      state.slowRate = capstone ? .07 : .05;
      addEffect(game, "elemental_sprite_v095", {element, assetKey:"stoneveilHit", x:enemy.x, y:enemy.y, size:74, endSize:92, life:.36});
      return;
    }

    if (element === "windborne" && count % 4 === 0) {
      const target = enemy && !enemy.dead ? enemy : nearestFrom(game, player.x, player.y, 900);
      if (!target) return;
      const base = player.damage * (1.10 + passive * .05);
      travelEffect(game, element, {x:player.x,y:player.y-12}, target, "windborneBlade", "windborneHit");
      dealElementalDamage(game, target, base, element, {passive:true});
      if (capstone) {
        const second = nearestFrom(game, target.x, target.y, 420, target);
        if (second) {
          travelEffect(game, element, target, second, "windborneBlade", "windborneHit");
          dealElementalDamage(game, second, base * .60, element, {passive:true});
        }
      }
      return;
    }

    if (element === "celestial" && count % 5 === 0) {
      const first = nearestFrom(game, enemy?.x ?? player.x, enemy?.y ?? player.y, 760, enemy) || (enemy && !enemy.dead ? enemy : null);
      if (!first) return;
      const base = player.damage * Math.max(1, player.critDamage || 1.5) * 2 * (1 + passive * .05);
      travelEffect(game, element, {x:player.x,y:player.y-18}, first, "celestialProjectile", "celestialImpact");
      dealElementalDamage(game, first, base, element, {passive:true});
      status(first).holyMarkTimer = 1.2;
      if (capstone) {
        const second = nearestFrom(game, first.x, first.y, 500, first);
        if (second) {
          travelEffect(game, element, first, second, "celestialProjectile", "celestialImpact");
          dealElementalDamage(game, second, base * .50, element, {passive:true});
        }
      }
      return;
    }

    if (element === "abyssal" && count % 5 === 0) {
      const limit = capstone ? 5 : 4;
      const targets = livingEnemies(game).sort((a,b) => Math.hypot(a.x-(enemy?.x||player.x),a.y-(enemy?.y||player.y)) - Math.hypot(b.x-(enemy?.x||player.x),b.y-(enemy?.y||player.y))).slice(0,limit);
      const base = player.damage * (2 + passive * .05);
      let from = {x:player.x,y:player.y-16};
      for (const target of targets) {
        travelEffect(game, element, from, target, "abyssalProjectile", "abyssalImpact");
        dealElementalDamage(game, target, base, element, {passive:true});
        status(target).abyssalTimer = 1.3;
        from = target;
      }
    }
  }

  function applySkinResonance(game) {
    const player = game.player;
    if (!player || !isUnlocked(game.save)) return;
    const element = SKIN_ELEMENTS[player.skin] || "cute";
    if (element === "cute") return;
    const attackSpeed = effectiveRank(game.save, element, "skinAttackSpeed");
    if (attackSpeed) player.fireInterval /= 1.02;
    const ranks = effectiveRank(game.save, element, "skin");
    if (!ranks) return;
    if (element === "blaze" || element === "abyssal") player.damage *= 1 + ranks * .01;
    if (element === "tidecall") {
      const extra = player.maxHp * ranks * .01;
      player.maxHp += extra;
      player.hp += extra;
    }
    if (element === "stoneveil") {
      const extra = player.maxHp * ranks * .02;
      player.maxHp += extra;
      player.hp += extra;
    }
    if (element === "windborne") player.speed *= 1 + ranks * .01;
    if (element === "celestial") player.critDamage *= 1 + ranks * .01;
  }

  function skillLevel(game, id) {
    return integer(game.player?.elementalSkills?.[id], SKILLS[id]?.max || 0);
  }

  function learnSkill(game, id) {
    const skill = SKILLS[id];
    if (!skill || !game.player || !isUnlocked(game.save)) return;
    game.player.elementalSkills ||= {};
    const next = Math.min(skill.max, skillLevel(game,id) + 1);
    game.player.elementalSkills[id] = next;
    game.player.elementalCooldowns ||= {};
    if (skill.kind !== "ring" && !Number.isFinite(game.player.elementalCooldowns[id])) game.player.elementalCooldowns[id] = .35;
    const copy = COPY[language()].skills[id];
    window.UI?.toast?.(`${copy[0]} ${text("rank")} ${next}/${skill.max}`);
  }

  // Test Map tooling uses these helpers to change only the current run. They
  // deliberately never touch the save or Resonance point allocation.
  function setRunSkillLevel(game, id, value) {
    const skill = SKILLS[id];
    if (!skill || !game?.player || !isUnlocked(game.save)) return false;
    const next = integer(value, skill.max);
    game.player.elementalSkills ||= {};
    game.player.elementalCooldowns ||= {};
    if (next > 0) {
      game.player.elementalSkills[id] = next;
      if (skill.kind !== "ring" && !Number.isFinite(Number(game.player.elementalCooldowns[id]))) game.player.elementalCooldowns[id] = .12;
    } else {
      delete game.player.elementalSkills[id];
      delete game.player.elementalCooldowns[id];
      game.__elementalProjectiles = (game.__elementalProjectiles || []).filter(projectile => projectile.skillId !== id);
      if (id === "blaze_meteor") game.__elementalDelayed = [];
    }
    updateRings(game);
    return next;
  }

  function resetRunSkills(game) {
    if (!game?.player) return false;
    game.player.elementalSkills = {};
    game.player.elementalCooldowns = {};
    game.__elementalProjectiles = [];
    game.__elementalDelayed = [];
    updateRings(game);
    return true;
  }

  function skillCopy(id) {
    const copy = COPY[language()].skills[id];
    return copy ? {name:copy[0], description:copy[1]} : null;
  }

  function weightedOptions(game, count=3) {
    const general = (window.CHERRIFT_DATA.upgrades || []).map(upgrade => ({value:upgrade, weight:1}));
    if (!isUnlocked(game.save)) return general.sort(() => Math.random() - .5).slice(0,count).map(entry => entry.value);
    const elemental = Object.values(SKILLS).filter(skill => skillLevel(game,skill.id) < skill.max).map(skill => {
      const copy = COPY[language()].skills[skill.id];
      return {
        weight:.35 + effectiveRank(game.save, skill.element, "calling") * .05,
        value:{
          id:`elemental_${skill.id}`,
          name:copy[0],
          desc:`${ELEMENTS[skill.element].name} · ${copy[1]} · ${text("rank")} ${skillLevel(game,skill.id)+1}/${skill.max}`,
          elementalSkill:skill.id,
          elementalIcon:ELEMENTS[skill.element].icon,
          apply:() => learnSkill(game,skill.id)
        }
      };
    });
    const pool = [...general, ...elemental];
    const selected = [];
    while (pool.length && selected.length < count) {
      const total = pool.reduce((sum,entry) => sum + entry.weight, 0);
      let roll = Math.random() * total;
      let index = 0;
      for (; index < pool.length - 1; index++) {
        roll -= pool[index].weight;
        if (roll <= 0) break;
      }
      selected.push(pool.splice(index,1)[0].value);
    }
    return selected;
  }

  function patchLevelUpChoices() {
    window.UI.showLevelUp = function showElementalLevelUp(game) {
      const list = document.getElementById("upgrades");
      if (!list) return;
      list.innerHTML = "";
      for (const upgrade of weightedOptions(game,3)) {
        const button = document.createElement("button");
        button.className = `upgrade-card${upgrade.elementalSkill ? " elemental-upgrade-card-v095" : ""}`;
        button.innerHTML = `${upgrade.elementalIcon ? `<img src="${upgrade.elementalIcon}" alt="">` : ""}<strong>${escapeHtml(upgrade.name)}</strong><span>${escapeHtml(upgrade.desc)}</span>`;
        button.onclick = () => game.applyUpgrade(upgrade);
        list.appendChild(button);
      }
      document.getElementById("levelModal")?.classList.remove("hidden");
    };
  }

  function loadElementalAssets(game) {
    if (game.__elementalAssetsV095) return game.__elementalAssetsV095;
    game.__elementalAssetsV095 = Promise.all(Object.entries(EFFECT_ASSETS).map(([key,source]) => game.assets.get(key) ? true : game.assets.loadImage(key, `${source}?v=el0951`)));
    return game.__elementalAssetsV095;
  }

  function initializeRun(game) {
    const player = game.player;
    if (!player) return;
    player.elementalAffinity = SKIN_ELEMENTS[player.skin] || "cute";
    player.elementalSkills = {};
    player.elementalCooldowns = {};
    player.__elementalHitCounters = {};
    game.__elementalProjectiles = [];
    game.__elementalDelayed = [];
    game.__elementalRingVisuals = [];
    game.__elementalRangeVisuals = [];
    applySkinResonance(game);
  }

  function schedule(game, delay, callback) {
    game.__elementalDelayed ||= [];
    game.__elementalDelayed.push({delay, callback});
  }

  function explode(game, x, y, element, radius, baseDamage, assetKey) {
    addEffect(game, "elemental_sprite_v095", {element, assetKey, x, y, size:radius*1.35, endSize:radius*2.05, life:.46});
    addEffect(game, "elemental_range_v095", {element, assetKey:element === "blaze" ? "blazeRange" : null, x, y, radius, life:.52});
    for (const enemy of livingEnemies(game)) if (Math.hypot(enemy.x-x,enemy.y-y) <= radius + (enemy.r || 0)) dealElementalDamage(game,enemy,baseDamage,element,{skill:true});
  }

  function spawnProjectile(game, projectile) {
    game.__elementalProjectiles ||= [];
    game.__elementalProjectiles.push({
      __elementalProjectileV095:true,
      style:"elemental_projectile_v095",
      life:2,
      maxLife:2,
      r:12,
      hitIds:new Set(),
      pierce:1,
      ...projectile
    });
  }

  function castSkill(game, skill, level) {
    const player = game.player;
    const target = nearestFrom(game, player.x, player.y, 980);
    if (!target) return false;
    const dx = target.x-player.x;
    const dy = target.y-player.y;
    const length = Math.hypot(dx,dy) || 1;

    if (skill.id === "blaze_meteor") {
      const count = level >= skill.max ? 3 : 1;
      for (let index=0; index<count; index++) {
        const x = target.x + (index ? (Math.random()-.5)*150 : 0);
        const y = target.y + (index ? (Math.random()-.5)*150 : 0);
        const delay = index * .22;
        schedule(game, delay, () => addEffect(game,"elemental_meteor_v095",{element:"blaze",assetKey:"blazeMeteor",x,y,life:.58}));
        schedule(game, delay+.52, () => explode(game,x,y,"blaze",level>=skill.max?118:94,player.damage*(1.7+level*.18),"blazeMeteorImpact"));
      }
      return true;
    }

    if (skill.id === "blaze_fireball") {
      spawnProjectile(game,{skillId:skill.id,element:"blaze",assetKey:"blazeFireball",x:player.x,y:player.y-12,vx:dx/length*510,vy:dy/length*510,r:12,size:48,baseDamage:player.damage*(1.12+level*.08),explodeAtMax:level>=skill.max,life:2.1,maxLife:2.1});
      return true;
    }

    if (skill.id === "tidecall_wave") {
      spawnProjectile(game,{skillId:skill.id,element:"tidecall",assetKey:"tidecallWave",x:player.x,y:player.y-8,vx:dx/length*390,vy:dy/length*390,r:level>=skill.max?64:42,size:level>=skill.max?126:94,drawWidth:level>=skill.max?142:108,drawHeight:70,baseDamage:player.damage*(.72+level*.06),pierce:999,life:2.2,maxLife:2.2,maxRank:level>=skill.max});
      return true;
    }

    if (skill.id === "tidecall_bomb") {
      spawnProjectile(game,{skillId:skill.id,element:"tidecall",assetKey:"tidecallBomb",x:player.x,y:player.y-12,vx:dx/length*410,vy:dy/length*410,r:15,size:54,baseDamage:player.damage*(.85+level*.08),explosionDamage:player.damage*(1.05+level*.10),explosionRadius:96+level*6,life:2.4,maxLife:2.4});
      return true;
    }

    if (skill.id === "windborne_tornado") {
      const count = level;
      const baseAngle = Math.atan2(dy,dx);
      const spread = Math.min(.52, (count-1)*.11);
      for (let index=0; index<count; index++) {
        const angle = baseAngle + (count === 1 ? 0 : -spread/2 + spread*index/(count-1));
        const speed = level>=skill.max ? 520 : 450;
        spawnProjectile(game,{skillId:skill.id,element:"windborne",assetKey:"windborneTornado",x:player.x,y:player.y-8,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:level>=skill.max?30:23,size:level>=skill.max?88:68,baseDamage:player.damage*(.48+level*.05),pierce:999,life:2.25,maxLife:2.25,tornado:true});
      }
      return true;
    }
    return false;
  }

  function projectileHit(game, projectile, enemy) {
    if (projectile.hitIds.has(enemy)) return;
    projectile.hitIds.add(enemy);
    dealElementalDamage(game,enemy,projectile.baseDamage,projectile.element,{skill:true});

    if (projectile.skillId === "blaze_fireball") {
      addEffect(game,"elemental_sprite_v095",{element:"blaze",assetKey:"blazeExplosion",x:enemy.x,y:enemy.y,size:70,endSize:98,life:.38});
      if (projectile.explodeAtMax) explode(game,enemy.x,enemy.y,"blaze",112,game.player.damage*.85,"blazeExplosion");
    }
    if (projectile.skillId === "tidecall_wave") {
      applySoaked(enemy,1);
      addEffect(game,"elemental_sprite_v095",{element:"tidecall",assetKey:"tidecallHit",x:enemy.x,y:enemy.y,size:62,endSize:84,life:.32});
      if (projectile.maxRank) {
        const state = status(enemy);
        state.slowTimer = Math.max(state.slowTimer || 0,2);
        state.slowRate = Math.max(state.slowRate || 0,.02);
      }
    }
    if (projectile.skillId === "tidecall_bomb") {
      applySoaked(enemy,1);
      explode(game,enemy.x,enemy.y,"tidecall",projectile.explosionRadius,projectile.explosionDamage,"tidecallExplosion");
    }
    if (projectile.tornado) {
      const state = status(enemy);
      state.slowTimer = Math.max(state.slowTimer || 0,1.7);
      state.slowRate = Math.max(state.slowRate || 0,.08);
      addEffect(game,"elemental_sprite_v095",{element:"windborne",assetKey:"windborneHit",x:enemy.x,y:enemy.y,size:60,endSize:80,life:.30});
    }
    projectile.pierce--;
    if (projectile.pierce <= 0) projectile.dead = true;
  }

  function updateProjectiles(game, dt) {
    const projectiles = game.__elementalProjectiles || [];
    for (const projectile of projectiles) {
      if (projectile.dead) continue;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      for (const enemy of livingEnemies(game)) {
        if (projectile.hitIds.has(enemy)) continue;
        if (Math.hypot(projectile.x-enemy.x,projectile.y-enemy.y) <= projectile.r+(enemy.r||0)) {
          projectileHit(game,projectile,enemy);
          if (projectile.dead) break;
        }
      }
    }
    game.__elementalProjectiles = projectiles.filter(projectile => !projectile.dead && projectile.life > 0);
  }

  function updateDelayed(game, dt) {
    const keep = [];
    for (const item of game.__elementalDelayed || []) {
      item.delay -= dt;
      if (item.delay <= 0) {
        try { item.callback(); } catch (error) { console.error("[CHERRIFT Elemental] Delayed effect failed", error); }
      } else keep.push(item);
    }
    game.__elementalDelayed = keep;
  }

  function updateStatuses(game, dt) {
    for (const enemy of game.enemies || []) {
      const state = enemy?.__elementalStatusV095;
      if (!state || enemy.dead) continue;
      if (state.burn?.remaining > 0) {
        state.burn.remaining -= dt;
        state.burn.tick -= dt;
        while (state.burn.tick <= 0 && state.burn.remaining > -.01 && !enemy.dead) {
          state.burn.tick += 1;
          dealElementalDamage(game,enemy,state.burn.damage,"blaze",{passive:true});
          addEffect(game,"elemental_sprite_v095",{element:"blaze",assetKey:"blazeExplosion",x:enemy.x,y:enemy.y,size:44,endSize:62,life:.28});
        }
        if (state.burn.remaining <= 0) state.burn = null;
      }
      if (state.soakedTimer > 0) {
        state.soakedTimer = Math.max(0,state.soakedTimer-dt);
        if (!state.soakedTimer) state.soaked = 0;
      }
      state.slowTimer = Math.max(0,(state.slowTimer||0)-dt);
      state.holyMarkTimer = Math.max(0,(state.holyMarkTimer||0)-dt);
      state.abyssalTimer = Math.max(0,(state.abyssalTimer||0)-dt);
    }
  }

  function updateActiveSkills(game, dt) {
    const player = game.player;
    if (!player || !isUnlocked(game.save)) return;
    player.elementalCooldowns ||= {};
    for (const skill of Object.values(SKILLS)) {
      const level = skillLevel(game,skill.id);
      if (!level || skill.kind === "ring") continue;
      const timer = Number(player.elementalCooldowns[skill.id]);
      player.elementalCooldowns[skill.id] = Number.isFinite(timer) ? timer - dt : .35;
      if (player.elementalCooldowns[skill.id] <= 0) {
        const cast = castSkill(game,skill,level);
        player.elementalCooldowns[skill.id] = cast ? skill.cooldown[Math.min(skill.cooldown.length,level)-1] : 1;
      }
    }
  }

  function updateRings(game) {
    const player = game.player;
    game.__elementalRingVisuals = [];
    game.__elementalRangeVisuals = [];
    if (!player || !isUnlocked(game.save)) return;
    const ringSkills = Object.values(SKILLS).filter(skill => skill.kind === "ring" && skillLevel(game,skill.id) > 0);
    ringSkills.forEach((skill, ringIndex) => {
      const level = skillLevel(game,skill.id);
      const count = level;
      const radius = 112 + ringIndex*20;
      const speed = (.95 + ringIndex*.08) * (1 + effectiveRank(game.save,skill.element,"ring")*.01);
      game.__elementalRangeVisuals.push({type:"elemental_orbit_range_v095",element:skill.element,x:player.x,y:player.y,radius});
      for (let index=0; index<count; index++) {
        const angle = game.t*speed + index/count*Math.PI*2 + ringIndex*.55;
        const x = player.x + Math.cos(angle)*radius;
        const y = player.y + Math.sin(angle)*radius*.72;
        const size = level>=skill.max ? 54 : 44;
        game.__elementalRingVisuals.push({__elementalProjectileV095:true,style:"elemental_projectile_v095",ring:true,element:skill.element,assetKey:`ring${skill.element[0].toUpperCase()}${skill.element.slice(1)}`,x,y,vx:-Math.sin(angle),vy:Math.cos(angle),size,drawWidth:size,drawHeight:size});
        for (const enemy of livingEnemies(game)) {
          if (Math.hypot(x-enemy.x,y-enemy.y) > size*.32+(enemy.r||0)) continue;
          enemy.__elementalRingNextV095 ||= {};
          const key = `${skill.id}:${index}`;
          if ((enemy.__elementalRingNextV095[key]||0) > game.t) continue;
          enemy.__elementalRingNextV095[key] = game.t + .62;
          dealElementalDamage(game,enemy,player.damage*(.30+level*.05),skill.element,{skill:true,ring:true});
          const impact = skill.element === "blaze" ? "blazeExplosion" : skill.element === "tidecall" ? "tidecallHit" : skill.element === "stoneveil" ? "stoneveilHit" : "windborneHit";
          addEffect(game,"elemental_sprite_v095",{element:skill.element,assetKey:impact,x:enemy.x,y:enemy.y,size:48,endSize:66,life:.25});
        }
      }
    });
  }

  function updateElemental(game, dt) {
    updateDelayed(game,dt);
    updateStatuses(game,dt);
    updateProjectiles(game,dt);
    updateActiveSkills(game,dt);
    updateRings(game);
  }

  function drawElementalBullet(game, context, bullet) {
    const image = game.assets.get(bullet.assetKey);
    const angle = Math.atan2(bullet.vy || 0,bullet.vx || 1) + (bullet.tornado ? Math.PI/2 : 0);
    const width = bullet.drawWidth || bullet.size || 48;
    const height = bullet.drawHeight || bullet.size || 48;
    context.save();
    context.translate(bullet.x,bullet.y);
    context.rotate(angle);
    context.globalAlpha = .94;
    context.imageSmoothingEnabled = false;
    context.shadowColor = ELEMENTS[bullet.element]?.glow || "#fff";
    context.shadowBlur = bullet.ring ? 8 : 12;
    if (image) context.drawImage(image,-width/2,-height/2,width,height);
    else {
      context.fillStyle = ELEMENTS[bullet.element]?.color || "#fff";
      context.beginPath();context.arc(0,0,width*.22,0,Math.PI*2);context.fill();
    }
    context.restore();
  }

  function drawElementalEffect(game, context, effect) {
    const progress = clamp((effect.t||0)/Math.max(.001,effect.life||.4),0,1);
    const alpha = 1-progress;
    const definition = ELEMENTS[effect.element] || ELEMENTS.blaze;
    if (effect.type === "elemental_orbit_range_v095") {
      context.save();context.globalAlpha=.18;context.strokeStyle=definition.color;context.lineWidth=2;context.setLineDash?.([8,10]);context.beginPath();context.ellipse(effect.x,effect.y,effect.radius,effect.radius*.72,0,0,Math.PI*2);context.stroke();context.restore();return;
    }
    if (effect.type === "elemental_range_v095") {
      const scale = .16 + progress*.84;
      const image = effect.assetKey ? game.assets.get(effect.assetKey) : null;
      context.save();context.globalAlpha=alpha*.62;context.translate(effect.x,effect.y);context.scale(scale,scale);context.shadowColor=definition.glow;context.shadowBlur=12;
      if (image) context.drawImage(image,-effect.radius,-effect.radius,effect.radius*2,effect.radius*2);
      else {context.strokeStyle=definition.color;context.lineWidth=4;context.beginPath();context.arc(0,0,effect.radius,0,Math.PI*2);context.stroke();}
      context.restore();return;
    }
    if (effect.type === "elemental_meteor_v095") {
      const image = game.assets.get(effect.assetKey);
      const y = effect.y - (1-progress)*190;
      const size = 78 + progress*25;
      context.save();context.globalAlpha=Math.min(1,progress*4)*Math.min(1,alpha*5);context.translate(effect.x,y);context.rotate(.45);context.shadowColor=definition.glow;context.shadowBlur=18;if(image)context.drawImage(image,-size/2,-size/2,size,size);context.restore();return;
    }
    if (effect.type === "elemental_travel_v095") {
      const eased = 1-Math.pow(1-progress,2);
      const x = effect.x+(effect.x2-effect.x)*eased;
      const y = effect.y+(effect.y2-effect.y)*eased;
      const image = game.assets.get(effect.assetKey);
      context.save();context.globalAlpha=alpha;context.strokeStyle=definition.color;context.lineWidth=3;context.beginPath();context.moveTo(effect.x,effect.y);context.lineTo(x,y);context.stroke();context.translate(x,y);context.rotate(Math.atan2(effect.y2-effect.y,effect.x2-effect.x));context.shadowColor=definition.glow;context.shadowBlur=12;if(image)context.drawImage(image,-28,-28,56,56);context.restore();
      if (progress>.76 && effect.impactKey) {const impact=game.assets.get(effect.impactKey);if(impact){context.save();context.globalAlpha=(progress-.76)/.24*alpha*2;context.drawImage(impact,effect.x2-38,effect.y2-38,76,76);context.restore();}}return;
    }
    if (effect.type === "elemental_sprite_v095") {
      const image = game.assets.get(effect.assetKey);
      const size = (effect.size||70)+((effect.endSize||effect.size||70)-(effect.size||70))*progress;
      context.save();context.globalAlpha=alpha;context.translate(effect.x,effect.y);context.rotate(effect.rotation||0);context.shadowColor=definition.glow;context.shadowBlur=12;if(image)context.drawImage(image,-size/2,-size/2,size,size);context.restore();
    }
  }

  function patchGame() {
    const prototype = window.CherriftGame.prototype;
    if (prototype.__elementalResonanceV095) return;
    prototype.__elementalResonanceV095 = true;

    const previousStart = prototype.start;
    prototype.start = async function startElemental(...args) {
      await loadElementalAssets(this);
      const result = await previousStart.apply(this,args);
      if (this.player) initializeRun(this);
      return result;
    };

    const previousUpdate = prototype.update;
    prototype.update = function updateElementalRuntime(dt) {
      const result = previousUpdate.call(this,dt);
      if (this.player && this.mode !== "gameover") updateElemental(this,Math.max(0,Number(dt)||0));
      return result;
    };

    const previousUpdateBullets = prototype.updateBullets;
    prototype.updateBullets = function updateElementalBasicHits(dt) {
      this.__elementalBasicHitWindow = true;
      try { return previousUpdateBullets.call(this,dt); }
      finally { this.__elementalBasicHitWindow = false; }
    };

    const previousDamageEnemy = prototype.damageEnemy;
    prototype.damageEnemy = function damageEnemyElemental(enemy,damage) {
      const eligible = this.__elementalBasicHitWindow && !this.__elementalProcDepth && enemy && !enemy.dead && (Number(damage)||0)>0;
      const result = previousDamageEnemy.call(this,enemy,damage);
      if (eligible) triggerPassive(this,enemy);
      return result;
    };

    const previousUpdateEnemies = prototype.updateEnemies;
    prototype.updateEnemies = function updateElementalSlows(dt) {
      const slowed = [];
      for (const enemy of this.enemies || []) {
        const state = enemy?.__elementalStatusV095;
        if (!(state?.slowTimer > 0) || !(state.slowRate > 0)) continue;
        const originalSpeed = enemy.speed;
        const timers = {};
        for (const key of ["shootTimer","shotTimer","attackTimer","fireTimer","rangedTimer"]) if (Number.isFinite(Number(enemy[key]))) timers[key]=Number(enemy[key]);
        enemy.speed = originalSpeed*(1-clamp(state.slowRate,0,.75));
        slowed.push({enemy,originalSpeed,timers,rate:state.slowRate});
      }
      try { return previousUpdateEnemies.call(this,dt); }
      finally {
        for (const entry of slowed) {
          entry.enemy.speed = entry.originalSpeed;
          for (const [key,before] of Object.entries(entry.timers)) if (Number(entry.enemy[key]) < before) entry.enemy[key] += dt*entry.rate;
        }
      }
    };

    const previousSkill = prototype.skill;
    prototype.skill = function skillElementalRange(...args) {
      const player = this.player;
      const before = Number(player?.skillTimer)||0;
      const result = previousSkill.apply(this,args);
      const cast = player && before<=0 && Number(player.skillTimer)>0;
      if (cast && ["fairy_cherry","cake_deliver_cherry"].includes(player.skin)) {
        const element = SKIN_ELEMENTS[player.skin];
        addEffect(this,"elemental_range_v095",{element,assetKey:element==="blaze"?"blazeRange":null,x:player.x,y:player.y,radius:this.activeSkinConfig()?.burstRadius||185,life:.55});
      }
      return result;
    };

    const previousDrawWorld = prototype.drawWorld;
    const drawElementalWorld = function drawElementalWorld(context,...args) {
      const bullets = this.bullets;
      const effects = this.effects;
      this.bullets = [...(bullets||[]),...(this.__elementalProjectiles||[]),...(this.__elementalRingVisuals||[])];
      this.effects = [...(effects||[]),...(this.__elementalRangeVisuals||[])];
      try { return previousDrawWorld.call(this,context,...args); }
      finally { this.bullets=bullets;this.effects=effects; }
    };
    // Capability markers are consumed by diagnostics and by a few low-cost
    // render guards. Wrapping must not make those features appear absent.
    Object.assign(drawElementalWorld, previousDrawWorld);
    prototype.drawWorld = drawElementalWorld;

    const previousDrawBullet = prototype.drawBullet;
    prototype.drawBullet = function drawElementalProjectile(context,bullet) {
      if (bullet?.__elementalProjectileV095) return drawElementalBullet(this,context,bullet);
      return previousDrawBullet.call(this,context,bullet);
    };

    const previousDrawEffect = prototype.drawEffect;
    prototype.drawEffect = function drawElementalFx(context,effect) {
      if (String(effect?.type||"").startsWith("elemental_")) return drawElementalEffect(this,context,effect);
      return previousDrawEffect.call(this,context,effect);
    };

    const previousDrawEnemy = prototype.drawEnemy;
    prototype.drawEnemy = function drawElementalStatus(context,enemy) {
      const result = previousDrawEnemy.call(this,context,enemy);
      const state = enemy?.__elementalStatusV095;
      if (!state) return result;
      let assetKey = null;
      let element = null;
      if (state.holyMarkTimer>0) {assetKey="celestialMark";element="celestial";}
      else if (state.abyssalTimer>0) {assetKey="abyssalStatus";element="abyssal";}
      else if ((state.soaked||0)>0) {assetKey="tidecallHit";element="tidecall";}
      if (assetKey) {
        const image=this.assets.get(assetKey);const size=26+(state.soaked||0)*4;
        if(image){context.save();context.globalAlpha=.72;context.shadowColor=ELEMENTS[element].glow;context.shadowBlur=7;context.drawImage(image,enemy.x-size/2,enemy.y-(enemy.r||20)-size-5,size,size);context.restore();}
      }
      if (state.burn?.remaining>0) {
        context.save();context.globalAlpha=.72;context.fillStyle=ELEMENTS.blaze.color;context.shadowColor=ELEMENTS.blaze.glow;context.shadowBlur=8;for(let i=0;i<3;i++){const phase=this.t*4+i*2.1;context.beginPath();context.arc(enemy.x+Math.sin(phase)*10,enemy.y-(enemy.r||20)*.4-i*6,3+i,0,Math.PI*2);context.fill();}context.restore();
      }
      return result;
    };
  }

  function start() {
    normalizeSave(window.UI?.save || {});
    decorateSkins();
    ensureUi();
    bindUi();
    updateUpgradeMode();
  }

  patchStorage();
  patchUi();
  patchLevelUpChoices();
  patchGame();
  decorateSkins();
  bindUi();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.CHERRIFT_ELEMENTAL = Object.freeze({
    version:VERSION,
    elements:ELEMENTS,
    skinElements:SKIN_ELEMENTS,
    skills:SKILLS,
    nodeOrder:NODE_ORDER,
    nodeMax:NODE_MAX,
    normalizeSave,
    isUnlocked,
    unlockLevel,
    effectiveRank,
    availablePoints,
    canSpend,
    branchSpent,
    spendPoint,
    resetCost,
    getRunSkillLevel:skillLevel,
    setRunSkillLevel,
    resetRunSkills,
    skillCopy,
    render:renderResonance,
    runtime
  });
  console.info("[CHERRIFT] Elemental Resonance, affinities and in-run elemental skills loaded.");
})();
