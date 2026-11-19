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
 const unexpectedWarp=()=>{throw Error("Unexpected frame deformation");};
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_KIMONO_GAIT:{draw:unexpectedWarp},CHERRIFT_ANIMATION_SMOOTHING:{draw:unexpectedWarp}};
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
test('moving cast fires once at its event, faces the target and keeps the stride phase separate from the shot clock',()=>{
 const {game,ctx,calls}=fixture();const p=game.player;p.moving=true;game.movePlayer({x:-1,y:1},.01);game.autoFire();game.update(.1);assert.equal(game.bullets.length,0);game.update(.06);assert.equal(game.bullets.length,1);assert.equal(p.kimonoFacing,'down_left');assert.equal(p.attackDir,'up_right');
 game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],0);assert.match(calls.at(-1)[0].key,/walk_attack_up_right$/);p.moving=false;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],2*192);assert.match(calls.at(-1)[0].key,/attack_up_right$/);
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

test('the runtime registers authored strips and renders every whole gait frame in every direction',()=>{
 const {game,config,ctx,calls}=fixture();
 const dirs=['right','down_right','down','down_left','left','up_left','up','up_right'];
 const {states}=config.player.skins.kimono_cherry;
 const p=game.player;
 p.moving=true;
 for(const [index,dir] of dirs.entries()){
  const aim=dirs[(index+4)%8];
  p.kimonoFacing=dir;
  p.attackDir=aim;
  for(const state of ['walk','walk_attack']){
   const shooting=state==='walk_attack';
   const facing=shooting?aim:dir;
   p.kimonoAttack=shooting?{elapsed:.16,duration:1/3}:null;
   assert.match(states[state].dirs[facing],new RegExp(`kimono_cherry_${state}_${facing}\\.png\\?`));
   for(let step=0;step<7;step++){
    p.kimonoStride=step/8;
    game.drawPlayer(ctx,p);
    const [image,...source]=calls.at(-1);
    assert.equal(image.key,`player_kimono_cherry_${state}_${facing}`);
    assert.deepEqual(source.slice(0,4),[(step%6)*192,0,192,192]);
   }
  }
 }
 const html=read('index.html');
 assert.match(html,/src\/cherrift_kimono_cherry\.js/);
 assert.doesNotMatch(html,/src\/cherrift_kimono_(data|gait)\.js/);
});

test('moving enemy changes the aim until release and the same gait continues after the attack',()=>{
 const {game,ctx,calls}=fixture();
 const p=game.player,target=game.enemies[0];
 p.moving=true;
 game.movePlayer({x:1,y:0},.25);
 game.autoFire();
 target.x=p.x-100;
 target.y=p.y;
 game.update(.16);
 assert.equal(p.attackDir,'left');
 assert.equal(game.bullets[0].vx,-p.bulletSpeed);
 game.drawPlayer(ctx,p);
 assert.match(calls.at(-1)[0].key,/walk_attack_left$/);
 assert.equal(calls.at(-1)[1],2*192);
 game.update(.18);
 game.drawPlayer(ctx,p);
 assert.match(calls.at(-1)[0].key,/walk_right$/);
 assert.equal(calls.at(-1)[1],2*192);
});
