/* Sakura Path: presentation follows native progress; boot owns readiness/input. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_LOADING) return;
  const q = (selector, root = document) => root?.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root?.querySelectorAll(selector) || []);
  const desktop = () => innerWidth >= 821 && !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const copy = (hu, en) => (window.UI?.save?.settings?.language === 'en' || window.CHERRIFT_LOCALIZATION?.language?.() === 'en') ? en : hu;
  const ART = 'assets/ui/loading/sakura-path/';
  const attrs = new Map();
  let started = false, queued = false;
  function attr(node, key, value) {
    if (!node) return;
    if (!attrs.has(node)) attrs.set(node, new Map());
    if (!attrs.get(node).has(key)) attrs.get(node).set(key, node.getAttribute(key));
    if (node.getAttribute(key) !== String(value)) node.setAttribute(key, String(value));
  }
  function own(tag, cls, parent) {
    const node = document.createElement(tag);
    node.className = cls; node.dataset.mljOwned = ''; node.dataset.i18nIgnore = 'true';
    parent.append(node); return node;
  }
  function text(node, value) { if (node && node.textContent !== value) node.textContent = value; }
  function restore() {
    qa('[data-mlj-owned]').forEach(node => node.remove());
    for (const [node, values] of attrs) if (node.isConnected) for (const [key, value] of values) {
      if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
    }
    attrs.clear();
  }
  function scene(root) {
    let host = q('.sakura-scene', root);
    if (host) return host;
    host = own('div', 'sakura-scene', root); host.setAttribute('aria-hidden', 'true');
    const id = `sakura-water-${root.id}`;
    host.innerHTML = `<div class="sakura-landscape">
      <img class="sakura-backdrop" src="${ART}landscape.webp" alt="" decoding="async">
      <svg class="sakura-water" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs><filter id="${id}" x="0" y=".63" width="1" height=".37" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".008 .07" numOctaves="1" seed="4" result="ripple">
            <animate attributeName="baseFrequency" values=".008 .07;.011 .09;.008 .07" dur="9s" repeatCount="indefinite"/>
          </feTurbulence><feDisplacementMap in="SourceGraphic" in2="ripple" scale="7" xChannelSelector="R" yChannelSelector="G"/>
        </filter><linearGradient id="${id}-fade" x2="0" y2="1"><stop offset="62%" stop-color="black"/><stop offset="72%" stop-color="white"/></linearGradient>
        <mask id="${id}-mask"><rect width="1672" height="941" fill="url(#${id}-fade)"/></mask></defs>
        <image href="${ART}landscape.webp" width="1672" height="941" filter="url(#${id})" mask="url(#${id}-mask)"/>
      </svg>
      <svg class="sakura-falls" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" focusable="false">
        <path d="M535 379 Q550 434 542 486 M558 385 Q572 433 561 495 M590 397 Q599 444 591 493 M1185 449 Q1172 483 1178 520 M1225 450 Q1208 480 1213 523 M1250 454 Q1239 484 1242 520"/>
      </svg>
      <img class="sakura-island sakura-island-near" src="${ART}floating-island.webp" alt="" decoding="async">
      <img class="sakura-island sakura-island-far" src="${ART}floating-island.webp" alt="" decoding="async">
      <div class="sakura-mist sakura-mist-one"></div><div class="sakura-mist sakura-mist-two"></div>
    </div><img class="sakura-branch" src="${ART}sakura-branch.webp" alt="" decoding="async"><div class="sakura-shade"></div>`;
    return host;
  }
  function path(root) {
    let host = q('.sakura-path', root);
    if (host) return host;
    host = own('div', 'sakura-path', root); host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `<svg class="sakura-path-svg" viewBox="0 0 1000 85" preserveAspectRatio="none" focusable="false">
      <path class="sakura-path-track" d="M20 16 Q500 98 980 16" pathLength="100"/>
      <path class="sakura-path-fill" d="M20 16 Q500 98 980 16" pathLength="100"/>
      <g class="sakura-flower" transform="translate(20 16)"><circle r="4"/><ellipse ry="9" rx="3"/><ellipse ry="9" rx="3" transform="rotate(60)"/><ellipse ry="9" rx="3" transform="rotate(120)"/></g>
      <g class="sakura-flower" transform="translate(980 16)"><circle r="4"/><ellipse ry="9" rx="3"/><ellipse ry="9" rx="3" transform="rotate(60)"/><ellipse ry="9" rx="3" transform="rotate(120)"/></g>
    </svg><div class="sakura-runner"><span class="sakura-runner-frame"></span><i></i></div>`;
    return host;
  }
  function driftPetal(petal, index, firstPass = true) {
    const random = (min, max) => min + Math.random() * (max - min);
    const set = (name, value, unit = '') => petal.style.setProperty(name, value.toFixed(3) + unit);
    // Both wind directions are represented from the start. Later flights are
    // renewed only while the petal is invisible at the edge of the scene.
    const direction = firstPass ? (index % 2 ? -1 : 1) : (Math.random() < .5 ? -1 : 1);
    const sideEntry = Math.random() < .23;
    const startY = sideEntry ? random(0, 48) : random(-18, -5);
    const travelY = 114 - startY;
    const x1 = direction * random(3, 12);
    const x2 = x1 - direction * random(5, 18);
    const x3 = x2 + direction * random(7, 22);
    const endX = x3 + direction * random(5, 20);
    const duration = random(14, 29);
    if (!firstPass) petal.style.animationName = 'none';
    set('--petal-start-x', sideEntry ? (direction > 0 ? -5 : 105) : random(-4, 104), '%');
    set('--petal-start-y', startY, 'vh');
    set('--petal-x1', x1, 'vw'); set('--petal-x2', x2, 'vw');
    set('--petal-x3', x3, 'vw'); set('--petal-x4', endX, 'vw');
    set('--petal-y1', travelY * .24, 'vh'); set('--petal-y2', travelY * .48, 'vh');
    set('--petal-y3', travelY * .74, 'vh'); set('--petal-y4', travelY, 'vh');
    set('--petal-size', random(4, 11), 'px'); set('--petal-aspect', random(.55, .9));
    set('--petal-opacity', random(.35, .82)); set('--petal-blur', random(0, .65), 'px');
    set('--petal-fall-duration', duration, 's');
    set('--petal-fall-delay', firstPass ? -random(0, duration) : 0, 's');
    set('--petal-flutter-duration', random(2.7, 6.8), 's');
    set('--petal-flutter-delay', -random(0, 7), 's');
    set('--petal-roll', random(-180, 180), 'deg');
    set('--petal-turn', direction * random(35, 100), 'deg');
    if (!firstPass) {
      // One style flush per completed flight, not a per-frame JS animation.
      void petal.offsetWidth;
      petal.style.removeProperty('animation-name');
    }
  }
  function decorate(root) {
    if (!root) return;
    const scenery = scene(root), progress = path(root);
    const boot = root.id === 'bootV060';
    const fill = q(boot ? '#bootFillV060' : '#loadingFill', root), track = fill?.parentElement;
    const parsed = Number.parseFloat(fill?.style.width);
    const value = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    if (track) {
      attr(track, 'role', 'progressbar'); attr(track, 'aria-label', copy('Betöltés állapota', 'Loading progress'));
      attr(track, 'aria-valuemin', '0'); attr(track, 'aria-valuemax', '100'); attr(track, 'aria-valuenow', value);
    }
    const line = q('.sakura-path-fill', progress);
    const offset = String(100 - value);
    if (line.style.strokeDashoffset !== offset) line.style.strokeDashoffset = offset;
    const runner = q('.sakura-runner', progress), t = value / 100;
    const x = `${2 + 96 * t}%`, y = `${(16 + 164 * t * (1 - t)) / 85 * 100}%`;
    if (runner.style.left !== x) runner.style.left = x;
    if (runner.style.top !== y) runner.style.top = y;
    const ready = boot && root.dataset.bootPhase === 'start';
    progress.classList.toggle('sakura-path-ready', ready);
    progress.hidden = boot && !['loading', 'start'].includes(root.dataset.bootPhase);
    const active = !document.hidden && !root.hidden && !root.classList.contains('hidden') && !root.classList.contains('done');
    const status = active && !reduced.matches ? 'running' : 'paused';
    if (scenery.dataset.motion !== status) {
      scenery.dataset.motion = status;
      const water = q('.sakura-water', scenery);
      if (status === 'paused') water.pauseAnimations?.(); else water.unpauseAnimations?.();
    }
    let motes = q('.mlj-motes', root);
    if (!motes) {
      motes = own('div', 'mlj-motes', root); motes.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 12; i++) {
        const mote = document.createElement('i');
        mote.append(document.createElement('span'));
        driftPetal(mote, i);
        motes.append(mote);
      }
      motes.addEventListener('animationiteration', event => {
        if (event.animationName === 'sakura-petal-fall' && event.target.parentElement === motes) {
          driftPetal(event.target, 0, false);
        }
      });
    }
    if (motes.dataset.motion !== status) motes.dataset.motion = status;
    if (progress.dataset.motion !== status) progress.dataset.motion = status;
    let tip = q('.mlj-tip', root);
    if (!tip) tip = own('p', 'mlj-tip', root);
    text(tip, copy('TIPP · A következő világ előtt fejleszd a felszerelésed.', 'TIP · Upgrade your gear before entering a new world.'));
    const start = q('#bootStartV096', root);
    if (start && !q('.sakura-start-ornament', start)) {
      const ornament = own('i', 'sakura-start-ornament', start); ornament.setAttribute('aria-hidden', 'true');
      ornament.innerHTML = '<span></span><b>◇</b><span></span>';
    }
  }
  function sync() {
    const pc = desktop(); document.documentElement.toggleAttribute('data-cr-pc-loading', pc);
    if (!pc) { restore(); return; }
    for (const node of attrs.keys()) if (!node.isConnected) attrs.delete(node);
    decorate(q('#bootV060')); decorate(q('#stageLoading'));
  }
  function schedule() { if (queued) return; queued = true; queueMicrotask(() => { queued = false; sync(); }); }
  function start() {
    if (started) return; started = true; sync();
    for (const root of [q('#bootV060'), q('#stageLoading')]) if (root) new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('[data-mlj-owned]'))) schedule();
    }).observe(root, {subtree:true, childList:true, attributes:true, attributeFilter:['style', 'hidden', 'class', 'data-boot-phase']});
  }
  document.documentElement.toggleAttribute('data-cr-pc-loading', desktop());
  for (const event of ['resize', 'orientationchange', 'cherrift:languagechange', 'cherrift:runtime-clean-ready']) window.addEventListener(event, schedule);
  document.addEventListener('visibilitychange', schedule); reduced.addEventListener?.('change', schedule);
  window.CHERRIFT_DESKTOP_LOADING = Object.freeze({sync, isDesktop:desktop});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
