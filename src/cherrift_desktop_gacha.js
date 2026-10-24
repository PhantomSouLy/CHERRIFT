/* Blossom Summoning: presentation only. Native Gacha owns requests, inventory and reveals. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_GACHA) return;
  const q=(s,r=document)=>r?.querySelector(s),qa=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
  const desktop=()=>window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ?? (innerWidth>=821&&!((navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&innerHeight<=600));
  const visible=n=>!!n&&!n.hidden&&!n.classList.contains('hidden')&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden';
  const copy=(hu,en)=>window.UI?.save?.settings?.language==='en'?en:hu;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiers=['common','rare','epic'],animations=new Set(),modified=new Map();
  let active=false,queued=false,started=false,current='',exit=0,lastHover=0,modalState='',modalNode=null,focusTier='',focusAction='1';
  const text=(n,value)=>{if(n&&n.textContent!==String(value))n.textContent=value;};
  function make(tag,cls,parent){const n=document.createElement(tag);n.className=cls;n.dataset.bsOwned='';n.dataset.i18nIgnore='true';parent.append(n);return n;}
  function remember(n,attribute,value){if(!modified.has(n))modified.set(n,new Map());const values=modified.get(n);if(!values.has(attribute))values.set(attribute,n.getAttribute(attribute));if(n.getAttribute(attribute)!==String(value))n.setAttribute(attribute,value);}
  function animate(n,frames,duration=320){if(!n||reduced())return;const a=n.animate?.(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)'});if(a){animations.add(a);a.finished?.catch(()=>{}).finally(()=>animations.delete(a));}}
  function restore(){clearTimeout(exit);exit=0;animations.forEach(a=>a.cancel());animations.clear();qa('[data-bs-owned]').forEach(n=>n.remove());for(const[n,attrs]of modified){if(n.isConnected)for(const[k,v]of attrs){if(v===null)n.removeAttribute(k);else n.setAttribute(k,v);}}modified.clear();document.body.classList.remove('blossom-gacha');active=false;current='';modalState='';modalNode=null;focusTier='';}
  function chrome(root){
    let bar=q('.bs-chrome',root);
    if(!bar){bar=make('header','bs-chrome',root);const logo=make('img','bs-logo',bar);logo.src='assets/ui/cherrift_logo.png';logo.alt='CHERRIFT';const title=make('div','bs-heading',bar);title.innerHTML='<small>BLOSSOM SUMMONING</small><h1>GACHA</h1>';const back=make('button','bs-back',bar);back.type='button';back.dataset.bsBack='';}
    text(q('.bs-back',bar),copy('‹ FŐMENÜ','‹ LOBBY'));
    const original=q('#crystalDesktopMenu>.crystal-topbar');if(original&&bar.dataset.signature!==original.innerHTML){q('.crystal-topbar',bar)?.remove();const clone=original.cloneNode(true);qa('[id]',clone).forEach(n=>n.removeAttribute('id'));bar.append(clone);bar.dataset.signature=original.innerHTML;}
  }
  function art(root,tier,changed){
    let stage=q('.bs-stage',root);
    if(!stage){stage=make('div','bs-stage',root);stage.setAttribute('aria-hidden','true');make('div','bs-aura',stage);make('div','bs-chest',stage);const motes=make('div','bs-motes',stage);for(let i=0;i<12;i++){const p=document.createElement('i');p.style.setProperty('--i',i);motes.append(p);}}
    remember(root,'data-bs-tier',tier);
    const chest=q('.bs-chest',stage);const path=`url("assets/ui/gacha/${tier}-states-pc.webp")`;if(chest.style.backgroundImage!==path)chest.style.backgroundImage=path;
    if(changed)animate(stage,[{opacity:0,transform:'translate3d(-22px,0,0) scale(.95)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],380);
  }
  function selector(root,tier){
    const dots=q('#gcoDots',root);if(!dots)return;
    remember(dots,'aria-label',copy('Láda kiválasztása','Choose a chest'));
    for(const button of qa('[data-gco-tier]',dots)){
      const key=button.dataset.gcoTier;if(!tiers.includes(key))continue;
      remember(button,'aria-pressed',String(key===tier));
      if(!q('.bs-tier-art',button)){const image=make('span','bs-tier-art',button);image.setAttribute('aria-hidden','true');image.style.backgroundImage=`url("assets/ui/gacha/${key}-states-pc.webp")`;make('b','bs-tier-name',button);make('small','bs-tier-count',button);}
      const name=q('.bs-tier-name',button);text(name,`${key[0].toUpperCase()+key.slice(1)} ${copy('láda','Chest')}`);
      text(q('.bs-tier-count',button),`${copy('Birtokolt','Owned')}: ${Number(window.UI?.save?.chests?.[key])||0}`);
    }
  }
  function detail(root,tier){
    const card=q('[data-gco-card]',root);if(!card)return;
    let owned=q('.bs-owned',card);if(!owned)owned=make('p','bs-owned',card);
    text(owned,`${copy('BIRTOKOLT LÁDA','CHESTS OWNED')} · ${Number(window.UI?.save?.chests?.[tier])||0}`);
    const actions=q('.gco-actions',card);if(actions)remember(actions,'aria-label',copy('Láda nyitása','Open chest'));
  }
  function ornaments(root,tier){
    let preview=q('.bs-reward-types',root);
    if(!preview){preview=make('div','bs-reward-types',root);preview.setAttribute('aria-hidden','true');for(const path of ['assets/items/equipments/weapons/royal_sword.png','assets/items/equipments/accessories/royal_ring.png','assets/items/sakura_potion.png']){const frame=document.createElement('span'),img=document.createElement('img');img.src=path;img.alt='';img.draggable=false;frame.append(img);preview.append(frame);}make('small','bs-reward-caption',preview);}
    const images=qa('img',preview);const weapon=tier==='common'?'steel_sword':tier==='rare'?'iron_sword':'royal_sword';const gear=`assets/items/equipments/weapons/${weapon}.png`;if(images[0].getAttribute('src')!==gear)images[0].src=gear;
    const skin=window.CHERRIFT_DATA?.skins?.find(s=>String(s.rarity||'Common').toLowerCase()===tier);const skinArt=skin&&(window.CHERRIFT_SKIN_UI?.assetsForSkin?.(skin)?.splash||skin.splash||skin.icon);if(skinArt&&images[1].getAttribute('src')!==skinArt)images[1].src=skinArt;
    text(q('.bs-reward-caption',preview),copy('JUTALOMTÍPUSOK · ILLUSZTRÁCIÓ','REWARD TYPES · ILLUSTRATION'));
    let note=q('.bs-note',root);if(!note)note=make('p','bs-note',root);
    text(note,copy('A nyitás a saját ládáidból történik. A jutalmakat a játékszerver határozza meg.','Open chests from your collection. Rewards are determined by the game server.'));
  }
  function modal(root,tier){
    const opening=q('.gco-opening',root);if(!opening)return;
    const origin=tiers.find(t=>opening.classList.contains(t))||tier;
    let chest=q('.bs-opening-chest',opening);if(!chest){chest=make('div','bs-opening-chest',opening);chest.setAttribute('aria-hidden','true');}
    chest.style.backgroundImage=`url("assets/ui/gacha/${origin}-states-pc.webp")`;
  }
  function focusModal(root){
    const dialog=q('#gcoModal',root),opened=visible(dialog),phase=opened?(q('.gco-opening',dialog)?'opening':q('.gco-skin-reveal',dialog)?'skin':'summary'):'';
    if(phase!==modalState||(opened&&dialog.firstElementChild!==modalNode)){const previous=modalState;modalState=phase;modalNode=opened?dialog.firstElementChild:null;if(opened){remember(dialog,'tabindex','-1');remember(dialog,'aria-label',copy('Ládanyitás és jutalmak','Chest opening and rewards'));(q('.gco-close,.gco-next',dialog)||dialog).focus({preventScroll:true});}else if(previous){const action=q(`[data-gco-open="${focusAction}"]`,root);(action&&!action.disabled?action:q(`[data-gco-tier="${current}"]`,root))?.focus({preventScroll:true});}}
  }
  function sync(){
    const root=q('#gachaChestOnlyV12');if(!desktop()||!visible(root)||document.body.classList.contains('is-playing')){if(active)restore();return;}
    const card=q('[data-gco-card]',root);const tier=tiers.find(t=>card?.classList.contains(t));if(!tier)return;
    const changed=current!==tier;active=true;if(!document.body.classList.contains('blossom-gacha'))document.body.classList.add('blossom-gacha');for(const n of modified.keys())if(!n.isConnected)modified.delete(n);
    chrome(root);art(root,tier,changed);selector(root,tier);detail(root,tier);ornaments(root,tier);modal(root,tier);
    if(changed)animate(card,[{opacity:.15,transform:'translate3d(18px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],280);
    current=tier;focusModal(root);if(focusTier){q(`[data-gco-tier="${focusTier}"]`,root)?.focus({preventScroll:true});focusTier='';}
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
  function back(){if(exit)return;const root=q('#gachaChestOnlyV12');if(visible(q('#gcoModal',root))){q('[data-gco-back]',root)?.click();return;}
    animate(root,[{opacity:1},{opacity:0,transform:'translate3d(-20px,0,0)'}],160);exit=setTimeout(()=>{exit=0;if(desktop()&&visible(root))q('[data-gco-back]',root)?.click();sync();window.CHERRIFT_DESKTOP_MENU?.sync?.();},reduced()?0:160);
  }
  function start(){if(started)return;const app=q('#app');if(!app)return;started=true;new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('[data-bs-owned]')&&(r.type==='childList'||r.target===app||r.target===q('#gachaChestOnlyV12')||r.target===q('#gcoModal'))))schedule();}).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});sync();}
  document.addEventListener('click',event=>{
    if(!active||!desktop())return;const b=event.target.closest('button');if(!b)return;
    if(b.dataset.gcoTier)focusTier=b.dataset.gcoTier;if(b.dataset.gcoOpen)focusAction=b.dataset.gcoOpen;
    if(b.hasAttribute('data-bs-back'))back();
    else if(b.closest('.bs-chrome')){if(b.dataset.crystalRoute)window.UI?.open?.(b.dataset.crystalRoute);else if(b.dataset.crystalTool)window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);else if(b.hasAttribute('data-crystal-energy'))window.CHERRIFT_PREBETA?.showEnergyModal?.();}
  },true);
  document.addEventListener('keydown',event=>{
    if(!active||!desktop()||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    const root=q('#gachaChestOnlyV12'),dialog=q('#gcoModal',root);
    if(visible(dialog)){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();q('.gco-close,.gco-next',dialog)?.click();}
      else if(event.key==='Tab'){const stops=qa('button:not(:disabled),[tabindex="0"]',dialog).filter(visible);const first=stops[0],last=stops.at(-1);if(!stops.length){event.preventDefault();dialog.focus();}else if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement)||document.activeElement===dialog)){event.preventDefault();first.focus();}}
      return;
    }
    if(qa('[role=dialog][aria-modal=true],.prebeta-frame-modal').some(n=>!root.contains(n)&&visible(n)))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();back();}
    else if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&event.target.closest('#gcoDots')){const index=tiers.indexOf(current),next=event.key==='Home'?0:event.key==='End'?2:Math.max(0,Math.min(2,index+(event.key==='ArrowRight'?1:-1)));event.preventDefault();q(`[data-gco-tier="${tiers[next]}"]`,root)?.click();q(`[data-gco-tier="${tiers[next]}"]`,root)?.focus({preventScroll:true});}
  },true);
  document.addEventListener('pointerover',event=>{if(!active||!desktop())return;const b=event.target.closest('#gachaChestOnlyV12 button');if(b&&!b.disabled&&!b.contains(event.relatedTarget)&&performance.now()-lastHover>100){lastHover=performance.now();window.CHERRIFT_V060?.playClickSound?.();}},{passive:true});
  window.addEventListener('resize',schedule,{passive:true});for(const e of ['cherrift:languagechange','cherrift:economychange','cherrift:savechange'])window.addEventListener(e,schedule);
  window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});window.CHERRIFT_DESKTOP_GACHA=Object.freeze({sync,isDesktop:desktop});
})();
