import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_desktop_menu.js',import.meta.url),'utf8');
function fixture(width=1920,height=1080,touch=false){
  const dom=new JSDOM('<!doctype html><style>.hidden{display:none}</style><body><div id="app"><section id="menu"><div class="patch-card"><h3>Real update</h3><p>Real patch copy</p></div></section><section id="target" class="panel hidden"></section></div>',{runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,calls=[],observers=[];
  const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(cb){super(cb);observers.push(this);}};
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:height,writable:true});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch?1:0});
  w.matchMedia=q=>({matches:q.includes('min-width')?w.innerWidth>=821:q.includes('pointer:coarse')?touch:false});
  w.UI={save:{coins:73,blossomGems:12,energy:42,energyState:{max:50},profile:{name:'Test'},account:{level:4},settings:{language:'hu'}},open:route=>calls.push(route),openWorldSelect:()=>calls.push('worlds')};
  w.CHERRIFT_BUILD={displayVersion:'real-version',label:'real-build'};
  w.CHERRIFT_V082={openMenuTool:route=>calls.push(route)};
  w.CHERRIFT_PREBETA={showEnergyModal:()=>calls.push('energy')};
  w.CHERRIFT_PREBETA_EVENT={id:'actual-event',rewards:Array(7),open:()=>calls.push('event')};
  w.eval(source);w.dispatchEvent(new w.Event('cherrift:runtime-clean-ready'));
  return {dom,w,calls,root:()=>w.document.getElementById('crystalDesktopMenu'),close:()=>{observers.forEach(o=>o.disconnect());dom.window.close();}};
}
const pause=()=>new Promise(r=>setTimeout(r,170));
test('phone portrait and touch landscape never construct or mutate the menu',()=>{
  for(const dims of [[390,844,true],[844,390,true],[820,1180,false]]){
    const f=fixture(...dims);try{
      assert.equal(f.root(),null);assert.equal(f.w.document.body.className,'');
      assert.equal(f.w.document.getElementById('menu').children.length,1);
    }finally{f.close();}
  }
});
test('desktop navigation uses original routes and reads actual data without mutating saves',async()=>{
  const f=fixture();try{
    const before=JSON.stringify(f.w.UI.save);
    assert.deepEqual([...f.root().querySelectorAll('.crystal-navigation>.crystal-button')].map(n=>n.dataset.crystalRoute),['worlds','skins','gear','gachaV082','settings']);
    assert.equal(f.root().querySelector('[data-crystal-value=coins]').textContent,'73');
    assert.equal(f.root().querySelector('[data-crystal-value=version]').textContent,'real-version');
    assert.equal(f.root().querySelector('[data-crystal-value=updateCopy]').textContent,'Real patch copy');
    for(const route of ['worlds','skins','gear','gachaV082','settings','shopV082','dailyQuests','achievements','profileV082']){
      f.root().querySelector(`[data-crystal-route="${route}"]`).click();await pause();assert.equal(f.calls.at(-1),route);
    }
    f.root().querySelector('[data-crystal-route=eventHubPrebeta]').click();await pause();assert.equal(f.calls.at(-1),'event');
    f.root().querySelector('[data-crystal-tool=mail]').click();assert.equal(f.calls.at(-1),'mail');
    f.root().querySelector('[data-crystal-energy]').click();assert.equal(f.calls.at(-1),'energy');
    assert.equal(JSON.stringify(f.w.UI.save),before);
  }finally{f.close();}
});
test('resize cancels an in-flight desktop click and removes all desktop presentation',async()=>{
  const f=fixture();try{
    f.root().querySelector('.crystal-play').click();
    f.w.innerWidth=390;f.w.dispatchEvent(new f.w.Event('resize'));await pause();
    assert.equal(f.root(),null);assert.equal(f.w.document.body.className,'');assert.equal(f.calls.length,0);
    f.w.innerWidth=1920;f.w.dispatchEvent(new f.w.Event('resize'));
    assert.equal(f.w.document.querySelectorAll('#crystalDesktopMenu').length,1);
  }finally{f.close();}
});
test('an overlay panel makes the lobby inert and unavailable to keyboard focus',()=>{
  const f=fixture();try{
    f.w.document.getElementById('target').classList.remove('hidden');f.w.CHERRIFT_DESKTOP_MENU.sync();
    assert.equal(f.root().hidden,true);assert.equal(f.root().inert,true);
    f.w.document.getElementById('target').classList.add('hidden');f.w.CHERRIFT_DESKTOP_MENU.sync();
    assert.equal(f.root().hidden,false);assert.equal(f.root().inert,false);
  }finally{f.close();}
});
test('unavailable event stays disabled; translated captions update from existing settings',()=>{
  const f=fixture();try{
    delete f.w.CHERRIFT_PREBETA_EVENT;f.w.UI.save.settings.language='en';f.w.CHERRIFT_DESKTOP_MENU.refresh();
    assert.equal(f.root().querySelector('[data-crystal-route=eventHubPrebeta]').disabled,true);
    assert.match(f.root().querySelector('[data-crystal-copy=play]').textContent,/another tomorrow/);
  }finally{f.close();}
});
