/* School Cherry: Base-reference eight-direction chibi; existing hybrid rules. */
(() => {
  'use strict';
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_SCHOOL_CHERRY) return;
  const ID='school_uniform_cherry', BUILD='1119-school-whole1';
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
  const paletteCache=new WeakMap();
  const smoothRange=(lo,hi,value)=>{const t=Math.max(0,Math.min(1,(value-lo)/(hi-lo)));return t*t*(3-2*t);};
  function paletteMatched(image,state,dir,ctx){
    const curves=window.CHERRIFT_SCHOOL_PALETTE?.[state]?.[dir];if(!curves)return image;
    const cached=paletteCache.get(image);if(cached)return cached.image;
    const owner=ctx.canvas?.ownerDocument||(typeof document==='undefined'?null:document);
    const canvas=owner?.createElement('canvas')||(typeof OffscreenCanvas==='function'?new OffscreenCanvas(1152,192):null);
    if(!canvas)return image;canvas.width=1152;canvas.height=192;
    const c=canvas.getContext('2d');if(!c?.getImageData||!c.putImageData)return image;
    c.drawImage(image,0,0);const pixels=c.getImageData(0,0,1152,192),data=pixels.data;
    const makeLut=curves=>curves.map(curve=>Uint8Array.from({length:256},(_,value)=>{
      let j=1;while(j<curve.length-1&&value>curve[j][0])j++;
      const [x0,y0]=curve[j-1],[x1,y1]=curve[j];return Math.round(y0+(y1-y0)*(value-x0)/(x1-x0));
    }));
    const lut=makeLut(curves);
    for(let i=0;i<data.length;i+=4){
      if(!data[i+3])continue;const r=data[i],g=data[i+1],b=data[i+2];
      const weight=smoothRange(30,55,r-Math.min(g,b))*(1-smoothRange(12,24,g-b));
      if(!weight)continue;
      for(let channel=0;channel<3;channel++){const value=data[i+channel];data[i+channel]=Math.round(value+weight*(lut[channel][value]-value));}
    }
    c.putImageData(pixels,0,0);const entry={image:canvas};paletteCache.set(image,entry);
    // Use the same decoded PNG sampling path as the source for stable outlines.
    if(typeof Image==='function'&&typeof canvas.toDataURL==='function'){
      const decoded=new Image();decoded.onload=()=>{entry.image=decoded;};decoded.src=canvas.toDataURL('image/png');
    }
    return entry.image;
  }
  const proto=CherriftGame.prototype;
  const facing=(x,y,fallback='down')=>Math.hypot(x,y)<.04?fallback:DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  const key=(s,d)=>`player_${ID}_${s}_${d}`;
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
    // Keep the moving body facing its travel direction. The shot still targets
    // the selected enemy and fires on the independent attack clock.
    const d=cast?p.skillDir:walking?p.schoolFacing||p.lastDir:attack?p.attackDir:p.schoolFacing||p.lastDir;
    const dir=DIRS.includes(d)?d:'down';
    let renderState=state,renderDir=dir;
    let image=this.assets.get(key(state,dir));
    if(!image){
      renderState='idle';
      image=this.assets.get(key('idle',dir));
      if(!image){renderDir='down';image=this.assets.get(key('idle','down'));}
    }
    if(!image)return;
    if(walking&&renderState===state)image=paletteMatched(image,state,dir,ctx);
    const elapsed=cast?Math.max(0,(p.skillCastDuration||config.states.skill.duration)-p.skillCastTimer):state==='idle2'?idle%8-6:this.t||0;
    const phase=walking?((p.schoolStride||0)*FPS.walk)%6:attack?Math.min(5,attack.elapsed/attack.duration*6):cast||state==='idle2'?Math.min(5,elapsed*FPS[state]):(elapsed*FPS[state])%6;
    const frame=renderState===state?Math.floor(phase):0;
    const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95,height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();
    if(p===this.player)ctx.globalAlpha=1;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(window.CHERRIFT_CHERRY_MOTION?.renderPose){
      window.CHERRIFT_CHERRY_MOTION.renderPose(ctx,image,ID,renderState,renderDir,frame,p,width,height);
    }else raw(ctx,image,frame,p,width,height);
    ctx.restore();
  };
  window.CHERRIFT_SCHOOL_CHERRY=Object.freeze({version:BUILD,directions:[...DIRS]});
})();
