/* Crystal World Gallery: PC presentation of the native World → Chapter routes.
   The native selector owns content, locks, progression, selection and launch. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_WORLD) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const visible = n => !!n && !n.hidden && !n.classList.contains('hidden') && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
  const local = value => window.CHERRIFT_I18N?.translate?.(String(value || ''), copy('hu', 'en')) ?? String(value || '');
  const text = (n, value) => { if (n && n.textContent !== String(value)) n.textContent = value; };
  const source = {
    world: { root: '#worldSelectorV0942', host: '#worldCardV0942', dots: '#worldDotsV0942', index: 'worldIndex', action: '[data-world-start]', back: '[data-world-back]' },
    chapter: { root: '#chapterSelectorV0942', host: '#chapterCardV0942', dots: '#chapterDotsV0942', index: 'chapterIndex', action: '[data-chapter-play]', back: '[data-chapter-back]' }
  };
  const state = { started: false, queued: false, reading: false, root: null, mode: '', key: '', data: [], selected: 0, parent: 0, rendered: '', motion: '', exit: 0, hover: 0, launch: 0, parallax: 0, drift: 0 };
  const animations = new Set();
  function animate(node, frames, duration = 320) {
    if (!node || reduced()) return;
    const a = node.animate?.(frames, { duration, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (a) { animations.add(a); a.finished?.catch(() => {}).finally(() => animations.delete(a)); }
  }
  function make(tag, cls, parent) {
    const n = document.createElement(tag); n.className = cls; n.dataset.wgOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n;
  }
  function restore() {
    clearTimeout(state.exit); clearTimeout(state.launch);
    if (state.parallax) cancelAnimationFrame(state.parallax); state.parallax = 0; state.exit = 0; state.launch = 0;
    animations.forEach(a => a.cancel()); animations.clear();
    qa('[data-wg-owned]').forEach(n => n.remove());
    document.body.classList.remove('crystal-world-selector');
    state.root = null; state.mode = ''; state.key = ''; state.rendered = ''; state.motion = '';
  }
  function nativeDots(root, mode) { return qa(`[data-${mode}-index]`, q(source[mode].dots, root)); }
  function read(root, mode) {
    const config = source[mode], dots = nativeDots(root, mode);
    if (!dots.length || !q('.selector-card-v0942', q(config.host, root))) return false;
    const selected = dots.findIndex(n => n.classList.contains('active'));
    state.selected = Math.max(0, selected);
    const data = []; state.reading = true;
    try {
      for (const dot of dots) {
        const index = Number(dot.dataset[config.index]);
        const fresh = nativeDots(root, mode).find(n => Number(n.dataset[config.index]) === index);
        if (fresh && !fresh.classList.contains('active')) fresh.click();
        const card = q('.selector-card-v0942', q(config.host, root));
        if (!card) continue;
        const currentDot = nativeDots(root, mode).find(n => Number(n.dataset[config.index]) === index);
        const summary = mode === 'chapter' ? qa('#chapterSummaryV0942>div', root).map(n => ({ label: local(q('small', n)?.textContent), value: local(q('b', n)?.textContent) })) : [];
        data.push({ index, label: currentDot?.getAttribute('aria-label') || String(index + 1), badge: dot.textContent.trim(),
          title: local(q('.selector-copy-v0942 h3', card)?.textContent), subtitle: local(q('.selector-copy-v0942 small', card)?.textContent),
          stars: q('.selector-stars-v0942', card)?.textContent || '', starsLabel: q('.selector-stars-v0942', card)?.getAttribute('aria-label') || '',
          locked: !!q(config.action, root)?.disabled, note: q('.selector-copy-v0942 p', card)?.textContent || q('.selector-dummy-v0942', card)?.textContent || '',
          art: card.style.backgroundImage, summary });
      }
    } finally {
      const original = nativeDots(root, mode).find(n => Number(n.dataset[config.index]) === state.selected);
      if (original && !original.classList.contains('active')) original.click();
      state.reading = false;
    }
    state.data = data;
    return data.length > 0;
  }
  function chrome(root, mode) {
    let bar = q('.wg-chrome', root);
    if (!bar) {
      bar = make('header', 'wg-chrome', root);
      bar.innerHTML = '<img class="wg-logo" src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div class="wg-heading"><small>SAKURA ✦ RIFT</small><h1></h1></div><button type="button" class="wg-back" data-wg-back></button><nav class="wg-breadcrumb" aria-label="Selection"><button type="button" data-wg-worlds></button><span aria-hidden="true">›</span><b></b></nav><p class="wg-total"></p>';
    }
    text(q('h1', bar), mode === 'world' ? 'WORLD SELECT' : 'CHAPTER SELECT');
    text(q('.wg-back', bar), mode === 'world' ? copy('‹ FŐMENÜ', '‹ LOBBY') : copy('‹ VILÁGOK', '‹ WORLDS'));
    const worlds = q('[data-wg-worlds]', bar); worlds.disabled = mode === 'world'; text(worlds, copy('VILÁG', 'WORLD'));
    text(q('.wg-breadcrumb b', bar), mode === 'world' ? copy('VILÁG VÁLASZTÁSA', 'CHOOSE YOUR WORLD') : local(q('#chapterWorldTitleV0942', root)?.textContent) || 'CHAPTER');
    text(q('.wg-total', bar), mode === 'world' ? q('#worldTotalStarsV0942', root)?.textContent || '' : q('#chapterCountV0942', root)?.textContent || '');
    const top = q('#crystalDesktopMenu>.crystal-topbar');
    if (top && bar.dataset.header !== top.innerHTML) {
      const focused = q('.crystal-topbar :focus', bar), action = focused?.dataset.crystalRoute || focused?.dataset.crystalTool;
      q('.crystal-topbar', bar)?.remove(); const clone = top.cloneNode(true); qa('[id]', clone).forEach(n => n.removeAttribute('id')); bar.append(clone); bar.dataset.header = top.innerHTML;
      if (action) q(`[data-crystal-route="${action}"],[data-crystal-tool="${action}"]`, clone)?.focus({ preventScroll: true });
    }
  }
  function content(root, mode) {
    const entry = state.data.find(n => n.index === state.selected); if (!entry) return;
    let scene = q('.wg-scene', root);
    if (!scene) {
      scene = make('div', 'wg-scene', root); scene.setAttribute('aria-hidden', 'true');
      make('div', 'wg-landscape', scene); const petals = make('div', 'wg-petals', scene);
      for (let i = 0; i < 10; i++) { const p = document.createElement('i'); p.style.setProperty('--i', i); petals.append(p); }
    }
    const landscape = q('.wg-landscape', scene);
    if (landscape.style.backgroundImage !== entry.art) landscape.style.backgroundImage = entry.art;
    let story = q('.wg-story', root);
    if (!story) { story = make('section', 'wg-story', root); story.setAttribute('aria-live', 'polite'); story.innerHTML = '<small></small><h2></h2><p class="wg-story-stars"></p><p class="wg-note"></p><div class="wg-arrows"><button type="button" data-wg-step="-1">‹</button><span></span><button type="button" data-wg-step="1">›</button></div>'; }
    text(q('small', story), entry.subtitle); text(q('h2', story), entry.title); text(q('.wg-story-stars', story), entry.stars); text(q('.wg-note', story), entry.locked ? copy('Zárolt kaland · egyelőre megtekinthető.', 'Locked adventure · preview available.') : entry.note || (mode === 'world' ? copy('Válassz világot, majd folytasd a fejezetekkel.', 'Choose a world, then explore its chapters.') : copy('Válaszd ki a következő kalandodat.', 'Choose your next adventure.')));
    text(q('.wg-arrows span', story), `${state.selected + 1} / ${state.data.length}`);
    for (const b of qa('[data-wg-step]', story)) { const prev = Number(b.dataset.wgStep) < 0; b.disabled = prev ? state.selected === 0 : state.selected === state.data.length - 1; b.setAttribute('aria-label', prev ? copy('Előző', 'Previous') : copy('Következő', 'Next')); }
    const signature = JSON.stringify([mode, state.selected, state.data]);
    if (state.rendered !== signature) {
      const focused = q('[data-wg-card]:focus,[data-wg-pick]:focus', root), focusIndex = focused?.dataset.wgCard ?? focused?.dataset.wgPick, focusType = focused?.hasAttribute('data-wg-card') ? 'card' : 'pick';
      const gallery = q('.wg-gallery', root) || make('section', 'wg-gallery', root); gallery.setAttribute('aria-label', mode === 'world' ? copy('Világkártyák', 'World cards') : copy('Fejezetkártyák', 'Chapter cards')); gallery.replaceChildren();
      const neighbors = [entry, ...state.data.filter(n => n.index > state.selected), ...state.data.filter(n => n.index < state.selected).reverse()].slice(0, 3);
      for (const [position, item] of neighbors.entries()) {
        const b = document.createElement('button'); b.type = 'button'; b.className = `wg-card${item.locked ? ' wg-locked' : ''}`; b.dataset.wgCard = item.index; b.dataset.position = position; b.setAttribute('aria-pressed', String(item.index === state.selected)); b.setAttribute('aria-label', `${item.label}: ${item.title}${item.locked ? copy(', zárolva', ', locked') : ''}`);
        const image = document.createElement('span'); image.className = 'wg-card-art'; image.style.backgroundImage = item.art;
        const frame = document.createElement('img'); frame.className = 'wg-card-frame'; frame.src = 'assets/ui/world/gallery-frame-pc.webp'; frame.alt = ''; frame.draggable = false;
        const label = document.createElement('span'); label.className = 'wg-card-copy';
        const small = document.createElement('small'), title = document.createElement('b'), stars = document.createElement('em'); small.textContent = item.subtitle; title.textContent = item.title; stars.textContent = item.stars; label.append(small, title, stars);
        b.append(image, frame, label);
        if (item.locked) { const lock = document.createElement('span'); lock.className = 'wg-lock'; lock.innerHTML = '<svg viewBox="0 0 24 28" aria-hidden="true"><rect x="3" y="11" width="18" height="15" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="2" fill="#25162e"/></svg>'; b.append(lock); }
        gallery.append(b);
      }
      const strip = q('.wg-strip', root) || make('nav', 'wg-strip', root); strip.setAttribute('aria-label', mode === 'world' ? copy('Összes világ', 'All worlds') : copy('Összes fejezet', 'All chapters')); strip.replaceChildren();
      for (const item of state.data) {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.wgPick = item.index; b.setAttribute('aria-pressed', String(item.index === state.selected)); b.setAttribute('aria-label', `${item.label}: ${item.title}${item.locked ? copy(', zárolva', ', locked') : ''}`); b.className = item.locked ? 'wg-mini wg-locked' : 'wg-mini';
        const art = document.createElement('span'); art.className = 'wg-mini-art'; art.style.backgroundImage = item.art;
        const name = document.createElement('b'), rank = document.createElement('small'); name.textContent = item.badge; rank.textContent = item.locked ? copy('ZÁROLVA', 'LOCKED') : item.stars; b.append(art, name, rank); strip.append(b);
      }
      if (focusIndex != null) q(`[data-wg-${focusType}="${focusIndex}"]`, root)?.focus({ preventScroll: true });
      const motion = `${mode}:${state.selected}`;
      if (state.motion !== motion) { animate(gallery, [{ opacity: .25, transform: 'translate3d(30px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }]); animate(story, [{ opacity: .3 }, { opacity: 1 }], 260); state.motion = motion; }
      state.rendered = signature;
    }
    let footer = q('.wg-footer', root);
    if (!footer) { footer = make('footer', 'wg-footer', root); footer.innerHTML = '<section class="wg-summary"></section><div class="wg-action-area"><p></p><button type="button" data-wg-action class="wg-action"><b></b><span aria-hidden="true">›</span></button></div>'; }
    const summary = q('.wg-summary', footer), rows = mode === 'chapter' ? entry.summary : [{ label: copy('KIVÁLASZTOTT VILÁG', 'SELECTED WORLD'), value: entry.title }, { label: copy('HALADÁS', 'PROGRESS'), value: entry.stars }, { label: copy('KÖVETKEZŐ LÉPÉS', 'NEXT STEP'), value: entry.badge === 'T' ? copy('Gyakorlás indítása', 'Start training') : copy('Fejezet kiválasztása', 'Choose chapter') }];
    const summaryKey = JSON.stringify(rows); if (summary.dataset.key !== summaryKey) { summary.replaceChildren(); for (const row of rows) { const cell = document.createElement('div'), label = document.createElement('small'), value = document.createElement('b'); label.textContent = row.label; value.textContent = row.value; cell.append(label, value); summary.append(cell); } summary.dataset.key = summaryKey; }
    const action = q('[data-wg-action]', footer); action.disabled = !!q(source[mode].action, root)?.disabled || !!state.launch || !!state.exit;
    const training = mode === 'world' && entry.badge === 'T';
    text(q('b', action), mode === 'chapter' || training ? 'PLAY' : copy('FEJEZETEK', 'CHAPTERS'));
    text(q('.wg-action-area>p', footer), entry.locked ? copy('Még nincs feloldva', 'Not unlocked yet') : mode === 'world' && !training ? 'WORLD → CHAPTER' : copy('Készen állsz?', 'Ready to begin?'));
  }
  function signature(root, mode) {
    // Native localization changes text after rendering. Keep that work out of the
    // snapshot key so our temporary carousel reads cannot feed a translation loop.
    return JSON.stringify([mode, window.UI?.save?.settings?.language, window.UI?.save?.stageStars, window.UI?.save?.stageStats,
      window.UI?.save?.firstClearClaimed, window.UI?.save?.account?.level,
      nativeDots(root, mode).map(n => [n.dataset[source[mode].index], n.classList.contains('active'), n.classList.contains('locked')]),
      q(source[mode].action, root)?.disabled, q('.selector-card-v0942', q(source[mode].host, root))?.style.backgroundImage]);
  }
  function sync() {
    if (state.reading) return;
    const mode = ['chapter', 'world'].find(m => visible(q(source[m].root)));
    if (!desktop() || !mode || document.body.classList.contains('is-playing') || document.body.classList.contains('is-loading-stage')) { if (state.root) restore(); return; }
    const root = q(source[mode].root);
    if (root !== state.root) { if (state.root) restore(); state.root = root; state.mode = mode; }
    const key = signature(root, mode);
    if (key !== state.key) { if (!read(root, mode)) return; state.key = signature(root, mode); }
    if(!document.body.classList.contains('crystal-world-selector'))document.body.classList.add('crystal-world-selector'); chrome(root, mode); content(root, mode);
  }
  function schedule() { if (state.reading || state.queued) return; state.queued = true; queueMicrotask(() => { state.queued = false; sync(); }); }
  function pick(index) {
    if (!state.root || state.exit || state.launch) return;
    const target = nativeDots(state.root, state.mode).find(n => Number(n.dataset[source[state.mode].index]) === index);
    target?.click(); sync();
  }
  function back() {
    if (!state.root || state.exit || state.launch) return;
    const root = state.root, mode = state.mode, parent = state.parent;
    animate(q('.wg-gallery', root), [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: 'translate3d(22px,0,0)' }], 150);
    state.exit = setTimeout(() => {
      state.exit = 0; if (!desktop() || !visible(root)) return;
      q(source[mode].back, root)?.click();
      if (mode === 'chapter') nativeDots(q(source.world.root), 'world').find(n => Number(n.dataset.worldIndex) === parent)?.click();
      sync(); window.CHERRIFT_DESKTOP_MENU?.sync?.();
    }, reduced() ? 0 : 150);
  }
  function start() {
    if (state.started || !q('#app')) return; state.started = true;
    new MutationObserver(records => { if (!state.reading && records.some(r => !r.target.closest?.('[data-wg-owned]'))) schedule(); }).observe(q('#app'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    sync();
  }
  document.addEventListener('click', event => {
    if (!desktop() || !state.root || state.reading) return;
    const b = event.target.closest('button'); if (!b || b.disabled || !b.closest('[data-wg-owned]')) return;
    if (b.hasAttribute('data-wg-card')) pick(Number(b.dataset.wgCard));
    else if (b.hasAttribute('data-wg-pick')) pick(Number(b.dataset.wgPick));
    else if (b.hasAttribute('data-wg-step')) pick(state.selected + Number(b.dataset.wgStep));
    else if (b.hasAttribute('data-wg-back') || b.hasAttribute('data-wg-worlds')) back();
    else if (b.hasAttribute('data-wg-action')) {
      if (state.launch || state.exit) return;
      const native = q(source[state.mode].action, state.root); if (!native || native.disabled) return;
      if (state.mode === 'world') state.parent = state.selected;
      // Only debounce the presentation; the native online start path owns its async guard.
      state.launch = setTimeout(() => { state.launch = 0; schedule(); }, 900); b.disabled = true;
      native.click(); sync();
    } else if (b.closest('.wg-chrome')) {
      if (b.dataset.crystalRoute) window.UI?.open?.(b.dataset.crystalRoute);
      else if (b.dataset.crystalTool) window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);
      else if (b.hasAttribute('data-crystal-energy')) window.CHERRIFT_PREBETA?.showEnergyModal?.();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (!state.root || !desktop() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (qa('[role=dialog][aria-modal=true],dialog[open],.v082-modal,.prebeta-frame-modal').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); return; }
    const target = event.target.closest('[data-wg-card],[data-wg-pick]'); if (!target) return;
    let index = Number(target.dataset.wgCard ?? target.dataset.wgPick);
    if (event.key === 'ArrowRight') index++; else if (event.key === 'ArrowLeft') index--; else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = state.data.length - 1; else return;
    event.preventDefault(); index = Math.max(0, Math.min(state.data.length - 1, index)); pick(index); q(`[data-wg-pick="${index}"]`, state.root)?.focus({ preventScroll: true });
  }, true);
  document.addEventListener('pointerover', event => {
    if (!desktop() || !state.root) return; const b = event.target.closest('[data-wg-owned] button');
    if (b && !b.disabled && !b.contains(event.relatedTarget) && performance.now() - state.hover > 100) { state.hover = performance.now(); window.CHERRIFT_V060?.playClickSound?.(); }
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    if (!state.root || !desktop() || reduced()) return;
    state.drift = (event.clientX / innerWidth - .5) * 8;
    if (!state.parallax) state.parallax = requestAnimationFrame(() => { state.parallax = 0; q('.wg-scene', state.root)?.style.setProperty('--wg-drift', `${state.drift}px`); });
  }, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  for (const e of ['cherrift:savechange', 'cherrift:languagechange']) window.addEventListener(e, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, { once: true });
  window.CHERRIFT_DESKTOP_WORLD = Object.freeze({ sync, isDesktop: desktop });
})();
