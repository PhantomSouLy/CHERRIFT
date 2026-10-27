import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import vm from "node:vm";

function fixture() {
  class Game {
    movePlayer(v, dt) { this.player.x += v.x * dt; }
    autoFire() { this.delegated = "fire"; }
    skill() {
      const p = this.player;
      if (p.skillTimer > 0) return;
      p.skillTimer = 8; p.skillCastDuration = config.player.skins.cherry_default.states.skill.duration;
      p.skillCastTimer = p.skillCastDuration; p.dashTimer = .34;
    }
    update(dt) {
      if (this.mode !== "playing") return;
      const p = this.player;
      p.skillCastTimer = Math.max(0, (p.skillCastTimer || 0) - dt);
      p.dashTimer = Math.max(0, (p.dashTimer || 0) - dt);
      p.fireTimer -= dt;
    }
    nearest() { return this.enemies.find(e => !e.dead); }
    drawPlayer() { this.delegated = "draw"; }
  }
  const config = {player:{skins:{cherry_default:{dashDuration:.34}},displayWidth:116,displayHeight:116}};
  const window = {CherriftGame:Game, CHERRIFT_CONFIG:config};
  vm.runInNewContext(readFileSync("src/cherrift_base_cherry.js", "utf8"), {window, CherriftGame:Game, CHERRIFT_CONFIG:config});
  const game = new Game();
  Object.assign(game, {mode:"playing", t:0, bullets:[], enemies:[{x:100, y:-100}],
    input:{getMoveVector:()=>({x:0,y:0})},
    player:{skin:"cherry_default", x:0,y:0, moving:false,lastDir:"down",fireTimer:0,
      fireInterval:.42,damage:20,bulletSpeed:560,skillTimer:0,skillCastTimer:0}});
  const calls = [];
  game.assets = {get:key=>({key,width:1152,height:192})};
  const ctx = {globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){calls.push(args);}};
  return {game, config, ctx, calls};
}

test("all 48 configured strips exist, are 1152x192 and have six frames", () => {
  const {config} = fixture();
  let count = 0;
  for (const state of Object.values(config.player.skins.cherry_default.states)) {
    assert.equal(state.frames,6); assert.equal(Object.keys(state.dirs).length,8);
    for (const url of Object.values(state.dirs)) {
      const path = url.split("?")[0]; assert.ok(existsSync(path), path);
      const png = readFileSync(path);
      assert.equal(png.readUInt32BE(16),1152); assert.equal(png.readUInt32BE(20),192); count++;
    }
  }
  assert.equal(count,48);
  const html = readFileSync("index.html","utf8");
  assert.ok(html.indexOf('src/cherrift_base_cherry.js') > html.indexOf('src/cherrift_app.js'));
});

test("moving attacks fire once, preserve walk direction and switch sheets without resetting the cast", () => {
  const {game,ctx,calls} = fixture(); const p=game.player;
  p.moving=true; game.movePlayer({x:-1,y:1},.01); game.autoFire();
  assert.equal(p.baseFacing,"down_left"); assert.equal(p.attackDir,"up_right");
  game.update(.21); game.drawPlayer(ctx,p);
  assert.equal(game.bullets.length,1); assert.equal(game.bullets[0].dmg,20);
  assert.ok(calls.at(-1)[0].key.endsWith("walk_attack_up_right"));
  const sourceX=calls.at(-1)[1]; p.moving=false; game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith("attack_up_right")); assert.equal(calls.at(-1)[1],sourceX);
  game.autoFire(); game.update(.1); assert.equal(game.bullets.length,1);
  game.mode="paused"; const elapsed=p.baseAttack.elapsed;game.update(.2);assert.equal(p.baseAttack.elapsed,elapsed);
  game.mode="playing";game.update(.2);assert.equal(p.baseAttack,null);assert.equal(game.bullets.length,1);
});

test("idle2, walk, dash and six-frame clipping use the new renderer; other skins delegate", () => {
  const {game,ctx,calls} = fixture();const p=game.player;
  game.update(6.1);game.drawPlayer(ctx,p);assert.ok(calls.at(-1)[0].key.includes("idle2_down"));
  p.moving=true;game.movePlayer({x:1,y:-1},.1);game.drawPlayer(ctx,p);
  assert.ok(calls.at(-1)[0].key.endsWith("walk_up_right"));
  p.moving=false;game.skill(); assert.equal(p.skillDir,"up_right");
  assert.ok(Math.abs(Math.hypot(p.dashDir.x,p.dashDir.y)-1)<1e-10);
  assert.ok(p.dashDir.x>0 && p.dashDir.y<0);assert.equal(p.dashTimer,.34);
  const duration=p.skillCastDuration;game.skill();assert.equal(p.skillCastDuration,duration);
  p.skillCastTimer=.001;game.drawPlayer(ctx,p);assert.equal(calls.at(-1)[1],5*192);
  assert.ok(calls.at(-1)[0].key.endsWith("skill_up_right"));
  p.skin="fairy_cherry";game.drawPlayer(ctx,p);assert.equal(game.delegated,"draw");
  game.autoFire();assert.equal(game.delegated,"fire");
});

test("a dash interrupts the pending shot and a dead target cannot receive a new projectile", () => {
  const {game}=fixture();game.autoFire();game.skill();game.update(.25);assert.equal(game.bullets.length,0);
  const f=fixture();f.game.autoFire();f.game.enemies[0].dead=true;f.game.update(.25);assert.equal(f.game.bullets.length,0);
});
