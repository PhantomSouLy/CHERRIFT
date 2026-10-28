import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync('src/cherrift_app.js','utf8');
const legacy=app.split('/* ===== BEGIN src/cherrift_v0561.js ===== */')[1].split('/* ===== END src/cherrift_v0561.js ===== */')[0];
const patch=readFileSync('src/cherrift_sakura_dance_chibi.js','utf8');
function fixture(patched=true){
 const config={player:{displayWidth:116,displayHeight:116,skins:{}},effects:{}};
 class Assets{loadAll(){}loadImage(){}get(){return null}}
 class Game{
  async start(){return true}autoFire(){this.delegated='fire'}skill(){this.delegated='skill'}drawPlayer(){this.delegated='draw'}drawEffect(){}
  activeSkinConfig(){return config.player.skins[this.player.skin]}
  movePlayer(v,dt){const p=this.player;p.moving=Math.hypot(v.x,v.y)>.04;p.x+=v.x*p.speed*dt;p.y+=v.y*p.speed*dt;}
  update(dt){if(this.mode!=='playing')return;const p=this.player;for(const k of ['fireTimer','skillTimer','skillCastTimer'])p[k]=Math.max(0,(p[k]||0)-dt);this.movePlayer(this.input.getMoveVector(),dt);this.t+=dt;}
  damageEnemy(e,d){e.hp-=d;if(e.hp<=0)e.dead=true;}
 }
 const storage={defaults:()=>({unlockedSkins:[]}),load:()=>({unlockedSkins:[]}),save:s=>s};
 const data={skins:[]},UI={},document={documentElement:{dataset:{}},getElementById:()=>null};
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_DATA:data,CHERRIFT_V0560:{},CherriftStorage:storage,UI};
 const context=vm.createContext({window,document,CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_DATA:data,CherriftStorage:storage,ImageAssets:Assets,UI,Math:Object.assign(Object.create(Math),{random:()=>.25}),console:{info(){},error(){}}});
 vm.runInContext(legacy,context);const before=JSON.parse(JSON.stringify(config.player.skins.wuxia_sakura_cherry));
 if(patched)vm.runInContext(patch,context);
 const game=new Game();Object.assign(game,{mode:'playing',t:0,bullets:[],effects:[],enemies:[{x:80,y:60,r:16,hp:1000}],input:{getMoveVector:()=>({x:0,y:0})},
 player:{skin:'wuxia_sakura_cherry',x:0,y:0,speed:235,damage:20,hp:100,maxHp:100,fireTimer:0,fireInterval:.8,skillTimer:0,skillCooldown:8,skillCastTimer:0,attackCastTimer:0,lastDir:'down',moving:false,sakuraIdleSeed:123}});
 const calls=[];game.assets={get:key=>({key,width:1152,height:192})};
 const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){calls.push(args)}};
 return {game,config,before,context,ctx,calls};
}
const combat=g=>JSON.parse(JSON.stringify({hp:g.player.hp,speed:g.player.speed,fire:g.player.fireTimer,attack:g.player.attackCastTimer,skill:g.player.skillCastTimer,cooldown:g.player.skillTimer,discount:g.player.wuxiaNextCastDiscount,progress:g.player.wuxiaKillProgress,effects:g.effects,enemies:g.enemies}));
test('new art keeps legacy ID, all Legendary stats and exact cast durations',()=>{
 const {config,before}=fixture(),s=config.player.skins.wuxia_sakura_cherry;
 for(const [k,v] of Object.entries(before))if(k!=='states')assert.deepEqual(s[k],v,k);
 assert.equal(s.states.attack.duration,before.states.attack.duration);assert.equal(s.states.skill.duration,before.states.skill.duration);
 for(const [name,state] of Object.entries(s.states)){
  assert.equal(state.frames,6);assert.equal(Object.keys(state.dirs).length,8);
  for(const file of Object.values(state.dirs)){const p=file.split('?')[0];assert.ok(existsSync(p),p);const b=readFileSync(p);assert.equal(b.readUInt32BE(16),1152);assert.equal(b.readUInt32BE(20),192);assert.equal(b[25],6);}
 }
});
test('two-sword melee and Blossom Spin preserve damage, area, effects and cooldown',()=>{
 const a=fixture(false).game,b=fixture().game;
 a.autoFire();b.autoFire();assert.deepEqual(combat(a),combat(b));assert.equal(b.enemies[0].hp,976.4);
 for(const g of [a,b]){g.enemies.push({x:-100,y:0,hp:1000,r:16});g.skill();}
 assert.deepEqual(combat(a),combat(b));assert.equal(b.enemies[0].hp,919.4);assert.equal(b.enemies[1].hp,943);assert.equal(b.player.skillTimer,8);
 for(const dt of [.1,.2,.1]){a.update(dt);b.update(dt);assert.deepEqual(combat(a),combat(b));}
});
test('every tenth kill reduces remaining cooldown and ready-skill discount is preserved',()=>{
 for(const cooling of [false,true]){const a=fixture(false).game,b=fixture().game;
  for(const g of [a,b]){g.player.skillTimer=cooling?5:0;for(let i=0;i<10;i++)g.damageEnemy({hp:1},100);}
  assert.deepEqual(combat(a),combat(b));if(cooling)assert.equal(b.player.skillTimer,3.5);else{assert.equal(b.player.wuxiaNextCastDiscount,true);a.skill();b.skill();assert.equal(b.player.skillTimer,5.6);assert.deepEqual(combat(a),combat(b));}
 }
});
test('three idles alternate at random waits, return to default, and interrupt on movement/attack/skill',()=>{
 const {game,ctx,calls}=fixture(),p=game.player;game.enemies=[];const seen=new Set();
 game.drawPlayer(ctx,p);assert.match(calls.at(-1)[0].key,/_idle_/);
 for(let i=0;i<1600;i++){game.update(.05);if(p.sakuraIdleVariant)seen.add(p.sakuraIdleVariant);else if(p.sakuraLastIdle)assert.ok(p.sakuraIdleWait>0);}
 assert.deepEqual([...seen].sort(),['idle2','idle3']);
 p.sakuraIdleVariant='idle2';game.input.getMoveVector=()=>({x:-1,y:1});game.update(.1);assert.equal(p.sakuraIdleVariant,null);game.drawPlayer(ctx,p);assert.match(calls.at(-1)[0].key,/_walk_down_left$/);
 p.sakuraIdleVariant='idle3';game.enemies=[{x:p.x+50,y:p.y+50,hp:1000,r:16}];game.autoFire();assert.equal(p.sakuraIdleVariant,null);
 p.sakuraIdleVariant='idle2';game.skill();assert.equal(p.sakuraIdleVariant,null);
});
test('moving attack has independent cast frame and continuous travel phase; pause freezes all clocks',()=>{
 const {game,context,ctx,calls}=fixture(),p=game.player,requests=[];
 const composed={};context.window.CHERRIFT_SAKURA_DANCE_GAIT={get(...args){requests.push(args);return args[2]==='walk_attack'?composed:null;}};
 p.sakuraStride=.4;p.moving=true;game.autoFire();game.drawPlayer(ctx,p);
 assert.equal(requests.at(-1)[2],'walk_attack');assert.equal(requests.at(-1)[4],0);assert.equal(requests.at(-1)[5],3);assert.equal(calls.at(-1)[0],composed);
 game.mode='paused';const t=game.t,cast=p.attackCastTimer;game.update(.5);assert.equal(p.attackCastTimer,cast);assert.equal(game.t,t);assert.equal(p.sakuraStride,.4);
});
test('other skins delegate and double initialization cannot stack combat',()=>{
 const {game,context,ctx}=fixture();vm.runInContext(patch,context);game.player.skin='cherry_default';game.autoFire();assert.equal(game.delegated,'fire');game.skill();assert.equal(game.delegated,'skill');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');
});
test('Legendary movement and attack speed bonuses remain unchanged at start',async()=>{
 const a=fixture(false).game,b=fixture().game;await a.start();await b.start();
 assert.deepEqual(combat(a),combat(b));assert.equal(b.player.speed,235*1.05);assert.equal(b.player.fireInterval,.8/1.05);
 a.skill();b.skill();for(const dt of [.1,.2,.3]){a.movePlayer({x:1,y:0},dt);b.movePlayer({x:1,y:0},dt);assert.equal(b.player.x,a.player.x);assert.equal(b.player.speed,a.player.speed);}
});
test('eight directions share the same scale and pivot, missing art uses only new idle',()=>{
 const {game,ctx,calls}=fixture(),p=game.player;
 for(const [x,y,d] of [[1,0,'right'],[1,1,'down_right'],[0,1,'down'],[-1,1,'down_left'],[-1,0,'left'],[-1,-1,'up_left'],[0,-1,'up'],[1,-1,'up_right']]){
  game.movePlayer({x,y},0);p.moving=false;game.drawPlayer(ctx,p);const c=calls.at(-1);assert.ok(c[0].key.endsWith('_idle_'+d));assert.equal(c[7],116*.95*4/3);assert.equal(c[5],p.x-c[7]/2);assert.equal(c[6],p.y+30-184*c[8]/192);
 }
 p.moving=true;game.assets.get=key=>key.includes('_idle_')?{key,width:1152,height:192}:null;game.drawPlayer(ctx,p);assert.match(calls.at(-1)[0].key,/_idle_/);
});
