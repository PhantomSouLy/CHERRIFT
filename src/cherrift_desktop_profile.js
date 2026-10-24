/* Crystal Identity: PC presentation over the native Profile panel.
   Identity, statistics, titles, frames and account operations retain their owners. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_PROFILE) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const reduced = () => !!window.UI?.save?.settings?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = n => !!n && !n.hidden && !n.classList.contains('hidden') && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
  const text = (n, value) => { if (n && n.textContent !== String(value)) n.textContent = value; };
  const state = { started: false, active: false, queued: false, exit: 0, hover: 0, attrs: new Map(), modal: null, returnFocus: '', painted: null };
  const animations = new Set();
  function make(tag, cls, parent) { const n = document.createElement(tag); n.className = cls; n.dataset.cpOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n; }
  function attr(n, key, value) {
    if (!n) return;
    if (!state.attrs.has(n)) state.attrs.set(n, new Map());
    const before = state.attrs.get(n); if (!before.has(key)) before.set(key, n.getAttribute(key));
    if (value === null) n.removeAttribute(key); else if (n.getAttribute(key) !== value) n.setAttribute(key, value);
  }
  function animate(n, frames, duration = 280) {
    if (!n || reduced()) return;
    const a = n.animate?.(frames, { duration, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (a) { animations.add(a); a.finished?.catch(() => {}).finally(() => animations.delete(a)); }
  }
  function restore() {
    clearTimeout(state.exit); state.exit = 0; animations.forEach(a => a.cancel()); animations.clear();
    qa('[data-cp-owned]').forEach(n => n.remove());
    for (const [n, values] of state.attrs) for (const [key, value] of values) { if (value === null) n.removeAttribute(key); else n.setAttribute(key, value); }
    state.attrs.clear(); state.active = false; state.modal = null; state.painted = null;
    document.body.classList.remove('crystal-profile');
  }
  function chrome(root) {
    let bar = q('.cp-chrome', root);
    if (!bar) {
      const scene = make('div', 'cp-scenery', root); scene.setAttribute('aria-hidden', 'true');
      const ornament = make('img', 'cp-ornament', root); ornament.src = 'assets/ui/profile/crystal-identity-pc.webp'; ornament.alt = ''; ornament.draggable = false;
      bar = make('header', 'cp-chrome', root); bar.innerHTML = '<img class="cp-logo" src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div class="cp-heading"><small>CHERRIFT · PLAYER</small><h1>PROFILE</h1></div><button type="button" class="cp-back" data-cp-action="back"></button>';
      const petals = make('div', 'cp-petals', root); petals.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 8; i++) { const p = document.createElement('i'); p.style.setProperty('--i', i); petals.append(p); }
    }
    text(q('.cp-back', bar), copy('‹ FŐMENÜ', '‹ LOBBY'));
    let nav = q('.cp-navigation', root);
    if (!nav) { nav = make('nav', 'cp-navigation', root); nav.innerHTML = '<button type="button" aria-current="page" disabled></button><button type="button" data-cp-action="titles"></button><button type="button" data-cp-action="frames"></button>'; }
    nav.setAttribute('aria-label', copy('Profilnézetek', 'Profile views'));
    text(q('[aria-current]', nav), copy('ÁTTEKINTÉS', 'OVERVIEW')); text(q('[data-cp-action=titles]', nav), copy('CÍMEK', 'TITLES')); text(q('[data-cp-action=frames]', nav), copy('KERETEK', 'FRAMES'));
    q('[data-cp-action=titles]', nav).disabled = !q('[data-profile-title-edit]', root);
    q('[data-cp-action=frames]', nav).disabled = typeof q('.profile-avatar-bf', root)?.onclick !== 'function';
    let ribbon = q('.cp-title-ribbon', root);
    if (!ribbon) { ribbon = make('button', 'cp-title-ribbon', root); ribbon.type = 'button'; ribbon.dataset.cpAction = 'titles'; }
    text(ribbon, q('.profile-title-row-bf>span', root)?.textContent || copy('Nincs aktív cím', 'No active title'));
    ribbon.disabled = !q('[data-profile-title-edit]', root);
    ribbon.setAttribute('aria-label', `${copy('Cím kiválasztása', 'Choose title')}: ${ribbon.textContent}`);
    const source = q('#crystalDesktopMenu>.crystal-topbar');
    if (source && bar.dataset.header !== source.innerHTML) {
      const focused = q('.crystal-topbar :focus', bar), key = focused?.dataset.crystalRoute || focused?.dataset.crystalTool;
      q('.crystal-topbar', bar)?.remove(); const clone = source.cloneNode(true); qa('[id]', clone).forEach(n => n.removeAttribute('id')); bar.append(clone); bar.dataset.header = source.innerHTML;
      if (key) q(`[data-crystal-route="${key}"],[data-crystal-tool="${key}"]`, clone)?.focus({ preventScroll: true });
    }
  }
  function details(root) {
    const avatar = q('.profile-avatar-bf', root);
    if (avatar && typeof avatar.onclick === 'function') {
      attr(avatar, 'role', 'button'); attr(avatar, 'tabindex', '0'); attr(avatar, 'aria-label', copy('Profilkeret kiválasztása', 'Choose profile frame'));
    }
    const icons = ['assets/ui/achivement_gold.png', 'assets/ui/gear_icon.png', 'assets/ui/home_icon.png', 'assets/ui/elemental_resonance/common/resonance_point.png', 'assets/ui/gear_icon.png', 'assets/ui/gacha_icon.png', 'assets/ui/gear_icon.png', 'assets/ui/skill_icons/cherry_default_skill_icon.png'];
    qa('.profile-stat-bf', root).forEach((card, index) => { if (!q('.cp-stat-icon', card)) { const image = make('img', 'cp-stat-icon', card); image.src = icons[index % icons.length]; image.alt = ''; image.draggable = false; } });
    let xp = q('.cp-xp', root);
    if (!xp) { xp = make('section', 'cp-xp', root); xp.innerHTML = '<div><small></small><b></b></div><progress max="1" value="0"></progress>'; }
    const account = window.UI?.save?.account || {}, current = Math.max(0, Number(account.xp) || 0);
    const nativeNeed = Number(account.xpNext || window.CHERRIFT_BALANCE?.xpToNext?.(account.level));
    const valid = Number.isFinite(nativeNeed) && nativeNeed > 0; xp.hidden = !valid;
    if (valid) { text(q('small', xp), copy('KÖVETKEZŐ SZINT', 'NEXT LEVEL')); text(q('b', xp), `${Math.floor(current)} / ${Math.floor(nativeNeed)} XP`); const progress = q('progress', xp); progress.max = nativeNeed; progress.value = Math.min(current, nativeNeed); progress.setAttribute('aria-label', copy('Szintlépési haladás', 'Level progress')); }
    let actions = q('.cp-account', root);
    if (!actions) { actions = make('section', 'cp-account', root); actions.innerHTML = '<h2></h2><div><button type="button" data-cp-action="name"></button><button type="button" data-cp-action="redeem"></button><button type="button" data-cp-action="account"></button></div>'; }
    text(q('h2', actions), copy('FIÓK', 'ACCOUNT'));
    for (const [key, hu, en] of [['name', 'NÉVVÁLTÁS', 'EDIT NAME'], ['redeem', 'KÓDBEVÁLTÁS', 'REDEEM CODE'], ['account', 'FIÓK', 'ACCOUNT']]) text(q(`[data-cp-action="${key}"]`, actions), copy(hu, en));
    q('[data-cp-action=name]', actions).disabled = !q('[data-profile-name-edit]', root);
    q('[data-cp-action=redeem]', actions).disabled = !q('#redeemBugfixModalV0941');
    const grid = q('.profile-stats-bf', root);
    if (grid && state.painted !== grid) { animate(grid, [{ opacity: .3, transform: 'translate3d(20px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }]); state.painted = grid; }
  }
  const modalNodes = () => qa('.bf-modal,.prebeta-frame-modal').filter(visible);
  const controls = modal => qa('button,input,select,textarea,a[href],[tabindex="0"]', modal).filter(n => visible(n) && !n.disabled);
  function modalState(root) {
    const modal = modalNodes().at(-1) || null;
    attr(root, 'inert', modal ? '' : null);
    if (modal) {
      attr(modal, 'role', 'dialog'); attr(modal, 'aria-modal', 'true'); attr(modal, 'tabindex', '-1');
      const heading = q('h2,h3', modal); if (heading) attr(modal, 'aria-label', heading.textContent);
      if (state.modal !== modal || !modal.contains(document.activeElement)) (controls(modal)[0] || modal).focus({ preventScroll: true });
    } else if (state.modal && state.returnFocus) (state.returnFocus === 'avatar' ? q('.profile-avatar-bf', root) : q(`[data-cp-action="${state.returnFocus}"]`, root))?.focus({ preventScroll: true });
    state.modal = modal;
  }
  function sync() {
    const root = q('#profileBugfixV0941');
    if (!desktop() || !visible(root)) { if (state.active) restore(); return; }
    if (!q('.profile-hero-bf', root)) return;
    state.active = true; if(!document.body.classList.contains('crystal-profile'))document.body.classList.add('crystal-profile'); chrome(root); details(root); modalState(root);
  }
  function schedule() { if (state.queued) return; state.queued = true; queueMicrotask(() => { state.queued = false; sync(); }); }
  function back() {
    if (state.exit || !state.active || modalNodes().length) return;
    const root = q('#profileBugfixV0941'); animate(q('.profile-stats-bf', root), [{ opacity: 1 }, { opacity: 0, transform: 'translate3d(16px,0,0)' }], 150);
    state.exit = setTimeout(() => { state.exit = 0; if (!desktop() || !visible(root)) return; window.UI?.open?.('menu'); sync(); window.CHERRIFT_DESKTOP_MENU?.sync?.(); }, reduced() ? 0 : 150);
  }
  function start() {
    if (state.started || !q('#app')) return; state.started = true;
    new MutationObserver(records => { if (records.some(r => !r.target.closest?.('[data-cp-owned]') && (r.target === q('#app') || r.target.parentElement === q('#app') || r.target.closest?.('#profileBugfixV0941,.bf-modal,.prebeta-frame-modal') || (r.target === document.body && r.type === 'childList')))) schedule(); }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] }); sync();
  }
  document.addEventListener('click', event => {
    if (!state.active || !desktop()) return;
    if (event.target.closest('#profileBugfixV0941 .profile-avatar-bf')) state.returnFocus = 'avatar';
    const b = event.target.closest('button'); if (!b || b.disabled) return;
    const root = q('#profileBugfixV0941'), action = b.dataset.cpAction;
    if (action) {
      state.returnFocus = action;
      if (action === 'back') back();
      else if (action === 'titles') q('[data-profile-title-edit]', root)?.click();
      else if (action === 'frames') q('.profile-avatar-bf', root)?.click();
      else if (action === 'name') q('[data-profile-name-edit]', root)?.click();
      else if (action === 'redeem') q('#redeemBugfixModalV0941')?.classList.remove('hidden');
      else if (action === 'account') { window.UI?.open?.('settings'); window.CHERRIFT_DESKTOP_SETTINGS?.sync?.(); q('[data-v060-settings="account"]', q('#settings'))?.click(); window.CHERRIFT_DESKTOP_SETTINGS?.sync?.(); }
      schedule();
    } else if (b.closest('.cp-chrome')) {
      if (b.dataset.crystalRoute) window.UI?.open?.(b.dataset.crystalRoute);
      else if (b.dataset.crystalTool) window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);
      else if (b.hasAttribute('data-crystal-energy')) window.CHERRIFT_PREBETA?.showEnergyModal?.();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (!state.active || !desktop()) return;
    const modal = modalNodes().at(-1);
    if (modal) {
      if (event.key === 'Escape') { const close = q('[data-title-stats-close],[data-title-close],[data-name-close],[data-redeem-close],[data-prebeta-close]', modal); if (close) { event.preventDefault(); event.stopImmediatePropagation(); close.click(); schedule(); } }
      else if (event.key === 'Tab') { const list = controls(modal), index = list.indexOf(document.activeElement); if (!list.length) { event.preventDefault(); modal.focus(); } else if (event.shiftKey && index <= 0) { event.preventDefault(); list.at(-1).focus(); } else if (!event.shiftKey && (index < 0 || index === list.length - 1)) { event.preventDefault(); list[0].focus(); } }
      return;
    }
    if (qa('[role=dialog][aria-modal=true],dialog[open]').some(visible)) return;
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
    else if (event.target.matches('.profile-avatar-bf') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); state.returnFocus = 'frames'; event.target.click(); schedule(); }
  }, true);
  document.addEventListener('pointerover', event => { if (!state.active || !desktop()) return; const b = event.target.closest('#profileBugfixV0941 button'); if (b && !b.disabled && !b.contains(event.relatedTarget) && performance.now() - state.hover > 100) { state.hover = performance.now(); window.CHERRIFT_V060?.playClickSound?.(); } }, { passive: true });
  window.addEventListener('resize', schedule, { passive: true }); for (const e of ['cherrift:savechange', 'cherrift:languagechange']) window.addEventListener(e, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, { once: true });
  window.CHERRIFT_DESKTOP_PROFILE = Object.freeze({ sync, isDesktop: desktop });
})();
