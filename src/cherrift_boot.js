(() => {
  "use strict";

  if (window.__CHERRIFT_BOOT_V096__) return;
  window.__CHERRIFT_BOOT_V096__ = true;

  const VERSION = "0.9.8.2-sakura-start";
  const startedAt = performance.now();
  const minimumVisibleMs = 900;
  const warningAfterMs = 12000;

  const state = {
    dom:false,
    ui:false,
    authReady:false,
    saveReady:false,
    prebeta:false,
    live:false,
    runtime:false,
    loaded:false,
    stable:false,
    phase:"loading",
    released:false,
    completing:false,
    authMode:"checking",
    loopToken:0,
    warningShown:false
  };

  let shownProgress = 3;
  let startRevealTimer = 0;

  const byId = value => document.getElementById(value);
  const boot = () => byId("bootV060");

  function isPhoneBoot() {
    const touch =
      Number(navigator.maxTouchPoints) > 0 ||
      matchMedia("(pointer:coarse)").matches;

    return (
      touch &&
      Math.min(
        innerWidth || 9999,
        innerHeight || 9999,
        screen.width || 9999,
        screen.height || 9999
      ) <= 820
    );
  }

  function language() {
    return (
      window.CHERRIFT_I18N?.language === "en" ||
      window.UI?.save?.settings?.language === "en"
    )
      ? "en"
      : "hu";
  }

  function copy(hu, en) {
    return language() === "en" ? en : hu;
  }

  function authState() {
    try {
      return window.CHERRIFT_AUTH?.getState?.() || null;
    } catch (_) {
      return null;
    }
  }

  function authMode(current = authState()) {
    if (!current || current.mode === "checking") return "checking";
    if (current.mode === "discord" && current.signedIn) return "discord";
    if (current.mode === "guest") return "guest";
    return "gate";
  }

  function refreshReadiness() {
    const current = authState();

    state.dom =
      state.dom ||
      document.readyState !== "loading";

    state.ui = Boolean(
      window.UI &&
      window.CherriftStorage &&
      byId("app")
    );

    state.authReady =
      authMode(current) !== "checking";

    state.saveReady =
      Boolean(window.UI?.save);

    state.prebeta =
      window.__CHERRIFT_PREBETA_READY__ === true;

    state.live =
      state.live ||
      window.__CHERRIFT_LIVE_READY__ === true;

    state.runtime =
      state.runtime ||
      window.__CHERRIFT_RUNTIME_READY__ === true ||
      window.__CHERRIFT_CLEAN_RUNTIME__ === true ||
      Boolean(window.CHERRIFT_RUNTIME);

    // The interactive app is initialized from DOMContentLoaded. Waiting for
    // window.load here also waits for every decorative image requested by the
    // historical game bundle. On a cold/incognito cache one slow artwork file
    // could therefore pin an otherwise ready lobby at 98% indefinitely.
    state.loaded =
      state.loaded ||
      document.readyState !== "loading";

    // Mail/catalog are optional. They must never gate the lobby.
    state.stable =
      state.dom &&
      state.ui &&
      state.authReady &&
      state.saveReady &&
      state.prebeta &&
      state.runtime &&
      state.loaded;

    return current;
  }

  /*
   * IMPORTANT AUTH CONTRACT
   * -----------------------
   * bootstrapSave() deliberately changes CHERRIFT_AUTH.mode to "gate" as
   * soon as it discovers that no Supabase session exists. That does NOT mean
   * the login UI is ready yet.
   *
   * The authoritative auth module calls openGate() only from startAuthGate(),
   * after the primary save/preload/UI.init sequence has completed.
   * openGate() is what sets gateVisible=true.
   *
   * The cleanup-era boot regression came from treating mode==="gate" as
   * equivalent to "the gate is open". On a real phone that exposed Guest /
   * Discord while the app was still starting. A later startAuthGate() then
   * opened the gate again and overwrote the user's selection.
   */
  function gateReady(current = authState()) {
    return Boolean(
      current &&
      current.gateVisible === true &&
      authMode(current) === "gate" &&
      window.UI?.save &&
      window.UI?.game
    );
  }

  function targetProgress() {
    if (!state.dom) return 10;
    if (!state.ui) return 30;
    if (!state.authReady) return 48;
    if (!state.saveReady) return 62;
    if (!state.prebeta) return 76;
    if (!state.runtime) return 88;
    if (!state.live) return 94;
    if (!state.loaded) return 98;
    return 100;
  }

  function loadingMessage() {
    if (!state.dom) {
      return copy(
        "CHERRIFT indítása…",
        "Starting CHERRIFT…"
      );
    }

    if (!state.ui) {
      return copy(
        "Felület előkészítése…",
        "Preparing interface…"
      );
    }

    if (!state.authReady) {
      return copy(
        "Bejelentkezés ellenőrzése…",
        "Checking sign-in…"
      );
    }

    if (!state.saveReady) {
      const mode = authMode();

      if (mode === "discord") {
        return copy(
          "Felhőmentés betöltése…",
          "Loading cloud save…"
        );
      }

      return copy(
        "Profil előkészítése…",
        "Preparing profile…"
      );
    }

    if (!state.prebeta) {
      return copy(
        "Játékrendszerek betöltése…",
        "Loading game systems…"
      );
    }

    if (!state.runtime) {
      return copy(
        "Felület véglegesítése…",
        "Finalizing interface…"
      );
    }

    if (!state.loaded) {
      return copy(
        "Utolsó ellenőrzések…",
        "Running final checks…"
      );
    }

    return copy("Kész…", "Ready…");
  }

  function waitingFor() {
    const missing = [];

    if (!state.ui) missing.push("UI");
    if (!state.authReady) missing.push("Auth");
    if (!state.saveReady) missing.push("Save");
    if (!state.prebeta) missing.push("Pre-beta");
    if (!state.runtime) missing.push("Runtime");
    if (!state.loaded) missing.push("Load");

    const current = authState();

    if (
      authMode(current) === "gate" &&
      !gateReady(current)
    ) {
      missing.push("Auth gate finalization");
    }

    return missing.join(", ") || "unknown";
  }

  function paintProgress(value, message = "") {
    shownProgress = Math.max(
      shownProgress,
      Math.min(100, Math.round(value))
    );

    const fill = byId("bootFillV060");
    const percent = byId("bootPercentV060");
    const label = byId("bootTextV060");

    if (fill) fill.style.width = `${shownProgress}%`;
    if (percent) percent.textContent = `${shownProgress}%`;
    if (label && message) label.textContent = message;
  }

  function setPhase(phase) {
    window.clearTimeout(startRevealTimer);
    startRevealTimer = 0;
    state.completing = false;
    state.phase = phase;
    state.loopToken += 1;

    const root = boot();
    if (!root) return;

    root.dataset.bootPhase = phase;

    byId("bootLoadingV096")?.toggleAttribute(
      "hidden",
      phase !== "loading"
    );

    byId("bootAuthV096")?.toggleAttribute(
      "hidden",
      phase !== "auth"
    );

    byId("bootStartV096")?.toggleAttribute(
      "hidden",
      phase !== "start"
    );
  }

  function syncCopy() {
    const title = byId("bootAuthTitleV096");
    const intro =
      byId("bootAuthV096")?.querySelector("p");
    const discord =
      byId("bootDiscordV096")?.querySelector("b");
    const guest =
      byId("bootGuestV096")?.querySelector("b");
    const start =
      byId("bootStartV096")?.querySelector("span");

    const phone = isPhoneBoot();

    if (title) {
      title.textContent = phone
        ? copy("Jelentkezz be.", "Sign in.")
        : copy(
            "Hogyan folytatod?",
            "How would you like to continue?"
          );
    }

    if (intro) {
      intro.hidden = phone;
      intro.textContent = phone
        ? ""
        : copy(
            "Jelentkezz be Discorddal a játékhoz és a fejlődéshez, vagy nézz körül vendégként.",
            "Sign in with Discord to play and progress, or preview the menus as a Guest."
          );
    }

    if (discord) discord.textContent = "DISCORD LOGIN";

    if (guest) {
      guest.textContent = copy(
        "FOLYTATÁS VENDÉGKÉNT",
        "CONTINUE AS GUEST"
      );
    }

    if (start) {
      start.textContent = phone ? "Tap here" : "Press any button";
    }
  }

  function setAuthBusy(busy, status = "") {
    for (
      const button of [
        byId("bootDiscordV096"),
        byId("bootGuestV096")
      ]
    ) {
      if (button) button.disabled = busy;
    }

    const label = byId("bootAuthStatusV096");

    if (label && status) {
      label.textContent = status;
    }
  }

  function showAuth() {
    if (state.released) return false;

    const current = authState();

    // Never expose the boot facade for the auth module's temporary
    // bootstrap mode. Only the real, post-UI openGate() state is valid.
    if (!gateReady(current)) {
      startLoadingLoop(
        copy(
          "Profil előkészítése…",
          "Preparing profile…"
        )
      );
      return false;
    }

    state.authMode = "gate";
    syncCopy();
    setPhase("auth");

    const discord = byId("bootDiscordV096");
    const guest = byId("bootGuestV096");

    if (discord) {
      discord.disabled = Boolean(
        current?.busy ||
        window.CHERRIFT_AUTH?.clientReady === false
      );
    }

    if (guest) {
      guest.disabled = Boolean(current?.busy);
    }

    const status = byId("bootAuthStatusV096");

    if (status) {
      status.textContent = isPhoneBoot()
        ? copy(
            "Vendégként a menüket nézheted meg. A játékhoz és a fejlődéshez online belépés kell.",
            "Guest mode previews the menus. Gameplay and progression require an online account."
          )
        : copy(
            "Vendégként a menüket nézheted meg. A játékhoz és a fejlődéshez online belépés kell.",
            "Guest mode previews the menus. Gameplay and progression require an online account."
          );
    }

    return true;
  }

  function showStart(mode = "guest") {
    if (state.released || !state.stable || state.completing || state.phase === "start") return;
    if (!["guest", "discord"].includes(authMode())) return;
    state.authMode = mode;
    paintProgress(100);
    syncCopy();
    // Keep the runner visible while the last .55s of the curved meter settles.
    // Readiness alone must not replace it before the line visibly reaches 100%.
    setPhase("loading");
    state.completing = true;
    const token = state.loopToken;
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;
    startRevealTimer = window.setTimeout(() => {
      startRevealTimer = 0;
      state.completing = false;
      if (state.released || token !== state.loopToken) return;
      const current = refreshReadiness();
      if (!state.stable || !["guest", "discord"].includes(authMode(current))) {
        startLoadingLoop();
        return;
      }
      syncCopy();
      setPhase("start");
      if (!isPhoneBoot()) {
        requestAnimationFrame(() => byId("bootStartV096")?.focus({preventScroll:true}));
      }
    }, duration);
  }

  function startLoadingLoop(message = "") {
    if (state.released) return;

    setPhase("loading");

    if (message) {
      paintProgress(shownProgress, message);
    }

    const token = state.loopToken;

    requestAnimationFrame(() => tick(token));
  }

  function finalizeIfReady(current = authState()) {
    const mode = authMode(current);

    if (
      mode === "checking" ||
      mode === "gate"
    ) {
      return false;
    }

    state.authMode = mode;

    if (!state.stable) return false;

    showStart(mode);
    return true;
  }

  function releaseToLobby() {
    if (
      state.released ||
      state.phase !== "start" ||
      !state.stable
    ) {
      return;
    }

    state.released = true;

    document.body.classList.remove(
      "v060-booting",
      "auth-gated-v064"
    );

    let fading = false;
    const beginFade = () => {
        if (fading) return;
        fading = true;
        window.clearTimeout(fadeFallback);
        const root = boot();

        root?.classList.add("done");
        root?.setAttribute("aria-hidden", "true");

        window.setTimeout(
          () => root?.remove(),
          650
        );

        window.dispatchEvent(
          new CustomEvent(
            "cherrift:boot-ready",
            {
              detail:{
                durationMs:Math.round(
                  performance.now() - startedAt
                ),
                mode:state.authMode
              }
            }
          )
        );
    };
    // Background or heavily loaded tabs may not deliver both animation frames.
    // The presentation must never leave an invisible layer consuming all input.
    const fadeFallback = window.setTimeout(beginFade, 250);
    requestAnimationFrame(() => requestAnimationFrame(beginFade));
    // Menu rendering must not prevent the input-blocking overlay cleanup
    // from being scheduled, even if a route renderer fails synchronously.
    window.UI?.open?.("menu");
  }

  async function chooseAuth(action) {
    const api = window.CHERRIFT_AUTH;

    if (!api) {
      setAuthBusy(
        false,
        copy(
          "A bejelentkezési modul még nem érhető el.",
          "The sign-in module is not ready yet."
        )
      );
      return;
    }

    // Guard against stale/early facade state even if another module calls
    // showAuth() programmatically.
    if (!gateReady(authState())) {
      setAuthBusy(
        false,
        copy(
          "A profil még készül. Egy pillanat…",
          "The profile is still being prepared…"
        )
      );
      startLoadingLoop();
      return;
    }

    if (action === "discord") {
      setAuthBusy(
        true,
        copy(
          "Átirányítás Discordra…",
          "Redirecting to Discord…"
        )
      );

      try {
        const ok =
          await api.signInWithDiscord?.();

        if (!ok) {
          setAuthBusy(
            false,
            copy(
              "A Discord bejelentkezés nem indult el. Próbáld újra.",
              "Discord sign-in did not start. Please try again."
            )
          );
        }
      } catch (error) {
        console.error(
          "[CHERRIFT Boot] Discord auth action failed:",
          error
        );

        setAuthBusy(
          false,
          copy(
            `Discord hiba: ${error?.message || "ismeretlen hiba"}`,
            `Discord error: ${error?.message || "unknown error"}`
          )
        );
      }

      return;
    }

    setAuthBusy(
      true,
      copy(
        "Vendégmentés előkészítése…",
        "Preparing guest save…"
      )
    );

    try {
      const ok =
        await api.continueAsGuest?.();

      if (ok === false) {
        setAuthBusy(
          false,
          copy(
            "A vendég mód nem indítható.",
            "Guest mode could not start."
          )
        );
        return;
      }

      // closeGate("guest") emits cherrift:authgate synchronously. The event
      // handler below normally continues the boot. This is a defensive
      // fallback in case a future auth implementation stops dispatching it.
      const current = refreshReadiness();

      if (authMode(current) === "guest") {
        state.authMode = "guest";

        if (state.stable) {
          showStart("guest");
        } else if (state.phase === "auth") {
          startLoadingLoop(
            copy(
              "Vendégprofil betöltése…",
              "Loading guest profile…"
            )
          );
        }
      }
    } catch (error) {
      console.error(
        "[CHERRIFT Boot] Guest auth action failed:",
        error
      );

      setAuthBusy(
        false,
        copy(
          `Vendég mód hiba: ${error?.message || "ismeretlen hiba"}`,
          `Guest mode error: ${error?.message || "unknown error"}`
        )
      );
    }
  }

  function tick(token) {
    if (
      token !== state.loopToken ||
      state.released ||
      state.phase !== "loading"
    ) {
      return;
    }

    const current = refreshReadiness();
    const elapsed =
      performance.now() - startedAt;

    const target = targetProgress();

    const remaining = Math.max(0, target - shownProgress);
    const step = remaining > 0
      ? Math.min(remaining, Math.max(1, remaining * .09))
      : 0;

    // Never fabricate progress past the readiness phase that actually exists.
    paintProgress(
      Math.min(target, shownProgress + step),
      loadingMessage()
    );

    /*
     * FIX: mode==="gate" is only the bootstrap decision.
     * gateVisible===true is the authoritative signal that startAuthGate()
     * has completed and the choice may safely be accepted.
     */
    if (
      elapsed >= minimumVisibleMs &&
      gateReady(current)
    ) {
      showAuth();
      return;
    }

    if (
      elapsed >= minimumVisibleMs &&
      finalizeIfReady(current)
    ) {
      return;
    }

    if (
      !state.warningShown &&
      elapsed >= warningAfterMs
    ) {
      state.warningShown = true;

      console.warn(
        `[CHERRIFT Boot] Startup is still waiting for: ${waitingFor()}`
      );

      const label = byId("bootTextV060");

      if (label) {
        label.textContent = copy(
          `Betöltés folyamatban… (${waitingFor()})`,
          `Still loading… (${waitingFor()})`
        );
      }
    }

    requestAnimationFrame(() => tick(token));
  }

  function consumeStartInput(event) {
    // Swallow the opening gesture (and follow-up input during the fade) so it
    // cannot also activate a lobby button or gameplay shortcut underneath.
    if (state.released && boot()) {
      event.preventDefault(); event.stopImmediatePropagation();
      return true;
    }
    if (state.phase !== "start" || !state.stable || state.released) return false;
    event.preventDefault(); event.stopImmediatePropagation();
    releaseToLobby();
    return true;
  }

  document.addEventListener("click", event => {
    if (consumeStartInput(event)) return;
    const auth = event.target.closest?.("[data-boot-auth]");
    if (auth && !auth.disabled) {
      event.preventDefault();
      chooseAuth(auth.dataset.bootAuth);
    }
  }, true);

  document.addEventListener("keydown", event => {
    // Leave browser shortcuts and IME composition to the browser.
    if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    consumeStartInput(event);
  }, true);

  window.addEventListener(
    "cherrift:authgate",
    event => {
      if (state.released) return;

      const detail = event.detail || {};
      const current = refreshReadiness();

      if (detail.visible) {
        if (
          performance.now() - startedAt >=
            minimumVisibleMs &&
          gateReady(current)
        ) {
          showAuth();
        } else {
          startLoadingLoop(
            copy(
              "Profil előkészítése…",
              "Preparing profile…"
            )
          );
        }
        return;
      }

      if (
        ["guest", "discord"].includes(
          detail.mode
        )
      ) {
        state.authMode = detail.mode;

        if (state.stable) {
          showStart(detail.mode);
        } else {
          startLoadingLoop(
            copy(
              "Profil betöltése…",
              "Loading profile…"
            )
          );
        }
      }
    }
  );

  window.addEventListener(
    "cherrift:languagechange",
    syncCopy
  );

  window.addEventListener(
    "load",
    () => {
      state.loaded = true;
    },
    { once:true }
  );

  window.addEventListener(
    "cherrift:prebeta-ready",
    () => {
      state.prebeta = true;
    }
  );

  window.addEventListener(
    "cherrift:live:ready",
    () => {
      state.live = true;
    }
  );

  window.addEventListener(
    "cherrift:runtime-ready",
    () => {
      state.runtime = true;
    }
  );

  window.addEventListener(
    "cherrift:runtime-clean-ready",
    () => {
      state.runtime = true;
    }
  );

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      state.dom = true;
      state.loaded = true;
      syncCopy();
    },
    { once:true }
  );

  if (document.readyState !== "loading") {
    state.dom = true;
    state.loaded = true;
  }

  syncCopy();
  startLoadingLoop();

  window.CHERRIFT_BOOT = Object.freeze({
    version:VERSION,

    getState:() => ({
      ...state,
      progress:shownProgress,
      waitingFor:waitingFor(),
      gateReady:gateReady()
    }),

    showAuth,
    showStart,
    release:releaseToLobby,
    refresh:refreshReadiness
  });
})();
