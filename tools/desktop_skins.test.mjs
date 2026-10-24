import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_desktop_skins.js',import.meta.url),'utf8');
const markup=()=>`<header class="panel-head"><button data-v093-back>←</button></header><section class="skin-selector-v093"><nav class="skin-list-v093"><button class="skin-icon-v093 active" data-v093-skin="cherry_default" aria-label="Base Cherry"><img src="base.png"></button><button class="skin-icon-v093 locked" data-v093-skin="other" aria-label="Other"><img src="other.png"></button></nav><article class="skin-showcase-v093"><div class="skin-view-tabs-v093" role="tablist"><button class="active" data-v093-skin-view="splash">Splash art</button></div><div class="skin-art-v093"></div></article><aside class="skin-details-v093"><button data-v093-equip disabled>Equipped</button></aside></section>`;
function fixture(width=1920,height=1080,touch=false){
 const dom=new JSDOM(`<style>.hidden{display:none}</style><body><main id="app"><section id="menu" class="screen hidden"></section><section id="skins" class="panel">${markup()}</section></main></body>`,{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,observers=[],calls=[];const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(cb){super(cb);observers.push(this);}};
 Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:height,writable:true});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch?1:0});
 w.matchMedia=q=>({matches:q.includes('min-width')?w.innerWidth>=821:q.includes('pointer:coarse')?touch:q.includes('reduced-motion')});
 const skins=[{id:'cherry_default',name:'Base Cherry',weapon:'Actual weapon',rarity:'Common',splash:'base.png'},{id:'other',name:'Other',weapon:'Other weapon',rarity:'Rare',splash:'other.png'}];
 w.UI={save:{selectedSkin:'cherry_default',unlockedSkins:['cherry_default'],settings:{language:'en'}},open:r=>calls.push(r)};
 w.CHERRIFT_DATA={skins};w.CHERRIFT_SKIN_UI={selectedSkin:()=>skins[0],skinElement:()=>({icon:'element.png'})};
 const root=w.document.getElementById('skins'),before=root.innerHTML;
 w.eval(source);w.dispatchEvent(new w.Event('cherrift:runtime-clean-ready'));
 return{w,root,before,calls,close:()=>{observers.forEach(o=>o.disconnect());dom.window.close();}};
}
test('portrait and touch-landscape skin selectors are untouched',()=>{
 for(const args of [[390,844,true],[844,390,true],[820,1180,false]]){const f=fixture(...args);try{assert.equal(f.root.innerHTML,f.before);assert.equal(f.root.querySelectorAll('[data-sp-owned]').length,0);assert(!f.w.document.body.classList.contains('sakura-skins'));}finally{f.close();}}
});
test('desktop presentation keeps native buttons, lock state and save data',()=>{
 const f=fixture();try{
 const save=JSON.stringify(f.w.UI.save);const equip=f.root.querySelector('[data-v093-equip]');assert(equip.disabled);
 assert.equal(f.root.querySelectorAll('[data-v093-skin]').length,2);assert.equal(f.root.querySelector('.sp-weapon>b').textContent,'Actual weapon');assert.equal(f.root.querySelectorAll('.sp-card-label').length,2);
 f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.querySelectorAll('.sp-chrome').length,1);assert.equal(f.root.querySelectorAll('.sp-card-label').length,2);assert.equal(f.root.querySelector('[data-v093-equip]'),equip);assert.equal(JSON.stringify(f.w.UI.save),save);
 }finally{f.close();}
});
test('desktop to mobile removes every added element and restores native markup',()=>{
 const f=fixture();try{f.w.innerWidth=390;f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.innerHTML,f.before);assert(!f.w.document.body.classList.contains('sakura-skins'));f.w.innerWidth=1920;f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.querySelectorAll('.sp-chrome').length,1);}finally{f.close();}
});
test('native rerender can be decorated without accumulating controls',()=>{
 const f=fixture();try{f.root.innerHTML=markup();f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.querySelectorAll('.sp-chrome').length,1);assert.equal(f.root.querySelectorAll('[data-sp-step]').length,2);assert.equal(f.root.querySelectorAll('.sp-card-label').length,2);}finally{f.close();}
});
test('back uses the original lobby route and disappears when the route closes',async()=>{
 const f=fixture();try{f.root.querySelector('.sp-back').click();await new Promise(r=>setTimeout(r,10));assert.equal(f.calls.at(-1),'menu');f.root.classList.add('hidden');f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.querySelectorAll('[data-sp-owned]').length,0);}finally{f.close();}
});

test('new transparent art follows non-default skins and falls back to splash on load failure',()=>{
 const f=fixture();try{
 const entry=f.w.CHERRIFT_DATA.skins[1];
 f.w.CHERRIFT_SKIN_UI.selectedSkin=()=>entry;
 f.w.CHERRIFT_SKIN_UI.assetsForSkin=skin=>skin.id==='other'?{cutout:'new-cutout.webp',splash:'new-splash.webp',thumbnail:'new-thumb.webp'}:null;
 f.w.CHERRIFT_DESKTOP_SKINS.sync();
 let image=f.root.querySelector('.sp-hero');
 assert.equal(image.getAttribute('src'),'new-cutout.webp');assert(image.classList.contains('sp-cutout'));
 image.dispatchEvent(new f.w.Event('error'));
 assert.equal(image.getAttribute('src'),'new-splash.webp');assert(image.classList.contains('sp-vignette'));
 f.w.CHERRIFT_DESKTOP_SKINS.sync();assert.equal(f.root.querySelector('.sp-hero'),image);
 f.w.CHERRIFT_SKIN_UI.selectedSkin=()=>f.w.CHERRIFT_DATA.skins[0];f.w.CHERRIFT_DESKTOP_SKINS.sync();
 assert.notEqual(f.root.querySelector('.sp-hero'),image);
 }finally{f.close();}
});

test('desktop skin cards load small thumbnails lazily and retain legacy splashes',()=>{
 const f=fixture();try{
 f.w.CHERRIFT_SKIN_UI.assetsForSkin=skin=>skin.id==='other'?{thumbnail:'tiny.webp',splash:'full.webp'}:null;
 f.root.innerHTML=markup();f.w.CHERRIFT_DESKTOP_SKINS.sync();
 const images=[...f.root.querySelectorAll('.sp-card-art img')];
 assert.equal(images[0].getAttribute('src'),'base.png');assert.equal(images[1].getAttribute('src'),'tiny.webp');
 assert.equal(images[1].loading,'lazy');
 }finally{f.close();}
});
