(() => {
"use strict";

const VERSION = "0.5.6.0-gear-redesign";
const MOBILE_BREAKPOINT = 820;
const SLOT_ORDER = ["Helmet", "Necklace", "Armor", "Gloves", "Weapon", "Ring", "Boots"];
const SLOT_ICONS = {
  Helmet: "⛑",
  Necklace: "◇",
  Armor: "🛡",
  Gloves: "🧤",
  Weapon: "⚔",
  Ring: "◉",
  Boots: "🥾"
};
const STAT_LABELS = {
  damage: "Attack",
  maxHp: "HP",
  armor: "Armor",
  crit: "Critical Rate",
  critDamage: "Critical Damage",
  attackSpeed: "Attack Speed",
  moveSpeed: "Move Speed",
  regen: "HP Regen",
  pickup: "Pickup Range"
};
const RARITY_ORDER = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4
};

const id = name => document.getElementById(name);
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const isMobile = () => matchMedia(`(max-width:${MOBILE_BREAKPOINT}px)`).matches;
const hasHover = () => matchMedia("(hover:hover) and (pointer:fine)").matches;

if (
  !window.UI ||
  !window.CHERRIFT_V0559 ||
  !window.CHERRIFT_CONFIG ||
  !window.CHERRIFT_DATA
) {
  console.error("[CHERRIFT v0.5.6.0] v0.5.5.9 is required.");
  return;
}

const view = {
  filter: "all",
  sort: "power",
  tooltipItemId: null,
  modalItemId: null,
  modalSource: null,
  suppressClickUntil: 0
};

const imageCache = new Map();
let animationRequest = 0;
let currentAnimationSource = "";
let currentAnimationImage = null;
let currentAnimationFrames = 4;
let currentAnimationFps = 3;

let dragCandidate = null;
let activeDrag = null;

function ensureCss() {
  if (id("v0560css")) return;
  const link = document.createElement("link");
  link.id = "v0560css";
  link.rel = "stylesheet";
  link.href = "v0560.css?v=0560";
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemPower(item) {
  return window.CHERRIFT_V050?.itemPower?.(item) ??
    Math.round(
      Object.values(item?.stats || {})
        .reduce((sum, value) => sum + Number(value || 0), 0)
    );
}

function gearEmoji(item) {
  return item ? (UI.gearEmoji?.(item) || "⚙") : "＋";
}

function rarityClass(item) {
  return `rarity-${String(item?.rarity || "Common").toLowerCase()}`;
}

function starsFor(item) {
  const count = Math.max(1, (RARITY_ORDER[item?.rarity] || 0) + 1);
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function prettyStat(key) {
  return STAT_LABELS[key] || key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, letter => letter.toUpperCase());
}

function statValue(key, value) {
  const number = Math.round(Number(value || 0) * 10) / 10;
  if (["crit", "critDamage", "attackSpeed", "moveSpeed"].includes(key)) {
    return `+${number}%`;
  }
  return `+${number}`;
}

function currentSkinData() {
  return CHERRIFT_DATA.skins.find(skin => skin.id === UI.save?.selectedSkin) ||
    CHERRIFT_DATA.skins[0];
}

function currentSkinConfig() {
  const selected = UI.save?.selectedSkin || CHERRIFT_CONFIG.player.defaultSkin;
  return CHERRIFT_CONFIG.player.skins?.[selected] ||
    CHERRIFT_CONFIG.player.skins?.[CHERRIFT_CONFIG.player.defaultSkin];
}

function inventoryItemById(itemId) {
  return UI.save?.inventory?.find(item => item.id === itemId) || null;
}

function equippedItemById(itemId) {
  return Object.values(UI.save?.equipped || {})
    .find(item => item?.id === itemId) || null;
}

function anyItemById(itemId) {
  return inventoryItemById(itemId) || equippedItemById(itemId);
}

function sourceForItem(item) {
  return UI.save?.inventory?.some(entry => entry.id === item?.id)
    ? "inventory"
    : "equipped";
}

function totalPower() {
  return 100 + Object.values(UI.save?.equipped || {})
    .filter(Boolean)
    .reduce((sum, item) => sum + itemPower(item), 0);
}

function ensureLayout() {
  const panel = id("gear");
  if (!panel || id("gearV0560")) return;

  panel.classList.add("gear-v0560-enabled");

  const shell = document.createElement("div");
  shell.id = "gearV0560";
  shell.className = "gear-v0560";

  shell.innerHTML = `
    <aside class="gear-rail-v0560">
      <button type="button" class="gear-brand-v0560" data-v0560-open="menu">
        <span>CHERRIFT</span><small>GEAR & LOADOUT</small>
      </button>

      <nav class="gear-rail-nav-v0560" aria-label="Gear navigation">
        <button type="button" class="active">
          <span>⚔</span><b>Gear</b>
        </button>
        <button type="button" data-v0560-open="playerUpgrade">
          <span>✦</span><b>Skills</b>
        </button>
        <button type="button" data-v0560-open="skins">
          <span>🐰</span><b>Cherry</b>
        </button>
        <button type="button" disabled>
          <span>❖</span><b>Artifacts</b><i>Later</i>
        </button>
        <button type="button" data-v0560-open="skins">
          <span>♙</span><b>Costume</b>
        </button>
        <button type="button" data-v0560-library="profile">
          <span>▣</span><b>Profile</b>
        </button>
      </nav>

      <div class="gear-rail-bottom-v0560">
        <div class="gear-drag-help-v0560">
          <span>🐰</span>
          <b>Drag & Drop</b>
          <p>Húzd az itemet a világító, megfelelő slotra.</p>
        </div>
        <button type="button" class="gear-back-menu-v0560" data-v0560-open="menu">
          ← Main Menu
        </button>
      </div>
    </aside>

    <main class="gear-main-v0560">
      <header class="gear-header-v0560">
        <button type="button" class="gear-mobile-back-v0560" data-v0560-open="menu">←</button>
        <div class="gear-heading-v0560">
          <h1>Gear</h1>
          <p>Equip, upgrade and customize your Cherry.</p>
        </div>

        <div class="gear-summary-v0560">
          <div class="power"><small>POWER</small><b id="gearPowerV0560">100</b></div>
          <div><small>HP</small><b id="gearHpV0560">100</b></div>
          <div><small>ATK</small><b id="gearAtkV0560">20</b></div>
        </div>

        <button type="button" class="gear-change-skin-v0560" data-v0560-open="skins">
          🐰 <span>Change Skin</span>
        </button>
      </header>

      <section class="gear-loadout-v0560">
        <div class="gear-loadout-title-v0560">
          <div>
            <small>CURRENT LOADOUT</small>
            <h2 id="gearSkinNameV0560">Cherry</h2>
          </div>
          <span id="gearEquippedCountV0560">0 / 7 equipped</span>
        </div>

        <div id="gearStageV0560" class="gear-stage-v0560">
          <div class="gear-stage-rune-v0560"></div>
          <div class="gear-character-glow-v0560"></div>
          <canvas id="gearCherryCanvasV0560" width="320" height="320" aria-label="Selected Cherry idle animation"></canvas>
          <div class="gear-character-floor-v0560"></div>

          ${SLOT_ORDER.map(slot => `
            <button
              type="button"
              class="gear-slot-v0560 slot-${slot.toLowerCase()}"
              data-v0560-slot="${slot}"
              aria-label="${slot} slot">
            </button>
          `).join("")}

          <div class="gear-drop-message-v0560" id="gearDropMessageV0560">
            Húzz egy itemet a megfelelő slotra
          </div>
        </div>
      </section>

      <section id="gearInventoryZoneV0560" class="gear-inventory-v0560">
        <header class="gear-inventory-head-v0560">
          <div>
            <small>INVENTORY</small>
            <h2>Equipment Collection</h2>
          </div>

          <div class="gear-inventory-tools-v0560">
            <button type="button" id="gearSortV0560" data-sort="power">
              Power ↓
            </button>
            <span id="gearInventoryCountV0560">0 / 80</span>
          </div>
        </header>

        <nav id="gearFiltersV0560" class="gear-filters-v0560">
          <button type="button" data-v0560-filter="all" class="active">All</button>
          ${SLOT_ORDER.map(slot =>
            `<button type="button" data-v0560-filter="${slot}">${SLOT_ICONS[slot]} ${slot}</button>`
          ).join("")}
        </nav>

        <div id="gearInventoryGridV0560" class="gear-inventory-grid-v0560"></div>
      </section>
    </main>
  `;

  panel.appendChild(shell);

  const tooltip = document.createElement("div");
  tooltip.id = "gearTooltipV0560";
  tooltip.className = "gear-tooltip-v0560 hidden";
  tooltip.setAttribute("role", "tooltip");
  id("app").appendChild(tooltip);

  const modal = document.createElement("section");
  modal.id = "gearModalV0560";
  modal.className = "gear-modal-v0560 hidden";
  modal.innerHTML = `
    <button type="button" class="gear-modal-backdrop-v0560" aria-label="Close item details"></button>
    <article class="gear-modal-card-v0560">
      <button type="button" class="gear-modal-close-v0560" aria-label="Close">×</button>
      <div id="gearModalBodyV0560"></div>
    </article>`;
  id("app").appendChild(modal);

  bindStaticEvents();
  startAnimationLoop();
}

function bindStaticEvents() {
  document.addEventListener("click", event => {
    const openButton = event.target.closest("[data-v0560-open]");
    if (openButton) {
      event.preventDefault();
      UI.open(openButton.dataset.v0560Open);
      return;
    }

    const libraryButton = event.target.closest("[data-v0560-library]");
    if (libraryButton) {
      event.preventDefault();
      UI.open("libraryV0551");
      setTimeout(() => {
        window.CHERRIFT_V0551?.renderLibrary?.(
          libraryButton.dataset.v0560Library || "profile"
        );
      }, 0);
    }
  }, true);

  qa("[data-v0560-filter]").forEach(button => {
    button.onclick = () => {
      view.filter = button.dataset.v0560Filter;
      renderInventory();
    };
  });

  const sortButton = id("gearSortV0560");
  if (sortButton) {
    sortButton.onclick = () => {
      const next = view.sort === "power"
        ? "rarity"
        : view.sort === "rarity"
          ? "level"
          : "power";
      view.sort = next;
      sortButton.dataset.sort = next;
      sortButton.textContent =
        next === "power" ? "Power ↓" :
        next === "rarity" ? "Rarity ↓" :
        "Level ↓";
      renderInventory();
    };
  }

  q(".gear-modal-backdrop-v0560")?.addEventListener("click", closeModal);
  q(".gear-modal-close-v0560")?.addEventListener("click", closeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      hideTooltip();
      closeModal();
    }
  });

  document.addEventListener("pointermove", handlePointerMove, { passive:false });
  document.addEventListener("pointerup", handlePointerUp, { passive:false });
  document.addEventListener("pointercancel", cancelPointerDrag, { passive:false });
}

function loadImage(source) {
  if (!source) return null;
  if (imageCache.has(source)) return imageCache.get(source);

  const image = new Image();
  image.decoding = "async";
  image.src = source;
  imageCache.set(source, image);
  return image;
}

function updateSkinAnimation() {
  const config = currentSkinConfig();
  const idle = config?.states?.idle;
  const source = idle?.dirs?.down;

  currentAnimationFrames = Math.max(1, Number(idle?.frames) || 4);
  currentAnimationFps = Math.max(1, Number(idle?.fps) || 3);

  if (source !== currentAnimationSource) {
    currentAnimationSource = source || "";
    currentAnimationImage = loadImage(source);
  }
}

function startAnimationLoop() {
  if (animationRequest) return;

  const loop = timestamp => {
    animationRequest = requestAnimationFrame(loop);

    const panel = id("gear");
    const canvas = id("gearCherryCanvasV0560");
    if (!canvas || !panel || panel.classList.contains("hidden")) return;

    updateSkinAnimation();

    const image = currentAnimationImage;
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;

    const cssWidth = Math.max(1, canvas.clientWidth);
    const cssHeight = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.round(cssWidth * dpr);
    const targetHeight = Math.round(cssHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const sourceWidth = image.naturalWidth / currentAnimationFrames;
    const sourceHeight = image.naturalHeight;
    const frame = Math.floor(
      timestamp / 1000 * currentAnimationFps
    ) % currentAnimationFrames;

    context.drawImage(
      image,
      frame * sourceWidth,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      cssWidth,
      cssHeight
    );
  };

  animationRequest = requestAnimationFrame(loop);
}

function slotMarkup(slot, item) {
  if (!item) {
    return `
      <span class="gear-slot-icon-v0560">${SLOT_ICONS[slot] || "＋"}</span>
      <b>${slot}</b>
      <small>EMPTY</small>`;
  }

  return `
    <i class="gear-slot-lock-v0560">${item.locked ? "🔒" : ""}</i>
    <span class="gear-slot-icon-v0560">${gearEmoji(item)}</span>
    <b>${slot}</b>
    <small>Lv.${item.itemLevel || 1} · ${itemPower(item)}</small>`;
}

function itemCardMarkup(item) {
  return `
    ${item.locked ? '<i class="gear-item-lock-v0560">🔒</i>' : ""}
    <span class="gear-item-icon-v0560">${gearEmoji(item)}</span>
    <b>Lv.${item.itemLevel || 1}</b>
    <small>${itemPower(item)}</small>
    <em>${starsFor(item)}</em>`;
}

function bindItemElement(element, item, source) {
  element.draggable = false;
  element.dataset.v0560ItemId = item.id;
  element.dataset.v0560Source = source;

  element.addEventListener("click", event => {
    if (Date.now() < view.suppressClickUntil) {
      event.preventDefault();
      return;
    }
    openModal(item, source);
  });

  element.addEventListener("mouseenter", event => {
    if (hasHover()) showTooltip(item, source, event.clientX, event.clientY);
  });

  element.addEventListener("mousemove", event => {
    if (hasHover()) positionTooltip(event.clientX, event.clientY);
  });

  element.addEventListener("mouseleave", () => {
    if (hasHover()) hideTooltip();
  });

  element.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;

    dragCandidate = {
      item,
      source,
      element,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      timer: null
    };

    if (event.pointerType !== "mouse") {
      dragCandidate.timer = setTimeout(() => {
        if (dragCandidate?.pointerId === event.pointerId) {
          beginPointerDrag(dragCandidate);
        }
      }, 220);
    }
  });
}

function renderSlots() {
  const save = UI.save;
  if (!save) return;

  qa("[data-v0560-slot]").forEach(button => {
    const slot = button.dataset.v0560Slot;
    const item = save.equipped?.[slot];

    button.className =
      `gear-slot-v0560 slot-${slot.toLowerCase()} ` +
      `${item ? rarityClass(item) : "empty"}`;
    button.innerHTML = slotMarkup(slot, item);

    const replacement = button.cloneNode(true);
    button.replaceWith(replacement);

    if (item) {
      bindItemElement(replacement, item, "equipped");
    } else {
      replacement.onclick = () => {
        view.filter = slot;
        renderInventory();
        id("gearInventoryZoneV0560")?.scrollIntoView({
          behavior:"smooth",
          block:"nearest"
        });
      };
    }
  });

  const equippedCount = Object.values(save.equipped || {}).filter(Boolean).length;
  const count = id("gearEquippedCountV0560");
  if (count) count.textContent = `${equippedCount} / 7 equipped`;
}

function visibleInventory() {
  const inventory = [...(UI.save?.inventory || [])];

  const filtered = view.filter === "all"
    ? inventory
    : inventory.filter(item => item.slot === view.filter);

  filtered.sort((a, b) => {
    if (view.sort === "rarity") {
      return (RARITY_ORDER[b.rarity] || 0) -
        (RARITY_ORDER[a.rarity] || 0) ||
        itemPower(b) - itemPower(a);
    }
    if (view.sort === "level") {
      return (b.itemLevel || 1) - (a.itemLevel || 1) ||
        itemPower(b) - itemPower(a);
    }
    return itemPower(b) - itemPower(a);
  });

  return filtered;
}

function renderInventory() {
  const grid = id("gearInventoryGridV0560");
  if (!grid || !UI.save) return;

  qa("[data-v0560-filter]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.v0560Filter === view.filter
    );
  });

  const inventory = visibleInventory();
  const total = UI.save.inventory?.length || 0;
  const count = id("gearInventoryCountV0560");
  if (count) count.textContent = `${total} / 80`;

  grid.innerHTML = "";

  if (!inventory.length) {
    grid.innerHTML = `
      <div class="gear-inventory-empty-v0560">
        Nincs ${view.filter === "all" ? "" : escapeHtml(view.filter)} item ebben a listában.
      </div>`;
    return;
  }

  inventory.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `gear-item-v0560 ${rarityClass(item)}`;
    button.innerHTML = itemCardMarkup(item);
    bindItemElement(button, item, "inventory");
    grid.appendChild(button);
  });
}

function renderSummary() {
  const save = UI.save;
  if (!save) return;

  const stats = UI.totalGearStats?.(save) || {};
  const skin = currentSkinData();

  if (id("gearPowerV0560")) {
    id("gearPowerV0560").textContent = Math.round(totalPower());
  }
  if (id("gearHpV0560")) {
    id("gearHpV0560").textContent = Math.round(100 + (stats.maxHp || 0));
  }
  if (id("gearAtkV0560")) {
    id("gearAtkV0560").textContent = Math.round(20 + (stats.damage || 0));
  }
  if (id("gearSkinNameV0560")) {
    id("gearSkinNameV0560").textContent = skin?.name || "Cherry";
  }

  updateSkinAnimation();
}

function renderGear() {
  ensureLayout();
  renderSummary();
  renderSlots();
  renderInventory();
}

function statsMarkup(item) {
  const entries = Object.entries(item?.stats || {});
  if (!entries.length) return `<p class="gear-no-stats-v0560">No stat bonuses.</p>`;

  return entries.map(([key, value]) => `
    <div class="gear-stat-row-v0560">
      <span>${escapeHtml(prettyStat(key))}</span>
      <b>${escapeHtml(statValue(key, value))}</b>
    </div>`
  ).join("");
}

function compareMarkup(item) {
  const equipped = UI.save?.equipped?.[item.slot];
  if (!equipped || equipped.id === item.id) return "";

  const keys = [...new Set([
    ...Object.keys(item.stats || {}),
    ...Object.keys(equipped.stats || {})
  ])];

  return `
    <div class="gear-compare-v0560">
      <h4>Compared to equipped</h4>
      ${keys.map(key => {
        const delta =
          Number(item.stats?.[key] || 0) -
          Number(equipped.stats?.[key] || 0);
        const className = delta > 0 ? "good" : delta < 0 ? "bad" : "";
        const value = Math.round(delta * 10) / 10;
        return `
          <div>
            <span>${escapeHtml(prettyStat(key))}</span>
            <b class="${className}">${value > 0 ? "+" : ""}${value}</b>
          </div>`;
      }).join("")}
    </div>`;
}

function itemDetailsMarkup(item, source, withActions) {
  const rarity = escapeHtml(item.rarity || "Common");
  const type = escapeHtml(item.type || "");
  const slot = escapeHtml(item.slot || "");
  const actions = !withActions ? "" : `
    <div class="gear-detail-actions-v0560">
      ${source === "inventory"
        ? '<button type="button" data-v0560-action="equip">Equip</button>'
        : '<button type="button" data-v0560-action="unequip">Unequip</button>'}
      ${source === "inventory"
        ? `<button type="button" class="danger" data-v0560-action="sell" ${item.locked ? "disabled" : ""}>Sell</button>`
        : ""}
      <button type="button" data-v0560-action="lock">
        ${item.locked ? "Unlock" : "Lock"}
      </button>
    </div>`;

  return `
    <header class="gear-detail-head-v0560">
      <div class="gear-detail-icon-v0560 ${rarityClass(item)}">
        ${gearEmoji(item)}
      </div>
      <div>
        <small>${rarity} ${slot}</small>
        <h3>${rarity} ${type} ${slot}</h3>
        <p>Lv.${item.itemLevel || 1} · Power ${itemPower(item)}</p>
        <em>${starsFor(item)}</em>
      </div>
    </header>

    <div class="gear-detail-stats-v0560">
      ${statsMarkup(item)}
    </div>

    ${source === "inventory" ? compareMarkup(item) : ""}
    ${actions}`;
}

function showTooltip(item, source, x, y) {
  const tooltip = id("gearTooltipV0560");
  if (!tooltip || !hasHover()) return;

  view.tooltipItemId = item.id;
  tooltip.innerHTML = itemDetailsMarkup(item, source, false);
  tooltip.classList.remove("hidden");
  positionTooltip(x, y);
}

function positionTooltip(x, y) {
  const tooltip = id("gearTooltipV0560");
  if (!tooltip || tooltip.classList.contains("hidden")) return;

  const margin = 18;
  const width = tooltip.offsetWidth || 320;
  const height = tooltip.offsetHeight || 340;

  let left = x + 20;
  let top = y + 18;

  if (left + width + margin > innerWidth) left = x - width - 20;
  if (top + height + margin > innerHeight) top = innerHeight - height - margin;

  tooltip.style.left = `${Math.max(margin, left)}px`;
  tooltip.style.top = `${Math.max(margin, top)}px`;
}

function hideTooltip() {
  const tooltip = id("gearTooltipV0560");
  view.tooltipItemId = null;
  tooltip?.classList.add("hidden");
}

function openModal(item, source) {
  const modal = id("gearModalV0560");
  const body = id("gearModalBodyV0560");
  if (!modal || !body || !item) return;

  hideTooltip();
  view.modalItemId = item.id;
  view.modalSource = source;

  body.innerHTML = itemDetailsMarkup(item, source, true);

  qa("[data-v0560-action]", body).forEach(button => {
    button.onclick = () => {
      const action = button.dataset.v0560Action;

      if (action === "equip") {
        UI.equipGear(item.id);
        closeModal();
      }

      if (action === "unequip") {
        UI.unequipGear(item.slot);
        closeModal();
      }

      if (action === "sell") {
        UI.sellGear(item.id);
        closeModal();
      }

      if (action === "lock") {
        UI.toggleGearLockV050?.(item.id);
        setTimeout(() => {
          const refreshed = anyItemById(item.id);
          if (refreshed) openModal(refreshed, sourceForItem(refreshed));
          else closeModal();
        }, 0);
      }
    };
  });

  modal.classList.remove("hidden");
}

function closeModal() {
  view.modalItemId = null;
  view.modalSource = null;
  id("gearModalV0560")?.classList.add("hidden");
}

function beginPointerDrag(candidate) {
  if (!candidate || activeDrag) return;

  clearTimeout(candidate.timer);
  activeDrag = {
    ...candidate,
    started: true
  };
  dragCandidate = null;
  hideTooltip();
  closeModal();

  const ghost = document.createElement("div");
  ghost.id = "gearDragGhostV0560";
  ghost.className = `gear-drag-ghost-v0560 ${rarityClass(candidate.item)}`;
  ghost.innerHTML = `
    <span>${gearEmoji(candidate.item)}</span>
    <b>${candidate.item.slot}</b>`;
  document.body.appendChild(ghost);
  activeDrag.ghost = ghost;

  document.body.classList.add("gear-dragging-v0560");
  candidate.element.classList.add("dragging-v0560");

  qa("[data-v0560-slot]").forEach(slot => {
    const matching = slot.dataset.v0560Slot === candidate.item.slot;
    slot.classList.toggle("drag-compatible-v0560", matching);
    slot.classList.toggle("drag-incompatible-v0560", !matching);
  });

  if (candidate.source === "equipped") {
    id("gearInventoryZoneV0560")?.classList.add("unequip-target-v0560");
  }

  moveDragGhost(candidate.latestX, candidate.latestY);
  updateDragTarget(candidate.latestX, candidate.latestY);
}

function moveDragGhost(x, y) {
  if (!activeDrag?.ghost) return;
  activeDrag.ghost.style.transform =
    `translate3d(${x + 16}px,${y + 16}px,0)`;
}

function updateDragTarget(x, y) {
  if (!activeDrag) return;

  qa("[data-v0560-slot]").forEach(slot => {
    slot.classList.remove("drop-over-v0560", "bad-drop-v0560");
  });

  const target = document.elementFromPoint(x, y);
  const slot = target?.closest?.("[data-v0560-slot]");

  if (slot) {
    const matching = slot.dataset.v0560Slot === activeDrag.item.slot;
    slot.classList.add(matching ? "drop-over-v0560" : "bad-drop-v0560");

    const message = id("gearDropMessageV0560");
    if (message) {
      message.textContent = matching
        ? `Drop: ${activeDrag.item.slot}`
        : `${activeDrag.item.slot} item nem rakható ${slot.dataset.v0560Slot} slotra`;
    }
  }
}

function handlePointerMove(event) {
  if (activeDrag && event.pointerId === activeDrag.pointerId) {
    event.preventDefault();
    moveDragGhost(event.clientX, event.clientY);
    updateDragTarget(event.clientX, event.clientY);
    return;
  }

  if (!dragCandidate || event.pointerId !== dragCandidate.pointerId) return;

  dragCandidate.latestX = event.clientX;
  dragCandidate.latestY = event.clientY;

  const distance = Math.hypot(
    event.clientX - dragCandidate.startX,
    event.clientY - dragCandidate.startY
  );

  if (dragCandidate.pointerType === "mouse" && distance > 6) {
    beginPointerDrag(dragCandidate);
    event.preventDefault();
    return;
  }

  if (dragCandidate.pointerType !== "mouse" && distance > 12) {
    clearTimeout(dragCandidate.timer);
    dragCandidate = null;
  }
}

function handlePointerUp(event) {
  if (activeDrag && event.pointerId === activeDrag.pointerId) {
    event.preventDefault();

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slot = target?.closest?.("[data-v0560-slot]");
    const inventoryZone = target?.closest?.("#gearInventoryZoneV0560");

    if (
      activeDrag.source === "inventory" &&
      slot &&
      slot.dataset.v0560Slot === activeDrag.item.slot
    ) {
      UI.equipGear(activeDrag.item.id);
      UI.toast?.(`${activeDrag.item.slot} equipped`);
    } else if (
      activeDrag.source === "equipped" &&
      inventoryZone
    ) {
      UI.unequipGear(activeDrag.item.slot);
      UI.toast?.(`${activeDrag.item.slot} moved to inventory`);
    } else if (slot) {
      UI.toast?.(
        `${activeDrag.item.slot} item nem rakható ${slot.dataset.v0560Slot} slotra`
      );
    }

    view.suppressClickUntil = Date.now() + 450;
    cleanupDrag();
    return;
  }

  if (dragCandidate && event.pointerId === dragCandidate.pointerId) {
    clearTimeout(dragCandidate.timer);
    dragCandidate = null;
  }
}

function cancelPointerDrag(event) {
  if (dragCandidate && event.pointerId === dragCandidate.pointerId) {
    clearTimeout(dragCandidate.timer);
    dragCandidate = null;
  }
  if (activeDrag && event.pointerId === activeDrag.pointerId) {
    cleanupDrag();
  }
}

function cleanupDrag() {
  activeDrag?.element?.classList.remove("dragging-v0560");
  activeDrag?.ghost?.remove();

  qa("[data-v0560-slot]").forEach(slot => {
    slot.classList.remove(
      "drag-compatible-v0560",
      "drag-incompatible-v0560",
      "drop-over-v0560",
      "bad-drop-v0560"
    );
  });

  id("gearInventoryZoneV0560")?.classList.remove("unequip-target-v0560");
  document.body.classList.remove("gear-dragging-v0560");

  const message = id("gearDropMessageV0560");
  if (message) message.textContent = "Húzz egy itemet a megfelelő slotra";

  activeDrag = null;
  dragCandidate = null;
  renderGear();
}

ensureCss();
ensureLayout();

const previousRenderGear = UI.renderGear.bind(UI);
UI.renderGear = function renderGearV0560(...args) {
  const result = previousRenderGear(...args);
  renderGear();
  return result;
};

const previousOpen = UI.open.bind(UI);
UI.open = function openV0560(panel, ...args) {
  const result = previousOpen(panel, ...args);
  if (panel === "gear") {
    setTimeout(renderGear, 0);
  } else {
    hideTooltip();
    closeModal();
  }
  return result;
};

const previousRefreshMenu = UI.refreshMenu?.bind(UI);
if (previousRefreshMenu) {
  UI.refreshMenu = function refreshMenuV0560(...args) {
    const result = previousRefreshMenu(...args);
    if (!id("gear")?.classList.contains("hidden")) {
      setTimeout(renderGear, 0);
    }
    return result;
  };
}

window.addEventListener("resize", () => {
  hideTooltip();
  if (!id("gear")?.classList.contains("hidden")) {
    renderGear();
  }
});

window.CHERRIFT_V0560 = {
  version: VERSION,
  render: renderGear
};

console.info("[CHERRIFT] v0.5.6.0 Gear redesign loaded.");
})();