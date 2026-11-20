import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync,existsSync}from'node:fs';const read=p=>readFileSync(p,'utf8');
function fixture(){const skins={pajama_cherry:{skillType:'common_shield',passive:{hpBonus:.02}},sport_cherry:{skillType:'common_shield',states:{skill:{duration:6/16}}},cherry_default:{sentinel:true}},config={worldSize:4000,player:{skins,displayWidth:116,displayHeight:116}};
class Game{movePlayer(v,dt){if(!this.blocked){this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}}autoFire(){this.delegatedFire=true;}skill(){}drawPlayer(){this.delegatedDraw=true;}drawGround(){}drawEffect(){}nearest(){return this.enemies.find(x=>!x.dead);}activeSkinConfig(){return skins[this.player.skin];}update(dt){if(this.mode!=='playing')return;this.t+=dt;this.player.fireTimer-=dt;this.player.skillCastTimer=Math.max(0,this.player.skillCastTimer-dt);}}
const shared=[],draws=[],window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_SPORT_VFX:{shield(g,c,p){shared.push(p.commonShieldTimer);}},CHERRIFT_ANIMATION_SMOOTHING:{draw(){throw new Error("Pajama should draw whole cells");}}},c=vm.createContext({window,CherriftGame:Game,CHERRIFT_CONFIG:config,prototype:Game.prototype,previousSkill:Game.prototype.skill,COMMON:{pajama_cherry:{archetype:'defensive'},sport_cherry:{archetype:'defensive'}}});
const app=read('src/cherrift_app.js'),start=app.indexOf('  prototype.skill = function skillV091'),end=app.indexOf('\n  };',start)+5;assert.ok(start>=0);vm.runInContext(app.slice(start,end),c);for(const n of ['pajama_cherry','common_skill_vfx'])vm.runInContext(read(`src/cherrift_${n}.js`),c);
const game=new Game();Object.assign(game,{mode:'playing',t:0,player:{skin:'pajama_cherry',x:0,y:0,speed:200,hp:40,maxHp:100,skillTimer:0,skillCastTimer:0,skillCooldown:8,fireTimer:0,fireInterval:.6,damage:20,bulletSpeed:700,lastDir:'down',moving:true},enemies:[{x:100,y:0}],effects:[],bullets:[],assets:{get:k=>({width:1152,height:192,key:k})},save:{settings:{}}});const stack=[],ctx={globalAlpha:.5,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},beginPath(){},ellipse(){},fill(){},drawImage(image,sx){draws.push({key:image.key,frame:sx/192});}};return{game,config,window,draws,shared,ctx};}
test('48 eight-direction sheets exist and Base/passive/Shield stay intact',()=>{const{config}=fixture();assert.equal(config.player.skins.cherry_default.sentinel,true);const p=config.player.skins.pajama_cherry;assert.equal(p.passive.hpBonus,.02);assert.equal(p.skillType,'common_shield');assert.equal(Object.keys(p.states).length,6);for(const s of Object.values(p.states)){assert.equal(Object.keys(s.dirs).length,8);for(const u of Object.values(s.dirs))assert.ok(existsSync(u.split('?')[0]),u);}});
test('actual Common Shield heals 10%, caps HP, protects for 2 seconds and rejects repeats',()=>{for(const id of ['pajama_cherry','sport_cherry']){const{game}=fixture();game.player.skin=id;game.skill();assert.equal(game.player.hp,50);assert.equal(game.player.commonShieldTimer,2);assert.equal(game.player.invuln,2);assert.equal(game.player.skillTimer,8);assert.equal(game.effects.filter(e=>e.sportShield).length,1);game.skill();assert.equal(game.player.hp,50);}const{game}=fixture();game.player.hp=98;game.skill();assert.equal(game.player.hp,100);});
test('one defensive projectile fires at the cast event while movement continues',()=>{const{game}=fixture();game.autoFire();game.autoFire();game.movePlayer({x:1,y:0},.1);game.update(.1);assert.equal(game.player.x,20);assert.equal(game.bullets.length,0);game.update(.05);assert.equal(game.bullets.length,1);assert.equal(game.bullets[0].archetype,'defensive');game.update(.1);assert.equal(game.bullets.length,1);game.update(.2);assert.equal(game.player.pajamaAttack,null);});
test('Shield cancels pending shots and dead targets receive no projectile',()=>{const a=fixture().game;a.autoFire();a.skill();a.update(.3);assert.equal(a.bullets.length,0);const b=fixture().game;b.autoFire();b.enemies[0].dead=true;b.update(.2);assert.equal(b.bullets.length,0);});
test('travel clock pauses at walls and persists through attacks',()=>{const{game,ctx,draws}=fixture();game.movePlayer({x:-1,y:0},.1);game.drawPlayer(ctx,game.player);assert.match(draws.at(-1).key,/_walk_left$/);const frame=draws.at(-1).frame;game.blocked=true;game.movePlayer({x:-1,y:0},.5);game.t=99;game.drawPlayer(ctx,game.player);assert.equal(draws.at(-1).frame,frame);const stride=game.player.pajamaStride;game.autoFire();assert.equal(game.player.pajamaStride,stride);game.update(.1);game.drawPlayer(ctx,game.player);assert.match(draws.at(-1).key,/_walk_attack_right$/);assert.equal(draws.at(-1).frame,frame);});
test('shared Sport shield draws after Pajama and restores alpha/timer',()=>{const{game,ctx,draws,shared}=fixture();game.skill();game.drawPlayer(ctx,game.player);assert.match(draws.at(-1).key,/_skill_down$/);assert.deepEqual(shared,[2]);assert.equal(game.player.commonShieldTimer,2);assert.equal(ctx.globalAlpha,.5);});
test('missing walk strip uses the first standing pose and other skins delegate',()=>{
  const{game,ctx,draws}=fixture();
  game.player.pajamaStride=.5;
  game.assets.get=k=>k.includes('_idle_')?{key:k}:null;
  game.drawPlayer(ctx,game.player);
  assert.match(draws.at(-1).key,/_idle_down$/);
  assert.equal(draws.at(-1).frame,0);
  assert.equal(ctx.globalAlpha,.5);
  game.player.skin='cherry_default';
  game.autoFire();
  game.drawPlayer(ctx,game.player);
  assert.ok(game.delegatedFire&&game.delegatedDraw);
});
test('every direction advances six full cells during walk and walk attack',()=>{
  const{game,ctx,draws,window}=fixture(),p=game.player;
  for(const direction of window.CHERRIFT_PAJAMA_CHERRY.directions){
    for(const state of ['walk','walk_attack']){
      p.pajamaAttack=state==='walk'?null:{elapsed:0,duration:1};
      p.pajamaFacing=p.attackDir=direction;
      for(let i=0;i<=6;i++){
        p.pajamaStride=(i+.01)/8;
        game.drawPlayer(ctx,p);
        assert.equal(draws.at(-1).key,`player_pajama_cherry_${state}_${direction}`);
        assert.equal(draws.at(-1).frame,i%6);
      }
    }
  }
});
test('moving attack looks toward the enemy at release, then walk resumes its direction',()=>{
  const{game,ctx,draws}=fixture();
  game.movePlayer({x:1,y:0},.1);
  game.autoFire();
  Object.assign(game.enemies[0],{x:20,y:-100});
  game.update(.15);
  game.drawPlayer(ctx,game.player);
  assert.match(draws.at(-1).key,/_walk_attack_up$/);
  assert.ok(game.bullets[0].vy<0);
  game.update(.2);
  game.drawPlayer(ctx,game.player);
  assert.match(draws.at(-1).key,/_walk_right$/);
});
test('Pajama uses whole cells and loads before the shared Shield hook',()=>{
  const h=read('index.html');
  assert.ok(!h.includes('cherrift_pajama_data.js'));
  assert.ok(h.indexOf('cherrift_pajama_cherry.js')<h.indexOf('cherrift_common_skill_vfx.js'));
  assert.equal(h.split('cherrift_pajama_cherry.js').length,2);
});
