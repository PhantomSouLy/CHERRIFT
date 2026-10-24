/* Crystal Correspondence: desktop presentation over the native mailbox.
   Native handlers own reads, selection, claims, deletion and persistence. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_MAIL) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ?? (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const visible = n => {
    if (!n) return false;
    for (let node = n; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || node.classList.contains('hidden') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  };
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const reduced = () => !!window.UI?.save?.settings?.reducedMotion || matchMedia('(prefers-reduced-motion:reduce)').matches;
  const state = { started: false, active: false, queued: false, filter: 'all', selected: '', list: null, scroll: 0, detail: null, exit: 0, hover: 0, attrs: new Map() };
  const animations = new Set();
  function text(n, value) { if (n && n.textContent !== value) n.textContent = value; }
  function own(tag, cls, parent) { const n = document.createElement(tag); n.className = cls; n.dataset.cmOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n; }
  function attr(n, key, value) {
    if (!n) return;
    if (!state.attrs.has(n)) state.attrs.set(n, new Map());
    const before = state.attrs.get(n); if (!before.has(key)) before.set(key, n.getAttribute(key));
    if (value === null) { if (n.hasAttribute(key)) n.removeAttribute(key); } else if (n.getAttribute(key) !== value) n.setAttribute(key, value);
  }
  function animate(n, exit = false) {
    if (!n || reduced()) return;
    const a = n.animate?.(exit ? [{ opacity: 1 }, { opacity: 0, transform: 'translate3d(18px,0,0)' }] : [{ opacity: .25, transform: 'translate3d(18px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: exit ? 140 : 230, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (a) { animations.add(a); a.finished?.catch(() => {}).finally(() => animations.delete(a)); }
  }
  function restore() {
    clearTimeout(state.exit); state.exit = 0; animations.forEach(a => a.cancel()); animations.clear();
    qa('[data-cm-owned]').forEach(n => n.remove());
    for (const [n, values] of state.attrs) for (const [key, value] of values) { if (value === null) n.removeAttribute(key); else n.setAttribute(key, value); }
    state.attrs.clear(); state.active = false; state.filter = 'all'; state.selected = ''; state.list = null; state.detail = null; state.scroll = 0;
    document.body.classList.remove('crystal-mail');
  }
  function chrome(root) {
    let bar = q('.cm-chrome', root);
    if (!bar) {
      own('div', 'cm-scenery', root).setAttribute('aria-hidden', 'true');
      const image = own('img', 'cm-ornament', root); image.src = 'assets/ui/mail/crystal-correspondence-pc.webp'; image.alt = ''; image.draggable = false;
      bar = own('header', 'cm-chrome', root); bar.innerHTML = '<img class="cm-logo" src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div class="cm-heading"><small>CHERRIFT · MAIL</small><h1></h1></div><button type="button" data-cm-action="back"></button>';
      const petals = own('div', 'cm-petals', root); petals.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 7; i++) { const p = document.createElement('i'); p.style.setProperty('--i', i); petals.append(p); }
    }
    text(q('h1', bar), copy('LEVELEK', 'MAIL')); text(q('[data-cm-action=back]', bar), copy('‹ FŐMENÜ', '‹ LOBBY'));
    let filters = q('.cm-filters', root);
    if (!filters) { filters = own('nav', 'cm-filters', root); for (const key of ['all', 'unread', 'rewards']) { const b = document.createElement('button'); b.type = 'button'; b.dataset.cmFilter = key; filters.append(b); } }
    filters.setAttribute('aria-label', copy('Levélszűrők', 'Mail filters'));
    for (const [key, hu, en] of [['all', 'ÖSSZES', 'ALL'], ['unread', 'OLVASATLAN', 'UNREAD'], ['rewards', 'JUTALMAK', 'REWARDS']]) { const b = q(`[data-cm-filter=${key}]`, filters); text(b, copy(hu, en)); b.setAttribute('aria-pressed', String(state.filter === key)); }
    let empty = q('.cm-reading-empty', root);
    if (!empty) { empty = own('section', 'cm-reading-empty', root); empty.innerHTML = '<img src="assets/ui/mail_icon.png" alt=""><h2></h2><p></p>'; }
    text(q('h2', empty), copy('Üzenetek a Riften túlról', 'Letters beyond the Rift'));
    text(q('p', empty), copy('Válassz egy levelet az elolvasáshoz.', 'Select a letter to read its message.'));
    empty.hidden = visible(q('#mailDetailModalV096'));
    let noMatch = q('.cm-no-match', root);
    if (!noMatch) noMatch = own('p', 'cm-no-match', root);
    text(noMatch, copy('Nincs a szűrőnek megfelelő levél.', 'No messages match this filter.'));
  }
  function rows(root) {
    const list = q('.mail-list-bf', root);
    if (list !== state.list) { state.list = list; if (list) list.scrollTop = state.scroll; }
    let matched = 0;
    for (const row of qa('.mail-row-bf', root)) {
      const b = q('[data-mail-id]', row), mark = q('.mail-reward-mark-bf', row)?.textContent.trim();
      const match = state.filter === 'all' || (state.filter === 'unread' ? row.classList.contains('unread') : mark === '✦' || mark === '✓');
      attr(row, 'hidden', match ? null : ''); if (match) matched++;
      attr(b, 'aria-current', visible(q('#mailDetailModalV096')) && b?.dataset.mailId === state.selected ? 'true' : null);
      if (!q('.cm-envelope', row)) { const image = own('img', 'cm-envelope', row); image.src = 'assets/ui/mail_icon.png'; image.alt = ''; image.draggable = false; }
    }
    const hasRows = qa('.mail-row-bf', root).length > 0;
    q('.cm-no-match', root).hidden = !hasRows || matched > 0;
  }
  function rewards(modal) {
    const source = q('.mail-reward-bf p', modal), parent = source?.parentElement;
    if (!source) return;
    let cards = q('.cm-reward-cards', parent);
    if (cards?.dataset.source === source.textContent) return;
    cards?.remove(); cards = own('div', 'cm-reward-cards', parent); cards.dataset.source = source.textContent;
    for (const label of source.textContent.split(' · ').filter(Boolean)) {
      const card = document.createElement('div'), image = document.createElement('img'), caption = document.createElement('span');
      const lower = label.toLowerCase();
      image.src = /coin|érme/.test(lower) ? 'assets/items/coin.png' : /gem|gyémánt/.test(lower) ? 'assets/items/blossom_gem.png' : 'assets/ui/mail_icon.png';
      image.alt = ''; image.draggable = false; caption.textContent = label; card.append(image, caption); cards.append(card);
    }
  }
  function detail(root) {
    const modal = q('#mailDetailModalV096');
    if (!visible(modal)) { if (state.detail) { (qa('[data-mail-id]', root).find(b => b.dataset.mailId === state.selected && !b.closest('[hidden]')) || q('[data-cm-filter][aria-pressed=true]', root))?.focus({ preventScroll: true }); } state.detail = null; return; }
    // On PC the native dialog is an inline reading region; keep its DOM and listeners in place.
    attr(modal, 'role', 'region'); attr(modal, 'aria-modal', null);
    attr(modal, 'aria-label', copy('Kiválasztott levél', 'Selected letter'));
    const body = q('#mailDetailModalBody', modal);
    if (state.detail !== body?.firstElementChild) { state.detail = body?.firstElementChild; animate(q('.mail-detail-card-bf', modal)); }
    rewards(modal);
  }
  function sync() {
    const root = q('#mailBugfixV0941');
    if (!desktop() || !visible(root)) { if (state.active) restore(); return; }
    for (const [n, values] of state.attrs) if (!n.isConnected) {
      for (const [key, value] of values) { if (value === null) n.removeAttribute(key); else n.setAttribute(key, value); }
      state.attrs.delete(n);
    }
    const first = !state.active; state.active = true;
    if (!document.body.classList.contains('crystal-mail')) document.body.classList.add('crystal-mail');
    chrome(root); rows(root); detail(root); if (first) animate(q('#mailBugfixBody'));
  }
  function schedule() { if (!state.queued) { state.queued = true; queueMicrotask(() => { state.queued = false; sync(); }); } }
  function back() {
    if (state.exit) return;
    animate(q('#mailBugfixBody'), true);
    state.exit = setTimeout(() => { state.exit = 0; if (!desktop() || !state.active) return; q('#mailDetailModalV096 [data-mail-detail-close]')?.click(); window.UI?.open?.('menu'); sync(); window.CHERRIFT_DESKTOP_MENU?.sync?.(); }, reduced() ? 0 : 140);
  }
  document.addEventListener('click', event => {
    if (!state.active || !desktop()) return;
    const b = event.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.cmAction === 'back') back();
    if (b.dataset.cmFilter) { state.filter = b.dataset.cmFilter; sync(); }
    if (b.hasAttribute('data-mail-id')) { state.selected = b.dataset.mailId; state.scroll = q('.mail-list-bf')?.scrollTop || 0; }
  }, true);
  document.addEventListener('keydown', event => {
    if (!state.active || !desktop() || event.key !== 'Escape' || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    // Reward acquisition dialogs keep their own keyboard navigation.
    if (qa('[role=dialog][aria-modal=true],.obtained-overlay-v098').some(visible)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const modal = q('#mailDetailModalV096'); if (visible(modal)) q('[data-mail-detail-close]', modal)?.click(); else back();
  }, true);
  document.addEventListener('pointerover', event => {
    if (!state.active || !desktop()) return;
    const b = event.target.closest('#mailBugfixV0941 button,#mailDetailModalV096 button');
    if (b && !b.disabled && !b.contains(event.relatedTarget) && performance.now() - state.hover > 100) { state.hover = performance.now(); if(!window.CHERRIFT_MENU_AUDIO)window.CHERRIFT_V060?.playClickSound?.(); }
  }, { passive: true });
  document.addEventListener('scroll', event => { if (state.active && event.target === state.list) state.scroll = state.list.scrollTop; }, true);
  function start() {
    if (state.started || !q('#app')) return; state.started = true;
    new MutationObserver(records => { if (records.some(r => !r.target.closest?.('[data-cm-owned]') && (r.target === q('#app') || r.target.parentElement === q('#app') || r.target.closest?.('#mailBugfixV0941,#mailDetailModalV096') || r.target === document.body))) schedule(); }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] }); sync();
  }
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('cherrift:languagechange', schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, { once: true });
  window.CHERRIFT_DESKTOP_MAIL = Object.freeze({ sync, isDesktop: desktop });
})();
