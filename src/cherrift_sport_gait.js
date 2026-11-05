/* Sport's own measured shorts/legs. Fixed soles, continuous ankle joins. */
(() => {
 'use strict';if(window.CHERRIFT_SPORT_GAIT)return;
 const root='assets/player/cherry_skins/sport_cherry/rig',mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'];
 const prepared=new WeakMap(),recent=new Map(),MAX=6;
 const canvas=()=>document.createElement('canvas');
 function make(){const c=canvas();c.width=c.height=192;return c;}
 if(typeof ImageAssets!=='undefined'){
  const load=ImageAssets.prototype.loadAll;
  ImageAssets.prototype.loadAll=async function(...args){const r=await load.apply(this,args);await Promise.all(dirs.flatMap(d=>[
   this.loadImage(`sportLeg_${d}`,`${root}/leg_${d}.png?v=1030-sport-chibi1`),
   ...['walk','walk_attack'].map(s=>this.loadImage(`sportBody_${s}_${d}`,`${root}/body_${s}_${d}.png?v=1030-sport-chibi1`))
  ]));return r;};
 }
 function pose(state,dir,phase,stride){
  const canonical=mirror[dir]||dir,data=window.CHERRIFT_SPORT_RIG,rig=data?.rigs[canonical],series=data?.pelvis[`${state}/${canonical}`];
  if(!rig||!series||!Number.isFinite(phase)||!Number.isFinite(stride))return null;
  const flip=!!mirror[dir],pos=state==='walk'?((phase%6)+6)%6:Math.max(0,Math.min(5,phase)),f=Math.floor(pos),n=state==='walk'?(f+1)%6:Math.min(5,f+1),t=pos-f;
  const current=series[f].map((v,i)=>v+(series[n][i]-v)*t),ref=data.pelvis[`walk/${canonical}`][0];
  const bodyShiftX=(ref[0]-current[0])*(flip?-1:1),bodyShiftY=ref[1]-current[1]+2;
  const hips=rig.hips.map(([x,y])=>[flip?192-x:x,y]);
  const side=canonical==='right',diagonal=canonical.includes('right'),sign=flip?-1:1;
  const legs=hips.map((hip,i)=>{
   const theta=-stride*Math.PI/3+i*Math.PI,swing=Math.max(0,Math.sin(theta));
   const dx=(side?7.5:diagonal?5.7:1.3)*Math.cos(theta)*sign;
   const sole=[hip[0]+dx,184-3.6*swing*swing];
   return {hip,sole};
  });return{frame:f,next:n,fraction:t,bodyShiftX,bodyShiftY,legs,rig,flip};
 }
 function prepare(leg,dir,rig){
  let e=prepared.get(leg);if(e){recent.delete(e);recent.set(e,true);return e;}
  const upper=make(),foot=make(),y=rig.joint;
  upper.getContext('2d').drawImage(leg,0,0,192,y+.5,0,0,192,y+.5);
  foot.getContext('2d').drawImage(leg,0,y-.5,192,192-y+.5,0,y-.5,192,192-y+.5);
  e={upper,foot,out:make(),fallback:make(),leg};prepared.set(leg,e);recent.set(e,true);
  while(recent.size>MAX){const old=recent.keys().next().value;recent.delete(old);prepared.delete(old.leg);}return e;
 }
 function drawLeg(c,e,plan,target,dim=false){
  const rig=plan.rig,sx=plan.flip?192-rig.sole[0]:rig.sole[0],hx=plan.flip?192-rig.hip[0]:rig.hip[0];
  const tx=target.sole[0]-sx,ty=target.sole[1]-rig.sole[1],length=rig.joint-rig.hip[1];
  const dx=target.hip[0]-(hx+tx),dy=target.hip[1]-(rig.hip[1]+ty);
  // The affine upper leg exactly agrees with the translated sneaker on y=joint.
  c.save();c.transform(1,0,-dx/length,1-dy/length,tx+dx*rig.joint/length,ty+dy*rig.joint/length);c.drawImage(e.upper,0,0);c.restore();
  c.drawImage(e.foot,tx,ty);
 }
 function draw(game,ctx,state,dir,phase,stride,p,width,height){
  const plan=pose(state,dir,phase,stride),body=game.assets.get(`sportBody_${state}_${dir}`),leg=game.assets.get(`sportLeg_${dir}`),smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
  if(!plan||!body||!leg||!smooth||typeof document==='undefined')return false;
  const e=prepare(leg,dir,plan.rig),sample=smooth.sample(body,'sport_cherry',state,dir,phase,(c,f)=>c.drawImage(body,f*192,0,192,192,0,0,192,192),{loop:state==='walk'});
  const c=e.out.getContext('2d');c.clearRect(0,0,192,192);
  for(const i of [1,0])drawLeg(c,e,plan,plan.legs[i]);
  if(sample)c.drawImage(sample,64,64,128,128,plan.bodyShiftX,plan.bodyShiftY,192,192);
  else c.drawImage(body,plan.frame*192,0,192,192,plan.bodyShiftX,plan.bodyShiftY,192,192);
  ctx.drawImage(e.out,p.x-96*width/192,p.y+30-184*height/192,width,height);return true;
 }
 window.CHERRIFT_SPORT_GAIT=Object.freeze({draw,pose,stats:()=>({cached:recent.size,maxCached:MAX})});
})();
