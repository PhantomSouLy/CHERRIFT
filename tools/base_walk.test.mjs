import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(colors=false){
 class Game{
  movePlayer(v,dt){if(this.blocked)return;this.player.x+=v.x*235*dt;this.player.y+=v.y*235*dt;}
  autoFire(){} skill(){} update(){} drawPlayer(){} nearest(){return {x:400,y:200};}
 }
 const config={player:{skins:{cherry_default:{}},displayWidth:116,displayHeight:116}};
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config,
  CHERRIFT_BASE_WALK:{draw(){throw Error('retired rig');}},
  CHERRIFT_ANIMATION_SMOOTHING:{draw(){throw Error('whole frames must not warp');}}};
 const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,...(colors?{OffscreenCanvas:class{constructor(w,h){this.width=w;this.height=h;}toDataURL(){return this;}getContext(){const out=this;return {filter:'none',save(){},restore(){},beginPath(){},rect(){},clip(){},clearRect(){},drawImage(image){out.source=image;out.colorFilter=this.filter;}};}},Image:class{set src(canvas){Object.assign(this,{width:canvas.width,height:canvas.height,colorFilter:canvas.colorFilter});this.onload();}}}:{})});
 for(const n of ['cherry_geometry','cherry_shot_alignment','cherry_motion','base_cherry'])vm.runInContext(read(`src/cherrift_${n}.js`),context);
 const game=new Game();game.player={skin:'cherry_default',x:0,y:0,speed:235,moving:true,fireTimer:0,fireInterval:.42};game.mode='playing';game.t=0;
 const sheets=new Map();game.assets={get:key=>{if(!sheets.has(key))sheets.set(key,{key,width:1152,height:192});return sheets.get(key);}};
 const draws=[],stack=[],ctx={globalAlpha:.4,filter:'none',save(){stack.push({alpha:this.globalAlpha,filter:this.filter});},restore(){const saved=stack.pop();this.globalAlpha=saved.alpha;this.filter=saved.filter;},beginPath(){},ellipse(){},fill(){},drawImage(...a){draws.push({a,alpha:this.globalAlpha,filter:this.filter});}};
 return {window,game,ctx,draws};
}
test('all eight directions and all six states draw exactly one complete square pose without rig or flow',()=>{
 const {window,game,ctx,draws}=fixture(),p=game.player;
 for(const dir of window.CHERRIFT_BASE_CHERRY.directions)for(const state of ['idle','idle2','walk','attack','walk_attack','skill'])for(let f=0;f<6;f++){
  Object.assign(p,{moving:state==='walk'||state==='walk_attack',baseFacing:dir,attackDir:dir,skillDir:dir,baseStride:(f+.1)/8,baseIdleTime:state==='idle2'?6+(f+.1)/3:0,skillCastDuration:6/14,skillCastTimer:state==='skill'?(6-f-.1)/14:0,baseAttack:state.includes('attack')?{elapsed:(f+.1)/18,duration:6/18}:null});game.t=(f+.1)/3;
  const n=draws.length;game.drawPlayer(ctx,p);assert.equal(draws.length,n+1);
  const {a,alpha}=draws.at(-1);assert.ok(a[0].key.endsWith(`${state}_${dir}`));assert.equal(a[1],f*192);assert.equal(a[2],0);assert.equal(a[3],192);assert.equal(a[4],192);assert.equal(a[7],a[8]);assert.equal(alpha,1);assert.equal(ctx.globalAlpha,.4);
 }
});
test('travel clock survives turns, cast start/end, blocked movement and dash',()=>{
 const {game,ctx,draws}=fixture(),p=game.player;
 game.movePlayer({x:1,y:0},.2);assert.equal(p.baseStride,.2);
 game.autoFire();game.drawPlayer(ctx,p);assert.equal(draws.at(-1).a[1],192);
 p.baseAttack.elapsed=.3;game.drawPlayer(ctx,p);assert.equal(draws.at(-1).a[1],192);
 game.movePlayer({x:0,y:-1},.2);assert.equal(p.baseStride,.4);
 p.baseAttack=null;game.drawPlayer(ctx,p);assert.equal(draws.at(-1).a[1],3*192);
 game.blocked=true;game.movePlayer({x:1,y:0},1);assert.equal(p.baseStride,.4);
 game.blocked=false;p.dashTimer=.1;game.movePlayer({x:1,y:0},1);assert.equal(p.baseStride,.4);
});
test('dash copies retain ghost opacity while the main sprite is fully opaque',()=>{
 const {game,ctx,draws}=fixture();ctx.globalAlpha=.12;game.drawPlayer(ctx,{...game.player});assert.equal(draws.at(-1).alpha,.12);
 game.drawPlayer(ctx,game.player);assert.equal(draws.at(-1).alpha,1);assert.equal(ctx.globalAlpha,.12);
});
test('retired Base rig is absent from boot and shared routing; builds stay consistent',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('src/cherrift_manifest.json'));
 assert.ok(!html.includes('src/cherrift_base_walk.js'));assert.equal(manifest.entrypoints.baseWalk,undefined);
 assert.ok(!read('src/cherrift_cherry_motion.js').includes('CHERRIFT_BASE_WALK'));
 assert.ok(html.indexOf('src/cherrift_cherry_motion.js')<html.indexOf('src/cherrift_base_cherry.js'));
 const values=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);assert.deepEqual([...new Set(values)],[manifest.buildId]);
});

test('Walk color matching is isolated to the four requested directions and never leaks into Idle, casts or fallback art',()=>{
 const {game,ctx,draws}=fixture(true),p=game.player;
 const graded=new Set(['left','right','down_left','down_right']);
 for(const facing of ['left','right','down_left','down_right','down','up','up_left','up_right'])for(const state of ['idle','walk','walk_attack','attack','skill']){
  Object.assign(p,{moving:state==='walk'||state==='walk_attack',baseFacing:facing,attackDir:facing,skillDir:facing,baseAttack:state.includes('attack')?{elapsed:.1,duration:6/18}:null,skillCastTimer:state==='skill'?.1:0});
  ctx.filter='brightness(0.98)';game.drawPlayer(ctx,p);
  const grade=draws.at(-1).a[0].colorFilter;
  assert.equal(!!grade,state==='walk'&&graded.has(facing));
  assert.equal(draws.at(-1).filter,'brightness(0.98)');assert.equal(ctx.filter,'brightness(0.98)');assert.equal(ctx.globalAlpha,.4);
 }
 Object.assign(p,{moving:true,baseFacing:'right',baseAttack:null,skillCastTimer:0});
 game.assets={get:key=>key.includes('_idle_')?{key,width:1152,height:192}:null};
 game.drawPlayer(ctx,p);assert.ok(draws.at(-1).a[0].key.includes('_idle_'));assert.equal(draws.at(-1).filter,'brightness(0.98)');
});
