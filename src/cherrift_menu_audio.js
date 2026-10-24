/* Crystal UI audio. One event owner, existing master volume, original WAV cues. */
(() => {
  'use strict';
  if (window.CHERRIFT_MENU_AUDIO) return;
  const cues = Object.freeze({
    play: Object.freeze({src:'assets/audio/menu/crystal-play.wav', gain:.65, gap:90}),
    click: Object.freeze({src:'assets/audio/menu/crystal-click.wav', gain:.55, gap:35}),
    hover: Object.freeze({src:'assets/audio/menu/crystal-hover.wav', gain:.30, gap:110}),
    back: Object.freeze({src:'assets/audio/menu/crystal-back.wav', gain:.50, gap:65}),
    page: Object.freeze({src:'assets/audio/menu/crystal-page.wav', gain:.50, gap:65})
  });
  const selector = 'button,a[href],summary,select,input[type=button],input[type=submit],input[type=reset],input[type=checkbox],input[type=radio],input[type=range],[role=button],[role=menuitem],[role=switch],[data-open],[data-action],[data-node]';
  const playSelector = '.crystal-play,[data-chapter-play],[data-world-start],#mobilePlayBtn,#btnPlay,[data-menu-sound="play"]';
  const pageSelector = '[data-v093-skin],[data-v093-skin-view],[data-sp-step],[data-wg-step],[data-wg-pick],[data-v093-world-step],[data-v084-skin],[data-rg-step],[data-menu-sound="page"]';
  const pools = new Map(), last = new Map();
  let unlocked = false, hoverTimer = 0, hoverTarget = null, active = [];

  function classifyControl(control) {
    if (!control) return null;
    const explicit = control.getAttribute('data-menu-sound');
    if (explicit === 'off') return null;
    if (Object.hasOwn(cues, explicit)) return explicit;
    if (control.matches(playSelector)) return 'play';
    if (Array.from(control.attributes).some(attribute => /^data-(?:.+-)?(?:back|close)$/.test(attribute.name)) ||
        /(?:^|[\s-])(?:back|close)(?:[\s-]|$)/.test(control.className || '') ||
        /^(?:back\b|vissza\b|close\b|bezár)/i.test(control.getAttribute('aria-label') || '')) return 'back';
    if (control.matches(pageSelector)) return 'page';
    return 'click';
  }
  function controlFrom(target) {
    const control = target instanceof Element ? target.closest(selector) : null;
    if (!control?.isConnected || control.matches(':disabled,[disabled],[aria-disabled="true"]') || control.closest('[inert],[aria-disabled="true"]')) return null;
    if (document.body?.classList.contains('is-playing') && !control.closest('#pauseModal,#settings,[role=dialog],dialog[open]')) return null;
    for (let node = control; node; node = node.parentElement) {
      if (node.hidden || node.classList.contains('hidden') || node.getAttribute('aria-hidden') === 'true') return null;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return null;
    }
    return control;
  }
  function volume(kind) {
    const settings = window.UI?.save?.settings || {};
    if (settings.muted === true || settings.menuSounds === false) return 0;
    const saved = Number(settings.volume ?? 60);
    return cues[kind].gain * Math.max(0, Math.min(1, (Number.isFinite(saved) ? saved : 60) / 100));
  }
  function clearHover(stopSound = false) {
    window.clearTimeout(hoverTimer); hoverTimer = 0; hoverTarget = null;
    if (stopSound) for (const sound of pools.get('hover')?.voices || []) sound.pause();
  }
  function play(kind = 'click') {
    if (!Object.hasOwn(cues, kind) || document.hidden || typeof Audio !== 'function') return false;
    if (kind === 'hover' && !unlocked) return false;
    const gain = volume(kind), now = performance.now();
    if (gain <= 0 || now - (last.get(kind) ?? -Infinity) < cues[kind].gap) return false;
    try {
      let pool = pools.get(kind);
      if (!pool) {
        pool = {index:0, voices:Array.from({length:kind === 'click' ? 3 : 2}, () => {
          const sound = new Audio(cues[kind].src); sound.preload = 'auto'; return sound;
        })};
        pools.set(kind, pool);
      }
      active = active.filter(sound => !sound.paused && !sound.ended);
      if (active.length >= 5) active.shift().pause();
      const sound = pool.voices[pool.index++ % pool.voices.length];
      sound.pause(); sound.currentTime = 0; sound.volume = gain;
      sound.play()?.catch?.(() => {});
      active = active.filter(voice => voice !== sound); active.push(sound); last.set(kind, now);
      return true;
    } catch (_) { return false; }
  }
  window.addEventListener('pointerdown', event => {
    if (!event.isTrusted) return;
    unlocked = true; clearHover(true);
  }, true);
  window.addEventListener('click', event => {
    if (!event.isTrusted) return;
    unlocked = true; clearHover(true);
    const control = controlFrom(event.target);
    if (control) { const kind = classifyControl(control); if (kind) play(kind); }
  }, true);
  window.addEventListener('pointerover', event => {
    if (!event.isTrusted || event.pointerType === 'touch' || !unlocked) return;
    const control = controlFrom(event.target);
    if (!control || control.contains(event.relatedTarget) || classifyControl(control) === null) return;
    clearHover(); hoverTarget = control;
    hoverTimer = window.setTimeout(() => {
      hoverTimer = 0;
      if (hoverTarget === control && controlFrom(control)) play('hover');
    }, 45);
  }, {capture:true, passive:true});
  window.addEventListener('pointerout', event => {
    if (hoverTarget?.contains(event.target) && !hoverTarget.contains(event.relatedTarget)) clearHover();
  }, {capture:true, passive:true});
  window.addEventListener('keydown', event => {
    if (!event.isTrusted || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    unlocked = true; clearHover(true);
    const control = controlFrom(event.target);
    const paging = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key) && control?.matches(pageSelector);
    if (event.key === 'Escape' || paging) queueMicrotask(() => {
      if (event.defaultPrevented) play(paging ? 'page' : 'back');
    });
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    clearHover(true); for (const sound of active) sound.pause(); active = [];
  });
  window.CHERRIFT_MENU_AUDIO = Object.freeze({version:'1.0-crystal', play, classifyControl, cues});
})();
