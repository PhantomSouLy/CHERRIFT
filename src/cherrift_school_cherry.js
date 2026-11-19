/* School Cherry: Base-reference eight-direction chibi; existing hybrid rules. */
(() => {
  'use strict';
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_SCHOOL_CHERRY) return;
  const ID='school_uniform_cherry', BUILD='1119-school-visible2';
  const ROOT='assets/player/cherry_skins/school_uniform_cherry/sheets192';
  const DIRS=['right','down_right','down','down_left','left','up_left','up','up_right'];
  const FPS={idle:3,idle2:3,walk:8,attack:18,walk_attack:8,skill:16};
  const config=CHERRIFT_CONFIG.player.skins[ID];if(!config)return;
  config.states=Object.fromEntries(Object.entries(FPS).map(([name,fps])=>[name,{
    frames:6,fps,duration:6/fps,loop:['idle','walk','walk_attack'].includes(name),pivot:{x:96,y:184},
    dirs:Object.fromEntries(DIRS.map(d=>[d,`${ROOT}/school_uniform_cherry_${name}_${d}.png?v=${BUILD}`]))
  }]));
  config.attackMovementMode='mobile';config.attackMoveSpeedMultiplier=1;
  // Keep common_pink_burst, +1% ATK/+1% HP, cooldown, damage and knockback.
  const proto=CherriftGame.prototype;
  const facing=(x,y,fallback='down')=>Math.hypot(x,y)<.04?fallback:DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  const key=(s,d)=>`player_${ID}_${s}_${d}`;
  const attemptedRecovery=new WeakMap();
  const isSheet=image=>(image?.naturalWidth??image?.width)===1152
    && (image?.naturalHeight??image?.height)===192;

  function recoverSheet(assets,state,dir){
    if(!assets.loadImage)return;
    const assetKey=key(state,dir);
    let attempts=attemptedRecovery.get(assets);
    if(!attempts)attemptedRecovery.set(assets,attempts=new Set());
    if(attempts.has(assetKey))return;
    attempts.add(assetKey);
    // Retry a failed versioned image via the underlying static path once.
    const src=config.states[state].dirs[dir].split('?')[0];
    void assets.loadImage(assetKey,src).catch(()=>false);
  }
  const move=proto.movePlayer;
  proto.movePlayer=function moveSchool(v,dt){
    const p=this.player,x=p?.x,y=p?.y;const result=move.call(this,v,dt);
    if(p===this.player&&p?.skin===ID&&dt>0&&!(p.dashTimer>0)){
      const distance=Math.hypot(p.x-x,p.y-y);
      p.schoolStride=(p.schoolStride||0)+Math.min(dt,distance/Math.max(1,p.speed||235));
      if(Math.hypot(v.x,v.y)>.04)p.schoolFacing=facing(v.x,v.y,p.schoolFacing);
    }return result;
  };
  const fire=proto.autoFire;
  proto.autoFire=function fireSchool(...args){
    const p=this.player;if(p?.skin!==ID)return fire.apply(this,args);
    if(p.schoolAttack||p.fireTimer>0||p.skillCastTimer>0)return;
    const target=this.nearest(760);if(!target||target.dead)return;
    const duration=config.states.attack.duration;
    p.fireTimer=p.fireInterval*(p.skillBuff>0?.55:1);
    p.attackDir=facing(target.x-p.x,target.y-p.y,p.schoolFacing);
    if(!p.moving)p.schoolFacing=p.attackDir;
    p.schoolAttack={elapsed:0,duration,target,fired:false};
    p.attackCastDuration=duration;p.attackCastTimer=duration;p.schoolIdleTime=0;
  };
  const skill=proto.skill;
  proto.skill=function burstSchool(...args){
    const p=this.player;if(p?.skin!==ID)return skill.apply(this,args);
    if(p.skillTimer>0||p.skillCastTimer>0)return;
    const result=skill.apply(this,args);
    if(p.skillCastTimer>0){
      p.skillDir=p.schoolFacing||p.lastDir||'down';p.schoolAttack=null;p.attackCastTimer=0;p.schoolIdleTime=0;
    }return result;
  };
  const update=proto.update;
  proto.update=function updateSchool(dt){
    const result=update.call(this,dt),p=this.player;
    if(p?.skin!==ID||this.mode!=='playing')return result;
    const a=p.schoolAttack;
    if(a){
      a.elapsed=Math.min(a.duration,a.elapsed+Math.max(0,dt));
      if(!a.fired&&a.target&&!a.target.dead){
        p.attackDir=facing(a.target.x-p.x,a.target.y-p.y,p.attackDir);
        if(!p.moving)p.schoolFacing=p.attackDir;
      }
      if(!a.fired&&a.elapsed>=2.5/FPS.attack){
        a.fired=true;
        if(a.target&&!a.target.dead){
          const dx=a.target.x-p.x,dy=a.target.y-p.y,length=Math.hypot(dx,dy)||1;
          const b={x:p.x,y:p.y-10,vx:dx/length*p.bulletSpeed,vy:dy/length*p.bulletSpeed,r:8,dmg:p.damage,life:1.45,style:'common_attack_v091',archetype:'hybrid'};
          this.bullets.push(b);
        }
      }
      p.attackCastTimer=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.duration)p.schoolAttack=null;
    }
    p.schoolIdleTime=p.moving||p.schoolAttack||p.skillCastTimer>0?0:(p.schoolIdleTime||0)+Math.max(0,dt);
    return result;
  };
  function raw(ctx,image,frame,p,width,height){
    ctx.drawImage(image,frame*192,0,192,192,p.x-96*width/192,p.y+30-184*height/192,width,height);
  }
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawSchool(ctx,p){
    if(p?.skin!==ID)return draw.call(this,ctx,p);
    const cast=p.skillCastTimer>0,attack=!cast&&p.schoolAttack,idle=p.schoolIdleTime||0;
    const state=cast?'skill':attack?(p.moving?'walk_attack':'attack'):p.moving?'walk':idle%8>=6?'idle2':'idle';
    const walking=state==='walk'||state==='walk_attack';
    // Walk attack shares the travel clock, but its pose faces the shot.
    const d=cast?p.skillDir:attack?p.attackDir:p.schoolFacing||p.lastDir;
    const dir=DIRS.includes(d)?d:'down';
    let renderState=state,renderDir=dir;
    let image=this.assets.get(key(state,dir));
    if(!isSheet(image)){
      recoverSheet(this.assets,state,dir);
      renderState='idle';
      for(const idleDir of new Set([dir,'down',...DIRS])){
        const idleImage=this.assets.get(key('idle',idleDir));
        if(isSheet(idleImage)){
          renderDir=idleDir;
          image=idleImage;
          break;
        }
      }
      if(!isSheet(image)){
        recoverSheet(this.assets,'idle','down');
        return draw.call(this,ctx,p);
      }
    }
    const elapsed=cast?Math.max(0,(p.skillCastDuration||config.states.skill.duration)-p.skillCastTimer):state==='idle2'?idle%8-6:this.t||0;
    const phase=walking?((p.schoolStride||0)*FPS.walk)%6:attack?Math.min(5,attack.elapsed/attack.duration*6):cast||state==='idle2'?Math.min(5,elapsed*FPS[state]):(elapsed*FPS[state])%6;
    const frame=renderState===state&&Number.isFinite(phase)?Math.floor(phase):0;
    const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95,height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();
    if(p===this.player){
      ctx.globalAlpha=1;
      ctx.globalCompositeOperation='source-over';
    }
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(window.CHERRIFT_CHERRY_MOTION?.renderPose){
      window.CHERRIFT_CHERRY_MOTION.renderPose(ctx,image,ID,renderState,renderDir,frame,p,width,height);
    }else raw(ctx,image,frame,p,width,height);
    ctx.restore();
  };
  window.CHERRIFT_SCHOOL_CHERRY=Object.freeze({version:BUILD,directions:[...DIRS]});
})();
