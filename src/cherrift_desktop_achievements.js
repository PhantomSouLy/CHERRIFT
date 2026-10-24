/* Sakura Trophy Gallery: PC presentation over native achievement cards.
   Bulk claim serializes existing server-validated claim_achievement actions. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_ACHIEVEMENTS) return;
  const q=(s,r=document)=>r?.querySelector(s),qa=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
  const desktop=()=>window.CHERRIFT_DESKTOP_MENU?.isDesktop?.()??(innerWidth>=821&&!((navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&innerHeight<=600));
  const copy=(hu,en)=>window.UI?.save?.settings?.language==='en'?en:hu;
  const visible=n=>{if(!n)return false;for(let x=n;x;x=x.parentElement){const s=getComputedStyle(x);if(x.hidden||x.classList.contains('hidden')||s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return false;}return true;};
  const attrs=new Map();let active=false,started=false,queued=false,status='all',focusFilter='',focusClaim='',busy=false,batch=0,completedBatch=0,batchTotal=0;
  const defs=()=>window.CHERRIFT_RUNTIME?.achievements||[];
  const claimed=()=>new Set(window.UI?.save?.fixAchievementsClaimed||[]);
  const ready=d=>{try{return !!d.test(window.UI?.save||{});}catch{return false;}};
  const number=n=>Math.max(0,Number(n)||0);
  function text(n,value){if(n&&n.textContent!==String(value))n.textContent=String(value);}
  function attr(n,key,value){if(!n)return;if(!attrs.has(n))attrs.set(n,new Map());if(!attrs.get(n).has(key))attrs.get(n).set(key,n.getAttribute(key));if(n.getAttribute(key)!==String(value))n.setAttribute(key,String(value));}
  function own(tag,cls,parent){const n=document.createElement(tag);n.className=cls;n.dataset.tgOwned='';n.dataset.i18nIgnore='true';parent.append(n);return n;}
  function restore(){batch++;busy=false;completedBatch=0;batchTotal=0;qa('[data-tg-owned]').forEach(n=>n.remove());for(const[n,values]of attrs)if(n.isConnected)for(const[k,v]of values){if(v===null)n.removeAttribute(k);else n.setAttribute(k,v);}attrs.clear();document.body.classList.remove('sakura-achievements');active=false;status='all';focusFilter='';focusClaim='';}
  function entries(reward={}){const out=[];if(reward.coins)out.push([reward.coins,'assets/items/coin.png','Coin']);if(reward.bloomGems)out.push([reward.bloomGems,'assets/items/blossom_gem.png','Bloom Gem']);for(const tier of ['common','rare','epic'])if(reward.chests?.[tier])out.push([reward.chests[tier],`assets/items/chests/${tier}_chest.png`,`${tier[0].toUpperCase()+tier.slice(1)} Chest`]);for(const theme of reward.themes||[])out.push([1,'',theme==='cozy_cherry'?'Cozy Cherry Theme':String(theme)]);return out;}
  function tokens(root,list){const signature=JSON.stringify(list);if(root.dataset.signature===signature)return;root.dataset.signature=signature;root.replaceChildren();for(const[n,asset,label]of list){const token=document.createElement('span');token.title=`${n} ${label}`;token.setAttribute('aria-label',token.title);if(asset){const img=document.createElement('img');img.src=asset;img.alt='';token.append(img);}else{const icon=document.createElement('i');icon.textContent='❀';icon.setAttribute('aria-hidden','true');token.append(icon);}const b=document.createElement('b');b.textContent=number(n).toLocaleString();token.append(b);root.append(token);}}
  function chrome(root){
    let bar=q('.tg-chrome',root);if(!bar){bar=own('header','tg-chrome',root);bar.innerHTML='<button type="button" data-tg-back></button><div><small>SAKURA TROPHY GALLERY</small><h1></h1></div><div class="tg-wallet"></div>';const footer=own('footer','tg-footer',root);footer.innerHTML='<div class="tg-overall"><small></small><b></b><div class="tg-overall-track"><i></i></div></div><button type="button" data-tg-claim-all></button><span class="tg-batch-status" role="status" aria-live="polite"></span>';const tools=own('div','tg-tools',root);tools.innerHTML='<span></span><label><span class="tg-filter-label"></span><select data-tg-status><option value="all"></option><option value="ready"></option><option value="progress"></option><option value="claimed"></option><option value="locked"></option></select></label>';}
    text(q('h1',bar),copy('EREDMÉNYEK','ACHIEVEMENTS'));text(q('[data-tg-back]',bar),copy('‹ FŐMENÜ','‹ LOBBY'));
    const s=window.UI?.save||{};tokens(q('.tg-wallet',bar),[[number(s.coins),'assets/items/coin.png','Coin'],[number(s.bloomGems??s.blossomGems),'assets/items/blossom_gem.png','Bloom Gem']]);
    const select=q('[data-tg-status]',root);for(const[key,hu,en]of [['all','Minden állapot','All statuses'],['ready','Átvehető','Ready to claim'],['progress','Folyamatban','In progress'],['claimed','Átvéve','Claimed'],['locked','Még nem teljesített','Not started']])text(q(`option[value=${key}]`,select),copy(hu,en));if(select.value!==status)select.value=status;
    text(q('.tg-filter-label',root),copy('Szűrés','Filter'));
  }
  function sync(){
    const root=q('#achievements');if(!desktop()||!visible(root)||!q('.cr-ach-grid',root)||document.body.classList.contains('is-playing')){if(active)restore();return;}
    active=true;if(!document.body.classList.contains('sakura-achievements'))document.body.classList.add('sakura-achievements');for(const n of attrs.keys())if(!n.isConnected)attrs.delete(n);chrome(root);
    const catalogue=defs(),owned=claimed();let shown=0;
    for(const card of qa('.cr-ach-card',root)){
      const button=q('[data-cr-ach-claim]',card),id=button?.dataset.crAchClaim,def=catalogue.find(d=>d.id===id);if(!def)continue;
      const unlocked=ready(def),done=owned.has(id);let progress='';try{progress=String(def.progress(window.UI.save));}catch{}
      const numbers=progress.match(/([\d.,]+)\s*\/\s*([\d.,]+)/),clean=v=>number(String(v).replace(/[,\s]/g,''));const max=numbers?clean(numbers[2]):1,value=numbers?Math.min(max,clean(numbers[1])):(unlocked?1:0);
      const state=done?'claimed':unlocked?'ready':value>0?'progress':'locked';attr(card,'data-tg-state',state);
      const match=status==='all'||state===status;attr(card,'data-tg-filtered',String(!match));if(match)shown++;
      const tier=def.tier===1?'gold':def.tier===2?'silver':'bronze';attr(card,'data-tg-tier',tier);
      const medal=q('.cr-ach-tier',card);let image=q('.tg-medal',medal);if(!image){image=own('img','tg-medal',medal);image.alt='';image.draggable=false;}const path=`assets/ui/achievements/${tier}-medal-pc.webp`;if(image.getAttribute('src')!==path)image.src=path;
      let badge=q('.tg-badge',card);if(!badge)badge=own('span','tg-badge',card);text(badge,state==='claimed'?'✓':state==='ready'?'!':state==='locked'?'◇':'');attr(badge,'aria-label',state==='claimed'?copy('Átvéve','Claimed'):state==='ready'?copy('Átvehető','Ready to claim'):state==='locked'?copy('Még nem teljesített','Not started'):copy('Folyamatban','In progress'));
      let meter=q('.tg-progress',card);if(!meter){meter=own('div','tg-progress',q('.cr-ach-copy',card));meter.append(document.createElement('i'));}attr(meter,'role','progressbar');attr(meter,'aria-label',def.name);attr(meter,'aria-valuemin','0');attr(meter,'aria-valuemax',String(max));attr(meter,'aria-valuenow',String(value));const width=`${max?Math.min(100,value/max*100):0}%`;if(meter.firstElementChild.style.width!==width)meter.firstElementChild.style.width=width;
      let rewards=q('.tg-rewards',card);if(!rewards)rewards=own('div','tg-rewards',card);tokens(rewards,entries(def.reward));
    }
    const total=catalogue.length,complete=catalogue.filter(d=>owned.has(d.id)||ready(d)).length,unclaimed=catalogue.filter(d=>ready(d)&&!owned.has(d.id)).length;
    text(q('.tg-overall small',root),copy('ÖSSZESÍTETT HALADÁS','OVERALL COMPLETION'));text(q('.tg-overall b',root),`${complete} / ${total}`);const fill=q('.tg-overall-track i',root),width=`${total?complete/total*100:0}%`;if(fill.style.width!==width)fill.style.width=width;
    const all=q('[data-tg-claim-all]',root);text(all,busy?`${copy('ÁTVÉTEL','CLAIMING')} ${completedBatch} / ${batchTotal}`:copy(`ÖSSZES ÁTVÉTELE (${unclaimed})`,`CLAIM ALL (${unclaimed})`));const disabled=busy||!unclaimed||!window.CHERRIFT_ONLINE?.perform;if(all.disabled!==disabled)all.disabled=disabled;
    text(q('.tg-tools>span',root),`${shown} ${copy('eredmény látható','achievements shown')} · ${unclaimed} ${copy('átvehető','ready to claim')}`);
    if(!busy)text(q('.tg-batch-status',root),'');
    const nav=q('.cr-ach-filter',root);attr(nav,'aria-label',copy('Görgethető eredménykategóriák','Scrollable achievement categories'));for(const b of qa('[data-cr-ach-filter]',nav))attr(b,'aria-pressed',String(b.classList.contains('active')));
    let empty=q('.tg-empty',root);if(!empty)empty=own('p','tg-empty',root);text(empty,copy('Ebben a szűrésben nincs eredmény.','No achievements match this filter.'));empty.hidden=shown!==0;
    if(focusFilter){q(`[data-cr-ach-filter="${focusFilter}"]`,root)?.focus({preventScroll:true});focusFilter='';}
    if(focusClaim){const b=qa('[data-cr-ach-claim]',root).find(b=>b.dataset.crAchClaim===focusClaim);if(b&&!b.disabled)b.focus({preventScroll:true});else if(b){const card=b.closest('article');attr(card,'tabindex','-1');card.focus({preventScroll:true});}focusClaim='';}
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
  async function claimAll(){
    if(busy||!active||!desktop())return;
    const api=window.CHERRIFT_ONLINE,auth=window.CHERRIFT_AUTH,owned=claimed(),ids=defs().filter(d=>ready(d)&&!owned.has(d.id)).map(d=>d.id);if(!api?.perform||!ids.length)return;
    if(!api.online?.()){const first=qa('[data-cr-ach-claim]').find(b=>b.dataset.crAchClaim===ids[0]);if(first&&!first.disabled)first.click();else window.UI?.toast?.(copy('A jutalomátvételhez online bejelentkezés szükséges.','Sign in online to claim rewards.'));return;}
    if(!auth?.captureAccount||!auth?.isCurrentAccount)return;
    const context=auth.captureAccount(),token=++batch;busy=true;batchTotal=ids.length;completedBatch=0;sync();
    try{for(const id of ids){if(token!==batch||!active||!desktop()||!auth.isCurrentAccount(context))break;const def=defs().find(d=>d.id===id);if(!def||!ready(def)||claimed().has(id))continue;const result=await api.perform('claim_achievement',{achievement_id:id});if(token!==batch||!auth.isCurrentAccount(context))break;if(!result)break;completedBatch++;sync();}}
    catch{window.UI?.toast?.(copy('Az átvétel megszakadt. Az átvett jutalmak megmaradtak.','Claiming stopped. Completed rewards are retained.'));}
    finally{if(token===batch){busy=false;sync();text(q('.tg-batch-status'),copy(`${completedBatch} jutalom átvéve`,`${completedBatch} rewards claimed`));q('[data-tg-claim-all]')?.focus({preventScroll:true});}}
  }
  function back(){const native=q('#achievements [data-cr-ach-back]');if(native)native.click();else window.UI?.open?.('menu');sync();window.CHERRIFT_DESKTOP_MENU?.sync?.();}
  window.addEventListener('click',event=>{if(!active||!desktop())return;const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-tg-back'))back();if(b.hasAttribute('data-tg-claim-all'))void claimAll();if(b.dataset.crAchFilter)focusFilter=b.dataset.crAchFilter;if(b.dataset.crAchClaim)focusClaim=b.dataset.crAchClaim;},true);
  document.addEventListener('change',event=>{if(active&&desktop()&&event.target.matches('[data-tg-status]')){status=event.target.value;sync();}});
  window.addEventListener('keydown',event=>{if(!active||!desktop()||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(qa('[role=dialog][aria-modal=true],.v082-modal,.prebeta-frame-modal').some(visible))return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();back();return;}const nav=event.target.closest('.cr-ach-filter');if(nav&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){const buttons=qa('button:not(:disabled)',nav),i=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,i+(event.key==='ArrowDown'?1:-1)));event.preventDefault();buttons[next]?.focus();buttons[next]?.scrollIntoView?.({block:'nearest'});}},true);
  function start(){if(started||!q('#app'))return;started=true;new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('[data-tg-owned]')))schedule();}).observe(q('#achievements'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});sync();}
  window.addEventListener('resize',schedule,{passive:true});for(const e of ['cherrift:savechange','cherrift:languagechange','cherrift:economychange'])window.addEventListener(e,schedule);window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});
  window.CHERRIFT_DESKTOP_ACHIEVEMENTS=Object.freeze({sync,isDesktop:desktop});
})();
