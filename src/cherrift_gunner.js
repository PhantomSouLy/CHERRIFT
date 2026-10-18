/* Gunner Cherry: mobile ranged fire and a timed, full-circle twin-pistol volley. */
(() => {
  "use strict";
  if (window.CHERRIFT_GUNNER || !window.CherriftGame) return;
  const ID = "gunner_cherry";
  const ROOT = "assets/player/skins/gunner_cherry/";
  const DIRECTIONS = ["down", "up", "left", "right"];
  const SPIN_DURATION = .8;
  const SPIN_PAIRS = 24;
  const SPIN_START = .1;
  const SPIN_END = .65;
  const animation = (name, frames, fps, duration) => ({
    frames, fps, ...(duration ? {duration} : {}), pivot:{x:96,y:184},
    dirs:Object.fromEntries(DIRECTIONS.map(dir => [dir, `${ROOT}strips/gunner_cherry_${name}_${dir}.png`]))
  });
  const config = {
    id:ID, folder:ID, attackType:"ranged", skillType:"bullet_ballet",
    skillCooldown:8, attackMovementMode:"mobile", attackMoveSpeedMultiplier:1,
    states:{
      idle:animation("idle",4,4), walk:animation("walk",6,10),
      attack:animation("attack",6,18,1/3),
      attackMove:animation("attackMove",6,18,1/3),
      skill:animation("skill",8,10,SPIN_DURATION)
    }
  };
  CHERRIFT_CONFIG.player.skins[ID] = config;
  CHERRIFT_DATA.skins.push({
    id:ID, name:"Gunner Cherry", rarity:"Rare", emoji:"🔫", archetype:"offensive",
    weapon:"Twin Cherry Pistols", skill:"Bullet Ballet", passive:"Fire while moving at full speed",
    desc:"A mobile ranged Cherry with twin pistols and softly glowing pink bullets.",
    skillDesc:"Spins once and fires 48 bullets around her over 0.8 seconds. Each bullet deals 35% ATK damage.",
    stats:{damage:2,speed:4}, gradient:["#ff9bc9","#352038"], element:"cute",
    icon:`${ROOT}gunner_cherry_icon.png`, splash:`${ROOT}splashart.png`,
    skillIcon:`${ROOT}gunner_cherry_skill_icon.png`
  });
  const proto = CherriftGame.prototype;
  const facing = (dx, dy) => Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
  const angles = {down:Math.PI/2, up:-Math.PI/2, left:Math.PI, right:0};

  function spawn(game, angle, damage, skill = false, lateral = 0) {
    const p = game.player;
    const speed = (p.bulletSpeed || 560) * 1.25;
    game.bullets.push({
      gunner:true, skill, style:"gunner_bullet", x:p.x + Math.cos(angle)*18 - Math.sin(angle)*lateral,
      y:p.y-10 + Math.sin(angle)*18 + Math.cos(angle)*lateral,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      r:4, dmg:damage, life:1.15
    });
  }

  const autoFire = proto.autoFire;
  proto.autoFire = function autoFireGunner(...args) {
    const p = this.player;
    if (p?.skin !== ID) return autoFire.apply(this,args);
    if (this.mode !== "playing" || p.hp <= 0 || p.fireTimer > 0 || p.skillCastTimer > 0) return;
    const target = this.nearest(760);
    if (!target || target.dead) return;
    const angle = Math.atan2(target.y-(p.y-10),target.x-p.x);
    p.fireTimer = p.fireInterval * (p.skillBuff > 0 ? .55 : 1);
    p.attackCastDuration = config.states.attack.duration;
    p.attackCastTimer = p.attackCastDuration;
    p.attackDir = facing(target.x-p.x,target.y-p.y);
    if (!p.moving) p.lastDir = p.attackDir;
    p.gunnerHand = -(p.gunnerHand || 1);
    const count = Math.max(1, Math.floor(p.projectileCount || 1));
    for (let i=0;i<count;i++) {
      spawn(this, angle+(i-(count-1)/2)*(p.projectileSpread || .13), p.damage, false, p.gunnerHand*8);
    }
  };

  const skill = proto.skill;
  proto.skill = function skillGunner(...args) {
    const p = this.player;
    if (p?.skin !== ID) return skill.apply(this,args);
    if (this.mode !== "playing" || p.hp <= 0 || p.skillTimer > 0 || p.gunnerSpin) return;
    p.skillTimer = p.skillCooldown;
    p.skillCastDuration = SPIN_DURATION;
    p.skillCastTimer = SPIN_DURATION;
    p.attackCastTimer = 0;
    p.skillDir = p.lastDir || "down";
    p.gunnerSpin = {elapsed:0, emitted:0, angle:angles[p.skillDir] ?? Math.PI/2};
  };

  // Advance on simulation time only: pausing or opening a level-up never fires
  // delayed bullets. Store the cast on the player so a new run cannot inherit it.
  const update = proto.update;
  proto.update = function updateGunner(dt) {
    const p = this.player;
    if (p?.skin === ID && p.gunnerSpin && this.mode === "playing" && p.hp > 0) {
      const cast = p.gunnerSpin;
      cast.elapsed = Math.min(SPIN_DURATION, cast.elapsed + Math.max(0,dt));
      while (cast.emitted < SPIN_PAIRS && cast.elapsed >= SPIN_START + cast.emitted*(SPIN_END-SPIN_START)/(SPIN_PAIRS-1)) {
        const angle = cast.angle + cast.emitted/SPIN_PAIRS*Math.PI*2;
        spawn(this,angle,p.damage*.35,true);
        spawn(this,angle+Math.PI,p.damage*.35,true);
        cast.emitted++;
      }
      if (cast.elapsed >= SPIN_DURATION) p.gunnerSpin = null;
    }
    return update.call(this,dt);
  };

  // Swept collision prevents fast bullets passing through small enemies at
  // low FPS. Keep all other projectile types on their existing update path.
  const updateBullets = proto.updateBullets;
  proto.updateBullets = function updateBulletsGunner(dt) {
    const custom = this.bullets.filter(b => b.gunner);
    if (!custom.length) return updateBullets.call(this,dt);
    this.bullets = this.bullets.filter(b => !b.gunner);
    updateBullets.call(this,dt);
    for (const b of custom) {
      if (b.dead || b.life <= 0) continue;
      const step = Math.min(Math.max(0,dt),b.life), dx=b.vx*step, dy=b.vy*step;
      let hit=null, first=Infinity;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const ex=b.x-enemy.x, ey=b.y-enemy.y, radius=b.r+(enemy.r||0);
        const a=dx*dx+dy*dy, c=ex*ex+ey*ey-radius*radius;
        const dot=ex*dx+ey*dy, discriminant=dot*dot-a*c;
        const t=c<=0 ? 0 : a>0 && discriminant>=0 ? (-dot-Math.sqrt(discriminant))/a : Infinity;
        if (t>=0 && t<=1 && t<first) { hit=enemy; first=t; }
      }
      b.x+=dx; b.y+=dy; b.life-=dt;
      if (hit) {
        const crit=Math.random()<(this.player.crit||0);
        this.damageEnemy(hit,b.dmg*(crit ? this.player.critDamage||1.5 : 1));
        if (crit) this.effects.push({type:"crit",x:hit.x,y:hit.y,t:0,life:.35});
        b.dead=true;
      }
    }
    this.bullets.push(...custom.filter(b => !b.dead && b.life>0));
  };

  const drawBullet = proto.drawBullet;
  proto.drawBullet = function drawBulletGunner(ctx,b) {
    if (!b.gunner) return drawBullet.call(this,ctx,b);
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
    ctx.shadowColor="#ff70b9"; ctx.shadowBlur=8;
    ctx.fillStyle="#ffb6d8"; ctx.beginPath(); ctx.ellipse(0,0,7,3,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle="#fff1d7";
    ctx.beginPath(); ctx.ellipse(2,0,4,1.5,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  };

  const drawPlayer = proto.drawPlayer;
  proto.drawPlayer = function drawPlayerGunner(ctx,p) {
    if (p?.skin !== ID) return drawPlayer.call(this,ctx,p);
    const casting=p.skillCastTimer>0, shooting=!casting && p.attackCastTimer>0;
    const name=casting ? "skill" : shooting ? (p.moving ? "attackMove" : "attack") : p.moving ? "walk" : "idle";
    const dir=(casting ? p.skillDir : shooting ? p.attackDir : p.lastDir) || "down";
    const anim=config.states[name];
    const image=this.assets.get(`player_${ID}_${name}_${dir}`);
    if (!image) return;
    const elapsed=casting ? p.skillCastDuration-p.skillCastTimer : shooting ? p.attackCastDuration-p.attackCastTimer : this.t;
    const frame=casting || shooting ? Math.min(anim.frames-1,Math.floor(Math.max(0,elapsed)*anim.fps)) : Math.floor(elapsed*anim.fps)%anim.frames;
    const size=(CHERRIFT_CONFIG.player.displayWidth||116)*.95, scale=size/192;
    ctx.save(); ctx.globalAlpha=.2; ctx.fillStyle="#000";
    ctx.beginPath(); ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.drawImage(image,frame*192,0,192,192,Math.round(p.x-96*scale),Math.round(p.y+30-184*scale),size,size);
  };
  window.CHERRIFT_GUNNER = Object.freeze({id:ID,spinDuration:SPIN_DURATION,spinBullets:SPIN_PAIRS*2});
})();
