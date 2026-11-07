/* Shared Common skill visuals: Healing, Shield and Pink Burst by category.
   No health, damage, buffs or cooldowns are changed here. */
(() => {
 'use strict';
 if(!window.CherriftGame||window.CHERRIFT_COMMON_SKILL_VFX)return;
 const KEY='commonHealingAtlas',SOURCE='assets/effects/common_healing/healing_atlas.png?v=1107-kimono-healing1';
 if(typeof ImageAssets!=='undefined'){
  const load=ImageAssets.prototype.loadAll;
  ImageAssets.prototype.loadAll=async function(...args){const r=await load.apply(this,args);await this.loadImage(KEY,SOURCE);return r;};
 }
 const proto=CherriftGame.prototype,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const types=new Set(['common_heal','common_shield','common_pink_burst']);
 function skillType(game,p){return p&&window.CHERRIFT_CONFIG?.player?.skins?.[p.skin]?.skillType;}
 function stamp(c,img,cell,x,y,w,h=w,rotation=0,opacity=1){
  if(!(opacity>0&&w>0&&h>0))return;
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  c.save();c.globalAlpha*=clamp(opacity,0,1);c.translate(x,y);if(rotation)c.rotate(rotation);
  c.drawImage(img,cell%3*iw/3,Math.floor(cell/3)*ih/2,iw/3,ih/2,-w/2,-h/2,w,h);c.restore();
 }
 const skill=proto.skill;
 proto.skill=function commonSkillArt(...args){
  const p=this.player,type=skillType(this,p);if(!types.has(type))return skill.apply(this,args);
  const start=(this.effects||[]).length,result=skill.apply(this,args);
  // Only effects emitted by an accepted cast are tagged, so a rejected repeat
  // press cannot replay art. The original Common implementation owns mechanics.
  for(const e of (this.effects||[]).slice(start)){
   if(type==='common_heal'&&e.type==='commonHealV091'){
    e.commonHealing=true;e.healTarget=p;e.life=.95;
   }else if(type==='common_pink_burst'&&e.type==='commonHybridBurstV091'){
    e.schoolPinkBurst=true;e.life=.72;
   }else if(type==='common_shield'&&e.type==='commonShieldCastV091')e.sportShield=true;
   else if(e.type==='skillPulseV085'){
    if(type==='common_heal')e.commonHealingPulse=true;
    else if(type==='common_pink_burst')e.schoolBurstPulse=true;
   }
  }return result;
 };
 function healing(game,c,e,layer='all'){
  const img=game.assets.get(KEY);if(!img)return false;
  const t=clamp(Number(e.t||0)/Math.max(.001,e.life||.95),0,1);if(t>=1)return true;
  const target=e.healTarget===game.player?e.healTarget:null,x=target?.x??e.x,y=(target?.y??(e.y+18))+20;
  const low=game.save?.settings?.effectQuality==='low',rise=1-Math.pow(1-t,2),fade=Math.pow(1-t,1.2),size=98+rise*45;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(layer!=='front'){
   stamp(c,img,4,x,y,size*1.18,size*.72,-t*.2,.58*fade);
   stamp(c,img,0,x,y,size,size*.58,t*.12,.85*fade);
  }
  if(layer!=='ground'){
   // Rounded mint recovery light rather than the Hybrid's outward explosion.
   stamp(c,img,1,x,y-28-t*9,58+rise*18,58+rise*18,0,.65*Math.pow(1-t,2));
   if(!low){
    stamp(c,img,2,x,y-48-rise*22,98,116+rise*20,-t*.18,.48*fade);
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4+t*.9,r=24+rise*18,px=x+Math.cos(a)*r,py=y-22+Math.sin(a)*12-rise*(32+i%3*8);
     stamp(c,img,i%3===0?5:3,px,py,11+i%3*3,11+i%3*3,t*.35,fade*.75);
    }
   }
  }
  c.restore();return true;
 }
 const ground=proto.drawGround;
 proto.drawGround=function commonHealingGround(...args){
  const result=ground?.apply(this,args);
  for(const e of this.effects||[])if(e.commonHealing)healing(this,args[0],e,'ground');
  return result;
 };
 const effect=proto.drawEffect;
 proto.drawEffect=function commonHealingEffect(c,e){
  if(e?.commonHealing&&healing(this,c,e,'front'))return;
  if(e?.commonHealingPulse&&this.assets.get(KEY))return;
  return effect.call(this,c,e);
 };
 const draw=proto.drawPlayer;
 proto.drawPlayer=function sharedCommonPlayerArt(c,p){
  const type=skillType(this,p),sharedShield=type==='common_shield'&&p.skin!=='sport_cherry'&&window.CHERRIFT_SPORT_VFX&&this.assets.get('sportCherryAtlas');
  let result;
  if(sharedShield){
   // Suppress only the old generic shield ring during this render; restore the
   // timer before invoking the shared Sport shield. No update/combat runs here.
   const timer=p.commonShieldTimer;p.commonShieldTimer=0;
   try{result=draw.call(this,c,p);}finally{p.commonShieldTimer=timer;}
   window.CHERRIFT_SPORT_VFX.shield(this,c,p);
  }else result=draw.call(this,c,p);
  if(type==='common_heal'&&p.commonSpeedBuffTimer>0&&this.save?.settings?.effectQuality!=='low'){
   const img=this.assets.get(KEY);if(img){const age=this.t||0,alpha=Math.min(1,p.commonSpeedBuffTimer/.25)*.42;
    for(let i=0;i<3;i++){const a=age*2+i*Math.PI*2/3;stamp(c,img,3,p.x+Math.cos(a)*24,p.y-5+Math.sin(a)*12,11,11,0,alpha);}
   }
  }return result;
 };
 window.CHERRIFT_COMMON_SKILL_VFX=Object.freeze({version:'1107-kimono-healing1',healing,assetKey:KEY,source:SOURCE});
})();
