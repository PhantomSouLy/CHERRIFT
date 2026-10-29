import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('src/cherrift_app.js','utf8');
const legacy=source.split('/* ===== BEGIN Succubus Cherry legendary runtime integration ===== */')[1].split('/* ===== END Succubus Cherry legendary runtime integration ===== */')[0];
const patch=readFileSync('src/cherrift_succubus_chibi.js','utf8');
function fixture(patched=true,crimson=false){
 const config={player:{displayWidth:116,displayHeight:116,skins:{succubus_cherry:{}}},effects:{}};
 class Assets{async loadAll(){this.bootReady=true;} async loadImage(key,src){(this.loaded||=[]).push({key,src});return true;}get(){return null}}
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
 if(crimson)vm.runInContext(readFileSync('src/cherrift_succubus_crimson_hunger.js','utf8'),context);
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
test('moving ranged casts smooth the complete pose on the travel clock',()=>{
 const {game,context,ctx,calls}=fixture(),p=game.player,requests=[];
 context.window.CHERRIFT_SUCCUBUS_GAIT={get(){throw Error('separate legs must not be drawn');}};
 context.window.CHERRIFT_ANIMATION_SMOOTHING={draw(...args){requests.push(args);return true;}};
 p.moving=true;p.succubusStride=.4;p.succubusFacing='down_right';
 game.drawPlayer(ctx,p);assert.equal(requests.at(-1)[3],'walk');assert.equal(requests.at(-1)[5],3.2);
 game.autoFire();game.drawPlayer(ctx,p);assert.equal(requests.at(-1)[3],'walk_attack_ranged');assert.equal(requests.at(-1)[5],3.2);
 assert.equal(requests.at(-1)[9].makeLower,undefined);
 context.window.CHERRIFT_ANIMATION_SMOOTHING=null;game.drawPlayer(ctx,p);assert.match(calls.at(-1)[0].key,/_walk_attack_ranged_/);assert.equal(calls.at(-1)[1],3*192);
});

function crimsonCanvas(){
 const calls=[],stack=[];const c=new Proxy({globalAlpha:1,
 save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
 drawImage(...args){calls.push({args,alpha:this.globalAlpha});}},
 {get:(o,k)=>k in o?o[k]:()=>{}});return {c,calls};
}
function combatSnapshot(g){return JSON.parse(JSON.stringify({bullets:g.bullets,hp:g.player.hp,shield:g.player.soulShield,
 fire:g.player.fireTimer,attack:g.player.attackCastTimer,skill:g.player.skillCastTimer,cooldown:g.player.skillTimer,enemies:g.enemies.map(e=>e.hp)}));}
test('Crimson Hunger preserves actual melee, ranged, Soul Drain and lifesteal gameplay',()=>{
 for(const mode of ['ranged','melee','skill']){
  const a=fixture().game,b=fixture(true,true).game;
  if(mode==='melee')for(const g of [a,b])g.enemies=[{x:100,y:0,r:16,hp:1000}];
  for(const g of [a,b])mode==='skill'?g.skill():g.autoFire();
  for(const dt of [.1,.15,.12,.2]){a.update(dt);b.update(dt);assert.deepEqual(combatSnapshot(b),combatSnapshot(a),`${mode} at ${dt}`);}
  if(mode==='ranged')assert.equal(b.bullets.length,1);
  if(mode==='skill')assert.equal(b.bullets.length,6);
 }
 const a=fixture().game,b=fixture(true,true).game;
 for(const g of [a,b]){g.autoFire();g.update(.3);const enemy=g.enemies[0],bullet=g.bullets[0];bullet.x=enemy.x;bullet.y=enemy.y;bullet.vx=0;bullet.vy=0;g.updateBullets(0);}
 assert.deepEqual(combatSnapshot(b),combatSnapshot(a));assert.equal(b.effects.filter(e=>e.type==='crimsonSiphon').length,1);
 const full=fixture(true,true).game;full.player.hp=full.player.maxHp;full.autoFire();full.update(.3);
 Object.assign(full.bullets[0],{x:full.enemies[0].x,y:full.enemies[0].y,vx:0,vy:0});full.updateBullets(0);
 assert.equal(full.effects.filter(e=>e.type==='crimsonSiphon').length,0,'no drain visual if health and shield do not increase');
});
test('Crimson Hunger renders attack art and keeps the cast and shield behind the body',()=>{
 const f=fixture(true,true),g=f.game,{c,calls}=crimsonCanvas();
 g.drawBullet(c,{succubusV095:true,style:'succubus_ranged_v095',x:0,y:0,vx:0,vy:-1,life:.5,maxLife:.72});
 g.drawBullet(c,{succubusV095:true,style:'succubus_soul_v095',x:0,y:0,vx:-1,vy:0,life:1,maxLife:2.35});
 assert.deepEqual(calls.map(x=>x.args[0].key),['crimsonWave','crimsonSoul']);
 calls.length=0;g.effects.push({type:'succubus_skill_burst_v095',x:0,y:-12,t:.2,life:.64});
 g.player.__succubusShieldFxStartV095=0;g.player.__succubusShieldFxUntilV095=1;g.t=.3;
 g.drawPlayer(c,g.player);assert.equal(calls[0].args[0].key,'crimsonAtlas');assert.equal(calls[1].args[0].key,'crimsonAtlas');
 assert(calls.at(-1).args[0].key.startsWith('player_succubus_cherry_'),'sprite draws after VFX');assert.equal(c.globalAlpha,1);
 calls.length=0;g.drawEffect(c,{type:'succubus_skill_burst_v095'});assert.equal(calls.length,0,'vortex does not cover the sprite');
 for(const type of ['succubus_melee_slash_v095','succubus_claw_mark_v095','succubus_ranged_hit_v095','succubus_heal_v095'])g.drawEffect(c,{type,x:0,y:0,t:.1,life:.4,angle:0});
 assert(calls.some(x=>x.args[0].key==='crimsonMelee'));assert(calls.some(x=>x.args[0].key==='crimsonAtlas'));
 const before=g.drawPlayer;vm.runInContext(readFileSync('src/cherrift_succubus_crimson_hunger.js','utf8'),f.context);assert.equal(g.drawPlayer,before);
});
test('walking marks follow actual distance, freeze on pause, and use both Base and Ninja loaders',()=>{
 const {game:g}=fixture(true,true),{c,calls}=crimsonCanvas();
 g.input.getMoveVector=()=>({x:1,y:0});for(let i=0;i<5;i++)g.update(.08);
 g.drawPlayer(c,g.player);assert(calls.filter(x=>x.args[0].key==='crimsonAtlas').length>=1);
 const prev=calls.length;g.mode='paused';g.update(3);g.drawPlayer(c,g.player);assert(calls.length>prev);
 g.mode='playing';g.input.getMoveVector=()=>({x:0,y:0});g.update(.6);calls.length=0;g.drawPlayer(c,g.player);
 assert.equal(calls.filter(x=>x.args[0].key==='crimsonAtlas').length,0);
 const html=readFileSync('index.html','utf8');assert(html.includes('src/cherrift_base_petal_vfx.js'));
 assert(html.includes('src/cherrift_ninja_shadow_sakura.js'));assert(html.includes('src/cherrift_succubus_crimson_hunger.js'));
});
test('full-health Soul Drain creates the original bounded shield and a single siphon',()=>{
 const a=fixture().game,b=fixture(true,true).game;
 for(const g of [a,b]){
  g.player.hp=100;g.player.soulShield=0;g.skill();g.update(.4);
  const soul=g.bullets.find(x=>x.launchDelay===0);assert(soul);
  Object.assign(soul,{x:g.enemies[0].x,y:g.enemies[0].y,vx:0,vy:0});g.updateBullets(0);
 }
 assert.deepEqual(combatSnapshot(b),combatSnapshot(a));
 assert(b.player.soulShield>0);assert(b.player.soulShield<=b.player.maxHp*.15);
 assert.equal(b.effects.filter(e=>e.type==='crimsonSiphon').length,1);
});

test('generated Crimson Hunger art is loaded before assets are ready',async()=>{
 const f=fixture(true,true),loader=vm.runInContext('new ImageAssets()',f.context);await loader.loadAll();
 assert(loader.bootReady);for(const key of ['crimsonAtlas','crimsonWave','crimsonMelee','crimsonSoul']){
  const item=loader.loaded.find(x=>x.key===key);assert(item,key);assert(item.src.includes('succubus_crimson_hunger/'));
 }
});
