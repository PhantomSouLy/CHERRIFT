/* Ninja Cherry chibi 03: new artwork, existing hybrid combat and storm skill. */
(() => {
  "use strict";
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_NINJA_CHIBI) return;
  const ID = "ninja_cherry";
  const skin = CHERRIFT_CONFIG.player.skins[ID];
  if (!skin) return;
  const ROOT = "assets/player/cherry_skins/ninja_cherry/sheets192";
  const DIRS = ["right", "down_right", "down", "down_left", "left", "up_left", "up", "up_right"];
  const PIVOT = {x:96, y:184};
  const originalSkillDuration = skin.states?.skill?.duration || .42;
  const specs = {
    idle:[6,3], idle2:[6,3], walk:[6,8], attack_ranged:[6,12],
    attack_melee:[6,6/.34], walk_attack_ranged:[6,10], walk_attack_melee:[6,6/.34],
    skill:[8,8/originalSkillDuration]
  };
  skin.states = Object.fromEntries(Object.entries(specs).map(([name,[frames,fps]]) => [name, {
    frames, fps, duration:frames/fps, pivot:PIVOT, loop:["idle","walk"].includes(name),
    dirs:Object.fromEntries(DIRS.map(dir => [dir, `${ROOT}/ninja_cherry_${name}_${dir}.png?v=1027-cherry-motion1`]))
  }]));
  // Keep skill type, duration, damage, poison, melee threshold, movement penalty,
  // projectile count and speed buff untouched. The shared loader reads all dirs.
  function facing(x,y,fallback="down") {
    if (Math.hypot(x,y)<.04) return fallback;
    return DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  }
  const proto = CherriftGame.prototype;
  const move = proto.movePlayer;
  proto.movePlayer = function moveNinjaChibi(v,dt) {
    const result = move.call(this,v,dt);
    const p = this.player;
    if (p?.skin===ID && Math.hypot(v.x,v.y)>.04) p.ninjaChibiFacing=facing(v.x,v.y);
    return result;
  };
  const fire = proto.autoFire;
  proto.autoFire = function fireNinjaChibi(...args) {
    const p = this.player;
    if (p?.skin!==ID) return fire.apply(this,args);
    const ready = !(p.fireTimer>0);
    const target = ready ? this.nearest() : null;
    const dx = target ? target.x-p.x : 0, dy = target ? target.y-p.y : 0;
    const melee = target && Math.hypot(dx,dy)<=(p.ninjaMeleeRange ?? skin.meleeRange ?? 132)+(target.r||0);
    // This call performs the original damage or spawns the original two stars.
    // Only record its successful outcome; never spawn an additional attack.
    const result = fire.apply(this,args);
    if (ready && target && p.fireTimer>0 && this.player===p) {
      const duration = melee ? p.attackCastDuration || .34
        : Math.max(.06,Math.min(skin.states.attack_ranged.duration,p.fireTimer));
      const dir = facing(dx,dy,p.ninjaChibiFacing || p.lastDir);
      p.ninjaChibiAttack={kind:melee?"melee":"ranged",dir,elapsed:0,duration};
      if (!p.moving) p.ninjaChibiFacing=dir;
      p.ninjaChibiIdle=0;
    }
    return result;
  };
  const skill = proto.skill;
  proto.skill = function skillNinjaChibi(...args) {
    const p=this.player;
    if (p?.skin!==ID) return skill.apply(this,args);
    const ready=!(p.skillTimer>0);
    const v=this.input.getMoveVector();
    const dir=facing(v.x,v.y,p.ninjaChibiFacing || p.lastDir || "down");
    // Original skill emits 12 real outward projectiles, applies the existing
    // three-second +35% speed buff and sets the existing cooldown exactly once.
    const result=skill.apply(this,args);
    if (ready && p.skillCastTimer>0 && this.player===p) {
      p.ninjaChibiSkillFacing=dir;
      p.ninjaChibiAttack=null;
      p.ninjaChibiIdle=0;
    }
    return result;
  };
  const update=proto.update;
  proto.update=function updateNinjaChibi(dt) {
    const p=this.player, active=this.mode==="playing";
    const result=update.call(this,dt);
    if (p?.skin!==ID || this.player!==p || !active) return result;
    const attack=p.ninjaChibiAttack;
    if (attack) {
      attack.elapsed+=Math.max(0,dt);
      if (attack.elapsed>=attack.duration) p.ninjaChibiAttack=null;
    }
    if (p.moving || p.ninjaChibiAttack || p.skillCastTimer>0) p.ninjaChibiIdle=0;
    else p.ninjaChibiIdle=(p.ninjaChibiIdle||0)+Math.max(0,dt);
    return result;
  };
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawNinjaChibi(ctx,p) {
    if (p?.skin!==ID) return draw.call(this,ctx,p);
    const cast=p.skillCastTimer>0, attack=p.ninjaChibiAttack, idle=p.ninjaChibiIdle||0;
    const name=cast?"skill":attack?(p.moving?"walk_attack_":"attack_")+attack.kind
      :p.moving?"walk":idle%8>=6?"idle2":"idle";
    const dir=cast?p.ninjaChibiSkillFacing||p.skillDir
      :attack?attack.dir:p.ninjaChibiFacing||p.lastDir;
    const direction=DIRS.includes(dir)?dir:"down";
    const state=skin.states[name];
    const image=this.assets.get(`player_${ID}_${name}_${direction}`)
      || this.assets.get(`player_${ID}_idle_${direction}`)
      || this.assets.get(`player_${ID}_idle_down`);
    // Avoid the old four-direction renderer, alpha recentering and left mirror.
    if (!image) return;
    const count=Math.min(state.frames,Math.floor((image.naturalWidth||image.width)/192));
    if (count<1) return;
    let frame;
    if (cast) {
      const duration=p.skillCastDuration||originalSkillDuration;
      frame=Math.min(count-1,Math.floor(Math.max(0,duration-p.skillCastTimer)/duration*count));
    } else if (attack) frame=Math.min(count-1,Math.floor(attack.elapsed/attack.duration*count));
    else if (name==="idle2") frame=Math.min(count-1,Math.floor((idle%8-6)*state.fps));
    else frame=Math.floor((this.t||0)*state.fps)%count;
    if (p.moving && name === "walk") frame=window.CHERRIFT_CHERRY_MOTION?.walkFrame(p,count) ?? frame;
    const phase=cast?Math.min(count-1,Math.max(0,(p.skillCastDuration||originalSkillDuration)-p.skillCastTimer)/(p.skillCastDuration||originalSkillDuration)*count):attack?Math.min(count-1,attack.elapsed/attack.duration*count):name==='idle2'?Math.min(count-1,(idle%8-6)*state.fps):name==='walk'?((p.cherryStrideTime||0)*8)%count:((this.t||0)*state.fps)%count;
    const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95;
    const height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle="#000";
    ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    if (window.CHERRIFT_CHERRY_MOTION) window.CHERRIFT_CHERRY_MOTION.draw(ctx,image,ID,name,direction,frame,p,width,height,phase);
    else ctx.drawImage(image,frame*192,0,192,192,
      p.x-PIVOT.x*width/192,p.y+30-PIVOT.y*height/192,width,height);
    ctx.restore();
  };
  window.CHERRIFT_NINJA_CHIBI=Object.freeze({version:"1027-cherry-motion1",directions:[...DIRS]});
})();

