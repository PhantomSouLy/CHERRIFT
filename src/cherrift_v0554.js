(() => {
"use strict";

const VERSION="0.5.5.4-ninja-alignment-hybrid";
if(!window.CherriftGame||!window.CHERRIFT_V0553){console.error("[v0.5.5.4] v0.5.5.3 required");return}

const proto=CherriftGame.prototype;
const FRAME_W=192, FRAME_H=192;
const alphaCache=new WeakMap();

function alphaFrames(img,frames){
  let cached=alphaCache.get(img);
  if(cached&&cached.frames===frames)return cached.bounds;
  const canvas=document.createElement("canvas");
  canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,img.width,img.height).data;
  const sourceW=img.width/frames, bounds=[];
  for(let f=0;f<frames;f++){
    let minX=sourceW,minY=img.height,maxX=-1,maxY=-1;
    const x0=Math.floor(f*sourceW),x1=Math.floor((f+1)*sourceW);
    for(let y=0;y<img.height;y++)for(let x=x0;x<x1;x++){
      if(data[(y*img.width+x)*4+3]<8)continue;
      const lx=x-x0;
      if(lx<minX)minX=lx;if(lx>maxX)maxX=lx;
      if(y<minY)minY=y;if(y>maxY)maxY=y;
    }
    bounds.push(maxX<0?{cx:sourceW/2,bottom:img.height-8}:{cx:(minX+maxX)/2,bottom:maxY});
  }
  alphaCache.set(img,{frames,bounds});
  return bounds;
}

function drawAligned(game,ctx,p,stateName,dir,state,img){
  const frames=Math.max(1,state.frames||Math.round(img.width/FRAME_W)||1);
  const sourceW=img.width/frames, sourceH=img.height;
  let frame=0;
  if(stateName==="skill"||stateName==="attack"){
    const duration=p.attackCastTimer>0?p.attackCastDuration:(p.skillCastDuration||state.duration||.4);
    const timer=p.attackCastTimer>0?p.attackCastTimer:p.skillCastTimer;
    const elapsed=Math.max(0,duration-timer);
    frame=Math.min(frames-1,Math.floor(elapsed*(state.fps||14)));
  }else frame=Math.floor(game.t*(state.fps||6))%frames;

  const box=alphaFrames(img,frames)[frame];
  const cfg=CHERRIFT_CONFIG.player;
  const dw=cfg.displayWidth||116, dh=cfg.displayHeight||116;
  const sx=frame*sourceW;
  const scaleX=dw/sourceW,scaleY=dh/sourceH;

  // Every frame is anchored to the same world-space foot point and visual center.
  const visualCenterOffset=(box.cx-sourceW/2)*scaleX;
  const visualBottomOffset=(sourceH-box.bottom)*scaleY;
  const dx=Math.round(p.x-dw/2-visualCenterOffset);
  const dy=Math.round(p.y-dh+34+visualBottomOffset);

  ctx.drawImage(img,sx,0,sourceW,sourceH,dx,dy,dw,dh);
}

const oldStart=proto.start;
proto.start=async function(...args){
  const result=await oldStart.apply(this,args);
  if(this.player?.skin==="ninja_cherry"){
    this.player.attackCastTimer=0;
    this.player.attackCastDuration=0;
    this.player.ninjaMeleeRange=132;
  }
  return result;
};

const oldUpdate=proto.update;
proto.update=function(dt){
  if(this.player)this.player.attackCastTimer=Math.max(0,(this.player.attackCastTimer||0)-dt);
  return oldUpdate.call(this,dt);
};

function dirFromVector(dx,dy){
  return Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");
}

function meleeSlash(game,target){
  const p=game.player;
  const dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy)||1;
  p.lastDir=dirFromVector(dx,dy);
  p.attackDir=p.lastDir;
  p.attackCastDuration=.34;
  p.attackCastTimer=.34;
  p.fireTimer=Math.max(.34,p.fireInterval);

  const nx=dx/len,ny=dy/len;
  for(const enemy of game.enemies){
    if(enemy.dead)continue;
    const ex=enemy.x-p.x,ey=enemy.y-p.y,d=Math.hypot(ex,ey)||1;
    if(d>145+enemy.r)continue;
    const dot=(ex/d)*nx+(ey/d)*ny;
    if(dot<.28)continue;
    game.damageEnemy(enemy,p.damage*1.25);
    enemy.poisonDamageV0553=(enemy.poisonDamageV0553||0)+p.damage*.05;
    enemy.poisonTimeV0553=Math.max(enemy.poisonTimeV0553||0,2);
    game.effects.push({type:"ninja_melee_arc",x:p.x,y:p.y,angle:Math.atan2(ny,nx),t:0,life:.28});
  }
}

const oldAutoFire=proto.autoFire;
proto.autoFire=function(){
  const p=this.player;
  if(!p||p.skin!=="ninja_cherry")return oldAutoFire.call(this);
  if(p.fireTimer>0)return;
  const target=this.nearest();
  if(!target)return;
  const distance=Math.hypot(target.x-p.x,target.y-p.y);
  if(distance<=p.ninjaMeleeRange+target.r){
    meleeSlash(this,target);
    return;
  }
  return oldAutoFire.call(this);
};

const oldDrawPlayer=proto.drawPlayer;
proto.drawPlayer=function(ctx,p){
  if(p.skin!=="ninja_cherry")return oldDrawPlayer.call(this,ctx,p);

  const skin=this.activeSkinConfig();
  const skillActive=(p.skillCastTimer||0)>0;
  const meleeActive=(p.attackCastTimer||0)>0;
  const dir=meleeActive?(p.attackDir||p.lastDir||"down"):
    skillActive?(p.skillDir||p.lastDir||"down"):(p.lastDir||"down");

  // Until dedicated attack files exist, melee uses the sword-slash skill sheet.
  const stateName=meleeActive?"attack":skillActive?"skill":p.moving?"walk":"idle";
  const actualStateName=stateName==="attack"&&!skin.states.attack?"skill":stateName;
  const state=skin.states[actualStateName];
  const img=this.assets.get(`player_${p.skin}_${actualStateName}_${dir}`);

  if(img){
    drawAligned(this,ctx,p,stateName,dir,state,img);
    return;
  }
  oldDrawPlayer.call(this,ctx,p);
};

const oldDrawEffect=proto.drawEffect;
proto.drawEffect=function(ctx,e){
  if(e.type!=="ninja_melee_arc")return oldDrawEffect.call(this,ctx,e);
  const a=Math.max(0,1-e.t/e.life);
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.rotate(e.angle||0);
  ctx.globalAlpha=a;
  ctx.strokeStyle="#d7b8ff";
  ctx.shadowColor="#8c50ff";
  ctx.shadowBlur=14;
  ctx.lineWidth=7;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.arc(0,0,74,-.72,.72);
  ctx.stroke();
  ctx.restore();
};

// Optional future dedicated attack sheets:
// add skin.states.attack and ImageAssets will load them automatically on a fresh page load.
const ninja=CHERRIFT_CONFIG.player.skins.ninja_cherry;
ninja.hybridAttack=true;
ninja.meleeRange=132;
ninja.meleeDamageMult=1.25;
ninja.attackFallbackState="skill";

window.CHERRIFT_V0554={version:VERSION};
console.info("[CHERRIFT] v0.5.5.4 Ninja alignment + hybrid combat loaded.");
})();