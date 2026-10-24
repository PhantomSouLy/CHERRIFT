import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_desktop_loading.js',import.meta.url),'utf8');
function fixture(width=1920,height=1080,touch=false){
 const dom=new JSDOM('<body><section id="bootV060" data-boot-phase="auth"><img src="assets/ui/cherrift_logo.png"><div id="bootLoadingV096" hidden><div><i id="bootFillV060" style="width:37%"></i></div></div><button id="bootGuestV096">Guest</button><button id="bootDiscordV096">Discord</button><button id="bootStartV096" hidden>Start</button><span id="bootPercentV060">37%</span></section><section id="stageLoading" class="hidden"><div><i id="loadingFill" style="width:72%"></i></div><div id="loadingText">Preparing Cherry...</div></section></body>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,q=s=>w.document.querySelector(s),observers=[];Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:height,writable:true});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch?1:0});w.matchMedia=s=>({matches:s.includes('coarse')?touch:false});const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(cb){super(cb);observers.push(this)}};w.UI={save:{settings:{language:'en'},coins:500}};const save=JSON.stringify(w.UI.save),before=w.document.body.innerHTML,buttons=['#bootGuestV096','#bootDiscordV096','#bootStartV096'].map(q),calls=[];buttons.forEach(b=>b.addEventListener('click',()=>calls.push(b.id)));w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,q,save,before,buttons,calls,sync:()=>w.CHERRIFT_DESKTOP_LOADING.sync(),close:()=>{observers.forEach(o=>o.disconnect());w.close()}};
}
test('native mobile and short touch landscape keep their exact markup',()=>{for(const args of [[390,844,true],[844,390,true],[820,1180,false]]){const f=fixture(...args);try{assert.equal(f.w.document.body.innerHTML,f.before);assert(!f.w.document.documentElement.hasAttribute('data-cr-pc-loading'));assert.equal(JSON.stringify(f.w.UI.save),f.save)}finally{f.close()}}});
test('PC presentation retains native controls, boot phase, progress and save',()=>{const f=fixture();try{for(const b of f.buttons){assert.equal(f.q('#'+b.id),b);b.click()}assert.deepEqual(f.calls,['bootGuestV096','bootDiscordV096','bootStartV096']);assert.equal(f.q('#bootV060').dataset.bootPhase,'auth');assert(f.q('#bootLoadingV096').hidden);assert.equal(f.q('#bootFillV060').style.width,'37%');assert.equal(f.q('#bootPercentV060').textContent,'37%');assert.equal(JSON.stringify(f.w.UI.save),f.save)}finally{f.close()}});
test('accessible progress reads native phase values without advancing them',()=>{const f=fixture();try{assert.equal(f.q('#bootFillV060').parentElement.getAttribute('aria-valuenow'),'37');assert.equal(f.q('#loadingFill').parentElement.getAttribute('aria-valuenow'),'72');f.q('#loadingFill').style.width='100%';f.sync();assert.equal(f.q('#loadingFill').parentElement.getAttribute('aria-valuenow'),'100');assert(f.q('#stageLoading').classList.contains('hidden'));assert.equal(f.q('#loadingText').textContent,'Preparing Cherry...')}finally{f.close()}});
test('resize removes only added elements and restores native accessibility attributes',()=>{const f=fixture();try{f.w.innerWidth=390;f.sync();assert.equal(f.w.document.body.innerHTML,f.before);f.w.innerWidth=1920;f.sync();assert.equal(f.q('#bootV060').querySelectorAll('.mlj-tip').length,1);assert.equal(f.q('#stageLoading').querySelectorAll('.mlj-motes>i').length,12)}finally{f.close()}});
test('language switches and repeated sync never duplicate decorative content',()=>{const f=fixture();try{f.w.UI.save.settings.language='hu';for(let i=0;i<5;i++)f.sync();assert(f.q('.mlj-tip').textContent.startsWith('TIPP'));assert.equal(f.w.document.querySelectorAll('.mlj-tip').length,2);assert.equal(f.w.document.querySelectorAll('.mlj-motes').length,2);assert.equal(f.q('#bootFillV060').parentElement.getAttribute('aria-label'),'Betöltés állapota')}finally{f.close()}});
test('Sakura Path keeps the supplied 4 by 2 sprite and existing logo',()=>{const png=readFileSync(new URL('../assets/ui/loading_sprite_sheet.png',import.meta.url));assert.equal(png.readUInt32BE(16),1774);assert.equal(png.readUInt32BE(20),887);assert.equal(png[25],6);const css=readFileSync(new URL('../assets/cherrift_desktop_loading.css',import.meta.url),'utf8');assert(css.includes('background-size:400% 200%'));assert(css.includes('87.5%,100%{background-position:100% 100%}'));assert(!css.includes('base_cherry_walk_right'));assert(!css.includes('loading_pc_1920x1080'));assert(!css.includes('cherrift_logo.png'));});

test('the curved path and original Cherry sheet mirror native progress without inventing it',()=>{
 const f=fixture();try{
 f.q('#bootV060').dataset.bootPhase='loading';f.q('#bootFillV060').style.width='65%';f.sync();
 const path=f.q('#bootV060 .sakura-path');assert(!path.hidden);
 assert.equal(f.q('#bootV060 .sakura-path-fill').style.strokeDashoffset,'35');
 assert.equal(f.q('#bootV060 .sakura-runner').style.left,'64.4%');
 assert(!path.classList.contains('sakura-path-ready'));
 f.q('#bootV060').dataset.bootPhase='start';f.q('#bootFillV060').style.width='100%';f.sync();
 assert(path.classList.contains('sakura-path-ready'));assert.equal(f.q('#bootV060 .sakura-path-fill').style.strokeDashoffset,'0');
 assert.equal(f.q('#bootV060').querySelectorAll('.sakura-start-ornament').length,1);
 assert.equal(f.q('#bootFillV060').style.width,'100%');assert.equal(JSON.stringify(f.w.UI.save),f.save);
 }finally{f.close()}
});

test('hidden scenes pause their water and scenery; stage loading never adds a lobby prompt',()=>{
 const f=fixture();try{
 assert.equal(f.q('#stageLoading .sakura-scene').dataset.motion,'paused');
 f.q('#stageLoading').classList.remove('hidden');f.sync();assert.equal(f.q('#stageLoading .sakura-scene').dataset.motion,'running');
 f.q('#loadingFill').style.width='100%';f.sync();assert(!f.q('#stageLoading .sakura-path').classList.contains('sakura-path-ready'));
 assert.equal(f.q('#stageLoading .sakura-start-ornament'),null);
 f.q('#stageLoading').classList.add('hidden');f.sync();assert.equal(f.q('#stageLoading .sakura-scene').dataset.motion,'paused');
 for(let i=0;i<5;i++)f.sync();assert.equal(f.q('#bootV060').querySelectorAll('.sakura-scene').length,1);
 assert.equal(f.q('#stageLoading').querySelectorAll('.sakura-water').length,1);
 }finally{f.close()}
});

test('production scene uses optimized WebP layers with no baked-in interface',()=>{
 let total=0;
 for(const name of ['landscape','floating-island','sakura-branch']){
 const image=readFileSync(new URL(`../assets/ui/loading/sakura-path/${name}.webp`,import.meta.url));
 assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');total+=image.length;
 }
 assert(total<600000,'the entire three-layer scene remains under 600 kB');
 const css=readFileSync(new URL('../assets/cherrift_desktop_loading.css',import.meta.url),'utf8');
 assert(css.includes('.sakura-path-ready .sakura-runner {opacity:0;visibility:hidden}'));
 assert(css.includes('#bootStartV096[hidden] {display:none!important}'));
 assert(css.includes('@media(prefers-reduced-motion:reduce)'));
});
