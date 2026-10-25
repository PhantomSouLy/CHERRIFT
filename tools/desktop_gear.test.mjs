import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_desktop_gear.js',import.meta.url),'utf8');
function fixture(width=1920,height=1080,touch=false){
 const dom=new JSDOM(`<style>.hidden{display:none}</style><body><main id="app"><section id="gear"><button class="gear-change-skin-v0560">Change</button><div class="gear-summary-v0560"><div><small>ATK</small><b id="atk">20</b></div></div><div id="gearStageV0560" style="display:grid!important;min-height:300px!important"><button data-v0560-slot="Weapon" style="left:16%!important;width:66px!important"><span class="gear-slot-icon-v0932">⚔</span></button></div><section id="gearInventoryZoneV0560"><div id="gearInventoryGridV0560"><button data-v0560-item-id="item">Item</button></div></section></section><section id="gearModalV0560" class="hidden"></section></main></body>`,{pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window;Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:height,writable:true});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch?1:0});w.matchMedia=q=>({matches:q.includes('pointer:coarse')?touch:q.includes('reduced-motion')});
 const observers=[],Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(cb){super(cb);observers.push(this);}};
 const calls=[];w.UI={save:{selectedSkin:'cherry_default',settings:{language:'en'},inventory:[{id:'item',slot:'Weapon',type:'Balanced',rarity:'Rare'}],equipped:{}},open:route=>calls.push(route),gearName:item=>`${item.rarity} ${item.slot}`};w.CHERRIFT_DATA={skins:[{id:'cherry_default',name:'Base Cherry',rarity:'Common'},{id:'other',name:'Other Cherry',splash:'other.png'}]};
 const root=w.document.querySelector('#gear'),before=root.innerHTML,save=JSON.stringify(w.UI.save),slot=root.querySelector('[data-v0560-slot]');let clicks=0;slot.onclick=()=>clicks++;
 w.eval(source);w.dispatchEvent(new w.Event('cherrift:runtime-clean-ready'));
 return {w,root,before,save,slot,calls,clicks:()=>clicks,close:()=>{observers.forEach(o=>o.disconnect());w.close();}};
}
test('mobile portrait and coarse landscape preserve native markup and data',()=>{for(const args of [[390,844,true],[844,390,true],[820,1180,false]]){const f=fixture(...args);try{assert.equal(f.root.innerHTML,f.before);assert.equal(JSON.stringify(f.w.UI.save),f.save);assert(!f.w.document.body.classList.contains('celestial-gear'));}finally{f.close();}}});
test('desktop decorates native inventory and preserves handlers and save',()=>{const f=fixture();try{f.w.CHERRIFT_DESKTOP_GEAR.sync();assert.equal(f.root.querySelectorAll('.cg-chrome').length,1);assert.equal(f.root.querySelectorAll('.cg-hero').length,1);assert.equal(f.root.querySelector('[data-v0560-slot]'),f.slot);f.root.querySelector('[data-cg-slot]').click();assert.equal(f.clicks(),1);assert.equal(JSON.stringify(f.w.UI.save),f.save);}finally{f.close();}});
test('resize restores every native style and removes presentation elements',()=>{const f=fixture();try{f.w.innerWidth=390;f.w.CHERRIFT_DESKTOP_GEAR.sync();assert.equal(f.root.innerHTML,f.before);assert.equal(f.root.querySelectorAll('[data-cg-owned]').length,0);f.w.innerWidth=1920;f.w.CHERRIFT_DESKTOP_GEAR.sync();assert.equal(f.root.querySelectorAll('.cg-chrome').length,1);}finally{f.close();}});
test('selected splash follows equipped skin without generating new poses',()=>{const f=fixture();try{f.w.UI.save.selectedSkin='other';f.w.CHERRIFT_DESKTOP_GEAR.sync();assert.equal(f.root.querySelector('.cg-hero').getAttribute('src'),'other.png');assert.equal(f.root.querySelector('.cg-caption h2').textContent,'Other Cherry');}finally{f.close();}});

test('equipping a skin broadcasts its new art to the gear screen while roster preview stays independent',async()=>{
 const f=fixture();try{
  f.w.CHERRIFT_SKIN_UI={selectedSkin:()=>f.w.CHERRIFT_DATA.skins[1],assetsForSkin:skin=>({splash:`${skin.id}.webp`})};
  f.w.CHERRIFT_DESKTOP_GEAR.sync();
  assert.equal(f.root.querySelector('.cg-hero').getAttribute('src'),'cherry_default.webp');
  f.w.UI.save.selectedSkin='other';
  f.w.dispatchEvent(new f.w.CustomEvent('cherrift:savechange',{detail:{source:'skin-equipped',skinId:'other'}}));
  await Promise.resolve();
  assert.equal(f.root.querySelector('.cg-hero').getAttribute('src'),'other.webp');
  assert.equal(f.root.querySelector('.cg-hero').dataset.skinId,'other');
 }finally{f.close();}
});
test('search filters presentation without deleting inventory or native cards',()=>{const f=fixture();try{const input=f.root.querySelector('.cg-search');input.value='missing';f.w.CHERRIFT_DESKTOP_GEAR.sync();assert(f.root.querySelector('[data-v0560-item-id]').classList.contains('cg-filtered'));assert.equal(f.w.UI.save.inventory.length,1);input.value='rare';f.w.CHERRIFT_DESKTOP_GEAR.sync();assert(!f.root.querySelector('[data-v0560-item-id]').classList.contains('cg-filtered'));}finally{f.close();}});

test('equipment displays the selected new cutout and retains legacy art for unmapped skins',()=>{
 const f=fixture();try{
 f.w.CHERRIFT_SKIN_UI={assetsForSkin:skin=>skin.id==='cherry_default'?{cutout:'base-cutout.webp',splash:'base-splash.webp'}:null};
 f.w.CHERRIFT_DESKTOP_GEAR.sync();
 const image=f.root.querySelector('.cg-hero');assert.equal(image.getAttribute('src'),'base-cutout.webp');assert(image.classList.contains('cg-cutout'));
 f.w.UI.save.selectedSkin='other';f.w.CHERRIFT_DESKTOP_GEAR.sync();assert.equal(image.getAttribute('src'),'other.png');assert(!image.classList.contains('cg-cutout'));
 }finally{f.close();}
});
