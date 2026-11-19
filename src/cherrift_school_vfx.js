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
  const spread=1-Math.pow(1-clamp(t/.72,0,1),3);
  const fade=1-clamp((t-.18)/.82,0,1),diameter=r*2;
  c.save();
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(layer!=='front'){
   stamp(c,img,4,e.x,e.y,diameter,diameter,t*.24,.66*fade);
   const size=diameter*(.34+.66*spread);
   stamp(c,img,0,e.x,e.y,size,size,0,fade);
  }
  if(layer!=='ground'){
   const waveRadius=r*(.22+.78*spread);
   // The solid crest stays readable over the training dirt and in Low quality.
   c.beginPath();c.arc(e.x,e.y,waveRadius,0,Math.PI*2);
   c.globalAlpha=.9*fade;c.lineWidth=9;c.strokeStyle='#ed317f';c.stroke();
   c.lineWidth=3;c.strokeStyle='#ffe0f0';c.stroke();
   c.globalAlpha=1;
   const bloomSize=72+diameter*.32*spread;
   stamp(c,img,1,e.x,e.y-8,bloomSize,bloomSize,t*.12,fade);
   if(!low)stamp(c,img,2,e.x,e.y-16-t*24,90+spread*100,90+spread*110,-t*.35,.54*fade);
   const count=low?6:12;
   for(let i=0;i<count;i++){
    const angle=i*Math.PI*2/count+.21;
    const x=e.x+Math.cos(angle)*waveRadius,y=e.y+Math.sin(angle)*waveRadius;
    const size=18+(i%3)*5;
    stamp(c,img,i%3===0?5:3,x,y-t*(10+i%3*6),size,size,angle+t*(i%2?1:-1),fade);
   }
  }
  c.restore();return true;
 }
 const effect=proto.drawEffect;
 proto.drawEffect=function schoolBurstEffect(c,e){
  // Meadow and Training use their own ground renderer, so draw the whole
  // burst through the world effect pass they share with the other maps.
  if(e?.schoolPinkBurst&&burst(this,c,e))return;
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
 window.CHERRIFT_SCHOOL_VFX=Object.freeze({version:'1119-school-burst3',burst,assetKey:KEY,source:SOURCE});
})();
