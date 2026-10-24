/* PC presentation only. Routes, account data, rewards and persistence belong
   to the existing UI modules. No mobile DOM or save objects are changed. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const desktop = () => matchMedia('(min-width:821px)').matches &&
    !((navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches) && innerHeight <= 600);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy = (hu,en) => window.UI?.save?.settings?.language === 'en' ? en : hu;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const main = [
    ['worlds','PLAY','play','Lépj át egy másik világba','Step into another tomorrow'],
    ['skins','CHERRY','cherry','Találd meg a saját Cherryd','Find your Cherry'],
    ['gear','GEAR','gear','Készülj fel a kalandra','Power your journey'],
    ['gachaV082','COLLECTION','collection','Emlékek a világokon át','Memories across worlds'],
    ['settings','SETTINGS','settings','A te világod. A te beállításaid.','Tailor your experience']
  ];
  let root, observer, sourceObserver, frame = 0, pending = 0, lastRoute = '', lastFocus = null, dialogFocus;
  let px = 0, py = 0, lastHover = 0, parallaxFrame = 0;
  const set = (name,value) => { const node = root?.querySelector(`[data-crystal-value="${name}"]`); if (node && node.textContent !== String(value)) node.textContent = value; };
  const num = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString();
  function create() {
    root = document.createElement('div'); root.id = 'crystalDesktopMenu'; root.dataset.i18nIgnore = 'true';
    root.innerHTML = `
      <div class="crystal-scenery" aria-hidden="true"></div>
      <div class="crystal-atmosphere" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--n:${i};--x:${(i*47+9)%100}%;--delay:-${i*1.7}s;--duration:${15+i%6*2}s"></i>`).join('')}</div>
      <header class="crystal-brand"><img src="assets/ui/cherrift_logo.png" alt="CHERRIFT"><p>SAKURA ✦ RIFT <span>ALWAYS WITH YOU.</span></p></header>
      <div class="crystal-world-poem" aria-hidden="true">Different<br>Worlds<br><em>Same Wishes.</em><span>✧</span></div>
      <header class="crystal-topbar" aria-label="Player and currencies">
        <button class="crystal-profile" data-crystal-route="profileV082"><span class="crystal-profile-art" aria-hidden="true"></span><span><b data-crystal-value="profile"></b><small data-crystal-value="level"></small></span></button>
        <div class="crystal-wallet"><span title="Coin"><img src="assets/items/coin.png" alt="Coin"><b data-crystal-value="coins"></b></span><span title="Bloom Gem"><img src="assets/items/blossom_gem.png" alt="Bloom Gem"><b data-crystal-value="gems"></b></span><span title="Sakura Essence"><img src="assets/items/sakura_potion.png" alt="Sakura Essence"><b data-crystal-value="essence"></b></span><span title="Gear Scrap"><img src="assets/items/scraps.png" alt="Gear Scrap"><b data-crystal-value="scrap"></b></span><button title="Energy" class="crystal-energy" data-crystal-energy><span aria-hidden="true">⚡</span><b data-crystal-value="energy"></b></button></div>
        <button class="crystal-tool" data-crystal-tool="mail" aria-label="Mail">✉<em class="mail-badge-v063" data-v063-mail-count></em></button>
        <button class="crystal-tool" data-crystal-route="settings" aria-label="Settings">⚙</button>
      </header>
      <nav class="crystal-navigation" aria-label="Main menu">
        ${main.map(([route,label,art,hu,en])=>`<button class="crystal-button crystal-${art}" data-crystal-route="${route}"><img src="assets/ui/buttons/crystal-${art}-pc.webp" alt="" draggable="false"><span class="crystal-button-copy"><b>${label}</b><small data-crystal-copy="${art}">${esc(copy(hu,en))}</small></span><i aria-hidden="true">›</i></button>`).join('')}
        <div class="crystal-secondary">${[['shopV082','SHOP','◇'],['dailyQuests','MISSIONS','✧'],['eventHubPrebeta','EVENTS','❀'],['achievements','ACHIEVEMENTS','♛']].map(([route,label,icon])=>`<button data-crystal-route="${route}"><i aria-hidden="true">${icon}</i><span>${label}<small data-crystal-status="${route}"></small></span></button>`).join('')}</div>
      </nav>
      <section class="crystal-news" aria-label="News and updates">
        <button class="crystal-news-event" data-crystal-route="eventHubPrebeta"><small data-crystal-value="eventLabel"></small><b data-crystal-value="eventTitle"></b><span data-crystal-value="eventProgress"></span><i aria-hidden="true">›</i></button>
        <button class="crystal-news-update" data-crystal-updates><div><small>LATEST UPDATES</small><b data-crystal-value="version"></b><span data-crystal-value="updateTitle"></span></div><img src="assets/map/world1/world1_splashart_1.png" alt=""><p data-crystal-value="updateCopy"></p><i aria-hidden="true">›</i></button>
        <button class="crystal-news-journey" data-crystal-route="worlds"><small>CHERRIFT</small><b data-crystal-value="stage"></b><span data-crystal-value="journey"></span><i aria-hidden="true">✧</i></button>
      </section>
      <footer class="crystal-footer"><nav aria-label="Community and support"><button data-crystal-route="socialV082">COMMUNITY</button><button data-crystal-route="loginRewards">LOGIN REWARDS</button><button data-crystal-route="playerUpgrade">UPGRADE</button><button data-crystal-route="bagV082">INVENTORY</button><button data-r5-menu-tool="twitch">TWITCH</button><button data-r5-menu-tool="web">WEB</button><button data-r5-menu-tool="feedback">FEEDBACK</button><button data-r5-menu-tool="bug">BUG REPORT</button></nav><span>© 2026 CHERRIFT · <b data-crystal-value="build"></b></span></footer>
      <dialog class="crystal-update-dialog" aria-labelledby="crystalUpdateTitle"><button class="crystal-dialog-close" aria-label="Close">×</button><small>LATEST UPDATES</small><h2 id="crystalUpdateTitle"></h2><strong data-crystal-dialog-version></strong><p data-crystal-dialog-copy></p></dialog>`;
    $('menu')?.append(root);
    root.addEventListener('click', click);
    root.addEventListener('pointerover', event => {
      const button = event.target.closest('button');
      if (!button || button.contains(event.relatedTarget) || button.disabled || performance.now()-lastHover < 90) return;
      lastHover=performance.now(); window.CHERRIFT_V060?.playClickSound?.();
    });
    root.querySelector('dialog').addEventListener('close',()=>dialogFocus?.focus({preventScroll:true}));
  }
  function click(event) {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.hasAttribute('data-crystal-energy')) { window.CHERRIFT_PREBETA?.showEnergyModal?.(); return; }
    if (button.matches('.crystal-dialog-close')) { root.querySelector('dialog').close(); return; }
    if (button.hasAttribute('data-crystal-updates')) {
      const dialog=root.querySelector('dialog'); dialogFocus=button;
      dialog.querySelector('h2').textContent=root.querySelector('[data-crystal-value="updateTitle"]').textContent;
      dialog.querySelector('[data-crystal-dialog-copy]').textContent=root.querySelector('[data-crystal-value="updateCopy"]').textContent;
      dialog.querySelector('[data-crystal-dialog-version]').textContent=window.CHERRIFT_BUILD?.displayVersion || '';
      dialog.showModal(); return;
    }
    if (button.dataset.crystalTool) { window.CHERRIFT_V082?.openMenuTool?.(button.dataset.crystalTool); return; }
    const route=button.dataset.crystalRoute; if (!route || pending) return;
    lastFocus=button; root.dataset.leaving='true';button.classList.add('is-selected');
    pending=setTimeout(()=>{
      pending=0;
      if (!desktop()) return;
      if (route==='worlds' && UI.openWorldSelect) UI.openWorldSelect();
      else if (route==='eventHubPrebeta') window.CHERRIFT_PREBETA_EVENT?.open?.();
      else UI.open(route);
      sync();
    },reduced()?0:130);
  }
  function refresh() {
    if (!root || !desktop()) return;
    const save=window.UI?.save || {};
    const source=$('railProfileIconV082'), art=root.querySelector('.crystal-profile-art');
    if(source && art.dataset.signature!==source.innerHTML){
      art.dataset.signature=source.innerHTML;art.replaceChildren(...Array.from(source.childNodes,node=>node.cloneNode(true)));
      art.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    }
    set('profile', $('railProfileNameV082')?.textContent || save.profile?.name || 'Guest');
    set('level',`${copy('Szint','Level')} ${save.account?.level || 1}`);
    set('essence',num(save.sakuraEssence));set('scrap',num(save.bag?.materials?.gearScrap ?? save.gearScrap ?? save.scrap));
    set('coins',num(save.coins)); set('gems',num(save.blossomGems ?? save.bloomGems));set('energy',`${num(save.energy)}/${num(save.energyState?.max || 50)}`);
    set('version',window.CHERRIFT_BUILD?.displayVersion || '');set('build',window.CHERRIFT_BUILD?.label || '');
    const patch=$('menu')?.querySelector('.patch-card');
    set('updateTitle',patch?.querySelector('h3')?.textContent || 'CHERRIFT');
    set('updateCopy',patch?.querySelector('p')?.textContent || '');
    const event=window.CHERRIFT_PREBETA_EVENT;
    const eventSave=save.events?.[event?.id];
    set('eventLabel',copy('ESEMÉNY / HÍREK','EVENT / NEWS'));
    set('eventTitle',event ? 'CLOSED BETA' : copy('Hamarosan','Coming soon'));
    set('eventProgress',event ? `${copy('Belépési napok','Login days')} · ${Math.min(7,eventSave?.loginDays?.length || 0)} / ${event.rewards.length}` : '');
    set('stage',$('dashboardStageV060')?.textContent || $('mobileStageTitle')?.textContent || 'CHERRIFT');
    set('journey',copy('A következő kalandod vár.','Your next adventure awaits.'));
    for (const [route,,art,hu,en] of main) {
      const node=root.querySelector(`[data-crystal-copy="${art}"]`);const value=copy(hu,en);if(node.textContent!==value)node.textContent=value;
    }
    for (const button of root.querySelectorAll('[data-crystal-route="eventHubPrebeta"]')) button.disabled=!event;
    for (const node of root.querySelectorAll('[data-crystal-status]')) {
      const enabled=node.dataset.crystalStatus!=='eventHubPrebeta' || !!event;
      const text=enabled?copy('MEGNYITÁS','EXPLORE'):copy('HAMAROSAN','COMING SOON');if(node.textContent!==text)node.textContent=text;
    }
  }
  function queue() { if (!frame && desktop()) frame=requestAnimationFrame(()=>{frame=0;sync();}); }
  function sync() {
    const active=desktop();if(document.body.classList.contains('crystal-desktop')!==active)document.body.classList.toggle('crystal-desktop',active);
    if (!active) {
      document.body.classList.remove('crystal-lobby');
      clearTimeout(pending);pending=0;lastFocus=null;
      if(parallaxFrame)cancelAnimationFrame(parallaxFrame);parallaxFrame=0;
      root?.remove();root=null;lastRoute='';sourceObserver?.disconnect();sourceObserver=null;
      return;
    }
    if (!root) create();
    const visiblePanel=Array.from($('app')?.children || []).some(node=>node.classList.contains('panel') && !node.classList.contains('hidden') && getComputedStyle(node).display!=='none');
    const menuVisible=!visiblePanel && !$('menu')?.classList.contains('hidden') && getComputedStyle($('menu')).display!=='none';
    root.hidden=!menuVisible;root.inert=!menuVisible;
    if(document.body.classList.contains('crystal-lobby')!==menuVisible)document.body.classList.toggle('crystal-lobby',menuVisible);
    if (menuVisible && lastRoute!=='menu') {
      delete root.dataset.leaving;root.querySelectorAll('.is-selected').forEach(b=>b.classList.remove('is-selected'));
      if(lastRoute && lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    }
    lastRoute=menuVisible?'menu':'panel';refresh();
    if (!sourceObserver && $('desktopCurrencyV0943')) {
      sourceObserver=new MutationObserver(queue);
      sourceObserver.observe($('desktopCurrencyV0943'),{childList:true,characterData:true,subtree:true});
      if($('railProfileIconV082'))sourceObserver.observe($('railProfileIconV082'),{childList:true,attributes:true,subtree:true});
      if($('crDesktopEnergy'))sourceObserver.observe($('crDesktopEnergy'),{childList:true,characterData:true,subtree:true});
      if($('railProfileNameV082'))sourceObserver.observe($('railProfileNameV082'),{childList:true,characterData:true,subtree:true});
    }
  }
  function start() {
    if(observer) return;
    observer=new MutationObserver(records=>{if(records.some(r=>r.target===$('app') || r.target.parentElement===$('app')))queue();});
    if($('app'))observer.observe($('app'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    sync();
  }
  window.addEventListener('resize',()=>{if(frame)cancelAnimationFrame(frame);frame=0;sync();});
  document.addEventListener('pointermove',event=>{
    if(!desktop() || reduced() || !document.body.classList.contains('crystal-lobby') || document.hidden || !root)return;
    px=(event.clientX/innerWidth-.5)*10;py=(event.clientY/innerHeight-.5)*8;
    if(!parallaxFrame)parallaxFrame=requestAnimationFrame(()=>{parallaxFrame=0;root?.style.setProperty('--parallax-x',`${px}px`);root?.style.setProperty('--parallax-y',`${py}px`);});
  },{passive:true});
  for(const event of ['cherrift:savechange','cherrift:languagechange','cherrift:eventchange','cherrift:prebeta-event-ready','cherrift:prebeta-ready'])window.addEventListener(event,queue);
  window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});
  window.CHERRIFT_DESKTOP_MENU=Object.freeze({sync,refresh,isDesktop:desktop});
})();
