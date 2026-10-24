/* Celestial Constellation: desktop presentation of the existing Upgrade system.
   Native branch renders supply the node data. The existing online operation owns upgrades. */
(() => {
  'use strict';
  if (window.CHERRIFT_DESKTOP_UPGRADE) return;
  const q=(s,r=document)=>r?.querySelector(s),qa=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
  const desktop=()=>window.CHERRIFT_DESKTOP_MENU?.isDesktop?.() ?? (innerWidth>=821&&!((navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&innerHeight<=600));
  const visible=n=>!!n&&!n.hidden&&!n.classList.contains('hidden')&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden';
  const copy=(hu,en)=>window.UI?.save?.settings?.language==='en'?en:hu;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state={active:false,started:false,queued:false,reading:false,signature:'',graph:'',detail:'',selected:'',filter:'all',branches:[],nodes:[],pending:false,exit:0,hover:0};
  const animations=new Set();
  const text=(node,value)=>{if(node&&node.textContent!==String(value))node.textContent=value;};
  function make(tag,cls,parent){const n=document.createElement(tag);n.className=cls;n.dataset.ccOwned='';n.dataset.i18nIgnore='true';parent.append(n);return n;}
  function animate(n,frames,duration=280){if(!n||reduced())return;const a=n.animate?.(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)'});if(a){animations.add(a);a.finished?.catch(()=>{}).finally(()=>animations.delete(a));}}
  function restore(){clearTimeout(state.exit);state.exit=0;animations.forEach(a=>a.cancel());animations.clear();qa('[data-cc-owned]').forEach(n=>n.remove());document.body.classList.remove('celestial-upgrade');state.active=false;state.signature='';state.graph='';state.detail='';}
  function snapshot(root){
    const tabs=qa('#skillBranchTabsV096 [data-v096-skill-branch]',root);if(!tabs.length)return false;
    const selected=q('#skillBranchTabsV096 .active',root)?.dataset.v096SkillBranch||tabs[0].dataset.v096SkillBranch;
    const scroll=q('#skillTreeScrollV082',root),scrollTop=scroll?.scrollTop||0;
    const branches=tabs.map(t=>({id:t.dataset.v096SkillBranch,name:q('b',t)?.textContent||t.textContent,color:t.style.getPropertyValue('--skill-branch')||'#ef9dce',icon:q('span',t)?.textContent||'✦'}));
    const nodes=[];state.reading=true;
    try{
      for(const [branchIndex,branch] of branches.entries()){
        const tab=q(`[data-v096-skill-branch="${branch.id}"]`,root);if(!tab.classList.contains('active'))tab.click();
        const cards=qa('[data-v096-skill-card]',root);
        for(const [index,card]of cards.entries()){
          const native=q('[data-v082-skill]',card);if(!native)continue;
          const id=native.dataset.v082Skill,attrs=card.dataset;
          const status=['locked','available','invested','maxed'].find(s=>card.classList.contains(s))||'locked';
          const icon=window.CHERRIFT_ITEM_ASSETS?.skills?.[id]||q('.skill-node-icon-v082 img',card)?.getAttribute('src')||window.CHERRIFT_ITEM_ASSETS?.actions?.upgrade||'assets/items/upgrade.png';
          const [rank,max]=String(attrs.v096Rank||'0/0').split('/').map(Number);
          // Each chain follows the original native order; no new prerequisites are invented.
          const angle=(-132+branchIndex*120+index*(104/Math.max(1,cards.length-1)))*Math.PI/180;
          const radius=[26,35,43,32,42,38][index%6];
          nodes.push({id,branch:branch.id,color:branch.color,index,name:attrs.v096Name||q('h4',card)?.textContent||id,desc:attrs.v096Desc||'',current:attrs.v096Current||'0',next:attrs.v096Next||'0',unlock:Number(attrs.v096Unlock)||0,rank,max,status,disabled:native.disabled,gate:q('.skill-node-copy-v100 em',card)?.textContent||'',icon,frame:q('.skill-node-frame-v100',card)?.getAttribute('src')||'',x:50+Math.cos(angle)*radius,y:50+Math.sin(angle)*radius});
        }
      }
    }finally{
      const original=q(`[data-v096-skill-branch="${selected}"]`,root);if(original&&!original.classList.contains('active'))original.click();
      if(scroll)scroll.scrollTop=scrollTop;state.reading=false;
    }
    state.branches=branches;state.nodes=nodes;
    if(!nodes.some(n=>n.id===state.selected))state.selected=nodes.find(n=>n.status!=='locked')?.id||nodes[0]?.id||'';
    if(state.filter!=='all'&&!branches.some(b=>b.id===state.filter))state.filter='all';
    return nodes.length>0;
  }
  function chrome(root){
    let bar=q('.cc-chrome',root);
    if(!bar){bar=make('header','cc-chrome',root);const logo=make('img','cc-logo',bar);logo.src='assets/ui/cherrift_logo.png';logo.alt='CHERRIFT';const title=make('div','cc-heading',bar);title.innerHTML='<small>CELESTIAL CONSTELLATION</small><h1>UPGRADE</h1>';const back=make('button','cc-back',bar);back.type='button';back.dataset.ccBack='';}
    text(q('.cc-back',bar),copy('‹ FŐMENÜ','‹ LOBBY'));
    const source=q('#crystalDesktopMenu>.crystal-topbar');if(source&&bar.dataset.signature!==source.innerHTML){q('.crystal-topbar',bar)?.remove();const clone=source.cloneNode(true);qa('[id]',clone).forEach(n=>n.removeAttribute('id'));bar.append(clone);bar.dataset.signature=source.innerHTML;}
  }
  function graph(root){
    let map=q('.cc-map',root);
    if(!map){map=make('section','cc-map',root);map.setAttribute('aria-label',copy('Fejlesztési csillagkép','Upgrade constellation'));const dial=make('div','cc-dial',map);const frame=make('img','cc-ring',dial);frame.src='assets/ui/upgrade/constellation-frame-pc.webp';frame.alt='';frame.draggable=false;const core=make('button','cc-core',dial);core.type='button';core.dataset.ccSkin='';core.innerHTML='<img alt=""><span></span>';make('div','cc-nodes',dial);}
    const core=q('.cc-core',map),skin=window.CHERRIFT_DATA?.skins?.find(s=>s.id===window.UI?.save?.selectedSkin)||window.CHERRIFT_DATA?.skins?.[0];
    if(skin){const path=window.CHERRIFT_SKIN_UI?.assetsForSkin?.(skin)?.splash||skin.splash||skin.icon;if(path&&q('img',core).getAttribute('src')!==path)q('img',core).src=path;text(q('span',core),skin.name);core.setAttribute('aria-label',copy('Cherry kiválasztása','Choose Cherry'));}
    const signature=JSON.stringify([state.nodes,copy('hu','en')]);if(state.graph===signature)return;
    const focused=q('.cc-nodes :focus',map)?.dataset.ccSelect;
    state.graph=signature;q('.cc-lines',map)?.remove();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','cc-lines');svg.dataset.ccOwned='';svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('aria-hidden','true');q('.cc-dial',map).append(svg);
    for(const branch of state.branches){const list=state.nodes.filter(n=>n.branch===branch.id);for(let i=0;i<list.length;i++){const from=i?list[i-1]:{x:50,y:50},to=list[i];const line=document.createElementNS(svg.namespaceURI,'line');for(const[k,v]of Object.entries({x1:from.x*10,y1:from.y*10,x2:to.x*10,y2:to.y*10,class:`cc-link ${to.status==='locked'?'locked':'lit'}${i?'':' cc-origin'}`}))line.setAttribute(k,v);line.style.setProperty('--cc-color',branch.color);svg.append(line);}}
    const container=q('.cc-nodes',map);container.replaceChildren();
    for(const node of state.nodes){const button=document.createElement('button');button.type='button';button.className=`cc-node ${node.status}`;button.dataset.ccSelect=node.id;button.style.setProperty('--cc-x',node.x+'%');button.style.setProperty('--cc-y',node.y+'%');button.style.setProperty('--cc-color',node.color);const frame=document.createElement('img');frame.className='cc-node-frame';frame.src=node.frame;frame.alt='';const icon=document.createElement('img');icon.className='cc-node-icon';icon.src=node.icon;icon.alt='';const rank=document.createElement('small');rank.textContent=`${node.rank}/${node.max}`;const label=document.createElement('span');label.className='cc-node-label';label.textContent=node.name;button.append(frame,icon,rank,label);if(node.status==='locked'){const lock=document.createElement('span');lock.className='cc-lock';lock.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="10" rx="2"/><path d="M6 8V5a4 4 0 0 1 8 0v3" fill="none"/></svg>';button.append(lock);}button.setAttribute('aria-label',`${node.name}, ${node.rank}/${node.max}${node.status==='locked'?copy(', zárolva',', locked'):''}`);container.append(button);}
    animate(container,[{opacity:.3},{opacity:1}],240);if(focused)q(`[data-cc-select="${focused}"]`,container)?.focus({preventScroll:true});
  }
  function tabs(root){
    const bar=q('.cc-branches',root)||make('nav','cc-branches',root);bar.setAttribute('aria-label',copy('Fejlesztési ágak','Upgrade branches'));
    const signature=JSON.stringify([state.branches,copy('hu','en')]);if(bar.dataset.signature!==signature){bar.replaceChildren();for(const branch of [{id:'all',name:copy('TELJES CSILLAGKÉP','ALL SKILLS'),icon:'✦',color:'#efb0df'},...state.branches]){const b=document.createElement('button');b.type='button';b.dataset.ccBranch=branch.id;b.style.setProperty('--cc-color',branch.color);const icon=document.createElement('span'),name=document.createElement('b');icon.textContent=branch.icon;name.textContent=branch.name;b.append(icon,name);bar.append(b);}bar.dataset.signature=signature;}
    for(const b of qa('[data-cc-branch]',bar))b.setAttribute('aria-pressed',String(b.dataset.ccBranch===state.filter));
    for(const b of qa('[data-cc-select]',root)){const node=state.nodes.find(n=>n.id===b.dataset.ccSelect),muted=state.filter!=='all'&&node.branch!==state.filter;b.classList.toggle('cc-muted',muted);b.disabled=muted;b.setAttribute('aria-pressed',String(node.id===state.selected));}
  }
  function detail(root){
    const node=state.nodes.find(n=>n.id===state.selected);if(!node)return;
    let panel=q('.cc-detail',root);if(!panel){panel=make('aside','cc-detail',root);panel.setAttribute('aria-live','polite');panel.innerHTML='<div class="cc-account"><div><small></small><b></b></div><div><small></small><b></b></div></div><div class="cc-selected-icon"><img alt=""></div><p class="cc-category"></p><h2></h2><div class="cc-ranks"></div><p class="cc-description"></p><div class="cc-values"><div><small></small><b></b></div><div><small></small><b></b></div></div><section class="cc-requirements"><h3></h3><p class="cc-cost"></p><p class="cc-level"></p><p class="cc-prereq"></p></section><button type="button" class="cc-upgrade" data-cc-upgrade></button><p class="cc-status"></p><div class="cc-tools"><button type="button" data-cc-resonance></button><button type="button" data-cc-summary></button><button type="button" data-cc-reset></button></div>';}
    const points=Number(window.UI?.save?.account?.skillPoints)||0,level=Number(window.UI?.save?.account?.level)||1;
    const accounts=qa('.cc-account>div',panel);text(q('small',accounts[0]),copy('JÁTÉKOSSZINT','PLAYER LEVEL'));text(q('b',accounts[0]),level);text(q('small',accounts[1]),copy('KÉPESSÉGPONT','SKILL POINTS'));text(q('b',accounts[1]),points);
    const img=q('.cc-selected-icon img',panel);if(img.getAttribute('src')!==node.icon)img.src=node.icon;
    text(q('.cc-category',panel),state.branches.find(b=>b.id===node.branch)?.name||'');text(q('h2',panel),node.name);text(q('.cc-description',panel),node.desc);
    const pips=q('.cc-ranks',panel),rankKey=`${node.rank}/${node.max}`;if(pips.dataset.rank!==rankKey){pips.replaceChildren();for(let i=0;i<node.max;i++){const p=document.createElement('i');p.className=i<node.rank?'filled':'';pips.append(p);}pips.dataset.rank=rankKey;}pips.setAttribute('aria-label',rankKey);
    const values=qa('.cc-values>div',panel);text(q('small',values[0]),copy('JELENLEGI','CURRENT'));text(q('b',values[0]),node.current);text(q('small',values[1]),copy('KÖVETKEZŐ','NEXT'));text(q('b',values[1]),node.next);
    text(q('.cc-requirements h3',panel),copy('KÖVETELMÉNYEK','REQUIREMENTS'));text(q('.cc-cost',panel),copy('Költség: 1 képességpont','Cost: 1 skill point'));text(q('.cc-level',panel),`${copy('Szükséges játékosszint','Required player level')}: ${node.unlock}`);
    const list=state.nodes.filter(n=>n.branch===node.branch),previous=list[node.index-1];text(q('.cc-prereq',panel),previous?`${copy('Előfeltétel','Prerequisite')}: ${previous.name} ${previous.max}/${previous.max}`:copy('Az ág kezdő fejlesztése.','First upgrade in this branch.'));
    const action=q('[data-cc-upgrade]',panel);action.disabled=node.disabled||state.pending;text(action,state.pending?copy('FOLYAMATBAN…','UPGRADING…'):node.status==='maxed'?'MAX':copy('FEJLESZTÉS','UPGRADE'));
    text(q('.cc-status',panel),node.status==='maxed'?copy('Elérted a maximális rangot.','Maximum rank reached.'):node.gate||(points<1?copy('Nincs elkölthető képességpontod.','No skill points available.'):copy('A fejlesztés az összes Cherryre érvényes.','This upgrade applies to every Cherry.')));
    text(q('[data-cc-resonance]',panel),'ELEMENTAL RESONANCE');text(q('[data-cc-summary]',panel),copy('STATISZTIKÁK','STAT SUMMARY'));text(q('[data-cc-reset]',panel),copy('VISSZAÁLLÍTÁS','RESET TREE'));
    const key=node.id;if(state.detail!==key){animate(panel,[{opacity:.3,transform:'translate3d(18px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],240);state.detail=key;}
  }
  function sync(){
    if(state.reading)return;const root=q('#playerUpgrade');if(!desktop()||!visible(root)||root.classList.contains('resonance-mode-v095')||document.body.classList.contains('is-playing')){if(state.active)restore();return;}
    const signature=JSON.stringify([copy('hu','en'),window.UI?.save?.account,qa('[data-v096-skill-card]',root).map(n=>[Object.assign({},n.dataset),q('[data-v082-skill]',n)?.disabled])]);
    if(state.signature!==signature){if(!snapshot(root))return;state.signature=signature;}
    state.active=true;if(!document.body.classList.contains('celestial-upgrade'))document.body.classList.add('celestial-upgrade');chrome(root);graph(root);tabs(root);detail(root);
  }
  function schedule(){if(state.reading||state.queued)return;state.queued=true;queueMicrotask(()=>{state.queued=false;sync();});}
  async function upgrade(){
    const node=state.nodes.find(n=>n.id===state.selected);if(!desktop()||!state.active||!node||node.disabled||state.pending)return;
    state.pending=true;detail(q('#playerUpgrade'));
    try{if(window.CHERRIFT_ONLINE?.perform)await window.CHERRIFT_ONLINE.perform('upgrade_skill',{node_id:node.id});else{q(`[data-v096-skill-branch="${node.branch}"]`,q('#playerUpgrade'))?.click();q(`[data-v082-skill="${node.id}"]`,q('#playerUpgrade'))?.click();}}
    catch{window.UI?.toast?.(copy('A fejlesztés nem sikerült. Próbáld újra.','Upgrade failed. Please retry.'));}
    finally{state.pending=false;state.signature='';schedule();}
  }
  function back(){if(state.exit||state.pending)return;const root=q('#playerUpgrade');animate(root,[{opacity:1},{opacity:0,transform:'translate3d(-20px,0,0)'}],160);state.exit=setTimeout(()=>{state.exit=0;if(desktop()&&visible(root))window.UI?.open?.('menu');sync();window.CHERRIFT_DESKTOP_MENU?.sync?.();},reduced()?0:160);}
  function start(){if(state.started)return;const app=q('#app');if(!app)return;state.started=true;new MutationObserver(records=>{if(!state.reading&&records.some(r=>!r.target.closest?.('[data-cc-owned]')&&(r.type==='childList'||r.target===q('#playerUpgrade')||r.target===app)))schedule();}).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});sync();}
  document.addEventListener('click',event=>{
    if(!state.active||!desktop()||state.reading)return;const b=event.target.closest('button');if(!b)return;
    if(b.dataset.ccSelect){state.selected=b.dataset.ccSelect;sync();}
    else if(b.dataset.ccBranch){state.filter=b.dataset.ccBranch;if(state.filter!=='all'&&!state.nodes.some(n=>n.id===state.selected&&n.branch===state.filter))state.selected=state.nodes.find(n=>n.branch===state.filter)?.id||state.selected;sync();}
    else if(b.hasAttribute('data-cc-upgrade'))upgrade();
    else if(b.hasAttribute('data-cc-back'))back();
    else if(b.hasAttribute('data-cc-skin'))window.UI?.open?.('skins');
    else if(b.hasAttribute('data-cc-resonance'))q('[data-elemental-mode="resonance"]',q('#playerUpgrade'))?.click();
    else if(b.hasAttribute('data-cc-summary'))q('.skill-toolbar-v082 [data-v082-open="statSummaryV082"]',q('#playerUpgrade'))?.click();
    else if(b.hasAttribute('data-cc-reset'))q('.skill-toolbar-v082 [data-v082-reset-tree]',q('#playerUpgrade'))?.click();
    else if(b.closest('.cc-chrome')){if(b.dataset.crystalRoute)window.UI?.open?.(b.dataset.crystalRoute);else if(b.dataset.crystalTool)window.CHERRIFT_V082?.openMenuTool?.(b.dataset.crystalTool);else if(b.hasAttribute('data-crystal-energy'))window.CHERRIFT_PREBETA?.showEnergyModal?.();}
  },true);
  document.addEventListener('keydown',event=>{
    if(!state.active||!desktop()||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    if(qa('[role=dialog][aria-modal=true],.v082-modal,.prebeta-frame-modal').some(visible))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();back();return;}
    if(!event.target.closest('[data-cc-select]'))return;const nodes=state.nodes.filter(n=>state.filter==='all'||n.branch===state.filter);let index=nodes.findIndex(n=>n.id===event.target.closest('[data-cc-select]').dataset.ccSelect);
    if(event.key==='ArrowRight')index++;else if(event.key==='ArrowLeft')index--;else if(event.key==='ArrowDown')index+=6;else if(event.key==='ArrowUp')index-=6;else if(event.key==='Home')index=0;else if(event.key==='End')index=nodes.length-1;else return;
    event.preventDefault();state.selected=nodes[(index+nodes.length)%nodes.length].id;sync();q(`[data-cc-select="${state.selected}"]`,q('#playerUpgrade'))?.focus({preventScroll:true});
  },true);
  document.addEventListener('pointerover',event=>{if(!state.active||!desktop())return;const b=event.target.closest('#playerUpgrade button');if(b&&!b.disabled&&!b.contains(event.relatedTarget)&&performance.now()-state.hover>100){state.hover=performance.now();window.CHERRIFT_V060?.playClickSound?.();}},{passive:true});
  window.addEventListener('resize',schedule,{passive:true});for(const e of ['cherrift:languagechange','cherrift:savechange'])window.addEventListener(e,()=>{state.signature='';schedule();});
  window.addEventListener('cherrift:runtime-clean-ready',start,{once:true});window.CHERRIFT_DESKTOP_UPGRADE=Object.freeze({sync,isDesktop:desktop});
})();
