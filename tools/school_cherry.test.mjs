import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(){
 const config={worldSize:4000,player:{displayWidth:116,displayHeight:116,skins:{school_uniform_cherry:{skillType:'common_pink_burst',passive:{attackBonus:.01,hpBonus:.01},burstRadius:185,burstDamageMult:2.4,knockbackDistance:112},cherry_default:{sentinel:true}}}};
 class Game{
  movePlayer(v,dt){if(!this.blocked){this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}}
  autoFire(){this.delegated='fire';} skill(){this.delegated='skill';}
  damageEnemy(e,d){e.hp=(e.hp||100)-d;}
  activeSkinConfig(){return config.player.skins[this.player.skin];}
  update(dt){if(this.mode!=='playing')return;const p=this.player;p.fireTimer-=dt;p.skillCastTimer=Math.max(0,p.skillCastTimer-dt);}
  nearest(){return this.enemies.find(e=>!e.dead);}drawPlayer(){this.delegated='draw';}
 }
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
 const scope={window,CherriftGame:Game,CHERRIFT_CONFIG:config,prototype:Game.prototype,COMMON:{school_uniform_cherry:{archetype:'hybrid'}},previousSkill:Game.prototype.skill,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),vectorFromDirection:()=>({x:0,y:1})};
 const context=vm.createContext(scope);
 // Exercise the real existing Common skill implementation, not a second copy.
 const app=read('src/cherrift_app.js');const start=app.indexOf('  prototype.skill = function skillV091');const end=app.indexOf('\n  };',start)+5;
 vm.runInContext(app.slice(start,end),context);
 vm.runInContext(read('src/cherrift_school_cherry.js'),context);
 const game=new Game();Object.assign(game,{mode:'playing',t:0,effects:[],bullets:[],enemies:[{x:100,y:-100}],player:{skin:'school_uniform_cherry',x:0,y:0,speed:235,moving:false,lastDir:'down',schoolFacing:'down',fireTimer:0,fireInterval:.42,skillTimer:0,skillCooldown:8,skillCastTimer:0,damage:20,bulletSpeed:560,hp:40,maxHp:100}});
 const calls=[];game.assets={get:key=>({key,width:1152,height:192})};
 const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push(a);}};
 return{game,config,ctx,calls};
}
test('48 real sheets are wired in eight directions without altering Base config or School passive',()=>{
 const {config}=fixture();assert.equal(config.player.skins.cherry_default.sentinel,true);
 const c=config.player.skins.school_uniform_cherry;assert.equal(c.skillType,'common_pink_burst');assert.equal(c.passive.hpBonus,.01);
 let count=0;for(const s of Object.values(c.states)){assert.equal(s.frames,6);assert.equal(Object.keys(s.dirs).length,8);for(const u of Object.values(s.dirs)){const p=u.split('?')[0];assert.ok(existsSync(p));const b=readFileSync(p);assert.equal(b.readUInt32BE(16),1152);assert.equal(b.readUInt32BE(20),192);count++;}}assert.equal(count,48);
});
test('moving cast fires once at its event, keeps travel facing and keeps the step clock separate from the standing attack',()=>{
 const {game,ctx,calls}=fixture();const p=game.player;p.moving=true;game.movePlayer({x:-1,y:1},.01);game.autoFire();game.update(.1);assert.equal(game.bullets.length,0);game.update(.06);assert.equal(game.bullets.length,1);assert.equal(p.schoolFacing,'down_left');assert.equal(p.attackDir,'up_right');
 game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],0);assert.match(calls.at(-1)[0].key,/walk_attack_down_left$/);p.moving=false;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],2*192);assert.match(calls.at(-1)[0].key,/attack_up_right$/);
 game.autoFire();game.update(.1);assert.equal(game.bullets.length,1);assert.equal(game.bullets[0].style,'common_attack_v091');assert.equal(game.bullets[0].dmg,20);assert.equal(game.bullets[0].r,8);
});
test('real Pink Burst preserves damage, knockback, 5% speed for 1s and cooldown; cancels the pending shot',()=>{
 const {game}=fixture(),p=game.player,e=game.enemies[0];e.hp=100;game.autoFire();p.schoolFacing='up_left';game.skill();
 assert.equal(e.hp,52);assert.ok(Math.hypot(e.x,e.y)>Math.hypot(100,100));assert.equal(p.commonSpeedBuffRate,.05);assert.equal(p.commonSpeedBuffTimer,1);assert.equal(p.skillTimer,8);assert.equal(p.skillDir,'up_left');assert.equal(p.schoolAttack,null);assert.equal(p.hp,40);assert.equal(p.dashTimer,undefined);game.update(.2);assert.equal(game.bullets.length,0);game.skill();assert.equal(e.hp,52);
});
test('walking phase follows actual travel, remains stable at walls and cast switches, pauses safely',()=>{
 const {game}=fixture(),p=game.player;game.movePlayer({x:1,y:0},.25);assert.equal(p.schoolStride,.25);game.blocked=true;game.movePlayer({x:1,y:0},.3);assert.equal(p.schoolStride,.25);game.autoFire();assert.equal(p.schoolStride,.25);game.mode='paused';const e=p.schoolAttack.elapsed;game.update(.4);assert.equal(p.schoolAttack.elapsed,e);
});
test('dead targets emit no projectile and other skins delegate',()=>{
 const {game,ctx}=fixture();game.autoFire();game.enemies[0].dead=true;game.update(.2);assert.equal(game.bullets.length,0);game.player.skin='other';game.autoFire();assert.equal(game.delegated,'fire');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');game.skill();assert.equal(game.delegated,'skill');
});
test('School loads its distinct authored states and the old School warp is absent from boot',()=>{
 const {config}=fixture();
 for(const [state,value] of Object.entries(config.player.skins.school_uniform_cherry.states)){
  for(const [dir,url] of Object.entries(value.dirs))assert.ok(url.includes(`school_uniform_cherry_${state}_${dir}.png?`));
 }
 const html=read('index.html');
 assert.ok(!html.includes('src/cherrift_school_gait.js'));
 for(const name of ['school_data','school_cherry','school_vfx']){
  assert.equal(html.split(`src/cherrift_${name}.js`).length-1,1);
 }
 const context=vm.createContext({window:{}});
 vm.runInContext(read('src/cherrift_school_data.js'),context);
 assert.equal(context.window.CHERRIFT_ANIMATION_FLOW,undefined);
 assert.equal(Object.keys(context.window.CHERRIFT_CHERRY_GEOMETRY.school_uniform_cherry).length,6);
});

test('all moving directions sample six whole cells using travel even when a shot targets behind',()=>{
 const {game,ctx,calls}=fixture();
 const p=game.player;
 p.moving=true;
 p.attackDir='up';
 for(const dir of ['right','down_right','down','down_left','left','up_left','up','up_right']){
  p.schoolFacing=dir;
  for(const attack of [false,true]){
   p.schoolAttack=attack?{elapsed:.2,duration:1/3}:null;
   const state=attack?'walk_attack':'walk';
   for(let step=0;step<7;step++){
    p.schoolStride=step/8;
    const before=calls.length;
    game.drawPlayer(ctx,p);
    assert.equal(calls.length,before+1);
    const [image,...source]=calls.at(-1);
    assert.equal(image.key,`player_school_uniform_cherry_${state}_${dir}`);
    assert.deepEqual(source.slice(0,4),[(step%6)*192,0,192,192]);
   }
  }
 }
});
