/* Fresh complete imagegen Cake poses. Base target-facing and combat timing;
   continuous distance-driven Walk/WalkAttack cycles, no sliced or warped legs. */
(() => {
  'use strict';
  if (!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_CAKE_CHERRY) return;
  const ID='cake_deliver_cherry', BUILD='1110-cake13-alternating-walk';
  const ROOT='assets/player/cherry_skins/cake_deliver_cherry_rebuilt/sheets192';
  const DIRS=['right','down_right','down','down_left','left','up_left','up','up_right'];
  const FPS={idle:3,idle2:3,walk:8,attack:18,walk_attack:8,skill:16};
  const config=CHERRIFT_CONFIG.player.skins[ID];if(!config)return;
  config.states=Object.fromEntries(Object.entries(FPS).map(([name,fps])=>[name,{
    frames:6,fps,duration:6/fps,loop:name==='idle'||name==='walk'||name==='walk_attack',pivot:{x:96,y:184},
    dirs:Object.fromEntries(DIRS.map(d=>[d,`${ROOT}/cake_deliver_cherry_${name}_${d}.png?v=${BUILD}`]))
  }]));
  config.attackMovementMode='mobile';config.attackMoveSpeedMultiplier=1;
  // Each cast row contains six complete walking poses. This 6x6 grid provides
  // independent cast and gait clocks without cutting or replacing body parts.
  const CAST_STATES=Array.from({length:6},(_,i)=>`walk_cast${i}`);
  if(typeof ImageAssets!=='undefined'){
    const load=ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll=async function loadCakeCastGrid(...args){
      const original=load.apply(this,args);
      const all=await Promise.all([original,...CAST_STATES.flatMap(state=>DIRS.map(dir=>
        this.loadImage(`player_${ID}_${state}_${dir}`,`${ROOT}/cake_deliver_cherry_${state}_${dir}.png?v=${BUILD}`)))]);
      return all[0];
    };
  }
  // Keep Common Hybrid: +1% ATK/+1% HP, Pink Burst damage, knockback and speed buff.
  const proto=CherriftGame.prototype;
  const facing=(x,y,fallback='down')=>Math.hypot(x,y)<.04?fallback:DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  const key=(s,d)=>`player_${ID}_${s}_${d}`;
  const move=proto.movePlayer;
  proto.movePlayer=function moveCake(v,dt){
    const p=this.player,x=p?.x,y=p?.y;const result=move.call(this,v,dt);
    if(p===this.player&&p?.skin===ID&&dt>0){
      const distance=Math.hypot(p.x-x,p.y-y);
      p.cakeStride=(p.cakeStride||0)+Math.min(dt,distance/Math.max(1,p.speed||235));
      if(Math.hypot(v.x,v.y)>.04)p.cakeFacing=facing(v.x,v.y,p.cakeFacing);
    }return result;
  };
  const fire=proto.autoFire;
  proto.autoFire=function fireCake(...args){
    const p=this.player;if(p?.skin!==ID)return fire.apply(this,args);
    if(p.cakeAttack||p.fireTimer>0||p.skillCastTimer>0)return;
    const target=this.nearest(760);if(!target||target.dead)return;
    const duration=config.states.attack.duration;
    p.fireTimer=p.fireInterval*(p.skillBuff>0?.55:1);
    p.attackDir=facing(target.x-p.x,target.y-p.y,p.cakeFacing);
    if(!p.moving)p.cakeFacing=p.attackDir;
    p.cakeAttack={elapsed:0,duration,target,fired:false};
    p.attackCastDuration=duration;p.attackCastTimer=duration;p.cakeIdleTime=0;
  };
  const skill=proto.skill;
  proto.skill=function burstCake(...args){
    const p=this.player;if(p?.skin!==ID)return skill.apply(this,args);
    if(p.skillTimer>0||p.skillCastTimer>0)return;
    const result=skill.apply(this,args);
    if(p.skillCastTimer>0){
      p.skillDir=p.cakeFacing||p.lastDir||'down';p.cakeAttack=null;p.attackCastTimer=0;p.cakeIdleTime=0;
    }return result;
  };
  const update=proto.update;
  proto.update=function updateCake(dt){
    const result=update.call(this,dt),p=this.player;
    if(p?.skin!==ID||this.mode!=='playing')return result;
    const a=p.cakeAttack;
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
      if(a.elapsed>=a.duration)p.cakeAttack=null;
    }
    p.cakeIdleTime=p.moving||p.cakeAttack||p.skillCastTimer>0?0:(p.cakeIdleTime||0)+Math.max(0,dt);
    return result;
  };
  function raw(ctx,image,frame,p,width,height){
    const cell=image.naturalHeight||image.height||192;
    ctx.drawImage(image,frame*cell,0,cell,cell,p.x-96*width/192,p.y+30-184*height/192,width,height);
  }
  const draw=proto.drawPlayer;
  proto.drawPlayer=function drawCake(ctx,p){
    if(p?.skin!==ID)return draw.call(this,ctx,p);
    const cast=p.skillCastTimer>0,attack=!cast&&p.cakeAttack,idle=p.cakeIdleTime||0;
    const state=cast?'skill':attack?(p.moving?'walk_attack':'attack'):p.moving?'walk':idle%8>=6?'idle2':'idle';
    const d=cast?p.skillDir:attack?p.attackDir:p.cakeFacing||p.lastDir;
    const dir=DIRS.includes(d)?d:'down';
    let renderState=state;
    if(state==='walk_attack')renderState=CAST_STATES[Math.min(5,Math.floor(attack.elapsed/attack.duration*6))];
    let image=this.assets.get(key(renderState,dir));
    if(!image){renderState=state;image=this.assets.get(key(state,dir));}
    image=image||this.assets.get(key('idle',dir))||this.assets.get(key('idle','down'));if(!image)return;
    const elapsed=cast?Math.max(0,(p.skillCastDuration||config.states.skill.duration)-p.skillCastTimer):state==='idle2'?idle%8-6:this.t||0;
    // The complete pose's row follows the shot cast; its column follows travel.
    const phase=state==='walk_attack'?((p.cakeStride||0)*8)%6:attack?Math.min(5,attack.elapsed/attack.duration*6):cast||state==='idle2'?Math.min(5,elapsed*FPS[state]):state==='walk'?((p.cakeStride||0)*8)%6:(elapsed*FPS[state])%6;
    const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95,height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95;
    ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.globalAlpha=1;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // Inspect the authored walking poses directly. Canvas imageSmoothing only
    // scales one complete image; no temporal blend, flow or leg rig is applied.
    if(state==='walk'||state==='walk_attack'){
      raw(ctx,image,Math.floor(phase),p,width,height);
      ctx.restore();return;
    }
    const smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
    if(!smooth?.draw(ctx,image,ID,renderState,dir,phase,p,width,height,{
      loop:state==='idle'||state==='walk'||state==='walk_attack',gaitPhase:(p.cakeStride||0)*8,
      makeFrame:(c,f)=>raw(c,image,f,{x:96,y:154},192,192)
    }))raw(ctx,image,Math.floor(phase),p,width,height);
    ctx.restore();
  };
  window.CHERRIFT_CAKE_CHERRY=Object.freeze({version:BUILD,directions:[...DIRS],movingCastStates:[...CAST_STATES]});
})();

