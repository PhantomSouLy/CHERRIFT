import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_boot.js',import.meta.url),'utf8');

function fixture(reduced=false) {
  const dom=new JSDOM(`<body class="v060-booting"><section id="bootV060" data-boot-phase="loading">
    <div id="bootLoadingV096"><div><i id="bootFillV060" style="width:3%"></i></div><span id="bootPercentV060"></span><span id="bootTextV060"></span></div>
    <section id="bootAuthV096" hidden><h2 id="bootAuthTitleV096"></h2><p></p><button id="bootGuestV096" data-boot-auth="guest"><b>Guest</b></button><button id="bootDiscordV096" data-boot-auth="discord"><b>Discord</b></button></section>
    <button id="bootStartV096" hidden><span>Old label</span></button></section><main id="app"><button id="underlying">Menu action</button></main></body>`,{runScripts:'outside-only'});
  const w=dom.window, timers=new Map(), frames=[], calls=[];
  let id=0, mode='guest', gateVisible=false, underlying=0;
  Object.defineProperty(w.document,'readyState',{value:'complete'});
  w.matchMedia=query=>({matches:reduced&&query.includes('reduced-motion')});
  w.requestAnimationFrame=callback=>(frames.push(callback),frames.length);
  w.setTimeout=(callback,delay)=>(timers.set(++id,{callback,delay}),id);
  w.clearTimeout=timer=>timers.delete(timer);
  w.UI={save:{settings:{language:'en'}},game:{},open:route=>calls.push(route)};
  w.CherriftStorage={};w.__CHERRIFT_PREBETA_READY__=true;w.__CHERRIFT_CLEAN_RUNTIME__=true;
  w.CHERRIFT_AUTH={getState:()=>({mode,gateVisible}),continueAsGuest:()=>true};
  w.eval(source);
  w.document.addEventListener('click',()=>underlying++);
  w.document.addEventListener('keydown',()=>underlying++);
  const boot=w.CHERRIFT_BOOT;
  return {w,boot,calls,timers,frames,underlying:()=>underlying,
    auth:(value,visible=false)=>{mode=value;gateVisible=visible;},
    timer:()=>{const [key,entry]=timers.entries().next().value;timers.delete(key);entry.callback();return entry.delay;},
    frame:()=>{const current=frames.splice(0);for(const callback of current)callback();},
    close:()=>w.close()};
}

test('start is gated by actual readiness and waits for the final meter animation',()=>{
  const f=fixture();try{
    f.boot.showStart();assert.equal(f.w.document.querySelector('#bootFillV060').style.width,'3%');
    f.boot.refresh();f.boot.showStart();
    assert.equal(f.boot.getState().phase,'loading');assert(f.boot.getState().completing);
    assert.equal(f.w.document.querySelector('#bootFillV060').style.width,'100%');
    assert(f.w.document.querySelector('#bootStartV096').hidden);
    assert.equal(f.timer(),600);assert.equal(f.boot.getState().phase,'start');
    assert(!f.w.document.querySelector('#bootStartV096').hidden);
    assert.equal(f.w.document.querySelector('#bootStartV096 span').textContent,'Press any button');
  }finally{f.close();}
});

test('early clicks/keys cannot enter and arbitrary keys enter once without leaking into menu',()=>{
  const f=fixture();try{
    f.boot.refresh();f.boot.showStart();
    f.w.document.body.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
    assert.deepEqual(f.calls,[]);
    f.timer();const before=f.underlying();
    const key=new f.w.KeyboardEvent('keydown',{key:'k',bubbles:true,cancelable:true});f.w.document.dispatchEvent(key);
    assert(key.defaultPrevented);assert.deepEqual(f.calls,['menu']);assert.equal(f.underlying(),before);
    f.w.document.querySelector('#underlying').click();assert.deepEqual(f.calls,['menu']);assert.equal(f.underlying(),before);
    f.frame();f.frame();assert(f.w.document.querySelector('#bootV060').classList.contains('done'));
    f.timer();assert.equal(f.w.document.querySelector('#bootV060'),null);
    f.w.document.querySelector('#underlying').click();assert.equal(f.underlying(),before+1);
  }finally{f.close();}
});

test('a click on the background enters once and does not require targeting the label',()=>{
  const f=fixture();try{
    f.boot.refresh();f.boot.showStart();f.timer();
    f.w.document.querySelector('#bootV060').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
    assert.deepEqual(f.calls,['menu']);assert.equal(f.underlying(),0);
  }finally{f.close();}
});

test('browser shortcuts, held keys and IME composition do not dismiss the start screen',()=>{
  const f=fixture();try{
    f.boot.refresh();f.boot.showStart();f.timer();
    for(const options of [{key:'l',ctrlKey:true},{key:'x',metaKey:true},{key:'a',repeat:true},{key:'Process',isComposing:true}])
      f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true}));
    assert.deepEqual(f.calls,[]);assert.equal(f.boot.getState().phase,'start');
  }finally{f.close();}
});

test('readiness lost during the final fill cannot reveal or bypass the authentication gate',()=>{
  const f=fixture();try{
    f.boot.refresh();f.boot.showStart();f.auth('checking');f.timer();
    assert.equal(f.boot.getState().phase,'loading');assert(f.w.document.querySelector('#bootStartV096').hidden);assert.deepEqual(f.calls,[]);
  }finally{f.close();}
});

test('auth changes cancel a pending reveal, repeated showStart calls do not restart the delay',()=>{
  const f=fixture();try{
    f.boot.refresh();f.boot.showStart();f.boot.showStart();assert.equal(f.timers.size,1);
    f.auth('gate',true);f.boot.showAuth();assert.equal(f.timers.size,0);assert.equal(f.boot.getState().phase,'auth');
    assert(f.w.document.querySelector('#bootStartV096').hidden);
  }finally{f.close();}
});

test('reduced motion preserves readiness and skips the visual completion delay',()=>{
  const f=fixture(true);try{f.boot.refresh();f.boot.showStart();assert.equal(f.timer(),0);assert.equal(f.boot.getState().phase,'start');}finally{f.close();}
});
