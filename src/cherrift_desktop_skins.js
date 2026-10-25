/* Sakura Panorama: desktop presentation over the original skin selector.
   Native selection, equip, unlock and sprite-preview controls keep their owners. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_SKINS) return;
  const $ = id => document.getElementById(id);
  const q = (s,r=document) => r?.querySelector(s);
  const qa = (s,r=document) => Array.from(r?.querySelectorAll(s)||[]);
  const desktop = () => window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ??
    (matchMedia('(min-width:821px)').matches && !((navigator.maxTouchPoints>0 || matchMedia('(pointer:coarse)').matches) && innerHeight<=600));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copy = (hu,en) => window.UI?.save?.settings?.language==='en' ? en : hu;
  const state={queued:false,started:false,visible:false,list:null,scroll:0,selected:'',view:'',displayed:'',displayedCutout:false,exit:0,focusKey:null,animations:new Set()};
  const CUTOUT='assets/ui/skins/cherry_ui_skins/optimized/base_cherry_transp_1.webp';
  const ownSelector='[data-sp-owned]';
  const text=(node,value)=>{if(node && node.textContent!==String(value))node.textContent=value;};
  function make(tag,className,parent){const node=document.createElement(tag);node.className=className;node.dataset.spOwned='';parent.append(node);return node;}
  function animate(node,frames,options){if(!node || reduced())return;const animation=node.animate?.(frames,options);if(animation){state.animations.add(animation);animation.finished?.catch(()=>{}).finally(()=>state.animations.delete(animation));}return animation;}
  function visible(node){if(!node || node.hidden || node.classList.contains('hidden'))return false;const style=getComputedStyle(node);return style.display!=='none' && style.visibility!=='hidden';}
  function restore(){
    clearTimeout(state.exit);state.exit=0;
    state.animations.forEach(a=>a.cancel());state.animations.clear();
    document.body.classList.remove('sakura-skins');
    const root=$('skins');
    qa(ownSelector,root).forEach(n=>n.remove());
    qa('[data-sp-card]',root).forEach(n=>{delete n.dataset.spCard;n.removeAttribute('aria-pressed');});
    qa('.sp-art',root).forEach(n=>n.classList.remove('sp-art'));
    qa('.sp-long-name',root).forEach(n=>n.classList.remove('sp-long-name'));
    q('.skin-view-tabs-v093',root)?.removeAttribute('aria-label');
    qa('[data-v093-skin-view]',root).forEach(n=>{n.removeAttribute('role');n.removeAttribute('aria-selected');});
    if(root){root.removeAttribute('data-sp-exiting');root.style.removeProperty('--sp-drift-x');root.style.removeProperty('--sp-drift-y');}
    state.list=null;state.visible=false;state.scroll=0;state.selected='';state.view='';state.focusKey=null;
  }
  function chrome(root){
    let chrome=q('.sp-chrome',root);
    if(!chrome){chrome=make('div','sp-chrome',root);const brand=make('header','crystal-brand',chrome);const logo=document.createElement('img');logo.src='assets/ui/cherrift_logo.png';logo.alt='CHERRIFT';brand.append(logo);const caption=document.createElement('p');caption.textContent='CHERRY · SAKURA PANORAMA';brand.append(caption);
      const back=make('button','sp-back',chrome);back.type='button';back.dataset.spBack='';back.innerHTML='<i aria-hidden="true">‹</i><span></span>';
      const atmosphere=make('div','sp-petals',chrome);atmosphere.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const petal=document.createElement('i');petal.style.setProperty('--i',i);atmosphere.append(petal);}
    }
    text(q('.sp-back span',chrome),copy('VISSZA A FŐMENÜBE','BACK TO LOBBY'));
    const source=q('#crystalDesktopMenu>.crystal-topbar');
    const signature=source?.innerHTML || '';
    if(source && chrome.dataset.header!==signature){
      const focused=q('.crystal-topbar :focus',chrome);const action=focused?.getAttribute('data-crystal-route') || focused?.getAttribute('data-crystal-tool');
      q('.crystal-topbar',chrome)?.remove();
      const clone=source.cloneNode(true);qa('[id]',clone).forEach(n=>n.removeAttribute('id'));chrome.append(clone);chrome.dataset.header=signature;
      if(action)q(`[data-crystal-route="${action}"],[data-crystal-tool="${action}"]`,clone)?.focus({preventScroll:true});
    }
  }
  function decorateList(root,skin){
    const list=q('.skin-list-v093',root);if(!list)return;
    const replaced=list!==state.list;
    for(const button of qa('[data-v093-skin]',list)){
      const entry=window.CHERRIFT_DATA?.skins?.find(s=>s.id===button.dataset.v093Skin);if(!entry)continue;
      if(!button.hasAttribute('data-sp-card')){
        button.dataset.spCard='';
        const art=make('span','sp-card-art',button);art.setAttribute('aria-hidden','true');
        const image=document.createElement('img');image.src=window.CHERRIFT_SKIN_UI?.assetsForSkin?.(entry)?.thumbnail || entry.thumbnail || entry.splash || entry.icon;image.alt='';image.loading='lazy';image.decoding='async';image.draggable=false;art.append(image);
        const label=make('span','sp-card-label',button);const name=document.createElement('b'),rarity=document.createElement('small');name.textContent=button.getAttribute('aria-label') || entry.name;rarity.textContent=entry.rarity || '';label.append(name,rarity);
      }
      button.setAttribute('aria-pressed',String(button.dataset.v093Skin===skin.id));
    }
    if(!q('.sp-roster-arrow',root))for(const step of [-1,1]){const arrow=make('button',`sp-roster-arrow ${step<0?'sp-prev':'sp-next'}`,root);arrow.type='button';arrow.dataset.spStep=step;arrow.setAttribute('aria-label',step<0?copy('Előző skinek','Previous skins'):copy('Következő skinek','Next skins'));arrow.textContent=step<0?'‹':'›';}
    const counter=q('.sp-roster-count',root)||make('p','sp-roster-count',root);const buttons=qa('[data-v093-skin]',list);text(counter,`${buttons.findIndex(b=>b.dataset.v093Skin===skin.id)+1} / ${buttons.length} · ${copy('CHERRY GYŰJTEMÉNY','CHERRY COLLECTION')}`);
    if(replaced){
      state.list=list;list.scrollLeft=state.scroll;
      list.addEventListener('scroll',()=>{if(state.list===list){state.scroll=list.scrollLeft;updateArrows(root,list);}},{passive:true});
      list.addEventListener('wheel',event=>{if(!desktop()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;const before=list.scrollLeft;list.scrollLeft+=event.deltaY;if(list.scrollLeft!==before)event.preventDefault();},{passive:false});
      list.addEventListener('keydown',event=>{
        const current=event.target.closest('[data-v093-skin]');if(!current)return;const buttons=qa('[data-v093-skin]',list);let index=buttons.indexOf(current);
        if(event.key==='ArrowRight')index++;else if(event.key==='ArrowLeft')index--;else if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;else return;
        event.preventDefault();const next=buttons[Math.max(0,Math.min(buttons.length-1,index))];state.focusKey=next.dataset.v093Skin;next.focus({preventScroll:true});next.click();
      });
    }
    const active=q('.active[data-v093-skin]',list);
    if(active && (state.selected!==skin.id || replaced)){
      const left=active.offsetLeft-(list.clientWidth-active.offsetWidth)/2;
      list.scrollTo?.({left:Math.max(0,left),behavior:reduced()?'instant':'smooth'});
    }
    if(state.focusKey){const target=q(`[data-v093-skin="${state.focusKey}"]`,list);target?.focus({preventScroll:true});state.focusKey=null;}
    updateArrows(root,list);
  }
  function updateArrows(root,list){for(const button of qa('[data-sp-step]',root))button.disabled=Number(button.dataset.spStep)<0 ? list.scrollLeft<=1 : list.scrollLeft+list.clientWidth>=list.scrollWidth-2;}
  function hero(root,skin,changed){
    const art=q('.skin-art-v093',root);if(!art)return;
    art.classList.add('sp-art');
    const assets=window.CHERRIFT_SKIN_UI?.assetsForSkin?.(skin);
    let cutout=Boolean(assets?.cutout) || skin.id==='cherry_default';
    const source=assets?.cutout || (cutout?CUTOUT:(assets?.splash || skin.splash || skin.icon));
    let image=q('.sp-hero',art);
    if(image && image.dataset.spSource!==source){image.remove();image=null;}
    if(!image){image=make('img',`sp-hero${cutout?' sp-cutout':' sp-vignette'}`,art);image.alt='';image.draggable=false;image.decoding='async';image.dataset.spSource=source;image.src=source;
      let ghost;
      if(changed && state.displayed && state.displayed!==source){ghost=make('img',`sp-ghost${state.displayedCutout?' sp-cutout':' sp-vignette'}`,art);ghost.alt='';ghost.src=state.displayed;}
      const reveal=()=>{
        if(!image.isConnected)return;
        state.displayed=image.getAttribute('src');state.displayedCutout=cutout;
        if(changed){animate(image,[{opacity:0,transform:'translate3d(24px,0,0) scale(1.025)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:380,easing:'cubic-bezier(.2,.75,.25,1)'});
          if(ghost){const a=animate(ghost,[{opacity:1},{opacity:0}],{duration:280,fill:'forwards'});if(a)a.finished.then(()=>ghost.remove()).catch(()=>ghost.remove());else ghost.remove();}
        }else ghost?.remove();
      };
      if(image.complete && image.naturalWidth)reveal();else image.addEventListener('load',reveal,{once:true});
      image.addEventListener('error',()=>{ghost?.remove();if(cutout){cutout=false;image.classList.replace('sp-cutout','sp-vignette');image.src=assets?.splash || skin.splash || skin.icon;}},{once:true});
    }
  }
  function info(root,skin){
    const details=q('.skin-details-v093',root);if(!details)return;
    const nameRow=q('.cr-desktop-skin-name-row',details);if(nameRow)nameRow.classList.toggle('sp-long-name',(q('h3',nameRow)?.textContent || '').length>13);
    let weapon=q('.sp-weapon',details);
    if(!weapon){weapon=make('section','sp-weapon',details);const label=document.createElement('small'),name=document.createElement('b'),mode=document.createElement('span'),icon=document.createElement('img');icon.alt='';weapon.append(label,name,mode,icon);}
    text(q('small',weapon),copy('FEGYVER','WEAPON'));text(q('b',weapon),skin.weapon || '—');
    weapon.dataset.spWeaponInfo='';weapon.tabIndex=0;weapon.setAttribute('role','button');weapon.setAttribute('aria-label',skin.weapon || copy('Fegyver','Weapon'));
    const config=window.CHERRIFT_CONFIG?.player?.skins?.[skin.id];text(q('span',weapon),copy(config?.attackType==='melee'?'KÖZELHARC':'TÁVOLSÁGI TÁMADÁS',config?.attackType==='melee'?'MELEE':'RANGED ATTACK'));
    const element=window.CHERRIFT_SKIN_UI?.skinElement?.(skin);if(element?.icon && q('img',weapon).getAttribute('src')!==element.icon)q('img',weapon).src=element.icon;
    const tabs=q('.skin-view-tabs-v093',root);if(tabs){tabs.setAttribute('aria-label',copy('Karakter előnézet','Character preview'));qa('button',tabs).forEach(button=>{button.setAttribute('role','tab');button.setAttribute('aria-selected',String(button.classList.contains('active')));});}
  }
  function sync(){
    const root=$('skins');const active=desktop() && visible(root) && !document.body.classList.contains('is-playing');
    if(!active){if(state.visible || document.body.classList.contains('sakura-skins'))restore();return;}
    if(!document.body.classList.contains('sakura-skins'))document.body.classList.add('sakura-skins');
    const skin=window.CHERRIFT_SKIN_UI?.selectedSkin?.();if(!skin)return;
    const currentView=q('[data-v093-skin-view].active',root)?.dataset.v093SkinView || 'splash';
    const changed=state.selected!==skin.id || state.view!==currentView;
    chrome(root);decorateList(root,skin);hero(root,skin,changed);info(root,skin);
    if(changed){animate(q('.skin-details-v093',root),[{opacity:.2,transform:'translate3d(20px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:260,easing:'ease-out'});}
    state.selected=skin.id;state.view=currentView;state.visible=true;
  }
  function schedule(){if(state.queued)return;state.queued=true;queueMicrotask(()=>{state.queued=false;sync();});}
  function back(){if(state.exit)return;const root=$('skins');if(!root)return;root.dataset.spExiting='';const a=animate(root,[{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:'translate3d(-24px,0,0)'}],{duration:160,easing:'ease-in'});
    state.exit=setTimeout(()=>{state.exit=0;a?.cancel();if(!desktop())return;window.UI?.open?.('menu');sync();},reduced()?0:160);
  }
  function start(){
    if(state.started)return;state.started=true;
    new MutationObserver(records=>{if(records.some(r=>r.target===$('skins') || r.target===$('app') || r.target.parentElement===$('app')))schedule();}).observe($('app'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    const top=q('#crystalDesktopMenu>.crystal-topbar');if(top)new MutationObserver(schedule).observe(top,{childList:true,characterData:true,subtree:true});
    sync();
  }
  let lastHover=0;
  document.addEventListener('pointerover',event=>{
    if(!desktop() || !document.body.classList.contains('sakura-skins'))return;
    const button=event.target.closest('#skins button');
    if(!button || button.disabled || button.contains(event.relatedTarget) || performance.now()-lastHover<90)return;
    lastHover=performance.now();if(!window.CHERRIFT_MENU_AUDIO)window.CHERRIFT_V060?.playClickSound?.();
  },{passive:true});
  document.addEventListener('pointerdown',event=>{
    if(desktop() && visible($('skins'))){const button=event.target.closest('#skins [data-v093-skin]');if(button)state.focusKey=button.dataset.v093Skin;}
  },true);
  document.addEventListener('click',event=>{
    if(!desktop() || !visible($('skins')))return;
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.v093Skin && target.contains(document.activeElement))state.focusKey=target.dataset.v093Skin;
    if(target.hasAttribute('data-sp-back')){event.preventDefault();back();}
    else if(target.hasAttribute('data-sp-step')){const list=q('.skin-list-v093',$('skins'));list?.scrollBy({left:Number(target.dataset.spStep)*list.clientWidth*.75,behavior:reduced()?'instant':'smooth'});}
    else if(target.closest('.sp-chrome')){
      if(target.dataset.crystalRoute)UI.open(target.dataset.crystalRoute);
      else if(target.dataset.crystalTool)window.CHERRIFT_V082?.openMenuTool?.(target.dataset.crystalTool);
      else if(target.hasAttribute('data-crystal-energy'))window.CHERRIFT_PREBETA?.showEnergyModal?.();
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape' || !document.body.classList.contains('sakura-skins') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    if(qa('.skin-skill-dialog-v093,.cr-skin-popover,.skin-splash-fullscreen-v5,.prebeta-frame-modal,[role=dialog][aria-modal=true]').some(visible))return;
    event.preventDefault();event.stopImmediatePropagation();back();
  },true);
  window.addEventListener('resize',schedule,{passive:true});
  for(const event of ['cherrift:languagechange','cherrift:savechange'])window.addEventListener(event,schedule);
  window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});
  window.CHERRIFT_DESKTOP_SKINS=Object.freeze({sync,isDesktop:desktop});
})();
