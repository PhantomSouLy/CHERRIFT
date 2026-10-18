import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

function setup() {
  class Game {
    autoFire() { this.delegated = "autoFire"; }
    skill() { this.delegated = "skill"; }
    update(dt) {
      if (this.mode !== "playing") return;
      this.player.skillCastTimer = Math.max(0,this.player.skillCastTimer-dt);
      this.player.attackCastTimer = Math.max(0,this.player.attackCastTimer-dt);
    }
    updateBullets() { this.standardUpdates++; }
    drawPlayer() { this.delegated = "drawPlayer"; }
    drawBullet() { this.delegated = "drawBullet"; }
    nearest(range) { return this.enemies.find(e => !e.dead && Math.hypot(e.x-this.player.x,e.y-this.player.y)<=range); }
    damageEnemy(enemy,damage) { enemy.hp-=damage; if (enemy.hp<=0) enemy.dead=true; }
  }
  const window = {CherriftGame:Game};
  const config = {player:{skins:{},displayWidth:116}};
  const data = {skins:[]};
  vm.runInNewContext(readFileSync("src/cherrift_gunner.js","utf8"),{
    window,CherriftGame:Game,CHERRIFT_CONFIG:config,CHERRIFT_DATA:data
  });
  const game = new Game();
  Object.assign(game,{mode:"playing",t:0,bullets:[],effects:[],standardUpdates:0,
    enemies:[{x:300,y:0,r:12,hp:1000}],
    player:{skin:"gunner_cherry",x:0,y:0,hp:100,moving:true,lastDir:"left",
      damage:20,bulletSpeed:560,fireInterval:.42,fireTimer:0,skillTimer:0,
      skillCooldown:8,skillCastTimer:0,attackCastTimer:0,crit:0}
  });
  return {game,config,data};
}

test("moving fire uses bullets, preserves movement direction, respects cooldown and multishot",()=>{
  const {game,config}=setup();
  game.player.projectileCount=3;
  game.autoFire();
  assert.equal(game.bullets.length,3);
  assert.equal(game.player.lastDir,"left");
  assert.equal(game.player.attackDir,"right");
  assert.equal(config.player.skins.gunner_cherry.attackMoveSpeedMultiplier,1);
  game.autoFire();
  assert.equal(game.bullets.length,3);
  assert.ok(game.bullets.every(b=>b.gunner && b.vx>0 && b.dmg===20));
  game.player.fireTimer=0;
  game.enemies=[];
  game.autoFire();
  assert.equal(game.bullets.length,3);
});

test("spin emits 48 bullets over time, covers the circle, pauses and cannot overlap",()=>{
  const {game}=setup();
  game.skill();
  assert.equal(game.bullets.length,0);
  assert.equal(game.player.skillTimer,8);
  const cast=game.player.gunnerSpin;
  game.skill();
  assert.equal(game.player.gunnerSpin,cast);
  game.mode="paused";
  game.update(.5);
  assert.equal(cast.elapsed,0);
  assert.equal(game.bullets.length,0);
  game.mode="playing";
  game.update(.2);
  assert.ok(game.bullets.length>0 && game.bullets.length<48);
  const partial=game.bullets.length;
  game.player.fireTimer=0;
  game.autoFire();
  assert.equal(game.bullets.length,partial,"normal fire is suppressed during the spin");
  for(let i=0;i<13;i++) game.update(.05);
  assert.equal(game.bullets.length,48);
  assert.equal(game.player.gunnerSpin,null);
  assert.ok(game.bullets.every(b=>b.skill && b.dmg===7));
  for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    assert.ok(game.bullets.some(b=>b.vx*sx>0 && b.vy*sy>0));
  }
});

test("swept bullets hit the first live target, once, even when crossing it in one frame",()=>{
  const {game}=setup();
  const near={x:30,y:0,r:5,hp:100}, far={x:50,y:0,r:5,hp:100};
  game.enemies=[far,{x:15,y:0,r:10,hp:0,dead:true},near];
  game.bullets=[{gunner:true,x:0,y:0,vx:700,vy:0,r:4,dmg:20,life:1},
    {style:"other",x:1,y:2,life:1}];
  game.updateBullets(.1);
  assert.equal(near.hp,80);
  assert.equal(far.hp,100);
  assert.equal(game.bullets.length,1);
  assert.equal(game.bullets[0].style,"other");
  assert.equal(game.standardUpdates,1);
  game.updateBullets(.1);
  assert.equal(near.hp,80);
});

test("all five animations resolve four canonical strips and renderer chooses moving attack",()=>{
  const {game,config,data}=setup();
  const skin=config.player.skins.gunner_cherry;
  for(const anim of Object.values(skin.states)) {
    for(const path of Object.values(anim.dirs)) {
      assert.ok(existsSync(path),path);
      const png=readFileSync(path);
      assert.equal(png.readUInt32BE(16),192*anim.frames);
      assert.equal(png.readUInt32BE(20),192);
    }
  }
  assert.ok(existsSync(data.skins[0].icon));
  assert.ok(existsSync(data.skins[0].splash));
  const images=[];
  game.assets={get:key=>{ images.push(key); return {}; }};
  const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(){}};
  game.player.attackCastDuration=1/3;
  game.player.attackCastTimer=.2;
  game.player.attackDir="right";
  game.drawPlayer(ctx,game.player);
  assert.equal(images.pop(),"player_gunner_cherry_attackMove_right");
  game.player.moving=false;
  game.drawPlayer(ctx,game.player);
  assert.equal(images.pop(),"player_gunner_cherry_attack_right");
  game.skill();
  game.drawPlayer(ctx,game.player);
  assert.equal(images.pop(),"player_gunner_cherry_skill_left");
});

test("other skins delegate and a replacement player never inherits the spin",()=>{
  const {game}=setup();
  game.skill();
  game.player={...game.player,skin:"cherry_default",gunnerSpin:null};
  game.autoFire(); assert.equal(game.delegated,"autoFire");
  game.skill(); assert.equal(game.delegated,"skill");
  game.update(.8); assert.equal(game.bullets.length,0);
});
