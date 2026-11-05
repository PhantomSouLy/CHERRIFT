/* Whole-pose Sport motion. Never cut, duplicate, or composite individual limbs. */
(() => {
 'use strict';if(window.CHERRIFT_SPORT_GAIT)return;
 const ID='sport_cherry',mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 const vectors={right:[1,0],down_right:[Math.SQRT1_2,Math.SQRT1_2],down:[0,1],down_left:[-Math.SQRT1_2,Math.SQRT1_2],left:[-1,0],up_left:[-Math.SQRT1_2,-Math.SQRT1_2],up:[0,-1],up_right:[Math.SQRT1_2,-Math.SQRT1_2]};
 const sourceState=state=>state==='walk'?'idle':state==='walk_attack'?'attack':null;
 let activeTravel;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function pose(state,dir,phase,stride,travelDir=dir){
  const canonical=mirror[dir]||dir,series=window.CHERRIFT_SPORT_WHOLE_POSE?.[`${sourceState(state)}/${canonical}`];
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
 // A negative radius tags ONLY Sport's left/right poses. Below -100
 // additionally tags plain Walk's complete shoe-contour mapping. In this branch,
 // motion reaches full strength at the lower shin instead of only the sole.
 // The shorts/hip boundary stays fixed and the original complete art stays
 // connected. The same equations run in WebGL, Canvas and the CPU reference.
 const cycle=window.CHERRIFT_WALK_CYCLE;
 function sideDisplacement(x,y,p,out){
  const ra=clamp((y-p.a[1])/Math.max(4,p.a[3]-p.a[1]),0,1),rb=clamp((y-p.b[1])/Math.max(4,p.b[3]-p.b[1]),0,1);
  const ca=p.a[0]+(p.a[2]-p.a[0])*ra,cb=p.b[0]+(p.b[2]-p.b[0])*rb;
  const clean=p.radius<-100,radius=clean?p.radius+100:p.radius;
  const wa=Math.exp(-(((x-ca)/radius)**2)),wb=Math.exp(-(((x-cb)/radius)**2)),total=wa+wb+.025;
  const ta=clamp(ra/.62,0,1),tb=clamp(rb/.62,0,1),fa=ta*ta*(3-2*ta),fb=tb*tb*(3-2*tb);
  if(!clean){
   out[0]=((p.stride[0]*fa+p.body[0]*4*ra*(1-ra))*wa+(p.stride[2]*fb+p.body[1]*4*rb*(1-rb))*wb)/total;
   out[1]=(p.stride[1]*fa*wa+p.stride[3]*fb*wb)/total;return out;
  }
  // Plain side walk: a shoe's outer edge belongs to the same moving foot
  // as its centre. Gaussian falloff previously left the toe/heel behind.
  // Linear ownership stays monotonic as the two feet approach one another.
  const ft=clamp((Math.min(ra,rb)-.5)/.2,0,1),foot=ft*ft*(3-2*ft);
  const edge=clamp((Math.min(Math.abs(x-ca),Math.abs(x-cb))-10)/16,0,1),envelope=1-edge*edge*(3-2*edge);
  const u=clamp((x-ca)/(cb-ca),0,1),ma=(1-u)*envelope,mb=u*envelope;
  out[0]=(p.stride[0]*fa+p.body[0]*4*ra*(1-ra)*(1-foot))*ma+(p.stride[2]*fb+p.body[1]*4*rb*(1-rb)*(1-foot))*mb;
  out[1]=p.stride[1]*fa*ma+p.stride[3]*fb*mb;return out;
 }
 function displacement(x,y,p,out){return p?.radius<0?sideDisplacement(x,y,p,out):cycle.displacement(x,y,p,out);}
 function inverse(x,y,p,out){
  if(!(p?.radius<0))return cycle.inverse(x,y,p,out);
  let sx=x,sy=y;
  if(p.radius<-100){
   // Resolve the complete foot contour, including close-contact frames.
   // The old five relaxed iterations could leave a second, stationary edge.
   const e=.03125;
   for(let i=0;i<16;i++){
    sideDisplacement(sx,sy,p,out);const dx=out[0],dy=out[1],fx=sx+dx-x,fy=sy+dy-y;
    if(Math.abs(fx)+Math.abs(fy)<.0001)break;
    sideDisplacement(sx+e,sy,p,out);const a=1+(out[0]-dx)/e,c=(out[1]-dy)/e;
    sideDisplacement(sx,sy+e,p,out);const b=(out[0]-dx)/e,d=1+(out[1]-dy)/e,det=a*d-b*c;
    const mx=Math.abs(det)>.08?(d*fx-b*fy)/det:fx*.6,my=Math.abs(det)>.08?(-c*fx+a*fy)/det:fy*.6;
    sx-=clamp(mx,-1,1);sy-=clamp(my,-1,1);
   }
  }else for(let i=0;i<5;i++){sideDisplacement(sx,sy,p,out);sx+=(x-out[0]-sx)*.6;sy+=(y-out[1]-sy)*.6;}
  out[0]=sx;out[1]=sy;return out;
 }
 const sideShader=`
 vec2 sportSideDisplacement(vec2 p){
  float ra=clamp((p.y-legA.y)/max(4.0,legA.w-legA.y),0.0,1.0),rb=clamp((p.y-legB.y)/max(4.0,legB.w-legB.y),0.0,1.0);
  float ca=mix(legA.x,legA.z,ra),cb=mix(legB.x,legB.z,rb);
  bool clean=stepRadius < -100.0;float radius=clean?stepRadius+100.0:stepRadius;
  float ua=(p.x-ca)/radius,ub=(p.x-cb)/radius;
  float wa=exp(-ua*ua),wb=exp(-ub*ub),total=wa+wb+0.025;
  float ta=clamp(ra/0.62,0.0,1.0),tb=clamp(rb/0.62,0.0,1.0);
  float fa=ta*ta*(3.0-2.0*ta),fb=tb*tb*(3.0-2.0*tb);
  if(!clean)return vec2(((stride.x*fa+bodyStep.x*4.0*ra*(1.0-ra))*wa+(stride.z*fb+bodyStep.y*4.0*rb*(1.0-rb))*wb)/total,(stride.y*fa*wa+stride.w*fb*wb)/total);
  float ft=clamp((min(ra,rb)-0.5)/0.2,0.0,1.0),foot=ft*ft*(3.0-2.0*ft);
  float edge=clamp((min(abs(p.x-ca),abs(p.x-cb))-10.0)/16.0,0.0,1.0),envelope=1.0-edge*edge*(3.0-2.0*edge);
  float u=clamp((p.x-ca)/(cb-ca),0.0,1.0),ma=(1.0-u)*envelope,mb=u*envelope;
  return vec2((stride.x*fa+bodyStep.x*4.0*ra*(1.0-ra)*(1.0-foot))*ma+(stride.z*fb+bodyStep.y*4.0*rb*(1.0-rb)*(1.0-foot))*mb,stride.y*fa*ma+stride.w*fb*mb);
 }
 vec2 unstep(vec2 target){
  if(stepRadius>=0.0)return legacyUnstep(target);
  if(walking<0.5)return target;
  vec2 p=target;
  if(stepRadius < -100.0){
   const float e=0.03125;
   for(int i=0;i<16;i++){
    vec2 v=sportSideDisplacement(p),f=p+v-target;if(abs(f.x)+abs(f.y)<0.0001)break;
    vec2 vx=(sportSideDisplacement(p+vec2(e,0.0))-v)/e,vy=(sportSideDisplacement(p+vec2(0.0,e))-v)/e;
    float a=1.0+vx.x,b=vy.x,c=vx.y,d=1.0+vy.y,det=a*d-b*c;
    vec2 delta=abs(det)>0.08?vec2(d*f.x-b*f.y,-c*f.x+a*f.y)/det:f*0.6;
    p-=clamp(delta,vec2(-1.0),vec2(1.0));
   }
  }else for(int i=0;i<5;i++)p=mix(p,target-sportSideDisplacement(p),0.6);
  return p;
 }`;
 if(cycle){
  const shader=cycle.shader.replaceAll('stepDisplacement','legacyStepDisplacement').replaceAll('unstep(','legacyUnstep(')+sideShader;
  window.CHERRIFT_WALK_CYCLE=Object.freeze({...cycle,shader,displacement,inverse,pose(id,state,dir,f,n,t,stride){
   return id===ID&&sourceState(state)?pose(state,dir,f+t,stride,activeTravel||dir):cycle.pose(id,state,dir,f,n,t,stride);
  }});
 }
 function draw(game,ctx,state,dir,phase,stride,p,width,height){
  const source=sourceState(state),image=source&&game.assets.get(`player_${ID}_${source}_${dir}`),smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
  if(!image||!smooth||!cycle||!pose(state,dir,phase,stride,p.sportFacing||dir))return false;
  activeTravel=p.sportFacing||dir;
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
 window.CHERRIFT_SPORT_GAIT=Object.freeze({draw,pose,sourceState,version:'1105-sport-walk-contour6'});
})();
