/* Blossom Expedition: PC presentation over the native daily and weekly quests. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_MISSIONS) return;
  const q = (s, r = document) => r?.querySelector(s);
  const qa = (s, r = document) => Array.from(r?.querySelectorAll(s) || []);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600));
  const copy = (hu, en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const visible = n => {
    if (!n) return false;
    for (let node = n; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || node.classList.contains('hidden') || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  };
  const modified = new Map();
  let active = '', queued = false, started = false, routeFocus = '', actionFocus = '';
  const number = value => Math.max(0, Number(value) || 0);
  function text(n, value) { if (n && n.textContent !== String(value)) n.textContent = String(value); }
  function attr(n, key, value) {
    if (!n) return;
    if (!modified.has(n)) modified.set(n, new Map());
    if (!modified.get(n).has(key)) modified.get(n).set(key, n.getAttribute(key));
    if (n.getAttribute(key) !== String(value)) n.setAttribute(key, String(value));
  }
  function own(tag, cls, parent) {
    const n = document.createElement(tag); n.className = cls; n.dataset.bxOwned = ''; n.dataset.i18nIgnore = 'true'; parent.append(n); return n;
  }
  function restore() {
    qa('[data-bx-owned]').forEach(n => n.remove());
    for (const [n, values] of modified) if (n.isConnected) for (const [key, value] of values) {
      if (value === null) n.removeAttribute(key); else n.setAttribute(key, value);
    }
    modified.clear(); document.body.classList.remove('blossom-missions'); active = ''; actionFocus = '';
  }
  function rewardList(reward = {}) {
    const list = [];
    const item = (value, asset, label) => { if (number(value)) list.push([number(value), asset, label]); };
    item(reward.coins, 'assets/items/coin.png', 'Coin');
    item(reward.bloomGems, 'assets/items/blossom_gem.png', 'Bloom Gem');
    item(reward.energy, '', copy('Energia', 'Energy'));
    for (const tier of ['common', 'rare', 'epic']) item(reward.chests?.[tier], `assets/items/chests/${tier}_chest.png`, `${tier[0].toUpperCase() + tier.slice(1)} Chest`);
    if (reward.drink || reward.drinks?.standard) list.push([number(reward.drinks?.standard) || 1, '', copy('Normál energiaital', 'Standard Energy Drink')]);
    return list;
  }
  function rewards(parent, entries) {
    const signature = JSON.stringify(entries);
    if (parent.dataset.signature === signature) return;
    parent.dataset.signature = signature; parent.replaceChildren();
    for (const [value, asset, label] of entries) {
      const token = document.createElement('span'); token.title = `${value} ${label}`; token.setAttribute('aria-label', `${value} ${label}`);
      if (asset) { const image = document.createElement('img'); image.src = asset; image.alt = ''; image.draggable = false; token.append(image); }
      else { const icon = document.createElement('i'); icon.textContent = label.includes('Drink') || label.includes('ital') ? '♧' : 'ϟ'; icon.setAttribute('aria-hidden', 'true'); token.append(icon); }
      const amount = document.createElement('b'); amount.textContent = value.toLocaleString(window.UI?.save?.settings?.language === 'en' ? 'en-US' : 'hu-HU'); token.append(amount); parent.append(token);
    }
  }
  function chrome(root, weekly) {
    let bar = q('.bx-chrome', root);
    if (!bar) {
      bar = own('header', 'bx-chrome', root);
      bar.innerHTML = '<button type="button" data-bx-back></button><div><small>BLOSSOM EXPEDITION</small><h1></h1></div><div class="bx-wallet"></div>';
      const tabs = own('nav', 'bx-tabs', root); tabs.setAttribute('role', 'tablist');
      for (const route of ['dailyQuests', 'weeklyV082']) { const b = document.createElement('button'); b.type = 'button'; b.dataset.bxRoute = route; b.setAttribute('role', 'tab'); tabs.append(b); }
    }
    text(q('h1', bar), copy('KÜLDETÉSEK', 'MISSIONS'));
    text(q('[data-bx-back]', bar), copy('‹ FŐMENÜ', '‹ LOBBY'));
    text(q('[data-bx-route=dailyQuests]', root), copy('❀  NAPI', '❀  DAILY'));
    text(q('[data-bx-route=weeklyV082]', root), copy('❀  HETI', '❀  WEEKLY'));
    for (const b of qa('[data-bx-route]', root)) attr(b, 'aria-selected', String(b.dataset.bxRoute === active));
    const s = window.UI?.save || {};
    rewards(q('.bx-wallet', bar), [[number(s.coins),'assets/items/coin.png','Coin'],[number(s.bloomGems ?? s.blossomGems),'assets/items/blossom_gem.png','Bloom Gem'],[number(s.energy),'',copy('Energia','Energy')]]);
    let foot = q('.bx-footer-note', root); if (!foot) foot = own('p', 'bx-footer-note', root);
    text(foot, weekly ? copy('Három heti cél · Egy közös jutalom', 'Three weekly goals · One shared reward') : copy('Öt napi cél · Külön átvétel és teljesítési bónusz', 'Five daily goals · Individual rewards and completion bonus'));
  }
  function decorateRow(row, current, target, label) {
    const max = number(target), value = Math.min(max, number(current));
    const meter = q('.v055-progress', row) || q('i', row);
    attr(meter, 'role', 'progressbar'); attr(meter, 'aria-valuemin', '0'); attr(meter, 'aria-valuemax', String(max)); attr(meter, 'aria-valuenow', String(value)); attr(meter, 'aria-label', label);
  }
  function showcase(root, weekly, completed, total, claimed) {
    const bonus = weekly ? q('.weekly-reward-v082', root) : q('#dailyBonusV055', root);
    if (!bonus) return;
    let display = q('.bx-bonus-display', bonus);
    if (!display) {
      display = own('div', 'bx-bonus-display', bonus);
      display.innerHTML = '<h2></h2><div class="bx-ring"><b></b><small></small></div><div class="bx-chest" aria-hidden="true"></div><p></p><div class="bx-bonus-rewards"></div>';
    }
    text(q('h2', display), weekly ? copy('HETI BÓNUSZJUTALOM', 'WEEKLY COMPLETION REWARD') : copy('NAPI BÓNUSZJUTALOM', 'DAILY COMPLETION REWARD'));
    const ring = q('.bx-ring', display), percent = total ? Math.min(100, completed / total * 100) : 0;
    if (ring.style.getPropertyValue('--bx-progress') !== `${percent}%`) ring.style.setProperty('--bx-progress', `${percent}%`);
    text(q('b', ring), `${completed} / ${total}`);
    text(q('small', ring), weekly ? copy('CÉL TELJESÍTVE', 'GOALS COMPLETE') : copy('JUTALOM ÁTVÉVE', 'REWARDS CLAIMED'));
    text(q('p', display), claimed ? copy('A bónuszjutalmat már átvetted.', 'Completion reward already claimed.') : weekly ? copy('Teljesítsd mindhárom heti célt a közös jutalomért.', 'Complete all three weekly goals to claim the shared reward.') : copy('Vedd át az összes napi cél jutalmát a bónusz feloldásához.', 'Claim every daily mission reward to unlock this bonus.'));
    const image = `url("assets/ui/gacha/${weekly ? 'rare' : 'common'}-states-pc.webp")`;
    const chest = q('.bx-chest', display); if (chest.style.backgroundImage !== image) chest.style.backgroundImage = image;
    rewards(q('.bx-bonus-rewards', display), rewardList(weekly ? {coins:3500,bloomGems:20,chests:{rare:1},drinks:{standard:1}} : {coins:500,chests:{common:1},energy:15}));
    const button = weekly ? q('[data-v082-claim-weekly]', bonus) : q('#dailyBonusClaimV055', bonus);
    attr(button, 'data-bx-label', claimed ? copy('✓ ÁTVÉVE', '✓ CLAIMED') : completed < total ? copy('◇ BÓNUSZ ZÁROLVA', '◇ BONUS LOCKED') : copy('BÓNUSZ ÁTVÉTELE', 'CLAIM BONUS'));
    attr(button, 'aria-label', button?.dataset.bxLabel || '');
  }
  function sync() {
    const root = ['dailyQuests', 'weeklyV082'].map(id => q(`#${id}`)).find(visible);
    if (!desktop() || !root || document.body.classList.contains('is-playing')) { if (active) restore(); return; }
    if (active && active !== root.id) restore();
    active = root.id;
    if (!document.body.classList.contains('blossom-missions')) document.body.classList.add('blossom-missions');
    for (const n of modified.keys()) if (!n.isConnected) modified.delete(n);
    const weekly = active === 'weeklyV082'; attr(root, 'role', 'tabpanel'); chrome(root, weekly);
    attr(q('.bx-tabs', root), 'aria-label', copy('Küldetéscsoportok', 'Mission groups'));
    for (const b of qa('[data-bx-route]', root)) attr(b, 'aria-controls', b.dataset.bxRoute);
    if (weekly) {
      const rows = qa('.weekly-goals-v082 article', root);
      let completed = 0;
      for (const row of rows) {
        const values = q('b', row)?.textContent.match(/\d+/g) || []; const [value, goal] = values.map(Number);
        if (goal && value >= goal) completed++;
        decorateRow(row, value, goal, q('small', row)?.textContent || '');
        let status = q('.bx-week-status', row); if (!status) status = own('small', 'bx-week-status', row);
        text(status, goal && value >= goal ? copy('✓ TELJESÍTVE', '✓ COMPLETE') : copy('FOLYAMATBAN', 'IN PROGRESS'));
      }
      // The native weekly button is the authoritative claimed state; save format differs for Guest/online.
      const online = !!window.CHERRIFT_AUTH?.getState?.().onlinePolicy;
      const save = window.UI?.save || {};
      showcase(root, true, completed, rows.length, !!(online ? save.weekly : save.weeklyV082)?.claimed);
    } else {
      const quests = window.UI?.save?.daily?.quests || [];
      const rows = qa('#dailyListV055>.v055-card', root);
      for (const row of rows) {
        const button = q('[data-daily-claim]', row), quest = quests.find(item => item.id === button?.dataset.dailyClaim);
        if (quest) attr(q(':scope>span', row), 'data-bx-icon', ({kills:'⚔',runs:'▶',clears:'⌖',coins:'◉',chests:'◇',gear:'✥',bosses:'♛'})[quest.type] || '◇');
        const values = q('p', row)?.textContent.match(/\d+/g) || []; decorateRow(row, values[0], values[1], q('h3', row)?.textContent || '');
        if (quest) { let tiles = q('.bx-row-rewards', row); if (!tiles) tiles = own('div', 'bx-row-rewards', row); rewards(tiles, rewardList(quest.reward)); }
        attr(button, 'data-bx-label', quest?.claimed ? copy('✓ ÁTVÉVE', '✓ CLAIMED') : button?.disabled ? copy('FOLYAMATBAN', 'IN PROGRESS') : copy('ÁTVÉTEL', 'CLAIM'));
        attr(button, 'aria-label', `${q('h3', row)?.textContent || ''}: ${button?.dataset.bxLabel || ''}`);
      }
      const all = q('#dailyClaimAllV055', root); attr(all, 'data-bx-label', copy('❀ ÖSSZES ÁTVÉTELE', '❀ CLAIM ALL')); attr(all, 'aria-label', copy('Összes elérhető napi jutalom átvétele', 'Claim all available daily rewards'));
      const reroll = q('#dailyRerollV055', root); attr(reroll, 'data-bx-label', `${copy('ÚJRASORSOLÁS', 'REROLL')} (${number(window.UI?.save?.daily?.rerolls)})`); attr(reroll, 'aria-label', reroll?.dataset.bxLabel || '');
      showcase(root, false, quests.filter(item => item.claimed).length, quests.length, !!window.UI?.save?.daily?.claimedBonus);
    }
    if (routeFocus) { q(`[data-bx-route="${routeFocus}"]`, root)?.focus({preventScroll:true}); routeFocus = ''; }
    if (actionFocus) {
      const button = qa('[data-daily-claim]', root).find(n => n.dataset.dailyClaim === actionFocus);
      if (button && !button.disabled) button.focus({preventScroll:true});
      else if (button) { const row = button.closest('article'); attr(row, 'tabindex', '-1'); row.focus({preventScroll:true}); }
      actionFocus = '';
    }
  }
  function schedule() { if (queued) return; queued = true; queueMicrotask(() => { queued = false; sync(); }); }
  function back() {
    const root = q('#' + active), weekly = active === 'weeklyV082';
    const native = q('.panel-head .back', root);
    if (native) native.click(); else window.UI?.open?.('menu');
    // An older capture-phase router can consume native Back before weekly cleanup.
    // Keep the departing weekly panel closed; the native open route reopens it normally.
    if (weekly && root && !root.classList.contains('hidden')) root.classList.add('hidden');
    q('#menu')?.classList.remove('hidden');
    sync();
    window.CHERRIFT_DESKTOP_MENU?.sync?.();
  }
  function navigate(route) {
    if (active === 'weeklyV082' && route !== active) back();
    window.UI?.open?.(route); routeFocus = route; sync();
  }
  document.addEventListener('click', event => {
    if (!active || !desktop()) return;
    const b = event.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-bx-back')) back();
    if (b.dataset.bxRoute) navigate(b.dataset.bxRoute);
    if (b.dataset.dailyClaim) actionFocus = b.dataset.dailyClaim;
  }, true);
  window.addEventListener('keydown', event => {
    if (!active || !desktop() || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (qa('[role="dialog"][aria-modal="true"],.prebeta-frame-modal,.v082-modal,.obtained-overlay-v070').some(visible)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); }
    if (event.target.closest('.bx-tabs') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); const route = event.key === 'Home' || event.key === 'ArrowLeft' ? 'dailyQuests' : 'weeklyV082'; navigate(route);
    }
  }, true);
  function start() {
    if (started || !q('#app')) return; started = true;
    new MutationObserver(records => { if (records.some(r => !r.target.closest?.('[data-bx-owned]'))) schedule(); }).observe(q('#app'), {subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
    sync();
  }
  window.addEventListener('resize', schedule, {passive:true});
  for (const name of ['cherrift:savechange','cherrift:languagechange','cherrift:economychange']) window.addEventListener(name, schedule);
  window.addEventListener('cherrift:runtime-clean-ready', start, {once:true});
  window.CHERRIFT_DESKTOP_MISSIONS = Object.freeze({sync,isDesktop:desktop});
})();
