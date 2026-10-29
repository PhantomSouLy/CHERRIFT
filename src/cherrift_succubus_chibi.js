/* Legendary Succubus Cherry: generated eight-direction artwork and cosmetic
   idle scheduler. The existing v095 combat/projectile/effect code stays owner
   of every hit, drain, cooldown, shield and Soul Drain burst. */
(() => {
  'use strict';
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_SUCCUBUS_CHIBI) return;
  const ID='succubus_cherry', skin=CHERRIFT_CONFIG.player.skins[ID];
  if (!skin) return;
  const ROOT='assets/player/cherry_skins/succubus_cherry/sheets192';
  const VERSION='1028-succubus-legs2';
  const DIRS=['right','down_right','down','down_left','left','up_left','up','up_right'];
  const old=skin.states;
  const rangedDuration=old.attack_ranged.duration || 6/16;
  const movingDuration=old.walk_attack_ranged.duration || .6;
  const meleeDuration=old.attack_melee.duration || 1/3;
  const skillDuration=old.skill.duration || 8/12;
  const burstTime=(old.skill.burstFrame || 4)/(old.skill.fps || 12);
  function state(name,fps,duration=6/fps,extra={}) {
    return {frames:6,fps,duration,pivot:{x:96,y:184},loop:['idle','walk'].includes(name),...extra,
      dirs:Object.fromEntries(DIRS.map(dir=>[dir,`${ROOT}/${ID}_${name}_${dir}.png?v=${VERSION}`]))};
  }
  skin.states={
    idle:state('idle',3),idle2:state('idle2',3),idle3:state('idle3',3),walk:state('walk',8),
    attack_ranged:state('attack_ranged',6/rangedDuration,rangedDuration,{projectileFrame:old.attack_ranged.projectileFrame || 3}),
    attack_melee:state('attack_melee',6/meleeDuration,meleeDuration,{hitFrames:old.attack_melee.hitFrames || [2,4]}),
    walk_attack_ranged:state('walk_attack_ranged',6/movingDuration,movingDuration,{projectileFrame:old.walk_attack_ranged.projectileFrame || 4}),
    // Same cast duration and same burst time despite the new six-pose strip.
    skill:state('skill',6/skillDuration,skillDuration,{burstFrame:burstTime*6/skillDuration})
  };
  skin.states.attack=skin.states.attack_ranged;
  skin.states.attackMove=skin.states.walk_attack_ranged;

  function facing(x,y,fallback='down') {
    if(Math.hypot(x,y)<.04)return DIRS.includes(fallback)?fallback:'down';
    return DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  }
  // Cosmetic PRNG avoids consuming combat's Math.random sequence.
  function random(p) {
    let seed=p.succubusIdleSeed;
    if(!Number.isInteger(seed))seed=(Date.now() ^ Math.floor((p.x || 0)*31+(p.y || 0)*17))>>>0;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;p.succubusIdleSeed=seed;
    return seed/4294967296;
  }
  function cancelIdle(p) {
    p.succubusIdleVariant=null;p.succubusIdleElapsed=0;p.succubusIdleWait=undefined;
  }
  const proto=CherriftGame.prototype;
  const move=proto.movePlayer;
  proto.movePlayer=function moveSuccubusChibi(v,dt) {
    const p=this.player,x=p?.x,y=p?.y;
    const result=move.call(this,v,dt);
    if(p?.skin===ID && this.player===p){
      if(Math.hypot(v.x,v.y)>.04)p.succubusFacing=facing(v.x,v.y,p.succubusFacing);
      const distance=Math.hypot(p.x-x,p.y-y);
      if(dt>0)p.succubusStride=(p.succubusStride || 0)+Math.min(dt,distance/Math.max(1,p.speed || 235));
    }
    return result;
  };
  const fire=proto.autoFire;
  proto.autoFire=function fireSuccubusChibi(...args) {
    const p=this.player,before=p?.__succubusAttackV095;
    const result=fire.apply(this,args);
    const attack=p?.__succubusAttackV095;
    if(p?.skin===ID && this.player===p && attack && attack!==before){
      p.succubusAttackFacing=facing(Math.cos(attack.angle),Math.sin(attack.angle),p.succubusFacing);
      if(!p.moving)p.succubusFacing=p.succubusAttackFacing;
      cancelIdle(p);
    }
    return result;
  };
  const skill=proto.skill;
  proto.skill=function skillSuccubusChibi(...args) {
    const p=this.player,before=p?.__succubusSkillV095;
    const v=p?.skin===ID?this.input.getMoveVector():{x:0,y:0};
    const dir=facing(v.x,v.y,p?.succubusFacing || p?.lastDir);
    const result=skill.apply(this,args);
    if(p?.skin===ID && this.player===p && p.__succubusSkillV095 && p.__succubusSkillV095!==before){
      p.succubusSkillFacing=dir;cancelIdle(p);
    }
    return result;
  };
  const update=proto.update;
  proto.update=function updateSuccubusChibi(dt) {
    const p=this.player;
    if(p?.skin!==ID)return update.call(this,dt);
    // Do not let the legacy cosmetic idle2 scheduler compete with idle3.
    p.__succubusNextIdle2V095=Infinity;p.__succubusIdle2UntilV095=0;
    if(this.mode!=='playing')return;
    const result=update.call(this,dt);
    if(this.player!==p)return result;
    const delta=Math.max(0,Number(dt)||0);
    if(p.moving || p.__succubusAttackV095 || p.__succubusSkillV095){cancelIdle(p);return result;}
    if(p.succubusIdleWait===undefined)p.succubusIdleWait=4+random(p)*4;
    if(p.succubusIdleVariant){
      p.succubusIdleElapsed+=delta;
      if(p.succubusIdleElapsed>=skin.states[p.succubusIdleVariant].duration){
        p.succubusLastIdleVariant=p.succubusIdleVariant;p.succubusIdleVariant=null;
        p.succubusIdleElapsed=0;p.succubusIdleWait=4+random(p)*4;
      }
    }else{
      p.succubusIdleWait-=delta;
      if(p.succubusIdleWait<=0){
        const last=p.succubusLastIdleVariant;
        let next=random(p)<.5?'idle2':'idle3';
        if(next===last && (p.succubusIdleRepeats || 0)>=2)next=next==='idle2'?'idle3':'idle2';
        p.succubusIdleRepeats=next===last?(p.succubusIdleRepeats || 0)+1:1;
        p.succubusIdleVariant=next;
        p.succubusIdleElapsed=0;
      }
    }
    return result;
  };
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawSuccubusChibi(ctx,p) {
    if(p?.skin!==ID)return draw.call(this,ctx,p);
    const cast=p.__succubusSkillV095,attack=!cast && p.__succubusAttackV095;
    let name=cast?'skill':attack?(attack.animation==='attack_melee'?'attack_melee':p.moving?'walk_attack_ranged':'attack_ranged')
      :p.moving?'walk':p.succubusIdleVariant || 'idle';
    let dir=cast?p.succubusSkillFacing || p.skillDir:attack?p.succubusAttackFacing || p.attackDir:p.succubusFacing || p.lastDir;
    dir=DIRS.includes(dir)?dir:'down';
    let image=this.assets.get(`player_${ID}_${name}_${dir}`);
    if(!image){name='idle';image=this.assets.get(`player_${ID}_idle_${dir}`);}
    if(!image){dir='down';image=this.assets.get(`player_${ID}_idle_down`);}
    if(!image)return;
    const config=skin.states[name],count=Math.min(config.frames,Math.floor((image.naturalWidth || image.width)/192));
    if(count<1)return;
    let frame;
    if(name==='walk_attack_ranged')frame=Math.floor((p.succubusStride || 0)*8)%count;
    else if(name==='skill')frame=Math.min(count-1,Math.floor(cast.elapsed/cast.duration*count));
    else if(attack && name.includes('attack'))frame=Math.min(count-1,Math.floor(attack.elapsed/attack.duration*count));
    else if(name==='idle2' || name==='idle3')frame=Math.min(count-1,Math.floor((p.succubusIdleElapsed || 0)*config.fps));
    else frame=Math.floor((name==='walk'?p.succubusStride || 0:this.t || 0)*config.fps)%count;
    const width=(CHERRIFT_CONFIG.player.displayWidth || 116)*.95;
    const height=(CHERRIFT_CONFIG.player.displayHeight || 116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();
    ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // These strips are registered offline to a fixed body pivot. Never derive
    // a new x anchor from changing feet, wing/tail silhouettes or weapons.
    const gait=window.CHERRIFT_SUCCUBUS_GAIT?.get(image,this.assets.get(`player_${ID}_idle_${dir}`),name,dir,frame);
    ctx.drawImage(gait || image,gait?0:frame*192,0,192,192,p.x-96*width/192,p.y+30-184*height/192,width,height);
    ctx.restore();

  };
  window.CHERRIFT_SUCCUBUS_CHIBI=Object.freeze({version:VERSION,directions:[...DIRS],idleVariants:['idle','idle2','idle3']});
})();
