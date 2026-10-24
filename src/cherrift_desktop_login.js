/* Crystal Calendar: presentation over the existing seven-day Login Rewards. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_LOGIN) return;
  const q = (selector, root = document) => root?.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll(selector) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const dayKey = () => new Date().toISOString().slice(0, 10);
  const visible = node => {
    if (!node) return false;
    for (let n = node; n; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (n.hidden || n.classList.contains('hidden') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  };
  const modified = new Map();
  let started = false, active = false, queued = false, moved = null, calendarDay = '', firstDay = '', actionFocus = false;
  function text(node, value) { if (node && node.textContent !== String(value)) node.textContent = String(value); }
  function attr(node, key, value) {
    if (!modified.has(node)) modified.set(node, new Map());
    if (!modified.get(node).has(key)) modified.get(node).set(key, node.getAttribute(key));
    if (node.getAttribute(key) !== String(value)) node.setAttribute(key, String(value));
  }
  function own(tag, className, parent) {
    const node = document.createElement(tag);
    node.className = className; node.dataset.lrOwned = ''; node.dataset.i18nIgnore = 'true'; parent.append(node); return node;
  }
  function returnButton() {
    if (!moved) return;
    const { button, parent, next } = moved;
    if (parent.isConnected) parent.insertBefore(button, next?.parentNode === parent ? next : null);
    else button.remove();
    moved = null;
  }
  function restore() {
    returnButton();
    qa('[data-lr-owned]').forEach(node => node.remove());
    for (const [node, attributes] of modified) if (node.isConnected) for (const [key, value] of attributes) {
      if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
    }
    modified.clear(); document.body.classList.remove('crystal-login');
    active = false; calendarDay = ''; firstDay = ''; actionFocus = false;
  }
  function chrome(root) {
    if (q('.lr-chrome', root)) return;
    const header = own('header', 'lr-chrome', root);
    header.innerHTML = '<img src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><div><small>CHERRIFT · CRYSTAL CALENDAR</small><h1>LOGIN REWARDS</h1></div><button type="button" data-lr-back></button>';
    own('div', 'lr-calendar-frame', root).setAttribute('aria-hidden', 'true');
    const footer = own('footer', 'lr-footer', root);
    footer.innerHTML = '<div><small data-lr-current></small><p data-lr-note></p></div><div class="lr-action"></div>';
    const reset = own('p', 'lr-reset', root);
    reset.innerHTML = '<span></span> <time></time>';
    own('p', 'lr-progress', root);
  }
  // Illustrations follow the native reward label; quantities are never duplicated.
  function artwork(card) {
    const value = q(':scope > b', card)?.textContent || '';
    let art = q('.lr-art', card);
    if (!art) { art = own('div', 'lr-art', card); art.setAttribute('aria-hidden', 'true'); }
    let label = q('.lr-reward-label', card); if (!label) label = own('p', 'lr-reward-label', card);
    text(label, value.replaceAll('🪙', copy('érme', 'Coin')).replaceAll('💎', 'Bloom Gem').replaceAll('🟢 Chest', 'Common Chest').replaceAll('🔵 Chest', 'Rare Chest').replaceAll('🧪 small', copy('· Kis energiaital', '· Small Energy Drink')).replaceAll('🧪 standard', copy('· Normál energiaital', '· Standard Energy Drink')));
    if (art.dataset.source === value) return;
    art.dataset.source = value; art.replaceChildren();
    const assets = [];
    if (value.includes('🪙')) assets.push('assets/items/coin.png');
    if (value.includes('💎')) assets.push('assets/items/blossom_gem.png');
    if (value.includes('🟢')) assets.push('assets/items/chests/common_chest.png');
    if (value.includes('🔵')) assets.push('assets/items/chests/rare_chest.png');
    if (value.includes('🧪')) assets.push('assets/items/buffs/support_drink.png');
    for (const src of assets) { const img = document.createElement('img'); img.src = src; img.alt = ''; img.draggable = false; art.append(img); }
    if (!art.childElementCount) { const icon = document.createElement('span'); icon.textContent = '✦'; art.append(icon); }
  }
  function countdown() {
    if (!active || !desktop() || !visible(q('#loginRewards'))) return;
    const key = dayKey();
    if (calendarDay && calendarDay !== key) { calendarDay = key; window.UI?.open?.('loginRewards'); schedule(); return; }
    const now = Date.now(), seconds = Math.max(0, Math.ceil((Date.parse(key + 'T00:00:00Z') + 86400000 - now) / 1000));
    const stamp = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    const reset = q('#loginRewards .lr-reset');
    text(q('span', reset), copy('Napi váltás (UTC):', 'Daily reset (UTC):')); text(q('time', reset), stamp);
  }
  function sync() {
    const root = q('#loginRewards'), grid = q('#loginListV055', root);
    if (!desktop() || !visible(root) || !grid || document.body.classList.contains('is-playing')) { if (active) restore(); return; }
    const cards = qa(':scope > .v055-login', grid);
    if (cards.length !== 7) { if (active) restore(); return; }
    const currentFirst = String(window.UI?.save?.login?.firstDay || '');
    if (active && calendarDay && calendarDay !== dayKey()) { calendarDay = dayKey(); window.UI?.open?.('loginRewards'); schedule(); return; }
    if (active && firstDay !== currentFirst) { firstDay = currentFirst; window.UI?.open?.('loginRewards'); schedule(); return; }
    firstDay = currentFirst; calendarDay = dayKey(); active = true;
    if(!document.body.classList.contains('crystal-login'))document.body.classList.add('crystal-login'); window.CHERRIFT_DESKTOP_MENU?.sync?.();
    for (const node of modified.keys()) if (!node.isConnected) modified.delete(node);
    if (moved && !moved.parent.isConnected) returnButton();
    chrome(root);
    const today = cards.findIndex(card => card.classList.contains('today'));
    const claimed = window.UI?.save?.login?.claimed || {};
    const start = Date.parse(calendarDay + 'T00:00:00Z') - Math.max(0, today) * 86400000;
    let currentButton = null;
    for (const [index, card] of cards.entries()) {
      const button = q('[data-login-day]', card) || (moved?.parent === card ? moved.button : null);
      const key = new Date(start + index * 86400000).toISOString().slice(0, 10);
      const state = today < 0 ? 'locked' : index === today ? (button?.disabled ? 'claimed' : 'available') : index > today ? 'locked' : claimed[key] ? 'claimed' : 'missed';
      attr(card, 'data-lr-day', index + 1); attr(card, 'data-lr-state', state);
      attr(card, 'aria-label', copy(`${index + 1}. nap`, `Day ${index + 1}`));
      artwork(card);
      let status = q('.lr-state', card); if (!status) status = own('span', 'lr-state', card);
      const labels = {available:copy('✦ MA ÁTVEHETŐ','✦ AVAILABLE TODAY'),claimed:copy('✓ ÁTVÉVE','✓ CLAIMED'),locked:copy('◆ ZÁRVA','◆ LOCKED'),missed:copy('— KIMARADT','— MISSED')};
      text(status, labels[state]);
      if (index === 6 && !q('.lr-grand-label', card)) own('small', 'lr-grand-label', card);
      text(q('.lr-grand-label', card), copy('A HÉT ZÁRÓJUTALMA', 'WEEK FINALE'));
      if (index === today) currentButton = button;
    }
    if (currentButton && moved?.button !== currentButton) {
      returnButton(); moved = {button:currentButton, parent:currentButton.parentNode, next:currentButton.nextSibling};
      q('.lr-action', root).append(currentButton);
    }
    if (!currentButton && moved) returnButton();
    if (currentButton) {
      attr(currentButton, 'data-lr-label', currentButton.disabled ? copy('MA MÁR ÁTVETTED','ALREADY CLAIMED TODAY') : copy('JUTALOM ÁTVÉTELE','CLAIM REWARD'));
      attr(currentButton, 'aria-label', currentButton.getAttribute('data-lr-label'));
    }
    text(q('[data-lr-back]', root), copy('‹ FŐMENÜ','‹ LOBBY'));
    text(q('[data-lr-current]', root), today < 0 ? copy('HETI JUTALMAK','WEEKLY REWARDS') : copy(`MA: ${today + 1}. NAP`,`TODAY: DAY ${today + 1}`));
    text(q('[data-lr-note]', root), copy('Hétnapos, ismétlődő jutalomsorozat.', 'A seven-day repeating reward track.'));
    text(q('.lr-progress', root), today < 0 ? '— / 7' : `${today + 1} / 7`);
    countdown();
    if (actionFocus && currentButton) { currentButton.focus({preventScroll:true}); actionFocus = false; }
  }
  function schedule() { if (!queued) { queued = true; queueMicrotask(() => { queued = false; sync(); }); } }
  function back() { window.UI?.open?.('menu'); sync(); window.CHERRIFT_DESKTOP_MENU?.sync?.(); }
  window.addEventListener('click', event => {
    if (!active || !desktop()) return;
    const button = event.target.closest?.('button');
    if (button?.hasAttribute('data-lr-back')) back();
    if (button?.hasAttribute('data-login-day')) actionFocus = true;
  }, true);
  window.addEventListener('keydown', event => {
    if (!active || !desktop() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (qa('[role=dialog][aria-modal=true],.v082-modal,.prebeta-frame-modal,#obtainedOverlayV098').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
  }, true);
  function start() {
    if (started || !q('#app')) return; started = true;
    new MutationObserver(records => { if (records.some(r => r.target.matches?.('[data-login-day]') || !r.target.closest?.('[data-lr-owned]'))) schedule(); })
      .observe(q('#app'), {subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
    setInterval(countdown, 1000); sync();
  }
  for (const name of ['resize','cherrift:savechange','cherrift:languagechange','cherrift:economychange']) window.addEventListener(name, schedule);
  window.addEventListener('focus', () => { if (active) countdown(); });
  window.addEventListener('cherrift:runtime-clean-ready', start, {once:true});
  window.CHERRIFT_DESKTOP_LOGIN = Object.freeze({sync,isDesktop:desktop});
  if (window.CHERRIFT_RUNTIME) start();
})();
