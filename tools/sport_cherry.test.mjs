import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(){
 const config={player:{displayWidth:116,displayHeight:116,skins:{sport_cherry:{skillType:'common_shield',passive:{hpBonus:.02}},cherry_default:{sentinel:true}}}};
 class Game{
  movePlayer(v,dt){if(!this.blocked){this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}}
  autoFire(){this.delegated='fire';} skill(){this.delegated='skill';}
  activeSkinConfig(){return config.player.skins[this.player.skin];}
  update(dt){if(this.mode!=='playing')return;const p=this.player;p.fireTimer-=dt;p.skillCastTimer=Math.max(0,p.skillCastTimer-dt);}
  nearest(){return this.enemies.find(e=>!e.dead);}drawPlayer(){this.delegated='draw';}
 }
 const window={CherriftGame:Game,CHERRIFT_CONFIG:config};
 const scope={window,CherriftGame:Game,CHERRIFT_CONFIG:config,prototype:Game.prototype,COMMON:{sport_cherry:{archetype:'defensive'}},previousSkill:Game.prototype.skill};
 const context=vm.createContext(scope);
 // Exercise the real existing Common skill implementation, not a second copy.
 const app=read('src/cherrift_app.js');const start=app.indexOf('  prototype.skill = function skillV091');const end=app.indexOf('\n  };',start)+5;
 vm.runInContext(app.slice(start,end),context);
 vm.runInContext(read('src/cherrift_sport_cherry.js'),context);
 const game=new Game();Object.assign(game,{mode:'playing',t:0,effects:[],bullets:[],enemies:[{x:100,y:-100}],player:{skin:'sport_cherry',x:0,y:0,speed:235,moving:false,lastDir:'down',sportFacing:'down',fireTimer:0,fireInterval:.42,skillTimer:0,skillCooldown:8,skillCastTimer:0,damage:20,bulletSpeed:560,hp:40,maxHp:100}});
 const calls=[];game.assets={get:key=>({key,width:1152,height:192})};
 const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push(a);}};
 return{game,config,ctx,calls};
}
test('48 real sheets are wired in eight directions without altering Base config or Sport passive',()=>{
 const {config}=fixture();assert.equal(config.player.skins.cherry_default.sentinel,true);
 const c=config.player.skins.sport_cherry;assert.equal(c.skillType,'common_shield');assert.equal(c.passive.hpBonus,.02);
 let count=0;for(const s of Object.values(c.states)){assert.equal(s.frames,6);assert.equal(Object.keys(s.dirs).length,8);for(const u of Object.values(s.dirs)){const p=u.split('?')[0];assert.ok(existsSync(p));const b=readFileSync(p);assert.equal(b.readUInt32BE(16),1152);assert.equal(b.readUInt32BE(20),192);count++;}}assert.equal(count,48);
});
test('moving cast fires once at its event, keeps travel facing and keeps an independent travel clock while switching moving/standing artwork',()=>{
 const {game,ctx,calls}=fixture();const p=game.player;p.moving=true;game.movePlayer({x:-1,y:1},.01);game.autoFire();game.update(.1);assert.equal(game.bullets.length,0);game.update(.06);assert.equal(game.bullets.length,1);assert.equal(p.sportFacing,'down_left');assert.equal(p.attackDir,'up_right');
 p.sportStride=3/8;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],3*192);assert.match(calls.at(-1)[0].key,/walk_attack_up_right$/);
 const elapsed=p.sportAttack.elapsed;p.moving=false;game.drawPlayer(ctx,p);assert.equal(p.sportAttack.elapsed,elapsed);assert.equal(calls.at(-1)[1],2*192);assert.match(calls.at(-1)[0].key,/attack_up_right$/);
 game.autoFire();game.update(.1);assert.equal(game.bullets.length,1);assert.equal(game.bullets[0].style,'sport_bloom_v1');assert.equal(game.bullets[0].dmg,20);assert.equal(game.bullets[0].r,8);
});
test('real Common Shield heals 10%, caps HP, grants 2s shield, keeps cooldown, cancels pending shot and does not dash',()=>{
 const {game}=fixture(),p=game.player;game.autoFire();p.sportFacing='up_left';game.skill();assert.equal(p.hp,50);assert.equal(p.commonShieldTimer,2);assert.equal(p.invuln,2);assert.equal(p.skillTimer,8);assert.equal(p.skillDir,'up_left');assert.equal(p.sportAttack,null);assert.equal(p.dashTimer,undefined);game.update(.2);assert.equal(game.bullets.length,0);game.skill();assert.equal(p.hp,50);
 const b=fixture().game;b.player.hp=98;b.skill();assert.equal(b.player.hp,100);
});
test('walking phase follows actual travel, remains stable at walls and cast switches, pauses safely',()=>{
 const {game}=fixture(),p=game.player;game.movePlayer({x:1,y:0},.25);assert.equal(p.sportStride,.25);game.blocked=true;game.movePlayer({x:1,y:0},.3);assert.equal(p.sportStride,.25);game.autoFire();assert.equal(p.sportStride,.25);game.mode='paused';const e=p.sportAttack.elapsed;game.update(.4);assert.equal(p.sportAttack.elapsed,e);
});
test('dead targets emit no projectile and other skins delegate',()=>{
 const {game,ctx}=fixture();game.autoFire();game.enemies[0].dead=true;game.update(.2);assert.equal(game.bullets.length,0);game.player.skin='other';game.autoFire();assert.equal(game.delegated,'fire');game.drawPlayer(ctx,game.player);assert.equal(game.delegated,'draw');game.skill();assert.equal(game.delegated,'skill');
});
test('only real state sheets load; the inverse-warp module is retired from boot',()=>{
 const {config}=fixture();for(const [state,c] of Object.entries(config.player.skins.sport_cherry.states))for(const [dir,url] of Object.entries(c.dirs))assert.match(url,new RegExp('sport_cherry_'+state+'_'+dir+'\\.png\\?'));
 const html=read('index.html');for(const n of ['sport_data','sport_cherry','sport_vfx']){assert.equal(html.split(`src/cherrift_${n}.js`).length-1,1);assert.ok(html.indexOf(`src/cherrift_${n}.js`)>html.indexOf('src/cherrift_animation_smoothing.js'));}
 assert.ok(!html.includes('src/cherrift_sport_gait.js'));assert.ok(!Object.values(JSON.parse(read('src/cherrift_manifest.json')).entrypoints).includes('src/cherrift_sport_gait.js'));
});
test('Walk and WalkAttack advance through all six full poses independently of cast timing',()=>{
 const {game,ctx,calls}=fixture(),p=game.player;p.moving=true;
 for(const d of ['down','down_right','right','up_right','up','up_left','left','down_left']){
  p.sportFacing=p.attackDir=d;
  for(const attacking of [false,true])for(let i=0;i<12;i++){
   p.sportStride=(i+.2)/8;p.sportAttack=attacking?{elapsed:.01,duration:6/18}:null;
   game.drawPlayer(ctx,p);const a=calls.at(-1);assert.match(a[0].key,new RegExp((attacking?'walk_attack':'walk')+'_'+d+'$'));assert.equal(a[1],i%6*192);assert.deepEqual(a.slice(2,5),[0,192,192]);
  }
 }
});
