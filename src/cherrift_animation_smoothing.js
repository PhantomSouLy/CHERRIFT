/* Shared motion-compensated pose interpolation. Rendering only: no combat clocks,
   hit events, cooldowns or random-number streams are changed. */
(()=>{
 'use strict';if(window.CHERRIFT_ANIMATION_SMOOTHING)return;
 const VERSION='1029-grounded-step1',SIZE=256,mirrors={left:'right',down_left:'down_right',up_left:'up_right'};
 const entries=new Map(),MAX=6;let backend;
 function canvas(w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function entry(image,id,state,dir,makeFrame){
  const canonical=mirrors[dir]||dir,meta=window.CHERRIFT_ANIMATION_FLOW?.[`${id}/${state}/${canonical}`];if(!meta)return null;
  const key=`${id}/${state}/${dir}`;let e=entries.get(key);
  if(e&&e.image===image){entries.delete(key);entries.set(key,e);return e;}
  if(e)release(e);
  if(entries.size>=MAX){const first=entries.keys().next().value;release(entries.get(first));entries.delete(first);}
  const atlas=canvas(meta.frames*SIZE,SIZE),ctx=atlas.getContext('2d'),flip=!!mirrors[dir];
  for(let f=0;f<meta.frames;f++){
   const pose=canvas(),p=pose.getContext('2d');p.save();p.translate(64,64);p.scale(2/3,2/3);makeFrame(p,f);p.restore();
   const [dx,dy]=meta.offsets[f]||[0,0];ctx.save();ctx.beginPath();ctx.rect(f*SIZE,0,SIZE,SIZE);ctx.clip();ctx.drawImage(pose,f*SIZE+(flip?-dx:dx),dy);ctx.restore();
  }
  e={image,atlas,meta,flip,ready:false,key};entries.set(key,e);
  const flow=new Image();flow.decoding='async';e.loading=flow;
  flow.onload=()=>{if(entries.get(key)!==e)return;const c=canvas(flow.width,flow.height),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(flow,0,0);e.flow=flow;e.flowPixels=x.getImageData(0,0,c.width,c.height).data;e.ready=true;e.loading=null;};
  flow.onerror=()=>{e.failed=true;e.loading=null;};
  flow.src=`assets/player/animation_flow/${meta.file}?v=${VERSION}`;return e;
 }
 function release(e){if(!e)return;e.bitmap?.close?.();if(backend?.gl){if(e.texture)backend.gl.deleteTexture(e.texture);if(e.flowTexture)backend.gl.deleteTexture(e.flowTexture);}e.pixels=null;e.flowPixels=null;e.loading=null;}
 const vertex='attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.0)*0.5,(1.0-position.y)*0.5);gl_Position=vec4(position,0.0,1.0);}';
 const fragment=`precision highp float;${window.CHERRIFT_WALK_CYCLE?.shader||'vec2 unstep(vec2 p){return p;}'}varying vec2 uv;uniform sampler2D art;uniform sampler2D flow;uniform float frame;uniform float nextFrame;uniform float count;uniform float fraction;uniform float mirrorX;
 vec2 vectorAt(float f,float halfIndex,vec2 p){vec2 q=p;if(mirrorX>0.5)q.x=256.6666667/256.0-q.x;q=clamp(q,vec2(0.5/32.0),vec2(31.5/32.0));vec2 v=(texture2D(flow,vec2((halfIndex+q.x)*0.5,(f+q.y)/count)).rg*255.0-128.0)*0.5;if(mirrorX>0.5)v.x=-v.x;return v;}
 vec4 paint(float f,vec2 p){p=clamp(p,vec2(0.5/256.0),vec2(255.5/256.0));return texture2D(art,vec2((f+p.x)/count,p.y));}
 void main(){vec2 base=unstep(uv*256.0)/256.0;vec2 a=base,b=base;for(int i=0;i<2;i++){a=base-fraction*vectorAt(frame,0.0,a)/256.0;b=base-(1.0-fraction)*vectorAt(frame,1.0,b)/256.0;}vec4 ca=paint(frame,a),cb=paint(nextFrame,b);gl_FragColor=mix(ca,cb,fraction);}`;
 function makeBackend(){
  const c=canvas();let gl;
  try{
   gl=c.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
   if(!gl?.getParameter?.(gl.VERSION))throw Error('WebGL unavailable');
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.viewport(0,0,256,256);gl.disable(gl.BLEND);
   const uniforms={};for(const n of ['art','flow','frame','nextFrame','count','fraction','mirrorX','walking','legA','legB','stride','bodyStep','stepRadius'])uniforms[n]=gl.getUniformLocation(program,n);
   gl.uniform1i(uniforms.art,0);gl.uniform1i(uniforms.flow,1);c.addEventListener?.('webglcontextlost',event=>{event.preventDefault();backend={canvas:canvas(),gl:null};});return {canvas:c,gl,uniforms};
  }catch{return {canvas:canvas(),gl:null};}
 }
 function texture(gl,source,premultiply){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);return t;}
 function glSample(e,f,n,t){const {gl,uniforms:u}=backend;
  gl.activeTexture(gl.TEXTURE0);if(!e.texture)e.texture=texture(gl,e.atlas,true);else gl.bindTexture(gl.TEXTURE_2D,e.texture);
  gl.activeTexture(gl.TEXTURE1);if(!e.flowTexture)e.flowTexture=texture(gl,e.flow,false);else gl.bindTexture(gl.TEXTURE_2D,e.flowTexture);
  for(const [key,value] of Object.entries({frame:f,nextFrame:n,count:e.meta.frames,fraction:t,mirrorX:e.flip?1:0}))gl.uniform1f(u[key],value);
  const walk=e.walk;gl.uniform1f(u.walking,walk?1:0);
  if(walk){gl.uniform4fv(u.legA,walk.a);gl.uniform4fv(u.legB,walk.b);gl.uniform4fv(u.stride,walk.stride);gl.uniform2fv(u.bodyStep,walk.body);gl.uniform1f(u.stepRadius,walk.radius);}
  gl.drawArrays(gl.TRIANGLES,0,6);return backend.canvas;
 }
 function bilinear(data,width,height,x,y,out){x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));const ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(width-1,ix+1),jy=Math.min(height-1,iy+1),fx=x-ix,fy=y-iy;
  const a=(iy*width+ix)*4,b=(iy*width+jx)*4,c=(jy*width+ix)*4,d=(jy*width+jx)*4;
  for(let k=0;k<4;k++)out[k]=(data[a+k]*(1-fx)+data[b+k]*fx)*(1-fy)+(data[c+k]*(1-fx)+data[d+k]*fx)*fy;return out;
 }
 function preparePixels(e){
  if(!e.pixels){e.pixels=e.atlas.getContext('2d').getImageData(0,0,e.atlas.width,256).data;for(let i=0;i<e.pixels.length;i+=4){const a=e.pixels[i+3]/255;for(let c=0;c<3;c++)e.pixels[i+c]*=a;}}
  if(!e.bounds){
   e.bounds=Array.from({length:e.meta.frames},()=>[256,256,-1,-1]);
   for(let y=0;y<256;y++)for(let x=0;x<e.atlas.width;x++)if(e.pixels[(y*e.atlas.width+x)*4+3]){
    const b=e.bounds[Math.floor(x/256)],px=x%256;b[0]=Math.min(b[0],px);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],px);b[3]=Math.max(b[3],y);
   }
   e.flowMargin=Array.from({length:e.meta.frames},(_,frame)=>{let margin=0;for(let at=frame*32*64*4;at<(frame+1)*32*64*4;at+=4)margin=Math.max(margin,Math.abs(e.flowPixels[at]-128)*.5,Math.abs(e.flowPixels[at+1]-128)*.5);return Math.ceil(margin)+2;});
  }
 }
 function cpuSample(e,f,n,t){
  preparePixels(e);
  const ctx=backend.canvas.getContext('2d');if(!backend.output)backend.output=ctx.createImageData(256,256);const out=backend.output.data,a=new Float32Array(4),b=new Float32Array(4),v=new Float32Array(4);
  out.fill(0);
  const first=e.bounds[f],second=e.bounds[n],margin=e.flowMargin[f]+(e.walk?12:0);
  const x0=Math.max(0,Math.floor(Math.min(first[0],second[0])-margin)),x1=Math.min(255,Math.ceil(Math.max(first[2],second[2])+margin));
  const y0=Math.max(0,Math.floor(Math.min(first[1],second[1])-margin)),y1=Math.min(255,Math.ceil(Math.max(first[3],second[3])+margin));
  let vx=0,vy=0;function vector(x,y,half){if(e.flip)x=255.6666667-x;const gx=Math.max(0,Math.min(31,(x+.5)/8-.5)),gy=Math.max(0,Math.min(31,(y+.5)/8-.5));bilinear(e.flowPixels,64,e.meta.frames*32,half*32+gx,f*32+gy,v);vx=(v[0]-128)*.5*(e.flip?-1:1);vy=(v[1]-128)*.5;}
  // A continuous inverse warp keeps every pixel attached to its neighbours.
  // Independent rectangular tile translations left gaps through the body.
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   let ox=x,oy=y;if(e.walk){window.CHERRIFT_WALK_CYCLE.inverse(x,y,e.walk,v);ox=v[0];oy=v[1];}
   let ax=ox,ay=oy,bx=ox,by=oy;for(let i=0;i<2;i++){vector(ax,ay,0);ax=ox-t*vx;ay=oy-t*vy;vector(bx,by,1);bx=ox-(1-t)*vx;by=oy-(1-t)*vy;}
   ax=Math.max(0,Math.min(255,ax));bx=Math.max(0,Math.min(255,bx));bilinear(e.pixels,e.atlas.width,256,f*256+ax,ay,a);bilinear(e.pixels,e.atlas.width,256,n*256+bx,by,b);
   const alpha=a[3]*(1-t)+b[3]*t,index=(y*256+x)*4;out[index+3]=alpha;for(let c=0;c<3;c++)out[index+c]=alpha>0?(a[c]*(1-t)+b[c]*t)*255/alpha:0;
  }ctx.putImageData(backend.output,0,0);return backend.canvas;
 }
 // Canvas fallback: adjacent triangles share the same sampled vertices.
 // Unlike independent tile translations, this mesh has no discontinuous cuts.
 function canvasSample(e,f,n,t){
  preparePixels(e);
  if(!e.bitmapRequested&&typeof createImageBitmap==='function'){e.bitmapRequested=true;createImageBitmap(e.atlas).then(bitmap=>{if(entries.get(e.key)===e)e.bitmap=bitmap;else bitmap.close?.();}).catch(()=>{});}
  const out=backend.canvas.getContext('2d');out.clearRect(0,0,256,256);
  if(!e.walk&&(t===0||f===n)){out.drawImage(e.atlas,f*256,0,256,256,0,0,256,256);return backend.canvas;}
  if(!e.bitmap){out.save();out.globalCompositeOperation='lighter';out.globalAlpha=1-t;out.drawImage(e.atlas,f*256,0,256,256,0,0,256,256);out.globalAlpha=t;out.drawImage(e.atlas,n*256,0,256,256,0,0,256,256);out.restore();return backend.canvas;}
  if(!backend.layers)backend.layers=[canvas(),canvas()];
  const step=16,first=e.bounds[f],second=e.bounds[n],margin=e.flowMargin[f]+(e.walk?12:0);
  const x0=Math.max(0,Math.floor((Math.min(first[0],second[0])-margin)/step)*step),x1=Math.min(256,Math.ceil((Math.max(first[2],second[2])+margin+1)/step)*step);
  const y0=Math.max(0,Math.floor((Math.min(first[1],second[1])-margin)/step)*step),y1=Math.min(256,Math.ceil((Math.max(first[3],second[3])+margin+1)/step)*step);
  const values=new Float32Array(4);
  for(let half=0;half<2;half++){
   const layer=backend.layers[half],c=layer.getContext('2d'),amount=half?1-t:t,source=half?n:f;
   c.clearRect(0,0,256,256);c.globalCompositeOperation='copy';
   const rows=[];let y=y0;
   while(true){
    const detail=e.walk&&y>=Math.floor((Math.min(e.walk.a[1],e.walk.b[1])-4)/16)*16&&y<=Math.max(e.walk.a[3],e.walk.b[3])+8,spacing=detail?4:16,row=[],xs=new Set();
    for(let x=x0;x<=x1;x+=16)xs.add(x);
    if(detail){const start=Math.max(x0,Math.floor((Math.min(e.walk.a[0],e.walk.a[2],e.walk.b[0],e.walk.b[2])-8)/4)*4),end=Math.min(x1,Math.ceil((Math.max(e.walk.a[0],e.walk.a[2],e.walk.b[0],e.walk.b[2])+8)/4)*4);for(let x=start;x<=end;x+=4)xs.add(x);}
    for(const x of [...xs].sort((a,b)=>a-b)){
     let ox=x,oy=y;if(e.walk){window.CHERRIFT_WALK_CYCLE.inverse(x,y,e.walk,values);ox=values[0];oy=values[1];}
     let sx=ox,sy=oy;
     for(let iteration=0;iteration<2;iteration++){
      const px=e.flip?255.6666667-sx:sx,gx=Math.max(0,Math.min(31,(px+.5)/8-.5)),gy=Math.max(0,Math.min(31,(sy+.5)/8-.5));
      bilinear(e.flowPixels,64,e.meta.frames*32,half*32+gx,f*32+gy,values);
      sx=ox-amount*(values[0]-128)*.5*(e.flip?-1:1);sy=oy-amount*(values[1]-128)*.5;
     }row.push([x,y,sx,sy]);
    }rows.push(row);if(y>=y1)break;y=Math.min(y1,y+spacing);
   }
   function triangle(v0,v1,v2){
    const ux=v1[2]-v0[2],uy=v1[3]-v0[3],vx=v2[2]-v0[2],vy=v2[3]-v0[3],det=ux*vy-vx*uy;if(Math.abs(det)<.01)return;
    const dx=v1[0]-v0[0],dy=v1[1]-v0[1],ex=v2[0]-v0[0],ey=v2[1]-v0[1];
    const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,cc=(ex*ux-dx*vx)/det,d=(ey*ux-dy*vx)/det;
    const cx=(v0[0]+v1[0]+v2[0])/3,cy=(v0[1]+v1[1]+v2[1])/3;
    const dilation=1+2/Math.max(4,Math.min(Math.max(v0[0],v1[0],v2[0])-Math.min(v0[0],v1[0],v2[0]),Math.max(v0[1],v1[1],v2[1])-Math.min(v0[1],v1[1],v2[1])));
    c.save();c.beginPath();for(const [i,v] of [v0,v1,v2].entries()){const x=cx+(v[0]-cx)*dilation,y=cy+(v[1]-cy)*dilation;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.clip();
    c.transform(a,b,cc,d,v0[0]-a*v0[2]-cc*v0[3],v0[1]-b*v0[2]-d*v0[3]);
    const sx=Math.max(0,Math.floor(Math.min(v0[2],v1[2],v2[2])-4)),sy=Math.max(0,Math.floor(Math.min(v0[3],v1[3],v2[3])-4));
    const sw=Math.min(256,Math.ceil(Math.max(v0[2],v1[2],v2[2])+4))-sx,sh=Math.min(256,Math.ceil(Math.max(v0[3],v1[3],v2[3])+4))-sy;
    if(sw>0&&sh>0)c.drawImage(e.bitmap,source*256+sx,sy,sw,sh,sx,sy,sw,sh);c.restore();
   }
   for(let r=0;r<rows.length-1;r++){
    const top=rows[r],bottom=rows[r+1];let i=0,j=0;
    while(i<top.length-1||j<bottom.length-1){
     if(j===bottom.length-1||(i<top.length-1&&top[i+1][0]<=bottom[j+1][0])){triangle(top[i],top[i+1],bottom[j]);i++;}
     else {triangle(top[i],bottom[j+1],bottom[j]);j++;}
    }
   }
  }
  out.save();out.globalCompositeOperation='lighter';out.globalAlpha=1-t;out.drawImage(backend.layers[0],0,0);out.globalAlpha=t;out.drawImage(backend.layers[1],0,0);out.restore();return backend.canvas;
 }
 function sample(image,id,state,dir,phase,makeFrame,{loop=false,gaitPhase=phase}={}){
  const e=entry(image,id,state,dir,makeFrame);if(!e?.ready)return null;
  const count=e.meta.frames,pos=loop?((phase%count)+count)%count:Math.max(0,Math.min(count-1,phase));const f=Math.floor(pos),n=loop?(f+1)%count:Math.min(count-1,f+1),t=pos-f;
  e.walk=window.CHERRIFT_WALK_CYCLE?.pose(id,state,dir,f,n,t,gaitPhase)||null;
  if(!backend)backend=makeBackend();return backend.gl?glSample(e,f,n,t):window.__CHERRIFT_SMOOTH_REFERENCE_CPU__?cpuSample(e,f,n,t):canvasSample(e,f,n,t);
 }
 function draw(ctx,image,id,state,dir,phase,p,width,height,options){
  const result=sample(image,id,state,dir,phase,options.makeFrame,options);if(!result)return false;
  // One complete pose owns hips, legs, hair and clothing. Never combine it
  // with a separately registered lower body at a horizontal screen-space cut.
  const rx=p.x-width,ry=p.y+30-(64+184*2/3)*height*2/256;
  ctx.drawImage(result,rx,ry,width*2,height*2);return true;
 }
 window.CHERRIFT_ANIMATION_SMOOTHING=Object.freeze({sample,draw,version:VERSION,stats:()=>({cached:entries.size,maxCached:MAX,backend:backend?.gl?'webgl':window.__CHERRIFT_SMOOTH_REFERENCE_CPU__?'cpu-reference':'canvas'})});
})();
