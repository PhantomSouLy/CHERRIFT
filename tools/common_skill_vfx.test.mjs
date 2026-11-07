import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(id='kimono_cherry'){
 const ids={kimono_cherry:['support','common_heal'],another_common_healer:['support','common_heal'],sport_cherry:['defensive','common_shield'],pajama_cherry:['defensive','common_shield'],school_uniform_cherry:['hybrid','common_pink_burst'],cake_deliver_cherry:['hybrid','common_pink_burst']};
 const skins=Object.fromEntries(Object.entries(ids).map(([id,[archetype,skillType]])=>[id,{skillType,archetype,states:{skill:{duration:6/16}},burstRadius:185,burstDamageMult:2.4,knockbackDistance:112}]));const config={worldSize:4000,player:{skins}};
 class Game{skill(){this.delegated=true;}drawGround(){}drawEffect(){this.delegatedEffect=true;}drawPlayer(_c,p){this.timerDuringDraw=p.commonShieldTimer;if(this.failDraw)throw Error('draw failed');}activeSkinConfig(){return skins[this.player.skin];}damageEnemy(e,d){e.hp-=d;}}
 class Assets{async loadAll(){return 42;}async loadImage(k,p){this.loaded={k,p};return true;}}
 const sharedShieldCalls=[];const window={CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_SPORT_VFX:{shield(_g,_c,p){sharedShieldCalls.push(p.commonShieldTimer);}}};
 const context=vm.createContext({window,CherriftGame:Game,ImageAssets:Assets,CHERRIFT_CONFIG:config,prototype:Game.prototype,COMMON:Object.fromEntries(Object.entries(ids).map(([id,[archetype]])=>[id,{archetype}])),previousSkill:Game.prototype.skill,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),vectorFromDirection:()=>({x:0,y:1})});
 const app=read('src/cherrift_app.js'),start=app.indexOf('  prototype.skill = function skillV091'),end=app.indexOf('\n  };',start)+5;vm.runInContext(app.slice(start,end),context);vm.runInContext(read('src/cherrift_school_vfx.js'),context);vm.runInContext(read('src/cherrift_common_skill_vfx.js'),context);
 const game=new Game();Object.assign(game,{player:{skin:id,x:0,y:0,skillTimer:0,skillCooldown:8,damage:20,lastDir:'down',hp:40,maxHp:100},enemies:[{x:100,y:0,hp:100}],effects:[],assets:{get:()=>({width:1536,height:1024})},save:{settings:{}},t:0});
 const calls=[],stack=[];const c={globalAlpha:.6,imageSmoothingEnabled:false,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(){},rotate(){},drawImage(...a){calls.push(a);}};return{game,c,calls,Assets,sharedShieldCalls};
}
test('the actual Common healer restores 40% max HP, caps HP, keeps cooldown and +5% speed for 2 seconds for every healer',()=>{
 for(const id of ['kimono_cherry','another_common_healer']){
  const{game}=fixture(id);game.skill();assert.equal(game.player.hp,80);assert.equal(game.player.skillTimer,8);assert.equal(game.player.commonSpeedBuffRate,.05);assert.equal(game.player.commonSpeedBuffTimer,2);assert.equal(game.enemies[0].hp,100);const e=game.effects.find(e=>e.commonHealing);assert.ok(e);assert.equal(e.healTarget,game.player);assert.equal(e.life,.95);game.skill();assert.equal(game.effects.filter(e=>e.commonHealing).length,1);assert.equal(game.player.hp,80);
  const b=fixture(id).game;b.player.hp=98;b.skill();assert.equal(b.player.hp,100);
 }
});
test('Sport and Pajama keep identical existing shield mechanics and share the accepted shield visual',()=>{
 for(const id of ['sport_cherry','pajama_cherry']){
  const{game,c,sharedShieldCalls}=fixture(id);game.skill();assert.equal(game.player.hp,50);assert.equal(game.player.commonShieldTimer,2);assert.equal(game.player.invuln,2);assert.equal(game.effects.filter(e=>e.sportShield).length,1);game.drawPlayer(c,game.player);assert.equal(game.player.commonShieldTimer,2);if(id==='pajama_cherry'){assert.equal(game.timerDuringDraw,0);assert.deepEqual(sharedShieldCalls,[2]);game.failDraw=true;assert.throws(()=>game.drawPlayer(c,game.player));assert.equal(game.player.commonShieldTimer,2);}else assert.equal(sharedShieldCalls.length,0);
 }
});
test('School and Cake keep the original Hybrid AoE and receive the same Pink Burst tags',()=>{
 for(const id of ['school_uniform_cherry','cake_deliver_cherry']){
  const{game,c,calls}=fixture(id);game.skill();const burst=game.effects.find(e=>e.schoolPinkBurst);burst.t=.15;game.drawGround(c);game.drawEffect(c,burst);assert.ok(calls.length>=15);assert.equal(game.enemies[0].hp,52);assert.ok(game.enemies[0].x>100);assert.equal(game.player.commonSpeedBuffRate,.05);assert.equal(game.player.commonSpeedBuffTimer,1);assert.equal(game.effects.filter(e=>e.schoolPinkBurst).length,1);assert.equal(game.effects.find(e=>e.schoolPinkBurst).life,.72);
 }
});
test('Healing renders from actual atlas, follows the healed player, reduces layers on low and falls back when missing',()=>{
 const{game,c,calls}=fixture();game.skill();const e=game.effects.find(e=>e.commonHealing);e.t=.2;game.player.x=120;game.drawGround(c);game.drawEffect(c,e);assert.ok(calls.length>=12);assert.equal(c.globalAlpha,.6);calls.length=0;game.save.settings.effectQuality='low';game.drawGround(c);game.drawEffect(c,e);assert.equal(calls.length,3);game.assets.get=()=>null;game.drawEffect(c,e);assert.equal(game.delegatedEffect,true);
});
test('other effects delegate and the common Healing atlas preloads through normal assets',async()=>{
 const{game,c,Assets}=fixture();game.drawEffect(c,{type:'other'});assert.equal(game.delegatedEffect,true);const a=new Assets();assert.equal(await a.loadAll(),42);assert.equal(a.loaded.k,'commonHealingAtlas');assert.match(a.loaded.p,/common_healing\/healing_atlas.png/);
});
