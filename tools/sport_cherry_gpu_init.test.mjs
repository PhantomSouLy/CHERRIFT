// Regression: Sport rendering must not need or initialize the retired GPU gait.
import test from 'node:test';import assert from 'node:assert/strict';
import vm from 'node:vm';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('all 288 shipped Sport poses render as one complete authored cell without any warp backend',()=>{
 class Game{movePlayer(){}autoFire(){}skill(){}update(){}drawPlayer(){}}
 const config={player:{displayWidth:192,displayHeight:192,skins:{sport_cherry:{}}}};
 const fail=()=>{throw Error('Legacy warp/flow backend called');};
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_SPORT_GAIT:{draw:fail},CHERRIFT_ANIMATION_SMOOTHING:{draw:fail}};
 const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config});
 for(const name of ['cherry_motion','sport_data','sport_cherry'])vm.runInContext(read('src/cherrift_'+name+'.js'),context);
 assert.equal(window.CHERRIFT_ANIMATION_FLOW,undefined);assert.equal(window.CHERRIFT_SPORT_WHOLE_POSE,undefined);
 const game=new Game(),calls=[],stack=[];
 const ctx={globalAlpha:.01,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push({a,alpha:this.globalAlpha});}};
 game.assets={get:key=>({key,width:1152,height:192})};
 for(const state of ['idle','idle2','walk','attack','walk_attack','skill'])for(const dir of window.CHERRIFT_SPORT_CHERRY.directions)for(let frame=0;frame<6;frame++){
  const elapsed=(frame+.1)/(state==='skill'?16:18);
  const p={skin:'sport_cherry',x:100,y:200,sportFacing:dir,attackDir:dir,skillDir:dir,moving:state.startsWith('walk'),sportStride:(frame+.1)/8,sportIdleTime:state==='idle2'?6+(frame+.1)/3:0,sportAttack:state.includes('attack')?{elapsed,duration:6/18}:null,skillCastDuration:6/16,skillCastTimer:state==='skill'?6/16-elapsed:0};
  game.player=p;game.t=(frame+.1)/3;game.drawPlayer(ctx,p);
  const c=calls.at(-1);assert.equal(c.alpha,1);assert.equal(ctx.globalAlpha,.01);assert.equal(c.a[0].key,`player_sport_cherry_${state}_${dir}`);assert.deepEqual(c.a.slice(1,5),[frame*192,0,192,192]);assert.equal(c.a.length,9);
  assert.equal(c.a[7],192*.95);assert.equal(c.a[8],192*.95);assert.ok(c.a.slice(5).every(Number.isFinite));
 }
 assert.equal(calls.length,288);assert.equal(stack.length,0);
 // Ghost previews keep the caller opacity; only the actual player is forced opaque.
 const ghost={...game.player,skillCastTimer:0,moving:true};game.drawPlayer(ctx,ghost);assert.equal(calls.at(-1).alpha,.01);
});
test('mirrored full-figure registration keeps the same root without touching shared/Base/Cake geometry',()=>{
 const window={CHERRIFT_CHERRY_GEOMETRY:{cherry_default:{sentinel:true},cake_deliver_cherry:{sentinel:true}}};
 vm.runInNewContext(read('src/cherrift_sport_data.js'),{window});const g=window.CHERRIFT_CHERRY_GEOMETRY;
 assert.equal(g.cherry_default.sentinel,true);assert.equal(g.cake_deliver_cherry.sentinel,true);
 for(const s of Object.keys(g.sport_cherry))for(const [left,right]of Object.entries({left:'right',up_left:'up_right',down_left:'down_right'}))for(let i=0;i<6;i++){
  const a=g.sport_cherry[s][left][i],b=g.sport_cherry[s][right][i];assert.equal(a[0],b[0]);assert.equal(a[1],b[1]);assert.ok(Math.abs(a[2]+b[2]-192)<1e-9);assert.equal(a[1]-a[0],156);
 }
});
test('cached full-strip palette preserves alpha/whites/skin/eyes and only grades corrected strips and never grades untouched Idle or missing-gait fallbacks',()=>{
 class Game{movePlayer(){}autoFire(){}skill(){}update(){}drawPlayer(){}}
 const samples=Uint8ClampedArray.from([246,166,162,255,240,240,240,255,250,215,185,255,130,80,50,255,246,166,162,137]);let allocations=0;
 class Canvas{constructor(){allocations++;const self=this;this.c={drawImage(image){self.pixels=new Uint8ClampedArray(image.pixels);},getImageData(){return{data:new Uint8ClampedArray(self.pixels)};},putImageData(p){self.pixels=p.data;}};}getContext(){return this.c;}}
 const config={player:{skins:{sport_cherry:{}}}},window={CherriftGame:Game,CHERRIFT_CONFIG:config};const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,OffscreenCanvas:Canvas});
 for(const name of ['sport_data','sport_cherry'])vm.runInContext(read('src/cherrift_'+name+'.js'),context);
 const game=new Game(),assets=new Map();for(const state of ['idle','idle2','walk','attack','walk_attack','skill'])for(const dir of window.CHERRIFT_SPORT_CHERRY.directions){const key=`player_sport_cherry_${state}_${dir}`;assets.set(key,{key,pixels:samples,width:1152,height:192});}
 game.assets={get:key=>assets.get(key)};const p=game.player={skin:'sport_cherry',x:0,y:0,moving:true,sportFacing:'right',sportStride:0};let image;
 const c={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(im){image=im;}};
 game.drawPlayer(c,p);const graded=image;assert.equal(allocations,26);assert.notEqual(graded,assets.get('player_sport_cherry_walk_right'));
 for(let i=3;i<samples.length;i+=4)assert.equal(graded.pixels[i],samples[i]);
 assert.deepEqual(Array.from(graded.pixels.slice(4,16)),Array.from(samples.slice(4,16)));assert.notDeepEqual(Array.from(graded.pixels.slice(0,3)),Array.from(samples.slice(0,3)));
 for(let frame=0;frame<6;frame++){p.sportStride=frame/8;game.drawPlayer(c,p);assert.equal(image,graded);}assert.equal(allocations,26);
 p.moving=false;game.drawPlayer(c,p);assert.equal(image,assets.get('player_sport_cherry_idle_right'));
 p.moving=true;assets.delete('player_sport_cherry_walk_right');game.drawPlayer(c,p);assert.equal(image,assets.get('player_sport_cherry_idle_right'));
});
test('retained complete contact poses retain identical colors across the source-atlas boundary',()=>{
 class Game{movePlayer(){}autoFire(){}skill(){}update(){}drawPlayer(){}}
 const channels=v=>Array.from({length:3},()=>[[0,0],[255,v]]);
 const pixels=new Uint8ClampedArray(1152*4);for(const x of [0,192,768,960])pixels.set([246,166,162,255],x*4);
 class Canvas{getContext(){const self=this;return{drawImage(image){self.pixels=new Uint8ClampedArray(image.pixels);},getImageData(){return{data:self.pixels};},putImageData(p){self.pixels=p.data;}};}}
 const config={player:{skins:{sport_cherry:{}}}},window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_SPORT_PALETTE:{walk:{down_right:channels(255)}},CHERRIFT_SPORT_PALETTE_PASSING:{walk:{down_right:channels(200)}}};
 vm.runInNewContext(read('src/cherrift_sport_cherry.js'),{window,CherriftGame:Game,CHERRIFT_CONFIG:config,OffscreenCanvas:Canvas});
 const game=new Game();game.player={skin:'sport_cherry',x:0,y:0,moving:true,sportFacing:'down_right'};game.assets={get:()=>({pixels})};let painted;
 const c={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(im){painted=im;}};game.drawPlayer(c,game.player);
 const rgba=x=>Array.from(painted.pixels.slice(x*4,x*4+4));assert.deepEqual(rgba(0),[246,166,162,255]);assert.deepEqual(rgba(960),rgba(0));assert.deepEqual(rgba(192),rgba(768));assert.notDeepEqual(rgba(192),rgba(0));assert.equal(rgba(192)[3],255);
});
