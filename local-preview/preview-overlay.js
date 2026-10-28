/* CHERRIFT Local Preview V2: throttled, observable, toggleable auto-reload. */
(() => {
  'use strict';
  if (!window.CHERRIFT_PREVIEW) return;
  const STORE = 'CHERRIFT_PREVIEW_AUTO_RELOAD_V2';
  const RECORD = 'CHERRIFT_PREVIEW_RELOADS_V2';
  let auto = true;
  let history = [];
  let startAt = Date.now();
  let loadingNotified = false;
  const el = id => document.getElementById(id);
  try {
    auto = localStorage.getItem(STORE) !== 'off';
    history = JSON.parse(sessionStorage.getItem(RECORD) || '[]')
      .filter(item => item && Number(item.at) > Date.now() - 30000);
  } catch (_) { }
  const css = document.createElement('style');
  css.textContent = `
    #cherriftLocalPreviewBar{position:fixed;z-index:2147483640;right:12px;top:12px;display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:7px 9px;color:#fff;background:rgba(21,12,36,.94);border:1px solid #c692e8;border-radius:10px;box-shadow:0 6px 30px #0008;font:12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:auto}
    #cherriftLocalPreviewBar button{cursor:pointer;font:inherit;color:#fff;background:#603773;border:1px solid #ac7fc0;border-radius:6px;padding:5px 9px}
    #cherriftLocalPreviewBar button:hover{background:#864d98}
    #cherriftLocalPreviewBar .preview-state{opacity:.9;white-space:nowrap}
    #cherriftPreviewError{display:none;position:fixed;z-index:2147483641;right:12px;bottom:12px;max-width:min(680px,calc(100vw - 24px));max-height:34vh;overflow:auto;padding:10px;color:#fff;background:rgba(67,29,45,.97);border:1px solid #ffb7bc;border-radius:9px;white-space:pre-wrap;font:12px/1.45 Consolas,monospace}
    @media(max-width:640px){#cherriftLocalPreviewBar{left:8px;right:8px;top:6px;flex-wrap:wrap;gap:3px}#cherriftLocalPreviewBar button{padding:4px 6px}}
  `;
  document.head.appendChild(css);
  const bar = document.createElement('div');
  bar.id = 'cherriftLocalPreviewBar';
  bar.innerHTML = '<strong>CHERRIFT · LOCAL</strong><span class="preview-state">Betöltés…</span><button type="button" data-preview-auto>Auto: BE</button><button type="button" data-preview-reload>Frissítés</button><button type="button" data-preview-info>Diagnosztika</button><button type="button" data-preview-reset>Új tesztmentés</button>';
  const errorBox = document.createElement('div');
  errorBox.id = 'cherriftPreviewError';
  const mount = () => {if (!bar.isConnected) document.body.appendChild(bar); if (!errorBox.isConnected) document.body.appendChild(errorBox);};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
  let lastError = '';
  function showError(message) {
    if (!message || message === lastError) return;
    lastError = message;
    errorBox.textContent = 'CHERRIFT PREVIEW DIAGNOSZTIKA\n' + message;
    errorBox.style.display = 'block';
  }
  const autoButton = bar.querySelector('[data-preview-auto]');
  const stateLabel = bar.querySelector('.preview-state');
  function setAuto(value, reason = '') {
    auto = !!value;
    autoButton.textContent = `Auto: ${auto ? 'BE' : 'KI'}`;
    autoButton.setAttribute('aria-pressed', String(auto));
    try {localStorage.setItem(STORE, auto ? 'on' : 'off');} catch (_) { }
    if (reason) showError(reason);
  }
  setAuto(auto);
  bar.querySelector('[data-preview-reload]').addEventListener('click', () => location.reload());
  autoButton.addEventListener('click', () => {setAuto(!auto); stateLabel.textContent = auto ? 'Automatikus frissítés aktív' : 'Automatikus frissítés kikapcsolva';});
  function diagnosis() {
    const boot = window.CHERRIFT_BOOT?.getState?.();
    const auth = window.CHERRIFT_AUTH?.getState?.();
    const fields = boot ? ['phase','released','stable','ui','authReady','saveReady','prebeta','live','runtime','loaded','waitingFor']
      .map(k => `${k}: ${String(boot[k])}`).join('\n') : 'Boot modul: nem érhető el';
    return `Helyi Preview (éles Supabase nélkül)\n${fields}\n` +
      `Auth: ${auth?.mode ?? 'n/a'} / cloudReady=${auth?.cloudReady ?? 'n/a'}\n` +
      `UI.save: ${Boolean(window.UI?.save)}\n` +
      `Online-hook: ${Boolean(window.__CHERRIFT_ONLINE_INSTALLED__)}\n` +
      `Utoljára auto-frissítve: ${history.at(-1)?.path || 'nem volt'}\n` +
      `Auto-frissítések 30 mp alatt: ${history.length}\n` +
      `Auto-frissítés: ${auto ? 'BE' : 'KI'}`;
  }
  bar.querySelector('[data-preview-info]').addEventListener('click', () => {
    if (errorBox.style.display === 'block') {errorBox.style.display='none'; lastError='';}
    else {showError(diagnosis()); console.info('[CHERRIFT Preview]', diagnosis());}
  });
  bar.querySelector('[data-preview-reset]').addEventListener('click', () => {
    if (confirm('Csak a HELYI Preview tesztmentés áll vissza. Az éles Supabase mentés érintetlen marad. Folytatod?')) window.CHERRIFT_PREVIEW_RESET?.();
  });
  const events = new EventSource('/__preview__/events');
  events.addEventListener('ready', () => {stateLabel.textContent = auto ? 'Live reload: BE' : 'Live reload: KI';});
  events.addEventListener('reload', event => {
    if (!auto) return;
    let paths = [];
    try {paths = JSON.parse(event.data)?.paths || [];} catch (_) { }
    const path = paths.slice(0,3).join(', ') || 'ismeretlen fájl';
    const now = Date.now();
    history = history.filter(item => now - item.at < 30000);
    if (history.length >= 3) {
      setAuto(false, 'Az automatikus frissítés túl sokszor ismétlődött 30 másodperc alatt.\nA ciklust leállítottam, a játék kézzel frissíthető.\nUtolsó változás: ' + path + '\n' + diagnosis());
      stateLabel.textContent = 'Auto-frissítés szünetel';
      return;
    }
    history.push({at:now,path});
    try {sessionStorage.setItem(RECORD, JSON.stringify(history));} catch (_) { }
    stateLabel.textContent = 'Változott: ' + path.slice(0,30);
    // Only reload once the editor has been quiet. The server already debounces.
    location.reload();
  });
  events.onerror = () => {stateLabel.textContent='Fájlfigyelés: offline';};
  window.addEventListener('error', event => {
    if (event.message) showError(`${event.message}\n${event.filename || ''}:${event.lineno || ''}\n\n${diagnosis()}`);
  });
  window.addEventListener('unhandledrejection', event => {
    showError(`${String(event.reason?.stack || event.reason || 'Promise hiba')}\n\n${diagnosis()}`);
  });
  // No Discord and no press-any-key needed. Real CHERRIFT boot still owns readiness.
  let tries = 0;
  const interval = setInterval(() => {
    const boot = window.CHERRIFT_BOOT?.getState?.();
    if (boot?.released) {
      clearInterval(interval);
      if (loadingNotified && errorBox.style.display === 'block') errorBox.style.display='none';
      stateLabel.textContent = auto ? 'Preview kész · Auto: BE' : 'Preview kész · Auto: KI';
      return;
    }
    if (boot?.phase === 'start') {
      const button = el('bootStartV096');
      if (button && !button.hidden && !button.disabled) button.click();
    }
    if (++tries === 30 && !boot?.released) {
      loadingNotified = true;
      console.warn('[CHERRIFT Preview] Loading diagnosztika:\n' + diagnosis());
      showError('A játék még loading fázisban van.\n' + diagnosis());
    }
    if (tries >= 150) clearInterval(interval);
  }, 400);
  // Online account controls are never functional in this local-only mode.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-auth-action="discord"],[data-auth-action="signout"],.discord-login');
    if (!button) return;
    event.preventDefault();event.stopImmediatePropagation();
    window.UI?.toast?.('Külön helyi tesztmód: nincs online bejelentkezés.');
  }, true);
})();
