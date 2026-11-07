/* Whole-pose Kimono motion. Never cut, duplicate, or composite individual limbs. */
(() => {
 'use strict';if(window.CHERRIFT_KIMONO_GAIT)return;
 const ID='kimono_cherry',mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 const vectors={right:[1,0],down_right:[Math.SQRT1_2,Math.SQRT1_2],down:[0,1],down_left:[-Math.SQRT1_2,Math.SQRT1_2],left:[-1,0],up_left:[-Math.SQRT1_2,-Math.SQRT1_2],up:[0,-1],up_right:[Math.SQRT1_2,-Math.SQRT1_2]};
 const sourceState=(state,dir)=>state==='walk'?(['right','left'].includes(dir)?'walk':'idle'):state==='walk_attack'?'attack':null;
 // Fixed reference palette measured from the accepted right Idle sheet.
 // Correct RGB once per Walk strip; alpha and every pixel position stay intact.
 const walkPalette=[[0,1,2,4,5,6,7,9,10,11,12,14,15,16,17,19,20,21,22,23,25,26,27,28,30,31,32,33,35,36,37,38,40,41,42,43,44,46,47,48,49,51,52,53,54,56,57,58,59,61,62,63,64,65,67,68,69,70,72,73,74,75,77,78,79,80,82,83,84,85,87,88,89,90,91,93,94,95,96,98,99,100,101,103,104,105,106,108,109,110,111,112,114,115,116,117,119,120,121,122,124,125,126,127,129,130,131,132,133,135,136,137,138,140,141,142,143,145,146,147,148,150,151,152,153,153,154,155,155,156,157,158,158,159,160,160,161,162,162,163,164,165,165,166,167,167,168,169,169,170,171,172,172,173,174,174,175,176,176,177,178,179,179,180,181,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,202,203,204,205,206,207,207,208,209,210,211,211,212,213,214,214,215,216,216,217,218,219,219,220,221,221,222,222,223,223,224,224,225,225,226,226,227,227,228,229,229,230,230,231,232,232,233,233,234,234,235,236,237,238,239,239,240,241,242,243,244,245,246,248,250,251,253,254,255],[0,2,3,5,6,8,9,11,13,14,16,17,19,20,22,23,25,27,28,30,31,33,34,36,38,39,41,42,44,45,47,48,50,52,53,55,56,58,59,61,62,63,64,66,67,68,69,70,71,72,74,75,76,77,78,79,80,81,83,84,85,86,88,90,92,94,96,98,100,102,104,106,107,108,110,111,112,113,114,115,117,118,119,120,121,122,123,123,124,125,126,127,128,129,130,130,131,132,133,134,134,135,136,136,137,138,139,139,140,141,141,142,143,143,144,145,145,146,147,148,148,149,150,151,151,152,153,154,154,155,156,156,157,157,158,159,159,160,161,161,162,162,163,164,165,165,166,167,168,168,169,170,171,172,172,173,174,175,175,176,177,178,178,179,179,180,181,181,182,183,183,184,184,185,186,186,187,187,188,188,189,189,190,190,191,191,192,193,193,194,194,195,195,196,196,197,197,198,198,199,200,202,203,204,205,207,208,209,210,212,213,214,215,217,218,219,220,221,221,222,223,224,224,225,226,227,227,228,229,230,230,231,232,233,233,234,235,236,237,238,239,240,241,241,242,243,244,245,246,247,248,250,251,252,254,255],[0,2,3,5,7,8,10,12,13,15,17,18,20,21,23,25,26,28,30,31,33,35,36,38,40,41,43,45,46,48,50,51,53,54,56,58,59,61,63,64,66,67,69,70,71,72,74,75,76,77,79,80,81,82,84,85,86,87,89,90,91,93,94,95,97,98,99,101,102,103,104,105,106,108,109,110,111,112,113,114,115,116,116,117,118,119,120,121,122,123,123,124,125,126,127,127,128,129,129,130,131,132,132,133,134,134,135,136,136,137,138,138,139,140,141,141,142,143,144,144,145,146,147,147,148,149,149,150,151,151,152,153,153,154,155,155,156,157,157,158,159,160,160,161,162,162,163,164,165,165,166,167,168,168,169,170,171,171,172,173,174,174,175,176,177,177,178,179,179,180,180,181,182,182,183,183,184,185,185,186,186,187,187,188,189,189,190,190,191,192,192,193,193,194,195,196,197,198,200,201,202,203,204,205,206,207,208,210,211,212,213,214,215,216,216,217,218,219,220,220,221,222,223,224,224,225,226,227,228,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,252,253,254,255]];
 const walkImages=new WeakMap();
 function walkImage(image){
  if(!image?.width||!image?.height||typeof document==='undefined')return image;
  if(walkImages.has(image))return walkImages.get(image);
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   if(!data[i+3])continue;
   data[i]=walkPalette[0][data[i]];data[i+1]=walkPalette[1][data[i+1]];data[i+2]=walkPalette[2][data[i+2]];
  }
  ctx.putImageData(pixels,0,0);walkImages.set(image,canvas);return canvas;
 }
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
  const source=sourceState(state,dir),original=source&&game.assets.get(`player_${ID}_${source}_${dir}`),image=source==='walk'&&original?walkImage(original):original,smooth=window.CHERRIFT_ANIMATION_SMOOTHING;
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
 window.CHERRIFT_KIMONO_GAIT=Object.freeze({draw,pose,sourceState,version:'1107-kimono-color6'});
})();
