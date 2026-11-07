/* Whole-pose Kimono motion. Never cut, duplicate, or composite individual limbs. */
(() => {
 'use strict';if(window.CHERRIFT_KIMONO_GAIT)return;
 const ID='kimono_cherry',mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 const vectors={right:[1,0],down_right:[Math.SQRT1_2,Math.SQRT1_2],down:[0,1],down_left:[-Math.SQRT1_2,Math.SQRT1_2],left:[-1,0],up_left:[-Math.SQRT1_2,-Math.SQRT1_2],up:[0,-1],up_right:[Math.SQRT1_2,-Math.SQRT1_2]};
 const sourceState=(state,dir)=>state==='walk'?(['right','left'].includes(dir)?'walk':'idle'):state==='walk_attack'?'attack':null;
 let activeTravel;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function pose(state,dir,phase,stride,travelDir=dir){
  const canonical=mirror[dir]||dir,series=window.CHERRIFT_KIMONO_WHOLE_POSE?.[`${sourceState(state,dir)}/${canonical}`];
  if(!series||!Number.isFinite(phase)||!Number.isFinite(stride))return null;
  const authored=state==='walk'&&canonical==='right';
  // Omit the late high-knee pose. Redistribute the five accepted frames
  // evenly over the existing stride duration, including the loop seam.
  const order=authored?[0,1,2,3,5]:null;
  const pos=authored?(((stride%6)+6)%6)*order.length/6:state==='walk'?((phase%6)+6)%6:clamp(phase,0,5);
  const slot=Math.floor(pos),f=order?order[slot]:slot,n=order?order[(slot+1)%order.length]:state==='walk'?(f+1)%6:Math.min(5,f+1),t=pos-slot;
  const bones=series[f].map((v,i)=>v+(series[n][i]-v)*t);
  // Bones describe the two ORIGINAL legs in the complete frame, in padded
  // coordinates used by the shared, continuous inverse warp.
  const padded=bones.map((v,i)=>64+v*2/3);
  if(mirror[dir])for(const i of [0,2,4,6])padded[i]=256-padded[i];
  const direction=vectors[travelDir]||vectors[dir],side=canonical==='right',tailored=side||canonical==='up_right';
  const legs=[0,1].map(i=>{
   const angle=stride*Math.PI/3+i*Math.PI;
   // During contact (sin >= 0), cos decreases: the foot travels BACKWARDS
   // along actual travel. On the return stroke it lifts and travels forwards.
   const ground=(tailored?(side?2.7:2.1):(side?2.2:1.8))*Math.cos(angle),lift=(tailored?(side?1.35:1.05):(side?1.6:1.3))*Math.max(0,-Math.sin(angle))**2;
   return [direction[0]*ground,direction[1]*ground*(tailored?.55:.65)-lift];
  });
  if(authored)return {a:padded.slice(0,4),b:padded.slice(4),stride:[0,0,0,0],body:[0,0],radius:-200.65,frame:f,next:n,fraction:t,travel:direction};
  const separation=Math.abs(padded[2]-padded[6]);
  const knee=side?[0,1].map(i=>direction[0]*.35*Math.max(0,-Math.sin(stride*Math.PI/3+i*Math.PI))**2):[0,0];
  return {a:padded.slice(0,4),b:padded.slice(4),stride:legs.flat(),body:tailored?[.12*Math.sin(stride*Math.PI*2/3),-.10*(1-Math.cos(stride*Math.PI*2/3))]:knee,radius:tailored?-200.65:(side?-1:1)*(clamp(separation*.28,2.8,4.2)+(side&&state==='walk'?100:0)),frame:f,next:n,fraction:t,travel:direction};
 }
 // Complete-foot ownership uses both screen axes, so the near and far zori
 // are not averaged together in rear diagonals. Everything is one full pose.
 const cycle=window.CHERRIFT_WALK_CYCLE;
 function footDisplacement(x,y,p,out){
  const ra=clamp((y-p.a[1])/Math.max(4,p.a[3]-p.a[1]),0,1),rb=clamp((y-p.b[1])/Math.max(4,p.b[3]-p.b[1]),0,1);
  const ax=p.a[2],ay=p.a[3]-1.4,bx=p.b[2],by=p.b[3]-1.4,dx=bx-ax,dy=by-ay,len=Math.max(1,Math.hypot(dx,dy));
  const projection=((x-(ax+bx)/2)*dx+(y-(ay+by)/2)*dy)/len;
  const width=Math.max(1,len*.42)+2.0*(1-Math.min(ra,rb));
  const u=clamp((projection+width)/(2*width),0,1),wb=u*u*(3-2*u),wa=1-wb;
  const ta=clamp(ra/.80,0,1),tb=clamp(rb/.80,0,1),fa=ta*ta*(3-2*ta),fb=tb*tb*(3-2*tb);
  const ca=p.a[0]+(p.a[2]-p.a[0])*ra,cb=p.b[0]+(p.b[2]-p.b[0])*rb;
  const edge=clamp((Math.min(Math.abs(x-ca),Math.abs(x-cb))-8)/10,0,1),envelope=1-edge*edge*(3-2*edge);
  const hem=wa*4*ra*(1-ra)+wb*4*rb*(1-rb);
  out[0]=(p.stride[0]*fa*wa+p.stride[2]*fb*wb+p.body[0]*hem)*envelope;
  out[1]=(p.stride[1]*fa*wa+p.stride[3]*fb*wb+p.body[1]*hem)*envelope;return out;
 }
 function displacement(x,y,p,out){return p?.radius < -200?footDisplacement(x,y,p,out):cycle.displacement(x,y,p,out);}
 function inverse(x,y,p,out){
  if(!(p?.radius < -200))return cycle.inverse(x,y,p,out);
  let sx=x,sy=y;const e=.03125;
  for(let i=0;i<20;i++){
   footDisplacement(sx,sy,p,out);const dx=out[0],dy=out[1],fx=sx+dx-x,fy=sy+dy-y;
   if(Math.abs(fx)+Math.abs(fy)<.0001)break;
   footDisplacement(sx+e,sy,p,out);const a=1+(out[0]-dx)/e,c=(out[1]-dy)/e;
   footDisplacement(sx,sy+e,p,out);const b=(out[0]-dx)/e,d=1+(out[1]-dy)/e,det=a*d-b*c;
   const mx=Math.abs(det)>.08?(d*fx-b*fy)/det:fx*.6,my=Math.abs(det)>.08?(-c*fx+a*fy)/det:fy*.6;
   sx-=clamp(mx,-1,1);sy-=clamp(my,-1,1);
  }
  out[0]=sx;out[1]=sy;return out;
 }
 const shader=`
 vec2 kimonoFootDisplacement(vec2 p){
  float ra=clamp((p.y-legA.y)/max(4.0,legA.w-legA.y),0.0,1.0),rb=clamp((p.y-legB.y)/max(4.0,legB.w-legB.y),0.0,1.0);
  vec2 a=legA.zw-vec2(0.0,1.4),b=legB.zw-vec2(0.0,1.4),axis=b-a;
  float projection=dot(p-(a+b)*0.5,axis)/max(1.0,length(axis)),width=max(1.0,length(axis)*0.42)+2.0*(1.0-min(ra,rb));
  float u=clamp((projection+width)/(2.0*width),0.0,1.0),wb=u*u*(3.0-2.0*u),wa=1.0-wb;
  float ta=clamp(ra/0.80,0.0,1.0),tb=clamp(rb/0.80,0.0,1.0),fa=ta*ta*(3.0-2.0*ta),fb=tb*tb*(3.0-2.0*tb);
  float ca=mix(legA.x,legA.z,ra),cb=mix(legB.x,legB.z,rb);
  float edge=clamp((min(abs(p.x-ca),abs(p.x-cb))-8.0)/10.0,0.0,1.0),envelope=1.0-edge*edge*(3.0-2.0*edge),hem=wa*4.0*ra*(1.0-ra)+wb*4.0*rb*(1.0-rb);
  return (stride.xy*fa*wa+stride.zw*fb*wb+bodyStep*hem)*envelope;
 }
 vec2 unstep(vec2 target){
  if(stepRadius>=-200.0)return kimonoPreviousUnstep(target);
  if(walking<0.5)return target;
  vec2 p=target;const float e=0.03125;
  for(int i=0;i<20;i++){
   vec2 v=kimonoFootDisplacement(p),f=p+v-target;if(abs(f.x)+abs(f.y)<0.0001)break;
   vec2 vx=(kimonoFootDisplacement(p+vec2(e,0.0))-v)/e,vy=(kimonoFootDisplacement(p+vec2(0.0,e))-v)/e;
   float a=1.0+vx.x,b=vy.x,c=vx.y,d=1.0+vy.y,det=a*d-b*c;
   vec2 delta=abs(det)>0.08?vec2(d*f.x-b*f.y,-c*f.x+a*f.y)/det:f*0.6;
   p-=clamp(delta,vec2(-1.0),vec2(1.0));
  }return p;
 }`;
 if(cycle&&window.CHERRIFT_SPORT_GAIT){
  const combined=cycle.shader.replaceAll('unstep(','kimonoPreviousUnstep(')+shader;
  window.CHERRIFT_WALK_CYCLE=Object.freeze({...cycle,shader:combined,displacement,inverse,pose(id,state,dir,f,n,t,stride){
   return id===ID&&sourceState(state)?pose(state,dir,f+t,stride,activeTravel||dir):cycle.pose(id,state,dir,f,n,t,stride);
  }});
 }else return;
 function draw(game,ctx,state,dir,phase,stride,p,width,height){
  const source=sourceState(state,dir),image=source&&game.assets.get(`player_${ID}_${source}_${dir}`),smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
  if(!image||!smooth||!cycle||!pose(state,dir,phase,stride,p.kimonoFacing||dir))return false;
  activeTravel=p.kimonoFacing||dir;
  try{
   // Side Walk selects complete authored leg poses from the travel clock.
   // Other moving states retain the v2 whole-pose deformation.
   // Keep one source frame to avoid translucent duplicate limbs.
   const frame=pose(state,dir,phase,stride,activeTravel).frame;
   const drawn=smooth.draw(ctx,image,ID,state,dir,frame,p,width,height,{
    loop:state==='walk',gaitPhase:stride,
    makeFrame:(c,f)=>c.drawImage(image,f*192,0,192,192,0,0,192,192)
   });
   if(!drawn)ctx.drawImage(image,frame*192,0,192,192,p.x-96*width/192,p.y+30-184*height/192,width,height);
   return true;
  }finally{activeTravel=undefined;}
 }
 window.CHERRIFT_KIMONO_GAIT=Object.freeze({draw,pose,sourceState,version:'1107-kimono-step5'});
})();
