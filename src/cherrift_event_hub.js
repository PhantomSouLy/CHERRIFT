(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={events:[],category:'limited',selected:null,open:false,ready:false,error:false,server:0,received:0,timer:0,generation:0};
 const panel=()=>document.getElementById('eventHubPrebeta');
 const now=()=>state.server+(performance.now()-state.received);
 const active=id=>state.ready&&state.events.some(e=>e.id===id&&(!e.starts_at||Date.parse(e.starts_at)<=now())&&(!e.ends_at||Date.parse(e.ends_at)>now()));
 const list=()=>state.events.filter(e=>e.category===state.category&&active(e.id));
 function render(){
  if(!state.open||!panel())return;
  const rows=list();if(!rows.some(e=>e.id===state.selected))state.selected=null;
  const event=rows.find(e=>e.id===state.selected);
  const message=state.error?'Events are temporarily unavailable.':!state.ready?'Loading events…':'Choose an event to explore.';
  let content=`<div class="hub-empty"><span>✿</span><h2>CHERRIFT Events</h2><p>${message}</p></div>`;
  if(event){content=event.renderer==='closed-beta'?window.CHERRIFT_PREBETA_EVENT?.content()||'':`<article class="hub-content"><p class="hub-kicker">${esc(event.category==='limited'?'LIMITED TIME':'PERMANENT')}</p><h2>${esc(event.name)}</h2><p>${esc(event.description)}</p>${event.sections.map(s=>`<section><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></section>`).join('')}</article>`;}
  panel().innerHTML=`<div class="event-shell-pb event-hub"><header><button data-event-back aria-label="Lobby">←</button><div><small>CHERRIFT</small><h1>Events</h1></div><button data-hub-refresh class="hub-refresh">Refresh</button></header><div class="hub-body"><nav class="hub-categories" aria-label="Event categories"><button data-hub-category="limited" class="${state.category==='limited'?'active':''}" title="Limited time" aria-label="Limited time" aria-pressed="${state.category==='limited'}">⌛</button><button data-hub-category="permanent" class="${state.category==='permanent'?'active':''}" title="Permanent" aria-label="Permanent" aria-pressed="${state.category==='permanent'}">∞</button></nav><aside class="hub-list" aria-label="Events">${rows.map((e,i)=>`<button data-hub-event="${esc(e.id)}" class="${e.id===state.selected?'active':''}" aria-pressed="${e.id===state.selected}"><small>${String(i+1).padStart(2,'0')}</small><strong>${esc(e.name)}</strong><span>${e.ends_at?'Until '+esc(new Date(e.ends_at).toLocaleString()):'Permanent'}</span></button>`).join('')||`<p>${state.error?'Unable to load events.':state.ready?'No active events in this category.':'Loading…'}</p>`}</aside><main class="hub-detail">${content}</main></div></div>`;
  const rail=panel().querySelector('.hub-list');let y=0,top=0,drag=false;
  rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;y=e.clientY;top=rail.scrollTop;drag=false;});
  rail.addEventListener('pointermove',e=>{if(!(e.buttons&1)||e.pointerType!=='mouse')return;if(Math.abs(e.clientY-y)>5){drag=true;rail.scrollTop=top-(e.clientY-y);}});
  rail.addEventListener('click',e=>{if(drag){e.preventDefault();e.stopImmediatePropagation();drag=false;}},true);
 }
 async function refresh(){
  const generation=++state.generation;clearTimeout(state.timer);
  try{
   const conf=window.CHERRIFT_SUPABASE_CONFIG;
   const res=await fetch(conf.url+'/functions/v1/event-feed',{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw Error('events_unavailable');const data=await res.json();
   if(generation!==state.generation)return;
   if(!Array.isArray(data.events)||!Number.isFinite(Date.parse(data.server_time)))throw Error('invalid_feed');
   state.events=data.events;state.server=Date.parse(data.server_time);state.received=performance.now();state.ready=true;state.error=false;
   const boundary=data.next_transition?Date.parse(data.next_transition)-state.server:60000;
   state.timer=setTimeout(refresh,Math.max(50,Math.min(60000,boundary+30)));
  }catch(error){if(generation!==state.generation)return;state.events=[];state.ready=false;state.error=true;state.timer=setTimeout(refresh,30000);}
  render();
 }
 function open(id,tab){
  const p=panel();if(!p)return;
  window.UI?.open?.('menu');document.querySelectorAll('#app > .panel').forEach(n=>n.classList.add('hidden'));
  p.classList.remove('hidden');p.style.removeProperty('display');p.setAttribute('aria-hidden','false');document.body.classList.add('prebeta-event-open');
  document.body.classList.remove('is-playing','is-levelup','is-loading-stage');state.open=true;
  if(id&&active(id)){state.selected=id;state.category=state.events.find(e=>e.id===id).category;if(tab)window.CHERRIFT_PREBETA_EVENT?.setTab(tab);}
  render();refresh();
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-hub-category],[data-hub-event],[data-hub-refresh]');if(!button)return;
  e.preventDefault();if(button.dataset.hubCategory){state.category=button.dataset.hubCategory;state.selected=null;render();}
  else if(button.dataset.hubEvent){if(active(button.dataset.hubEvent)){state.selected=button.dataset.hubEvent;render();}}
  else refresh();
 });
 window.addEventListener('cherrift:prebeta-event-close',()=>{state.open=false;});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('online',refresh);
 window.CHERRIFT_EVENT_HUB=Object.freeze({open,render,isActive:active,refresh,hide:()=>{state.open=false;}});
 refresh();
})();
