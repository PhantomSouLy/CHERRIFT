/* Whole-pose School motion. Never cut, duplicate, or composite individual limbs. */
(() => {
 'use strict';if(window.CHERRIFT_SCHOOL_GAIT)return;
 const ID='school_uniform_cherry',mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 const vectors={right:[1,0],down_right:[Math.SQRT1_2,Math.SQRT1_2],down:[0,1],down_left:[-Math.SQRT1_2,Math.SQRT1_2],left:[-1,0],up_left:[-Math.SQRT1_2,-Math.SQRT1_2],up:[0,-1],up_right:[Math.SQRT1_2,-Math.SQRT1_2]};
 const sourceState=state=>state==='walk'?'idle':state==='walk_attack'?'attack':null;
 let activeTravel;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function pose(state,dir,phase,stride,travelDir=dir){
  const canonical=mirror[dir]||dir,series=window.CHERRIFT_SCHOOL_WHOLE_POSE?.[`${sourceState(state)}/${canonical}`];
  if(!series||!Number.isFinite(phase)||!Number.isFinite(stride))return null;
  const pos=state==='walk'?((phase%6)+6)%6:clamp(phase,0,5),f=Math.floor(pos),n=state==='walk'?(f+1)%6:Math.min(5,f+1),t=pos-f;
  const bones=series[f].map((v,i)=>v+(series[n][i]-v)*t);
  // Bones describe the two ORIGINAL legs in the complete frame, in padded
  // coordinates used by the shared, continuous inverse warp.
  const padded=bones.map((v,i)=>64+v*2/3);
  if(mirror[dir])for(const i of [0,2,4,6])padded[i]=256-padded[i];
  const direction=vectors[travelDir]||vectors[dir],side=canonical==='right';
  const legs=[0,1].map(i=>{
   const angle=stride*Math.PI/3+i*Math.PI;
   // During contact (sin >= 0), cos decreases: the foot travels BACKWARDS
   // along actual travel. On the return stroke it lifts and travels forwards.
   const ground=(side?3.6:2.8)*Math.cos(angle),lift=(side?2.6:2)*Math.max(0,-Math.sin(angle))**2;
   return [direction[0]*ground,direction[1]*ground*.65-lift];
  });
  const separation=Math.abs(padded[2]-padded[6]);
  const knee=side?[0,1].map(i=>direction[0]*.8*Math.max(0,-Math.sin(stride*Math.PI/3+i*Math.PI))**2):[0,0];
  return {a:padded.slice(0,4),b:padded.slice(4),stride:legs.flat(),body:knee,radius:(side?-1:1)*(clamp(separation*.28,2.8,4.2)+(side&&state==='walk'?100:0)),frame:f,next:n,fraction:t,travel:direction};
 }
 // Reuse the already installed whole-pose inverse/shader. Only landmarks,
 // pose selection and the independent travel clock belong to this skin.
 const cycle=window.CHERRIFT_WALK_CYCLE;
 if(cycle&&window.CHERRIFT_SPORT_GAIT){
  window.CHERRIFT_WALK_CYCLE=Object.freeze({...cycle,pose(id,state,dir,f,n,t,stride){
   return id===ID&&sourceState(state)?pose(state,dir,f+t,stride,activeTravel||dir):cycle.pose(id,state,dir,f,n,t,stride);
  }});
 }else return;
 function draw(game,ctx,state,dir,phase,stride,p,width,height){
  const source=sourceState(state),image=source&&game.assets.get(`player_${ID}_${source}_${dir}`),smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
  if(!image||!smooth||!cycle||!pose(state,dir,phase,stride,p.schoolFacing||dir))return false;
  activeTravel=p.schoolFacing||dir;
  try{
   // Keep a single authored body pose. Optical crossfading between a tucked
   // arm and a fully extended arm painted translucent extra arms/legs.
   // Foot motion still follows the independent continuous stride clock.
   const frame=pose(state,dir,phase,stride,activeTravel).frame;
   const drawn=smooth.draw(ctx,image,ID,state,dir,frame,p,width,height,{
    loop:state==='walk',gaitPhase:stride,
    makeFrame:(c,f)=>c.drawImage(image,f*192,0,192,192,0,0,192,192)
   });
   if(!drawn)ctx.drawImage(image,frame*192,0,192,192,p.x-96*width/192,p.y+30-184*height/192,width,height);
   return true;
  }finally{activeTravel=undefined;}
 }
 window.CHERRIFT_SCHOOL_GAIT=Object.freeze({draw,pose,sourceState,version:'1107-school-burst2'});
})();
