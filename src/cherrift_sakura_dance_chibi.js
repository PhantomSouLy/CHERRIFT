/* Sakura Dance Cherry: cosmetic artwork/idle overlay. Keep the legacy skin ID,
   two-sword damage, Blossom Spin, petals, kill CDR and speed bonuses intact. */
(() => {
 'use strict';
 if(!window.CherriftGame || !window.CHERRIFT_CONFIG || window.CHERRIFT_SAKURA_DANCE_CHIBI)return;
 const ID='wuxia_sakura_cherry',skin=CHERRIFT_CONFIG.player.skins[ID];if(!skin)return;
 const VERSION='1028-sakura-dance1',ROOT='assets/player/cherry_skins/sakura_dance_cherry/sheets192';
 const DIRS=['right','down_right','down','down_left','left','up_left','up','up_right'];
 const old=skin.states,attackDuration=old.attack.duration || 1/3,skillDuration=old.skill.duration || .375;
 function state(name,fps,duration=6/fps){return {frames:6,fps,duration,pivot:{x:96,y:184},loop:['idle','walk'].includes(name),
  dirs:Object.fromEntries(DIRS.map(d=>[d,`${ROOT}/sakura_dance_cherry_${name}_${d}.png?v=${VERSION}`]))};}
 skin.states={idle:state('idle',3),idle2:state('idle2',3),idle3:state('idle3',3),walk:state('walk',8),
  attack:state('attack',6/attackDuration,attackDuration),walk_attack:state('walk_attack',6/attackDuration,attackDuration),skill:state('skill',6/skillDuration,skillDuration)};
 function facing(x,y,fallback='down'){return Math.hypot(x,y)<.04?(DIRS.includes(fallback)?fallback:'down'):DIRS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];}
 function random(p){let s=p.sakuraIdleSeed;if(!Number.isInteger(s))s=(Date.now()^Math.floor((p.x||0)*31+(p.y||0)*17))>>>0;
  s=(Math.imul(s,1664525)+1013904223)>>>0;p.sakuraIdleSeed=s;return s/4294967296;}
 function cancel(p){p.sakuraIdleVariant=null;p.sakuraIdleElapsed=0;p.sakuraIdleWait=undefined;}
 const proto=CherriftGame.prototype,move=proto.movePlayer;
 proto.movePlayer=function moveSakuraDance(v,dt){
  const p=this.player,x=p?.x,y=p?.y,result=move.call(this,v,dt);
  if(p?.skin===ID && this.player===p){
   if(Math.hypot(v.x,v.y)>.04)p.sakuraFacing=facing(v.x,v.y,p.sakuraFacing);
   if(dt>0)p.sakuraStride=(p.sakuraStride||0)+Math.min(dt,Math.hypot(p.x-x,p.y-y)/Math.max(1,p.speed||235));
  }return result;
 };
 const fire=proto.autoFire;
 proto.autoFire=function fireSakuraDance(...args){
  const p=this.player,before=p?.fireTimer,result=fire.apply(this,args);
  if(p?.skin===ID && this.player===p && p.fireTimer>before && p.attackCastTimer>0){
   const fx=[...(this.effects||[])].reverse().find(e=>e.type==='wuxia_attack_arc');
   p.sakuraAttackFacing=fx?facing(Math.cos(fx.angle),Math.sin(fx.angle),p.sakuraFacing):p.attackDir;
   if(!p.moving)p.sakuraFacing=p.sakuraAttackFacing;cancel(p);
  }return result;
 };
 const skill=proto.skill;
 proto.skill=function skillSakuraDance(...args){
  const p=this.player,before=p?.skillTimer,dir=p?.sakuraFacing||p?.lastDir||'down',result=skill.apply(this,args);
  if(p?.skin===ID && this.player===p && p.skillTimer>before && p.skillCastTimer>0){p.sakuraSkillFacing=dir;cancel(p);}
  return result;
 };
 const update=proto.update;
 proto.update=function updateSakuraDance(dt){
  const p=this.player;if(p?.skin!==ID)return update.call(this,dt);
  if(this.mode!=='playing')return;
  const result=update.call(this,dt);if(this.player!==p)return result;
  if(p.moving || p.attackCastTimer>0 || p.skillCastTimer>0){cancel(p);return result;}
  const delta=Math.max(0,Number(dt)||0);
  if(p.sakuraIdleWait===undefined)p.sakuraIdleWait=4+random(p)*4;
  if(p.sakuraIdleVariant){
   p.sakuraIdleElapsed+=delta;
   if(p.sakuraIdleElapsed>=skin.states[p.sakuraIdleVariant].duration){p.sakuraLastIdle=p.sakuraIdleVariant;p.sakuraIdleVariant=null;p.sakuraIdleElapsed=0;p.sakuraIdleWait=4+random(p)*4;}
  }else{
   p.sakuraIdleWait-=delta;
   if(p.sakuraIdleWait<=0){
    // Alternate the extra gestures; random waits keep their appearances varied.
    p.sakuraIdleVariant=p.sakuraLastIdle?(p.sakuraLastIdle==='idle2'?'idle3':'idle2'):(random(p)<.5?'idle2':'idle3');p.sakuraIdleElapsed=0;
   }
  }return result;
 };
 const draw=proto.drawPlayer;
 proto.drawPlayer=function drawSakuraDance(ctx,p){
  if(p?.skin!==ID)return draw.call(this,ctx,p);
  const cast=p.skillCastTimer>0,attacking=!cast&&p.attackCastTimer>0;
  let name=cast?'skill':attacking?(p.moving?'walk_attack':'attack'):p.moving?'walk':p.sakuraIdleVariant||'idle';
  let dir=cast?p.sakuraSkillFacing||p.skillDir:attacking?p.sakuraAttackFacing||p.attackDir:p.sakuraFacing||p.lastDir;
  dir=DIRS.includes(dir)?dir:'down';
  let image=this.assets.get(`player_${ID}_${name}_${dir}`);
  if(!image){name='idle';image=this.assets.get(`player_${ID}_idle_${dir}`);}
  if(!image){dir='down';image=this.assets.get(`player_${ID}_idle_down`);}if(!image)return;
  const config=skin.states[name],count=Math.min(6,Math.floor((image.naturalWidth||image.width)/192));if(count<1)return;
  let frame;
  if(name==='skill'||name==='attack'||name==='walk_attack'){
   const duration=cast?p.skillCastDuration||skillDuration:p.attackCastDuration||attackDuration,timer=cast?p.skillCastTimer:p.attackCastTimer;
   frame=Math.min(count-1,Math.floor(Math.max(0,duration-timer)/duration*count));
  }else if(name==='idle2'||name==='idle3')frame=Math.min(count-1,Math.floor((p.sakuraIdleElapsed||0)*config.fps));
  else frame=Math.floor((name==='walk'?p.sakuraStride||0:this.t||0)*config.fps)%count;
  const gaitPhase=((p.sakuraStride||0)*8)%6;
  const gait=window.CHERRIFT_SAKURA_DANCE_GAIT?.get(image,this.assets.get(`player_${ID}_idle_${dir}`),name,dir,frame,gaitPhase);
  const width=(CHERRIFT_CONFIG.player.displayWidth||116)*.95*4/3,height=(CHERRIFT_CONFIG.player.displayHeight||116)*.95*4/3;
  ctx.save();ctx.globalAlpha*=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y+25,26,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(gait||image,gait?0:frame*192,0,192,192,p.x-width/2,p.y+30-184*height/192,width,height);ctx.restore();
 };
 window.CHERRIFT_SAKURA_DANCE_CHIBI=Object.freeze({version:VERSION,motionVersion:'1028-sakura-motion2',id:ID,directions:[...DIRS],idleVariants:['idle','idle2','idle3']});
})();
