/* Rift Gallery: PC presentation over the native Collection catalogue.
   Ownership, discoveries, inventory and native preview handlers stay native. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_COLLECTION) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const reduced = () => !!window.UI?.save?.settings?.reducedMotion || matchMedia('(prefers-reduced-motion:reduce)').matches;
  const tabs = ['skins', 'gear', 'enemies', 'worlds'];
  const state = { started: false, active: false, queued: false, tab: '', selected: {}, filter: 'all', rarity: 'all', attrs: new Map(), entries: [], pass: false, modal: false, signature: '', returnFocus: null, scroll: {}, list: null, animations: new Set() };
  function visible(n) {
    if (!n) return false;
    for (let p = n; p; p = p.parentElement) {
      if (p.hidden || p.classList.contains('hidden')) return false;
      const style = getComputedStyle(p);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }
  const text = (n, value) => { if (n && n.textContent !== String(value)) n.textContent = value; };
  function own(tag, cls, parent) {
    const n = document.createElement(tag); n.className = cls; n.dataset.rgOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n;
  }
  function attr(n, key, value) {
    if (!n) return;
    if (!state.attrs.has(n)) state.attrs.set(n, new Map());
    const before = state.attrs.get(n); if (!before.has(key)) before.set(key, n.getAttribute(key));
    if (value === null) { if (n.hasAttribute(key)) n.removeAttribute(key); }
    else if (n.getAttribute(key) !== String(value)) n.setAttribute(key, String(value));
  }
  function restoreAttrs(n, values) { for (const [key, value] of values) { if (value === null) n.removeAttribute(key); else n.setAttribute(key, value); } }
  function animate(n) {
    if (!n || reduced()) return;
    const a = n.animate?.([{ opacity: .2, transform: 'translate3d(14px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 260, easing: 'ease-out' });
    if (a) { state.animations.add(a); a.finished?.catch(() => {}).finally(() => state.animations.delete(a)); }
  }
  function restore() {
    state.animations.forEach(a => a.cancel()); state.animations.clear();
    qa('[data-rg-owned]').forEach(n => n.remove());
    for (const [n, values] of state.attrs) restoreAttrs(n, values);
    state.attrs.clear(); state.active = false; state.tab = ''; state.filter = 'all'; state.rarity = 'all'; state.entries = []; state.signature = ''; state.modal = false; state.returnFocus = null; state.list = null; state.selected = {}; state.scroll = {};
    document.body.classList.remove('rift-gallery');
  }
  function label(tab) { return ({ skins: copy('CHERRY', 'CHERRY'), gear: copy('FELSZERELÉS', 'GEAR'), enemies: copy('ELLENFELEK', 'ENEMIES'), worlds: copy('VILÁGOK', 'WORLDS') })[tab]; }
  function chrome(root) {
    let bar = q('.rg-chrome', root);
    if (!bar) {
      own('div', 'rg-scenery', root).setAttribute('aria-hidden', 'true');
      bar = own('header', 'rg-chrome', root);
      bar.innerHTML = '<img src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div><small>COLLECTION · RIFT GALLERY</small><h1></h1></div><button type="button" data-rg-back></button>';
      const filters = own('nav', 'rg-filters', root);
      for (const key of ['all', 'owned', 'locked']) { const b = document.createElement('button'); b.type = 'button'; b.dataset.rgFilter = key; filters.append(b); }
      const rarityLabel = document.createElement('label'); rarityLabel.innerHTML = '<span class="rg-sr-only"></span><select data-rg-rarity></select>'; filters.append(rarityLabel);
      const progress = own('section', 'rg-progress', root); progress.innerHTML = '<div><span></span><b></b></div><progress></progress>';
      const hint = own('p', 'rg-empty', root); hint.setAttribute('role', 'status');
      const detail = own('aside', 'rg-showcase', root); detail.setAttribute('aria-label', copy('Gyűjtemény részletei', 'Collection details'));
    }
    text(q('h1', bar), copy('GYŰJTEMÉNY', 'COLLECTION')); text(q('[data-rg-back]', bar), copy('‹ FŐMENÜ', '‹ LOBBY'));
    for (const [key, hu, en] of [['all', 'ÖSSZES', 'ALL'], ['owned', state.tab === 'worlds' ? 'TELJESÍTVE' : 'MEGSZERZETT', state.tab === 'worlds' ? 'COMPLETE' : 'COLLECTED'], ['locked', state.tab === 'worlds' ? 'FOLYAMATBAN' : 'ZÁROLT', state.tab === 'worlds' ? 'IN PROGRESS' : 'LOCKED']]) {
      const b = q(`[data-rg-filter=${key}]`, root); text(b, copy(hu, en)); b.setAttribute('aria-pressed', String(state.filter === key));
    }
    q('.rg-filters', root).setAttribute('aria-label', copy('Gyűjteményszűrők', 'Collection filters'));
    text(q('.rg-sr-only', root), copy('Ritkaság', 'Rarity'));
    const select = q('[data-rg-rarity]', root), options = ['all', ...new Set(state.entries.map(e => e.rarity).filter(Boolean))];
    const signature = JSON.stringify([options, copy('MINDEN RITKASÁG', 'ALL RARITIES')]);
    if (select.dataset.signature !== signature) {
      select.replaceChildren(...options.map(value => { const o = document.createElement('option'); o.value = value; o.textContent = value === 'all' ? copy('MINDEN RITKASÁG', 'ALL RARITIES') : value; return o; })); select.dataset.signature = signature;
    }
    if (!options.includes(state.rarity)) state.rarity = 'all';
    select.value = state.rarity; select.parentElement.hidden = !['skins', 'gear'].includes(state.tab);
    text(q('.rg-progress span', root), label(state.tab));
    const owned = state.entries.filter(e => e.owned).length;
    text(q('.rg-progress b', root), `${owned} / ${state.entries.length}`);
    const meter = q('.rg-progress progress', root); meter.max = Math.max(1, state.entries.length); meter.value = owned; meter.setAttribute('aria-label', copy('Gyűjtemény állapota', 'Collection progress'));
    for (const tab of tabs) {
      const b = q(`[data-library-tab=${tab}]`, root); attr(b, 'aria-current', state.tab === tab ? 'page' : null); attr(b, 'aria-label', label(tab));
      if (b && !q('.rg-nav-icon', b)) {
        const icon = own('i', 'rg-nav-icon', b); icon.setAttribute('aria-hidden', 'true');
        const paths = { skins: '<path d="M7 12C3 1 8 0 10 11M14 11C16 0 21 1 17 12M5 15c0-7 14-7 14 0s-14 9-14 0Z"/><path d="M9 15h.1M15 15h.1M11 18h2"/>', gear: '<path d="m12 2 3 3-1 10 5 2-2 2-4-3-4 6-2-2 4-5-6-1 1-3 6 2Z"/>', enemies: '<path d="m4 3 4 5 4-2 4 2 4-5-2 12-6 7-6-7Z"/><path d="m7 12 3 2m7-2-3 2m-4 4h4"/>', worlds: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>' };
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${paths[tab]}</svg>`;
      }
      let caption = q('.rg-tab-label', b); if (!caption && b) caption = own('em', 'rg-tab-label', b); text(caption, label(tab));
    }
    text(q('.rg-empty', root), state.entries.length ? copy('Nincs a szűrésnek megfelelő bejegyzés.', 'No entries match these filters.') : copy('Ebben a kategóriában még nincs gyűjteményed.', 'Your collection in this category is empty.'));
  }
  function entries(root) {
    const save = window.UI?.save || {}, skins = window.CHERRIFT_DATA?.skins || [];
    const enemies = Object.entries({ ...(window.CHERRIFT_V040?.enemies || {}), ...(window.CHERRIFT_FIXPACK_095?.enemyDefs || {}) });
    const stages = window.CHERRIFT_V040?.stages || [], worlds = [...new Set(stages.map(s => s.world))];
    const gear = [...(save.inventory || []), ...Object.values(save.equipped || {}).filter(Boolean)];
    return qa('#libraryBodyV0551 .collection-card-v084', root).map((card, index) => {
      const entry = { card, key: `${state.tab}:${index}`, title: q('b', card)?.textContent || '', subtitle: q('small', card)?.textContent || '', owned: !card.disabled && !card.classList.contains('locked'), selectable: !card.disabled, rarity: '', source: '', data: null };
      if (state.tab === 'skins') {
        const skin = skins[index]; entry.data = skin; entry.rarity = entry.owned ? skin?.rarity || '' : '';
        entry.key = `skins:${skin?.id || index}`;
        if (entry.owned && skin) entry.source = window.CHERRIFT_SKIN_UI?.assetsForSkin?.(skin)?.splash || skin.splash || skin.icon || '';
      } else if (state.tab === 'enemies') {
        entry.data = enemies[index]?.[1]; entry.key = `enemies:${enemies[index]?.[0] || index}`;
      } else if (state.tab === 'gear') {
        entry.data = gear[index]; entry.rarity = entry.data?.rarity || '';
      } else if (state.tab === 'worlds') {
        entry.data = stages.filter(s => s.world === worlds[index]);
        entry.owned = entry.data.length > 0 && entry.data.every(s => save.clearedStages?.[s.id]);
      }
      return entry;
    });
  }
  function decorate(root) {
    let matched = 0;
    for (const e of state.entries) {
      e.match = (state.filter === 'all' || (state.filter === 'owned' ? e.owned : !e.owned)) && (state.rarity === 'all' || e.rarity === state.rarity);
      attr(e.card, 'hidden', e.match ? null : ''); if (e.match) matched++;
      attr(e.card, 'data-rg-key', e.key);
      if (e.card.tagName !== 'BUTTON') { attr(e.card, 'tabindex', '0'); attr(e.card, 'role', 'button'); }
      attr(e.card, 'aria-pressed', String(state.selected[state.tab] === e.key));
      if (!q('.rg-status', e.card)) { const badge = own('span', 'rg-status', e.card); badge.setAttribute('aria-hidden', 'true'); }
      text(q('.rg-status', e.card), e.owned ? '✓' : '◇');
      if (e.source && !q('.rg-card-art', e.card)) { const image = own('img', 'rg-card-art', e.card); image.src = e.source; image.alt = ''; image.draggable = false; image.loading = 'lazy'; image.decoding = 'async'; }
      if (!e.selectable && !q('.rg-lock', e.card)) { const lock = own('span', 'rg-lock', e.card); lock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M12 14v4"/></svg>'; lock.setAttribute('aria-hidden', 'true'); }
    }
    q('.rg-empty', root).hidden = matched > 0;
    const list = q('#libraryBodyV0551', root);
    if (list !== state.list) { state.list = list; if (list) list.scrollTop = state.scroll[state.tab] || 0; }
  }
  function showcase(root) {
    const selected = state.entries.find(e => e.key === state.selected[state.tab] && e.match && e.selectable) || state.entries.find(e => e.match && e.selectable);
    state.selected[state.tab] = selected?.key || '';
    for (const e of state.entries) attr(e.card, 'aria-pressed', String(e.key === state.selected[state.tab]));
    const side = q('.rg-showcase', root);
    const signature = JSON.stringify([state.tab, selected?.key, selected?.title, selected?.subtitle, selected?.source, selected?.data, copy('hu', 'en')]);
    if (state.signature === signature) return;
    state.signature = signature; side.replaceChildren();
    if (!selected) {
      const emblem = document.createElement('div'); emblem.className = 'rg-placeholder'; emblem.textContent = '✧';
      const title = document.createElement('h2'); title.textContent = copy('A következő felfedezésed', 'Your next discovery');
      const hint = document.createElement('p'); hint.textContent = copy('A megszerzett és felfedezett bejegyzések részletei itt jelennek meg.', 'Details of collected and discovered entries appear here.'); side.append(emblem, title, hint); return;
    }
    const art = document.createElement('div'); art.className = 'rg-hero';
    if (selected.source) {
      const image = document.createElement('img');
      const cutout = state.tab === 'skins' ? window.CHERRIFT_SKIN_UI?.assetsForSkin?.(selected.data)?.cutout : null;
      image.src = cutout || selected.source; image.alt = selected.title; image.draggable = false; image.className = cutout ? 'rg-cutout' : 'rg-splash'; art.append(image);
    } else {
      const nativeArt = q('canvas,span', selected.card);
      if (nativeArt?.tagName === 'CANVAS') {
        const canvas = document.createElement('canvas'); canvas.width = nativeArt.width; canvas.height = nativeArt.height;
        try { canvas.getContext('2d')?.drawImage(nativeArt, 0, 0); } catch (_) {} art.append(canvas);
      } else if (nativeArt) art.append(nativeArt.cloneNode(true));
    }
    const info = document.createElement('section'); info.className = 'rg-information';
    const rarity = document.createElement('small'); rarity.textContent = selected.rarity || label(state.tab);
    const name = document.createElement('h2'); name.textContent = selected.title;
    const description = document.createElement('p'); description.textContent = selected.data?.desc || selected.data?.description || selected.subtitle;
    info.append(rarity, name, description);
    const facts = document.createElement('dl');
    const values = state.tab === 'skins' ? [[copy('FEGYVER', 'WEAPON'), selected.data?.weapon], [copy('KÉPESSÉG', 'SKILL'), selected.data?.skill]] : state.tab === 'enemies' ? [['HP', selected.data?.hp], ['ATK', selected.data?.damage ?? selected.data?.atk ?? selected.data?.contactDamage]] : [];
    for (const [key, value] of values) if (value !== undefined && value !== null && value !== '') { const pair = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = key; dd.textContent = String(value); pair.append(dt, dd); facts.append(pair); }
    info.append(facts);
    const button = document.createElement('button'); button.type = 'button'; button.dataset.rgPreview = ''; button.textContent = copy('ELŐNÉZET  ›', 'PREVIEW  ›'); button.disabled = !selected.card.matches('[data-v084-skin],[data-v084-enemy]');
    if (state.tab === 'worlds' || state.tab === 'gear') { button.hidden = true; }
    info.append(button); side.append(art, info); animate(side);
  }
  function dialog(root) {
    const modal = q('#collectionModalV084'), open = visible(modal);
    if (open) {
      if (!state.modal) state.returnFocus = document.activeElement;
      attr(root, 'inert', ''); attr(modal, 'role', 'dialog'); attr(modal, 'aria-modal', 'true'); attr(modal, 'aria-label', copy('Gyűjtemény előnézet', 'Collection preview'));
      if (!state.modal) q('.collection-modal-close-v084', modal)?.focus({ preventScroll: true });
    } else {
      const original = state.attrs.get(root)?.get('inert');
      if (original === null && root.hasAttribute('inert')) root.removeAttribute('inert');
      if (state.modal) (state.returnFocus?.isConnected ? state.returnFocus : q('[data-rg-preview]', root))?.focus({ preventScroll: true });
    }
    state.modal = open;
  }
  function sync() {
    const root = q('#libraryV0551');
    if (!desktop() || !visible(root)) { if (state.active) restore(); return; }
    const first = !state.active; state.active = true;
    if (!document.body.classList.contains('rift-gallery')) document.body.classList.add('rift-gallery');
    for (const [n, values] of state.attrs) if (!n.isConnected) { restoreAttrs(n, values); state.attrs.delete(n); }
    let tab = q('[data-library-tab].active', root)?.dataset.libraryTab;
    if (!tabs.includes(tab)) { q('[data-library-tab=skins]', root)?.click(); tab = 'skins'; }
    if (state.tab !== tab) { state.tab = tab; state.filter = 'all'; state.rarity = 'all'; state.signature = ''; state.list = null; }
    if (!q('.collection-grid-v084', root)) window.CHERRIFT_V084?.renderCollection?.();
    state.entries = entries(root); chrome(root); decorate(root); showcase(root); dialog(root);
    if (first) animate(q('#libraryBodyV0551', root));
  }
  function schedule() { if (!state.queued) { state.queued = true; queueMicrotask(() => { state.queued = false; sync(); }); } }
  function select(card) {
    const entry = state.entries.find(e => e.card === card); if (!entry?.selectable) return;
    state.selected[state.tab] = entry.key; state.signature = ''; sync();
  }
  function preview() {
    const entry = state.entries.find(e => e.key === state.selected[state.tab]);
    if (!entry?.selectable || !entry.card.matches('[data-v084-skin],[data-v084-enemy]')) return;
    state.pass = true; try { entry.card.click(); } finally { state.pass = false; } sync();
  }
  function back() { q('#collectionModalV084:not(.hidden) [data-v084-collection-close]')?.click(); window.UI?.open?.('menu'); sync(); }
  // Window capture runs before the native document handler. Only PC card selection
  // is intercepted; PREVIEW replays the original card action with native listeners.
  window.addEventListener('click', event => {
    if (!state.active || !desktop() || state.pass) return;
    const root = q('#libraryV0551'), card = event.target.closest?.('#libraryBodyV0551 .collection-card-v084');
    if (card && root?.contains(card)) { if (!card.disabled) { event.preventDefault(); event.stopImmediatePropagation(); select(card); } return; }
    if (event.target.closest?.('[data-rg-preview]')) preview();
    else if (event.target.closest?.('[data-rg-back]')) back();
    else { const filter = event.target.closest?.('[data-rg-filter]'); if (filter) { state.filter = filter.dataset.rgFilter; sync(); } }
  }, true);
  document.addEventListener('change', event => { if (state.active && desktop() && event.target.matches('[data-rg-rarity]')) { state.rarity = event.target.value; sync(); } });
  document.addEventListener('scroll', event => { if (state.active && event.target === state.list) state.scroll[state.tab] = state.list.scrollTop; }, true);
  window.addEventListener('keydown', event => {
    if (!state.active || !desktop()) return;
    const modal = q('#collectionModalV084');
    if (visible(modal)) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); q('.collection-modal-close-v084', modal)?.click(); sync(); }
      else if (event.key === 'Tab') {
        const controls = qa('button:not(:disabled),[tabindex="0"]', modal).filter(visible), index = controls.indexOf(document.activeElement);
        if (controls.length && ((!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index <= 0))) { event.preventDefault(); (event.shiftKey ? controls.at(-1) : controls[0]).focus(); }
      }
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (qa('[role=dialog][aria-modal=true]').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); return; }
    const card = event.target.closest?.('[data-rg-key]'); if (!card) return;
    if (['Enter', ' '].includes(event.key) && card.tagName !== 'BUTTON') { event.preventDefault(); select(card); }
    const list = state.entries.filter(e => e.match && e.selectable); let index = list.findIndex(e => e.card === card);
    const grid = q('.collection-grid-v084'), columns = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    if (event.key === 'ArrowRight') index++; else if (event.key === 'ArrowLeft') index--; else if (event.key === 'ArrowDown') index += columns; else if (event.key === 'ArrowUp') index -= columns; else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = list.length - 1; else return;
    event.preventDefault(); const next = list[Math.max(0, Math.min(list.length - 1, index))]; next?.card.focus({ preventScroll: true }); next?.card.scrollIntoView?.({ block: 'nearest' }); if (next) select(next.card);
  }, true);
  let hover = 0;
  document.addEventListener('pointerover', event => { if (!state.active || !desktop()) return; const b = event.target.closest('#libraryV0551 button'); if (b && !b.disabled && !b.contains(event.relatedTarget) && performance.now() - hover > 100) { hover = performance.now(); window.CHERRIFT_V060?.playClickSound?.(); } }, { passive: true });
  function start() {
    if (state.started || !q('#app')) return; state.started = true;
    new MutationObserver(records => { if (records.some(r => !r.target.closest?.('[data-rg-owned]') && (r.target === document.body || r.target === q('#app') || r.target.parentElement === q('#app') || r.target.closest?.('#libraryV0551,#collectionModalV084')))) schedule(); }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] }); sync();
  }
  window.addEventListener('resize', schedule, { passive: true });
  for (const name of ['cherrift:savechange', 'cherrift:languagechange']) window.addEventListener(name, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, { once: true });
  window.CHERRIFT_DESKTOP_COLLECTION = Object.freeze({ sync, isDesktop: desktop });
})();
