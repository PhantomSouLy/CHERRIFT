import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/cherrift_menu_audio.js',import.meta.url),'utf8');
function fixture() {
 const dom=new JSDOM(`<body><main id="app"><button id="play" class="crystal-play"><span>Play</span></button><button id="click">Settings</button><button id="back" data-sp-back>Back</button><button id="page" data-sp-step="1">Next</button><button id="skin" data-v093-skin="mage_cherry">Mage</button><button id="disabled" disabled>Disabled</button><button id="off" data-menu-sound="off">Silent</button><div hidden><button id="hidden">Hidden</button></div><button id="inert" inert>Inert</button></main><section id="pauseModal"><button id="pause-back" class="back">Resume</button></section></body>`,{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window, listeners=new Map(), sounds=[], played=[], timers=new Map();let clock=1000,id=0;
 const add=w.addEventListener.bind(w);w.addEventListener=(type,callback,options)=>{listeners.set(type,callback);add(type,callback,options)};
 Object.defineProperty(w.performance,'now',{value:()=>clock});
 w.setTimeout=(callback,delay)=>(timers.set(++id,{callback,delay}),id);w.clearTimeout=key=>timers.delete(key);
 w.Audio=class {constructor(src){this.src=src;this.paused=true;this.ended=false;sounds.push(this)}pause(){this.paused=true}play(){this.paused=false;played.push({src:this.src,volume:this.volume,time:clock});return Promise.resolve()}};
 w.UI={save:{settings:{volume:60}}};w.eval(source);
 const q=id=>w.document.getElementById(id);
 return {w,q,api:w.CHERRIFT_MENU_AUDIO,played,sounds,timers,
   clock:value=>{clock=value},send:(type,extra={})=>listeners.get(type)({isTrusted:true,target:q('click'),...extra}),
   hoverTick:()=>{const current=[...timers.values()];timers.clear();for(const timer of current)timer.callback()},close:()=>w.close()};
}

test('WAV files are real short PCM16 stereo cues with no clipping and the hover is quieter',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/menu/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.assets.length,5);const peaks={};let bytes=0;
 for(const entry of manifest.assets){
  const wav=readFileSync(new URL('../assets/audio/menu/'+entry.file,import.meta.url));bytes+=wav.length;
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt16LE(34),16);
  assert.equal(wav.length,entry.bytes);assert(entry.seconds>0&&entry.seconds<=.6);
  let peak=0;for(let offset=44;offset<wav.length;offset+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(offset)));
  assert(peak>1000&&peak<30000);assert.equal(wav.readInt16LE(wav.length-2),0);peaks[entry.kind]=peak;
 }
 assert(bytes<300000);assert(peaks.play>peaks.click);assert(peaks.click>peaks.hover);
});

test('Play, normal buttons, back and skin navigation use distinct cues without changing control actions',()=>{
 const f=fixture();try{
 for(const [id,kind] of [['play','play'],['click','click'],['back','back'],['page','page'],['skin','page']]){
  f.clock(1000+f.played.length*200);assert.equal(f.api.classifyControl(f.q(id)),kind);
  f.send('click',{target:f.q(id)});assert(f.played.at(-1).src.endsWith('crystal-'+kind+'.wav'));
 }
 const count=f.played.length;f.q('click').click();assert.equal(f.played.length,count,'synthetic rerender/keyboard clicks cannot duplicate trusted audio');
 assert.equal(f.api.classifyControl(f.q('off')),null);
 }finally{f.close()}
});

test('disabled, hidden, inert, silent and gameplay HUD controls do not emit UI audio',()=>{
 const f=fixture();try{
 for(const id of ['disabled','hidden','inert','off'])f.send('click',{target:f.q(id)});
 assert.equal(f.played.length,0);
 f.w.document.body.classList.add('is-playing');f.send('click');assert.equal(f.played.length,0);
 f.send('click',{target:f.q('pause-back')});assert(f.played[0].src.endsWith('crystal-back.wav'));
 }finally{f.close()}
});

test('master volume, mute and per-kind throttling are applied without mutating saved settings',()=>{
 const f=fixture();try{
 f.w.UI.save.settings.volume=0;assert.equal(f.api.play('play'),false);assert.equal(f.sounds.length,0);
 f.w.UI.save.settings.volume=50;const saved=JSON.stringify(f.w.UI.save);f.api.play('click');assert.equal(f.played[0].volume,.275);
 assert.equal(f.api.play('click'),false);f.clock(1200);assert(f.api.play('click'));
 assert.equal(JSON.stringify(f.w.UI.save),saved);
 f.w.UI.save.settings.muted=true;assert.equal(f.api.play('back'),false);
 assert.equal(f.api.play('__proto__'),false);
 }finally{f.close()}
});

test('hover waits for a user gesture, ignores child transitions/touch and cancels on exit or click',()=>{
 const f=fixture();try{
 f.send('pointerover',{pointerType:'mouse',relatedTarget:null});assert.equal(f.timers.size,0);
 f.send('pointerdown');f.send('pointerover',{pointerType:'touch',relatedTarget:null});assert.equal(f.timers.size,0);
 f.send('pointerover',{pointerType:'mouse',relatedTarget:null});assert.equal(f.timers.size,1);
 f.hoverTick();assert(f.played[0].src.endsWith('crystal-hover.wav'));assert.equal(f.played[0].volume,.18);
 f.send('pointerover',{pointerType:'mouse',relatedTarget:f.q('click')});assert.equal(f.timers.size,0);
 f.send('pointerover',{pointerType:'mouse',relatedTarget:null});f.send('pointerout',{relatedTarget:null});assert.equal(f.timers.size,0);
 f.send('pointerover',{pointerType:'mouse',relatedTarget:null});f.send('click');assert.equal(f.timers.size,0);
 assert(f.played.at(-1).src.endsWith('crystal-click.wav'));
 }finally{f.close()}
});

test('rapid events are bounded to five voices and only handled keyboard navigation plays back/page',async()=>{
 const f=fixture();try{
 for(let i=0;i<12;i++){f.clock(1000+i*200);f.api.play(i%2?'page':'click')}
 assert(f.sounds.filter(sound=>!sound.paused).length<=5);
 let count=f.played.length;f.clock(5000);
 f.send('keydown',{key:'Escape',defaultPrevented:false});await Promise.resolve();assert.equal(f.played.length,count);
 f.send('keydown',{key:'Escape',defaultPrevented:true});await Promise.resolve();assert(f.played.at(-1).src.endsWith('crystal-back.wav'));
 f.clock(5200);f.send('keydown',{target:f.q('skin'),key:'ArrowRight',defaultPrevented:true});await Promise.resolve();assert(f.played.at(-1).src.endsWith('crystal-page.wav'));
 }finally{f.close()}
});


test('new desktop buttons remain audible inside pointer-transparent chrome and footers',()=>{
 const f=fixture();try{
  const layer=f.w.document.createElement('footer');layer.style.pointerEvents='none';
  layer.innerHTML='<button data-wg-action style="pointer-events:auto"><b>Play</b></button><button data-wg-back style="pointer-events:auto">Back</button><button data-sp-card="2" style="pointer-events:auto">Skin</button><button id="blocked-pointer">Blocked</button>';
  f.q('app').append(layer);
  for(const [selector,kind] of [['[data-wg-action]','play'],['[data-wg-back]','back'],['[data-sp-card]','page']]){
   f.clock(1000+f.played.length*200);const button=layer.querySelector(selector);
   f.send('click',{target:button.firstElementChild||button});
   assert(f.played.at(-1)?.src.endsWith('crystal-'+kind+'.wav'),selector+' emits '+kind);
  }
  const count=f.played.length;f.send('click',{target:layer.querySelector('#blocked-pointer')});assert.equal(f.played.length,count);
  f.send('pointerdown');f.send('pointerover',{target:layer.querySelector('[data-wg-action]'),pointerType:'mouse',relatedTarget:null});
  f.hoverTick();assert(f.played.at(-1).src.endsWith('crystal-hover.wav'));
 }finally{f.close()}
});

test('trusted audio runs before online handlers consume persistent-action clicks',()=>{
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert(index.indexOf('src/cherrift_menu_audio.js')<index.indexOf('src/cherrift_online.js'));
 const f=fixture();try{f.w.UI.save.settings.soundEnabled=false;f.send('click');assert.equal(f.played.length,0)}finally{f.close()}
});
