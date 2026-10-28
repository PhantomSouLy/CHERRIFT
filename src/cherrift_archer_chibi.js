/* Archer Cherry concept 01: full-character chibi art, existing bow combat. */
(() => {
  "use strict";
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_ARCHER_CHIBI) return;
  const ID="archer_cherry", skin=CHERRIFT_CONFIG.player.skins[ID];
  if (!skin) return;
  const ROOT="assets/player/cherry_skins/archer_cherry/sheets192";
  const DIRS=["right","down_right","down","down_left","left","up_left","up","up_right"];
  const PIVOT={x:96,y:184};
  const attackDuration=skin.states?.attack?.duration || .40;
  const skillDuration=skin.states?.skill?.duration || .40;
  const specs={idle:[6,3],idle2:[6,3],walk:[6,8],
    attack:[6,6/attackDuration],walk_attack:[6,6/attackDuration],skill:[6,6/skillDuration]};
  skin.states=Object.fromEntries(Object.entries(specs).map(([name,[frames,fps]])=>[name,{
    frames,fps,duration:frames/fps,pivot:PIVOT,loop:["idle","walk"].includes(name),
    dirs:Object.fromEntries(DIRS.map(dir=>[dir,`${ROOT}/archer_cherry_${name}_${dir}.png?v=1027-cherry-motion1`]))
  }]));
  // Preserve passiveCrit, movement penalty, attack/skill types, cooldowns and
  // all projectile timing/damage. Only sprite configuration changes here.
  function facing(x,y,fallback="down") {
    if (Math.hypot(x,y)<.04) return DIRS.includes(fallback)?fallback:"down";
    return DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  }
  const proto=CherriftGame.prototype;
  const move=proto.movePlayer;
  proto.movePlayer=function moveArcherChibi(vector,dt) {
    const result=move.call(this,vector,dt), p=this.player;
    if (p?.skin===ID && Math.hypot(vector.x,vector.y)>.04) {
      p.archerChibiFacing=facing(vector.x,vector.y);
    }
    return result;
  };
  const fire=proto.autoFire;
  proto.autoFire=function fireArcherChibi(...args) {
    const p=this.player;
    if (p?.skin!==ID) return fire.apply(this,args);
    const count=this.bullets.length;
    const result=fire.apply(this,args);
    // Read the actual fired arrow, so range, target choice and attack timing
    // remain owned by the existing combat code. Never spawn another arrow.
    const arrow=this.bullets.slice(count).find(b=>b.style==="archer_arrow");
    if (arrow && this.player===p) {
      const dir=facing(arrow.vx,arrow.vy,p.archerChibiFacing || p.lastDir);
      p.archerChibiAttack={dir,elapsed:0,duration:p.attackCastDuration || attackDuration};
      if (!p.moving) p.archerChibiFacing=dir;
      p.archerChibiIdle=0;
    }
    return result;
  };
  const skill=proto.skill;
  proto.skill=function skillArcherChibi(...args) {
    const p=this.player;
    if (p?.skin!==ID) return skill.apply(this,args);
    const count=this.bullets.length;
    const result=skill.apply(this,args);
    const arrows=this.bullets.slice(count).filter(b=>b.style==="archer_arrow_skill");
    if (arrows.length && this.player===p) {
      const vector=arrows.reduce((v,b)=>({x:v.x+b.vx,y:v.y+b.vy}),{x:0,y:0});
      p.archerChibiSkillFacing=facing(vector.x,vector.y,p.archerChibiFacing || p.skillDir);
      p.archerChibiFacing=p.archerChibiSkillFacing;
      p.archerChibiAttack=null;
      p.archerChibiIdle=0;
    }
    return result;
  };
  const update=proto.update;
  proto.update=function updateArcherChibi(dt) {
    const p=this.player, active=this.mode==="playing", before=p?.archerChibiAttack;
    const result=update.call(this,dt);
    if (p?.skin!==ID || this.player!==p || !active) return result;
    const attack=p.archerChibiAttack;
    if (attack && attack===before) {
      attack.elapsed+=Math.max(0,dt);
      if (attack.elapsed>=attack.duration) p.archerChibiAttack=null;
    }
    if (p.moving || p.archerChibiAttack || p.skillCastTimer>0) p.archerChibiIdle=0;
    else p.archerChibiIdle=(p.archerChibiIdle || 0)+Math.max(0,dt);
    return result;
  };
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawArcherChibi(ctx,p) {
    if (p?.skin!==ID) return draw.call(this,ctx,p);
    const cast=p.skillCastTimer>0, attack=!cast && p.archerChibiAttack, idle=p.archerChibiIdle || 0;
    let name=cast?"skill":attack?(p.moving?"walk_attack":"attack"):
      p.moving?"walk":idle%8>=6?"idle2":"idle";
    const requested=cast?p.archerChibiSkillFacing || p.skillDir:
      attack?attack.dir:p.archerChibiFacing || p.lastDir;
    let dir=DIRS.includes(requested)?requested:"down";
    let image=this.assets.get(`player_${ID}_${name}_${dir}`);
    if (!image) {name="idle";image=this.assets.get(`player_${ID}_idle_${dir}`);}
    if (!image) {dir="down";image=this.assets.get(`player_${ID}_idle_down`);}
    if (!image) return;
    const state=skin.states[name], count=Math.min(state.frames,Math.floor((image.naturalWidth || image.width)/192));
    if (count<1) return;
    let frame;
    if (name==="skill") {
      const duration=p.skillCastDuration || skillDuration;
      frame=Math.min(count-1,Math.floor(Math.max(0,duration-p.skillCastTimer)/duration*count));
    } else if (attack && (name==="attack" || name==="walk_attack")) {
      frame=Math.min(count-1,Math.floor(attack.elapsed/attack.duration*count));
    } else if (name==="idle2") frame=Math.min(count-1,Math.floor((idle%8-6)*state.fps));
    else frame=Math.floor((this.t || 0)*state.fps)%count;
    if (p.moving && name === "walk") frame=window.CHERRIFT_CHERRY_MOTION?.walkFrame(p,count) ?? frame;
    const phase=name==='skill'?Math.min(count-1,Math.max(0,(p.skillCastDuration||skillDuration)-p.skillCastTimer)/(p.skillCastDuration||skillDuration)*count):attack?Math.min(count-1,attack.elapsed/attack.duration*count):name==='idle2'?Math.min(count-1,(idle%8-6)*state.fps):name==='walk'?((p.cherryStrideTime||0)*8)%count:((this.t||0)*state.fps)%count;
    const width=(CHERRIFT_CONFIG.player.displayWidth || 116)*.95;
    const height=(CHERRIFT_CONFIG.player.displayHeight || 116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle="#000";
    ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    if (window.CHERRIFT_CHERRY_MOTION) window.CHERRIFT_CHERRY_MOTION.draw(ctx,image,ID,name,dir,frame,p,width,height,phase);
    else ctx.drawImage(image,frame*192,0,192,192,
      p.x-PIVOT.x*width/192,p.y+30-PIVOT.y*height/192,width,height);
    ctx.restore();
  };
  window.CHERRIFT_ARCHER_CHIBI=Object.freeze({version:"1027-cherry-motion1",directions:[...DIRS]});
})();

