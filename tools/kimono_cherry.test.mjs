import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(){
 const config={worldSize:4000,player:{displayWidth:116,displayHeight:116,skins:{kimono_cherry:{skillType:'common_heal',passive:{movementBonus:.01,hpRecovery:.01},burstRadius:185,burstDamageMult:2.4,knockbackDistance:112},cherry_default:{sentinel:true}}}};
 class Game{
  movePlayer(v,dt){if(!this.blocked){this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}}
  autoFire(){this.delegated='fire';} skill(){this.delegated='skill';}
  damageEnemy(e,d){e.hp=(e.hp||100)-d;}
  activeSkinConfig(){return config.player.skins[this.player.skin];}
  update(dt){if(this.mode!=='playing')return;const p=this.player;p.fireTimer-=dt;p.skillCastTimer=Math.max(0,p.skillCastTimer-dt);}
  nearest(){return this.enemies.find(e=>!e.dead);}drawPlayer(){this.delegated='draw';}
 }
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
 const scope={window,CherriftGame:Game,CHERRIFT_CONFIG:config,prototype:Game.prototype,COMMON:{kimono_cherry:{archetype:'support'}},previousSkill:Game.prototype.skill,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),vectorFromDirection:()=>({x:0,y:1})};
 const context=vm.createContext(scope);
 // Exercise the real existing Common skill implementation, not a second copy.
 const app=read('src/cherrift_app.js');const start=app.indexOf('  prototype.skill = function skillV091');const end=app.indexOf('\n  };',start)+5;
 vm.runInContext(app.slice(start,end),context);
 vm.runInContext(read('src/cherrift_kimono_cherry.js'),context);
 const game=new Game();Object.assign(game,{mode:'playing',t:0,effects:[],bullets:[],enemies:[{x:100,y:-100}],player:{skin:'kimono_cherry',x:0,y:0,speed:235,moving:false,lastDir:'down',kimonoFacing:'down',fireTimer:0,fireInterval:.42,skillTimer:0,skillCooldown:8,skillCastTimer:0,damage:20,bulletSpeed:560,hp:40,maxHp:100}});
 const calls=[];game.assets={get:key=>({key,width:1152,height:192})};
 const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push(a);}};
 return{game,config,ctx,calls};
}
test('48 real sheets are wired in eight directions without altering Base config or Kimono passive',()=>{
 const {config}=fixture();assert.equal(config.player.skins.cherry_default.sentinel,true);
 const c=config.player.skins.kimono_cherry;assert.equal(c.skillType,'common_heal');assert.equal(c.passive.movementBonus,.01);
 let count=0;for(const s of Object.values(c.states)){assert.equal(s.frames,6);assert.equal(Object.keys(s.dirs).length,8);for(const u of Object.values(s.dirs)){const p=u.split('?')[0];assert.ok(existsSync(p));const b=readFileSync(p);assert.equal(b.readUInt32BE(16),1152);assert.equal(b.readUInt32BE(20),192);count++;}}assert.equal(count,48);
});
test('moving cast fires once at its event, keeps travel facing and shares standing/moving attack clock',()=>{
 const {game,ctx,calls}=fixture();const p=game.player;p.moving=true;game.movePlayer({x:-1,y:1},.01);game.autoFire();game.update(.1);assert.equal(game.bullets.length,0);game.update(.06);assert.equal(game.bullets.length,1);assert.equal(p.kimonoFacing,'down_left');assert.equal(p.attackDir,'up_right');
 game.drawPlayer(ctx,p);const x=calls.at(-1)[1];assert.match(calls.at(-1)[0].key,/walk_attack_up_right$/);p.moving=false;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],x);assert.match(calls.at(-1)[0].key,/attack_up_right$/);
 game.autoFire();game.update(.1);assert.equal(game.bullets.length,1);assert.equal(game.bullets[0].style,'common_attack_v091');assert.equal(game.bullets[0].dmg,20);assert.equal(game.bullets[0].r,8);
});
test('real Common Healing restores 40% HP and 2-second speed buff, preserves cooldown, cancels the pending shot',()=>{
 const{game}=fixture(),p=game.player;game.autoFire();p.kimonoFacing='up_left';game.skill();assert.equal(p.hp,80);assert.equal(p.commonSpeedBuffRate,.05);assert.equal(p.commonSpeedBuffTimer,2);assert.equal(p.skillTimer,8);assert.equal(p.skillDir,'up_left');assert.equal(p.kimonoAttack,null);assert.equal(p.dashTimer,undefined);game.update(.2);assert.equal(game.bullets.length,0);game.skill();assert.equal(p.hp,80);
});
test('walking phase follows actual travel, remains stable at walls and cast switches, pauses safely',()=>{
 const {game}=fixture(),p=game.player;game.movePlayer({x:1,y:0},.25);assert.equal(p.kimonoStride,.25);game.blocked=true;game.movePlayer({x:1,y:0},.3);assert.equal(p.kimonoStride,.25);game.autoFire();assert.equal(p.kimonoStride,.25);game.mode='paused';const e=p.kimonoAttack.elapsed;game.update(.4);assert.equal(p.kimonoAttack.elapsed,e);
});
test('dead targets emit no projectile and other skins delegate',()=>{
 const {game,ctx}=fixture();game.autoFire();game.enemies[0].dead=true;game.update(.2);assert.equal(game.bullets.length,0);game.player.skin='other';game.autoFire();assert.equal(game.delegated,'fire');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');game.skill();assert.equal(game.delegated,'skill');
});
test('all 30 motion textures exist and Kimono modules load after smoothing and Base without duplicate scripts',()=>{
 const context=vm.createContext({window:{}});vm.runInContext(read('src/cherrift_kimono_data.js'),context);const entries=Object.entries(context.window.CHERRIFT_ANIMATION_FLOW);assert.equal(entries.length,30);for(const [k,m]of entries){assert.ok(k.startsWith('kimono_cherry/'));assert.ok(existsSync('assets/player/animation_flow/'+m.file));}
 const html=read('index.html');for(const n of ['kimono_data','kimono_gait','kimono_cherry']){assert.equal(html.split(`src/cherrift_${n}.js`).length-1,1);assert.ok(html.indexOf(`src/cherrift_${n}.js`)>html.indexOf('src/cherrift_animation_smoothing.js'));}
});
test('Kimono whole-pose gait closes the cycle and keeps attack/foot clocks independent',()=>{
 const context=vm.createContext({window:{}});vm.runInContext(read('src/cherrift_walk_cycle.js'),context);vm.runInContext(read('src/cherrift_sport_data.js'),context);vm.runInContext(read('src/cherrift_sport_gait.js'),context);vm.runInContext(read('src/cherrift_kimono_data.js'),context);vm.runInContext(read('src/cherrift_kimono_gait.js'),context);
 const api=context.window.CHERRIFT_KIMONO_GAIT;
 for(const d of ['down','down_right','right','up_right','up','up_left','left','down_left']){
  const a=api.pose('walk',d,0,0),b=api.pose('walk',d,6,6);
  for(let i=0;i<4;i++)assert.ok(Math.abs(a.stride[i]-b.stride[i])<1e-10);
  assert.deepEqual(Array.from(api.pose('walk_attack',d,0,1.4).stride),Array.from(api.pose('walk_attack',d,4,1.4).stride));
 }
});

test('Kimono extends only its own step branch and preserves Sport poses',()=>{
 const c=vm.createContext({window:{}});for(const f of ['walk_cycle','sport_data','sport_gait'])vm.runInContext(read(`src/cherrift_${f}.js`),c);
 const before=c.window.CHERRIFT_WALK_CYCLE,pose=before.pose('sport_cherry','walk','right',0,1,0,2);
 for(const f of ['kimono_data','kimono_gait'])vm.runInContext(read(`src/cherrift_${f}.js`),c);
 assert.ok(c.window.CHERRIFT_WALK_CYCLE.shader.includes('kimonoFootDisplacement'));assert.ok(c.window.CHERRIFT_WALK_CYCLE.shader.includes('kimonoPreviousUnstep'));assert.deepEqual(pose,c.window.CHERRIFT_WALK_CYCLE.pose('sport_cherry','walk','right',0,1,0,2));
 for(const dir of ['left','right']){const a=c.window.CHERRIFT_WALK_CYCLE.pose('kimono_cherry','walk',dir,0,1,0,0),b=c.window.CHERRIFT_WALK_CYCLE.pose('kimono_cherry','walk',dir,0,1,0,3.6);assert.ok(a.radius<-100);assert.notDeepEqual(a.a,b.a);assert.equal(a.frame,0);assert.equal(b.frame,3);}
});

test('Kimono corrected feet move as complete soles and invert without toe fragments',()=>{
 const c=vm.createContext({window:{}});for(const f of ['walk_cycle','sport_data','sport_gait','kimono_data','kimono_gait'])vm.runInContext(read(`src/cherrift_${f}.js`),c);
 const cycle=c.window.CHERRIFT_WALK_CYCLE,api=c.window.CHERRIFT_KIMONO_GAIT,out=[];
 for(const dir of ['right','left','up_right','up_left'])for(const state of ['walk','walk_attack'])for(let phase=0;phase<6;phase++)for(let step=0;step<24;step++){
  const p=api.pose(state,dir,phase,step/4);
  for(const [bone,index] of [[p.a,0],[p.b,2]]){
   const x=bone[2],y=bone[3];cycle.displacement(x,y,p,out);assert.ok(Math.abs(out[0]-p.stride[index])<.002);assert.ok(Math.abs(out[1]-p.stride[index+1])<.002);
   const tx=x+out[0],ty=y+out[1];cycle.inverse(tx,ty,p,out);assert.ok(Math.hypot(out[0]-x,out[1]-y)<.05);
  }
 }
});

test('side Walk omits the late high lift and preserves the travel-driven loop',()=>{
 const c=vm.createContext({window:{}});for(const f of ['walk_cycle','sport_data','sport_gait','kimono_data','kimono_gait'])vm.runInContext(read(`src/cherrift_${f}.js`),c);
 const api=c.window.CHERRIFT_KIMONO_GAIT;
 for(const dir of ['right','left']){
  const seen=new Set();
  for(let i=0;i<600;i++){
   const p=api.pose('walk',dir,0,i/100);seen.add(p.frame);
   assert.notEqual(p.frame,4,'the high-lift frame must never be drawn');
   assert.notEqual(p.next,4,'the high-lift frame must never be a transition target');
   assert.deepEqual(Array.from(p.stride),[0,0,0,0]);
  }
  assert.deepEqual([...seen],[0,1,2,3,5]);
  assert.equal(api.pose('walk',dir,0,5.999).frame,5);
  assert.equal(api.pose('walk',dir,0,6).frame,0);
 }
 // Exercise the real draw entry point with a frozen idle/body clock.
 const calls=[];let requested;
 c.window.CHERRIFT_ANIMATION_SMOOTHING={draw(...args){calls.push(args[5]);return true;}};
 const game={assets:{get(key){requested=key;return {};}}};
 for(const dir of ['left','right']){
  api.draw(game,{},'walk',dir,0,0,{x:0,y:0},116,116);
  api.draw(game,{},'walk',dir,0,3.6,{x:0,y:0},116,116);
  assert.equal(requested,`player_kimono_cherry_walk_${dir}`);
 }
 assert.deepEqual(calls,[0,3,0,3]);
});
