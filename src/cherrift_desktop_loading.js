/* Moonlit Journey: PC loading presentation. Native boot and run state stay authoritative. */
(() => {
  'use strict';
  if(window.CHERRIFT_DESKTOP_LOADING)return;
  const q=(s,r=document)=>r?.querySelector(s),qa=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
  const desktop=()=>innerWidth>=821&&!((navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&innerHeight<=600);
  const copy=(hu,en)=>(window.UI?.save?.settings?.language==='en'||window.CHERRIFT_LOCALIZATION?.language?.()==='en')?en:hu;
  const attrs=new Map();let started=false,queued=false;
  function attr(n,key,value){if(!n)return;if(!attrs.has(n))attrs.set(n,new Map());if(!attrs.get(n).has(key))attrs.get(n).set(key,n.getAttribute(key));if(n.getAttribute(key)!==String(value))n.setAttribute(key,String(value));}
  function own(tag,cls,parent){const n=document.createElement(tag);n.className=cls;n.dataset.mljOwned='';n.dataset.i18nIgnore='true';parent.append(n);return n;}
  function text(n,value){if(n&&n.textContent!==value)n.textContent=value;}
  function restore(){qa('[data-mlj-owned]').forEach(n=>n.remove());for(const[n,values]of attrs)if(n.isConnected)for(const[k,v]of values){if(v===null)n.removeAttribute(k);else n.setAttribute(k,v);}attrs.clear();}
  function meter(root,selector,label){const fill=q(selector,root),track=fill?.parentElement;if(!track)return;attr(track,'role','progressbar');attr(track,'aria-label',label);const raw=fill.style.width.trim(),value=raw.endsWith('%')?Number.parseFloat(raw):NaN;attr(track,'aria-valuemin','0');attr(track,'aria-valuemax','100');if(Number.isFinite(value))attr(track,'aria-valuenow',String(Math.max(0,Math.min(100,value))));}
  function decorate(root){
    if(!root)return;
    if(!q('.mlj-motes',root)){const layer=own('div','mlj-motes',root);layer.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const mote=document.createElement('i');mote.style.setProperty('--n',i);layer.append(mote);}}
    let tip=q('.mlj-tip',root);if(!tip)tip=own('p','mlj-tip',root);text(tip,copy('TIPP · A következő világ előtt fejleszd a felszerelésed.','TIP · Upgrade your gear before entering a new world.'));
    meter(root,root.id==='bootV060'?'#bootFillV060':'#loadingFill',copy('Betöltés állapota','Loading progress'));
  }
  function sync(){const pc=desktop();document.documentElement.toggleAttribute('data-cr-pc-loading',pc);if(!pc){restore();return;}for(const n of attrs.keys())if(!n.isConnected)attrs.delete(n);decorate(q('#bootV060'));decorate(q('#stageLoading'));}
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
  function start(){if(started)return;started=true;sync();for(const root of [q('#bootV060'),q('#stageLoading')])if(root)new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('[data-mlj-owned]')))schedule();}).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class','data-boot-phase']});}
  // This script loads in the head so the first PC boot paint uses the new geometry.
  document.documentElement.toggleAttribute('data-cr-pc-loading',desktop());
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});window.addEventListener('cherrift:languagechange',schedule);window.addEventListener('cherrift:runtime-clean-ready',schedule);
  window.CHERRIFT_DESKTOP_LOADING=Object.freeze({sync,isDesktop:desktop});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
