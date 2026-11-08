/* Shared Canvas 2D lighting. No game simulation or save progression changes. */
(() => {
 'use strict';
 if(window.CHERRIFT_LIGHTING)return;
 const presets={0:['#b6bad0',.12],1:['#ffe3b0',.07],2:['#7189bf',.29],3:['#ffdfa0',.09],4:['#f5b28b',.10],5:['#ffe4ad',.08],6:['#9896b1',.20],7:['#777ba8',.28]};
 const configs=new Map(),actorSprites=new WeakMap(),masks=new WeakMap(),glows=new Map();
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const finite=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
 let maskCount=0;
 function settings(g){const s=g?.save?.settings||{};return {shadow:['off','low','medium','high'].includes(s.shadowQuality)?s.shadowQuality:'medium',light:s.globalLight==='low'?'low':'high'};}
 function config(g){const world=Number(g?.stage?.world)||0,p=presets[world]||presets[1];return {color:p[0],darkness:p[1],direction:-.85,length:.65,cycleSeconds:480,...configs.get(world),...g?.stage?.lighting};}
 function sun(g){const s=settings(g),p=config(g),time=s.light==='high'&&!g?.save?.settings?.reducedMotion?finite(g.t,0):0;const phase=time/Math.max(60,finite(p.cycleSeconds,480))*Math.PI*2;return {angle:finite(p.direction,-.85)+Math.sin(phase)*.48,length:clamp(finite(p.length,.65)+Math.sin(phase-.6)*.16,.2,1.6),darkness:clamp(finite(p.darkness,.1)+(s.light==='high'?Math.sin(phase)*.025:0),0,.65),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#ffe3b0'};}
 function visible(g,o,margin=260){const z=g.zoom||1,cam=g.camera||{x:0,y:0};return o&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x-cam.x)<g.w/z/2+margin&&Math.abs(o.y-cam.y)<g.h/z/2+margin;}
 function mask(image,sx=0,sy=0,sw=image?.naturalWidth||image?.width,sh=image?.naturalHeight||image?.height){
  if(!image||!sw||!sh)return null;
  let entries=masks.get(image);if(!entries){entries=new Map();masks.set(image,entries)}
  const key=[sx,sy,sw,sh].join(',');if(entries.has(key))return entries.get(key);
  // Bounded per-image animation frames and downscaled masks keep memory predictable.
  if(entries.size>=24)entries.delete(entries.keys().next().value);
  const scale=Math.min(1,192/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(sw*scale));c.height=Math.max(1,Math.ceil(sh*scale));
  const ctx=c.getContext('2d');ctx.filter='blur(1px)';ctx.drawImage(image,sx,sy,sw,sh,0,0,c.width,c.height);ctx.filter='none';ctx.globalCompositeOperation='source-in';ctx.fillStyle='#16201f';ctx.fillRect(0,0,c.width,c.height);entries.set(key,c);maskCount++;return c;
 }
 function ellipse(c,x,y,w,h,alpha){c.save();c.globalAlpha=alpha;c.fillStyle='#132020';c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill();c.restore();}
 function cast(c,o,image,w,h,p,quality,actor=false,flip=false){
  if(!image||quality==='low'||(actor&&quality!=='high')){ellipse(c,o.x,o.y,clamp(w*.32,8,65),clamp(w*.12,4,17),.20);return;}
  const length=h*p.length*(actor?.60:1),dx=Math.cos(p.angle)*length,dy=Math.sin(p.angle)*length;
  c.save();c.globalAlpha=actor?.22:.25;
  // The silhouette's bottom stays on the ground; the top projects away from it.
  c.translate(o.x,o.y);c.transform(flip?-1:1,0,-dx/h,-dy/h,0,0);
  c.drawImage(image,-w/2,-h,w,h);c.restore();
  if(quality==='high')ellipse(c,o.x,o.y,clamp(w*.22,7,46),clamp(w*.065,3,10),.10);
 }
 function ground(g,c){
  const q=settings(g).shadow;if(q==='off')return;
  const p=sun(g),world=Number(g.stage?.world)||0;
  for(const o of g.obstacles||[]){
   if(o.shadow===false||o.exterior||!visible(g,o)||(!o.solid&&!/tree|bush|rock|stone|stump|log|cactus|pillar|spire|arch|butte/i.test(String(o.objectKey||o.kind||''))))continue;
   const w=finite(o.drawW,finite(o.r,24)*2),h=finite(o.drawH,w);
   const art=o.reworkMap&&g.__reworkArt?.world===world?g.__reworkArt:g.__meadowArt;
   const im=art?.images?.get(o.objectKey)||g.assets?.get?.(o.assetKey||o.kind);
   cast(c,o,q==='low'?null:mask(im),w,h,p,q,false,!!o.flip);
  }
  for(const o of [g.player,...(g.enemies||[]),...(g.trainingDummiesV094||[])]){
   if(!visible(g,o,100)||o.shadow===false)continue;
   const record=actorSprites.get(o);cast(c,o,record&&q==='high'?mask(...record.source):null,record?.w||finite(o.r,18)*3,record?.h||finite(o.r,18)*4,p,q,true);
  }
 }
 function glow(color){if(glows.has(color))return glows.get(color);if(glows.size>=24)glows.delete(glows.keys().next().value);const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,color+'a0');gr.addColorStop(.25,color+'50');gr.addColorStop(1,color+'00');x.fillStyle=gr;x.fillRect(0,0,128,128);glows.set(color,c);return c;}
 function lightFor(o,bullet=false){
  if(o.light===false)return null;
  const meta=o.light&&typeof o.light==='object'?o.light:{};
  const kind=String(o.type||o.style||o.kind||'');
  if(!o.light&&!bullet&&!/petal|magic|orb|fire|flame|blaze|sakura|heal|soul|slash|claw|lightning|beam|nova|burst|spark/i.test(kind))return null;
  let color=meta.color||o.glowColor||o.color;
  if(!/^#[0-9a-f]{6}$/i.test(color||''))color=/fire|flame|blaze/i.test(kind)?'#ffad52':/heal|wind/i.test(kind)?'#99e8af':/soul|abyss|shadow/i.test(kind)?'#b692ff':'#ff9acb';
  return {color,radius:clamp(finite(meta.radius,bullet?55:90),12,240),intensity:clamp(finite(meta.intensity,bullet?.35:.48),0,1)};
 }
 function finish(g,c){
  const p=sun(g),q=settings(g).light;
  c.save();c.globalCompositeOperation='multiply';c.globalAlpha=p.darkness;c.fillStyle=p.color;c.fillRect(0,0,g.w,g.h);c.restore();
  const candidates=[];
  for(const [objects,isBullet] of [[g.bullets,true],[g.effects,false],[g.enemies,false],[[g.player].filter(Boolean),false]])for(const o of objects||[]){if(!visible(g,o,200))continue;const l=lightFor(o,isBullet);if(l)candidates.push({o,l})}
  const cam=g.camera||{x:0,y:0},z=g.zoom||1;
  candidates.sort((a,b)=>Math.hypot(a.o.x-cam.x,a.o.y-cam.y)-Math.hypot(b.o.x-cam.x,b.o.y-cam.y));
  c.save();c.globalCompositeOperation='screen';
  for(const {o,l} of candidates.slice(0,q==='high'?24:6)){
   const x=g.w/2+(o.x-cam.x)*z,y=g.h/2+(o.y-cam.y)*z,r=l.radius*z,im=glow(l.color);
   if(q==='high'){c.globalAlpha=l.intensity*.34;c.drawImage(im,x-r,y-r*.32+12*z,r*2,r*.64)}
   c.globalAlpha=l.intensity*(q==='high'?.60:.32);c.drawImage(im,x-r*.44,y-r*.44,r*.88,r*.88);
  }c.restore();
 }
 function capture(proto,name){const old=proto[name];if(typeof old!=='function')return;proto[name]=function(c,o,...args){if(!o||settings(this).shadow!=='high')return old.call(this,c,o,...args);const entry=c.getTransform(),draw=c.drawImage,own=Object.prototype.hasOwnProperty.call(c,'drawImage');let got=false;c.drawImage=function(...a){if(!got&&a[0]&&a.length>=3){let source,w,h;if(a.length===9){source=a.slice(0,5);w=Math.abs(a[7]);h=Math.abs(a[8])}else{source=[a[0]];w=Math.abs(a[3]||a[0].width);h=Math.abs(a[4]||a[0].height)}if(w&&h){const tr=c.getTransform(),scale=Math.hypot(tr.a,tr.b)/Math.max(.001,Math.hypot(entry.a,entry.b));actorSprites.set(o,{source,w:w*scale,h:h*scale});got=true}}return draw.apply(this,a)};try{return old.call(this,c,o,...args)}finally{if(own)c.drawImage=draw;else delete c.drawImage}};}
 function install(){const p=window.CherriftGame?.prototype;if(!p||p.__sharedLighting)return;p.__sharedLighting=true;const old=p.drawWorld;p.drawWorld=function(c,...a){const r=old.call(this,c,...a);finish(this,c);return r};const gd=p.drawGround;if(gd)p.drawGround=function(c,...a){const r=gd.call(this,c,...a);ground(this,c);return r};capture(p,'drawPlayer');capture(p,'drawEnemy');}
 function sync(){const root=document.querySelector('[data-v060-settings-page="display"]'),ui=window.UI;if(!root||!ui?.save)return;const hu=ui.save.settings?.language!=='en';ui.save.settings||={};const s=ui.save.settings;for(const [key,title,options] of [['shadowQuality',hu?'Árnyékok':'Shadow',['off','low','medium','high']],['globalLight',hu?'Globális fény':'Global Light',['low','high']]]){if(!options.includes(s[key]))s[key]=key==='shadowQuality'?'medium':'high';let el=document.getElementById(key+'Shared');if(!el){const row=document.createElement('label');row.className='setting-line-v060';row.dataset.i18nIgnore='true';row.innerHTML=`<span><b>${title}</b><small>${hu?'Azonnal érvényes grafikai beállítás':'Changes apply immediately'}</small></span><select id="${key}Shared">${options.map(v=>`<option value="${v}">${v.toUpperCase()}</option>`).join('')}</select>`;root.appendChild(row);el=row.querySelector('select')}if(el.value!==s[key])el.value=s[key]}}
 document.addEventListener('change',e=>{const key=e.target?.id==='shadowQualityShared'?'shadowQuality':e.target?.id==='globalLightShared'?'globalLight':null;if(!key||!window.UI?.save)return;window.UI.save.settings[key]=e.target.value;window.CherriftStorage?.save?.(window.UI.save);if(window.UI.game)window.UI.game.__cherriftNeedsRender=true;});
 function start(){install();sync();if(document.body)new MutationObserver(()=>sync()).observe(document.body,{childList:true,subtree:true});}
 window.CHERRIFT_LIGHTING=Object.freeze({version:'1.0',ground,finish,settings,sun,lightFor,registerWorld:(id,value)=>configs.set(Number(id),{...value}),inspect:()=>({masksCreated:maskCount,glowCache:glows.size}),install});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('cherrift:runtime-clean-ready',install);
})();
