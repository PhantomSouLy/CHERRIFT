import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const app = read('src/cherrift_app.js');

test('legacy achievements reconcile once and only new milestones announce', () => {
  const start = app.indexOf('let achievementBaselineReady=false;');
  const end = app.indexOf('function ensurePanels()', start);
  const messages = [], saved = [];
  const context = vm.createContext({Date, Set, ACH:[
    {id:'old', name:'Old', test:s=>s.level>=10},
    {id:'new', name:'New', test:s=>s.level>=20}
  ], normalize:s=>{s.achievements ||= {};}, UI:{toast:x=>messages.push(x)}, baseSave:s=>saved.push(structuredClone(s))});
  vm.runInContext(app.slice(start,end), context);
  context.save = {level:10,achievements:{}};
  vm.runInContext('updateAchievements(save); updateAchievements(save)', context);
  assert.equal(messages.length,0, 'startup history stays quiet');
  context.save.level=20;
  vm.runInContext('updateAchievements(save); updateAchievements(save)', context);
  assert.deepEqual(messages,['Achievement unlocked: New']);
  context.save = {level:20,achievements:{}};
  vm.runInContext('updateAchievements(save)', context);
  assert.equal(messages.length,1,'a stale save cannot replay the same unlock');
  assert(saved.at(-1).achievements.new);
});

test('toast expiry clears both visibility and stale announcement text', () => {
  const start = app.indexOf('  toast(msg) {');
  const end = app.indexOf('\n  }',start)+4;
  const dom = new JSDOM('<div id="toast"></div>');
  const timers = new Map(); let serial=0;
  const context=vm.createContext({document:dom.window.document,setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(`globalThis.ui = {${app.slice(start,end)}}`,context);
  context.ui.toast('old'); context.ui.toast('new');
  assert.equal(timers.size,1);
  const toast=dom.window.document.querySelector('#toast');
  assert(!toast.hidden); assert.equal(toast.textContent,'new');
  [...timers.values()][0]();
  assert(toast.hidden); assert.equal(toast.textContent,''); assert(!toast.classList.contains('show'));
  dom.window.close();
});

test('loading uses the unmodified track geometry and hides the entire path at ready', () => {
  const dom = new JSDOM('<section id="bootV060" data-boot-phase="loading"><div><i id="bootFillV060" style="width:25%"></i></div></section>',{runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  Object.defineProperty(w,'innerWidth',{value:1920});
  w.eval(read('src/cherrift_desktop_loading.js'));
  const sync=()=>w.CHERRIFT_DESKTOP_LOADING.sync();sync();
  const track=w.document.querySelector('.sakura-path-track');
  track.getTotalLength=()=>100;
  track.getPointAtLength=length=>({x:20+960*length/100,y:16+164*(length/100)*(1-length/100)});
  sync();
  assert.match(w.document.querySelector('.sakura-path-fill').getAttribute('d'),/260 46.75$/);
  w.document.querySelector('#bootFillV060').style.width='75%';sync();
  assert.match(w.document.querySelector('.sakura-path-fill').getAttribute('d'),/740 46.75$/);
  assert.equal(track.getAttribute('d'),'M20 16 Q500 98 980 16');
  w.document.querySelector('#bootV060').dataset.bootPhase='start';sync();
  assert(w.document.querySelector('.sakura-path').hidden);
  w.close();
});

test('all portrait frames have aperture geometry and both reusable background layers exist', () => {
  const balance=read('src/cherrift_balance.js');
  const frames=[...balance.matchAll(/asset:"assets\/player\/frames\/([^"/]+)\.png"/g)].map(m=>m[1]);
  assert.equal(frames.length,19);
  const css=read('assets/cherrift_frame_geometry.css');
  for(const frame of frames) assert(css.includes(`data-frame-id="${frame}"`),frame);
  const prebeta=read('src/cherrift_prebeta.js');
  const start=prebeta.indexOf('function avatarMarkup('),end=prebeta.indexOf('function accountAvatar(',start);
  const context=vm.createContext({B:{frames:frames.map(id=>({id,asset:`assets/player/frames/${id}.png`}))},escapeHtml:String});
  vm.runInContext(prebeta.slice(start,end),context);
  for(const frameId of frames){
    const markup=context.avatarMarkup({frameId},'large');
    assert(markup.includes(`data-frame-id="${frameId}"`));
    assert(markup.includes(`/frames/${frameId}.png`));
  }
  for(const file of ['crystal-foreground-pc.webp','crystal-landscape-pc.webp']) {
    assert(existsSync(new URL('../assets/ui/backgrounds/'+file,import.meta.url)));
  }
});

test('weapon, skill and resonance mini panels open next to controls and dismiss outside or with Escape', async () => {
  const dom=new JSDOM(`<body><section id="skins"><button class="skin-icon-v093 active" data-v093-skin="fairy_cherry"></button><section class="skin-details-v093"><div class="skin-title-v093"><span class="rarity-pill">Rare</span></div><h3>Fairy Cherry</h3><button class="skin-equip-v093">Equip</button><section data-sp-weapon-info role="button" tabindex="0">Fairy Orb</section></section></section><button id="outside">Outside</button></body>`,{runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.document.body.classList.add('v0933-desktop');
  w.matchMedia=query=>({matches:query.includes('min-width')||query.includes('pointer:fine')});
  Object.defineProperty(w,'innerWidth',{value:1920});Object.defineProperty(w,'innerHeight',{value:1080});
  const observers=[],Observer=w.MutationObserver;
  w.MutationObserver=class extends Observer{constructor(cb){super(cb);observers.push(this);}};
  w.UI={save:{selectedSkin:'fairy_cherry',unlockedSkins:['fairy_cherry'],settings:{language:'hu'}}};
  w.CHERRIFT_DATA={skins:[{id:'fairy_cherry',name:'Fairy Cherry',weapon:'Fairy Orb',skillName:'Magic Burst',skillDescription:'Területi sebzés.',rarity:'Rare'}]};
  w.CHERRIFT_CONFIG={player:{skins:{fairy_cherry:{skillCooldown:12}}}};
  w.CHERRIFT_DESKTOP_MENU={isDesktop:()=>true};
  try{
    w.eval(read('src/cherrift_skin_ui.js'));
    if(w.document.readyState==='loading') await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    await new Promise(resolve=>setImmediate(resolve));
    const q=s=>w.document.querySelector(s);
    q('[data-sp-weapon-info]').click();
    assert(q('.cr-skin-popover-mini').textContent.includes('Fairy Orb'));
    assert(q('.cr-skin-popover-mini').style.left.endsWith('px'));
    q('#outside').click();assert(!q('.cr-skin-popover'));
    q('.cr-desktop-skill-card').click();
    assert(q('.cr-skin-popover-mini').textContent.includes('Magic Burst'));
    assert(q('.cr-skin-popover-mini').textContent.includes('CD: 12s'));
    w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert(!q('.cr-skin-popover'));
    q('.cr-desktop-element-icon').click();
    assert(q('.cr-skin-popover-mini').textContent.includes('Majd bővítve lesz'));
    q('[data-cr-popover-close]').click();assert(!q('.cr-skin-popover'));
    await new Promise(resolve=>setImmediate(resolve));
  }finally{observers.forEach(o=>o.disconnect());w.close();}
});
