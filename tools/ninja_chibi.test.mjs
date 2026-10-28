import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('src/cherrift_app.js','utf8');
const legacy=source.split('/* ===== BEGIN src/cherrift_v0553.js ===== */')[1].split('/* ===== END src/cherrift_v0553.js ===== */')[0];
const hybrid=source.split('/* ===== BEGIN src/cherrift_v0554.js ===== */')[1].split('/* ===== END src/cherrift_v0554.js ===== */')[0];
function between(s,a,b){assert.ok(s.includes(a)&&s.includes(b));return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));}
const attacks=between(legacy,'const oldAutoFire = proto.autoFire;','const oldUpdateBullets = proto.updateBullets;');
const helpers=between(legacy,'function rotate(x,y,angle)','function healFromDamage(');
const melee=between(hybrid,'function dirFromVector(dx,dy)','const oldDrawPlayer=proto.drawPlayer;');

function fixture(patched=true,vfx=false){
  const config={player:{displayWidth:116,displayHeight:116,skins:{}}};
  class Game{
    autoFire(){this.delegated='fire'} skill(){this.delegated='skill'} drawPlayer(){this.delegated='draw'}
    drawBullet(){this.delegated='bullet'} drawEffect(){this.delegated='effect'}
    movePlayer(v,dt){this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}
    update(dt){if(this.mode!=='playing')return;const p=this.player;p.fireTimer-=dt;p.skillTimer=Math.max(0,p.skillTimer-dt);p.skillCastTimer=Math.max(0,p.skillCastTimer-dt);this.movePlayer(this.input.getMoveVector(),dt);}
    nearest(){return this.enemies.find(e=>!e.dead)}
    activeSkinConfig(){return config.player.skins[this.player.skin]}
    damageEnemy(e,n){e.hp-=n}
  }
  const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
  const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,Math:Object.assign(Object.create(Math),{random:()=>.25})});
  const ninja=between(legacy,'  ninja_cherry: {','  succubus_cherry: {');
  config.player.skins=vm.runInContext('({'+ninja+'})',context);
  Object.assign(config.player.skins.ninja_cherry,{hybridAttack:true,meleeRange:132,meleeDamageMult:1.25,attackMovementMode:'mobile',attackMoveSpeedMultiplier:.68});
  vm.runInContext('(()=>{const proto=CherriftGame.prototype;'+helpers+attacks+'})();',context);
  vm.runInContext('(()=>{const proto=CherriftGame.prototype;'+melee+'})();',context);
  const before=JSON.parse(JSON.stringify(config.player.skins.ninja_cherry));
  if(patched)vm.runInContext(readFileSync('src/cherrift_ninja_chibi.js','utf8'),context);
  if(vfx)vm.runInContext(readFileSync('src/cherrift_ninja_shadow_sakura.js','utf8'),context);
  const game=new Game();
  Object.assign(game,{mode:'playing',t:0,bullets:[],effects:[],enemies:[{x:500,y:500,r:16,hp:500}],
    input:{getMoveVector:()=>({x:0,y:0})},
    player:{skin:'ninja_cherry',x:0,y:0,speed:235,moving:false,lastDir:'down',damage:20,
      ninjaMeleeRange:132,fireInterval:.42,fireTimer:0,skillTimer:0,skillCooldown:8,skillCastTimer:0,skillBuff:0}});
  const calls=[];game.assets={get:key=>({key,width:key.includes('_skill_')?1536:1152,height:192})};
  const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){calls.push(args)}};
  return {game,config,before,ctx,calls,context};
}
const snapshot=g=>JSON.parse(JSON.stringify({bullets:g.bullets,effects:g.effects,enemies:g.enemies,
  fireTimer:g.player.fireTimer,skillTimer:g.player.skillTimer,skillBuff:g.player.skillBuff,ninjaSpeedBuff:g.player.ninjaSpeedBuff}));

test('new configuration preserves Ninja gameplay and all 64 strips have correct dimensions',()=>{
  const {config,before}=fixture();const skin=config.player.skins.ninja_cherry;
  for(const [k,v] of Object.entries(before))if(k!=='states')assert.deepEqual(skin[k],v,k);
  assert.equal(skin.states.skill.duration,before.states.skill.duration);
  let files=0;
  for(const [name,state] of Object.entries(skin.states)){
    assert.equal(Object.keys(state.dirs).length,8);assert.equal(state.frames,name==='skill'?8:6);
    for(const src of Object.values(state.dirs)){
      const p=src.split('?')[0];assert.ok(existsSync(p),p);const png=readFileSync(p);
      assert.equal(png.readUInt32BE(16),state.frames*192);assert.equal(png.readUInt32BE(20),192);files++;
    }
  }
  assert.equal(files,64);
});
test('ranged standing and moving attacks keep the original two stars, damage, poison, spread and cooldown',()=>{
  for(const moving of [false,true]){
    const a=fixture(false).game,b=fixture().game;a.player.moving=b.player.moving=moving;
    a.autoFire();b.autoFire();assert.deepEqual(snapshot(b),snapshot(a));assert.equal(b.bullets.length,2);
    assert.equal(b.player.ninjaChibiAttack.kind,'ranged');assert.equal(b.player.ninjaChibiAttack.dir,'down_right');
    b.autoFire();assert.equal(b.bullets.length,2);
  }
});
test('close katana keeps original cone damage and poison and emits no ranged projectile',()=>{
  const a=fixture(false).game,b=fixture().game;
  for(const g of [a,b])g.enemies=[{x:100,y:0,r:16,hp:100},{x:-80,y:0,r:16,hp:100}];
  a.autoFire();b.autoFire();assert.deepEqual(snapshot(b),snapshot(a));
  assert.equal(b.enemies[0].hp,75);assert.equal(b.enemies[1].hp,100);
  assert.equal(b.enemies[0].poisonDamageV0553,1);assert.equal(b.bullets.length,0);
  assert.equal(b.player.ninjaChibiAttack.kind,'melee');
});
test('skill keeps all 12 radial real stars, damage, poison, cast duration, buff and cooldown without duplication',()=>{
  const a=fixture(false).game,b=fixture().game;a.skill();b.skill();
  assert.deepEqual(snapshot(b),snapshot(a));assert.equal(b.bullets.length,12);
  assert.equal(b.player.ninjaSpeedBuff,3);assert.equal(b.player.skillTimer,8);assert.equal(b.player.skillCastDuration,.42);
  assert.ok(b.bullets.every(p=>Math.abs(Math.hypot(p.vx,p.vy)-650)<1e-8&&p.dmg===21&&p.poisonRate===.05));
  for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]])assert.ok(b.bullets.some(p=>p.vx*sx>1&&p.vy*sy>1));
  b.skill();assert.equal(b.bullets.length,12);assert.equal(b.player.ninjaSpeedBuff,3);
});
test('speed buff still moves at exactly 1.35x and restores original speed after update',()=>{
  const a=fixture(false).game,b=fixture().game;
  for(const g of [a,b]){g.input.getMoveVector=()=>({x:1,y:0});g.skill();g.update(.1);}
  assert.equal(b.player.x,a.player.x);assert.ok(Math.abs(b.player.x-235*1.35*.1)<1e-8);
  assert.equal(b.player.speed,235);assert.equal(b.player.ninjaSpeedBuff,2.9);
});
test('renderer selects both moving attacks, idle2, eight directions and all eight skill frames without old mirror',()=>{
  const {game,ctx,calls}=fixture();const p=game.player;
  p.moving=true;game.movePlayer({x:-1,y:1},0);game.autoFire();game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith('walk_attack_ranged_down_right'));assert.equal(p.ninjaChibiFacing,'down_left');
  p.moving=false;game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.includes('_attack_ranged_'));
  p.fireTimer=0;game.enemies[0].x=100;game.enemies[0].y=0;p.moving=true;game.autoFire();game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith('walk_attack_melee_right'));
  p.moving=false;p.ninjaChibiAttack=null;p.ninjaChibiIdle=6.1;game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.includes('_idle2_'));
  game.input.getMoveVector=()=>({x:1,y:-1});game.skill();game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith('skill_up_right'));assert.equal(calls.at(-1)[1],0);
  p.skillCastTimer=.001;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],7*192);
  game.mode='paused';p.ninjaChibiAttack={elapsed:.1,duration:.3};game.update(.1);assert.equal(p.ninjaChibiAttack.elapsed,.1);
});
test('other skins delegate and duplicate module initialization does not wrap attacks twice',()=>{
  const {game,ctx,context}=fixture();vm.runInContext(readFileSync('src/cherrift_ninja_chibi.js','utf8'),context);
  game.autoFire();assert.equal(game.bullets.length,2);
  game.player.skin='fairy_cherry';game.autoFire();assert.equal(game.delegated,'fire');
  game.skill();assert.equal(game.delegated,'skill');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');
});
test('browser module load order and shared build ID satisfy the repository validation rule',()=>{
  const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('src/cherrift_manifest.json','utf8'));
  assert.ok(html.indexOf('src/cherrift_ninja_chibi.js')>html.indexOf('src/cherrift_base_cherry.js'));
  const versions=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);
  assert.ok(versions.length);assert.equal(new Set(versions).size,1);assert.equal(versions[0],manifest.buildId);
});

function canvasFixture(f) {
  const events=[],stack=[];
  const c=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
    drawImage(...args){events.push({key:args[0].key,x:args[5],alpha:this.globalAlpha});},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},
    {get:(o,k)=>k in o?o[k]:()=>{}});
  return {c,events};
}
test('Shadow Sakura preserves real ranged/melee/skill damage, poison and cooldowns',()=>{
  for(const mode of ['ranged','melee','skill']){
    const a=fixture().game,b=fixture(true,true).game;
    if(mode==='melee')for(const g of [a,b]){g.enemies=[{x:60,y:0,r:16,hp:500},{x:80,y:0,r:16,hp:500}];}
    for(const g of [a,b])mode==='skill'?g.skill():g.autoFire();
    const combat=g=>{const s=snapshot(g);delete s.effects;return s;};
    assert.deepEqual(combat(b),combat(a),mode);
    if(mode==='melee'){assert.equal(b.effects.filter(e=>e.type==='ninjaShadowSlash').length,1);assert(!b.effects.some(e=>e.type==='ninja_melee_arc'));}
    if(mode==='skill'){assert.equal(b.effects.filter(e=>e.type==='ninjaShadowStorm').length,1);assert.equal(b.bullets.length,12);b.skill();assert.equal(b.bullets.length,12);}
  }
});
test('Shadow Sakura footsteps need real travel, ghost budget is bounded and pause freezes rendering',()=>{
  const f=fixture(true,true),g=f.game,{c,events}=canvasFixture(f);g.player.moving=true;g.input.getMoveVector=()=>({x:1,y:0});
  for(let i=0;i<20;i++)g.update(.1);
  g.drawPlayer(c,g.player);assert.equal(events.length,3,'two echoes plus the actual sprite');assert.equal(events.at(-1).alpha,1);
  g.mode='paused';const before=events.map(e=>e.alpha);g.update(2);events.length=0;g.drawPlayer(c,g.player);assert.deepEqual(events.map(e=>e.alpha),before);
  g.mode='playing';g.input.getMoveVector=()=>({x:0,y:0});g.update(.3);events.length=0;g.drawPlayer(c,g.player);assert.equal(events.length,1,'no travel emits no echoes');
  g.save={settings:{effectQuality:'low'}};g.input.getMoveVector=()=>({x:1,y:0});for(let i=0;i<4;i++)g.update(.1);events.length=0;g.drawPlayer(c,g.player);assert.equal(events.length,2,'low quality has at most one echo');
  assert.equal(c.globalAlpha,1);
});
test('Shadow Sakura renderers delegate unrelated effects and initialize only once',()=>{
  const f=fixture(true,true),g=f.game,{c}=canvasFixture(f);
  g.drawBullet(c,{style:'mage_orb'});assert.equal(g.delegated,'bullet');g.drawEffect(c,{type:'death'});assert.equal(g.delegated,'effect');
  for(const type of ['ninjaShadowSlash','ninjaShadowStorm','poison_hit'])g.drawEffect(c,{type,x:0,y:0,t:.1,life:.3,angle:0});
  g.drawBullet(c,{style:'ninja_shuriken',x:0,y:0,vx:1,vy:0,spin:.3,life:1});assert.equal(c.globalAlpha,1);
  const before=g.skill;vm.runInContext(readFileSync('src/cherrift_ninja_shadow_sakura.js','utf8'),f.context);assert.equal(g.skill,before);
  const html=readFileSync('index.html','utf8');assert(html.indexOf('src/cherrift_ninja_shadow_sakura.js')>html.indexOf('src/cherrift_ninja_chibi.js'));
});
test('Shadow Sakura uses the generated alpha atlas when decoded, with in-bounds source regions',()=>{
  const f=fixture(),g=f.game;
  f.context.Image=class{constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}};
  vm.runInContext(readFileSync('src/cherrift_ninja_shadow_sakura.js','utf8'),f.context);
  const {c}=canvasFixture(f),samples=[];c.drawImage=(...args)=>samples.push(args);
  g.drawBullet(c,{style:'ninja_shuriken',x:0,y:0,vx:1,vy:0,spin:0,life:1});
  g.drawEffect(c,{type:'poison_hit',x:0,y:0,t:.1,life:.3});
  assert(samples.length>=3);
  for(const [img,x,y,w,h] of samples){assert.equal(img.naturalWidth,1254);assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1254&&y+h<=1254);}
  const png=readFileSync('assets/effects/ninja_shadow_sakura/shadow_sakura_atlas.png');
  assert.equal(png.readUInt32BE(16),1254);assert.equal(png.readUInt32BE(20),1254);assert.equal(png[25],6,'PNG uses RGBA');
});
