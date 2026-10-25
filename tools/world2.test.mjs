import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('src/cherrift_world1.js',root),'utf8');
function fixture() {
  const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window,requests=[];
  const calls=[];
  const gradient={addColorStop:(...a)=>calls.push(['stop',...a])};
  const context=new Proxy({createPattern:()=>({setTransform:matrix=>calls.push(['patternScale',matrix.a])}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},
    {get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});
  w.HTMLCanvasElement.prototype.getContext=()=>context;
  w.DOMMatrix=class{scale(value){this.value=value;return this;}};
  w.Image=class{constructor(){this.width=384;this.height=384;}set src(v){this._src=v;requests.push(v);queueMicrotask(()=>this.onload?.());}get src(){return this._src;}decode(){return Promise.resolve();}};
  w.CHERRIFT_CONFIG={worldSize:4200};w.eval(source);w.eval(readFileSync(new URL('src/cherrift_world2.js',root),'utf8'));
  const game={stage:{id:'world_2_1',world:2},save:{settings:{effectQuality:'high'}},player:{x:0,y:0,r:18},
    w:1280,h:720,zoom:1.14,camera:{x:0,y:0},enemies:[],pickups:[],effects:[],bullets:[],resize(){},
    drawObstacle(c,o){w.CHERRIFT_WORLD2.drawObject(this,c,o);},drawObj(c,o){if(o.meadow)this.drawObstacle(c,o);}};
  w.UI={game};return{dom,w,api:w.CHERRIFT_WORLD2,game,requests,calls,context};
}
test('every export and splash exists; source and all tiers share canonical silhouettes',()=>{
 const f=fixture();try{
  for(const tier of ['low','medium','high'])for(const name of ['ground',...Object.keys(f.api.spec.objects)])assert(existsSync(new URL(`assets/map/world2/moonlit/${tier}/${name}.webp`,root)));
  assert(existsSync(new URL(f.api.splash,root)));
  const dimensions=JSON.parse(readFileSync(new URL('assets/map/world2/moonlit/dimensions.json',root)));
  for(const[key,s]of Object.entries(f.api.spec.objects))assert(Math.abs(s.w/s.h-dimensions[key].width/dimensions[key].height)<.03,key);
 }finally{f.dom.window.close();}
});
test('same seed rebuilds exactly; different runs change layout; tiers do not move obstacles',()=>{
 const f=fixture();try{
  const snapshot=seed=>{f.api.build(f.game,seed);return JSON.stringify(f.game.obstacles);};
  const baseline=snapshot('run-a');assert.equal(snapshot('run-a'),baseline);assert.notEqual(snapshot('run-b'),baseline);
  for(const tier of ['low','medium','high']){f.game.save.settings.effectQuality=tier;assert.equal(snapshot('run-a'),baseline);}
 }finally{f.dom.window.close();}
});
test('100 generated runs keep spawn and crossing lanes clear, with separated solids and exterior scenery',()=>{
 const f=fixture();try{
  for(let seed=0;seed<100;seed++){
   f.api.build(f.game,seed);const solids=f.game.__cherriftCleanSolidObjects;
   assert.equal(solids.length,86);
   for(const o of solids){assert(Math.hypot(o.x,o.y)>=340);assert(!f.api.lane(o.x,o.y));assert(Math.abs(o.x)<f.api.boundary());}
   for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)assert(Math.hypot(solids[i].x-solids[j].x,solids[i].y-solids[j].y)>solids[i].r+solids[j].r+45);
   assert.equal(f.game.obstacles.filter(o=>o.exterior).length,190);assert(f.game.obstacles.filter(o=>o.exterior).every(o=>!o.solid));
   // Grid flood fill checks that all sampled traversable interior space connects.
   const step=70,b=f.api.boundary()-80,n=Math.floor(b*2/step)+1,open=new Set();
   for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!f.api.collides(f.game,-b+x*step,-b+y*step))open.add(y*n+x);
   const seen=new Set(),queue=[...open].slice(0,1);if(queue.length)seen.add(queue[0]);
   for(let k=0;k<queue.length;k++){const id=queue[k],x=id%n,y=Math.floor(id/n);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,next=ny*n+nx;if(nx>=0&&ny>=0&&nx<n&&ny<n&&open.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}}}
   assert.equal(seen.size,open.size,`connected run ${seed}`);
  }
 }finally{f.dom.window.close();}
});
test('collision uses explicit trunk/rock footprints and ignores decoration and exterior props',()=>{
 const f=fixture();try{
  f.api.build(f.game,'collision');
  const rock=f.game.__cherriftCleanSolidObjects.find(o=>o.objectKey==='rock1');
  assert(f.api.collides(f.game,rock.x,rock.y));assert(!f.api.collides(f.game,0,0));
  const tree=f.game.__cherriftCleanSolidObjects.find(o=>o.objectKey==='tree1');assert(!f.api.collides(f.game,tree.x,tree.y-tree.drawH*.7));
  assert(f.game.obstacles.filter(o=>o.objectKey.startsWith('flower')).every(o=>!o.solid));
 }finally{f.dom.window.close();}
});
test('quality switches load actual tier URLs without rebuilding the run',async()=>{
 const f=fixture();try{
  f.api.build(f.game,'quality');const obstacles=f.game.obstacles;
  await f.api.selectArt(f.game);assert.equal(f.game.__meadowArt.tier,'high');
  f.game.save.settings.effectQuality='low';await f.api.selectArt(f.game);
  assert.equal(f.game.__meadowArt.tier,'low');assert.equal(f.game.obstacles,obstacles);
  assert.equal(f.requests.filter(x=>x.includes('/low/')).length,17);
  assert(f.game.__cherriftCleanSolidObjects.every(o=>f.api.shouldDraw(f.game,o)));
  assert(f.game.obstacles.some(o=>!o.exterior&&!o.solid&&!f.api.shouldDraw(f.game,o)));
 }finally{f.dom.window.close();}
});
test('late tier load cannot overwrite a newer selection',async()=>{
 const f=fixture();try{
  const a=f.api.selectArt(f.game);f.game.save.settings.effectQuality='low';const b=f.api.selectArt(f.game);
  await Promise.all([a,b]);assert.equal(f.game.__meadowArt.tier,'low');
 }finally{f.dom.window.close();}
});
test('starting World2 after another world prepares images before its stage changes',async()=>{
 const f=fixture();try{f.game.stage={world:1};await f.api.prepare(f.game);assert.equal(f.game.__meadowArt.tier,'high');assert(f.game.__meadowSeed);}finally{f.dom.window.close();}
});
test('ground scale is independent of export size and dark edge fades over continued scenery',async()=>{
 const f=fixture();try{
  await f.api.prepare(f.game);f.api.build(f.game,'render');f.api.drawWorld(f.game,f.context);
  assert(f.calls.some(x=>x[0]==='patternScale'&&x[1]===1));
  assert(f.calls.some(x=>x[0]==='stop'&&x[2]==='rgba(8,18,18,.76)'));
 }finally{f.dom.window.close();}
});
test('foliage attaches after the canonical runtime and transforms the final renderer',()=>{
 const f=fixture();try{
  class Game {update(){}drawObstacle(){f.calls.push(['old']);}}
  f.w.CherriftGame=Game;f.w.matchMedia=()=>({matches:false});
  f.w.eval(readFileSync(new URL('src/cherrift_foliage.js',root),'utf8'));
  Game.prototype.drawObstacle=()=>f.calls.push(['final']);
  f.w.dispatchEvent(new f.w.Event('cherrift:runtime-ready'));
  const game=new Game();Object.assign(game,f.game,{mode:'playing',t:0,obstacles:[{x:0,y:0,drawW:70,drawH:60,anchor:.83,assetKey:'bush',kind:'bush',solid:false}],player:{x:-100,y:0,r:18}});
  delete game.drawObstacle; // Exercise the prototype hook, not the preview fixture's own method.
  game.update(.1);game.t=.1;game.player.x=0;game.update(.1);game.t=.15;game.drawObstacle(f.context,game.obstacles[0]);
  assert(f.calls.some(x=>x[0]==='rotate'));assert(f.calls.some(x=>x[0]==='final'));assert(!f.calls.some(x=>x[0]==='old'));
 }finally{f.dom.window.close();}
});

test('World2 uses canonical World1 footprints and owns an independent night cache',async()=>{
 const f=fixture();try{
  const day=f.w.CHERRIFT_WORLD1,night=f.api;
  for(const key of Object.keys(day.spec.objects)){
   const {src:a,...d}=day.spec.objects[key],{src:b,...n}=night.spec.objects[key];assert.deepEqual(n,d);assert.notEqual(a,b);
  }
  await day.prepare(f.game);assert(f.game.__meadowArt.images.get('ground').src.includes('/world1/'));
  await night.prepare(f.game);assert(f.game.__meadowArt.images.get('ground').src.includes('/world2/'));
  f.game.stage={world:1};assert.equal(await night.selectArt(f.game),false);
 }finally{f.dom.window.close();}
});
test('fireflies drift slowly and smoothly; density scales without changing collisions',()=>{
 const f=fixture();try{
  f.api.build(f.game,'fireflies');assert.equal(f.game.__meadow.fireflies.length,900);
  const solid=JSON.stringify(f.game.__cherriftCleanSolidObjects),counts=[];
  for(const p of f.game.__meadow.fireflies){
   const a=f.api.fireflyPosition(p,10),b=f.api.fireflyPosition(p,10.016),later=f.api.fireflyPosition(p,30);
   assert(Math.hypot(a.x-b.x,a.y-b.y)<.4);assert(Math.hypot(a.x-later.x,a.y-later.y)>0);
   assert.deepEqual(f.api.fireflyPosition(p,10),a);
  }
  f.game.t=10;
  for(const tier of ['low','medium','high']){
   f.game.save.settings.effectQuality=tier;f.calls.length=0;f.api.drawFireflies(f.game,f.context);
   counts.push(f.calls.filter(c=>c[0]==='arc').length);
   assert.equal(JSON.stringify(f.game.__cherriftCleanSolidObjects),solid);
  }
  assert(counts[0]>0&&counts[0]<counts[1]&&counts[1]<counts[2],counts.join(','));
 }finally{f.dom.window.close();}
});
test('World2 loads before consumers and all chapter art resolves to the night splash',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert(html.indexOf('src/cherrift_world1.js')<html.indexOf('src/cherrift_world2.js'));
 assert(html.indexOf('src/cherrift_world2.js')<html.indexOf('src/cherrift_app.js'));
 const runtime=readFileSync(new URL('src/cherrift_runtime.js',root),'utf8');
 assert(runtime.includes('2:window.CHERRIFT_WORLD2.spec'));
 assert(runtime.includes('world === 2 ? window.CHERRIFT_WORLD2.splash'));
});
