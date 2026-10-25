/* PC Crystal Settings: native controls and their handlers retain ownership.
   The presentation adds artwork, navigation semantics and automatic-save feedback. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_SETTINGS) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const reduced = () => !!window.UI?.save?.settings?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = n => !!n && !n.hidden && !n.classList.contains('hidden') && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
  const text = (n, value) => { if (n && n.textContent !== String(value)) n.textContent = value; };
  const state = { started: false, active: false, queued: false, changing: false, originalTab: '', lastTab: 'audio', shown: '', exit: 0, hover: 0, move: null, attrs: new Map(), scrolls: new Map() };
  const animations = new Set();
  const titles = {
    general: ['ÁLTALÁNOS', 'GENERAL'], audio: ['HANG', 'AUDIO'], display: ['MEGJELENÍTÉS', 'DISPLAY'],
    controls: ['IRÁNYÍTÁS', 'CONTROLS'], theme: ['MENÜTÉMA', 'THEME'], account: ['FIÓK', 'ACCOUNT']
  };
  function make(tag, cls, parent) { const n = document.createElement(tag); n.className = cls; n.dataset.csOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n; }
  function attr(n, key, value) {
    if (!n) return;
    if (!state.attrs.has(n)) state.attrs.set(n, new Map());
    const originals = state.attrs.get(n); if (!originals.has(key)) originals.set(key, n.getAttribute(key));
    if (n.getAttribute(key) !== value) n.setAttribute(key, value);
  }
  function animate(n, frames, duration = 260) {
    if (!n || reduced()) return;
    const a = n.animate?.(frames, { duration, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (a) { animations.add(a); a.finished?.catch(() => {}).finally(() => animations.delete(a)); }
  }
  function restore() {
    clearTimeout(state.exit); state.exit = 0;
    animations.forEach(a => a.cancel()); animations.clear();
    state.changing = true;
    if (state.move) { const { node, marker } = state.move; if (marker.isConnected && node.isConnected) marker.replaceWith(node); else marker.remove(); state.move = null; }
    const root = q('#settings');
    if (state.originalTab) q(`[data-v060-settings="${state.originalTab}"]`, root)?.click();
    qa('[data-cs-owned]', root).forEach(n => n.remove());
    for (const [n, values] of state.attrs) for (const [key, value] of values) { if (value === null) n.removeAttribute(key); else n.setAttribute(key, value); }
    state.attrs.clear();
    for (const [n, top] of state.scrolls) if (n.isConnected) n.scrollTop = top;
    state.scrolls.clear(); document.body.classList.remove('crystal-settings');
    state.changing = false; state.active = false; state.originalTab = ''; state.shown = '';
  }
  function chrome(root) {
    let bar = q('.cs-chrome', root);
    if (!bar) {
      bar = make('header', 'cs-chrome', root);
      bar.innerHTML = '<img class="cs-logo" src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div class="cs-heading"><h1>SETTINGS</h1></div><button type="button" class="cs-back" data-cs-back hidden></button>';
      const scenery = make('div', 'cs-scenery', root); scenery.setAttribute('aria-hidden', 'true');
      const ornament = make('img', 'cs-ornament', root); ornament.src = 'assets/ui/settings/crystal-settings-frame-pc.webp'; ornament.alt = ''; ornament.draggable = false;
      const petals = make('div', 'cs-petals', root); petals.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 8; i++) { const p = document.createElement('i'); p.style.setProperty('--i', i); petals.append(p); }
    }
    const paused = document.body.classList.contains('settings-from-pause') && window.UI?.game?.mode === 'paused';
    text(q('.cs-back', bar), paused ? copy('‹ SZÜNET MENÜ', '‹ PAUSE MENU') : copy('‹ FŐMENÜ', '‹ LOBBY'));
    // Keep pause settings focused on the run; account/resource shortcuts belong to the lobby.
    const source = paused ? null : q('#crystalDesktopMenu>.crystal-topbar');
    if (!source) { q('.crystal-topbar', bar)?.remove(); delete bar.dataset.header; }
    else if (bar.dataset.header !== source.innerHTML) {
      const focused = q('.crystal-topbar :focus', bar), key = focused?.dataset.crystalRoute || focused?.dataset.crystalTool;
      q('.crystal-topbar', bar)?.remove(); const clone = source.cloneNode(true); qa('[id]', clone).forEach(n => n.removeAttribute('id')); bar.append(clone); bar.dataset.header = source.innerHTML;
      if (key) q(`[data-crystal-route="${key}"],[data-crystal-tool="${key}"]`, clone)?.focus({ preventScroll: true });
    }
    let footer = q('.cs-footer', root);
    if (!footer) { footer = make('footer', 'cs-footer', root); footer.innerHTML = '<p><span aria-hidden="true">✦</span><b></b><small></small></p><button type="button" data-cs-back class="cs-return"></button><button type="button" data-cs-back class="cs-done"></button><button type="button" data-cs-resume class="cs-done cs-resume"></button>'; }
    text(q('.cs-footer p b', root), copy('AUTOMATIKUS MENTÉS', 'AUTOMATIC SAVE'));
    text(q('.cs-footer p small', root), copy('A módosítások azonnal érvényesek.', 'Changes take effect immediately.'));
    text(q('.cs-footer .cs-return', root), copy('VISSZA', 'BACK'));
    text(q('.cs-footer .cs-done', root), copy('KÉSZ', 'DONE'));
    const resume = q('[data-cs-resume]', footer); resume.hidden = !paused; text(resume, copy('FOLYTATÁS', 'RESUME'));
  }
  function decorate(root) {
    const tabs = q('.settings-tabs-v060', root), pages = qa('[data-v060-settings-page]', root);
    attr(tabs, 'role', 'tablist'); attr(tabs, 'aria-orientation', 'vertical');
    const active = q('[data-v060-settings].active', tabs)?.dataset.v060Settings;
    for (const button of qa('[data-v060-settings]', tabs)) {
      const name = button.dataset.v060Settings, page = pages.find(n => n.dataset.v060SettingsPage === name);
      if (!page) continue;
      attr(button, 'role', 'tab'); attr(button, 'aria-selected', String(name === active));
      if (!button.id) attr(button, 'id', `crystalSettingsTab-${name}`);
      if (!page.id) attr(page, 'id', `crystalSettingsPage-${name}`);
      attr(button, 'aria-controls', page.id); attr(page, 'role', 'tabpanel'); attr(page, 'aria-labelledby', button.id);
      if (!state.scrolls.has(page)) state.scrolls.set(page, page.scrollTop);
      let label = q('.cs-tab-label', button);
      if (!label) label = make('span', 'cs-tab-label', button);
      const pair = titles[name]; text(label, pair ? copy(...pair) : q('b', button)?.textContent || name);
    }
    // Move the original control, not a clone. Its native change listener survives.
    const combat = q('#combatSoundsV085', root)?.closest('.setting-line-v060'), audio = q('[data-v060-settings-page="audio"]', root);
    if (combat && audio && !state.move) { const marker = document.createComment('PC audio row origin'); combat.before(marker); audio.append(combat); state.move = { node: combat, marker }; }
    for (const range of qa('input[type=range]', root)) {
      const row = range.closest('.setting-line-v060'); if (!row) continue;
      let value = q('.cs-range-value', row); if (!value) value = make('output', 'cs-range-value', row);
      if (range.id) value.htmlFor = range.id;
      text(value, `${range.value}%`);
      if (range.disabled) { let badge = q('.cs-soon', row); if (!badge) badge = make('small', 'cs-soon', row); text(badge, copy('HAMAROSAN', 'COMING SOON')); }
    }
    // The native zoom uses numeric saves (1 / 1.1) and formatted option values
    // (1.00 / 1.10). Show its current label without changing the select or save.
    const zoom = q('#viewZoom', root), zoomRow = zoom?.closest('.setting-line-v060');
    if (zoomRow) {
      let label = q('.cs-current-zoom', zoomRow); if (!label) { label = make('span', 'cs-current-zoom', zoomRow); label.setAttribute('aria-hidden', 'true'); }
      const option = Array.from(zoom.options).find(n => Number(n.value) === Number(window.UI?.save?.settings?.viewZoom));
      label.hidden = !!zoom.value || !option; text(label, option?.textContent || '');
    }
    if (active && active !== state.shown) {
      const page = pages.find(n => n.dataset.v060SettingsPage === active);
      animate(page, [{ opacity: .25, transform: 'translate3d(20px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }]);
      state.shown = active; state.lastTab = active;
    }
  }
  function sync() {
    if (state.changing) return;
    const root = q('#settings');
    if (!desktop() || !visible(root)) { if (state.active) restore(); return; }
    if (!q('#settingsShellV060', root)) return;
    if (!state.active) {
      state.originalTab = q('[data-v060-settings].active', root)?.dataset.v060Settings || 'general';
      for (const n of qa('[data-v060-settings],[data-v060-settings-page]', root)) attr(n, 'class', n.getAttribute('class') || '');
      state.active = true;
      state.changing = true; q(`[data-v060-settings="${state.lastTab}"]`, root)?.click(); state.changing = false;
    }
    if(!document.body.classList.contains('crystal-settings'))document.body.classList.add('crystal-settings'); chrome(root); decorate(root);
  }
  function schedule() { if (state.queued || state.changing) return; state.queued = true; queueMicrotask(() => { state.queued = false; sync(); }); }
  function back(resume = false) {
    if (state.exit || !state.active) return;
    const root = q('#settings'), paused = document.body.classList.contains('settings-from-pause') && window.UI?.game?.mode === 'paused';
    if (resume) { if (paused) q('#settingsResumeAction', root)?.click(); sync(); return; }
    animate(q('.settings-content-v060', root), [{ opacity: 1 }, { opacity: 0, transform: 'translate3d(18px,0,0)' }], 150);
    state.exit = setTimeout(() => { state.exit = 0; if (!desktop() || !visible(root)) return; q('#settingsBackAction', root)?.click(); sync(); window.CHERRIFT_DESKTOP_MENU?.sync?.(); }, reduced() ? 0 : 150);
  }
  function start() {
    if (state.started || !q('#app')) return; state.started = true;
    new MutationObserver(records => { if (!state.changing && records.some(r => !r.target.closest?.('[data-cs-owned]'))) schedule(); }).observe(q('#app'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] }); sync();
  }
  document.addEventListener('click', event => {
    if (!state.active || !desktop() || state.changing) return;
    const b = event.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-cs-back')) back();
    else if (b.hasAttribute('data-cs-resume')) back(true);
    else if (b.closest('.cs-chrome')) {
      if (b.dataset.crystalRoute) window.UI?.open?.(b.dataset.crystalRoute);
      else if (b.dataset.crystalTool) window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);
      else if (b.hasAttribute('data-crystal-energy')) window.CHERRIFT_PREBETA?.showEnergyModal?.();
    }
  }, true);
  for (const type of ['input', 'change']) document.addEventListener(type, event => { if (state.active && event.target.closest('#settings')) schedule(); }, { passive: true });
  document.addEventListener('keydown', event => {
    if (!state.active || !desktop() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (qa('[role=dialog][aria-modal=true],dialog[open],.v082-modal,.prebeta-frame-modal,.bf-modal:not(.hidden),.auth-modal-v064:not(.hidden)').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); return; }
    const b = event.target.closest('[data-v060-settings]'); if (!b) return;
    const buttons = qa('[data-v060-settings]', q('#settings')); let index = buttons.indexOf(b);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') index++; else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') index--; else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = buttons.length - 1; else return;
    event.preventDefault(); const next = buttons[(index + buttons.length) % buttons.length]; next.focus({ preventScroll: true }); next.click(); sync();
  }, true);
  document.addEventListener('pointerover', event => {
    if (!state.active || !desktop()) return; const b = event.target.closest('#settings button');
    if (b && !b.disabled && !b.contains(event.relatedTarget) && performance.now() - state.hover > 110) { state.hover = performance.now(); if(!window.CHERRIFT_MENU_AUDIO)window.CHERRIFT_V060?.playClickSound?.(); }
  }, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  for (const e of ['cherrift:savechange', 'cherrift:languagechange']) window.addEventListener(e, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, { once: true });
  window.CHERRIFT_DESKTOP_SETTINGS = Object.freeze({ sync, isDesktop: desktop });
})();
