/* CHERRIFT Preview v3: hot CSS/DOM-image updates, deliberately NO automatic full-page reload. */
(() => {
  'use strict';
  if (!window.CHERRIFT_PREVIEW) return;
  const autoKey = 'CHERRIFT_PREVIEW_HOT_ASSETS_V3';
  const traceKey = 'CHERRIFT_PREVIEW_TRACE_V3';
  const $ = selector => document.querySelector(selector);
  let hot = true;
  try {hot = localStorage.getItem(autoKey) !== 'off';} catch {}
  let lastClick = '', lastChange = '', navState = 'indítás', cssCount = 0, imageCount = 0;
  let previousBoot = '', previousStage = '', previousRoute = '', loadWarned = false;
  let pendingCode = [];
  let autoStartAttempted = false;
  let lastStageWarning = '';
  const details = [];
  function record(type, message) {
    details.push({at:new Date().toLocaleTimeString('hu-HU'), type, message:String(message).slice(0,260)});
    if (details.length > 35) details.shift();
    if (type === 'hibakód') console.warn('[CHERRIFT Preview]',message);
  }
  function isVisible(node) {
    if (!node || node.hidden || node.classList.contains('hidden') || node.classList.contains('done')) return false;
    return getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
  }
  function states() {
    let boot = null, auth = null;
    try {boot = window.CHERRIFT_BOOT?.getState?.();} catch {}
    try {auth = window.CHERRIFT_AUTH?.getState?.();} catch {}
    return { boot, auth,
      bootVisible:isVisible($('#bootV060')),
      stageVisible:isVisible($('#stageLoading')),
      body:document.body?.className||'?',
      gameMode:window.UI?.game?.mode||'?',
      route:document.querySelector('#app .screen:not(.hidden),#app .panel:not(.hidden)')?.id||'?' };
  }
  function report() {
    const s=states();
    return [`CHERRIFT PREVIEW v3 · Diagnosztika`,
      `Oldal: ${location.href}`,
      `Oldal új navigációja: ${performance.getEntriesByType('navigation')[0]?.type || '?'}`,
      `Utoljára kattintva: ${lastClick || '(nincs)'}`,
      `Utoljára módosult forrás: ${lastChange || '(nincs)'}`,
      `Boot phase: ${s.boot?.phase||'?'} · released: ${s.boot?.released||false} · waitingFor: ${s.boot?.waitingFor||'?'}`,
      `Boot látható: ${s.bootVisible} · pályabetöltés látható: ${s.stageVisible}`,
      `UI/game: ${Boolean(window.UI?.save)} / ${s.gameMode} · route: ${s.route}`,
      `Auth: ${s.auth?.mode||'?'} · cloudReady: ${s.auth?.cloudReady||false} · online hook: ${Boolean(window.__CHERRIFT_ONLINE_INSTALLED__)}`,
      `Body: ${s.body}`,
      `Hot assetek: ${hot?'BE':'KI'} · CSS: ${cssCount} · képek: ${imageCount}`,
      `Kódmódosítások (kézi frissítés kell): ${pendingCode.slice(-5).join(', ')||'nincs'}`,
      '',...details.slice(-18).map(x=>`[${x.at}][${x.type}] ${x.message}`)].join('\n');
  }
  const css=document.createElement('style');
  css.textContent=`
    #cr-preview-v3{position:fixed!important;z-index:2147483640!important;top:12px;right:12px;display:flex!important;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:8px;color:#fff;background:#1d1229f2;border:1px solid #b789cd;border-radius:9px;font:12px system-ui,sans-serif;pointer-events:auto!important}
    #cr-preview-v3 button{appearance:none;padding:6px 9px;border:1px solid #bb9fd0;border-radius:7px;background:#56356b;color:white;cursor:pointer;font:inherit}
    #cr-preview-v3 button:hover{background:#7a5595}
    #cr-preview-v3 [data-preview-status]{white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}
    #cr-preview-v3 #cr-preview-pending{color:#ffd089}
    #cr-preview-debug{display:none;position:fixed!important;z-index:2147483641!important;right:12px;bottom:12px;max-width:min(720px,calc(100vw - 24px));max-height:60vh;overflow:auto;background:#170d22f7;border:1px solid #b789cd;padding:14px;border-radius:8px;color:white;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 Consolas,monospace;pointer-events:auto!important}
    @media(max-width:640px){#cr-preview-v3{top:5px;left:5px;right:5px}}
  `;
  document.head.append(css);
  const bar=document.createElement('div');bar.id='cr-preview-v3';
  bar.innerHTML='<strong>CHERRIFT · PREVIEW v3</strong><span data-preview-status>Indulás…</span><button type="button" data-preview-auto></button><button type="button" data-preview-reload>Frissítés</button><button type="button" data-preview-info>Diagnosztika</button><button type="button" data-preview-copy>Hibalista másolása</button><button type="button" data-preview-reset>Új tesztmentés</button>';
  const panel=document.createElement('div');panel.id='cr-preview-debug';
  const status=bar.querySelector('[data-preview-status]');
  const autoButton=bar.querySelector('[data-preview-auto]');
  const mount=()=>{if(!bar.isConnected) document.body.append(bar);if(!panel.isConnected) document.body.append(panel);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  function setStatus(message){status.textContent=message;}
  function syncAuto(){autoButton.textContent=hot?'Hot: BE':'Hot: KI';autoButton.title='Csak CSS és DOM képek frissülnek. Nincs automatikus oldal-újratöltés.';}
  function setHot(value){hot=value;try{localStorage.setItem(autoKey,hot?'on':'off');}catch{}syncAuto();setStatus(hot?'CSS és képek: automatikus':'Hot frissítés: kikapcsolva');}
  syncAuto();
  autoButton.addEventListener('click',()=>setHot(!hot));
  function manualReload(){record('navigáció','Kézi frissítés');try{sessionStorage.setItem(traceKey,JSON.stringify({reason:'manual',at:Date.now()}));}catch{}location.reload();}
  bar.querySelector('[data-preview-reload]').addEventListener('click',manualReload);
  bar.querySelector('[data-preview-info]').addEventListener('click',()=>{panel.style.display=panel.style.display==='block'?'none':'block';panel.textContent=report();});
  bar.querySelector('[data-preview-copy]').addEventListener('click',()=>{
    const content=report();
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(content).then(()=>setStatus('Diagnosztika másolva')).catch(()=>{panel.textContent=content;panel.style.display='block';});}
    else{panel.textContent=content;panel.style.display='block';}
  });
  bar.querySelector('[data-preview-reset]').addEventListener('click',()=>{if(confirm('Csak a helyi preview mentés törlődik. Biztosan?'))window.CHERRIFT_PREVIEW_RESET?.();});
  try{const past=JSON.parse(sessionStorage.getItem(traceKey)||'null');if(past && Date.now()-past.at<20000)record('navigáció','Legutóbbi oldalelhagyás: '+past.reason);}catch{}
  window.addEventListener('error',e=>{record('hibakód',`${e.message}\n${e.filename||''}:${e.lineno||''}`);panel.textContent=report();panel.style.display='block';});
  window.addEventListener('unhandledrejection',e=>{record('hibakód',String(e.reason?.stack||e.reason||'Promise error'));panel.textContent=report();panel.style.display='block';});
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('button,a,input,[role="button"]');
    if(!t || t.closest('#cr-preview-v3,#cr-preview-debug'))return;
    lastClick=(t.id?'#'+t.id:(t.getAttribute('data-open')?'[data-open='+t.getAttribute('data-open')+']':String(t.textContent||'').trim().slice(0,45)))||t.tagName;
    record('kattintás',lastClick);
    setTimeout(checkTransitions,200);
    setTimeout(checkTransitions,1100);
  },true);
  window.addEventListener('beforeunload',()=>{
    try{sessionStorage.setItem(traceKey,JSON.stringify({reason:'Nem Preview által kért navigáció; utolsó kattintás: '+lastClick,at:Date.now()}));}catch{}
  });
  function checkTransitions(){
    const s=states();
    const b=s.boot?.phase+'|'+s.bootVisible+'|'+s.boot?.released;
    const st=String(s.stageVisible);
    if(b!==previousBoot){record('boot',b);previousBoot=b;}
    if(st!==previousStage){record('pályatöltés',st);previousStage=st;}
    if(s.route!==previousRoute){record('route',s.route);previousRoute=s.route;}
    if(s.boot?.released && s.bootVisible && !loadWarned){loadWarned=true;record('hibakód','A boot overlay újra látható, pedig már released=true.');panel.textContent=report();panel.style.display='block';}
    if(s.boot?.released && s.stageVisible && s.gameMode!=='running' && s.gameMode!=='playing' && lastStageWarning!==s.gameMode){lastStageWarning=s.gameMode;record('figyelmeztetés','Pályabetöltés látható, miközben a játék módja: '+s.gameMode);}
  }
  function hotUpdate(paths){
    const timestamp=Date.now();
    for(const raw of paths){
      const changedPath='/'+String(raw||'').replace(/^\/+/, '').replaceAll('\\','/');
      if(/\.css$/i.test(changedPath)){
        for(const link of document.querySelectorAll('link[rel="stylesheet"][href]')){
          let url;try{url=new URL(link.href,location.href);}catch{continue;}
          if(url.origin!==location.origin||url.pathname!==changedPath)continue;
          url.searchParams.set('cr_preview_hot',String(timestamp));
          link.href=url.href;cssCount++;
        }
      } else if(/\.(?:png|webp|jpg|jpeg|gif|svg|ico)$/i.test(changedPath)){
        for(const img of document.querySelectorAll('img[src],input[type="image"][src]')){
          let url;try{url=new URL(img.src,location.href);}catch{continue;}
          if(url.origin!==location.origin||url.pathname!==changedPath)continue;
          url.searchParams.set('cr_preview_hot',String(timestamp));img.src=url.href;imageCount++;
        }
      } else if(/\.(?:js|mjs|html|json|wasm)$/i.test(changedPath)){
        pendingCode.push(raw);pendingCode=pendingCode.slice(-8);
        record('kódváltozás',raw+' (Frissítés gomb szükséges)');
        setStatus('Kód változott · Frissítés kell');
      }
    }
  }
  let attempts=0;
  const timer=setInterval(()=>{
    const s=states();
    checkTransitions();
    if(s.boot?.released){clearInterval(timer);if(!pendingCode.length)setStatus('Kész · nincs automatikus reload');return;}
    if(s.boot?.phase==='start' && !autoStartAttempted){
      const start=document.getElementById('bootStartV096');
      if(start && !start.hidden && !start.disabled){autoStartAttempted=true;start.click();}
    }
    if(++attempts===35){record('figyelmeztetés','Loading túl sokáig tart · '+(s.boot?.waitingFor||'?'));panel.textContent=report();panel.style.display='block';}
    if(attempts>=150)clearInterval(timer);
  },400);
  const events=new EventSource('/__preview__/events');
  events.addEventListener('ready',()=>{if(!pendingCode.length)setStatus('Kapcsolódva · hot assetek');});
  events.addEventListener('change',event=>{
    let paths=[];try{paths=JSON.parse(event.data)?.paths||[];}catch{}
    if(!paths.length)return;
    lastChange=paths.slice(0,4).join(', ');
    record('forrás',lastChange);
    if(!hot){setStatus('Forrás módosult · Hot: KI');return;}
    hotUpdate(paths);
  });
  events.onerror=()=>setStatus('Fájlfigyelés: offline');
  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-auth-action="discord"],[data-auth-action="signout"],.discord-login');
    if(!btn)return;
    event.preventDefault();event.stopImmediatePropagation();
    window.UI?.toast?.('Helyi Preview: nincs online Discord-belépés.');
  },true);
})();
