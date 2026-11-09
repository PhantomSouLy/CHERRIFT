/* Walk rig: the original Idle trouser and shoe pixels, never a replacement leg.
   Two complete layers, fixed hips, rigid translating feet, continuous forward
   swing and rearward support relative to the moving body. */
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const art=path.resolve(__dirname,'../assets/player/cherry_skins/cake_deliver_cherry'),file=(s,d)=>path.join(art,'sheets192',`cake_deliver_cherry_${s}_${d}.png`),read=p=>PNG.sync.read(fs.readFileSync(p)),write=(p,im)=>fs.writeFileSync(p,PNG.sync.write(im));
const H=148,A=169,S=2.5,LIFT=2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const specs={down:{l:81,r:111,split:96,dx:0,dy:1},down_right:{l:84,r:112,split:97,footSplit:100,dx:Math.SQRT1_2,dy:Math.SQRT1_2},right:{l:87,r:113,split:100,footSplit:106,dx:1,dy:0},up_right:{l:79,r:109,split:90.5,dx:Math.SQRT1_2,dy:-Math.SQRT1_2},up:{l:82,r:108,split:95,dx:0,dy:-1}};
function gait(t){t=(t+1)%1;if(t<.5){const u=t*2;return{advance:-S+2*S*u,lift:-LIFT*Math.sin(Math.PI*u),swing:true};}return{advance:S-4*S*(t-.5),lift:0,swing:false};}
function at(im,f,x,y){return(y*im.width+f*192+x)*4;}
function mix(im,base,f,x,y,t){let p=at(im,f,x,y),ia=base.data[p+3],oa=im.data[p+3],alpha=ia*(1-t)+oa*t;if(t===0){base.data.copy(im.data,p,p,p+4);return;}for(let c=0;c<3;c++)im.data[p+c]=alpha?Math.round((base.data[p+c]*ia*(1-t)+im.data[p+c]*oa*t)/alpha):0;im.data[p+3]=Math.round(alpha);}
function sample(idle,sx,sy,spec,leg){const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;let alpha=0,rgb=[0,0,0];
 for(const[x,y,w]of [[x0,y0,(1-fx)*(1-fy)],[x0+1,y0,fx*(1-fy)],[x0,y0+1,(1-fx)*fy],[x0+1,y0+1,fx*fy]]){
  if(y<H||y>=192||x<spec.l||x>=spec.r)continue;
  const split=spec.split+((spec.footSplit??spec.split)-spec.split)*ease((y-166)/7);
  if(leg===0?x>=split:x<split)continue;
  let p=at(idle,0,x,y),a=idle.data[p+3]*w;alpha+=a;for(let c=0;c<3;c++)rgb[c]+=idle.data[p+c]*a;
 }return{alpha,rgb};
}
function over(im,f,x,y,v){if(!v.alpha)return;let p=at(im,f,x,y),b=im.data[p+3],remain=1-v.alpha/255,a=v.alpha+b*remain;for(let c=0;c<3;c++)im.data[p+c]=Math.round((v.rgb[c]+im.data[p+c]*b*remain)/a);im.data[p+3]=Math.round(a);}
const report={};
for(const[d,spec]of Object.entries(specs)){
 const idle=read(file('idle',d)),walk=new PNG({width:1152,height:192});idle.data.copy(walk.data);const phases=[];
 for(let f=0;f<6;f++){
  const near=gait(f/6),far=gait(f/6+.5);phases.push({frame:f,near,far});
  for(let y=H;y<192;y++)for(let x=spec.l;x<spec.r;x++){let p=at(walk,f,x,y);walk.data.fill(0,p,p+4);}
  function draw(leg,motion,baseX=0){
   const mx=motion.advance*spec.dx,my=motion.advance*spec.dy+motion.lift;
   for(let y=H;y<192;y++)for(let x=spec.l-7;x<spec.r+7;x++){
    let sy=y;for(let i=0;i<12;i++)sy=y-my*ease((sy-H-3)/(A-H-3));
    const ramp=ease((sy-H-3)/(A-H-3)),sx=x-baseX-mx*ramp;
    over(walk,f,x,y,sample(idle,sx,sy,spec,leg));
   }
  }
  if(d==='right'){
   // The complete foreground leg/shoe is sampled directly from original Idle.
   // Reuse it behind the first leg; no calf thinning, shoe resizing or RGB edits.
   draw(0,far,2);draw(0,near,0);
  }else{draw(1,far);draw(0,near);}
  for(let y=H;y<H+10;y++)for(let x=spec.l-7;x<spec.r+7;x++)mix(walk,idle,f,x,y,ease((y-H-3)/7));
 }
 write(file('walk',d),walk);
 const wa=read(file('walk_attack',d));
 for(let f=0;f<6;f++)for(let y=H-7;y<192;y++)for(let x=0;x<192;x++){
  let p=at(wa,f,x,y),t=ease((y-H+7)/7);if(t===1){walk.data.copy(wa.data,p,p,p+4);continue;}
  let ia=wa.data[p+3],oa=walk.data[p+3],a=ia*(1-t)+oa*t;for(let c=0;c<3;c++)wa.data[p+c]=a?Math.round((wa.data[p+c]*ia*(1-t)+walk.data[p+c]*oa*t)/a):0;wa.data[p+3]=Math.round(a);
 }
 write(file('walk_attack',d),wa);
 report[d]={hip:H,ankle:A,stridePixels:S,liftPixels:LIFT,footRotationDegrees:0,source:'original-idle-frame-0',sourceRGBModified:false,spec,phases};
}
fs.writeFileSync(path.join(art,'walk-appearance.json'),JSON.stringify(report,null,2));
console.log('Original Idle legs: all five canonical forward walking cycles rebuilt');
