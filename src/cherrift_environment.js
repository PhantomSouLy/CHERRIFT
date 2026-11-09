/* Shared biome atmosphere. Cosmetic only: no hitboxes, combat or save progression. */
(() => {
 'use strict';if(window.CHERRIFT_ENVIRONMENT)return;
 const profiles={
  0:{name:'training',dust:'#a57c85',fog:'#9692a6',haze:.018,life:'ember'},
  1:{name:'meadow',dust:'#96ab53',fog:'#dfebbc',haze:.018,life:'butterfly'},
  2:{name:'night',dust:'#8696a4',fog:'#9aa8c9',haze:.070,life:'moth'},
  3:{name:'savanna',dust:'#c9ab65',fog:'#e6cb9a',haze:.025,life:'seed'},
  4:{name:'red-desert',dust:'#c57d58',fog:'#dba27d',haze:.025,life:'sand'},
  5:{name:'sand-desert',dust:'#d8bd84',fog:'#efdbb5',haze:.035,life:'sand'},
  6:{name:'ancient-ruins',dust:'#9b9994',fog:'#a9b4bb',haze:.065,life:'mote'},
  7:{name:'dark-ruins',dust:'#8d839c',fog:'#a7a0ba',haze:.075,life:'wisp'}
 };
 const custom=new Map(),states=new WeakMap(),fogSprites=new Map();
 const creatureImages=new Map();
 function creatureImage(kind){
  if(creatureImages.has(kind))return creatureImages.get(kind);
  const entry={image:new Image(),ready:false};creatureImages.set(kind,entry);
  entry.image.onload=()=>{entry.ready=true;window.UI?.game&&(window.UI.game.__cherriftNeedsRender=true)};
  entry.image.onerror=()=>{entry.ready=false};
  entry.image.src=`assets/effects/environment/${kind}-painted.webp?v=1109-painted-nature2`;
  return entry;
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const finite=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
 function quality(g){const v=g?.save?.settings?.environmentDetail;return ['off','low','high'].includes(v)?v:'low'}
 function biome(g){return {...(profiles[Number(g?.stage?.world)]||profiles[1]),...custom.get(Number(g?.stage?.world)),...g?.stage?.environment};}
 function state(g){let s=states.get(g);if(!s||s.player!==g.player||s.stage!==g.stage?.id){s={player:g.player,stage:g.stage?.id,x:finite(g.player?.x),y:finite(g.player?.y),travel:0,particles:[],serial:0};states.set(g,s)}return s;}
 function allowed(g){return quality(g)!=='off'&&g?.save?.settings?.environmentPerformance!=='on'}
 function motion(g){return allowed(g)&&!reduced.matches&&!g?.save?.settings?.reducedMotion}
 function update(g,dt){
  if(g.mode!=='playing'||!g.player)return;
  const s=state(g),p=g.player,x=finite(p.x),y=finite(p.y),dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy);s.x=x;s.y=y;
  if(!motion(g)){s.particles.length=0;s.travel=0;return}
  dt=Math.max(0,Math.min(.06,finite(dt)));if(!dt)return;
  for(let i=s.particles.length-1;i>=0;i--){const a=s.particles[i];a.age+=dt;if(a.age>=a.life){s.particles.splice(i,1);continue}a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=Math.exp(-dt*2);a.vy*=Math.exp(-dt*2)}
  // Position changes drive steps: idle animations never emit. Teleports reset the stride.
  if(d>350){s.travel=0;return}if(d<.01)return;
  const high=quality(g)==='high',dash=finite(p.dashTimer)>0||d/dt>500;
  const b=biome(g),grass=b.life==='butterfly'||b.life==='seed';
  // Grass blades stay close to the feet. Walking is deliberately much quieter than dashing.
  const spacing=grass?(dash?22:42):(dash?16:26);
  s.travel+=d;const cap=grass?(high?44:16):(high?110:36),amount=Math.min(dash?4:1,Math.floor(s.travel/spacing));if(!amount)return;s.travel%=spacing;
  if(grass){
   const surface=g.groundSurfaceAt?.(x,y)||p.surface;
   if(surface&&!['grass','vegetation','savanna'].includes(surface))return;
   if((g.obstacles||[]).some(o=>/rock|stone|stump|log/i.test(String(o.objectKey||o.kind||''))&&Math.abs(o.x-x)<finite(o.rx,15)+7&&Math.abs(o.y-y)<finite(o.ry,9)+7))return;
  }
  const nx=dx/d,ny=dy/d;
  for(let n=0;n<amount;n++)for(let k=0;k<(grass?(dash&&high?2:1):(high?(dash?3:2):1));k++){
   if(s.particles.length>=cap)s.particles.shift();
   const seed=++s.serial,a=Math.sin(seed*12.9898)*43758.5453,f=a-Math.floor(a),side=(seed%2?1:-1),spread=grass?side*(2+f*3):(f-.5)*18;
   s.particles.push({x:x-dx*(n+.5)/amount-ny*spread,y:y-dy*(n+.5)/amount+nx*spread+5,
    vx:grass?-nx*(dash?24:5)-ny*side*5:-nx*(dash?65:15)-ny*side*(10+f*18),
    vy:grass?-ny*(dash?16:4)+nx*side*3:-ny*(dash?45:10)+nx*side*(7+f*12)-8,
    age:0,life:grass?(dash?.28+f*.14:.18+f*.10):(dash?.55+f*.30:.40+f*.25),
    size:grass?(dash?2.5+f*1.4:1.6+f*.9):(dash?4:2.5)+f*3,
    color:grass?['#657f43','#84994f','#a8ad63'][seed%3]:b.dust,grass,angle:f*Math.PI,turn:side*(dash?2:.7)});
  }
 }
 function view(g,o,margin=80){const z=g.zoom||1,c=g.camera||{x:0,y:0};return Math.abs(o.x-c.x)<g.w/z/2+margin&&Math.abs(o.y-c.y)<g.h/z/2+margin}
 function ground(g,c){if(!allowed(g))return;const s=state(g);if(!motion(g))return;
  c.save();for(const a of s.particles){if(!view(g,a))continue;const fade=1-a.age/a.life;c.globalAlpha=fade*(a.grass?.62:.20);c.save();c.translate(a.x,a.y);c.rotate(a.angle+(a.turn||0)*a.age);
   if(a.grass){c.strokeStyle=a.color;c.lineWidth=.7;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(a.size*.35,-a.size*.65,a.size*.20,-a.size*1.6);c.stroke()}
   else{c.fillStyle=a.color;c.beginPath();c.ellipse(0,0,a.size*1.6,a.size*.65,0,0,Math.PI*2);c.fill()}c.restore()}c.restore();
 }
 function fogSprite(color){if(!/^#[0-9a-f]{6}$/i.test(color))color='#a9b4bb';if(fogSprites.has(color))return fogSprites.get(color);if(fogSprites.size>=12)fogSprites.delete(fogSprites.keys().next().value);const im=document.createElement('canvas');im.width=im.height=128;const c=im.getContext('2d'),r=c.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,color+'b0');r.addColorStop(.45,color+'60');r.addColorStop(1,color+'00');c.fillStyle=r;c.fillRect(0,0,128,128);fogSprites.set(color,im);return im}
 function hash(x,y,salt){const v=Math.sin(x*127.1+y*311.7+salt*74.7)*43758.5453;return v-Math.floor(v)}
 function atmosphere(g,c){if(!allowed(g)||!g.stage||!g.camera)return;
  const b=biome(g),high=quality(g)==='high',time=motion(g)?finite(g.t):0,z=g.zoom||1,cam=g.camera;
  c.save();
  // World-grid anchored mist: continuous on camera movement, no full-screen white veil.
  const cell=440,drift=time*5,minX=Math.floor((cam.x-g.w/z/2-drift)/cell)-1,maxX=Math.ceil((cam.x+g.w/z/2-drift)/cell)+1,minY=Math.floor((cam.y-g.h/z/2)/cell)-1,maxY=Math.ceil((cam.y+g.h/z/2)/cell)+1;
  const fog=fogSprite(b.fog);let count=0;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const r=hash(x,y,2);if(r>(high?.66:.32)||count>=(high?10:4))continue;
   const wx=x*cell+drift+hash(x,y,4)*180,wy=y*cell+Math.sin(time*.07+r*6)*18;
   const px=g.w/2+(wx-cam.x)*z,py=g.h/2+(wy-cam.y)*z,w=(310+r*190)*z;
   if(px+w<0||px-w>g.w||py+w*.25<0||py-w*.25>g.h)continue;
   c.globalAlpha=Math.max(0,Math.min(.12,finite(b.haze,.03)))*(high?1:.6);c.drawImage(fog,px-w/2,py-w*.18,w,w*.36);count++;
  }
  // Sparse biome life uses deterministic cells, with no timers or particle allocation.
  if(motion(g)){
   const cell=220,limit=high?14:5;let drawn=0;
   outer:for(let y=Math.floor((cam.y-g.h/z/2)/cell)-1;y<=Math.ceil((cam.y+g.h/z/2)/cell)+1;y++)for(let x=Math.floor((cam.x-g.w/z/2)/cell)-1;x<=Math.ceil((cam.x+g.w/z/2)/cell)+1;x++){
    const r=hash(x,y,8);if(r>.35)continue;
    const wx=x*cell+hash(x,y,5)*cell+Math.sin(time*.6+r*6)*24,wy=y*cell+hash(x,y,6)*cell+Math.cos(time*.45+r*5)*15;
    if(!view(g,{x:wx,y:wy},20))continue;
    const px=g.w/2+(wx-cam.x)*z,py=g.h/2+(wy-cam.y)*z;
    c.save();c.translate(px,py);c.scale(z,z);c.globalAlpha=.4+.2*Math.sin(time+r*6);
    if(b.life==='butterfly'||b.life==='moth'){
     const sprite=creatureImage(b.life);
     if(sprite.ready){
      const flap=.28+.72*Math.abs(Math.sin(time*(b.life==='moth'?10:7)+r*8));
      const size=(b.life==='moth'?19:22)*( .90+r*.25 );
      c.globalAlpha=.85;c.rotate(Math.sin(time*.3+r*6)*.35+r*6);
      // The painted sprite is fixed; horizontal squash supplies smooth wingbeats.
      c.scale(flap,1);c.drawImage(sprite.image,-size/2,-size/2,size,size);
     }
    }else if(b.life==='sand'||b.life==='seed'){
     c.strokeStyle=b.dust;c.lineWidth=1;c.beginPath();c.moveTo(-4,0);c.lineTo(4+Math.sin(time+r)*2,1);c.stroke();
    }else{c.fillStyle=b.life==='wisp'?'#c5a3e2':b.life==='ember'?'#cb8c98':'#b9c3bc';c.beginPath();c.arc(0,0,b.life==='wisp'?1.8:1,0,7);c.fill()}
    c.restore();if(++drawn>=limit)break outer;
   }
  }c.restore();
 }
 function install(){const p=window.CherriftGame?.prototype;if(!p||p.__biomeEnvironment)return;p.__biomeEnvironment=true;const u=p.update;if(u)p.update=function(dt,...args){const r=u.call(this,dt,...args);update(this,dt);return r};const d=p.drawWorld;if(d)p.drawWorld=function(c,...args){const r=d.call(this,c,...args);atmosphere(this,c);return r};const gd=p.drawGround;if(gd)p.drawGround=function(c,...args){const r=gd.call(this,c,...args);ground(this,c);return r};}
 function sync(){const ui=window.UI,root=document.querySelector('[data-v060-settings-page="display"]');if(!ui?.save||!root)return;ui.save.settings||={};let el=document.getElementById('environmentDetailShared');if(!el){const row=document.createElement('label');row.className='setting-line-v060';row.dataset.i18nIgnore='true';row.innerHTML='<span><b>Környezeti részletesség / Environment detail</b><small>Talajreakció, ködfoltok és apró környezeti mozgások</small></span><select id="environmentDetailShared"><option value="off">OFF</option><option value="low">LOW</option><option value="high">HIGH</option></select>';root.appendChild(row);el=row.querySelector('select')}const q=quality({save:ui.save});if(el.value!==q)el.value=q;}
 document.addEventListener('change',e=>{if(e.target?.id!=='environmentDetailShared'||!window.UI?.save)return;const g=window.UI.game;window.UI.save.settings.environmentDetail=e.target.value;window.CherriftStorage?.save?.(window.UI.save);if(g){state(g).particles.length=0;g.__cherriftNeedsRender=true}});
 // Settings are route-owned. Watching every body mutation can create a
 // feedback loop with other modules that rebuild/decorate the settings screen.
 let syncQueued=false;
 function scheduleSync(){if(syncQueued)return;syncQueued=true;queueMicrotask(()=>{syncQueued=false;sync()});}
 function bindSettingsLifecycle(){
  const ui=window.UI;if(!ui)return;
  for(const key of ['init','open']){
   const original=ui[key];if(typeof original!=='function'||original.__EnvironmentSettingsSync)continue;
   const wrapped=function(...args){const result=original.apply(this,args);scheduleSync();if(result&&typeof result.then==='function')result.then(scheduleSync,scheduleSync);return result};
   wrapped.__EnvironmentSettingsSync=true;ui[key]=wrapped;
  }
 }
 function start(){install();bindSettingsLifecycle();scheduleSync();}
 for(const event of ['cherrift:savechange','cherrift:languagechange'])window.addEventListener(event,scheduleSync);
 window.addEventListener('cherrift:runtime-clean-ready',()=>{bindSettingsLifecycle();scheduleSync()});
 window.CHERRIFT_ENVIRONMENT=Object.freeze({version:'1.1-painted-nature',ground,atmosphere,update,install,quality,biome,registerWorld:(id,p)=>custom.set(Number(id),{...p}),inspect:g=>({particles:state(g).particles.length,biome:biome(g).name,quality:quality(g),fogCache:fogSprites.size})});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();window.addEventListener('cherrift:runtime-clean-ready',install);
})();
