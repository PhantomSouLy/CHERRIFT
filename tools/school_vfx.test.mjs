import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8');
function fixture(){
 const config={worldSize:4000,player:{skins:{school_uniform_cherry:{skillType:'common_pink_burst',burstRadius:185,burstDamageMult:2.4,knockbackDistance:112,states:{skill:{duration:6/16}},passive:{attackBonus:.01,hpBonus:.01}}}}};
 class Game{drawGround(){}skill(){this.delegated=true;}drawEffect(){this.delegatedEffect=true;}drawPlayer(){this.playerDrawn=true;}activeSkinConfig(){return config.player.skins[this.player.skin];}damageEnemy(e,d){e.hp-=d;}}
 class Assets{async loadAll(){return 42;}async loadImage(k,p){this.loaded={k,p};return true;}}
 const context=vm.createContext({window:{CherriftGame:Game},CherriftGame:Game,ImageAssets:Assets,CHERRIFT_CONFIG:config,prototype:Game.prototype,COMMON:{school_uniform_cherry:{archetype:'hybrid'}},previousSkill:Game.prototype.skill,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),vectorFromDirection:()=>({x:0,y:1})});
 const app=read('src/cherrift_app.js'),start=app.indexOf('  prototype.skill = function skillV091'),end=app.indexOf('\n  };',start)+5;vm.runInContext(app.slice(start,end),context);vm.runInContext(read('src/cherrift_school_vfx.js'),context);
 const game=new Game();Object.assign(game,{player:{skin:'school_uniform_cherry',x:0,y:0,skillTimer:0,skillCooldown:8,damage:20,lastDir:'down',hp:40},enemies:[{x:100,y:0,hp:100}],effects:[],assets:{get:()=>({width:1536,height:1024})},save:{settings:{}},t:0});
 const calls=[],strokes=[],stack=[];const c={globalAlpha:.6,imageSmoothingEnabled:false,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(){},rotate(){},beginPath(){},arc(...a){this.circle=a;},stroke(){strokes.push({circle:this.circle,alpha:this.globalAlpha,width:this.lineWidth});},drawImage(...a){calls.push(a);}};return{game,c,calls,strokes,Assets};
}
test('School burst uses real Common AoE once, preserves buff/cooldown and tags only newly emitted visuals',()=>{
 const{game}=fixture();const old={type:'commonHybridBurstV091',life:.48};game.effects.push(old);game.skill();const tagged=game.effects.filter(e=>e.schoolPinkBurst);assert.equal(tagged.length,1);assert.equal(tagged[0].life,.72);assert.equal(tagged[0].r,185);assert.equal(old.schoolPinkBurst,undefined);assert.equal(game.enemies[0].hp,52);assert.ok(game.enemies[0].x>100);assert.equal(game.player.skillTimer,8);assert.equal(game.player.commonSpeedBuffTimer,1);assert.equal(game.player.commonSpeedBuffRate,.05);game.skill();assert.equal(game.effects.filter(e=>e.schoolPinkBurst).length,1);assert.equal(game.enemies[0].hp,52);
});
test('the effect pass draws the whole burst at the cast origin, including the bright Low wave',()=>{
 const{game,c,calls,strokes}=fixture();
 game.skill();
 const e=game.effects.find(e=>e.schoolPinkBurst);
 e.t=.15;
 game.player.x=400;
 game.drawEffect(c,e);
 assert.equal(calls.length,16);
 assert.equal(c.globalAlpha,.6);
 assert.equal(game.delegatedEffect,undefined);
 calls.length=0;
 strokes.length=0;
 game.save.settings.effectQuality='low';
 game.drawEffect(c,e);
 assert.equal(calls.length,9);
 assert.deepEqual(strokes.map(s=>s.width),[9,3]);
 assert.deepEqual(strokes[0].circle.slice(0,2),[e.x,e.y]);
 assert.ok(strokes[0].alpha>.85);
 game.assets.get=()=>null;
 game.drawEffect(c,e);
 assert.equal(game.delegatedEffect,true);
});
test('other bursts delegate, and atlas is preloaded once through normal asset load',async()=>{
 const{game,c,Assets}=fixture();game.drawEffect(c,{type:'commonHybridBurstV091'});assert.equal(game.delegatedEffect,true);const a=new Assets();assert.equal(await a.loadAll(),42);assert.equal(a.loaded.k,'schoolPinkBurstAtlas');assert.match(a.loaded.p,/pink_burst_atlas.png/);
});
