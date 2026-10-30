/* Persistent gameplay is online-only. Legacy combat runs locally for rendering;
   all progression is committed by named, server-validated operations. */
(() => {
  "use strict";
  const state = {
    busy: false,
    runId: "",
    lastStar: 0,
    ending: false,
    installed: false,
    context: null,
    readiness: null,
  };
  const copy = (hu, en) =>
    window.UI?.save?.settings?.language === "en" ? en : hu;
  const toast = (message) => window.UI?.toast?.(message);
  const auth = () => window.CHERRIFT_AUTH?.getState?.() || {};
  const online = () =>
    auth().mode === "discord" && auth().cloudReady && auth().onlinePolicy;
  function unavailable() {
    const current = auth();
    if (current.mode === "discord") {
      toast(current.cloudReady && !current.onlinePolicy
        ? copy("Discorddal be vagy jelentkezve, de a játékszerver frissítése szükséges.", "You are signed in with Discord, but the game server needs an update.")
        : copy("Discorddal be vagy jelentkezve, de a felhőmentés kapcsolata nem elérhető. Próbáld újra.", "You are signed in with Discord, but cloud save is unavailable. Please retry."));
      return;
    }
    toast(
      copy(
        "A fejlődéshez online Discord-fiók kell. Lépj be, vagy állítsd helyre a kapcsolatot.",
        "Progression requires an online Discord account. Sign in or reconnect.",
      ),
    );
  }
  async function ensureOnline() {
    if (online()) return true;
    if (auth().mode === "discord") {
      if (!state.readiness) {
        state.readiness = Promise.resolve().then(() => window.CHERRIFT_AUTH.reconnectCloud?.())
          .catch(() => false).finally(() => { state.readiness = null; });
      }
      await state.readiness;
      if (online()) return true;
    }
    unavailable();
    return false;
  }
  function refresh() {
    window.UI?.refreshMenu?.();
    window.UI?.renderGear?.();
    window.CHERRIFT_V070?.render?.();
    window.CHERRIFT_V080?.render?.();
    window.CHERRIFT_V082?.refresh?.();
    window.CHERRIFT_ELEMENTAL?.render?.();
    window.CHERRIFT_PREBETA_EVENT?.render?.();
    for (const route of ["dailyQuests", "loginRewards", "weeklyV082"]) {
      const panel = document.getElementById(route);
      if (panel && !panel.classList.contains("hidden"))
        window.UI?.open?.(route);
    }
    window.dispatchEvent(new CustomEvent("cherrift:eventchange"));
  }
  async function perform(operation, params = {}) {
    const requestedBy = window.CHERRIFT_AUTH.captureAccount();
    if (!await ensureOnline()) return null;
    if (!window.CHERRIFT_AUTH.isCurrentAccount(requestedBy)) return null;
    if (state.busy) return null;
    state.busy = true;
    const context = window.CHERRIFT_AUTH.captureAccount();
    try {
      const result = await window.CHERRIFT_AUTH.gameAction(operation, params);
      refresh();
      if (result && !result.replayed && window.CHERRIFT_AUTH.isCurrentAccount(context)) {
        const cue = {equip:"equip", unequip:"equip", sell:"sell", dismantle:"scrap", salvage_gear:"scrap"}[operation];
        if (cue) window.CHERRIFT_MENU_AUDIO?.play(cue);
        else if (result.rewards?.length) window.CHERRIFT_MENU_AUDIO?.play("reward");
      }
      return result;
    } catch (error) {
      if (window.CHERRIFT_AUTH.isCurrentAccount(context)) {
        const messages = {
          not_enough_coins: ["Nincs elég Coin.", "Not enough Coins."],
          not_enough_bloomGems: [
            "Nincs elég Bloom Gem.",
            "Not enough Bloom Gems.",
          ],
          not_enough_sakuraEssence: [
            "Nincs elég Sakura Essence.",
            "Not enough Sakura Essence.",
          ],
          not_enough_materials: [
            "Nincs elég alapanyag.",
            "Not enough materials.",
          ],
          not_enough_chests: ["Nincs elég ládád.", "Not enough chests."],
          already_claimed: [
            "Ezt a jutalmat már átvetted.",
            "This reward was already claimed.",
          ],
          stage_locked: [
            "Ez a pálya még nincs feloldva.",
            "This stage is still locked.",
          ],
          skill_locked: [
            "A fejlesztés feltételei még nem teljesültek.",
            "Upgrade requirements are not met.",
          ],
          nothing_to_reset: [
            "Nincs visszaállítható fejlesztés.",
            "There are no upgrades to reset.",
          ],
          online_account_required: [
            "A folytatáshoz online belépés szükséges.",
            "Sign in online to continue.",
          ],
          server_update_required: [
            "A játékfrissítés még nem érhető el. Próbáld később.",
            "The game update is not available yet. Try again later.",
          ],
          game_action_rejected: [
            "A mentés közben megváltozott. Próbáld újra.",
            "The save changed. Please try again.",
          ],
        };
        toast(
          copy(
            ...(messages[error.message] || [
              "A művelet nem sikerült. Próbáld újra a kapcsolat helyreállítása után.",
              "The action failed. Reconnect and try again.",
            ]),
          ),
        );
      }
      return null;
    } finally {
      if (window.CHERRIFT_AUTH.isCurrentAccount(context)) state.busy = false;
    }
  }
  // Install before the legacy bundle registers capture handlers. This is the
  // sole owner of persistent action buttons; navigation remains with its router.
  window.addEventListener(
    "click",
    (event) => {
      const target = event.target?.closest?.("button");
      if (!target || target.disabled) return;
      let op = "",
        params = {};
      const d = target.dataset;
      const selected = () =>
        [
          ...document.querySelectorAll(
            '[data-v0560-item-id].selected,[data-v0560-item-id][aria-selected="true"]',
          ),
        ].map((x) => x.dataset.v0560ItemId);
      const mappings = [
        ["v080BuyChest", "buy_chest", "tier"],
        ["v080BuySkin", "buy_skin", "skin_id"],
        ["v080BuyFood", "buy_food", "food_id"],
        ["v080UseFood", "use_food", "food_id"],
        ["v084BagUse", "use_food", "food_id"],
        ["v0932BagUse", "use_food", "food_id"],
        ["v082Skill", "upgrade_skill", "node_id"],
        ["v070Level", "upgrade_arsenal", "slot"],
        ["v070Star", "upgrade_arsenal", "slot"],
        ["prebetaRefill", "refill_energy", "kind"],
        ["prebetaDrink", "drink_energy", "kind"],
        ["dailyClaim", "claim_daily", "quest_id"],
        ["eventLoginClaim", "event_login", "day"],
        ["eventDailyClaim", "event_daily", "task_id"],
        ["eventBuy", "event_shop", "item_id"],
        ["crAchClaim", "claim_achievement", "achievement_id"],
      ];
      for (const [key, operation, param] of mappings)
        if (d[key] !== undefined) {
          op = operation;
          params = { [param]: d[key] };
          break;
        }
      if (d.loginDay !== undefined) op = "claim_login";
      if (d.v082ResetTree !== undefined) op = "reset_skills";
      if (d.v082ClaimWeekly !== undefined) op = "claim_weekly";
      if (d.v093EventClaim !== undefined) op = "welcome_reward";
      if (d.v082BulkSell !== undefined || d.v082BulkDismantle !== undefined) {
        op = d.v082BulkSell !== undefined ? "sell" : "dismantle";
        params = { item_ids: selected() };
      }
      if (d.v070Salvage !== undefined || d.v070Merge !== undefined) {
        op = d.v070Merge !== undefined ? "merge_gear" : "salvage_gear";
        params = { slot: d.v070Merge || d.v070Salvage };
      }
      if (
        d.elementalNode !== undefined &&
        !window.CHERRIFT_ELEMENTAL?.runtime?.gmActive
      ) {
        op = "upgrade_elemental";
        params = {
          node: d.elementalNode,
          element: window.CHERRIFT_ELEMENTAL?.runtime?.selectedElement,
        };
      }
      if (
        d.elementalResetConfirm !== undefined &&
        !window.CHERRIFT_ELEMENTAL?.runtime?.gmActive
      )
        op = "reset_elemental";
      const ids = {
        dailyBonusClaimV055: "claim_daily_bonus",
        dailyClaimAllV055: "claim_daily_all",
        dailyRerollV055: "reroll_daily",
      };
      if (ids[target.id]) op = ids[target.id];
      if (d.shop !== undefined) {
        const mapping = {
          commonChest: "common",
          rareChest: "rare",
          epicChest: "epic",
        };
        if (mapping[d.shop]) {
          op = "buy_chest";
          params = { tier: mapping[d.shop] };
        } else {
          op = "shop_free";
          params = { kind: d.shop };
        }
      }
      if (!op) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      perform(op, params).then((result) => {
        if (result)
          toast(copy("Szerver által mentve.", "Saved by the server."));
      });
    },
    true,
  );

  function install() {
    if (
      state.installed ||
      !window.UI ||
      !window.CherriftGame ||
      !window.CherriftStorage
    )
      return;
    state.installed = true;
    window.__CHERRIFT_ONLINE_INSTALLED__ = true;
    const storage = window.CherriftStorage,
      save = storage.save.bind(storage);
    storage.save = (value) => {
      if (state.runId) return true; // Combat's speculative loot never becomes a save upload.
      if (auth().mode === "discord" && !online()) {
        // Menu autosaves must not repeat a sign-in toast on every refresh.
        // Explicit purchases and run starts report the current connection state.
        return false;
      }
      return save(value);
    };
    for (const [method, op, param] of [
      ["equipGear", "equip", "item_id"],
      ["unequipGear", "unequip", "slot"],
      ["sellGear", "sell", "item_id"],
      ["toggleGearLockV050", "lock", "item_id"],
    ]) {
      if (typeof UI[method] === "function")
        UI[method] = (value) => perform(op, { [param]: value });
    }
    const proto = window.CherriftGame.prototype,
      start = proto.start;
    proto.start = async function (...args) {
      const requestedBy = window.CHERRIFT_AUTH.captureAccount();
      // Recovery and abandoning an old run hydrate server state. Preserve the
      // chapter chosen for this gesture before either can restore an older one.
      const requestedStageId = (
        this.getSelectedStage?.() ||
        window.CHERRIFT_V040?.stages?.find(s => s.id === UI.save.selectedStageId)
      )?.id;
      if (!await ensureOnline()) return false;
      if (!window.CHERRIFT_AUTH.isCurrentAccount(requestedBy)) return false;
      if (state.runId || state.busy) return false;
      const activeRun = UI.save.security?.online?.run;
      if (activeRun && !activeRun.ended) {
        const abandoned = await perform("abandon_run", {
          run_id: activeRun.id,
        });
        if (!abandoned) return false;
      }
      const result = await perform("start_run", { stage_id: requestedStageId });
      if (!result) return false;
      state.runId = result.save_data.security.online.run.id;
      state.lastStar = 0;
      state.ending = false;
      state.context = window.CHERRIFT_AUTH.captureAccount();
      try {
        return await start.apply(this, args);
      } catch (error) {
        await finish(this);
        throw error;
      }
    };
    const update = proto.update;
    proto.update = function (...args) {
      const result = update.apply(this, args);
      if (
        state.runId &&
        !state.ending &&
        window.CHERRIFT_AUTH.isCurrentAccount(state.context)
      ) {
        const star = this.__runEscrowV0931?.currentStar || 0;
        if (star > state.lastStar && !state.busy) {
          state.lastStar = star;
          perform("checkpoint_run", {
            run_id: state.runId,
            star,
            kills: Math.min(this.kills || 0, this.stage?.goalKills || 0),
          }).then((response) => {
            if (!response) state.lastStar = Math.max(0, star - 1);
          });
        }
      }
      return result;
    };
    const clear = proto.stageClear;
    proto.stageClear = function (...args) {
      const result = clear.apply(this, args);
      finish(this, 3);
      return result;
    };
    const over = proto.gameOver;
    proto.gameOver = function (...args) {
      const result = over.apply(this, args);
      finish(this);
      return result;
    };
    const quit = UI.quit.bind(UI);
    UI.quit = function (...args) {
      finish(this.game);
      return quit(...args);
    };
  }
  async function finish(game, star = game?.__runEscrowV0931?.currentStar || 0) {
    if (!state.runId || state.ending) return;
    state.ending = true;
    const runId = state.runId,
      context = state.context;
    // Wait for any checkpoint before closing the run. Auth also serializes the
    // actual API calls, including retries with the same idempotency key.
    while (state.busy) await new Promise((resolve) => setTimeout(resolve, 30));
    if (window.CHERRIFT_AUTH.isCurrentAccount(context))
      await perform("end_run", {
        run_id: runId,
        star: game?.stage?.training ? 0 : star,
        kills: game?.stage?.training ? 0 : Math.min(game?.kills || 0, game?.stage?.goalKills || 0),
      });
    if (state.runId === runId && state.context === context) {
      state.runId = "";
      state.ending = false;
    }
  }
  window.addEventListener("cherrift:runtime-clean-ready", install);
  window.addEventListener("focus", () => {
    if (online() && !state.runId && !state.busy) perform("refresh_state");
  });
  window.addEventListener("cherrift:savechange", () => {
    if (
      state.context &&
      !window.CHERRIFT_AUTH?.isCurrentAccount?.(state.context)
    ) {
      state.runId = "";
      state.ending = false;
      state.busy = false;
      state.context = null;
      if (window.UI?.game) {
        window.UI.game.mode = "menu";
        document.body.classList.remove(
          "is-playing",
          "is-levelup",
          "cr-run-active",
          "is-loading-stage",
        );
        for (const name of [
          "hud",
          "stageHud",
          "pauseModal",
          "levelModal",
          "stageClearModal",
          "gameOver",
        ])
          document.getElementById(name)?.classList.add("hidden");
        window.UI.open?.("menu");
      }
    }
  });
  window.CHERRIFT_ONLINE = Object.freeze({ perform, online });
})();
