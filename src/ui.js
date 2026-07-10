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

    document.querySelectorAll("[data-open]").forEach(b => {
      b.onclick = () => this.open(b.dataset.open);
    });

    document.querySelectorAll(".back").forEach(b => {
      b.onclick = () => this.open("menu");
    });

    document.getElementById("pause").onclick = () => this.pause();
    document.getElementById("resume").onclick = () => this.resume();
    document.getElementById("quit").onclick = () => this.quit();
    document.getElementById("retry").onclick = () => this.game.start();
    document.getElementById("toMenu").onclick = () => this.quit();

    document.getElementById("openChest").onclick = () => this.openChest();

    document.getElementById("skinPrev").onclick = () => {
      this.skinIndex = (this.skinIndex - 1 + CHERRIFT_DATA.skins.length) % CHERRIFT_DATA.skins.length;
      this.renderSkinCarousel();
    };

    document.getElementById("skinNext").onclick = () => {
      this.skinIndex = (this.skinIndex + 1) % CHERRIFT_DATA.skins.length;
      this.renderSkinCarousel();
    };

    document.getElementById("skinEquip").onclick = () => {
      const skin = CHERRIFT_DATA.skins[this.skinIndex];
      if (!this.save.unlockedSkins.includes(skin.id)) {
        this.toast("Skin locked");
        return;
      }
      this.save.selectedSkin = skin.id;
      CherriftStorage.save(this.save);
      this.refreshMenu();
      this.renderSkinCarousel();
      this.toast(`${skin.name} equipped`);
    };

    document.getElementById("fullscreen").onclick = () => this.fullscreen();

    const volume = document.getElementById("volume");
    volume.value = this.save.settings.volume;
    volume.oninput = () => {
      this.save.settings.volume = +volume.value;
      CherriftStorage.save(this.save);
    };

    const touch = document.getElementById("touchMode");
    touch.checked = this.save.settings.touchMode;
    touch.onchange = () => {
      this.save.settings.touchMode = touch.checked;
      this.game.input.touchMode = touch.checked;
      CherriftStorage.save(this.save);
    };
    this.game.input.touchMode = this.save.settings.touchMode;
  },

  open(id) {
    ["menu","skins","gear","chests","settings"].forEach(x => {
      document.getElementById(x).classList.toggle("hidden", x !== id);
    });

    if (id === "menu") this.refreshMenu();
    if (id === "skins") this.renderSkinCarousel();
    if (id === "gear") this.renderGear();
  },

  showGame() {
    ["menu","skins","gear","chests","settings","gameOver","pauseModal","levelModal"].forEach(x => {
      document.getElementById(x).classList.add("hidden");
    });
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("skill").classList.remove("hidden");
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

    const splash = document.getElementById("skinSplash");
    splash.style.background = `radial-gradient(circle at 50% 40%, rgba(255,255,255,.16), transparent 26%), linear-gradient(135deg, ${skin.gradient[0]}, ${skin.gradient[1]})`;

    const btn = document.getElementById("skinEquip");
    btn.textContent = selected ? "EQUIPPED" : unlocked ? "EQUIP" : "LOCKED";
    btn.disabled = !unlocked;
  },

  gearName(g) {
    return `${g.rarity} ${g.type} ${g.slot}`;
  },

  gearEmoji(g) {
    return `${CHERRIFT_DATA.gearTypes[g.type]?.emoji || "⚙"}${CHERRIFT_DATA.slotIcons[g.slot] || ""}`;
  },

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

    for (let i=0;i<count;i++) {
      const stat = pool[Math.floor(Math.random() * pool.length)];
      const base = {
        damage:4,
        crit:3,
        critDamage:8,
        attackSpeed:5,
        maxHp:18,
        armor:4,
        regen:.45,
        moveSpeed:8,
        pickup:16
      }[stat] || 2;

      stats[stat] = (stats[stat] || 0) + Math.round(base * mult * (.75 + Math.random() * .65) * 10) / 10;
    }

    return { id, slot, type, rarity, stats };
  },

  renderGear() {
    const slots = document.querySelectorAll(".gear-slot");
    slots.forEach(btn => {
      const slot = btn.dataset.slot;
      const g = this.save.equipped[slot];

      btn.className = `gear-slot ${slot.toLowerCase()} ${g ? "" : "empty"} ${this.selectedGear && this.selectedGear.id === g?.id ? "selected" : ""}`;
      btn.dataset.short = slot.slice(0, 3).toUpperCase();
      btn.innerHTML = g ? `<span>${this.gearEmoji(g)}</span>` : "";
      btn.onclick = () => {
        if (g) this.showGearDetails(g, "equipped");
        else this.showEmptySlot(slot);
        this.highlightGear(g?.id);
      };
    });

    const inv = document.getElementById("inventory");
    inv.innerHTML = "";

    this.save.inventory.forEach(g => {
      const el = document.createElement("button");
      el.className = `inv-item rarity-${g.rarity.toLowerCase()} ${this.selectedGear && this.selectedGear.id === g.id ? "selected" : ""}`;
      el.innerHTML = `<span>${this.gearEmoji(g)}</span><small>${g.slot}</small>`;
      el.onclick = () => {
        this.showGearDetails(g, "inventory");
        this.highlightGear(g.id);
      };
      inv.appendChild(el);
    });

    document.getElementById("inventoryCount").textContent = `${this.save.inventory.length} items`;

    const stats = this.totalGearStats(this.save);
    document.getElementById("totalStats").innerHTML = "<h3>Total Stats</h3>" + (
      Object.keys(stats).length
        ? Object.entries(stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${Math.round(v*10)/10}</b></div>`).join("")
        : "<p>No gear equipped.</p>"
    );
  },

  highlightGear(id) {
    this.renderGear();
  },

  showEmptySlot(slot) {
    this.selectedGear = null;
    document.getElementById("gearDetails").innerHTML = `
      <div class="gear-details-empty">
        <b>${slot}</b> slot üres.<br>
        Válassz az inventoryból egy ${slot} itemet.
      </div>`;
  },

  showGearDetails(g, source) {
    this.selectedGear = g;

    const actions = source === "inventory"
      ? `<button data-action="equip">Equip</button><button data-action="sell">Sell</button>`
      : `<button data-action="unequip">Unequip</button>`;

    document.getElementById("gearDetails").innerHTML = `
      <div class="gear-detail-title">
        <div class="gear-detail-icon">${this.gearEmoji(g)}</div>
        <div>
          <h4>${this.gearName(g)}</h4>
          <small class="rarity-${g.rarity.toLowerCase()} type-${g.type.toLowerCase()}">${g.rarity} · ${g.type}</small>
        </div>
      </div>
      <div>
        ${Object.entries(g.stats).map(([k,v]) => `<div class="stat-line"><span>${k}</span><b>+${v}</b></div>`).join("")}
      </div>
      <div class="gear-detail-actions">${actions}</div>
    `;

    document.querySelectorAll("#gearDetails [data-action]").forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.action === "equip") this.equipGear(g.id);
        if (btn.dataset.action === "sell") this.sellGear(g.id);
        if (btn.dataset.action === "unequip") this.unequipGear(g.slot);
      };
    });

    this.renderGear();
  },

  totalGearStats(save) {
    const out = {};
    Object.values(save.equipped || {}).forEach(g => {
      if (!g) return;
      Object.entries(g.stats).forEach(([k,v]) => out[k] = (out[k] || 0) + v);
    });
    return out;
  },

  equipGear(id) {
    const idx = this.save.inventory.findIndex(g => g.id === id);
    if (idx < 0) return;

    const g = this.save.inventory[idx];
    const old = this.save.equipped[g.slot];

    this.save.equipped[g.slot] = g;
    this.save.inventory.splice(idx, 1);

    if (old) this.save.inventory.push(old);

    this.selectedGear = g;
    CherriftStorage.save(this.save);
    this.renderGear();
    this.showGearDetails(g, "equipped");
    this.toast("Gear equipped");
  },

  unequipGear(slot) {
    const g = this.save.equipped[slot];
    if (!g) return;

    delete this.save.equipped[slot];
    this.save.inventory.push(g);
    this.selectedGear = null;

    CherriftStorage.save(this.save);
    this.renderGear();
    this.showEmptySlot(slot);
    this.toast("Gear unequipped");
  },

  sellGear(id) {
    const idx = this.save.inventory.findIndex(g => g.id === id);
    if (idx < 0) return;

    const g = this.save.inventory[idx];
    const val = g.rarity === "Rare" ? 45 : g.rarity === "Uncommon" ? 18 : 7;

    this.save.inventory.splice(idx, 1);
    this.save.coins += val;
    this.selectedGear = null;

    CherriftStorage.save(this.save);
    this.renderGear();
    this.refreshMenu();
    document.getElementById("gearDetails").innerHTML = `<div class="gear-details-empty">Eladva: +${val} coins.</div>`;
    this.toast(`Sold +${val} coins`);
  },

  openChest() {
    if (this.save.keys <= 0) {
      this.toast("No chest keys");
      return;
    }

    this.save.keys--;
    const gear = this.makeGear();
    this.save.inventory.push(gear);

    let msg = `<b>${this.gearName(gear)}</b><br>${Object.entries(gear.stats).map(([k,v]) => `+${v} ${k}`).join(" · ")}`;

    const skinRoll = Math.random();
    if (skinRoll < .09) {
      const locked = CHERRIFT_DATA.skins.filter(s => !this.save.unlockedSkins.includes(s.id) && (s.rarity === "Common" || s.rarity === "Rare"));
      if (locked.length) {
        const s = locked[Math.floor(Math.random() * locked.length)];
        this.save.unlockedSkins.push(s.id);
        msg += `<br><br>🎀 SKIN UNLOCKED: <b>${s.name}</b>`;
      }
    }

    document.getElementById("chestResult").innerHTML = msg;
    CherriftStorage.save(this.save);
    this.refreshMenu();
    this.renderGear();
  },

  updateHUD(game) {
    const p = game.player;
    if (!p) return;

    document.getElementById("hpFill").style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    document.getElementById("xpFill").style.width = `${Math.max(0, p.xp / p.xpNext * 100)}%`;
    document.getElementById("hpText").textContent = `HP ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    document.getElementById("xpText").textContent = `LV ${p.level}`;
    document.getElementById("timer").textContent = this.fmt(game.time);
    document.getElementById("kills").textContent = `${game.kills} kills`;
    document.getElementById("runCoins").textContent = game.runCoins;

    const sk = document.getElementById("skill");
    const cd = document.getElementById("cooldown");

    if (p.skillTimer > 0) {
      sk.classList.add("cooldown");
      cd.textContent = Math.ceil(p.skillTimer);
    } else {
      sk.classList.remove("cooldown");
      cd.textContent = "";
    }
  },

  showLevelUp(game) {
    const list = document.getElementById("upgrades");
    list.innerHTML = "";

    const opts = [...CHERRIFT_DATA.upgrades].sort(() => Math.random() - .5).slice(0, 3);

    opts.forEach(up => {
      const b = document.createElement("button");
      b.className = "upgrade-card";
      b.innerHTML = `<strong>${up.name}</strong><span>${up.desc}</span>`;
      b.onclick = () => game.applyUpgrade(up);
      list.appendChild(b);
    });

    document.getElementById("levelModal").classList.remove("hidden");
  },

  hideLevelUp() {
    document.getElementById("levelModal").classList.add("hidden");
  },

  pause() {
    if (this.game.mode === "playing") {
      this.game.mode = "paused";
      document.getElementById("pauseModal").classList.remove("hidden");
    }
  },

  resume() {
    this.game.mode = "playing";
    document.getElementById("pauseModal").classList.add("hidden");
  },

  quit() {
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("skill").classList.add("hidden");
    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("gameOver").classList.add("hidden");
    this.game.mode = "menu";
    this.open("menu");
  },

  showGameOver(game) {
    document.getElementById("runResult").innerHTML = `
      <p>Time: <b>${this.fmt(game.time)}</b></p>
      <p>Kills: <b>${game.kills}</b></p>
      <p>Coins this run: <b>${game.runCoins}</b></p>
    `;
    document.getElementById("gameOver").classList.remove("hidden");
  },

  fullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  },

  fmt(sec) {
    sec = Math.floor(sec || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },

  toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
  }
};