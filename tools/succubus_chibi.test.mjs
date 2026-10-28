import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('src/cherrift_app.js','utf8');
const legacy=source.split('/* ===== BEGIN Succubus Cherry legendary runtime integration ===== */')[1].split('/* ===== END Succubus Cherry legendary runtime integration ===== */')[0];
const patch=readFileSync('src/cherrift_succubus_chibi.js','utf8');
function fixture(patched=true){
 const config={player:{displayWidth:116,displayHeight:116,skins:{succubus_cherry:{}}},effects:{}};
 class Assets{loadAll(){}loadImage(){}get(){return null}}
 class Game{
  async start(){return true}autoFire(){this.delegated='fire'}skill(){this.delegated='skill'}drawPlayer(){this.delegated='draw'}drawBullet(){}drawEffect(){}updateBullets(){}
  activeSkinConfig(){return config.player.skins[this.player.skin]}
  movePlayer(v,dt){const p=this.player;p.moving=Math.hypot(v.x,v.y)>.04;p.x+=v.x*p.speed*dt;p.y+=v.y*p.speed*dt;}
  update(dt){if(this.mode!=='playing')return;const p=this.player;for(const k of ['fireTimer','skillTimer','skillCastTimer','attackCastTimer'])p[k]=Math.max(0,(p[k]||0)-dt);this.movePlayer(this.input.getMoveVector(),dt);this.t+=dt;}
  damageEnemy(enemy,damage){enemy.hp-=damage;}
 }
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
 const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,ImageAssets:Assets,Math:Object.assign(Object.create(Math),{random:()=>.25}),console:{info(){}}});
 vm.runInContext(legacy,context);const before=JSON.parse(JSON.stringify(config.player.skins.succubus_cherry));
 if(patched)vm.runInContext(patch,context);
 const game=new Game();Object.assign(game,{mode:'playing',t:0,bullets:[],effects:[],enemies:[{x:400,y:400,r:16,hp:1000}],input:{getMoveVector:()=>({x:0,y:0})},
 player:{skin:'succubus_cherry',x:0,y:0,speed:235,damage:20,hp:80,maxHp:100,soulShield:0,fireTimer:0,fireInterval:.8,skillTimer:0,skillCooldown:8,skillCastTimer:0,attackCastTimer:0,lastDir:'down',moving:false,succubusIdleSeed:123}});
 const calls=[];game.assets={get:key=>({key,width:1152,height:192})};
 const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){calls.push(args)}};
 return {game,config,before,context,ctx,calls};
}
const snapshot=g=>JSON.parse(JSON.stringify({bullets:g.bullets,effects:g.effects,hp:g.player.hp,shield:g.player.soulShield,
 fire:g.player.fireTimer,attack:g.player.attackCastTimer,skill:g.player.skillCastTimer,cooldown:g.player.skillTimer,enemies:g.enemies.map(e=>e.hp)}));

test('64 eight-direction RGBA strips replace art while preserving Legendary combat configuration',()=>{
 const {config,before}=fixture(),skin=config.player.skins.succubus_cherry;
 for(const [k,v] of Object.entries(before))if(k!=='states')assert.deepEqual(skin[k],v,k);
 let count=0;
 for(const [name,state] of Object.entries(skin.states)){
  assert.equal(Object.keys(state.dirs).length,8);
  if(['attack','attackMove'].includes(name))continue;
  assert.equal(state.frames,6);
  for(const path of Object.values(state.dirs)){
   const file=path.split('?')[0];assert.ok(existsSync(file),file);const png=readFileSync(file);
   assert.equal(png.readUInt32BE(16),1152);assert.equal(png.readUInt32BE(20),192);assert.equal(png[25],6,'RGBA');count++;
  }
 }
 assert.equal(count,64);assert.equal(skin.skillType,'soul_drain');assert.equal(skin.hpDrainRate,.05);assert.equal(skin.shieldRate,.15);
 assert.equal(skin.states.skill.duration,before.states.skill.duration);
 assert.equal(skin.states.skill.burstFrame/skin.states.skill.fps,before.states.skill.burstFrame/before.states.skill.fps);
});
test('standing and moving ranged casts keep the exact single wave, fire time, damage and cooldown',()=>{
 for(const moving of [false,true]){
  const a=fixture(false).game,b=fixture().game;
  for(const g of [a,b]){g.player.moving=moving;if(moving)g.input.getMoveVector=()=>({x:1,y:0});g.autoFire();}
  assert.deepEqual(snapshot(b),snapshot(a));
  for(const dt of [.18,.01,.2,.02,.2]){a.update(dt);b.update(dt);assert.deepEqual(snapshot(b),snapshot(a));}
  assert.equal(b.bullets.length,1);assert.equal(b.bullets[0].dmg,21.6);assert.equal(b.bullets[0].drainRate,.05);
  b.autoFire();assert.equal(b.bullets.length,1);
 }
});
test('melee retains both original hit events, cone damage and healing',()=>{
 const a=fixture(false).game,b=fixture().game;
 for(const g of [a,b]){g.enemies=[{x:80,y:60,hp:1000,r:16}];g.autoFire();assert.equal(g.player.__succubusAttackV095.animation,'attack_melee');}
 for(const dt of [.1,.02,.1,.02,.1]){a.update(dt);b.update(dt);assert.deepEqual(snapshot(b),snapshot(a));}
 assert.equal(b.enemies[0].hp,977.6);assert.equal(b.bullets.length,0);assert.ok(b.player.hp>80);
});
test('Soul Drain retains its burst time, soul count, projectiles and existing effects',()=>{
 const a=fixture(false).game,b=fixture().game;
 a.skill();b.skill();assert.deepEqual(snapshot(b),snapshot(a));
 for(const dt of [.3,.04,.2,.2]){a.update(dt);b.update(dt);assert.deepEqual(snapshot(b),snapshot(a));}
 assert.equal(b.bullets.length,6);assert.ok(b.bullets.every(x=>x.style==='succubus_soul_v095'&&x.dmg===10&&x.shieldOnFull));
 assert.equal(b.effects.filter(e=>e.type==='succubus_skill_burst_v095').length,1);
 b.skill();assert.equal(b.effects.length,a.effects.length);
});
test('three idle modes return to the default, vary at random intervals, and interrupt immediately',()=>{
 const {game,ctx,calls}=fixture(),p=game.player;game.enemies=[];
 game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.includes('_idle_'));
 const seen=new Set();let lastVariant;
 for(let i=0;i<1600;i++){
  game.update(.05);
  if(p.succubusIdleVariant){seen.add(p.succubusIdleVariant);lastVariant=p.succubusIdleVariant;}
  else if(lastVariant){assert.ok(p.succubusIdleWait>0);lastVariant=null;}
 }
 assert.deepEqual([...seen].sort(),['idle2','idle3']);
 p.succubusIdleVariant='idle3';p.succubusIdleElapsed=.4;
 game.input.getMoveVector=()=>({x:-1,y:1});game.update(.1);assert.equal(p.succubusIdleVariant,null);
 game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.endsWith('_walk_down_left'));
 p.succubusIdleVariant='idle2';game.enemies=[{x:400,y:400,r:16,hp:1000}];game.autoFire();assert.equal(p.succubusIdleVariant,null);
});
test('all eight directions use the fixed pivot, moving legs keep their travel clock, and pause is stable',()=>{
 const {game,ctx,calls}=fixture(),p=game.player;
 for(const [x,y,dir] of [[1,0,'right'],[1,1,'down_right'],[0,1,'down'],[-1,1,'down_left'],[-1,0,'left'],[-1,-1,'up_left'],[0,-1,'up'],[1,-1,'up_right']]){
  game.movePlayer({x,y},0);p.moving=false;game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.endsWith('_idle_'+dir));
  assert.ok(Math.abs(calls.at(-1)[5]-(p.x-55.1))<1e-8);
 }
 p.moving=true;p.succubusStride=.4;game.autoFire();game.drawPlayer(ctx,p);
 assert.ok(calls.at(-1)[0].key.includes('_walk_attack_ranged_'));assert.equal(calls.at(-1)[1],3*192);
 const elapsed=p.__succubusAttackV095.elapsed;game.mode='paused';game.update(.2);assert.equal(p.__succubusAttackV095.elapsed,elapsed);
});
test('missing special art falls back to the new idle, other skins delegate, and double initialization is safe',()=>{
 const {game,context,ctx,calls}=fixture();vm.runInContext(patch,context);
 game.autoFire();assert.equal(game.player.__succubusAttackV095.elapsed,0);
 game.assets.get=key=>key.includes('_idle_')?{key,width:1152,height:192}:null;
 game.drawPlayer(ctx,game.player);assert.ok(calls.at(-1)[0].key.includes('_idle_'));
 game.player.skin='mage_cherry';game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');game.autoFire();assert.equal(game.delegated,'fire');
});
test('moving ranged casts use the same stride compositor as walking and keep its phase',()=>{
 const {game,context,ctx,calls}=fixture(),p=game.player,requests=[];
 const composed={width:192,height:192};
 context.window.CHERRIFT_SUCCUBUS_GAIT={get(image,idle,state,dir,frame,phase){
  requests.push({state,dir,frame,idle,phase});return state==='walk'||state==='walk_attack_ranged'?composed:null;
 }};
 p.moving=true;p.succubusStride=.4;p.succubusFacing='down_right';
 game.drawPlayer(ctx,p);assert.equal(requests.at(-1).state,'walk');assert.equal(requests.at(-1).frame,0);assert.equal(requests.at(-1).phase,3.2);
 assert.equal(calls.at(-1)[0],composed);assert.equal(calls.at(-1)[1],0);
 game.autoFire();game.drawPlayer(ctx,p);
 assert.equal(requests.at(-1).state,'walk');assert.equal(requests.at(-1).frame,0);assert.equal(requests.at(-1).phase,3.2);
 assert.equal(calls.at(-1)[0],composed);assert.match(requests.at(-1).idle.key,/_idle_/);
 p.__succubusAttackV095=null;p.moving=false;game.drawPlayer(ctx,p);
 assert.notEqual(calls.at(-1)[0],composed);
});

