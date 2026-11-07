/* School Pink Burst: imagegen art, visual hooks only. Combat stays in Common. */
(() => {
 'use strict';
 if(!window.CherriftGame||window.CHERRIFT_SCHOOL_VFX)return;
 const ID='school_uniform_cherry',KEY='schoolPinkBurstAtlas';
 const SOURCE='assets/effects/school_cherry/pink_burst_atlas.png?v=1107-school-burst2';
 if(typeof ImageAssets!=='undefined'){
  const load=ImageAssets.prototype.loadAll;
  ImageAssets.prototype.loadAll=async function(...args){const r=await load.apply(this,args);await this.loadImage(KEY,SOURCE);return r;};
 }
 const proto=CherriftGame.prototype,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function stamp(c,img,cell,x,y,w,h=w,rotation=0,opacity=1){
  if(!(opacity>0&&w>0&&h>0))return;
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  c.save();c.globalAlpha*=clamp(opacity,0,1);c.translate(x,y);if(rotation)c.rotate(rotation);
  c.drawImage(img,cell%3*iw/3,Math.floor(cell/3)*ih/2,iw/3,ih/2,-w/2,-h/2,w,h);c.restore();
 }
 const skill=proto.skill;
 proto.skill=function schoolBurstVfx(...args){
  const p=this.player;if(p?.skin!==ID)return skill.apply(this,args);
  const start=(this.effects||[]).length,r=skill.apply(this,args);
  // Tag the effect emitted by the real successful skill. Never emit another
  // damage event or infer success from a timer that may already be active.
  for(const e of (this.effects||[]).slice(start)){
   if(e.type==='commonHybridBurstV091'){e.schoolPinkBurst=true;e.life=.72;}
   else if(e.type==='skillPulseV085')e.schoolBurstPulse=true;
  }return r;
 };
 function burst(game,c,e,layer='all'){
  const img=game.assets.get(KEY);if(!img)return false;
  const t=clamp(Number(e.t||0)/Math.max(.001,e.life||.72),0,1),r=e.r||185;
  if(t>=1)return true;
  const low=game.save?.settings?.effectQuality==='low';
  const spread=1-Math.pow(1-clamp(t/.66,0,1),3),fade=Math.pow(1-t,1.3),diameter=r*2;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  // The sigil describes the original circular damage footprint at cast position.
  if(layer!=='front'){
  stamp(c,img,4,e.x,e.y,diameter,diameter,t*.24,.42*fade);
  stamp(c,img,0,e.x,e.y,diameter*(.24+.76*spread),diameter*(.24+.76*spread),0,.95*fade);
  }
  if(layer!=='ground'){
  // Brief central bloom and rising wisps, followed by the expanding petal wave.
  stamp(c,img,1,e.x,e.y-8,52+diameter*.30*spread,52+diameter*.30*spread,t*.12,Math.pow(1-t,3)*.9);
  if(!low){
   stamp(c,img,2,e.x,e.y-16-t*24,80+spread*100,80+spread*110,-t*.35,.28*fade);
   const count=12;
   for(let i=0;i<count;i++){
    const angle=i*Math.PI*2/count+.21,reach=r*(.18+.8*spread),x=e.x+Math.cos(angle)*reach,y=e.y+Math.sin(angle)*reach;
    const size=12+(i%3)*4;
    stamp(c,img,i%3===0?5:3,x,y-t*(10+i%3*6),size,size,angle+t*(i%2?1:-1),fade*.85);
   }
  }
  }
  c.restore();return true;
 }
 const ground=proto.drawGround;
 proto.drawGround=function schoolBurstGround(...args){
  const r=ground?.apply(this,args);
  for(const e of this.effects||[])if(e.schoolPinkBurst)burst(this,args[0],e,'ground');
  return r;
 };
 const effect=proto.drawEffect;
 proto.drawEffect=function schoolBurstEffect(c,e){
  if(e?.schoolPinkBurst&&burst(this,c,e,'front'))return;
  if(e?.schoolBurstPulse&&this.assets.get(KEY))return;
  return effect.call(this,c,e);
 };
 // The existing one-second speed buff gets a restrained trailing sparkle cue.
 const draw=proto.drawPlayer;
 proto.drawPlayer=function schoolBurstPlayer(c,p){
  const r=draw.call(this,c,p),img=p?.skin===ID&&p.commonSpeedBuffTimer>0&&this.assets.get(KEY);
  if(img&&this.save?.settings?.effectQuality!=='low'){
   const time=this.t||0,alpha=Math.min(1,p.commonSpeedBuffTimer/.2)*.48;
   for(let i=0;i<3;i++){
    const a=time*2+i*Math.PI*2/3;
    stamp(c,img,3,p.x+Math.cos(a)*27,p.y+10-Math.sin(time*4+i)*13,11,11,a,alpha);
   }
  }return r;
 };
 window.CHERRIFT_SCHOOL_VFX=Object.freeze({version:'1107-school-burst2',burst,assetKey:KEY,source:SOURCE});
})();
