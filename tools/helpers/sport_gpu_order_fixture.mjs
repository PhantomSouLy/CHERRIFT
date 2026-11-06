import vm from 'node:vm';import {readFileSync}from'node:fs';
export function fixture({smoothing=readFileSync('src/cherrift_animation_smoothing.js','utf8')}={}){
 const programs=[],draws=[],contexts=[],deleted=[];
 function glContext(){
  const id=contexts.length+1;let current;const gl={VERSION:7938,VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
   getParameter:()=> 'WebGL fixture',createShader:type=>({type}),shaderSource(s,source){s.source=source;},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
   createProgram(){const p={shaders:[],uniforms:{}};programs.push(p);return p;},attachShader(p,s){p.shaders.push(s);},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',useProgram(p){current=p;},
   createBuffer:()=>({}),bindBuffer(){},bufferData(){},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},viewport(){},disable(){},
   getUniformLocation:(p,name)=>({p,name}),uniform1i(u,v){u.p.uniforms[u.name]=v;},uniform1f(u,v){u.p.uniforms[u.name]=v;},uniform2fv(u,v){u.p.uniforms[u.name]=Array.from(v);},uniform4fv(u,v){u.p.uniforms[u.name]=Array.from(v);},
   createTexture:()=>({contextId:id}),activeTexture(){},bindTexture(_target,t){if(t&&t.contextId!==id)throw Error('Texture from a stale WebGL context');},pixelStorei(){},texParameteri(){},texImage2D(){},deleteTexture(t){deleted.push(t);},
   drawArrays(){draws.push({program:current,uniforms:structuredClone(current.uniforms)});}
  };contexts.push(gl);return gl;
 }
 const canvases=[];const document={createElement(){let gl;const handlers={};const c={width:256,height:256,handlers,addEventListener(k,fn){handlers[k]=fn;},getContext(type){if(type==='webgl')return gl||=glContext();return {save(){},restore(){},translate(){},scale(){},beginPath(){},rect(){},clip(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(c.width*c.height*4)};}};}};canvases.push(c);return c;}};
 class FlowImage{constructor(){this.width=64;this.height=192;}set src(v){this.url=v;this.onload();}}
 const context=vm.createContext({window:{},document,Image:FlowImage});
 vm.runInContext(readFileSync('src/cherrift_walk_cycle.js','utf8'),context);
 vm.runInContext(smoothing,context);
 vm.runInContext(readFileSync('src/cherrift_sport_data.js','utf8'),context);
 const image={width:1152,height:192};
 function loadSport(){vm.runInContext(readFileSync('src/cherrift_sport_gait.js','utf8'),context);}
 function sample(dir='right',stride=0){return context.window.CHERRIFT_ANIMATION_SMOOTHING.sample(image,'sport_cherry','walk',dir,0,()=>{},{loop:true,gaitPhase:stride});}
 return {context,loadSport,sample,programs,draws,contexts,canvases,deleted,fragment:()=>programs.at(-1).shaders.find(s=>s.type===35632).source,vertex:()=>programs.at(-1).shaders.find(s=>s.type===35633).source};
}
