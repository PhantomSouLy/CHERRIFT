window.UI = {
  skinIndex: 0,
  selectedGear: null,

  init(save, game) {
    this.save = save;
    this.game = game;
    this.skinIndex = Math.max(0, CHERRIFT_DATA.skins.findIndex(s => s.id === save.selectedSkin));
    this.bind();
    this.refreshMenu();
    this.renderSkinCarousel();
    this.renderGear();
  },

  bind() {
    document.getElementById("playBtn").onclick = () => this.game.start();
    document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => this.open(b.dataset.open));
    document.querySelectorAll(".back").forEach(b => b.onclick = () => this.open("menu"));
    document.getElementById("pause").onclick = () => this.pause();
    document.getElementById("resume").onclick = () => this.resume();
    document.getElementById("quit").onclick = () => this.quit();
    document.getElementById("retry").onclick = () => this.game.start();
    document.getElementById("toMenu").onclick = () => this.quit();
    document.getElementById("openChest").onclick = () => this.openChest();
    document.getElementById("skinPrev").onclick = () => { this.skinIndex = (this.skinIndex - 1 + CHERRIFT_DATA.skins.length) % CHERRIFT_DATA.skins.length; this.renderSkinCarousel(); };
    document.getElementById("skinNext").onclick = () => { this.skinIndex = (this.skinIndex + 1) % CHERRIFT_DATA.skins.length; this.renderSkinCarousel(); };
    document.getElementById("skinEquip").onclick = () => {
      const skin = CHERRIFT_DATA.skins[this.skinIndex];
      if (!this.save.unlockedSkins.includes(skin.id)) { this.toast("Skin locked"); return; }
      this.save.selectedSkin = skin.id;
      CherriftStorage.save(this.save);
      this.refreshMenu();
      this.renderSkinCarousel();
      this.toast(`${skin.name} equipped`);
    };
    document.getElementById("fullscreen").onclick = () => this.fullscreen();
    const volume = document.getElementById("volume");
    volume.value = this.save.settings.volume;
    volume.oninput = () => { this.save.settings.volume = +volume.value; CherriftStorage.save(this.save); };
    const touch = document.getElementById("touchMode");
    touch.checked = this.save.settings.touchMode;
    touch.onchange = () => { this.save.settings.touchMode = touch.checked; this.game.input.touchMode = touch.checked; CherriftStorage.save(this.save); };
    this.game.input.touchMode = this.save.settings.touchMode;

    const fpsLimit = document.getElementById("fpsLimit");
    if (fpsLimit) {
      fpsLimit.value = String(this.save.settings.fpsLimit || 60);
      fpsLimit.onchange = () => {
        this.save.settings.fpsLimit = +fpsLimit.value;
        this.game.fpsLimit = this.save.settings.fpsLimit;
        CherriftStorage.save(this.save);
        this.toast(`${this.save.settings.fpsLimit} FPS limit set`);
      };
    }
  },

  open(id) {
    document.body.classList.remove("is-playing");
    ["menu", "skins", "gear", "chests", "settings"].forEach(x => document.getElementById(x).classList.toggle("hidden", x !== id));
    if (id === "menu") this.refreshMenu();
    if (id === "skins") this.renderSkinCarousel();
    if (id === "gear") this.renderGear();
  },

  showGame() {
    ["menu", "skins", "gear", "chests", "settings", "gameOver", "pauseModal", "levelModal"].forEach(x => document.getElementById(x).classList.add("hidden"));
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("skill").classList.remove("hidden");
    document.body.classList.add("is-playing");
  },

  refreshMenu() {
    document.getElementById("menuCoins").textContent = this.save.coins;
    document.getElementById("menuKeys").textContent = this.save.keys;
    const s = CHERRIFT_DATA.skins.find(x => x.id === this.save.selectedSkin);
    document.getElementById("selectedSkinText").textContent = s ? `${s.emoji} ${s.name}` : "Cherry";
    document.getElementById("bestRun").textContent = `${this.fmt(this.save.best.time)} · ${this.save.best.kills} kills`;
    CherriftStorage.save(this.save);
  },

  renderSkinCarousel() {
    const skin = CHERRIFT_DATA.skins[this.skinIndex];
    const unlocked = this.save.unlockedSkins.includes(skin.id);
    const selected = this.save.selectedSkin === skin.id;
    document.getElementById("skinPortrait").textContent = skin.emoji;
    document.getElementById("skinMini").textContent = skin.emoji;
    document.getElementById("skinRarity").textContent = skin.rarity + (unlocked ? "" : " · LOCKED");
    document.getElementById("skinRarity").className = `rarity-pill rarity-${skin.rarity.toLowerCase()}`;
    document.getElementById("skinName").textContent = skin.name;
    document.getElementById("skinDesc").textContent = skin.desc;
    document.getElementById("skinWeapon").textContent = skin.weapon;
    document.getElementById("skinSkill").textContent = skin.skill;
    document.getElementById("skinSplash").style.background = `radial-gradient(circle at 50% 40%, rgba(255,255,255,.16), transparent 26%), linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})`;
    const btn = document.getElementById("skinEquip");
    btn.textContent = selected ? "EQUIPPED" : unlocked ? "EQUIP" : "LOCKED";
    btn.disabled = !unlocked;
  },

  gearName(g) { return `${g.rarity} ${g.type} ${g.slot}`; },
  gearEmoji(g) { return `${CHERRIFT_DATA.gearTypes[g.type]?.emoji || "⚙"}${CHERRIFT_DATA.slotIcons[g.slot] || ""}`; },

  makeGear() {
    const slots = CHERRIFT_DATA.slots;
    const types = Object.keys(CHERRIFT_DATA.gearTypes);
    const rarityRoll = Math.random();
    const rarity = rarityRoll < .62 ? "Common" : rarityRoll < .90 ? "Uncommon" : "Rare";
    const type = types[Math.floor(Math.random() * types.length)];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const mult = CHERRIFT_DATA.rarities[rarity].mult;
    const id = "g_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const stats = {};
    const pool = CHERRIFT_DATA.gearTypes[type].stats;
    const count = rarity === "Rare" ? 3 : rarity === "Uncommon" ? 2 : 1;
    for (let i=0; i<count; i++) {
      const stat = pool[Math.floor(Math.random() * pool.length)];
      const base = { damage:4, crit:3, critDamage:8, attackSpeed:5, maxHp:18, armor:4, regen:.45, moveSpeed:8, pickup:16 }[stat] || 2;
      stats[stat] = (stats[stat] || 0) + Math.round(base * mult * (.75 + Math.random() * .65) * 10) / 10;
    }
    return { id, slot, type, rarity, stats };
  },

  renderGear() {
    const inv = document.getElementById("inventory");

    if (inv) {
      inv.ondragover = e => e.preventDefault();
      inv.ondrop = e => {
        e.preventDefault();
        const slot = e.dataTransfer.getData("slot");
        if (slot) this.unequipGear(slot);
      };
    }

    document.querySelectorAll(".gear-slot").forEach(btn => {
      const slot = btn.dataset.slot;
      const g = this.save.equipped[slot];
      btn.className = `gear-slot ${slot.toLowerCase()} ${g ? "" : "empty"} ${this.selectedGear && this.selectedGear.id === g?.id ? "selected" : ""}`;
      btn.dataset.short = slot.slice(0, 3).toUpperCase();
      btn.innerHTML = g ? `<span>${this.gearEmoji(g)}</span>` : "";
      btn.onclick = () => { if (g) this.showGearDetails(g, "equipped"); else this.showEmptySlot(slot); this.highlightGear(g?.id); };

      btn.draggable = !!g;
      btn.ondragstart = e => {
        if (!g) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("slot", slot);
        e.dataTransfer.setData("gearId", g.id);
        btn.classList.add("dragging");
      };
      btn.ondragend = () => btn.classList.remove("dragging", "drop-target", "bad-drop");
      btn.ondragover = e => {
        e.preventDefault();
        const id = e.dataTransfer.getData("gearId");
        const item = this.save.inventory.find(x => x.id === id);
        btn.classList.toggle("bad-drop", !!item && item.slot !== slot);
        btn.classList.toggle("drop-target", !!item && item.slot === slot);
      };
      btn.ondragleave = () => btn.classList.remove("drop-target", "bad-drop");
      btn.ondrop = e => {
        e.preventDefault();
        btn.classList.remove("drop-target", "bad-drop");
        const id = e.dataTransfer.getData("gearId");
        const item = this.save.inventory.find(x => x.id === id);
        if (!item) return;
        if (item.slot !== slot) {
          this.toast(`${item.slot} item nem rakható ${slot} slotra`);
          return;
        }
        this.equipGear(id);
      };
    });

    inv.innerHTML = "";
    this.save.inventory.forEach(g => {
      const el = document.createElement("button");
      el.className = `inv-item rarity-${g.rarity.toLowerCase()} ${this.selectedGear && this.selectedGear.id === g.id ? "selected" : ""}`;
      el.draggable = true;
      el.dataset.gearId = g.id;
      el.innerHTML = `<span>${this.gearEmoji(g)}</span><small>${g.slot}</small>`;
      el.onclick = () => { this.showGearDetails(g, "inventory"); this.highlightGear(g.id); };
      el.ondragstart = e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("gearId", g.id);
        el.classList.add("dragging");
        this.showGearDetails(g, "inventory");
      };
      el.ondragend = () => el.classList.remove("dragging");
      inv.appendChild(el);
    });

    document.getElementById("inventoryCount").textContent = `${this.save.inventory.length} items`;
    const stats = this.totalGearStats(this.save);
    document.getElementById("totalStats").innerHTML = "<h3>Total Stats</h3>" + (Object.keys(stats).length ? Object.entries(stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${Math.round(v*10)/10}</b></div>`).join("") : "<p>No gear equipped.</p>");
  },

  highlightGear(id) { this.renderGear(); },

  showEmptySlot(slot) {
    this.selectedGear = null;
    document.getElementById("gearDetails").innerHTML = `<div class="gear-details-empty"><b>${slot}</b> slot üres.<br>Húzz ide az inventoryból egy ${slot} itemet.</div>`;
  },

  showGearDetails(g, source) {
    this.selectedGear = g;
    const actions = source === "inventory" ? `<button data-action="equip">Equip</button><button data-action="sell">Sell</button>` : `<button data-action="unequip">Unequip</button>`;
    document.getElementById("gearDetails").innerHTML = `
      <div class="gear-detail-title"><div class="gear-detail-icon">${this.gearEmoji(g)}</div><div><h4>${this.gearName(g)}</h4><small class="rarity-${g.rarity.toLowerCase()} type-${g.type.toLowerCase()}">${g.rarity} · ${g.type}</small></div></div>
      <div>${Object.entries(g.stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${v}</b></div>`).join("")}</div>
      <div class="gear-detail-actions">${actions}</div>`;
    document.querySelectorAll("#gearDetails [data-action]").forEach(btn => {
      btn.onclick = () => { if (btn.dataset.action === "equip") this.equipGear(g.id); if (btn.dataset.action === "sell") this.sellGear(g.id); if (btn.dataset.action === "unequip") this.unequipGear(g.slot); };
    });
    this.renderGear();
  },

  totalGearStats(save) {
    const out = {};
    Object.values(save.equipped || {}).forEach(g => { if (!g) return; Object.entries(g.stats).forEach(([k,v]) => out[k] = (out[k] || 0) + v); });
    return out;
  },

  equipGear(id) {
    const idx = this.save.inventory.findIndex(g => g.id === id);
    if (idx < 0) return;
    const g = this.save.inventory[idx];
    const old = this.save.equipped[g.slot];
    this.save.inventory.splice(idx, 1);
    if (old) this.save.inventory.push(old);
    this.save.equipped[g.slot] = g;
    CherriftStorage.save(this.save);
    this.selectedGear = g;
    this.renderGear();
    this.showGearDetails(g, "equipped");
  },

  unequipGear(slot) {
    const g = this.save.equipped[slot];
    if (!g) return;
    delete this.save.equipped[slot];
    this.save.inventory.push(g);
    CherriftStorage.save(this.save);
    this.selectedGear = null;
    this.renderGear();
    this.showEmptySlot(slot);
  },

  sellGear(id) {
    const idx = this.save.inventory.findIndex(g => g.id === id);
    if (idx < 0) return;
    const g = this.save.inventory[idx];
    const value = g.rarity === "Rare" ? 15 : g.rarity === "Uncommon" ? 8 : 4;
    this.save.inventory.splice(idx, 1);
    this.save.coins += value;
    CherriftStorage.save(this.save);
    this.toast(`Sold +${value} coins`);
    this.selectedGear = null;
    document.getElementById("gearDetails").innerHTML = `<div class="gear-details-empty">Item sold.</div>`;
    this.renderGear();
    this.refreshMenu();
  },

  openChest() {
    if (this.save.keys <= 0) { this.toast("No keys"); return; }
    this.save.keys--;
    const gear = this.makeGear();
    this.save.inventory.push(gear);
    let extra = "";
    if (Math.random() < .12) {
      const locked = CHERRIFT_DATA.skins.filter(s => !this.save.unlockedSkins.includes(s.id));
      if (locked.length) { const s = locked[Math.floor(Math.random() * locked.length)]; this.save.unlockedSkins.push(s.id); extra = `<br>Unlocked skin: <b>${s.emoji} ${s.name}</b>`; }
    }
    CherriftStorage.save(this.save);
    document.getElementById("chestResult").innerHTML = `Got <b>${this.gearName(gear)}</b><br>${Object.entries(gear.stats).map(([k,v]) => `${k} +${v}`).join(" · ")}${extra}`;
    this.refreshMenu();
    this.renderGear();
  },

  showLevelUp(game) {
    const list = document.getElementById("upgrades");
    list.innerHTML = "";
    const pool = [...CHERRIFT_DATA.upgrades].sort(() => Math.random() - .5).slice(0, 3);
    pool.forEach(up => {
      const btn = document.createElement("button");
      btn.className = "upgrade-card";
      btn.innerHTML = `<strong>${up.name}</strong><span>${up.desc}</span>`;
      btn.onclick = () => game.applyUpgrade(up);
      list.appendChild(btn);
    });
    document.getElementById("levelModal").classList.remove("hidden");
  },

  hideLevelUp() { document.getElementById("levelModal").classList.add("hidden"); },

  updateHUD(game) {
    const p = game.player;
    if (!p) return;
    document.getElementById("hpFill").style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    document.getElementById("hpText").textContent = `HP ${Math.ceil(Math.max(0, p.hp))}/${Math.ceil(p.maxHp)}`;
    document.getElementById("xpFill").style.width = `${Math.min(100, p.xp / p.xpNext * 100)}%`;
    document.getElementById("xpText").textContent = `LV ${p.level} XP ${p.xp}/${p.xpNext}`;
    document.getElementById("timer").textContent = this.fmt(game.time);
    document.getElementById("kills").textContent = `${game.kills} kills`;
    document.getElementById("runCoins").textContent = game.runCoins;
    const skill = document.getElementById("skill");
    const cd = document.getElementById("cooldown");
    if (p.skillTimer > 0) { skill.classList.add("cooldown"); cd.textContent = p.skillTimer.toFixed(1); } else { skill.classList.remove("cooldown"); cd.textContent = ""; }
  },

  pause() { if (this.game.mode !== "playing") return; this.game.mode = "paused"; document.body.classList.remove("is-playing"); document.getElementById("pauseModal").classList.remove("hidden"); },
  resume() { if (this.game.mode !== "paused") return; this.game.mode = "playing"; document.body.classList.add("is-playing"); document.getElementById("pauseModal").classList.add("hidden"); },
  quit() { this.game.mode = "menu"; document.body.classList.remove("is-playing"); ["hud", "skill", "pauseModal", "gameOver", "levelModal"].forEach(x => document.getElementById(x).classList.add("hidden")); this.open("menu"); },

  showGameOver(game) {
    document.getElementById("gameOver").classList.remove("hidden");
    document.getElementById("runResult").innerHTML = `<p>Time: <b>${this.fmt(game.time)}</b></p><p>Kills: <b>${game.kills}</b></p><p>Coins: <b>${game.runCoins}</b></p>`;
    this.refreshMenu();
  },

  fullscreen() { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen(); else if (document.exitFullscreen) document.exitFullscreen(); },
  fmt(sec) { sec = Math.floor(sec || 0); const m = Math.floor(sec / 60).toString().padStart(2, "0"); const s = (sec % 60).toString().padStart(2, "0"); return `${m}:${s}`; },
  toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => t.classList.remove("show"), 1700); }
};
