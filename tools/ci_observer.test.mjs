import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_prebeta.js',import.meta.url),'utf8');
const energyFunction=source.slice(source.indexOf('  function updateEnergyUi()'),source.indexOf('\n  function patchUi()'));
function fixture(){
  const dom=new JSDOM('<body><span class="mobile-energy-v0932"></span><b id="mobileEnergyValue"></b>',{runScripts:'outside-only'});
  const w=dom.window;let clicks=0,refreshes=0;
  w.UI={save:{energy:50,energyState:{max:50}}};
  w.qa=s=>[...w.document.querySelectorAll(s)];w.id=id=>w.document.getElementById(id);
  w.refreshEnergy=()=>refreshes++;w.showEnergyModal=()=>clicks++;
  w.eval(energyFunction+'\nwindow.updateEnergyUi=updateEnergyUi;');
  return {dom,w,clicks:()=>clicks,refreshes:()=>refreshes};
}
test('unchanged energy refresh does not produce observer feedback; real changes and clicks still work',()=>{
  const f=fixture(),{w}=f;try {
    w.updateEnergyUi();
    const pill=w.document.querySelector('.mobile-energy-v0932'),label=pill.querySelector('b');
    const observer=new w.MutationObserver(()=>{});observer.observe(w.document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    for(let i=0;i<100;i++)w.updateEnergyUi();
    assert.equal(observer.takeRecords().length,0);
    assert.equal(pill.querySelector('b'),label);
    w.UI.save.energy=49;w.updateEnergyUi();
    assert(observer.takeRecords().length>0);
    assert.equal(pill.textContent,'⚡49/50');assert.equal(w.id('mobileEnergyValue').textContent,'49/50');
    pill.click();assert.equal(f.clicks(),1);assert.equal(f.refreshes(),102);
    // Native menu refreshes may replace the pill markup: decoration must repair it.
    pill.innerHTML='⚡ <b>49</b>';pill.classList.remove('prebeta-energy-pill');w.updateEnergyUi();
    assert.equal(pill.innerHTML,'<i>⚡</i><b>49/50</b>');assert(pill.classList.contains('prebeta-energy-pill'));
    observer.disconnect();
  }finally{f.dom.window.close();}
});
