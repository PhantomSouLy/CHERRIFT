/* Celestial Atelier: PC-only presentation; native inventory and item actions own data. */
(() => {
  'use strict';
  if(window.CHERRIFT_DESKTOP_GEAR)return;
  const q=(s,r=document)=>r?.querySelector(s),qa=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
  const desktop=()=>window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ?? (innerWidth>=821 && !((navigator.maxTouchPoints>0 || matchMedia('(pointer:coarse)').matches)&&innerHeight<=600));
  const visible=n=>n&&!n.classList.contains('hidden')&&!n.hidden&&getComputedStyle(n).display!=='none';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy=(hu,en)=>window.UI?.save?.settings?.language==='en'?en:hu;
  const saved=new Map(),animations=new Set();let queued=false,active=false,started=false,source='',backTimer=0,lastHover=0;
  const core={Helmet:'helmet',Armor:'chestplate',Weapon:'weapon',Ring:'ring',Necklace:'necklance',Gloves:'glove',Boots:'boots'};
  const positions=['display','position','left','right','top','bottom','width','height','min-height','min-width','transform','padding','grid-template-columns','grid-template-rows','gap','inset'];
  function clearLayout(node){if(!node)return;if(!saved.has(node))saved.set(node,node.getAttribute('style'));for(const key of positions)if(node.style.getPropertyValue(key))node.style.removeProperty(key);}
  function make(tag,cls,parent){const n=document.createElement(tag);n.className=cls;n.dataset.cgOwned='';n.dataset.i18nIgnore='true';parent.append(n);return n;}
  function animate(n,frames,duration=280){if(!n||reduced())return;const a=n.animate?.(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)'});if(a){animations.add(a);a.finished?.catch(()=>{}).finally(()=>animations.delete(a));}}
  function restore(){animations.forEach(a=>a.cancel());animations.clear();clearTimeout(backTimer);backTimer=0;document.body.classList.remove('celestial-gear');qa('[data-cg-owned]').forEach(n=>n.remove());for(const [node,style]of saved){if(node.isConnected){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}}saved.clear();active=false;source='';qa('.cg-filtered').forEach(n=>n.classList.remove('cg-filtered'));if(!desktop())window.CHERRIFT_V060?.ensureGearLayout?.();}
  function chrome(root){
    let header=q('.cg-chrome',root);
    if(!header){header=make('header','cg-chrome',root);const logo=make('img','cg-logo',header);logo.src='assets/ui/cherrift_logo.png';logo.alt='CHERRIFT';const back=make('button','cg-back',header);back.type='button';back.dataset.cgBack='';const title=make('div','cg-title',header);title.innerHTML='<small>CELESTIAL ATELIER</small><h1>GEAR</h1>';}
    const backLabel=copy('‹ FŐMENÜ','‹ LOBBY');if(q('.cg-back',header).textContent!==backLabel)q('.cg-back',header).textContent=backLabel;
    const original=q('#crystalDesktopMenu>.crystal-topbar');if(original&&header.dataset.signature!==original.innerHTML){q('.crystal-topbar',header)?.remove();const clone=original.cloneNode(true);qa('[id]',clone).forEach(n=>n.removeAttribute('id'));header.append(clone);header.dataset.signature=original.innerHTML;}
  }
  function hero(root){
    const stage=q('#gearStageV0560',root);if(!stage)return;
    clearLayout(stage);qa('[data-v0560-slot]',stage).forEach(slot=>{clearLayout(slot);if(!window.UI?.save?.equipped?.[slot.dataset.v0560Slot]&&!q('.cg-empty-icon',slot)){const img=make('img','cg-empty-icon',slot);img.src=`assets/items/cores/${core[slot.dataset.v0560Slot]}_core.png`;img.alt='';}});
    const skin=window.CHERRIFT_DATA?.skins?.find(s=>s.id===window.UI?.save?.selectedSkin)||window.CHERRIFT_DATA?.skins?.[0];if(!skin)return;
    const assets=window.CHERRIFT_SKIN_UI?.assetsForSkin?.(skin);
    const path=assets?.cutout || assets?.splash || skin.splash || skin.icon;
    let image=q('.cg-hero',stage);if(!image){image=make('img','cg-hero',stage);image.alt='';image.draggable=false;image.decoding='async';}
    image.classList.toggle('cg-cutout',Boolean(assets?.cutout));
    if(source!==path){source=path;image.src=path;animate(image,[{opacity:0,transform:'translate3d(15px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],380);}
    let caption=q('.cg-caption',root);if(!caption){caption=make('div','cg-caption',root);caption.innerHTML='<small>CURRENT CHERRY</small><h2></h2><p></p><button type="button" data-cg-change></button>';}
    if(q('h2',caption).textContent!==skin.name)q('h2',caption).textContent=skin.name;
    const changeLabel=copy('CHERRY VÁLASZTÁSA','CHANGE CHERRY');if(q('[data-cg-change]',caption).textContent!==changeLabel)q('[data-cg-change]',caption).textContent=changeLabel;
    const rarity=skin.rarity||'';if(q('p',caption).textContent!==rarity)q('p',caption).textContent=rarity;
  }
  function overview(root){
    let pane=q('.cg-overview',root);
    if(!pane){pane=make('aside','cg-overview',root);pane.innerHTML='<small>YOUR LOADOUT</small><h2></h2><div class="cg-stats"></div><div class="cg-equipped"></div><p class="cg-hint"></p>';}
    const title=copy('Felszerelés','Equipment');if(q('h2',pane).textContent!==title)q('h2',pane).textContent=title;
    const summary=q('.gear-summary-v0560',root);const stats=q('.cg-stats',pane);const statHtml=summary?.innerHTML.replace(/\s+id="[^"]*"/g,'')||'';if(stats.innerHTML!==statHtml)stats.innerHTML=statHtml;
    const list=q('.cg-equipped',pane),slots=qa('[data-v0560-slot]',root);
    const signature=copy('hu','en')+';'+slots.map(n=>n.dataset.slotRender+'|'+n.textContent).join(';');
    if(list.dataset.signature!==signature){list.replaceChildren();for(const slot of slots){const b=document.createElement('button');b.type='button';b.dataset.cgSlot=slot.dataset.v0560Slot;const icon=q('.gear-slot-icon-v0560,.gear-slot-icon-v0932',slot);if(icon){const clone=icon.cloneNode(true);clone.removeAttribute('style');if(!window.UI?.save?.equipped?.[slot.dataset.v0560Slot]){clone.replaceChildren();const img=document.createElement('img');img.src=`assets/items/cores/${core[slot.dataset.v0560Slot]}_core.png`;img.alt='';clone.append(img);}b.append(clone);}const label=document.createElement('span');label.textContent=copy(({Helmet:'Sisak',Armor:'Páncél',Weapon:'Fegyver',Ring:'Gyűrű',Necklace:'Nyaklánc',Gloves:'Kesztyű',Boots:'Csizma'})[slot.dataset.v0560Slot],slot.dataset.v0560Slot);const state=document.createElement('small');state.textContent=window.UI?.save?.equipped?.[slot.dataset.v0560Slot]?copy('Felszerelve','Equipped'):copy('Üres','Empty');b.append(label,state);list.append(b);}list.dataset.signature=signature;}
    const hint=copy('Válassz egy tárgyat az adataihoz, vagy húzd a megfelelő helyre.','Select an item to inspect, or drag it to its equipment slot.');if(q('.cg-hint',pane).textContent!==hint)q('.cg-hint',pane).textContent=hint;
  }
  function inventory(root){
    const zone=q('#gearInventoryZoneV0560',root);if(!zone)return;
    let search=q('.cg-search',zone);if(!search){search=make('input','cg-search',zone);search.type='search';search.maxLength=80;search.autocomplete='off';search.addEventListener('input',schedule);}
    search.placeholder=copy('Keresés a felszerelések között…','Search equipment…');search.setAttribute('aria-label',search.placeholder);
    const term=search.value.trim().toLocaleLowerCase();
    for(const card of qa('[data-v0560-item-id]',q('#gearInventoryGridV0560',root))){const item=window.UI?.save?.inventory?.find(i=>i.id===card.dataset.v0560ItemId);const name=item?(window.UI?.gearName?.(item)||`${item.rarity} ${item.type} ${item.slot}`):'';card.classList.toggle('cg-filtered',!!term&&!name.toLocaleLowerCase().includes(term));}
  }
  function sync(){
    const root=q('#gear');if(!desktop()||!visible(root)||document.body.classList.contains('is-playing')){if(active)restore();return;}
    const entering=!active;active=true;for(const node of saved.keys())if(!node.isConnected)saved.delete(node);if(!document.body.classList.contains('celestial-gear'))document.body.classList.add('celestial-gear');chrome(root);hero(root);overview(root);inventory(root);
    // The original item modal is visually docked in the right column. Its actions are unchanged.
    if(entering)animate(q('.gear-inventory-v0560',root),[{opacity:0,transform:'translate3d(-20px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}]);
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
  function back(){if(backTimer)return;const root=q('#gear');animate(root,[{opacity:1},{opacity:0,transform:'translate3d(-20px,0,0)'}],160);backTimer=setTimeout(()=>{backTimer=0;window.UI?.open?.('menu');sync();},reduced()?0:160);}
  function start(){if(started)return;started=true;const root=q('#gear');if(!root)return;const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('[data-cg-owned]') && (r.type==='childList'||r.target===q('#gear')||r.target===q('#gearModalV0560')||r.target===root || (r.attributeName==='style' && (r.target.id==='gearStageV0560'||r.target.hasAttribute?.('data-v0560-slot')) && positions.some(k=>r.target.style.getPropertyValue(k))))))schedule();});for(const target of [root,q('#gearModalV0560')])if(target)observer.observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});sync();}
  document.addEventListener('click',event=>{if(!active||!desktop())return;const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-cg-back'))back();else if(b.hasAttribute('data-cg-change'))window.UI?.open?.('skins');else if(b.dataset.cgSlot)q(`[data-v0560-slot="${b.dataset.cgSlot}"]`,q('#gear'))?.click();else if(b.closest('.cg-chrome')){if(b.dataset.crystalRoute)window.UI?.open?.(b.dataset.crystalRoute);else if(b.dataset.crystalTool)window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);else if(b.hasAttribute('data-crystal-energy'))window.CHERRIFT_PREBETA?.showEnergyModal?.();}},true);
  document.addEventListener('pointerover',event=>{if(!active||!desktop())return;const b=event.target.closest('#gear button,#gearModalV0560 button');if(b&&!b.disabled&&!b.contains(event.relatedTarget)&&performance.now()-lastHover>100){lastHover=performance.now();window.CHERRIFT_V060?.playClickSound?.();}},{passive:true});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape'||!active||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(visible(q('#gearModalV0560'))||qa('[role=dialog][aria-modal=true],.prebeta-frame-modal').some(visible))return;event.preventDefault();event.stopImmediatePropagation();back();},true);
  window.addEventListener('resize',schedule,{passive:true});for(const e of ['cherrift:languagechange','cherrift:savechange'])window.addEventListener(e,schedule);
  window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});window.CHERRIFT_DESKTOP_GEAR=Object.freeze({sync,isDesktop:desktop});
})();
