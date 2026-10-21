/* Blossom Emporium: presentation over the native shop. Purchases remain native. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_SHOP) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const visible = n => !!n && !n.hidden && !n.classList.contains('hidden') && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
  const modified = new Map();
  let active = false, queued = false, started = false, returnFocus = null, modalOpen = false, categoryFocus = '';
  function remember(n, key, value) {
    if (!n) return;
    if (!modified.has(n)) modified.set(n, new Map());
    if (!modified.get(n).has(key)) modified.get(n).set(key, n.getAttribute(key));
    if (n.getAttribute(key) !== value) n.setAttribute(key, value);
  }
  function text(n, value) { if (n && n.textContent !== value) n.textContent = value; }
  function add(tag, cls, parent) {
    const n = document.createElement(tag); n.className = cls; n.dataset.beOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n;
  }
  function restore() {
    qa('[data-be-owned]').forEach(n => n.remove());
    for (const [n, attrs] of modified) if (n.isConnected) for (const [key, value] of attrs) {
      if (value === null) n.removeAttribute(key); else n.setAttribute(key, value);
    }
    modified.clear(); document.body.classList.remove('blossom-shop'); active = false; modalOpen = false; returnFocus = null; categoryFocus = '';
  }
  function sync() {
    const root = q('#chests'), catalogue = q('.shop-catalog-v098', root);
    if (!desktop() || !visible(root) || !catalogue || root.dataset.themeEconomyRoute !== 'shop' || document.body.classList.contains('is-playing')) {
      if (active) restore(); return;
    }
    active = true;
    if (!document.body.classList.contains('blossom-shop')) document.body.classList.add('blossom-shop');
    for (const n of modified.keys()) if (!n.isConnected) modified.delete(n);
    let chrome = q('.be-chrome', root);
    if (!chrome) {
      chrome = add('header', 'be-chrome', root);
      chrome.innerHTML = '<button type="button" data-be-back></button><div><small>BLOSSOM EMPORIUM</small><h1></h1></div><p></p>';
    }
    text(q('[data-be-back]', chrome), copy('‹ FŐMENÜ', '‹ LOBBY'));
    text(q('h1', chrome), copy('BOLT', 'SHOP'));
    text(q('p', chrome), copy('Kincsek a következő kalandodhoz', 'Treasures for your next adventure'));
    let title = q('.be-section-title', catalogue);
    if (!title) title = add('div', 'be-section-title', catalogue);
    const selected = q('[data-v080-shop-category].active', catalogue);
    text(title, selected?.textContent || copy('Ajánlatok', 'Offers'));
    const nav = q('.shop-categories-v096', catalogue);
    if (nav) remember(nav, 'aria-label', copy('Görgethető boltkategóriák', 'Scrollable shop categories'));
    for (const card of qa('.shop-item-v098', catalogue)) {
      let hint = q('.be-card-hint', card);
      if (!hint) hint = add('p', 'be-card-hint', card);
      text(hint, copy('A részletekért kattints a tárgyra', 'Select item to view details'));
    }
    const modal = q('#shopInfoModalV098');
    const opened = visible(modal);
    if (opened) {
      remember(modal, 'role', 'dialog'); remember(modal, 'aria-modal', 'true');
      remember(modal, 'aria-labelledby', 'beProductTitle');
      remember(q('h2', modal), 'id', 'beProductTitle');
      if (!modalOpen || !modal.contains(document.activeElement)) q('[data-v098-shop-info-close]', modal)?.focus({preventScroll: true});
    } else if (modalOpen && returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    modalOpen = opened;
    if (categoryFocus) { q(`[data-v080-shop-category="${categoryFocus}"]`, catalogue)?.focus({preventScroll: true}); categoryFocus = ''; }
  }
  function schedule() { if (queued) return; queued = true; queueMicrotask(() => { queued = false; sync(); }); }
  function back() { q('#shopInfoModalV098')?.classList.add('hidden'); window.UI?.open?.('menu'); sync(); }
  document.addEventListener('click', event => {
    if (!active || !desktop()) return;
    const b = event.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-be-back')) back();
    if (b.hasAttribute('data-v098-shop-info')) returnFocus = b;
    if (b.hasAttribute('data-v080-shop-category')) categoryFocus = b.dataset.v080ShopCategory;
  }, true);
  document.addEventListener('keydown', event => {
    if (!active || !desktop() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const modal = q('#shopInfoModalV098');
    if (visible(modal)) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); modal.classList.add('hidden'); sync(); }
      if (event.key === 'Tab') {
        const stops = qa('button:not(:disabled),[tabindex="0"]', modal).filter(visible), first = stops[0], last = stops.at(-1);
        if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
      return;
    }
    if (qa('[role="dialog"][aria-modal="true"],.reward-modal-v070,.prebeta-frame-modal').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
    const nav = event.target.closest('.shop-categories-v096');
    if (nav && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const buttons = qa('button:not(:disabled)', nav), index = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      event.preventDefault(); buttons[next]?.focus(); buttons[next]?.scrollIntoView?.({block: 'nearest'});
    }
  }, true);
  function start() {
    if (started || !q('#app')) return; started = true;
    new MutationObserver(records => {
      if (records.some(r => !r.target.closest?.('[data-be-owned]'))) schedule();
    }).observe(q('#app'), {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-theme-economy-route']});
    // Product details are appended outside #app by the native renderer.
    new MutationObserver(schedule).observe(document.body, {childList: true});
    document.addEventListener('click', schedule); sync();
  }
  window.addEventListener('resize', schedule, {passive: true});
  for (const e of ['cherrift:savechange', 'cherrift:languagechange', 'cherrift:economychange']) window.addEventListener(e, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, {once: true});
  window.CHERRIFT_DESKTOP_SHOP = Object.freeze({sync, isDesktop: desktop});
})();
