/* Sport Cherry: Base-reference eight-direction chibi; existing defensive rules. */
(() => {
  'use strict';
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_SPORT_CHERRY) return;
  const ID='sport_cherry', BUILD='1030-sport-chibi1';
  const ROOT='assets/player/cherry_skins/sport_cherry/sheets192';
  const DIRS=['right','down_right','down','down_left','left','up_left','up','up_right'];
  const FPS={idle:3,idle2:3,walk:8,attack:18,walk_attack:8,skill:16};
  const config=CHERRIFT_CONFIG.player.skins[ID];if(!config)return;
  config.states=Object.fromEntries(Object.entries(FPS).map(([name,fps])=>[name,{
    frames:6,fps,duration:6/fps,loop:name==='idle'||name==='walk',pivot:{x:96,y:184},
    dirs:Object.fromEntries(DIRS.map(d=>[d,`${ROOT}/sport_cherry_${name}_${d}.png?v=${BUILD}`]))
  }]));
  config.attackMovementMode='mobile';config.attackMoveSpeedMultiplier=1;
  // Keep common_shield, +2% HP, existing cooldown and the shared healing logic.
  const proto=CherriftGame.prototype;
  const facing=(x,y,fallback='down')=>Math.hypot(x,y)<.04?fallback:DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  const key=(s,d)=>`player_${ID}_${s}_${d}`;
  const move=proto.movePlayer;
  proto.movePlayer=function moveSport(v,dt){
    const p=this.player,x=p?.x,y=p?.y;const result=move.call(this,v,dt);
    if(p===this.player&&p?.skin===ID&&dt>0){
      const distance=Math.hypot(p.x-x,p.y-y);
      p.sportStride=(p.sportStride||0)+Math.min(dt,distance/Math.max(1,p.speed||235));
      if(Math.hypot(v.x,v.y)>.04)p.sportFacing=facing(v.x,v.y,p.sportFacing);
    }return result;
  };
  const fire=proto.autoFire;
  proto.autoFire=function fireSport(...args){
    const p=this.player;if(p?.skin!==ID)return fire.apply(this,args);
    if(p.sportAttack||p.fireTimer>0||p.skillCastTimer>0)return;
    const target=this.nearest(760);if(!target||target.dead)return;
    const duration=config.states.attack.duration;
    p.fireTimer=p.fireInterval*(p.skillBuff>0?.55:1);
    p.attackDir=facing(target.x-p.x,target.y-p.y,p.sportFacing);
    if(!p.moving)p.sportFacing=p.attackDir;
    p.sportAttack={elapsed:0,duration,target,fired:false};
    p.attackCastDuration=duration;p.attackCastTimer=duration;p.sportIdleTime=0;
  };
  const skill=proto.skill;
  proto.skill=function shieldSport(...args){
    const p=this.player;if(p?.skin!==ID)return skill.apply(this,args);
    if(p.skillTimer>0||p.skillCastTimer>0)return;
    const before=this.effects?.length||0;
    const result=skill.apply(this,args);
    if(p.skillCastTimer>0){
      p.skillDir=p.sportFacing||p.lastDir||'down';p.sportAttack=null;p.attackCastTimer=0;p.sportIdleTime=0;
      for(const effect of (this.effects||[]).slice(before))if(effect.type==='commonShieldCastV091')effect.sportShield=true;
    }return result;
  };
  const update=proto.update;
  proto.update=function updateSport(dt){
    const result=update.call(this,dt),p=this.player;
    if(p?.skin!==ID||this.mode!=='playing')return result;
    const a=p.sportAttack;
    if(a){
      a.elapsed=Math.min(a.duration,a.elapsed+Math.max(0,dt));
      if(!a.fired&&a.elapsed>=2.5/FPS.attack){
        a.fired=true;
        if(a.target&&!a.target.dead){
          const dx=a.target.x-p.x,dy=a.target.y-p.y,length=Math.hypot(dx,dy)||1;
          const b={x:p.x,y:p.y-10,vx:dx/length*p.bulletSpeed,vy:dy/length*p.bulletSpeed,r:8,dmg:p.damage,life:1.45,style:'sport_bloom_v1',archetype:'defensive'};
          this.bullets.push(b);window.CHERRIFT_SPORT_VFX?.shot(this,b);
        }
      }
      p.attackCastTimer=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.duration)p.sportAttack=null;
    }
    p.sportIdleTime=p.moving||p.sportAttack||p.skillCastTimer>0?0:(p.sportIdleTime||0)+Math.max(0,dt);
    return result;
  };
  function raw(ctx,image,frame,p,width,height){
    ctx.drawImage(image,frame*192,0,192,192,p.x-96*width/192,p.y+30-184*height/192,width,height);
  }
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawSport(ctx,p){
    if(p?.skin!==ID)return draw.call(this,ctx,p);
    const cast=p.skillCastTimer>0,attack=!cast&&p.sportAttack,idle=p.sportIdleTime||0;
    const state=cast?'skill':attack?(p.moving?'walk_attack':'attack'):p.moving?'walk':idle%8>=6?'idle2':'idle';
    const d=cast?p.skillDir:attack?p.attackDir:p.sportFacing||p.lastDir;
    const dir=DIRS.includes(d)?d:'down';
    const image=this.assets.get(key(state,dir))||this.assets.get(key('idle',dir))||this.assets.get(key('idle','down'));if(!image)return;
    const elapsed=cast?Math.max(0,(p.skillCastDuration||config.states.skill.duration)-p.skillCastTimer):state==='idle2'?idle%8-6:this.t||0;
    const phase=attack?Math.min(5,attack.elapsed/attack.duration*6):cast||state==='idle2'?Math.min(5,elapsed*FPS[state]):state==='walk'?((p.sportStride||0)*8)%6:(elapsed*FPS[state])%6;
    const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95,height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
    const gaitDrawn=state.startsWith('walk')&&window.CHERRIFT_SPORT_GAIT?.draw(this,ctx,state,dir,phase,(p.sportStride||0)*8,p,width,height);
    if(!gaitDrawn&&!smooth?.draw(ctx,image,ID,state,dir,phase,p,width,height,{
      loop:state==='idle'||state==='walk',gaitPhase:(p.sportStride||0)*8,
      makeFrame:(c,f)=>raw(c,image,f,{x:96,y:154},192,192)
    }))raw(ctx,image,Math.floor(phase),p,width,height);
    ctx.restore();
    window.CHERRIFT_SPORT_VFX?.shield(this,ctx,p);
  };
  window.CHERRIFT_SPORT_CHERRY=Object.freeze({version:BUILD,directions:[...DIRS]});
})();
