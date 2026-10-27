import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('src/cherrift_app.js','utf8');
const patch=readFileSync('src/cherrift_archer_chibi.js','utf8');
function between(s,a,b){assert.ok(s.includes(a)&&s.includes(b));return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));}
const legacy=source.split('/* ===== BEGIN src/cherrift_v087.js ===== */')[1]?.split('/* ===== END src/cherrift_v087.js ===== */')[0];
assert.ok(legacy,'authoritative Archer combat module exists');
const setup=between(legacy,'function state(folder, name, frames, fps, duration)','const skinData =');
const helpers=between(legacy,'function direction(dx, dy)','const previousAutoFire = proto.autoFire;');
const combat=between(legacy,'const previousAutoFire = proto.autoFire;','const previousUpdateBullets = proto.updateBullets;');
const start=between(legacy,'const previousStart = proto.start;','function direction(dx, dy)');
const stability=source.split('/* ===== BEGIN src/cherrift_v092.js ===== */')[1].split('/* ===== END src/cherrift_v092.js ===== */')[0];
const mobile=between(stability,'  const previousMovePlayer = prototype.movePlayer;','  const previousDrawPlayer = prototype.drawPlayer;');

function fixture(patched=true){
  const config={player:{displayWidth:116,displayHeight:116,skins:{}}};
  class Game{
    async start(){return true} autoFire(){this.delegated='fire'} skill(){this.delegated='skill'} drawPlayer(){this.delegated='draw'}
    movePlayer(v,dt){const p=this.player;p.x+=v.x*p.speed*dt;p.y+=v.y*p.speed*dt;p.moving=Math.hypot(v.x,v.y)>.04;}
    update(dt){if(this.mode!=='playing')return;const p=this.player;p.fireTimer=Math.max(0,p.fireTimer-dt);p.skillTimer=Math.max(0,p.skillTimer-dt);p.skillCastTimer=Math.max(0,p.skillCastTimer-dt);p.attackCastTimer=Math.max(0,p.attackCastTimer-dt);this.movePlayer(this.input.getMoveVector(),dt);this.t+=dt;}
    activeSkinConfig(){return config.player.skins[this.player.skin]}
  }
  const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
  const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,Math:Object.assign(Object.create(Math),{random:()=>.25})});
  vm.runInContext('(()=>{const DIRECTIONS=["down","up","left","right"];'+setup+'})();',context);
  Object.assign(config.player.skins.archer_cherry,{attackMovementMode:'mobile',attackMoveSpeedMultiplier:.68,attackCancelDeadzone:.08});
  vm.runInContext('(()=>{const proto=CherriftGame.prototype;const SKINS=["mage_cherry","archer_cherry"];const DIRECTIONS=["down","up","left","right"];'+helpers+combat+start+'})();',context);
  vm.runInContext('(()=>{const prototype=CherriftGame.prototype;'+mobile+'})();',context);
  const before=JSON.parse(JSON.stringify(config.player.skins.archer_cherry));
  if(patched)vm.runInContext(patch,context);
  const game=new Game();Object.assign(game,{mode:'playing',t:0,bullets:[],effects:[],enemies:[{x:300,y:300,r:16,hp:500}],input:{getMoveVector:()=>({x:0,y:0})},
    player:{skin:'archer_cherry',x:0,y:0,speed:235,damage:20,crit:.1,moving:false,lastDir:'down',fireTimer:0,fireInterval:.65,bulletSpeed:500,skillTimer:0,skillCooldown:8,skillCastTimer:0,attackCastTimer:0,skillBuff:0}});
  const calls=[];game.assets={get:key=>({key,width:1152,height:192}),loadImage:async()=>true};
  const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){calls.push(args)}};
  return {game,config,before,ctx,calls,context};
}
const snapshot=g=>JSON.parse(JSON.stringify({bullets:g.bullets,effects:g.effects,fireTimer:g.player.fireTimer,attackCastTimer:g.player.attackCastTimer,
  skillTimer:g.player.skillTimer,skillCastTimer:g.player.skillCastTimer,attackDir:g.player.attackDir,skillDir:g.player.skillDir,lastDir:g.player.lastDir,
  x:g.player.x,y:g.player.y,speed:g.player.speed,crit:g.player.crit}));

test('all 48 new strips exist and configuration preserves existing Archer gameplay',()=>{
  const {config,before}=fixture(),skin=config.player.skins.archer_cherry;
  for(const [k,v] of Object.entries(before))if(k!=='states')assert.deepEqual(skin[k],v,k);
  assert.equal(skin.states.attack.duration,before.states.attack.duration);assert.equal(skin.states.skill.duration,before.states.skill.duration);
  let count=0;
  for(const [name,state] of Object.entries(skin.states)){
    assert.equal(state.frames,6);assert.equal(Object.keys(state.dirs).length,8);
    for(const path of Object.values(state.dirs)){
      const file=path.split('?')[0];assert.ok(existsSync(file),file);const png=readFileSync(file);
      assert.equal(png.readUInt32BE(16),1152);assert.equal(png.readUInt32BE(20),192);count++;
    }
  }
  assert.equal(count,48);
});
test('standing and moving basic attacks keep the original single arrow and cannot duplicate on cooldown',()=>{
  for(const moving of [false,true]){
    const a=fixture(false).game,b=fixture().game;a.player.moving=b.player.moving=moving;
    a.autoFire();b.autoFire();assert.deepEqual(snapshot(b),snapshot(a));assert.equal(b.bullets.length,1);
    assert.equal(b.bullets[0].dmg,20);assert.equal(b.player.archerChibiAttack.dir,'down_right');
    b.autoFire();assert.equal(b.bullets.length,1);
  }
});
test('dead and out-of-range enemies cannot cause a false attack animation; nearest valid target wins',()=>{
  const {game}=fixture();game.enemies=[{x:10,y:0,dead:true},{x:1000,y:0}];game.autoFire();assert.equal(game.bullets.length,0);assert.equal(game.player.archerChibiAttack,undefined);
  game.enemies.push({x:-100,y:-100},{x:400,y:0});game.autoFire();assert.equal(game.bullets.length,1);assert.equal(game.player.archerChibiAttack.dir,'up_left');
});
test('Four Arrow Shot keeps exactly four arrows, spread, damage, speed, effects and cooldown with/without a target',()=>{
  for(const enemies of [[{x:-300,y:300}],[]]){
    const a=fixture(false).game,b=fixture().game;
    a.enemies=structuredClone(enemies);b.enemies=structuredClone(enemies);a.skill();b.skill();
    assert.deepEqual(snapshot(b),snapshot(a));assert.equal(b.bullets.length,4);
    assert.deepEqual(Array.from(b.bullets,p=>p.phase),[-.27,-.09,.09,.27]);
    assert.ok(b.bullets.every(p=>Math.abs(Math.hypot(p.vx,p.vy)-540)<1e-8&&p.dmg===18.400000000000002));
    assert.equal(b.player.skillTimer,8);assert.equal(b.player.skillCastDuration,.4);
    b.skill();assert.equal(b.bullets.length,4);
  }
});
test('crit passive remains +10% and attack movement preserves the existing 0.68 speed multiplier',async()=>{
  const a=fixture(false).game,b=fixture().game;await a.start();await b.start();
  assert.equal(a.player.crit,.2);assert.equal(b.player.crit,.2);
  for(const g of [a,b]){g.autoFire();g.input.getMoveVector=()=>({x:1,y:0});g.movePlayer({x:1,y:0},.1);}
  assert.deepEqual(snapshot(b),snapshot(a));assert.ok(Math.abs(b.player.x-235*.68*.1)<1e-8);assert.equal(b.player.speed,235);
});
test('standing/moving sprite swaps share one clock and never restart or duplicate an arrow',()=>{
  const {game,ctx,calls}=fixture(),p=game.player;game.autoFire();game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith('_attack_down_right'));assert.equal(calls.at(-1)[1],0);
  game.input.getMoveVector=()=>({x:-1,y:1});game.update(.2);game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith('_walk_attack_down_right'));assert.equal(calls.at(-1)[1],3*192);
  game.input.getMoveVector=()=>({x:0,y:0});game.update(.19);game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],5*192);assert.equal(game.bullets.length,1);
  game.update(.02);assert.equal(p.archerChibiAttack,null);
});
test('all eight idle facings, idle2, skill first/last frames and missing-frame fallback render safely',()=>{
  const {game,ctx,calls}=fixture(),p=game.player;
  for(const [x,y,dir] of [[1,0,'right'],[1,1,'down_right'],[0,1,'down'],[-1,1,'down_left'],[-1,0,'left'],[-1,-1,'up_left'],[0,-1,'up'],[1,-1,'up_right']]){
    game.movePlayer({x,y},0);p.moving=false;game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.endsWith('_idle_'+dir));
  }
  p.archerChibiIdle=6.1;game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.includes('_idle2_'));
  game.skill();game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.endsWith('_skill_down_right'));assert.equal(calls.at(-1)[1],0);
  p.skillCastTimer=.001;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],5*192);
  game.assets.get=key=>key.includes('_idle_')?{key,width:1152,height:192}:null;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],0);
});
test('pause, other skins and duplicate module load remain safe',()=>{
  const {game,ctx,context}=fixture();vm.runInContext(patch,context);game.autoFire();assert.equal(game.bullets.length,1);
  game.mode='paused';game.update(.1);assert.equal(game.player.archerChibiAttack.elapsed,0);
  game.player.skin='fairy_cherry';game.autoFire();assert.equal(game.delegated,'fire');game.skill();assert.equal(game.delegated,'skill');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');
});
test('new module loads after Ninja, before DOMContentLoaded boot and uses the shared build query',()=>{
  const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('src/cherrift_manifest.json','utf8'));
  assert.ok(html.indexOf('src/cherrift_archer_chibi.js')>html.indexOf('src/cherrift_ninja_chibi.js'));
  const versions=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);
  assert.equal(new Set(versions).size,1);assert.equal(versions[0],manifest.buildId);
});
