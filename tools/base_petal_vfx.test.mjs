import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fixture(quality='high') {
  class Game {
    movePlayer(v,dt){this.player.x+=v.x*dt;this.player.y+=v.y*dt;}
    autoFire(){}
    nearest(){return this.enemies.find(e=>!e.dead);}
    skill(){const p=this.player;if(p.skillTimer>0)return;p.skillTimer=8;p.dashTimer=.34;p.skillCastDuration=6/14;p.skillCastTimer=6/14;}
    update(dt){if(this.mode!=='playing')return;const p=this.player;
      this.effects.forEach(e=>e.t+=dt);this.effects=this.effects.filter(e=>e.t<e.life);
      if(p.dashTimer>0)this.movePlayer(p.dashDir,760*dt);else if(p.moving&&!this.wall)this.movePlayer({x:1,y:0},235*dt);
      p.dashTimer=Math.max(0,(p.dashTimer||0)-dt);p.skillCastTimer=Math.max(0,(p.skillCastTimer||0)-dt);p.fireTimer-=dt;
    }
    drawPlayer(c,p){c.drawImage(p);}
    drawBullet(){this.delegated='bullet';}
    drawEffect(){this.delegated='effect';}
    damageEnemy(e,dmg){e.hp-=dmg;if(e.hp<=0)e.dead=true;}
  }
  // Exercise the actual shipped collision method, including hit selection.
  const app=read('src/cherrift_app.js'),from=app.indexOf('  updateBullets(dt) {'),to=app.indexOf('\n  damageEnemy(',from);
  const collision=vm.runInNewContext(`({${app.slice(from,to)}}).updateBullets`);
  Game.prototype.updateBullets=collision;
  const config={player:{skins:{cherry_default:{states:{}}}}};
  class AssetLoader {async loadAll(){this.originalReady=true;}async loadImage(key,src){this.loaded={key,src};return true;}}
  const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
  const context=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,ImageAssets:AssetLoader});
  for(const file of ['src/cherrift_base_cherry.js','src/cherrift_base_petal_vfx.js'])vm.runInContext(read(file),context);
  const g=new Game();Object.assign(g,{mode:'playing',t:0,effects:[],bullets:[],enemies:[{x:100,y:0,hp:100,r:20}],save:{settings:{effectQuality:quality}},
    input:{getMoveVector:()=>({x:1,y:0})},player:{skin:'cherry_default',x:0,y:0,moving:false,skillTimer:0,skillCastTimer:0,fireTimer:0,fireInterval:.42,damage:20,bulletSpeed:560,crit:0}});
  const drawn=[],textures=[],stack=[];const c={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},drawImage(p,...args){if(p.isAtlas)textures.push({args,alpha:this.globalAlpha});else drawn.push({...p,alpha:this.globalAlpha});},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}};
  for(const name of ['translate','rotate','beginPath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fill','stroke','arc','ellipse'])c[name]=()=>{};
  g.assets={get:key=>key==='basePetalTraceAtlas'?{width:1536,height:1024,isAtlas:true}:{width:1152,height:192}};
  window.CHERRIFT_CHERRY_MOTION={draw:(ctx,image,id,state,dir,frame,p)=>ctx.drawImage(p)};
  return {g,window,c,drawn,textures,context,AssetLoader};
}
test('one timed Petal Trace shot uses the unchanged projectile stats and actual collision damage',()=>{
  const {g}=fixture();g.autoFire();g.update(.14);assert.equal(g.bullets.length,1);
  const b=g.bullets[0];assert.equal(b.style,'base_petal_trace');assert.equal(b.r,8);assert.equal(b.life,1.45);assert.equal(b.dmg,20);assert.equal(Math.hypot(b.vx,b.vy),560);
  assert.equal(g.effects.filter(e=>e.type==='basePetalCast').length,1);
  g.updateBullets(.16);assert.equal(g.enemies[0].hp,80);assert.equal(g.bullets.length,0);
  assert.equal(g.effects.filter(e=>e.type==='basePetalHit').length,1);assert(!g.effects.some(e=>e.type==='hit'));
  g.updateBullets(.01);assert.equal(g.enemies[0].hp,80);
});
test('other projectile styles retain their legacy impact',()=>{
  const {g}=fixture();g.bullets.push({x:100,y:0,vx:0,vy:0,r:8,life:1,dmg:7,style:'common_attack_v091'});
  g.updateBullets(.01);assert.equal(g.enemies[0].hp,93);assert.equal(g.effects[0].type,'hit');assert(g.effects[0].imgKey);
});
test('dash echoes stay bounded, behind Cherry, freeze on pause, and expire after dash',()=>{
  for(const quality of ['high','low']){
    const {g,c,drawn}=fixture(quality);g.skill();assert.equal(g.player.dashTimer,.34);assert.equal(g.player.skillTimer,8);
    g.skill();assert.equal(g.effects.filter(e=>e.type==='basePetalDashMark').length,1);
    for(let i=0;i<3;i++){g.update(.07);g.drawPlayer(c,g.player);}
    drawn.length=0;g.drawPlayer(c,g.player);assert.equal(drawn.length,quality==='low'?2:3);
    assert.equal(drawn.at(-1).x,g.player.x);assert.equal(drawn.at(-1).alpha,1);assert(drawn.slice(0,-1).every(p=>p.x<g.player.x&&p.alpha<.25));
    const before=drawn.map(p=>p.alpha);g.mode='paused';g.update(2);drawn.length=0;g.drawPlayer(c,g.player);assert.deepEqual(drawn.map(p=>p.alpha),before);
    g.mode='playing';g.update(.14);assert(g.effects.some(e=>e.type==='basePetalDashMark'&&e.end));g.update(.3);
    drawn.length=0;g.drawPlayer(c,g.player);assert.equal(drawn.length,1);
  }
});
test('foot dust needs real travel and stops at walls; state resets with a new player',()=>{
  const {g,c,drawn}=fixture();g.player.moving=true;g.update(.17);assert.equal(g.effects.filter(e=>e.type==='basePetalDust').length,1);
  g.wall=true;g.update(.3);assert.equal(g.effects.length,0);g.player.moving=false;g.update(.2);assert.equal(g.effects.length,0);
  g.wall=false;g.skill();g.update(.14);g.player={...g.player,dashTimer:0,skillCastTimer:0};g.drawPlayer(c,g.player);assert.equal(drawn.length,1);
});
test('all VFX render safely, restore alpha, and delegate unrelated skins and effects',()=>{
  const {g,c,context}=fixture();for(const type of ['basePetalCast','basePetalHit','basePetalDust','basePetalDashMark'])g.drawEffect(c,{type,x:1,y:2,t:.05,life:.2,foot:1});
  g.drawBullet(c,{style:'base_petal_trace',x:0,y:0,vx:1,vy:0,life:1});assert.equal(c.globalAlpha,1);
  g.drawEffect(c,{type:'death'});assert.equal(g.delegated,'effect');g.drawBullet(c,{style:'mage_orb'});assert.equal(g.delegated,'bullet');
  const before=g.drawPlayer;vm.runInContext(read('src/cherrift_base_petal_vfx.js'),context);assert.equal(g.drawPlayer,before);
});

test('imagegen artwork participates in asset readiness and all six texture regions render',async()=>{
  const {g,c,textures,AssetLoader}=fixture();const loader=new AssetLoader();await loader.loadAll();
  assert(loader.originalReady);assert.equal(loader.loaded.key,'basePetalTraceAtlas');assert.match(loader.loaded.src,/petal_trace_atlas\.png/);
  g.drawBullet(c,{style:'base_petal_trace',x:0,y:0,vx:1,vy:0,life:1});
  for(const type of ['basePetalHit','basePetalCast','basePetalDust','basePetalDashMark'])g.drawEffect(c,{type,x:0,y:0,t:.05,life:.2,foot:1});
  const regions=new Set(textures.map(t=>`${t.args[0]},${t.args[1]}`));assert.equal(regions.size,6);
  for(const t of textures){const [x,y,w,h]=t.args;assert(x>=0&&y>=0&&x+w<=1536&&y+h<=1024);}
  const png=readFileSync(new URL('../assets/effects/base_petal_trace/petal_trace_atlas.png',import.meta.url));assert.equal(png[25],6,'generated PNG is RGBA');
});
